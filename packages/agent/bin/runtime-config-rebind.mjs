import {
  createCliHostStateStore,
  closeWorkspaceDatabaseWithAdmission,
  inspectCliHostWorkspaceDatabase,
  openCliWorkspaceDatabase,
} from './workspace-database-cli.ts';
import { reconcileCliContracts, reconcileExpectedOptions } from './reconcile-cli-contracts.ts';
import { createHash, randomUUID } from 'node:crypto';
import { stringify as stringifyYaml } from 'yaml';
import { closeSync, constants, fstatSync, openSync, readFileSync, readSync, lstatSync } from 'node:fs';
import path from 'node:path';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { openRootFileSync, sameFileIdentity } from '@openclaw/fs-safe/advanced';
import { canonicalJsonDigest, isPlainRecord, MAX_CANONICAL_BYTES } from '../src/contracts/public-ingress.ts';
import { validateCoordinationLedgerV1 } from '../src/contracts/envelopes.ts';
import {
  activeRuntimeConfigurationSource,
  loadRuntimeConfig,
  parseRuntimeConfigYaml,
  runtimeConfigDigest,
  runtimePackageAccess,
  validateRuntimeConfigRepairTargetBytes,
} from '../src/config/runtime-config.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { HostStateStore } from '../src/host-state.ts';
import { queryWorkspaceRowUnknown, queryWorkspaceRowsUnknown } from '../src/config/workspace-database.ts';
import { sessionHandoffDatabasePath, projectConfigurationRebindPath } from '../src/config/project-paths.ts';
import { PROJECT_CONFIGURATION_PATHS, PROJECT_INITIALIZATION_PATH } from '../src/config/project-paths.ts';
import {
  parseProjectConfiguration,
  splitRuntimeConfig,
  projectConfigurationInputDigest,
} from '../src/config/project-configuration.ts';
import { bindLoadedConfigurationSource } from '../src/config/project-paths.ts';
import {
  readProjectInitializationReceipt,
  validateProjectInitializationReceipt,
} from '../src/config/project-initialization-record.ts';
import { inspectHistoricalOwnerWork } from '../src/orchestration/suspend-local-work.ts';
import { readAdmittedSessionIntake } from '../src/orchestration/admitted-session-execution.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import {
  parseSessionBridgeRequest,
  sessionBridgeRunId,
  sessionBridgeDatabasePath,
} from '../src/orchestration/mastra-session-bridge.ts';
import workSchema from '../schemas/work-state.v1.schema.json' with { type: 'json' };
import { runtimeExecutableInventory } from '../tooling/maintained-source-inventory.ts';
import { compareScopedSourceSnapshots, snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.ts';
import {
  parseSessionBridgeObservation,
  parseSessionBridgeRunState,
  buildSessionBridgeRequest,
  configuredContextForStage,
} from '../src/orchestration/mastra-session-bridge.ts';
import { sessionActionsForWave } from '../src/orchestration/session-handoff.ts';
import { admittedResearchResultsForSynthesis } from '../src/orchestration/observed-synthesis-result.ts';
import { parseMastraSessionLedgerState } from '../src/orchestration/mastra-session-ledger-codec.js';
import { standaloneRuntime } from './bun.mjs';
import { decodeWorkspaceSqlRow } from '../src/config/host-persisted-row.js';
/** Closed set at the dynamic SQL identifier boundary. */
/** @typedef {'agent_host_state' | 'agent_host_mastra_session_ledger' | 'agent_host_governance'} RebindSqlTable */
/** @typedef {import('../src/host-state.ts').WorkState} RebindWorkState */
/** @typedef {import('../src/contracts/envelopes.ts').CoordinationLedger} RebindCoordinationLedger */
/** @typedef {import('../src/config/safe-repository-access.ts').SafeRepositoryAccess} RebindSafeRepositoryAccess */
/** @typedef {import('../src/config/runtime-config.ts').AgentRuntimeConfig} RebindAgentRuntimeConfig */
/** @typedef {import('../src/orchestration/configured-context.ts').ConfiguredContext} RebindConfiguredContext */
/** @typedef {import('../src/config/initialization-record.ts').RuntimeInitializationReceipt} RebindInitializationReceipt */
/** @typedef {string | NodeJS.ArrayBufferView} RebindHashInput */
/** @template T @typedef {T extends readonly [unknown, ...unknown[]] ? { -readonly [K in keyof T]: DeepMutable<T[K]> } : T extends readonly (infer U)[] ? DeepMutable<U>[] : T extends object ? { -readonly [K in keyof T]: DeepMutable<T[K]> } : T} DeepMutable */
/** @typedef {import('../src/orchestration/mastra-session-bridge.ts').SessionBridgeRequest} RebindSessionBridgeRequest */
/** @typedef {ReturnType<typeof parseSessionBridgeRunState>} RebindSessionBridgeRunState */
/** @typedef {import('../src/orchestration/session-handoff.ts').SessionAgentAction} RebindSessionBridgeAction */
/** @typedef {import('../src/orchestration/session-handoff.ts').SessionHandoffContext} RebindSessionHandoffContext */
/** @typedef {import('bun:sqlite').Database} RebindDatabase */
/** @typedef {import('../src/host-state.ts').RecoveryReviewBinding} RebindRecoveryReviewBinding */
/** @typedef {Pick<RebindRecoveryReviewBinding, 'identity' | 'attempt' | 'callerSession' | 'controllerId' | 'userInstructionRef'> & { readonly repositoryRoot: string; readonly baselinePath: string; readonly originalContexts?: unknown; readonly request?: RebindRecoveryReviewBinding; readonly mode?: 'prepare' | 'begin' | 'complete' | 'inspect' | 'reserve' | 'resume' }} RebindRecoveryReviewInput */
/** @typedef {InstanceType<typeof HostStateStore>} RebindHostStateStore */
/** @typedef {{ readonly fence?: import('../src/host-state.ts').MaintenanceFence | null; readonly unfenced?: boolean; readonly prior?: { readonly status?: 'held' | 'released' | null } | null } | null | undefined} RebindInspectionReceipt */
/** @typedef {import('../src/host-state.ts').WorkIdentity} RebindWorkIdentity */
/** @typedef {import('../src/host-state.ts').StateVersion} RebindStateVersion */
/** @typedef {import('../src/orchestration/scoped-source-snapshot.ts').ScopedSourceSnapshot} RebindScopedSourceSnapshot */
/** @typedef {Object} RebindHistoricalTerminalCaptureRequest
 * @property {'HistoricalTerminalSynthesisCapture/v1'} schema
 * @property {RebindWorkIdentity} identity
 * @property {number} attempt
 * @property {string} action_id
 * @property {string} issue_id
 * @property {string} native_session_handle
 * @property {string} user_request_pointer
 * @property {'next_work' | 'linked_correction'} request_intent
 * @property {RebindStateVersion} expected_work
 * @property {RebindStateVersion} expected_ledger
 * @property {RebindStateVersion} expected_journal
 * @property {number} expected_maintenance_generation
 * @property {string} body_base64
 * @property {unknown} provenance
 */
/** @typedef {'--kind' | '--mode' | '--project-root' | '--repair-id' | '--source-beforeimages' | '--authorized-paths' | '--prior-system-update' | '--publish-operation' | '--report' | '--expected-request'} SourceCorrectionFlag */
/** @typedef {Partial<Record<SourceCorrectionFlag, string>> & { authorized_changed_paths?: readonly string[] }} ParsedSourceCorrectionArguments */
/** @typedef {import('../src/orchestration/persistent-session-handoff.js').MastraSessionLedgerState} RebindMastraSessionLedgerState */
/** @typedef {import('../src/config/host-persisted-row.js').WorkspaceStateSqlRow & { readonly kind: 'work'; readonly value: RebindWorkState }} CheckedWorkStateRow */
/** @typedef {import('../src/config/host-persisted-row.js').WorkspaceStateSqlRow & { readonly kind: 'ledger'; readonly value: RebindCoordinationLedger }} CheckedCoordinationLedgerRow */
/** @typedef {CheckedWorkStateRow | CheckedCoordinationLedgerRow} CheckedHostStateRow */
/** @typedef {import('../src/config/host-persisted-row.js').WorkspaceMastraSqlRow & { readonly value: RebindMastraSessionLedgerState }} CheckedMastraLedgerRow */
/** @typedef {import('../src/config/host-persisted-row.js').WorkspaceGovernanceSqlRow & { readonly value: Record<string, unknown> & { readonly status: string }}} CheckedGovernanceRow */

/** @param {unknown} value @returns {value is RebindWorkState} */
function isCheckedWorkState(value) {
  return isPlainRecord(value) && validateReadonlyOwner(value);
}

/** @param {unknown} value @returns {value is RebindCoordinationLedger} */
function isCheckedCoordinationLedger(value) {
  return validateCoordinationLedgerV1(value).ok;
}

/** @param {unknown} value @returns {value is Record<string, unknown> & { readonly status: string }} */
function isCheckedGovernanceValue(value) {
  return isPlainRecord(value) && typeof value.status === 'string';
}

/** @param {CheckedHostStateRow} row @returns {row is CheckedWorkStateRow} */
function isCheckedWorkRow(row) {
  return row.kind === 'work';
}

/** @param {CheckedHostStateRow} row @returns {row is CheckedCoordinationLedgerRow} */
function isCheckedLedgerRow(row) {
  return row.kind === 'ledger';
}

/** @param {unknown} value @returns {value is RebindWorkIdentity} */
function isWorkIdentity(value) {
  return (
    isPlainRecord(value) &&
    typeof value.repository_id === 'string' &&
    Array.isArray(value.project_ids) &&
    value.project_ids.every((projectId) => typeof projectId === 'string') &&
    typeof value.integrations_digest === 'string'
  );
}

/** @param {unknown} value @returns {value is RebindStateVersion} */
function isStateVersion(value) {
  return (
    isPlainRecord(value) &&
    Object.keys(value).length === 2 &&
    Number.isSafeInteger(value.revision) &&
    typeof value.digest === 'string' &&
    /^[a-f0-9]{64}$/.test(value.digest)
  );
}

/** @param {Record<string, unknown>} value */
function hasHistoricalCaptureIdentity(value) {
  return (
    isWorkIdentity(value.identity) &&
    Number.isSafeInteger(value.attempt) &&
    typeof value.action_id === 'string' &&
    typeof value.issue_id === 'string' &&
    typeof value.native_session_handle === 'string' &&
    typeof value.user_request_pointer === 'string' &&
    (value.request_intent === 'next_work' || value.request_intent === 'linked_correction')
  );
}

/** @param {Record<string, unknown>} value */
function hasHistoricalCaptureVersions(value) {
  return (
    isStateVersion(value.expected_work) &&
    isStateVersion(value.expected_ledger) &&
    isStateVersion(value.expected_journal) &&
    Number.isSafeInteger(value.expected_maintenance_generation) &&
    typeof value.body_base64 === 'string' &&
    Object.hasOwn(value, 'provenance')
  );
}

/** @param {unknown} value @returns {value is RebindHistoricalTerminalCaptureRequest} */
function isHistoricalTerminalCaptureRequest(value) {
  return (
    isPlainRecord(value) &&
    value.schema === 'HistoricalTerminalSynthesisCapture/v1' &&
    hasHistoricalCaptureIdentity(value) &&
    hasHistoricalCaptureVersions(value)
  );
}

/** @param {unknown} value @returns {boolean} */
function isCanonicalHistoricalProvenanceReference(value) {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 2048 &&
    !value.includes('\\') &&
    !value.startsWith('/') &&
    !/^[A-Za-z]:/.test(value) &&
    !/\p{Cc}/u.test(value) &&
    value.split('/').every((part) => part && part !== '.' && part !== '..')
  );
}

/** @param {unknown} value @returns {value is Record<string, unknown> & { status: string; agent_id: string; tool_call_ref: string }} */
function isSynthesisInputEvidence(value) {
  return (
    isPlainRecord(value) &&
    typeof value.status === 'string' &&
    typeof value.agent_id === 'string' &&
    typeof value.tool_call_ref === 'string'
  );
}

/** @param {unknown} value @returns {string[]} */
function synthesisPredecessorResultIds(value) {
  requireRebind(isUnknownArray(value) && value.length === 2, 'synthesis predecessor reference count differs');
  /** @type {string[]} */
  const ids = [];
  for (const reference of value) {
    requireRebind(
      hasExactKeys(reference, ['result_id', 'digest']) &&
        typeof reference.result_id === 'string' &&
        reference.result_id.length > 0 &&
        typeof reference.digest === 'string' &&
        /^[a-f0-9]{64}$/.test(reference.digest),
      'synthesis predecessor reference is malformed',
    );
    ids.push(reference.result_id);
  }
  return ids;
}

/** @param {unknown} value @returns {value is Record<string, unknown> & { exit_code: number; input_path: string; command: readonly unknown[]; stderr: string }} */
function isSynthesisReportEvidence(value) {
  return (
    isPlainRecord(value) &&
    typeof value.exit_code === 'number' &&
    typeof value.input_path === 'string' &&
    Array.isArray(value.command) &&
    typeof value.stderr === 'string'
  );
}

/** @param {unknown} value @returns {value is Record<string, unknown> & { schema: string; readiness: string; material_gaps?: readonly unknown[]; completeness?: Record<string, unknown> }} */
function isSynthesisOutputSummary(value) {
  return (
    isPlainRecord(value) &&
    typeof value.schema === 'string' &&
    typeof value.readiness === 'string' &&
    (!Object.hasOwn(value, 'material_gaps') || Array.isArray(value.material_gaps)) &&
    (!Object.hasOwn(value, 'completeness') || isPlainRecord(value.completeness))
  );
}

/**
 * @typedef {Object} FrozenSourceBeforeimageBinding
 * @property {string} schema
 * @property {string} path
 * @property {number} bytes
 * @property {string} sha256
 * @property {string} snapshot_digest
 */
/**
 * @typedef {Object} FrozenPriorSystemUpdateBinding
 * @property {string} schema
 * @property {string} path
 * @property {number} bytes
 * @property {string} sha256
 * @property {string} status
 * @property {string} operation_id
 * @property {string} version
 * @property {string} entry
 * @property {string} run_id
 * @property {string} artifact_id
 * @property {number} installed_bytes
 * @property {number} prior_bytes
 * @property {number} delta_bytes
 * @property {string} configuration_inspection
 * @property {false} tests_invoked
 * @property {false} reinstallation
 * @property {false} runtime_accepted
 * @property {false} developer_unblocked
 */
/**
 * @typedef {Object} FrozenSourceCorrectionRequestView
 * @property {string} request_id
 * @property {string} publish_operation_id
 * @property {FrozenSourceBeforeimageBinding} source_beforeimages
 * @property {FrozenPriorSystemUpdateBinding} prior_system_update
 * @property {readonly string[]} authorized_changed_paths
 */
/**
 * SourceDeliveryConfigRebindOperation/v1 fields used after Ajv validates its full schema.
 * @typedef {Object} SourceCorrectionOperationView
 * @property {'SourceDeliveryConfigRebindOperation/v1'} schema
 * @property {number} revision
 * @property {'planned' | 'fenced' | 'applied' | 'abandoned_no_effect'} phase
 * @property {boolean} maintenance_released
 * @property {string} plan_digest
 * @property {{ operation_id: string; actor: string; instruction_ref: string; created_at: string; repository_id: string; project_ids: readonly string[]; workspace_id: string; baseline_yaml: string; target_yaml: string; baseline_receipt: string; old_config_digest: string; target_config_digest: string; initialization_schema_digest: string; selector_digest: string; bundle_digest: string; state_digest: string; repository_root: string; token: string }} plan
 */
/** @typedef {{ readonly path: string; readonly text: string; readonly sha256: string }} ProjectInputDocument */
/** @typedef {{ readonly schema: 'ProjectConfigurationInputSet/v1'; readonly input_digest: string; readonly config_digest: string; readonly project: ProjectInputDocument; readonly agents: ProjectInputDocument; readonly flows: ProjectInputDocument }} ProjectInputSet */
/** @typedef {{ readonly project: string; readonly agents: string; readonly flows: string }} ProjectInputTexts */
/** @typedef {'apply' | 'resume' | 'restore'} ProjectRebindRecoveryMode */
/** @typedef {'fenced' | 'applied' | 'abandoned_no_effect'} ProjectRebindSavePhase */
/** @typedef {RebindOperationView & { readonly plan: RebindOperationView['plan'] & { readonly configuration_format: 'project-split-v2'; readonly baseline_inputs: ProjectInputSet; readonly target_inputs: ProjectInputSet } }} RebindProjectOperation */
/**
 * The operation JSON schema is the single owner of persisted operation shape.
 * This view lists the fields consumed after Ajv has accepted the complete value.
 * @typedef {Object} RebindOperationView
 * @property {'ConfigRebindOperation/v1' | 'SourceDeliveryConfigRebindOperation/v1'} schema
 * @property {number} revision
 * @property {'planned' | 'fenced' | 'applied' | 'abandoned_no_effect'} phase
 * @property {boolean} maintenance_released
 * @property {string} plan_digest
 * @property {SourceCorrectionOperationView['plan'] & {
 *   actor: string;
 *   instruction_ref: string;
 *   created_at: string;
 *   repository_root: string;
 * }} plan
 */
/**
 * @typedef {Object} SourceCorrectionRequestCommon
 * @property {RebindSafeRepositoryAccess} access
 * @property {string} root
 * @property {RebindAgentRuntimeConfig} config
 * @property {RebindDatabase} db
 * @property {string} id
 * @property {string} operationPath
 * @property {Uint8Array} operationBytes
 * @property {SourceCorrectionOperationView} operation
 * @property {readonly string[] | undefined} [authorizedPaths]
 * @property {string | undefined} [publishOperationId]
 * @property {boolean} [allowForwardReceipt]
 */
/** @typedef {SourceCorrectionRequestCommon & ({ readonly beforeimagePath: string; readonly priorSystemUpdatePath: string; readonly frozenRequest?: undefined } | { readonly beforeimagePath?: never; readonly priorSystemUpdatePath?: never; readonly frozenRequest: FrozenSourceCorrectionRequestView })} SourceCorrectionRequestInput */
/** @typedef {{ readonly access: RebindSafeRepositoryAccess; readonly root: string; readonly operationId: string; readonly operationPath: string; readonly operationBytes: Uint8Array } & ({ readonly beforeimagePath: string; readonly frozen?: undefined } | { readonly beforeimagePath?: never; readonly frozen: FrozenSourceBeforeimageBinding })} SourceBeforeimageBindingInput */
/** @typedef {{ readonly access: RebindSafeRepositoryAccess; readonly root: string } & ({ readonly priorSystemUpdatePath: string; readonly frozen?: undefined } | { readonly priorSystemUpdatePath?: never; readonly frozen: FrozenPriorSystemUpdateBinding })} PriorSystemUpdateBindingInput */
/** @typedef {{ readonly path: string; readonly sha256: string; readonly plan_digest: string; readonly revision: number; readonly phase: 'fenced'; readonly maintenance_released: false }} SourceCorrectionOriginalOperation */
/** @typedef {{ readonly schema: 'RuntimeConfigSourceCorrectionConfig/v1'; readonly baseline_config_digest: string; readonly target_config_digest: string; readonly current_yaml_sha256: string; readonly yaml_state: 'baseline' | 'target'; readonly receipt_sha256: string; readonly baseline_receipt_sha256: string; readonly initialization_schema_digest: string }} SourceCorrectionConfigView */
/** @typedef {{ readonly schema: 'KnownTerminalCustodyBinding/v1'; readonly work_id: string; readonly attempt: number; readonly action_id: string; readonly issue_id: string; readonly receipt_digest: string; readonly journal_revision: number; readonly journal_digest: string; readonly expected_maintenance_generation: number }} SourceCorrectionCustodyView */
/** @typedef {{ readonly schema: 'MaintenanceFenceBinding/v1'; readonly project_ids: readonly string[]; readonly operation_id: string; readonly manifest_digest: string; readonly request_digest: string; readonly bindings_digest: string; readonly closure_digest: string; readonly bundle_digest: string }} SourceCorrectionFenceBindingView */
/** @typedef {{ readonly schema: 'MaintenanceFence/v1'; readonly workspace_id: string; readonly revision: number; readonly generation: number; readonly status: 'held' | 'released'; readonly binding: SourceCorrectionFenceBindingView; readonly token_digest: string }} SourceCorrectionFenceView */
/** @typedef {{ readonly schema: 'RuntimeConfigSourceCorrectionRequest/v1'; readonly request_id: string; readonly operation_id: string; readonly publish_operation_id: string; readonly original_operation: SourceCorrectionOriginalOperation; readonly repository_root: string; readonly repository_id: string; readonly project_ids: readonly string[]; readonly source_project_ids: readonly string[]; readonly workspace_id: string; readonly state_digest: string; readonly config: SourceCorrectionConfigView; readonly fence: SourceCorrectionFenceView; readonly custody: readonly SourceCorrectionCustodyView[]; readonly old_source: RebindScopedSourceSnapshot; readonly source_beforeimages: FrozenSourceBeforeimageBinding; readonly prior_system_update: FrozenPriorSystemUpdateBinding; readonly new_source: RebindScopedSourceSnapshot; readonly new_source_manifest: { readonly schema: 'RuntimeConfigSourcePackageBinding/v1'; readonly path: string; readonly bytes: number; readonly sha256: string; readonly package_name: string; readonly version: string }; readonly source_changes: readonly { readonly path: string; readonly kind: string; readonly before: unknown; readonly after: unknown }[]; readonly authorized_changed_paths: readonly string[] }} SourceCorrectionRequestView */
/** @typedef {{ readonly path: string; readonly bytes: number; readonly sha256: string }} SourceCorrectionManifestInput */
/** @typedef {{ readonly version: string; readonly pin: string; readonly target: string; readonly payloadId: string; readonly asset: { readonly file: string; readonly bytes: number; readonly sha256: string }; readonly inputs: readonly SourceCorrectionManifestInput[] }} SourceCorrectionBuildManifest */
/** @typedef {{ readonly request_id: string; readonly operation_id: string; readonly source_binding: string; readonly run_id: string; readonly run_attempt: number; readonly repository_id: string; readonly project_ids: readonly string[]; readonly version: string; readonly target: string; readonly manifest_sha256: string; readonly payload_id: string; readonly asset: { readonly file: string; readonly bytes: number; readonly sha256: string }; readonly checks: readonly unknown[] }} SourceCorrectionCiResult */
/** @typedef {{ readonly profile: string; readonly conclusion: string; readonly operation_id: string; readonly checks: readonly unknown[]; readonly request_id: string; readonly source_binding: string; readonly run_id: string; readonly run_attempt: number; readonly artifact_id: string; readonly result_sha256: string; readonly result: SourceCorrectionCiResult }} SourceCorrectionCiDelivery */
/** @typedef {{ readonly source_path: string; readonly source_sha256: string; readonly prior_bytes: number; readonly selected_bytes: number; readonly action: string; readonly exit_code: number; readonly signal: null; readonly tests_invoked: false; readonly reinstallation: false; readonly path: string; readonly sha256: string }} SourceCorrectionInstallationReceipt */
/** @typedef {{ readonly command_path: string; readonly bytes: number; readonly sha256: string; readonly package_name: string; readonly version: string; readonly target: string }} SourceCorrectionEffectivePath */
/** @typedef {{ readonly request_id: string; readonly operation_id: string; readonly publish_operation_id: string; readonly original_operation_sha256: string; readonly original_plan_digest: string; readonly source_snapshot_digest: string; readonly build_manifest: SourceCorrectionBuildManifest; readonly build_manifest_sha256: string; readonly ci_delivery: SourceCorrectionCiDelivery; readonly installation_receipt: SourceCorrectionInstallationReceipt; readonly effective_path: SourceCorrectionEffectivePath; readonly native_self_attestation: unknown }} SourceCorrectionReportView */
/** @typedef {Omit<SourceCorrectionReportView, 'native_self_attestation'>} SourceCorrectionExternalReportView */
/** @typedef {{ readonly schema: 'RuntimeConfigSourceCorrectionRepair/v1'; readonly status: 'requested' | 'applied'; readonly revision: number; readonly operation_id: string; readonly request: SourceCorrectionRequestView; readonly report?: SourceCorrectionReportView; readonly completion?: unknown; readonly digest: string }} SourceCorrectionArtifactView */
/** @typedef {Pick<RebindSafeRepositoryAccess, 'readBytes'>} RebindConfigBytesReader */
/** @typedef {{ readonly bytes: Buffer; readonly value: RebindOperationView | SourceCorrectionOperationView }} StoredRebindOperation */
/** @typedef {{ readonly status: string; readonly operation_id: string; readonly version: string; readonly entry: string; readonly run_id: string; readonly artifact_id: string; readonly installed_bytes: number; readonly prior_bytes: number; readonly delta_bytes: number; readonly configuration_inspection: string; readonly tests_invoked: false; readonly reinstallation: false; readonly runtime_accepted: false; readonly developer_unblocked: false }} PriorSystemUpdateReceipt */
/** @typedef {SourceCorrectionRequestCommon & { readonly operation: SourceCorrectionOperationView; readonly request: SourceCorrectionRequestView; readonly allowForwardReceipt?: boolean }} SourceCorrectionCurrentRequestInput */
/** @typedef {SourceCorrectionCurrentRequestInput & { readonly operationBytes: Uint8Array; readonly artifact: SourceCorrectionArtifactView; readonly expectedRequest: string }} SourceCorrectionWithdrawalInput */
/** @typedef {SourceCorrectionCurrentRequestInput & { readonly artifact: SourceCorrectionArtifactView }} SourceCorrectionBridgeInput */
/** @typedef {SourceCorrectionCurrentRequestInput & { readonly artifact: SourceCorrectionArtifactView; readonly store: RebindHostStateStore }} ClosedSourceDeliveryInput */
/** @typedef {{ readonly completion: unknown; readonly baseline_config_digest: string }} ClosedSourceDeliveryTransition */
/** @typedef {{ readonly values: ParsedSourceCorrectionArguments; readonly access: RebindSafeRepositoryAccess; readonly root: string; readonly config: RebindAgentRuntimeConfig; readonly db: RebindDatabase; readonly operationPath: string; readonly stored: { readonly bytes: Buffer; readonly value: SourceCorrectionOperationView }; readonly frozenRequest?: SourceCorrectionRequestView }} CorrectionRequestForInputs */
/** @typedef {{ readonly onPhase?: ((phase: string) => void) | undefined }} RebindRunOptions */
/** @typedef {{ readonly plan: RebindOperationView['plan']; readonly bindings_digest: string; readonly closure_digest: string }} RebindFencePlan */

/** @type {(valid: unknown, message: string) => asserts valid} */
const requireRebind = (valid, message) => {
  if (!valid) throw new Error(`vida runtime-config rebind: ${message}`);
};
/** @param {string} text @returns {unknown} */
function parseJsonUnknown(text) {
  return /** @type {unknown} */ (JSON.parse(text));
}
/** @param {import('../src/host-state.ts').MaintenanceFence | null} fence @returns {asserts fence is import('../src/host-state.ts').MaintenanceFence} */
function assertFencePresent(fence) {
  requireRebind(fence !== null, 'maintenance fence is missing');
}
/** @param {RebindHashInput} bytes */
/** @param {string | Uint8Array} bytes */
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const MAX_ORIGINAL_CONTEXT_EXPORT_BYTES = 262144;
const MAX_CONFIGURED_CONTEXT_REFERENCES = 16;
const MAX_CONFIGURED_CONTEXT_FILE_BYTES = 65536;
const MAX_CONFIGURED_CONTEXT_TOTAL_BYTES = 262144;
const MAX_CONFIGURED_CONTEXT_EXCERPT_CHARS = 8192;
const MAX_NATIVE_ASSET_BYTES = 1024 * 1024 * 1024;
/** @param {unknown} value */
const json = (value) => JSON.stringify(value, null, 2) + '\n';
const receiptPath = '.agent/runtime-initialization.v1.json';
const configPath = 'agent-runtime.config.v1.yaml';
const selectorPath = '.agent/active-runtime-selector.v1.json';
const operationName = 'runtime-config-rebind-operation.v1.json';
const deliveryOperationName = 'runtime-config-delivery-operation.v1.json';
const sourceCorrectionName = 'runtime-config-source-correction-repair.v1.json';
const identifier = /^[a-z0-9][a-z0-9._-]{0,79}$/;
const stableVersion = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;
const ajv = new Ajv2020({ strict: true, allErrors: true });
const operationSchemaValue = parseJsonUnknown(
  readFileSync(new URL('../schemas/config-rebind-operation.v1.schema.json', import.meta.url), 'utf8'),
);
const sourceCorrectionSchemaValue = parseJsonUnknown(
  readFileSync(new URL('../schemas/runtime-config-source-correction-repair.v1.schema.json', import.meta.url), 'utf8'),
);
requireRebind(
  isPlainRecord(operationSchemaValue) && isPlainRecord(sourceCorrectionSchemaValue),
  'rebind schemas must be JSON objects',
);
const operationSchema = operationSchemaValue;
const sourceCorrectionSchema = sourceCorrectionSchemaValue;
const validateOperation = ajv.compile(/** @type {import('ajv/dist/2020.js').AnySchemaObject} */ (operationSchema));
const validateDeliveryOperation = ajv.compile(
  /** @type {import('ajv/dist/2020.js').AnySchemaObject} */ ({
    ...operationSchema,
    $id: 'https://agent-runtime.invalid/schemas/config-delivery-operation.v1.schema.json',
    properties: {
      ...(isPlainRecord(operationSchema.properties) ? operationSchema.properties : {}),
      schema: { const: 'SourceDeliveryConfigRebindOperation/v1' },
    },
  }),
);
/** @param {boolean} delivery */
const operationValidator = (delivery) => (delivery ? validateDeliveryOperation : validateOperation);
/** @param {unknown} value @param {boolean} delivery @returns {value is RebindOperationView} */
function isRebindOperation(value, delivery) {
  return operationValidator(delivery)(value) === true;
}
/** @param {unknown} value @returns {value is RebindOperationView & { readonly schema: 'SourceDeliveryConfigRebindOperation/v1' }} */
function isDeliveryRebindOperation(value) {
  return (
    validateDeliveryOperation(value) === true &&
    isPlainRecord(value) &&
    value.schema === 'SourceDeliveryConfigRebindOperation/v1'
  );
}
/** @param {unknown} value @returns {asserts value is SourceCorrectionOperationView} */
function assertDeliveryRebindOperation(value) {
  requireRebind(isDeliveryRebindOperation(value), 'delivery operation schema invalid');
}
/** @param {unknown} value @returns {value is SourceCorrectionArtifactView} */
function validateSourceCorrection(value) {
  return (
    ajv.compile(/** @type {import('ajv/dist/2020.js').AnySchemaObject} */ (sourceCorrectionSchema))(value) === true
  );
}
const sourceCorrectionDefinitions = sourceCorrectionSchema.$defs;
requireRebind(
  isPlainRecord(sourceCorrectionDefinitions) && isPlainRecord(sourceCorrectionDefinitions.report),
  'source correction report schema definition is missing',
);
const sourceCorrectionReportSchema = sourceCorrectionDefinitions.report;
const requiredReportFields = sourceCorrectionReportSchema.required;
const reportProperties = sourceCorrectionReportSchema.properties;
requireRebind(
  Array.isArray(requiredReportFields) &&
    requiredReportFields.every((field) => typeof field === 'string') &&
    isPlainRecord(reportProperties),
  'source correction report schema fields are malformed',
);
/** @type {string[]} */
const externalReportRequired = [];
for (const field of requiredReportFields) {
  if (typeof field === 'string' && field !== 'native_self_attestation') externalReportRequired.push(field);
}
const externalSourceCorrectionReportSchema = {
  ...sourceCorrectionReportSchema,
  required: externalReportRequired,
  properties: Object.fromEntries(
    Object.entries(reportProperties).filter(([name]) => name !== 'native_self_attestation'),
  ),
  ...(typeof sourceCorrectionSchema.$schema === 'string' ? { $schema: sourceCorrectionSchema.$schema } : {}),
  $defs: sourceCorrectionDefinitions,
};
/** @param {unknown} value @returns {value is SourceCorrectionExternalReportView} */
function validateExternalSourceCorrectionReport(value) {
  return (
    ajv.compile(/** @type {import('ajv/dist/2020.js').AnySchemaObject} */ (externalSourceCorrectionReportSchema))(
      value,
    ) === true
  );
}
/** @param {unknown} value @returns {asserts value is SourceCorrectionExternalReportView} */
function assertExternalSourceCorrectionReport(value) {
  requireRebind(validateExternalSourceCorrectionReport(value), 'external source correction report schema invalid');
}
/** @param {{ readonly schema: string; readonly plan: unknown }} operation */
const operationDigest = (operation) =>
  canonicalJsonDigest(
    operation.schema === 'SourceDeliveryConfigRebindOperation/v1'
      ? { schema: operation.schema, plan: operation.plan }
      : operation.plan,
  );
