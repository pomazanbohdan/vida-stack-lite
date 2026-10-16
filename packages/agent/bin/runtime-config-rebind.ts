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
  readRuntimePackageResourceBytes,
  readRuntimePackageResourceText,
  validateRuntimeConfigRepairTargetBytes,
} from '../src/config/runtime-config.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { HostStateStore } from '../src/host-state.ts';
import { queryWorkspaceRowUnknown, queryWorkspaceRowsUnknown } from '../src/config/workspace-database.ts';
import { finishWorkspaceDatabaseClose, type DatabaseWorkOutcome } from '../src/config/workspace-database-raw.ts';
import {
  sessionHandoffDatabasePath,
  sessionBridgeDatabasePath,
  projectConfigurationRebindPath,
  PROJECT_CONFIGURATION_PATHS,
  PROJECT_INITIALIZATION_PATH,
  bindLoadedConfigurationSource,
  runtimeConfigurationSourceFor,
} from '../src/config/project-paths.ts';
import {
  parseProjectConfiguration,
  splitRuntimeConfig,
  projectConfigurationInputDigest,
} from '../src/config/project-configuration.ts';
import {
  readProjectInitializationReceipt,
  validateProjectInitializationReceipt,
} from '../src/config/project-initialization-record.ts';
import { inspectHistoricalOwnerWork } from '../src/orchestration/suspend-local-work.ts';
import { readAdmittedSessionIntake } from '../src/orchestration/admitted-session-execution.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import workSchema from '../schemas/work-state.v1.schema.json' with { type: 'json' };
import { runtimeExecutableInventory } from '../tooling/maintained-source-inventory.ts';
import { compareScopedSourceSnapshots, snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.ts';
import {
  parseSessionBridgeRequest,
  sessionBridgeRunId,
  parseSessionBridgeObservation,
  parseSessionBridgeRunState,
  buildSessionBridgeRequest,
} from '../src/orchestration/mastra-session-bridge-contract.ts';
import { configuredContextForStage } from '../src/orchestration/configured-context.ts';
import { sessionActionsForWave } from '../src/orchestration/session-handoff.ts';
import { admittedResearchResultsForSynthesis } from '../src/orchestration/observed-synthesis-result.ts';
import { parseMastraSessionLedgerState } from '../src/orchestration/mastra-session-ledger-codec.js';
import { standaloneRuntime } from './bun.ts';
import { decodeWorkspaceSqlRow } from '../src/config/host-persisted-row.js';
/** Closed set at the dynamic SQL identifier boundary. */
type RebindSqlTable = 'agent_host_state' | 'agent_host_mastra_session_ledger' | 'agent_host_governance';
type RebindWorkState = import('../src/host-state.ts').WorkState;
type RebindCoordinationLedger = import('../src/contracts/envelopes.ts').CoordinationLedger;
type RebindSafeRepositoryAccess = import('../src/config/safe-repository-access.ts').SafeRepositoryAccess;
type RebindAgentRuntimeConfig = import('../src/config/runtime-config.ts').AgentRuntimeConfig;
type RebindConfiguredContext = import('../src/orchestration/configured-context.ts').ConfiguredContext;
type RebindInitializationReceipt = import('../src/config/initialization-record.ts').RuntimeInitializationReceipt;
type RebindHashInput = string | NodeJS.ArrayBufferView;
type DeepMutable<T> = T extends readonly [unknown, ...unknown[]]
  ? { -readonly [K in keyof T]: DeepMutable<T[K]> }
  : T extends readonly (infer U)[]
    ? DeepMutable<U>[]
    : T extends object
      ? { -readonly [K in keyof T]: DeepMutable<T[K]> }
      : T;
type RebindSessionBridgeRequest = import('../src/orchestration/mastra-session-bridge.ts').SessionBridgeRequest;
type RebindSessionBridgeRunState = ReturnType<typeof parseSessionBridgeRunState>;
type RebindSessionBridgeAction = import('../src/orchestration/session-handoff.ts').SessionAgentAction;
type RebindSessionHandoffContext = import('../src/orchestration/session-handoff.ts').SessionHandoffContext;
type RebindDatabase = import('bun:sqlite').Database;
type RebindRecoveryReviewBinding = import('../src/host-state.ts').RecoveryReviewBinding;
type RebindRecoveryReviewInput = Pick<
  RebindRecoveryReviewBinding,
  'identity' | 'attempt' | 'callerSession' | 'controllerId' | 'userInstructionRef'
> & {
  readonly repositoryRoot: string;
  readonly baselinePath: string;
  readonly originalContexts?: unknown;
  readonly request?: RebindRecoveryReviewBinding;
  readonly mode?: 'prepare' | 'begin' | 'complete' | 'inspect' | 'reserve' | 'resume';
};
type RebindHostStateStore = InstanceType<typeof HostStateStore>;
type RebindInspectionReceipt =
  | {
      readonly fence?: import('../src/host-state.ts').MaintenanceFence | null;
      readonly unfenced?: boolean;
      readonly prior?: { readonly status?: 'held' | 'released' | null } | null;
    }
  | null
  | undefined;
type RebindWorkIdentity = import('../src/host-state.ts').WorkIdentity;
type RebindStateVersion = import('../src/host-state.ts').StateVersion;
type RebindScopedSourceSnapshot = import('../src/orchestration/scoped-source-snapshot.ts').ScopedSourceSnapshot;
type RebindHistoricalTerminalCaptureRequest = {
  schema: 'HistoricalTerminalSynthesisCapture/v1';
  identity: RebindWorkIdentity;
  attempt: number;
  action_id: string;
  issue_id: string;
  native_session_handle: string;
  user_request_pointer: string;
  request_intent: 'next_work' | 'linked_correction';
  expected_work: RebindStateVersion;
  expected_ledger: RebindStateVersion;
  expected_journal: RebindStateVersion;
  expected_maintenance_generation: number;
  body_base64: string;
  provenance: unknown;
};
type SourceCorrectionFlag =
  | '--kind'
  | '--mode'
  | '--project-root'
  | '--repair-id'
  | '--source-beforeimages'
  | '--authorized-paths'
  | '--prior-system-update'
  | '--publish-operation'
  | '--report'
  | '--expected-request';
type ParsedSourceCorrectionArguments = Partial<Record<SourceCorrectionFlag, string>> & {
  authorized_changed_paths?: readonly string[];
};
type RebindMastraSessionLedgerState =
  import('../src/orchestration/persistent-session-handoff.js').MastraSessionLedgerState;
type CheckedWorkStateRow = import('../src/config/host-persisted-row.js').WorkspaceStateSqlRow & {
  readonly kind: 'work';
  readonly value: RebindWorkState;
};
type CheckedCoordinationLedgerRow = import('../src/config/host-persisted-row.js').WorkspaceStateSqlRow & {
  readonly kind: 'ledger';
  readonly value: RebindCoordinationLedger;
};
type CheckedHostStateRow = CheckedWorkStateRow | CheckedCoordinationLedgerRow;
type CheckedMastraLedgerRow = import('../src/config/host-persisted-row.js').WorkspaceMastraSqlRow & {
  readonly value: RebindMastraSessionLedgerState;
};
type CheckedGovernanceRow = import('../src/config/host-persisted-row.js').WorkspaceGovernanceSqlRow & {
  readonly value: Record<string, unknown> & { readonly status: string };
};

function isCheckedWorkState(value: unknown): value is RebindWorkState {
  return isPlainRecord(value) && validateReadonlyOwner(value);
}

function isCheckedCoordinationLedger(value: unknown): value is RebindCoordinationLedger {
  return validateCoordinationLedgerV1(value).ok;
}

function isCheckedGovernanceValue(value: unknown): value is Record<string, unknown> & { readonly status: string } {
  return isPlainRecord(value) && typeof value.status === 'string';
}

function isCheckedWorkRow(row: CheckedHostStateRow): row is CheckedWorkStateRow {
  return row.kind === 'work';
}

function isCheckedLedgerRow(row: CheckedHostStateRow): row is CheckedCoordinationLedgerRow {
  return row.kind === 'ledger';
}

function isWorkIdentity(value: unknown): value is RebindWorkIdentity {
  return (
    isPlainRecord(value) &&
    typeof value.repository_id === 'string' &&
    Array.isArray(value.project_ids) &&
    value.project_ids.every((projectId) => typeof projectId === 'string') &&
    typeof value.integrations_digest === 'string'
  );
}

function isStateVersion(value: unknown): value is RebindStateVersion {
  return (
    isPlainRecord(value) &&
    Object.keys(value).length === 2 &&
    Number.isSafeInteger(value.revision) &&
    typeof value.digest === 'string' &&
    /^[a-f0-9]{64}$/.test(value.digest)
  );
}

function hasHistoricalCaptureIdentity(value: Record<string, unknown>) {
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

function hasHistoricalCaptureVersions(value: Record<string, unknown>) {
  return (
    isStateVersion(value.expected_work) &&
    isStateVersion(value.expected_ledger) &&
    isStateVersion(value.expected_journal) &&
    Number.isSafeInteger(value.expected_maintenance_generation) &&
    typeof value.body_base64 === 'string' &&
    Object.hasOwn(value, 'provenance')
  );
}

function isHistoricalTerminalCaptureRequest(value: unknown): value is RebindHistoricalTerminalCaptureRequest {
  return (
    isPlainRecord(value) &&
    value.schema === 'HistoricalTerminalSynthesisCapture/v1' &&
    hasHistoricalCaptureIdentity(value) &&
    hasHistoricalCaptureVersions(value)
  );
}

function isCanonicalHistoricalProvenanceReference(value: unknown): boolean {
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

function isSynthesisInputEvidence(
  value: unknown,
): value is Record<string, unknown> & { status: string; agent_id: string; tool_call_ref: string } {
  return (
    isPlainRecord(value) &&
    typeof value.status === 'string' &&
    typeof value.agent_id === 'string' &&
    typeof value.tool_call_ref === 'string'
  );
}

function synthesisPredecessorResultIds(value: unknown): string[] {
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

function isSynthesisReportEvidence(value: unknown): value is Record<string, unknown> & {
  exit_code: number;
  input_path: string;
  command: readonly unknown[];
  stderr: string;
} {
  return (
    isPlainRecord(value) &&
    typeof value.exit_code === 'number' &&
    typeof value.input_path === 'string' &&
    Array.isArray(value.command) &&
    typeof value.stderr === 'string'
  );
}

function isSynthesisOutputSummary(value: unknown): value is Record<string, unknown> & {
  schema: string;
  readiness: string;
  material_gaps?: readonly unknown[];
  completeness?: Record<string, unknown>;
} {
  return (
    isPlainRecord(value) &&
    typeof value.schema === 'string' &&
    typeof value.readiness === 'string' &&
    (!Object.hasOwn(value, 'material_gaps') || Array.isArray(value.material_gaps)) &&
    (!Object.hasOwn(value, 'completeness') || isPlainRecord(value.completeness))
  );
}

type FrozenSourceBeforeimageBinding = {
  schema: string;
  path: string;
  bytes: number;
  sha256: string;
  snapshot_digest: string;
};
type FrozenPriorSystemUpdateBinding = {
  schema: string;
  path: string;
  bytes: number;
  sha256: string;
  status: string;
  operation_id: string;
  version: string;
  entry: string;
  run_id: string;
  artifact_id: string;
  installed_bytes: number;
  prior_bytes: number;
  delta_bytes: number;
  configuration_inspection: string;
  tests_invoked: false;
  reinstallation: false;
  runtime_accepted: false;
  developer_unblocked: false;
};
type FrozenSourceCorrectionRequestView = {
  request_id: string;
  publish_operation_id: string;
  source_beforeimages: FrozenSourceBeforeimageBinding;
  prior_system_update: FrozenPriorSystemUpdateBinding;
  authorized_changed_paths: readonly string[];
};
type SourceCorrectionOperationView = {
  schema: 'SourceDeliveryConfigRebindOperation/v1';
  revision: number;
  phase: 'planned' | 'fenced' | 'applied' | 'abandoned_no_effect';
  maintenance_released: boolean;
  plan_digest: string;
  plan: {
    operation_id: string;
    actor: string;
    instruction_ref: string;
    created_at: string;
    repository_id: string;
    project_ids: readonly string[];
    workspace_id: string;
    baseline_yaml: string;
    target_yaml: string;
    baseline_receipt: string;
    old_config_digest: string;
    target_config_digest: string;
    initialization_schema_digest: string;
    selector_digest: string;
    bundle_digest: string;
    state_digest: string;
    repository_root: string;
    token: string;
  };
};
type ProjectInputDocument = { readonly path: string; readonly text: string; readonly sha256: string };
type ProjectInputSet = {
  readonly schema: 'ProjectConfigurationInputSet/v1';
  readonly input_digest: string;
  readonly config_digest: string;
  readonly project: ProjectInputDocument;
  readonly agents: ProjectInputDocument;
  readonly flows: ProjectInputDocument;
};
type ProjectInputTexts = { readonly project: string; readonly agents: string; readonly flows: string };
type ProjectRebindRecoveryMode = 'apply' | 'resume' | 'restore';
type ProjectRebindSavePhase = 'fenced' | 'applied' | 'abandoned_no_effect';
type RebindProjectOperation = RebindOperationView & {
  readonly plan: RebindOperationView['plan'] & {
    readonly configuration_format: 'project-split-v2';
    readonly baseline_inputs: ProjectInputSet;
    readonly target_inputs: ProjectInputSet;
  };
};
type RebindOperationView = {
  schema: 'ConfigRebindOperation/v1' | 'SourceDeliveryConfigRebindOperation/v1';
  revision: number;
  phase: 'planned' | 'fenced' | 'applied' | 'abandoned_no_effect';
  maintenance_released: boolean;
  plan_digest: string;
  plan: SourceCorrectionOperationView['plan'] & {
    actor: string;
    instruction_ref: string;
    created_at: string;
    repository_root: string;
  };
};
type SourceCorrectionRequestCommon = {
  access: RebindSafeRepositoryAccess;
  root: string;
  config: RebindAgentRuntimeConfig;
  db: RebindDatabase;
  id: string;
  operationPath: string;
  operationBytes: Uint8Array;
  operation: SourceCorrectionOperationView;
  authorizedPaths?: readonly string[] | undefined;
  publishOperationId?: string | undefined;
  allowForwardReceipt?: boolean | undefined;
};
type SourceCorrectionRequestInput = SourceCorrectionRequestCommon &
  (
    | { readonly beforeimagePath: string; readonly priorSystemUpdatePath: string; readonly frozenRequest?: undefined }
    | {
        readonly beforeimagePath?: never;
        readonly priorSystemUpdatePath?: never;
        readonly frozenRequest: FrozenSourceCorrectionRequestView;
      }
  );
type SourceBeforeimageBindingInput = {
  readonly access: RebindSafeRepositoryAccess;
  readonly root: string;
  readonly operationId: string;
  readonly operationPath: string;
  readonly operationBytes: Uint8Array;
} & (
  | { readonly beforeimagePath: string; readonly frozen?: undefined }
  | { readonly beforeimagePath?: never; readonly frozen: FrozenSourceBeforeimageBinding }
);
type PriorSystemUpdateBindingInput = { readonly access: RebindSafeRepositoryAccess; readonly root: string } & (
  | { readonly priorSystemUpdatePath: string; readonly frozen?: undefined }
  | { readonly priorSystemUpdatePath?: never; readonly frozen: FrozenPriorSystemUpdateBinding }
);
type SourceCorrectionOriginalOperation = {
  readonly path: string;
  readonly sha256: string;
  readonly plan_digest: string;
  readonly revision: number;
  readonly phase: 'fenced';
  readonly maintenance_released: false;
};
type SourceCorrectionConfigView = {
  readonly schema: 'RuntimeConfigSourceCorrectionConfig/v1';
  readonly baseline_config_digest: string;
  readonly target_config_digest: string;
  readonly current_yaml_sha256: string;
  readonly yaml_state: 'baseline' | 'target';
  readonly receipt_sha256: string;
  readonly baseline_receipt_sha256: string;
  readonly initialization_schema_digest: string;
};
type SourceCorrectionCustodyView = {
  readonly schema: 'KnownTerminalCustodyBinding/v1';
  readonly work_id: string;
  readonly attempt: number;
  readonly action_id: string;
  readonly issue_id: string;
  readonly receipt_digest: string;
  readonly journal_revision: number;
  readonly journal_digest: string;
  readonly expected_maintenance_generation: number;
};
type SourceCorrectionFenceBindingView = {
  readonly schema: 'MaintenanceFenceBinding/v1';
  readonly project_ids: readonly string[];
  readonly operation_id: string;
  readonly manifest_digest: string;
  readonly request_digest: string;
  readonly bindings_digest: string;
  readonly closure_digest: string;
  readonly bundle_digest: string;
};
type SourceCorrectionFenceView = {
  readonly schema: 'MaintenanceFence/v1';
  readonly workspace_id: string;
  readonly revision: number;
  readonly generation: number;
  readonly status: 'held' | 'released';
  readonly binding: SourceCorrectionFenceBindingView;
  readonly token_digest: string;
};
type SourceCorrectionRequestView = {
  readonly schema: 'RuntimeConfigSourceCorrectionRequest/v1';
  readonly request_id: string;
  readonly operation_id: string;
  readonly publish_operation_id: string;
  readonly original_operation: SourceCorrectionOriginalOperation;
  readonly repository_root: string;
  readonly repository_id: string;
  readonly project_ids: readonly string[];
  readonly source_project_ids: readonly string[];
  readonly workspace_id: string;
  readonly state_digest: string;
  readonly config: SourceCorrectionConfigView;
  readonly fence: SourceCorrectionFenceView;
  readonly custody: readonly SourceCorrectionCustodyView[];
  readonly old_source: RebindScopedSourceSnapshot;
  readonly source_beforeimages: FrozenSourceBeforeimageBinding;
  readonly prior_system_update: FrozenPriorSystemUpdateBinding;
  readonly new_source: RebindScopedSourceSnapshot;
  readonly new_source_manifest: {
    readonly schema: 'RuntimeConfigSourcePackageBinding/v1';
    readonly path: string;
    readonly bytes: number;
    readonly sha256: string;
    readonly package_name: string;
    readonly version: string;
  };
  readonly source_changes: readonly {
    readonly path: string;
    readonly kind: string;
    readonly before: unknown;
    readonly after: unknown;
  }[];
  readonly authorized_changed_paths: readonly string[];
};
type SourceCorrectionManifestInput = { readonly path: string; readonly bytes: number; readonly sha256: string };
type SourceCorrectionBuildManifest = {
  readonly version: string;
  readonly pin: string;
  readonly target: string;
  readonly payloadId: string;
  readonly asset: { readonly file: string; readonly bytes: number; readonly sha256: string };
  readonly inputs: readonly SourceCorrectionManifestInput[];
};
type SourceCorrectionCiResult = {
  readonly request_id: string;
  readonly operation_id: string;
  readonly source_binding: string;
  readonly run_id: string;
  readonly run_attempt: number;
  readonly repository_id: string;
  readonly project_ids: readonly string[];
  readonly version: string;
  readonly target: string;
  readonly manifest_sha256: string;
  readonly payload_id: string;
  readonly asset: { readonly file: string; readonly bytes: number; readonly sha256: string };
  readonly checks: readonly unknown[];
};
type SourceCorrectionCiDelivery = {
  readonly profile: string;
  readonly conclusion: string;
  readonly operation_id: string;
  readonly checks: readonly unknown[];
  readonly request_id: string;
  readonly source_binding: string;
  readonly run_id: string;
  readonly run_attempt: number;
  readonly artifact_id: string;
  readonly result_sha256: string;
  readonly result: SourceCorrectionCiResult;
};
type SourceCorrectionInstallationReceipt = {
  readonly source_path: string;
  readonly source_sha256: string;
  readonly prior_bytes: number;
  readonly selected_bytes: number;
  readonly action: string;
  readonly exit_code: number;
  readonly signal: null;
  readonly tests_invoked: false;
  readonly reinstallation: false;
  readonly path: string;
  readonly sha256: string;
};
type SourceCorrectionEffectivePath = {
  readonly command_path: string;
  readonly bytes: number;
  readonly sha256: string;
  readonly package_name: string;
  readonly version: string;
  readonly target: string;
};
type SourceCorrectionReportView = {
  readonly request_id: string;
  readonly operation_id: string;
  readonly publish_operation_id: string;
  readonly original_operation_sha256: string;
  readonly original_plan_digest: string;
  readonly source_snapshot_digest: string;
  readonly build_manifest: SourceCorrectionBuildManifest;
  readonly build_manifest_sha256: string;
  readonly ci_delivery: SourceCorrectionCiDelivery;
  readonly installation_receipt: SourceCorrectionInstallationReceipt;
  readonly effective_path: SourceCorrectionEffectivePath;
  readonly native_self_attestation: unknown;
};
type SourceCorrectionExternalReportView = Omit<SourceCorrectionReportView, 'native_self_attestation'>;
type SourceCorrectionArtifactView = {
  readonly schema: 'RuntimeConfigSourceCorrectionRepair/v1';
  readonly status: 'requested' | 'applied';
  readonly revision: number;
  readonly operation_id: string;
  readonly request: SourceCorrectionRequestView;
  readonly report?: SourceCorrectionReportView;
  readonly completion?: unknown;
  readonly digest: string;
};
type RebindConfigBytesReader = Pick<RebindSafeRepositoryAccess, 'readBytes'>;
type PriorSystemUpdateReceipt = {
  readonly status: string;
  readonly operation_id: string;
  readonly version: string;
  readonly entry: string;
  readonly run_id: string;
  readonly artifact_id: string;
  readonly installed_bytes: number;
  readonly prior_bytes: number;
  readonly delta_bytes: number;
  readonly configuration_inspection: string;
  readonly tests_invoked: false;
  readonly reinstallation: false;
  readonly runtime_accepted: false;
  readonly developer_unblocked: false;
};
type SourceCorrectionCurrentRequestInput = {
  readonly access: RebindSafeRepositoryAccess;
  readonly root: string;
  readonly config: RebindAgentRuntimeConfig;
  readonly db: RebindDatabase;
  readonly operationPath: string;
  readonly operationBytes: Uint8Array;
  readonly operation: SourceCorrectionOperationView;
  readonly request: SourceCorrectionRequestView;
  readonly allowForwardReceipt?: boolean;
};
type SourceCorrectionWithdrawalInput = Omit<SourceCorrectionCurrentRequestInput, 'request'> & {
  readonly artifact: SourceCorrectionArtifactView;
  readonly expectedRequest: string;
};
type SourceCorrectionBridgeInput = Omit<SourceCorrectionCurrentRequestInput, 'request' | 'operation'> & {
  readonly operation: RebindOperationView | SourceCorrectionOperationView;
  readonly artifact: SourceCorrectionArtifactView;
};
type ClosedSourceDeliveryInput = Omit<SourceCorrectionCurrentRequestInput, 'request' | 'operation'> & {
  readonly operation: RebindOperationView | SourceCorrectionOperationView;
  readonly artifact: SourceCorrectionArtifactView;
  readonly store: RebindHostStateStore;
};
type ClosedSourceDeliveryTransition = { readonly completion: unknown; readonly baseline_config_digest: string };
type CorrectionRequestForInputs = {
  readonly values: ParsedSourceCorrectionArguments;
  readonly access: RebindSafeRepositoryAccess;
  readonly root: string;
  readonly config: RebindAgentRuntimeConfig;
  readonly db: RebindDatabase;
  readonly operationPath: string;
  readonly stored: { readonly bytes: Buffer; readonly value: SourceCorrectionOperationView };
  readonly frozenRequest?: SourceCorrectionRequestView;
};
type RebindRunOptions = { readonly onPhase?: ((phase: string) => void) | undefined };

const requireRebind: (valid: unknown, message: string) => asserts valid = (valid, message) => {
  if (!valid) throw new Error(`vida runtime-config rebind: ${message}`);
};

function parseJsonUnknown(text: string): unknown {
  const value: unknown = JSON.parse(text);
  return value;
}

function assertFencePresent(
  fence: import('../src/host-state.ts').MaintenanceFence | null,
): asserts fence is import('../src/host-state.ts').MaintenanceFence {
  requireRebind(fence !== null, 'maintenance fence is missing');
}
const sha = (bytes: RebindHashInput): string => createHash('sha256').update(bytes).digest('hex');
const MAX_ORIGINAL_CONTEXT_EXPORT_BYTES = 262144;
const MAX_CONFIGURED_CONTEXT_REFERENCES = 16;
const MAX_CONFIGURED_CONTEXT_FILE_BYTES = 65536;
const MAX_CONFIGURED_CONTEXT_TOTAL_BYTES = 262144;
const MAX_CONFIGURED_CONTEXT_EXCERPT_CHARS = 8192;
const MAX_NATIVE_ASSET_BYTES = 1024 * 1024 * 1024;
const json = (value: unknown): string => JSON.stringify(value, null, 2) + '\n';
const receiptPath = '.agent/runtime-initialization.v1.json';
const configPath = 'agent-runtime.config.v1.yaml';
const selectorPath = '.agent/active-runtime-selector.v1.json';
const operationName = 'runtime-config-rebind-operation.v1.json';
const deliveryOperationName = 'runtime-config-delivery-operation.v1.json';
const sourceCorrectionName = 'runtime-config-source-correction-repair.v1.json';
const sourceCustodyByteLimit = 96 * 1024 * 1024;
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
const operationValidator = (delivery: boolean) => (delivery ? validateDeliveryOperation : validateOperation);

function isRebindOperation(value: unknown, delivery: boolean): value is RebindOperationView {
  return operationValidator(delivery)(value) === true;
}

function isDeliveryRebindOperation(
  value: unknown,
): value is RebindOperationView & { readonly schema: 'SourceDeliveryConfigRebindOperation/v1' } {
  return (
    validateDeliveryOperation(value) === true &&
    isPlainRecord(value) &&
    value.schema === 'SourceDeliveryConfigRebindOperation/v1'
  );
}

function assertDeliveryRebindOperation(value: unknown): asserts value is SourceCorrectionOperationView {
  requireRebind(isDeliveryRebindOperation(value), 'delivery operation schema invalid');
}

function validateSourceCorrection(value: unknown): value is SourceCorrectionArtifactView {
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

function validateExternalSourceCorrectionReport(value: unknown): value is SourceCorrectionExternalReportView {
  return (
    ajv.compile(/** @type {import('ajv/dist/2020.js').AnySchemaObject} */ (externalSourceCorrectionReportSchema))(
      value,
    ) === true
  );
}

function assertExternalSourceCorrectionReport(value: unknown): asserts value is SourceCorrectionExternalReportView {
  requireRebind(validateExternalSourceCorrectionReport(value), 'external source correction report schema invalid');
}
const operationDigest = (operation: { readonly schema: string; readonly plan: unknown }) =>
  canonicalJsonDigest(
    operation.schema === 'SourceDeliveryConfigRebindOperation/v1'
      ? { schema: operation.schema, plan: operation.plan }
      : operation.plan,
  );
const validateReadonlyOwner = ajv.compile(workSchema);

function requireRebindPath(value: unknown, label: string): string {
  requireRebind(typeof value === 'string' && value.length > 0, `${label} path is required without a frozen binding`);
  return value;
}

function hasExactKeys(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join('|') === [...keys].sort().join('|')
  );
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function sortedTextValues(value: unknown): string[] {
  requireRebind(isStringArray(value), 'Host resource list is malformed');
  return [...value].sort((left, right) => left.localeCompare(right));
}

function hasNulOrLineBreak(value: string) {
  return value.includes('\0') || value.includes('\r') || value.includes('\n');
}

function hasControlCharacter(value: string) {
  for (const character of value) {
    if ((character.codePointAt(0) ?? 32) < 32) return true;
  }
  return false;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}
type RebindMastraRunSnapshot = {
  readonly runId: string;
  readonly status: string;
  readonly context: Record<string, unknown>;
};

function isMastraRunSnapshot(value: unknown): value is RebindMastraRunSnapshot {
  return (
    isPlainRecord(value) &&
    typeof value.runId === 'string' &&
    typeof value.status === 'string' &&
    isPlainRecord(value.context)
  );
}

function isPackageManifest(
  value: unknown,
): value is Record<string, unknown> & { readonly name: string; readonly version: string } {
  return isPlainRecord(value) && typeof value.name === 'string' && typeof value.version === 'string';
}

type OriginalContextAction = {
  readonly action_id: string;
  readonly wave_index: number;
  readonly stage_id: string;
  readonly work_id: string;
  readonly attempt: number;
  readonly context: unknown;
};
type OriginalContextEntry = {
  readonly id: string;
  readonly kind: 'official' | 'local' | 'skill';
  readonly location: string;
  readonly title: string;
};

function stableVersionParts(value: unknown): [number, number, number] | null {
  if (typeof value !== 'string' || !stableVersion.test(value)) return null;
  const parts = value.split('.').map(Number);
  return parts.every(Number.isSafeInteger) ? (parts as [number, number, number]) : null;
}

function isCurrentOrLaterStableVersion(candidate: unknown, baseline: unknown) {
  const left = stableVersionParts(candidate),
    right = stableVersionParts(baseline);
  if (!left || !right) return false;
  for (const index of [0, 1, 2] as const) if (left[index] !== right[index]) return left[index] > right[index];
  return true;
}

function assertOriginalContextActionRecord(entry: unknown): asserts entry is Record<string, unknown> {
  requireRebind(
    isPlainRecord(entry) &&
      hasExactKeys(entry, ['action_id', 'wave_index', 'stage_id', 'work_id', 'attempt', 'context']),
    'original context action binding invalid',
  );
}

function assertOriginalContextActionId(value: unknown): asserts value is string {
  requireRebind(typeof value === 'string' && /^[a-f0-9]{64}$/.test(value), 'original context action binding invalid');
}

function assertOriginalContextWave(value: unknown): asserts value is number {
  requireRebind(
    typeof value === 'number' && Number.isSafeInteger(value) && value >= 0,
    'original context action binding invalid',
  );
}

function assertOriginalContextStage(value: unknown): asserts value is string {
  requireRebind(
    typeof value === 'string' && value.length > 0 && value.length <= 128,
    'original context action binding invalid',
  );
}

function assertOriginalContextWork(value: unknown): asserts value is string {
  requireRebind(
    typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value),
    'original context action binding invalid',
  );
}

function assertOriginalContextAttempt(value: unknown): asserts value is number {
  requireRebind(
    typeof value === 'number' && Number.isSafeInteger(value) && value >= 1,
    'original context action binding invalid',
  );
}

function parseOriginalContextAction(entry: unknown): OriginalContextAction {
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

function validateOriginalContextCollection(value: unknown): Map<string, OriginalContextAction> {
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
  const byAction = new Map<string, OriginalContextAction>();
  for (const entry of value) {
    const action = parseOriginalContextAction(entry);
    requireRebind(!byAction.has(action.action_id), 'original context action is duplicated');
    byAction.set(action.action_id, action);
  }
  return byAction;
}

function isConfiguredContextByteCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

function historicalConfiguredContext(
  root: string,
  current: RebindAgentRuntimeConfig,
  original: RebindAgentRuntimeConfig,
  workflowId: string,
  state: RebindMastraSessionLedgerState,
  attempt: number,
  waveIndex: number,
  context: RebindSessionHandoffContext,
  action: RebindSessionBridgeAction,
  originalByAction: Map<string, OriginalContextAction>,
  usedOriginalContextActions: Set<string>,
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

function assertRecoveryReviewVersions(inspected: ReturnType<typeof inspectHistoricalOwnerContext>): {
  readonly work: RebindStateVersion;
  readonly ledger: RebindStateVersion;
  readonly journal: RebindStateVersion;
} {
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

function isHistoricalFrontierSnapshot(value: unknown): boolean {
  return isPlainRecord(value) && value.status === 'suspended';
}

function isHistoricalWaveAtIndex(
  entry: { readonly index: number; readonly value: unknown },
  index: number,
  frontier: { readonly index: number; readonly value: unknown } | undefined,
): boolean {
  return (
    entry.index === index && isPlainRecord(entry.value) && (entry.value.status === 'success' || entry === frontier)
  );
}

function assertHistoricalRunInput(
  value: unknown,
  state: RebindMastraSessionLedgerState,
  attempt: number,
  work: RebindWorkState,
  engineRow: Record<string, unknown>,
  identity: RebindWorkIdentity,
): { readonly snapshot: RebindMastraRunSnapshot; readonly input: RebindSessionBridgeRunState } {
  requireRebind(isMastraRunSnapshot(value), 'historical original engine snapshot is malformed');
  const input = parseSessionBridgeRunState(value.context.input);
  assertHistoricalRunIdentity(input, value, state, attempt, work, engineRow);
  assertHistoricalInputBindings(input, work, identity);
  return { snapshot: value, input };
}

function assertHistoricalRunIdentity(
  input: RebindSessionBridgeRunState,
  snapshot: RebindMastraRunSnapshot,
  state: RebindMastraSessionLedgerState,
  attempt: number,
  work: RebindWorkState,
  engineRow: Record<string, unknown>,
) {
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

function assertHistoricalInputBindings(
  input: RebindSessionBridgeRunState,
  work: RebindWorkState,
  identity: RebindWorkIdentity,
) {
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

function expectedOriginalContextEntries(
  config: RebindAgentRuntimeConfig,
  workflowId: string,
  stageId: string,
): OriginalContextEntry[] {
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
  const expected: OriginalContextEntry[] = [];
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

function uniqueOriginalContextSource(
  matches: RebindAgentRuntimeConfig['knowledge']['sources'],
): RebindAgentRuntimeConfig['knowledge']['sources'][number] {
  requireRebind(matches.length === 1, 'original context source selection is not unique');
  const source = matches[0];
  requireRebind(source !== undefined, 'original context source selection is not unique');
  return source;
}

function validateOriginalConfiguredContext(
  value: unknown,
  config: RebindAgentRuntimeConfig,
  workflowId: string,
  stageId: string,
  workId: string,
  attempt: number,
): RebindConfiguredContext {
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
  // The guards above validate the entire context; preserve the retained body.
  return structuredClone<unknown>(value) as RebindConfiguredContext;
}

function originalContextEntryPair(
  entries: readonly unknown[],
  expected: readonly OriginalContextEntry[],
  index: number,
): { readonly entry: unknown; readonly selected: OriginalContextEntry } {
  const entry = entries[index],
    selected = expected[index];
  requireRebind(entry !== undefined && selected !== undefined, 'original configured context entry is missing');
  return { entry, selected };
}

function parseRuntimeRebindArgument(key: unknown, value: unknown, values: Record<string, string>): [string, string] {
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

function validRuntimeRebindArguments(
  values: Record<string, string>,
  keys: string[],
  kind: string,
  mode: string,
  projectRoot: string,
  repairId: string,
) {
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

function parse(args: readonly string[]): Record<string, string> {
  requireRebind(args.length % 2 === 0, 'arguments must be paired');
  const values: Record<string, string> = {};
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

function assertInitializationReceipt(value: unknown): asserts value is RebindInitializationReceipt {
  const schemaValue = parseJsonUnknown(
    readRuntimePackageResourceText(
      runtimePackageAccess(),
      'schemas/runtime-initialization.v1.schema.json',
      'initialization schema',
    ),
  );
  requireRebind(isPlainRecord(schemaValue), 'initialization schema must be a JSON object');
  const schema = /** @type {import('ajv/dist/2020.js').AnySchemaObject} */ (schemaValue);
  /** @type {import('ajv').ValidateFunction<RebindInitializationReceipt>} */
  const validateReceipt = new Ajv2020({ strict: true, allErrors: true }).compile(schema);
  requireRebind(validateReceipt(value), 'initialization receipt schema invalid');
}

function parseInitializationReceipt(text: string): RebindInitializationReceipt {
  const value = parseJsonUnknown(text);
  assertInitializationReceipt(value);
  return value;
}

function readReceipt(
  access: RebindSafeRepositoryAccess,
  _config: RebindAgentRuntimeConfig,
): { readonly bytes: Buffer; readonly value: RebindInitializationReceipt } {
  const bytes = access.readBytes(receiptPath, 'initialization receipt');
  return { bytes, value: parseInitializationReceipt(bytes.toString('utf8')) };
}

function sameIdentity(root: string, config: RebindAgentRuntimeConfig, receipt: RebindInitializationReceipt) {
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
const prewriterWorkflows: readonly (readonly [string, string])[] = [
  ['implementation_new', 'develop_change'],
  ['implementation_change', 'develop_change'],
  ['bug_fix', 'develop_fix'],
  ['task_execution', 'develop_task'],
];
/** @type {readonly string[]} */
const prewriterRoles = ['source-planner', 'security-prewriter'];

function sameJson(left: unknown, right: unknown) {
  return canonicalJsonDigest(left) === canonicalJsonDigest(right);
}

function normalizedWorkflowEdges(edges: readonly (readonly [string, string])[]): [string, string][] {
  return [...edges]
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)))
    .map(([from, to]) => [from, to]);
}

function normalizePrewriterWorkflow(
  oldConfig: RebindAgentRuntimeConfig,
  normalized: DeepMutable<RebindAgentRuntimeConfig>,
  target: RebindAgentRuntimeConfig,
  maintainedTemplate: RebindAgentRuntimeConfig,
  workflowId: string,
  developerId: string,
): boolean {
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

function prewriterStageBindingsMatch(
  original: RebindAgentRuntimeConfig['workflows'][string],
  originalDeveloper: RebindAgentRuntimeConfig['workflows'][string]['stages'][number],
  developer: RebindAgentRuntimeConfig['workflows'][string]['stages'][number],
  reviewStages: RebindAgentRuntimeConfig['workflows'][string]['stages'],
  review: RebindAgentRuntimeConfig['workflows'][string]['stages'][number],
  expectedReview: RebindAgentRuntimeConfig['workflows'][string]['stages'][number],
  stageIndex: number,
  expectedStageIndex: number | undefined,
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

function prewriterWorkflowEdgesMatch(
  original: RebindAgentRuntimeConfig['workflows'][string],
  beforeReview: RebindAgentRuntimeConfig['workflows'][string],
  developerId: string,
): boolean {
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

function exactPrewriterTemplateDelta(oldConfig: RebindAgentRuntimeConfig, target: RebindAgentRuntimeConfig) {
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
      templateYaml = readRuntimePackageResourceText(
        runtimePackageAccess(),
        'templates/agent-runtime.config.template.v1.yaml',
        'maintained prewriter workflow template',
      )
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

  const normalized = structuredClone(target) as DeepMutable<RebindAgentRuntimeConfig>;
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

  const baseline = structuredClone(oldConfig) as DeepMutable<RebindAgentRuntimeConfig>;
  for (const [workflowId] of prewriterWorkflows) {
    const workflow = baseline.workflows[workflowId];
    requireRebind(workflow, 'prewriter workflow is missing from baseline');
    workflow.edges = normalizedWorkflowEdges(workflow.edges);
  }
  return sameJson(normalized, baseline);
}

function targetConfig(
  access: RebindConfigBytesReader,
  root: string,
  oldConfig: RebindAgentRuntimeConfig,
  targetPath: string,
) {
  const bytes = access.readBytes(targetPath, 'authored target YAML');
  const target = validateRuntimeConfigRepairTargetBytes(bytes, root, runtimeConfigurationSourceFor(oldConfig));
  const unchanged = structuredClone(target) as DeepMutable<RebindAgentRuntimeConfig>,
    unchangedExecutor = unchanged.agents.profiles.executor,
    oldExecutor = oldConfig.agents.profiles.executor;
  applyTargetExecutorBaseline(unchangedExecutor, oldExecutor, unchanged, target, oldConfig);
  return { bytes, config: target };
}

function applyTargetExecutorBaseline(
  unchangedExecutor: DeepMutable<RebindAgentRuntimeConfig>['agents']['profiles']['executor'] | undefined,
  oldExecutor: RebindAgentRuntimeConfig['agents']['profiles']['executor'] | undefined,
  unchanged: DeepMutable<RebindAgentRuntimeConfig>,
  target: RebindAgentRuntimeConfig,
  oldConfig: RebindAgentRuntimeConfig,
) {
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

export function inspectHistoricalOwnerContext(
  root: string,
  baselinePath: string,
  identity: import('../src/host-state.ts').WorkIdentity,
  attempt: number,
  originalContexts?: unknown,
): {
  config: ReturnType<typeof loadRuntimeConfig>;
  current: ReturnType<typeof loadRuntimeConfig>;
  workspace: ReturnType<typeof inspectCliHostWorkspaceDatabase>;
  owner: ReturnType<typeof inspectCliHostWorkspaceDatabase>['work'][number];
  journal: ReturnType<typeof inspectCliHostWorkspaceDatabase>['journals'][number];
  ledgerState: RebindMastraSessionLedgerState;
  maintenanceGeneration: number;
  engine_binding: string;
  baseline_binding: string;
  receipt_binding: string;
  runtime_binding: ReturnType<typeof runtimeBinding>;
} {
  const originalContextByAction = validateOriginalContextCollection(originalContexts),
    /** @type {Set<string>} */
    usedOriginalContextActions = new Set<string>();
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
      sha(
        readRuntimePackageResourceBytes(
          runtimePackageAccess(),
          'schemas/runtime-initialization.v1.schema.json',
          'initialization schema',
        ),
      ),
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

export function openInternalRecoveryReview(input: RebindRecoveryReviewInput) {
  const root = input.repositoryRoot;
  requireRebind(path.isAbsolute(root) && path.resolve(root) === root, 'recovery root invalid');
  const originalContexts = input.originalContexts === undefined ? undefined : structuredClone(input.originalContexts);
  const historical = () =>
    inspectHistoricalOwnerContext(root, input.baselinePath, input.identity, input.attempt, originalContexts);

  const contextBinding = (value: ReturnType<typeof inspectHistoricalOwnerContext>) => ({
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

  const inspectionIdentity = (value: RebindRecoveryReviewBinding) => {
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
      complete: (observed: unknown) => {
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

function database(
  root: string,
  config: import('../src/config/runtime-config.ts').AgentRuntimeConfig,
  readonly: boolean,
) {
  return openCliWorkspaceDatabase(
    root,
    sessionHandoffDatabasePath(root, config),
    deriveWorkspaceId(config.repository.repository_id, root),
    readonly,
  );
}

function checkedRows(db: RebindDatabase, table: 'agent_host_state', workspace: string): CheckedHostStateRow[];
function checkedRows(
  db: RebindDatabase,
  table: 'agent_host_mastra_session_ledger',
  workspace: string,
): CheckedMastraLedgerRow[];
function checkedRows(db: RebindDatabase, table: 'agent_host_governance', workspace: string): CheckedGovernanceRow[];
function checkedRows(db: import('bun:sqlite').Database, table: RebindSqlTable, workspace: string) {
  const read = () => readCheckedWorkspaceRows(db, table, workspace);
  return db.inTransaction ? read() : db.transaction(read).deferred();
}

function readCheckedWorkspaceRows(db: RebindDatabase, table: RebindSqlTable, workspace: string) {
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
  return rows.map((unknownRow) => decodeCheckedWorkspaceRow(db, table, unknownRow, workspace));
}

function decodeCheckedWorkspaceRow(db: RebindDatabase, table: RebindSqlTable, unknownRow: unknown, workspace: string) {
  const decoded = decodeWorkspaceSqlRow(table, unknownRow, workspace, db);
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

function checkedRowBindings(
  rows: readonly CheckedHostStateRow[] | readonly CheckedMastraLedgerRow[] | readonly CheckedGovernanceRow[],
) {
  return rows.map(({ payload: _payload, payloadBytes, value: _value, ...metadata }) => ({
    ...metadata,
    payload_sha256: sha(payloadBytes),
  }));
}

/** Issued indexes follow risk filtering; absent original risk selection requires all possible profiles to be readonly. */

export function cooperativeReadonlyAssignments(config: RebindAgentRuntimeConfig, request: RebindSessionBridgeRequest) {
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

function isCooperativeReadonlyAssignment(
  config: RebindAgentRuntimeConfig,
  assignment: RebindAgentRuntimeConfig['workflows'][string]['stages'][number]['assignments'][number],
) {
  const profile = config.agents.profiles[assignment.profile];
  if (!profile) return false;
  const tools = config.agents.tool_policies[profile.tools_policy];
  return (
    profile.mutation_scope === 'none' &&
    tools?.source_write === false &&
    Array.isArray(tools.allowed_tools) &&
    tools.allowed_tools.every((tool: string) =>
      ['runtime.read', 'source.read', 'docs.read', 'web.search'].includes(tool),
    ) &&
    ['none', 'official_docs'].includes(profile.egress_policy)
  );
}

/** Preserve original unknown research; classify only from its own frozen authority. */

function readonlyUnknown(
  root: string,
  config: RebindAgentRuntimeConfig,
  row: CheckedMastraLedgerRow,
  item: RebindMastraSessionLedgerState['items'][number],
  host: readonly CheckedHostStateRow[],
) {
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

function assertReadonlyFrozenSourceScope(state: RebindMastraSessionLedgerState, request: RebindSessionBridgeRequest) {
  requireRebind(
    state.source_scope?.schema === 'ScopedSourceSnapshot/v1' &&
      request.scope_digest === state.source_scope.digest &&
      state.source_scope.digest ===
        canonicalJsonDigest({ schema: state.source_scope.schema, entries: state.source_scope.entries }),
    'original source scope differs',
  );
}

function assertReadonlyFrozenProjectBinding(
  root: string,
  config: RebindAgentRuntimeConfig,
  ownerRow: CheckedWorkStateRow,
) {
  const currentConfig = loadRuntimeConfig(root);
  requireRebind(
    (['repository', 'projects', 'integrations'] as const).every(
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

function assertReadonlyFrozenSnapshot(value: unknown): asserts value is RebindMastraRunSnapshot {
  requireRebind(isMastraRunSnapshot(value), 'issued native outcome snapshot is malformed');
}

function assertReadonlyFrozenRunAuthority(
  snapshot: RebindMastraRunSnapshot,
  state: RebindMastraSessionLedgerState,
  request: RebindSessionBridgeRequest,
  record: Record<string, unknown>,
  config: RebindAgentRuntimeConfig,
): RebindSessionBridgeRunState {
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

function isReadonlyFrozenWaveRequest(
  value: unknown,
  input: RebindSessionBridgeRunState,
  state: RebindMastraSessionLedgerState,
  request: RebindSessionBridgeRequest,
): boolean {
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

function isUniqueReadonlyWaveRequest(requests: readonly unknown[], request: RebindSessionBridgeRequest): boolean {
  const matches = (entry: unknown): boolean => isReadonlyWaveRequestAction(entry, request);
  const candidate = requests.find(matches);
  return requests.filter(matches).length === 1 && canonicalJsonDigest(candidate) === canonicalJsonDigest(request);
}

function isReadonlyWaveRequestAction(value: unknown, request: RebindSessionBridgeRequest): boolean {
  return isPlainRecord(value) && value.action_id === request.action_id;
}

/** Read the original suspended engine state after a caller has proved its Journal authority. */

function readonlyUnknownFrozenEngine(
  root: string,
  config: RebindAgentRuntimeConfig,
  row: CheckedMastraLedgerRow,
  item: RebindMastraSessionLedgerState['items'][number],
  host: readonly CheckedHostStateRow[],
) {
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

function readonlyBookkeepingUnknown(
  root: string,
  config: RebindAgentRuntimeConfig,
  row: CheckedMastraLedgerRow,
  item: RebindMastraSessionLedgerState['items'][number],
  host: readonly CheckedHostStateRow[],
  store: RebindHostStateStore,
) {
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
    requestIntents: readonly RebindHistoricalTerminalCaptureRequest['request_intent'][] = [
      'next_work',
      'linked_correction',
    ],
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

function isReadonlyBookkeepingActivationBinding(
  activationBinding: unknown,
  ticket: RebindCoordinationLedger['tickets'][number],
  claim: RebindCoordinationLedger['claims'][number],
  release: RebindCoordinationLedger['operations'][number],
  owner: RebindWorkState,
  state: RebindMastraSessionLedgerState,
  identity: RebindWorkIdentity,
  nativeSessionHandle: string,
  resources: readonly string[],
): boolean {
  return (
    Boolean(activationBinding) &&
    isReadonlyBookkeepingTicketOwner(activationBinding, ticket, release, owner, state, identity, nativeSessionHandle) &&
    isReadonlyBookkeepingTicketResources(activationBinding, ticket, claim) &&
    isReadonlyBookkeepingClaim(claim, ticket, state, nativeSessionHandle, resources) &&
    canonicalJsonDigest(sortedTextValues(release.resources)) === canonicalJsonDigest(resources)
  );
}

function isReadonlyBookkeepingTicketOwner(
  activationBinding: unknown,
  ticket: RebindCoordinationLedger['tickets'][number],
  release: RebindCoordinationLedger['operations'][number],
  owner: RebindWorkState,
  state: RebindMastraSessionLedgerState,
  identity: RebindWorkIdentity,
  nativeSessionHandle: string,
): boolean {
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

function isReadonlyBookkeepingTicketResources(
  activationBinding: unknown,
  ticket: RebindCoordinationLedger['tickets'][number],
  claim: RebindCoordinationLedger['claims'][number],
): boolean {
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

function isReadonlyBookkeepingClaim(
  claim: RebindCoordinationLedger['claims'][number],
  ticket: RebindCoordinationLedger['tickets'][number],
  state: RebindMastraSessionLedgerState,
  nativeSessionHandle: string,
  resources: readonly string[],
): boolean {
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

function storedBase64(value: unknown, label: string, maximumBytes: number): { bytes: Buffer; value: unknown } {
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

function readonlyKnownTerminal(
  db: RebindDatabase,
  root: string,
  config: RebindAgentRuntimeConfig,
  row: CheckedMastraLedgerRow,
  item: RebindMastraSessionLedgerState['items'][number],
  host: readonly CheckedHostStateRow[],
  store: RebindHostStateStore,
  maintenanceReceipt: RebindInspectionReceipt,
) {
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

function verifiedMaintenanceStatus(
  db: RebindDatabase,
  store: RebindHostStateStore,
  receipt: RebindInspectionReceipt,
): 'held' | 'released' | null | 'unverified' {
  return receipt?.unfenced === true && db.inTransaction
    ? (receipt.prior?.status ?? null)
    : !db.inTransaction
      ? (store.readMaintenanceFence()?.status ?? null)
      : 'unverified';
}

function maintenanceGenerationMatches(
  held: import('../src/host-state.ts').MaintenanceFence | null | undefined,
  status: 'held' | 'released' | null | 'unverified',
  expected: number,
  current: number,
): boolean {
  return held
    ? held.status === 'held' && expected < held.generation && held.generation === current
    : isVerifiedUnfencedStatus(status) && expected <= current;
}

function isVerifiedUnfencedStatus(status: 'held' | 'released' | null | 'unverified'): boolean {
  return status !== 'held' && status !== 'unverified';
}

/** Historical rights come from the protected Work binding, never current YAML. */

function historicalConfigResolver(
  root: string,
  config: RebindAgentRuntimeConfig,
  workspace: string,
): (expectedDigest: string) => RebindAgentRuntimeConfig {
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
        const retainedOperations: readonly (readonly [string, boolean])[] = [
          [operationName, false],
          [deliveryOperationName, true],
        ];
        for (const [name, delivery] of retainedOperations) {
          const reference = path.posix.join(directory, name);
          if (!access.fileExists(reference, 'retained config operation')) continue;
          const { value } = readOperation(access, reference, id, root, delivery);
          if (value.phase !== 'applied' || value.maintenance_released !== true) continue;
          requireRebind(
            value.plan.workspace_id === workspace && value.plan.repository_id === config.repository.repository_id,
            'retained historical config operation belongs to another workspace',
          );
          const versions: readonly (readonly [string, string])[] = [
            [value.plan.baseline_yaml, value.plan.old_config_digest],
            [value.plan.target_yaml, value.plan.target_config_digest],
          ];
          for (const [yaml, digest] of versions) {
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

export function currentState(
  db: RebindDatabase,
  workspace: string,
  root: string,
  config: RebindAgentRuntimeConfig,
  existingStore?: RebindHostStateStore | null,
  maintenanceReceipt?: RebindInspectionReceipt,
): string {
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
          // Preserve the original pending item's reservation for the UNKNOWN authority guard.
          frozen.push(readonlyUnknown(root, boundConfig, row, item, hostRows));
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

function isActivationFreeUnknownItem(entry: RebindMastraSessionLedgerState['items'][number]): boolean {
  return entry.research_activation === undefined && entry.research_normalization === undefined;
}

function selector(access: RebindSafeRepositoryAccess) {
  const bytes = access.readBytes(selectorPath, 'active selector');
  const value = parseJsonUnknown(bytes.toString('utf8'));
  requireRebind(isActiveRuntimeSelector(value), 'selected bundle identity invalid');
  return { bytes, value };
}

function isActiveRuntimeSelector(
  value: unknown,
): value is Record<string, unknown> & { readonly payload_manifest_sha256: string } {
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

function isSha256Text(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
}

function assertSourcePackageIdentity(workspace: unknown, manifest: unknown, bundle: string) {
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

function assertSourceRuntimeInventory(inventory: readonly string[]) {
  requireRebind(
    inventory.includes('src/runtime-kernel.ts') && inventory.includes('bin/run.ts'),
    'Source runtime is incomplete',
  );
}

function assertSourceInventoryPresent(source: RebindScopedSourceSnapshot) {
  requireRebind(
    source.entries.every((entry) => entry.exists),
    'Source runtime file disappeared',
  );
}

function assertSourceSelectorAbsent(selection: RebindScopedSourceSnapshot) {
  requireRebind(
    selection.entries.find((entry) => entry.path === selectorPath)?.exists === false,
    'Source selector appeared',
  );
}

function runtimeBinding(access: RebindSafeRepositoryAccess, config: RebindAgentRuntimeConfig) {
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

function frozenPlan(
  values: Record<string, string>,
  root: string,
  config: RebindAgentRuntimeConfig,
  access: RebindSafeRepositoryAccess,
  db: RebindDatabase,
) {
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
  const schema = readRuntimePackageResourceBytes(
    runtimePackageAccess(),
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

function isFrozenOperationBinding(
  value: unknown,
  id: string,
  root: string,
  delivery: boolean,
): value is RebindOperationView | SourceCorrectionOperationView {
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

function readOperation(
  access: RebindSafeRepositoryAccess,
  operationPath: string,
  id: string,
  root: string,
  delivery: true,
): { readonly bytes: Buffer; readonly value: SourceCorrectionOperationView };
function readOperation(
  access: RebindSafeRepositoryAccess,
  operationPath: string,
  id: string,
  root: string,
  delivery: false,
): { readonly bytes: Buffer; readonly value: RebindOperationView & { readonly schema: 'ConfigRebindOperation/v1' } };
function readOperation(
  access: RebindSafeRepositoryAccess,
  operationPath: string,
  id: string,
  root: string,
  delivery: boolean,
): { readonly bytes: Buffer; readonly value: RebindOperationView | SourceCorrectionOperationView };
function readOperation(
  access: RebindSafeRepositoryAccess,
  operationPath: string,
  id: string,
  root: string,
  delivery: boolean,
): { readonly bytes: Buffer; readonly value: RebindOperationView | SourceCorrectionOperationView } {
  const bytes = access.readBytes(operationPath, 'config rebind operation');
  requireRebind(bytes.length <= 16 * 1024 * 1024, 'operation exceeds bound');
  /** @type {unknown} */
  const value = parseJsonUnknown(bytes.toString('utf8'));
  requireRebind(isFrozenOperationBinding(value, id, root, delivery), 'frozen operation invalid or foreign');
  return { bytes, value };
}

/** Read an already applied normal config edge; no maintenance or receipt mutation. */

export function readAppliedRuntimeConfigRebind(root: string, config: RebindAgentRuntimeConfig, operationId: string) {
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
      readRuntimePackageResourceBytes(
        runtimePackageAccess(),
        'schemas/agent-runtime-config.v1.schema.json',
        'current config schema',
      ),
    ),
  };
}

function readExternalBytes(file: string, maximum: number, label: string, root?: string): Buffer {
  requireRebind(
    typeof file === 'string' &&
      file.length > 0 &&
      file.length <= 4096 &&
      path.isAbsolute(file) &&
      path.resolve(file) === file &&
      !hasNulOrLineBreak(file),
    `${label} path invalid`,
  );
  const flags = constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0);
  const opened =
    root === undefined
      ? undefined
      : openRootFileSync({
          absolutePath: file,
          rootPath: root,
          boundaryLabel: label,
          maxBytes: maximum,
          rejectHardlinks: true,
          rejectSymlinks: true,
          allowedType: 'file',
        });
  if (opened !== undefined) requireRebind(opened.ok, `${label} is not a safe root-bound file`);
  const fd = opened === undefined ? openSync(file, flags) : opened.fd;
  let outcome: DatabaseWorkOutcome<void> = { ok: true, value: undefined };
  try {
    const before = fstatSync(fd, { bigint: true }),
      namedBefore = lstatSync(file, { bigint: true });
    requireRebind(
      before.isFile() &&
        namedBefore.isFile() &&
        !namedBefore.isSymbolicLink() &&
        before.nlink === 1n &&
        namedBefore.nlink === 1n &&
        before.dev === namedBefore.dev &&
        before.ino === namedBefore.ino &&
        before.size === namedBefore.size &&
        before.size <= BigInt(maximum) &&
        (opened === undefined || sameFileIdentity(opened, before)),
      `${label} is not a bounded regular file`,
    );
    const bytes = Buffer.alloc(Number(before.size));
    let offset = 0;
    while (offset < bytes.length) {
      const count = readSync(fd, bytes, offset, bytes.length - offset, offset);
      requireRebind(count > 0, `${label} ended during read`);
      offset += count;
    }
    const after = fstatSync(fd, { bigint: true }),
      namedAfter = lstatSync(file, { bigint: true }),
      extra = Buffer.alloc(1);
    requireRebind(
      after.isFile() &&
        namedAfter.isFile() &&
        !namedAfter.isSymbolicLink() &&
        after.nlink === 1n &&
        namedAfter.nlink === 1n &&
        before.dev === after.dev &&
        before.ino === after.ino &&
        before.size === after.size &&
        before.mtimeNs === after.mtimeNs &&
        before.ctimeNs === after.ctimeNs &&
        after.dev === namedAfter.dev &&
        after.ino === namedAfter.ino &&
        after.size === namedAfter.size &&
        readSync(fd, extra, 0, 1, bytes.length) === 0,
      `${label} changed during read`,
    );
    return bytes;
  } catch (error) {
    outcome = { ok: false, error };
    throw error;
  } finally {
    finishWorkspaceDatabaseClose(fd, outcome, closeSync, `${label} read and descriptor close failed`);
  }
}

function parseExternalJson(file: string, maximum: number, label: string): unknown {
  try {
    return parseJsonUnknown(new TextDecoder('utf-8', { fatal: true }).decode(readExternalBytes(file, maximum, label)));
  } catch (error) {
    requireRebind(false, externalJsonFailureMessage(label, error));
  }
}

function externalJsonFailureMessage(label: string, error: unknown): string {
  const detail = error instanceof Error ? error.message : String(error);
  return `${label} is not bounded UTF-8 JSON: ${detail}`;
}

function validSourceSnapshot(value: unknown): RebindScopedSourceSnapshot {
  requireRebind(
    isPlainRecord(value) &&
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
  const entries: RebindScopedSourceSnapshot['entries'][number][] = [];
  let prior = '';
  for (const entry of value.entries) {
    requireRebind(isValidSourceSnapshotEntry(entry, prior), 'source snapshot entry is invalid or unsorted');
    entries.push(entry);
    prior = entry.path;
  }
  return { schema: 'ScopedSourceSnapshot/v1', entries, digest: value.digest };
}

function isValidSourceSnapshotEntry(
  value: unknown,
  prior: string,
): value is RebindScopedSourceSnapshot['entries'][number] {
  if (!hasExactKeys(value, ['path', 'exists', 'bytes', 'sha256']) || !isPlainRecord(value)) return false;
  return (
    isCanonicalSnapshotPath(value.path) &&
    value.path > prior &&
    typeof value.exists === 'boolean' &&
    (value.exists ? isPresentSnapshotFile(value.bytes, value.sha256) : value.bytes === null && value.sha256 === null)
  );
}

function isCanonicalSnapshotPath(value: unknown): value is string {
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

function isPresentSnapshotFile(bytes: unknown, digest: unknown): boolean {
  return (
    typeof bytes === 'number' &&
    Number.isSafeInteger(bytes) &&
    bytes >= 0 &&
    bytes <= 8 * 1024 * 1024 &&
    isSha256Text(digest)
  );
}

function sourceBeforeimageSnapshot(
  value: unknown,
  operationId: string,
  operationPath: string,
  operationBytes: Uint8Array,
) {
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
  const beforeimages = new Map<string, Buffer>();
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

function sourceSnapshotChanges(before: RebindScopedSourceSnapshot, after: RebindScopedSourceSnapshot) {
  const beforeEntries = new Map(before.entries.map((entry) => [entry.path, entry])),
    afterEntries = new Map(after.entries.map((entry) => [entry.path, entry])),
    paths = [...new Set([...beforeEntries.keys(), ...afterEntries.keys()])].sort();
  const normalize = (
    entries: Map<string, RebindScopedSourceSnapshot['entries'][number]>,
  ): RebindScopedSourceSnapshot => {
    const projected: RebindScopedSourceSnapshot['entries'][number][] = paths.map(
        (relative) => entries.get(relative) ?? { path: relative, exists: false, bytes: null, sha256: null },
      ),
      body = { schema: 'ScopedSourceSnapshot/v1' as const, entries: projected };
    return { ...body, digest: canonicalJsonDigest(body) };
  };
  return compareScopedSourceSnapshots(normalize(beforeEntries), normalize(afterEntries));
}

function canonicalChangedPaths(value: unknown): readonly string[] {
  requireRebind(Array.isArray(value) && value.length > 0 && value.length <= 64, 'authorized source path set invalid');
  requireRebind(isStringArray(value), 'authorized source paths must be text');
  const result = [...value].sort();
  requireRebind(
    result.length === new Set(result).size && result.every((relative) => isCanonicalAuthorizedSourcePath(relative)),
    'authorized source paths must be canonical package paths',
  );
  return result;
}

function isCanonicalAuthorizedSourcePath(relative: string): boolean {
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
    typeof process.versions.bun === 'string' &&
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
      pin === process.versions.bun &&
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

function samePath(left: string, right: string) {
  const a = path.resolve(left),
    b = path.resolve(right);
  return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;
}

function requireEffectivePath(executable: string) {
  const directory = path.dirname(executable),
    entries = String(process.env.PATH ?? '')
      .split(path.delimiter)
      .filter(Boolean);
  requireRebind(
    entries.some((entry) => samePath(entry, directory)),
    'installed command directory is absent from effective PATH',
  );
}

function streamedNativeAssetDigest(
  access: RebindSafeRepositoryAccess,
  relative: string,
  expectedBytes: number,
): string {
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
  let outcome: DatabaseWorkOutcome<void> = { ok: true, value: undefined };
  try {
    const openedMetadata = fstatSync(opened.fd),
      initialDescriptor = fstatSync(opened.fd, { bigint: true }),
      initialName = lstatSync(absolutePath, { bigint: true });

    const sameVersion = (left: import('node:fs').BigIntStats, right: import('node:fs').BigIntStats) =>
      sameFileIdentity(left, right) &&
      left.isFile() &&
      right.isFile() &&
      !left.isSymbolicLink() &&
      !right.isSymbolicLink() &&
      left.nlink === 1n &&
      right.nlink === 1n &&
      left.size === right.size &&
      left.mtimeNs === right.mtimeNs &&
      left.ctimeNs === right.ctimeNs;
    requireRebind(
      sameFileIdentity(opened, initialDescriptor) &&
        opened.stat.isFile() &&
        !opened.stat.isSymbolicLink() &&
        opened.stat.nlink === 1 &&
        openedMetadata.nlink === 1 &&
        opened.stat.size === openedMetadata.size &&
        opened.stat.mtimeMs === openedMetadata.mtimeMs &&
        opened.stat.ctimeMs === openedMetadata.ctimeMs &&
        sameVersion(initialDescriptor, initialName) &&
        initialDescriptor.size === BigInt(expectedBytes),
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
    const finalDescriptor = fstatSync(opened.fd, { bigint: true }),
      finalName = lstatSync(absolutePath, { bigint: true });
    requireRebind(
      bytesRead === expectedBytes &&
        sameVersion(initialDescriptor, finalDescriptor) &&
        sameVersion(finalDescriptor, finalName),
      'native installation source asset changed during read',
    );
    return hash.digest('hex');
  } catch (error) {
    outcome = { ok: false, error };
    throw error;
  } finally {
    finishWorkspaceDatabaseClose(
      opened.fd,
      outcome,
      closeSync,
      'native installation source asset read and descriptor close failed',
    );
  }
}

function validateSourceCorrectionReport(
  report: SourceCorrectionExternalReportView,
  request: SourceCorrectionRequestView,
  access: RebindSafeRepositoryAccess,
  selfAttestation: NonNullable<ReturnType<typeof currentNativeSelfAttestation>>,
) {
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
      manifest.pin === selfAttestation.bun_version &&
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
  const inputByPath = new Map<string, SourceCorrectionManifestInput>();
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

function isCanonicalNativeManifestInputPath(value: string, previous: string): boolean {
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

function isCurrentNativeInstallationSourcePath(value: unknown, access: RebindSafeRepositoryAccess): value is string {
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

function validateSourceCorrectionArtifact(value: unknown): SourceCorrectionArtifactView {
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

function assertSourceCorrectionArtifact(value: unknown): asserts value is SourceCorrectionArtifactView {
  requireRebind(validateSourceCorrection(value), 'source correction sidecar schema invalid');
}

function isAppliedSourceCorrectionArtifact(
  value: unknown,
): value is SourceCorrectionArtifactView & { readonly status: 'applied'; readonly report: SourceCorrectionReportView } {
  return validateSourceCorrection(value) && value.status === 'applied' && value.report !== undefined;
}

function assertAppliedSourceCorrectionArtifact(value: unknown): asserts value is SourceCorrectionArtifactView & {
  readonly status: 'applied';
  readonly report: SourceCorrectionReportView;
} {
  requireRebind(isAppliedSourceCorrectionArtifact(value), 'source correction is not applied');
}

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

function isSourceCorrectionFlag(value: unknown): value is SourceCorrectionFlag {
  return typeof value === 'string' && sourceCorrectionFlags.has(value);
}

function parseSourceCorrectionArgs(args: readonly string[]): ParsedSourceCorrectionArguments {
  requireRebind(args.length % 2 === 0, 'source correction arguments must be paired');
  const values: ParsedSourceCorrectionArguments = {};
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
  const optionValues: Record<string, string> = {};
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
        ? (['--source-beforeimages', '--prior-system-update'] as const).every(
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
  let authorizedPaths: unknown = [];
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

function requiredSourceArgument(values: ParsedSourceCorrectionArguments, key: SourceCorrectionFlag): string {
  const value = values[key];
  requireRebind(typeof value === 'string', `source correction argument ${key} is required`);
  return value;
}

function projectRelativeExternalPath(root: string, absolutePath: string, label: string): string {
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

function readRetainedSourceCustody(access: RebindSafeRepositoryAccess, relative: string): Buffer {
  const label = 'retained source custody';
  return access.withExclusiveLock(relative, label, () =>
    readExternalBytes(
      path.join(access.repository_root, relative),
      sourceCustodyByteLimit,
      label,
      access.repository_root,
    ),
  );
}

function sourceBeforeimageBinding({
  access,
  root,
  beforeimagePath,
  operationId,
  operationPath,
  operationBytes,
  frozen,
}: SourceBeforeimageBindingInput): {
  readonly snapshot: RebindScopedSourceSnapshot;
  readonly binding: FrozenSourceBeforeimageBinding;
} {
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
  const bytes = readRetainedSourceCustody(access, relative);
  requireRebind(
    bytes.length <= sourceCustodyByteLimit &&
      (!frozen || (bytes.length === frozen.bytes && sha(bytes) === frozen.sha256)),
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

function priorSystemUpdateBinding({
  access,
  root,
  priorSystemUpdatePath,
  frozen,
}: PriorSystemUpdateBindingInput): FrozenPriorSystemUpdateBinding {
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
  const binding: FrozenPriorSystemUpdateBinding = {
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

function isPriorSystemUpdateReceipt(value: unknown): value is PriorSystemUpdateReceipt {
  return (
    isPlainRecord(value) &&
    isPriorSystemUpdateIdentity(value) &&
    isPriorSystemUpdateSizes(value) &&
    isPriorSystemUpdateNonAcceptance(value)
  );
}

function isPriorSystemUpdateIdentity(value: Record<string, unknown>): boolean {
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

function isPriorSystemUpdateRunBinding(value: Record<string, unknown>): boolean {
  return (
    typeof value.run_id === 'string' &&
    /^[1-9][0-9]{0,31}$/.test(value.run_id) &&
    typeof value.artifact_id === 'string' &&
    /^[1-9][0-9]{0,31}$/.test(value.artifact_id)
  );
}

function isPriorSystemUpdateSizes(value: Record<string, unknown>): boolean {
  return (
    isPositiveUpdateByteCount(value.installed_bytes) &&
    isPositiveUpdateByteCount(value.prior_bytes) &&
    isUpdateByteDelta(value.installed_bytes, value.prior_bytes, value.delta_bytes)
  );
}

function isPositiveUpdateByteCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function isUpdateByteDelta(installed: unknown, prior: unknown, delta: unknown): boolean {
  return (
    typeof delta === 'number' &&
    Number.isSafeInteger(delta) &&
    typeof installed === 'number' &&
    typeof prior === 'number' &&
    installed - prior === delta
  );
}

function isPriorSystemUpdateNonAcceptance(value: Record<string, unknown>): boolean {
  return (
    typeof value.configuration_inspection === 'string' &&
    value.configuration_inspection.length <= 128 &&
    value.tests_invoked === false &&
    value.reinstallation === false &&
    value.runtime_accepted === false &&
    value.developer_unblocked === false
  );
}

function sourcePackageManifestBinding({
  access,
  bundle,
  source,
  priorVersion,
}: {
  readonly access: RebindSafeRepositoryAccess;
  readonly bundle: string;
  readonly source: RebindScopedSourceSnapshot;
  readonly priorVersion: string;
}): SourceCorrectionRequestView['new_source_manifest'] {
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

function isCurrentSourcePackageManifest(
  value: unknown,
  priorVersion: string,
): value is Record<string, unknown> & { readonly name: string; readonly version: string } {
  return (
    isPackageManifest(value) &&
    value.name === 'vida-agent' &&
    isCurrentOrLaterStableVersion(value.version, priorVersion)
  );
}

function sourceCorrectionCustody(
  db: RebindDatabase,
  workspace: string,
  store: RebindHostStateStore,
): SourceCorrectionCustodyView[] {
  const rows = checkedRows(db, 'agent_host_mastra_session_ledger', workspace),
    workRows = checkedRows(db, 'agent_host_state', workspace).filter(isCheckedWorkRow),
    custody: SourceCorrectionCustodyView[] = [];
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
}: SourceCorrectionRequestInput): SourceCorrectionRequestView {
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
  const initSchema = readRuntimePackageResourceBytes(
      runtimePackageAccess(),
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

function sourceCorrectionYamlState(current: string, baseline: string, target: string): 'baseline' | 'target' | null {
  return current === baseline ? 'baseline' : current === target ? 'target' : null;
}

function sealSourceCorrection(
  status: 'requested' | 'applied',
  operationId: string,
  request: SourceCorrectionRequestView,
  report?: SourceCorrectionReportView,
): SourceCorrectionArtifactView {
  const body: Omit<SourceCorrectionArtifactView, 'digest'> = {
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

function readSourceCorrectionArtifact(
  access: RebindSafeRepositoryAccess,
  relative: string,
): { readonly bytes: Buffer; readonly value: SourceCorrectionArtifactView } {
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
}: SourceCorrectionCurrentRequestInput): SourceCorrectionRequestView {
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
    stable = (value: SourceCorrectionRequestView) => {
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
}: SourceCorrectionWithdrawalInput) {
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
    schemaBytes = readRuntimePackageResourceBytes(
      runtimePackageAccess(),
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

function validateSourceCorrectionBridge({
  access,
  root,
  config,
  db,
  operationPath,
  operationBytes,
  operation,
  artifact,
}: SourceCorrectionBridgeInput) {
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

function originalSourceDeliveryOperation({
  access,
  operationPath,
  operation,
  request,
}: {
  readonly access: RebindSafeRepositoryAccess;
  readonly operationPath: string;
  readonly operation: SourceCorrectionOperationView;
  readonly request: SourceCorrectionRequestView;
}): { readonly bytes: Buffer; readonly value: SourceCorrectionOperationView } {
  const beforeimageBytes = readRetainedSourceCustody(access, request.source_beforeimages.path);
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
}: ClosedSourceDeliveryInput): ClosedSourceDeliveryTransition {
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

function sourceCorrectionWithCompletion(
  artifact: SourceCorrectionArtifactView,
  completion: unknown,
): SourceCorrectionArtifactView {
  if (artifact.completion) {
    requireRebind(
      canonicalJsonDigest(artifact.completion) === canonicalJsonDigest(completion),
      'source correction completion changed after capture',
    );
    return artifact;
  }
  const { digest: _digest, ...previousBody } = artifact;
  const body: Omit<SourceCorrectionArtifactView, 'digest'> = { ...previousBody, revision: 3, completion },
    completed = { ...body, digest: canonicalJsonDigest(body) };
  validateSourceCorrectionArtifact(completed);
  return completed;
}

function correctionRequestForInputs({
  values,
  access,
  root,
  config,
  db,
  operationPath,
  stored,
  frozenRequest,
}: CorrectionRequestForInputs): SourceCorrectionRequestView {
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

async function runSourceCorrectionRepair(args: readonly string[], { onPhase }: RebindRunOptions = {}) {
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
          const validate = (candidate: { readonly bytes: Buffer; readonly value: SourceCorrectionArtifactView }) =>
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

function fenceBinding(
  plan: SourceCorrectionOperationView['plan'],
  planDigest: string,
): import('../src/host-state.ts').MaintenanceFenceBinding {
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

function exactContext(
  access: RebindSafeRepositoryAccess,
  root: string,
  config: RebindAgentRuntimeConfig,
  operation: RebindOperationView,
  db: RebindDatabase,
  hostStore: RebindHostStateStore,
  maintenanceReceipt: import('../src/host-state.ts').MaintenanceFenceReceipt | undefined,
  operationPath: string,
  operationBytes: Uint8Array,
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
        readRuntimePackageResourceBytes(
          runtimePackageAccess(),
          'schemas/runtime-initialization.v1.schema.json',
          'initialization schema',
        ),
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

function readProjectInputTexts(
  access: RebindSafeRepositoryAccess,
  context: 'baseline' | 'current' | 'recovery',
): ProjectInputTexts {
  return {
    project: access.readText(PROJECT_CONFIGURATION_PATHS.project, `${context} project configuration`),
    agents: access.readText(PROJECT_CONFIGURATION_PATHS.agents, `${context} agents configuration`),
    flows: access.readText(PROJECT_CONFIGURATION_PATHS.flows, `${context} flows configuration`),
  };
}

function frozenProjectPlan(
  values: Record<string, string>,
  root: string,
  access: RebindSafeRepositoryAccess,
  db: RebindDatabase,
) {
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

  const sameWithoutRevision = (
    left: Record<string, unknown> & { revision: number },
    right: Record<string, unknown> & { revision: number },
  ) => {
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

  const inputSet = (texts: ProjectInputTexts, inputDigest: string, configDigest: string): ProjectInputSet => ({
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
    schema = readRuntimePackageResourceBytes(
      runtimePackageAccess(),
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

function isProjectInputSet(item: unknown): item is ProjectInputSet {
  return (
    isPlainRecord(item) &&
    item.schema === 'ProjectConfigurationInputSet/v1' &&
    typeof item.input_digest === 'string' &&
    typeof item.config_digest === 'string' &&
    (['project', 'agents', 'flows'] as const).every(
      (key) =>
        isPlainRecord(item[key]) &&
        typeof item[key].path === 'string' &&
        typeof item[key].text === 'string' &&
        typeof item[key].sha256 === 'string',
    )
  );
}

function isProjectRebindOperation(value: unknown): value is RebindProjectOperation {
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

function isProjectRebindRecoveryMode(mode: string): mode is ProjectRebindRecoveryMode {
  return mode === 'apply' || mode === 'resume' || mode === 'restore';
}

function projectSetTexts(set: ProjectInputSet): ProjectInputTexts {
  return { project: set.project.text, agents: set.agents.text, flows: set.flows.text };
}

function verifyProjectInputSet(set: ProjectInputSet, root: string) {
  const expected: readonly (readonly [keyof ProjectInputTexts, string])[] = [
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

function assertProjectRebindPlan(
  operation: RebindProjectOperation,
  baseline: ReturnType<typeof verifyProjectInputSet>,
  target: ReturnType<typeof verifyProjectInputSet>,
  receipt: import('../src/config/project-initialization-record.ts').ProjectInitializationReceipt,
) {
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
        readRuntimePackageResourceBytes(
          runtimePackageAccess(),
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

function projectCurrentInputs(access: RebindSafeRepositoryAccess): ProjectInputTexts {
  return readProjectInputTexts(access, 'current');
}

function projectInputState(access: RebindSafeRepositoryAccess, plan: RebindProjectOperation['plan']) {
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

function projectRebindObservation(
  access: RebindSafeRepositoryAccess,
  plan: RebindProjectOperation['plan'],
  baselineReceipt: import('../src/config/project-initialization-record.ts').ProjectInitializationReceipt,
) {
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

function prepareProjectRebind(
  access: RebindSafeRepositoryAccess,
  root: string,
  operation: RebindProjectOperation,
  operationPath: string,
  operationBytes: Uint8Array,
  db: RebindDatabase,
) {
  const plan = operation.plan;
  requireRebind(isProjectInputSet(plan.baseline_inputs), 'project baseline input envelope is invalid');
  requireRebind(isProjectInputSet(plan.target_inputs), 'project target input envelope is invalid');
  const baseline = verifyProjectInputSet(plan.baseline_inputs, root),
    target = verifyProjectInputSet(plan.target_inputs, root);
  const baselineReceipt = validateProjectInitializationReceipt(parseJsonUnknown(plan.baseline_receipt));
  assertProjectRebindPlan(operation, baseline, target, baselineReceipt);
  let currentOperationBytes = Buffer.from(operationBytes);
  const binding = fenceBinding(plan, operation.plan_digest);
  let observedMaintenance: ReturnType<RebindHostStateStore['readMaintenanceFence']> | undefined;
  const verifier: import('../src/host-state.ts').MaintenanceReleaseVerifier = {
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
    save: async (phase: ProjectRebindSavePhase, released = false) => {
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

async function acquireOrAbandonProjectRebind(
  context: ReturnType<typeof prepareProjectRebind>,
  mode: ProjectRebindRecoveryMode,
  onPhase: RebindRunOptions['onPhase'],
) {
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

async function resumeProjectRebind(
  context: ReturnType<typeof prepareProjectRebind>,
  onPhase: RebindRunOptions['onPhase'],
) {
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

async function runProjectRuntimeConfigRebind(
  access: RebindSafeRepositoryAccess,
  root: string,
  operation: RebindProjectOperation,
  operationPath: string,
  operationBytes: Uint8Array,
  db: RebindDatabase,
  mode: ProjectRebindRecoveryMode,
  onPhase: RebindRunOptions['onPhase'],
) {
  const context = prepareProjectRebind(access, root, operation, operationPath, operationBytes, db);
  const abandoned = await acquireOrAbandonProjectRebind(context, mode, onPhase);
  if (abandoned !== undefined) return abandoned;
  return resumeProjectRebind(context, onPhase);
}

async function runProjectRuntimeConfigRebindCommand(
  values: Record<string, string>,
  root: string,
  access: RebindSafeRepositoryAccess,
  mode: string,
  id: string,
  delivery: boolean,
  onPhase: RebindRunOptions['onPhase'],
) {
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
        access.ensureDirectory(path.posix.dirname(operationPath), 'project config rebind operation directory');
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

async function runRuntimeConfigRebind(args: readonly string[], { onPhase }: RebindRunOptions = {}) {
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

      const receiptFor = (
        fence: import('../src/host-state.ts').MaintenanceFence | null,
      ): import('../src/host-state.ts').MaintenanceFenceReceipt | undefined =>
        fence?.status === 'held' && canonicalJsonDigest(fence.binding) === canonicalJsonDigest(binding)
          ? { fence, token: plan.token }
          : undefined;

      const context = (fence: import('../src/host-state.ts').MaintenanceFence | null) =>
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
      const verifier: import('../src/host-state.ts').MaintenanceReleaseVerifier = {
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

      const save = async (phase: RebindOperationView['phase'], released: boolean = false) => {
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

export async function dispatchProjectAwareRuntimeConfigRebind(args: readonly string[], options: RebindRunOptions = {}) {
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
