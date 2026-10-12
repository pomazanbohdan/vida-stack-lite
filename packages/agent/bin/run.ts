import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { createHash, randomUUID } from 'node:crypto';
import {
  constants,
  closeSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  openSync,
  readFileSync,
  readSync,
  readdirSync,
  realpathSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { standaloneRuntime } from './bun.ts';
import {
  runRepeatedOptions,
  runScalarOptionFields,
  runRequiredFields,
  runChangingFields,
  runSpecialSelectors,
  runSpecialModeOptions,
  runTaskSourceOperations,
} from './run-cli-options.ts';

const isRunMain = Boolean(process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url);
// Informational help must complete before loading operation-only runtime modules.
if (isRunMain && process.argv[2] === '--help') {
  await printRunHelp(process.argv.slice(2));
  process.exit(0);
}

const {
  createCliHostStateStore,
  closeWorkspaceDatabaseWithAdmission,
  inspectCliHostWorkspaceDatabase,
  openCliHostStateDatabase,
  openCliWorkspaceDatabase,
} = await import('./workspace-database-cli.ts');
const { verifyForwardReviewSet } = await import('./forward-review-proof.ts');
const {
  parseDocumentationPolicyTransitionEnvelope,
  parseForwardClearCheckpoint,
  parseForwardDocumentationEvent,
  parseForwardPolicyIdentity,
  verifySelectedForwardPolicyProof,
  verifyCommittedParentPolicyProof,
} = await import('../src/documentation/transition-proof.ts');

const bundleRoot = standaloneRuntime()?.root ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isBunRuntime = typeof Bun !== 'undefined';
/** @param {Uint8Array} bytes @returns {string} */
const digest = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');
/** @param {unknown} value @returns {string} */
const controllerJson = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

/** @param {string} file @returns {Buffer} */
function regularFile(file: string): Buffer {
  let stat;
  try {
    stat = lstatSync(file);
  } catch {
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Cutover authority is missing.');
  }
  if (!stat.isFile() || stat.isSymbolicLink())
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Cutover authority is not a regular file.');
  return readFileSync(file);
}

/** @param {string} directory @returns {void} */
function checkedDirectory(directory: string): void {
  let stat;
  try {
    stat = lstatSync(directory);
  } catch {
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Cutover authority directory is missing.');
  }
  if (!stat.isDirectory() || stat.isSymbolicLink())
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Cutover authority directory is unsafe.');
}

/** @param {string} file @returns {boolean} */
function pathExists(file: string): boolean {
  try {
    lstatSync(file);
    return true;
  } catch (error) {
    if (nodeErrorCode(error) === 'ENOENT') return false;
    throw error;
  }
}

/** @param {unknown} error */
function nodeErrorCode(error: unknown): string | undefined {
  return error !== null && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
    ? error.code
    : undefined;
}

/** @param {string} file @param {string} schema @returns {Record<string, unknown>} */
function readControllerRecord(file: string, schema: string): Record<string, unknown> {
  const bytes = regularFile(file);
  /** @type {unknown} */
  let value: unknown;
  try {
    value = JSON.parse(bytes.toString('utf8'));
  } catch {
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Cutover authority is invalid.');
  }
  assertControllerRecord(bytes, value, schema);
  return value;
}

/** @param {Buffer} bytes @param {unknown} value @param {string} schema @returns {asserts value is Record<string, unknown>} */
function assertControllerRecord(
  bytes: Buffer,
  value: unknown,
  schema: string,
): asserts value is Record<string, unknown> {
  if (!isRecord(value) || value.schema !== schema || !bytes.equals(Buffer.from(controllerJson(value))))
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Cutover authority has an invalid shape or encoding.');
}

/** @param {string} left @param {string} right @returns {number} */
function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

type RunSessionSnapshot = import('../src/orchestration/mastra-session-bridge.ts').SessionBridgeSnapshot;
type RunSessionObservation = import('../src/orchestration/mastra-session-bridge.ts').SessionBridgeObservation;
type RunSourceSnapshot = import('../src/orchestration/scoped-source-snapshot.ts').ScopedSourceSnapshot;
type RunSessionBridge = {
  close: () => Promise<void>;
  snapshot: () => Promise<RunSessionSnapshot | null>;
  start: (sourceScope?: RunSourceSnapshot | null) => Promise<RunSessionSnapshot>;
  resume: (
    stepId: string,
    observations: readonly RunSessionObservation[],
    sourceScope?: RunSourceSnapshot | null,
  ) => Promise<RunSessionSnapshot>;
};

/** @param {RunSessionBridge} bridge @returns {Promise<void>} */
function closeRunSessionBridge(bridge: RunSessionBridge): Promise<void> {
  return bridge.close();
}

/** @param {string} text @returns {unknown} */
function parseJsonUnknown(text: string): unknown {
  /** @type {unknown} */
  const value: unknown = JSON.parse(text);
  return value;
}

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

type ActiveRuntimeSelectorRecord = Record<string, unknown> & {
  schema: string;
  generation: string;
  runtime: string;
  bundle_root: string;
  config_path: string;
  archive_manifest_sha256: string;
  plan_sha256: string;
  payload_manifest_sha256?: string;
  state_policy?: string;
  activation_decision_sha256?: string;
};

/** @param {unknown} value @returns {value is ActiveRuntimeSelectorRecord} */
function isActiveRuntimeSelectorRecord(value: unknown): value is ActiveRuntimeSelectorRecord {
  if (!isRecord(value)) return false;
  const base = [
    'schema',
    'generation',
    'runtime',
    'bundle_root',
    'config_path',
    'archive_manifest_sha256',
    'plan_sha256',
  ];
  const keys =
    value.payload_manifest_sha256 === undefined
      ? base
      : [...base, 'payload_manifest_sha256', 'state_policy', 'activation_decision_sha256'];
  return exactStringFields(value, keys, keys);
}

/** @param {Record<string, unknown>} value @returns {asserts value is ActiveRuntimeSelectorRecord} */
function requireActiveRuntimeSelectorRecord(
  value: Record<string, unknown>,
): asserts value is ActiveRuntimeSelectorRecord {
  if (!isActiveRuntimeSelectorRecord(value)) fail('GAP-VIDA-RUN-SELECTOR-001', 'Active selector fields are invalid.');
}

/** @param {unknown} value @param {string} key @returns {unknown} */
function recordField(value: unknown, key: string): unknown {
  if (!isRecord(value)) fail('GAP-VIDA-RUN-SELECTOR-001', 'Cutover authority is invalid.');
  return value[key];
}

/** @param {unknown} value @returns {value is unknown[]} */
function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/** @template {string} K @param {unknown} value @param {readonly K[]} keys @returns {value is Record<K, unknown>} */
function exactKeys<K extends string>(value: unknown, keys: readonly K[]): value is Record<K, unknown> {
  return isRecord(value) && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
}

/**
 * @template {string} K
 * @template {K} S
 * @param {unknown} value
 * @param {readonly K[]} keys
 * @param {readonly S[]} stringFields
 * @returns {value is Record<K, unknown> & Record<S, string>}
 */
function exactStringFields<K extends string, S extends K>(
  value: unknown,
  keys: readonly K[],
  stringFields: readonly S[],
): value is Record<K, unknown> & Record<S, string> {
  return exactKeys(value, keys) && stringFields.every((key) => typeof value[key] === 'string');
}

/** @param {unknown} value @returns {value is string} */
function isPreparedRelativePath(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    !value.includes('\\') &&
    !value.startsWith('/') &&
    value.split('/').every((part) => part !== '' && part !== '.' && part !== '..' && !part.includes(':'))
  );
}

/** @param {unknown} value @returns {value is string} */
function isPreparedDigest(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
}

/** @param {unknown} value @returns {value is number} */
function isPreparedSize(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

/** @param {unknown} entryPath @param {unknown} digestValue @param {unknown} size @returns {boolean} */
function hasPreparedPayloadCore(entryPath: unknown, digestValue: unknown, size: unknown): boolean {
  return isPreparedRelativePath(entryPath) && isPreparedDigest(digestValue) && isPreparedSize(size);
}

type EvidenceKindEntry = Record<string, unknown> & { kind: string };

/** @param {unknown} value @returns {value is EvidenceKindEntry} */
function isEvidenceKindEntry(value: unknown): value is EvidenceKindEntry {
  return isRecord(value) && typeof value.kind === 'string';
}

/** @param {unknown} value @returns {value is EvidenceKindEntry[]} */
function isEvidenceKindArray(value: unknown): value is EvidenceKindEntry[] {
  if (!isUnknownArray(value)) return false;
  for (const entry of value) if (!isEvidenceKindEntry(entry)) return false;
  return true;
}

/** @param {unknown} value @param {readonly string[]} expected @returns {value is EvidenceKindEntry[]} */
function hasEvidenceKinds(value: unknown, expected: readonly string[]): value is EvidenceKindEntry[] {
  if (!isEvidenceKindArray(value) || value.length !== expected.length) return false;
  return (
    value
      .map((entry) => entry.kind)
      .sort()
      .join(',') === [...expected].sort().join(',')
  );
}

/** @param {Record<string, unknown>} parentLock @param {Record<string, unknown>} parent @returns {boolean} */
function isRepairParentLockBound(parentLock: Record<string, unknown>, parent: Record<string, unknown>): boolean {
  return (
    isRecord(parentLock.archive_manifest) &&
    parentLock.archive_manifest.manifest_sha256 === parent.archive_manifest_sha256 &&
    isRecord(parentLock.plan) &&
    parentLock.plan.schema === 'VidaPreparedInstallPlan/v1' &&
    parentLock.plan.plan_sha256 === parent.plan_sha256 &&
    parentLock.plan.payload_manifest_sha256 === parent.payload_manifest_sha256 &&
    parentLock.plan.archive_manifest_sha256 === parent.archive_manifest_sha256
  );
}

/** @param {string} entry @returns {boolean} */
function isNonCanonicalAbsolutePath(entry: string): boolean {
  return !path.isAbsolute(entry) || path.resolve(entry) !== entry;
}

/** @template {{issue_id: unknown, observation: unknown}} Item @param {Item} item @returns {boolean} */
function isIssuedWithoutObservation<Item extends { issue_id: unknown; observation: unknown }>(item: Item): boolean {
  return item.issue_id !== null && item.observation === null;
}

/** @template {{observation: unknown}} Item @param {Item} item @returns {unknown[]} */
function observationList<Item extends { observation: unknown }>(item: Item): unknown[] {
  return item.observation ? [item.observation] : [];
}

/** @template {{consumes: readonly string[]}} Stage @param {Stage | undefined} stage @returns {boolean} */
function isPacketOnlyDevelopmentStage<Stage extends { consumes: readonly string[] }>(
  stage: Stage | undefined,
): boolean {
  return Boolean(
    stage?.consumes.includes('DevelopmentTaskPacket/v1') && !stage.consumes.includes('ImplementationResult/v1'),
  );
}

/** @template {{issue_id: unknown, observation: unknown, host_reservation?: unknown}} Item @param {Item} item @returns {boolean} */
function isResearchPreparationUnsafe<
  Item extends { issue_id: unknown; observation: unknown; host_reservation?: unknown },
>(item: Item): boolean {
  return Boolean(item.issue_id === null || item.observation || item.host_reservation);
}

/** @template {{produces: readonly string[]}} Stage @param {Stage | undefined} stage @returns {boolean} */
function isResearchOutputStage<Stage extends { produces: readonly string[] }>(stage: Stage | undefined): boolean {
  return Boolean(stage?.produces.includes('ResearchResult/v1') || stage?.produces.includes('ResearchSynthesis/v1'));
}

/** @template {{id: string, produces: readonly string[]}} Stage @param {Stage} stage @param {string} stageId @returns {boolean} */
function isResearchOutputForStage<Stage extends { id: string; produces: readonly string[] }>(
  stage: Stage,
  stageId: string,
): boolean {
  return stage.id === stageId && isResearchOutputStage(stage);
}

/** @template {{request: {action_id: string}}} Item @param {Item} item @param {string} actionId @param {unknown} observation @returns {Item | (Item & {observation: unknown})} */
function addObservationForAction<Item extends { request: { action_id: string } }>(
  item: Item,
  actionId: string,
  observation: unknown,
): Item | (Item & { observation: unknown }) {
  return item.request.action_id === actionId ? { ...item, observation } : item;
}

/** @template {{action_id: string, status: string}} Item @param {Item} item @returns {Item} */
function markUncertainResearchStatus<Item extends { action_id: string; status: string }>(item: Item): Item {
  return {
    ...item,
    status: item.status === 'research_preparation_incomplete' ? 'issued_outcome_uncertain' : item.status,
  };
}

/** @template {{issue_id: unknown, request: {action_id: string}}} Item @param {Item} item @param {boolean} issuedNow @param {(item: Item) => Record<string, unknown>} describe @returns {Record<string, unknown>} */
function describeUncertainIssuedAction<Item extends { issue_id: unknown; request: { action_id: string } }>(
  item: Item,
  issuedNow: boolean,
  describe: (item: Item) => Record<string, unknown>,
): Record<string, unknown> {
  if (issuedNow) return { ...describe(item), prior_issue_outcome: 'unknown' };
  return {
    request: item.request,
    issue_id: item.issue_id,
    logical_action_id: item.request.action_id,
    prior_issue_outcome: 'unknown',
  };
}

/** @template {{issue_id: unknown, kind: string}} Entry @param {Entry} entry @param {string} kind @returns {boolean} */
function isUnissuedKind<Entry extends { issue_id: unknown; kind: string }>(entry: Entry, kind: string): boolean {
  return !entry.issue_id && entry.kind === kind;
}

/**
 * @template {{request: import('../src/orchestration/mastra-session-bridge-contract.ts').SessionBridgeRequest, issue_id: string | null, host_reservation?: {receipt: {attempt: {attempt_id: string}}} | null, research_activation?: {use: unknown} | null}} Item
 * @param {Item} item
 * @param {Map<string, unknown>} researchBindings
 * @param {readonly {id: string, kind: string}[]} stages
 * @returns {RunIssuedAction}
 */
function describeIssuedAction<
  Item extends {
    request: import('../src/orchestration/mastra-session-bridge-contract.ts').SessionBridgeRequest;
    issue_id: string | null;
    host_reservation?: { receipt: { attempt: { attempt_id: string } } } | null;
    research_activation?: { use: unknown } | null;
  },
>(
  item: Item,
  researchBindings: Map<string, unknown>,
  stages: readonly { id: string; kind: string }[],
): RunIssuedAction {
  const action = {
    request: item.request,
    issue_id: item.issue_id,
    host_attempt_id: item.host_reservation?.receipt.attempt.attempt_id,
  };
  const activation = item.research_activation;
  if (!activation) return action;
  const bindings = researchBindings.get(item.request.action_id);
  const researchStage = stages.find((stage) => stage.id === item.request.stage_id)?.kind === 'research';
  return {
    ...action,
    instruction_activation: activation.use,
    instruction_bindings: bindings,
    ...(researchStage
      ? { research_instruction_activation: activation.use, research_instruction_bindings: bindings }
      : {}),
  };
}

type PreparedPayloadEntry = {
  path: string;
  sha256: string;
  size: number;
  source_sha256?: string;
  source_path?: string;
};

type ForwardFileChange = {
  path: string;
  old_sha256: string | null;
  new_sha256: string;
  old_size: number | null;
  new_size: number;
};
type ForwardUpdatePlan = Record<string, unknown> & {
  schema: string;
  operation_id: string;
  operator: string;
  parent_generation: string;
  parent_selector_sha256: string;
  parent_cutoff_sha256: string;
  first_admitted_work_attempt: string | null;
  old_payload_manifest_sha256: string;
  new_payload_manifest_sha256: string;
  changed: ForwardFileChange[];
  preserved_mutable_outputs: unknown[];
};
type ForwardUpdateAuthorization = Record<string, unknown> & {
  schema: string;
  operation_id: string;
  operator: string;
  outcome: string;
  pointer: string;
  plan_sha256: string;
  evidence: unknown;
};
type CutoverEvidence = { actor: string; path: string; pointer: string; sha256: string; status: string };

/** @param {unknown} value @returns {value is CutoverEvidence} */
function isCutoverEvidence(value: unknown): value is CutoverEvidence {
  return (
    exactKeys(value, ['actor', 'path', 'pointer', 'sha256', 'status']) &&
    typeof value.actor === 'string' &&
    typeof value.path === 'string' &&
    typeof value.pointer === 'string' &&
    typeof value.sha256 === 'string' &&
    typeof value.status === 'string'
  );
}

/** @param {unknown} value @returns {value is ForwardFileChange} */
function isForwardFileChange(value: unknown): value is ForwardFileChange {
  return (
    isRecord(value) &&
    typeof value.path === 'string' &&
    (typeof value.old_sha256 === 'string' || value.old_sha256 === null) &&
    typeof value.new_sha256 === 'string' &&
    (typeof value.old_size === 'number' || value.old_size === null) &&
    typeof value.new_size === 'number'
  );
}

/** @param {unknown} value @returns {value is ForwardUpdatePlan} */
function isForwardUpdatePlan(value: unknown): value is ForwardUpdatePlan {
  return isForwardPlanHeader(value) && hasForwardPlanCollections(value);
}

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isForwardPlanHeader(value: unknown): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    hasForwardPlanIdentity(value) &&
    hasForwardPlanDigests(value) &&
    (typeof value.first_admitted_work_attempt === 'string' || value.first_admitted_work_attempt === null)
  );
}

/** @param {Record<string, unknown>} value @returns {boolean} */
function hasForwardPlanIdentity(value: Record<string, unknown>): boolean {
  return (
    typeof value.schema === 'string' && typeof value.operation_id === 'string' && typeof value.operator === 'string'
  );
}

/** @param {Record<string, unknown>} value @returns {boolean} */
function hasForwardPlanDigests(value: Record<string, unknown>): boolean {
  return (
    typeof value.parent_generation === 'string' &&
    typeof value.parent_selector_sha256 === 'string' &&
    typeof value.parent_cutoff_sha256 === 'string' &&
    typeof value.old_payload_manifest_sha256 === 'string' &&
    typeof value.new_payload_manifest_sha256 === 'string'
  );
}

/** @param {Record<string, unknown>} value @returns {boolean} */
function hasForwardPlanCollections(value: Record<string, unknown>): boolean {
  return (
    Array.isArray(value.changed) &&
    value.changed.every(isForwardFileChange) &&
    Array.isArray(value.preserved_mutable_outputs)
  );
}

/** @param {unknown} value @returns {value is ForwardUpdateAuthorization} */
function isForwardUpdateAuthorization(value: unknown): value is ForwardUpdateAuthorization {
  return (
    isRecord(value) &&
    typeof value.schema === 'string' &&
    typeof value.operation_id === 'string' &&
    typeof value.operator === 'string' &&
    typeof value.outcome === 'string' &&
    typeof value.pointer === 'string' &&
    typeof value.plan_sha256 === 'string' &&
    Object.hasOwn(value, 'evidence')
  );
}

/** @param {unknown} value @returns {asserts value is ForwardUpdatePlan} */
function requireForwardUpdatePlan(value: unknown): asserts value is ForwardUpdatePlan {
  if (!isForwardUpdatePlan(value)) fail('GAP-VIDA-RUN-SELECTOR-001', 'Forward update records are invalid.');
}

/** @param {unknown} value @returns {asserts value is ForwardUpdateAuthorization} */
function requireForwardUpdateAuthorization(value: unknown): asserts value is ForwardUpdateAuthorization {
  if (!isForwardUpdateAuthorization(value)) fail('GAP-VIDA-RUN-SELECTOR-001', 'Forward update records are invalid.');
}

/** @param {unknown} value @returns {asserts value is EvidenceKindEntry[]} */
function requireForwardReviewEvidence(value: unknown): asserts value is EvidenceKindEntry[] {
  if (!hasEvidenceKinds(value, ['assurance', 'correctness', 'security']))
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Forward review bindings are invalid.');
}

/** @param {unknown} value @returns {asserts value is ActiveRuntimeSelectorRecord} */
function requireForwardParentSelector(value: unknown): asserts value is ActiveRuntimeSelectorRecord {
  if (!isActiveRuntimeSelectorRecord(value)) fail('GAP-VIDA-RUN-SELECTOR-001', 'Forward parent selector is invalid.');
}

/** @param {string | undefined} leaf @returns {string} */
function requireForwardFileLeaf(leaf: string | undefined): string {
  if (!leaf) fail('GAP-VIDA-RUN-SELECTOR-001', 'Installed forward bundle path is invalid.');
  return leaf;
}

/** @param {unknown} value @returns {Record<string, unknown>} */
function requireSelectorRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) fail('GAP-VIDA-RUN-SELECTOR-001', 'Configured mutable output record is invalid.');
  return value;
}

/** @param {unknown} value @returns {PreparedPayloadEntry} */
function parsePreparedPayloadEntry(value: unknown): PreparedPayloadEntry {
  if (!isPreparedPayloadEntry(value)) fail('GAP-VIDA-RUN-SELECTOR-001', 'Repair payload entry is invalid.');
  if (typeof value.source_path === 'string' && typeof value.source_sha256 === 'string')
    return {
      path: value.path,
      sha256: value.sha256,
      size: value.size,
      source_sha256: value.source_sha256,
      source_path: value.source_path,
    };
  if (typeof value.source_sha256 === 'string')
    return { path: value.path, sha256: value.sha256, size: value.size, source_sha256: value.source_sha256 };
  return { path: value.path, sha256: value.sha256, size: value.size };
}

/** @param {unknown} value @returns {value is PreparedPayloadEntry} */
function isPreparedPayloadEntry(value: unknown): value is PreparedPayloadEntry {
  return isDirectPreparedEntry(value) || isSameBytePreparedEntry(value) || isMappedPreparedEntry(value);
}

/** @param {unknown} value @returns {value is Extract<PreparedPayloadEntry, {source_path?: never, source_sha256?: never}>} */
function isDirectPreparedEntry(
  value: unknown,
): value is Extract<PreparedPayloadEntry, { source_path?: never; source_sha256?: never }> {
  return (
    isRecord(value) &&
    exactKeys(value, ['path', 'sha256', 'size']) &&
    hasPreparedPayloadCore(value.path, value.sha256, value.size)
  );
}

/** @param {unknown} value @returns {value is Extract<PreparedPayloadEntry, {source_sha256: string, source_path?: never}>} */
function isSameBytePreparedEntry(
  value: unknown,
): value is Extract<PreparedPayloadEntry, { source_sha256: string; source_path?: never }> {
  return (
    isRecord(value) &&
    exactKeys(value, ['path', 'sha256', 'size', 'source_sha256']) &&
    hasPreparedPayloadCore(value.path, value.sha256, value.size) &&
    isPreparedDigest(value.source_sha256) &&
    value.source_sha256 === value.sha256
  );
}

/** @param {unknown} value @returns {value is Extract<PreparedPayloadEntry, {source_path: string}>} */
function isMappedPreparedEntry(value: unknown): value is Extract<PreparedPayloadEntry, { source_path: string }> {
  return (
    isRecord(value) &&
    exactKeys(value, ['path', 'sha256', 'size', 'source_path', 'source_sha256']) &&
    hasPreparedPayloadCore(value.path, value.sha256, value.size) &&
    isPreparedDigest(value.source_sha256) &&
    isPreparedRelativePath(value.source_path)
  );
}

/**
 * @param {string} file
 * @param {string} expectedSha
 * @returns {{manifest: Record<string, unknown>, files: Map<string, PreparedPayloadEntry>}}
 */
function readBoundManifest(
  file: string,
  expectedSha: string,
): { manifest: Record<string, unknown>; files: Map<string, PreparedPayloadEntry> } {
  const raw = regularFile(file);
  if (digest(raw) !== expectedSha) fail('GAP-VIDA-RUN-SELECTOR-001', 'Repair payload manifest drift.');
  /** @type {unknown} */
  let manifest: unknown;
  try {
    manifest = JSON.parse(raw.toString('utf8'));
  } catch {
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Repair payload manifest is invalid.');
  }
  if (
    !isRecord(manifest) ||
    manifest.schema !== 'VidaAgentPreparedPayload/v1' ||
    !isUnknownArray(manifest.files) ||
    !isUnknownArray(manifest.unresolved_integration_paths) ||
    manifest.unresolved_integration_paths.length
  )
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Repair payload manifest is invalid.');
  /** @type {Map<string, PreparedPayloadEntry>} */
  const files: Map<string, PreparedPayloadEntry> = new Map();
  for (const rawEntry of manifest.files) {
    const entry = parsePreparedPayloadEntry(rawEntry);
    if (files.has(entry.path)) fail('GAP-VIDA-RUN-SELECTOR-001', 'Repair payload entry is invalid.');
    files.set(entry.path, entry);
  }
  return { manifest, files };
}
/** @param {string} projectRoot @param {ReadonlySet<string>} expected @returns {void} */
function installedBundleInventory(projectRoot: string, expected: ReadonlySet<string>): void {
  const root = path.join(projectRoot, 'vida-agent');
  checkedDirectory(root);
  /** @type {Set<string>} */
  const observed: Set<string> = new Set();
  /** @param {string} directory @param {string} prefix @returns {void} */
  function walk(directory: string, prefix: string): void {
    for (const name of readdirSync(directory)) {
      if (!prefix && name === 'node_modules') continue;
      const relative = prefix ? `${prefix}/${name}` : name;
      const absolute = path.join(directory, name);
      const info = lstatSync(absolute);
      if (info.isSymbolicLink()) fail('GAP-VIDA-RUN-SELECTOR-001', 'Installed bundle symlink is unsafe.');
      if (info.isDirectory()) walk(absolute, relative);
      else if (info.isFile()) observed.add(`vida-agent/${relative}`);
      else fail('GAP-VIDA-RUN-SELECTOR-001', 'Installed bundle node is unsafe.');
    }
  }
  walk(root, '');
  if (observed.size !== expected.size || [...observed].some((item) => !expected.has(item)))
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Installed bundle inventory differs from forward manifest.');
}

/**
 * @param {string} projectRoot
 * @param {ActiveRuntimeSelectorRecord} selector
 * @param {string} selectorSha
 * @param {string} generationRoot
 * @param {boolean} [skipInstalledBundle]
 * @returns {void}
 */
export function repairAuthority(
  projectRoot: string,
  selector: ActiveRuntimeSelectorRecord,
  selectorSha: string,
  generationRoot: string,
  skipInstalledBundle: boolean = false,
): void {
  const hash = /^[a-f0-9]{64}$/;
  const plan = readControllerRecord(
    path.join(generationRoot, 'repair-plan.v1.json'),
    'VidaActiveLauncherRepairPlan/v1',
  );
  const authorization = readControllerRecord(
    path.join(generationRoot, 'repair-authorization.v1.json'),
    'VidaActiveLauncherRepairAuthorization/v1',
  );
  const decision = readControllerRecord(
    path.join(generationRoot, 'repair-decision.v1.json'),
    'VidaActiveLauncherRepairDecision/v1',
  );
  const commit = readControllerRecord(
    path.join(generationRoot, 'repair-selector-commit.v1.json'),
    'VidaActiveLauncherRepairSelectorCommit/v1',
  );
  if (
    !exactStringFields(
      plan,
      [
        'schema',
        'repair_id',
        'operator',
        'parent_cutover_id',
        'parent_selector_sha256',
        'parent_payload_manifest_sha256',
        'parent_launcher_sha256',
        'successor_payload_manifest_sha256',
        'successor_launcher_sha256',
        'archive_manifest_sha256',
        'authorization_sha256',
      ],
      [
        'schema',
        'repair_id',
        'operator',
        'parent_cutover_id',
        'parent_selector_sha256',
        'parent_payload_manifest_sha256',
        'parent_launcher_sha256',
        'successor_payload_manifest_sha256',
        'successor_launcher_sha256',
        'archive_manifest_sha256',
        'authorization_sha256',
      ],
    ) ||
    !exactStringFields(
      authorization,
      [
        'schema',
        'repair_id',
        'operator',
        'outcome',
        'pointer',
        'old_generation',
        'old_selector_sha256',
        'old_payload_manifest_sha256',
        'old_launcher_sha256',
        'new_payload_manifest_sha256',
        'new_launcher_sha256',
        'evidence',
      ],
      ['schema', 'repair_id', 'operator', 'outcome', 'pointer', 'evidence'],
    ) ||
    !exactStringFields(
      decision,
      ['schema', 'repair_id', 'operator', 'plan_sha256', 'authorization_sha256', 'selector_intent_sha256', 'outcome'],
      ['schema', 'repair_id', 'operator', 'plan_sha256', 'authorization_sha256', 'selector_intent_sha256', 'outcome'],
    ) ||
    !exactStringFields(
      commit,
      ['schema', 'repair_id', 'plan_sha256', 'decision_sha256', 'selector_sha256'],
      ['schema', 'repair_id', 'plan_sha256', 'decision_sha256', 'selector_sha256'],
    ) ||
    plan.repair_id !== selector.generation ||
    !/^[a-z0-9][a-z0-9._-]{0,79}$/.test(plan.parent_cutover_id) ||
    !/^[a-z0-9][a-z0-9._-]{0,79}$/.test(plan.operator) ||
    decision.repair_id !== selector.generation ||
    commit.repair_id !== selector.generation ||
    authorization.repair_id !== selector.generation ||
    plan.operator !== authorization.operator ||
    plan.operator !== decision.operator ||
    !hash.test(plan.parent_selector_sha256) ||
    !hash.test(plan.parent_payload_manifest_sha256) ||
    !hash.test(plan.parent_launcher_sha256) ||
    !hash.test(plan.successor_launcher_sha256) ||
    !hash.test(plan.authorization_sha256) ||
    selector.plan_sha256 !== digest(Buffer.from(controllerJson(plan))) ||
    plan.archive_manifest_sha256 !== selector.archive_manifest_sha256 ||
    plan.successor_payload_manifest_sha256 !== selector.payload_manifest_sha256 ||
    plan.authorization_sha256 !== digest(Buffer.from(controllerJson(authorization))) ||
    authorization.outcome !== 'approved' ||
    decision.outcome !== 'approved' ||
    !authorization.pointer?.trim() ||
    authorization.old_generation !== plan.parent_cutover_id ||
    authorization.old_selector_sha256 !== plan.parent_selector_sha256 ||
    authorization.old_payload_manifest_sha256 !== plan.parent_payload_manifest_sha256 ||
    authorization.old_launcher_sha256 !== plan.parent_launcher_sha256 ||
    authorization.new_payload_manifest_sha256 !== plan.successor_payload_manifest_sha256 ||
    authorization.new_launcher_sha256 !== plan.successor_launcher_sha256 ||
    decision.plan_sha256 !== selector.plan_sha256 ||
    decision.authorization_sha256 !== plan.authorization_sha256 ||
    decision.selector_intent_sha256 !==
      digest(
        Buffer.from(controllerJson((({ activation_decision_sha256: _ignored, ...intent }) => intent)(selector))),
      ) ||
    selector.activation_decision_sha256 !== digest(Buffer.from(controllerJson(decision))) ||
    commit.plan_sha256 !== selector.plan_sha256 ||
    commit.decision_sha256 !== selector.activation_decision_sha256 ||
    commit.selector_sha256 !== selectorSha
  )
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Repair authority is invalid.');
  if (
    !isEvidenceKindArray(authorization.evidence) ||
    authorization.evidence.length !== 3 ||
    authorization.evidence
      .map((entry) => entry.kind)
      .sort()
      .join(',') !== 'assurance,correctness,security'
  )
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Repair review bindings are invalid.');
  const evidencePaths = new Set();
  for (const entry of authorization.evidence) {
    if (
      !exactStringFields(entry, ['kind', 'path', 'sha256', 'status'], ['kind', 'path', 'sha256', 'status']) ||
      entry.status !== 'passed' ||
      !hash.test(entry.sha256) ||
      typeof entry.path !== 'string' ||
      !entry.path.startsWith(`.agent/cutover/${selector.generation}/`) ||
      entry.path.includes('\\') ||
      entry.path.split('/').some((part) => !part || part === '.' || part === '..' || part.includes(':')) ||
      evidencePaths.has(entry.path) ||
      digest(regularFile(path.join(projectRoot, ...entry.path.split('/')))) !== entry.sha256
    )
      fail('GAP-VIDA-RUN-SELECTOR-001', 'Repair review bindings are invalid.');
    evidencePaths.add(entry.path);
  }
  const parent = readControllerRecord(path.join(generationRoot, 'parent-selector.v1.json'), 'ActiveRuntimeSelector/v1');
  const parentRoot = path.join(projectRoot, '.agent', 'cutover', plan.parent_cutover_id);
  checkedDirectory(parentRoot);
  const parentCommit = readControllerRecord(
    path.join(parentRoot, 'selector-commit.json'),
    'VidaPreparedSelectorCommit/v1',
  );
  const parentDecision = readControllerRecord(
    path.join(parentRoot, 'activation-decision.v1.json'),
    'VidaCutoverActivationDecision/v1',
  );
  const parentJournal = readControllerRecord(
    path.join(parentRoot, 'prepared-install.json'),
    'VidaPreparedInstallJournal/v1',
  );
  const parentReady = readControllerRecord(path.join(parentRoot, 'install-ready.json'), 'VidaPreparedInstallReady/v1');
  const parentLock = readControllerRecord(
    path.join(parentRoot, 'maintenance-lock.released.v1.json'),
    'VidaCutoverMaintenanceLock/v1',
  );
  const parentRelease = readControllerRecord(
    path.join(parentRoot, 'maintenance-release.v1.json'),
    'VidaCutoverMaintenanceRelease/v1',
  );
  const parentCutoff = readControllerRecord(
    path.join(parentRoot, 'cutoff-witness.json'),
    'VidaNewWorkCutoffWitness/v1',
  );
  const parentSha = digest(Buffer.from(controllerJson(parent)));
  const { activation_decision_sha256: _parentDecisionHash, ...parentIntent } = parent;
  const parentEvidenceKinds = ['parity', 'security', 'assurance', 'rollback', 'dev', 'staged_runtime'];
  if (
    !exactStringFields(
      parent,
      [
        'schema',
        'generation',
        'runtime',
        'bundle_root',
        'config_path',
        'archive_manifest_sha256',
        'plan_sha256',
        'payload_manifest_sha256',
        'state_policy',
        'activation_decision_sha256',
      ],
      [
        'schema',
        'generation',
        'runtime',
        'bundle_root',
        'config_path',
        'archive_manifest_sha256',
        'plan_sha256',
        'payload_manifest_sha256',
        'state_policy',
        'activation_decision_sha256',
      ],
    ) ||
    !exactStringFields(
      parentCommit,
      ['schema', 'cutover_id', 'plan_sha256', 'activation_decision_sha256', 'selector_sha256'],
      ['schema', 'cutover_id', 'plan_sha256', 'activation_decision_sha256', 'selector_sha256'],
    ) ||
    !exactStringFields(
      parentDecision,
      [
        'schema',
        'actor',
        'cutover_id',
        'evidence',
        'outcome',
        'payload_manifest_sha256',
        'plan_sha256',
        'pointer',
        'selector_intent_sha256',
      ],
      [
        'schema',
        'actor',
        'cutover_id',
        'outcome',
        'payload_manifest_sha256',
        'plan_sha256',
        'pointer',
        'selector_intent_sha256',
        'evidence',
      ],
    ) ||
    !exactStringFields(
      parentJournal,
      [
        'schema',
        'cutover_id',
        'plan_sha256',
        'archive_manifest_sha256',
        'payload_manifest_sha256',
        'archive_scope',
        'state_policy',
        'status',
      ],
      [
        'schema',
        'cutover_id',
        'plan_sha256',
        'archive_manifest_sha256',
        'payload_manifest_sha256',
        'archive_scope',
        'state_policy',
        'status',
      ],
    ) ||
    !exactStringFields(
      parentReady,
      ['schema', 'cutover_id', 'plan_sha256', 'archive_scope', 'state_policy', 'status'],
      ['schema', 'cutover_id', 'plan_sha256', 'archive_scope', 'state_policy', 'status'],
    ) ||
    !exactStringFields(
      parentLock,
      [
        'schema',
        'cutover_id',
        'operator',
        'attestation',
        'archive_manifest_sha256',
        'plan_sha256',
        'payload_manifest_sha256',
        'expected_file_count',
        'archive_manifest',
        'plan',
        'state_policy',
        'activation_decision_path',
        'activation_decision_sha256',
      ],
      [
        'schema',
        'cutover_id',
        'operator',
        'attestation',
        'archive_manifest_sha256',
        'plan_sha256',
        'payload_manifest_sha256',
        'activation_decision_path',
        'activation_decision_sha256',
        'state_policy',
      ],
    ) ||
    !exactStringFields(
      parentRelease,
      ['schema', 'cutover_id', 'operator', 'lock_sha256', 'status'],
      ['schema', 'cutover_id', 'operator', 'lock_sha256', 'status'],
    ) ||
    !exactStringFields(
      parentCutoff,
      ['schema', 'generation', 'selector_sha256', 'first_admitted_work_attempt'],
      ['schema', 'generation', 'selector_sha256'],
    ) ||
    !exactKeys(parentDecision.evidence, parentEvidenceKinds) ||
    parentSha !== plan.parent_selector_sha256 ||
    parent.generation !== plan.parent_cutover_id ||
    parent.runtime !== 'vida-agent' ||
    parent.bundle_root !== 'vida-agent' ||
    parent.config_path !== 'agent-runtime.config.v1.yaml' ||
    parent.archive_manifest_sha256 !== selector.archive_manifest_sha256 ||
    parent.payload_manifest_sha256 !== plan.parent_payload_manifest_sha256 ||
    parentCommit.cutover_id !== parent.generation ||
    parentCommit.plan_sha256 !== parent.plan_sha256 ||
    parentCommit.selector_sha256 !== parentSha ||
    parentCommit.activation_decision_sha256 !== parent.activation_decision_sha256 ||
    digest(Buffer.from(controllerJson(parentDecision))) !== parent.activation_decision_sha256 ||
    parentDecision.outcome !== 'approved' ||
    parentDecision.cutover_id !== parent.generation ||
    parentDecision.plan_sha256 !== parent.plan_sha256 ||
    parentDecision.payload_manifest_sha256 !== parent.payload_manifest_sha256 ||
    parentDecision.selector_intent_sha256 !== digest(Buffer.from(controllerJson(parentIntent))) ||
    parentJournal.cutover_id !== parent.generation ||
    parentJournal.plan_sha256 !== parent.plan_sha256 ||
    parentJournal.payload_manifest_sha256 !== parent.payload_manifest_sha256 ||
    parentJournal.archive_manifest_sha256 !== parent.archive_manifest_sha256 ||
    parentJournal.state_policy !== parent.state_policy ||
    parentJournal.status !== 'installing' ||
    parentReady.cutover_id !== parent.generation ||
    parentReady.plan_sha256 !== parent.plan_sha256 ||
    parentReady.state_policy !== parent.state_policy ||
    parentReady.status !== 'ready_for_selector' ||
    parentLock.cutover_id !== parent.generation ||
    parentLock.plan_sha256 !== parent.plan_sha256 ||
    parentLock.archive_manifest_sha256 !== parent.archive_manifest_sha256 ||
    parentLock.payload_manifest_sha256 !== parent.payload_manifest_sha256 ||
    parentLock.attestation !== 'old_runtime_quiesced' ||
    parentLock.state_policy !== parent.state_policy ||
    !isRepairParentLockBound(parentLock, parent) ||
    parentLock.activation_decision_path !== `.agent/cutover/${parent.generation}/activation-decision.v1.json` ||
    parentLock.activation_decision_sha256 !== parent.activation_decision_sha256 ||
    parentRelease.cutover_id !== parent.generation ||
    parentRelease.operator !== parentLock.operator ||
    parentRelease.lock_sha256 !== digest(Buffer.from(controllerJson(parentLock))) ||
    parentRelease.status !== 'released_by_explicit_operator_action' ||
    parentCutoff.generation !== parent.generation ||
    parentCutoff.selector_sha256 !== parentSha ||
    parentCutoff.first_admitted_work_attempt !== null ||
    pathExists(path.join(parentRoot, 'maintenance-lock.v1.json')) ||
    pathExists(path.join(parentRoot, 'cutoff-witness.lock'))
  )
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Repair parent authority is invalid.');
  for (const kind of parentEvidenceKinds) {
    const item = recordField(parentDecision.evidence, kind);
    if (
      !exactStringFields(
        item,
        ['actor', 'path', 'pointer', 'sha256', 'status'],
        ['actor', 'path', 'pointer', 'sha256', 'status'],
      ) ||
      item.status !== 'passed' ||
      !hash.test(item.sha256) ||
      !item.actor ||
      !item.pointer ||
      typeof item.path !== 'string' ||
      !item.path.startsWith(`.agent/cutover/${parent.generation}/`) ||
      item.path.includes('\\') ||
      item.path.split('/').some((part) => !part || part === '.' || part === '..' || part.includes(':')) ||
      digest(regularFile(path.join(projectRoot, ...item.path.split('/')))) !== item.sha256
    )
      fail('GAP-VIDA-RUN-SELECTOR-001', 'Repair parent evidence is invalid.');
  }
  const parentManifest = readBoundManifest(
    path.join(generationRoot, 'parent-payload.manifest.v1.json'),
    plan.parent_payload_manifest_sha256,
  );
  const successorManifest = readBoundManifest(
    path.join(generationRoot, 'successor-payload.manifest.v1.json'),
    plan.successor_payload_manifest_sha256,
  );
  if (
    parentManifest.files.size !== successorManifest.files.size ||
    [...successorManifest.files].some(
      ([relative, entry]) =>
        !parentManifest.files.has(relative) ||
        (relative !== 'vida-agent/bin/run.mjs' && parentManifest.files.get(relative)?.sha256 !== entry.sha256),
    ) ||
    parentManifest.files.get('vida-agent/bin/run.mjs')?.sha256 !== plan.parent_launcher_sha256 ||
    successorManifest.files.get('vida-agent/bin/run.mjs')?.sha256 !== plan.successor_launcher_sha256 ||
    JSON.stringify({ ...parentManifest.manifest, files: [] }) !==
      JSON.stringify({ ...successorManifest.manifest, files: [] })
  )
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Repair payload delta is invalid.');
  for (const [relative, entry] of successorManifest.files) {
    if (skipInstalledBundle) continue;
    // Root integration outputs can change through governed work after the repair;
    // the installed bundle remains immutable admission authority.
    if (!relative.startsWith('vida-agent/')) continue;
    const parts = relative.split('/');
    let at = projectRoot;
    for (const part of parts.slice(0, -1)) {
      at = path.join(at, part);
      checkedDirectory(at);
    }
    const leaf = parts.at(-1);
    if (!leaf) fail('GAP-VIDA-RUN-SELECTOR-001', 'Installed repair path is invalid.');
    const actual = regularFile(path.join(at, leaf));
    if (actual.length !== entry.size || digest(actual) !== entry.sha256)
      fail('GAP-VIDA-RUN-SELECTOR-001', 'Installed repair payload drift.');
  }
  const lockPath = path.join(generationRoot, 'maintenance-lock.v1.json');
  if (pathExists(lockPath)) fail('GAP-VIDA-RUN-SELECTOR-001', 'Launcher repair maintenance is still active.');
  const lock = readControllerRecord(
    path.join(generationRoot, 'maintenance-lock.released.v1.json'),
    'VidaActiveLauncherRepairMaintenance/v1',
  );
  const release = readControllerRecord(
    path.join(generationRoot, 'maintenance-release.v1.json'),
    'VidaActiveLauncherRepairRelease/v1',
  );
  const cutoff = readControllerRecord(path.join(generationRoot, 'cutoff-witness.json'), 'VidaNewWorkCutoffWitness/v1');
  if (
    !exactKeys(lock, ['schema', 'repair_id', 'operator', 'plan_sha256', 'decision_sha256', 'selector_sha256']) ||
    !exactKeys(release, ['schema', 'repair_id', 'operator', 'lock_sha256', 'status']) ||
    !exactKeys(cutoff, ['schema', 'generation', 'selector_sha256', 'first_admitted_work_attempt']) ||
    cutoff.generation !== selector.generation ||
    cutoff.selector_sha256 !== selectorSha ||
    !(
      cutoff.first_admitted_work_attempt === null ||
      (typeof cutoff.first_admitted_work_attempt === 'string' && cutoff.first_admitted_work_attempt.length > 0)
    ) ||
    pathExists(path.join(generationRoot, 'cutoff-witness.lock')) ||
    lock.repair_id !== selector.generation ||
    lock.operator !== plan.operator ||
    lock.plan_sha256 !== selector.plan_sha256 ||
    lock.decision_sha256 !== selector.activation_decision_sha256 ||
    lock.selector_sha256 !== selectorSha ||
    release.repair_id !== selector.generation ||
    release.operator !== lock.operator ||
    release.status !== 'released_by_explicit_operator_action' ||
    release.lock_sha256 !== digest(Buffer.from(controllerJson(lock)))
  )
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Repair release proof is invalid.');
}

/** @param {string} projectRoot @param {string} relative @returns {Buffer} */
function readForwardDocumentationEvidence(projectRoot: string, relative: string): Buffer {
  if (
    typeof relative !== 'string' ||
    relative.includes('\\') ||
    path.isAbsolute(relative) ||
    relative.split('/').some((part) => !part || part === '.' || part === '..' || part.includes(':'))
  )
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Forward documentation evidence path invalid.');
  let at = projectRoot;
  for (const part of relative.split('/').slice(0, -1)) {
    at = path.join(at, part);
    checkedDirectory(at);
  }
  const bytes = regularFile(path.join(at, path.basename(relative)));
  if (bytes.length > 16 * 1024 * 1024)
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Forward documentation evidence exceeds bound.');
  return bytes;
}

/** @param {string} text @returns {Record<string, unknown>[]} */
function parseForwardJournal(text: string): Record<string, unknown>[] {
  return text
    .trim()
    .split('\n')
    .map((line) => {
      /** @type {unknown} */
      const value: unknown = JSON.parse(line);
      if (!isRecord(value)) throw Error('leaf forward journal event is invalid');
      return value;
    });
}

/** @param {string} projectRoot @param {string} generationRelative @param {ForwardUpdatePlan} plan @param {ForwardUpdateAuthorization} authorization @param {string} relative @param {{manifest: Record<string, unknown>, files: Map<string, PreparedPayloadEntry>}} oldManifest @param {{manifest: Record<string, unknown>, files: Map<string, PreparedPayloadEntry>}} newManifest @param {(file: string) => Buffer} read @returns {void} */
function verifyCurrentForwardDocumentationAuthority(
  projectRoot: string,
  generationRelative: string,
  plan: ForwardUpdatePlan,
  authorization: ForwardUpdateAuthorization,
  relative: string,
  oldManifest: { manifest: Record<string, unknown>; files: Map<string, PreparedPayloadEntry> },
  newManifest: { manifest: Record<string, unknown>; files: Map<string, PreparedPayloadEntry> },
  read: (file: string) => Buffer,
): void {
  const authority = readCurrentForwardDocumentationAuthority(projectRoot, generationRelative, read);
  verifyForwardDocumentationReceipt(authority, plan, () =>
    read(generationRelative + '/forward-journal.v1.jsonl').toString('utf8'),
  );
  const identity = verifySelectedForwardPolicyProof({
    operationBytes: authority.operationBytes,
    baselineBytes: authority.baselineBytes,
    closeoutBytes: authority.closeoutBytes,
    changelogBytes: read(authority.changelogPath),
    scopeBytes: read('.agent/work/' + authority.baseline.work_id + '/scope.json'),
    priorFiles: [...oldManifest.files].map(([file, entry]) => ({ ...entry, path: file })),
    successorFiles: [...newManifest.files].map(([file, entry]) => ({ ...entry, path: file })),
    operationId: plan.operation_id,
    parentSelectorDigest: plan.parent_selector_sha256,
    parentManifestDigest: plan.old_payload_manifest_sha256,
    successorManifestDigest: plan.new_payload_manifest_sha256,
    intentDigest: digest(Buffer.from(controllerJson(plan))),
    authorizationDigest: digest(Buffer.from(controllerJson(authorization))),
    changes: plan.changed,
  });
  if (identity !== relative) throw Error('leaf canonical identity differs');
}

/** @param {string} projectRoot @param {string} generationRelative @param {(file: string) => Buffer} read @returns {{receiptPath: string, receipt: Record<string, unknown>, baselineBytes: Buffer, baseline: ReturnType<typeof parseForwardClearCheckpoint>, operationBytes: Buffer, operation: ReturnType<typeof parseDocumentationPolicyTransitionEnvelope>, closeoutBytes: Buffer, changelogPath: string, targetSha256: string}} */
function readCurrentForwardDocumentationAuthority(
  projectRoot: string,
  generationRelative: string,
  read: (file: string) => Buffer,
): {
  receiptPath: string;
  receipt: Record<string, unknown>;
  baselineBytes: Buffer;
  baseline: ReturnType<typeof parseForwardClearCheckpoint>;
  operationBytes: Buffer;
  operation: ReturnType<typeof parseDocumentationPolicyTransitionEnvelope>;
  closeoutBytes: Buffer;
  changelogPath: string;
  targetSha256: string;
} {
  const receiptPath = generationRelative + '/documentation-forward.v1.json';
  const receipt = readControllerRecord(path.join(projectRoot, receiptPath), 'VidaForwardLifecycleClearBinding/v1');
  const baselinePath = receipt.baseline_path;
  if (typeof baselinePath !== 'string') throw Error('leaf baseline path is invalid');
  const baselineBytes = read(baselinePath),
    baseline = parseForwardClearCheckpoint(baselineBytes);
  const baselineWorkId = requireRunString(baseline.work_id, 'leaf baseline work id is invalid');
  assertForwardDocumentationBaselinePath(baselinePath, baselineWorkId);
  const operationBytes = read('.agent/work/' + baselineWorkId + '/documentation-policy-transition.v1.json');
  const operation = parseDocumentationPolicyTransitionEnvelope(operationBytes);
  const closeoutPath = readForwardDocumentationCloseoutPath(operation.closeout, baselineWorkId);
  const closeoutBytes = read(closeoutPath);
  const transition = operation.plan;
  if (!isRecord(transition) || !isRecord(transition.source_admission)) throw Error('leaf transition plan is invalid');
  const changelogPath = requireRunString(transition.changelog_path, 'leaf changelog path is invalid');
  const targetSha256 = requireRunString(transition.source_admission.target_sha256, 'leaf target digest is invalid');
  return {
    receiptPath,
    receipt,
    baselineBytes,
    baseline,
    operationBytes,
    operation,
    closeoutBytes,
    changelogPath,
    targetSha256,
  };
}

/** @param {unknown} value @param {string} message @returns {string} */
function requireRunString(value: unknown, message: string): string {
  if (typeof value !== 'string') throw Error(message);
  return value;
}

/** @param {string} baselinePath @param {string} workId @returns {void} */
function assertForwardDocumentationBaselinePath(baselinePath: string, workId: string): void {
  if (
    !/^[a-z0-9][a-z0-9._-]{0,127}$/.test(workId) ||
    !baselinePath.startsWith('.agent/work/' + workId + '/documentation-baseline-')
  )
    throw Error('leaf baseline work path differs');
}

/** @param {unknown} closeout @param {string} workId @returns {string} */
function readForwardDocumentationCloseoutPath(closeout: unknown, workId: string): string {
  const closeoutPath = isRecord(closeout) ? closeout.path : undefined;
  if (
    typeof closeoutPath !== 'string' ||
    !closeoutPath.startsWith('.agent/work/' + workId + '/documentation-closeout-')
  )
    throw Error('leaf closeout work path differs');
  return closeoutPath;
}

/** @param {ReturnType<typeof readCurrentForwardDocumentationAuthority>} authority @param {ForwardUpdatePlan} plan @param {() => string} readJournal @returns {void} */
function verifyForwardDocumentationReceipt(
  authority: ReturnType<typeof readCurrentForwardDocumentationAuthority>,
  plan: ForwardUpdatePlan,
  readJournal: () => string,
): void {
  const journal = parseForwardJournal(readJournal());
  const proof = journal.filter((event) => event.phase === 'documentation_closeout_verified');
  const proofEvent = proof.length === 1 ? proof[0] : undefined;
  if (!isForwardDocumentationReceiptBound(proofEvent, authority, plan))
    throw Error('leaf forward journal/receipt differs');
}

/** @param {Record<string, unknown> | undefined} event @param {ReturnType<typeof readCurrentForwardDocumentationAuthority>} authority @param {ForwardUpdatePlan} plan @returns {boolean} */
function isForwardDocumentationReceiptBound(
  event: Record<string, unknown> | undefined,
  authority: ReturnType<typeof readCurrentForwardDocumentationAuthority>,
  plan: ForwardUpdatePlan,
): boolean {
  return isForwardDocumentationEventBound(event, authority, plan) && isForwardDocumentationRecordBound(authority, plan);
}

/** @param {Record<string, unknown> | undefined} event @param {ReturnType<typeof readCurrentForwardDocumentationAuthority>} authority @param {ForwardUpdatePlan} plan @returns {boolean} */
function isForwardDocumentationEventBound(
  event: Record<string, unknown> | undefined,
  authority: ReturnType<typeof readCurrentForwardDocumentationAuthority>,
  plan: ForwardUpdatePlan,
): boolean {
  return (
    Boolean(event) &&
    event?.schema === 'VidaForwardUpdateEvent/v1' &&
    event.operation_id === plan.operation_id &&
    event.lock_sha256 === digest(Buffer.from(controllerJson(plan))) &&
    event.receipt_path === authority.receiptPath &&
    event.closeout_sha256 === digest(authority.closeoutBytes)
  );
}

/** @param {ReturnType<typeof readCurrentForwardDocumentationAuthority>} authority @param {ForwardUpdatePlan} plan @returns {boolean} */
function isForwardDocumentationRecordBound(
  authority: ReturnType<typeof readCurrentForwardDocumentationAuthority>,
  plan: ForwardUpdatePlan,
): boolean {
  return (
    authority.receipt.operation_id === plan.operation_id &&
    authority.receipt.baseline_digest === authority.baseline.digest &&
    authority.receipt.policy_sha256 === authority.targetSha256 &&
    authority.receipt.parent_manifest_sha256 === plan.old_payload_manifest_sha256 &&
    authority.receipt.successor_manifest_sha256 === plan.new_payload_manifest_sha256
  );
}

/**
 * @param {string} projectRoot
 * @param {string} generationRoot
 * @param {ForwardUpdatePlan} plan
 * @param {ForwardUpdateAuthorization} authorization
 * @param {string} relative
 * @param {boolean} historical
 * @param {{manifest: Record<string, unknown>, files: Map<string, PreparedPayloadEntry>}} oldManifest
 * @param {{manifest: Record<string, unknown>, files: Map<string, PreparedPayloadEntry>}} newManifest
 * @returns {void}
 */
function forwardPolicyAuthority(
  projectRoot: string,
  generationRoot: string,
  plan: ForwardUpdatePlan,
  authorization: ForwardUpdateAuthorization,
  relative: string,
  historical: boolean,
  oldManifest: { manifest: Record<string, unknown>; files: Map<string, PreparedPayloadEntry> },
  newManifest: { manifest: Record<string, unknown>; files: Map<string, PreparedPayloadEntry> },
): void {
  /** @param {string} file @returns {Buffer} */
  const read = (file: string) => readForwardDocumentationEvidence(projectRoot, file);
  const generationRelative = path.relative(projectRoot, generationRoot).split(path.sep).join('/');
  try {
    if (!historical) {
      verifyCurrentForwardDocumentationAuthority(
        projectRoot,
        generationRelative,
        plan,
        authorization,
        relative,
        oldManifest,
        newManifest,
        read,
      );
      return;
    }
    // Only recursive committed-parent traversal reaches this observational path.
    // Current identity locates retained events; old rights/configuration are not reinterpreted.
    const identity = parseForwardPolicyIdentity(read(relative), relative);
    if (typeof identity.changelog_path !== 'string') throw Error('committed policy changelog path is invalid');
    const lines = read(identity.changelog_path).toString('utf8').trim().split('\n');
    const parsed = lines.map((line) => ({
      bytes: Buffer.from(line + '\n'),
      event: parseForwardDocumentationEvent(Buffer.from(line)),
    }));
    const change = plan.changed.find((entry) => entry.path === relative);
    if (!change) throw Error('committed policy change is missing');
    const policies = parsed.filter(
      ({ event }) =>
        event.operation === 'finalize' &&
        event.path_before === relative &&
        event.path_after === relative &&
        event.before_sha256 === change.old_sha256 &&
        event.after_sha256 === change.new_sha256,
    );
    if (policies.length !== 1) throw Error('committed policy event missing or ambiguous');
    const policy = policies[0];
    if (!policy) throw Error('committed policy event missing');
    const policyWork = policy.event.work_id;
    if (typeof policyWork !== 'string') throw Error('committed event work is invalid');
    const work = policyWork;
    if (!/^[a-z0-9][a-z0-9._-]{0,127}$/.test(work)) throw Error('committed event work invalid');
    const workRoot = '.agent/work/' + work;
    checkedDirectory(path.join(projectRoot, '.agent'));
    checkedDirectory(path.join(projectRoot, '.agent/work'));
    checkedDirectory(path.join(projectRoot, workRoot));
    const names = readdirSync(path.join(projectRoot, workRoot)).filter((file) =>
      /^documentation-(baseline|closeout)-[0-9]{4}\.v1\.json$/.test(file),
    );
    if (names.length > 256) throw Error('committed checkpoint inventory exceeds bound');
    const checkpoints = names.flatMap((name) => {
      try {
        const bytes = read(workRoot + '/' + name);
        return [{ path: workRoot + '/' + name, bytes, record: parseForwardClearCheckpoint(bytes) }];
      } catch {
        return [];
      }
    });
    const documents = parsed.filter(
      ({ event }) =>
        event.work_id === work &&
        event.source_revision === policy.event.source_revision &&
        event.path_after !== relative &&
        plan.changed.some(
          (entry) =>
            entry.path === event.path_after &&
            entry.old_sha256 === event.before_sha256 &&
            entry.new_sha256 === event.after_sha256,
        ),
    );
    let matches = 0;
    for (const baseline of checkpoints.filter((entry) => entry.record.phase === 'baseline'))
      for (const closeout of checkpoints.filter(
        (entry) => entry.record.phase === 'closeout' && entry.record.baseline_digest === baseline.record.digest,
      ))
        for (const document of documents) {
          try {
            if (
              verifyCommittedParentPolicyProof({
                baselineBytes: baseline.bytes,
                closeoutBytes: closeout.bytes,
                baselinePath: baseline.path,
                policyEventBytes: policy.bytes,
                documentEventBytes: document.bytes,
                changes: plan.changed,
              }) === relative
            )
              matches += 1;
          } catch {
            /* An unrelated checkpoint is not a substitute for the exact committed byte pair. */
          }
        }
    if (matches !== 1) throw Error('committed policy event/CLEAR closure missing or ambiguous');
  } catch (error) {
    fail(
      'GAP-VIDA-RUN-SELECTOR-001',
      'Forward policy proof invalid: ' + (error instanceof Error ? error.message : String(error)),
    );
  }
}

/**
 * @param {string} projectRoot
 * @param {ActiveRuntimeSelectorRecord} selector
 * @param {string} selectorSha
 * @param {string} generationRoot
 * @param {boolean} [skipInstalledBundle]
 * @param {Set<string>} [seen]
 */
export function forwardUpdateAuthority(
  projectRoot: string,
  selector: ActiveRuntimeSelectorRecord,
  selectorSha: string,
  generationRoot: string,
  skipInstalledBundle: boolean = false,
  seen: Set<string> = new Set(),
): Record<string, unknown> | null {
  if (seen.has(selector.generation) || seen.size >= 8)
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Forward parent chain cycles or exceeds bound.');
  seen.add(selector.generation);
  const hash = /^[a-f0-9]{64}$/;
  const plan = readControllerRecord(
    path.join(generationRoot, 'forward-intent.v1.json'),
    'VidaForwardUpdateMaintenance/v1',
  );
  const authorization = readControllerRecord(
    path.join(generationRoot, 'forward-authorization.v1.json'),
    'VidaForwardUpdateAuthorization/v1',
  );
  const decision = readControllerRecord(
    path.join(generationRoot, 'forward-decision.v1.json'),
    'VidaForwardUpdateDecision/v1',
  );
  const commit = readControllerRecord(
    path.join(generationRoot, 'forward-selector-commit.v1.json'),
    'VidaForwardUpdateSelectorCommit/v1',
  );
  const parent = readControllerRecord(path.join(generationRoot, 'parent-selector.v1.json'), 'ActiveRuntimeSelector/v1');
  const lock = readControllerRecord(
    path.join(generationRoot, 'maintenance-lock.released.v1.json'),
    'VidaForwardUpdateMaintenance/v1',
  );
  const release = readControllerRecord(
    path.join(generationRoot, 'maintenance-release.v1.json'),
    'VidaForwardUpdateRelease/v1',
  );
  const cutoff = readControllerRecord(path.join(generationRoot, 'cutoff-witness.json'), 'VidaNewWorkCutoffWitness/v1');
  if (
    !exactStringFields(
      plan,
      [
        'schema',
        'operation_id',
        'operator',
        'parent_generation',
        'parent_selector_sha256',
        'parent_cutoff_sha256',
        'first_admitted_work_attempt',
        'old_payload_manifest_sha256',
        'new_payload_manifest_sha256',
        'changed',
        'preserved_mutable_outputs',
      ],
      [
        'schema',
        'operation_id',
        'operator',
        'parent_generation',
        'parent_selector_sha256',
        'parent_cutoff_sha256',
        'old_payload_manifest_sha256',
        'new_payload_manifest_sha256',
      ],
    ) ||
    !exactStringFields(
      authorization,
      ['schema', 'operation_id', 'operator', 'outcome', 'pointer', 'plan_sha256', 'evidence'],
      ['schema', 'operation_id', 'operator', 'outcome', 'pointer', 'plan_sha256'],
    ) ||
    !exactStringFields(
      decision,
      [
        'schema',
        'operation_id',
        'operator',
        'plan_sha256',
        'authorization_sha256',
        'selector_intent_sha256',
        'outcome',
      ],
      [
        'schema',
        'operation_id',
        'operator',
        'plan_sha256',
        'authorization_sha256',
        'selector_intent_sha256',
        'outcome',
      ],
    ) ||
    !exactStringFields(
      commit,
      ['schema', 'operation_id', 'plan_sha256', 'decision_sha256', 'selector_sha256'],
      ['schema', 'operation_id', 'plan_sha256', 'decision_sha256', 'selector_sha256'],
    ) ||
    !exactStringFields(
      release,
      ['schema', 'operation_id', 'operator', 'lock_sha256', 'status'],
      ['schema', 'operation_id', 'operator', 'lock_sha256', 'status'],
    ) ||
    !exactStringFields(
      cutoff,
      ['schema', 'generation', 'selector_sha256', 'first_admitted_work_attempt'],
      ['schema', 'generation', 'selector_sha256'],
    ) ||
    !/^[a-z0-9][a-z0-9._-]{0,79}$/.test(plan.operation_id) ||
    !/^[a-z0-9][a-z0-9._-]{0,79}$/.test(plan.operator) ||
    plan.operation_id !== selector.generation ||
    plan.operation_id === plan.parent_generation ||
    authorization.operation_id !== plan.operation_id ||
    authorization.operator !== plan.operator ||
    authorization.outcome !== 'approved' ||
    !authorization.pointer?.trim() ||
    authorization.plan_sha256 !== selector.plan_sha256 ||
    decision.operation_id !== plan.operation_id ||
    decision.operator !== plan.operator ||
    decision.plan_sha256 !== selector.plan_sha256 ||
    decision.outcome !== 'approved' ||
    decision.authorization_sha256 !== digest(Buffer.from(controllerJson(authorization))) ||
    commit.operation_id !== plan.operation_id ||
    commit.plan_sha256 !== selector.plan_sha256 ||
    commit.decision_sha256 !== selector.activation_decision_sha256 ||
    commit.selector_sha256 !== selectorSha ||
    release.operation_id !== plan.operation_id ||
    release.operator !== plan.operator ||
    release.lock_sha256 !== digest(Buffer.from(controllerJson(lock))) ||
    release.status !== 'released_by_explicit_operator_action' ||
    digest(Buffer.from(controllerJson(plan))) !== selector.plan_sha256 ||
    digest(Buffer.from(controllerJson(decision))) !== selector.activation_decision_sha256 ||
    decision.selector_intent_sha256 !==
      digest(
        Buffer.from(controllerJson((({ activation_decision_sha256: _ignored, ...intent }) => intent)(selector))),
      ) ||
    !hash.test(plan.parent_selector_sha256) ||
    !hash.test(plan.parent_cutoff_sha256) ||
    !hash.test(plan.old_payload_manifest_sha256) ||
    !hash.test(plan.new_payload_manifest_sha256) ||
    selector.payload_manifest_sha256 !== plan.new_payload_manifest_sha256 ||
    selector.archive_manifest_sha256 !== parent.archive_manifest_sha256 ||
    selector.state_policy !== 'forward_only_preserve_work' ||
    lock.operation_id !== plan.operation_id ||
    !Buffer.from(controllerJson(lock)).equals(Buffer.from(controllerJson(plan))) ||
    pathExists(path.join(generationRoot, 'maintenance-lock.v1.json')) ||
    cutoff.generation !== selector.generation ||
    cutoff.selector_sha256 !== selectorSha ||
    cutoff.first_admitted_work_attempt !== plan.first_admitted_work_attempt
  )
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Forward update proof is invalid.');
  requireForwardUpdatePlan(plan);
  requireForwardUpdateAuthorization(authorization);
  requireForwardParentSelector(parent);
  requireForwardReviewEvidence(authorization.evidence);
  try {
    verifyForwardReviewSet(projectRoot, selector.generation, authorization.plan_sha256, authorization.evidence);
  } catch {
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Forward review evidence is invalid.');
  }
  const parentRoot = path.join(projectRoot, '.agent', 'cutover', plan.parent_generation);
  checkedDirectory(parentRoot);
  const parentCutoff = readControllerRecord(
    path.join(parentRoot, 'cutoff-witness.json'),
    'VidaNewWorkCutoffWitness/v1',
  );
  if (
    parent.generation !== plan.parent_generation ||
    digest(Buffer.from(controllerJson(parent))) !== plan.parent_selector_sha256 ||
    parent.payload_manifest_sha256 !== plan.old_payload_manifest_sha256 ||
    digest(regularFile(path.join(parentRoot, 'cutoff-witness.json'))) !== plan.parent_cutoff_sha256 ||
    parentCutoff.first_admitted_work_attempt !== plan.first_admitted_work_attempt
  )
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Forward parent selector or cutoff drift.');
  const parentForward = pathExists(path.join(parentRoot, 'forward-intent.v1.json'));
  const parentRepair = pathExists(path.join(parentRoot, 'repair-plan.v1.json'));
  if (parentForward === parentRepair) fail('GAP-VIDA-RUN-SELECTOR-001', 'Forward parent authority type is ambiguous.');
  if (parentForward) forwardUpdateAuthority(projectRoot, parent, plan.parent_selector_sha256, parentRoot, true, seen);
  else repairAuthority(projectRoot, parent, plan.parent_selector_sha256, parentRoot, true);
  const oldManifest = readBoundManifest(
    path.join(generationRoot, 'parent-payload.manifest.v1.json'),
    plan.old_payload_manifest_sha256,
  );
  const newManifest = readBoundManifest(
    path.join(generationRoot, 'successor-payload.manifest.v1.json'),
    plan.new_payload_manifest_sha256,
  );
  if (
    !Array.isArray(plan.changed) ||
    !Array.isArray(plan.preserved_mutable_outputs) ||
    plan.preserved_mutable_outputs.length > 1
  )
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Forward manifest deletion or preservation proof invalid.');
  const retired = [...oldManifest.files.keys()].filter((item) => !newManifest.files.has(item)).sort();
  if (
    retired.length &&
    JSON.stringify(retired) !== JSON.stringify(['AGENT.sidecar.md', 'agent-runtime.config.v1.yaml'])
  )
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Only the complete project-owned integration pair may retire.');
  if (plan.preserved_mutable_outputs.length) {
    const preserved = plan.preserved_mutable_outputs[0];
    const configEntry = oldManifest.files.get('agent-runtime.config.v1.yaml');
    const nextConfig = newManifest.files.get('agent-runtime.config.v1.yaml');
    if (
      !exactStringFields(
        preserved,
        ['path', 'config_path', 'config_pointer', 'config_sha256', 'staged_sha256', 'installed_sha256_at_inspection'],
        ['path', 'config_path', 'config_pointer', 'config_sha256', 'staged_sha256', 'installed_sha256_at_inspection'],
      ) ||
      (configEntry && nextConfig && configEntry.sha256 !== nextConfig.sha256) ||
      preserved.config_path !== 'agent-runtime.config.v1.yaml' ||
      preserved.config_pointer !== 'research_decision.paths.changelog' ||
      !hash.test(preserved.config_sha256) ||
      (configEntry && preserved.config_sha256 !== configEntry.sha256) ||
      !oldManifest.files.has(preserved.path) ||
      preserved.staged_sha256 !== oldManifest.files.get(preserved.path)?.sha256 ||
      newManifest.files.get(preserved.path)?.sha256 !== preserved.staged_sha256 ||
      !hash.test(preserved.installed_sha256_at_inspection)
    )
      fail('GAP-VIDA-RUN-SELECTOR-001', 'Configured mutable-output preservation proof invalid.');
  }
  const changed = [];
  for (const [relative, after] of [...newManifest.files].sort(([left], [right]) => compareStrings(left, right))) {
    const before = oldManifest.files.get(relative);
    const changedEntry = !before || before.sha256 !== after.sha256 || before.size !== after.size;
    if (changedEntry) {
      if (!relative.startsWith('vida-agent/') && relative !== 'AGENTS.md')
        forwardPolicyAuthority(
          projectRoot,
          generationRoot,
          plan,
          authorization,
          relative,
          skipInstalledBundle && seen.size > 1,
          oldManifest,
          newManifest,
        );
      changed.push({
        path: relative,
        old_sha256: before?.sha256 ?? null,
        new_sha256: after.sha256,
        old_size: before?.size ?? null,
        new_size: after.size,
      });
    }
    // Older repair-base manifests retain source preimage hashes; only the selected
    // installed successor asserts that a non-generated mapping is same-byte.
    if (
      !skipInstalledBundle &&
      relative !== 'AGENTS.md' &&
      after.source_path !== undefined &&
      (after.source_path !== relative || after.source_sha256 !== after.sha256)
    )
      fail('GAP-VIDA-RUN-SELECTOR-001', 'Selected source provenance differs.');
    if (relative === 'AGENTS.md' && changedEntry) {
      const template = newManifest.files.get('vida-agent/templates/AGENTS.template.md');
      if (
        !template ||
        after.source_path !== 'vida-agent/templates/AGENTS.template.md' ||
        after.source_sha256 !== template.sha256
      )
        fail('GAP-VIDA-RUN-SELECTOR-001', 'Generated root AGENTS provenance differs.');
      if (!skipInstalledBundle) {
        const templateBytes = regularFile(path.join(projectRoot, 'vida-agent/templates/AGENTS.template.md'));
        const expected = Buffer.from(templateBytes.toString('utf8').replaceAll('{{BUNDLE}}', 'vida-agent'));
        if (
          templateBytes.length !== template.size ||
          digest(templateBytes) !== template.sha256 ||
          !templateBytes.includes(Buffer.from('{{BUNDLE}}')) ||
          expected.length !== after.size ||
          digest(expected) !== after.sha256 ||
          !regularFile(path.join(projectRoot, relative)).equals(expected)
        )
          fail('GAP-VIDA-RUN-SELECTOR-001', 'Installed generated root AGENTS drift.');
      }
    }
    if (!skipInstalledBundle && (relative.startsWith('vida-agent/') || (changedEntry && relative !== 'AGENTS.md'))) {
      const parts = relative.split('/');
      let at = projectRoot;
      for (const part of parts.slice(0, -1)) {
        at = path.join(at, part);
        checkedDirectory(at);
      }
      const actual = regularFile(path.join(at, requireForwardFileLeaf(parts.at(-1))));
      if (actual.length !== after.size || digest(actual) !== after.sha256)
        fail('GAP-VIDA-RUN-SELECTOR-001', 'Installed forward bundle drift.');
    }
  }
  if (JSON.stringify(changed) !== JSON.stringify(plan.changed) || !changed.length)
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Forward changed-path proof differs.');
  if (!skipInstalledBundle)
    installedBundleInventory(
      projectRoot,
      new Set([...newManifest.files.keys()].filter((item) => item.startsWith('vida-agent/'))),
    );
  if (skipInstalledBundle || plan.preserved_mutable_outputs.length === 0) return null;
  return requireSelectorRecord(plan.preserved_mutable_outputs[0]);
}

/** @param {string} projectRoot @returns {ActiveSelectorState | null} */
type ActiveSelectorState = {
  generationRoot: string;
  generation: string;
  selectorSha: string;
  planSha256: string;
  archiveManifestSha256: string;
  payloadManifestSha256?: string | undefined;
  activationDecisionSha256?: string | undefined;
  repaired: boolean;
  forward: boolean;
  currentMutableOutput: Record<string, unknown> | null;
};

/**
 * @param {string} generationRoot
 * @param {ActiveRuntimeSelectorRecord} selector
 * @param {string} selectorSha
 * @param {boolean} repaired
 * @param {boolean} forward
 * @param {Record<string, unknown> | null} currentMutableOutput
 * @returns {ActiveSelectorState}
 */
function buildActiveSelectorState(
  generationRoot: string,
  selector: ActiveRuntimeSelectorRecord,
  selectorSha: string,
  repaired: boolean,
  forward: boolean,
  currentMutableOutput: Record<string, unknown> | null,
): ActiveSelectorState {
  return {
    generationRoot,
    generation: selector.generation,
    selectorSha,
    planSha256: selector.plan_sha256,
    archiveManifestSha256: selector.archive_manifest_sha256,
    ...(selector.payload_manifest_sha256 === undefined
      ? {}
      : { payloadManifestSha256: selector.payload_manifest_sha256 }),
    ...(selector.activation_decision_sha256 === undefined
      ? {}
      : { activationDecisionSha256: selector.activation_decision_sha256 }),
    repaired,
    forward,
    currentMutableOutput,
  };
}

/** @param {string} projectRoot @returns {ActiveSelectorState | null} */
function activeSelector(projectRoot: string): ActiveSelectorState | null {
  const agentRoot = path.join(projectRoot, '.agent');
  const selectorPath = path.join(agentRoot, 'active-runtime-selector.v1.json');
  if (!pathExists(selectorPath)) {
    const cutoverRoot = path.join(agentRoot, 'cutover');
    if (pathExists(cutoverRoot)) {
      checkedDirectory(agentRoot);
      checkedDirectory(cutoverRoot);
      if (readdirSync(cutoverRoot).length > 0)
        fail('GAP-VIDA-RUN-SELECTOR-001', 'Cutover records exist without an active selector.');
    }
    return null;
  }
  checkedDirectory(agentRoot);
  const selector = readControllerRecord(selectorPath, 'ActiveRuntimeSelector/v1');
  requireActiveRuntimeSelectorRecord(selector);
  const hash = /^[a-f0-9]{64}$/;
  const expectedKeys = [
    'schema',
    'generation',
    'runtime',
    'bundle_root',
    'config_path',
    'archive_manifest_sha256',
    'plan_sha256',
    ...(selector.payload_manifest_sha256 === undefined
      ? []
      : ['payload_manifest_sha256', 'state_policy', 'activation_decision_sha256']),
  ];
  if (
    !exactStringFields(selector, expectedKeys, expectedKeys) ||
    !/^[a-z0-9][a-z0-9._-]{0,79}$/.test(selector.generation) ||
    selector.runtime !== 'vida-agent' ||
    selector.bundle_root !== 'vida-agent' ||
    selector.config_path !== 'agent-runtime.config.v1.yaml' ||
    !hash.test(selector.archive_manifest_sha256) ||
    !hash.test(selector.plan_sha256) ||
    realpathSync(bundleRoot) !== realpathSync(path.join(projectRoot, 'vida-agent'))
  )
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Active selector does not bind this installed bundle.');
  const selectorSha = digest(Buffer.from(controllerJson(selector)));
  const cutoverRoot = path.join(agentRoot, 'cutover');
  const generationRoot = path.join(cutoverRoot, selector.generation);
  checkedDirectory(cutoverRoot);
  checkedDirectory(generationRoot);
  const forward = pathExists(path.join(generationRoot, 'forward-intent.v1.json'));
  const repaired = pathExists(path.join(generationRoot, 'repair-plan.v1.json'));
  /** @type {Record<string, unknown> | null} */
  let currentMutableOutput: Record<string, unknown> | null = null;
  const payloadManifestSha256 = selector.payload_manifest_sha256;
  const activationDecisionSha256 = selector.activation_decision_sha256;
  if (forward) {
    if (
      !isPreparedDigest(payloadManifestSha256) ||
      !isPreparedDigest(activationDecisionSha256) ||
      selector.state_policy !== 'forward_only_preserve_work'
    )
      fail('GAP-VIDA-RUN-SELECTOR-001', 'Forward selector is incomplete.');
    currentMutableOutput = forwardUpdateAuthority(projectRoot, selector, selectorSha, generationRoot);
  } else if (repaired) {
    if (
      !isPreparedDigest(payloadManifestSha256) ||
      selector.state_policy !== 'clean_start_no_ticket_transfer' ||
      !isPreparedDigest(activationDecisionSha256)
    )
      fail('GAP-VIDA-RUN-SELECTOR-001', 'Repair selector is incomplete.');
    repairAuthority(projectRoot, selector, selectorSha, generationRoot);
  } else if (payloadManifestSha256 !== undefined) {
    if (
      !isPreparedDigest(payloadManifestSha256) ||
      selector.state_policy !== 'clean_start_no_ticket_transfer' ||
      !isPreparedDigest(activationDecisionSha256)
    )
      fail('GAP-VIDA-RUN-SELECTOR-001', 'Prepared selector is incomplete.');
    const journal = readControllerRecord(
      path.join(generationRoot, 'prepared-install.json'),
      'VidaPreparedInstallJournal/v1',
    );
    const ready = readControllerRecord(path.join(generationRoot, 'install-ready.json'), 'VidaPreparedInstallReady/v1');
    if (
      journal.cutover_id !== selector.generation ||
      journal.plan_sha256 !== selector.plan_sha256 ||
      journal.archive_manifest_sha256 !== selector.archive_manifest_sha256 ||
      journal.payload_manifest_sha256 !== selector.payload_manifest_sha256 ||
      journal.state_policy !== selector.state_policy ||
      journal.status !== 'installing' ||
      ready.cutover_id !== selector.generation ||
      ready.plan_sha256 !== selector.plan_sha256 ||
      ready.state_policy !== selector.state_policy ||
      ready.status !== 'ready_for_selector'
    )
      fail('GAP-VIDA-RUN-SELECTOR-001', 'Prepared cutover journal is incomplete.');
    const decision = readControllerRecord(
      path.join(generationRoot, 'activation-decision.v1.json'),
      'VidaCutoverActivationDecision/v1',
    );
    const commit = readControllerRecord(
      path.join(generationRoot, 'selector-commit.json'),
      'VidaPreparedSelectorCommit/v1',
    );
    const { activation_decision_sha256: _decisionHash, ...selectorIntent } = selector;
    if (
      JSON.stringify(Object.keys(decision).sort()) !==
        JSON.stringify(
          [
            'actor',
            'cutover_id',
            'evidence',
            'outcome',
            'payload_manifest_sha256',
            'plan_sha256',
            'pointer',
            'schema',
            'selector_intent_sha256',
          ].sort(),
        ) ||
      !exactKeys(decision.evidence, ['parity', 'security', 'assurance', 'rollback', 'dev', 'staged_runtime']) ||
      JSON.stringify(Object.keys(commit).sort()) !==
        JSON.stringify(
          ['activation_decision_sha256', 'cutover_id', 'plan_sha256', 'schema', 'selector_sha256'].sort(),
        ) ||
      digest(Buffer.from(controllerJson(decision))) !== selector.activation_decision_sha256 ||
      decision.outcome !== 'approved' ||
      decision.cutover_id !== selector.generation ||
      decision.plan_sha256 !== selector.plan_sha256 ||
      decision.payload_manifest_sha256 !== selector.payload_manifest_sha256 ||
      decision.selector_intent_sha256 !== digest(Buffer.from(controllerJson(selectorIntent))) ||
      commit.cutover_id !== selector.generation ||
      commit.plan_sha256 !== selector.plan_sha256 ||
      commit.activation_decision_sha256 !== selector.activation_decision_sha256 ||
      commit.selector_sha256 !== selectorSha
    )
      fail('GAP-VIDA-RUN-SELECTOR-001', 'Prepared cutover decision or selector commit is invalid.');
    for (const kind of ['parity', 'security', 'assurance', 'rollback', 'dev', 'staged_runtime']) {
      const item = recordField(decision.evidence, kind);
      if (
        !isCutoverEvidence(item) ||
        item.status !== 'passed' ||
        !hash.test(item.sha256) ||
        !item.actor ||
        !item.pointer ||
        typeof item.path !== 'string' ||
        !item.path.startsWith(`.agent/cutover/${selector.generation}/`) ||
        item.path.includes('\\') ||
        item.path.split('/').some((part) => !part || part === '.' || part === '..' || part.includes(':')) ||
        digest(regularFile(path.join(projectRoot, ...item.path.split('/')))) !== item.sha256
      )
        fail('GAP-VIDA-RUN-SELECTOR-001', 'Prepared cutover decision or selector commit is invalid.');
    }
  } else {
    const journal = readControllerRecord(path.join(generationRoot, 'journal.json'), 'VidaCutoverStageJournal/v1');
    if (
      journal.cutover_id !== selector.generation ||
      journal.plan_sha256 !== selector.plan_sha256 ||
      journal.archive_manifest_sha256 !== selector.archive_manifest_sha256 ||
      journal.selector_sha256 !== selectorSha ||
      journal.status !== 'staged'
    )
      fail('GAP-VIDA-RUN-SELECTOR-001', 'Cutover journal is incomplete.');
  }
  return buildActiveSelectorState(generationRoot, selector, selectorSha, repaired, forward, currentMutableOutput);
}

// A selector is not sufficient authority while its cutover controller still holds maintenance.
// The controller releases this marker only through an explicit operator completion action.
/** @param {Record<string, unknown>} retained @param {ActiveSelectorState} selector @returns {boolean} */
function hasPreparedMaintenanceBindings(retained: Record<string, unknown>, selector: ActiveSelectorState): boolean {
  return (
    retained.attestation === 'old_runtime_quiesced' &&
    retained.activation_decision_path === `.agent/cutover/${selector.generation}/activation-decision.v1.json` &&
    isRecord(retained.plan) &&
    retained.plan.schema === 'VidaPreparedInstallPlan/v1' &&
    retained.plan.plan_sha256 === selector.planSha256 &&
    isRecord(retained.archive_manifest) &&
    retained.archive_manifest.manifest_sha256 === selector.archiveManifestSha256
  );
}

/** @param {ActiveSelectorState | null | undefined} selector @returns {void} */
export function assertNoActiveCutoverMaintenance(selector: ActiveSelectorState | null | undefined): void {
  if (!selector) return;
  if (selector.repaired || selector.forward) return;
  if (pathExists(path.join(selector.generationRoot, 'maintenance-lock.v1.json')))
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Cutover maintenance is still active.');
  const retained = readControllerRecord(
    path.join(selector.generationRoot, 'maintenance-lock.released.v1.json'),
    'VidaCutoverMaintenanceLock/v1',
  );
  const receipt = readControllerRecord(
    path.join(selector.generationRoot, 'maintenance-release.v1.json'),
    'VidaCutoverMaintenanceRelease/v1',
  );
  if (
    (selector.payloadManifestSha256 !== undefined &&
      !exactKeys(retained, [
        'schema',
        'cutover_id',
        'operator',
        'attestation',
        'archive_manifest_sha256',
        'plan_sha256',
        'payload_manifest_sha256',
        'expected_file_count',
        'archive_manifest',
        'plan',
        'state_policy',
        'activation_decision_path',
        'activation_decision_sha256',
      ])) ||
    !exactKeys(receipt, ['schema', 'cutover_id', 'operator', 'lock_sha256', 'status']) ||
    (selector.payloadManifestSha256 !== undefined && !hasPreparedMaintenanceBindings(retained, selector)) ||
    retained.cutover_id !== selector.generation ||
    retained.plan_sha256 !== selector.planSha256 ||
    retained.archive_manifest_sha256 !== selector.archiveManifestSha256 ||
    retained.payload_manifest_sha256 !== selector.payloadManifestSha256 ||
    receipt.cutover_id !== selector.generation ||
    receipt.status !== 'released_by_explicit_operator_action' ||
    (selector.activationDecisionSha256 && retained.activation_decision_sha256 !== selector.activationDecisionSha256) ||
    receipt.operator !== retained.operator ||
    receipt.lock_sha256 !== digest(Buffer.from(controllerJson(retained)))
  )
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Cutover maintenance release proof is invalid.');
}

/** @param {string} file @param {unknown} value @returns {void} */
export function writeDurable(file: string, value: unknown): void {
  const bytes = Buffer.from(controllerJson(value));
  const target = `${file}.pending-${randomUUID()}`;
  const fd = openSync(target, 'wx', 0o600);
  try {
    try {
      writeFileSync(fd, bytes);
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    renameSync(target, file);
  } catch (error) {
    try {
      unlinkSync(target);
    } catch (cleanupError) {
      if (nodeErrorCode(cleanupError) !== 'ENOENT')
        throw new AggregateError([error, cleanupError], 'Cutoff publication and temporary cleanup failed.');
    }
    throw error;
  }
  if (!regularFile(file).equals(bytes)) fail('GAP-VIDA-RUN-CUTOFF-001', 'Cutoff witness publication failed.');
}

/**
 * @param {ActiveSelectorState | null | undefined} selector
 * @param {{project_root: string, repository?: string | undefined, work_id?: string | undefined, attempt?: string | undefined, scope_digest?: string | undefined}} values
 * @returns {Promise<void>}
 */
export async function advanceCutoff(
  selector: ActiveSelectorState | null | undefined,
  values: {
    project_root: string;
    repository?: string | undefined;
    work_id?: string | undefined;
    attempt?: string | undefined;
    scope_digest?: string | undefined;
  },
): Promise<void> {
  if (!selector) return;
  const file = path.join(selector.generationRoot, 'cutoff-witness.json');
  const lock = path.join(selector.generationRoot, 'cutoff-witness.lock');
  if (pathExists(lock)) fail('GAP-VIDA-RUN-CUTOFF-001', 'Cutoff witness is held or unsafe.');
  const { loadRuntimeConfig } = await import('../src/config/runtime-config.ts');
  const { requireSafeRepositoryAccess } = await import('../src/config/safe-repository-access.ts');
  const { sessionHandoffDatabasePath } = await import('../src/config/project-paths.ts');
  const { withCliHostStateExclusiveTransaction } = await import('./workspace-database-cli.ts');
  const { deriveWorkspaceId } = await import('../src/workspace-identity.ts');
  const config = loadRuntimeConfig(values.project_root);
  const access = requireSafeRepositoryAccess(values.project_root);
  access.ensureDirectory(config.control.work_root, 'cutoff transaction root');
  const databasePath = sessionHandoffDatabasePath(values.project_root, config);
  try {
    withCliHostStateExclusiveTransaction(
      values.project_root,
      databasePath,
      deriveWorkspaceId(config.repository.repository_id, values.project_root),
      () => {
        if (
          pathExists(lock) ||
          digest(access.readBytes('.agent/active-runtime-selector.v1.json', 'cutoff current selector')) !==
            selector.selectorSha
        )
          fail('GAP-VIDA-RUN-CUTOFF-001', 'Cutoff selector changed while acquiring exclusion.');
        advanceLockedCutoff(file, selector, values);
      },
    );
  } catch (error) {
    if (nodeErrorCode(error) === 'SQLITE_BUSY') fail('GAP-VIDA-RUN-CUTOFF-001', 'Cutoff witness is held or unsafe.');
    throw error;
  }
}

/**
 * @param {string} file
 * @param {ActiveSelectorState} selector
 * @param {{repository?: string | undefined, work_id?: string | undefined, attempt?: string | undefined, scope_digest?: string | undefined}} values
 * @returns {void}
 */
function advanceLockedCutoff(
  file: string,
  selector: ActiveSelectorState,
  values: {
    repository?: string | undefined;
    work_id?: string | undefined;
    attempt?: string | undefined;
    scope_digest?: string | undefined;
  },
): void {
  const initial = {
    schema: 'VidaNewWorkCutoffWitness/v1',
    generation: selector.generation,
    selector_sha256: selector.selectorSha,
    first_admitted_work_attempt: null,
  };
  if (!pathExists(file)) fail('GAP-VIDA-RUN-CUTOFF-001', 'Cutoff witness is missing.');
  const witness = readControllerRecord(file, 'VidaNewWorkCutoffWitness/v1');
  if (witness.generation !== selector.generation || witness.selector_sha256 !== selector.selectorSha)
    fail('GAP-VIDA-RUN-CUTOFF-001', 'Cutoff witness is bound to another selector.');
  if (witness.first_admitted_work_attempt !== null) {
    if (typeof witness.first_admitted_work_attempt !== 'string' || witness.first_admitted_work_attempt.length === 0)
      fail('GAP-VIDA-RUN-CUTOFF-001', 'Cutoff witness identity is invalid.');
    return;
  }
  writeDurable(file, {
    ...initial,
    first_admitted_work_attempt: `${values.repository}/${values.work_id}/${values.attempt}/${values.scope_digest}`,
  });
}

/**
 * @param {import('../src/host-state.ts').HostStateSnapshot} snapshot
 * @param {string} message
 * @returns {import('../src/host-state.ts').WorkState}
 */
function requireHostWork(
  snapshot: import('../src/host-state.ts').HostStateSnapshot,
  message: string,
): import('../src/host-state.ts').WorkState {
  if (!snapshot.work) fail('GAP-VIDA-RUN-CONTEXT-001', message);
  return snapshot.work;
}

type RunErrorDetails = Record<string, unknown>;

class RunCliError extends Error {
  code: string;
  details: RunErrorDetails;
  /**
   * @param {string} code
   * @param {string} message
   * @param {RunErrorDetails} [details]
   */
  constructor(code: string, message: string, details: RunErrorDetails = {}) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

/**
 * @param {string} code
 * @param {string} message
 * @param {RunErrorDetails} [details]
 * @returns {never}
 */
function fail(code: string, message: string, details: RunErrorDetails = {}): never {
  throw new RunCliError(code, message, details);
}

/** @param {unknown} value @param {string} message @returns {asserts value} */
function requireRunValue(value: unknown, message: string): asserts value {
  if (!value) fail('GAP-VIDA-RUN-CONTEXT-001', message);
}

/** @template T @param {T | null | undefined} value @param {string} message @returns {T} */
function requireRunData<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined) fail('GAP-VIDA-RUN-CONTEXT-001', message);
  return value;
}

/** @param {unknown} value @param {string} message @returns {Record<string, unknown>} */
function requireRunRecord(value: unknown, message: string): Record<string, unknown> {
  if (!isRecord(value)) fail('GAP-VIDA-RUN-CONTEXT-001', message);
  return value;
}

/** @param {unknown} left @param {unknown} right @returns {boolean} */
function sameImplementationPaths(left: unknown, right: unknown): boolean {
  if (!isStringArray(left) || !isStringArray(right)) return false;
  return JSON.stringify([...left].sort(compareStrings)) === JSON.stringify([...right].sort(compareStrings));
}

/** @template {{lease?: {thread_id: string} | null}} Work @param {Work} work @param {string} nativeSessionHandle @returns {asserts work is Work & {lease: {thread_id: string}}} */
function requireCurrentLeaseOwner<Work extends { lease?: { thread_id: string } | null }>(
  work: Work,
  nativeSessionHandle: string,
): asserts work is Work & { lease: { thread_id: string } } {
  if (!work.lease || work.lease.thread_id !== nativeSessionHandle)
    fail('GAP-VIDA-RUN-CONTEXT-001', 'Lease renewal current owner lease is unavailable.');
}

/** @param {unknown} value @param {(value: unknown) => boolean} validate @returns {value is RenewalScope} */
function isValidatedRenewalScope(value: unknown, validate: (value: unknown) => boolean): value is RenewalScope {
  return validate(value) && isRenewalScope(value);
}

/** @param {unknown} revision @param {unknown} digest @returns {import('../src/host-state.ts').StateVersion | undefined} */
function readExpectedStateVersion(
  revision: unknown,
  digest: unknown,
): import('../src/host-state.ts').StateVersion | undefined {
  if (typeof revision !== 'string' || typeof digest !== 'string') return undefined;
  return { revision: Number(revision), digest };
}

/** @param {import('../src/orchestration/delivered-work-continuation.ts').DeliveredWorkContinuationAction} action @returns {asserts action is import('../src/orchestration/delivered-work-continuation.ts').HistoricalTerminalReviewAction} */
function requireHistoricalReviewAction(
  action: import('../src/orchestration/delivered-work-continuation.ts').DeliveredWorkContinuationAction,
): asserts action is import('../src/orchestration/delivered-work-continuation.ts').HistoricalTerminalReviewAction {
  if (action.kind !== 'historical_terminal_review')
    fail('GAP-VIDA-RUN-CONTEXT-001', 'Delivered-work continuation is not a historical review.');
}

/** @param {typeof import('../src/orchestration/workflow-session-reservation-contract.ts').workflowWorkItemSchema} schema @param {unknown} value @returns {WorkItem} */
function parseWorkflowWorkItem(
  schema: typeof import('../src/orchestration/workflow-session-reservation-contract.ts').workflowWorkItemSchema,
  value: unknown,
): WorkItem {
  if (!isRecord(value)) fail('GAP-VIDA-RUN-CONTEXT-001', 'Current admitted intake changed.');
  return schema.parse(value);
}

/** @param {typeof import('../src/orchestration/workflow-session-reservation-contract.ts').workflowWorkItemSchema} schema @param {unknown} value @returns {WorkItem} */
function parseAdmittedIntakeWorkItem(
  schema: typeof import('../src/orchestration/workflow-session-reservation-contract.ts').workflowWorkItemSchema,
  value: unknown,
): WorkItem {
  if (!isRecord(value)) fail('GAP-VIDA-RUN-CONTEXT-001', 'Current admitted intake changed.');
  return parseWorkflowWorkItem(schema, value.work_item);
}

/** @param {typeof import('../src/orchestration/workflow-session-reservation-contract.ts').workflowWorkItemSchema} schema @param {string} team @param {string} kindValue @param {string} intentValue @param {WorkItem | undefined} workItem @returns {Omit<WorkItemSelection, 'project'>} */
function workflowSelectionBase(
  schema: typeof import('../src/orchestration/workflow-session-reservation-contract.ts').workflowWorkItemSchema,
  team: string,
  kindValue: string,
  intentValue: string,
  workItem: WorkItem | undefined,
): Omit<WorkItemSelection, 'project'> {
  const kind = schema.shape.canonical_kind.safeParse(kindValue);
  if (!kind.success) throw Error('workflow selection work item kind is invalid');
  const intent = schema.shape.intent.safeParse(intentValue);
  if (!intent.success) throw Error('workflow selection intent is invalid');
  return {
    team,
    kind: kind.data,
    intent: intent.data,
    risk_flags: workItem?.risk_flags ?? [],
    labels: workItem?.labels ?? [],
  };
}

/** @param {import('../src/orchestration/persistent-session-handoff.ts').MastraLedgerItem['observation']} observation @returns {asserts observation is import('../src/orchestration/mastra-session-bridge.ts').SessionBridgeObservation & {status: 'reported_complete'}} */
function requireReportedCompleteObservation(
  observation: import('../src/orchestration/persistent-session-handoff.ts').MastraLedgerItem['observation'],
): asserts observation is import('../src/orchestration/mastra-session-bridge.ts').SessionBridgeObservation & {
  status: 'reported_complete';
} {
  if (!observation || observation.status !== 'reported_complete')
    fail('GAP-VIDA-RUN-CONTEXT-001', 'The current prewriter wave contains a failed or incomplete report.');
}

/** @param {import('../src/orchestration/persistent-session-handoff.ts').MastraSessionLedgerSnapshot['state']['corrective_execution']} correctiveExecution @returns {NonNullable<import('../src/orchestration/persistent-session-handoff.ts').MastraSessionLedgerSnapshot['state']['corrective_execution']> | undefined} */
function optionalCorrectiveExecution(
  correctiveExecution: import('../src/orchestration/persistent-session-handoff.ts').MastraSessionLedgerSnapshot['state']['corrective_execution'],
):
  | NonNullable<
      import('../src/orchestration/persistent-session-handoff.ts').MastraSessionLedgerSnapshot['state']['corrective_execution']
    >
  | undefined {
  return correctiveExecution ?? undefined;
}

/** @param {unknown} operation @param {string} workId @returns {boolean} */
function isCompletedReadonlyRelease(operation: unknown, workId: string): boolean {
  return (
    isRecord(operation) &&
    operation.work_id === workId &&
    operation.kind === 'release' &&
    typeof operation.operation_id === 'string' &&
    operation.operation_id.startsWith('completed-readonly-release-')
  );
}

type TaskSourceOperation = 'prepare' | 'inspect' | 'issue' | 'report' | 'recover';

type WorkIdentity = import('../src/host-state.ts').WorkIdentity;
type WorkItemSelection = import('../src/config/runtime-config.ts').WorkItemSelection;
type WorkItem = import('../src/runtime-kernel.ts').WorkExecutionContextRequest['workItem'];
type UnpreparedWorkRecoveryRequest = import('../src/host-state.ts').UnpreparedWorkRecoveryRequest;
type RecoveryReviewBinding = import('../src/host-state.ts').RecoveryReviewBinding;
type StateVersion = import('../src/host-state.ts').StateVersion;
type ScopedSourceSnapshot = import('../src/orchestration/scoped-source-snapshot.ts').ScopedSourceSnapshot;
type HistoricalOwnerSuspension = Parameters<
  typeof import('../src/orchestration/suspend-local-work.ts').inspectHistoricalOwnerWork
>[0];
type HistoricalOwnerPredicate =
  | 'completed_readonly'
  | 'unknown_readonly'
  | 'settled_writer_failed_validators'
  | 'unissued_prepared'
  | 'settled_research'
  | 'readonly_bookkeeping';
type HistoricalOwnerReleaseInspection = Record<string, unknown> & {
  expectedWork: StateVersion;
  expectedLedger: StateVersion;
  expectedJournal: StateVersion;
  expectedMaintenanceGeneration: number;
  baseline_binding: string;
  receipt_binding: string;
  current_config_binding: string;
  engine_binding: string;
  request_binding: string;
  preimage_binding: string | null;
  nativeSessionHandle: string;
};
type HistoricalOwnerReleaseRequest = {
  schema: string;
  identity: WorkIdentity;
  attempt: number;
  userRequestPointer: string;
  requestIntent: 'next_work' | 'linked_correction';
  predicate: HistoricalOwnerPredicate;
  preimage_ref?: string;
  inspection?: HistoricalOwnerReleaseInspection;
};
type InternalRecoveryReviewInput = Parameters<
  typeof import('./runtime-config-rebind.ts').openInternalRecoveryReview
>[0];
type RecoveryReviewExport = Omit<InternalRecoveryReviewInput, 'repositoryRoot'> & { observation?: unknown };
type CompletedReadonlyReleaseIdentity = WorkIdentity & { thread_id?: unknown };
type CompletedReadonlyReleaseRequest = {
  schema: 'CompletedReadonlyReleaseRequest/v1';
  workspace_id: string;
  identity: CompletedReadonlyReleaseIdentity;
  attempt: number;
  expectedWork: StateVersion;
  expectedLedger: StateVersion;
  expectedJournal: StateVersion;
  nativeSessionHandle: string;
  userRequestPointer: string;
  requestIntent: 'linked_correction' | 'next_work';
};
type ReadonlyReleaseEngineSnapshotRow = { workflow_name: string; snapshot: string };
type ReadonlyReleaseEngineWaveCandidate = { waveIndex: number | null; value: unknown };
type ReadonlyReleaseEngineWave = { waveIndex: number; value: unknown };
type ReadonlyReleaseEngineStepWave = ReadonlyReleaseEngineWave & { value: Record<string, unknown> };
type HostStoppedSourceCaptureInput = Parameters<
  import('../src/host-state.ts').HostStateStore['captureStoppedSourceObservation']
>[0];
type StoppedSourceCaptureRequest = Omit<HostStoppedSourceCaptureInput, 'verifyCurrent' | 'observation'> & {
  workspace_id: string;
  observation: StoppedSourceCaptureObservation;
};
type StoppedSourceCaptureObservation = NonNullable<HostStoppedSourceCaptureInput['observation']>;
type StoppedSourceCaptureTerminalEvidence = HostStoppedSourceCaptureInput['terminalEvidence'];
type StoppedSourceCaptureSnapshot = HostStoppedSourceCaptureInput['candidateSnapshot'];
type StoppedSourceCaptureEntry = StoppedSourceCaptureSnapshot['entries'][number];
type StoppedSourceCandidateReview = {
  actor_id: string;
  history_ref: string;
  tool_call_ref: string;
  verdict: string;
  candidate_binding: string;
  receipt_ref: string;
};
type StoppedSourceTerminalRecord = {
  schema: string;
  status: string;
  actor: string;
  action_id: string;
  issue_id: string | null;
  host_attempt_id: string;
  observation_ref: string;
  native_status?: unknown;
  source_turn_id?: unknown;
  final_message_id?: unknown;
  current_tmp_only_turn_id?: unknown;
  owner_thread_id?: unknown;
};
interface RunOptionValues {
  projects: string[];
  scope_paths: string[];
  project_root?: string | undefined;
  repository?: string | undefined;
  work_path?: string | undefined;
  team?: string | undefined;
  kind?: string | undefined;
  intent?: string | undefined;
  workflow?: string | undefined;
  work_id?: string | undefined;
  attempt?: string | undefined;
  scope_digest?: string | undefined;
  intake?: string | undefined;
  continuation?: string | undefined;
  inspect?: string | undefined;
  issue_wave?: string | undefined;
  recover_expired_lease?: string | undefined;
  renew_lease?: string | undefined;
  rebind_current_bundle?: string | undefined;
  native_session_handle?: string | undefined;
  lease_generation?: string | undefined;
  report?: string | undefined;
  correct?: string | undefined;
  prepare_assurance?: string | undefined;
  reconcile?: string | undefined;
  export_staged_witness?: string | undefined;
  payload_manifest_sha256?: string | undefined;
  expected_revision?: string | undefined;
  expected_digest?: string | undefined;
  task_source_operation?: string | undefined;
  task_source_request?: string | undefined;
  task_source_report?: string | undefined;
}

type RunScalarOptionField = keyof Omit<RunOptionValues, 'projects' | 'scope_paths'>;

type StandardRunOptions = Omit<
  RunOptionValues,
  | 'project_root'
  | 'repository'
  | 'work_path'
  | 'work_id'
  | 'attempt'
  | 'team'
  | 'kind'
  | 'intent'
  | 'workflow'
  | 'task_source_operation'
  | 'task_source_request'
> & {
  project_root: string;
  repository: string;
  work_path: string;
  work_id: string;
  attempt: string;
  team: string;
  kind: string;
  intent: string;
  workflow: string;
  task_source_operation?: undefined;
  task_source_request?: undefined;
};

type TaskSourceRunOptions = Omit<
  RunOptionValues,
  'project_root' | 'task_source_operation' | 'task_source_request' | 'projects' | 'scope_paths'
> & { project_root: string; task_source_operation: TaskSourceOperation; task_source_request: string };

type ParsedRunOptions = StandardRunOptions | TaskSourceRunOptions;
type RunIssuedAction = {
  request: import('../src/orchestration/mastra-session-bridge-contract.ts').SessionBridgeRequest;
  issue_id: string | null;
  host_attempt_id: string | undefined;
  instruction_activation?: unknown;
  instruction_bindings?: unknown;
  research_instruction_activation?: unknown;
  research_instruction_bindings?: unknown;
};

/** @param {unknown} value @returns {value is TaskSourceOperation} */
function isTaskSourceOperation(value: unknown): value is TaskSourceOperation {
  return typeof value === 'string' && runTaskSourceOperations.includes(value);
}

/** @param {ParsedRunOptions} value @returns {asserts value is StandardRunOptions} */
function assertStandardRunOptions(value: ParsedRunOptions): asserts value is StandardRunOptions {
  if (value.task_source_operation !== undefined) throw Error('Task source operation cannot enter standard run mode');
}

/** @param {import('../src/config/runtime-config.ts').AgentRuntimeConfig} config @param {string} workflowId @param {string} stageId @returns {boolean} */
function hasConfiguredDevelopmentStage(
  config: import('../src/config/runtime-config.ts').AgentRuntimeConfig,
  workflowId: string,
  stageId: string,
): boolean {
  const workflow = config.workflows[workflowId];
  return workflow !== undefined && workflow.stages.some((stage) => stage.id === stageId && stage.kind === 'develop');
}

/** @param {unknown} value @returns {value is 'low' | 'medium' | 'high'} */
function isLifecycleRisk(value: unknown): value is 'low' | 'medium' | 'high' {
  return value === 'low' || value === 'medium' || value === 'high';
}

/** @param {unknown} value @returns {value is {source_id: string}} */
function isResearchSourceReference(value: unknown): value is { source_id: string } {
  return isRecord(value) && typeof value.source_id === 'string';
}

type RenewalScope = Record<string, unknown> & {
  work_id: string;
  scope_id: string;
  source_revision: string;
  attribution: { thread_id: string };
  allowed_paths: string[];
  ac_ids: string[];
  implementation_paths: string[];
};

/** @param {unknown} value @returns {value is RenewalScope} */
function isRenewalScope(value: unknown): value is RenewalScope {
  return (
    isRecord(value) &&
    value.schema === 'ImplementationScope/v1' &&
    typeof value.work_id === 'string' &&
    typeof value.scope_id === 'string' &&
    typeof value.source_revision === 'string' &&
    isRecord(value.attribution) &&
    typeof value.attribution.thread_id === 'string' &&
    isStringArray(value.allowed_paths) &&
    isStringArray(value.ac_ids) &&
    isStringArray(value.implementation_paths)
  );
}

/** @param {string} key @returns {key is keyof typeof runScalarOptionFields} */
function isRunScalarOptionKey(key: string): key is keyof typeof runScalarOptionFields {
  return Object.hasOwn(runScalarOptionFields, key);
}

/** @param {string} key @returns {RunScalarOptionField | undefined} */
function runScalarFieldFor(key: string): RunScalarOptionField | undefined {
  if (isRunScalarOptionKey(key)) return runScalarOptionFields[key];
  return undefined;
}

/** @param {unknown} value @returns {value is string} */
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/** @param {string | undefined} value @returns {string} */
function runOptionKey(value: string | undefined): string {
  return value ?? '';
}

/** @param {unknown} value @returns {value is string} */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/** @param {string | undefined} value @param {string} flag @returns {string} */
/** @param {unknown} value @returns {value is WorkIdentity} */
function isWorkIdentity(value: unknown): value is WorkIdentity {
  return (
    exactKeys(value, ['repository_id', 'project_ids', 'integrations_digest', 'work_id']) &&
    typeof value.repository_id === 'string' &&
    isStringArray(value.project_ids) &&
    typeof value.integrations_digest === 'string' &&
    typeof value.work_id === 'string'
  );
}

/**
 * @param {unknown} value
 * @param {readonly string[]} keys
 * @returns {value is Record<string, unknown> & {identity: WorkIdentity, attempt: number, baselinePath: string, decisionPointer: string}}
 */
function isUnpreparedRecoveryEnvelope(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> & {
  identity: WorkIdentity;
  attempt: number;
  baselinePath: string;
  decisionPointer: string;
} {
  return (
    exactKeys(value, keys) &&
    isWorkIdentity(value.identity) &&
    typeof value.attempt === 'number' &&
    typeof value.baselinePath === 'string' &&
    typeof value.decisionPointer === 'string'
  );
}

/** @param {string} file @param {ReturnType<typeof lstatSync>} before @returns {void} */
function assertUnpreparedRecoveryHostStable(file: string, before: ReturnType<typeof lstatSync>): void {
  if (!before) throw Error('Unprepared recovery Host missing');
  const after = lstatSync(file);
  if (
    !after.isFile() ||
    after.isSymbolicLink() ||
    after.nlink !== 1 ||
    before.dev !== after.dev ||
    before.ino !== after.ino
  )
    throw Error('Unprepared recovery Host substituted');
}

/** @template T @param {T | null} operation @returns {T} */
function requireRecoveryOperation<T>(operation: T | null): T {
  if (operation === null) throw Error('Recovery review operation is unavailable');
  return operation;
}

/** @param {unknown} value @returns {value is string[]} */
function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

/** @param {unknown} value @returns {value is StateVersion} */
function isStateVersion(value: unknown): value is StateVersion {
  return exactKeys(value, ['revision', 'digest']) && typeof value.revision === 'number' && isString(value.digest);
}

/** @param {unknown} value @returns {value is ScopedSourceSnapshot['entries'][number]} */
function isScopedSourceEntry(value: unknown): value is ScopedSourceSnapshot['entries'][number] {
  return (
    exactKeys(value, ['path', 'exists', 'bytes', 'sha256']) &&
    isString(value.path) &&
    typeof value.exists === 'boolean' &&
    (value.bytes === null || typeof value.bytes === 'number') &&
    (value.sha256 === null || isString(value.sha256))
  );
}

/** @param {unknown} value @returns {value is ScopedSourceSnapshot} */
function isScopedSourceSnapshot(value: unknown): value is ScopedSourceSnapshot {
  return (
    exactKeys(value, ['schema', 'entries', 'digest']) &&
    value.schema === 'ScopedSourceSnapshot/v1' &&
    Array.isArray(value.entries) &&
    value.entries.every(isScopedSourceEntry) &&
    isString(value.digest)
  );
}

/** @param {unknown} value @returns {value is RecoveryReviewBinding} */
function isRecoveryReviewBinding(value: unknown): value is RecoveryReviewBinding {
  return (
    exactKeys(value, [
      'identity',
      'attempt',
      'callerSession',
      'controllerId',
      'userInstructionRef',
      'historicalOwner',
      'expectedWork',
      'expectedLedger',
      'expectedJournal',
      'maintenanceGeneration',
      'source',
      'context',
    ]) &&
    isWorkIdentity(value.identity) &&
    typeof value.attempt === 'number' &&
    isRecoveryReviewOwner(value) &&
    isRecoveryReviewVersions(value) &&
    typeof value.maintenanceGeneration === 'number' &&
    isScopedSourceSnapshot(value.source) &&
    isRecord(value.context)
  );
}

/** @param {Record<string, unknown>} value @returns {boolean} */
function isRecoveryReviewOwner(value: Record<string, unknown>): boolean {
  return (
    isString(value.callerSession) &&
    isString(value.controllerId) &&
    isString(value.userInstructionRef) &&
    isString(value.historicalOwner)
  );
}

/** @param {Record<string, unknown>} value @returns {boolean} */
function isRecoveryReviewVersions(value: Record<string, unknown>): boolean {
  return (
    isStateVersion(value.expectedWork) && isStateVersion(value.expectedLedger) && isStateVersion(value.expectedJournal)
  );
}

/** @param {unknown} value @returns {value is 'prepare' | 'begin' | 'complete' | 'inspect'} */
function isRecoveryReviewMode(value: unknown): value is 'prepare' | 'begin' | 'complete' | 'inspect' {
  return value === 'prepare' || value === 'begin' || value === 'complete' || value === 'inspect';
}

/** @param {unknown} value @param {readonly string[]} keys @param {boolean} requestRequired @param {boolean} observationRequired @returns {value is RecoveryReviewExport} */
function isRecoveryReviewExport(
  value: unknown,
  keys: readonly string[],
  requestRequired: boolean,
  observationRequired: boolean,
): value is RecoveryReviewExport {
  if (!isRecord(value) || !exactKeys(value, keys) || !isRecoveryReviewExportIdentity(value)) return false;
  return isRecoveryReviewOptionalFields(value, requestRequired, observationRequired);
}

/** @param {Record<string, unknown>} value @param {boolean} requestRequired @param {boolean} observationRequired @returns {boolean} */
function isRecoveryReviewOptionalFields(
  value: Record<string, unknown>,
  requestRequired: boolean,
  observationRequired: boolean,
): boolean {
  return (
    (!requestRequired || isRecoveryReviewBinding(value.request)) &&
    (!observationRequired || Boolean(value.observation)) &&
    (!hasRecoveryReviewOriginalContexts(value) || isNonEmptyArray(value.originalContexts)) &&
    (!Object.hasOwn(value, 'request') || isRecoveryReviewBinding(value.request))
  );
}

/** @param {Record<string, unknown>} value @returns {boolean} */
function isRecoveryReviewExportIdentity(value: Record<string, unknown>): boolean {
  return (
    isWorkIdentity(value.identity) &&
    typeof value.attempt === 'number' &&
    isString(value.baselinePath) &&
    isString(value.callerSession) &&
    isString(value.controllerId) &&
    isString(value.userInstructionRef)
  );
}

/** @param {unknown} value @returns {boolean} */
function hasRecoveryReviewOriginalContexts(value: unknown): boolean {
  return isRecord(value) && Object.hasOwn(value, 'originalContexts');
}

/** @param {unknown} value @returns {value is unknown[]} */
function isNonEmptyArray(value: unknown): value is unknown[] {
  return Array.isArray(value) && value.length > 0;
}

/** @param {unknown} value @returns {value is HistoricalOwnerReleaseInspection} */
function isHistoricalOwnerReleaseInspection(value: unknown): value is HistoricalOwnerReleaseInspection {
  return isHistoricalOwnerReleaseInspectionVersions(value) && isHistoricalOwnerReleaseInspectionBindings(value);
}

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isHistoricalOwnerReleaseInspectionVersions(value: unknown): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    isStateVersion(value.expectedWork) &&
    isStateVersion(value.expectedLedger) &&
    isStateVersion(value.expectedJournal) &&
    typeof value.expectedMaintenanceGeneration === 'number'
  );
}

/** @param {unknown} value @returns {value is HistoricalOwnerReleaseInspection} */
function isHistoricalOwnerReleaseInspectionBindings(value: unknown): value is HistoricalOwnerReleaseInspection {
  return (
    isRecord(value) &&
    isString(value.baseline_binding) &&
    isString(value.receipt_binding) &&
    isString(value.current_config_binding) &&
    isString(value.engine_binding) &&
    isString(value.request_binding) &&
    (value.preimage_binding === null || isString(value.preimage_binding)) &&
    isString(value.nativeSessionHandle)
  );
}

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isHistoricalOwnerReleaseHeader(value: unknown): value is Record<string, unknown> {
  return isHistoricalOwnerReleaseHeaderIdentity(value) && isHistoricalOwnerReleaseHeaderPredicate(value);
}

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isHistoricalOwnerReleaseHeaderIdentity(value: unknown): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    isWorkIdentity(value.identity) &&
    typeof value.attempt === 'number' &&
    isString(value.userRequestPointer)
  );
}

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isHistoricalOwnerReleaseHeaderPredicate(value: unknown): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    (value.requestIntent === 'next_work' || value.requestIntent === 'linked_correction') &&
    (value.predicate === 'completed_readonly' ||
      value.predicate === 'unknown_readonly' ||
      value.predicate === 'settled_writer_failed_validators' ||
      value.predicate === 'unissued_prepared' ||
      value.predicate === 'settled_research' ||
      value.predicate === 'readonly_bookkeeping')
  );
}

/** @param {unknown} predicate @param {readonly string[]} predicates @returns {predicate is string} */
function isHistoricalReleasePredicate(predicate: unknown, predicates: readonly string[]): predicate is string {
  return isString(predicate) && predicates.includes(predicate);
}

/** @param {unknown} value @param {string} schema @param {readonly string[]} predicates @param {'inspect' | 'apply'} mode @returns {value is HistoricalOwnerReleaseRequest} */
function isHistoricalOwnerReleaseRequest(
  value: unknown,
  schema: string,
  predicates: readonly string[],
  mode: 'inspect' | 'apply',
): value is HistoricalOwnerReleaseRequest {
  if (!isHistoricalOwnerReleaseHeader(value)) return false;
  const writer = value.predicate === 'settled_writer_failed_validators';
  const keys = [
    'schema',
    'identity',
    'attempt',
    'userRequestPointer',
    'requestIntent',
    'predicate',
    ...(writer ? ['preimage_ref'] : []),
    ...(mode === 'apply' ? ['inspection'] : []),
  ];
  return (
    exactKeys(value, keys) &&
    value.schema === schema &&
    isHistoricalReleasePredicate(value.predicate, predicates) &&
    (!writer || isString(value.preimage_ref)) &&
    (mode === 'inspect' || isHistoricalOwnerReleaseInspection(value.inspection))
  );
}

/** @param {boolean} readonlyBookkeeping @param {boolean} settledResearch @param {boolean} unissuedOwner @returns {{schema: string, predicates: string[]}} */
function historicalOwnerReleaseContract(
  readonlyBookkeeping: boolean,
  settledResearch: boolean,
  unissuedOwner: boolean,
): { schema: string; predicates: string[] } {
  return {
    schema: readonlyBookkeeping
      ? 'ReadonlyBookkeepingOwnerReleaseRequest/v1'
      : settledResearch
        ? 'SettledResearchOwnerReleaseRequest/v1'
        : unissuedOwner
          ? 'UnissuedOwnerReleaseRequest/v1'
          : 'HistoricalOwnerReleaseRequest/v1',
    predicates: readonlyBookkeeping
      ? ['readonly_bookkeeping']
      : settledResearch
        ? ['settled_research']
        : unissuedOwner
          ? ['unissued_prepared']
          : ['completed_readonly', 'unknown_readonly', 'settled_writer_failed_validators'],
  };
}

/** @param {string} source @param {string} schema @param {readonly string[]} predicates @param {'inspect' | 'apply'} mode @returns {HistoricalOwnerReleaseRequest} */
function parseHistoricalOwnerReleaseRequest(
  source: string,
  schema: string,
  predicates: readonly string[],
  mode: 'inspect' | 'apply',
): HistoricalOwnerReleaseRequest {
  /** @type {unknown} */
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    throw Error('Historical release request shape or predicate invalid');
  }
  if (!isHistoricalOwnerReleaseRequest(value, schema, predicates, mode))
    throw Error('Historical release request shape or predicate invalid');
  return value;
}

/** @param {'inspect' | 'apply'} mode @param {HistoricalOwnerReleaseInspection | undefined} supplied @param {HistoricalOwnerReleaseInspection} current @returns {HistoricalOwnerReleaseInspection} */
function historicalReleaseInspection(
  mode: 'inspect' | 'apply',
  supplied: HistoricalOwnerReleaseInspection | undefined,
  current: HistoricalOwnerReleaseInspection,
): HistoricalOwnerReleaseInspection {
  if (mode === 'apply' && supplied) return supplied;
  return current;
}

/** @param {unknown} value @returns {value is {schema: 'VidaAgentRunResult/v1', next_actions: unknown[]}} */
function isHistoricalRunHistory(value: unknown): value is { schema: 'VidaAgentRunResult/v1'; next_actions: unknown[] } {
  return isRecord(value) && value.schema === 'VidaAgentRunResult/v1' && isUnknownArray(value.next_actions);
}

/** @param {string} value @returns {value is 'inspect' | 'apply'} */
function isHistoricalReleaseMode(value: string): value is 'inspect' | 'apply' {
  return value === 'inspect' || value === 'apply';
}

/** @param {unknown} value @returns {value is Record<string, unknown> & {schema: 'ConfiguredContext/v1', digest: string}} */
function isHistoricalConfiguredContext(
  value: unknown,
): value is Record<string, unknown> & { schema: 'ConfiguredContext/v1'; digest: string } {
  return isRecord(value) && value.schema === 'ConfiguredContext/v1' && isString(value.digest);
}

/** @param {readonly unknown[]} actions @returns {Array<Record<string, unknown> & {schema: 'ConfiguredContext/v1', digest: string}>} */
function historicalConfiguredContexts(
  actions: readonly unknown[],
): Array<Record<string, unknown> & { schema: 'ConfiguredContext/v1'; digest: string }> {
  return actions.flatMap((action) => {
    if (!isRecord(action) || !isHistoricalConfiguredContext(action.configured_context)) return [];
    return [action.configured_context];
  });
}

/** @template T @param {T | undefined} value @returns {T} */
function requireHistoricalItem<T>(value: T | undefined): T {
  if (value === undefined) throw Error('Historical context history action differs');
  return value;
}

/** @param {unknown} value @param {(candidate: unknown) => candidate is string} relative @returns {value is ScopedSourceSnapshot} */
function isHistoricalScopedSnapshot(
  value: unknown,
  relative: (candidate: unknown) => candidate is string,
): value is ScopedSourceSnapshot {
  if (
    !isRecord(value) ||
    !exactKeys(value, ['digest', 'entries', 'schema']) ||
    value.schema !== 'ScopedSourceSnapshot/v1'
  )
    return false;
  if (!isNonEmptyArray(value.entries) || value.entries.length > 512) return false;
  let prior;
  for (const raw of value.entries) {
    if (!isHistoricalScopedEntry(raw, relative, prior)) return false;
    prior = raw.path;
  }
  return isString(value.digest);
}

/** @param {unknown} value @param {(candidate: unknown) => candidate is string} relative @param {string | undefined} prior @returns {value is Record<string, unknown> & {path: string}} */
function isHistoricalScopedEntry(
  value: unknown,
  relative: (candidate: unknown) => candidate is string,
  prior: string | undefined,
): value is Record<string, unknown> & { path: string } {
  if (!isHistoricalScopedEntryPath(value, relative, prior)) return false;
  if (value.exists) return isHistoricalPresentScopedEntry(value);
  return value.bytes === null && value.sha256 === null;
}

/** @param {unknown} value @param {(candidate: unknown) => candidate is string} relative @param {string | undefined} prior @returns {value is Record<string, unknown> & {path: string}} */
function isHistoricalScopedEntryPath(
  value: unknown,
  relative: (candidate: unknown) => candidate is string,
  prior: string | undefined,
): value is Record<string, unknown> & { path: string } {
  return (
    isRecord(value) &&
    exactKeys(value, ['bytes', 'exists', 'path', 'sha256']) &&
    relative(value.path) &&
    value.path.length <= 512 &&
    (prior === undefined || prior < value.path) &&
    typeof value.exists === 'boolean'
  );
}

/** @param {Record<string, unknown>} value @returns {boolean} */
function isHistoricalPresentScopedEntry(value: Record<string, unknown>): boolean {
  return (
    Number.isSafeInteger(value.bytes) &&
    typeof value.bytes === 'number' &&
    value.bytes >= 0 &&
    isString(value.sha256) &&
    /^[a-f0-9]{64}$/.test(value.sha256)
  );
}

/** @param {readonly string[]} args @param {number} index @returns {string} */
function requireReadonlyReleaseArg(args: readonly string[], index: number): string {
  const value = args[index];
  if (value === undefined) throw Error('Readonly release requires mode, exact root and request');
  return value;
}

/** @param {unknown} value @returns {unknown} */
function readonlyReleaseThreadId(value: unknown): unknown {
  return isRecord(value) ? value.thread_id : undefined;
}

/** @param {unknown} value @returns {value is CompletedReadonlyReleaseRequest} */
function isCompletedReadonlyReleaseRequest(value: unknown): value is CompletedReadonlyReleaseRequest {
  return (
    isCompletedReadonlyReleaseContext(value) &&
    isCompletedReadonlyReleaseIdentity(value.identity) &&
    isCompletedReadonlyReleaseCas(value) &&
    isCompletedReadonlyReleaseIntent(value)
  );
}

/** @param {unknown} value @returns {value is Record<string, unknown> & {workspace_id: string, attempt: number}} */
function isCompletedReadonlyReleaseContext(
  value: unknown,
): value is Record<string, unknown> & { workspace_id: string; attempt: number } {
  return (
    isRecord(value) &&
    value.schema === 'CompletedReadonlyReleaseRequest/v1' &&
    isString(value.workspace_id) &&
    typeof value.attempt === 'number'
  );
}

/** @param {unknown} value @returns {value is CompletedReadonlyReleaseIdentity} */
function isCompletedReadonlyReleaseIdentity(value: unknown): value is CompletedReadonlyReleaseIdentity {
  return (
    isRecord(value) &&
    isString(value.repository_id) &&
    isStringArray(value.project_ids) &&
    isString(value.integrations_digest) &&
    isString(value.work_id)
  );
}

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isCompletedReadonlyReleaseCas(value: unknown): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    isStateVersion(value.expectedWork) &&
    isStateVersion(value.expectedLedger) &&
    isStateVersion(value.expectedJournal)
  );
}

/** @param {unknown} value @returns {value is CompletedReadonlyReleaseRequest} */
function isCompletedReadonlyReleaseIntent(value: unknown): value is CompletedReadonlyReleaseRequest {
  return (
    isRecord(value) &&
    isString(value.nativeSessionHandle) &&
    isString(value.userRequestPointer) &&
    (value.requestIntent === 'linked_correction' || value.requestIntent === 'next_work')
  );
}

/** @param {ReturnType<typeof openCliWorkspaceDatabase>} database @param {string} runId @returns {unknown} */
function readReadonlyReleaseSnapshotRows(
  database: ReturnType<typeof openCliWorkspaceDatabase>,
  runId: string,
): unknown {
  return database
    .query('SELECT workflow_name,json(snapshot) AS snapshot FROM mastra_workflow_snapshot WHERE run_id=?')
    .all(runId);
}

/** @param {unknown} value @returns {value is {schema: string, request_digest: string}} */
function isReadonlyReleasePlan(value: unknown): value is { schema: string; request_digest: string } {
  return isRecord(value) && isString(value.schema) && isString(value.request_digest);
}

/** @param {unknown} value @returns {value is ReadonlyReleaseEngineSnapshotRow[]} */
function isReadonlyReleaseSnapshotRows(value: unknown): value is ReadonlyReleaseEngineSnapshotRow[] {
  return (
    isUnknownArray(value) &&
    value.every((row) => isRecord(row) && isString(row.workflow_name) && isString(row.snapshot))
  );
}

/** @param {ReadonlyReleaseEngineSnapshotRow[]} rows @returns {ReadonlyReleaseEngineSnapshotRow} */
function requireOnlyReadonlyReleaseSnapshotRow(
  rows: ReadonlyReleaseEngineSnapshotRow[],
): ReadonlyReleaseEngineSnapshotRow {
  if (rows.length !== 1 || !rows[0]) throw Error('Readonly release original engine missing/ambiguous');
  return rows[0];
}

/** @template T @param {readonly T[]} values @returns {T} */
function requireFirstReadonlyReleaseValue<T>(values: readonly T[]): T {
  const value = values[0];
  if (value === undefined) throw Error('Readonly release actual engine frontier differs');
  return value;
}

/** @template T @param {readonly T[]} values @returns {T} */
function requireOneReadonlyReleaseMatch<T>(values: readonly T[]): T {
  if (values.length !== 1 || values[0] === undefined) throw Error('Readonly release actual engine completion differs');
  return values[0];
}

/** @param {string} text @returns {unknown} */
function parseReadonlyReleaseEngineSnapshot(text: string): unknown {
  return JSON.parse(text);
}

/** @param {unknown} value @returns {value is Record<string, unknown> & {context: Record<string, unknown>}} */
function isReadonlyReleaseEngineSnapshot(
  value: unknown,
): value is Record<string, unknown> & { context: Record<string, unknown> } {
  return isRecord(value) && isRecord(value.context);
}

/** @param {unknown} value @returns {value is ReadonlyReleaseEngineWave} */
function isReadonlyReleaseEngineWave(value: unknown): value is ReadonlyReleaseEngineWave {
  return isRecord(value) && typeof value.waveIndex === 'number';
}

/** @param {ReadonlyReleaseEngineWave} value @returns {value is ReadonlyReleaseEngineStepWave} */
function isReadonlyReleaseSuspendedWave(value: ReadonlyReleaseEngineWave): value is ReadonlyReleaseEngineStepWave {
  return isRecord(value.value) && value.value.status === 'suspended';
}

/** @param {ReadonlyReleaseEngineWave} value @returns {value is ReadonlyReleaseEngineStepWave} */
function isReadonlyReleaseSuccessfulWave(value: ReadonlyReleaseEngineWave): value is ReadonlyReleaseEngineStepWave {
  return isRecord(value.value) && value.value.status === 'success';
}

/** @template T @param {unknown} values @param {(value: unknown) => T} parse @returns {T[]} */
function parseReadonlyReleaseArray<T>(values: unknown, parse: (value: unknown) => T): T[] {
  if (!isUnknownArray(values)) throw Error('Readonly release actual engine completion differs');
  return values.map((value) => parse(value));
}

/** @param {unknown} value @returns {value is Record<string, unknown> & {suspendPayload: {requests: unknown[]}}} */
function isReadonlyReleaseFrontierStep(
  value: unknown,
): value is Record<string, unknown> & { suspendPayload: { requests: unknown[] } } {
  return (
    isRecord(value) &&
    Object.hasOwn(value, 'payload') &&
    Object.hasOwn(value, 'suspendPayload') &&
    isRecord(value.suspendPayload) &&
    isUnknownArray(value.suspendPayload.requests)
  );
}

/** @param {unknown} value @param {string} flag @returns {string} */
function requireOption(value: unknown, flag: string): string {
  if (typeof value !== 'string' || value.length === 0)
    fail('GAP-VIDA-RUN-CLI-001', `Required launcher option ${flag} is missing.`);
  return value;
}

/** @param {string[]} args @returns {ParsedRunOptions} */
function parseArgs(args: string[]): ParsedRunOptions {
  const allowed = new Set<string>([...Object.keys(runScalarOptionFields), ...runRepeatedOptions]);
  /** @type {RunOptionValues} */
  const values: RunOptionValues = { projects: [], scope_paths: [] };
  for (let index = 0; index < args.length; index += 2) {
    const key = runOptionKey(args[index]);
    const value = args[index + 1];
    const field = runScalarFieldFor(key);
    if (!allowed.has(key) || !isNonEmptyString(value) || (field !== undefined && Object.hasOwn(values, field)))
      fail(
        'GAP-VIDA-RUN-CLI-001',
        'Usage: run.mjs --project-root ABSOLUTE_PATH --repository ID --project ID --work-path RELATIVE_PATH --work-id ID --attempt NUMBER --scope-digest SHA256 --team ID --kind KIND --intent INTENT --workflow WORKFLOW_ID [--recover-expired-lease true --native-session-handle HANDLE --lease-generation NUMBER --expected-revision NUMBER --expected-digest SHA256]',
      );
    if (key === '--project') values.projects.push(value);
    else if (key === '--scope-path') values.scope_paths.push(value);
    else {
      if (field === undefined) fail('GAP-VIDA-RUN-CLI-001', 'Unsupported launcher option.');
      values[field] = key === '--project-root' && path.isAbsolute(value) ? path.resolve(value) : value;
    }
  }
  if (values.task_source_operation !== undefined || values.task_source_request !== undefined) {
    const unrelated = Object.keys(values).filter(
      (key) =>
        ![
          'projects',
          'scope_paths',
          'project_root',
          'task_source_operation',
          'task_source_request',
          'task_source_report',
        ].includes(key),
    );
    const projectRoot = values.project_root;
    const operation = values.task_source_operation;
    const request = values.task_source_request;
    if (
      unrelated.length > 0 ||
      values.projects.length > 0 ||
      values.scope_paths.length > 0 ||
      !projectRoot ||
      !path.isAbsolute(projectRoot) ||
      path.resolve(projectRoot) !== projectRoot ||
      !isTaskSourceOperation(operation) ||
      !request ||
      (operation === 'report' ? !values.task_source_report : values.task_source_report !== undefined)
    )
      fail(
        'GAP-VIDA-RUN-CLI-001',
        'Task source operations require --project-root ABSOLUTE_PATH, --task-source-operation prepare|inspect|issue|report|recover and --task-source-request RELATIVE_PATH; report also requires --task-source-report RELATIVE_PATH.',
      );
    return Object.freeze({
      project_root: projectRoot,
      task_source_operation: operation,
      task_source_request: request,
      ...(values.task_source_report ? { task_source_report: values.task_source_report } : {}),
    });
  }
  const requiredPresent = runRequiredFields.map((field) => values[field]);
  const deriveScope =
    values.scope_paths.length > 0 &&
    !values.recover_expired_lease &&
    !values.renew_lease &&
    !values.issue_wave &&
    !values.report &&
    !values.reconcile &&
    !values.inspect &&
    !values.continuation &&
    !values.export_staged_witness;
  if (requiredPresent.some((value) => !value) || values.projects.length < 1 || (!values.scope_digest && !deriveScope))
    fail('GAP-VIDA-RUN-CLI-001', 'All launcher arguments are required.');
  const projectRoot = requireOption(values.project_root, '--project-root');
  const repository = requireOption(values.repository, '--repository');
  const workId = requireOption(values.work_id, '--work-id');
  const attempt = requireOption(values.attempt, '--attempt');
  const changing = runChangingFields.some((field) => Boolean(values[field]));
  const exporting = Boolean(values.export_staged_witness || values.payload_manifest_sha256);
  if (
    runChangingFields.filter((field) => Boolean(values[field])).length > 1 ||
    (values.issue_wave && values.issue_wave !== 'true') ||
    (values.recover_expired_lease &&
      (values.recover_expired_lease !== 'true' ||
        values.rebind_current_bundle !== 'true' ||
        !values.native_session_handle ||
        !/^[1-9][0-9]*$/.test(values.lease_generation ?? '') ||
        !Number.isSafeInteger(Number(values.lease_generation)) ||
        values.native_session_handle.length > 256 ||
        /\p{Cc}/u.test(values.native_session_handle))) ||
    (!values.recover_expired_lease &&
      !values.renew_lease &&
      (values.native_session_handle || values.lease_generation)) ||
    (!values.recover_expired_lease && values.rebind_current_bundle) ||
    (values.renew_lease &&
      (values.renew_lease !== 'true' ||
        !values.native_session_handle ||
        !/^[1-9][0-9]*$/.test(values.lease_generation ?? '') ||
        !Number.isSafeInteger(Number(values.lease_generation)) ||
        values.native_session_handle.length > 256 ||
        /\p{Cc}/u.test(values.native_session_handle))) ||
    changing !== Boolean(values.expected_revision && values.expected_digest) ||
    (!changing && (values.expected_revision || values.expected_digest)) ||
    (changing &&
      (!/^[1-9][0-9]*$/.test(values.expected_revision ?? '') ||
        !Number.isSafeInteger(Number(values.expected_revision)) ||
        !/^[a-f0-9]{64}$/.test(values.expected_digest ?? ''))) ||
    [values.report, values.correct, values.prepare_assurance, values.reconcile]
      .filter(isString)
      .some(isNonCanonicalAbsolutePath) ||
    (exporting &&
      (changing ||
        values.intake ||
        values.scope_paths.length > 0 ||
        !/^[a-z0-9][a-z0-9._-]{0,79}$/.test(values.export_staged_witness ?? '') ||
        !/^[a-f0-9]{64}$/.test(values.payload_manifest_sha256 ?? ''))) ||
    (values.intake && (changing || !path.isAbsolute(values.intake) || path.resolve(values.intake) !== values.intake)) ||
    (values.continuation &&
      (changing ||
        !values.intake ||
        !path.isAbsolute(values.continuation) ||
        path.resolve(values.continuation) !== values.continuation)) ||
    (values.inspect &&
      (values.inspect !== 'true' ||
        changing ||
        values.intake ||
        values.continuation ||
        exporting ||
        values.scope_paths.length > 0))
  )
    fail(
      'GAP-VIDA-RUN-CLI-001',
      'Mutation modes require one mode and an exact expected state version; renewal also requires the current owner and lease generation.',
    );
  if (!path.isAbsolute(projectRoot) || path.resolve(projectRoot) !== projectRoot)
    fail('GAP-VIDA-RUN-CLI-002', 'The project root must be one canonical absolute path.');
  let identity;
  try {
    identity = lstatSync(projectRoot);
    if (!identity.isDirectory() || identity.isSymbolicLink() || realpathSync(projectRoot) !== projectRoot)
      fail('GAP-VIDA-RUN-CLI-004', 'The project root must be an existing canonical directory.');
  } catch (error) {
    if (nodeErrorCode(error)?.startsWith('GAP-VIDA-RUN-')) throw error;
    fail('GAP-VIDA-RUN-CLI-004', 'The project root must be an existing canonical directory.');
  }
  if (![repository, ...values.projects].every((value) => /^[a-z0-9][a-z0-9-]{0,127}$/.test(value)))
    fail('GAP-VIDA-RUN-CLI-003', 'Repository and project must be valid lowercase identifiers.');
  if (
    !/^[a-z0-9][a-z0-9-]{0,127}$/.test(workId) ||
    !/^[1-9][0-9]*$/.test(attempt) ||
    !Number.isSafeInteger(Number(attempt)) ||
    (values.scope_digest ? !/^[a-f0-9]{64}$/.test(values.scope_digest) : !deriveScope)
  )
    fail('GAP-VIDA-RUN-CLI-003', 'Work attempt and scope must be valid explicit identifiers.');
  values.projects = [...new Set(values.projects)].sort();
  if (values.scope_paths.length > 512 || new Set(values.scope_paths).size !== values.scope_paths.length)
    fail('GAP-VIDA-RUN-CLI-003', 'Scope paths must be unique and bounded.');
  const {
    task_source_operation: _taskSourceOperation,
    task_source_request: _taskSourceRequest,
    task_source_report: _taskSourceReport,
    ...standardValues
  } = values;
  return Object.freeze({
    ...standardValues,
    project_root: projectRoot,
    repository,
    work_path: requireOption(values.work_path, '--work-path'),
    work_id: workId,
    attempt,
    team: requireOption(values.team, '--team'),
    kind: requireOption(values.kind, '--kind'),
    intent: requireOption(values.intent, '--intent'),
    workflow: requireOption(values.workflow, '--workflow'),
  });
}

/** @type {Readonly<Record<string, string>>} */
const publicMessages: Readonly<Record<string, string>> = Object.freeze({
  'GAP-VIDA-RUN-CLI-001': 'Launcher arguments are incomplete or contain an unsupported option.',
  'GAP-VIDA-RUN-CLI-002': 'The project root is not a canonical absolute path.',
  'GAP-VIDA-RUN-CLI-003': 'Repository and project must be valid lowercase identifiers.',
  'GAP-VIDA-RUN-CLI-004': 'The project root is unavailable or is not a canonical directory.',
  'GAP-VIDA-RUN-BUN-001': 'The pinned Bun runtime requirement was not satisfied.',
  'GAP-VIDA-RUN-CONTEXT-001': 'The requested project context could not be bound.',
  'GAP-VIDA-RUN-WORKFLOW-001': 'The requested workflow is not configured for this selection.',
  'GAP-VIDA-RUN-SELECTOR-001': 'The active runtime selector or cutover journal is invalid.',
  'GAP-VIDA-RUN-CUTOFF-001': 'The new-work cutoff witness could not be recorded.',
  'GAP-VIDA-RUN-REPORT-001': 'The session report is missing, unsafe, oversized, or invalid JSON.',
  'GAP-VIDA-RUN-TASK-SOURCE-001': 'The task source operation could not be prepared or inspected.',
});
const publicCodes = new Set(Object.keys(publicMessages));

/** @param {unknown} error */
/** @param {unknown} error @returns {string} */
function publicErrorMessage(error: unknown): string {
  return error !== null && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
    ? error.message
    : '';
}

/** @param {unknown} error @returns {string} */
function publicCodeForError(error: unknown): string {
  const candidateCode = nodeErrorCode(error);
  return candidateCode && publicCodes.has(candidateCode) ? candidateCode : 'GAP-VIDA-RUN-EXECUTION-001';
}

/** @param {unknown} error */
function publicFailure(error: unknown) {
  const code = publicCodeForError(error);
  // Classify only known validation language. Never expose caller messages, paths,
  // credentials or stack traces through the public diagnostic envelope.
  /** @type {Array<[RegExp, string, string, string]>} */
  const reasons: Array<[RegExp, string, string, string]> = [
    [
      /failed prewriter (?:owner )?recovery:|issued writer outcome must settle before expired lease recovery|issued writer-bound wave must advance before expired lease recovery|expired recovery requires an entirely unissued (?:current )?wave/,
      'current wave is outside the supported lease-recovery contract',
      'recovery eligibility',
      'Preserve the current reports and use a supported same-attempt wave disposition; do not repeat lease recovery.',
    ],
    [
      /lease.*expired|expired.*lease/i,
      'ownership lease expired',
      'lease recovery',
      'Inspect the work and recover its exact expired lease before continuing.',
    ],
    [
      /CAS|revision changed|version changed/i,
      'current state revision changed',
      'state validation',
      'Inspect the work and retry the uncommitted operation with its returned state version.',
    ],
    [
      /source.*changed|runtime code changed|source.*differs/i,
      'bound source changed',
      'source validation',
      'Inspect the work and use the supported current-source continuation or recovery operation.',
    ],
    [
      /summary|research.*artifact|synthesis.*field|AC IDs|source-backed|evidence references/i,
      'observed artifact does not satisfy its current contract',
      'observation validation',
      'Check the issued output contract and accepted trace IDs; preserve the actual observation and inspect before resubmission.',
    ],
    [
      /configured context|initialization|project context|configuration.*stale/i,
      'configured context is unavailable or stale',
      'context binding',
      'Inspect project initialization and configured package resources before continuing.',
    ],
    [
      /owner|ownership|foreign|ticket|claim|FIFO/i,
      'current ownership boundary rejected the operation',
      'ownership validation',
      'Inspect the exact work and conflicting resource ownership; do not repeat a source action.',
    ],
  ];
  const message = publicErrorMessage(error);
  // The CLI code owns malformed-argument output. Parser usage text can contain
  // unrelated lease, revision or source flags and must not override that contract.
  const reason = code.startsWith('GAP-VIDA-RUN-CLI-')
    ? undefined
    : reasons.find(([pattern]) => pattern instanceof RegExp && pattern.test(message));
  return {
    schema: 'VidaAgentRunResult/v1',
    status: 'blocked',
    code,
    message: reason
      ? `Phase: ${reason[2]}. Reason: ${reason[1]}. Next action: ${reason[3]}`
      : `${publicMessages[code] ?? 'The requested run was blocked by runtime validation.'} Next action: inspect the exact work and check its issued contract before retrying.`,
  };
}

interface LocalSessionIntake {
  schema: 'VidaLocalSessionIntake/v1';
  native_session_handle: string;
  work_item: {
    schema: 'WorkItem/v1';
    id: string;
    provider: string;
    provider_type: string;
    canonical_kind: string;
    intent: string;
    project_id: string;
    title: string;
    description: string;
    labels: string[];
    risk_flags: string[];
  };
  scope_path: string;
  acceptance_path: string;
  source_authorization_path?: string | undefined;
  runtime_code_paths: string[];
  route: 'R1' | 'R2' | 'R3' | 'R4';
  risk: 'low' | 'medium' | 'high';
  change_kind: 'feature' | 'fix' | 'refactor' | 'migration' | 'documentation' | 'incident';
}

/** @param {string} file @returns {Promise<LocalSessionIntake>} */
async function readLocalSessionIntake(file: string): Promise<LocalSessionIntake> {
  const { z } = await import('zod');
  const schema = z
    .object({
      schema: z.literal('VidaLocalSessionIntake/v1'),
      native_session_handle: z.string().min(1).max(256),
      work_item: z
        .object({
          schema: z.literal('WorkItem/v1'),
          id: z.string().min(1),
          provider: z.string().min(1),
          provider_type: z.string().min(1),
          canonical_kind: z.string().min(1),
          intent: z.string().min(1),
          project_id: z.string().min(1),
          title: z.string().min(1),
          description: z.string(),
          labels: z.array(z.string()),
          risk_flags: z.array(z.string()),
        })
        .strict(),
      scope_path: z.string().min(1),
      acceptance_path: z.string().min(1),
      source_authorization_path: z.string().min(1).optional(),
      runtime_code_paths: z.array(z.string().min(1)).min(1).max(512),
      route: z.enum(['R1', 'R2', 'R3', 'R4']),
      risk: z.enum(['low', 'medium', 'high']),
      change_kind: z.enum(['feature', 'fix', 'refactor', 'migration', 'documentation', 'incident']),
    })
    .strict();
  try {
    return schema.parse(readBoundedReport(file));
  } catch {
    fail('GAP-VIDA-RUN-CONTEXT-001', 'The local session intake is invalid.');
  }
}

/** @param {string} file @returns {unknown} */
function readBoundedReport(file: string): unknown {
  let fd;
  try {
    const stat = lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.size < 1 || stat.size > 32768)
      fail('GAP-VIDA-RUN-REPORT-001', 'Report file is unsafe or too large.');
    fd = openSync(file, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    const opened = fstatSync(fd);
    if (
      !opened.isFile() ||
      opened.nlink !== 1 ||
      opened.dev !== stat.dev ||
      opened.ino !== stat.ino ||
      opened.size < 1 ||
      opened.size > 32768
    )
      fail('GAP-VIDA-RUN-REPORT-001', 'Report file changed or is unsafe.');
    const bytes = Buffer.alloc(32769);
    let length = 0;
    while (length < bytes.length) {
      const count = readSync(fd, bytes, length, bytes.length - length, null);
      if (count === 0) break;
      length += count;
    }
    if (length < 1 || length > 32768) fail('GAP-VIDA-RUN-REPORT-001', 'Report size changed.');
    return JSON.parse(bytes.subarray(0, length).toString('utf8'));
  } catch {
    fail('GAP-VIDA-RUN-REPORT-001', 'Report file is unavailable or invalid.');
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

/** @param {unknown} value @returns {value is WorkIdentity} */
function isCaptureStoppedSourceIdentity(value: unknown): value is WorkIdentity {
  return (
    isRecord(value) &&
    isString(value.repository_id) &&
    isStringArray(value.project_ids) &&
    isString(value.integrations_digest) &&
    isString(value.work_id)
  );
}

/** @param {unknown} value @returns {value is StateVersion} */
function isCaptureStoppedSourceVersion(value: unknown): value is StateVersion {
  return isRecord(value) && typeof value.revision === 'number' && isString(value.digest);
}

/** @param {unknown} value @returns {value is StoppedSourceCaptureObservation} */
function isCaptureStoppedSourceObservation(value: unknown): value is StoppedSourceCaptureObservation {
  return isCaptureStoppedSourceObservationHeader(value) && isCaptureStoppedSourceObservationEvidence(value);
}

/** @param {unknown} value @returns {value is StoppedSourceCaptureObservation} */
function isCaptureStoppedSourceObservationHeader(value: unknown): value is StoppedSourceCaptureObservation {
  return (
    isCaptureStoppedSourceObservationIdentity(value) &&
    (value.status === 'reported_complete' || value.status === 'reported_failed') &&
    isString(value.summary) &&
    isString(value.output_digest)
  );
}

/** @param {unknown} value @returns {value is StoppedSourceCaptureObservation} */
function isCaptureStoppedSourceObservationIdentity(value: unknown): value is StoppedSourceCaptureObservation {
  return (
    isRecord(value) &&
    value.schema === 'VidaSessionObservation/v1' &&
    isString(value.action_id) &&
    isString(value.host_attempt_id) &&
    isString(value.issue_id) &&
    isString(value.agent_id) &&
    isString(value.tool_call_ref)
  );
}

/** @param {unknown} value @returns {value is StoppedSourceCaptureObservation} */
function isCaptureStoppedSourceObservationEvidence(value: unknown): value is StoppedSourceCaptureObservation {
  return isRecord(value) && isStringArray(value.changed_paths) && isStringArray(value.evidence_refs);
}

/** @param {unknown} value @returns {value is StoppedSourceCaptureTerminalEvidence} */
function isStoppedSourceCaptureTerminalEvidence(value: unknown): value is StoppedSourceCaptureTerminalEvidence {
  return (
    isRecord(value) &&
    value.schema === 'StoppedSourceTerminalEvidence/v1' &&
    isString(value.native_actor) &&
    isString(value.observation_ref) &&
    isString(value.owner_decision_ref) &&
    value.terminal === 'partial_stopped'
  );
}

/** @param {unknown} value @returns {value is StoppedSourceCaptureEntry} */
function isStoppedSourceCaptureEntry(value: unknown): value is StoppedSourceCaptureEntry {
  return isRecord(value) && isString(value.path) && isString(value.sha256) && typeof value.size === 'number';
}

/** @param {unknown} value @returns {value is StoppedSourceCaptureSnapshot} */
function isStoppedSourceCaptureSnapshot(value: unknown): value is StoppedSourceCaptureSnapshot {
  return (
    isRecord(value) &&
    value.schema === 'UnverifiedSourceSnapshot/v1' &&
    Array.isArray(value.entries) &&
    value.entries.every(isStoppedSourceCaptureEntry)
  );
}

/** @param {unknown} value @returns {value is StoppedSourceCaptureRequest} */
function isStoppedSourceCaptureRequest(value: unknown): value is StoppedSourceCaptureRequest {
  return isStoppedSourceCaptureRequestContext(value) && isStoppedSourceCaptureRequestEvidence(value);
}

/** @param {unknown} value @returns {value is Record<string, unknown> & {workspace_id: string, identity: WorkIdentity, attempt: number, expectedWork: StateVersion, expectedLedger: StateVersion, expectedJournal: StateVersion, nativeSessionHandle: string}} */
function isStoppedSourceCaptureRequestContext(value: unknown): value is Record<string, unknown> & {
  workspace_id: string;
  identity: WorkIdentity;
  attempt: number;
  expectedWork: StateVersion;
  expectedLedger: StateVersion;
  expectedJournal: StateVersion;
  nativeSessionHandle: string;
} {
  return (
    isRecord(value) &&
    isString(value.workspace_id) &&
    isCaptureStoppedSourceIdentity(value.identity) &&
    typeof value.attempt === 'number' &&
    isCaptureStoppedSourceVersion(value.expectedWork) &&
    isCaptureStoppedSourceVersion(value.expectedLedger) &&
    isCaptureStoppedSourceVersion(value.expectedJournal) &&
    isString(value.nativeSessionHandle)
  );
}

/** @param {unknown} value @returns {value is StoppedSourceCaptureRequest} */
function isStoppedSourceCaptureRequestEvidence(value: unknown): value is StoppedSourceCaptureRequest {
  return (
    isRecord(value) &&
    isCaptureStoppedSourceObservation(value.observation) &&
    isStoppedSourceCaptureTerminalEvidence(value.terminalEvidence) &&
    isStoppedSourceCaptureSnapshot(value.candidateSnapshot)
  );
}

/** @param {unknown} value @param {string} expectedWorkspace @returns {StoppedSourceCaptureRequest} */
function requireStoppedSourceCaptureRequest(value: unknown, expectedWorkspace: string): StoppedSourceCaptureRequest {
  if (!isStoppedSourceCaptureRequest(value) || value.workspace_id !== expectedWorkspace)
    throw Error('Capture workspace/root binding differs');
  return value;
}

/** @param {unknown} value @returns {value is StoppedSourceTerminalRecord} */
function isStoppedSourceTerminalRecord(value: unknown): value is StoppedSourceTerminalRecord {
  return (
    isRecord(value) &&
    isString(value.schema) &&
    isString(value.status) &&
    isString(value.actor) &&
    isString(value.action_id) &&
    (value.issue_id === null || isString(value.issue_id)) &&
    isString(value.host_attempt_id) &&
    isString(value.observation_ref)
  );
}

/** @param {unknown} value @returns {StoppedSourceTerminalRecord} */
function requireStoppedSourceTerminalRecord(value: unknown): StoppedSourceTerminalRecord {
  if (!isStoppedSourceTerminalRecord(value)) throw Error('actual terminal fixture evidence differs');
  return value;
}

/** @param {unknown} value @returns {value is {schema: string, action: string, owner_thread_id: string, request_digest: string, candidate_binding: string, source_turn_id: string, status: string, reviews: StoppedSourceCandidateReview[]}} */
function isStoppedSourceCaptureAuthorization(value: unknown): value is {
  schema: string;
  action: string;
  owner_thread_id: string;
  request_digest: string;
  candidate_binding: string;
  source_turn_id: string;
  status: string;
  reviews: StoppedSourceCandidateReview[];
} {
  return (
    isRecord(value) &&
    isString(value.schema) &&
    isString(value.action) &&
    isString(value.owner_thread_id) &&
    isString(value.request_digest) &&
    isString(value.candidate_binding) &&
    isString(value.source_turn_id) &&
    isString(value.status) &&
    isStoppedSourceReviewArray(value.reviews)
  );
}

/** @param {unknown} value @returns {{schema: string, action: string, owner_thread_id: string, request_digest: string, candidate_binding: string, source_turn_id: string, status: string, reviews: StoppedSourceCandidateReview[]}} */
function requireStoppedSourceCaptureAuthorization(value: unknown): {
  schema: string;
  action: string;
  owner_thread_id: string;
  request_digest: string;
  candidate_binding: string;
  source_turn_id: string;
  status: string;
  reviews: StoppedSourceCandidateReview[];
} {
  if (!isStoppedSourceCaptureAuthorization(value)) throw Error('Capture exact manifest/owner authorization differs');
  return value;
}

/** @param {unknown} value @returns {value is StoppedSourceCandidateReview} */
function isStoppedSourceCandidateReview(value: unknown): value is StoppedSourceCandidateReview {
  return (
    isRecord(value) &&
    isString(value.actor_id) &&
    isString(value.history_ref) &&
    isString(value.tool_call_ref) &&
    isString(value.verdict) &&
    isString(value.candidate_binding) &&
    isString(value.receipt_ref)
  );
}

/** @param {unknown} value @returns {value is StoppedSourceCandidateReview[]} */
function isStoppedSourceReviewArray(value: unknown): value is StoppedSourceCandidateReview[] {
  return Array.isArray(value) && value.every(isStoppedSourceCandidateReview);
}

/** @param {unknown} value @returns {value is {schema: string, request_digest: string}} */
function isStoppedSourceCapturePlan(value: unknown): value is { schema: string; request_digest: string } {
  return isRecord(value) && isString(value.schema) && isString(value.request_digest);
}

/** @param {string[]} args */
async function captureStoppedSource(args: string[]) {
  const { readFileSync, writeFileSync, realpathSync } = await import('node:fs');
  const { createHash } = await import('node:crypto');
  const { canonicalJsonDigest } = await import('../src/contracts/public-ingress.ts');
  const { loadRuntimeConfig } = await import('../src/config/runtime-config.ts');
  const { sessionHandoffDatabasePath } = await import('../src/config/project-paths.ts');
  const { deriveWorkspaceId } = await import('../src/workspace-identity.ts');
  const base = path.resolve(import.meta.dirname, '../../..');
  if (args.length !== 6 || args[0] !== '--mode' || args[2] !== '--project-root' || args[4] !== '--request')
    throw Error(
      'Usage: run.mjs --capture-stopped-source true --mode inspect|plan|apply|resume --project-root ABS --request REL',
    );
  const mode = requireOption(args[1], '--mode'),
    root = realpathSync(requireOption(args[3], '--project-root')),
    requestPath = requireOption(args[5], '--request');
  if (!['inspect', 'plan', 'apply', 'resume'].includes(mode)) throw Error('Capture operation mode invalid');
  const fixture = path.dirname(root) === base && path.basename(root).startsWith('fixture-');
  const config = loadRuntimeConfig(root);
  const databasePath = fixture ? path.join(root, 'fixture.sqlite') : sessionHandoffDatabasePath(root, config);
  const expectedWorkspace = deriveWorkspaceId(config.repository.repository_id, root);
  const file = path.resolve(root, requestPath),
    requestRelative = path.relative(root, file);
  if (requestRelative.startsWith('..') || path.isAbsolute(requestRelative) || realpathSync(file) !== file)
    throw Error('Bounded capture request path differs');
  const bytes = readFileSync(file);
  if (bytes.length > 1048576) throw Error('Capture request exceeds bound');
  /** @type {unknown} */
  const decodedInput: unknown = JSON.parse(bytes.toString('utf8'));
  const input = requireStoppedSourceCaptureRequest(decodedInput, expectedWorkspace);
  /** @type {[string, Buffer][]} */
  let approvedFiles: [string, Buffer][] = [];
  function verifyCurrent() {
    for (const [absolute, approved] of approvedFiles)
      if (!readFileSync(absolute).equals(approved)) throw Error('Capture approved evidence changed');
    const terminalPath = path.resolve(root, input.terminalEvidence.observation_ref),
      terminalRelative = path.relative(root, terminalPath);
    if (
      terminalRelative.startsWith('..') ||
      path.isAbsolute(terminalRelative) ||
      realpathSync(terminalPath) !== terminalPath
    )
      throw Error('Terminal observation path differs');
    const terminalBytes = readFileSync(terminalPath);
    if (terminalBytes.length > 65536) throw Error('Terminal evidence exceeds bound');
    /** @type {unknown} */
    /** @type {unknown} */
    const decodedTerminal: unknown = JSON.parse(terminalBytes.toString('utf8'));
    const terminal = requireStoppedSourceTerminalRecord(decodedTerminal);
    if (
      !fixture &&
      (terminal.native_status !== 'completed' ||
        !terminal.source_turn_id ||
        !terminal.final_message_id ||
        terminal.current_tmp_only_turn_id === terminal.source_turn_id ||
        terminal.owner_thread_id !== input.nativeSessionHandle)
    )
      throw Error('Actual stopped SOURCE turn provenance incomplete');
    if (
      terminal.schema !== (fixture ? 'FixtureObservedStoppedSource/v1' : 'RootObservedStoppedSource/v1') ||
      terminal.status !== 'partial_stopped' ||
      terminal.actor !== input.terminalEvidence.native_actor ||
      terminal.action_id !== input.observation.action_id ||
      terminal.issue_id !== input.observation.issue_id ||
      terminal.host_attempt_id !== input.observation.host_attempt_id ||
      terminal.observation_ref !== input.terminalEvidence.observation_ref
    )
      throw Error('actual terminal fixture evidence differs');
    for (const entry of input.candidateSnapshot.entries) {
      const absolute = path.resolve(root, entry.path),
        relative = path.relative(root, absolute);
      if (relative.startsWith('..') || path.isAbsolute(relative) || realpathSync(absolute) !== absolute)
        throw Error('candidate source path differs');
      const data = readFileSync(absolute);
      if (data.length !== entry.size || createHash('sha256').update(data).digest('hex') !== entry.sha256)
        throw Error('candidate source changed after frozen request');
    }
  }
  verifyCurrent();
  const workspace = inspectCliHostWorkspaceDatabase(root, databasePath, input.workspace_id);
  const selected = workspace.work.find((row) => row.identity.work_id === input.identity.work_id);
  if (!selected) throw Error('fixture exact work missing');
  const { workspace_id: _workspaceId, ...operation } = input;
  const planPath = fixture
    ? path.join(root, 'capture-plan.json')
    : path.join(path.dirname(file), 'capture-plan-' + operation.identity.work_id + '.json');
  async function verifyAuthorization() {
    if (fixture) return;
    const authorizationPath = path.resolve(root, operation.terminalEvidence.owner_decision_ref),
      relative = path.relative(root, authorizationPath);
    if (relative.startsWith('..') || path.isAbsolute(relative) || realpathSync(authorizationPath) !== authorizationPath)
      throw Error('Capture authorization path differs');
    const bytes = readFileSync(authorizationPath);
    if (bytes.length > 65536) throw Error('Capture authorization exceeds bound');
    /** @type {unknown} */
    const decodedAuthorization: unknown = JSON.parse(bytes.toString('utf8'));
    const authorization = requireStoppedSourceCaptureAuthorization(decodedAuthorization);
    const { developmentControllerBinding } = await import('./development-controller.ts');
    const candidateBinding = developmentControllerBinding(bundleRoot);
    /** @type {unknown} */
    const currentTerminal: unknown = JSON.parse(
      readFileSync(path.resolve(root, operation.terminalEvidence.observation_ref), 'utf8'),
    );
    const checkedCurrentTerminal = requireStoppedSourceTerminalRecord(currentTerminal);
    if (
      authorization.schema !== 'StoppedSourceCaptureAuthorization/v1' ||
      authorization.action !== 'source.capture-failed-and-release' ||
      authorization.owner_thread_id !== operation.nativeSessionHandle ||
      authorization.request_digest !== canonicalJsonDigest(operation) ||
      authorization.candidate_binding !== candidateBinding ||
      authorization.source_turn_id !== checkedCurrentTerminal.source_turn_id ||
      authorization.status !== 'approved_exact_manifest'
    )
      throw Error('Capture exact manifest/owner authorization differs');
    const reviews = authorization.reviews;
    if (
      reviews.length !== 3 ||
      new Set(reviews.map((r) => r.actor_id)).size !== 3 ||
      new Set(reviews.map((r) => r.history_ref)).size !== 3 ||
      new Set(reviews.map((r) => r.tool_call_ref)).size !== 3 ||
      reviews.some(
        (r) =>
          r.verdict !== 'pass' ||
          r.candidate_binding !== candidateBinding ||
          r.actor_id === operation.terminalEvidence.native_actor ||
          !r.receipt_ref,
      )
    )
      throw Error('Three fresh candidate review references required');
    approvedFiles = [[authorizationPath, bytes]];
    for (const review of reviews) {
      const receiptPath = path.resolve(root, review.receipt_ref),
        receiptRelative = path.relative(root, receiptPath);
      if (
        receiptRelative.startsWith('..') ||
        path.isAbsolute(receiptRelative) ||
        realpathSync(receiptPath) !== receiptPath
      )
        throw Error('Capture review receipt path differs');
      const receiptBytes = readFileSync(receiptPath);
      if (receiptBytes.length > 65536) throw Error('Capture review receipt exceeds bound');
      /** @type {unknown} */
      const receipt: unknown = JSON.parse(receiptBytes.toString('utf8'));
      if (
        !isRecord(receipt) ||
        receipt.schema !== 'StoppedSourceCandidateReview/v1' ||
        receipt.verdict !== 'pass' ||
        receipt.candidate_binding !== candidateBinding ||
        receipt.actor_id !== review.actor_id ||
        receipt.history_ref !== review.history_ref ||
        receipt.tool_call_ref !== review.tool_call_ref ||
        receipt.request_digest !== authorization.request_digest
      )
        throw Error('Capture frozen review receipt differs');
      approvedFiles.push([receiptPath, receiptBytes]);
    }
    verifyCurrent();
  }

  if (['inspect', 'plan'].includes(mode)) {
    if (
      canonicalJsonDigest(selected.version) !== canonicalJsonDigest(operation.expectedWork) ||
      canonicalJsonDigest(workspace.ledger_version) !== canonicalJsonDigest(operation.expectedLedger)
    )
      throw Error('capture plan CAS differs');
    const plan = {
      schema: 'StoppedSourceCapturePlan/v1',
      request_digest: canonicalJsonDigest(operation),
      request: operation,
      rights_granted: false,
      canonical_acceptance: false,
      requires_exact_manifest_authorization: !fixture,
    };
    if (mode === 'plan') writeFileSync(planPath, JSON.stringify(plan, null, 2) + '\n', { flag: 'wx' });
    return {
      status: mode === 'plan' ? 'planned' : 'inspect_current',
      plan_ref: path.relative(root, planPath).replaceAll(path.sep, '/'),
      request_digest: plan.request_digest,
    };
  } else {
    /** @type {unknown} */
    const plan: unknown = JSON.parse(readFileSync(planPath, 'utf8'));
    await verifyAuthorization();
    if (
      !isStoppedSourceCapturePlan(plan) ||
      plan.schema !== 'StoppedSourceCapturePlan/v1' ||
      plan.request_digest !== canonicalJsonDigest(operation)
    )
      throw Error('frozen capture plan differs');
    const database = openCliHostStateDatabase(root, databasePath, expectedWorkspace);
    try {
      const store = createCliHostStateStore(database, expectedWorkspace);
      const result = store.captureStoppedSourceObservation({ ...operation, verifyCurrent });
      return {
        status: 'captured_partial_source_released',
        work_version: result.workVersion,
        ledger_version: result.ledgerVersion,
        rights_granted: false,
        canonical_acceptance: false,
      };
    } finally {
      closeWorkspaceDatabaseWithAdmission(database);
    }
  }
}

/** @param {string[]} args */
async function recoverUnpreparedWork(args: string[]) {
  if (
    args.length !== 8 ||
    args[0] !== '--mode' ||
    args[2] !== '--project-root' ||
    args[4] !== '--native-session-handle' ||
    args[6] !== '--request'
  )
    throw Error('Unprepared recovery requires mode, exact root, original owner handle and request');
  const mode = requireOption(args[1], '--mode'),
    root = realpathSync(requireOption(args[3], '--project-root')),
    operatorHandle = requireOption(args[5], '--native-session-handle');
  if (!['inspect', 'apply'].includes(mode)) throw Error('Unprepared recovery mode invalid');
  const { loadRuntimeConfig, validateRuntimeConfigRepairTargetBytes } = await import('../src/config/runtime-config.ts');
  const { requireSafeRepositoryAccess } = await import('../src/config/safe-repository-access.ts');
  const { loadProjectSetContext } = await import('../src/config/project-context.ts');
  const { deriveWorkspaceId } = await import('../src/workspace-identity.ts');
  const { sessionHandoffDatabasePath } = await import('../src/config/project-paths.ts');
  const access = requireSafeRepositoryAccess(root),
    current = loadRuntimeConfig(root),
    bytes = access.readBytes(requireOption(args[7], '--request'), 'unprepared recovery request');
  if (!bytes.length || bytes.length > 262144) throw Error('Unprepared recovery request exceeds bound');
  /** @type {unknown} */
  const input: unknown = JSON.parse(bytes.toString('utf8'));
  if (
    !isUnpreparedRecoveryEnvelope(
      input,
      mode === 'inspect'
        ? ['identity', 'attempt', 'baselinePath', 'decisionPointer']
        : ['identity', 'attempt', 'baselinePath', 'decisionPointer', 'request'],
    )
  )
    throw Error('Unprepared recovery request shape differs');
  if (
    mode === 'apply' &&
    !exactKeys(input.request, [
      'identity',
      'attempt',
      'operatorHandle',
      'decisionPointer',
      'expectedWork',
      'expectedLedger',
      'expectedMaintenanceGeneration',
      'originalWork',
      'originalTicket',
      'originalClaims',
    ])
  )
    throw Error('Unprepared recovery retained request shape differs');
  const original = validateRuntimeConfigRepairTargetBytes(
    access.readBytes(input.baselinePath, 'unprepared original configuration'),
    root,
  );
  const project = loadProjectSetContext(root, current, input.identity.repository_id, input.identity.project_ids);
  if (
    project.integrations_digest !== input.identity.integrations_digest ||
    current.control.work_root !== original.control.work_root
  )
    throw Error('Unprepared recovery original project or storage differs');
  const { sessionHandoffDatabaseRelativePath } = await import('../src/config/project-paths.ts');
  const relative = sessionHandoffDatabaseRelativePath(current);
  if (!access.fileExists(relative, 'existing unprepared Host')) throw Error('Unprepared recovery Host unavailable');
  const file = sessionHandoffDatabasePath(root, current),
    before = lstatSync(file);
  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1)
    throw Error('Unprepared recovery Host path unsafe');
  const database = openCliWorkspaceDatabase(
    root,
    file,
    deriveWorkspaceId(project.repository_id, root),
    mode === 'inspect',
  );
  try {
    const store = createCliHostStateStore(
      database,
      deriveWorkspaceId(project.repository_id, root),
      undefined,
      undefined,
      undefined,
      undefined,
      root,
    );
    const context = {
      identity: input.identity,
      attempt: input.attempt,
      operatorHandle,
      decisionPointer: input.decisionPointer,
      config: original,
    };
    if (mode === 'inspect') {
      const request = store.inspectUnpreparedWorkRecovery(context);
      return {
        status: 'unprepared_recovery_inspected',
        request: { ...input, request },
        next_operation: 'release_unprepared_work',
        rights_granted: false,
        runtime_acceptance: false,
      };
    }
    const supplied = input.request as UnpreparedWorkRecoveryRequest;
    const result = store.releaseUnpreparedWork(context, supplied);
    return {
      status: 'unprepared_execution_released',
      work_version: result.workVersion,
      ledger_version: result.ledgerVersion,
      next_operation: null,
      gap: 'Current configuration admission and a fresh independently authorized Source context remain separate.',
      rights_granted: false,
      runtime_acceptance: false,
    };
  } finally {
    closeWorkspaceDatabaseWithAdmission(database);
    assertUnpreparedRecoveryHostStable(file, before);
  }
}

type RetiredSourceItem = Record<string, unknown> & { id: string; type: string };
type RetiredSourceChange = { path: string; diff: { text: string; truncated: boolean } };
type RetiredSourceIssuedAction = Record<string, unknown> & {
  request: Record<string, unknown> & { action_id: string; stage_id: string; scope_digest: string };
  action: Record<string, unknown> & { action_id: string; stage_id: string; scope_digest: string };
  development_packet: Record<string, unknown> & {
    schema: 'DevelopmentTaskPacket/v1';
    work_item_id: string;
    attempt: number;
    packet_id: string;
    digest: string;
  };
  issue_id: string;
  host_attempt_id: string;
};
type RetiredSourceEffect = {
  path: string;
  event_ref: string;
  kind: 'command' | 'patch' | 'file_change';
  evidence_sha256: string;
  patch_ref?: string;
};
type RetiredSourceExpected = {
  sourceThreadId: string;
  sourceTurnId: string;
  actionId: string;
  issueId: string;
  hostAttemptId: string;
  workId: string;
  attempt: number;
  sourcePaths: string[];
};
type RetiredSourceCaptureEnvelope = Record<string, unknown> & {
  schema: 'RetiredSourceCapture/v1';
  workspace_id: string;
  operatorHandle: string;
  nativeTurnEvidenceRef: string;
  identity: WorkIdentity;
  attempt: number;
  actionId: string;
  issueId: string;
  expectedWork: StateVersion;
  expectedLedger: StateVersion;
  expectedJournal: StateVersion;
  expectedMaintenanceGeneration: number;
  retirementOperationId: string;
  retirementClaimId: string;
  observation: Record<string, unknown> & { host_attempt_id: string };
  terminalEvidence: import('../src/host-state.ts').RetiredSourceCaptureTerminalEvidence;
  candidateSnapshot: import('../src/host-state.ts').RetiredSourceCaptureRequest['candidateSnapshot'];
};

/** @param {unknown} value @returns {value is RetiredSourceCaptureEnvelope} */
function isRetiredSourceCaptureEnvelope(value: unknown): value is RetiredSourceCaptureEnvelope {
  return (
    isRecord(value) &&
    value.schema === 'RetiredSourceCapture/v1' &&
    isRetiredSourceCaptureAuthority(value) &&
    isRetiredSourceCaptureOperation(value)
  );
}

/** @param {Record<string, unknown>} value @returns {boolean} */
function isRetiredSourceCaptureAuthority(value: Record<string, unknown>): boolean {
  return (
    typeof value.workspace_id === 'string' &&
    typeof value.operatorHandle === 'string' &&
    typeof value.nativeTurnEvidenceRef === 'string' &&
    isStateVersion(value.expectedWork) &&
    isStateVersion(value.expectedLedger) &&
    isStateVersion(value.expectedJournal) &&
    typeof value.expectedMaintenanceGeneration === 'number' &&
    typeof value.retirementOperationId === 'string' &&
    typeof value.retirementClaimId === 'string'
  );
}

/** @param {Record<string, unknown>} value @returns {value is RetiredSourceCaptureEnvelope} */
function isRetiredSourceCaptureOperation(value: Record<string, unknown>): value is RetiredSourceCaptureEnvelope {
  return (
    isWorkIdentity(value.identity) &&
    typeof value.attempt === 'number' &&
    Number.isSafeInteger(value.attempt) &&
    value.attempt > 0 &&
    typeof value.actionId === 'string' &&
    typeof value.issueId === 'string' &&
    isRetiredSourceCaptureObservation(value.observation) &&
    isRetiredSourceCaptureTerminal(value.terminalEvidence) &&
    isRetiredSourceCaptureSnapshot(value.candidateSnapshot)
  );
}

/** @param {unknown} value @returns {value is Record<string, unknown> & {host_attempt_id: string}} */
function isRetiredSourceCaptureObservation(
  value: unknown,
): value is Record<string, unknown> & { host_attempt_id: string } {
  return isRecord(value) && typeof value.host_attempt_id === 'string';
}

/** @param {unknown} value @returns {value is import('../src/host-state.ts').RetiredSourceCaptureTerminalEvidence} */
function isRetiredSourceCaptureTerminal(
  value: unknown,
): value is import('../src/host-state.ts').RetiredSourceCaptureTerminalEvidence {
  return (
    isRecord(value) &&
    value.schema === 'RetiredSourceTerminalEvidence/v1' &&
    isRetiredSourceTerminalTurn(value) &&
    isRetiredSourceTerminalBindings(value)
  );
}

/** @param {Record<string, unknown>} value @returns {boolean} */
function isRetiredSourceTerminalTurn(value: Record<string, unknown>): boolean {
  return (
    typeof value.source_thread_id === 'string' &&
    typeof value.source_turn_id === 'string' &&
    typeof value.source_thread_status === 'string' &&
    value.source_turn_status === 'interrupted' &&
    typeof value.operator_thread_id === 'string' &&
    typeof value.original_actor_id === 'string' &&
    value.final_message_id === null
  );
}

/** @param {Record<string, unknown>} value @returns {boolean} */
function isRetiredSourceTerminalBindings(value: Record<string, unknown>): boolean {
  return (
    typeof value.action_id === 'string' &&
    typeof value.issue_id === 'string' &&
    typeof value.host_attempt_id === 'string' &&
    isStringArray(value.active_source_writer_ids) &&
    isRetiredSourceTerminalCommands(value.observed_commands) &&
    isRetiredSourceTerminalToolRecords(value.original_tool_records) &&
    isRetiredSourceLaterGrants(value.later_grants)
  );
}

/** @param {unknown} value @returns {value is import('../src/host-state.ts').RetiredSourceCaptureTerminalEvidence['observed_commands']} */
function isRetiredSourceTerminalCommands(
  value: unknown,
): value is import('../src/host-state.ts').RetiredSourceCaptureTerminalEvidence['observed_commands'] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        isRecord(entry) &&
        typeof entry.ref === 'string' &&
        isRetiredSourceCommandStatus(entry.status) &&
        typeof entry.exit_code === 'number' &&
        Number.isSafeInteger(entry.exit_code) &&
        typeof entry.command_sha256 === 'string' &&
        (typeof entry.output_sha256 === 'string' || entry.output_sha256 === null) &&
        typeof entry.output_present === 'boolean' &&
        typeof entry.output_truncated === 'boolean',
    )
  );
}

/** @param {unknown} value @returns {value is 'completed' | 'failed'} */
function isRetiredSourceCommandStatus(value: unknown): value is 'completed' | 'failed' {
  return value === 'completed' || value === 'failed';
}

/** @param {unknown} value @returns {value is import('../src/host-state.ts').RetiredSourceCaptureTerminalEvidence['original_tool_records']} */
function isRetiredSourceTerminalToolRecords(
  value: unknown,
): value is import('../src/host-state.ts').RetiredSourceCaptureTerminalEvidence['original_tool_records'] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        isRecord(entry) &&
        typeof entry.call_ref === 'string' &&
        typeof entry.actor_id === 'string' &&
        typeof entry.action_id === 'string' &&
        typeof entry.issue_id === 'string' &&
        typeof entry.host_attempt_id === 'string' &&
        entry.status === 'completed' &&
        isStringArray(entry.changed_paths),
    )
  );
}

/** @param {unknown} value @returns {value is import('../src/host-state.ts').RetiredSourceCaptureTerminalEvidence['later_grants']} */
function isRetiredSourceLaterGrants(
  value: unknown,
): value is import('../src/host-state.ts').RetiredSourceCaptureTerminalEvidence['later_grants'] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        isRecord(entry) &&
        typeof entry.work_id === 'string' &&
        typeof entry.ticket_id === 'string' &&
        typeof entry.claim_id === 'string' &&
        typeof entry.actor_id === 'string' &&
        typeof entry.action_id === 'string' &&
        typeof entry.issue_id === 'string' &&
        typeof entry.host_attempt_id === 'string' &&
        isStringArray(entry.changed_paths) &&
        typeof entry.evidence_ref === 'string',
    )
  );
}

/** @param {unknown} value @returns {value is import('../src/host-state.ts').RetiredSourceCaptureRequest['candidateSnapshot']} */
function isRetiredSourceCaptureSnapshot(
  value: unknown,
): value is import('../src/host-state.ts').RetiredSourceCaptureRequest['candidateSnapshot'] {
  return (
    isRecord(value) &&
    value.schema === 'UnverifiedSourceSnapshot/v1' &&
    Array.isArray(value.entries) &&
    value.entries.every(
      (entry) =>
        isRecord(entry) &&
        typeof entry.path === 'string' &&
        typeof entry.sha256 === 'string' &&
        typeof entry.size === 'number' &&
        Number.isSafeInteger(entry.size) &&
        entry.size >= 0,
    )
  );
}

/** @param {unknown} value @returns {value is RetiredSourceItem} */
function isRetiredSourceItem(value: unknown): value is RetiredSourceItem {
  return isRecord(value) && typeof value.id === 'string' && typeof value.type === 'string';
}

/** @param {unknown} value @returns {value is RetiredSourceChange} */
function isRetiredSourceChange(value: unknown): value is RetiredSourceChange {
  return (
    isRecord(value) &&
    typeof value.path === 'string' &&
    isRecord(value.diff) &&
    typeof value.diff.text === 'string' &&
    typeof value.diff.truncated === 'boolean'
  );
}

/** @param {unknown} value @returns {value is RetiredSourceIssuedAction} */
function isRetiredSourceIssuedAction(value: unknown): value is RetiredSourceIssuedAction {
  return (
    isRecord(value) && hasRetiredSourceActionBinding(value) && isRetiredSourcePacketBinding(value.development_packet)
  );
}

/** @param {Record<string, unknown>} value @returns {value is RetiredSourceIssuedAction} */
function hasRetiredSourceActionBinding(value: Record<string, unknown>): value is RetiredSourceIssuedAction {
  return (
    isRecord(value.request) &&
    isRecord(value.action) &&
    typeof value.request.action_id === 'string' &&
    typeof value.request.stage_id === 'string' &&
    typeof value.request.scope_digest === 'string' &&
    typeof value.action.action_id === 'string' &&
    typeof value.action.stage_id === 'string' &&
    typeof value.action.scope_digest === 'string' &&
    typeof value.issue_id === 'string' &&
    typeof value.host_attempt_id === 'string'
  );
}

/** @param {unknown} value @returns {value is RetiredSourceIssuedAction['development_packet']} */
function isRetiredSourcePacketBinding(value: unknown): value is RetiredSourceIssuedAction['development_packet'] {
  return (
    isRecord(value) &&
    value.schema === 'DevelopmentTaskPacket/v1' &&
    typeof value.work_item_id === 'string' &&
    typeof value.attempt === 'number' &&
    Number.isSafeInteger(value.attempt) &&
    typeof value.packet_id === 'string' &&
    typeof value.digest === 'string'
  );
}

/** @param {unknown} value @returns {value is import('../src/host-state.ts').InterruptedSourceRetirementEvidence} */
function isInterruptedSourceRetirementEvidence(
  value: unknown,
): value is import('../src/host-state.ts').InterruptedSourceRetirementEvidence {
  return (
    exactKeys(value, [
      'schema',
      'source_thread_id',
      'source_thread_status',
      'read_thread_ref',
      'list_agents_ref',
      'active_source_writer_ids',
    ]) &&
    value.schema === 'InterruptedSourceRetirementEvidence/v1' &&
    typeof value.source_thread_id === 'string' &&
    value.source_thread_status === 'interrupted' &&
    typeof value.read_thread_ref === 'string' &&
    typeof value.list_agents_ref === 'string' &&
    Array.isArray(value.active_source_writer_ids) &&
    value.active_source_writer_ids.every((writerId) => typeof writerId === 'string')
  );
}

type InterruptedSourceRetirementInspection = Record<string, unknown> & { identity: WorkIdentity; attempt: number };

/** @param {unknown} value @returns {value is InterruptedSourceRetirementInspection} */
function isInterruptedSourceRetirementInspection(value: unknown): value is InterruptedSourceRetirementInspection {
  return (
    isRecord(value) &&
    exactKeys(value, ['identity', 'attempt']) &&
    isWorkIdentity(value.identity) &&
    typeof value.attempt === 'number' &&
    Number.isSafeInteger(value.attempt) &&
    value.attempt >= 1
  );
}

/** @param {Record<string, unknown>} value @returns {boolean} */
function isInterruptedSourceRetirementCas(value: Record<string, unknown>): boolean {
  return (
    isStateVersion(value.expectedWork) &&
    isStateVersion(value.expectedLedger) &&
    isStateVersion(value.expectedJournal) &&
    typeof value.expectedMaintenanceGeneration === 'number' &&
    Number.isSafeInteger(value.expectedMaintenanceGeneration) &&
    value.expectedMaintenanceGeneration >= 0 &&
    typeof value.decisionPointer === 'string' &&
    isInterruptedSourceRetirementEvidence(value.evidence)
  );
}

type InterruptedSourceRetirementInput = Record<string, unknown> & {
  identity: WorkIdentity;
  attempt: number;
  actionId: string;
  issueId: string;
  expectedWork: StateVersion;
  expectedLedger: StateVersion;
  expectedJournal: StateVersion;
  expectedMaintenanceGeneration: number;
  decisionPointer: string;
  evidence: import('../src/host-state.ts').InterruptedSourceRetirementEvidence;
};

/** @param {unknown} value @returns {value is InterruptedSourceRetirementInput} */
function isInterruptedSourceRetirementInput(value: unknown): value is InterruptedSourceRetirementInput {
  return (
    isRecord(value) &&
    exactKeys(value, [
      'identity',
      'attempt',
      'actionId',
      'issueId',
      'expectedWork',
      'expectedLedger',
      'expectedJournal',
      'expectedMaintenanceGeneration',
      'decisionPointer',
      'evidence',
    ]) &&
    isWorkIdentity(value.identity) &&
    typeof value.attempt === 'number' &&
    Number.isSafeInteger(value.attempt) &&
    value.attempt >= 1 &&
    typeof value.actionId === 'string' &&
    typeof value.issueId === 'string' &&
    isInterruptedSourceRetirementCas(value)
  );
}

/** @param {string} root @param {RetiredSourceItem[]} items @param {string[]} sourcePaths @returns {{effects: RetiredSourceEffect[], retained: {path: string, sha256: string}[]}} */
function retiredSourceEffects(
  root: string,
  items: RetiredSourceItem[],
  sourcePaths: string[],
): { effects: RetiredSourceEffect[]; retained: { path: string; sha256: string }[] } {
  const scope: Set<string> = new Set(sourcePaths),
    /** @type {RetiredSourceEffect[]} */
    effects: RetiredSourceEffect[] = [],
    /** @type {{path: string, sha256: string}[]} */
    retained: { path: string; sha256: string }[] = [];
  /** @param {RetiredSourceItem} event @param {string} sourcePath @param {'command' | 'patch' | 'file_change'} kind @param {string} body @param {string | undefined} patchRef */
  const add = (
    event: RetiredSourceItem,
    sourcePath: string,
    kind: 'command' | 'patch' | 'file_change',
    body: string,
    patchRef: string | undefined,
  ) => {
    const relative = path.isAbsolute(sourcePath) ? path.relative(root, sourcePath).replaceAll('\\', '/') : sourcePath;
    if (relative.startsWith('.tmp/') || relative.startsWith('.agent/')) return;
    if (!scope.has(relative)) throw Error('Retired-source mutation path is outside the original scope');
    effects.push({
      path: relative,
      event_ref: event.id,
      kind,
      evidence_sha256: digest(Buffer.from(body)),
      ...(patchRef ? { patch_ref: patchRef } : {}),
    });
  };
  for (const event of items) {
    if (event.type === 'fileChange') {
      addRetiredSourceFileEffects(event, add);
      continue;
    }
    if (event.type !== 'commandExecution') continue;
    const command = event.command;
    if (typeof command !== 'string' || typeof event.exitCode !== 'number')
      throw Error('Retired-source command outcome is invalid');
    addRetiredSourcePatchEffects(root, event, command, add, retained);
    addRetiredSourceCommandEffects(event, command, add);
  }
  return { effects, retained };
}

/** @param {RetiredSourceItem} event @param {(event: RetiredSourceItem, sourcePath: string, kind: 'command' | 'patch' | 'file_change', body: string, patchRef: string | undefined) => void} add @returns {void} */
function addRetiredSourceFileEffects(
  event: RetiredSourceItem,
  add: (
    event: RetiredSourceItem,
    sourcePath: string,
    kind: 'command' | 'patch' | 'file_change',
    body: string,
    patchRef: string | undefined,
  ) => void,
): void {
  if (!Array.isArray(event.changes) || !event.changes.every(isRetiredSourceChange))
    throw Error('Retired-source file-change event is invalid');
  for (const change of event.changes) {
    if (isRetiredSourceChange(change)) add(event, change.path, 'file_change', change.diff.text, undefined);
  }
}

/** @param {string} root @param {RetiredSourceItem} event @param {string} command @param {(event: RetiredSourceItem, sourcePath: string, kind: 'command' | 'patch' | 'file_change', body: string, patchRef: string | undefined) => void} add @param {{path: string, sha256: string}[]} retained @returns {void} */
function addRetiredSourcePatchEffects(
  root: string,
  event: RetiredSourceItem,
  command: string,
  add: (
    event: RetiredSourceItem,
    sourcePath: string,
    kind: 'command' | 'patch' | 'file_change',
    body: string,
    patchRef: string | undefined,
  ) => void,
  retained: { path: string; sha256: string }[],
): void {
  for (const match of command.matchAll(/git apply\b([^;\n]*)/g)) {
    const commandArguments = match[1] ?? '';
    if (/--(?:check|stat|numstat|summary)\b/.test(commandArguments)) continue;
    const patchRefs = [...commandArguments.matchAll(/\.tmp\/[A-Za-z0-9_./-]+\.patch/g)].flatMap((value) =>
      value[0] ? [value[0]] : [],
    );
    if (event.exitCode !== 0 || patchRefs.length !== 1) throw Error('Retired-source patch outcome is unresolved');
    const patchRef = patchRefs[0];
    if (!patchRef) throw Error('Retired-source patch reference is missing');
    const absolute = path.resolve(root, patchRef);
    const bytes = readRetiredSourcePatchBytes(absolute),
      body = bytes.toString('utf8');
    const excluded = [...commandArguments.matchAll(/--exclude=['"]([^'"]+)['"]/g)].flatMap((value) =>
      value[1] ? [value[1]] : [],
    );
    const paths = retiredSourcePatchPaths(body);
    if (!paths.length) throw Error('Retired-source patch paths are missing');
    for (const value of paths.filter((value) => !excluded.includes(value))) add(event, value, 'patch', body, patchRef);
    retained.push({ path: patchRef, sha256: digest(bytes) });
  }
}

/** @param {string} absolute @returns {Buffer} */
function readRetiredSourcePatchBytes(absolute: string): Buffer {
  const metadata = lstatSync(absolute);
  if (
    realpathSync(absolute) !== absolute ||
    !metadata.isFile() ||
    metadata.isSymbolicLink() ||
    metadata.nlink !== 1 ||
    metadata.size > 5 * 1024 * 1024
  )
    throw Error('Retired-source referenced patch is unsafe');
  return readFileSync(absolute);
}

/** @param {string} body @returns {string[]} */
function retiredSourcePatchPaths(body: string): string[] {
  return [...body.matchAll(/^diff --git a\/(\S+) b\/\1\r?$/gm)].flatMap((value) => (value[1] ? [value[1]] : []));
}

/** @param {RetiredSourceItem} event @param {string} command @param {(event: RetiredSourceItem, sourcePath: string, kind: 'command' | 'patch' | 'file_change', body: string, patchRef: string | undefined) => void} add @returns {void} */
function addRetiredSourceCommandEffects(
  event: RetiredSourceItem,
  command: string,
  add: (
    event: RetiredSourceItem,
    sourcePath: string,
    kind: 'command' | 'patch' | 'file_change',
    body: string,
    patchRef: string | undefined,
  ) => void,
): void {
  if (!hasRetiredSourceWriteSyntax(command)) return;
  const paths = extractRetiredSourceWritePaths(command);
  if (hasRetiredSourceEditHelper(command)) paths.push(...retiredSourceDeclaredEditPaths(event, command));
  if (!paths.length && /(?:packages\/agent|docs)\//.test(command))
    throw Error('Retired-source command mutation paths are unresolved: ' + event.id);
  if (paths.length && event.exitCode !== 0) throw Error('Retired-source command effect is unresolved');
  for (const value of new Set(paths)) add(event, value, 'command', command, undefined);
}

/** @param {string} command @returns {boolean} */
function hasRetiredSourceWriteSyntax(command: string): boolean {
  return (
    /\b(?:write_text|write_bytes|writeFileSync|Set-Content|Add-Content|Out-File)\b/.test(command) ||
    /\.open\(['"](?:a|w)/.test(command)
  );
}

/** @param {string} command @returns {string[]} */
function extractRetiredSourceWritePaths(command: string): string[] {
  /** @type {string[]} */
  const paths: string[] = [];
  const patterns = [
    /\b(\w+)\s*=\s*Path\([^)]*?((?:packages\/agent|docs)\/[A-Za-z0-9_./-]+)[^)]*\)/g,
    /with Path\([^)]*?((?:packages\/agent|docs)\/[A-Za-z0-9_./-]+)[^)]*\)\.open\(['"](?:a|w)/g,
    /Path\([^)]*?((?:packages\/agent|docs)\/[A-Za-z0-9_./-]+)[^)]*\)\.(?:write_text|write_bytes)\(/g,
    /with \(root\/['"]((?:packages\/agent|docs)\/[A-Za-z0-9_./-]+)['"]\)\.open\(['"](?:a|w)/g,
  ];
  for (const [index, pattern] of patterns.entries()) {
    for (const match of command.matchAll(pattern)) {
      const candidate = match[index === 0 ? 2 : 1];
      if (!candidate) continue;
      if (index !== 0 || new RegExp('\\b' + match[1] + '\\.(?:write_text|write_bytes)\\(').test(command))
        paths.push(candidate);
    }
  }
  return paths;
}

/** @param {string} command @returns {boolean} */
function hasRetiredSourceEditHelper(command: string): boolean {
  return (
    /def edit\(file,transform\):/.test(command) && /p=root\/file/.test(command) && /p\.write_bytes\(/.test(command)
  );
}

/** @param {RetiredSourceItem} event @param {string} command @returns {string[]} */
function retiredSourceDeclaredEditPaths(event: RetiredSourceItem, command: string): string[] {
  const declared = [...command.matchAll(/\bedit\(['"]((?:packages\/agent|docs)\/[A-Za-z0-9_./-]+)['"]/g)].flatMap(
    (match) => (match[1] ? [match[1]] : []),
  );
  const output = isRecord(event.output) && typeof event.output.text === 'string' ? event.output.text : '';
  let report;
  try {
    report = parseJsonUnknown(output);
  } catch {
    throw Error('Retired-source document edit result is unresolved');
  }
  if (!isRecord(report) || !isStringArray(report.updated) || report.updated.some((value) => !declared.includes(value)))
    throw Error('Retired-source document edit paths differ from the recorded command');
  return report.updated;
}

/** @param {Record<string, unknown>} artifact @returns {boolean} */
function isRetiredSourceReadArtifact(artifact: Record<string, unknown>): boolean {
  return (
    (exactKeys(artifact, ['schema', 'data']) && artifact.schema === 'RetiredSourceTurnRead/v1') ||
    (exactKeys(artifact, ['schema', 'host', 'tool', 'max_output_chars_per_item', 'data']) &&
      artifact.schema === 'CoreNativeIssuedTurnRead/v1' &&
      typeof artifact.host === 'string' &&
      artifact.tool === 'mcp__codex_app__read_thread')
  );
}

/** @param {unknown} value @returns {value is Record<string, unknown> & {thread: Record<string, unknown>, turns: unknown[]}} */
function hasRetiredSourceReadData(
  value: unknown,
): value is Record<string, unknown> & { thread: Record<string, unknown>; turns: unknown[] } {
  return isRecord(value) && isRecord(value.thread) && isUnknownArray(value.turns) && value.turns.length === 1;
}

/** @param {unknown} value @returns {value is Record<string, unknown> & {items: unknown[]}} */
function hasRetiredSourceTurnItems(value: unknown): value is Record<string, unknown> & { items: unknown[] } {
  return isRecord(value) && isUnknownArray(value.items);
}

/** @param {unknown} artifactValue @param {RetiredSourceExpected} expected @returns {{threadId: string, threadStatus: string, turnId: string, turnStatus: 'interrupted', items: RetiredSourceItem[]}} */
function parseRetiredSourceNativeTurnPayload(
  artifactValue: unknown,
  expected: RetiredSourceExpected,
): { threadId: string; threadStatus: string; turnId: string; turnStatus: 'interrupted'; items: RetiredSourceItem[] } {
  if (
    !isRecord(artifactValue) ||
    !isRetiredSourceReadArtifact(artifactValue) ||
    !hasRetiredSourceReadData(artifactValue.data)
  )
    throw Error('Retired-source native evidence contract differs');
  const thread = artifactValue.data.thread,
    turn = artifactValue.data.turns[0];
  if (!hasRetiredSourceTurnItems(turn)) throw Error('Retired-source turn is invalid');
  const items = turn.items.map((value) => {
    if (!isRetiredSourceItem(value)) throw Error('Retired-source thread item is invalid');
    return value;
  });
  const binding = assertRetiredSourceTurnBinding(thread, turn, items, expected);
  return { ...binding, items };
}

/** @param {Record<string, unknown>} thread @param {Record<string, unknown>} turn @param {RetiredSourceItem[]} items @param {RetiredSourceExpected} expected @returns {{threadId: string, threadStatus: string, turnId: string, turnStatus: 'interrupted'}} */
function assertRetiredSourceTurnBinding(
  thread: Record<string, unknown>,
  turn: Record<string, unknown>,
  items: RetiredSourceItem[],
  expected: RetiredSourceExpected,
): { threadId: string; threadStatus: string; turnId: string; turnStatus: 'interrupted' } {
  if (
    thread.id !== expected.sourceThreadId ||
    !isRecord(thread.status) ||
    typeof thread.status.type !== 'string' ||
    !thread.status.type ||
    turn.id !== expected.sourceTurnId ||
    turn.status !== 'interrupted' ||
    items.length > 4096 ||
    items.some((item) => item.type === 'agentMessage' && item.phase === 'final')
  )
    throw Error('Retired-source original thread or interrupted turn differs');
  return { threadId: thread.id, threadStatus: thread.status.type, turnId: turn.id, turnStatus: 'interrupted' };
}

/** @param {unknown} value @param {number} depth @param {unknown[]} issued @param {unknown[]} waves @returns {void} */
function collectRetiredSourceThreadOutput(value: unknown, depth: number, issued: unknown[], waves: unknown[]): void {
  if (depth > 5 || value === null || value === undefined) return;
  if (typeof value === 'string') return collectRetiredSourceJsonText(value, depth, issued, waves);
  if (isUnknownArray(value)) {
    for (const entry of value) collectRetiredSourceThreadOutput(entry, depth + 1, issued, waves);
    return;
  }
  if (isRecord(value)) collectRetiredSourceOutputRecord(value, depth, issued, waves);
}

/** @param {string} value @param {number} depth @param {unknown[]} issued @param {unknown[]} waves @returns {void} */
function collectRetiredSourceJsonText(value: string, depth: number, issued: unknown[], waves: unknown[]): void {
  if (value.length > 256 * 1024 || !/^[\s]*[[{]/.test(value)) return;
  try {
    collectRetiredSourceThreadOutput(parseJsonUnknown(value), depth + 1, issued, waves);
  } catch {
    /* command output need not be JSON */
  }
}

/** @param {Record<string, unknown>} value @param {number} depth @param {unknown[]} issued @param {unknown[]} waves @returns {void} */
function collectRetiredSourceOutputRecord(
  value: Record<string, unknown>,
  depth: number,
  issued: unknown[],
  waves: unknown[],
): void {
  if (value.schema === 'VidaAgentRunResult/v1' && isUnknownArray(value.issued_actions))
    for (const action of value.issued_actions) issued.push(action);
  if (value.status === 'wave_issued' && typeof value.issue_id === 'string') waves.push(value);
  if (typeof value.stdout === 'string') collectRetiredSourceThreadOutput(value.stdout, depth + 1, issued, waves);
}

/** @param {RetiredSourceItem} item @param {Set<string>} commandIds @param {(value: unknown, depth?: number) => void} collect @returns {import('../src/host-state.ts').RetiredSourceCaptureTerminalEvidence['observed_commands'][number]} */
function readRetiredSourceCommand(
  item: RetiredSourceItem,
  commandIds: Set<string>,
  collect: (value: unknown, depth?: number) => void,
): import('../src/host-state.ts').RetiredSourceCaptureTerminalEvidence['observed_commands'][number] {
  const itemId = item.id,
    command = item.command,
    status = item.status,
    exitCode = item.exitCode;
  if (
    typeof itemId !== 'string' ||
    commandIds.has(itemId) ||
    typeof command !== 'string' ||
    !isRetiredSourceCommandStatus(status) ||
    typeof exitCode !== 'number' ||
    !Number.isSafeInteger(exitCode)
  )
    throw Error('Retired-source command inventory has a duplicate or unresolved outcome');
  commandIds.add(itemId);
  const { output, present, truncated } = readRetiredSourceCommandOutput(item);
  if (present) collect(output);
  assertRetiredSourceCommandOutputIsSafe(truncated, command);
  return {
    ref: itemId,
    status,
    exit_code: exitCode,
    command_sha256: digest(Buffer.from(command, 'utf8')),
    output_sha256: present ? digest(Buffer.from(output, 'utf8')) : null,
    output_present: present,
    output_truncated: truncated,
  };
}

/** @param {RetiredSourceItem} item @returns {{output: string, present: boolean, truncated: boolean}} */
function readRetiredSourceCommandOutput(item: RetiredSourceItem): {
  output: string;
  present: boolean;
  truncated: boolean;
} {
  const outputRecord = isRecord(item.output) ? item.output : undefined;
  const present = item.output !== null && item.output !== undefined;
  if (!isCompleteRetiredSourceCommandOutput(present, outputRecord))
    throw Error('Retired-source command output is incomplete');
  return {
    output: present && outputRecord && typeof outputRecord.text === 'string' ? outputRecord.text : '',
    present,
    truncated: present && outputRecord?.truncated === true,
  };
}

/** @param {boolean} present @param {Record<string, unknown> | undefined} output @returns {boolean} */
function isCompleteRetiredSourceCommandOutput(present: boolean, output: Record<string, unknown> | undefined): boolean {
  return !present || (output !== undefined && typeof output.text === 'string' && typeof output.truncated === 'boolean');
}

/** @param {boolean} truncated @param {string} command @returns {void} */
function assertRetiredSourceCommandOutputIsSafe(truncated: boolean, command: string): void {
  if (
    truncated &&
    (!/\bGet-Content\b/i.test(command) ||
      /\b(Set-Content|Add-Content|Out-File|Remove-Item|Move-Item|Copy-Item|write_text|write_bytes|writeFileSync)\b/i.test(
        command,
      ))
  )
    throw Error('Retired-source truncated command output could hide an effect');
}

/** @param {unknown} value @param {RetiredSourceExpected} expected @returns {boolean} */
function matchesRetiredSourceIssueWave(value: unknown, expected: RetiredSourceExpected): boolean {
  return isRecord(value) && value.issue_id === expected.issueId && value.host_attempt_id === expected.hostAttemptId;
}

/** @param {string} root @param {RetiredSourceItem} item @returns {{ref: string, paths: string[]}} */
function readRetiredSourceFileChange(root: string, item: RetiredSourceItem): { ref: string; paths: string[] } {
  if (item.status !== 'completed' || !Array.isArray(item.changes) || !item.changes.every(isRetiredSourceChange))
    throw Error('Retired-source file-change event is unresolved');
  return {
    ref: item.id,
    paths: item.changes.map((change) => {
      if (!isRetiredSourceChange(change) || change.diff.truncated !== false)
        throw Error('Retired-source file-change evidence is incomplete');
      return path.relative(root, path.resolve(change.path)).replaceAll('\\', '/');
    }),
  };
}

/**
 * @param {string} root
 * @param {unknown} reference
 * @param {RetiredSourceExpected} expected
 * @returns {{artifact_sha256: string, nativeReadResult: import('../src/host-state.ts').RetiredSourceNativeReadResult, observed_commands: import('../src/host-state.ts').RetiredSourceCaptureTerminalEvidence['observed_commands'], file_changes: unknown[], retained_patches: {path: string, sha256: string}[], issue: import('../src/host-state.ts').RetiredSourceNativeReadResult['issue']}}
 */
function readRetiredSourceNativeTurn(
  root: string,
  reference: unknown,
  expected: RetiredSourceExpected,
): {
  artifact_sha256: string;
  nativeReadResult: import('../src/host-state.ts').RetiredSourceNativeReadResult;
  observed_commands: import('../src/host-state.ts').RetiredSourceCaptureTerminalEvidence['observed_commands'];
  file_changes: unknown[];
  retained_patches: { path: string; sha256: string }[];
  issue: import('../src/host-state.ts').RetiredSourceNativeReadResult['issue'];
} {
  if (typeof reference !== 'string' || !reference.startsWith('.tmp/') || path.isAbsolute(reference))
    throw Error('Retired-source native evidence must reference a retained .tmp read');
  const file = path.resolve(root, reference),
    relative = path.relative(root, file),
    before = lstatSync(file);
  if (
    relative.startsWith('..') ||
    path.isAbsolute(relative) ||
    realpathSync(file) !== file ||
    !before.isFile() ||
    before.isSymbolicLink() ||
    before.nlink !== 1
  )
    throw Error('Retired-source native evidence path differs');
  const bytes = readFileSync(file),
    after = lstatSync(file);
  if (
    bytes.length > 5 * 1024 * 1024 ||
    !after.isFile() ||
    after.isSymbolicLink() ||
    after.nlink !== 1 ||
    before.dev !== after.dev ||
    before.ino !== after.ino ||
    before.size !== after.size
  )
    throw Error('Retired-source native evidence changed or exceeds its bound');
  /** @type {unknown} */
  const parsedArtifact: unknown = JSON.parse(bytes.toString('utf8'));
  if (!isRecord(parsedArtifact)) throw Error('Retired-source native evidence must be an object');
  const { threadId, threadStatus, turnId, turnStatus, items } = parseRetiredSourceNativeTurnPayload(
    parsedArtifact,
    expected,
  );
  /** @type {unknown[]} */
  const issued: unknown[] = [];
  /** @type {unknown[]} */
  const waves: unknown[] = [];
  /** @param {unknown} value @param {number} [depth] @returns {void} */
  const collect = (value: unknown, depth: number = 0) => collectRetiredSourceThreadOutput(value, depth, issued, waves);
  /** @type {Set<string>} */
  const commandIds: Set<string> = new Set(),
    commands = items
      .filter((item) => item.type === 'commandExecution')
      .map((item) => readRetiredSourceCommand(item, commandIds, collect));
  if (!commands.length || commands.length > 512) throw Error('Retired-source complete command inventory is absent');
  const matches = issued
    .filter(isRetiredSourceIssuedAction)
    .filter(
      (entry) =>
        entry.request.action_id === expected.actionId &&
        entry.action.action_id === expected.actionId &&
        entry.issue_id === expected.issueId &&
        entry.host_attempt_id === expected.hostAttemptId,
    );
  const direct = waves.filter((entry) => matchesRetiredSourceIssueWave(entry, expected));
  if (matches.length !== 1 || direct.length !== 1) throw Error('Retired-source original issue mapping differs');
  const matched = matches[0];
  const issuedWave = direct[0];
  if (!matched || !isRecord(issuedWave)) throw Error('Retired-source original issue mapping is missing');
  const action = matched.action,
    packet = matched.development_packet;
  if (
    !packet ||
    packet.schema !== 'DevelopmentTaskPacket/v1' ||
    packet.work_item_id !== expected.workId ||
    packet.attempt !== expected.attempt ||
    packet.packet_id !== issuedWave.packet_id ||
    typeof packet.digest !== 'string' ||
    !/^[a-f0-9]{64}$/.test(packet.digest) ||
    action.stage_id !== matched.request.stage_id ||
    action.scope_digest !== matched.request.scope_digest
  )
    throw Error('Retired-source original issued packet binding differs');
  const fileChanges = items
    .filter((item) => item.type === 'fileChange')
    .map((item) => readRetiredSourceFileChange(root, item));
  const issue = {
    action_id: action.action_id,
    issue_id: matched.issue_id,
    host_attempt_id: matched.host_attempt_id,
    packet_id: packet.packet_id,
    packet_digest: packet.digest,
    work_item_id: packet.work_item_id,
    attempt: packet.attempt,
    stage_id: action.stage_id,
    scope_digest: action.scope_digest,
  };
  const sourceEffects = retiredSourceEffects(root, items, expected.sourcePaths);
  /** @type {import('../src/host-state.ts').RetiredSourceNativeReadResult} */
  const nativeReadResult: import('../src/host-state.ts').RetiredSourceNativeReadResult = {
    schema: 'RetiredSourceNativeTurnEvidence/v1',
    artifact_ref: reference,
    artifact_sha256: digest(Buffer.from(bytes)),
    thread_id: threadId,
    thread_status: threadStatus,
    turn_id: turnId,
    turn_status: turnStatus,
    issue,
    command_refs: commands.map((entry) => entry.ref),
    file_change_refs: fileChanges.map((entry) => entry.ref),
    source_effects: sourceEffects.effects,
  };
  return {
    artifact_sha256: digest(Buffer.from(bytes)),
    nativeReadResult,
    observed_commands: commands,
    file_changes: fileChanges,
    retained_patches: sourceEffects.retained,
    issue,
  };
}

/** @param {string[]} args */
async function captureRetiredSource(args: string[]) {
  const { readFileSync, realpathSync } = await import('node:fs');
  const { createHash } = await import('node:crypto');
  const { loadRuntimeConfig, runtimeConfigDigest } = await import('../src/config/runtime-config.ts');
  const { requireSafeRepositoryAccess } = await import('../src/config/safe-repository-access.ts');
  const { sessionHandoffDatabasePath } = await import('../src/config/project-paths.ts');
  const { parseSessionBridgeObservation } = await import('../src/orchestration/mastra-session-bridge.ts');
  const { deriveWorkspaceId } = await import('../src/workspace-identity.ts');
  if (
    args.length !== 6 ||
    args[0] !== '--project-root' ||
    args[2] !== '--native-session-handle' ||
    args[4] !== '--request'
  )
    throw Error('Retired-source capture requires exact root, current owner handle and request');
  const root = realpathSync(requireOption(args[1], '--project-root')),
    operatorHandle = requireOption(args[3], '--native-session-handle'),
    config = loadRuntimeConfig(root),
    workspaceId = deriveWorkspaceId(config.repository.repository_id, root),
    requestPath = path.resolve(root, requireOption(args[5], '--request')),
    requestRelative = path.relative(root, requestPath);
  if (requestRelative.startsWith('..') || path.isAbsolute(requestRelative) || realpathSync(requestPath) !== requestPath)
    throw Error('Retired-source request path differs');
  const requestBytes = readFileSync(requestPath);
  if (requestBytes.length > 1048576) throw Error('Retired-source request exceeds bound');
  /** @type {unknown} */
  const parsedInput: unknown = JSON.parse(requestBytes.toString('utf8'));
  if (!isRetiredSourceCaptureEnvelope(parsedInput))
    throw Error('Retired-source request workspace or owner binding differs');
  const input = parsedInput;
  if (input.workspace_id !== workspaceId || input.operatorHandle !== operatorHandle)
    throw Error('Retired-source request workspace or owner binding differs');
  const { workspace_id: _workspace, nativeTurnEvidenceRef, observation: rawObservation, ...operation } = input,
    observation = parseSessionBridgeObservation(rawObservation),
    hostAttemptId = input.observation.host_attempt_id;
  if (observation.host_attempt_id !== hostAttemptId) throw Error('Retired-source observation owner binding differs');
  const interruptedTurnStatus = 'interrupted';
  /** @type {'completed'} */
  const completedCommandStatus = 'completed' as const;
  const access = requireSafeRepositoryAccess(root),
    readResult = readRetiredSourceNativeTurn(root, nativeTurnEvidenceRef, {
      sourceThreadId: operation.terminalEvidence.source_thread_id,
      sourceTurnId: operation.terminalEvidence.source_turn_id,
      actionId: operation.actionId,
      issueId: operation.issueId,
      hostAttemptId,
      workId: operation.identity.work_id,
      attempt: operation.attempt,
      sourcePaths: operation.candidateSnapshot.entries.map((entry) => entry.path),
    });
  /** @type {import('../src/host-state.ts').RetiredSourceCaptureTerminalEvidence} */
  const terminalEvidence: import('../src/host-state.ts').RetiredSourceCaptureTerminalEvidence = {
    ...operation.terminalEvidence,
    source_thread_status: readResult.nativeReadResult.thread_status,
    source_turn_status: interruptedTurnStatus,
    final_message_id: null,
    action_id: readResult.issue.action_id,
    issue_id: readResult.issue.issue_id,
    host_attempt_id: readResult.issue.host_attempt_id,
    observed_commands: readResult.observed_commands,
  };
  const sourceFileChanges = readResult.nativeReadResult.source_effects.map((event) => ({
      call_ref: event.event_ref,
      path: event.path,
    })),
    originalToolRecords = [...new Set(sourceFileChanges.map((entry) => entry.call_ref))].map((callRef) => ({
      call_ref: callRef,
      actor_id: terminalEvidence.original_actor_id,
      action_id: readResult.issue.action_id,
      issue_id: readResult.issue.issue_id,
      host_attempt_id: readResult.issue.host_attempt_id,
      status: completedCommandStatus,
      changed_paths: [
        ...new Set(sourceFileChanges.filter((entry) => entry.call_ref === callRef).map((entry) => entry.path)),
      ],
    })),
    terminalEvidenceWithRecords = { ...terminalEvidence, original_tool_records: originalToolRecords },
    operationWithEvidence = {
      ...operation,
      observation,
      nativeTurnEvidenceRef,
      nativeReadResult: readResult.nativeReadResult,
      terminalEvidence: terminalEvidenceWithRecords,
      attributions: readResult.nativeReadResult.source_effects,
    },
    verifyCurrent = () => {
      if (
        !readFileSync(requestPath).equals(requestBytes) ||
        runtimeConfigDigest(loadRuntimeConfig(root)) !== runtimeConfigDigest(config)
      )
        throw Error('Retired-source request or configuration changed');
      const reread = readRetiredSourceNativeTurn(root, nativeTurnEvidenceRef, {
        sourceThreadId: terminalEvidence.source_thread_id,
        sourceTurnId: terminalEvidence.source_turn_id,
        actionId: operation.actionId,
        issueId: operation.issueId,
        hostAttemptId,
        workId: operation.identity.work_id,
        attempt: operation.attempt,
        sourcePaths: operation.candidateSnapshot.entries.map((entry) => entry.path),
      });
      if (
        reread.artifact_sha256 !== readResult.artifact_sha256 ||
        !isDeepStrictEqual(reread.nativeReadResult.source_effects, readResult.nativeReadResult.source_effects)
      )
        throw Error('Retired-source native turn evidence changed');
      for (const entry of operation.candidateSnapshot.entries) {
        const absolute = path.resolve(root, entry.path),
          relative = path.relative(root, absolute);
        if (relative.startsWith('..') || path.isAbsolute(relative) || realpathSync(absolute) !== absolute)
          throw Error('Retired-source candidate path differs');
        const bytes = access.readBytes(entry.path, 'retired-source candidate');
        if (bytes.length !== entry.size || createHash('sha256').update(bytes).digest('hex') !== entry.sha256)
          throw Error('Retired-source candidate changed after attribution');
      }
    };
  verifyCurrent();
  const database = openCliHostStateDatabase(root, sessionHandoffDatabasePath(root, config), workspaceId);
  try {
    const store = createCliHostStateStore(database, workspaceId),
      result = store.captureRetiredSourceObservation({ ...operationWithEvidence, verifyCurrent });
    return {
      schema: 'RetiredSourceCapture/v1',
      status: 'captured_original_partial_source_failure',
      request_digest: result.request_digest,
      work_version: result.snapshot.workVersion,
      ledger_version: result.snapshot.ledgerVersion,
      rights_granted: false,
      canonical_acceptance: false,
      runtime_acceptance: false,
    };
  } finally {
    closeWorkspaceDatabaseWithAdmission(database);
  }
}

/** @param {string} mode @param {unknown} value @returns {value is InterruptedSourceRetirementInspection | InterruptedSourceRetirementInput} */
function isInterruptedSourceRetirementModeInput(
  mode: string,
  value: unknown,
): value is InterruptedSourceRetirementInspection | InterruptedSourceRetirementInput {
  return mode === 'inspect'
    ? isInterruptedSourceRetirementInspection(value)
    : isInterruptedSourceRetirementInput(value);
}

/** @param {unknown} value @returns {asserts value is InterruptedSourceRetirementInput} */
function assertInterruptedSourceRetirementInput(value: unknown): asserts value is InterruptedSourceRetirementInput {
  if (!isInterruptedSourceRetirementInput(value))
    throw Error('Interrupted Source retirement apply request shape differs');
}

/** @param {string[]} args */
async function retireInterruptedSourceOwner(args: string[]) {
  const { canonicalJsonDigest } = await import('../src/contracts/public-ingress.ts');
  if (
    args.length !== 8 ||
    args[0] !== '--mode' ||
    args[2] !== '--project-root' ||
    args[4] !== '--native-session-handle' ||
    args[6] !== '--request'
  )
    throw Error('Interrupted Source retirement requires mode, exact root, current owner handle and request');
  const mode = requireOption(args[1], '--mode'),
    root = realpathSync(requireOption(args[3], '--project-root')),
    operatorHandle = requireOption(args[5], '--native-session-handle');
  if (mode !== 'inspect' && mode !== 'apply') throw Error('Interrupted Source retirement mode invalid');
  const { loadRuntimeConfig, runtimeConfigDigest } = await import('../src/config/runtime-config.ts');
  const { requireSafeRepositoryAccess } = await import('../src/config/safe-repository-access.ts');
  const { loadProjectSetContext } = await import('../src/config/project-context.ts');
  const { openConfiguredMastraSessionLedger } = await import('../src/orchestration/persistent-session-handoff.ts');
  const { readAdmittedSessionIntake } = await import('../src/orchestration/admitted-session-execution.ts');
  const config = loadRuntimeConfig(root),
    access = requireSafeRepositoryAccess(root),
    requestBytes = access.readBytes(requireOption(args[7], '--request'), 'interrupted Source retirement request');
  if (!requestBytes.length || requestBytes.length > 65536)
    throw Error('Interrupted Source retirement request exceeds bound');
  /** @type {unknown} */
  const parsedInput: unknown = JSON.parse(requestBytes.toString('utf8'));
  if (!isRecord(parsedInput)) throw Error('Interrupted Source retirement request shape differs');
  const input = parsedInput;
  if (!isInterruptedSourceRetirementModeInput(mode, input))
    throw Error('Interrupted Source retirement request shape differs');
  if (
    input.identity.repository_id !== config.repository.repository_id ||
    input.identity.project_ids.length !== 1 ||
    !operatorHandle.trim()
  )
    throw Error('Interrupted Source retirement identity differs');
  const project = loadProjectSetContext(root, config, input.identity.repository_id, input.identity.project_ids);
  if (project.integrations_digest !== input.identity.integrations_digest)
    throw Error('Interrupted Source retirement ProjectContext differs');
  const ledger = openConfiguredMastraSessionLedger(root);
  try {
    const store = ledger.hostState,
      snapshot = store.readWorkSessionSnapshot(input.identity, input.attempt),
      host = snapshot.host,
      intake = readAdmittedSessionIntake(root, store, input.identity),
      journalRow = snapshot.journal;
    if (
      !host.work ||
      !journalRow ||
      journalRow.attempt !== input.attempt ||
      !host.workVersion ||
      !host.ledgerVersion ||
      host.work.binding.config_digest !== runtimeConfigDigest(config) ||
      intake.native_session_handle !== operatorHandle ||
      (host.work.lease && host.work.lease.thread_id !== operatorHandle)
    )
      throw Error('Interrupted Source retirement current owner or project binding differs');
    const journal = journalRow.state,
      items = [...journal.items, ...journal.completed.flatMap((wave) => wave.items)],
      eligible = items.filter(
        (entry) =>
          entry.issue_id &&
          entry.observation === null &&
          entry.host_reservation?.approvalAction === 'source.write' &&
          entry.host_reservation.authorization?.receipt?.attempt?.status === 'started' &&
          entry.host_reservation.authorization?.approval?.status === 'commit_unknown',
      ),
      item = eligible.length === 1 ? eligible[0] : null,
      reservation = item?.host_reservation,
      authorization = reservation?.authorization;
    if (!item || !item.issue_id || !authorization || authorization.receipt.attempt.lease.thread_id !== operatorHandle)
      throw Error('Interrupted Source retirement requires one exact pending Source issue');
    const projection = {
      identity: input.identity,
      attempt: input.attempt,
      actionId: item.request.action_id,
      issueId: item.issue_id,
      expectedWork: host.workVersion,
      expectedLedger: host.ledgerVersion,
      expectedJournal: journalRow.version,
      expectedMaintenanceGeneration: host.maintenanceGeneration,
    };
    if (mode === 'inspect') {
      if (!host.work.lease) throw Error('Interrupted Source owner already has no active lease');
      return {
        status: 'interrupted_source_retirement_inspected',
        request: projection,
        owner_thread_id: operatorHandle,
        rights_granted: false,
        attempt_outcome_resolved: false,
      };
    }
    assertInterruptedSourceRetirementInput(input);
    const request = {
        identity: input.identity,
        attempt: input.attempt,
        actionId: input.actionId,
        issueId: input.issueId,
        expectedWork: input.expectedWork,
        expectedLedger: input.expectedLedger,
        expectedJournal: input.expectedJournal,
        expectedMaintenanceGeneration: input.expectedMaintenanceGeneration,
        authorization,
        operatorHandle,
        decisionPointer: input.decisionPointer,
        evidence: input.evidence,
      },
      priorRelease =
        host.ledger?.operations.some(
          (entry) => entry.operation_id === 'interrupted-source-release-' + canonicalJsonDigest(request),
        ) ?? false;
    /** @type {Array<keyof typeof projection>} */
    const projectionKeys: Array<keyof typeof projection> = [
      'identity',
      'attempt',
      'actionId',
      'issueId',
      'expectedWork',
      'expectedLedger',
      'expectedJournal',
      'expectedMaintenanceGeneration',
    ];
    for (const key of projectionKeys) {
      if (priorRelease && ['expectedWork', 'expectedLedger'].includes(key)) continue;
      if (canonicalJsonDigest(input[key]) !== canonicalJsonDigest(projection[key]))
        throw Error('Interrupted Source retirement Work/Ledger/Journal/maintenance CAS differs');
    }
    if (
      !item ||
      item.issue_id !== input.issueId ||
      item.observation !== null ||
      !reservation ||
      reservation.approvalAction !== 'source.write' ||
      authorization?.receipt?.attempt?.status !== 'started' ||
      authorization.approval?.status !== 'commit_unknown' ||
      input.evidence.schema !== 'InterruptedSourceRetirementEvidence/v1' ||
      input.evidence.source_thread_status !== 'interrupted' ||
      typeof input.evidence.source_thread_id !== 'string' ||
      !input.evidence.source_thread_id.trim() ||
      typeof input.evidence.read_thread_ref !== 'string' ||
      !input.evidence.read_thread_ref.trim() ||
      typeof input.evidence.list_agents_ref !== 'string' ||
      !input.evidence.list_agents_ref.trim() ||
      !Array.isArray(input.evidence.active_source_writer_ids) ||
      input.evidence.active_source_writer_ids.length !== 0 ||
      !Number.isSafeInteger(input.attempt) ||
      input.attempt < 1 ||
      !Number.isSafeInteger(input.expectedMaintenanceGeneration) ||
      typeof input.decisionPointer !== 'string' ||
      !input.decisionPointer.trim()
    )
      throw Error('Interrupted Source retirement target or cooperative evidence differs');
    const result = store.retireInterruptedSourceOwner(request),
      after = store.readWorkSessionSnapshot(input.identity, input.attempt).journal;
    if (!after || canonicalJsonDigest(after.version) !== canonicalJsonDigest(input.expectedJournal))
      throw Error('Interrupted Source retirement unexpectedly changed the session journal');
    return {
      status: 'interrupted_source_owner_released',
      operation_id: result.operation_id,
      request_digest: result.request_digest,
      work_version: result.snapshot.workVersion,
      ledger_version: result.snapshot.ledgerVersion,
      attempt_status: result.attempt_receipt.attempt.status,
      rights_granted: false,
      attempt_outcome_resolved: false,
      journal_version: after.version,
    };
  } finally {
    ledger.close();
  }
}

/**
 * @param {typeof import('../src/orchestration/mastra-session-bridge.ts').buildSessionBridgeRequest} build
 * @param {Omit<Parameters<typeof import('../src/orchestration/mastra-session-bridge.ts').buildSessionBridgeRequest>[0], 'correctiveExecution'>} args
 * @param {Parameters<typeof import('../src/orchestration/mastra-session-bridge.ts').buildSessionBridgeRequest>[0]['correctiveExecution']} correctiveExecution
 * @returns {ReturnType<typeof import('../src/orchestration/mastra-session-bridge.ts').buildSessionBridgeRequest>}
 */
function buildReadonlyReleaseRequest(
  build: typeof import('../src/orchestration/mastra-session-bridge.ts').buildSessionBridgeRequest,
  args: Omit<
    Parameters<typeof import('../src/orchestration/mastra-session-bridge.ts').buildSessionBridgeRequest>[0],
    'correctiveExecution'
  >,
  correctiveExecution: Parameters<
    typeof import('../src/orchestration/mastra-session-bridge.ts').buildSessionBridgeRequest
  >[0]['correctiveExecution'],
): ReturnType<typeof import('../src/orchestration/mastra-session-bridge.ts').buildSessionBridgeRequest> {
  return build(correctiveExecution === undefined ? args : { ...args, correctiveExecution });
}

/** @param {string[]} args */
async function releaseCompletedReadonly(args: string[]) {
  const { canonicalJsonDigest } = await import('../src/contracts/public-ingress.ts');
  if (args.length !== 6 || args[0] !== '--mode' || args[2] !== '--project-root' || args[4] !== '--request')
    throw Error('Readonly release requires mode, exact root and request');
  const mode = requireReadonlyReleaseArg(args, 1),
    root = realpathSync(requireReadonlyReleaseArg(args, 3)),
    requestPath = requireReadonlyReleaseArg(args, 5);
  if (!['inspect', 'plan', 'apply', 'resume'].includes(mode)) throw Error('Readonly release mode invalid');
  const { loadRuntimeConfig, runtimeConfigDigest } = await import('../src/config/runtime-config.ts');
  const { requireSafeRepositoryAccess } = await import('../src/config/safe-repository-access.ts');
  const { sessionHandoffDatabasePath } = await import('../src/config/project-paths.ts');
  const { deriveWorkspaceId } = await import('../src/workspace-identity.ts');
  const { suspendCompletedReadOnlyWork } = await import('../src/orchestration/suspend-local-work.ts');
  const { readAdmittedSessionIntake } = await import('../src/orchestration/admitted-session-execution.ts');
  const {
    buildSessionBridgeRequest,
    configuredContextForStage,
    parseSessionBridgeObservation,
    parseSessionBridgeRequest,
    parseSessionBridgeRunState,
    sessionBridgeDatabasePath,
    sessionBridgeRunId,
  } = await import('../src/orchestration/mastra-session-bridge.ts');
  const { sessionActionsForWave } = await import('../src/orchestration/session-handoff.ts');
  const config = loadRuntimeConfig(root),
    access = requireSafeRepositoryAccess(root);
  const requestBytes = access.readBytes(requestPath, 'completed readonly release request');
  if (requestBytes.length > 65536) throw Error('Readonly release request exceeds bound');
  /** @type {unknown} */
  const decodedRequest: unknown = JSON.parse(requestBytes.toString('utf8'));
  if (!isCompletedReadonlyReleaseRequest(decodedRequest)) throw Error('Readonly release identity differs');
  const request = decodedRequest,
    equal = (/** @type {unknown} */ a: unknown, /** @type {unknown} */ b: unknown) =>
      canonicalJsonDigest(a) === canonicalJsonDigest(b);
  if (
    request.workspace_id !== deriveWorkspaceId(config.repository.repository_id, root) ||
    request.identity.project_ids.length !== 1 ||
    (request.requestIntent !== 'linked_correction' && request.requestIntent !== 'next_work')
  )
    throw Error('Readonly release identity differs');
  const databasePath = sessionHandoffDatabasePath(root, config),
    workspace = inspectCliHostWorkspaceDatabase(root, databasePath, request.workspace_id);
  const selected = workspace.work.find((row) => equal(row.identity, request.identity)),
    row = workspace.journals.find((j) => j.work_id === request.identity.work_id && j.attempt === request.attempt);
  if (!selected || !row || !equal(row.version, request.expectedJournal))
    throw Error('Readonly release journal identity/CAS differs');
  const { settledSessionItems, configuredReadonlyAssignment, validateWorkSessionBinding } =
    await import('../src/orchestration/final-assurance.ts');
  const work = selected.state,
    state = row.state,
    settlement = settledSessionItems(state),
    items = settlement.observed,
    inertItems = settlement.inert;
  if (
    work.binding.config_digest !== runtimeConfigDigest(config) ||
    state.run_id !== (state.corrective_execution?.engine_run_id ?? work.execution.run_id) ||
    state.source_scope?.digest !== work.binding.work_source_revision ||
    state.attempt !== request.attempt ||
    work.execution.assignment_attempts.length !== 0 ||
    !items.length
  )
    throw Error('Readonly release current binding or host effects differ');
  const engine = openCliWorkspaceDatabase(root, sessionBridgeDatabasePath(root, config), request.workspace_id, true);
  try {
    const rawSnapshots = readReadonlyReleaseSnapshotRows(engine, state.run_id);
    if (!isReadonlyReleaseSnapshotRows(rawSnapshots)) throw Error('Readonly release original engine missing/ambiguous');
    const snapshots = rawSnapshots,
      snapshotRow = requireOnlyReadonlyReleaseSnapshotRow(snapshots),
      snapshot = parseReadonlyReleaseEngineSnapshot(snapshotRow.snapshot);
    if (!isReadonlyReleaseEngineSnapshot(snapshot)) throw Error('Readonly release original engine binding differs');
    const parseRunState = (/** @type {unknown} */ value: unknown) => {
        const parsed = parseSessionBridgeRunState(value);
        if (!isDeepStrictEqual(parsed, value)) throw Error('Readonly release actual engine completion differs');
        return parsed;
      },
      input = parseRunState(snapshot.context.input),
      context = { work_id: input.work_id, attempt: input.attempt, scope_digest: input.scope_digest };
    if (
      snapshot.status !== 'suspended' ||
      snapshot.runId !== state.run_id ||
      input.work_id !== request.identity.work_id ||
      input.attempt !== request.attempt ||
      input.config_digest !== work.binding.config_digest ||
      input.scope_digest !== state.source_scope.digest ||
      input.workflow_id !== snapshotRow.workflow_name ||
      input.observations.length !== 0 ||
      !Array.isArray(input.selection?.risk_flags)
    )
      throw Error('Readonly release original engine binding differs');
    /** @type {ReadonlyReleaseEngineWaveCandidate[]} */
    const waveCandidates: ReadonlyReleaseEngineWaveCandidate[] = Object.entries(snapshot.context).map(
      ([key, value]) => ({
        waveIndex: /^wave-(\d+)$/.test(key) ? Number(key.slice(5)) : null,
        value,
      }),
    );
    const engineWaves = waveCandidates
        .filter(isReadonlyReleaseEngineWave)
        .sort(
          (/** @type {ReadonlyReleaseEngineWave} */ a, /** @type {ReadonlyReleaseEngineWave} */ b) =>
            a.waveIndex - b.waveIndex,
        ),
      frontiers = engineWaves.filter(isReadonlyReleaseSuspendedWave);
    if (frontiers.length !== 1) throw Error('Readonly release actual engine frontier differs');
    const frontier = requireFirstReadonlyReleaseValue(frontiers),
      frontierStep = frontier.value;
    if (engineWaves.some((entry) => !isReadonlyReleaseSuccessfulWave(entry) && entry.waveIndex !== frontier.waveIndex))
      throw Error('Readonly release actual engine frontier differs');
    if (!isReadonlyReleaseFrontierStep(frontierStep)) throw Error('Readonly release actual engine frontier differs');
    const frontierRequests = frontierStep.suspendPayload.requests.map((value) => parseSessionBridgeRequest(value));
    if (!frontierRequests.length) throw Error('Readonly release actual engine frontier differs');
    const firstFrontierRequest = requireFirstReadonlyReleaseValue(frontierRequests),
      correctiveExecution = firstFrontierRequest.corrective_execution,
      baseRunId = sessionBridgeRunId(request.workspace_id, context, input.workflow_id);
    if (
      frontierRequests.some((entry) => !isDeepStrictEqual(entry.corrective_execution, correctiveExecution)) ||
      !isDeepStrictEqual(state.corrective_execution ?? undefined, correctiveExecution) ||
      baseRunId !== work.execution.run_id
    )
      throw Error('Readonly release original engine binding differs');
    if (correctiveExecution) {
      validateWorkSessionBinding(
        work,
        { attempt: state.attempt, run_id: state.run_id, corrective_execution: correctiveExecution },
        root,
      );
    } else {
      validateWorkSessionBinding(work, { attempt: state.attempt, run_id: state.run_id }, root);
    }
    if (
      correctiveExecution
        ? correctiveExecution.base_run_id !== baseRunId || correctiveExecution.engine_run_id !== state.run_id
        : state.run_id !== baseRunId
    )
      throw Error('Readonly release original engine binding differs');
    /** @type {Map<number, {item: (typeof items)[number], issued: ReturnType<typeof parseSessionBridgeRequest>, observed: ReturnType<typeof parseSessionBridgeObservation>}[]>} */
    const groupedItems: Map<
      number,
      {
        item: (typeof items)[number];
        issued: ReturnType<typeof parseSessionBridgeRequest>;
        observed: ReturnType<typeof parseSessionBridgeObservation>;
      }[]
    > = new Map();
    for (const item of items) {
      const issued = parseSessionBridgeRequest(item.request),
        observed = parseSessionBridgeObservation(item.observation);
      if (
        !isDeepStrictEqual(issued, item.request) ||
        !isDeepStrictEqual(observed, item.observation) ||
        !isDeepStrictEqual(issued.corrective_execution, correctiveExecution) ||
        item.issue_id === null ||
        observed.status !== 'reported_complete' ||
        observed.action_id !== issued.action_id ||
        observed.issue_id !== item.issue_id ||
        observed.output_digest !== canonicalJsonDigest(observed.summary) ||
        item.host_reservation ||
        item.research_activation ||
        item.research_normalization ||
        !configuredReadonlyAssignment(config, issued) ||
        issued.run_id !== state.run_id ||
        issued.config_digest !== input.config_digest ||
        issued.scope_digest !== input.scope_digest ||
        issued.workflow_id !== input.workflow_id
      )
        throw Error('Readonly release actual accepted readonly action differs');
      const group = groupedItems.get(issued.wave_index) ?? [];
      group.push({ item, issued, observed });
      groupedItems.set(issued.wave_index, group);
    }
    let priorState = input;
    const verifiedWaves = new Set();
    for (const { waveIndex, value: step } of engineWaves.filter(isReadonlyReleaseSuccessfulWave)) {
      if (
        waveIndex >= frontier.waveIndex ||
        !Object.prototype.hasOwnProperty.call(step, 'payload') ||
        !Object.prototype.hasOwnProperty.call(step, 'resumePayload') ||
        !Object.prototype.hasOwnProperty.call(step, 'output') ||
        Object.prototype.hasOwnProperty.call(step, 'suspendPayload')
      )
        throw Error('Readonly release actual engine completion differs');
      const waveInput = parseRunState(step.payload);
      if (
        !isDeepStrictEqual(waveInput, priorState) ||
        waveInput.work_id !== input.work_id ||
        waveInput.attempt !== input.attempt ||
        waveInput.workflow_id !== input.workflow_id ||
        waveInput.config_digest !== input.config_digest ||
        waveInput.scope_digest !== input.scope_digest ||
        !isDeepStrictEqual(waveInput.selection, input.selection)
      )
        throw Error('Readonly release actual engine completion differs');
      const resumePayload = step.resumePayload;
      if (!isRecord(resumePayload) || !Array.isArray(resumePayload.observations))
        throw Error('Readonly release actual engine completion differs');
      const resumeObservations = parseReadonlyReleaseArray(resumePayload.observations, parseSessionBridgeObservation);
      if (!isDeepStrictEqual(resumePayload, { observations: resumeObservations }))
        throw Error('Readonly release actual engine completion differs');
      const output = parseRunState(step.output),
        expectedOutput = { ...waveInput, observations: [...waveInput.observations, ...resumeObservations] };
      if (!isDeepStrictEqual(output, expectedOutput)) throw Error('Readonly release actual engine completion differs');
      const actions = sessionActionsForWave(
        config,
        waveInput.selection,
        context,
        waveInput.workflow_id,
        waveIndex,
        [],
        correctiveExecution,
        work.lifecycle.risk,
      );
      const expectedRequests = actions.map((action) =>
        buildReadonlyReleaseRequest(
          buildSessionBridgeRequest,
          {
            runId: state.run_id,
            workflowId: waveInput.workflow_id,
            configDigest: waveInput.config_digest,
            context,
            waveIndex,
            action,
            configuredContext: configuredContextForStage(root, config, waveInput.workflow_id, action.stage_id, context),
            priorResults: waveInput.observations,
          },
          correctiveExecution,
        ),
      );
      const journalItems = groupedItems.get(waveIndex) ?? [];
      if (
        !expectedRequests.length ||
        journalItems.length !== expectedRequests.length ||
        resumeObservations.length !== expectedRequests.length ||
        new Set(resumeObservations.map((entry) => entry.action_id)).size !== resumeObservations.length
      )
        throw Error('Readonly release actual engine completion differs');
      for (const expected of expectedRequests) {
        const matches = journalItems.filter((entry) => entry.issued.action_id === expected.action_id);
        const engineMatches = resumeObservations.filter((entry) => entry.action_id === expected.action_id);
        const match = requireOneReadonlyReleaseMatch(matches),
          engineMatch = requireOneReadonlyReleaseMatch(engineMatches);
        if (
          !isDeepStrictEqual(match.issued, expected) ||
          !isDeepStrictEqual(engineMatch, match.observed) ||
          engineMatch.issue_id !== match.item.issue_id
        )
          throw Error('Readonly release actual engine completion differs');
      }
      verifiedWaves.add(waveIndex);
      priorState = output;
    }
    if (verifiedWaves.size !== groupedItems.size || inertItems.length !== frontierRequests.length)
      throw Error('Readonly release actual engine completion differs');
    const frontierInput = parseRunState(frontierStep.payload);
    if (
      !isDeepStrictEqual(frontierInput, priorState) ||
      frontierInput.work_id !== input.work_id ||
      frontierInput.attempt !== input.attempt ||
      frontierInput.workflow_id !== input.workflow_id ||
      frontierInput.config_digest !== input.config_digest ||
      frontierInput.scope_digest !== input.scope_digest ||
      !isDeepStrictEqual(frontierInput.selection, input.selection)
    )
      throw Error('Readonly release actual engine frontier differs');
    const frontierActions = sessionActionsForWave(
      config,
      frontierInput.selection,
      context,
      frontierInput.workflow_id,
      frontier.waveIndex,
      [],
      correctiveExecution,
      work.lifecycle.risk,
    );
    const expectedFrontier = frontierActions.map((action) =>
      buildReadonlyReleaseRequest(
        buildSessionBridgeRequest,
        {
          runId: state.run_id,
          workflowId: frontierInput.workflow_id,
          configDigest: frontierInput.config_digest,
          context,
          waveIndex: frontier.waveIndex,
          action,
          configuredContext: configuredContextForStage(
            root,
            config,
            frontierInput.workflow_id,
            action.stage_id,
            context,
          ),
          priorResults: frontierInput.observations,
        },
        correctiveExecution,
      ),
    );
    const inertRequests = inertItems.map((item) => {
      const issued = parseSessionBridgeRequest(item.request);
      if (
        !isDeepStrictEqual(issued, item.request) ||
        item.issue_id !== null ||
        item.observation !== null ||
        item.host_reservation ||
        item.research_activation ||
        item.research_normalization
      )
        throw Error('Readonly release actual engine frontier differs');
      return issued;
    });
    if (
      !expectedFrontier.length ||
      !isDeepStrictEqual(frontierRequests, expectedFrontier) ||
      !isDeepStrictEqual(inertRequests, expectedFrontier)
    )
      throw Error('Readonly release actual engine frontier differs');
  } finally {
    closeWorkspaceDatabaseWithAdmission(engine);
  }
  const planPath = path.join(
    path.dirname(path.resolve(root, requestPath)),
    'readonly-release-plan-' + request.identity.work_id + '.json',
  );
  const database = openCliHostStateDatabase(root, databasePath, request.workspace_id);
  try {
    const store = createCliHostStateStore(database, request.workspace_id),
      intake = readAdmittedSessionIntake(root, store, request.identity);
    const projectId = request.identity.project_ids[0];
    if (!projectId) throw Error('Readonly release identity differs');
    if (
      intake.native_session_handle !== request.nativeSessionHandle ||
      (readonlyReleaseThreadId(work.binding) !== request.identity.thread_id && request.identity.thread_id !== undefined)
    )
      throw Error('Readonly release original owner differs');
    if (['inspect', 'plan'].includes(mode)) {
      if (!equal(selected.version, request.expectedWork) || !equal(workspace.ledger_version, request.expectedLedger))
        throw Error('Readonly release work/ledger CAS differs');
      const plan = {
        schema: 'CompletedReadonlyReleasePlan/v1',
        request_digest: canonicalJsonDigest(request),
        request,
        rights_granted: false,
        canonical_acceptance: false,
      };
      if (mode === 'plan') writeFileSync(planPath, controllerJson(plan), { flag: 'wx' });
      return {
        status: mode === 'plan' ? 'readonly_release_planned' : 'readonly_release_inspected',
        plan_ref: path.relative(root, planPath).replaceAll(path.sep, '/'),
        rights_granted: false,
      };
    }
    /** @type {unknown} */
    const plan: unknown = JSON.parse(readFileSync(planPath, 'utf8'));
    if (!isReadonlyReleasePlan(plan)) throw Error('Readonly release frozen context changed');
    if (
      plan.schema !== 'CompletedReadonlyReleasePlan/v1' ||
      plan.request_digest !== canonicalJsonDigest(request) ||
      !access.readBytes(requestPath, 'readonly release replay').equals(requestBytes) ||
      runtimeConfigDigest(loadRuntimeConfig(root)) !== work.binding.config_digest
    )
      throw Error('Readonly release frozen context changed');
    const result = suspendCompletedReadOnlyWork({
      store,
      identity: request.identity,
      journal: { version: row.version, state, resume_status: 'ready_to_resume' },
      expectedWork: request.expectedWork,
      expectedLedger: request.expectedLedger,
      nativeSessionHandle: request.nativeSessionHandle,
      userRequestPointer: request.userRequestPointer,
      requestIntent: request.requestIntent,
      documentationContext: {
        repository_root: root,
        repository_id: request.identity.repository_id,
        project_id: projectId,
        work_id: request.identity.work_id,
      },
      config,
    });
    return {
      status: 'completed_readonly_owner_released',
      work_version: result.workVersion,
      ledger_version: result.ledgerVersion,
      rights_granted: false,
      canonical_acceptance: false,
      runtime_acceptance: false,
    };
  } finally {
    closeWorkspaceDatabaseWithAdmission(database);
  }
}

/** @param {string[]} args */
async function releaseHistoricalOwner(
  args: string[],
  unissuedOwner = false,
  settledResearch = false,
  readonlyBookkeeping = false,
) {
  const { canonicalJsonDigest } = await import('../src/contracts/public-ingress.ts');
  /** @type {Record<string, string>} */
  const values: Record<string, string> = {};
  if (![10, 12].includes(args.length))
    throw Error('Historical release requires mode, exact root, owner, baseline and request');
  for (let index = 0; index < args.length; index += 2) {
    const key = runOptionKey(args[index]),
      value = args[index + 1];
    if (Object.hasOwn(values, key) || !value) throw Error('Historical release arguments invalid');
    values[key] = value;
  }
  const mode = runOptionKey(values['--mode']),
    projectRoot = runOptionKey(values['--project-root']);
  if (
    Object.keys(values).sort().join('|') !==
      [
        '--mode',
        '--project-root',
        '--native-session-handle',
        '--baseline-config',
        '--request',
        ...(Object.hasOwn(values, '--context-history') ? ['--context-history'] : []),
      ]
        .sort()
        .join('|') ||
    !isHistoricalReleaseMode(mode) ||
    !path.isAbsolute(projectRoot)
  )
    throw Error('Historical release mode or argument set invalid');
  const root = realpathSync(projectRoot);
  const { requireSafeRepositoryAccess } = await import('../src/config/safe-repository-access.ts');
  const { inspectHistoricalOwnerContext } = await import('./runtime-config-rebind.ts');
  const { loadRuntimeConfig } = await import('../src/config/runtime-config.ts');
  const { deriveWorkspaceId } = await import('../src/workspace-identity.ts');
  const { sessionHandoffDatabasePath } = await import('../src/config/project-paths.ts');
  const { readAdmittedSessionIntake } = await import('../src/orchestration/admitted-session-execution.ts');
  const { compareScopedSourceSnapshots } = await import('../src/orchestration/scoped-source-snapshot.ts');
  const { inspectHistoricalOwnerWork, suspendHistoricalOwnerWork } =
    await import('../src/orchestration/suspend-local-work.ts');
  const access = requireSafeRepositoryAccess(root),
    requestPath = requireOption(values['--request'], '--request'),
    baselinePath = requireOption(values['--baseline-config'], '--baseline-config'),
    nativeSessionHandle = requireOption(values['--native-session-handle'], '--native-session-handle');
  /** @param {unknown} value @returns {value is string} */
  const relative = (value: unknown): value is string =>
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 2048 &&
    !value.includes('\\') &&
    !/^(?:\/|[A-Za-z]:)/.test(value) &&
    !/\p{Cc}/u.test(value) &&
    value.split('/').every((part) => part && part !== '.' && part !== '..');
  if (!relative(requestPath) || !relative(baselinePath))
    throw Error('Historical release references must be bounded repository-relative paths');
  const requestBytes = access.readBytes(requestPath, 'historical owner request');
  if (requestBytes.length > 65536) throw Error('Historical release request exceeds bound');
  const contract = historicalOwnerReleaseContract(readonlyBookkeeping, settledResearch, unissuedOwner),
    decodedRequest = parseHistoricalOwnerReleaseRequest(
      requestBytes.toString('utf8'),
      contract.schema,
      contract.predicates,
      mode,
    ),
    { inspection: suppliedInspection, ...base } = decodedRequest;
  const writer = base.predicate === 'settled_writer_failed_validators';
  if (
    (writer ? !isString(base.preimage_ref) : Object.hasOwn(base, 'preimage_ref')) ||
    (mode === 'inspect' ? suppliedInspection !== undefined : !suppliedInspection)
  )
    throw Error('Historical release request shape or predicate invalid');
  const historyRef = values['--context-history'];
  /** @type {Buffer | undefined} */
  let historyBytes: Buffer | undefined;
  /** @type {unknown} */
  let originalContexts: unknown;
  if (historyRef !== undefined) {
    if (!relative(historyRef)) throw Error('Historical context history path differs');
    const historyReference = historyRef;
    historyBytes = access.readBytes(historyReference, 'original caller context export');
    if (historyBytes.length > 1024 * 1024) throw Error('Historical context history exceeds bound');
    /** @type {unknown} */
    let body: unknown;
    try {
      body = JSON.parse(historyBytes.toString('utf8'));
    } catch {
      throw Error('Historical context history must be an original run result');
    }
    const current = loadRuntimeConfig(root);
    if (!isHistoricalRunHistory(body)) throw Error('Historical context history must be an original run result');
    const host = inspectCliHostWorkspaceDatabase(
      root,
      sessionHandoffDatabasePath(root, current),
      deriveWorkspaceId(current.repository.repository_id, root),
    );
    const journals = host.journals.filter(
      (entry) => entry.work_id === base.identity.work_id && entry.attempt === base.attempt,
    );
    if (journals.length !== 1) throw Error('Historical context history Journal differs');
    const historyJournal = journals[0];
    if (!historyJournal) throw Error('Historical context history Journal differs');
    const state = historyJournal.state,
      items = [...state.items, ...state.completed.flatMap((wave) => wave.items)];
    const contexts = historicalConfiguredContexts(body.next_actions);
    if (!contexts.length || contexts.length > 256) throw Error('Historical context history is missing or excessive');
    originalContexts = contexts.map((context) => {
      const matches = items.filter((item) => item.request.configured_context_digest === context.digest);
      if (matches.length !== 1) throw Error('Historical context history action differs');
      const request = requireHistoricalItem(matches[0]).request;
      return {
        action_id: request.action_id,
        wave_index: request.wave_index,
        stage_id: request.stage_id,
        work_id: state.work_id,
        attempt: state.attempt,
        context,
      };
    });
  }
  const original = inspectHistoricalOwnerContext(root, baselinePath, base.identity, base.attempt, originalContexts);
  /** @type {ScopedSourceSnapshot | undefined} */
  let preimage: ScopedSourceSnapshot | undefined;
  /** @type {Buffer | undefined} */
  let preimageBytes: Buffer | undefined;
  if (writer) {
    if (!relative(base.preimage_ref)) throw Error('Historical preimage reference invalid');
    preimageBytes = access.readBytes(base.preimage_ref, 'complete original source preimage');
    if (preimageBytes.length > 1024 * 1024) throw Error('Historical preimage exceeds bound');
    /** @type {unknown} */
    let decodedPreimage: unknown;
    try {
      decodedPreimage = JSON.parse(preimageBytes.toString('utf8'));
    } catch {
      throw Error('Historical preimage must be one complete pure scoped snapshot');
    }
    if (!isHistoricalScopedSnapshot(decodedPreimage, relative))
      throw Error('Historical preimage must be one complete pure scoped snapshot');
    preimage = decodedPreimage;
    const originalScope = original.journal.state.source_scope;
    if (!originalScope) throw Error('Historical source preimage has no retained owner scope');
    compareScopedSourceSnapshots(decodedPreimage, originalScope);
  }
  const expectedLedger = original.workspace.ledger_version;
  if (!expectedLedger) throw Error('Historical release ledger version is unavailable');
  const inspection = {
    expectedWork: original.owner.version,
    expectedLedger,
    expectedJournal: original.journal.version,
    expectedMaintenanceGeneration: original.maintenanceGeneration,
    baseline_binding: original.baseline_binding,
    receipt_binding: original.receipt_binding,
    current_config_binding: (await import('../src/config/runtime-config.ts')).runtimeConfigDigest(original.current),
    engine_binding: original.engine_binding,
    request_binding: canonicalJsonDigest(base),
    preimage_binding: writer && preimageBytes ? canonicalJsonDigest(preimageBytes.toString('utf8')) : null,
    nativeSessionHandle,
  };
  const selectedInspection = historicalReleaseInspection(mode, suppliedInspection, inspection);
  if (mode === 'apply') {
    const prior = original.owner.state.lease === null;
    /** @param {HistoricalOwnerReleaseInspection} value */
    const comparable = (value: HistoricalOwnerReleaseInspection) =>
      prior
        ? Object.fromEntries(Object.entries(value).filter(([key]) => !['expectedWork', 'expectedLedger'].includes(key)))
        : value;
    if (canonicalJsonDigest(comparable(selectedInspection)) !== canonicalJsonDigest(comparable(inspection)))
      throw Error('Historical frozen configuration/engine/evidence or Work/Ledger/Journal/maintenance CAS changed');
  }
  const db = openCliWorkspaceDatabase(
    root,
    sessionHandoffDatabasePath(root, original.current),
    original.journal.state.workspace_id,
    mode === 'inspect',
  );
  try {
    const store = createCliHostStateStore(db, original.journal.state.workspace_id),
      intake = readAdmittedSessionIntake(root, store, base.identity);
    if (intake.native_session_handle !== nativeSessionHandle) throw Error('Historical release original owner differs');
    const pending = [
      ...original.journal.state.items,
      ...original.journal.state.completed.flatMap((wave) => wave.items),
    ].filter((item) => item.issue_id !== null && item.observation === null);
    const suspension: HistoricalOwnerSuspension = /** @type {HistoricalOwnerSuspension} */ ({
      store,
      identity: base.identity,
      journal: {
        state: original.journal.state,
        version: original.journal.version,
        resume_status: unissuedOwner ? 'ready' : pending.length ? 'issued_outcome_uncertain' : 'ready_to_resume',
      },
      expectedWork: selectedInspection.expectedWork,
      expectedLedger: selectedInspection.expectedLedger,
      expectedMaintenanceGeneration: inspection.expectedMaintenanceGeneration,
      nativeSessionHandle,
      userRequestPointer: base.userRequestPointer,
      requestIntent: base.requestIntent,
      config: original.config,
      predicate: base.predicate,
      preimage,
      documentationContext: {
        repository_root: root,
        repository_id: base.identity.repository_id,
        project_id: base.identity.project_ids[0] ?? '',
        work_id: base.identity.work_id,
      },
    });
    if (mode === 'inspect') {
      inspectHistoricalOwnerWork(suspension);
      return {
        status: 'historical_owner_release_inspected',
        request: { ...base, inspection },
        rights_granted: false,
        caller_identity_authenticated: false,
        caller_authorization_required: true,
        runtime_acceptance: false,
      };
    }
    if (
      !access.readBytes(requestPath, 'historical request stability').equals(requestBytes) ||
      (historyBytes &&
        historyRef &&
        !access.readBytes(historyRef, 'historical context stability').equals(historyBytes)) ||
      (writer &&
        base.preimage_ref &&
        preimageBytes &&
        !access.readBytes(base.preimage_ref, 'original preimage stability').equals(preimageBytes))
    )
      throw Error('Historical frozen request/preimage changed before CAS');
    const latest = inspectHistoricalOwnerContext(root, baselinePath, base.identity, base.attempt, originalContexts);
    if (
      latest.baseline_binding !== original.baseline_binding ||
      latest.receipt_binding !== original.receipt_binding ||
      latest.engine_binding !== original.engine_binding ||
      latest.maintenanceGeneration !== inspection.expectedMaintenanceGeneration ||
      canonicalJsonDigest(latest.current) !== canonicalJsonDigest(original.current)
    )
      throw Error('Historical original authority changed before CAS');
    const result = suspendHistoricalOwnerWork(suspension);
    return {
      status: 'historical_owner_released',
      work_version: result.workVersion,
      ledger_version: result.ledgerVersion,
      journal_version: original.journal.version,
      rights_granted: false,
      caller_identity_authenticated: false,
      runtime_acceptance: false,
    };
  } finally {
    closeWorkspaceDatabaseWithAdmission(db);
  }
}
/** @param {string[]} args */
async function recoveryReview(args: string[]) {
  if (args.length !== 6) throw Error('Recovery review requires exact mode, root and caller-history export');
  /** @type {Record<string, string>} */
  const values: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = runOptionKey(args[i]),
      value = args[i + 1];
    if (Object.hasOwn(values, key) || !value) throw Error('Recovery review arguments invalid');
    values[key] = value;
  }
  const mode = runOptionKey(values['--mode']);
  const projectRoot = runOptionKey(values['--project-root']);
  if (
    Object.keys(values).sort().join('|') !== ['--mode', '--project-root', '--request'].sort().join('|') ||
    !isRecoveryReviewMode(mode) ||
    !path.isAbsolute(projectRoot)
  )
    throw Error('Recovery review mode or argument set invalid');
  const root = realpathSync(projectRoot);
  const { requireSafeRepositoryAccess } = await import('../src/config/safe-repository-access.ts');
  const { openInternalRecoveryReview } = await import('./runtime-config-rebind.ts');
  const bytes = requireSafeRepositoryAccess(root).readBytes(
    runOptionKey(values['--request']),
    'recovery caller-history export',
  );
  if (bytes.length > 262144) throw Error('Recovery caller-history export exceeds bound');
  /** @type {unknown} */
  const input: unknown = JSON.parse(bytes.toString('utf8'));
  const keys = ['identity', 'attempt', 'baselinePath', 'callerSession', 'controllerId', 'userInstructionRef'];
  if (hasRecoveryReviewOriginalContexts(input)) keys.push('originalContexts');
  if (mode !== 'prepare') keys.push('request');
  if (mode === 'complete') keys.push('observation');
  if (!isRecoveryReviewExport(input, keys, mode !== 'prepare', mode === 'complete'))
    throw Error('Recovery caller-history export shape invalid');
  const route = openInternalRecoveryReview({ ...input, repositoryRoot: root, mode });
  try {
    const operation = requireRecoveryOperation(
      mode === 'begin' ? route.begin() : mode === 'complete' ? route.complete(input.observation) : route.inspect(),
    );
    return {
      status: operation.status,
      request: route.request,
      operation,
      native_dispatch_performed: false,
      rights_granted: false,
      runtime_acceptance: false,
    };
  } finally {
    route.close();
  }
}

/** @param {readonly string[]} args @param {number} selectorIndex @returns {boolean} */
function hasRunSpecialConflict(args: readonly string[], selectorIndex: number): boolean {
  return (runSpecialModeOptions[selectorIndex]?.conflicts ?? []).some((option) => args.includes(option));
}

/** @param {import('../src/runtime-initialization.ts').RuntimeInitializationAuthority} authority @param {string} integrationsDigest */
function assertInitializationIntegrations(
  authority: import('../src/runtime-initialization.ts').RuntimeInitializationAuthority,
  integrationsDigest: string,
) {
  if (authority.format !== 'RuntimeInitialization/v1') return;
  if (authority.receipt.integrations_digest !== integrationsDigest)
    fail('GAP-VIDA-RUN-CONTEXT-001', 'Runtime initialization integrations are stale.');
}

/** @param {readonly string[]} args @param {number} selectorIndex @returns {boolean} */
function hasRunSpecialSelector(args: readonly string[], selectorIndex: number): boolean {
  const selector = runSpecialSelectors[selectorIndex];
  return typeof selector === 'string' && args.includes(selector);
}

export async function run(args: string[] = process.argv.slice(2)) {
  const { canonicalJsonDigest } = await import('../src/contracts/public-ingress.ts');
  const { assertAdmittedRuntimeCodeCurrent } = await import('../src/orchestration/admitted-session-execution.ts');
  if (hasRunSpecialSelector(args, 0)) {
    if (args[0] !== runSpecialSelectors[0] || args[1] !== 'true')
      throw Error('Initial source continuation requires its exact separate signal');
    const { continueInitialSource } = await import('./continue-initial-source.ts');
    return continueInitialSource(args.slice(2));
  }
  if (hasRunSpecialSelector(args, 1)) {
    if (args[0] !== runSpecialSelectors[1] || args[1] !== 'true')
      throw Error('Unprepared recovery requires its exact separate signal');
    return recoverUnpreparedWork(args.slice(2));
  }
  if (!isBunRuntime) {
    const { runPinnedBun } = await import('./bun.ts');
    return runPinnedBun([fileURLToPath(import.meta.url), ...args], {
      root: bundleRoot,
      cwd: bundleRoot,
    });
  }
  if (hasRunSpecialSelector(args, 2)) {
    if (args[0] !== runSpecialSelectors[2] || args[1] !== 'true' || hasRunSpecialConflict(args, 2))
      throw Error('Completed Source report recovery requires its exact separate signal');
    const { recoverCompletedSourceReport } = await import('./recover-completed-source-report.ts');
    return recoverCompletedSourceReport(args.slice(2));
  }
  if (hasRunSpecialSelector(args, 3)) {
    if (args[0] !== runSpecialSelectors[3] || args[1] !== 'true')
      throw Error('Failed prewriter transition requires its exact separate signal');
    const { transitionFailedPrewriter } = await import('./transition-failed-prewriter.ts');
    return transitionFailedPrewriter(args.slice(2));
  }
  if (hasRunSpecialSelector(args, 4)) {
    if (args[0] !== runSpecialSelectors[4] || args[1] !== 'true')
      throw Error('Failed prewriter owner recovery requires its exact separate signal');
    const { recoverFailedPrewriterOwner } = await import('./recover-failed-prewriter-owner.ts');
    return recoverFailedPrewriterOwner(args.slice(2));
  }
  if (hasRunSpecialSelector(args, 5)) {
    if (args[0] !== runSpecialSelectors[5] || args[1] !== 'true')
      throw Error('Recovery review requires its exact separate signal');
    return recoveryReview(args.slice(2));
  }
  if (hasRunSpecialSelector(args, 6)) {
    if (args[0] !== runSpecialSelectors[6] || args[1] !== 'true')
      throw Error('Historical release requires its exact separate signal');
    return releaseHistoricalOwner(args.slice(2));
  }
  if (hasRunSpecialSelector(args, 7)) {
    if (args[0] !== runSpecialSelectors[7] || args[1] !== 'true' || hasRunSpecialConflict(args, 7))
      throw Error('Historical normalization resume requires its exact separate signal');
    const { resumeHistoricalNormalization } = await import('./historical-normalization-resume.ts');
    return resumeHistoricalNormalization(args.slice(2));
  }
  if (hasRunSpecialSelector(args, 8)) {
    if (args[0] !== runSpecialSelectors[8] || args[1] !== 'true' || hasRunSpecialConflict(args, 8))
      throw Error('Historical terminal synthesis capture requires its exact separate signal');
    const { captureHistoricalTerminalSynthesis } = await import('./historical-terminal-synthesis-capture.ts');
    return captureHistoricalTerminalSynthesis(args.slice(2));
  }
  if (hasRunSpecialSelector(args, 9)) {
    if (args[0] !== runSpecialSelectors[9] || args[1] !== 'true')
      throw Error('Unissued owner release requires its exact separate signal');
    return releaseHistoricalOwner(args.slice(2), true);
  }
  if (hasRunSpecialSelector(args, 10)) {
    if (args[0] !== runSpecialSelectors[10] || args[1] !== 'true')
      throw Error('Settled research release requires its exact separate signal');
    return releaseHistoricalOwner(args.slice(2), false, true);
  }
  if (hasRunSpecialSelector(args, 11)) {
    if (args[0] !== runSpecialSelectors[11] || args[1] !== 'true')
      throw Error('Readonly bookkeeping release requires its exact separate signal');
    return releaseHistoricalOwner(args.slice(2), false, false, true);
  }
  if (hasRunSpecialSelector(args, 12)) {
    if (args[0] !== runSpecialSelectors[12] || args[1] !== 'true' || hasRunSpecialConflict(args, 12))
      throw Error('Interrupted Source retirement requires its exact separate signal');
    return retireInterruptedSourceOwner(args.slice(2));
  }
  if (hasRunSpecialSelector(args, 13)) {
    if (args[0] !== runSpecialSelectors[13] || args[1] !== 'true' || hasRunSpecialConflict(args, 13))
      throw Error('Readonly release requires separate exact signal');
    return releaseCompletedReadonly(args.slice(2));
  }
  if (hasRunSpecialSelector(args, 14)) {
    if (args[0] !== runSpecialSelectors[14] || args[1] !== 'true' || hasRunSpecialConflict(args, 14))
      throw Error('Retired-source capture requires its exact separate capture signal');
    return captureRetiredSource(args.slice(2));
  }
  if (hasRunSpecialSelector(args, 15)) {
    if (args[0] !== runSpecialSelectors[15] || args[1] !== 'true' || hasRunSpecialConflict(args, 15))
      throw Error('Stopped-source capture requires exact separate capture signal');
    return captureStoppedSource(args.slice(2));
  }
  const { checkManifest, readPin } = await import('./bun.ts');
  let values = parseArgs(args);
  // The pre-activation cutover directory is expected to exist when exporting
  // evidence. Normal work entry still requires an active selector there.
  const selector = values.export_staged_witness ? null : activeSelector(values.project_root);
  assertNoActiveCutoverMaintenance(selector);
  const { deriveWorkspaceId } = await import('../src/workspace-identity.ts');
  const { loadRuntimeConfig, runtimeConfigDigest, runtimePackageAccess, runtimePackageCodePaths, selectWorkflow } =
    await import('../src/config/runtime-config.ts');
  const { workflowWorkItemSchema } = await import('../src/orchestration/workflow-session-reservation-contract.ts');
  const { resolveSelectedProjectForRepositoryPath } = await import('../src/config/project-context.ts');
  const pin = readPin(bundleRoot);
  checkManifest(bundleRoot, pin);
  if (Bun.version !== pin) fail('GAP-VIDA-RUN-BUN-001', `Pinned Bun ${pin} is required; running ${Bun.version}.`);
  const config = loadRuntimeConfig(values.project_root);
  if (!values.scope_digest && !values.task_source_operation) {
    const { inspectScope } = await import('./scope.ts');
    const snapshot = await inspectScope([
      '--project-root',
      values.project_root,
      '--repository',
      values.repository,
      ...values.projects.flatMap((project) => ['--project', project]),
      ...values.scope_paths.flatMap((relative) => ['--path', relative]),
    ]);
    values = Object.freeze({ ...values, scope_digest: snapshot.digest });
  }
  if (selector?.currentMutableOutput && selector.currentMutableOutput.path !== config.research_decision.paths.changelog)
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Selected mutable-output path differs from validated current configuration.');
  const configDigest = runtimeConfigDigest(config);
  if (selector && config.runtime.bundle !== 'vida-agent')
    fail('GAP-VIDA-RUN-SELECTOR-001', 'Selected bundle differs from configured runtime.');
  const { readRuntimeInitializationAuthority } = await import('../src/runtime-initialization.ts');
  let initializationAuthority;
  try {
    initializationAuthority = readRuntimeInitializationAuthority(values.project_root, config);
  } catch {
    fail('GAP-VIDA-RUN-CONTEXT-001', 'Runtime initialization authority is unavailable.');
  }
  const initialization = initializationAuthority.receipt;
  const initializationBinding = initializationAuthority.binding;
  if (
    initializationBinding.repository_id !== config.repository.repository_id ||
    (!values.task_source_operation && initializationBinding.repository_id !== values.repository)
  )
    fail('GAP-VIDA-RUN-CONTEXT-001', 'Runtime initialization repository identity is stale.');
  const configuredProjectIds = config.projects.map((entry) => entry.project_id).sort(compareStrings);
  if (
    !isStringArray(initializationBinding.project_ids) ||
    JSON.stringify([...initializationBinding.project_ids].sort(compareStrings)) !== JSON.stringify(configuredProjectIds)
  )
    fail('GAP-VIDA-RUN-CONTEXT-001', 'Runtime initialization project configuration is stale.');
  assertInitializationIntegrations(initializationAuthority, canonicalJsonDigest(config.integrations));
  if (initializationBinding.config_digest !== configDigest)
    fail('GAP-VIDA-RUN-CONTEXT-001', 'Runtime initialization configuration is stale.');
  if (initializationBinding.workspace_id !== deriveWorkspaceId(config.repository.repository_id, values.project_root))
    fail('GAP-VIDA-RUN-CONTEXT-001', 'Runtime initialization workspace identity is stale.');
  const { assertRuntimePackageExports } = await import('../tooling/maintained-source-inventory.ts');
  assertRuntimePackageExports(runtimePackageAccess().repository_root);
  if (values.task_source_operation) {
    const { executeTaskSourceBindingOperation } =
      await import('../src/orchestration/task-source-binding-operations.ts');
    return {
      schema: 'VidaAgentRunResult/v1',
      status: `task_source_${values.task_source_operation}`,
      operation: await executeTaskSourceBindingOperation({
        repositoryRoot: values.project_root,
        mode: values.task_source_operation,
        requestPath: values.task_source_request,
        ...(values.task_source_report ? { reportPath: values.task_source_report } : {}),
      }),
      initialization_status: initialization.workspace_binding_status,
    };
  }
  assertStandardRunOptions(values);
  if (values.projects.some((id) => !config.projects.some((project) => project.project_id === id)))
    fail('GAP-VIDA-RUN-CONTEXT-001', 'The project context is not bound to the requested identity.');
  let pathProject;
  try {
    pathProject = resolveSelectedProjectForRepositoryPath(config.projects, values.work_path, values.projects);
  } catch {
    fail('GAP-VIDA-RUN-CONTEXT-001', 'The work path is not bound to the selected project context.');
  }
  if (!values.projects.includes(pathProject.project_id))
    fail('GAP-VIDA-RUN-CONTEXT-001', 'The work path is outside the selected project context.');
  /** @type {WorkItem | undefined} */
  let selectedWorkItem: WorkItem | undefined;
  if (values.intake)
    selectedWorkItem = parseWorkflowWorkItem(
      workflowWorkItemSchema,
      (await readLocalSessionIntake(values.intake)).work_item,
    );
  else {
    const { openConfiguredMastraSessionLedger } = await import('../src/orchestration/persistent-session-handoff.ts');
    const { loadProjectSetContext } = await import('../src/config/project-context.ts');
    const { requireSafeRepositoryAccess } = await import('../src/config/safe-repository-access.ts');
    const project = loadProjectSetContext(values.project_root, config, config.repository.repository_id, [
      pathProject.project_id,
    ]);
    const selectionLedger = openConfiguredMastraSessionLedger(values.project_root);
    try {
      const work = selectionLedger.hostState.readHostStateSnapshot({
        repository_id: project.repository_id,
        project_ids: project.project_ids,
        integrations_digest: project.integrations_digest,
        work_id: values.work_id,
      }).work;
      if (work) {
        const ref = work.artifacts.find(
          (entry) => entry.artifact_id === 'local-session-intake' && entry.schema === 'VidaLocalSessionIntake/v1',
        );
        if (!ref) fail('GAP-VIDA-RUN-CONTEXT-001', 'Current admitted intake is missing.');
        const bytes = requireSafeRepositoryAccess(values.project_root).readBytes(ref.path, 'current selection intake');
        if (bytes.length > 32768 || digest(bytes) !== ref.sha256)
          fail('GAP-VIDA-RUN-CONTEXT-001', 'Current admitted intake changed.');
        /** @type {unknown} */
        const intakeValue: unknown = JSON.parse(bytes.toString('utf8'));
        selectedWorkItem = parseAdmittedIntakeWorkItem(workflowWorkItemSchema, intakeValue);
        if (canonicalJsonDigest(selectedWorkItem) !== work.binding.work_item_digest)
          fail('GAP-VIDA-RUN-CONTEXT-001', 'Current admitted work item changed.');
      }
    } finally {
      selectionLedger.close();
    }
  }
  const selectionBase = workflowSelectionBase(
    workflowWorkItemSchema,
    values.team,
    values.kind,
    values.intent,
    selectedWorkItem,
  );
  const selections = values.projects.map((projectId) =>
    selectWorkflow(config, { ...selectionBase, project: projectId }),
  );
  if (selections.some((selection) => selection.workflow_id !== values.workflow))
    fail('GAP-VIDA-RUN-WORKFLOW-001', 'The requested workflow is not the configured workflow for this selection.');
  const activeWorkflow = config.workflows[values.workflow];
  requireRunValue(activeWorkflow, 'Configured workflow is unavailable for the selected run.');
  if (values.export_staged_witness) {
    const payloadManifestSha256 = requireOption(values.payload_manifest_sha256, '--payload-manifest-sha256'),
      stagedWorkId = requireOption(values.work_id, '--work-id'),
      stagedAttempt = Number(requireOption(values.attempt, '--attempt'));
    const { createStagedRuntimeWitness } = await import('../src/orchestration/staged-runtime-witness.ts');
    const { sessionHandoffDatabasePath } = await import('../src/config/project-paths.ts');
    const { deriveWorkspaceId } = await import('../src/workspace-identity.ts');
    const { loadProjectSetContext } = await import('../src/config/project-context.ts');
    const { requireSafeRepositoryAccess } = await import('../src/config/safe-repository-access.ts');
    const project = loadProjectSetContext(
      values.project_root,
      config,
      config.repository.repository_id,
      values.projects,
    );
    const workspace = inspectCliHostWorkspaceDatabase(
      values.project_root,
      sessionHandoffDatabasePath(values.project_root, config),
      deriveWorkspaceId(project.repository_id, values.project_root),
    );
    const work = workspace.work.find(
      (entry) =>
        entry.identity.work_id === values.work_id &&
        entry.identity.repository_id === project.repository_id &&
        entry.identity.integrations_digest === project.integrations_digest &&
        JSON.stringify(entry.identity.project_ids) === JSON.stringify(project.project_ids),
    )?.state;
    const lifecycleRisk = work?.lifecycle.risk;
    if (!isLifecycleRisk(lifecycleRisk))
      fail('GAP-VIDA-RUN-CONTEXT-001', 'Current admitted Work lifecycle risk is unavailable.');
    const witness = await createStagedRuntimeWitness({
      repositoryRoot: values.project_root,
      payloadManifestSha256,
      workId: stagedWorkId,
      attempt: stagedAttempt,
      lifecycleRisk,
      selection: { ...selectionBase, project: pathProject.project_id },
    });
    const access = requireSafeRepositoryAccess(values.project_root);
    const directory = `.agent/cutover/${values.export_staged_witness}`;
    access.ensureDirectory('.agent', 'staged witness owner');
    access.ensureDirectory('.agent/cutover', 'staged witness directory');
    access.ensureDirectory(directory, 'staged witness generation');
    const observations = witness.ledger_state.completed.flatMap((wave) => wave.items.map((item) => item.observation));
    const refs = observations.map((observation, index) => {
      const relative = `${directory}/observation-${index}.json`;
      const bytes = Buffer.from(controllerJson(observation));
      access.writeExclusive(relative, bytes.toString('utf8'), 'staged native observation');
      return { path: relative, sha256: digest(bytes) };
    });
    const witnessPath = `${directory}/witness.json`;
    const witnessBytes = Buffer.from(controllerJson(witness));
    access.writeExclusive(witnessPath, witnessBytes.toString('utf8'), 'staged runtime witness');
    const evidence = {
      schema: 'VidaStagedRuntimeEvidence/v1',
      status: 'passed',
      payload_manifest_sha256: values.payload_manifest_sha256,
      workflow_id: witness.workflow_id,
      run_id: witness.run_id,
      witness: { path: witnessPath, sha256: digest(witnessBytes) },
      observations: refs,
    };
    const evidencePath = `${directory}/staged_runtime.json`;
    access.writeExclusive(evidencePath, controllerJson(evidence), 'staged runtime evidence');
    return {
      schema: 'VidaAgentRunResult/v1',
      status: 'staged_witness_exported',
      path: evidencePath,
      sha256: digest(Buffer.from(controllerJson(evidence))),
      workflow_id: witness.workflow_id,
      run_id: witness.run_id,
    };
  }
  if (values.recover_expired_lease) {
    const recoveryAttempt = Number(requireOption(values.attempt, '--attempt')),
      nativeSessionHandle = requireOption(values.native_session_handle, '--native-session-handle'),
      leaseGeneration = Number(requireOption(values.lease_generation, '--lease-generation')),
      expectedRevision = Number(requireOption(values.expected_revision, '--expected-revision')),
      expectedDigest = requireOption(values.expected_digest, '--expected-digest');
    const {
      readInitialSourceContinuationLineageView,
      acceptedSourceAuthorizationRevision,
      validateInitialSourceContinuationLineage,
    } = await import('../src/orchestration/admitted-development-packet.ts');
    const { readLocalSourceWriteAuthorization } = await import('../src/orchestration/local-source-authorization.ts');
    const { loadProjectSetContext } = await import('../src/config/project-context.ts');
    const { openConfiguredMastraSessionLedger } = await import('../src/orchestration/persistent-session-handoff.ts');
    const { snapshotDeclaredSources, snapshotRuntimePackageSources } =
      await import('../src/orchestration/scoped-source-snapshot.ts');
    const { requireSafeRepositoryAccess } = await import('../src/config/safe-repository-access.ts');
    const { inspectLocalSession } = await import('../src/orchestration/inspect-local-session.ts');
    const { completedSourceJournalObservationMatches } = await import('../src/host-state.ts');
    const { isAcceptedCompletedSourceWave } = await import('../src/orchestration/completed-source-report-recovery.ts');
    const project = loadProjectSetContext(values.project_root, config, values.repository, values.projects);
    const identity = {
      repository_id: project.repository_id,
      project_ids: project.project_ids,
      integrations_digest: project.integrations_digest,
      work_id: values.work_id,
    };
    const ledger = openConfiguredMastraSessionLedger(values.project_root);
    try {
      const journal = ledger.resume(values.work_id, recoveryAttempt);
      const host = ledger.hostState.readHostStateSnapshot(identity);
      if (
        !journal ||
        !host.work ||
        !host.work.lease ||
        !host.workVersion ||
        !host.ledgerVersion ||
        host.work.binding.team_id !== values.team ||
        host.work.binding.workflow_id !== values.workflow
      )
        fail('GAP-VIDA-RUN-CONTEXT-001', 'Expired lease recovery admitted work or selection differs.');

      const access = requireSafeRepositoryAccess(values.project_root);
      const initialLineage = readInitialSourceContinuationLineageView(ledger.hostState, identity, recoveryAttempt);
      ledger.hostState.recoverExpiredLocalLease({
        identity,
        attempt: recoveryAttempt,
        nativeSessionHandle,
        generation: leaseGeneration,
        expectedWork: host.workVersion,
        expectedLedger: host.ledgerVersion,
        expectedJournal: { revision: expectedRevision, digest: expectedDigest },
        expectedMaintenanceGeneration: host.maintenanceGeneration,
        verifyCurrent: (work, state, sourceRoot) => {
          const sourceScope = requireRunData(state.source_scope, 'Expired recovery source scope is unavailable.');
          const acceptedCurrentSourceWave = isAcceptedCompletedSourceWave(
            work,
            state,
            initialLineage?.completedSourceReportRecovery,
          );
          const currentConfig = loadRuntimeConfig(values.project_root);
          const approval = work.lifecycle.references.find(
            (reference) =>
              reference.kind === 'execution_approval' &&
              reference.disposition === 'current' &&
              reference.decision === 'approved',
          );
          if (!approval || approval.artifact_schema !== 'LocalSourceWriteAuthorization/v1')
            fail('GAP-VIDA-RUN-CONTEXT-001', 'Expired recovery requires the existing attributable source authority.');
          const existingAuthority = readLocalSourceWriteAuthorization(values.project_root, approval.path);
          const authority = existingAuthority.authorization;
          const acceptedAuthorityRevision = acceptedSourceAuthorizationRevision(work, state, approval, initialLineage);
          if (
            existingAuthority.sha256 !== approval.sha256 ||
            authority.schema !== 'LocalSourceWriteAuthorization/v1' ||
            authority.action !== 'source.write' ||
            approval.scope_id !== work.binding.scope_id ||
            approval.source_revision !== acceptedAuthorityRevision ||
            authority.user_instruction_ref !== approval.record_id ||
            approval.principal !== 'local-session:' + canonicalJsonDigest(values.native_session_handle) ||
            authority.native_session_handle !== nativeSessionHandle ||
            authority.work_id !== values.work_id ||
            authority.attempt !== recoveryAttempt ||
            authority.scope_digest !== acceptedAuthorityRevision ||
            authority.config_digest !== work.binding.config_digest ||
            authority.workflow_id !== work.binding.workflow_id ||
            !sameImplementationPaths(authority.implementation_paths, work.binding.implementation_paths) ||
            authority.stage_ids.some(
              (id) => !hasConfiguredDevelopmentStage(currentConfig, work.binding.workflow_id, id),
            )
          )
            fail('GAP-VIDA-RUN-CONTEXT-001', 'Expired recovery existing source authority changed.');
          if (values.rebind_current_bundle !== 'true')
            fail('GAP-VIDA-RUN-CONTEXT-001', 'Expired recovery requires explicit current bundle rebind.');
          for (const wave of state.completed)
            for (const item of wave.items) {
              const stage = currentConfig.workflows[work.binding.workflow_id]?.stages.find(
                (entry) => entry.id === item.request.stage_id,
              );
              const assignment = stage?.assignments[item.request.assignment_index];
              const profile = assignment && currentConfig.agents.profiles[assignment.profile];
              const recoveredSource = initialLineage?.completedSourceReportRecovery;
              const retainedSourceResult = Boolean(
                recoveredSource &&
                item.request.action_id === recoveredSource.action_id &&
                item.issue_id === recoveredSource.issue_id &&
                completedSourceJournalObservationMatches(work, item),
              );
              const retainedRequestScope = recoveredSource?.record.prior_journal.source_scope?.digest;
              if (
                !assignment ||
                !profile ||
                (profile.mutation_scope === 'repository_source' && !retainedSourceResult) ||
                item.request.role !== assignment.role ||
                item.request.config_digest !== work.binding.config_digest ||
                (item.request.scope_digest !== sourceScope.digest &&
                  item.request.scope_digest !== retainedRequestScope) ||
                !item.observation ||
                item.observation.status !== 'reported_complete' ||
                item.observation.output_digest !== canonicalJsonDigest(item.observation.summary)
              )
                fail(
                  'GAP-VIDA-RUN-CONTEXT-001',
                  'Expired recovery predecessor evidence is not accepted readonly current-source evidence.',
                );
              if (item.research_normalization) {
                const plan = item.research_normalization;
                const artifact = work.artifacts.find(
                  (entry) =>
                    entry.path === plan.record_path &&
                    entry.sha256 === plan.record_sha256 &&
                    entry.stage_id === item.request.stage_id,
                );
                if (
                  !artifact ||
                  digest(access.readBytes(artifact.path, 'expired recovery accepted research')) !== artifact.sha256 ||
                  plan.observation_digest !== canonicalJsonDigest(item.observation)
                )
                  fail(
                    'GAP-VIDA-RUN-CONTEXT-001',
                    'Expired recovery requires an already admitted unchanged canonical research artifact.',
                  );
              } else if (
                stage.produces.includes('ResearchResult/v1') ||
                stage.produces.includes('ResearchSynthesis/v1')
              ) {
                fail('GAP-VIDA-RUN-CONTEXT-001', 'Expired recovery cannot import unnormalized research.');
              }
            }
          if (
            work.lifecycle.references.some(
              (reference) =>
                reference.kind === 'execution_approval' &&
                reference.disposition === 'current' &&
                reference.artifact_schema !== 'LocalSourceWriteAuthorization/v1',
            )
          )
            fail('GAP-VIDA-RUN-CONTEXT-001', 'Expired recovery cannot retain bundle-bound execution approval.');
          for (const item of state.items) {
            const stage = currentConfig.workflows[work.binding.workflow_id]?.stages.find(
              (entry) => entry.id === item.request.stage_id,
            );
            const assignment = stage?.assignments[item.request.assignment_index];
            const profile = assignment && currentConfig.agents.profiles[assignment.profile];
            if (
              !assignment ||
              !profile ||
              item.request.role !== assignment.role ||
              item.request.config_digest !== work.binding.config_digest ||
              (profile.mutation_scope === 'repository_source' && item.issue_id !== null && !acceptedCurrentSourceWave)
            )
              fail(
                'GAP-VIDA-RUN-CONTEXT-001',
                'Expired lease recovery current request or issued writer binding is unsafe.',
              );
          }
          if (
            runtimeConfigDigest(currentConfig) !== work.binding.config_digest ||
            work.binding.repository_id !== values.repository ||
            JSON.stringify(work.binding.project_ids) !== JSON.stringify(values.projects) ||
            (sourceScope.digest !== values.scope_digest &&
              !(
                initialLineage?.completedSourceReportRecovery &&
                work.binding.work_source_revision === values.scope_digest
              ))
          )
            fail('GAP-VIDA-RUN-CONTEXT-001', 'Expired lease recovery configuration, projects or scope differs.');
          const verifiedSourceRoot = requireRunData(sourceRoot, 'Expired recovery source root is unavailable.');
          const source = snapshotDeclaredSources(
            requireSafeRepositoryAccess(verifiedSourceRoot),
            sourceScope.entries.map((entry) => entry.path),
          );
          if (source.digest !== sourceScope.digest)
            fail('GAP-VIDA-RUN-CONTEXT-001', 'Expired lease recovery declared source changed.');
          const intakeRef = work.artifacts.find((entry) => entry.artifact_id === 'local-session-intake');
          if (!intakeRef) fail('GAP-VIDA-RUN-CONTEXT-001', 'Expired lease recovery intake is unavailable.');
          const intakeBytes = access.readBytes(intakeRef.path, 'expired lease recovery intake');
          if (digest(intakeBytes) !== intakeRef.sha256)
            fail('GAP-VIDA-RUN-CONTEXT-001', 'Expired lease recovery intake changed.');
          const intakeValue = parseJsonUnknown(intakeBytes.toString('utf8'));
          const intake = requireRunRecord(intakeValue, 'Persisted intake is invalid.');
          const inventory = runtimePackageCodePaths(currentConfig.runtime.bundle);
          if (
            canonicalJsonDigest(intake.runtime_code_paths) !== canonicalJsonDigest(inventory) &&
            !initialLineage?.frontierCodeRebind &&
            !initialLineage?.completedSourceReportRecovery
          )
            fail(
              'GAP-VIDA-RUN-CONTEXT-001',
              'Expired recovery intake requires qualified canonical runtime inventory repair.',
            );
          const runtime = snapshotRuntimePackageSources(
            runtimePackageAccess(),
            currentConfig.runtime.bundle,
            inventory,
          );
          if (initialLineage?.frontierCodeRebind || initialLineage?.completedSourceReportRecovery) {
            validateInitialSourceContinuationLineage(
              work,
              initialLineage.receipt,
              state,
              initialLineage.frontierCodeRebind,
              initialLineage.completedSourceReportRecovery,
              initialLineage.runtimeCodeContinuations,
            );
            if (
              canonicalJsonDigest(
                initialLineage.runtimeCodeContinuations?.at(-1)?.request.currentRuntimeCodePaths ??
                  initialLineage.completedSourceReportRecovery?.record.request.currentRuntimeCodePaths ??
                  initialLineage.frontierCodeRebind?.record.request.runtimeCodePaths,
              ) !== canonicalJsonDigest(inventory) ||
              runtime.digest !== work.binding.runtime_code_digest
            )
              fail(
                'GAP-VIDA-RUN-CONTEXT-001',
                'Expired recovery current code does not match its qualified frontier record.',
              );
          }
          const schema = digest(
            runtimePackageAccess().readBytes(
              'schemas/agent-runtime-config.v1.schema.json',
              'expired lease recovery schema',
            ),
          );
          if (
            schema !== work.binding.schema_digest ||
            intake.native_session_handle !== values.native_session_handle ||
            canonicalJsonDigest(intake.work_item) !== work.binding.work_item_digest
          )
            fail('GAP-VIDA-RUN-CONTEXT-001', 'Expired lease recovery schema, intake or owner changed.');
          return { runtimeCodeDigest: runtime.digest, authorityPointer: approval.record_id };
        },
      });
      return inspectLocalSession({
        repositoryRoot: values.project_root,
        config,
        projectIds: project.project_ids,
        integrationsDigest: project.integrations_digest,
        workId: values.work_id,
        attempt: Number(values.attempt),
      });
    } finally {
      ledger.close();
    }
  }
  if (values.renew_lease) {
    const { completedSourceJournalObservationMatches } = await import('../src/host-state.ts');
    const { readLocalSourceWriteAuthorization } = await import('../src/orchestration/local-source-authorization.ts');
    const { loadProjectSetContext } = await import('../src/config/project-context.ts');
    const { openConfiguredMastraSessionLedger } = await import('../src/orchestration/persistent-session-handoff.ts');
    const { snapshotDeclaredSources, snapshotRuntimePackageSources, compareScopedSourceSnapshots } =
      await import('../src/orchestration/scoped-source-snapshot.ts');
    const { requireSafeRepositoryAccess } = await import('../src/config/safe-repository-access.ts');
    const { inspectLocalSession } = await import('../src/orchestration/inspect-local-session.ts');
    const { Ajv2020 } = await import('ajv/dist/2020.js');
    const validateScope = new Ajv2020({ strict: true, allErrors: true }).compile(
      JSON.parse(
        runtimePackageAccess()
          .readBytes('schemas/implementation-scope.v1.schema.json', 'renew scope schema')
          .toString('utf8'),
      ),
    );
    const project = loadProjectSetContext(values.project_root, config, values.repository, values.projects);
    const identity = {
      repository_id: project.repository_id,
      project_ids: project.project_ids,
      integrations_digest: project.integrations_digest,
      work_id: values.work_id,
    };
    const ledger = openConfiguredMastraSessionLedger(values.project_root);
    try {
      const renewalAttempt = Number(requireOption(values.attempt, '--attempt')),
        nativeSessionHandle = requireOption(values.native_session_handle, '--native-session-handle'),
        leaseGeneration = Number(requireOption(values.lease_generation, '--lease-generation')),
        expectedRevision = Number(requireOption(values.expected_revision, '--expected-revision')),
        expectedDigest = requireOption(values.expected_digest, '--expected-digest');
      const journal = ledger.resume(values.work_id, renewalAttempt);
      const host = ledger.hostState.readHostStateSnapshot(identity);
      if (
        !journal ||
        !host.work ||
        !host.work.lease ||
        !host.workVersion ||
        !host.ledgerVersion ||
        host.work.binding.team_id !== values.team ||
        host.work.binding.workflow_id !== values.workflow
      )
        fail('GAP-VIDA-RUN-CONTEXT-001', 'Lease renewal admitted work or selection differs.');
      assertAdmittedRuntimeCodeCurrent(values.project_root, ledger.hostState, identity);
      const access = requireSafeRepositoryAccess(values.project_root);
      ledger.hostState.renewActiveLocalLease({
        identity,
        attempt: renewalAttempt,
        nativeSessionHandle,
        generation: leaseGeneration,
        expectedWork: host.workVersion,
        expectedLedger: host.ledgerVersion,
        expectedJournal: { revision: expectedRevision, digest: expectedDigest },
        expectedMaintenanceGeneration: host.maintenanceGeneration,
        verifyCurrent: (work, state, sourceRoot) => {
          requireCurrentLeaseOwner(work, nativeSessionHandle);
          const currentConfig = loadRuntimeConfig(values.project_root);
          /** @type {import('../src/orchestration/local-source-authorization.ts').LocalSourceWriteAuthorization | undefined} */
          let currentWriterAuthority:
            | import('../src/orchestration/local-source-authorization.ts').LocalSourceWriteAuthorization
            | undefined;
          for (const item of state.items) {
            const settledWriter = item.host_reservation && completedSourceJournalObservationMatches(work, item);
            const stage = currentConfig.workflows[work.binding.workflow_id]?.stages.find(
              (entry) => entry.id === item.request.stage_id,
            );
            const assignment = stage?.assignments[item.request.assignment_index];
            const profile = assignment && currentConfig.agents.profiles[assignment.profile];
            if (
              !assignment ||
              !profile ||
              item.request.role !== assignment.role ||
              item.request.config_digest !== work.binding.config_digest ||
              (profile.mutation_scope === 'repository_source' &&
                item.issue_id !== null &&
                !settledWriter &&
                (!item.host_reservation ||
                  item.host_reservation.receipt.identity.work_id !== work.binding.lifecycle_work_id ||
                  item.host_reservation.receipt.attempt.lease.ticket_id !== work.lease.ticket_id ||
                  item.host_reservation.receipt.attempt.lease.generation !== work.lease.generation))
            )
              fail('GAP-VIDA-RUN-CONTEXT-001', 'Lease renewal current request or issued writer binding is unsafe.');
            if (profile.mutation_scope === 'repository_source' && item.issue_id !== null && !settledWriter) {
              const reference = work.lifecycle.references.find(
                (entry) =>
                  entry.kind === 'execution_approval' &&
                  entry.artifact_schema === 'LocalSourceWriteAuthorization/v1' &&
                  entry.disposition === 'current' &&
                  entry.decision === 'approved',
              );
              if (!reference) fail('GAP-VIDA-RUN-CONTEXT-001', 'Writer heartbeat source authority was revoked.');
              const bound = readLocalSourceWriteAuthorization(values.project_root, reference.path);
              const authority = bound.authorization;
              currentWriterAuthority = authority;
              if (
                bound.sha256 !== reference.sha256 ||
                authority.work_id !== work.binding.lifecycle_work_id ||
                authority.attempt !== Number(values.attempt) ||
                authority.native_session_handle !== nativeSessionHandle ||
                authority.scope_digest !== work.binding.work_source_revision ||
                authority.config_digest !== work.binding.config_digest ||
                authority.workflow_id !== work.binding.workflow_id ||
                !authority.stage_ids.includes(item.request.stage_id) ||
                !sameImplementationPaths(authority.implementation_paths, work.binding.implementation_paths)
              )
                fail('GAP-VIDA-RUN-CONTEXT-001', 'Writer heartbeat source authority changed.');
            }
          }
          if (
            runtimeConfigDigest(currentConfig) !== work.binding.config_digest ||
            work.binding.repository_id !== values.repository ||
            JSON.stringify(work.binding.project_ids) !== JSON.stringify(values.projects) ||
            state.source_scope?.digest !== values.scope_digest
          )
            fail('GAP-VIDA-RUN-CONTEXT-001', 'Lease renewal configuration, projects or scope differs.');
          const sourceScope = requireRunData(state.source_scope, 'Lease renewal source scope is unavailable.');
          const verifiedSourceRoot = requireRunData(sourceRoot, 'Lease renewal source root is unavailable.');
          const source = snapshotDeclaredSources(
            requireSafeRepositoryAccess(verifiedSourceRoot),
            sourceScope.entries.map((entry) => entry.path),
          );
          const scopeBytes = access.readBytes(work.contracts.scope.path, 'renew bound scope');
          /** @type {unknown} */
          const scope: unknown = JSON.parse(scopeBytes.toString('utf8'));
          if (
            digest(scopeBytes) !== work.contracts.scope.sha256 ||
            !isValidatedRenewalScope(scope, validateScope) ||
            scope.work_id !== work.binding.lifecycle_work_id ||
            scope.scope_id !== work.binding.scope_id ||
            scope.source_revision !== work.binding.work_source_revision ||
            scope.attribution.thread_id !== nativeSessionHandle ||
            !sameImplementationPaths(
              sourceScope.entries.map((entry) => entry.path),
              scope.allowed_paths,
            ) ||
            !sameImplementationPaths(scope.allowed_paths, work.lifecycle.scope.allowed_paths) ||
            canonicalJsonDigest(scope.ac_ids) !== canonicalJsonDigest(work.binding.ac_ids) ||
            !sameImplementationPaths(scope.implementation_paths, work.binding.implementation_paths)
          )
            fail('GAP-VIDA-RUN-CONTEXT-001', 'Lease renewal bound scope differs.');
          const changes = compareScopedSourceSnapshots(sourceScope, source);
          if (
            changes.some(
              (change) =>
                !currentWriterAuthority ||
                !scope.allowed_paths.includes(change.path) ||
                !currentWriterAuthority.implementation_paths.includes(change.path),
            )
          )
            fail('GAP-VIDA-RUN-CONTEXT-001', 'Lease renewal source changed outside issued writer authority.');
          const intakeRef = work.artifacts.find((entry) => entry.artifact_id === 'local-session-intake');
          if (!intakeRef) fail('GAP-VIDA-RUN-CONTEXT-001', 'Lease renewal intake is unavailable.');
          const intakeBytes = access.readBytes(intakeRef.path, 'lease renewal intake');
          if (digest(intakeBytes) !== intakeRef.sha256)
            fail('GAP-VIDA-RUN-CONTEXT-001', 'Lease renewal intake changed.');
          const intakeValue = parseJsonUnknown(intakeBytes.toString('utf8'));
          const intake = requireRunRecord(intakeValue, 'Persisted intake is invalid.');
          const inventory = runtimePackageCodePaths(currentConfig.runtime.bundle);
          if (canonicalJsonDigest(intake.runtime_code_paths) !== canonicalJsonDigest(inventory))
            fail(
              'GAP-VIDA-RUN-CONTEXT-001',
              'Lease renewal intake requires qualified canonical runtime inventory repair.',
            );
          const runtime = snapshotRuntimePackageSources(
            runtimePackageAccess(),
            currentConfig.runtime.bundle,
            inventory,
          );
          const schema = digest(
            runtimePackageAccess().readBytes('schemas/agent-runtime-config.v1.schema.json', 'lease renewal schema'),
          );
          if (
            runtime.digest !== work.binding.runtime_code_digest ||
            schema !== work.binding.schema_digest ||
            intake.native_session_handle !== nativeSessionHandle ||
            canonicalJsonDigest(intake.work_item) !== work.binding.work_item_digest
          )
            fail('GAP-VIDA-RUN-CONTEXT-001', 'Lease renewal bundle, intake or owner changed.');
        },
      });
      return inspectLocalSession({
        repositoryRoot: values.project_root,
        config,
        projectIds: project.project_ids,
        integrationsDigest: project.integrations_digest,
        workId: values.work_id,
        attempt: Number(values.attempt),
      });
    } finally {
      ledger.close();
    }
  }
  {
    const { requireSafeRepositoryAccess } = await import('../src/config/safe-repository-access.ts');
    const { sessionHandoffDatabaseRelativePath } = await import('../src/config/project-paths.ts');
    const access = requireSafeRepositoryAccess(values.project_root);
    if (access.fileExists(sessionHandoffDatabaseRelativePath(config), 'existing preparation inspection')) {
      const { inspectLocalSession } = await import('../src/orchestration/inspect-local-session.ts');
      const { loadProjectSetContext } = await import('../src/config/project-context.ts');
      const project = loadProjectSetContext(values.project_root, config, config.repository.repository_id, [
        pathProject.project_id,
      ]);
      const prior = inspectLocalSession({
        repositoryRoot: values.project_root,
        config,
        projectIds: project.project_ids,
        integrationsDigest: project.integrations_digest,
        workId: values.work_id,
        attempt: Number(values.attempt),
      });
      if (prior.work_version && !prior.journal_version && prior.lease)
        fail(
          'GAP-VIDA-RUN-PREPARATION-001',
          'Existing preparation has no journal. Inspect --recover-unprepared-work before any new issue; producer and engine proof remain required.',
        );
    }
  }
  if (!values.issue_wave && !values.report && !values.correct && !values.prepare_assurance && !values.reconcile)
    await advanceCutoff(selector, values);
  {
    const { MastraSessionBridge, configuredContextForStage, parseSessionBridgeObservation, sessionBridgeRunId } =
      await import('../src/orchestration/mastra-session-bridge.ts');
    const { openConfiguredMastraSessionLedger } = await import('../src/orchestration/persistent-session-handoff.ts');
    const { sessionActionsForWave } = await import('../src/orchestration/session-handoff.ts');
    const { requireSafeRepositoryAccess } = await import('../src/config/safe-repository-access.ts');
    const { compareScopedSourceSnapshots, snapshotAdmittedTaskSources, snapshotDeclaredSources } =
      await import('../src/orchestration/scoped-source-snapshot.ts');
    const scopeDigest = requireOption(values.scope_digest, '--scope-digest');
    /** @type {import('../src/orchestration/session-handoff.ts').SessionHandoffContext} */
    const context: import('../src/orchestration/session-handoff.ts').SessionHandoffContext = {
      work_id: values.work_id,
      attempt: Number(values.attempt),
      scope_digest: scopeDigest,
    };
    const selection = { ...selectionBase, project: pathProject.project_id };
    const ledger = openConfiguredMastraSessionLedger(values.project_root);
    const reportValue = values.report ? readBoundedReport(values.report) : undefined;
    if (isRecord(reportValue) && reportValue.schema === 'VidaSessionObservation/v1') {
      try {
        const observation = parseSessionBridgeObservation(reportValue);
        const recorded = ledger.retrieveReportedObservation(context.work_id, context.attempt, observation);
        if (recorded) {
          const { loadProjectSetContext } = await import('../src/config/project-context.ts');
          const project = loadProjectSetContext(
            values.project_root,
            config,
            config.repository.repository_id,
            values.projects,
          );
          const host = ledger.hostState.readHostStateSnapshot({
            repository_id: project.repository_id,
            project_ids: project.project_ids,
            integrations_digest: project.integrations_digest,
            work_id: context.work_id,
          });
          const item =
            [...recorded.state.items, ...recorded.state.completed.flatMap((wave) => wave.items)].find(
              (item) => item.request.action_id === observation.action_id,
            ) ?? ledger.hostState.findArchivedReportedObservation(context.work_id, context.attempt, observation);
          if (
            !host.work ||
            host.work.binding.workflow_id !== values.workflow ||
            host.work.binding.config_digest !== configDigest ||
            host.work.binding.work_source_revision !== context.scope_digest ||
            host.work.execution.run_id !==
              (recorded.state.corrective_execution?.base_run_id ?? recorded.state.run_id) ||
            !item ||
            item.request.workflow_id !== values.workflow ||
            item.request.scope_digest !== context.scope_digest ||
            item.request.config_digest !== configDigest
          )
            fail('GAP-VIDA-RUN-CONTEXT-001', 'Recorded observation belongs to another current work binding.');
          const response = {
            schema: 'VidaAgentRunResult/v1',
            status: 'report_retrieved',
            workflow: values.workflow,
            mastra_run_id: recorded.state.run_id,
            mastra_step_id: recorded.state.step_id,
            resume_status: recorded.resume_status,
            state_version: recorded.version,
            issued_actions: [],
            completed_observations: recorded.state.completed.flatMap((wave) =>
              wave.items.map((item) => item.observation),
            ),
            recorded_observation: observation,
            initialization_status: initialization.workspace_binding_status,
          };
          ledger.close();
          return response;
        }
      } catch (error) {
        ledger.close();
        throw error;
      }
    }
    const { loadProjectSetContext: loadAdmissionProjectContext } = await import('../src/config/project-context.ts');
    let admissionProject;
    try {
      admissionProject = loadAdmissionProjectContext(
        values.project_root,
        config,
        config.repository.repository_id,
        values.projects,
      );
    } catch (error) {
      ledger.close();
      throw error;
    }
    let admissionHost;
    const admissionIdentity = {
      repository_id: admissionProject.repository_id,
      project_ids: admissionProject.project_ids,
      integrations_digest: admissionProject.integrations_digest,
      work_id: context.work_id,
    };
    try {
      admissionHost = ledger.hostState.readHostStateSnapshot(admissionIdentity);
    } catch (error) {
      ledger.close();
      throw error;
    }
    const continuationLookup = ledger.hostState.readDeliveredWorkContinuation(admissionIdentity, context.attempt);
    if (continuationLookup?.receipt.request.action.kind === 'configured_frontier') {
      const admissionWork = requireHostWork(
        admissionHost,
        'Delivered prewriter continuation has no current Host work.',
      );
      try {
        const intake = assertAdmittedRuntimeCodeCurrent(values.project_root, ledger.hostState, admissionIdentity);
        if (values.prepare_assurance || values.correct || values.reconcile)
          fail('GAP-VIDA-RUN-CONTEXT-001', 'The current prewriter wave must finish before dependent execution.');
        let current = continuationLookup;
        const expected = readExpectedStateVersion(values.expected_revision, values.expected_digest);
        if (values.issue_wave || values.report) {
          requireRunValue(expected, 'Delivered prewriter Journal version is stale.');
          if (
            current.journal.version.revision !== expected.revision ||
            current.journal.version.digest !== expected.digest
          )
            fail('GAP-VIDA-RUN-CONTEXT-001', 'Delivered prewriter Journal version is stale.');
        }
        const effectiveScope =
          current.recovery?.request.currentSourceScope ?? current.receipt.request.currentSourceScope;
        const sourcePaths = effectiveScope.entries.map((entry) => entry.path);
        const owner = admissionWork.lease?.thread_id;
        if (!owner) fail('GAP-VIDA-RUN-CONTEXT-001', 'Delivered prewriter has no original owner lease.');
        const source = ledger.hostState.snapshotCurrentTaskSourceSources(
          admissionIdentity,
          owner,
          sourcePaths,
          context.attempt,
        );
        if (source.digest !== effectiveScope.digest || source.digest !== context.scope_digest)
          fail('GAP-VIDA-RUN-CONTEXT-001', 'Delivered prewriter current Source differs.');
        const { buildAdmittedDevelopmentPacket } = await import('../src/orchestration/admitted-development-packet.ts');
        const access = requireSafeRepositoryAccess(values.project_root);
        const currentLedger = ledger.resume(context.work_id, context.attempt);
        if (
          !currentLedger ||
          currentLedger.version.revision !== current.journal.version.revision ||
          currentLedger.version.digest !== current.journal.version.digest
        )
          fail('GAP-VIDA-RUN-CONTEXT-001', 'Delivered prewriter Journal changed before packet construction.');
        const continuedWorkItem = workflowWorkItemSchema.parse(intake.work_item);
        const packet = buildAdmittedDevelopmentPacket({
          repositoryRoot: values.project_root,
          config,
          host: admissionHost,
          sourceStore: ledger.hostState,
          ledger: currentLedger,
          workItem: continuedWorkItem,
          selection,
          scopeBytes: access.readBytes(admissionWork.contracts.scope.path, 'continued admitted scope'),
          acceptanceBytes: access.readBytes(admissionWork.contracts.acceptance.path, 'continued admitted acceptance'),
          configuredContext: configuredContextForStage(
            values.project_root,
            config,
            values.workflow,
            current.item.request.stage_id,
            context,
          ),
        });
        let status = 'continuation_prewrite_ready';
        let issuedNow = false;
        if (values.report) {
          const observed = parseSessionBridgeObservation(readBoundedReport(values.report));
          const issued = current.items.find((item) => item.request.action_id === observed.action_id);
          if (!issued && ledger.hostState.findArchivedReportedObservation(context.work_id, context.attempt, observed))
            return {
              schema: 'VidaAgentRunResult/v1',
              status: 'archived_report_retained',
              state_version: current.journal.version,
              accepted_result: false,
              runtime_accepted: false,
              issued_actions: [],
              next_actions: [],
            };
          if (!issued?.issue_id || issued.issue_id !== observed.issue_id)
            fail('GAP-VIDA-RUN-CONTEXT-001', 'Prewriter report has no matching retained issuance.');
          requireRunValue(expected, 'Prewriter report has no expected Journal version.');
          ledger.report(context.work_id, context.attempt, expected, observed, source);
          const updated = ledger.hostState.readDeliveredWorkContinuation(admissionIdentity, context.attempt);
          requireRunValue(updated, 'Delivered prewriter continuation disappeared after report.');
          current = updated;
          status = 'continuation_prewrite_reported';
        } else if (values.issue_wave && current.action_status === 'unissued') {
          requireRunValue(expected, 'Prewriter issue has no expected Journal version.');
          ledger.issueWave(context.work_id, context.attempt, expected);
          const updated = ledger.hostState.readDeliveredWorkContinuation(admissionIdentity, context.attempt);
          requireRunValue(updated, 'Delivered prewriter continuation disappeared after issue.');
          current = updated;
          status = 'issued';
          issuedNow = true;
        } else if (current.action_status === 'issued') status = 'wave_retrieved';
        else if (current.action_status === 'reported') status = 'continuation_prewrite_reported';
        const wave = current.items[0]?.request.wave_index;
        const actions =
          wave === undefined
            ? []
            : sessionActionsForWave(
                config,
                selection,
                context,
                values.workflow,
                wave,
                [],
                undefined,
                admissionWork.lifecycle.risk,
              );
        /** @param {import('../src/host-state.ts').DeliveredWorkContinuationLookup['items'][number]} item */
        const describe = (item: import('../src/host-state.ts').DeliveredWorkContinuationLookup['items'][number]) => {
          const action = actions.find((candidate) => candidate.action_id === item.request.action_id);
          if (
            !action ||
            action.stage_id !== 'review_source_prewrite' ||
            action.resolved_profile.tools_policy.source_write
          )
            fail('GAP-VIDA-RUN-CONTEXT-001', 'Delivered prewriter is not a current read-only configured action.');
          return {
            request: item.request,
            action,
            development_packet: packet,
            configured_context: configuredContextForStage(
              values.project_root,
              config,
              values.workflow,
              item.request.stage_id,
              context,
            ),
            ...(item.issue_id ? { issue_id: item.issue_id, logical_action_id: item.request.action_id } : {}),
          };
        };
        if (!values.inspect && current.action_status === 'reported') {
          const observations = current.items.map((item) => {
            const observation = item.observation;
            requireReportedCompleteObservation(observation);
            return observation;
          });
          const bridge = await MastraSessionBridge.open({
            repositoryRoot: values.project_root,
            config,
            selection,
            context,
            workflowId: values.workflow,
            workspaceId: initialization.workspace_id,
            ledger,
            projectIds: admissionProject.project_ids,
            lifecycleRisk: admissionWork.lifecycle.risk,
            configuredFrontier: { identity: admissionIdentity, attempt: context.attempt },
          });
          const prewriterStepId = current.journal.state.step_id;
          requireRunValue(prewriterStepId, 'Reported delivered prewriter has no retained step identifier.');
          const resumed = await bridge.resume(prewriterStepId, observations, source);
          const resumedLedger = ledger.resume(context.work_id, context.attempt);
          requireRunValue(resumedLedger, 'Delivered prewriter Journal disappeared after resume.');
          const nextWave = resumed.requests[0]?.wave_index;
          const nextActions =
            nextWave === undefined
              ? []
              : sessionActionsForWave(
                  config,
                  selection,
                  context,
                  values.workflow,
                  nextWave,
                  [],
                  undefined,
                  admissionWork.lifecycle.risk,
                );
          return {
            schema: 'VidaAgentRunResult/v1',
            status: 'continuation_resumed',
            workflow: values.workflow,
            mastra_run_id: resumed.run_id,
            mastra_step_id: resumed.step_id,
            execution_status: resumed.status,
            state_version: resumedLedger.version,
            next_actions: resumed.requests.map((request) => ({
              request,
              action: nextActions.find((action) => action.action_id === request.action_id),
              development_packet: packet,
              configured_context: configuredContextForStage(
                values.project_root,
                config,
                values.workflow,
                request.stage_id,
                context,
              ),
            })),
            issued_actions: [],
            completed_observations: resumed.observations,
            accepted_result: false,
            runtime_accepted: false,
          };
        }
        const responseLedger = ledger.resume(context.work_id, context.attempt);
        requireRunValue(responseLedger, 'Delivered prewriter Journal is unavailable for response construction.');
        return {
          schema: 'VidaAgentRunResult/v1',
          status,
          workflow: values.workflow,
          mastra_run_id: current.journal.state.run_id,
          mastra_step_id: current.journal.state.step_id,
          execution_status: 'configured_prewrite',
          resume_status: responseLedger.resume_status,
          state_version: current.journal.version,
          continuation_id: current.receipt.continuation_id,
          source_snapshot_digest: source.digest,
          reconciliation_required: false,
          next_actions: current.items.filter((item) => item.issue_id === null).map(describe),
          issued_actions: current.items
            .filter(isIssuedWithoutObservation)
            .map((item) => describeUncertainIssuedAction(item, issuedNow, describe)),
          action_statuses: current.items.map((item, index) => ({
            action_id: item.request.action_id,
            status:
              current.item_statuses[index] === 'issued' ? 'issued_outcome_uncertain' : current.item_statuses[index],
          })),
          completed_observations: [
            ...current.journal.state.completed.flatMap((wave) => wave.items.map((item) => item.observation)),
            ...current.items.flatMap(observationList),
          ],
          accepted_result: false,
          runtime_accepted: false,
          initialization_status: initialization.workspace_binding_status,
        };
      } finally {
        ledger.close();
      }
    }
    if (continuationLookup) {
      requireHistoricalReviewAction(continuationLookup.receipt.request.action);
      const actionRequest = continuationLookup.receipt.request.action.request;
      if (
        !admissionHost.work ||
        admissionHost.work.binding.workflow_id !== values.workflow ||
        admissionHost.work.binding.config_digest !== configDigest ||
        admissionHost.work.binding.work_source_revision !== context.scope_digest ||
        actionRequest.workflow_id !== values.workflow ||
        actionRequest.run_id !== continuationLookup.journal.state.run_id ||
        actionRequest.scope_digest !== context.scope_digest ||
        actionRequest.config_digest !== configDigest ||
        actionRequest.action_id !== continuationLookup.item.request.action_id ||
        continuationLookup.journal.state.items.length !== 1 ||
        continuationLookup.journal.state.step_id !== actionRequest.stage_id
      ) {
        ledger.close();
        fail('GAP-VIDA-RUN-CONTEXT-001', 'Delivered-work review differs from the current Work, Journal or workflow.');
      }
      const candidates = sessionActionsForWave(
        config,
        selection,
        context,
        values.workflow,
        actionRequest.wave_index,
        [],
        optionalCorrectiveExecution(continuationLookup.journal.state.corrective_execution),
        admissionHost.work.lifecycle.risk,
      ).filter((action) => action.action_id === actionRequest.action_id);
      const configuredContext = configuredContextForStage(
        values.project_root,
        config,
        values.workflow,
        actionRequest.stage_id,
        context,
      );
      const configuredFiles = configuredContext
        ? configuredContext.entries
            .filter((entry) => entry.sha256 !== null)
            .map((entry) => ({ path: entry.location, sha256: entry.sha256 }))
        : [];
      const reviewAction = candidates[0];
      requireRunValue(reviewAction, 'Delivered-work review action is unavailable.');
      if (
        candidates.length !== 1 ||
        reviewAction.stage_id !== actionRequest.stage_id ||
        reviewAction.assignment_index !== actionRequest.assignment_index ||
        reviewAction.role !== actionRequest.role ||
        (configuredContext?.digest ?? undefined) !== actionRequest.configured_context_digest ||
        canonicalJsonDigest(configuredFiles) !== canonicalJsonDigest(actionRequest.configured_context_files ?? [])
      ) {
        ledger.close();
        fail('GAP-VIDA-RUN-CONTEXT-001', 'Delivered-work review action or configured context is stale.');
      }
      if (continuationLookup.action_status !== 'reported' && (values.prepare_assurance || values.correct)) {
        ledger.close();
        fail(
          'GAP-VIDA-RUN-CONTEXT-001',
          'The retained-source review must be reported before final assurance or correction.',
        );
      }
      if (values.reconcile) {
        ledger.close();
        fail('GAP-VIDA-RUN-EXECUTION-001', 'Delivered-work review does not permit native-attempt reconciliation.');
      }
      if (values.issue_wave || values.report || values.inspect || !(values.prepare_assurance || values.correct)) {
        try {
          let reviewLookup = continuationLookup,
            reviewStatus = 'continuation_review_ready';
          const expected = readExpectedStateVersion(values.expected_revision, values.expected_digest);
          if (values.issue_wave || values.report) {
            requireRunValue(expected, 'Delivered-work review Journal version is stale.');
            if (
              reviewLookup.journal.version.revision !== expected.revision ||
              reviewLookup.journal.version.digest !== expected.digest
            )
              fail('GAP-VIDA-RUN-CONTEXT-001', 'Delivered-work review Journal version is stale.');
          }
          if (values.report) {
            const observation = parseSessionBridgeObservation(readBoundedReport(values.report));
            if (
              reviewLookup.action_status === 'unissued' ||
              observation.action_id !== actionRequest.action_id ||
              observation.issue_id !== reviewLookup.item.issue_id
            )
              fail('GAP-VIDA-RUN-CONTEXT-001', 'Review report does not match the persisted delivered-work issuance.');
            const sourcePaths = continuationLookup.receipt.request.currentSourceScope.entries.map(
              (entry) => entry.path,
            );
            const leaseThread = admissionHost.work?.lease?.thread_id;
            if (!leaseThread)
              fail('GAP-VIDA-RUN-CONTEXT-001', 'Delivered-work review has no current Host execution lease.');
            const currentSourceScope = ledger.hostState.snapshotCurrentTaskSourceSources(
              admissionIdentity,
              leaseThread,
              sourcePaths,
              context.attempt,
            );
            if (currentSourceScope.digest !== continuationLookup.receipt.request.currentSourceScope.digest)
              fail('GAP-VIDA-RUN-CONTEXT-001', 'Current Source changed after delivered-work review preparation.');
            requireRunValue(expected, 'Review report has no expected Journal version.');
            ledger.report(context.work_id, context.attempt, expected, observation, currentSourceScope);
            const updated = ledger.hostState.readDeliveredWorkContinuation(admissionIdentity, context.attempt);
            requireRunValue(updated, 'Delivered-work review disappeared after report.');
            reviewLookup = updated;
            reviewStatus = 'continuation_review_reported';
          } else if (values.issue_wave && reviewLookup.action_status === 'unissued') {
            requireRunValue(expected, 'Review issue has no expected Journal version.');
            const issuedJournal = ledger.issueWave(context.work_id, context.attempt, expected);
            if (issuedJournal.state.items.length !== 1)
              fail('GAP-VIDA-RUN-EXECUTION-001', 'Delivered-work review did not issue exactly one action.');
            const updated = ledger.hostState.readDeliveredWorkContinuation(admissionIdentity, context.attempt);
            requireRunValue(updated, 'Delivered-work review disappeared after issue.');
            reviewLookup = updated;
            reviewStatus = 'issued';
          } else if (reviewLookup.action_status === 'issued') {
            reviewStatus = 'wave_retrieved';
          } else if (reviewLookup.action_status === 'reported') {
            reviewStatus = 'continuation_review_reported';
          }
          const currentRequest = reviewLookup.item.request;
          const capture = reviewLookup.receipt.historical_capture;
          const reviewActionReceipt = reviewLookup.receipt.request.action;
          requireRunValue(capture, 'Retained review body bytes differ from Host custody.');
          requireHistoricalReviewAction(reviewActionReceipt);
          const captureBytes = Buffer.from(capture.body_base64, 'base64');
          if (
            captureBytes.byteLength !== capture.body_byte_length ||
            digest(captureBytes) !== capture.body_sha256 ||
            capture.body_sha256 !== reviewActionReceipt.capture.body_sha256 ||
            reviewActionReceipt.original_request_pointer !== capture.request.user_request_pointer
          )
            fail('GAP-VIDA-RUN-CONTEXT-001', 'Retained review body bytes differ from Host custody.');
          const historicalReviewInput = {
            body_base64: capture.body_base64,
            body_sha256: capture.body_sha256,
            body_byte_length: capture.body_byte_length,
            body_ref: reviewActionReceipt.capture.body_ref,
            original_request_pointer: reviewActionReceipt.original_request_pointer,
          };
          const currentJournal = ledger.resume(context.work_id, context.attempt);
          if (
            !currentJournal ||
            currentJournal.version.revision !== reviewLookup.journal.version.revision ||
            currentJournal.version.digest !== reviewLookup.journal.version.digest
          )
            fail('GAP-VIDA-RUN-CONTEXT-001', 'Delivered-work review changed before response construction.');
          const currentItem = reviewLookup.item;
          const issued = currentItem.issue_id
            ? [
                {
                  request: currentRequest,
                  issue_id: currentItem.issue_id,
                  logical_action_id: currentRequest.action_id,
                  action: reviewAction,
                  configured_context: configuredContext,
                  historical_review_input: historicalReviewInput,
                  ...(reviewLookup.action_status === 'issued' ? { prior_issue_outcome: 'unknown' } : {}),
                },
              ]
            : [];
          const completedObservations = [
            ...currentJournal.state.completed.flatMap((wave) => wave.items.map((item) => item.observation)),
            ...(currentItem.observation ? [currentItem.observation] : []),
          ];
          const response = {
            schema: 'VidaAgentRunResult/v1',
            status: reviewStatus,
            workflow: values.workflow,
            mastra_run_id: currentJournal.state.run_id,
            mastra_step_id: currentJournal.state.step_id,
            execution_status: 'historical_review',
            resume_status: currentJournal.resume_status,
            reconciliation_required: false,
            source_snapshot_digest: reviewLookup.receipt.request.currentSourceScope.digest,
            state_version: reviewLookup.journal.version,
            continuation_id: reviewLookup.receipt.continuation_id,
            continuation_review: {
              action_id: currentRequest.action_id,
              status: reviewLookup.action_status,
              ...(reviewLookup.action_status === 'issued' ? { prior_issue_outcome: 'unknown' } : {}),
              accepted_result: false,
              runtime_accepted: false,
            },
            next_actions:
              reviewLookup.action_status === 'unissued'
                ? [
                    {
                      request: currentRequest,
                      action: reviewAction,
                      configured_context: configuredContext,
                      historical_review_input: historicalReviewInput,
                    },
                  ]
                : [],
            issued_actions: issued,
            action_statuses: [
              {
                action_id: currentRequest.action_id,
                status:
                  reviewLookup.action_status === 'issued' ? 'issued_outcome_uncertain' : reviewLookup.action_status,
              },
            ],
            completed_observations: completedObservations,
            reported_observation: currentItem.observation,
            accepted_result: false,
            runtime_accepted: false,
            initialization_status: initialization.workspace_binding_status,
          };
          return response;
        } finally {
          ledger.close();
        }
      }
    }
    if (values.inspect) {
      ledger.close();
      const { inspectLocalSession } = await import('../src/orchestration/inspect-local-session.ts');
      return inspectLocalSession({
        repositoryRoot: values.project_root,
        config,
        projectIds: admissionProject.project_ids,
        integrationsDigest: admissionProject.integrations_digest,
        workId: values.work_id,
        attempt: Number(values.attempt),
      });
    }
    let finalJournal = ledger.hostState.readFinalAssurance(admissionIdentity, context.attempt);
    if (values.prepare_assurance || (finalJournal && !values.correct)) {
      try {
        const {
          prepareFinalAssurance,
          issueFinalAssuranceWave,
          reportFinalAssurance,
          finalAssuranceStatus,
          finalAssuranceReceiptReferences,
        } = await import('../src/orchestration/final-assurance.ts');
        const expected = readExpectedStateVersion(values.expected_revision, values.expected_digest);
        if (
          values.prepare_assurance &&
          finalJournal &&
          path.relative(values.project_root, values.prepare_assurance).split(path.sep).join('/') !==
            finalJournal.state.packet.preparation_path
        )
          fail('GAP-VIDA-RUN-CONTEXT-001', 'Assurance preparation retry differs from the current packet.');
        if (values.prepare_assurance && !finalJournal) {
          requireRunValue(expected, 'Assurance preparation has no expected Journal version.');
          assertAdmittedRuntimeCodeCurrent(values.project_root, ledger.hostState, admissionIdentity);
          const journal = ledger.resume(context.work_id, context.attempt);
          if (!journal || journal.version.revision !== expected.revision || journal.version.digest !== expected.digest)
            fail('GAP-VIDA-RUN-CONTEXT-001', 'Assurance preparation journal version is stale.');
          finalJournal = prepareFinalAssurance({
            root: values.project_root,
            config,
            store: ledger.hostState,
            identity: admissionIdentity,
            journal,
            preparationPath: path.relative(values.project_root, values.prepare_assurance).split(path.sep).join('/'),
          });
        }
        requireRunValue(finalJournal, 'Final assurance state is unavailable.');
        let assurance = finalJournal;
        let status = 'assurance_resumed',
          /** @type {import('../src/orchestration/final-assurance.ts').FinalAssuranceState['actions'][number][]} */
          issued: import('../src/orchestration/final-assurance.ts').FinalAssuranceState['actions'][number][] = [];
        if (values.issue_wave || values.report) {
          requireRunValue(expected, 'Final assurance operation has no expected Journal version.');
          assertAdmittedRuntimeCodeCurrent(values.project_root, ledger.hostState, admissionIdentity);
          const next = values.issue_wave
            ? issueFinalAssuranceWave(assurance.state)
            : reportFinalAssurance(assurance.state, readBoundedReport(requireOption(values.report, '--report')));
          const duplicate = canonicalJsonDigest(next) === canonicalJsonDigest(assurance.state);
          if (!duplicate) {
            if (assurance.version.revision !== expected.revision || assurance.version.digest !== expected.digest)
              fail('GAP-VIDA-RUN-CONTEXT-001', 'Final assurance journal version is stale.');
            const host = ledger.hostState.readHostStateSnapshot(admissionIdentity);
            requireRunValue(host.workVersion, 'Final assurance compare-and-swap has no current Host versions.');
            requireRunValue(host.ledgerVersion, 'Final assurance compare-and-swap has no current Host versions.');
            assurance = ledger.hostState.compareAndSwapFinalAssurance({
              identity: admissionIdentity,
              attempt: context.attempt,
              expected: assurance.version,
              expectedWork: host.workVersion,
              expectedLedger: host.ledgerVersion,
              next,
            });
          }
          status = values.issue_wave
            ? 'assurance_wave_issued'
            : duplicate
              ? 'assurance_report_retrieved'
              : 'assurance_reported';
          if (values.issue_wave)
            issued = assurance.state.actions.filter((action) => action.issue_id && !action.observation);
        }
        let host = ledger.hostState.readHostStateSnapshot(admissionIdentity),
          deliveryGap = null;
        requireRunValue(host.work, 'Final assurance has no current Host work.');
        const assuranceWork = host.work;
        if (
          (values.report || values.prepare_assurance) &&
          finalAssuranceStatus(assurance.state) === 'reviewed' &&
          assuranceWork.lifecycle.phase === 'VERIFY'
        ) {
          try {
            const expectedWork = host.workVersion;
            const expectedLedger = host.ledgerVersion;
            requireRunValue(expectedWork, 'Final assurance delivery has no current Host CAS versions.');
            requireRunValue(expectedLedger, 'Final assurance delivery has no current Host CAS versions.');
            const references = finalAssuranceReceiptReferences(values.project_root, assuranceWork, assurance.state);
            host = ledger.hostState.commitFinalAssuranceDelivery({
              identity: admissionIdentity,
              attempt: context.attempt,
              expected: assurance.version,
              expectedWork,
              expectedLedger,
              references,
              documentationContext: {
                repository_root: values.project_root,
                repository_id: admissionIdentity.repository_id,
                project_id: pathProject.project_id,
                work_id: context.work_id,
              },
            });
          } catch (error) {
            deliveryGap = error instanceof Error ? error.message : String(error);
          }
        }
        requireRunValue(host.work, 'Final assurance delivery has no current Host work.');
        /** @param {import('../src/orchestration/final-assurance.ts').FinalAssuranceState['actions'][number]} entry */
        const action = (
          entry: import('../src/orchestration/final-assurance.ts').FinalAssuranceState['actions'][number],
        ) => ({
          ...entry,
          role: assurance.state.packet.role,
          model: assurance.state.packet.model,
          reasoning: assurance.state.packet.reasoning,
          packet: assurance.state.packet,
          review:
            entry.kind === 'reverse'
              ? assurance.state.actions.find(
                  (review) => review.kind === 'review' && review.perspective === entry.perspective,
                )?.observation
              : null,
          tool: entry.kind === 'review' ? 'spawn_agent' : 'followup_task',
          instruction:
            entry.kind === 'review'
              ? 'Fresh isolated blind review. Observe correctness, security and assurance checks explicitly; report only actual findings.'
              : 'Same reviewer performs a separate reverse validation of its accepted review, scope/trace, tests/security/rollback and evidence/invalidation/bindings.',
        });
        const nextKind = finalJournal.state.actions
          .filter((entry) => entry.kind === 'review')
          .every((entry) => entry.observation?.verdict === 'pass')
          ? 'reverse'
          : 'review';
        return {
          schema: 'VidaAgentRunResult/v1',
          status: host.work.lifecycle.phase === 'DELIVERY' ? 'delivery' : status,
          assurance_status: finalAssuranceStatus(assurance.state),
          workflow: values.workflow,
          state_version: assurance.version,
          issued_actions: issued.map(action),
          next_actions:
            finalAssuranceStatus(assurance.state) === 'ready'
              ? assurance.state.actions.filter((entry) => isUnissuedKind(entry, nextKind)).map(action)
              : [],
          delivery_gap: deliveryGap,
          delivery_manifest:
            host.work.lifecycle.references.find(
              (ref) => ref.kind === 'delivery_manifest' && ref.disposition === 'current',
            ) ?? null,
          runtime_acceptance: 'pending_attributable_user_testing',
          initialization_status: initialization.workspace_binding_status,
        };
      } finally {
        ledger.close();
      }
    }
    let admissionIntake;
    try {
      admissionIntake = values.intake ? await readLocalSessionIntake(values.intake) : null;
    } catch (error) {
      ledger.close();
      throw error;
    }
    if (admissionIntake) {
      if (
        admissionIntake.work_item.id !== context.work_id ||
        admissionIntake.work_item.canonical_kind !== selection.kind ||
        admissionIntake.work_item.intent !== selection.intent ||
        admissionIntake.work_item.project_id !== selection.project ||
        /\p{Cc}/u.test(admissionIntake.native_session_handle)
      ) {
        ledger.close();
        fail('GAP-VIDA-RUN-CONTEXT-001', 'Intake identity differs from current configured work.');
      }
      try {
        ledger.hostState.recordAdmissionAttempt(context.work_id, context.attempt, {
          workItem: admissionIntake.work_item,
          nativeSessionHandle: admissionIntake.native_session_handle,
          context,
          scopePath: admissionIntake.scope_path,
          acceptancePath: admissionIntake.acceptance_path,
        });
      } catch (error) {
        ledger.close();
        throw error;
      }
    }
    if (values.correct) {
      try {
        const { correctiveExecutionPlanSchema, prepareLifecycleForCorrection } =
          await import('../src/orchestration/final-assurance.ts');
        const plan = correctiveExecutionPlanSchema.parse(readBoundedReport(values.correct));
        if (plan.work_id !== context.work_id || plan.attempt !== context.attempt)
          fail('GAP-VIDA-RUN-CONTEXT-001', 'Correction plan belongs to another work or attempt.');
        assertAdmittedRuntimeCodeCurrent(values.project_root, ledger.hostState, admissionIdentity);
        const expected = {
          revision: Number(requireOption(values.expected_revision, '--expected-revision')),
          digest: requireOption(values.expected_digest, '--expected-digest'),
        };
        let corrective = ledger.hostState.retrieveCorrectiveAuthorization({
          identity: admissionIdentity,
          attempt: context.attempt,
          journal: expected,
          stageIds: plan.stage_ids,
          userInstructionRef: plan.user_instruction_ref,
        });
        if (!corrective) {
          const current = ledger.resume(context.work_id, context.attempt);
          requireRunValue(current, 'Correction journal version is stale.');
          if (current.version.revision !== expected.revision || current.version.digest !== expected.digest)
            fail('GAP-VIDA-RUN-CONTEXT-001', 'Correction journal version is stale.');
          const host = prepareLifecycleForCorrection({
            root: values.project_root,
            config,
            store: ledger.hostState,
            identity: admissionIdentity,
            journal: current,
            preparationPath: plan.preparation_path,
          });
          requireRunValue(host.workVersion, 'Correction authorization has no current Host CAS versions.');
          requireRunValue(host.ledgerVersion, 'Correction authorization has no current Host CAS versions.');
          corrective = ledger.hostState.authorizeCorrectiveExecution({
            identity: admissionIdentity,
            attempt: context.attempt,
            expectedWork: host.workVersion,
            expectedLedger: host.ledgerVersion,
            expectedJournal: expected,
            stageIds: plan.stage_ids,
            userInstructionRef: plan.user_instruction_ref,
            config,
          });
        }
        const current = ledger.resume(context.work_id, context.attempt);
        requireRunValue(current, 'Correction Journal disappeared after authorization.');
        return {
          schema: 'VidaAgentRunResult/v1',
          status: 'correction_authorized',
          workflow: values.workflow,
          corrective_execution: corrective,
          state_version: current.version,
          issued_actions: [],
          next_actions: [],
          next_operation: 'resume_same_work_attempt',
          initialization_status: initialization.workspace_binding_status,
        };
      } finally {
        ledger.close();
      }
    }
    if (admissionHost.work?.lease && !ledger.resume(context.work_id, context.attempt)?.state.corrective_execution) {
      try {
        const { readAdmittedSessionIntake } = await import('../src/orchestration/admitted-session-execution.ts');
        const canonicalIntake = readAdmittedSessionIntake(values.project_root, ledger.hostState, admissionIdentity);
        const canonicalRef = admissionHost.work.artifacts.find(
          (artifact) => artifact.artifact_id === 'local-session-intake',
        );
        ledger.hostState.reconcileCompletedSourceOwnership({
          identity: admissionIdentity,
          nativeSessionHandle: canonicalIntake.native_session_handle,
          verifyCurrent: () => {
            if (
              !canonicalRef ||
              createHash('sha256')
                .update(
                  requireSafeRepositoryAccess(values.project_root).readBytes(
                    canonicalRef.path,
                    'historical terminal ownership intake',
                  ),
                )
                .digest('hex') !== canonicalRef.sha256
            )
              fail('GAP-VIDA-RUN-CONTEXT-001', 'Completed source ownership intake binding changed.');
          },
        });
      } catch (error) {
        ledger.close();
        throw error;
      }
    }
    /** @type {RunSessionBridge | null} */
    let bridge: RunSessionBridge | null = null;
    /**
     * @param {import('../src/orchestration/mastra-session-bridge.ts').SessionBridgeRequest} request
     * @param {readonly string[]} [allowedChangedPaths]
     */
    const requireConfiguredContext = (
      request: import('../src/orchestration/mastra-session-bridge.ts').SessionBridgeRequest,
      allowedChangedPaths: readonly string[] = [],
    ) => {
      const current = configuredContextForStage(
        values.project_root,
        config,
        values.workflow,
        request.stage_id,
        context,
      );
      if ((current?.digest ?? undefined) === request.configured_context_digest) return current;
      const previous = request.configured_context_files;
      if (!current || !previous || allowedChangedPaths.length === 0)
        fail('GAP-VIDA-RUN-CONTEXT-001', 'Configured context changed before native action use.');
      const priorFiles = new Map(previous.map((entry) => [entry.path, entry.sha256]));
      const currentFiles = new Map(
        current.entries.filter((entry) => entry.sha256 !== null).map((entry) => [entry.location, entry.sha256]),
      );
      const changed = [...new Set([...priorFiles.keys(), ...currentFiles.keys()])].filter(
        (entry) => priorFiles.get(entry) !== currentFiles.get(entry),
      );
      if (changed.length === 0 || changed.some((entry) => !allowedChangedPaths.includes(entry)))
        fail('GAP-VIDA-RUN-CONTEXT-001', 'Configured context changed outside the admitted native output.');
      return current;
    };
    /**
     * @param {import('../src/orchestration/persistent-session-handoff.ts').MastraSessionLedgerSnapshot} currentJournal
     * @param {boolean} [requireImplementation]
     * @param {import('../src/orchestration/mastra-session-bridge.ts').SessionBridgeRequest | null} [pendingDeveloper]
     */
    const admittedEvidence = async (
      currentJournal: import('../src/orchestration/persistent-session-handoff.ts').MastraSessionLedgerSnapshot,
      requireImplementation: boolean = true,
      pendingDeveloper: import('../src/orchestration/mastra-session-bridge.ts').SessionBridgeRequest | null = null,
    ) => {
      const { openAdmittedSessionExecution, readAdmittedSessionExecutionContext } =
        await import('../src/orchestration/admitted-session-execution.ts');
      const { buildAdmittedDevelopmentPacket } = await import('../src/orchestration/admitted-development-packet.ts');
      const { buildAdmittedImplementationResult } =
        await import('../src/orchestration/admitted-implementation-result.ts');
      const execution = requireImplementation
        ? await openAdmittedSessionExecution(
            values.project_root,
            ledger.hostState,
            pathProject.project_id,
            context.work_id,
          )
        : readAdmittedSessionExecutionContext(
            values.project_root,
            ledger.hostState,
            pathProject.project_id,
            context.work_id,
          );
      const host = ledger.hostState.readHostStateSnapshot(execution.identity);
      const work = host.work;
      requireRunValue(work, 'Admitted work is missing for evidence.');
      const selectedWorkflow = activeWorkflow;
      requireRunValue(selectedWorkflow, 'Configured workflow is unavailable for evidence.');
      const access = requireSafeRepositoryAccess(values.project_root);
      const developer = currentJournal.state.completed
        .flatMap((entry) => entry.items)
        .find((item) =>
          selectedWorkflow.stages.some((stage) => stage.id === item.request.stage_id && stage.kind === 'develop'),
        );
      const configuredContext = pendingDeveloper
        ? requireConfiguredContext(pendingDeveloper)
        : developer
          ? requireConfiguredContext(developer.request, developer.observation?.changed_paths ?? [])
          : null;
      const workItem = workflowWorkItemSchema.parse(execution.workItem);
      const packet = buildAdmittedDevelopmentPacket({
        repositoryRoot: values.project_root,
        config,
        host,
        sourceStore: ledger.hostState,
        ledger: currentJournal,
        workItem,
        selection,
        scopeBytes: access.readBytes(work.contracts.scope.path, 'current admitted scope'),
        acceptanceBytes: access.readBytes(work.contracts.acceptance.path, 'current admitted acceptance'),
        configuredContext,
      });
      const implementationResult = requireImplementation
        ? buildAdmittedImplementationResult({
            repositoryRoot: values.project_root,
            config,
            packet,
            host,
            sourceStore: ledger.hostState,
            ledger: currentJournal,
          })
        : undefined;
      const authority = requireImplementation
        ? 'composition' in execution
          ? execution.composition.deliveryEvidenceAuthority
          : fail('GAP-VIDA-RUN-EXECUTION-001', 'Admitted execution has no trusted delivery authority.')
        : undefined;
      return {
        packet,
        implementationResult,
        authority,
        host,
      };
    };
    /**
     * @param {import('../src/orchestration/persistent-session-handoff.ts').MastraSessionLedgerSnapshot} currentJournal
     * @param {Awaited<ReturnType<typeof admittedEvidence>>} evidence
     */
    const completedValidationReceipts = async (
      currentJournal: import('../src/orchestration/persistent-session-handoff.ts').MastraSessionLedgerSnapshot,
      evidence: Awaited<ReturnType<typeof admittedEvidence>>,
    ) => {
      const { issueObservedValidationReceipt } = await import('../src/orchestration/observed-validation.ts');
      const { sessionActionsForWave } = await import('../src/orchestration/session-handoff.ts');
      const { compileDevelopmentWorkflow } = await import('../src/orchestration/workflow-plan.ts');
      const currentWork = evidence.host.work;
      const implementationResult = evidence.implementationResult;
      const authority = evidence.authority;
      requireRunValue(currentWork, 'Completed validation requires admitted implementation and authority.');
      requireRunValue(implementationResult, 'Completed validation requires admitted implementation and authority.');
      requireRunValue(authority, 'Completed validation requires admitted implementation and authority.');
      const currentLifecycleRisk = currentWork.lifecycle.risk;
      const compiled = compileDevelopmentWorkflow(
        config,
        values.team,
        values.workflow,
        selection.risk_flags,
        currentLifecycleRisk,
      );
      const expected = compiled.waves.flatMap((wave, index) =>
        wave.some((stage) => stage.kind === 'validate' && stage.produces.includes('ValidationReceipt/v1'))
          ? sessionActionsForWave(
              config,
              selection,
              context,
              values.workflow,
              index,
              [],
              optionalCorrectiveExecution(currentJournal.state.corrective_execution),
              currentLifecycleRisk,
            ).filter((action) => action.stage_kind === 'validate' && action.produces.includes('ValidationReceipt/v1'))
          : [],
      );
      const receipts = expected.map((action) =>
        issueObservedValidationReceipt({
          repositoryRoot: values.project_root,
          config,
          packet: evidence.packet,
          implementationResult,
          journal: currentJournal,
          actionId: action.action_id,
          authority,
          host: evidence.host,
          sourceStore: ledger.hostState,
        }),
      );
      if (
        new Set(receipts.map((receipt) => receipt.validator_role)).size !== expected.length ||
        receipts.some((receipt) => receipt.verdict !== 'pass')
      )
        fail('GAP-VIDA-RUN-EXECUTION-001', 'Configured validator receipts are incomplete or failed.');
      return receipts;
    };
    /**
     * @param {import('../src/orchestration/persistent-session-handoff.ts').MastraSessionLedgerSnapshot} currentJournal
     * @param {import('../src/orchestration/persistent-session-handoff.ts').MastraSessionLedgerSnapshot} [evidenceJournal]
     */
    const preparedDelivery = async (
      currentJournal: import('../src/orchestration/persistent-session-handoff.ts').MastraSessionLedgerSnapshot,
      evidenceJournal: import('../src/orchestration/persistent-session-handoff.ts').MastraSessionLedgerSnapshot = currentJournal,
    ) => {
      const evidence = await admittedEvidence(evidenceJournal);
      const implementationResult = evidence.implementationResult;
      const authority = evidence.authority;
      requireRunValue(implementationResult, 'Prepared delivery requires current admitted implementation authority.');
      requireRunValue(authority, 'Prepared delivery requires current admitted implementation authority.');
      requireRunValue(evidence.host.work, 'Prepared delivery requires current admitted implementation authority.');
      const receipts = await completedValidationReceipts(evidenceJournal, evidence);
      const { issueObservedTestReceipt } = await import('../src/orchestration/observed-testing.ts');
      const {
        instruction: testerInstruction,
        receipt: testReceipt,
        evidence: testerEvidence,
      } = issueObservedTestReceipt({
        repositoryRoot: values.project_root,
        config,
        packet: evidence.packet,
        implementationResult,
        journal: evidenceJournal,
        authority,
        host: evidence.host,
        sourceStore: ledger.hostState,
      });
      const { prepareObservedDeliveryInstruction } = await import('../src/orchestration/observed-delivery.ts');
      const instruction = prepareObservedDeliveryInstruction({
        repositoryRoot: values.project_root,
        config,
        packet: evidence.packet,
        implementationResult,
        journal: currentJournal,
        validationReceipts: receipts,
        testerInstruction,
        testReceipt,
        authority,
        host: evidence.host,
        sourceStore: ledger.hostState,
      });
      return { instruction, evidence: testerEvidence };
    };
    /** @param {import('../src/orchestration/persistent-session-handoff.ts').MastraSessionLedgerSnapshot} currentJournal */
    const normalizeObservedResearch = async (
      currentJournal: import('../src/orchestration/persistent-session-handoff.ts').MastraSessionLedgerSnapshot,
    ) => {
      const selectedWorkflow = activeWorkflow;
      requireRunValue(selectedWorkflow, 'Configured workflow is unavailable for research.');
      const researchItems = currentJournal.state.items.filter(
        (item) =>
          item.observation?.status === 'reported_complete' &&
          selectedWorkflow.stages.some(
            (stage) =>
              stage.id === item.request.stage_id &&
              (stage.produces.includes('ResearchResult/v1') || stage.produces.includes('ResearchSynthesis/v1')),
          ),
      );
      if (researchItems.length === 0) return currentJournal;
      const { loadProjectSetContext } = await import('../src/config/project-context.ts');
      const capturedProject = loadProjectSetContext(values.project_root, config, config.repository.repository_id, [
        pathProject.project_id,
      ]);
      const capturedOwner = ledger.hostState.readHostStateSnapshot({
        repository_id: capturedProject.repository_id,
        project_ids: capturedProject.project_ids,
        integrations_digest: capturedProject.integrations_digest,
        work_id: context.work_id,
      });
      if (capturedOwner.ledger?.operations.some((operation) => isCompletedReadonlyRelease(operation, context.work_id)))
        fail(
          'GAP-VIDA-RUN-EXECUTION-001',
          'Captured native completion remains normalization pending; ordinary execution cannot accept it.',
        );
      const { readAdmittedSessionExecutionContext } =
        await import('../src/orchestration/admitted-session-execution.ts');
      const { buildObservedResearchResult } = await import('../src/orchestration/observed-research-result.ts');
      const { admittedResearchResultsForSynthesis, buildObservedSynthesisResult } =
        await import('../src/orchestration/observed-synthesis-result.ts');
      const { currentObservedResearchBinding } = await import('../src/orchestration/observed-research-binding.ts');
      const { commitObservedResearchArtifact } = await import('../src/orchestration/observed-research-artifact.ts');
      const { prepareObservedResearchRecord, recordObservedResearchResultAsync, validateResearchResult } =
        await import('../src/research-decision.ts');
      const execution = readAdmittedSessionExecutionContext(
        values.project_root,
        ledger.hostState,
        pathProject.project_id,
        context.work_id,
      );
      const researchWorkItem = workflowWorkItemSchema.parse(execution.workItem);
      const access = requireSafeRepositoryAccess(values.project_root);
      for (const original of researchItems) {
        const item = currentJournal.state.items.find((entry) => entry.request.action_id === original.request.action_id);
        if (!item?.observation || !item.issue_id || !item.research_activation)
          fail('GAP-VIDA-RUN-EXECUTION-001', 'Observed research action lacks issued activation.');
        const host = ledger.hostState.readHostStateSnapshot(execution.identity);
        requireRunValue(host.work, 'Observed research work is missing.');
        const researchWork = host.work;
        const selectedStage = selectedWorkflow.stages.find((stage) => stage.id === item.request.stage_id);
        const admittedPlan = item.research_normalization;
        const artifactSchema = selectedStage?.produces.includes('ResearchSynthesis/v1')
          ? 'ResearchSynthesis/v1'
          : 'ResearchResult/v1';
        const admittedArtifact =
          admittedPlan &&
          researchWork.artifacts.find(
            (artifact) =>
              artifact.schema === artifactSchema &&
              artifact.path === admittedPlan.record_path &&
              artifact.sha256 === admittedPlan.record_sha256 &&
              artifact.stage_id === item.request.stage_id,
          );
        if (admittedArtifact) {
          const bytes = access.readBytes(admittedArtifact.path, 'admitted research replay');
          if (
            createHash('sha256').update(bytes).digest('hex') !== admittedArtifact.sha256 ||
            (artifactSchema === 'ResearchResult/v1'
              ? validateResearchResult(JSON.parse(bytes.toString('utf8'))).digest
              : (await import('../src/research-decision.ts')).validateResearchSynthesis(
                  JSON.parse(bytes.toString('utf8')),
                ).digest) !== admittedPlan.result_digest
          )
            fail('GAP-VIDA-RUN-EXECUTION-001', 'Admitted research record changed after normalization.');
          continue;
        }
        const base = {
          config,
          observation: item.observation,
          request: item.request,
          issueId: item.issue_id,
          activationUse: item.research_activation.use,
          work: researchWork,
          scopeBytes: access.readBytes(researchWork.contracts.scope.path, 'research accepted scope'),
          acceptanceBytes: access.readBytes(researchWork.contracts.acceptance.path, 'research accepted acceptance'),
          workItem: researchWorkItem,
        };
        const result =
          artifactSchema === 'ResearchSynthesis/v1'
            ? buildObservedSynthesisResult({
                ...base,
                researchResults: admittedResearchResultsForSynthesis({
                  repositoryRoot: values.project_root,
                  config,
                  journal: currentJournal,
                  work: researchWork,
                  workflowId: values.workflow,
                }),
              })
            : buildObservedResearchResult(base);
        const current = () =>
          currentObservedResearchBinding({
            repositoryRoot: values.project_root,
            ledger,
            identity: execution.identity,
            workId: context.work_id,
            attempt: context.attempt,
            actionId: item.request.action_id,
          });
        const binding = current();
        let plan = item.research_normalization;
        if (!plan) {
          plan = await prepareObservedResearchRecord({
            root: values.project_root,
            result,
            observation: item.observation,
            binding,
            host_state: ledger.hostState,
            readCurrent: current,
          });
          currentJournal = ledger.reserveResearchNormalization(
            context.work_id,
            context.attempt,
            currentJournal.version,
            item.request.action_id,
            plan,
          );
          plan = currentJournal.state.items.find(
            (entry) => entry.request.action_id === item.request.action_id,
          )?.research_normalization;
        }
        if (!plan) fail('GAP-VIDA-RUN-EXECUTION-001', 'Research normalization reservation is missing.');
        await recordObservedResearchResultAsync({
          root: values.project_root,
          result,
          observation: item.observation,
          binding,
          host_state: ledger.hostState,
          readCurrent: current,
          plan,
        });
        await commitObservedResearchArtifact({
          repositoryRoot: values.project_root,
          ledger,
          identity: execution.identity,
          workId: context.work_id,
          attempt: context.attempt,
          actionId: item.request.action_id,
          result,
        });
      }
      return currentJournal;
    };
    /** @param {import('../src/orchestration/persistent-session-handoff.ts').MastraSessionLedgerSnapshot} currentJournal */
    const unresolvedHostEffect = async (
      currentJournal: import('../src/orchestration/persistent-session-handoff.ts').MastraSessionLedgerSnapshot,
    ) => {
      if (currentJournal.resume_status !== 'ready') return null;
      const selectedWorkflow = activeWorkflow;
      requireRunValue(selectedWorkflow, 'Configured workflow is unavailable for Host reconciliation.');
      const writers = currentJournal.state.items.filter((item) => {
        if (item.issue_id !== null) return false;
        return selectedWorkflow.stages.some((stage) => {
          const assignment = stage.assignments[item.request.assignment_index];
          return (
            stage.id === item.request.stage_id &&
            assignment?.profile !== undefined &&
            config.agents.profiles[assignment.profile]?.mutation_scope === 'repository_source'
          );
        });
      });
      if (writers.length === 0) return null;
      const { readAdmittedSessionExecutionContext } =
        await import('../src/orchestration/admitted-session-execution.ts');
      const execution = readAdmittedSessionExecutionContext(
        values.project_root,
        ledger.hostState,
        pathProject.project_id,
        context.work_id,
      );
      const host = ledger.hostState.readHostStateSnapshot(execution.identity);
      for (const item of writers) {
        const previous = host.work?.execution.assignment_attempts.findLast(
          (attempt) =>
            attempt.stage_id === item.request.stage_id &&
            attempt.assignment_index === item.request.assignment_index &&
            attempt.correction_generation === (currentJournal.state.corrective_execution?.correction_generation ?? 0),
        );
        if (
          previous &&
          (previous.status !== 'no_effect' ||
            canonicalJsonDigest(previous.reconciliation?.retry_lease) !== canonicalJsonDigest(host.work?.lease))
        )
          return {
            action_id: item.request.action_id,
            stage_id: item.request.stage_id,
            attempt_id: previous.attempt_id,
            attempt_status: previous.status,
            reason:
              previous.status === 'no_effect'
                ? 'no-effect was recorded but the exact retry lease has not been installed'
                : 'host attempt exists without a session issue; inspect native dispatch and reconcile before retry',
          };
      }
      return null;
    };
    try {
      if ((values.issue_wave || values.report) && !values.intake) {
        const paused = ledger.resume(context.work_id, context.attempt);
        const replacement = paused?.state.items.find((item) =>
          ledger.preparedReadOnlyReplacement(context.work_id, context.attempt, item.request.action_id),
        );
        const replacementPlan =
          replacement &&
          ledger.preparedReadOnlyReplacement(context.work_id, context.attempt, replacement.request.action_id);
        const replacementReport = values.report
          ? parseSessionBridgeObservation(readBoundedReport(values.report))
          : null;
        const activeReplacement =
          replacementReport &&
          paused?.state.items.find(
            (item) =>
              ledger.replacementDispatch(context.work_id, context.attempt, item.request.action_id)
                ?.dispatch_action_id === replacementReport.action_id,
          );
        const issuedReplacement = values.issue_wave
          ? paused?.state.items.find(
              (item) =>
                ledger.replacementDispatch(context.work_id, context.attempt, item.request.action_id) &&
                item.observation === null,
            )
          : undefined;
        if (paused && (replacement || activeReplacement || issuedReplacement)) {
          if (
            paused.version.revision !== Number(values.expected_revision) ||
            paused.version.digest !== values.expected_digest
          )
            fail('GAP-VIDA-RUN-CONTEXT-001', 'Replacement research journal version is stale.');
          const { loadProjectSetContext } = await import('../src/config/project-context.ts');
          const project = loadProjectSetContext(
            values.project_root,
            config,
            config.repository.repository_id,
            values.projects,
          );
          const identity = {
            repository_id: project.repository_id,
            project_ids: project.project_ids,
            integrations_digest: project.integrations_digest,
            work_id: context.work_id,
          };
          const ownerSnapshot = ledger.hostState.readHostStateSnapshot(identity);
          const owner = ownerSnapshot.work;
          const currentReplacement = replacement ?? activeReplacement ?? issuedReplacement;
          if (!currentReplacement) fail('GAP-VIDA-RUN-EXECUTION-001', 'Paused replacement action is missing.');
          const currentRequest = currentReplacement.request;
          const stored = paused.state.source_scope;
          const fresh =
            stored &&
            snapshotDeclaredSources(
              requireSafeRepositoryAccess(values.project_root),
              stored.entries.map((entry) => entry.path),
            );
          if (
            !owner ||
            (activeReplacement
              ? !owner.lease || owner.execution.status !== 'active'
              : !(
                  (owner.lease === null && owner.execution.status === 'suspended') ||
                  (issuedReplacement && owner.lease && owner.execution.status === 'active')
                )) ||
            owner.binding.workflow_id !== values.workflow ||
            owner.binding.team_id !== values.team ||
            owner.binding.work_source_revision !== stored?.digest ||
            stored?.digest !== fresh?.digest ||
            currentRequest.scope_digest !== values.scope_digest ||
            currentRequest.config_digest !== configDigest
          )
            fail('GAP-VIDA-RUN-CONTEXT-001', 'Paused replacement research binding changed.');
          const { assertAdmittedRuntimeCodeCurrent } =
            await import('../src/orchestration/admitted-session-execution.ts');
          try {
            assertAdmittedRuntimeCodeCurrent(values.project_root, ledger.hostState, identity);
          } catch {
            fail(
              'GAP-VIDA-RUN-CONTEXT-001',
              'Admitted runtime code changed; an exact forward-bound rebind is required before issue.',
            );
          }
          requireConfiguredContext(currentRequest);
          if (activeReplacement && replacementReport) {
            const { researchObservationOutputContract } =
              await import('../src/orchestration/observed-research-result.ts');
            /** @type {unknown} */
            let output: unknown;
            try {
              output = parseJsonUnknown(replacementReport.summary);
            } catch {
              fail('GAP-VIDA-RUN-REPORT-001', 'Replacement research summary must be structured JSON.');
            }
            /** @type {unknown} */
            const parsedOutput: unknown = output;
            const required = researchObservationOutputContract.required_fields;
            if (
              !isRecord(parsedOutput) ||
              parsedOutput.schema !== researchObservationOutputContract.summary_json_schema ||
              Object.keys(parsedOutput).length !== required.length ||
              required.some((key) => !Object.hasOwn(parsedOutput, key)) ||
              !Array.isArray(parsedOutput.source_refs) ||
              !parsedOutput.source_refs.every(isResearchSourceReference) ||
              canonicalJsonDigest(parsedOutput.source_refs.map((entry) => entry.source_id).sort()) !==
                canonicalJsonDigest([...replacementReport.evidence_refs].sort()) ||
              !isStringArray(parsedOutput.ac_ids) ||
              canonicalJsonDigest([...parsedOutput.ac_ids].sort()) !==
                canonicalJsonDigest([...owner.binding.ac_ids].sort())
            )
              fail('GAP-VIDA-RUN-REPORT-001', 'Replacement research output differs from required scope.');
            const { readAdmittedSessionExecutionContext } =
              await import('../src/orchestration/admitted-session-execution.ts');
            const { buildObservedResearchResult } = await import('../src/orchestration/observed-research-result.ts');
            const execution = readAdmittedSessionExecutionContext(
              values.project_root,
              ledger.hostState,
              pathProject.project_id,
              context.work_id,
            );
            const currentItem = paused.state.items.find(
              (item) => item.request.action_id === activeReplacement.request.action_id,
            );
            if (!currentItem?.research_activation || !currentItem.issue_id)
              fail('GAP-VIDA-RUN-REPORT-001', 'Replacement research activation is missing.');
            const access = requireSafeRepositoryAccess(values.project_root);
            const replacementWorkItem = workflowWorkItemSchema.parse(execution.workItem);
            buildObservedResearchResult({
              config,
              observation: { ...replacementReport, action_id: currentItem.request.action_id },
              request: currentItem.request,
              issueId: currentItem.issue_id,
              activationUse: currentItem.research_activation.use,
              work: owner,
              scopeBytes: access.readBytes(owner.contracts.scope.path, 'research accepted scope'),
              acceptanceBytes: access.readBytes(owner.contracts.acceptance.path, 'research accepted acceptance'),
              workItem: replacementWorkItem,
            });
            const observed = ledger.reportReadOnlyReplacement(
              context.work_id,
              context.attempt,
              paused.version,
              replacementReport,
              stored,
            );
            const normalized = await normalizeObservedResearch(observed);
            return {
              schema: 'VidaAgentRunResult/v1',
              status: 'replacement_observed',
              workflow: values.workflow,
              mastra_run_id: normalized.state.run_id,
              mastra_step_id: normalized.state.step_id,
              resume_status: normalized.resume_status,
              state_version: normalized.version,
              prior_issue_outcome: 'unknown',
              issued_actions: [],
              next_actions: [],
            };
          }
          const activated = replacement
            ? ledger.activateReadOnlyReplacement(
                context.work_id,
                context.attempt,
                paused.version,
                replacement.request.action_id,
              )
            : {
                snapshot: paused,
                dispatch: ledger.replacementDispatch(
                  context.work_id,
                  context.attempt,
                  currentReplacement.request.action_id,
                ),
              };
          const { resumePausedLocalWork } = await import('../src/orchestration/resume-paused-local-work.ts');
          const nativeHandle =
            replacementPlan?.native_session_handle ??
            ledger.replacementNativeHandle(context.work_id, context.attempt, currentReplacement.request.action_id);
          if (!nativeHandle || !ownerSnapshot.workVersion || !ownerSnapshot.ledgerVersion || !stored || !owner)
            fail('GAP-VIDA-RUN-CONTEXT-001', 'Paused replacement lease context is incomplete.');
          if (owner.lease === null) {
            const resumed = resumePausedLocalWork({
              store: ledger.hostState,
              ledger,
              identity,
              attempt: context.attempt,
              expectedWork: ownerSnapshot.workVersion,
              expectedLedger: ownerSnapshot.ledgerVersion,
              expectedJournal: activated.snapshot.version,
              nativeSessionHandle: nativeHandle,
              configDigest,
              sourceDigest: stored.digest,
            });
            if (resumed.status !== 'resumed')
              fail('GAP-VIDA-RUN-CONTEXT-001', 'Paused replacement lease needs current-state inspection.');
          } else if (owner.lease.thread_id !== nativeHandle) {
            fail('GAP-VIDA-RUN-CONTEXT-001', 'Replacement lease belongs to another native owner.');
          }
          if (!activated.dispatch) fail('GAP-VIDA-RUN-EXECUTION-001', 'Paused replacement dispatch is missing.');
          const { readAdmittedSessionExecutionContext } =
            await import('../src/orchestration/admitted-session-execution.ts');
          const { issueObservedResearchActivation } =
            await import('../src/orchestration/observed-research-activation.ts');
          const execution = readAdmittedSessionExecutionContext(
            values.project_root,
            ledger.hostState,
            pathProject.project_id,
            context.work_id,
          );
          const research = await issueObservedResearchActivation({
            repositoryRoot: values.project_root,
            config,
            ledger,
            identity: execution.identity,
            journal: activated.snapshot,
            actionId: currentRequest.action_id,
          });
          const { researchObservationOutputContract } =
            await import('../src/orchestration/observed-research-result.ts');
          return {
            schema: 'VidaAgentRunResult/v1',
            status: issuedReplacement ? 'wave_retrieved' : 'wave_issued',
            workflow: values.workflow,
            mastra_run_id: research.journal.state.run_id,
            mastra_step_id: research.journal.state.step_id,
            resume_status: research.journal.resume_status,
            state_version: research.journal.version,
            prior_issue_outcome: 'unknown',
            issued_actions: [
              {
                request: { ...currentRequest, action_id: activated.dispatch.dispatch_action_id },
                issue_id: activated.dispatch.issue_id,
                logical_action_id: currentRequest.action_id,
                instruction_activation: research.journal.state.items.find(
                  (item) => item.request.action_id === currentRequest.action_id,
                )?.research_activation?.use,
                instruction_bindings: research.bindings,
                research_output_contract: researchObservationOutputContract,
              },
            ],
            next_actions: [],
          };
        }
      }
      let admittedSource = null;
      if (values.intake) {
        const { z } = await import('zod');
        const intake = admissionIntake;
        requireRunValue(intake, 'Requested local session intake is unavailable.');
        if (values.continuation) {
          const stateVersion = z
            .object({
              revision: z.number().int().positive(),
              digest: z.string().regex(/^[a-f0-9]{64}$/),
            })
            .strict();
          const continuationSchema = z
            .object({
              schema: z.literal('VidaLocalContinuation/v1'),
              predecessor_work_id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,127}$/),
              predecessor_attempt: z.number().int().positive(),
              predecessor_journal: stateVersion,
              expected_work: stateVersion,
              expected_ledger: stateVersion,
              native_session_handle: z.string().min(1).max(256),
              user_request_pointer: z.string().min(1).max(2048),
              request_intent: z.enum(['linked_correction', 'next_work']),
            })
            .strict();
          let continuation;
          try {
            continuation = continuationSchema.parse(readBoundedReport(values.continuation));
          } catch {
            fail('GAP-VIDA-RUN-CONTEXT-001', 'The continuation request is invalid.');
          }
          if (
            continuation.predecessor_work_id === context.work_id ||
            continuation.native_session_handle !== intake.native_session_handle
          )
            fail('GAP-VIDA-RUN-CONTEXT-001', 'Continuation identity differs from the new task.');
          const predecessor = ledger.resume(continuation.predecessor_work_id, continuation.predecessor_attempt);
          if (
            !predecessor ||
            canonicalJsonDigest(predecessor.version) !== canonicalJsonDigest(continuation.predecessor_journal)
          )
            fail('GAP-VIDA-RUN-CONTEXT-001', 'Predecessor journal changed or is missing.');
          const { loadProjectSetContext } = await import('../src/config/project-context.ts');
          const project = loadProjectSetContext(values.project_root, config, config.repository.repository_id, [
            pathProject.project_id,
          ]);
          const identity = {
            repository_id: project.repository_id,
            project_ids: project.project_ids,
            integrations_digest: project.integrations_digest,
            work_id: continuation.predecessor_work_id,
          };
          const priorHost = ledger.hostState.readHostStateSnapshot(identity);
          if (
            !priorHost.work ||
            priorHost.work.binding.config_digest !== configDigest ||
            priorHost.work.binding.project_ids.length !== 1 ||
            priorHost.work.binding.project_ids[0] !== pathProject.project_id
          )
            fail('GAP-VIDA-RUN-CONTEXT-001', 'Predecessor project or runtime configuration changed.');
          const { suspendLocalWork } = await import('../src/orchestration/suspend-local-work.ts');
          suspendLocalWork({
            config,
            store: ledger.hostState,
            identity,
            journal: predecessor,
            expectedWork: continuation.expected_work,
            expectedLedger: continuation.expected_ledger,
            nativeSessionHandle: continuation.native_session_handle,
            userRequestPointer: continuation.user_request_pointer,
            requestIntent: continuation.request_intent,
            documentationContext: {
              repository_root: values.project_root,
              repository_id: identity.repository_id,
              project_id: pathProject.project_id,
              work_id: continuation.predecessor_work_id,
            },
          });
        }
        const { admitLocalSessionWork } = await import('../src/orchestration/local-work-admission.ts');
        admittedSource = admitLocalSessionWork({
          repositoryRoot: values.project_root,
          config,
          store: ledger.hostState,
          selection,
          context,
          nativeSessionHandle: intake.native_session_handle,
          workItem: intake.work_item,
          scopePath: intake.scope_path,
          acceptancePath: intake.acceptance_path,
          ...(intake.source_authorization_path !== undefined
            ? { sourceAuthorizationPath: intake.source_authorization_path }
            : {}),
          intakePath: path.relative(values.project_root, values.intake).split(path.sep).join('/'),
          runtimeCodePaths: intake.runtime_code_paths,
          route: intake.route,
          risk: intake.risk,
          changeKind: intake.change_kind,
        }).source;
      }
      const currentJournal = ledger.resume(context.work_id, context.attempt);
      const storedScope = currentJournal?.state.source_scope;
      const scopePaths =
        values.scope_paths.length > 0
          ? values.scope_paths
          : (admittedSource?.entries.map((entry) => entry.path) ??
            storedScope?.entries.map((entry) => entry.path) ??
            []);
      const workflowHost = ledger.hostState.readHostStateSnapshot(admissionIdentity);
      const workflowWork = workflowHost.work;
      requireRunValue(workflowWork, 'Current admitted Work is unavailable for workflow execution.');
      if (!isLifecycleRisk(workflowWork.lifecycle.risk))
        fail('GAP-VIDA-RUN-CONTEXT-001', 'Current admitted Work lifecycle risk is unavailable.');
      const lifecycleRisk = workflowWork.lifecycle.risk;
      const scopeHost = scopePaths.length > 0 ? workflowHost : null;
      const sourceSnapshot =
        scopePaths.length > 0
          ? scopeHost?.work
            ? snapshotAdmittedTaskSources({
                store: ledger.hostState,
                host: scopeHost,
                canonicalHostRoot: values.project_root,
                paths: scopePaths,
                attempt: context.attempt,
              })
            : snapshotDeclaredSources(requireSafeRepositoryAccess(values.project_root), scopePaths)
          : null;
      if (admittedSource && sourceSnapshot?.digest !== admittedSource.digest)
        fail('GAP-VIDA-RUN-CONTEXT-001', 'Accepted source scope changed before workflow start.');
      const configuredView = ledger.hostState.readConfiguredFrontierRecoveryView(admissionIdentity, context.attempt);
      const configuredContinuation = configuredView?.original ?? null;
      const initialSourceContinuation = ledger.hostState.readInitialSourceContinuationReceipt(
        admissionIdentity,
        context.attempt,
      );
      const initialSourceFrontierCodeRebind = initialSourceContinuation
        ? ledger.hostState.readInitialSourceFrontierCodeRebindReceipt(
            admissionIdentity,
            context.attempt,
            initialSourceContinuation.continuation_id,
          )
        : null;
      const completedSourceReportRecovery = initialSourceContinuation
        ? ledger.hostState.readCompletedSourceReportRecoveryReceipt(admissionIdentity, context.attempt)
        : null;
      if (configuredContinuation && initialSourceContinuation)
        fail('GAP-VIDA-RUN-CONTEXT-001', 'Multiple Host producer continuation receipts are ambiguous.');
      const pendingInitialSourceWriteReport = (() => {
        if (!initialSourceContinuation || !values.report || !storedScope || !sourceSnapshot) return false;
        const currentWork = workflowHost.work;
        if (!currentWork) return false;
        try {
          const observed = parseSessionBridgeObservation(readBoundedReport(values.report));
          const pending =
            currentJournal?.state.items.filter((item) => item.issue_id !== null && item.observation === null) ?? [];
          if (pending.length !== 1) return false;
          const item = pending[0];
          if (!item) return false;
          const changedPaths = compareScopedSourceSnapshots(storedScope, sourceSnapshot)
            .map((change) => change.path)
            .sort();
          return (
            item.host_reservation?.approvalAction === 'source.write' &&
            observed.status === 'reported_complete' &&
            item.request.action_id === observed.action_id &&
            item.issue_id === observed.issue_id &&
            item.host_reservation.receipt.attempt.attempt_id === observed.host_attempt_id &&
            item.request.workflow_id === values.workflow &&
            item.request.run_id === currentWork.execution.run_id &&
            item.request.config_digest === configDigest &&
            item.request.scope_digest === initialSourceContinuation.request.currentSourceScope.digest &&
            storedScope.digest === initialSourceContinuation.request.currentSourceScope.digest &&
            changedPaths.length > 0 &&
            Array.isArray(observed.changed_paths) &&
            canonicalJsonDigest(changedPaths) === canonicalJsonDigest([...observed.changed_paths].sort()) &&
            changedPaths.every((file) => currentWork.lifecycle.scope.implementation_paths.includes(file))
          );
        } catch {
          return false;
        }
      })();
      if (
        initialSourceContinuation &&
        sourceSnapshot?.digest !== initialSourceContinuation.request.currentSourceScope.digest &&
        sourceSnapshot?.digest !== currentJournal?.state.source_scope?.digest &&
        !pendingInitialSourceWriteReport
      )
        fail(
          'GAP-VIDA-RUN-CONTEXT-001',
          'Initial Source continuation does not match the current scoped Source snapshot.',
        );
      const bridgeCorrection = ledger.resume(context.work_id, context.attempt)?.state.corrective_execution;
      if (configuredContinuation && !configuredView)
        fail('GAP-VIDA-RUN-CONTEXT-001', 'Configured frontier recovery view is unavailable.');
      const bridgeArgs = {
        ledger,
        projectIds: admissionProject.project_ids,
        repositoryRoot: values.project_root,
        config,
        selection,
        context,
        workflowId: values.workflow,
        workspaceId: initialization.workspace_id,
        lifecycleRisk,
        ...(bridgeCorrection ? { correctiveExecution: bridgeCorrection } : {}),
        ...(configuredContinuation
          ? { configuredFrontier: { identity: admissionIdentity, attempt: context.attempt } }
          : {}),
        ...(initialSourceContinuation
          ? { initialSourceContinuation: { identity: admissionIdentity, attempt: context.attempt } }
          : {}),
      };
      /** @returns {Promise<RunSessionBridge>} */
      const openBridge = async () => (bridge ??= await MastraSessionBridge.open(bridgeArgs));
      const {
        readSessionEngineSnapshot,
        readConfiguredContinuationSessionEngineSnapshot,
        readInitialSourceContinuationSessionEngineSnapshot,
      } = await import('../src/orchestration/session-engine-snapshot.ts');
      const expectedRunId =
        initialSourceContinuation?.prior_work.execution.run_id ??
        configuredContinuation?.prior_work.execution.run_id ??
        bridgeArgs.correctiveExecution?.engine_run_id ??
        sessionBridgeRunId(initialization.workspace_id, context, values.workflow);
      const persistedJournal = currentJournal;
      const configuredViewForEngine = configuredContinuation
        ? requireRunData(configuredView, 'Configured frontier recovery view is unavailable.')
        : undefined;
      if (persistedJournal && persistedJournal.state.run_id !== expectedRunId)
        fail('GAP-VIDA-RUN-CONTEXT-001', 'The persisted attempt differs from the current launcher context.');
      if (initialSourceContinuation) {
        if (
          !workflowHost.work ||
          !persistedJournal ||
          context.scope_digest !== initialSourceContinuation.request.currentSourceScope.digest
        )
          fail('GAP-VIDA-RUN-CONTEXT-001', 'Initial Source receipt no longer binds the active Work and Journal.');
        const { validateInitialSourceContinuationLineage } =
          await import('../src/orchestration/admitted-development-packet.ts');
        validateInitialSourceContinuationLineage(
          workflowHost.work,
          initialSourceContinuation,
          persistedJournal.state,
          initialSourceFrontierCodeRebind,
          completedSourceReportRecovery,
          workflowHost.runtimeCodeContinuations,
        );
      }
      const engineBinding = { ...bridgeArgs, runId: expectedRunId };
      let workflowSnapshot = configuredContinuation
        ? readConfiguredContinuationSessionEngineSnapshot(
            engineBinding,
            configuredContinuation,
            requireRunData(configuredViewForEngine, 'Configured frontier recovery view is unavailable.').recovery,
            requireRunData(configuredViewForEngine, 'Configured frontier recovery view is unavailable.')
              .runtimeCodeContinuations,
          )
        : initialSourceContinuation
          ? readInitialSourceContinuationSessionEngineSnapshot(
              engineBinding,
              initialSourceContinuation,
              requireRunData(persistedJournal, 'Initial Source continuation journal is unavailable.'),
              workflowHost,
              initialSourceFrontierCodeRebind,
              completedSourceReportRecovery,
            )
          : readSessionEngineSnapshot(engineBinding);
      const created = !workflowSnapshot;
      if (initialSourceContinuation && !workflowSnapshot)
        fail('GAP-VIDA-RUN-CONTEXT-001', 'The receipt-bound retained Mastra run is missing.');
      if (!workflowSnapshot) {
        if (values.issue_wave || values.report || values.reconcile)
          fail('GAP-VIDA-RUN-CONTEXT-001', 'The Mastra run has not been prepared.');
        workflowSnapshot = requireRunData(
          await (await openBridge()).start(sourceSnapshot),
          'Prepared Mastra snapshot is unavailable.',
        );
      }
      if (!workflowSnapshot) fail('GAP-VIDA-RUN-CONTEXT-001', 'The prepared Mastra snapshot is unavailable.');
      const pendingSourceEffect = ledger
        .resume(context.work_id, context.attempt)
        ?.state.items.some((item) => item.host_reservation && item.issue_id && item.observation === null);
      const retainedSource =
        pendingSourceEffect && storedScope?.digest !== sourceSnapshot?.digest ? storedScope : sourceSnapshot;
      let journal = requireRunData(
        ledger.resume(context.work_id, context.attempt),
        'Current producer journal is unavailable.',
      );
      if (!journal || (journal.state.source_scope && journal.state.source_scope.digest !== retainedSource?.digest))
        fail('GAP-VIDA-RUN-CONTEXT-001', 'Current producer journal source differs from the prepared scope.');
      let reconciliationRequired = await unresolvedHostEffect(journal);
      let status = created ? 'prepared' : 'resumed';
      /** @type {RunIssuedAction[]} */
      let issuedActions: RunIssuedAction[] = [];
      let issuedEvidence: Awaited<ReturnType<typeof admittedEvidence>> | null = null;
      /** @type {ReturnType<typeof import('../src/orchestration/observed-validation.ts').issueObservedValidationReceipt>[]} */
      let validationReceipts: ReturnType<
        typeof import('../src/orchestration/observed-validation.ts').issueObservedValidationReceipt
      >[] = [];
      let testerInstruction = null;
      let testReceipt = null;
      let testEvidence = null;
      let deliveryInstruction = null;
      if (values.issue_wave || values.report || values.reconcile) {
        if (
          journal.version.revision !== Number(values.expected_revision) ||
          journal.version.digest !== values.expected_digest
        )
          fail('GAP-VIDA-RUN-CONTEXT-001', 'The Mastra session ledger version is stale.');
        if (values.reconcile) {
          if (!reconciliationRequired || !sourceSnapshot)
            fail('GAP-VIDA-RUN-EXECUTION-001', 'No unissued native host attempt is eligible for reconciliation.');
          const { readAdmittedSessionExecutionContext } =
            await import('../src/orchestration/admitted-session-execution.ts');
          const { reconcileUnissuedLocalSessionAction } =
            await import('../src/orchestration/local-session-reconciliation.ts');
          const execution = readAdmittedSessionExecutionContext(
            values.project_root,
            ledger.hostState,
            pathProject.project_id,
            context.work_id,
          );
          const relativeProof = path.relative(values.project_root, values.reconcile).split(path.sep).join('/');
          await reconcileUnissuedLocalSessionAction({
            root: values.project_root,
            proofPath: relativeProof,
            store: ledger.hostState,
            identity: execution.identity,
            journal,
            configDigest,
          });
          reconciliationRequired = await unresolvedHostEffect(journal);
          status = 'reconciled';
        } else if (values.issue_wave && journal.resume_status !== 'ready_to_resume') {
          if (initialSourceContinuation && journal.state.items.some(isIssuedWithoutObservation))
            fail(
              'GAP-VIDA-RUN-EXECUTION-001',
              'Initial Source continuation has an issued action with unknown outcome; automatic reissue is forbidden.',
            );
          if (reconciliationRequired)
            fail('GAP-VIDA-RUN-EXECUTION-001', 'Native host attempt requires explicit reconciliation before issue.');
          const { loadProjectSetContext } = await import('../src/config/project-context.ts');
          const { assertAdmittedRuntimeCodeCurrent } =
            await import('../src/orchestration/admitted-session-execution.ts');
          const project = loadProjectSetContext(
            values.project_root,
            config,
            config.repository.repository_id,
            values.projects,
          );
          try {
            assertAdmittedRuntimeCodeCurrent(values.project_root, ledger.hostState, {
              repository_id: project.repository_id,
              project_ids: project.project_ids,
              integrations_digest: project.integrations_digest,
              work_id: context.work_id,
            });
          } catch {
            fail(
              'GAP-VIDA-RUN-CONTEXT-001',
              'Admitted runtime code changed; an exact forward-bound rebind is required before issue.',
            );
          }
          for (const request of workflowSnapshot.requests) requireConfiguredContext(request);
          const issueKinds = new Set(
            workflowSnapshot.requests.map(
              (request) => activeWorkflow.stages.find((stage) => stage.id === request.stage_id)?.kind,
            ),
          );
          const issuedStages = workflowSnapshot.requests.map((request) =>
            activeWorkflow.stages.find((stage) => stage.id === request.stage_id),
          );
          const researchItems = journal.state.items.filter((item) => {
            const stage = config.workflows[item.request.workflow_id]?.stages.find(
              (candidate) => candidate.id === item.request.stage_id,
            );
            return stage?.produces.includes('ResearchResult/v1') || stage?.produces.includes('ResearchSynthesis/v1');
          });
          const hasIssuedResearchWave =
            researchItems.length > 0 && journal.state.items.some((item) => item.issue_id !== null);
          if (issueKinds.has('develop')) {
            const developerRequest = workflowSnapshot.requests.find(
              (request) => activeWorkflow.stages.find((stage) => stage.id === request.stage_id)?.kind === 'develop',
            );
            issuedEvidence = await admittedEvidence(journal, false, developerRequest);
          }
          if (!issuedEvidence && issuedStages.some(isPacketOnlyDevelopmentStage))
            issuedEvidence = await admittedEvidence(journal, false);
          if (issuedStages.some((stage) => stage?.consumes.includes('ImplementationResult/v1'))) {
            const implementationEvidence = await admittedEvidence(journal);
            requireRunValue(implementationEvidence.implementationResult, 'Implementation authority is unavailable.');
            requireRunValue(implementationEvidence.authority, 'Delivery evidence authority is unavailable.');
            issuedEvidence = implementationEvidence;
            if (
              issueKinds.has('deliver') ||
              issuedStages.some((stage) => stage?.kind === 'test' && stage.consumes.includes('ValidationReceipt/v1'))
            )
              validationReceipts = await completedValidationReceipts(journal, issuedEvidence);
            if (issueKinds.has('test')) {
              const { buildObservedTesterInstruction } = await import('../src/orchestration/observed-testing.ts');
              testerInstruction = buildObservedTesterInstruction(
                issuedEvidence.packet,
                implementationEvidence.implementationResult,
              );
            }
            if (issueKinds.has('deliver')) {
              const { issueObservedTestReceipt } = await import('../src/orchestration/observed-testing.ts');
              ({
                instruction: testerInstruction,
                receipt: testReceipt,
                evidence: testEvidence,
              } = issueObservedTestReceipt({
                repositoryRoot: values.project_root,
                config,
                packet: issuedEvidence.packet,
                implementationResult: implementationEvidence.implementationResult,
                journal,
                authority: implementationEvidence.authority,
                host: implementationEvidence.host,
                sourceStore: ledger.hostState,
              }));
              if (testReceipt.status !== 'pass')
                fail('GAP-VIDA-RUN-EXECUTION-001', 'Configured tester receipt is not passing.');
            }
          }
          /** @type {Map<string, readonly import('../src/research-decision.ts').InstructionBinding[]>} */
          const researchBindings: Map<string, readonly import('../src/research-decision.ts').InstructionBinding[]> =
            new Map();
          if (hasIssuedResearchWave) {
            if (journal.state.research_wave_exposure === 'possible')
              fail(
                'GAP-VIDA-RUN-EXECUTION-001',
                'Research batch exposure may already have occurred; report or reconcile the existing issue before any retry.',
              );
            if (journal.state.research_wave_exposure === undefined)
              journal = ledger.beginLegacyResearchPreparationRecovery(
                context.work_id,
                context.attempt,
                journal.version,
              );
            if (
              journal.state.research_wave_exposure !== 'preparing' ||
              journal.state.items.some(isResearchPreparationUnsafe)
            )
              fail('GAP-VIDA-RUN-EXECUTION-001', 'Research preparation is not safely resumable for the current wave.');
            const { readAdmittedSessionExecutionContext } =
              await import('../src/orchestration/admitted-session-execution.ts');
            const { currentObservedResearchBinding } =
              await import('../src/orchestration/observed-research-binding.ts');
            const { applyInstructionActivationUseWriteAsync } = await import('../src/research-decision.ts');
            const execution = readAdmittedSessionExecutionContext(
              values.project_root,
              ledger.hostState,
              pathProject.project_id,
              context.work_id,
            );
            for (const item of journal.state.items.filter((entry) =>
              researchItems.some((candidate) => candidate.request.action_id === entry.request.action_id),
            )) {
              if (item.research_activation) {
                const bindingInput = {
                  repositoryRoot: values.project_root,
                  ledger,
                  identity: execution.identity,
                  workId: context.work_id,
                  attempt: context.attempt,
                  actionId: item.request.action_id,
                };
                const binding = currentObservedResearchBinding(bindingInput);
                await applyInstructionActivationUseWriteAsync({
                  root: values.project_root,
                  use: item.research_activation.use,
                  plan: item.research_activation.plan,
                  binding,
                  host_state: ledger.hostState,
                  readCurrent: () => currentObservedResearchBinding(bindingInput),
                });
              }
              const { issueObservedResearchActivation } =
                await import('../src/orchestration/observed-research-activation.ts');
              const activated = await issueObservedResearchActivation({
                repositoryRoot: values.project_root,
                config,
                ledger,
                identity: execution.identity,
                journal,
                actionId: item.request.action_id,
              });
              journal = activated.journal;
              researchBindings.set(item.request.action_id, activated.bindings);
            }
            status = 'wave_recovered';
            issuedActions = journal.state.items.map((item) =>
              describeIssuedAction(item, researchBindings, activeWorkflow.stages),
            );
          } else {
            const waveIndex = workflowSnapshot.requests[0]?.wave_index;
            const waveActions =
              waveIndex === undefined
                ? []
                : sessionActionsForWave(
                    config,
                    selection,
                    context,
                    values.workflow,
                    waveIndex,
                    [],
                    journal.state.corrective_execution ?? undefined,
                    lifecycleRisk,
                  );
            const writers = waveActions.filter((action) => action.mutation_scope === 'repository_source');
            /** @type {Record<string, import('../src/runtime-kernel.ts').WorkflowSessionReservation>} */
            let reservations: Record<string, import('../src/runtime-kernel.ts').WorkflowSessionReservation> = {};
            if (writers.length > 0) {
              if (writers.length !== 1 || !sourceSnapshot)
                fail('GAP-VIDA-RUN-EXECUTION-001', 'Source-writing wave needs one admitted exact-path scope.');
              const writerAction = requireRunData(writers[0], 'Mastra source writer action is missing.');
              const writerRequest = journal.state.items.find(
                (item) => item.request.action_id === writerAction.action_id,
              )?.request;
              if (!writerRequest) fail('GAP-VIDA-RUN-EXECUTION-001', 'Mastra source action is missing.');
              const { loadProjectSetContext } = await import('../src/config/project-context.ts');
              const projectContext = loadProjectSetContext(
                values.project_root,
                config,
                config.repository.repository_id,
                [pathProject.project_id],
              );
              const writerIdentity = {
                repository_id: projectContext.repository_id,
                project_ids: projectContext.project_ids,
                integrations_digest: projectContext.integrations_digest,
                work_id: context.work_id,
              };
              const beforeWriter = ledger.hostState.readHostStateSnapshot(writerIdentity);
              const writerWork = requireRunData(beforeWriter.work, 'Mastra source writer Work is missing.');
              const writerLease = requireRunData(writerWork.lease, 'Mastra source writer lease is unavailable.');
              const writerWorkVersion = requireRunData(
                beforeWriter.workVersion,
                'Mastra source writer Work version is missing.',
              );
              const writerLedgerVersion = requireRunData(
                beforeWriter.ledgerVersion,
                'Mastra source writer Ledger version is missing.',
              );
              const { acquireLocalSourceWriterLease } = await import('../src/orchestration/local-work-admission.ts');
              acquireLocalSourceWriterLease({
                repositoryRoot: values.project_root,
                config,
                store: ledger.hostState,
                identity: writerIdentity,
                nativeSessionHandle: writerLease.thread_id,
                stageId: writerRequest.stage_id,
                assignmentIndex: writerRequest.assignment_index,
                expectedWork: writerWorkVersion,
                expectedLedger: writerLedgerVersion,
                expectedSessionJournal: { attempt: context.attempt, version: journal.version },
              });
              const { openAdmittedSessionExecution } =
                await import('../src/orchestration/admitted-session-execution.ts');
              const { prepareWorkflowExecution, reserveWorkflowAssignmentForSession } =
                await import('../src/runtime-kernel.ts');
              const execution = await openAdmittedSessionExecution(
                values.project_root,
                ledger.hostState,
                pathProject.project_id,
                context.work_id,
              );
              const capability = requireRunData(
                execution.composition.workflowExecutionCapability,
                'Workflow execution capability is missing.',
              );
              const prepared = await prepareWorkflowExecution(capability, {
                repositoryRoot: values.project_root,
                configDigest,
                teamId: values.team,
                workItemId: context.work_id,
              });
              const action = requireRunData(writers[0], 'Mastra source writer action is missing.');
              const request = requireRunData(
                journal.state.items.find((item) => item.request.action_id === action.action_id)?.request,
                'Mastra source action is missing.',
              );
              const reserved = await reserveWorkflowAssignmentForSession(capability, {
                repositoryRoot: values.project_root,
                configDigest,
                teamId: values.team,
                workflowId: values.workflow,
                stageId: request.stage_id,
                assignmentIndex: request.assignment_index,
                workItemId: context.work_id,
                workItemDigest: prepared.workItemDigest,
                workContextDigest: prepared.workContextDigest,
                input: { bindings_manifest_ref: request.bindings_manifest_ref },
              });
              reservations = { [action.action_id]: reserved };
            }
            journal = ledger.issueWave(context.work_id, context.attempt, journal.version, reservations);
            if (issuedStages.some(isResearchOutputStage)) {
              const { readAdmittedSessionExecutionContext } =
                await import('../src/orchestration/admitted-session-execution.ts');
              const { issueObservedResearchActivation } =
                await import('../src/orchestration/observed-research-activation.ts');
              const execution = readAdmittedSessionExecutionContext(
                values.project_root,
                ledger.hostState,
                pathProject.project_id,
                context.work_id,
              );
              for (const item of journal.state.items.filter((entry) =>
                activeWorkflow.stages.some((stage) => isResearchOutputForStage(stage, entry.request.stage_id)),
              )) {
                const activated = await issueObservedResearchActivation({
                  repositoryRoot: values.project_root,
                  config,
                  ledger,
                  identity: execution.identity,
                  journal,
                  actionId: item.request.action_id,
                });
                journal = activated.journal;
                researchBindings.set(item.request.action_id, activated.bindings);
              }
            }
            status = 'wave_issued';
            issuedActions = journal.state.items.map((item) =>
              describeIssuedAction(item, researchBindings, activeWorkflow.stages),
            );
          }
        } else {
          const observation = parseSessionBridgeObservation(
            readBoundedReport(requireOption(values.report, '--report')),
          );
          const issued = journal.state.items.find((item) => item.request.action_id === observation.action_id);
          const reportedStage = issued && activeWorkflow.stages.find((stage) => stage.id === issued.request.stage_id);
          if (reportedStage?.kind === 'validate' && reportedStage.produces.includes('ValidationReceipt/v1')) {
            const { parseObservedValidatorVerdict } = await import('../src/orchestration/observed-validation.ts');
            parseObservedValidatorVerdict(observation);
          }
          if (issued && activeWorkflow.stages.find((stage) => stage.id === issued.request.stage_id)?.kind === 'test') {
            const { parseObservedTesterVerdict } = await import('../src/orchestration/observed-testing.ts');
            parseObservedTesterVerdict(observation);
          }
          if (
            issued &&
            observation.status === 'reported_complete' &&
            activeWorkflow.stages.find((stage) => stage.id === issued.request.stage_id)?.kind === 'research'
          ) {
            if (!issued.issue_id || !issued.research_activation)
              fail('GAP-VIDA-RUN-EXECUTION-001', 'Research action lacks a committed instruction activation.');
            const { readAdmittedSessionExecutionContext } =
              await import('../src/orchestration/admitted-session-execution.ts');
            const { buildObservedResearchResult } = await import('../src/orchestration/observed-research-result.ts');
            const execution = readAdmittedSessionExecutionContext(
              values.project_root,
              ledger.hostState,
              pathProject.project_id,
              context.work_id,
            );
            const host = ledger.hostState.readHostStateSnapshot(execution.identity);
            if (!host.work) fail('GAP-VIDA-RUN-EXECUTION-001', 'Research work is missing.');
            const access = requireSafeRepositoryAccess(values.project_root);
            const workItem = parseWorkflowWorkItem(workflowWorkItemSchema, execution.workItem);
            buildObservedResearchResult({
              config,
              observation,
              request: issued.request,
              issueId: issued.issue_id,
              activationUse: issued.research_activation.use,
              work: host.work,
              scopeBytes: access.readBytes(host.work.contracts.scope.path, 'research accepted scope'),
              acceptanceBytes: access.readBytes(host.work.contracts.acceptance.path, 'research accepted acceptance'),
              workItem,
            });
          }
          if (
            issued &&
            observation.status === 'reported_complete' &&
            activeWorkflow.stages
              .find((stage) => stage.id === issued.request.stage_id)
              ?.produces.includes('ResearchSynthesis/v1')
          ) {
            if (!issued.issue_id || !issued.research_activation)
              fail('GAP-VIDA-RUN-EXECUTION-001', 'Synthesis action lacks a committed instruction activation.');
            const { readAdmittedSessionExecutionContext } =
              await import('../src/orchestration/admitted-session-execution.ts');
            const { admittedResearchResultsForSynthesis, buildObservedSynthesisResult } =
              await import('../src/orchestration/observed-synthesis-result.ts');
            const execution = readAdmittedSessionExecutionContext(
              values.project_root,
              ledger.hostState,
              pathProject.project_id,
              context.work_id,
            );
            const host = ledger.hostState.readHostStateSnapshot(execution.identity);
            if (!host.work) fail('GAP-VIDA-RUN-EXECUTION-001', 'Synthesis work is missing.');
            const access = requireSafeRepositoryAccess(values.project_root);
            const workItem = parseWorkflowWorkItem(workflowWorkItemSchema, execution.workItem);
            buildObservedSynthesisResult({
              config,
              observation,
              request: issued.request,
              issueId: issued.issue_id,
              activationUse: issued.research_activation.use,
              work: host.work,
              scopeBytes: access.readBytes(host.work.contracts.scope.path, 'synthesis accepted scope'),
              acceptanceBytes: access.readBytes(host.work.contracts.acceptance.path, 'synthesis accepted acceptance'),
              workItem,
              researchResults: admittedResearchResultsForSynthesis({
                repositoryRoot: values.project_root,
                config,
                journal,
                work: requireRunData(host.work, 'Synthesis Host Work is unavailable.'),
                workflowId: values.workflow,
              }),
            });
          }
          if (
            issued &&
            activeWorkflow.stages.find((stage) => stage.id === issued.request.stage_id)?.kind === 'deliver'
          ) {
            const { parseObservedDeliveryProposal } = await import('../src/orchestration/observed-delivery.ts');
            parseObservedDeliveryProposal(observation);
            // Check the whole existing delivery contract before committing an
            // unreplaceable observation; the actual instruction is rebuilt only
            // from the persisted journal after report CAS succeeds.
            await preparedDelivery(
              {
                ...journal,
                state: {
                  ...journal.state,
                  items: journal.state.items.map((item) =>
                    addObservationForAction(item, observation.action_id, observation),
                  ),
                },
              },
              journal,
            );
          }
          if (issued?.host_reservation) {
            if (observation.host_attempt_id !== issued.host_reservation.receipt.attempt.attempt_id)
              fail('GAP-VIDA-RUN-EXECUTION-001', 'Observed native host attempt differs.');
            const { compareScopedSourceSnapshots } = await import('../src/orchestration/scoped-source-snapshot.ts');
            if (
              !storedScope ||
              !sourceSnapshot ||
              !Array.isArray(observation.changed_paths) ||
              canonicalJsonDigest(
                compareScopedSourceSnapshots(storedScope, sourceSnapshot).map((entry) => entry.path),
              ) !== canonicalJsonDigest([...observation.changed_paths].sort())
            )
              fail('GAP-VIDA-RUN-EXECUTION-001', 'Observed native source changes differ from scoped files.');
            requireConfiguredContext(issued.request, observation.changed_paths);
            const { openAdmittedSessionExecution } = await import('../src/orchestration/admitted-session-execution.ts');
            const { completeWorkflowAssignmentForSession } = await import('../src/runtime-kernel.ts');
            const execution = await openAdmittedSessionExecution(
              values.project_root,
              ledger.hostState,
              pathProject.project_id,
              context.work_id,
            );
            const live = ledger.hostState.readHostStateSnapshot(execution.identity);
            const prior = live.work?.execution.assignment_attempts.find(
              (item) => item.attempt_id === observation.host_attempt_id,
            );
            if (prior?.status === 'started')
              await completeWorkflowAssignmentForSession(
                requireRunData(
                  execution.composition.workflowExecutionCapability,
                  'Workflow execution capability is missing.',
                ),
                issued.host_reservation,
                observation,
              );
            else if (prior?.status !== 'completed' || prior.result_digest !== canonicalJsonDigest(observation))
              fail('GAP-VIDA-RUN-EXECUTION-001', 'Native host attempt needs explicit reconciliation.');
          }
          if (!issued?.host_reservation && issued) requireConfiguredContext(issued.request);
          journal = ledger.report(context.work_id, context.attempt, journal.version, observation, sourceSnapshot);
          status = 'reported';
        }
      }
      journal = await normalizeObservedResearch(journal);
      if (journal.resume_status === 'ready_to_resume') {
        if (
          journal.state.items.some((item) =>
            activeWorkflow.stages.some((stage) => stage.id === item.request.stage_id && stage.kind === 'deliver'),
          )
        )
          ({ instruction: deliveryInstruction, evidence: testEvidence } = await preparedDelivery(journal));
        const stepId = journal.state.step_id;
        if (!stepId) fail('GAP-VIDA-RUN-EXECUTION-001', 'The Mastra resume step is missing.');
        workflowSnapshot = requireRunData(
          await (
            await openBridge()
          ).resume(
            stepId,
            journal.state.items.map((item) =>
              requireRunData(item.observation, 'Mastra resume observation is unavailable.'),
            ),
            sourceSnapshot,
          ),
          'Resumed Mastra snapshot is unavailable.',
        );
        journal = requireRunData(
          ledger.resume(context.work_id, context.attempt),
          'Resumed producer journal is unavailable.',
        );
        status = journal.resume_status === 'complete' ? 'all_reports_collected' : 'resumed';
      }
      if (
        journal.resume_status === 'complete' &&
        !deliveryInstruction &&
        journal.state.completed.some((entry) =>
          entry.items.some((item) =>
            activeWorkflow.stages.some((stage) => stage.id === item.request.stage_id && stage.kind === 'deliver'),
          ),
        )
      )
        ({ instruction: deliveryInstruction, evidence: testEvidence } = await preparedDelivery(journal));
      let researchSynthesis = null;
      const terminalSynthesisStages = activeWorkflow.stages.filter(
        (stage) =>
          activeWorkflow.terminal_stages.includes(stage.id) &&
          stage.kind === 'synthesize' &&
          stage.produces.includes('ResearchSynthesis/v1'),
      );
      if (terminalSynthesisStages.length > 1)
        fail('GAP-VIDA-RUN-EXECUTION-001', 'Terminal research synthesis must have one declared output stage.');
      const terminalStage = terminalSynthesisStages[0];
      if (
        journal.resume_status === 'complete' &&
        terminalStage?.kind === 'synthesize' &&
        terminalStage.produces.includes('ResearchSynthesis/v1')
      ) {
        const items = journal.state.completed
          .flatMap((entry) => entry.items)
          .filter((item) => item.request.stage_id === terminalStage.id && item.request.workflow_id === values.workflow);
        if (items.length !== 1)
          fail('GAP-VIDA-RUN-EXECUTION-001', 'Terminal synthesis has no unique canonical observation.');
        const item = requireRunData(items[0], 'Terminal synthesis observation is missing.');
        if (!item.research_normalization || !item.observation || !item.issue_id)
          fail('GAP-VIDA-RUN-EXECUTION-001', 'Terminal synthesis has no unique canonical observation.');
        const { readAdmittedSessionExecutionContext } =
          await import('../src/orchestration/admitted-session-execution.ts');
        const execution = readAdmittedSessionExecutionContext(
          values.project_root,
          ledger.hostState,
          pathProject.project_id,
          context.work_id,
        );
        const host = ledger.hostState.readHostStateSnapshot(execution.identity);
        const plan = requireRunData(item.research_normalization, 'Terminal synthesis normalization is missing.');
        const observation = requireRunData(item.observation, 'Terminal synthesis observation is missing.');
        const issueId = requireRunData(item.issue_id, 'Terminal synthesis issue receipt is missing.');
        const artifact = host.work?.artifacts.find(
          (entry) =>
            entry.schema === 'ResearchSynthesis/v1' &&
            entry.stage_id === terminalStage.id &&
            entry.path === plan.record_path &&
            entry.sha256 === plan.record_sha256,
        );
        if (
          !artifact ||
          plan.binding.action_id !== item.request.action_id ||
          plan.binding.issue_id !== issueId ||
          plan.observation_digest !== canonicalJsonDigest(observation)
        )
          fail('GAP-VIDA-RUN-EXECUTION-001', 'Terminal synthesis is not bound to its admitted artifact.');
        const bytes = requireSafeRepositoryAccess(values.project_root).readBytes(
          artifact.path,
          'terminal synthesis artifact',
        );
        const { validateResearchSynthesis } = await import('../src/research-decision.ts');
        if (bytes.length > 64 * 1024 || createHash('sha256').update(bytes).digest('hex') !== artifact.sha256)
          fail('GAP-VIDA-RUN-EXECUTION-001', 'Terminal synthesis bytes changed.');
        researchSynthesis = validateResearchSynthesis(JSON.parse(bytes.toString('utf8')));
        if (researchSynthesis.bundle_id !== artifact.artifact_id || researchSynthesis.digest !== plan.result_digest)
          fail('GAP-VIDA-RUN-EXECUTION-001', 'Terminal synthesis identity changed.');
      }
      reconciliationRequired = await unresolvedHostEffect(journal);
      const actionWave = requireRunData(workflowSnapshot, 'Prepared Mastra snapshot is unavailable.').requests[0]
        ?.wave_index;
      const actions =
        actionWave === undefined
          ? []
          : sessionActionsForWave(
              config,
              selection,
              context,
              values.workflow,
              actionWave,
              [],
              journal.state.corrective_execution ?? undefined,
              lifecycleRisk,
            );
      const actionById = new Map(actions.map((action) => [action.action_id, action]));
      const { researchObservationOutputContract } = await import('../src/orchestration/observed-research-result.ts');
      const { synthesisObservationOutputContract, admittedResearchResultsForSynthesis, synthesisSourceCatalog } =
        await import('../src/orchestration/observed-synthesis-result.ts');
      const synthesisStageIds = new Set(
        activeWorkflow.stages
          .filter((stage) => stage.produces.includes('ResearchSynthesis/v1'))
          .map((stage) => stage.id),
      );
      const synthesisCatalog = journal.state.items.some(
        (item) =>
          synthesisStageIds.has(item.request.stage_id) &&
          (journal.resume_status === 'ready' || issuedActions.length > 0),
      )
        ? await (async () => {
            const { loadProjectSetContext } = await import('../src/config/project-context.ts');
            const project = loadProjectSetContext(values.project_root, config, config.repository.repository_id, [
              pathProject.project_id,
            ]);
            const host = ledger.hostState.readHostStateSnapshot({
              repository_id: project.repository_id,
              project_ids: project.project_ids,
              integrations_digest: project.integrations_digest,
              work_id: context.work_id,
            });
            return synthesisSourceCatalog(
              admittedResearchResultsForSynthesis({
                repositoryRoot: values.project_root,
                config,
                journal,
                work: requireRunData(host.work, 'Synthesis Host Work is unavailable.'),
                workflowId: values.workflow,
              }),
            );
          })()
        : null;
      const contextByAction = new Map(
        (journal.resume_status === 'ready' || issuedActions.length > 0 ? journal.state.items : []).map((item) => [
          item.request.action_id,
          requireConfiguredContext(item.request),
        ]),
      );
      const result = {
        schema: 'VidaAgentRunResult/v1',
        status,
        workflow: values.workflow,
        mastra_run_id: requireRunData(workflowSnapshot, 'Prepared Mastra snapshot is unavailable.').run_id,
        mastra_step_id: requireRunData(workflowSnapshot, 'Prepared Mastra snapshot is unavailable.').step_id,
        execution_status: requireRunData(workflowSnapshot, 'Prepared Mastra snapshot is unavailable.').status,
        resume_status: reconciliationRequired ? 'reconciliation_required' : journal.resume_status,
        reconciliation_required: reconciliationRequired,
        research_preparation_status:
          journal.state.research_wave_exposure === 'preparing'
            ? 'preparation_incomplete'
            : journal.state.research_wave_exposure === 'possible'
              ? 'exposure_possible'
              : null,
        source_snapshot_digest: sourceSnapshot?.digest ?? null,
        state_version: journal.version,
        next_actions:
          journal.resume_status === 'ready' && !reconciliationRequired
            ? journal.state.items.map((item) => ({
                request: item.request,
                action: actionById.get(item.request.action_id),
                configured_context: contextByAction.get(item.request.action_id),
                ...(actionById.get(item.request.action_id)?.stage_kind === 'research'
                  ? { research_output_contract: researchObservationOutputContract }
                  : {}),
                ...(activeWorkflow.stages
                  .find((stage) => stage.id === item.request.stage_id)
                  ?.produces.includes('ResearchSynthesis/v1')
                  ? {
                      synthesis_output_contract: synthesisObservationOutputContract,
                      synthesis_source_catalog: synthesisCatalog,
                    }
                  : {}),
              }))
            : [],
        issued_actions: issuedActions.map((item) => ({
          ...item,
          action: actionById.get(item.request.action_id),
          configured_context: contextByAction.get(item.request.action_id),
          ...(actionById.get(item.request.action_id)?.stage_kind === 'research'
            ? { research_output_contract: researchObservationOutputContract }
            : {}),
          ...(activeWorkflow.stages
            .find((stage) => stage.id === item.request.stage_id)
            ?.produces.includes('ResearchSynthesis/v1')
            ? {
                synthesis_output_contract: synthesisObservationOutputContract,
                synthesis_source_catalog: synthesisCatalog,
              }
            : {}),
          ...(issuedEvidence
            ? {
                development_packet: issuedEvidence.packet,
                ...(issuedEvidence.implementationResult
                  ? { implementation_result: issuedEvidence.implementationResult }
                  : {}),
              }
            : {}),
          ...(testerInstruction ? { tester_instruction: testerInstruction } : {}),
        })),
        validation_receipt_statuses: validationReceipts.map((receipt) => ({
          receipt_id: receipt.receipt_id,
          validator_role: receipt.validator_role,
          verdict: receipt.verdict,
          implementation_fingerprint: receipt.implementation_fingerprint,
        })),
        test_receipt_status: testReceipt
          ? {
              ...testEvidence,
              receipt_id: testReceipt.receipt_id,
              status: testReceipt.status,
              implementation_fingerprint: testReceipt.implementation_fingerprint,
            }
          : null,
        delivery_instruction: deliveryInstruction,
        delivery_evidence: deliveryInstruction ? testEvidence : null,
        research_synthesis: researchSynthesis,
        action_statuses: journal.state.items.map((item) => ({
          action_id: item.request.action_id,
          status:
            item.issue_id === null
              ? 'unissued'
              : item.observation === null
                ? journal.state.research_wave_exposure === 'preparing'
                  ? 'research_preparation_incomplete'
                  : 'issued_outcome_uncertain'
                : 'reported',
        })),
        completed_observations: journal.state.completed.flatMap((entry) => entry.items.map((item) => item.observation)),
        initialization_status: initialization.workspace_binding_status,
        ...(selector
          ? {
              runtime_selector_observed: true,
              selector_generation: selector.generation,
              selector_sha256: selector.selectorSha,
            }
          : {}),
      };
      if (issuedActions.length > 0 && journal.state.research_wave_exposure === 'preparing') {
        journal = ledger.markResearchWaveExposurePossible(context.work_id, context.attempt, journal.version);
        result.state_version = journal.version;
        result.resume_status = journal.resume_status;
        result.research_preparation_status = 'exposure_possible';
        result.action_statuses = result.action_statuses.map(markUncertainResearchStatus);
      }
      return result;
    } finally {
      try {
        ledger.close();
      } finally {
        if (bridge) await closeRunSessionBridge(bridge);
      }
    }
  }
}

/** @param {Partial<Pick<NodeJS.Process, 'exitCode'>>} exit @param {unknown} result @returns {boolean} */
function applyIntegerExitResult(exit: Partial<Pick<NodeJS.Process, 'exitCode'>>, result: unknown): boolean {
  if (typeof result !== 'number' || !Number.isInteger(result)) return false;
  exit.exitCode = result;
  return true;
}

/** @param {{isMain?: boolean, args?: string[], io?: Pick<Console, 'log' | 'error'>, exit?: Partial<Pick<NodeJS.Process, 'exitCode'>>, execute?: (args: string[]) => unknown}} [options] */
export async function main({
  isMain = Boolean(process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url),
  args = process.argv.slice(2),
  io = console,
  exit = process,
  execute = run,
}: {
  isMain?: boolean;
  args?: string[];
  io?: Pick<Console, 'log' | 'error'>;
  exit?: Partial<Pick<NodeJS.Process, 'exitCode'>>;
  execute?: (args: string[]) => unknown;
} = {}): Promise<void> {
  if (!isMain) return;
  // Set the supported cache namespace before TypeScript modules are imported.
  // A library import/call never enters this actual-entrypoint-only route.
  if (isBunRuntime && process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
    const { pinnedEnvironment, runPinnedBun } = await import('./bun.ts');
    const environment = pinnedEnvironment(process.execPath, process.env, bundleRoot);
    if (environment.BUN_RUNTIME_TRANSPILER_CACHE_PATH !== process.env.BUN_RUNTIME_TRANSPILER_CACHE_PATH) {
      exit.exitCode = runPinnedBun([fileURLToPath(import.meta.url), ...args], {
        root: bundleRoot,
        cwd: process.cwd(),
        executable: process.execPath,
        env: environment,
      });
      return;
    }
  }
  try {
    const result = await execute(args);
    if (!applyIntegerExitResult(exit, result)) io.log(JSON.stringify(result));
  } catch (error) {
    io.error(JSON.stringify(publicFailure(error)));
    exit.exitCode = 1;
  }
}

/** @param {string[]} args */
async function printRunHelp(args: string[]): Promise<void> {
  const { cliMetadataResult } = await import('./cli-metadata.ts');
  const text = JSON.stringify(cliMetadataResult(['run', ...args], { name: 'vida-agent', version: '0.0.0' })) + '\n';
  // Explicit entrypoint exit follows the actual pipe-write completion, not enqueueing.
  await new Promise((resolve, reject) => {
    process.stdout.write(text, (error) => {
      if (error) reject(error);
      else resolve(undefined);
    });
  });
}

await main();