const validateReadonlyOwner = ajv.compile(workSchema);

/** @param {unknown} value @param {string} label @returns {string} */
function requireRebindPath(value, label) {
  requireRebind(typeof value === 'string' && value.length > 0, `${label} path is required without a frozen binding`);
  return value;
}

/** @param {unknown} value @param {readonly string[]} keys @returns {value is Record<string, unknown>} */
function hasExactKeys(value, keys) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join('|') === [...keys].sort().join('|')
  );
}

/** @param {unknown} value @returns {value is unknown[]} */
function isUnknownArray(value) {
  return Array.isArray(value);
}
/** @param {unknown} value @returns {string[]} */
function sortedTextValues(value) {
  requireRebind(isStringArray(value), 'Host resource list is malformed');
  return [...value].sort((left, right) => left.localeCompare(right));
}

/** @param {string} value */
function hasNulOrLineBreak(value) {
  return value.includes('\0') || value.includes('\r') || value.includes('\n');
}

/** @param {string} value */
function hasControlCharacter(value) {
  for (const character of value) {
    if ((character.codePointAt(0) ?? 32) < 32) return true;
  }
  return false;
}

/** @param {unknown} value @returns {value is string[]} */
function isStringArray(value) {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}
/** @typedef {{ readonly runId: string; readonly status: string; readonly context: Record<string, unknown> }} RebindMastraRunSnapshot */
/** @param {unknown} value @returns {value is RebindMastraRunSnapshot} */
function isMastraRunSnapshot(value) {
  return (
    isPlainRecord(value) &&
    typeof value.runId === 'string' &&
    typeof value.status === 'string' &&
    isPlainRecord(value.context)
  );
}
/** @param {unknown} value @returns {value is Record<string, unknown> & { readonly name: string; readonly version: string }} */
function isPackageManifest(value) {
  return isPlainRecord(value) && typeof value.name === 'string' && typeof value.version === 'string';
}

/** @typedef {{ readonly action_id: string; readonly wave_index: number; readonly stage_id: string; readonly work_id: string; readonly attempt: number; readonly context: unknown }} OriginalContextAction */
/** @typedef {{ readonly id: string; readonly kind: 'official' | 'local' | 'skill'; readonly location: string; readonly title: string }} OriginalContextEntry */

/** @param {unknown} value @returns {[number, number, number] | null} */
function stableVersionParts(value) {
  if (typeof value !== 'string' || !stableVersion.test(value)) return null;
  const parts = value.split('.').map(Number);
  return parts.every(Number.isSafeInteger) ? /** @type {[number, number, number]} */ (parts) : null;
}

/** @param {unknown} candidate @param {unknown} baseline */
function isCurrentOrLaterStableVersion(candidate, baseline) {
  const left = stableVersionParts(candidate),
    right = stableVersionParts(baseline);
  if (!left || !right) return false;
  for (const index of /** @type {const} */ ([0, 1, 2])) {
    if (left[index] !== right[index]) return left[index] > right[index];
  }
  return true;
}

/** @param {unknown} entry @returns {asserts entry is Record<string, unknown>} */
function assertOriginalContextActionRecord(entry) {
  requireRebind(
    isPlainRecord(entry) &&
      hasExactKeys(entry, ['action_id', 'wave_index', 'stage_id', 'work_id', 'attempt', 'context']),
    'original context action binding invalid',
  );
}

/** @param {unknown} value @returns {asserts value is string} */
function assertOriginalContextActionId(value) {
  requireRebind(typeof value === 'string' && /^[a-f0-9]{64}$/.test(value), 'original context action binding invalid');
}

/** @param {unknown} value @returns {asserts value is number} */
function assertOriginalContextWave(value) {
  requireRebind(
    typeof value === 'number' && Number.isSafeInteger(value) && value >= 0,
    'original context action binding invalid',
  );
}

/** @param {unknown} value @returns {asserts value is string} */
function assertOriginalContextStage(value) {
  requireRebind(
    typeof value === 'string' && value.length > 0 && value.length <= 128,
    'original context action binding invalid',
  );
}

/** @param {unknown} value @returns {asserts value is string} */
function assertOriginalContextWork(value) {
  requireRebind(
    typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value),
    'original context action binding invalid',
  );
}

/** @param {unknown} value @returns {asserts value is number} */
function assertOriginalContextAttempt(value) {
  requireRebind(
    typeof value === 'number' && Number.isSafeInteger(value) && value >= 1,
    'original context action binding invalid',
  );
}

/** @param {unknown} entry @returns {OriginalContextAction} */
function parseOriginalContextAction(entry) {
  assertOriginalContextActionRecord(entry);
  assertOriginalContextActionId(entry.action_id);
  assertOriginalContextWave(entry.wave_index);
  assertOriginalContextStage(entry.stage_id);
  assertOriginalContextWork(entry.work_id);
  assertOriginalContextAttempt(entry.attempt);
  return {
    action_id: entry.action_id,
    wave_index: entry.wave_index,
    stage_id: entry.stage_id,
    work_id: entry.work_id,
    attempt: entry.attempt,
    context: entry.context,
  };
}

/** @param {unknown} value @returns {Map<string, OriginalContextAction>} */
function validateOriginalContextCollection(value) {
  if (value === undefined) return new Map();
  requireRebind(isUnknownArray(value) && value.length > 0, 'original context collection must be a nonempty array');
  let serialized;
  try {
    serialized = JSON.stringify(value);
  } catch {
    requireRebind(false, 'original context collection is not JSON data');
  }
  requireRebind(
    Buffer.byteLength(serialized, 'utf8') <= MAX_ORIGINAL_CONTEXT_EXPORT_BYTES,
    'original context collection exceeds bound',
  );
  /** @type {Map<string, OriginalContextAction>} */
  const byAction = new Map();
  for (const entry of value) {
    const action = parseOriginalContextAction(entry);
    requireRebind(!byAction.has(action.action_id), 'original context action is duplicated');
    byAction.set(action.action_id, action);
  }
  return byAction;
}

/** @param {unknown} value @returns {value is number} */
function isConfiguredContextByteCount(value) {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

/** @param {string} root @param {RebindAgentRuntimeConfig} current @param {RebindAgentRuntimeConfig} original @param {string} workflowId @param {RebindMastraSessionLedgerState} state @param {number} attempt @param {number} waveIndex @param {RebindSessionHandoffContext} context @param {RebindSessionBridgeAction} action @param {Map<string, OriginalContextAction>} originalByAction @param {Set<string>} usedOriginalContextActions */
function historicalConfiguredContext(
  root,
  current,
  original,
  workflowId,
  state,
  attempt,
  waveIndex,
  context,
  action,
  originalByAction,
  usedOriginalContextActions,
) {
  const retained = originalByAction.get(action.action_id);
  if (!retained) return configuredContextForStage(root, current, workflowId, action.stage_id, context);
  requireRebind(
    retained.wave_index === waveIndex &&
      retained.stage_id === action.stage_id &&
      retained.work_id === state.work_id &&
      retained.attempt === attempt,
    'original configured context action slot differs',
  );
  usedOriginalContextActions.add(action.action_id);
  return validateOriginalConfiguredContext(
    retained.context,
    original,
    workflowId,
    action.stage_id,
    state.work_id,
    attempt,
  );
}

/** @param {ReturnType<typeof inspectHistoricalOwnerContext>} inspected @returns {{readonly work: RebindStateVersion; readonly ledger: RebindStateVersion; readonly journal: RebindStateVersion}} */
function assertRecoveryReviewVersions(inspected) {
  requireRebind(
    inspected.owner.version && inspected.workspace.ledger_version && inspected.journal.version,
    'original recovery versions are unavailable',
  );
  return {
    work: inspected.owner.version,
    ledger: inspected.workspace.ledger_version,
    journal: inspected.journal.version,
  };
}

/** @param {unknown} value @returns {boolean} */
function isHistoricalFrontierSnapshot(value) {
  return isPlainRecord(value) && value.status === 'suspended';
}

/** @param {{ readonly index: number; readonly value: unknown }} entry @param {number} index @param {{ readonly index: number; readonly value: unknown } | undefined} frontier @returns {boolean} */
function isHistoricalWaveAtIndex(entry, index, frontier) {
  return (
    entry.index === index && isPlainRecord(entry.value) && (entry.value.status === 'success' || entry === frontier)
  );
}

/** @param {unknown} value @param {RebindMastraSessionLedgerState} state @param {number} attempt @param {RebindWorkState} work @param {Record<string, unknown>} engineRow @param {RebindWorkIdentity} identity @returns {{readonly snapshot: RebindMastraRunSnapshot; readonly input: RebindSessionBridgeRunState}} */
function assertHistoricalRunInput(value, state, attempt, work, engineRow, identity) {
  requireRebind(isMastraRunSnapshot(value), 'historical original engine snapshot is malformed');
  const input = parseSessionBridgeRunState(value.context.input);
  assertHistoricalRunIdentity(input, value, state, attempt, work, engineRow);
  assertHistoricalInputBindings(input, work, identity);
  return { snapshot: value, input };
}

/** @param {RebindSessionBridgeRunState} input @param {RebindMastraRunSnapshot} snapshot @param {RebindMastraSessionLedgerState} state @param {number} attempt @param {RebindWorkState} work @param {Record<string, unknown>} engineRow */
function assertHistoricalRunIdentity(input, snapshot, state, attempt, work, engineRow) {
  requireRebind(
    canonicalJsonDigest(input) === canonicalJsonDigest(snapshot.context.input) &&
      snapshot.status === 'suspended' &&
      snapshot.runId === state.run_id &&
      input.work_id === state.work_id &&
      input.attempt === attempt &&
      input.workflow_id === work.binding.workflow_id &&
      engineRow.workflow_name === input.workflow_id,
    'historical original engine input differs',
  );
}

/** @param {RebindSessionBridgeRunState} input @param {RebindWorkState} work @param {RebindWorkIdentity} identity */
function assertHistoricalInputBindings(input, work, identity) {
  requireRebind(
    input.config_digest === work.binding.config_digest &&
      input.scope_digest === work.binding.work_source_revision &&
      input.observations.length === 0 &&
      Array.isArray(input.selection?.risk_flags) &&
      input.selection.team === work.binding.team_id &&
      input.selection.project === identity.project_ids[0],
    'historical original engine input differs',
  );
}

/** @param {RebindAgentRuntimeConfig} config @param {string} workflowId @param {string} stageId */
function expectedOriginalContextEntries(config, workflowId, stageId) {
  const stage = config.workflows[workflowId]?.stages.find((candidate) => candidate.id === stageId);
  requireRebind(stage, 'original context stage is missing');
  const sourceIds = stage.context_source_ids ?? [],
    skillRefs = stage.context_skill_refs ?? [];
  requireRebind(
    isStringArray(sourceIds) &&
      isStringArray(skillRefs) &&
      sourceIds.length + skillRefs.length > 0 &&
      sourceIds.length + skillRefs.length <= MAX_CONFIGURED_CONTEXT_REFERENCES,
    'original context selection is invalid',
  );
  /** @type {OriginalContextEntry[]} */
  const expected = [];
  for (const id of sourceIds) {
    const matches = config.knowledge.sources.filter((candidate) => candidate.id === id);
    const source = uniqueOriginalContextSource(matches);
    expected.push({
      id,
      kind: source.kind,
      location: source.location,
      title: source.title,
    });
  }
  for (const location of skillRefs) {
    requireRebind(
      typeof location === 'string' && /^\.codex\/skills\/[A-Za-z0-9._-]+\/SKILL\.md$/.test(location),
      'original context skill selection is invalid',
    );
    expected.push({ id: location, kind: 'skill', location, title: path.basename(path.dirname(location)) });
  }
  return expected.sort((left, right) =>
    left.kind < right.kind ? -1 : left.kind > right.kind ? 1 : left.id < right.id ? -1 : left.id > right.id ? 1 : 0,
  );
}

/** @param {RebindAgentRuntimeConfig['knowledge']['sources']} matches @returns {RebindAgentRuntimeConfig['knowledge']['sources'][number]} */
function uniqueOriginalContextSource(matches) {
  requireRebind(matches.length === 1, 'original context source selection is not unique');
  const source = matches[0];
  requireRebind(source !== undefined, 'original context source selection is not unique');
  return source;
}

/** @param {unknown} value @param {RebindAgentRuntimeConfig} config @param {string} workflowId @param {string} stageId @param {string} workId @param {number} attempt @returns {RebindConfiguredContext} */
function validateOriginalConfiguredContext(value, config, workflowId, stageId, workId, attempt) {
  requireRebind(
    hasExactKeys(value, ['schema', 'work_id', 'attempt', 'entries', 'digest']) &&
      value.schema === 'ConfiguredContext/v1' &&
      value.work_id === workId &&
      value.attempt === attempt &&
      isUnknownArray(value.entries) &&
      typeof value.digest === 'string' &&
      /^[a-f0-9]{64}$/.test(value.digest),
    'original configured context body shape or identity invalid',
  );
  const entries = value.entries;
  const expected = expectedOriginalContextEntries(config, workflowId, stageId);
  requireRebind(entries.length === expected.length, 'original configured context selection differs');
  let totalBytes = 0;
  for (let index = 0; index < expected.length; index++) {
    const { entry, selected } = originalContextEntryPair(entries, expected, index);
    requireRebind(
      hasExactKeys(entry, ['id', 'kind', 'location', 'title', 'status', 'sha256', 'bytes', 'content', 'truncated']) &&
        entry.id === selected.id &&
        entry.kind === selected.kind &&
        entry.location === selected.location &&
        entry.title === selected.title,
      'original configured context entry selection differs',
    );
    if (selected.kind === 'official') {
      requireRebind(
        entry.status === 'unfetched_reference' &&
          entry.sha256 === null &&
          entry.bytes === null &&
          entry.content === null &&
          entry.truncated === false,
        'original configured context official reference differs',
      );
      continue;
    }
    requireRebind(
      entry.status === 'local_excerpt' &&
        typeof entry.sha256 === 'string' &&
        /^[a-f0-9]{64}$/.test(entry.sha256) &&
        isConfiguredContextByteCount(entry.bytes) &&
        entry.bytes >= 0 &&
        entry.bytes <= MAX_CONFIGURED_CONTEXT_FILE_BYTES &&
        typeof entry.content === 'string' &&
        entry.content.length <= MAX_CONFIGURED_CONTEXT_EXCERPT_CHARS &&
        typeof entry.truncated === 'boolean',
      'original configured context local entry is invalid',
    );
    totalBytes += entry.bytes;
    requireRebind(
      totalBytes <= MAX_CONFIGURED_CONTEXT_TOTAL_BYTES,
      'original configured context exceeds aggregate limit',
    );
    const encoded = Buffer.from(entry.content, 'utf8');
    requireRebind(encoded.toString('utf8') === entry.content, 'original configured context text is invalid UTF-8');
    if (!entry.truncated) {
      requireRebind(
        encoded.length === entry.bytes && sha(encoded) === entry.sha256,
        'original configured context complete source binding differs',
      );
    }
  }
  const { digest, ...body } = value;
  requireRebind(digest === canonicalJsonDigest(body), 'original configured context self binding differs');
  return /** @type {RebindConfiguredContext} */ (structuredClone(/** @type {unknown} */ (value)));
}

/** @param {readonly unknown[]} entries @param {readonly OriginalContextEntry[]} expected @param {number} index @returns {{readonly entry: unknown; readonly selected: OriginalContextEntry}} */
function originalContextEntryPair(entries, expected, index) {
  const entry = entries[index],
    selected = expected[index];
  requireRebind(entry !== undefined && selected !== undefined, 'original configured context entry is missing');
  return { entry, selected };
}

/** @param {unknown} key @param {unknown} value @param {Record<string, string>} values @returns {[string, string]} */
function parseRuntimeRebindArgument(key, value, values) {
  requireRebind(
    typeof key === 'string' &&
      key.startsWith('--') &&
      typeof value === 'string' &&
      value.length > 0 &&
      !Object.hasOwn(values, key),
    'invalid arguments',
  );
  return [key, value];
}

/** @param {Record<string, string>} values @param {string[]} keys @param {string} kind @param {string} mode @param {string} projectRoot @param {string} repairId */
function validRuntimeRebindArguments(values, keys, kind, mode, projectRoot, repairId) {
  const contract = reconcileCliContracts[kind];
  return (
    Object.keys(values).sort().join('|') === keys.sort().join('|') &&
    contract !== undefined &&
    ['runtime-config', 'runtime-config-delivery'].includes(kind) &&
    contract.modes.includes(mode) &&
    path.isAbsolute(projectRoot) &&
    path.resolve(projectRoot) === projectRoot &&
    identifier.test(repairId)
  );
}

/** @param {readonly string[]} args @returns {Record<string, string>} */
function parse(args) {
  requireRebind(args.length % 2 === 0, 'arguments must be paired');
  /** @type {Record<string, string>} */
  const values = {};
  for (let i = 0; i < args.length; i += 2) {
    const [key, value] = parseRuntimeRebindArgument(args[i], args[i + 1], values);
    values[key] = value;
  }
  const mode = values['--mode'] ?? '',
    kind = values['--kind'] ?? '',
    projectRoot = values['--project-root'] ?? '',
    repairId = values['--repair-id'] ?? '';
  const keys = reconcileExpectedOptions(kind, mode, values) ?? [];
  requireRebind(
    validRuntimeRebindArguments(values, keys, kind, mode, projectRoot, repairId),
    'mode, root, identity or argument set invalid',
  );
  return values;
}

/** @param {unknown} value @returns {asserts value is RebindInitializationReceipt} */
function assertInitializationReceipt(value) {
  const schemaValue = parseJsonUnknown(
    runtimePackageAccess()
      .readBytes('schemas/runtime-initialization.v1.schema.json', 'initialization schema')
      .toString('utf8'),
  );
  requireRebind(isPlainRecord(schemaValue), 'initialization schema must be a JSON object');
  const schema = /** @type {import('ajv/dist/2020.js').AnySchemaObject} */ (schemaValue);
  /** @type {import('ajv').ValidateFunction<RebindInitializationReceipt>} */
  const validateReceipt = new Ajv2020({ strict: true, allErrors: true }).compile(schema);
  requireRebind(validateReceipt(value), 'initialization receipt schema invalid');
}

/** @param {string} text @returns {RebindInitializationReceipt} */
function parseInitializationReceipt(text) {
  const value = parseJsonUnknown(text);
  assertInitializationReceipt(value);
  return value;
}

/** @param {RebindSafeRepositoryAccess} access @param {RebindAgentRuntimeConfig} _config @returns {{ readonly bytes: Buffer; readonly value: RebindInitializationReceipt }} */
function readReceipt(access, _config) {
  const bytes = access.readBytes(receiptPath, 'initialization receipt');
  return { bytes, value: parseInitializationReceipt(bytes.toString('utf8')) };
}

/** @param {string} root @param {RebindAgentRuntimeConfig} config @param {RebindInitializationReceipt} receipt */
function sameIdentity(root, config, receipt) {
  const projects = config.projects.map((item) => item.project_id).sort();
  requireRebind(
    receipt.repository_id === config.repository.repository_id &&
      canonicalJsonDigest(receipt.project_ids) === canonicalJsonDigest(projects) &&
      receipt.integrations_digest === canonicalJsonDigest(config.integrations) &&
      receipt.workspace_id === deriveWorkspaceId(config.repository.repository_id, root) &&
      receipt.bundle === config.runtime.bundle,
    'initialization project/integration/workspace identity differs',
  );
  return projects;
}

/** @type {readonly (readonly [string, string])[]} */
const prewriterWorkflows = [
  ['implementation_new', 'develop_change'],
  ['implementation_change', 'develop_change'],
  ['bug_fix', 'develop_fix'],
  ['task_execution', 'develop_task'],
];
/** @type {readonly string[]} */
const prewriterRoles = ['source-planner', 'security-prewriter'];

/** @param {unknown} left @param {unknown} right */
function sameJson(left, right) {
  return canonicalJsonDigest(left) === canonicalJsonDigest(right);
}

/** @param {readonly (readonly [string, string])[]} edges @returns {[string, string][]} */
function normalizedWorkflowEdges(edges) {
  return [...edges]
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)))
    .map(([from, to]) => [from, to]);
}

/** @param {RebindAgentRuntimeConfig} oldConfig @param {DeepMutable<RebindAgentRuntimeConfig>} normalized @param {RebindAgentRuntimeConfig} target @param {RebindAgentRuntimeConfig} maintainedTemplate @param {string} workflowId @param {string} developerId @returns {boolean} */
function normalizePrewriterWorkflow(oldConfig, normalized, target, maintainedTemplate, workflowId, developerId) {
  const original = oldConfig.workflows[workflowId],
    candidate = normalized.workflows[workflowId],
    beforeReview = target.workflows[workflowId];
  if (!original || !candidate || !beforeReview) return false;
  const originalDeveloper = original.stages.find((stage) => stage.id === developerId),
    developer = candidate.stages.find((stage) => stage.id === developerId),
    reviewStages = beforeReview.stages.filter((stage) => stage.id === 'review_source_prewrite'),
    review = reviewStages[0],
    expectedReview = maintainedTemplate.workflows[workflowId]?.stages.find(
      (stage) => stage.id === 'review_source_prewrite',
    ),
    stageIndex = beforeReview.stages.findIndex((stage) => stage.id === 'review_source_prewrite'),
    expectedStageIndex = maintainedTemplate.workflows[workflowId]?.stages.findIndex(
      (stage) => stage.id === 'review_source_prewrite',
    );
  if (
    !originalDeveloper ||
    !developer ||
    !review ||
    !expectedReview ||
    !prewriterStageBindingsMatch(
      original,
      originalDeveloper,
      developer,
      reviewStages,
      review,
      expectedReview,
      stageIndex,
      expectedStageIndex,
    )
  )
    return false;
  if (!prewriterWorkflowEdgesMatch(original, beforeReview, developerId)) return false;
  candidate.stages = candidate.stages.filter((stage) => stage.id !== 'review_source_prewrite');
  developer.required_after = ['synthesize_task'];
  candidate.edges = normalizedWorkflowEdges([
    ...candidate.edges.filter((edge) => !edge.includes('review_source_prewrite')),
    ['synthesize_task', developerId],
  ]);
  return true;
}

/** @param {RebindAgentRuntimeConfig['workflows'][string]} original @param {RebindAgentRuntimeConfig['workflows'][string]['stages'][number]} originalDeveloper @param {RebindAgentRuntimeConfig['workflows'][string]['stages'][number]} developer @param {RebindAgentRuntimeConfig['workflows'][string]['stages']} reviewStages @param {RebindAgentRuntimeConfig['workflows'][string]['stages'][number]} review @param {RebindAgentRuntimeConfig['workflows'][string]['stages'][number]} expectedReview @param {number} stageIndex @param {number | undefined} expectedStageIndex */
function prewriterStageBindingsMatch(
  original,
  originalDeveloper,
  developer,
  reviewStages,
  review,
  expectedReview,
  stageIndex,
  expectedStageIndex,
) {
  return (
    reviewStages.length === 1 &&
    !original.stages.some((stage) => stage.id === 'review_source_prewrite') &&
    sameJson(originalDeveloper.required_after, ['synthesize_task']) &&
    sameJson(developer.required_after, ['review_source_prewrite']) &&
    sameJson(review, expectedReview) &&
    stageIndex === expectedStageIndex
  );
}

/** @param {RebindAgentRuntimeConfig['workflows'][string]} original @param {RebindAgentRuntimeConfig['workflows'][string]} beforeReview @param {string} developerId @returns {boolean} */
function prewriterWorkflowEdgesMatch(original, beforeReview, developerId) {
  const synthesizedEdge = /** @type {[string, string]} */ (['synthesize_task', 'review_source_prewrite']),
    reviewEdge = /** @type {[string, string]} */ (['review_source_prewrite', developerId]),
    originalEdge = /** @type {[string, string]} */ (['synthesize_task', developerId]),
    reviewEdges = beforeReview.edges.filter((edge) => edge.includes('review_source_prewrite'));
  return (
    sameJson(reviewEdges, [synthesizedEdge, reviewEdge]) &&
    !beforeReview.edges.some((edge) => sameJson(edge, originalEdge)) &&
    original.edges.some((edge) => sameJson(edge, originalEdge))
  );
}

/** @param {RebindAgentRuntimeConfig} oldConfig @param {RebindAgentRuntimeConfig} target */
function exactPrewriterTemplateDelta(oldConfig, target) {
  const oldExecutor = oldConfig.agents.profiles.executor,
    targetExecutor = target.agents.profiles.executor,
    oldDevelopmentTeam = oldConfig.teams['default-development'],
    targetDevelopmentTeam = target.teams['default-development'];
  if (
    oldConfig.runtime.bundle !== 'packages/agent' ||
    target.runtime.bundle !== 'packages/agent' ||
    !oldDevelopmentTeam ||
    !targetDevelopmentTeam ||
    !oldExecutor ||
    !targetExecutor ||
    targetExecutor.model !== oldExecutor.model ||
    targetExecutor.reasoning !== oldExecutor.reasoning ||
    prewriterRoles.some(
      (role) =>
        Object.hasOwn(oldConfig.agents.role_instructions, role) || Object.hasOwn(oldDevelopmentTeam.roles, role),
    ) ||
    Object.hasOwn(oldConfig.artifact_contracts, 'LifecyclePreparationObservation/v1')
  )
    return false;

  let maintainedTemplate;
  try {
    const project = oldConfig.projects[0];
    if (!project) return false;
    const projectId = project.project_id,
      templateYaml = runtimePackageAccess()
        .readBytes('templates/agent-runtime.config.template.v1.yaml', 'maintained prewriter workflow template')
        .toString('utf8')
        .replaceAll('{{REPOSITORY}}', oldConfig.repository.repository_id)
        .replaceAll('{{PROJECT}}', projectId)
        .replaceAll('{{BUNDLE}}', oldConfig.runtime.bundle);
    maintainedTemplate = parseRuntimeConfigYaml(templateYaml);
  } catch {
    return false;
  }
  const expectedArtifact = maintainedTemplate.artifact_contracts['LifecyclePreparationObservation/v1'];
  if (!expectedArtifact || !sameJson(target.artifact_contracts['LifecyclePreparationObservation/v1'], expectedArtifact))
    return false;
  for (const role of prewriterRoles) {
    const expectedRole = maintainedTemplate.agents.role_instructions[role],
      expectedDevelopmentTeam = maintainedTemplate.teams['default-development'],
      expectedMapping = expectedDevelopmentTeam?.roles[role];
    if (
      !expectedRole ||
      !expectedMapping ||
      !sameJson(target.agents.role_instructions[role], expectedRole) ||
      targetDevelopmentTeam.roles[role] !== expectedMapping
    )
      return false;
  }

  const normalized = /** @type {DeepMutable<RebindAgentRuntimeConfig>} */ (structuredClone(target));
  const normalizedDevelopmentTeam = normalized.teams['default-development'];
  requireRebind(normalizedDevelopmentTeam, 'default development team is missing');
  for (const role of prewriterRoles) {
    delete normalized.agents.role_instructions[role];
    delete normalizedDevelopmentTeam.roles[role];
  }
  delete normalized.artifact_contracts['LifecyclePreparationObservation/v1'];

  for (const [workflowId, developerId] of prewriterWorkflows)
    if (!normalizePrewriterWorkflow(oldConfig, normalized, target, maintainedTemplate, workflowId, developerId))
      return false;

  const baseline = /** @type {DeepMutable<RebindAgentRuntimeConfig>} */ (structuredClone(oldConfig));
  for (const [workflowId] of prewriterWorkflows) {
    const workflow = baseline.workflows[workflowId];
    requireRebind(workflow, 'prewriter workflow is missing from baseline');
    workflow.edges = normalizedWorkflowEdges(workflow.edges);
  }
  return sameJson(normalized, baseline);
}

/** @param {RebindSafeRepositoryAccess} access @param {string} root @param {RebindAgentRuntimeConfig} oldConfig @param {string} targetPath */
/** @param {RebindConfigBytesReader} access @param {string} root @param {RebindAgentRuntimeConfig} oldConfig @param {string} targetPath */
function targetConfig(access, root, oldConfig, targetPath) {
  const bytes = access.readBytes(targetPath, 'authored target YAML');
  const target = validateRuntimeConfigRepairTargetBytes(bytes, root);
  const unchanged = /** @type {DeepMutable<RebindAgentRuntimeConfig>} */ (structuredClone(target)),
    unchangedExecutor = unchanged.agents.profiles.executor,
    oldExecutor = oldConfig.agents.profiles.executor;
  applyTargetExecutorBaseline(unchangedExecutor, oldExecutor, unchanged, target, oldConfig);
  return { bytes, config: target };
}

/** @param {DeepMutable<RebindAgentRuntimeConfig>['agents']['profiles']['executor'] | undefined} unchangedExecutor @param {RebindAgentRuntimeConfig['agents']['profiles']['executor'] | undefined} oldExecutor @param {DeepMutable<RebindAgentRuntimeConfig>} unchanged @param {RebindAgentRuntimeConfig} target @param {RebindAgentRuntimeConfig} oldConfig */
function applyTargetExecutorBaseline(unchangedExecutor, oldExecutor, unchanged, target, oldConfig) {
  requireRebind(unchangedExecutor && oldExecutor, 'executor profile is missing');
  unchangedExecutor.model = oldExecutor.model;
  unchangedExecutor.reasoning = oldExecutor.reasoning;
  requireRebind(
    (sameJson(unchanged, oldConfig) && runtimeConfigDigest(target) !== runtimeConfigDigest(oldConfig)) ||
      exactPrewriterTemplateDelta(oldConfig, target),
    'only requested executor model/reasoning or the approved prewriter workflow template delta may change',
  );
}

/** Recovery reads historical authority without passing the ordinary current-execution gate. No initializer or engine producer runs here. */
/**
 * @param {string} root
 * @param {string} baselinePath
 * @param {import('../src/host-state.ts').WorkIdentity} identity
 * @param {number} attempt
 * @param {unknown} [originalContexts]
 * @returns {{config: ReturnType<typeof loadRuntimeConfig>, current: ReturnType<typeof loadRuntimeConfig>, workspace: ReturnType<typeof inspectCliHostWorkspaceDatabase>, owner: ReturnType<typeof inspectCliHostWorkspaceDatabase>['work'][number], journal: ReturnType<typeof inspectCliHostWorkspaceDatabase>['journals'][number], ledgerState: RebindMastraSessionLedgerState, maintenanceGeneration: number, engine_binding: string, baseline_binding: string, receipt_binding: string, runtime_binding: ReturnType<typeof runtimeBinding>}}
 */
export function inspectHistoricalOwnerContext(root, baselinePath, identity, attempt, originalContexts) {
  const originalContextByAction = validateOriginalContextCollection(originalContexts),
    /** @type {Set<string>} */
    usedOriginalContextActions = new Set();
  const access = requireSafeRepositoryAccess(root),
    current = loadRuntimeConfig(root);
  requireRebind(
    typeof baselinePath === 'string' && baselinePath.length <= 2048,
    'historical baseline reference invalid',
  );
  const baselineBytes = access.readBytes(baselinePath, 'original configuration');
  requireRebind(baselineBytes.length <= 1024 * 1024, 'historical baseline exceeds bound');
  const config = validateRuntimeConfigRepairTargetBytes(baselineBytes, root),
    receipt = readReceipt(access, current);
  sameIdentity(root, config, receipt.value);
  sameIdentity(root, current, receipt.value);
  requireRebind(
    config.runtime.bundle === 'packages/agent' && receipt.value.config_digest === runtimeConfigDigest(config),
    'historical baseline is not the local accepted Source configuration',
  );
  const runtime = runtimeBinding(access, config);
  requireRebind(
    receipt.value.schema_sha256 ===
      sha(runtimePackageAccess().readBytes('schemas/runtime-initialization.v1.schema.json', 'initialization schema')),
    'historical initialization schema differs',
  );
  if (runtimeConfigDigest(current) !== runtimeConfigDigest(config)) targetConfig(access, root, config, configPath);
  const project = loadProjectSetContext(root, current, config.repository.repository_id, identity.project_ids);
  requireRebind(
    identity.repository_id === project.repository_id &&
      canonicalJsonDigest(identity.project_ids) === canonicalJsonDigest(project.project_ids) &&
      identity.integrations_digest === project.integrations_digest &&
      identity.project_ids.length === 1 &&
      Number.isSafeInteger(attempt) &&
      attempt > 0,
    'historical project or attempt differs',
  );
  const workspace = inspectCliHostWorkspaceDatabase(
    root,
    sessionHandoffDatabasePath(root, current),
    receipt.value.workspace_id,
  );
  const owners = workspace.work.filter((row) => canonicalJsonDigest(row.identity) === canonicalJsonDigest(identity));
  const journals = workspace.journals.filter((row) => row.work_id === identity.work_id && row.attempt === attempt);
  requireRebind(
    owners.length === 1 && journals.length === 1,
    'historical work/journal missing or ambiguous; inert release is unsupported',
  );
  const owner = owners[0],
    journal = journals[0];
  requireRebind(owner !== undefined && journal !== undefined, 'historical work/journal row is missing');
  const work = owner.state,
    state = parseMastraSessionLedgerState(journal.state);
  const hostDatabase = database(root, current, true);
  let maintenanceGeneration;
  try {
    maintenanceGeneration = createCliHostStateStore(hostDatabase, state.workspace_id).readHostStateSnapshot(
      identity,
    ).maintenanceGeneration;
  } finally {
    closeWorkspaceDatabaseWithAdmission(hostDatabase);
  }
  requireRebind(
    work.binding.config_digest === runtimeConfigDigest(config) &&
      state.workspace_id === receipt.value.workspace_id &&
      state.attempt === attempt &&
      state.run_id === work.execution.run_id &&
      !state.corrective_execution,
    'historical work configuration or base run differs',
  );
  const file = sessionBridgeDatabasePath(root, config);
  const engine = openCliWorkspaceDatabase(root, file, state.workspace_id, true);
  try {
    const rows = queryWorkspaceRowsUnknown(
      engine,
      'SELECT workflow_name,json(snapshot) AS snapshot FROM mastra_workflow_snapshot WHERE run_id=?',
      [state.run_id],
    );
    const engineRowValue = rows[0];
    requireRebind(
      rows.length === 1 &&
        isPlainRecord(engineRowValue) &&
        typeof engineRowValue.snapshot === 'string' &&
        typeof engineRowValue.workflow_name === 'string',
      'historical original engine missing or ambiguous',
    );
    const engineRow = engineRowValue;
    const snapshotText = engineRow.snapshot;
    requireRebind(typeof snapshotText === 'string', 'historical engine snapshot text is malformed');
    const snapshotValue = parseJsonUnknown(snapshotText),
      historicalInput = assertHistoricalRunInput(snapshotValue, state, attempt, work, engineRow, identity),
      input = historicalInput.input,
      snapshot = historicalInput.snapshot;
    const context = { work_id: state.work_id, attempt, scope_digest: input.scope_digest };
    requireRebind(
      sessionBridgeRunId(state.workspace_id, context, input.workflow_id) === state.run_id,
      'historical original run identity differs',
    );
    const waves = Object.entries(snapshot.context)
      .filter(([key]) => /^wave-\d+$/.test(key))
      .map(([key, value]) => ({ index: Number(key.slice(5)), value }))
      .sort((a, b) => a.index - b.index);
    const frontiers = waves.filter((entry) => isHistoricalFrontierSnapshot(entry.value));
    requireRebind(
      frontiers.length === 1 &&
        waves.every((entry, index) => isHistoricalWaveAtIndex(entry, index, frontiers[0])) &&
        frontiers[0] === waves.at(-1),
      'historical engine frontier differs',
    );
    const allItems = [...state.completed.flatMap((wave) => wave.items), ...state.items];
    let prior = input,
      matched = 0;
    for (const { index, value: wave } of waves) {
      requireRebind(isPlainRecord(wave) && isPlainRecord(wave.payload), 'historical engine wave shape differs');
      requireRebind(
        canonicalJsonDigest(wave.payload) === canonicalJsonDigest(prior),
        'historical engine wave input differs',
      );
      // Current loader brands topology only after the executor-only delta was proved.
      // Historical requests and rights retain the original configuration binding.
      const actions = sessionActionsForWave(current, input.selection, context, input.workflow_id, index, []);
      const requests = actions.map((action) => {
        const configuredContext = historicalConfiguredContext(
          root,
          current,
          config,
          input.workflow_id,
          state,
          attempt,
          index,
          context,
          action,
          originalContextByAction,
          usedOriginalContextActions,
        );
        return buildSessionBridgeRequest({
          runId: state.run_id,
          workflowId: input.workflow_id,
          configDigest: input.config_digest,
          context,
          waveIndex: index,
          action,
          configuredContext,
          priorResults: prior.observations,
        });
      });
      const items = allItems.filter((item) => item.request.wave_index === index);
      requireRebind(
        requests.length > 0 &&
          items.length === requests.length &&
          requests.every(
            (request) =>
              items.filter(
                (item) =>
                  canonicalJsonDigest(parseSessionBridgeRequest(item.request)) === canonicalJsonDigest(request) &&
                  canonicalJsonDigest(item.request) === canonicalJsonDigest(request),
              ).length === 1,
          ),
        'historical original configured requests differ',
      );
      matched += items.length;
      if (wave.status === 'success') {
        const resumePayload = wave.resumePayload;
        requireRebind(
          isPlainRecord(resumePayload) && Array.isArray(resumePayload.observations),
          'historical engine resume payload differs',
        );
        const observations = resumePayload.observations.map(parseSessionBridgeObservation);
        requireRebind(
          Array.isArray(observations) &&
            observations.length === items.length &&
            observations.every(
              (observation) =>
                items.filter(
                  (item) =>
                    item.issue_id === observation.issue_id &&
                    canonicalJsonDigest(item.observation) === canonicalJsonDigest(observation),
                ).length === 1,
            ) &&
            !Object.hasOwn(wave, 'suspendPayload'),
          'historical engine accepted observations differ',
        );
        prior = { ...prior, observations: [...prior.observations, ...observations] };
        requireRebind(
          canonicalJsonDigest(wave.output) === canonicalJsonDigest(prior),
          'historical engine output differs',
        );
      } else
        requireRebind(
          isPlainRecord(wave.suspendPayload) &&
            canonicalJsonDigest(wave.suspendPayload.requests) === canonicalJsonDigest(requests) &&
            canonicalJsonDigest(state.items.map((item) => item.request)) === canonicalJsonDigest(requests),
          'historical engine suspended requests differ',
        );
    }
    requireRebind(
      usedOriginalContextActions.size === originalContextByAction.size,
      'original configured context collection contains an extra or foreign action',
    );
    requireRebind(matched === allItems.length, 'historical journal has extra engine actions');
    for (const item of allItems) {
      if (item.observation) {
        const observation = parseSessionBridgeObservation(item.observation);
        requireRebind(
          canonicalJsonDigest(observation) === canonicalJsonDigest(item.observation) &&
            observation.action_id === item.request.action_id &&
            observation.issue_id === item.issue_id &&
            observation.output_digest === canonicalJsonDigest(observation.summary),
          'historical terminal observation differs',
        );
      }
    }
    return {
      config,
      current,
      workspace,
      owner,
      journal,
      ledgerState: state,
      maintenanceGeneration,
      engine_binding: canonicalJsonDigest(snapshot),
      baseline_binding: canonicalJsonDigest(baselineBytes.toString('utf8')),
      receipt_binding: canonicalJsonDigest(receipt.value),
      runtime_binding: runtime,
    };
  } finally {
    closeWorkspaceDatabaseWithAdmission(engine);
  }
}

/** Narrow trusted-isolated-caller API. Native tools and durable body custody belong to that caller. */
/** @param {RebindRecoveryReviewInput} input */
export function openInternalRecoveryReview(input) {
  const root = input.repositoryRoot;
  requireRebind(path.isAbsolute(root) && path.resolve(root) === root, 'recovery root invalid');
  const originalContexts = input.originalContexts === undefined ? undefined : structuredClone(input.originalContexts);
  const historical = () =>
    inspectHistoricalOwnerContext(root, input.baselinePath, input.identity, input.attempt, originalContexts);
  /** @param {ReturnType<typeof inspectHistoricalOwnerContext>} value */
  const contextBinding = (value) => ({
    baseline: value.baseline_binding,
    receipt: value.receipt_binding,
    engine: value.engine_binding,
    current_config: runtimeConfigDigest(value.current),
    original_config: runtimeConfigDigest(value.config),
    runtime: value.runtime_binding,
    original_source: value.ledgerState.source_scope?.digest,
  });
  const inspected = historical();
  const ticket = inspected.workspace.ledger?.tickets.find((t) => t.work_id === input.identity.work_id);
  requireRebind(ticket, 'original recovery owner unavailable');
  const sourceScope = inspected.ledgerState.source_scope;
  requireRebind(sourceScope, 'original recovery source scope unavailable');
  const recoveryVersions = assertRecoveryReviewVersions(inspected);
  /** @type {RebindRecoveryReviewBinding} */
  const fresh = {
    identity: input.identity,
    attempt: input.attempt,
    callerSession: input.callerSession,
    controllerId: input.controllerId,
    userInstructionRef: input.userInstructionRef,
    historicalOwner: ticket.thread_id,
    expectedWork: recoveryVersions.work,
    expectedLedger: recoveryVersions.ledger,
    expectedJournal: recoveryVersions.journal,
    maintenanceGeneration: inspected.maintenanceGeneration,
    source: snapshotDeclaredSources(
      requireSafeRepositoryAccess(root),
      sourceScope.entries.map((entry) => entry.path),
    ),
    context: contextBinding(inspected),
  };
  // Exact caller history is required on resume; never reconstruct a changed request.
  const request = input.request === undefined ? fresh : input.request;
  const historicalInspection = input.mode === 'inspect' && input.request !== undefined;
  /** @param {RebindRecoveryReviewBinding} value */
  const inspectionIdentity = (value) => {
    const { runtime: _runtime, ...context } = value.context;
    return { ...value, source: value.source.entries.map((entry) => entry.path), context };
  };
  requireRebind(
    canonicalJsonDigest(historicalInspection ? inspectionIdentity(request) : request) ===
      canonicalJsonDigest(historicalInspection ? inspectionIdentity(fresh) : fresh),
    'retained recovery request changed',
  );
  const frozen = structuredClone(request);
  const db = database(root, inspected.current, input.mode === 'inspect');
  try {
    const store = createCliHostStateStore(
      db,
      inspected.owner.state.workspace_id,
      undefined,
      undefined,
      undefined,
      undefined,
      root,
    );
    if (historicalInspection) {
      const operationKey = canonicalJsonDigest({
        identity: frozen.identity,
        attempt: frozen.attempt,
        action: 'recovery-review',
      });
      const operation = store.inspectOperation('vida-recovery-reviews', operationKey);
      requireRebind(
        operation && operation.request_digest === canonicalJsonDigest(frozen),
        'recovery retained request differs',
      );
      const readonly = () => {
        throw new Error('vida runtime-config rebind: inspection grants no recovery effects');
      };
      return Object.freeze({
        request: structuredClone(frozen),
        operation,
        inspect: () => store.inspectOperation('vida-recovery-reviews', operationKey),
        begin: readonly,
        complete: readonly,
        close: () => closeWorkspaceDatabaseWithAdmission(db),
      });
    }
    const handle = store.openRecoveryReview(
      frozen,
      () => {
        const current = historical();
        requireRebind(
          canonicalJsonDigest(contextBinding(current)) === canonicalJsonDigest(frozen.context),
          'recovery historical context changed',
        );
      },
      input.request === undefined ? 'reserve' : 'resume',
    );
    let closed = false;
    const live = () => requireRebind(!closed, 'recovery route is closed');
    return Object.freeze({
      request: structuredClone(frozen),
      operation: handle.operation,
      inspect: () => {
        live();
        return store.inspectRecoveryReview(handle);
      },
      begin: () => {
        live();
        return store.beginRecoveryReview(handle);
      },
      complete: (/** @type {unknown} */ observed) => {
        live();
        return store.completeRecoveryReview(handle, observed);
      },
      close: () => {
        if (!closed) {
          closed = true;
          closeWorkspaceDatabaseWithAdmission(db);
        }
      },
    });
  } catch (error) {
    closeWorkspaceDatabaseWithAdmission(db);
    throw error;
  }
}

/** @param {string} root @param {import('../src/config/runtime-config.ts').AgentRuntimeConfig} config @param {boolean} readonly */
function database(root, config, readonly) {
  return openCliWorkspaceDatabase(
    root,
    sessionHandoffDatabasePath(root, config),
    deriveWorkspaceId(config.repository.repository_id, root),
    readonly,
  );
}

/** @overload @param {RebindDatabase} db @param {'agent_host_state'} table @param {string} workspace @returns {CheckedHostStateRow[]} */
/** @overload @param {RebindDatabase} db @param {'agent_host_mastra_session_ledger'} table @param {string} workspace @returns {CheckedMastraLedgerRow[]} */
/** @overload @param {RebindDatabase} db @param {'agent_host_governance'} table @param {string} workspace @returns {CheckedGovernanceRow[]} */
/** @param {import('bun:sqlite').Database} db @param {RebindSqlTable} table @param {string} workspace */
function checkedRows(db, table, workspace) {
  const read = () => readCheckedWorkspaceRows(db, table, workspace);
  return db.inTransaction ? read() : db.transaction(read).deferred();
}

/** @param {RebindDatabase} db @param {RebindSqlTable} table @param {string} workspace */
function readCheckedWorkspaceRows(db, table, workspace) {
  const present = queryWorkspaceRowUnknown(db, "SELECT name FROM sqlite_master WHERE type='table' AND name=?", [table]);
  requireRebind(
    present === null || (isPlainRecord(present) && present.name === table),
    `${table} sqlite_master row is malformed`,
  );
  if (!present) return [];
  const oversized = queryWorkspaceRowUnknown(
    db,
    `SELECT 1 AS oversized FROM ${table} WHERE workspace_id=? AND length(CAST(payload AS BLOB))>? LIMIT 1`,
    [workspace, MAX_CANONICAL_BYTES],
  );
  requireRebind(
    oversized === null || (isPlainRecord(oversized) && oversized.oversized === 1),
    `${table} payload-budget query row is malformed`,
  );
  requireRebind(!oversized, `${table} row payload exceeds canonical byte budget`);
  const projection =
    table === 'agent_host_state'
      ? 'workspace_id,kind,id,revision,payload,digest,CAST(payload AS BLOB) AS raw_payload_bytes'
      : table === 'agent_host_mastra_session_ledger'
        ? 'workspace_id,work_id,attempt,revision,payload,digest,CAST(payload AS BLOB) AS raw_payload_bytes'
        : 'workspace_id,store_id,kind,record_key,revision,payload,digest,CAST(payload AS BLOB) AS raw_payload_bytes';
  const rows = queryWorkspaceRowsUnknown(
    db,
    `SELECT ${projection} FROM ${table} WHERE workspace_id=? ORDER BY payload`,
    [workspace],
  );
  return rows.map((unknownRow) => decodeCheckedWorkspaceRow(table, unknownRow, workspace));
}

/** @param {RebindSqlTable} table @param {unknown} unknownRow @param {string} workspace */
function decodeCheckedWorkspaceRow(table, unknownRow, workspace) {
  const decoded = decodeWorkspaceSqlRow(table, unknownRow, workspace);
  if (decoded.table === 'agent_host_state' && decoded.kind === 'work') {
    if (!isCheckedWorkState(decoded.value)) throw new Error('Host Work payload does not match work-state.v1');
    return { ...decoded, value: decoded.value };
  }
  if (decoded.table === 'agent_host_state' && decoded.kind === 'ledger') {
    if (!isCheckedCoordinationLedger(decoded.value)) throw new Error('Host coordination ledger payload is invalid');
    return { ...decoded, value: decoded.value };
  }
  if (decoded.table === 'agent_host_mastra_session_ledger')
    return { ...decoded, value: parseMastraSessionLedgerState(decoded.value) };
  if (!isCheckedGovernanceValue(decoded.value)) throw new Error('governance payload status is invalid');
  return { ...decoded, value: decoded.value };
}

/** @param {readonly CheckedHostStateRow[] | readonly CheckedMastraLedgerRow[] | readonly CheckedGovernanceRow[]} rows */
function checkedRowBindings(rows) {
  return rows.map(({ payload: _payload, payloadBytes, value: _value, ...metadata }) => ({
    ...metadata,
    payload_sha256: sha(payloadBytes),
  }));
}

/** Issued indexes follow risk filtering; absent original risk selection requires all possible profiles to be readonly. */
/** @param {RebindAgentRuntimeConfig} config @param {RebindSessionBridgeRequest} request */
export function cooperativeReadonlyAssignments(config, request) {
  const stage = config.workflows[request.workflow_id]?.stages.find((entry) => entry.id === request.stage_id);
  if (!stage || !Number.isSafeInteger(request.assignment_index) || request.assignment_index < 0) return false;
  const candidates = stage.assignments.filter(
    (assignment, rawIndex) =>
      assignment.role === request.role &&
      rawIndex >= request.assignment_index &&
      stage.assignments.slice(0, rawIndex).filter((prior) => prior.risk_flags === undefined).length <=
        request.assignment_index,
  );
  return candidates.length > 0 && candidates.every((assignment) => isCooperativeReadonlyAssignment(config, assignment));
}

/** @param {RebindAgentRuntimeConfig} config @param {RebindAgentRuntimeConfig['workflows'][string]['stages'][number]['assignments'][number]} assignment */
function isCooperativeReadonlyAssignment(config, assignment) {
  const profile = config.agents.profiles[assignment.profile];
  if (!profile) return false;
  const tools = config.agents.tool_policies[profile.tools_policy];
  return (
    profile.mutation_scope === 'none' &&
    tools?.source_write === false &&
    Array.isArray(tools.allowed_tools) &&
    tools.allowed_tools.every((/** @type {string} */ tool) =>
      ['runtime.read', 'source.read', 'docs.read', 'web.search'].includes(tool),
    ) &&
    ['none', 'official_docs'].includes(profile.egress_policy)
  );
}

/** Preserve original unknown research; classify only from its own frozen authority. */
/**
 * @param {string} root
 * @param {RebindAgentRuntimeConfig} config
 * @param {CheckedMastraLedgerRow} row
 * @param {RebindMastraSessionLedgerState['items'][number]} item
 * @param {readonly CheckedHostStateRow[]} host
 */
function readonlyUnknown(root, config, row, item, host) {
  const state = row.value,
    request = parseSessionBridgeRequest(item.request);
  requireRebind(
    state.schema === 'MastraSessionLedger/v1' &&
      state.workspace_id === row.workspace_id &&
      state.work_id === row.work_id &&
      state.attempt === row.attempt &&
      Number.isSafeInteger(state.attempt) &&
      state.attempt > 0 &&
      request.run_id === state.run_id &&
      item.host_reservation === undefined &&
      item.research_activation === undefined &&
      item.research_normalization === undefined,
    'issued native outcome is pending/unknown: original journal authority invalid',
  );
  return readonlyUnknownFrozenEngine(root, config, row, item, host);
}

/** @param {RebindMastraSessionLedgerState} state @param {RebindSessionBridgeRequest} request */
function assertReadonlyFrozenSourceScope(state, request) {
  requireRebind(
    state.source_scope?.schema === 'ScopedSourceSnapshot/v1' &&
      request.scope_digest === state.source_scope.digest &&
      state.source_scope.digest ===
        canonicalJsonDigest({ schema: state.source_scope.schema, entries: state.source_scope.entries }),
    'original source scope differs',
  );
}

/** @param {string} root @param {RebindAgentRuntimeConfig} config @param {CheckedWorkStateRow} ownerRow */
function assertReadonlyFrozenProjectBinding(root, config, ownerRow) {
  const currentConfig = loadRuntimeConfig(root);
  requireRebind(
    /** @type {const} */ (['repository', 'projects', 'integrations']).every(
      (key) => canonicalJsonDigest(currentConfig[key]) === canonicalJsonDigest(config[key]),
    ),
    'original project integration authority differs',
  );
  const project = loadProjectSetContext(
    root,
    currentConfig,
    config.repository.repository_id,
    ownerRow.value.binding.project_ids,
  );
  requireRebind(
    canonicalJsonDigest(project.project_ids) === canonicalJsonDigest(ownerRow.value.binding.project_ids) &&
      ownerRow.value.binding.integrations_digest === project.integrations_digest,
    'readonly owner project integration binding differs',
  );
}

/** @param {unknown} value @returns {asserts value is RebindMastraRunSnapshot} */
function assertReadonlyFrozenSnapshot(value) {
  requireRebind(isMastraRunSnapshot(value), 'issued native outcome snapshot is malformed');
}

/** @param {RebindMastraRunSnapshot} snapshot @param {RebindMastraSessionLedgerState} state @param {RebindSessionBridgeRequest} request @param {Record<string, unknown>} record @param {RebindAgentRuntimeConfig} config @returns {RebindSessionBridgeRunState} */
function assertReadonlyFrozenRunAuthority(snapshot, state, request, record, config) {
  const input = parseSessionBridgeRunState(snapshot.context.input);
  requireRebind(
    snapshot.runId === state.run_id &&
      snapshot.status === 'suspended' &&
      input?.work_id === state.work_id &&
      input.attempt === state.attempt &&
      input.workflow_id === request.workflow_id &&
      record.workflow_name === request.workflow_id &&
      input.scope_digest === request.scope_digest &&
      input.config_digest === runtimeConfigDigest(config) &&
      request.config_digest === input.config_digest &&
      sessionBridgeRunId(
        state.workspace_id,
        { work_id: state.work_id, attempt: state.attempt, scope_digest: input.scope_digest },
        request.workflow_id,
      ) === state.run_id,
    'issued native outcome is pending/unknown: frozen config/run authority differs',
  );
  return input;
}

/** @param {unknown} value @param {RebindSessionBridgeRunState} input @param {RebindMastraSessionLedgerState} state @param {RebindSessionBridgeRequest} request @returns {boolean} */
function isReadonlyFrozenWaveRequest(value, input, state, request) {
  if (!isPlainRecord(value) || !isPlainRecord(value.payload) || !isPlainRecord(value.suspendPayload)) return false;
  const requests = value.suspendPayload.requests;
  return (
    Array.isArray(requests) &&
    value.payload.config_digest === input.config_digest &&
    value.payload.work_id === state.work_id &&
    value.payload.attempt === state.attempt &&
    value.payload.scope_digest === request.scope_digest &&
    value.payload.workflow_id === request.workflow_id &&
    isUniqueReadonlyWaveRequest(requests, request)
  );
}

/** @param {readonly unknown[]} requests @param {RebindSessionBridgeRequest} request @returns {boolean} */
function isUniqueReadonlyWaveRequest(requests, request) {
  /** @type {(entry: unknown) => boolean} */
  const matches = (entry) => isReadonlyWaveRequestAction(entry, request);
  const candidate = requests.find(matches);
  return requests.filter(matches).length === 1 && canonicalJsonDigest(candidate) === canonicalJsonDigest(request);
}

/** @param {unknown} value @param {RebindSessionBridgeRequest} request @returns {boolean} */
function isReadonlyWaveRequestAction(value, request) {
  return isPlainRecord(value) && value.action_id === request.action_id;
}

/** Read the original suspended engine state after a caller has proved its Journal authority. */
/**
 * @param {string} root
 * @param {RebindAgentRuntimeConfig} config
 * @param {CheckedMastraLedgerRow} row
 * @param {RebindMastraSessionLedgerState['items'][number]} item
 * @param {readonly CheckedHostStateRow[]} host
 */
function readonlyUnknownFrozenEngine(root, config, row, item, host) {
  const state = row.value,
    request = parseSessionBridgeRequest(item.request);
  requireRebind(
    state.schema === 'MastraSessionLedger/v1' &&
      state.workspace_id === row.workspace_id &&
      state.work_id === row.work_id &&
      state.attempt === row.attempt &&
      Number.isSafeInteger(state.attempt) &&
      state.attempt > 0 &&
      request.run_id === state.run_id,
    'issued native outcome is pending/unknown: original journal authority invalid',
  );
  assertReadonlyFrozenSourceScope(state, request);
  const owner = host
    .filter(isCheckedWorkRow)
    .filter((entry) => entry.kind === 'work' && entry.value.binding?.lifecycle_work_id === state.work_id);
  const ownerRow = owner[0];
  requireRebind(
    owner.length === 1 &&
      ownerRow !== undefined &&
      validateReadonlyOwner(ownerRow.value) &&
      ownerRow.value.workspace_id === state.workspace_id &&
      ownerRow.value.binding.repository_id === config.repository.repository_id &&
      ownerRow.value.lease === null &&
      ownerRow.value.execution.status === 'suspended',
    'readonly issue lacks quiescent suspended owner',
  );
  // The frozen baseline is inspection evidence. Obtain the identity context
  // through the real current loader, after proving its identity/integration
  // domain is unchanged; execution rights still come from the frozen baseline.
  assertReadonlyFrozenProjectBinding(root, config, ownerRow);
  const file = sessionBridgeDatabasePath(root, config);
  const original = openCliWorkspaceDatabase(root, file, state.workspace_id, true);
  try {
    const rows = queryWorkspaceRowsUnknown(
      original,
      'SELECT workflow_name,run_id,json(snapshot) AS snapshot FROM mastra_workflow_snapshot WHERE run_id=?',
      [state.run_id],
    );
    const recordValue = rows[0];
    requireRebind(
      rows.length === 1 &&
        isPlainRecord(recordValue) &&
        typeof recordValue.workflow_name === 'string' &&
        typeof recordValue.run_id === 'string' &&
        typeof recordValue.snapshot === 'string',
      'issued native outcome is pending/unknown: original snapshot missing or ambiguous',
    );
    const record = recordValue;
    const snapshotText = record.snapshot;
    requireRebind(typeof snapshotText === 'string', 'issued engine snapshot text is malformed');
    const snapshotValue = parseJsonUnknown(snapshotText);
    assertReadonlyFrozenSnapshot(snapshotValue);
    const snapshot = snapshotValue,
      input = assertReadonlyFrozenRunAuthority(snapshot, state, request, record, config);
    const wave = snapshot.context[`wave-${request.wave_index}`];
    requireRebind(
      isReadonlyFrozenWaveRequest(wave, input, state, request),
      'issued native outcome is pending/unknown: suspended request differs',
    );
    const context = { work_id: state.work_id, attempt: state.attempt, scope_digest: input.scope_digest };
    // Frozen baseline is inspection evidence, never a newly authorized execution config.
    requireRebind(
      request.action_id ===
        canonicalJsonDigest({
          context,
          workflow_id: request.workflow_id,
          wave_index: request.wave_index,
          stage_id: request.stage_id,
          assignment_index: request.assignment_index,
        }),
      'original action identity differs',
    );
    requireRebind(
      cooperativeReadonlyAssignments(config, request),
      'issued native outcome is pending/unknown: capability is not cooperative readonly',
    );
    return { run_id: state.run_id, snapshot: record.snapshot };
  } finally {
    closeWorkspaceDatabaseWithAdmission(original);
  }
}

/**
 * @param {string} root
 * @param {RebindAgentRuntimeConfig} config
 * @param {CheckedMastraLedgerRow} row
 * @param {RebindMastraSessionLedgerState['items'][number]} item
 * @param {readonly CheckedHostStateRow[]} host
 * @param {RebindHostStateStore} store
 */
function readonlyBookkeepingUnknown(root, config, row, item, host, store) {
  if (!item.research_activation) return null;
  const state = row.value,
    ownerRows = host
      .filter(isCheckedWorkRow)
      .filter((entry) => entry.kind === 'work' && entry.value.binding?.lifecycle_work_id === state.work_id),
    ledgerRows = host.filter(isCheckedLedgerRow);
  const ownerEntry = ownerRows[0],
    ledgerEntry = ledgerRows[0];
  requireRebind(ownerEntry !== undefined && ledgerEntry !== undefined, 'readonly bookkeeping Host rows are missing');
  requireRebind(
    item.issue_id !== null &&
      item.observation === null &&
      !item.host_reservation &&
      !item.research_normalization &&
      ownerRows.length === 1 &&
      ledgerRows.length === 1 &&
      validateReadonlyOwner(ownerEntry.value) &&
      ownerEntry.workspace_id === row.workspace_id &&
      ownerEntry.value.lease === null &&
      ownerEntry.value.execution.status === 'suspended',
    'readonly bookkeeping UNKNOWN owner or Journal differs',
  );
  const owner = ownerEntry.value,
    identity = {
      repository_id: owner.binding.repository_id,
      project_ids: owner.binding.project_ids,
      integrations_digest: owner.binding.integrations_digest,
      work_id: state.work_id,
    };
  requireRebind(
    HostStateStore.isHostStateStore(store) && store.workspaceId === row.workspace_id,
    'readonly bookkeeping inspector Host workspace differs',
  );
  const snapshot = store.readHostStateSnapshot(identity);
  requireRebind(
    snapshot.work &&
      snapshot.ledger &&
      snapshot.workVersion &&
      snapshot.ledgerVersion &&
      canonicalJsonDigest(snapshot.work) === canonicalJsonDigest(owner) &&
      canonicalJsonDigest(snapshot.workVersion) ===
        canonicalJsonDigest({ revision: ownerEntry.revision, digest: ownerEntry.digest }) &&
      canonicalJsonDigest(snapshot.ledgerVersion) ===
        canonicalJsonDigest({ revision: ledgerEntry.revision, digest: ledgerEntry.digest }),
    'readonly bookkeeping current Host snapshot differs',
  );
  const intake = readAdmittedSessionIntake(root, store, identity),
    nativeSessionHandle = intake.native_session_handle,
    requestIntents = /** @type {const} */ (['next_work', 'linked_correction']),
    currentReleaseCandidates = snapshot.ledger.operations.flatMap((operation) => {
      if (
        operation.kind !== 'release' ||
        operation.work_id !== state.work_id ||
        operation.thread_id !== nativeSessionHandle ||
        operation.decided_by !== nativeSessionHandle ||
        typeof operation.operation_id !== 'string' ||
        typeof operation.decision_pointer !== 'string' ||
        operation.decision_pointer.length === 0 ||
        operation.decision_pointer.length > 2048 ||
        /\p{Cc}/u.test(operation.decision_pointer)
      )
        return [];
      const matchingIntents = requestIntents.filter(
        (requestIntent) =>
          operation.operation_id ===
          'readonly-bookkeeping-release-' +
            canonicalJsonDigest({
              work_id: state.work_id,
              nativeSessionHandle,
              userRequestPointer: operation.decision_pointer,
              requestIntent,
              journal: row.digest,
            }).slice(0, 40),
      );
      return matchingIntents.length > 0 ? [{ operation, matchingIntents }] : [];
    });
  requireRebind(
    currentReleaseCandidates.length === 1,
    'readonly bookkeeping original current release operation is missing or ambiguous',
  );
  const releaseCandidate = currentReleaseCandidates[0];
  requireRebind(releaseCandidate, 'readonly bookkeeping original release operation is missing');
  const { operation: release, matchingIntents } = releaseCandidate;
  requireRebind(matchingIntents.length === 1, 'readonly bookkeeping original release intent is ambiguous');
  requireRebind(
    typeof release.from_ledger_revision === 'number' &&
      typeof release.to_ledger_revision === 'number' &&
      typeof release.created_at === 'string' &&
      typeof release.decision_pointer === 'string' &&
      typeof release.ticket_id === 'string' &&
      Array.isArray(release.resources) &&
      snapshot.ledgerVersion !== null,
    'readonly bookkeeping original release operation fields are invalid',
  );
  const releaseKeys = [
      'schema',
      'operation_id',
      'kind',
      'ticket_id',
      'work_id',
      'thread_id',
      'source_revision',
      'resources',
      'from_ledger_revision',
      'to_ledger_revision',
      'decided_by',
      'decision_pointer',
      'created_at',
    ],
    validPointer =
      typeof release.decision_pointer === 'string' &&
      release.decision_pointer.length > 0 &&
      release.decision_pointer.length <= 2048 &&
      !/\p{Cc}/u.test(release.decision_pointer);
  requireRebind(
    hasExactKeys(release, releaseKeys) &&
      release.schema === 'CoordinationOperation/v1' &&
      release.kind === 'release' &&
      typeof release.operation_id === 'string' &&
      release.source_revision === owner.binding.work_source_revision &&
      release.thread_id === nativeSessionHandle &&
      release.decided_by === nativeSessionHandle &&
      validPointer &&
      Number.isSafeInteger(release.from_ledger_revision) &&
      release.from_ledger_revision > 0 &&
      release.to_ledger_revision === release.from_ledger_revision + 1 &&
      snapshot.ledgerVersion.revision >= release.to_ledger_revision &&
      Array.isArray(release.resources) &&
      release.resources.length > 0 &&
      Number.isFinite(Date.parse(release.created_at)),
    'readonly bookkeeping original release operation differs',
  );
  const ticketRows = snapshot.ledger.tickets.filter((ticket) => ticket.ticket_id === release.ticket_id),
    claimRows = snapshot.ledger.claims.filter((claim) => claim.ticket_id === release.ticket_id);
  requireRebind(
    ticketRows.length === 1 && claimRows.length === 1,
    'readonly bookkeeping original released ticket or claim is missing or ambiguous',
  );
  const ticket = ticketRows[0],
    claim = claimRows[0];
  requireRebind(ticket !== undefined && claim !== undefined, 'readonly bookkeeping ticket or claim is missing');
  const activationBinding = item.research_activation.plan?.binding,
    resources = [...(ticket.exclusive_resources ?? [])].sort();
  requireRebind(
    isReadonlyBookkeepingActivationBinding(
      activationBinding,
      ticket,
      claim,
      release,
      owner,
      state,
      identity,
      nativeSessionHandle,
      resources,
    ),
    'readonly bookkeeping exact released ticket or claim differs from activation',
  );
  const inspections = [];
  const projectId = identity.project_ids[0];
  requireRebind(projectId, 'readonly bookkeeping project identity is missing');
  for (const requestIntent of requestIntents) {
    try {
      const inspected = inspectHistoricalOwnerWork({
        store,
        identity,
        journal: {
          state,
          version: { revision: row.revision, digest: row.digest },
          resume_status: 'issued_outcome_uncertain',
        },
        expectedWork: snapshot.workVersion,
        expectedLedger: snapshot.ledgerVersion,
        expectedMaintenanceGeneration: snapshot.maintenanceGeneration,
        nativeSessionHandle,
        userRequestPointer: release.decision_pointer,
        requestIntent,
        config,
        predicate: 'readonly_bookkeeping',
        documentationContext: {
          repository_root: root,
          repository_id: identity.repository_id,
          project_id: projectId,
          work_id: identity.work_id,
        },
      });
      if (
        canonicalJsonDigest(inspected.workVersion) === canonicalJsonDigest(snapshot.workVersion) &&
        canonicalJsonDigest(inspected.ledgerVersion) === canonicalJsonDigest(snapshot.ledgerVersion)
      )
        inspections.push(requestIntent);
    } catch {
      // A failed bounded predicate inspection is not evidence for either intent.
    }
  }
  requireRebind(
    inspections.length === 1 && inspections[0] === matchingIntents[0],
    'readonly bookkeeping predicate inspection did not uniquely validate the retained release',
  );
  const overlapping = snapshot.ledger.tickets.filter(
    (other) =>
      other.ticket_id !== ticket.ticket_id &&
      ['queued', 'active', 'ready_for_handoff', 'blocked'].includes(other.status) &&
      other.exclusive_resources.some((resource) => resources.includes(resource)),
  );
  requireRebind(overlapping.length === 0, 'readonly bookkeeping scope has a current overlapping owner');
  const engine = readonlyUnknownFrozenEngine(root, config, row, item, host);
  return {
    ...engine,
    outcome: 'UNKNOWN',
    custody_binding: canonicalJsonDigest({
      journal: { revision: row.revision, digest: row.digest },
      action_id: item.request.action_id,
      issue_id: item.issue_id,
      activation: item.research_activation,
      release,
      ticket,
      claim,
      request_intent: inspections[0],
    }),
  };
}

/** @param {unknown} activationBinding @param {RebindCoordinationLedger['tickets'][number]} ticket @param {RebindCoordinationLedger['claims'][number]} claim @param {RebindCoordinationLedger['operations'][number]} release @param {RebindWorkState} owner @param {RebindMastraSessionLedgerState} state @param {RebindWorkIdentity} identity @param {string} nativeSessionHandle @param {readonly string[]} resources @returns {boolean} */
function isReadonlyBookkeepingActivationBinding(
  activationBinding,
  ticket,
  claim,
  release,
  owner,
  state,
  identity,
  nativeSessionHandle,
  resources,
) {
  return (
    Boolean(activationBinding) &&
    isReadonlyBookkeepingTicketOwner(activationBinding, ticket, release, owner, state, identity, nativeSessionHandle) &&
    isReadonlyBookkeepingTicketResources(activationBinding, ticket, claim) &&
    isReadonlyBookkeepingClaim(claim, ticket, state, nativeSessionHandle, resources) &&
    canonicalJsonDigest(sortedTextValues(release.resources)) === canonicalJsonDigest(resources)
  );
}

/** @param {unknown} activationBinding @param {RebindCoordinationLedger['tickets'][number]} ticket @param {RebindCoordinationLedger['operations'][number]} release @param {RebindWorkState} owner @param {RebindMastraSessionLedgerState} state @param {RebindWorkIdentity} identity @param {string} nativeSessionHandle @returns {boolean} */
function isReadonlyBookkeepingTicketOwner(
  activationBinding,
  ticket,
  release,
  owner,
  state,
  identity,
  nativeSessionHandle,
) {
  if (!isPlainRecord(activationBinding)) return false;
  return (
    ticket.status === 'released' &&
    release.ticket_id === activationBinding.lease_ticket_id &&
    ticket.work_id === state.work_id &&
    ticket.thread_id === nativeSessionHandle &&
    ticket.source_revision === owner.binding.work_source_revision &&
    ticket.repository_id === identity.repository_id &&
    canonicalJsonDigest(ticket.project_ids) === canonicalJsonDigest(identity.project_ids) &&
    ticket.integrations_digest === identity.integrations_digest
  );
}

/** @param {unknown} activationBinding @param {RebindCoordinationLedger['tickets'][number]} ticket @param {RebindCoordinationLedger['claims'][number]} claim @returns {boolean} */
function isReadonlyBookkeepingTicketResources(activationBinding, ticket, claim) {
  if (!isPlainRecord(activationBinding)) return false;
  return (
    ticket.generation === activationBinding.lease_generation &&
    ticket.expires_at === null &&
    ticket.active_resources.length === 0 &&
    ticket.blocked_resources.length === 0 &&
    ticket.claim_ids.length === 1 &&
    ticket.claim_ids[0] === claim.claim_id
  );
}

/** @param {RebindCoordinationLedger['claims'][number]} claim @param {RebindCoordinationLedger['tickets'][number]} ticket @param {RebindMastraSessionLedgerState} state @param {string} nativeSessionHandle @param {readonly string[]} resources @returns {boolean} */
function isReadonlyBookkeepingClaim(claim, ticket, state, nativeSessionHandle, resources) {
  return (
    claim.status === 'released' &&
    claim.work_id === state.work_id &&
    claim.thread_id === nativeSessionHandle &&
    claim.generation === ticket.generation &&
    typeof claim.lease_expires_at === 'string' &&
    Number.isFinite(Date.parse(claim.lease_expires_at)) &&
    canonicalJsonDigest([...claim.resources].sort()) === canonicalJsonDigest(resources)
  );
}

/** @param {unknown} value @param {string} label @param {number} maximumBytes @returns {{bytes: Buffer; value: unknown}} */
function storedBase64(value, label, maximumBytes) {
  requireRebind(
    typeof value === 'string' && value.length > 0 && value.length <= Math.ceil((maximumBytes * 4) / 3) + 4,
    `${label} base64 invalid`,
  );
  const bytes = Buffer.from(value, 'base64');
  requireRebind(bytes.length <= maximumBytes && bytes.toString('base64') === value, `${label} base64 invalid`);
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    requireRebind(false, `${label} is not valid UTF-8`);
  }
  requireRebind(Buffer.from(text, 'utf8').equals(bytes), `${label} UTF-8 bytes are not canonical`);
  try {
    return { bytes, value: parseJsonUnknown(text) };
  } catch {
    requireRebind(false, `${label} is not JSON`);
  }
}

/** Read an immutable terminal synthesis custody receipt without accepting its result. */
/**
 * @param {RebindDatabase} db
 * @param {string} root
 * @param {RebindAgentRuntimeConfig} config
 * @param {CheckedMastraLedgerRow} row
 * @param {RebindMastraSessionLedgerState['items'][number]} item
 * @param {readonly CheckedHostStateRow[]} host
 * @param {RebindHostStateStore} store
 * @param {RebindInspectionReceipt} maintenanceReceipt
 */
function readonlyKnownTerminal(db, root, config, row, item, host, store, maintenanceReceipt) {
  const state = row.value;
  const ownerState = host
    .filter(isCheckedWorkRow)
    .find((entry) => entry.value.binding?.lifecycle_work_id === state.work_id)?.value;
  const ownerIdentity = ownerState?.binding
    ? {
        repository_id: ownerState.binding.repository_id,
        project_ids: ownerState.binding.project_ids,
        integrations_digest: ownerState.binding.integrations_digest,
        work_id: ownerState.binding.lifecycle_work_id,
      }
    : undefined;
  if (!ownerIdentity) return null;
  const receipt = store.readHistoricalTerminalSynthesisCapture(ownerIdentity, state.attempt, item.request.action_id);
  if (!receipt) return null;

  const provenanceKeys = [
      'schema',
      'body_ref',
      'input_ref',
      'report_ref',
      'followup_ref',
      'original_actor_id',
      'denial_status',
      'denial_code',
      'denial_message',
      'denial_reason_gap',
      'input_bytes_base64',
      'report_bytes_base64',
      'predecessor_refs',
    ],
    requestKeys = [
      'schema',
      'identity',
      'attempt',
      'action_id',
      'issue_id',
      'native_session_handle',
      'user_request_pointer',
      'request_intent',
      'expected_work',
      'expected_ledger',
      'expected_journal',
      'expected_maintenance_generation',
      'body_base64',
      'provenance',
    ],
    receiptKeys = [
      'schema',
      'request_digest',
      'request',
      'identity',
      'attempt',
      'action_id',
      'issue_id',
      'terminal_status',
      'task_status',
      'body_base64',
      'body_sha256',
      'body_byte_length',
      'provenance',
      'work_version',
      'ledger_version',
      'journal_version',
      'rights_granted',
      'accepted_result',
      'runtime_acceptance',
    ];
  requireRebind(
    hasExactKeys(receipt, receiptKeys) &&
      hasExactKeys(receipt.request, requestKeys) &&
      isHistoricalTerminalCaptureRequest(receipt.request) &&
      hasExactKeys(receipt.provenance, provenanceKeys) &&
      receipt.schema === 'HistoricalTerminalSynthesisCustodyReceipt/v1' &&
      receipt.terminal_status === 'known_terminal_unaccepted' &&
      receipt.task_status === 'unfinished' &&
      receipt.rights_granted === false &&
      receipt.accepted_result === false &&
      receipt.runtime_acceptance === false &&
      receipt.request_digest === canonicalJsonDigest(receipt.request) &&
      receipt.request.schema === 'HistoricalTerminalSynthesisCapture/v1' &&
      canonicalJsonDigest(receipt.request.provenance) === canonicalJsonDigest(receipt.provenance) &&
      receipt.request.body_base64 === receipt.body_base64 &&
      receipt.identity.work_id === state.work_id &&
      canonicalJsonDigest(receipt.identity) === canonicalJsonDigest(receipt.request.identity) &&
      receipt.attempt === state.attempt &&
      receipt.action_id === item.request.action_id &&
      receipt.issue_id === item.issue_id &&
      item.issue_id !== null &&
      item.observation === null &&
      item.research_activation &&
      !item.research_normalization &&
      !item.host_reservation,
    'known terminal synthesis custody identity or status differs',
  );

  const ownerRows = host
      .filter(isCheckedWorkRow)
      .filter((entry) => entry.kind === 'work' && entry.value.binding?.lifecycle_work_id === state.work_id),
    ledgerRows = host.filter(isCheckedLedgerRow);
  const expectedMaintenanceGeneration = receipt.request.expected_maintenance_generation,
    currentMaintenanceGeneration = store.readHostStateSnapshot(receipt.identity).maintenanceGeneration,
    heldMaintenanceFence = maintenanceReceipt?.fence,
    verifiedUnfencedStatus = verifiedMaintenanceStatus(db, store, maintenanceReceipt);
  const ownerRow = ownerRows[0],
    ledgerRow = ledgerRows[0];
  requireRebind(ownerRow !== undefined && ledgerRow !== undefined, 'known terminal synthesis Host rows are missing');
  requireRebind(
    maintenanceGenerationMatches(
      heldMaintenanceFence,
      verifiedUnfencedStatus,
      expectedMaintenanceGeneration,
      currentMaintenanceGeneration,
    ) &&
      ownerRows.length === 1 &&
      ledgerRows.length === 1 &&
      validateReadonlyOwner(ownerRow.value) &&
      ownerRow.workspace_id === state.workspace_id &&
      ownerRow.value.binding.repository_id === receipt.identity.repository_id &&
      canonicalJsonDigest(ownerRow.value.binding.project_ids) === canonicalJsonDigest(receipt.identity.project_ids) &&
      ownerRow.value.binding.integrations_digest === receipt.identity.integrations_digest &&
      ownerRow.value.lease === null &&
      ownerRow.value.execution.status === 'suspended' &&
      ownerRow.value.lifecycle.next_action ===
        'The synthesis body is known terminal but unaccepted; the task remains unfinished and continuation needs normal admission.' &&
      !ownerRow.value.artifacts.some((artifact) => artifact.schema === 'ResearchSynthesis/v1') &&
      receipt.request.expected_work.revision + 1 === ownerRow.revision &&
      receipt.request.expected_ledger.revision + 1 === receipt.ledger_version.revision &&
      receipt.work_version.revision === ownerRow.revision &&
      receipt.work_version.digest === ownerRow.digest &&
      receipt.ledger_version.revision <= ledgerRow.revision &&
      (receipt.ledger_version.revision < ledgerRow.revision || receipt.ledger_version.digest === ledgerRow.digest) &&
      receipt.journal_version.revision === row.revision &&
      receipt.journal_version.digest === row.digest &&
      receipt.request.expected_journal.revision === row.revision &&
      receipt.request.expected_journal.digest === row.digest,
    'known terminal synthesis Host versions, owner or maintenance binding differs',
  );

  const owner = ownerRow.value,
    synthesisStage = config.workflows[item.request.workflow_id]?.stages.find(
      (stage) => stage.id === item.request.stage_id,
    );
  requireRebind(
    item.request.workflow_id === owner.binding.workflow_id &&
      item.request.stage_id === 'synthesize_task' &&
      synthesisStage?.kind === 'synthesize' &&
      synthesisStage.produces.includes('ResearchSynthesis/v1') &&
      synthesisStage.assignments[item.request.assignment_index]?.role === 'research-synthesizer' &&
      cooperativeReadonlyAssignments(config, item.request),
    'known terminal synthesis original stage or configured readonly role differs',
  );

  const ledger = ledgerRow.value,
    request = receipt.request,
    releaseOperations = ledger.operations.filter(
      (operation) =>
        operation.kind === 'release' &&
        operation.work_id === state.work_id &&
        operation.thread_id === request.native_session_handle &&
        operation.decided_by === request.native_session_handle &&
        operation.decision_pointer === request.user_request_pointer &&
        operation.from_ledger_revision === request.expected_ledger.revision &&
        operation.to_ledger_revision === receipt.ledger_version.revision,
    );
  requireRebind(releaseOperations.length === 1, 'known terminal synthesis release operation differs');
  const release = releaseOperations[0];
  requireRebind(release, 'known terminal synthesis release operation is missing');
  const tickets = ledger.tickets.filter((entry) => entry.ticket_id === release.ticket_id),
    claims = ledger.claims.filter((entry) => entry.ticket_id === release.ticket_id);
  const ticket = tickets[0];
  requireRebind(
    ticket && Array.isArray(release.resources) && release.resources.every((resource) => typeof resource === 'string'),
    'known terminal synthesis ticket or resources are invalid',
  );
  requireRebind(
    tickets.length === 1 &&
      ticket.status === 'released' &&
      ticket.work_id === state.work_id &&
      ticket.thread_id === request.native_session_handle &&
      ticket.source_revision === ownerRow.value.binding.work_source_revision &&
      ticket.generation > 0 &&
      ticket.expires_at === null &&
      ticket.active_resources.length === 0 &&
      ticket.blocked_resources.length === 0 &&
      claims.length > 0 &&
      claims.every(
        (claim) =>
          claim.status === 'released' &&
          claim.work_id === state.work_id &&
          claim.thread_id === request.native_session_handle &&
          claim.generation === ticket.generation,
      ) &&
      canonicalJsonDigest(sortedTextValues(release.resources)) ===
        canonicalJsonDigest([...ticket.exclusive_resources].sort()),
    'known terminal synthesis original owner claim is not released exactly',
  );

  const bodyBytes = Buffer.from(receipt.body_base64, 'base64');
  requireRebind(
    receipt.body_base64.length > 0 &&
      bodyBytes.toString('base64') === receipt.body_base64 &&
      bodyBytes.length === receipt.body_byte_length &&
      sha(bodyBytes) === receipt.body_sha256,
    'known terminal synthesis body custody digest differs',
  );
  let body;
  try {
    body = parseSessionBridgeObservation(parseJsonUnknown(new TextDecoder('utf-8', { fatal: true }).decode(bodyBytes)));
  } catch {
    requireRebind(false, 'known terminal synthesis body custody is not valid JSON');
  }
  const provenance = receipt.provenance,
    input = storedBase64(provenance.input_bytes_base64, 'synthesis input', 65536).value,
    report = storedBase64(provenance.report_bytes_base64, 'synthesis report', 262144).value,
    summary = typeof body.summary === 'string' ? parseJsonUnknown(body.summary) : null;
  requireRebind(isSynthesisInputEvidence(input), 'known terminal synthesis input evidence is invalid');
  requireRebind(isSynthesisReportEvidence(report), 'known terminal synthesis report evidence is invalid');
  const predecessorResultIds = synthesisPredecessorResultIds(provenance.predecessor_refs);
  requireRebind(
    provenance.schema === 'HistoricalTerminalSynthesisProvenance/v1' &&
      [provenance.body_ref, provenance.input_ref, provenance.report_ref].every(
        isCanonicalHistoricalProvenanceReference,
      ) &&
      typeof provenance.followup_ref === 'string' &&
      provenance.followup_ref.length > 0 &&
      provenance.followup_ref.length <= 2048 &&
      !/\p{Cc}/u.test(provenance.followup_ref) &&
      provenance.denial_status === 'blocked' &&
      provenance.denial_code === 'GAP-VIDA-RUN-EXECUTION-001' &&
      provenance.denial_reason_gap === 'GAP-VIDA-RUN-EXECUTION-001' &&
      typeof provenance.denial_message === 'string' &&
      provenance.denial_message.length > 0 &&
      provenance.denial_message.length <= 2048 &&
      typeof provenance.original_actor_id === 'string' &&
      provenance.original_actor_id === body.agent_id &&
      body.schema === 'VidaSessionObservation/v1' &&
      body.status === 'reported_complete' &&
      body.action_id === item.request.action_id &&
      body.issue_id === item.issue_id &&
      body.tool_call_ref === provenance.followup_ref &&
      body.output_digest === canonicalJsonDigest(body.summary) &&
      input.status === body.status &&
      input.agent_id === body.agent_id &&
      input.tool_call_ref === body.tool_call_ref &&
      report.exit_code === 1 &&
      typeof report.input_path === 'string' &&
      path.resolve(root, provenance.input_ref) === report.input_path &&
      Array.isArray(report.command) &&
      typeof report.stderr === 'string' &&
      isSynthesisOutputSummary(summary) &&
      summary.schema === 'VidaSynthesisObservationOutput/v1' &&
      summary.readiness === 'blocked' &&
      summary.completeness?.status === 'blocked' &&
      (Array.isArray(summary.material_gaps) || Array.isArray(summary.completeness?.material_gaps)) &&
      predecessorResultIds.length === 2 &&
      new Set(predecessorResultIds).size === 2,
    'known terminal synthesis denial or provenance differs',
  );
  const predecessors = admittedResearchResultsForSynthesis({
      repositoryRoot: root,
      config,
      journal: {
        state,
        version: { revision: row.revision, digest: row.digest },
        resume_status: 'issued_outcome_uncertain',
      },
      work: owner,
      workflowId: item.request.workflow_id,
    }),
    predecessorRefs = predecessors
      .map((result) => ({ result_id: result.result_id, digest: result.digest }))
      .sort((left, right) => left.result_id.localeCompare(right.result_id));
  requireRebind(
    predecessors.length === 2 &&
      canonicalJsonDigest(provenance.predecessor_refs) === canonicalJsonDigest(predecessorRefs),
    'known terminal synthesis predecessor references differ from admitted Journal results',
  );
  let denial;
  try {
    denial = parseJsonUnknown(report.stderr);
  } catch {
    requireRebind(false, 'known terminal synthesis denial is not JSON');
  }
  requireRebind(isPlainRecord(denial), 'known terminal synthesis denial shape is invalid');
  requireRebind(
    denial.schema === 'VidaAgentRunResult/v1' &&
      denial.status === provenance.denial_status &&
      denial.code === provenance.denial_code &&
      denial.message === provenance.denial_message,
    'known terminal synthesis denial provenance differs',
  );

  // Reuse the existing readonly frozen-engine verifier with only the pre-capture
  // research activation fields projected away; no journal bytes are rewritten.
  const {
    research_activation: _activation,
    research_normalization: _normalization,
    host_reservation: _reservation,
    ...activationFreeItem
  } = item;
  const engine = readonlyUnknown(root, config, row, activationFreeItem, host);
  return {
    ...engine,
    terminal_status: 'known_terminal_unaccepted',
    custody_binding: canonicalJsonDigest(receipt),
  };
}

/** @param {RebindDatabase} db @param {RebindHostStateStore} store @param {RebindInspectionReceipt} receipt @returns {'held' | 'released' | null | 'unverified'} */
function verifiedMaintenanceStatus(db, store, receipt) {
  return receipt?.unfenced === true && db.inTransaction
    ? (receipt.prior?.status ?? null)
    : !db.inTransaction
      ? (store.readMaintenanceFence()?.status ?? null)
      : 'unverified';
}

/** @param {import('../src/host-state.ts').MaintenanceFence | null | undefined} held @param {'held' | 'released' | null | 'unverified'} status @param {number} expected @param {number} current @returns {boolean} */
function maintenanceGenerationMatches(held, status, expected, current) {
  return held
    ? held.status === 'held' && expected < held.generation && held.generation === current
    : isVerifiedUnfencedStatus(status) && expected <= current;
}

/** @param {'held' | 'released' | null | 'unverified'} status @returns {boolean} */
function isVerifiedUnfencedStatus(status) {
  return status !== 'held' && status !== 'unverified';
}

/** Historical rights come from the protected Work binding, never current YAML. */
/** @param {string} root @param {RebindAgentRuntimeConfig} config @param {string} workspace @returns {(expectedDigest: string) => RebindAgentRuntimeConfig} */
function historicalConfigResolver(root, config, workspace) {
  const configurations = new Map([[runtimeConfigDigest(config), config]]);
  let loaded = false;
  return (expectedDigest) => {
    const cached = configurations.get(expectedDigest);
    if (cached) return cached;
    if (!loaded) {
      loaded = true;
      const access = requireSafeRepositoryAccess(root);
      const directories = access.listFiles(config.control.work_root, 'retained config operation directories');
      requireRebind(directories.length <= 512, 'retained config operation directory bound exceeded');
      for (const id of directories) {
        if (!identifier.test(id)) continue;
        const directory = path.posix.join(config.control.work_root, id);
        const info = lstatSync(path.join(root, directory));
        if (!info.isDirectory() || info.isSymbolicLink()) continue;
        access.assertDirectory(directory, 'retained config operation directory');
        for (const [name, delivery] of /** @type {const} */ ([
          [operationName, false],
          [deliveryOperationName, true],
        ])) {
          const reference = path.posix.join(directory, name);
          if (!access.fileExists(reference, 'retained config operation')) continue;
          const { value } = readOperation(access, reference, id, root, delivery);
          if (value.phase !== 'applied' || value.maintenance_released !== true) continue;
          requireRebind(
            value.plan.workspace_id === workspace && value.plan.repository_id === config.repository.repository_id,
            'retained historical config operation belongs to another workspace',
          );
          for (const [yaml, digest] of /** @type {const} */ ([
            [value.plan.baseline_yaml, value.plan.old_config_digest],
            [value.plan.target_yaml, value.plan.target_config_digest],
          ])) {
            const original = validateRuntimeConfigRepairTargetBytes(Buffer.from(yaml), root);
            requireRebind(
              runtimeConfigDigest(original) === digest &&
                original.repository.repository_id === config.repository.repository_id,
              'retained historical config bytes differ from their binding',
            );
            configurations.set(digest, original);
          }
        }
      }
    }
    const resolved = configurations.get(expectedDigest);
    requireRebind(resolved, 'bound original configuration is unavailable');
    return resolved;
  };
}

/**
 * @param {RebindDatabase} db
 * @param {string} workspace
 * @param {string} root
 * @param {RebindAgentRuntimeConfig} config
 * @param {RebindHostStateStore | null} [existingStore]
 * @param {RebindInspectionReceipt} [maintenanceReceipt]
 * @returns {string}
 */
export function currentState(db, workspace, root, config, existingStore, maintenanceReceipt) {
  const hostRows = checkedRows(db, 'agent_host_state', workspace);
  for (const row of hostRows) {
    if (row.kind === 'work')
      requireRebind(
        row.value.lease === null &&
          row.value.execution.assignment_attempts.every((item) => !['started', 'uncertain'].includes(item.status)),
        'active/uncertain work blocks rebind',
      );
    if (row.kind === 'ledger')
      requireRebind(
        row.value.tickets.every((item) => !['queued', 'active'].includes(item.status)) &&
          row.value.claims.every((item) => item.status !== 'active'),
        'queued/active ownership blocks rebind',
      );
  }
  const mastraRows = checkedRows(db, 'agent_host_mastra_session_ledger', workspace);
  const frozen = [];
  const originalConfig = historicalConfigResolver(root, config, workspace);
  let terminalReceiptStore = existingStore;
  for (const row of mastraRows) {
    for (const item of row.value.items)
      if (item.issue_id !== null && item.observation === null) {
        try {
          terminalReceiptStore ??= createCliHostStateStore(db, workspace);
          requireRebind(
            HostStateStore.isHostStateStore(terminalReceiptStore) && terminalReceiptStore.workspaceId === workspace,
            'terminal synthesis reader Host workspace differs',
          );
          const owners = hostRows
            .filter(isCheckedWorkRow)
            .filter((entry) => entry.value.binding?.lifecycle_work_id === row.work_id);
          const owner = owners[0];
          requireRebind(
            owners.length === 1 && owner !== undefined && validateReadonlyOwner(owner.value),
            'historical UNKNOWN Work is missing or ambiguous',
          );
          const boundConfig = originalConfig(owner.value.binding.config_digest);
          const recognized =
            readonlyKnownTerminal(
              db,
              root,
              boundConfig,
              row,
              item,
              hostRows,
              terminalReceiptStore,
              maintenanceReceipt,
            ) ?? readonlyBookkeepingUnknown(root, boundConfig, row, item, hostRows, terminalReceiptStore);
          if (recognized) {
            frozen.push(recognized);
            continue;
          }
          const completed = row.value.completed,
            completedItems = completed.flatMap((wave) => wave.items);
          requireRebind(
            [...completedItems, ...row.value.items].every(isActivationFreeUnknownItem),
            'generic readonly UNKNOWN requires activation-free Journal history',
          );
          const {
            research_activation: _activation,
            research_normalization: _normalization,
            host_reservation: _reservation,
            ...activationFreeItem
          } = item;
          frozen.push(readonlyUnknown(root, boundConfig, row, activationFreeItem, hostRows));
        } catch (error) {
          requireRebind(
            false,
            `issued native outcome is pending/unknown: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
  }
  const governanceRows = checkedRows(db, 'agent_host_governance', workspace);
  requireRebind(
    governanceRows.every((row) => !['reserved', 'commit_unknown'].includes(row.value.status)),
    'governance effect pending/unknown',
  );
  return canonicalJsonDigest({
    host: checkedRowBindings(hostRows),
    mastra: checkedRowBindings(mastraRows),
    governance: checkedRowBindings(governanceRows),
    frozen,
  });
}

/** @param {RebindMastraSessionLedgerState['items'][number]} entry @returns {boolean} */
function isActivationFreeUnknownItem(entry) {
  return entry.research_activation === undefined && entry.research_normalization === undefined;
}

/** @param {RebindSafeRepositoryAccess} access */
function selector(access) {
  const bytes = access.readBytes(selectorPath, 'active selector');
  const value = parseJsonUnknown(bytes.toString('utf8'));
  requireRebind(isActiveRuntimeSelector(value), 'selected bundle identity invalid');
  return { bytes, value };
}

/** @param {unknown} value @returns {value is Record<string, unknown> & { readonly payload_manifest_sha256: string }} */
function isActiveRuntimeSelector(value) {
  return (
    hasExactKeys(value, ['schema', 'generation', 'bundle_root', 'runtime', 'config_path', 'payload_manifest_sha256']) &&
    value.schema === 'ActiveRuntimeSelector/v1' &&
    typeof value.generation === 'string' &&
    identifier.test(value.generation) &&
    value.bundle_root === 'vida-agent' &&
    value.runtime === 'vida-agent' &&
    value.config_path === configPath &&
    isSha256Text(value.payload_manifest_sha256)
  );
}

/** @param {unknown} value @returns {value is string} */
function isSha256Text(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
}

/** @param {unknown} workspace @param {unknown} manifest @param {string} bundle */
function assertSourcePackageIdentity(workspace, manifest, bundle) {
  requireRebind(
    isPlainRecord(workspace) &&
      isPlainRecord(manifest) &&
      workspace.private === true &&
      Array.isArray(workspace.workspaces) &&
      workspace.workspaces.includes(bundle) &&
      typeof manifest.name === 'string' &&
      manifest.name === 'vida-agent',
    'Source workspace or package identity differs',
  );
}

/** @param {readonly string[]} inventory */
function assertSourceRuntimeInventory(inventory) {
  requireRebind(
    inventory.includes('src/runtime-kernel.ts') && inventory.includes('bin/run.mjs'),
    'Source runtime is incomplete',
  );
}

/** @param {RebindScopedSourceSnapshot} source */
function assertSourceInventoryPresent(source) {
  requireRebind(
    source.entries.every((entry) => entry.exists),
    'Source runtime file disappeared',
  );
}

/** @param {RebindScopedSourceSnapshot} selection */
function assertSourceSelectorAbsent(selection) {
  requireRebind(
    selection.entries.find((entry) => entry.path === selectorPath)?.exists === false,
    'Source selector appeared',
  );
}

/** @param {RebindSafeRepositoryAccess} access @param {RebindAgentRuntimeConfig} config */
function runtimeBinding(access, config) {
  const bundle = config.runtime.bundle;
  const selectedExists = access.fileExists(selectorPath, 'active selector presence');
  if (bundle !== 'packages/agent') {
    requireRebind(selectedExists, 'selector absence is supported only for the Source project');
    const selected = selector(access);
    requireRebind(typeof selected.value.payload_manifest_sha256 === 'string', 'selector payload digest invalid');
    return { selector_digest: sha(selected.bytes), bundle_digest: selected.value.payload_manifest_sha256 };
  }
  requireRebind(!selectedExists, 'Source configuration rejects an active selector');
  requireRebind(
    bundle === 'packages/agent' &&
      config.projects.some((project) => project.project_id === 'agent' && project.project_root === bundle),
    'selector absence is supported only for the Source project',
  );
  const workspace = parseJsonUnknown(access.readBytes('package.json', 'Source workspace').toString('utf8'));
  const manifest = parseJsonUnknown(access.readBytes(bundle + '/package.json', 'Source package').toString('utf8'));
  assertSourcePackageIdentity(workspace, manifest, bundle);
  const packageRoot = path.join(access.repository_root, bundle);
  const inventory = runtimeExecutableInventory(packageRoot, 'source', requireSafeRepositoryAccess(packageRoot));
  assertSourceRuntimeInventory(inventory);
  const source = snapshotDeclaredSources(
    access,
    inventory.map((file) => bundle + '/' + file),
  );
  assertSourceInventoryPresent(source);
  const selection = snapshotDeclaredSources(access, [selectorPath, 'package.json']);
  assertSourceSelectorAbsent(selection);
  return {
    selector_digest: selection.digest,
    bundle_digest: source.digest,
  };
}

/** @param {Record<string, string>} values @param {string} root @param {RebindAgentRuntimeConfig} config @param {RebindSafeRepositoryAccess} access @param {RebindDatabase} db */
function frozenPlan(values, root, config, access, db) {
  const delivery = values['--kind'] === 'runtime-config-delivery';
  const baselinePath = delivery ? requireRebindPath(values['--baseline-config'], 'baseline config') : configPath;
  const baselineBytes = access.readBytes(baselinePath, 'local accepted baseline YAML');
  const receipt = readReceipt(access, config);
  if (delivery) {
    sameIdentity(root, config, receipt.value);
    config = validateRuntimeConfigRepairTargetBytes(baselineBytes, root);
    requireRebind(values['--target-config'] === configPath, 'delivery target must be the current root YAML');
  }
  const projects = sameIdentity(root, config, receipt.value);
  requireRebind(
    receipt.value.config_digest === runtimeConfigDigest(config),
    'plan requires unchanged baseline YAML and receipt',
  );
  const binding = runtimeBinding(access, config);
  const target = targetConfig(access, root, config, requireRebindPath(values['--target-config'], 'target config'));
  const schema = runtimePackageAccess().readBytes(
    'schemas/runtime-initialization.v1.schema.json',
    'initialization schema',
  );
  requireRebind(receipt.value.schema_sha256 === sha(schema), 'baseline initialization schema differs');
  const plan = {
    operation_id: values['--repair-id'],
    actor: values['--actor'],
    instruction_ref: values['--instruction-ref'],
    created_at: values['--timestamp'],
    repository_root: root,
    repository_id: config.repository.repository_id,
    project_ids: projects,
    workspace_id: receipt.value.workspace_id,
    baseline_yaml: baselineBytes.toString('utf8'),
    target_yaml: target.bytes.toString('utf8'),
    baseline_receipt: receipt.bytes.toString('utf8'),
    old_config_digest: runtimeConfigDigest(config),
    target_config_digest: runtimeConfigDigest(target.config),
    initialization_schema_digest: sha(schema),
    ...binding,
    state_digest: currentState(db, receipt.value.workspace_id, root, config),
    token: randomUUID(),
  };
  const operation = {
    schema: delivery ? 'SourceDeliveryConfigRebindOperation/v1' : 'ConfigRebindOperation/v1',
    revision: 1,
    phase: 'planned',
    maintenance_released: false,
    plan,
    plan_digest: delivery
      ? canonicalJsonDigest({ schema: 'SourceDeliveryConfigRebindOperation/v1', plan })
      : canonicalJsonDigest(plan),
  };
  requireRebind(operationValidator(delivery)(operation), 'operation schema invalid');
  return operation;
}

/** @param {unknown} value @param {string} id @param {string} root @param {boolean} delivery @returns {value is RebindOperationView} */
function isFrozenOperationBinding(value, id, root, delivery) {
  if (delivery)
    return (
      isDeliveryRebindOperation(value) &&
      value.plan.operation_id === id &&
      value.plan.repository_root === root &&
      value.plan_digest === operationDigest(value)
    );
  return (
    isRebindOperation(value, false) &&
    value.schema === 'ConfigRebindOperation/v1' &&
    value.plan.operation_id === id &&
    value.plan.repository_root === root &&
    value.plan_digest === operationDigest(value)
  );
}

/** @overload @param {RebindSafeRepositoryAccess} access @param {string} operationPath @param {string} id @param {string} root @param {true} delivery @returns {{ readonly bytes: Buffer; readonly value: SourceCorrectionOperationView }} */
/** @overload @param {RebindSafeRepositoryAccess} access @param {string} operationPath @param {string} id @param {string} root @param {false} delivery @returns {{ readonly bytes: Buffer; readonly value: RebindOperationView & { readonly schema: 'ConfigRebindOperation/v1' } }} */
/** @overload @param {RebindSafeRepositoryAccess} access @param {string} operationPath @param {string} id @param {string} root @param {boolean} delivery @returns {{ readonly bytes: Buffer; readonly value: RebindOperationView }} */
/** @param {RebindSafeRepositoryAccess} access @param {string} operationPath @param {string} id @param {string} root @param {boolean} delivery */
function readOperation(access, operationPath, id, root, delivery) {
  const bytes = access.readBytes(operationPath, 'config rebind operation');
  requireRebind(bytes.length <= 16 * 1024 * 1024, 'operation exceeds bound');
  /** @type {unknown} */
  const value = parseJsonUnknown(bytes.toString('utf8'));
  requireRebind(isFrozenOperationBinding(value, id, root, delivery), 'frozen operation invalid or foreign');
  return { bytes, value };
}

/** Read an already applied normal config edge; no maintenance or receipt mutation. */
/** @param {string} root @param {RebindAgentRuntimeConfig} config @param {string} operationId */
export function readAppliedRuntimeConfigRebind(root, config, operationId) {
  requireRebind(identifier.test(operationId), 'normal config operation identity invalid');
  const access = requireSafeRepositoryAccess(root),
    operationPath = `${config.control.work_root}/${operationId}/${operationName}`,
    stored = readOperation(access, operationPath, operationId, root, false),
    operation = stored.value,
    plan = operation.plan,
    before = validateRuntimeConfigRepairTargetBytes(Buffer.from(plan.baseline_yaml), root),
    after = validateRuntimeConfigRepairTargetBytes(Buffer.from(plan.target_yaml), root),
    receipt = readReceipt(access, config);
  sameIdentity(root, config, receipt.value);
  const projects = config.projects.map((project) => project.project_id).sort();
  requireRebind(
    operation.schema === 'ConfigRebindOperation/v1' &&
      operation.phase === 'applied' &&
      operation.maintenance_released === true &&
      plan.workspace_id === deriveWorkspaceId(config.repository.repository_id, root) &&
      plan.repository_id === config.repository.repository_id &&
      canonicalJsonDigest(plan.project_ids) === canonicalJsonDigest(projects) &&
      runtimeConfigDigest(before) === plan.old_config_digest &&
      runtimeConfigDigest(after) === plan.target_config_digest &&
      runtimeConfigDigest(config) === plan.target_config_digest &&
      receipt.value.config_digest === plan.target_config_digest &&
      access.readBytes(configPath, 'current normal config target').equals(Buffer.from(plan.target_yaml)) &&
      receipt.bytes.equals(
        Buffer.from(
          json({ ...parseInitializationReceipt(plan.baseline_receipt), config_digest: plan.target_config_digest }),
        ),
      ),
    'normal config operation is not the exact released current edge',
  );
  const hostDatabase = database(root, config, true);
  let release;
  try {
    release = createCliHostStateStore(hostDatabase, plan.workspace_id).readMaintenanceFence();
    requireRebind(
      release?.status === 'released' &&
        canonicalJsonDigest(release.binding) === canonicalJsonDigest(fenceBinding(plan, operation.plan_digest)),
      'normal config operation has no matching typed Host maintenance release',
    );
  } finally {
    closeWorkspaceDatabaseWithAdmission(hostDatabase);
  }
  return {
    ...stored,
    operationPath,
    receiptPath,
    receipt,
    release,
    targetSchemaDigest: sha(
      runtimePackageAccess().readBytes('schemas/agent-runtime-config.v1.schema.json', 'current config schema'),
    ),
  };
}

/** @param {string} file @param {number} maximum @param {string} label @returns {Buffer} */
function readExternalBytes(file, maximum, label) {
  requireRebind(
    typeof file === 'string' &&
      file.length > 0 &&
      file.length <= 4096 &&
      path.isAbsolute(file) &&
      path.resolve(file) === file &&
      !hasNulOrLineBreak(file),
    `${label} path invalid`,
  );
  const flags = constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0),
    fd = openSync(file, flags);
  try {
    const before = fstatSync(fd),
      namedBefore = lstatSync(file);
    requireRebind(
      before.isFile() &&
        namedBefore.isFile() &&
        !namedBefore.isSymbolicLink() &&
        before.nlink === 1 &&
        namedBefore.nlink === 1 &&
        before.dev === namedBefore.dev &&
        before.ino === namedBefore.ino &&
        before.size === namedBefore.size &&
        before.size <= maximum,
      `${label} is not a bounded regular file`,
    );
    const bytes = Buffer.alloc(before.size);
    let offset = 0;
    while (offset < bytes.length) {
      const count = readSync(fd, bytes, offset, bytes.length - offset, offset);
      requireRebind(count > 0, `${label} ended during read`);
      offset += count;
    }
    const after = fstatSync(fd),
      namedAfter = lstatSync(file),
      extra = Buffer.alloc(1);
    requireRebind(
      after.isFile() &&
        namedAfter.isFile() &&
        !namedAfter.isSymbolicLink() &&
        after.nlink === 1 &&
        namedAfter.nlink === 1 &&
        before.dev === after.dev &&
        before.ino === after.ino &&
        before.size === after.size &&
        before.mtimeMs === after.mtimeMs &&
        before.ctimeMs === after.ctimeMs &&
        after.dev === namedAfter.dev &&
        after.ino === namedAfter.ino &&
        after.size === namedAfter.size &&
        readSync(fd, extra, 0, 1, bytes.length) === 0,
      `${label} changed during read`,
    );
    return bytes;
  } finally {
    closeSync(fd);
  }
}

/** @param {string} file @param {number} maximum @param {string} label @returns {unknown} */
function parseExternalJson(file, maximum, label) {
  try {
    return parseJsonUnknown(new TextDecoder('utf-8', { fatal: true }).decode(readExternalBytes(file, maximum, label)));
  } catch (error) {
    requireRebind(false, externalJsonFailureMessage(label, error));
  }
}

/** @param {string} label @param {unknown} error @returns {string} */
function externalJsonFailureMessage(label, error) {
  const detail = error instanceof Error ? error.message : String(error);
  return `${label} is not bounded UTF-8 JSON: ${detail}`;
}

/** @param {unknown} value @returns {RebindScopedSourceSnapshot} */
function validSourceSnapshot(value) {
  requireRebind(
    hasExactKeys(value, ['schema', 'entries', 'digest']) &&
      value.schema === 'ScopedSourceSnapshot/v1' &&
      isUnknownArray(value.entries) &&
      value.entries.length > 0 &&
      value.entries.length <= 512 &&
      typeof value.digest === 'string' &&
      /^[a-f0-9]{64}$/.test(value.digest) &&
      value.digest === canonicalJsonDigest({ schema: value.schema, entries: value.entries }),
    'source snapshot shape or digest differs',
  );
  let prior = '';
  for (const entry of value.entries) {
    requireRebind(isValidSourceSnapshotEntry(entry, prior), 'source snapshot entry is invalid or unsorted');
    prior = entry.path;
  }
  return /** @type {RebindScopedSourceSnapshot} */ (/** @type {unknown} */ (value));
}

/** @param {unknown} value @param {string} prior @returns {value is RebindScopedSourceSnapshot['entries'][number]} */
function isValidSourceSnapshotEntry(value, prior) {
  if (!hasExactKeys(value, ['path', 'exists', 'bytes', 'sha256']) || !isPlainRecord(value)) return false;
  return (
    isCanonicalSnapshotPath(value.path) &&
    value.path > prior &&
    typeof value.exists === 'boolean' &&
    (value.exists ? isPresentSnapshotFile(value.bytes, value.sha256) : value.bytes === null && value.sha256 === null)
  );
}

/** @param {unknown} value @returns {value is string} */
function isCanonicalSnapshotPath(value) {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 512 &&
    !value.includes('\\') &&
    !value.startsWith('/') &&
    !/^[A-Za-z]:/.test(value) &&
    !hasControlCharacter(value) &&
    value.split('/').every((part) => part && part !== '.' && part !== '..')
  );
}

/** @param {unknown} bytes @param {unknown} digest @returns {boolean} */
function isPresentSnapshotFile(bytes, digest) {
  return (
    typeof bytes === 'number' &&
    Number.isSafeInteger(bytes) &&
    bytes >= 0 &&
    bytes <= 8 * 1024 * 1024 &&
    isSha256Text(digest)
  );
}

/** @param {unknown} value @param {string} operationId @param {string} operationPath @param {Uint8Array} operationBytes */
function sourceBeforeimageSnapshot(value, operationId, operationPath, operationBytes) {
  requireRebind(
    hasExactKeys(value, [
      'purpose',
      'operation_id',
      'operation_ref',
      'operation_bytes_base64',
      'source',
      'beforeimages',
      'recorded_at',
      'effects_issued',
    ]) &&
      value.purpose === 'inactive custody only; not an active repair artifact or admission' &&
      value.operation_id === operationId &&
      value.operation_ref === operationPath &&
      value.effects_issued === false &&
      typeof value.recorded_at === 'string' &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value.recorded_at) &&
      Number.isFinite(Date.parse(value.recorded_at)),
    'retained source custody identity differs',
  );
  requireRebind(
    typeof value.operation_bytes_base64 === 'string' && value.operation_bytes_base64.length <= 2 * 1024 * 1024,
    'retained source custody operation bytes are invalid',
  );
  const originalBytes = Buffer.from(value.operation_bytes_base64, 'base64');
  requireRebind(
    originalBytes.toString('base64') === value.operation_bytes_base64 && originalBytes.equals(operationBytes),
    'retained source custody operation bytes differ',
  );
  const recorded = validSourceSnapshot(value.source);
  requireRebind(
    recorded.entries.every((entry) => entry.exists) &&
      isUnknownArray(value.beforeimages) &&
      value.beforeimages.length === recorded.entries.length,
    'retained source custody inventory differs',
  );
  /** @type {Map<string, Buffer>} */
  const beforeimages = new Map();
  let total = 0;
  for (let index = 0; index < recorded.entries.length; index += 1) {
    const entry = recorded.entries[index],
      beforeimage = value.beforeimages[index];
    requireRebind(entry !== undefined, 'retained source snapshot entry is missing');
    requireRebind(
      hasExactKeys(beforeimage, ['path', 'bytes_base64']) &&
        beforeimage.path === entry.path &&
        typeof beforeimage.bytes_base64 === 'string' &&
        beforeimage.bytes_base64.length <= 12 * 1024 * 1024,
      'retained source beforeimage order or shape differs',
    );
    const bytes = Buffer.from(beforeimage.bytes_base64, 'base64');
    requireRebind(
      bytes.toString('base64') === beforeimage.bytes_base64 &&
        bytes.length === entry.bytes &&
        sha(bytes) === entry.sha256,
      'retained source beforeimage bytes differ',
    );
    total += bytes.length;
    requireRebind(total <= 64 * 1024 * 1024, 'retained source beforeimages exceed the source bound');
    beforeimages.set(entry.path, bytes);
  }
  const recomputed = snapshotDeclaredSources(
    {
      fileExists: (relative) => beforeimages.has(relative),
      readBytes: (relative) => {
        const bytes = beforeimages.get(relative);
        requireRebind(bytes !== undefined, 'retained source beforeimage is missing');
        return bytes;
      },
    },
    recorded.entries.map((entry) => entry.path),
  );
  requireRebind(recomputed.digest === recorded.digest, 'retained source snapshot does not match its beforeimages');
  return recomputed;
}

/** @param {RebindScopedSourceSnapshot} before @param {RebindScopedSourceSnapshot} after */
function sourceSnapshotChanges(before, after) {
  const beforeEntries = new Map(before.entries.map((entry) => [entry.path, entry])),
    afterEntries = new Map(after.entries.map((entry) => [entry.path, entry])),
    paths = [...new Set([...beforeEntries.keys(), ...afterEntries.keys()])].sort();
  /** @type {(entries: Map<string, RebindScopedSourceSnapshot['entries'][number]>) => RebindScopedSourceSnapshot} */
  const normalize = (entries) => {
    const projected = paths.map(
        (relative) => entries.get(relative) ?? { path: relative, exists: false, bytes: null, sha256: null },
      ),
      body = { schema: /** @type {const} */ ('ScopedSourceSnapshot/v1'), entries: projected };
    return { ...body, digest: canonicalJsonDigest(body) };
  };
  return compareScopedSourceSnapshots(normalize(beforeEntries), normalize(afterEntries));
}

/** @param {unknown} value @returns {readonly string[]} */
function canonicalChangedPaths(value) {
  requireRebind(Array.isArray(value) && value.length > 0 && value.length <= 64, 'authorized source path set invalid');
  requireRebind(isStringArray(value), 'authorized source paths must be text');
  const result = [...value].sort();
  requireRebind(
    result.length === new Set(result).size && result.every((relative) => isCanonicalAuthorizedSourcePath(relative)),
    'authorized source paths must be canonical package paths',
  );
  return result;
}

/** @param {string} relative @returns {boolean} */
function isCanonicalAuthorizedSourcePath(relative) {
  return (
    relative.length > 0 &&
    relative.length <= 512 &&
    relative.startsWith('packages/agent/') &&
    !relative.includes('\\') &&
    !relative.startsWith('/') &&
    !/^[A-Za-z]:/.test(relative) &&
    !hasControlCharacter(relative) &&
    relative.split('/').every((part) => part && part !== '.' && part !== '..')
  );
}

export function currentNativeSelfAttestation() {
  const runtime = standaloneRuntime();
  if (!runtime) return null;
  requireRebind(
    process.versions.bun === '1.4.2' &&
      path.isAbsolute(runtime.root) &&
      path.resolve(runtime.root) === runtime.root &&
      path.isAbsolute(runtime.executable) &&
      path.resolve(runtime.executable) === runtime.executable,
    'native self-attestation runtime identity differs',
  );
  const stat = lstatSync(runtime.executable);
  requireRebind(
    stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1 && stat.size > 0 && stat.size <= 512 * 1024 * 1024,
    'native executable is not a bounded regular file',
  );
  const packageBytes = readFileSync(path.join(runtime.root, 'package.json'));
  const packageManifestValue = parseJsonUnknown(packageBytes.toString('utf8'));
  requireRebind(isPackageManifest(packageManifestValue), 'native package manifest is malformed');
  const packageManifest = packageManifestValue,
    pin = readFileSync(path.join(runtime.root, '.bun-version'), 'utf8').trim(),
    executableBytes = readFileSync(runtime.executable),
    payloadPrefix = packageManifest.version + '-',
    basename = path.basename(runtime.root),
    payloadId = basename.startsWith(payloadPrefix) ? basename.slice(payloadPrefix.length) : '';
  requireRebind(
    packageManifest.name === 'vida-agent' &&
      stableVersionParts(packageManifest.version) !== null &&
      pin === '1.4.2' &&
      executableBytes.length === stat.size &&
      /^[a-f0-9]{64}$/.test(payloadId),
    'native executable, package, pin or resource payload identity differs',
  );
  return {
    schema: 'VidaAgentNativeSelfAttestation/v1',
    executable_path: runtime.executable,
    executable_bytes: executableBytes.length,
    executable_sha256: sha(executableBytes),
    package_name: packageManifest.name,
    package_version: packageManifest.version,
    package_manifest_sha256: sha(packageBytes),
    bun_version: pin,
    runtime_root: runtime.root,
    resource_payload_id: payloadId,
  };
}

/** @param {string} left @param {string} right */
function samePath(left, right) {
  const a = path.resolve(left),
    b = path.resolve(right);
  return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;
}

/** @param {string} executable */
function requireEffectivePath(executable) {
  const directory = path.dirname(executable),
    entries = String(process.env.PATH ?? '')
      .split(path.delimiter)
      .filter(Boolean);
  requireRebind(
    entries.some((entry) => samePath(entry, directory)),
    'installed command directory is absent from effective PATH',
  );
}

/** @param {RebindSafeRepositoryAccess} access @param {string} relative @param {number} expectedBytes @returns {string} */
function streamedNativeAssetDigest(access, relative, expectedBytes) {
  requireRebind(
    Number.isSafeInteger(expectedBytes) && expectedBytes > 0 && expectedBytes <= MAX_NATIVE_ASSET_BYTES,
    'native installation source asset exceeds its bounded size',
  );
  const absolutePath = path.join(access.repository_root, ...relative.split('/')),
    opened = openRootFileSync({
      absolutePath,
      rootPath: access.repository_root,
      boundaryLabel: 'native installation source asset',
      maxBytes: expectedBytes,
      rejectHardlinks: true,
      rejectSymlinks: true,
      allowedType: 'file',
    });
  requireRebind(opened.ok, 'native installation source asset is unsafe');
  try {
    const initialDescriptor = fstatSync(opened.fd),
      initialName = lstatSync(absolutePath);
    /** @param {import('node:fs').Stats} left @param {import('node:fs').Stats} right */
    const sameVersion = (left, right) =>
      sameFileIdentity(left, right) &&
      left.isFile() &&
      right.isFile() &&
      !left.isSymbolicLink() &&
      !right.isSymbolicLink() &&
      left.nlink === 1 &&
      right.nlink === 1 &&
      left.size === right.size &&
      left.mtimeMs === right.mtimeMs &&
      left.ctimeMs === right.ctimeMs;
    requireRebind(
      sameVersion(opened.stat, initialDescriptor) &&
        sameVersion(initialDescriptor, initialName) &&
        initialDescriptor.size === expectedBytes,
      'native installation source asset changed before read',
    );
    const hash = createHash('sha256'),
      chunk = Buffer.alloc(1024 * 1024);
    let bytesRead = 0;
    for (;;) {
      const length = Math.min(chunk.length, expectedBytes - bytesRead + 1),
        count = readSync(opened.fd, chunk, 0, length, bytesRead);
      if (count === 0) break;
      bytesRead += count;
      requireRebind(bytesRead <= expectedBytes, 'native installation source asset grew beyond its declared size');
      hash.update(chunk.subarray(0, count));
    }
    const finalDescriptor = fstatSync(opened.fd),
      finalName = lstatSync(absolutePath);
    requireRebind(
      bytesRead === expectedBytes &&
        sameVersion(initialDescriptor, finalDescriptor) &&
        sameVersion(finalDescriptor, finalName),
      'native installation source asset changed during read',
    );
    return hash.digest('hex');
  } finally {
    closeSync(opened.fd);
  }
}

/** @param {SourceCorrectionExternalReportView} report @param {SourceCorrectionRequestView} request @param {RebindSafeRepositoryAccess} access @param {NonNullable<ReturnType<typeof currentNativeSelfAttestation>>} selfAttestation */
function validateSourceCorrectionReport(report, request, access, selfAttestation) {
  assertExternalSourceCorrectionReport(report);
  const completeReport = { ...report, native_self_attestation: selfAttestation };
  const body = {
    schema: 'RuntimeConfigSourceCorrectionRepair/v1',
    status: 'applied',
    revision: 2,
    operation_id: request.operation_id,
    request,
    report: completeReport,
  };
  const artifact = { ...body, digest: canonicalJsonDigest(body) };
  requireRebind(validateSourceCorrection(artifact), 'source correction report or request schema invalid');
  const manifest = completeReport.build_manifest,
    ci = completeReport.ci_delivery,
    result = ci.result,
    expectedChecks = [{ id: 'native-build', status: 'passed' }],
    target = `bun-${process.platform.replace('win32', 'windows')}-${process.arch}`;
  requireRebind(
    selfAttestation &&
      manifest.version === request.new_source_manifest.version &&
      completeReport.request_id === request.request_id &&
      completeReport.operation_id === request.operation_id &&
      completeReport.publish_operation_id === request.publish_operation_id &&
      completeReport.original_operation_sha256 === request.original_operation.sha256 &&
      completeReport.original_plan_digest === request.original_operation.plan_digest &&
      completeReport.source_snapshot_digest === request.new_source.digest &&
      manifest.version === selfAttestation.package_version &&
      manifest.pin === '1.4.2' &&
      manifest.target === target &&
      manifest.payloadId === selfAttestation.resource_payload_id &&
      manifest.asset.file === `vida-agent-${target}${process.platform === 'win32' ? '.exe' : ''}` &&
      manifest.asset.bytes === selfAttestation.executable_bytes &&
      manifest.asset.sha256 === selfAttestation.executable_sha256 &&
      completeReport.build_manifest_sha256 === sha(Buffer.from(json(manifest))) &&
      ci.profile === 'native-build' &&
      ci.conclusion === 'success' &&
      ci.operation_id === request.publish_operation_id &&
      canonicalJsonDigest(ci.checks) === canonicalJsonDigest(expectedChecks) &&
      canonicalJsonDigest(result.checks) === canonicalJsonDigest(expectedChecks) &&
      ci.request_id === result.request_id &&
      ci.operation_id === result.operation_id &&
      ci.source_binding === result.source_binding &&
      ci.run_id === result.run_id &&
      ci.run_attempt === result.run_attempt &&
      result.run_id !== request.prior_system_update.run_id &&
      ci.artifact_id !== request.prior_system_update.artifact_id &&
      ci.result_sha256 === sha(Buffer.from(json(result))) &&
      result.repository_id === request.repository_id &&
      canonicalJsonDigest(result.project_ids) === canonicalJsonDigest(request.source_project_ids) &&
      result.version === manifest.version &&
      result.operation_id === request.publish_operation_id &&
      result.target === manifest.target &&
      result.manifest_sha256 === completeReport.build_manifest_sha256 &&
      result.payload_id === manifest.payloadId &&
      canonicalJsonDigest(result.asset) === canonicalJsonDigest(manifest.asset),
    'source correction report does not bind the current package-native build and CI result',
  );
  /** @type {Map<string, SourceCorrectionManifestInput>} */
  const inputByPath = new Map();
  let totalInputBytes = 0,
    previous = '';
  for (const input of manifest.inputs) {
    requireRebind(
      isCanonicalNativeManifestInputPath(input.path, previous),
      'native manifest inputs are not canonical and sorted',
    );
    const fullPath = 'packages/agent/' + input.path;
    requireRebind(
      access.fileExists(fullPath, 'native manifest source input'),
      'native manifest input is absent from current Source',
    );
    const bytes = access.readBytes(fullPath, 'native manifest source input');
    requireRebind(
      bytes.length === input.bytes && sha(bytes) === input.sha256,
      'native manifest input differs from current Source',
    );
    totalInputBytes += bytes.length;
    requireRebind(totalInputBytes <= 256 * 1024 * 1024, 'native manifest inputs exceed the validation bound');
    inputByPath.set(input.path, input);
    previous = input.path;
  }
  for (const entry of request.new_source.entries) {
    requireRebind(
      entry.exists && entry.path.startsWith('packages/agent/'),
      'current runtime Source inventory is incomplete',
    );
    const relative = entry.path.slice('packages/agent/'.length),
      input = inputByPath.get(relative);
    requireRebind(
      input && input.bytes === entry.bytes && input.sha256 === entry.sha256,
      'native manifest omits or changes a current runtime Source input',
    );
  }
  const currentPath = selfAttestation.executable_path;
  requireEffectivePath(currentPath);
  const installation = completeReport.installation_receipt,
    sourcePath = installation.source_path;
  requireRebind(
    isCurrentNativeInstallationSourcePath(sourcePath, access),
    'installed source asset path is not a current project file',
  );
  const sourceAssetSha256 = streamedNativeAssetDigest(access, sourcePath, manifest.asset.bytes);
  requireRebind(
    sourceAssetSha256 === manifest.asset.sha256 &&
      installation.source_sha256 === manifest.asset.sha256 &&
      installation.prior_bytes === request.prior_system_update.installed_bytes &&
      installation.selected_bytes === selfAttestation.executable_bytes &&
      installation.action === 'update' &&
      installation.exit_code === 0 &&
      installation.signal === null &&
      installation.tests_invoked === false &&
      installation.reinstallation === false &&
      samePath(installation.path, currentPath) &&
      installation.sha256 === selfAttestation.executable_sha256 &&
      samePath(completeReport.effective_path.command_path, currentPath) &&
      completeReport.effective_path.bytes === selfAttestation.executable_bytes &&
      completeReport.effective_path.sha256 === selfAttestation.executable_sha256 &&
      completeReport.effective_path.package_name === selfAttestation.package_name &&
      completeReport.effective_path.version === selfAttestation.package_version &&
      completeReport.effective_path.target === target,
    'installed receipt, command PATH or native executable differs',
  );
  return artifact;
}

/** @param {string} value @param {string} previous @returns {boolean} */
function isCanonicalNativeManifestInputPath(value, previous) {
  return (
    value > previous &&
    !value.includes('\\') &&
    !value.startsWith('/') &&
    !/^[A-Za-z]:/.test(value) &&
    !hasControlCharacter(value) &&
    !value.includes(':') &&
    value.split('/').every((part) => part && part !== '.' && part !== '..') &&
    !value.startsWith('node_modules/')
  );
}

/** @param {unknown} value @param {RebindSafeRepositoryAccess} access @returns {value is string} */
function isCurrentNativeInstallationSourcePath(value, access) {
  return (
    typeof value === 'string' &&
    !value.includes('\\') &&
    !value.startsWith('/') &&
    !/^[A-Za-z]:/.test(value) &&
    !hasControlCharacter(value) &&
    !value.includes(':') &&
    value.split('/').every((part) => part && part !== '.' && part !== '..') &&
    access.fileExists(value, 'native installation source asset')
  );
}

/** @param {unknown} value @returns {SourceCorrectionArtifactView} */
function validateSourceCorrectionArtifact(value) {
  assertSourceCorrectionArtifact(value);
  const { digest, ...body } = value;
  requireRebind(
    digest === canonicalJsonDigest(body) && value.request.operation_id === value.operation_id,
    'source correction sidecar digest or identity differs',
  );
  validSourceSnapshot(value.request.old_source);
  validSourceSnapshot(value.request.new_source);
  const manifestEntry = value.request.new_source.entries.find(
    (entry) => entry.path === value.request.new_source_manifest.path,
  );
  requireRebind(
    value.request.publish_operation_id !== value.request.operation_id &&
      value.request.new_source_manifest.path === 'packages/agent/package.json' &&
      value.request.new_source_manifest.package_name === 'vida-agent' &&
      isCurrentOrLaterStableVersion(
        value.request.new_source_manifest.version,
        value.request.prior_system_update.version,
      ) &&
      manifestEntry?.exists === true &&
      manifestEntry.bytes === value.request.new_source_manifest.bytes &&
      manifestEntry.sha256 === value.request.new_source_manifest.sha256,
    'Source package release version or publication identity differs from its frozen Source snapshot',
  );
  return value;
}

/** @param {unknown} value @returns {asserts value is SourceCorrectionArtifactView} */
function assertSourceCorrectionArtifact(value) {
  requireRebind(validateSourceCorrection(value), 'source correction sidecar schema invalid');
}

/** @param {unknown} value @returns {value is SourceCorrectionArtifactView & { readonly status: 'applied'; readonly report: SourceCorrectionReportView }} */
function isAppliedSourceCorrectionArtifact(value) {
  return validateSourceCorrection(value) && value.status === 'applied' && value.report !== undefined;
}

/** @param {unknown} value @returns {asserts value is SourceCorrectionArtifactView & { readonly status: 'applied'; readonly report: SourceCorrectionReportView }} */
function assertAppliedSourceCorrectionArtifact(value) {
  requireRebind(isAppliedSourceCorrectionArtifact(value), 'source correction is not applied');
}

/** @param {readonly string[]} args @returns {ParsedSourceCorrectionArguments} */
/** @type {ReadonlySet<string>} */
const sourceCorrectionFlags = new Set([
  '--kind',
  '--mode',
  '--project-root',
  '--repair-id',
  '--source-beforeimages',
  '--authorized-paths',
  '--prior-system-update',
  '--publish-operation',
  '--report',
  '--expected-request',
]);

/** @param {unknown} value @returns {value is SourceCorrectionFlag} */
function isSourceCorrectionFlag(value) {
  return typeof value === 'string' && sourceCorrectionFlags.has(value);
}

/** @param {readonly string[]} args @returns {ParsedSourceCorrectionArguments} */
function parseSourceCorrectionArgs(args) {
  requireRebind(args.length % 2 === 0, 'source correction arguments must be paired');
  /** @type {ParsedSourceCorrectionArguments} */
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index],
      value = args[index + 1];
    if (!isSourceCorrectionFlag(key) || value === undefined) {
      requireRebind(false, 'source correction arguments invalid');
    }
    requireRebind(
      key.startsWith('--') && value.length > 0 && !Object.hasOwn(values, key),
      'source correction arguments invalid',
    );
    values[key] = value;
  }
  const mode = values['--mode'] ?? '';
  const planning = ['repair-inspect', 'repair-plan'].includes(mode);
  const projectRoot = requiredSourceArgument(values, '--project-root');
  const repairId = requiredSourceArgument(values, '--repair-id');
  /** @type {Record<string, string>} */
  const optionValues = {};
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === 'string') optionValues[key] = value;
  }
  const expected = reconcileExpectedOptions('runtime-config-delivery', mode, optionValues) ?? [];
  requireRebind(
    Object.keys(values).sort().join('|') === expected.sort().join('|') &&
      values['--kind'] === 'runtime-config-delivery' &&
      [
        'repair-inspect',
        'repair-plan',
        'repair-apply',
        'repair-resume',
        'repair-transition',
        'repair-withdraw',
      ].includes(mode) &&
      path.isAbsolute(projectRoot) &&
      path.resolve(projectRoot) === projectRoot &&
      identifier.test(repairId) &&
      (mode !== 'repair-withdraw' ||
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
          values['--expected-request'] ?? '',
        )) &&
      (planning
        ? /** @type {const} */ (['--source-beforeimages', '--prior-system-update']).every(
            (key) =>
              path.isAbsolute(requiredSourceArgument(values, key)) &&
              path.resolve(requiredSourceArgument(values, key)) === requiredSourceArgument(values, key),
          )
        : mode === 'repair-apply'
          ? path.isAbsolute(requiredSourceArgument(values, '--report')) &&
            path.resolve(requiredSourceArgument(values, '--report')) === requiredSourceArgument(values, '--report')
          : true),
    'source correction mode, root, identity or argument set invalid',
  );
  /** @type {unknown} */
  let authorizedPaths = [];
  if (planning) {
    const authorizedPathsJson = requiredSourceArgument(values, '--authorized-paths');
    requireRebind(
      values['--publish-operation'] === undefined ||
        identifier.test(requiredSourceArgument(values, '--publish-operation')),
      'published operation identity is invalid',
    );
    try {
      authorizedPaths = parseJsonUnknown(authorizedPathsJson);
    } catch {
      requireRebind(false, 'authorized source path set is not JSON');
    }
    values.authorized_changed_paths = canonicalChangedPaths(authorizedPaths);
    requireRebind(
      path.resolve(requiredSourceArgument(values, '--source-beforeimages')) ===
        requiredSourceArgument(values, '--source-beforeimages') &&
        !hasNulOrLineBreak(requiredSourceArgument(values, '--source-beforeimages')) &&
        !hasNulOrLineBreak(requiredSourceArgument(values, '--prior-system-update')) &&
        Buffer.byteLength(requiredSourceArgument(values, '--authorized-paths'), 'utf8') <= 32768,
      'retained source custody or prior update path invalid',
    );
  } else if (mode === 'repair-apply') {
    requireRebind(
      path.resolve(requiredSourceArgument(values, '--report')) === requiredSourceArgument(values, '--report') &&
        !hasNulOrLineBreak(requiredSourceArgument(values, '--report')),
      'source correction report path invalid',
    );
  }
  return values;
}

/** @param {ParsedSourceCorrectionArguments} values @param {SourceCorrectionFlag} key @returns {string} */
function requiredSourceArgument(values, key) {
  const value = values[key];
  requireRebind(typeof value === 'string', `source correction argument ${key} is required`);
  return value;
}

/** @param {string} root @param {string} absolutePath @param {string} label @returns {string} */
function projectRelativeExternalPath(root, absolutePath, label) {
  requireRebind(
    typeof absolutePath === 'string' &&
      path.isAbsolute(absolutePath) &&
      path.resolve(absolutePath) === absolutePath &&
      !hasNulOrLineBreak(absolutePath),
    `${label} path invalid`,
  );
  const relative = path.relative(root, absolutePath).split(path.sep).join('/');
  requireRebind(
    relative.length > 0 &&
      relative !== '..' &&
      !relative.startsWith('../') &&
      !path.isAbsolute(relative) &&
      relative.split('/').every((part) => part && part !== '.' && part !== '..'),
    `${label} must remain inside the project root`,
  );
  return relative;
}

/** @param {SourceBeforeimageBindingInput} param0 @returns {{ readonly snapshot: RebindScopedSourceSnapshot; readonly binding: FrozenSourceBeforeimageBinding }} */
function sourceBeforeimageBinding({
  access,
  root,
  beforeimagePath,
  operationId,
  operationPath,
  operationBytes,
  frozen,
}) {
  const relative = frozen
    ? frozen.path
    : projectRelativeExternalPath(
        root,
        requireRebindPath(beforeimagePath, 'retained source custody'),
        'retained source custody',
      );
  requireRebind(
    typeof relative === 'string' &&
      !relative.includes('\\') &&
      !relative.startsWith('/') &&
      !/^[A-Za-z]:/.test(relative) &&
      relative.split('/').every((part) => part && part !== '.' && part !== '..'),
    'retained source custody path is not canonical',
  );
  const bytes = frozen
    ? access.readBytes(relative, 'retained source custody')
    : readExternalBytes(
        requireRebindPath(beforeimagePath, 'retained source custody'),
        96 * 1024 * 1024,
        'retained source custody',
      );
  requireRebind(
    bytes.length <= 96 * 1024 * 1024 && (!frozen || (bytes.length === frozen.bytes && sha(bytes) === frozen.sha256)),
    'retained source custody bytes changed',
  );
  let value;
  try {
    value = parseJsonUnknown(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    requireRebind(false, 'retained source custody is not bounded UTF-8 JSON');
  }
  const snapshot = sourceBeforeimageSnapshot(value, operationId, operationPath, operationBytes),
    binding = {
      schema: 'SourceBeforeimageBinding/v1',
      path: relative,
      bytes: bytes.length,
      sha256: sha(bytes),
      snapshot_digest: snapshot.digest,
    };
  requireRebind(
    !frozen || canonicalJsonDigest(binding) === canonicalJsonDigest(frozen),
    'retained source custody binding differs from the frozen request',
  );
  return { snapshot, binding };
}

/** @param {PriorSystemUpdateBindingInput} param0 @returns {FrozenPriorSystemUpdateBinding} */
function priorSystemUpdateBinding({ access, root, priorSystemUpdatePath, frozen }) {
  const relative = frozen
    ? frozen.path
    : projectRelativeExternalPath(
        root,
        requireRebindPath(priorSystemUpdatePath, 'prior system update receipt'),
        'prior system update receipt',
      );
  requireRebind(
    typeof relative === 'string' &&
      !relative.includes('\\') &&
      !relative.startsWith('/') &&
      !/^[A-Za-z]:/.test(relative) &&
      relative.split('/').every((part) => part && part !== '.' && part !== '..'),
    'prior system update receipt path is not canonical',
  );
  const bytes = frozen
    ? access.readBytes(relative, 'prior system update receipt')
    : readExternalBytes(
        requireRebindPath(priorSystemUpdatePath, 'prior system update receipt'),
        1024 * 1024,
        'prior system update receipt',
      );
  requireRebind(
    bytes.length <= 1024 * 1024 && (!frozen || (bytes.length === frozen.bytes && sha(bytes) === frozen.sha256)),
    'prior system update receipt bytes changed',
  );
  let value;
  try {
    value = parseJsonUnknown(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    requireRebind(false, 'prior system update receipt is not bounded UTF-8 JSON');
  }
  requireRebind(
    isPriorSystemUpdateReceipt(value),
    'prior system update receipt is not a bounded, non-acceptance update observation',
  );
  /** @type {FrozenPriorSystemUpdateBinding} */
  const binding = {
    schema: 'PriorSystemUpdateBinding/v1',
    path: relative,
    bytes: bytes.length,
    sha256: sha(bytes),
    status: value.status,
    operation_id: value.operation_id,
    version: value.version,
    entry: value.entry,
    run_id: value.run_id,
    artifact_id: value.artifact_id,
    installed_bytes: value.installed_bytes,
    prior_bytes: value.prior_bytes,
    delta_bytes: value.delta_bytes,
    configuration_inspection: value.configuration_inspection,
    tests_invoked: false,
    reinstallation: false,
    runtime_accepted: false,
    developer_unblocked: false,
  };
  requireRebind(
    !frozen || canonicalJsonDigest(binding) === canonicalJsonDigest(frozen),
    'prior system update binding differs',
  );
  return binding;
}

/** @param {unknown} value @returns {value is PriorSystemUpdateReceipt} */
function isPriorSystemUpdateReceipt(value) {
  return (
    isPlainRecord(value) &&
    isPriorSystemUpdateIdentity(value) &&
    isPriorSystemUpdateSizes(value) &&
    isPriorSystemUpdateNonAcceptance(value)
  );
}

/** @param {Record<string, unknown>} value @returns {boolean} */
function isPriorSystemUpdateIdentity(value) {
  return (
    typeof value.status === 'string' &&
    value.status.length > 0 &&
    value.status.length <= 128 &&
    typeof value.operation_id === 'string' &&
    identifier.test(value.operation_id) &&
    typeof value.version === 'string' &&
    stableVersionParts(value.version) !== null &&
    typeof value.entry === 'string' &&
    path.isAbsolute(value.entry) &&
    isPriorSystemUpdateRunBinding(value)
  );
}

/** @param {Record<string, unknown>} value @returns {boolean} */
function isPriorSystemUpdateRunBinding(value) {
  return (
    typeof value.run_id === 'string' &&
    /^[1-9][0-9]{0,31}$/.test(value.run_id) &&
    typeof value.artifact_id === 'string' &&
    /^[1-9][0-9]{0,31}$/.test(value.artifact_id)
  );
}

/** @param {Record<string, unknown>} value @returns {boolean} */
function isPriorSystemUpdateSizes(value) {
  return (
    isPositiveUpdateByteCount(value.installed_bytes) &&
    isPositiveUpdateByteCount(value.prior_bytes) &&
    isUpdateByteDelta(value.installed_bytes, value.prior_bytes, value.delta_bytes)
  );
}

/** @param {unknown} value @returns {value is number} */
function isPositiveUpdateByteCount(value) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

/** @param {unknown} installed @param {unknown} prior @param {unknown} delta @returns {boolean} */
function isUpdateByteDelta(installed, prior, delta) {
  return (
    typeof delta === 'number' &&
    Number.isSafeInteger(delta) &&
    typeof installed === 'number' &&
    typeof prior === 'number' &&
    installed - prior === delta
  );
}

/** @param {Record<string, unknown>} value @returns {boolean} */
function isPriorSystemUpdateNonAcceptance(value) {
  return (
    typeof value.configuration_inspection === 'string' &&
    value.configuration_inspection.length <= 128 &&
    value.tests_invoked === false &&
    value.reinstallation === false &&
    value.runtime_accepted === false &&
    value.developer_unblocked === false
  );
}

/** @param {{ readonly access: RebindSafeRepositoryAccess; readonly bundle: string; readonly source: RebindScopedSourceSnapshot; readonly priorVersion: string }} input @returns {SourceCorrectionRequestView['new_source_manifest']} */
function sourcePackageManifestBinding({ access, bundle, source, priorVersion }) {
  const relative = `${bundle}/package.json`,
    bytes = access.readBytes(relative, 'current Source package manifest'),
    entry = source.entries.find((candidate) => candidate.path === relative);
  requireRebind(
    bytes.length > 0 &&
      bytes.length <= 1024 * 1024 &&
      entry?.exists === true &&
      entry.bytes === bytes.length &&
      entry.sha256 === sha(bytes),
    'current Source package manifest is not bound by the new Source snapshot',
  );
  let manifest;
  try {
    manifest = parseJsonUnknown(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    requireRebind(false, 'current Source package manifest is not bounded UTF-8 JSON');
  }
  requireRebind(
    isCurrentSourcePackageManifest(manifest, priorVersion),
    'current Source package version must be a valid release at or after the prior installed version',
  );
  return {
    schema: 'RuntimeConfigSourcePackageBinding/v1',
    path: relative,
    bytes: bytes.length,
    sha256: sha(bytes),
    package_name: manifest.name,
    version: manifest.version,
  };
}

/** @param {unknown} value @param {string} priorVersion @returns {value is Record<string, unknown> & { readonly name: string; readonly version: string }} */
function isCurrentSourcePackageManifest(value, priorVersion) {
  return (
    isPackageManifest(value) &&
    value.name === 'vida-agent' &&
    stableVersionParts(value.version) !== null &&
    isCurrentOrLaterStableVersion(value.version, priorVersion)
  );
}

/** @param {RebindDatabase} db @param {string} workspace @param {RebindHostStateStore} store */
/** @param {RebindDatabase} db @param {string} workspace @param {RebindHostStateStore} store @returns {SourceCorrectionCustodyView[]} */
function sourceCorrectionCustody(db, workspace, store) {
  const rows = checkedRows(db, 'agent_host_mastra_session_ledger', workspace),
    workRows = checkedRows(db, 'agent_host_state', workspace).filter(isCheckedWorkRow),
    /** @type {SourceCorrectionCustodyView[]} */
    custody = [];
  for (const row of rows) {
    for (const item of row.value.items) {
      if (item.issue_id === null || item.observation !== null) continue;
      const work = workRows.find((candidate) => candidate.value.binding.lifecycle_work_id === row.value.work_id);
      requireRebind(work !== undefined, 'source correction Journal has no checked owner work identity');
      const identity = {
          repository_id: work.value.binding.repository_id,
          project_ids: work.value.binding.project_ids,
          integrations_digest: work.value.binding.integrations_digest,
          work_id: work.value.binding.lifecycle_work_id,
        },
        receipt = store.readHistoricalTerminalSynthesisCapture(identity, row.value.attempt, item.request.action_id);
      if (!receipt) continue;
      requireRebind(
        isHistoricalTerminalCaptureRequest(receipt.request),
        'historical terminal capture request is malformed',
      );
      custody.push({
        schema: 'KnownTerminalCustodyBinding/v1',
        work_id: row.value.work_id,
        attempt: row.value.attempt,
        action_id: item.request.action_id,
        issue_id: item.issue_id,
        receipt_digest: canonicalJsonDigest(receipt),
        journal_revision: row.revision,
        journal_digest: row.digest,
        expected_maintenance_generation: receipt.request.expected_maintenance_generation,
      });
    }
  }
  custody.sort((left, right) =>
    left.work_id < right.work_id
      ? -1
      : left.work_id > right.work_id
        ? 1
        : left.attempt - right.attempt || left.action_id.localeCompare(right.action_id),
  );
  requireRebind(custody.length > 0, 'known-terminal source correction custody is missing');
  return custody;
}

/** @param {SourceCorrectionRequestInput} param0 */
/** @param {SourceCorrectionRequestInput} input @returns {SourceCorrectionRequestView} */
function sourceCorrectionRequest({
  access,
  root,
  config,
  db,
  id,
  operationPath,
  operationBytes,
  operation,
  beforeimagePath,
  priorSystemUpdatePath,
  authorizedPaths,
  publishOperationId,
  frozenRequest,
  allowForwardReceipt = false,
}) {
  requireRebind(
    operation.schema === 'SourceDeliveryConfigRebindOperation/v1' &&
      operation.revision === 2 &&
      operation.phase === 'fenced' &&
      operation.maintenance_released === false &&
      operation.plan.operation_id === id,
    'source correction requires the original fenced delivery operation',
  );
  const plan = operation.plan,
    baseline = validateRuntimeConfigRepairTargetBytes(Buffer.from(plan.baseline_yaml), root),
    target = targetConfig({ readBytes: () => Buffer.from(plan.target_yaml) }, root, baseline, configPath).config,
    baselineReceipt = parseInitializationReceipt(plan.baseline_receipt),
    projectIds = sameIdentity(root, baseline, baselineReceipt),
    currentReceipt = readReceipt(access, config),
    currentYamlBytes = access.readBytes(configPath, 'current authored configuration'),
    currentYaml = currentYamlBytes.toString('utf8'),
    yamlState = sourceCorrectionYamlState(currentYaml, plan.baseline_yaml, plan.target_yaml);
  requireRebind(
    baseline.runtime.bundle === 'packages/agent' &&
      target.runtime.bundle === baseline.runtime.bundle &&
      config.repository.repository_id === plan.repository_id &&
      canonicalJsonDigest(projectIds) === canonicalJsonDigest(plan.project_ids) &&
      (yamlState === 'baseline' || yamlState === 'target') &&
      (currentReceipt.bytes.toString('utf8') === plan.baseline_receipt ||
        (allowForwardReceipt &&
          currentReceipt.bytes.toString('utf8') ===
            json({ ...baselineReceipt, config_digest: plan.target_config_digest }))),
    'source correction configuration or receipt differs from the frozen operation',
  );
  const initSchema = runtimePackageAccess().readBytes(
      'schemas/runtime-initialization.v1.schema.json',
      'initialization schema',
    ),
    binding = runtimeBinding(access, baseline),
    sourceInventory = runtimeExecutableInventory(
      path.join(root, baseline.runtime.bundle),
      'source',
      requireSafeRepositoryAccess(path.join(root, baseline.runtime.bundle)),
    ),
    newSource = snapshotDeclaredSources(
      access,
      sourceInventory.map((file) => baseline.runtime.bundle + '/' + file),
    ),
    beforeimages = frozenRequest
      ? sourceBeforeimageBinding({
          access,
          root,
          operationId: id,
          operationPath,
          operationBytes,
          frozen: frozenRequest.source_beforeimages,
        })
      : sourceBeforeimageBinding({
          access,
          root,
          beforeimagePath: requireRebindPath(beforeimagePath, 'retained source custody'),
          operationId: id,
          operationPath,
          operationBytes,
        }),
    oldSource = beforeimages.snapshot,
    priorSystemUpdate = frozenRequest
      ? priorSystemUpdateBinding({ access, root, frozen: frozenRequest.prior_system_update })
      : priorSystemUpdateBinding({
          access,
          root,
          priorSystemUpdatePath: requireRebindPath(priorSystemUpdatePath, 'prior system update receipt'),
        }),
    newSourceManifest = sourcePackageManifestBinding({
      access,
      bundle: baseline.runtime.bundle,
      source: newSource,
      priorVersion: priorSystemUpdate.version,
    }),
    changes = sourceSnapshotChanges(oldSource, newSource),
    requestedScopePaths = frozenRequest?.authorized_changed_paths ?? authorizedPaths,
    sourceProjectIds = config.projects
      .filter((project) => path.resolve(root, project.project_root) === path.resolve(root, baseline.runtime.bundle))
      .map((project) => project.project_id)
      .sort();
  requireRebind(Array.isArray(requestedScopePaths), 'authorized Source path set is missing');
  requireRebind(isStringArray(requestedScopePaths), 'authorized Source paths must be text');
  const scopePaths = requestedScopePaths;
  requireRebind(
    sha(initSchema) === plan.initialization_schema_digest &&
      binding.selector_digest === plan.selector_digest &&
      binding.bundle_digest === newSource.digest &&
      oldSource.digest === plan.bundle_digest &&
      changes.length > 0 &&
      changes.every((change) => change.kind !== 'disappeared' && scopePaths.includes(change.path)) &&
      sourceProjectIds.length === 1 &&
      sourceProjectIds[0] === 'agent' &&
      scopePaths.every((relative) => access.fileExists(relative, 'authorized Source path presence')),
    'Source changes, initialization schema or source scope differ from the original operation',
  );
  requireRebind(
    !frozenRequest || canonicalJsonDigest(authorizedPaths ?? scopePaths) === canonicalJsonDigest(scopePaths),
    'authorized Source path set differs from the frozen repair scope',
  );
  const workspaceId = deriveWorkspaceId(plan.repository_id, root),
    readOnlyMaintenanceInspection = {
      principal: 'vida-agent-runtime-config-source-correction',
      projectIds: plan.project_ids,
      verify: async () => null,
    },
    store = createCliHostStateStore(
      db,
      workspaceId,
      undefined,
      undefined,
      undefined,
      readOnlyMaintenanceInspection,
      root,
    ),
    expectedBinding = fenceBinding(plan, operation.plan_digest),
    fence = store.readMaintenanceFence();
  requireRebind(
    workspaceId === plan.workspace_id &&
      fence?.status === 'held' &&
      fence.workspace_id === workspaceId &&
      canonicalJsonDigest(fence.binding) === canonicalJsonDigest(expectedBinding),
    'source correction requires the original held maintenance fence',
  );
  const maintenanceReceipt = { fence, token: plan.token },
    stateDigest = store.withMaintenanceInspection(maintenanceReceipt, () =>
      currentState(db, workspaceId, root, baseline, store, maintenanceReceipt),
    );
  requireRebind(stateDigest === plan.state_digest, 'source correction Host, Journal or state CAS differs');
  const custody = sourceCorrectionCustody(db, workspaceId, store);
  return {
    schema: 'RuntimeConfigSourceCorrectionRequest/v1',
    request_id: frozenRequest?.request_id ?? randomUUID(),
    operation_id: id,
    publish_operation_id: frozenRequest?.publish_operation_id ?? publishOperationId ?? randomUUID(),
    original_operation: {
      path: operationPath,
      sha256: sha(operationBytes),
      plan_digest: operation.plan_digest,
      revision: operation.revision,
      phase: operation.phase,
      maintenance_released: operation.maintenance_released,
    },
    repository_root: root,
    repository_id: plan.repository_id,
    project_ids: projectIds,
    source_project_ids: sourceProjectIds,
    workspace_id: workspaceId,
    state_digest: stateDigest,
    config: {
      schema: 'RuntimeConfigSourceCorrectionConfig/v1',
      baseline_config_digest: plan.old_config_digest,
      target_config_digest: plan.target_config_digest,
      current_yaml_sha256: sha(currentYamlBytes),
      yaml_state: yamlState,
      receipt_sha256: sha(currentReceipt.bytes),
      baseline_receipt_sha256: sha(Buffer.from(plan.baseline_receipt)),
      initialization_schema_digest: plan.initialization_schema_digest,
    },
    fence: structuredClone(fence),
    custody,
    old_source: oldSource,
    source_beforeimages: beforeimages.binding,
    prior_system_update: priorSystemUpdate,
    new_source: newSource,
    new_source_manifest: newSourceManifest,
    source_changes: changes.map((change) => structuredClone(change)),
    authorized_changed_paths: scopePaths,
  };
}

/** @param {string} current @param {string} baseline @param {string} target @returns {'baseline' | 'target' | null} */
function sourceCorrectionYamlState(current, baseline, target) {
  return current === baseline ? 'baseline' : current === target ? 'target' : null;
}

/** @param {'requested' | 'applied'} status @param {string} operationId @param {SourceCorrectionRequestView} request @param {SourceCorrectionReportView} [report] @returns {SourceCorrectionArtifactView} */
function sealSourceCorrection(status, operationId, request, report) {
  /** @type {Omit<SourceCorrectionArtifactView, 'digest'>} */
  const body = {
    schema: 'RuntimeConfigSourceCorrectionRepair/v1',
    status,
    revision: status === 'requested' ? 1 : 2,
    operation_id: operationId,
    request,
    ...(report ? { report } : {}),
  };
  const artifact = { ...body, digest: canonicalJsonDigest(body) };
  validateSourceCorrectionArtifact(artifact);
  return artifact;
}

/** @param {RebindSafeRepositoryAccess} access @param {string} relative @returns {{ readonly bytes: Buffer; readonly value: SourceCorrectionArtifactView }} */
function readSourceCorrectionArtifact(access, relative) {
  const bytes = access.readBytes(relative, 'source correction repair');
  requireRebind(bytes.length <= 16 * 1024 * 1024, 'source correction repair exceeds bound');
  let value;
  try {
    value = parseJsonUnknown(bytes.toString('utf8'));
  } catch {
    requireRebind(false, 'source correction repair is not valid JSON');
  }
  return { bytes, value: validateSourceCorrectionArtifact(value) };
}

/** @param {{ readonly access: RebindSafeRepositoryAccess; readonly root: string; readonly config: RebindAgentRuntimeConfig; readonly db: RebindDatabase; readonly operationPath: string; readonly operationBytes: Uint8Array; readonly operation: SourceCorrectionOperationView; readonly request: SourceCorrectionRequestView; readonly allowForwardReceipt?: boolean }} input @returns {SourceCorrectionRequestView} */
function sourceCorrectionCurrentRequest({
  access,
  root,
  config,
  db,
  operationPath,
  operationBytes,
  operation,
  request,
  allowForwardReceipt = false,
}) {
  const retainedOriginal =
      operation.revision === 2 && operation.phase === 'fenced' && operation.maintenance_released === false
        ? { bytes: operationBytes, value: operation }
        : originalSourceDeliveryOperation({ access, operationPath, operation, request }),
    sourceOperation = retainedOriginal.value,
    sourceOperationBytes = retainedOriginal.bytes,
    plan = sourceOperation.plan;
  requireRebind(
    sourceOperation.schema === 'SourceDeliveryConfigRebindOperation/v1' &&
      sourceOperation.revision === 2 &&
      sourceOperation.phase === 'fenced' &&
      sourceOperation.maintenance_released === false &&
      request.operation_id === sourceOperation.plan.operation_id &&
      request.original_operation.path === operationPath &&
      request.original_operation.sha256 === sha(sourceOperationBytes) &&
      request.original_operation.plan_digest === sourceOperation.plan_digest &&
      request.original_operation.revision === sourceOperation.revision &&
      request.original_operation.phase === sourceOperation.phase &&
      request.original_operation.maintenance_released === sourceOperation.maintenance_released &&
      request.repository_root === root &&
      request.repository_id === plan.repository_id &&
      canonicalJsonDigest(request.project_ids) === canonicalJsonDigest(plan.project_ids) &&
      request.workspace_id === plan.workspace_id &&
      request.state_digest === plan.state_digest &&
      request.config.baseline_config_digest === plan.old_config_digest &&
      request.config.target_config_digest === plan.target_config_digest &&
      request.config.baseline_receipt_sha256 === sha(Buffer.from(plan.baseline_receipt)) &&
      request.config.receipt_sha256 === request.config.baseline_receipt_sha256 &&
      request.config.current_yaml_sha256 ===
        sha(Buffer.from(request.config.yaml_state === 'baseline' ? plan.baseline_yaml : plan.target_yaml)) &&
      request.config.initialization_schema_digest === plan.initialization_schema_digest &&
      request.old_source.digest === plan.bundle_digest &&
      request.source_beforeimages.snapshot_digest === request.old_source.digest,
    'source correction request does not bind the original frozen delivery operation',
  );
  const current = sourceCorrectionRequest({
      access,
      root,
      config,
      db,
      id: request.operation_id,
      operationPath,
      operationBytes: sourceOperationBytes,
      operation: sourceOperation,
      authorizedPaths: request.authorized_changed_paths,
      frozenRequest: request,
      allowForwardReceipt,
    }),
    stable = (/** @type {SourceCorrectionRequestView} */ value) => {
      const {
        current_yaml_sha256: _currentYamlSha256,
        yaml_state: _yamlState,
        receipt_sha256: _receiptSha256,
        ...config
      } = value.config;
      return { ...value, config };
    };
  requireRebind(
    canonicalJsonDigest(stable(current)) === canonicalJsonDigest(stable(request)) &&
      [
        sha(Buffer.from(plan.baseline_receipt)),
        sha(
          Buffer.from(
            json({ ...parseInitializationReceipt(plan.baseline_receipt), config_digest: plan.target_config_digest }),
          ),
        ),
      ].includes(current.config.receipt_sha256),
    'source correction config, fence, state, custody or Source snapshot drifted',
  );
  return current;
}

/** @param {{ readonly access: RebindSafeRepositoryAccess; readonly root: string; readonly config: RebindAgentRuntimeConfig; readonly db: RebindDatabase; readonly operationPath: string; readonly operationBytes: Uint8Array; readonly operation: SourceCorrectionOperationView; readonly artifact: SourceCorrectionArtifactView; readonly expectedRequest: string }} input */
function validateSourceCorrectionWithdrawal({
  access,
  root,
  config,
  db,
  operationPath,
  operationBytes,
  operation,
  artifact,
  expectedRequest,
}) {
  validateSourceCorrectionArtifact(artifact);
  requireRebind(
    artifact.status === 'requested' &&
      artifact.revision === 1 &&
      !Object.hasOwn(artifact, 'report') &&
      !Object.hasOwn(artifact, 'completion'),
    'only an unapplied source correction request can be withdrawn',
  );
  const request = artifact.request,
    plan = operation.plan;
  requireRebind(
    request.request_id === expectedRequest &&
      operation.schema === 'SourceDeliveryConfigRebindOperation/v1' &&
      operation.revision === 2 &&
      operation.phase === 'fenced' &&
      operation.maintenance_released === false &&
      request.operation_id === plan.operation_id &&
      request.original_operation.path === operationPath &&
      request.original_operation.sha256 === sha(operationBytes) &&
      request.original_operation.plan_digest === operation.plan_digest &&
      request.original_operation.revision === operation.revision &&
      request.original_operation.phase === operation.phase &&
      request.original_operation.maintenance_released === operation.maintenance_released &&
      request.repository_root === root &&
      request.repository_id === plan.repository_id &&
      canonicalJsonDigest(request.project_ids) === canonicalJsonDigest(plan.project_ids) &&
      request.workspace_id === plan.workspace_id &&
      request.state_digest === plan.state_digest &&
      request.config.baseline_config_digest === plan.old_config_digest &&
      request.config.target_config_digest === plan.target_config_digest &&
      request.config.baseline_receipt_sha256 === sha(Buffer.from(plan.baseline_receipt)) &&
      request.config.initialization_schema_digest === plan.initialization_schema_digest &&
      request.old_source.digest === plan.bundle_digest &&
      request.source_beforeimages.snapshot_digest === request.old_source.digest,
    'source correction request does not bind the original fenced delivery operation',
  );

  const baseline = validateRuntimeConfigRepairTargetBytes(Buffer.from(plan.baseline_yaml), root),
    target = targetConfig({ readBytes: () => Buffer.from(plan.target_yaml) }, root, baseline, configPath).config,
    baselineReceipt = parseInitializationReceipt(plan.baseline_receipt),
    projectIds = sameIdentity(root, baseline, baselineReceipt),
    currentReceipt = readReceipt(access, config),
    currentYamlBytes = access.readBytes(configPath, 'current authored configuration'),
    currentYaml = currentYamlBytes.toString('utf8'),
    yamlState = currentYaml === plan.baseline_yaml ? 'baseline' : currentYaml === plan.target_yaml ? 'target' : null,
    schemaBytes = runtimePackageAccess().readBytes(
      'schemas/runtime-initialization.v1.schema.json',
      'initialization schema',
    ),
    sourceProjectIds = config.projects
      .filter((project) => path.resolve(root, project.project_root) === path.resolve(root, baseline.runtime.bundle))
      .map((project) => project.project_id)
      .sort(),
    selection = snapshotDeclaredSources(access, [selectorPath, 'package.json']);
  requireRebind(
    baseline.runtime.bundle === 'packages/agent' &&
      target.runtime.bundle === baseline.runtime.bundle &&
      config.repository.repository_id === plan.repository_id &&
      canonicalJsonDigest(sameIdentity(root, config, currentReceipt.value)) === canonicalJsonDigest(projectIds) &&
      canonicalJsonDigest(projectIds) === canonicalJsonDigest(plan.project_ids) &&
      sourceProjectIds.length === 1 &&
      sourceProjectIds[0] === 'agent' &&
      !selection.entries.find((entry) => entry.path === selectorPath)?.exists &&
      selection.digest === plan.selector_digest &&
      (currentYamlBytes.toString('utf8') === plan.baseline_yaml ||
        currentYamlBytes.toString('utf8') === plan.target_yaml),
    'source correction withdrawal configuration differs from the original operation',
  );
  requireRebind(
    yamlState !== null &&
      request.config.yaml_state === yamlState &&
      request.config.current_yaml_sha256 === sha(currentYamlBytes) &&
      currentReceipt.bytes.toString('utf8') === plan.baseline_receipt &&
      request.config.receipt_sha256 === sha(currentReceipt.bytes) &&
      request.config.receipt_sha256 === request.config.baseline_receipt_sha256 &&
      sha(schemaBytes) === plan.initialization_schema_digest,
    'source correction withdrawal YAML, receipt or initialization schema changed',
  );

  const beforeimages = sourceBeforeimageBinding({
      access,
      root,
      operationId: request.operation_id,
      operationPath,
      operationBytes,
      frozen: request.source_beforeimages,
    }),
    priorSystemUpdate = priorSystemUpdateBinding({
      access,
      root,
      frozen: request.prior_system_update,
    }),
    workspaceId = deriveWorkspaceId(plan.repository_id, root),
    inspection = {
      principal: 'vida-agent-runtime-config-source-correction',
      projectIds: plan.project_ids,
      verify: async () => null,
    },
    store = createCliHostStateStore(db, workspaceId, undefined, undefined, undefined, inspection, root),
    expectedBinding = fenceBinding(plan, operation.plan_digest),
    fence = store.readMaintenanceFence();
  requireRebind(
    workspaceId === plan.workspace_id &&
      canonicalJsonDigest(beforeimages.snapshot) === canonicalJsonDigest(request.old_source) &&
      canonicalJsonDigest(beforeimages.binding) === canonicalJsonDigest(request.source_beforeimages) &&
      canonicalJsonDigest(priorSystemUpdate) === canonicalJsonDigest(request.prior_system_update) &&
      fence?.status === 'held' &&
      fence.workspace_id === workspaceId &&
      canonicalJsonDigest(fence.binding) === canonicalJsonDigest(expectedBinding) &&
      canonicalJsonDigest(request.fence) === canonicalJsonDigest(fence),
    'source correction withdrawal fence or immutable custody binding changed',
  );
  const maintenanceReceipt = { fence, token: plan.token },
    stateDigest = store.withMaintenanceInspection(maintenanceReceipt, () =>
      currentState(db, workspaceId, root, baseline, store, maintenanceReceipt),
    ),
    custody = sourceCorrectionCustody(db, workspaceId, store);
  requireRebind(
    stateDigest === plan.state_digest &&
      stateDigest === request.state_digest &&
      canonicalJsonDigest(custody) === canonicalJsonDigest(request.custody),
    'source correction withdrawal Host state or custody CAS changed',
  );
}

/** @param {{ readonly access: RebindSafeRepositoryAccess; readonly root: string; readonly config: RebindAgentRuntimeConfig; readonly db: RebindDatabase; readonly operationPath: string; readonly operationBytes: Uint8Array; readonly operation: RebindOperationView; readonly artifact: SourceCorrectionArtifactView }} input */
function validateSourceCorrectionBridge({
  access,
  root,
  config,
  db,
  operationPath,
  operationBytes,
  operation,
  artifact,
}) {
  validateSourceCorrectionArtifact(artifact);
  assertAppliedSourceCorrectionArtifact(artifact);
  assertDeliveryRebindOperation(operation);
  const request = artifact.request;
  sourceCorrectionCurrentRequest({
    access,
    root,
    config,
    db,
    operationPath,
    operationBytes,
    operation,
    request,
    allowForwardReceipt: true,
  });
  const selfAttestation = currentNativeSelfAttestation();
  requireRebind(selfAttestation, 'source correction resume requires the installed native package');
  const { native_self_attestation: recordedSelf, ...externalReport } = artifact.report,
    validated = validateSourceCorrectionReport(externalReport, request, access, selfAttestation);
  requireRebind(
    canonicalJsonDigest(recordedSelf) === canonicalJsonDigest(selfAttestation) &&
      canonicalJsonDigest(validated.report) === canonicalJsonDigest(artifact.report),
    'source correction installed evidence changed or is not exact',
  );
  return true;
}

/** @param {{ readonly access: RebindSafeRepositoryAccess; readonly operationPath: string; readonly operation: SourceCorrectionOperationView; readonly request: SourceCorrectionRequestView }} input @returns {{ readonly bytes: Buffer; readonly value: SourceCorrectionOperationView }} */
function originalSourceDeliveryOperation({ access, operationPath, operation, request }) {
  const beforeimageBytes = access.readBytes(request.source_beforeimages.path, 'retained source custody');
  requireRebind(
    beforeimageBytes.length === request.source_beforeimages.bytes &&
      sha(beforeimageBytes) === request.source_beforeimages.sha256,
    'retained source custody bytes changed after source repair',
  );
  let beforeimage;
  try {
    beforeimage = parseJsonUnknown(new TextDecoder('utf-8', { fatal: true }).decode(beforeimageBytes));
  } catch {
    requireRebind(false, 'retained source custody is not bounded UTF-8 JSON');
  }
  requireRebind(
    hasExactKeys(beforeimage, [
      'purpose',
      'operation_id',
      'operation_ref',
      'operation_bytes_base64',
      'source',
      'beforeimages',
      'recorded_at',
      'effects_issued',
    ]) && typeof beforeimage.operation_bytes_base64 === 'string',
    'retained source custody omitted original delivery bytes',
  );
  const operationBytes = Buffer.from(beforeimage.operation_bytes_base64, 'base64');
  requireRebind(
    operationBytes.toString('base64') === beforeimage.operation_bytes_base64 &&
      operationBytes.length > 0 &&
      operationBytes.length <= 2 * 1024 * 1024,
    'retained source custody original delivery bytes are invalid',
  );
  const originalSnapshot = sourceBeforeimageSnapshot(beforeimage, request.operation_id, operationPath, operationBytes);
  /** @type {unknown} */
  let original;
  try {
    original = parseJsonUnknown(operationBytes.toString('utf8'));
  } catch {
    requireRebind(false, 'retained original delivery operation is not JSON');
  }
  assertDeliveryRebindOperation(original);
  assertDeliveryRebindOperation(operation);
  requireRebind(
    original.schema === 'SourceDeliveryConfigRebindOperation/v1' &&
      original.revision === 2 &&
      original.phase === 'fenced' &&
      original.maintenance_released === false &&
      original.plan.operation_id === request.operation_id &&
      original.plan.repository_root === request.repository_root &&
      original.plan_digest === operationDigest(original) &&
      sha(operationBytes) === request.original_operation.sha256 &&
      request.original_operation.path === operationPath &&
      request.original_operation.plan_digest === original.plan_digest &&
      request.original_operation.revision === original.revision &&
      request.original_operation.phase === original.phase &&
      request.original_operation.maintenance_released === original.maintenance_released &&
      originalSnapshot.digest === request.old_source.digest &&
      request.source_beforeimages.snapshot_digest === originalSnapshot.digest &&
      operation.phase === 'applied' &&
      ((operation.revision === 3 && operation.maintenance_released === false) ||
        (operation.revision === 4 && operation.maintenance_released === true)) &&
      operation.plan_digest === original.plan_digest &&
      canonicalJsonDigest(operation.plan) === canonicalJsonDigest(original.plan),
    'source delivery close operation differs from its retained original bytes',
  );
  return { bytes: operationBytes, value: original };
}

/**
 * Read-only consistency proof for the finite delivered-config transition.
 * It deliberately does not compare the frozen pre-delivery Host digest with
 * later owner state; callers must perform their own fresh owner CAS check.
 */
/** @param {{ readonly access: RebindSafeRepositoryAccess; readonly root: string; readonly config: RebindAgentRuntimeConfig; readonly db: RebindDatabase; readonly operationPath: string; readonly operationBytes: Uint8Array; readonly operation: RebindOperationView | SourceCorrectionOperationView; readonly artifact: SourceCorrectionArtifactView; readonly store: RebindHostStateStore }} input @returns {ClosedSourceDeliveryTransition} */
function closedSourceDeliveryTransition({
  access,
  root,
  config: _config,
  db: _db,
  operationPath,
  operationBytes,
  operation,
  artifact,
  store,
}) {
  validateSourceCorrectionArtifact(artifact);
  assertAppliedSourceCorrectionArtifact(artifact);
  assertDeliveryRebindOperation(operation);
  const request = artifact.request,
    original = originalSourceDeliveryOperation({ access, operationPath, operation, request }),
    originalOperation = original.value,
    plan = operation.plan,
    expectedBinding = fenceBinding(plan, operation.plan_digest),
    heldFence = request.fence,
    releasedFence = store.readMaintenanceFence(),
    currentYamlBytes = access.readBytes(configPath, 'current authored YAML'),
    currentConfig = loadRuntimeConfig(root),
    currentReceipt = readReceipt(access, currentConfig),
    baseline = validateRuntimeConfigRepairTargetBytes(Buffer.from(plan.baseline_yaml), root),
    target = targetConfig({ readBytes: () => Buffer.from(plan.target_yaml) }, root, baseline, configPath).config,
    nextReceipt = json({
      ...parseInitializationReceipt(plan.baseline_receipt),
      config_digest: plan.target_config_digest,
    });
  requireRebind(
    operationBytes.length > 0 &&
      sha(operationBytes) === sha(access.readBytes(operationPath, 'closed delivery operation')) &&
      originalOperation.plan_digest === request.original_operation.plan_digest &&
      request.repository_root === root &&
      request.operation_id === operation.plan.operation_id &&
      request.repository_id === operation.plan.repository_id &&
      request.workspace_id === operation.plan.workspace_id &&
      request.config.target_config_digest === operation.plan.target_config_digest &&
      canonicalJsonDigest(heldFence.binding) === canonicalJsonDigest(expectedBinding) &&
      heldFence.workspace_id === operation.plan.workspace_id &&
      heldFence.status === 'held' &&
      releasedFence?.status === 'released' &&
      releasedFence.workspace_id === operation.plan.workspace_id &&
      canonicalJsonDigest(releasedFence.binding) === canonicalJsonDigest(expectedBinding) &&
      releasedFence.generation === heldFence.generation &&
      releasedFence.token_digest === heldFence.token_digest &&
      request.custody.every((entry) => entry.expected_maintenance_generation + 1 === releasedFence.generation) &&
      currentYamlBytes.toString('utf8') === plan.target_yaml &&
      runtimeConfigDigest(currentConfig) === plan.target_config_digest &&
      runtimeConfigDigest(target) === plan.target_config_digest &&
      currentReceipt.bytes.toString('utf8') === nextReceipt &&
      sameIdentity(root, target, currentReceipt.value),
    'closed source delivery configuration or released fence differs from its finite transition',
  );
  const currentBinding = runtimeBinding(access, baseline),
    sourceInventory = runtimeExecutableInventory(
      path.join(root, baseline.runtime.bundle),
      'source',
      requireSafeRepositoryAccess(path.join(root, baseline.runtime.bundle)),
    ),
    currentSource = snapshotDeclaredSources(
      access,
      sourceInventory.map((file) => baseline.runtime.bundle + '/' + file),
    );
  requireRebind(
    currentBinding.selector_digest === plan.selector_digest &&
      currentBinding.bundle_digest === request.new_source.digest &&
      currentSource.digest === request.new_source.digest,
    'closed source delivery current Source differs from its retained repair snapshot',
  );
  const selfAttestation = currentNativeSelfAttestation();
  requireRebind(selfAttestation, 'closed source delivery proof requires the current installed native package');
  const { native_self_attestation: recordedSelf, ...externalReport } = artifact.report,
    validated = validateSourceCorrectionReport(externalReport, request, access, selfAttestation);
  requireRebind(
    canonicalJsonDigest(recordedSelf) === canonicalJsonDigest(selfAttestation) &&
      canonicalJsonDigest(validated.report) === canonicalJsonDigest(artifact.report),
    'closed source delivery report differs from the current installed native package',
  );
  const completion = {
    schema: 'RuntimeConfigDeliveryTransition/v1',
    operation_path: operationPath,
    operation_sha256: sha(operationBytes),
    operation_plan_digest: operation.plan_digest,
    request_id: request.request_id,
    request_digest: canonicalJsonDigest(request),
    report_digest: canonicalJsonDigest(artifact.report),
    source_snapshot_digest: currentSource.digest,
    target_config_digest: plan.target_config_digest,
    target_yaml_sha256: sha(currentYamlBytes),
    receipt_path: receiptPath,
    receipt_sha256: sha(currentReceipt.bytes),
    fence: structuredClone(releasedFence),
    native_self_attestation_digest: canonicalJsonDigest(selfAttestation),
    runtime_accepted: false,
  };
  requireRebind(
    !artifact.completion || canonicalJsonDigest(artifact.completion) === canonicalJsonDigest(completion),
    'retained closed source delivery transition differs from current postconditions',
  );
  return {
    completion,
    baseline_config_digest: originalOperation.plan.old_config_digest,
  };
}

/** @param {SourceCorrectionArtifactView} artifact @param {unknown} completion @returns {SourceCorrectionArtifactView} */
function sourceCorrectionWithCompletion(artifact, completion) {
  if (artifact.completion) {
    requireRebind(
      canonicalJsonDigest(artifact.completion) === canonicalJsonDigest(completion),
      'source correction completion changed after capture',
    );
    return artifact;
  }
  const { digest: _digest, ...previousBody } = artifact;
  /** @type {Omit<SourceCorrectionArtifactView, 'digest'>} */
  const body = { ...previousBody, revision: 3, completion },
    completed = { ...body, digest: canonicalJsonDigest(body) };
  validateSourceCorrectionArtifact(completed);
  return completed;
}

/** @param {CorrectionRequestForInputs} input @returns {SourceCorrectionRequestView} */
function correctionRequestForInputs({ values, access, root, config, db, operationPath, stored, frozenRequest }) {
  if (frozenRequest) {
    requireRebind(
      (values['--publish-operation'] === undefined ||
        values['--publish-operation'] === frozenRequest.publish_operation_id) &&
        projectRelativeExternalPath(
          root,
          requiredSourceArgument(values, '--source-beforeimages'),
          'retained source custody',
        ) === frozenRequest.source_beforeimages.path &&
        projectRelativeExternalPath(
          root,
          requiredSourceArgument(values, '--prior-system-update'),
          'prior system update receipt',
        ) === frozenRequest.prior_system_update.path &&
        canonicalJsonDigest(values.authorized_changed_paths) ===
          canonicalJsonDigest(frozenRequest.authorized_changed_paths),
      'repair inputs differ from the frozen source custody, prior update or scope',
    );
    return sourceCorrectionCurrentRequest({
      access,
      root,
      config,
      db,
      operationPath,
      operationBytes: stored.bytes,
      operation: stored.value,
      request: frozenRequest,
    });
  }
  return sourceCorrectionRequest({
    access,
    root,
    config,
    db,
    id: requiredSourceArgument(values, '--repair-id'),
    operationPath,
    operationBytes: stored.bytes,
    operation: stored.value,
    beforeimagePath: requiredSourceArgument(values, '--source-beforeimages'),
    priorSystemUpdatePath: requiredSourceArgument(values, '--prior-system-update'),
    authorizedPaths: values.authorized_changed_paths,
    publishOperationId: values['--publish-operation'],
  });
}

/** @param {readonly string[]} args @param {RebindRunOptions} [options] */
async function runSourceCorrectionRepair(args, { onPhase } = {}) {
  const values = parseSourceCorrectionArgs(args),
    root = requiredSourceArgument(values, '--project-root'),
    id = requiredSourceArgument(values, '--repair-id'),
    mode = requiredSourceArgument(values, '--mode'),
    access = requireSafeRepositoryAccess(root),
    config = loadRuntimeConfig(root),
    operationPath = `${config.control.work_root}/${id}/${deliveryOperationName}`,
    sidecarPath = `${config.control.work_root}/${id}/${sourceCorrectionName}`,
    db = database(root, config, true);
  try {
    const run = async () => {
      const stored = readOperation(access, operationPath, id, root, true),
        requireSidecar = () => {
          requireRebind(
            access.fileExists(sidecarPath, 'source correction repair presence'),
            'source correction repair sidecar is missing',
          );
          return readSourceCorrectionArtifact(access, sidecarPath);
        };
      if (mode === 'repair-withdraw') {
        return await access.withExclusiveLockAsync(operationPath, 'config rebind operation', async () => {
          const latest = readOperation(access, operationPath, id, root, true),
            expectedRequest = requiredSourceArgument(values, '--expected-request'),
            historyDirectory = `${config.control.work_root}/${id}/source-correction-request-history`,
            historyPath = `${historyDirectory}/${expectedRequest}.json`;
          requireRebind(
            latest.bytes.equals(stored.bytes),
            'original delivery operation changed before source correction withdrawal',
          );
          const validate = (
              /** @type {{ readonly bytes: Buffer; readonly value: SourceCorrectionArtifactView }} */ candidate,
            ) =>
              validateSourceCorrectionWithdrawal({
                access,
                root,
                config: loadRuntimeConfig(root),
                db,
                operationPath,
                operationBytes: latest.bytes,
                operation: latest.value,
                artifact: candidate.value,
                expectedRequest,
              }),
            active = access.fileExists(sidecarPath, 'source correction repair presence');
          if (active) {
            const observed = readSourceCorrectionArtifact(access, sidecarPath);
            validate(observed);
            access.ensureDirectory(historyDirectory, 'source correction request history');
            requireRebind(
              !access.fileExists(historyPath, 'source correction request history presence'),
              'source correction request history entry already exists while the request is active',
            );
            const currentOperation = readOperation(access, operationPath, id, root, true),
              current = readSourceCorrectionArtifact(access, sidecarPath);
            requireRebind(
              currentOperation.bytes.equals(latest.bytes) && current.bytes.equals(observed.bytes),
              'source correction request or original operation changed before withdrawal',
            );
            validate(current);
            await access.moveNoReplaceAsync(
              sidecarPath,
              historyPath,
              sha(current.bytes),
              'source correction request withdrawal',
            );
            requireRebind(
              !access.fileExists(sidecarPath, 'source correction repair presence'),
              'source correction request remains active after withdrawal',
            );
            const archived = readSourceCorrectionArtifact(access, historyPath);
            requireRebind(archived.bytes.equals(current.bytes), 'archived source correction request bytes differ');
            validate(archived);
            onPhase?.('withdrawn');
          } else {
            requireRebind(
              access.fileExists(historyPath, 'source correction request history presence'),
              'source correction request is neither active nor archived',
            );
            const archived = readSourceCorrectionArtifact(access, historyPath);
            validate(archived);
          }
          return {
            status: 'withdrawn',
            operation_id: id,
            request_id: expectedRequest,
            history_path: historyPath,
            writes_host_state: false,
          };
        });
      }
      if (mode === 'repair-transition') {
        return await access.withExclusiveLockAsync(operationPath, 'config rebind operation', async () => {
          const latest = readOperation(access, operationPath, id, root, true),
            artifact = requireSidecar(),
            currentConfig = loadRuntimeConfig(root),
            workspaceId = deriveWorkspaceId(latest.value.plan.repository_id, root),
            store = createCliHostStateStore(db, workspaceId);
          requireRebind(artifact.value.status === 'applied', 'source correction is not applied');
          const proof = closedSourceDeliveryTransition({
            access,
            root,
            config: currentConfig,
            db,
            operationPath,
            operationBytes: latest.bytes,
            operation: latest.value,
            artifact: artifact.value,
            store,
          });
          return {
            status: 'closed_config_transition_proven',
            operation_id: id,
            baseline_config_digest: proof.baseline_config_digest,
            transition: proof.completion,
            transition_digest: canonicalJsonDigest(proof.completion),
            caller_owner_cas_required: true,
            runtime_accepted: false,
            writes_host_state: false,
          };
        });
      }
      if (mode === 'repair-inspect') {
        if (access.fileExists(sidecarPath, 'source correction repair presence')) {
          const artifact = readSourceCorrectionArtifact(access, sidecarPath).value,
            current = correctionRequestForInputs({
              values,
              access,
              root,
              config,
              db,
              operationPath,
              stored,
              frozenRequest: artifact.request,
            });
          if (artifact.status === 'applied')
            validateSourceCorrectionBridge({
              access,
              root,
              config,
              db,
              operationPath,
              operationBytes: stored.bytes,
              operation: stored.value,
              artifact,
            });
          return {
            status: artifact.status === 'applied' ? 'applied' : 'repair_apply_required',
            operation_id: id,
            request_id: artifact.request.request_id,
            request_digest: canonicalJsonDigest(current),
            sidecar_path: sidecarPath,
            writes_host_state: false,
          };
        }
        const request = correctionRequestForInputs({ values, access, root, config, db, operationPath, stored });
        return {
          status: 'inspect_ready_unauthorized',
          operation_id: id,
          request_id: request.request_id,
          request_digest: canonicalJsonDigest(request),
          source_change_count: request.source_changes.length,
          authorized_changed_paths: request.authorized_changed_paths,
          writes_host_state: false,
        };
      }

      if (mode === 'repair-plan') {
        return await access.withExclusiveLockAsync(operationPath, 'config rebind operation', async () => {
          const latest = readOperation(access, operationPath, id, root, true);
          if (access.fileExists(sidecarPath, 'source correction repair presence')) {
            const existing = readSourceCorrectionArtifact(access, sidecarPath),
              current = correctionRequestForInputs({
                values,
                access,
                root,
                config: loadRuntimeConfig(root),
                db,
                operationPath,
                stored: latest,
                frozenRequest: existing.value.request,
              });
            if (existing.value.status === 'applied') {
              validateSourceCorrectionBridge({
                access,
                root,
                config: loadRuntimeConfig(root),
                db,
                operationPath,
                operationBytes: latest.bytes,
                operation: latest.value,
                artifact: existing.value,
              });
              return {
                status: 'applied',
                operation_id: id,
                request_id: current.request_id,
                sidecar_path: sidecarPath,
                writes_host_state: false,
              };
            }
            return {
              status: 'planned',
              operation_id: id,
              request_id: current.request_id,
              request_digest: canonicalJsonDigest(current),
              sidecar_path: sidecarPath,
              writes_host_state: false,
            };
          }
          const currentConfig = loadRuntimeConfig(root),
            request = correctionRequestForInputs({
              values,
              access,
              root,
              config: currentConfig,
              db,
              operationPath,
              stored: latest,
            }),
            artifact = sealSourceCorrection('requested', id, request);
          access.writeExclusive(sidecarPath, json(artifact), 'source correction repair request');
          onPhase?.('planned');
          return {
            status: 'planned',
            operation_id: id,
            request_id: request.request_id,
            request_digest: canonicalJsonDigest(request),
            sidecar_path: sidecarPath,
            writes_host_state: false,
          };
        });
      }

      return await access.withExclusiveLockAsync(operationPath, 'config rebind operation', async () => {
        const latest = readOperation(access, operationPath, id, root, true),
          existing = requireSidecar();
        requireRebind(
          sha(latest.bytes) === sha(stored.bytes),
          'original delivery operation changed before source correction',
        );
        if (mode === 'repair-resume') {
          const current = sourceCorrectionCurrentRequest({
            access,
            root,
            config,
            db,
            operationPath,
            operationBytes: stored.bytes,
            operation: stored.value,
            request: existing.value.request,
          });
          if (existing.value.status === 'applied')
            validateSourceCorrectionBridge({
              access,
              root,
              config,
              db,
              operationPath,
              operationBytes: stored.bytes,
              operation: stored.value,
              artifact: existing.value,
            });
          return {
            status: existing.value.status === 'applied' ? 'applied' : 'repair_apply_required',
            operation_id: id,
            request_id: current.request_id,
            request_digest: canonicalJsonDigest(current),
            sidecar_path: sidecarPath,
            writes_host_state: false,
          };
        }

        requireRebind(mode === 'repair-apply', 'unsupported source correction mode');
        const current = sourceCorrectionCurrentRequest({
            access,
            root,
            config,
            db,
            operationPath,
            operationBytes: stored.bytes,
            operation: stored.value,
            request: existing.value.request,
          }),
          report = parseExternalJson(
            requiredSourceArgument(values, '--report'),
            16 * 1024 * 1024,
            'source correction report',
          ),
          selfAttestation = currentNativeSelfAttestation();
        assertExternalSourceCorrectionReport(report);
        requireRebind(selfAttestation !== null, 'source correction application requires the installed native package');
        const completed = validateSourceCorrectionReport(report, current, access, selfAttestation);
        if (existing.value.status === 'applied') {
          requireRebind(
            canonicalJsonDigest(completed) === canonicalJsonDigest(existing.value),
            'source correction is already applied with different evidence; resume the exact operation',
          );
          return {
            status: 'applied',
            operation_id: id,
            request_id: current.request_id,
            sidecar_path: sidecarPath,
            writes_host_state: false,
          };
        }
        await access.replaceAtomicAsync(
          sidecarPath,
          sha(existing.bytes),
          json(completed),
          'source correction repair application',
        );
        onPhase?.('applied');
        return {
          status: 'applied',
          operation_id: id,
          request_id: current.request_id,
          sidecar_path: sidecarPath,
          source_snapshot_digest: current.new_source.digest,
          writes_host_state: false,
        };
      });
    };
    return await run();
  } finally {
    closeWorkspaceDatabaseWithAdmission(db);
  }
}

/** @param {SourceCorrectionOperationView['plan']} plan @param {string} planDigest @returns {import('../src/host-state.ts').MaintenanceFenceBinding} */
function fenceBinding(plan, planDigest) {
  return {
    schema: 'MaintenanceFenceBinding/v1',
    project_ids: plan.project_ids,
    operation_id: plan.operation_id,
    manifest_digest: planDigest,
    request_digest: planDigest,
    bindings_digest: canonicalJsonDigest({ selector: plan.selector_digest, state: plan.state_digest }),
    closure_digest: canonicalJsonDigest({ old_receipt: plan.baseline_receipt, target: plan.target_config_digest }),
    bundle_digest: plan.bundle_digest,
  };
}

/** @param {RebindSafeRepositoryAccess} access @param {string} root @param {RebindAgentRuntimeConfig} config @param {RebindOperationView} operation @param {RebindDatabase} db @param {RebindHostStateStore} hostStore @param {import('../src/host-state.ts').MaintenanceFenceReceipt | undefined} maintenanceReceipt @param {string} operationPath @param {Uint8Array} operationBytes */
function exactContext(
  access,
  root,
  config,
  operation,
  db,
  hostStore,
  maintenanceReceipt,
  operationPath,
  operationBytes,
) {
  const plan = operation.plan;
  const old = validateRuntimeConfigRepairTargetBytes(Buffer.from(plan.baseline_yaml), root);
  const target = targetConfig({ readBytes: () => Buffer.from(plan.target_yaml) }, root, old, configPath).config;
  const receipt = readReceipt(access, config);
  sameIdentity(root, old, parseInitializationReceipt(plan.baseline_receipt));
  sameIdentity(root, target, receipt.value);
  const binding = runtimeBinding(access, old);
  const verifyCurrentState = () => currentState(db, plan.workspace_id, root, old, hostStore, maintenanceReceipt);
  const currentStateDigest = maintenanceReceipt
    ? hostStore.withMaintenanceInspection(maintenanceReceipt, verifyCurrentState)
    : verifyCurrentState();
  requireRebind(
    runtimeConfigDigest(old) === plan.old_config_digest &&
      runtimeConfigDigest(target) === plan.target_config_digest &&
      binding.selector_digest === plan.selector_digest &&
      sha(
        runtimePackageAccess().readBytes('schemas/runtime-initialization.v1.schema.json', 'initialization schema'),
      ) === plan.initialization_schema_digest &&
      currentStateDigest === plan.state_digest,
    'current selector/schema/global state differs from plan',
  );
  if (binding.bundle_digest !== plan.bundle_digest) {
    requireRebind(
      operation.schema === 'SourceDeliveryConfigRebindOperation/v1' &&
        ((operation.phase === 'fenced' && operation.revision === 2 && !operation.maintenance_released) ||
          (operation.phase === 'applied' && operation.revision === 3 && !operation.maintenance_released)) &&
        maintenanceReceipt,
      'Source drift requires the applied same-operation source correction under its original fence',
    );
    const sidecarPath = `${config.control.work_root}/${plan.operation_id}/${sourceCorrectionName}`,
      correction = readSourceCorrectionArtifact(access, sidecarPath);
    validateSourceCorrectionBridge({
      access,
      root,
      config,
      db,
      operationPath,
      operationBytes,
      operation,
      artifact: correction.value,
    });
    requireRebind(
      correction.value.request.new_source.digest === binding.bundle_digest,
      'source correction does not bridge the current runtime Source inventory',
    );
  }
  const currentYaml = access.readBytes(configPath, 'current authored YAML').toString('utf8');
  requireRebind(
    operation.schema === 'SourceDeliveryConfigRebindOperation/v1'
      ? currentYaml === plan.target_yaml
      : currentYaml === plan.baseline_yaml || currentYaml === plan.target_yaml,
    'authored YAML bytes differ from frozen target/baseline',
  );
  const nextReceipt = json({
    ...parseInitializationReceipt(plan.baseline_receipt),
    config_digest: plan.target_config_digest,
  });
  requireRebind(
    receipt.bytes.toString('utf8') === plan.baseline_receipt || receipt.bytes.toString('utf8') === nextReceipt,
    'initialization receipt changed outside rebind',
  );
  return {
    baseline: currentYaml === plan.baseline_yaml,
    oldReceipt: receipt.bytes.toString('utf8') === plan.baseline_receipt,
    nextReceipt,
    receiptBytes: receipt.bytes,
  };
}

/** @param {RebindSafeRepositoryAccess} access @param {'baseline' | 'current' | 'recovery'} context @returns {ProjectInputTexts} */
function readProjectInputTexts(access, context) {
  return {
    project: access.readText(PROJECT_CONFIGURATION_PATHS.project, `${context} project configuration`),
    agents: access.readText(PROJECT_CONFIGURATION_PATHS.agents, `${context} agents configuration`),
    flows: access.readText(PROJECT_CONFIGURATION_PATHS.flows, `${context} flows configuration`),
  };
}

/** @param {Record<string, string>} values @param {string} root @param {RebindSafeRepositoryAccess} access @param {RebindDatabase} db */
function frozenProjectPlan(values, root, access, db) {
  const source = activeRuntimeConfigurationSource(access);
  requireRebind(
    source === PROJECT_CONFIGURATION_PATHS.project,
    'project split configuration is not the selected source',
  );
  const baselineInputs = readProjectInputTexts(access, 'baseline');
  const baseline = parseProjectConfiguration(baselineInputs, root, source);
  bindLoadedConfigurationSource(baseline.config, source);
  const { receipt: initialReceipt, bytes: receiptBytes } = readProjectInitializationReceipt(access);
  requireRebind(
    initialReceipt.repository_id === baseline.config.repository.repository_id &&
      initialReceipt.workspace_id === deriveWorkspaceId(initialReceipt.repository_id, root) &&
      initialReceipt.current_config_digest === runtimeConfigDigest(baseline.config) &&
      initialReceipt.current_input_digest === baseline.input_digest,
    'project rebind requires the exact initially activated project receipt',
  );
  const projectIds = baseline.config.projects.map((item) => item.project_id).sort();
  requireRebind(
    canonicalJsonDigest(projectIds) === canonicalJsonDigest(initialReceipt.project_ids),
    'project rebind identity differs',
  );
  const requested = targetConfig(
    access,
    root,
    baseline.config,
    requireRebindPath(values['--target-config'], 'target config'),
  );
  const targetParts = splitRuntimeConfig(requested.config, source);
  const targetDocs = {
    project: { ...targetParts.project, revision: baseline.documents.project.revision + 1 },
    agents: { ...targetParts.agents, revision: baseline.documents.agents.revision + 1 },
    flows: { ...targetParts.flows, revision: baseline.documents.flows.revision + 1 },
  };
  /** @param {Record<string, unknown> & { revision: number }} left @param {Record<string, unknown> & { revision: number }} right */
  const sameWithoutRevision = (left, right) => {
    const { revision: _leftRevision, ...leftBody } = left;
    const { revision: _rightRevision, ...rightBody } = right;
    return sameJson(leftBody, rightBody);
  };
  const targetTexts = {
    project: stringifyYaml(targetDocs.project),
    agents: sameWithoutRevision(targetDocs.agents, baseline.documents.agents)
      ? baselineInputs.agents
      : stringifyYaml(targetDocs.agents),
    flows: sameWithoutRevision(targetDocs.flows, baseline.documents.flows)
      ? baselineInputs.flows
      : stringifyYaml(targetDocs.flows),
  };
  const target = parseProjectConfiguration(targetTexts, root, source);
  bindLoadedConfigurationSource(target.config, source);
  requireRebind(
    runtimeConfigDigest(target.config) !== runtimeConfigDigest(baseline.config) &&
      targetTexts.project.length + targetTexts.agents.length + targetTexts.flows.length <= 3 * 1024 * 1024,
    'project rebind target is unchanged or exceeds the supported exact-input envelope',
  );
  /** @param {ProjectInputTexts} texts @param {string} inputDigest @param {string} configDigest @returns {ProjectInputSet} */
  const inputSet = (texts, inputDigest, configDigest) => ({
    schema: 'ProjectConfigurationInputSet/v1',
    input_digest: inputDigest,
    config_digest: configDigest,
    project: {
      path: PROJECT_CONFIGURATION_PATHS.project,
      text: texts.project,
      sha256: sha(Buffer.from(texts.project, 'utf8')),
    },
    agents: {
      path: PROJECT_CONFIGURATION_PATHS.agents,
      text: texts.agents,
      sha256: sha(Buffer.from(texts.agents, 'utf8')),
    },
    flows: {
      path: PROJECT_CONFIGURATION_PATHS.flows,
      text: texts.flows,
      sha256: sha(Buffer.from(texts.flows, 'utf8')),
    },
  });
  const binding = runtimeBinding(access, baseline.config),
    schema = runtimePackageAccess().readBytes(
      'schemas/runtime-initialization.v2.schema.json',
      'project initialization schema',
    ),
    plan = {
      operation_id: values['--repair-id'],
      actor: values['--actor'],
      instruction_ref: values['--instruction-ref'],
      created_at: values['--timestamp'],
      repository_root: root,
      repository_id: baseline.config.repository.repository_id,
      project_ids: projectIds,
      workspace_id: initialReceipt.workspace_id,
      baseline_yaml: '',
      target_yaml: '',
      baseline_receipt: receiptBytes.toString('utf8'),
      old_config_digest: runtimeConfigDigest(baseline.config),
      target_config_digest: runtimeConfigDigest(target.config),
      configuration_format: 'project-split-v2',
      baseline_inputs: inputSet(baselineInputs, baseline.input_digest, runtimeConfigDigest(baseline.config)),
      target_inputs: inputSet(targetTexts, target.input_digest, runtimeConfigDigest(target.config)),
      initialization_schema_digest: sha(schema),
      ...binding,
      state_digest: currentState(db, initialReceipt.workspace_id, root, baseline.config),
      token: randomUUID(),
    },
    operation = {
      schema: 'ConfigRebindOperation/v1',
      revision: 1,
      phase: 'planned',
      maintenance_released: false,
      plan,
      plan_digest: canonicalJsonDigest(plan),
    };
  requireRebind(operationValidator(false)(operation), 'project rebind operation schema invalid');
  return operation;
}

/** @param {unknown} item @returns {item is ProjectInputSet} */
function isProjectInputSet(item) {
  return (
    isPlainRecord(item) &&
    item.schema === 'ProjectConfigurationInputSet/v1' &&
    typeof item.input_digest === 'string' &&
    typeof item.config_digest === 'string' &&
    ['project', 'agents', 'flows'].every(
      (key) =>
        isPlainRecord(item[key]) &&
        typeof item[key].path === 'string' &&
        typeof item[key].text === 'string' &&
        typeof item[key].sha256 === 'string',
    )
  );
}

/** @param {unknown} value @returns {value is RebindProjectOperation} */
function isProjectRebindOperation(value) {
  if (!isRebindOperation(value, false) || value.schema !== 'ConfigRebindOperation/v1') return false;
  return (
    'configuration_format' in value.plan &&
    value.plan.configuration_format === 'project-split-v2' &&
    'baseline_inputs' in value.plan &&
    isProjectInputSet(value.plan.baseline_inputs) &&
    'target_inputs' in value.plan &&
    isProjectInputSet(value.plan.target_inputs)
  );
}

/** @param {string} mode @returns {mode is ProjectRebindRecoveryMode} */
function isProjectRebindRecoveryMode(mode) {
  return mode === 'apply' || mode === 'resume' || mode === 'restore';
}

/** @param {ProjectInputSet} set @returns {ProjectInputTexts} */
function projectSetTexts(set) {
  return { project: set.project.text, agents: set.agents.text, flows: set.flows.text };
}

/** @param {ProjectInputSet} set @param {string} root */
function verifyProjectInputSet(set, root) {
  /** @type {readonly (readonly [keyof ProjectInputTexts, string])[]} */
  const expected = [
    ['project', PROJECT_CONFIGURATION_PATHS.project],
    ['agents', PROJECT_CONFIGURATION_PATHS.agents],
    ['flows', PROJECT_CONFIGURATION_PATHS.flows],
  ];
  for (const [key, file] of expected) {
    const item = set[key];
    requireRebind(item.path === file, 'project rebind input path differs');
    requireRebind(item.sha256 === sha(Buffer.from(item.text, 'utf8')), 'project rebind input hash differs');
  }
  const parsed = parseProjectConfiguration(projectSetTexts(set), root, PROJECT_CONFIGURATION_PATHS.project);
  requireRebind(parsed.input_digest === set.input_digest, 'project rebind aggregate input digest differs');
  requireRebind(
    runtimeConfigDigest(parsed.config) === set.config_digest,
    'project rebind composed config digest differs',
  );
  bindLoadedConfigurationSource(parsed.config, PROJECT_CONFIGURATION_PATHS.project);
  return parsed;
}

/** @param {RebindProjectOperation} operation @param {ReturnType<typeof verifyProjectInputSet>} baseline @param {ReturnType<typeof verifyProjectInputSet>} target @param {import('../src/config/project-initialization-record.ts').ProjectInitializationReceipt} receipt */
function assertProjectRebindPlan(operation, baseline, target, receipt) {
  const plan = operation.plan;
  requireRebind(plan.configuration_format === 'project-split-v2', 'project rebind format is invalid');
  requireRebind(plan.baseline_inputs.input_digest === baseline.input_digest, 'project rebind baseline input differs');
  requireRebind(plan.target_inputs.input_digest === target.input_digest, 'project rebind target input differs');
  requireRebind(
    plan.old_config_digest === runtimeConfigDigest(baseline.config),
    'project rebind baseline config differs',
  );
  requireRebind(
    plan.target_config_digest === runtimeConfigDigest(target.config),
    'project rebind target config differs',
  );
  requireRebind(
    receipt.current_config_digest === plan.old_config_digest,
    'project rebind receipt baseline config differs',
  );
  requireRebind(
    receipt.current_input_digest === plan.baseline_inputs.input_digest,
    'project rebind receipt baseline inputs differ',
  );
  requireRebind(
    plan.initialization_schema_digest ===
      sha(
        runtimePackageAccess().readBytes(
          'schemas/runtime-initialization.v2.schema.json',
          'project initialization schema',
        ),
      ),
    'project initialization schema changed',
  );
  requireRebind(plan.repository_id === baseline.config.repository.repository_id, 'project rebind repository differs');
  requireRebind(plan.workspace_id === receipt.workspace_id, 'project rebind workspace differs');
  requireRebind(
    canonicalJsonDigest(plan.project_ids) ===
      canonicalJsonDigest(baseline.config.projects.map((item) => item.project_id).sort()),
    'project rebind project set differs',
  );
}

/** @param {RebindSafeRepositoryAccess} access @returns {ProjectInputTexts} */
function projectCurrentInputs(access) {
  return readProjectInputTexts(access, 'current');
}

/** @param {RebindSafeRepositoryAccess} access @param {RebindProjectOperation['plan']} plan */
function projectInputState(access, plan) {
  const inputs = projectCurrentInputs(access);
  const digest = projectConfigurationInputDigest(inputs);
  let state = 'foreign';
  if (digest === plan.baseline_inputs.input_digest) state = 'baseline';
  else if (digest === plan.target_inputs.input_digest) state = 'target';
  requireRebind(state !== 'foreign', 'project configuration inputs are outside the frozen before/after images');
  const expected = state === 'baseline' ? projectSetTexts(plan.baseline_inputs) : projectSetTexts(plan.target_inputs);
  requireRebind(
    canonicalJsonDigest(inputs) === canonicalJsonDigest(expected),
    'project configuration exact input bytes differ',
  );
  return { state, inputs };
}

/** @param {RebindSafeRepositoryAccess} access @param {RebindProjectOperation['plan']} plan @param {import('../src/config/project-initialization-record.ts').ProjectInitializationReceipt} baselineReceipt */
function projectRebindObservation(access, plan, baselineReceipt) {
  const current = projectInputState(access, plan),
    latest = readProjectInitializationReceipt(access);
  const expectedTarget = validateProjectInitializationReceipt({
    ...baselineReceipt,
    current_config_digest: plan.target_config_digest,
    current_input_digest: plan.target_inputs.input_digest,
    configuration_rebind_id: plan.operation_id,
  });
  const expectedBytes = Buffer.from(JSON.stringify(expectedTarget, null, 2) + '\n');
  let receiptState = 'foreign';
  if (latest.bytes.equals(Buffer.from(plan.baseline_receipt))) receiptState = 'baseline';
  else if (latest.bytes.equals(expectedBytes)) receiptState = 'target';
  requireRebind(receiptState !== 'foreign', 'project receipt is outside the frozen before/after images');
  requireRebind(
    current.state === 'baseline' ? receiptState === 'baseline' : receiptState === 'target',
    'project receipt and input states differ',
  );
  return { current, latest, receiptState, expectedBytes };
}

/** @param {RebindSafeRepositoryAccess} access @param {string} root @param {RebindProjectOperation} operation @param {string} operationPath @param {Uint8Array} operationBytes @param {RebindDatabase} db */
function prepareProjectRebind(access, root, operation, operationPath, operationBytes, db) {
  const plan = operation.plan;
  requireRebind(isProjectInputSet(plan.baseline_inputs), 'project baseline input envelope is invalid');
  requireRebind(isProjectInputSet(plan.target_inputs), 'project target input envelope is invalid');
  const baseline = verifyProjectInputSet(plan.baseline_inputs, root),
    target = verifyProjectInputSet(plan.target_inputs, root);
  const baselineReceipt = validateProjectInitializationReceipt(parseJsonUnknown(plan.baseline_receipt));
  assertProjectRebindPlan(operation, baseline, target, baselineReceipt);
  let currentOperationBytes = Buffer.from(operationBytes);
  const binding = fenceBinding(plan, operation.plan_digest);
  /** @type {ReturnType<RebindHostStateStore['readMaintenanceFence']> | undefined} */
  let observedMaintenance;
  /** @type {import('../src/host-state.ts').MaintenanceReleaseVerifier} */
  const verifier = {
    principal: 'vida-agent-project-config-rebind',
    projectIds: plan.project_ids,
    verifyAcquisition: (requested, prior) => {
      requireRebind(db.inTransaction, 'maintenance acquisition must verify inside the Host transaction');
      const acquisitionReceipt =
        prior?.status === 'held' ? { fence: prior, token: plan.token } : { fence: null, unfenced: true, prior };
      requireRebind(
        canonicalJsonDigest(requested) === canonicalJsonDigest(binding),
        'project rebind fence binding differs',
      );
      requireRebind(
        canonicalJsonDigest(prior) === canonicalJsonDigest(observedMaintenance),
        'project rebind prior fence differs',
      );
      requireRebind(
        currentState(db, plan.workspace_id, root, baseline.config, undefined, acquisitionReceipt) === plan.state_digest,
        'project rebind Host state changed before acquisition',
      );
    },
    verify: async (held) => {
      const current = projectRebindObservation(access, plan, baselineReceipt);
      const completed =
        operation.phase === 'applied' && current.current.state === 'target' && current.receiptState === 'target';
      const abandoned =
        operation.phase === 'abandoned_no_effect' &&
        current.current.state === 'baseline' &&
        current.receiptState === 'baseline';
      if ((!completed && !abandoned) || canonicalJsonDigest(held.binding) !== canonicalJsonDigest(binding)) return null;
      return {
        schema: 'MaintenanceReleaseAuthorization/v1',
        principal: 'vida-agent-project-config-rebind',
        fence_digest: canonicalJsonDigest(held),
        closure_digest: binding.closure_digest,
        bundle_digest: binding.bundle_digest,
      };
    },
  };
  const hostStore = createCliHostStateStore(db, plan.workspace_id, undefined, undefined, undefined, verifier, root);
  observedMaintenance = hostStore.readMaintenanceFence();
  return {
    plan,
    baseline,
    baselineReceipt,
    binding,
    hostStore,
    operationPath,
    observation: () => projectRebindObservation(access, plan, baselineReceipt),
    /** @type {(phase: ProjectRebindSavePhase, released?: boolean) => Promise<void>} */
    save: async (phase, released = false) => {
      const next = { ...operation, revision: operation.revision + 1, phase, maintenance_released: released };
      await access.replaceAtomicAsync(
        operationPath,
        sha(currentOperationBytes),
        json(next),
        'project config rebind operation phase',
      );
      currentOperationBytes = Buffer.from(json(next));
      Object.assign(operation, next);
    },
    access,
    root,
    db,
    operation,
  };
}

/** @param {ReturnType<typeof prepareProjectRebind>} context @param {ProjectRebindRecoveryMode} mode @param {RebindRunOptions['onPhase']} [onPhase] */
async function acquireOrAbandonProjectRebind(context, mode, onPhase) {
  const { plan, binding, hostStore, operation } = context,
    current = context.observation();
  const observedMaintenance = hostStore.readMaintenanceFence();
  if (mode === 'restore') {
    requireRebind(current.current.state === 'baseline', 'actual rollback is forbidden; resume forward');
    requireRebind(current.receiptState === 'baseline', 'actual rollback is forbidden; resume forward');
    if (!observedMaintenance || observedMaintenance.status === 'released') {
      requireRebind(operation.phase === 'planned', 'own project rebind maintenance fence missing');
      await context.save('abandoned_no_effect', true);
      return { status: 'abandoned_no_effect', operation_id: plan.operation_id, rollback_performed: false };
    }
    requireRebind(
      canonicalJsonDigest(observedMaintenance.binding) === canonicalJsonDigest(binding),
      'foreign project rebind maintenance fence',
    );
    await context.save('abandoned_no_effect');
    await hostStore.releaseMaintenanceFence({ fence: observedMaintenance, token: plan.token });
    await context.save('abandoned_no_effect', true);
    return { status: 'abandoned_no_effect', operation_id: plan.operation_id, rollback_performed: false };
  }
  if (operation.phase !== 'planned') return undefined;
  requireRebind(current.current.state === 'baseline', 'project authoring must wait for held maintenance fence');
  requireRebind(current.receiptState === 'baseline', 'project receipt must remain at baseline before authoring');
  hostStore.acquireMaintenanceFenceWithRecordedToken(binding, plan.token);
  onPhase?.('fence_acquired');
  await context.save('fenced');
  return {
    status: 'author_config_required',
    operation_id: plan.operation_id,
    maintenance_held: true,
    target_config_digest: plan.target_config_digest,
    writes_yaml: false,
    writes_receipt: false,
  };
}

/** @param {ReturnType<typeof prepareProjectRebind>} context @param {RebindRunOptions['onPhase']} [onPhase] */
async function resumeProjectRebind(context, onPhase) {
  const { plan, binding, hostStore, operation, access } = context;
  const current = context.observation(),
    held = hostStore.readMaintenanceFence();
  requireRebind(held !== null, 'project rebind maintenance fence is absent');
  requireRebind(
    canonicalJsonDigest(held.binding) === canonicalJsonDigest(binding),
    'foreign project rebind maintenance fence',
  );
  if (held.status === 'held') hostStore.assertMaintenanceFence({ fence: held, token: plan.token });
  if (operation.maintenance_released) {
    requireRebind(operation.phase === 'applied', 'terminal project rebind phase is invalid');
    requireRebind(
      current.current.state === 'target' && current.receiptState === 'target',
      'terminal project rebind bytes differ',
    );
    requireRebind(held.status === 'released', 'terminal project rebind Host fence is not released');
    return { status: 'applied', operation_id: plan.operation_id, writes_yaml: false, writes_receipt: false };
  }
  if (current.current.state === 'baseline')
    return {
      status: 'author_config_required',
      operation_id: plan.operation_id,
      maintenance_held: true,
      writes_yaml: false,
      writes_receipt: false,
    };
  if (current.receiptState === 'baseline') {
    await access.withExclusiveLockAsync(
      PROJECT_INITIALIZATION_PATH,
      'project configuration receipt rebind',
      async () => {
        const latest = context.observation();
        requireRebind(latest.current.state === 'target', 'project target inputs changed before receipt CAS');
        requireRebind(latest.receiptState === 'baseline', 'project receipt changed before receipt CAS');
        await access.replaceAtomicAsync(
          PROJECT_INITIALIZATION_PATH,
          sha(latest.latest.bytes),
          latest.expectedBytes.toString('utf8'),
          'project configuration receipt rebind',
        );
      },
    );
    onPhase?.('receipt_rebound');
  }
  requireRebind(context.observation().receiptState === 'target', 'project rebind target receipt not observed');
  if (operation.phase !== 'applied') await context.save('applied');
  const released = hostStore.readMaintenanceFence();
  if (released?.status === 'held') await hostStore.releaseMaintenanceFence({ fence: released, token: plan.token });
  else requireRebind(released?.status === 'released', 'project rebind maintenance release differs');
  onPhase?.('released');
  await context.save('applied', true);
  return { status: 'applied', operation_id: plan.operation_id, writes_yaml: false, writes_receipt: true };
}

/** @param {RebindSafeRepositoryAccess} access @param {string} root @param {RebindProjectOperation} operation @param {string} operationPath @param {Uint8Array} operationBytes @param {RebindDatabase} db @param {ProjectRebindRecoveryMode} mode @param {RebindRunOptions['onPhase']} [onPhase] */
async function runProjectRuntimeConfigRebind(
  access,
  root,
  operation,
  operationPath,
  operationBytes,
  db,
  mode,
  onPhase,
) {
  const context = prepareProjectRebind(access, root, operation, operationPath, operationBytes, db);
  const abandoned = await acquireOrAbandonProjectRebind(context, mode, onPhase);
  if (abandoned !== undefined) return abandoned;
  return resumeProjectRebind(context, onPhase);
}

/** @param {Record<string, string>} values @param {string} root @param {RebindSafeRepositoryAccess} access @param {string} mode @param {string} id @param {boolean} delivery @param {RebindRunOptions['onPhase']} [onPhase] */
async function runProjectRuntimeConfigRebindCommand(values, root, access, mode, id, delivery, onPhase) {
  if (delivery || activeRuntimeConfigurationSource(access) !== PROJECT_CONFIGURATION_PATHS.project) return undefined;
  const source = PROJECT_CONFIGURATION_PATHS.project;
  let config;
  if (['inspect', 'plan'].includes(mode)) config = loadRuntimeConfig(root);
  else {
    const currentInputs = readProjectInputTexts(access, 'recovery');
    config = parseProjectConfiguration(currentInputs, root, source).config;
    bindLoadedConfigurationSource(config, source);
  }
  const operationPath = projectConfigurationRebindPath(id),
    db = database(root, config, ['inspect', 'plan'].includes(mode));
  try {
    if (['inspect', 'plan'].includes(mode)) {
      const operation = frozenProjectPlan(values, root, access, db);
      if (mode === 'plan') {
        access.ensureDirectory(`${config.control.work_root}/${id}`, 'project config rebind operation directory');
        access.writeExclusive(operationPath, json(operation), 'project config rebind operation');
      }
      return {
        status: mode === 'plan' ? 'planned' : 'inspect_ready_unauthorized',
        operation_id: id,
        operation_path: operationPath,
        writes_yaml: false,
        writes_receipt: false,
      };
    }
    return await access.withExclusiveLockAsync(operationPath, 'project config rebind operation', async () => {
      const stored = readOperation(access, operationPath, id, root, false),
        operation = stored.value;
      requireRebind(isProjectRebindOperation(operation), 'operation is not a project split rebind');
      if (!isProjectRebindRecoveryMode(mode)) return undefined;
      return runProjectRuntimeConfigRebind(access, root, operation, operationPath, stored.bytes, db, mode, onPhase);
    });
  } finally {
    closeWorkspaceDatabaseWithAdmission(db);
  }
}

/** Only the existing initialization receipt is rebound; caller-owned YAML is never written. */
/** @param {readonly string[]} args @param {RebindRunOptions} [options] */
async function runRuntimeConfigRebind(args, { onPhase } = {}) {
  const values = parse(args),
    root = requireRebindPath(values['--project-root'], 'project root');
  const access = requireSafeRepositoryAccess(root),
    config = loadRuntimeConfig(root);
  const mode = requireRebindPath(values['--mode'], 'mode'),
    id = requireRebindPath(values['--repair-id'], 'repair id'),
    delivery = values['--kind'] === 'runtime-config-delivery';
  const operationPath = `${config.control.work_root}/${id}/${delivery ? deliveryOperationName : operationName}`;
  const db = database(root, config, ['inspect', 'plan'].includes(mode));
  try {
    if (['inspect', 'plan'].includes(mode)) {
      const operation = frozenPlan(values, root, config, access, db);
      if (mode === 'plan') {
        access.ensureDirectory(`${config.control.work_root}/${id}`, 'config rebind operation directory');
        access.writeExclusive(operationPath, json(operation), 'config rebind operation');
      }
      return {
        status: mode === 'plan' ? 'planned' : 'inspect_ready_unauthorized',
        operation_id: id,
        operation_path: operationPath,
        writes_yaml: false,
        writes_receipt: false,
      };
    }
    return await access.withExclusiveLockAsync(operationPath, 'config rebind operation', async () => {
      let stored = readOperation(access, operationPath, id, root, delivery),
        operation = stored.value;
      const plan = operation.plan,
        binding = fenceBinding(plan, operation.plan_digest);
      /** @param {import('../src/host-state.ts').MaintenanceFence | null} fence @returns {import('../src/host-state.ts').MaintenanceFenceReceipt | undefined} */
      const receiptFor = (fence) =>
        fence?.status === 'held' && canonicalJsonDigest(fence.binding) === canonicalJsonDigest(binding)
          ? { fence, token: plan.token }
          : undefined;
      /** @param {import('../src/host-state.ts').MaintenanceFence | null} fence */
      const context = (fence) =>
        exactContext(
          access,
          root,
          loadRuntimeConfig(root),
          operation,
          db,
          store,
          receiptFor(fence),
          operationPath,
          stored.bytes,
        );
      /** @type {import('../src/host-state.ts').MaintenanceReleaseVerifier} */
      const verifier = {
        principal: 'vida-agent-project-config-rebind',
        projectIds: plan.project_ids,
        verifyAcquisition: (requested, prior) => {
          requireRebind(db.inTransaction, 'maintenance acquisition must verify inside the Host transaction');
          const acquisitionReceipt =
            prior?.status === 'held' ? { fence: prior, token: plan.token } : { fence: null, unfenced: true, prior };
          requireRebind(
            canonicalJsonDigest(requested) === canonicalJsonDigest(binding) &&
              canonicalJsonDigest(prior) === canonicalJsonDigest(observedMaintenance) &&
              currentState(
                db,
                plan.workspace_id,
                root,
                validateRuntimeConfigRepairTargetBytes(Buffer.from(plan.baseline_yaml), root),
                store,
                acquisitionReceipt,
              ) === plan.state_digest,
            'current maintenance/global state differs from plan',
          );
        },
        verify: async (held) => {
          const current = context(held);
          const complete = operation.phase === 'applied' && !current.baseline && !current.oldReceipt;
          const abandoned =
            operation.phase === 'abandoned_no_effect' && (delivery || current.baseline) && current.oldReceipt;
          if ((!complete && !abandoned) || canonicalJsonDigest(held.binding) !== canonicalJsonDigest(binding))
            return null;
          return {
            schema: 'MaintenanceReleaseAuthorization/v1',
            principal: verifier.principal,
            fence_digest: canonicalJsonDigest(held),
            closure_digest: binding.closure_digest,
            bundle_digest: binding.bundle_digest,
          };
        },
      };
      const store = createCliHostStateStore(db, plan.workspace_id, undefined, undefined, undefined, verifier, root);
      const observedMaintenance = store.readMaintenanceFence();
      /** @param {RebindOperationView['phase']} phase @param {boolean} [released] */
      const save = async (phase, released = false) => {
        const next = { ...operation, revision: operation.revision + 1, phase, maintenance_released: released };
        await access.replaceAtomicAsync(operationPath, sha(stored.bytes), json(next), 'config rebind operation phase');
        stored = { bytes: Buffer.from(json(next)), value: next };
        operation = next;
      };
      const current = context(observedMaintenance);
      if (mode === 'restore')
        requireRebind(
          (delivery || current.baseline) && current.oldReceipt,
          'actual rollback is forbidden; resume forward',
        );
      if (operation.maintenance_released) {
        requireRebind(['applied', 'abandoned_no_effect'].includes(operation.phase), 'terminal phase invalid');
        requireRebind(
          operation.phase === 'applied'
            ? !current.baseline && !current.oldReceipt
            : (delivery || current.baseline) && current.oldReceipt,
          'terminal operation differs from current config/receipt',
        );
        return { status: operation.phase, operation_id: id, rollback_performed: false };
      }
      let held = observedMaintenance;
      const own = held && canonicalJsonDigest(held.binding) === canonicalJsonDigest(binding);
      if (mode === 'restore') {
        requireRebind(
          (delivery || current.baseline) && current.oldReceipt,
          'actual rollback is forbidden; resume forward',
        );
        if (!held || (held.status === 'released' && !own)) {
          requireRebind(operation.phase === 'planned', 'own maintenance fence missing');
          await save('abandoned_no_effect', true);
          return { status: 'abandoned_no_effect', operation_id: id, rollback_performed: false };
        }
        requireRebind(own, 'foreign maintenance fence');
        await save('abandoned_no_effect');
      } else if (operation.phase === 'planned') {
        requireRebind(
          (delivery || current.baseline) && current.oldReceipt,
          'root YAML edit must wait for held maintenance fence',
        );
        const acquired = store.acquireMaintenanceFenceWithRecordedToken(binding, plan.token);
        held = acquired.fence;
        onPhase?.('fence_acquired');
        await save('fenced');
        onPhase?.('fenced');
        return {
          status: delivery ? 'receipt_rebind_ready' : 'author_config_required',
          operation_id: id,
          maintenance_held: true,
          target_config_digest: plan.target_config_digest,
          writes_yaml: false,
          writes_receipt: false,
        };
      } else {
        requireRebind(own, 'foreign or absent maintenance fence');
        assertFencePresent(held);
        if (operation.phase === 'fenced' && current.baseline)
          return {
            status: 'author_config_required',
            operation_id: id,
            maintenance_held: true,
            writes_yaml: false,
            writes_receipt: false,
          };
        requireRebind(!current.baseline, 'target authored root YAML required');
        if (held.status === 'held') store.assertMaintenanceFence({ fence: held, token: plan.token });
        if (current.oldReceipt) {
          requireRebind(operation.phase === 'fenced' && held.status === 'held', 'receipt write needs fenced phase');
          await access.withExclusiveLockAsync(receiptPath, 'configuration receipt rebind', async () => {
            const latest = context(held);
            requireRebind(!latest.baseline && latest.oldReceipt, 'receipt/configuration changed before CAS');
            await access.replaceAtomicAsync(
              receiptPath,
              sha(latest.receiptBytes),
              latest.nextReceipt,
              'configuration receipt rebind',
            );
          });
          onPhase?.('receipt_rebound');
        }
        requireRebind(!context(held).oldReceipt, 'rebound receipt not observed');
        if (operation.phase !== 'applied') await save('applied');
        onPhase?.('applied');
      }
      assertFencePresent(held);
      if (held.status === 'held') await store.releaseMaintenanceFence({ fence: held, token: plan.token });
      else
        requireRebind(
          held.status === 'released' && ['applied', 'abandoned_no_effect'].includes(operation.phase),
          'maintenance release outcome differs',
        );
      onPhase?.('released');
      await save(operation.phase, true);
      if (
        delivery &&
        access.fileExists(
          `${config.control.work_root}/${id}/${sourceCorrectionName}`,
          'source correction repair presence',
        )
      ) {
        const sidecar = readSourceCorrectionArtifact(
            access,
            `${config.control.work_root}/${id}/${sourceCorrectionName}`,
          ),
          completion = closedSourceDeliveryTransition({
            access,
            root,
            config: loadRuntimeConfig(root),
            db,
            operationPath,
            operationBytes: stored.bytes,
            operation,
            artifact: sidecar.value,
            store,
          }).completion,
          completed = sourceCorrectionWithCompletion(sidecar.value, completion);
        if (completed !== sidecar.value)
          await access.replaceAtomicAsync(
            `${config.control.work_root}/${id}/${sourceCorrectionName}`,
            sha(sidecar.bytes),
            json(completed),
            'source correction closed transition capture',
          );
        onPhase?.('transition_captured');
      }
      return { status: operation.phase, operation_id: id, rollback_performed: false, writes_yaml: false };
    });
  } finally {
    closeWorkspaceDatabaseWithAdmission(db);
  }
}

/** Select project recovery before ordinary config loading; legacy callers keep their original path. */
/** @param {readonly string[]} args @param {RebindRunOptions} [options] */
export async function dispatchProjectAwareRuntimeConfigRebind(args, options = {}) {
  const modeValue = args[args.indexOf('--mode') + 1] ?? '';
  if (
    ['repair-inspect', 'repair-plan', 'repair-apply', 'repair-resume', 'repair-transition', 'repair-withdraw'].includes(
      modeValue,
    )
  )
    return runSourceCorrectionRepair(args, options);
  const values = parse(args),
    root = requireRebindPath(values['--project-root'], 'project root');
  const access = requireSafeRepositoryAccess(root),
    mode = requireRebindPath(values['--mode'], 'mode');
  const id = requireRebindPath(values['--repair-id'], 'repair id'),
    delivery = values['--kind'] === 'runtime-config-delivery';
  const projectResult = await runProjectRuntimeConfigRebindCommand(
    values,
    root,
    access,
    mode,
    id,
    delivery,
    options.onPhase,
  );
  if (projectResult !== undefined) return projectResult;
  return runRuntimeConfigRebind(args, options);
}

export { dispatchProjectAwareRuntimeConfigRebind as runRuntimeConfigRebind };
