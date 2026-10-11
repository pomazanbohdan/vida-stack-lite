import {
  createCliHostStateStore,
  closeWorkspaceDatabaseWithAdmission,
  openCliWorkspaceDatabase,
} from './workspace-database-cli.ts';
import { reconcileCliContracts, reconcileExpectedOptions } from './reconcile-cli-contracts.ts';
import { createHash, randomUUID } from 'node:crypto';
import { lstatSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { Ajv2020 } from 'ajv/dist/2020.js';
import workSchema from '../schemas/work-state.v1.schema.json' with { type: 'json' };
import { loadRuntimeConfig } from '../src/config/runtime-config.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import {
  assertCanonicalJsonValue,
  canonicalJson,
  canonicalJsonDigest,
  isPlainRecord,
} from '../src/contracts/public-ingress.ts';
import {
  coordinationLedgerJson,
  coordinationLedgerDigest,
  validateCoordinationLedgerV1,
} from '../src/contracts/envelopes.ts';
import { qualifiedResearchSourceCatalog, qualifyLegacySynthesisRecord } from '../src/research-source-catalog.ts';
import {
  validateResearchResult,
  validateResearchSynthesis,
  validateSynthesisReferencesForResults,
  validateSynthesisExternalValidationForResults,
  validateObservedResearchRecordPlan,
} from '../src/research-decision.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';

import { sessionHandoffDatabasePath, sessionHandoffDatabaseRelativePath } from '../src/config/project-paths.ts';
import { queryWorkspaceRowsUnknown } from '../src/config/workspace-database.ts';
import { decodeWorkspaceSqlRow } from '../src/config/host-persisted-row.ts';
import { parseMastraSessionLedgerState } from '../src/orchestration/mastra-session-ledger-codec.ts';
import { validateWorkSessionBinding } from '../src/orchestration/final-assurance.ts';
import { parseSessionBridgeObservation } from '../src/orchestration/mastra-session-bridge-contract.ts';

type HostStateStore = import('../src/host-state.ts').HostStateStore;
type AgentRuntimeConfig = import('../src/config/runtime-config.ts').AgentRuntimeConfig;
type SafeRepositoryAccess = import('../src/config/safe-repository-access.ts').SafeRepositoryAccess;
type ResearchResultRef = import('../src/research-source-catalog.ts').ResearchResultRef;
type QualifiedResearchSource = import('../src/research-source-catalog.ts').QualifiedResearchSource;
type ResearchResult = import('../src/research-decision.ts').ResearchResult;
type ResearchSynthesis = import('../src/research-decision.ts').ResearchSynthesis;
type ObservedResearchRecordPlan = import('../src/research-decision.ts').ObservedResearchRecordPlan;
type MastraSessionLedgerState = import('../src/orchestration/persistent-session-handoff.ts').MastraSessionLedgerState;
type MastraLedgerItem = import('../src/orchestration/persistent-session-handoff.ts').MastraLedgerItem;
type SessionBridgeObservation = import('../src/orchestration/mastra-session-bridge.ts').SessionBridgeObservation;
type WorkArtifactReference = import('../src/host-state.ts').WorkArtifactReference;
type WorkIdentity = import('../src/host-state.ts').WorkIdentity;
type WorkState = import('../src/host-state.ts').WorkState;
type StateVersion = import('../src/host-state.ts').StateVersion;
type MaintenanceFenceReceipt = import('../src/host-state.ts').MaintenanceFenceReceipt;
type MaintenanceFence = import('../src/host-state.ts').MaintenanceFence;
type MaintenanceFenceBinding = import('../src/host-state.ts').MaintenanceFenceBinding;
type MaintenanceReleaseAuthorization = import('../src/host-state.ts').MaintenanceReleaseAuthorization;
type WorkspaceStateSqlRow = import('../src/config/host-persisted-row.ts').WorkspaceStateSqlRow;
type WorkspaceMastraSqlRow = import('../src/config/host-persisted-row.ts').WorkspaceMastraSqlRow;
type SqliteDatabase = import('bun:sqlite').Database;
type RepairWorkRow = {
  readonly id: string;
  readonly revision: number;
  readonly digest: string;
  readonly payload: string;
};
type RepairJournalRow = { readonly revision: number; readonly digest: string; readonly payload: string };
type SynthesisRepairTarget = {
  readonly path: string;
  readonly artifact_id: string;
  readonly before_sha256: string;
  readonly after_sha256: string;
  readonly before_digest: string;
  readonly after_digest: string;
  readonly action_id: string;
  readonly issue_id: string;
  readonly work_id: string;
  readonly attempt: number;
  readonly before_record: string;
  readonly after_record: string;
  readonly before_observation: SessionBridgeObservation;
  readonly after_observation: SessionBridgeObservation;
  readonly before_normalization: ObservedResearchRecordPlan;
  readonly changelog_before_sha256: string;
  readonly work_row: RepairWorkRow;
  readonly journal_row: RepairJournalRow;
};
type SynthesisRepairPlan = {
  readonly schema: 'VidaSynthesisQualificationRepairPlan/v1';
  readonly repair_id: string;
  readonly workspace_id: string;
  readonly config_digest: string;
  readonly selector_sha256: string;
  readonly actor: string;
  readonly timestamp: string;
  readonly changelog_path: string;
  readonly changelog_before: string;
  readonly changelog_after: string;
  readonly changelog_before_sha256: string;
  readonly changelog_after_sha256: string;
  readonly targets: readonly SynthesisRepairTarget[];
  readonly digest: string;
};
type RepairWorkValue = {
  readonly prior: RepairWorkRow;
  readonly original: WorkState;
  readonly alreadyApplied: boolean;
  next: WorkState;
};
type RepairJournalValue = {
  readonly prior: RepairJournalRow;
  readonly workId: string;
  readonly attempt: number;
  readonly original: MastraSessionLedgerState;
  next: MastraSessionLedgerState;
};
type PayloadDigestRow = { readonly payload: string; readonly digest: string };
type StateRevisionRow = { readonly revision: number; readonly payload: string; readonly digest: string };
type RepairPhase = 'changelog' | 'database' | 'complete' | `record_${number}`;
type RepairEvent = {
  readonly schema: 'VidaSynthesisQualificationRepairEvent/v1';
  readonly repair_id: string;
  readonly phase: RepairPhase;
};
type SynthesisMaintenanceInput = {
  readonly binding: MaintenanceFenceBinding;
  readonly verifier: import('../src/host-state.ts').MaintenanceReleaseVerifier;
};
type SynthesisRepairTargetInput = Record<string, unknown> & {
  path: string;
  artifact_id: string;
  before_sha256: string;
  after_sha256: string;
  before_digest: string;
  after_digest: string;
  action_id: string;
  issue_id: string;
  work_id: string;
  attempt: number;
  before_record: string;
  after_record: string;
  changelog_before_sha256: string;
  work_row: RepairWorkRow;
  journal_row: RepairJournalRow;
};
type SynthesisRepairPlanInput = Record<string, unknown> & {
  schema: 'VidaSynthesisQualificationRepairPlan/v1';
  repair_id: string;
  workspace_id: string;
  config_digest: string;
  selector_sha256: string;
  actor: string;
  timestamp: string;
  changelog_path: string;
  changelog_before: string;
  changelog_after: string;
  changelog_before_sha256: string;
  changelog_after_sha256: string;
  targets: unknown[];
  digest: string;
};

const synthesisRepairPlanSchema = 'VidaSynthesisQualificationRepairPlan/v1';
const synthesisRepairEventSchema = 'VidaSynthesisQualificationRepairEvent/v1';
const maintenanceFenceBindingSchema = 'MaintenanceFenceBinding/v1';
const maintenanceReleaseAuthorizationSchema = 'MaintenanceReleaseAuthorization/v1';

const validateWorkState = new Ajv2020({ allErrors: true }).compile<WorkState>(workSchema);

function exactRecord(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return (
    isPlainRecord(value) &&
    Reflect.ownKeys(value).length === keys.length &&
    Reflect.ownKeys(value).every((key) => typeof key === 'string' && keys.includes(key))
  );
}

function decodePayloadDigestRow(value: unknown): PayloadDigestRow | null {
  if (value === null || value === undefined) return null;
  if (!exactRecord(value, ['payload', 'digest']) || typeof value.payload !== 'string' || !isDigest(value.digest))
    throw new Error('vida synthesis qualification repair: SQL payload row invalid');
  return { payload: value.payload, digest: value.digest };
}

function decodeStateRevisionRow(value: unknown): StateRevisionRow | null {
  if (value === null || value === undefined) return null;
  if (
    !exactRecord(value, ['revision', 'payload', 'digest']) ||
    typeof value.revision !== 'number' ||
    !Number.isSafeInteger(value.revision) ||
    value.revision < 1 ||
    typeof value.payload !== 'string' ||
    !isDigest(value.digest)
  )
    throw new Error('vida synthesis qualification repair: SQL state row invalid');
  return { revision: value.revision, payload: value.payload, digest: value.digest };
}

function isSortedProjectIds(value: unknown): value is string[] {
  if (!Array.isArray(value) || value.length === 0) return false;
  const values: unknown[] = value;
  return values.every((projectId, index) => {
    const previous = index === 0 ? undefined : values[index - 1];
    return (
      typeof projectId === 'string' &&
      projectId.length > 0 &&
      (index === 0 || (typeof previous === 'string' && previous < projectId))
    );
  });
}

function isWorkIdentityKeyTuple(value: unknown): value is [string, string[], string, string] {
  if (!Array.isArray(value)) return false;
  const tuple: unknown[] = value;
  return (
    tuple.length === 4 &&
    isNonemptyString(tuple[0]) &&
    isSortedProjectIds(tuple[1]) &&
    isNonemptyString(tuple[2]) &&
    isNonemptyString(tuple[3])
  );
}

function isNonemptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function parseJsonValue(text: string): unknown {
  return JSON.parse(text);
}

function parseJsonUnknown(text: string, label: string): unknown {
  const value = parseJsonValue(text);
  assertCanonicalJsonValue(value, label);
  return value;
}

function parseRepairEvent(value: unknown, repairId: string): RepairEvent {
  if (
    !exactRecord(value, ['schema', 'repair_id', 'phase']) ||
    value.schema !== 'VidaSynthesisQualificationRepairEvent/v1' ||
    value.repair_id !== repairId ||
    !isRepairPhase(value.phase)
  )
    throw new Error('vida synthesis qualification repair: repair journal event invalid');
  return { schema: 'VidaSynthesisQualificationRepairEvent/v1', repair_id: repairId, phase: value.phase };
}

function isRepairPhase(value: unknown): value is RepairPhase {
  return (
    value === 'changelog' ||
    value === 'database' ||
    value === 'complete' ||
    (typeof value === 'string' && /^record_(0|[1-9][0-9]*)$/.test(value))
  );
}

function isDigest(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
}

function isRepairWorkRow(
  value: unknown,
): value is { readonly id: string; readonly revision: number; readonly digest: string; readonly payload: string } {
  return (
    exactRecord(value, ['id', 'revision', 'digest', 'payload']) &&
    typeof value.id === 'string' &&
    isPositiveInteger(value.revision) &&
    isDigest(value.digest) &&
    typeof value.payload === 'string'
  );
}

function isRepairJournalRow(
  value: unknown,
): value is { readonly revision: number; readonly digest: string; readonly payload: string } {
  return (
    exactRecord(value, ['revision', 'digest', 'payload']) &&
    isPositiveInteger(value.revision) &&
    isDigest(value.digest) &&
    typeof value.payload === 'string'
  );
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

const synthesisTargetKeys = [
  'path',
  'artifact_id',
  'before_sha256',
  'after_sha256',
  'before_digest',
  'after_digest',
  'action_id',
  'issue_id',
  'work_id',
  'attempt',
  'before_record',
  'after_record',
  'before_observation',
  'after_observation',
  'before_normalization',
  'changelog_before_sha256',
  'work_row',
  'journal_row',
];

function isSynthesisRepairTargetFields(value: unknown): value is SynthesisRepairTargetInput {
  return (
    exactRecord(value, synthesisTargetKeys) &&
    isRepairWorkRow(value.work_row) &&
    isRepairJournalRow(value.journal_row) &&
    isSynthesisRepairTargetTextFields(value) &&
    isSynthesisRepairTargetDigestFields(value)
  );
}

function isSynthesisRepairTargetTextFields(value: Record<string, unknown>) {
  return (
    typeof value.path === 'string' &&
    typeof value.artifact_id === 'string' &&
    typeof value.issue_id === 'string' &&
    typeof value.work_id === 'string' &&
    typeof value.before_record === 'string' &&
    typeof value.after_record === 'string' &&
    isPositiveInteger(value.attempt)
  );
}

function isSynthesisRepairTargetDigestFields(value: Record<string, unknown>) {
  return (
    isDigest(value.before_sha256) &&
    isDigest(value.after_sha256) &&
    isDigest(value.before_digest) &&
    isDigest(value.after_digest) &&
    isDigest(value.action_id) &&
    isDigest(value.changelog_before_sha256)
  );
}

function parseSynthesisRepairTarget(value: unknown): SynthesisRepairTarget {
  if (!isSynthesisRepairTargetFields(value))
    throw new Error('vida synthesis qualification repair: target fields invalid');
  const workRow = value.work_row;
  const journalRow = value.journal_row;
  return {
    ...value,
    before_observation: parseSessionBridgeObservation(value.before_observation),
    after_observation: parseSessionBridgeObservation(value.after_observation),
    before_normalization: validateObservedResearchRecordPlan(value.before_normalization),
    work_row: {
      id: workRow.id,
      revision: workRow.revision,
      digest: workRow.digest,
      payload: workRow.payload,
    },
    journal_row: {
      revision: journalRow.revision,
      digest: journalRow.digest,
      payload: journalRow.payload,
    },
  };
}

function isSynthesisRepairPlanFields(value: unknown): value is SynthesisRepairPlanInput {
  const keys = [
    'schema',
    'repair_id',
    'workspace_id',
    'config_digest',
    'selector_sha256',
    'actor',
    'timestamp',
    'changelog_path',
    'changelog_before',
    'changelog_after',
    'changelog_before_sha256',
    'changelog_after_sha256',
    'targets',
    'digest',
  ];
  return (
    exactRecord(value, keys) &&
    value.schema === 'VidaSynthesisQualificationRepairPlan/v1' &&
    isSynthesisRepairPlanIdentity(value) &&
    isSynthesisRepairPlanContent(value)
  );
}

function isSynthesisRepairPlanIdentity(value: Record<string, unknown>) {
  return (
    typeof value.repair_id === 'string' &&
    /^[a-z0-9][a-z0-9._-]{0,79}$/.test(value.repair_id) &&
    typeof value.workspace_id === 'string' &&
    value.workspace_id.length > 0 &&
    isDigest(value.config_digest) &&
    isDigest(value.selector_sha256) &&
    isDigest(value.digest)
  );
}

function isSynthesisRepairPlanContent(value: Record<string, unknown>) {
  return (
    isSynthesisRepairPlanAttribution(value) &&
    isSynthesisRepairPlanText(value) &&
    isSynthesisRepairPlanPostimages(value)
  );
}

function isSynthesisRepairPlanAttribution(value: Record<string, unknown>) {
  return (
    typeof value.actor === 'string' &&
    value.actor.length > 0 &&
    typeof value.timestamp === 'string' &&
    !Number.isNaN(Date.parse(value.timestamp))
  );
}

function isSynthesisRepairPlanText(value: Record<string, unknown>) {
  return (
    typeof value.changelog_path === 'string' &&
    typeof value.changelog_before === 'string' &&
    typeof value.changelog_after === 'string'
  );
}

function isSynthesisRepairPlanPostimages(value: Record<string, unknown>) {
  return (
    isDigest(value.changelog_before_sha256) &&
    isDigest(value.changelog_after_sha256) &&
    Array.isArray(value.targets) &&
    value.targets.length > 0
  );
}

function parseSynthesisRepairPlan(value: unknown): SynthesisRepairPlan {
  assertCanonicalJsonValue(value, '$.synthesis_qualification_repair');
  if (!isSynthesisRepairPlanFields(value)) throw new Error('vida synthesis qualification repair: plan fields invalid');
  const targetValues: unknown[] = value.targets;
  const targets = targetValues.map(parseSynthesisRepairTarget);
  const { digest, ...body } = value;
  if (canonicalJsonDigest(body) !== digest) throw new Error('vida synthesis qualification repair: plan digest invalid');
  return {
    schema: synthesisRepairPlanSchema,
    repair_id: value.repair_id,
    workspace_id: value.workspace_id,
    config_digest: value.config_digest,
    selector_sha256: value.selector_sha256,
    actor: value.actor,
    timestamp: value.timestamp,
    changelog_path: value.changelog_path,
    changelog_before: value.changelog_before,
    changelog_after: value.changelog_after,
    changelog_before_sha256: value.changelog_before_sha256,
    changelog_after_sha256: value.changelog_after_sha256,
    targets,
    digest,
  };
}

const sha: (bytes: string | Uint8Array) => string = (bytes) => createHash('sha256').update(bytes).digest('hex');
const required: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) throw new Error(`vida synthesis qualification repair: ${message}`);
};
const cmp: (a: string, b: string) => number = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const recordBytes: (value: unknown) => string = (value) =>
  `${JSON.stringify(parseJsonValue(canonicalJson(value)), null, 2)}\n`;

function workIdentityFromKey(value: unknown): WorkIdentity | null {
  if (typeof value !== 'string') return null;
  let decoded: unknown;
  try {
    decoded = parseJsonUnknown(value, '$.work_identity_key');
  } catch {
    return null;
  }
  if (!isWorkIdentityKeyTuple(decoded) || JSON.stringify(decoded) !== value) return null;
  return {
    repository_id: decoded[0],
    project_ids: decoded[1],
    integrations_digest: decoded[2],
    work_id: decoded[3],
  };
}

function currentWorkFromRow(
  row: WorkspaceStateSqlRow,
  store: HostStateStore,
  workspaceId: string,
): { readonly work: WorkState; readonly row: RepairWorkRow } {
  required(row.kind === 'work', 'synthesis row is not a WorkState row');
  const identity = workIdentityFromKey(row.id);
  required(identity, 'synthesis WorkState key is invalid');
  const snapshot = store.readHostStateSnapshot(identity);
  required(
    snapshot.work &&
      snapshot.workVersion &&
      snapshot.work.workspace_id === workspaceId &&
      snapshot.work.revision === row.revision &&
      snapshot.workVersion.revision === row.revision &&
      snapshot.workVersion.digest === row.digest &&
      canonicalJsonDigest(snapshot.work) === row.digest,
    'synthesis WorkState differs from its typed Host receipt',
  );
  return {
    work: snapshot.work,
    row: { id: row.id, revision: row.revision, digest: row.digest, payload: row.payload },
  };
}

function observedSources(
  root: string,
  config: AgentRuntimeConfig,
  references: readonly ResearchResultRef[],
  workId: string,
  sourceRevision: string,
  scopeId: string,
) {
  const access = requireSafeRepositoryAccess(root);
  const directory = config.research_decision.paths.research_records;
  const byId: Map<string, ResearchResult> = new Map();
  for (const name of readdirSync(path.join(root, directory))) {
    if (!name.endsWith('.research.json')) continue;
    const result = validateResearchResult(
      parseJsonValue(access.readText(`${directory}/${name}`, 'research predecessor')),
    );
    if (byId.has(result.result_id)) throw new Error('duplicate canonical research result ID');
    byId.set(result.result_id, result);
  }
  const results = references.map((reference) => {
    const result = byId.get(reference.result_id);
    required(
      result &&
        result.digest === reference.digest &&
        result.work_item_id === workId &&
        result.source_revision === sourceRevision &&
        result.scope_id === scopeId,
      'research predecessor missing, stale or foreign',
    );
    return result;
  });
  return { results, catalog: qualifiedResearchSourceCatalog(references, results) };
}

function normalizeObservation(observation: SessionBridgeObservation, catalog: readonly QualifiedResearchSource[]) {
  required(
    observation?.status === 'reported_complete' && typeof observation.summary === 'string',
    'native synthesis observation is not complete',
  );
  const original: ResearchSynthesis = validateResearchSynthesis(parseJsonValue(observation.summary));
  const qualified = validateResearchSynthesis(qualifyLegacySynthesisRecord(original, catalog));
  const evidence = new Set([
    ...qualified.findings.flatMap((entry) => entry.source_refs),
    ...qualified.conflicts.flatMap((entry) => entry.source_refs),
    ...qualified.options.flatMap((entry) => entry.evidence_refs),
    ...(qualified.recommendation?.evidence_refs ?? []),
  ]);
  const summary = JSON.stringify(qualified);
  required(summary.length <= 4096, 'qualified observation exceeds report summary bound');
  return {
    ...observation,
    summary,
    output_digest: canonicalJsonDigest(summary),
    evidence_refs: [...evidence].sort(cmp),
  };
}

function itemForArtifact(state: MastraSessionLedgerState, artifact: WorkArtifactReference) {
  const waves = [...state.completed.map((wave) => wave.items), state.items];
  const matches = waves
    .flat()
    .filter(
      (item) =>
        item.research_normalization?.record_path === artifact.path &&
        item.request.stage_id === artifact.stage_id &&
        item.research_normalization.record_sha256 === artifact.sha256,
    );
  return exactSynthesisItem(matches);
}

function exactSynthesisItem(matches: MastraLedgerItem[]): MastraLedgerItem {
  const item = matches[0];
  if (matches.length !== 1 || !item)
    throw new Error('vida synthesis qualification repair: synthesis artifact has no exact journal normalization');
  return item;
}

function journalHasArtifact(state: MastraSessionLedgerState, artifact: WorkArtifactReference) {
  const items = [...state.completed.flatMap((wave) => wave.items), ...state.items];
  return items.some(
    (item) =>
      item.research_normalization?.record_path === artifact.path &&
      item.research_normalization.record_sha256 === artifact.sha256,
  );
}

function journalForArtifact(
  database: SqliteDatabase,
  workspaceId: string,
  work: WorkState,
  artifact: WorkArtifactReference,
  root: string,
): { readonly row: WorkspaceMastraSqlRow; readonly value: MastraSessionLedgerState } {
  const rows = queryWorkspaceRowsUnknown(
    database,
    'SELECT workspace_id,work_id,attempt,revision,payload,digest,CAST(payload AS BLOB) AS raw_payload_bytes FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? ORDER BY attempt',
    [workspaceId, work.binding.lifecycle_work_id],
  ).map((row) => decodeWorkspaceSqlRow('agent_host_mastra_session_ledger', row, workspaceId));
  const matches: Array<{ readonly row: WorkspaceMastraSqlRow; readonly value: MastraSessionLedgerState }> = [];
  for (const row of rows) {
    const value = parseMastraSessionLedgerState(row.value);
    required(
      row.work_id === work.binding.lifecycle_work_id &&
        value.workspace_id === workspaceId &&
        value.work_id === row.work_id &&
        value.attempt === row.attempt,
      'Mastra journal identity differs',
    );
    validateWorkSessionBinding(work, value, root);
    if (journalHasArtifact(value, artifact)) matches.push({ row, value });
  }
  required(matches.length === 1, 'active synthesis has no exact Mastra journal');
  const match = matches[0];
  required(match, 'active synthesis journal match is missing');
  return match;
}

function requireQuiescentSynthesisOwner(work: WorkState) {
  required(
    work.execution.status === 'suspended' &&
      work.lease === null &&
      work.lifecycle.phase !== 'COMPLETE' &&
      work.lifecycle.phase !== 'DELIVERY',
    'active synthesis owner is not quiescent for qualification',
  );
}

function planSynthesisTarget({
  database,
  root,
  config,
  workspaceId,
  access,
  current,
  artifact,
  changelogBefore,
}: {
  readonly database: SqliteDatabase;
  readonly root: string;
  readonly config: AgentRuntimeConfig;
  readonly workspaceId: string;
  readonly access: SafeRepositoryAccess;
  readonly current: ReturnType<typeof currentWorkFromRow>;
  readonly artifact: WorkArtifactReference;
  readonly changelogBefore: string;
}): SynthesisRepairTarget {
  const work = current.work;
  requireQuiescentSynthesisOwner(work);
  const match = journalForArtifact(database, workspaceId, work, artifact, root);
  const journal = match.value;
  const item = itemForArtifact(journal, artifact);
  const prior = item.research_normalization;
  required(
    item.issue_id &&
      item.observation?.status === 'reported_complete' &&
      prior &&
      prior.result_digest &&
      prior.observation_digest === canonicalJsonDigest(item.observation),
    'active synthesis is not a fully observed normalized item',
  );
  const raw = access.readBytes(artifact.path, 'active synthesis record');
  required(
    sha(raw) === artifact.sha256 && prior.record_sha256 === artifact.sha256,
    'active synthesis record bytes differ from HostState and journal',
  );
  const record = validateResearchSynthesis(parseJsonUnknown(raw.toString('utf8'), '$.research_synthesis'));
  required(
    record.bundle_id === artifact.artifact_id &&
      record.digest === prior.result_digest &&
      record.work_item_id === work.binding.lifecycle_work_id,
    'active synthesis identity differs',
  );
  const { results, catalog } = observedSources(
    root,
    config,
    record.result_refs,
    record.work_item_id,
    record.source_revision,
    record.scope_id,
  );
  const qualified = validateResearchSynthesis(qualifyLegacySynthesisRecord(record, catalog));
  validateSynthesisReferencesForResults(qualified, results);
  validateSynthesisExternalValidationForResults(qualified, results);
  required(item.observation, 'synthesis journal observation is missing');
  const observation = normalizeObservation(item.observation, catalog);
  const newBytes = recordBytes(qualified);
  return {
    work_id: record.work_item_id,
    attempt: journal.attempt,
    artifact_id: artifact.artifact_id,
    action_id: item.request.action_id,
    issue_id: item.issue_id,
    path: artifact.path,
    before_sha256: artifact.sha256,
    after_sha256: sha(Buffer.from(newBytes)),
    before_digest: record.digest,
    after_digest: qualified.digest,
    before_record: raw.toString('utf8'),
    after_record: newBytes,
    before_observation: item.observation,
    after_observation: observation,
    before_normalization: prior,
    changelog_before_sha256: sha(Buffer.from(changelogBefore)),
    work_row: current.row,
    journal_row: { revision: match.row.revision, digest: match.row.digest, payload: match.row.payload },
  };
}

function planSynthesisTargets({
  database,
  root,
  config,
  workspaceId,
  access,
  hostStore,
  workRows,
  changelogBefore,
}: {
  readonly database: SqliteDatabase;
  readonly root: string;
  readonly config: AgentRuntimeConfig;
  readonly workspaceId: string;
  readonly access: SafeRepositoryAccess;
  readonly hostStore: HostStateStore;
  readonly workRows: readonly WorkspaceStateSqlRow[];
  readonly changelogBefore: string;
}): SynthesisRepairTarget[] {
  const targets: SynthesisRepairTarget[] = [];
  for (const workRow of workRows) {
    const current = currentWorkFromRow(workRow, hostStore, workspaceId);
    const artifacts = current.work.artifacts.filter((entry) => entry.schema === 'ResearchSynthesis/v1');
    for (const artifact of artifacts)
      targets.push(
        planSynthesisTarget({ database, root, config, workspaceId, access, current, artifact, changelogBefore }),
      );
  }
  return targets;
}

/**
 * Read-only complete contour plan. Apply must rederive it from current bytes before mutation.
 */
function planSynthesisQualificationRepair({
  repositoryRoot,
  repairId,
  actor,
  timestamp,
  database,
  hostState,
}: {
  repositoryRoot: string;
  repairId: string;
  actor: string;
  timestamp: string;
  database: SqliteDatabase;
  hostState?: HostStateStore;
}): SynthesisRepairPlan {
  required(
    /^[a-z0-9][a-z0-9._-]{0,79}$/.test(repairId) && actor?.trim() && /^\d{4}-\d{2}-\d{2}T/.test(timestamp),
    'repair attribution invalid',
  );
  const root = path.resolve(repositoryRoot);
  const config = loadRuntimeConfig(root);
  const access = requireSafeRepositoryAccess(root);
  const workspaceId = deriveWorkspaceId(config.repository.repository_id, root);
  const changelogPath = config.research_decision.paths.changelog;
  const changelogBefore = access.readText(changelogPath, 'research changelog');
  const selectorSha256 = sha(access.readBytes('.agent/active-runtime-selector.v1.json', 'active runtime selector'));
  required(changelogBefore.endsWith('\n'), 'research changelog is incomplete');
  const hostStore =
    hostState ?? createCliHostStateStore(database, workspaceId, undefined, undefined, undefined, undefined, root);
  const workRows = queryWorkspaceRowsUnknown(
    database,
    "SELECT workspace_id,kind,id,revision,payload,digest,CAST(payload AS BLOB) AS raw_payload_bytes FROM agent_host_state WHERE workspace_id=? AND kind='work' ORDER BY id",
    [workspaceId],
  ).map((row) => decodeWorkspaceSqlRow('agent_host_state', row, workspaceId));
  const targets = planSynthesisTargets({
    database,
    root,
    config,
    workspaceId,
    access,
    hostStore,
    workRows,
    changelogBefore,
  });
  required(
    targets.length > 0 && new Set(targets.map((target) => target.path)).size === targets.length,
    'active synthesis contour is empty or duplicated',
  );
  targets.sort((left, right) => cmp(left.path, right.path));
  const events = synthesisQualificationChangeEvents({ targets, repairId, actor, timestamp });
  const changelogAfter = changelogBefore + events.map((event) => `${canonicalJson(event)}\n`).join('');
  const body: Omit<SynthesisRepairPlan, 'digest'> = {
    schema: synthesisRepairPlanSchema,
    repair_id: repairId,
    workspace_id: workspaceId,
    config_digest: canonicalJsonDigest(config),
    selector_sha256: selectorSha256,
    actor,
    timestamp,
    changelog_path: changelogPath,
    changelog_before: changelogBefore,
    changelog_after: changelogAfter,
    changelog_before_sha256: sha(Buffer.from(changelogBefore)),
    changelog_after_sha256: sha(Buffer.from(changelogAfter)),
    targets,
  };
  return { ...body, digest: canonicalJsonDigest(body) };
}

/** The same event encoder used by the complete repair planner. */

function synthesisQualificationChangeEvents({
  targets,
  repairId,
  actor,
  timestamp,
}: {
  readonly targets: readonly SynthesisRepairTarget[];
  readonly repairId: string;
  readonly actor: string;
  readonly timestamp: string;
}) {
  return targets.map((target) => {
    return {
      schema: 'DocumentationChangeEvent/v1',
      event_id: `documentation-event-${canonicalJsonDigest({
        repairId,
        path: target.path,
        after: target.after_digest,
      }).slice(0, 48)}`,
      logical_edit_id: `ResearchSynthesis/v1:${target.path}`,
      work_id: target.work_id,
      source_revision: sourceRevisionForTarget(target),
      operation: 'finalize',
      document_id: target.artifact_id,
      path_before: target.path,
      path_after: target.path,
      before_sha256: target.before_sha256,
      after_sha256: target.after_sha256,
      actor,
      pointer: `.agent/work/${repairId}/repair-plan.v1.json`,
      timestamp,
    };
  });
}

function sourceRevisionForTarget(target: SynthesisRepairTarget): string {
  const after = parseJsonUnknown(target.after_record, '$.research_synthesis_record');
  if (!isPlainRecord(after) || typeof after.source_revision !== 'string')
    throw new Error('vida synthesis qualification repair: repaired record source revision invalid');
  return after.source_revision;
}

/* Native signatures above are converted; remaining JSDoc signature conversion starts here. */

function mappedJournal(
  state: MastraSessionLedgerState,
  target: SynthesisRepairTarget,
  changelogSha: string,
): MastraSessionLedgerState {
  let changed = 0;
  const mapItem = (item: MastraLedgerItem) => {
    if (item.request.action_id !== target.action_id) return item;
    required(
      item.issue_id === target.issue_id &&
        canonicalJsonDigest(item.observation) === canonicalJsonDigest(target.before_observation) &&
        canonicalJsonDigest(item.research_normalization) === canonicalJsonDigest(target.before_normalization),
      'journal item changed before qualification',
    );
    changed++;
    const before = requiredResearchNormalization(item);
    const body = {
      ...before,
      observation_digest: canonicalJsonDigest(target.after_observation),
      result_digest: target.after_digest,
      record_pre_sha256: target.before_sha256,
      record_sha256: target.after_sha256,
      changelog_pre_sha256: target.changelog_before_sha256,
      changelog_sha256: changelogSha,
      before_digest: target.before_digest,
    };
    const { digest: _oldDigest, ...withoutDigest } = body;
    const normalization = validateObservedResearchRecordPlan({
      ...withoutDigest,
      digest: canonicalJsonDigest(withoutDigest),
    });
    return {
      request: item.request,
      issue_id: item.issue_id,
      observation: target.after_observation,
      ...optionalHostReservation(item),
      ...optionalResearchActivation(item),
      research_normalization: normalization,
    };
  };
  const next = {
    ...state,
    items: state.items.map(mapItem),
    completed: state.completed.map((wave) => ({ ...wave, items: wave.items.map(mapItem) })),
  };
  required(changed === 1, 'repair target action is missing or duplicated');
  return next;
}

function requiredResearchNormalization(item: MastraLedgerItem): ObservedResearchRecordPlan {
  const before = item.research_normalization;
  if (!before) throw new Error('vida synthesis qualification repair: journal normalization is missing');
  return before;
}

function optionalHostReservation(item: MastraLedgerItem) {
  return item.host_reservation === undefined ? {} : { host_reservation: item.host_reservation };
}

function optionalResearchActivation(item: MastraLedgerItem) {
  return item.research_activation === undefined ? {} : { research_activation: item.research_activation };
}

function repairRows(
  plan: SynthesisRepairPlan,
  hostState: HostStateStore,
  root: string,
  allowApplied: boolean = false,
): { readonly work: Map<string, RepairWorkValue>; readonly journals: Map<string, RepairJournalValue> } {
  const work: Map<string, RepairWorkValue> = new Map();

  const journals: Map<string, RepairJournalValue> = new Map();
  for (const target of plan.targets) {
    const key = target.work_row.id;
    const priorWorkState = work.get(key) ?? createRepairWorkState(plan, hostState, target, key, allowApplied);
    work.set(key, mapRepairWorkTarget(priorWorkState, target));
    const jkey = `${target.work_id}\0${target.attempt}`;
    const priorJournalState = journals.get(jkey) ?? createRepairJournalState(plan, priorWorkState, target, root);
    journals.set(jkey, mapRepairJournalTarget(priorJournalState, target, plan.changelog_after_sha256));
  }
  for (const value of work.values()) advanceRepairWorkState(value);
  return { work, journals };
}

function advanceRepairWorkState(value: RepairWorkValue) {
  if (value.alreadyApplied) return;
  value.next = {
    ...value.next,
    revision: value.original.revision + 1,
    lifecycle: { ...value.next.lifecycle, revision: value.original.lifecycle.revision + 1 },
  };
  required(validateWorkState(value.next), 'planned WorkState postimage does not match current WorkState/v1');
}

function plannedWorkState(payload: string, target: SynthesisRepairTarget): WorkState {
  const value = parseJsonUnknown(payload, '$.work_row.payload');
  if (!validateWorkState(value))
    throw new Error('vida synthesis qualification repair: frozen repair WorkState preimage is invalid');
  const work = value;
  required(
    canonicalJson(work) === payload &&
      canonicalJsonDigest(work) === target.work_row.digest &&
      work.revision === target.work_row.revision,
    'frozen repair WorkState preimage is invalid',
  );
  return work;
}

function plannedWorkPostimage(
  plan: SynthesisRepairPlan,
  work: WorkState,
  target: SynthesisRepairTarget,
  key: string,
): WorkState {
  let value: RepairWorkValue = { prior: target.work_row, original: work, alreadyApplied: false, next: work };
  for (const entry of plan.targets.filter((candidate) => candidate.work_row.id === key))
    value = mapRepairWorkTarget(value, entry);
  advanceRepairWorkState(value);
  return value.next;
}

function createRepairWorkState(
  plan: SynthesisRepairPlan,
  hostState: HostStateStore,
  target: SynthesisRepairTarget,
  key: string,
  allowApplied: boolean,
): RepairWorkValue {
  const identity = workIdentityFromKey(key);
  required(identity, 'repair WorkState identity is invalid');
  const beforeimage = plannedWorkState(target.work_row.payload, target);
  required(beforeimage.workspace_id === plan.workspace_id, 'frozen repair WorkState workspace differs');
  const expectedPostimage = plannedWorkPostimage(plan, beforeimage, target, key);
  const current = hostState.readHostStateSnapshot(identity);
  const currentWork = current.work;
  const version = current.workVersion;
  if (!currentWork || !version) throw new Error('vida synthesis qualification repair: typed Host work is missing');
  const isPreimage = workPreimageMatches(currentWork, version, target);
  const isPostimage = allowApplied && workPostimageMatches(expectedPostimage, currentWork, version, target);
  required(
    currentWork.workspace_id === plan.workspace_id && (isPreimage || isPostimage),
    'repair WorkState preimage or postimage differs from its typed Host receipt',
  );
  return {
    prior: target.work_row,
    original: beforeimage,
    alreadyApplied: isPostimage,
    next: isPostimage ? expectedPostimage : beforeimage,
  };
}

function workPreimageMatches(work: WorkState, version: StateVersion, target: SynthesisRepairTarget) {
  return (
    version.revision === target.work_row.revision &&
    version.digest === target.work_row.digest &&
    canonicalJson(work) === target.work_row.payload
  );
}

function workPostimageMatches(
  expected: WorkState,
  current: WorkState,
  version: StateVersion,
  target: SynthesisRepairTarget,
) {
  return (
    version.revision === target.work_row.revision + 1 &&
    version.digest === canonicalJsonDigest(expected) &&
    canonicalJson(current) === canonicalJson(expected)
  );
}

function mapRepairWorkTarget(prior: RepairWorkValue, target: SynthesisRepairTarget): RepairWorkValue {
  if (prior.alreadyApplied) return prior;
  const artifacts = prior.next.artifacts.map((artifact) =>
    artifact.artifact_id === target.artifact_id &&
    artifact.path === target.path &&
    artifact.sha256 === target.before_sha256
      ? { ...artifact, sha256: target.after_sha256 }
      : artifact,
  );
  required(
    artifacts.some(
      (artifact) => artifact.artifact_id === target.artifact_id && artifact.sha256 === target.after_sha256,
    ),
    'old artifact is not exact',
  );
  return { ...prior, next: { ...prior.next, artifacts } };
}

function createRepairJournalState(
  plan: SynthesisRepairPlan,
  work: RepairWorkValue,
  target: SynthesisRepairTarget,
  root: string,
): RepairJournalValue {
  const original = parseMastraSessionLedgerState(
    parseJsonUnknown(target.journal_row.payload, '$.mastra_session_ledger'),
  );
  required(
    canonicalJsonDigest(original) === target.journal_row.digest &&
      original.workspace_id === plan.workspace_id &&
      original.work_id === target.work_id &&
      original.attempt === target.attempt,
    'repair journal preimage is invalid',
  );
  validateWorkSessionBinding(work.original, original, root);
  return { prior: target.journal_row, workId: target.work_id, attempt: target.attempt, original, next: original };
}

function mapRepairJournalTarget(
  prior: RepairJournalValue,
  target: SynthesisRepairTarget,
  changelogDigest: string,
): RepairJournalValue {
  return { ...prior, next: mappedJournal(prior.next, target, changelogDigest) };
}

/** One typed, maintenance-fenced CAS for the exact planned artifact and journal projection. */

function commitSynthesisQualificationRepair({
  database,
  hostState,
  maintenanceReceipt,
  plan,
  repositoryRoot,
}: {
  database: SqliteDatabase;
  hostState: HostStateStore;
  maintenanceReceipt: MaintenanceFenceReceipt;
  plan: SynthesisRepairPlan;
  repositoryRoot: string;
}) {
  required(
    plan.schema === 'VidaSynthesisQualificationRepairPlan/v1' &&
      canonicalJsonDigest((({ digest: _digest, ...body }) => body)(plan)) === plan.digest,
    'repair plan digest invalid',
  );
  const held = hostState.assertMaintenanceFence(maintenanceReceipt);
  required(
    held.status === 'held' && held.workspace_id === plan.workspace_id,
    'repair maintenance fence is not held for workspace',
  );
  const { work, journals } = hostState.withMaintenanceInspection(maintenanceReceipt, () =>
    repairRows(plan, hostState, path.resolve(repositoryRoot)),
  );
  return database.transaction(() => runRepairSqlTransaction(database, plan, held, work, journals)).immediate();
}

function runRepairSqlTransaction(
  database: SqliteDatabase,
  plan: SynthesisRepairPlan,
  held: MaintenanceFence,
  work: Map<string, RepairWorkValue>,
  journals: Map<string, RepairJournalValue>,
) {
  const preimages = validateRepairSqlPreimages(database, plan, held, work, journals);
  if (preimages.alreadyApplied) return { status: 'already_applied', repair_id: plan.repair_id, digest: plan.digest };
  updateRepairWorkRows(database, plan, work);
  updateRepairJournalRows(database, plan, journals);
  updateSharedCoordinationLedger(database, plan, preimages.ledger);
  database
    .query('INSERT INTO agent_host_synthesis_qualification_repair VALUES(?,?,?,?)')
    .run(plan.workspace_id, plan.repair_id, canonicalJson(plan), plan.digest);
  return { status: 'applied', repair_id: plan.repair_id, digest: plan.digest };
}

function validateRepairSqlPreimages(
  database: SqliteDatabase,
  plan: SynthesisRepairPlan,
  held: MaintenanceFence,
  work: Map<string, RepairWorkValue>,
  journals: Map<string, RepairJournalValue>,
): { readonly alreadyApplied: true } | { readonly alreadyApplied: false; readonly ledger: StateRevisionRow } {
  const typedFence = decodePayloadDigestRow(
    database
      .query<unknown, [string]>('SELECT payload,digest FROM agent_host_maintenance WHERE workspace_id=?')
      .get(plan.workspace_id),
  );
  required(
    typedFence?.digest === canonicalJsonDigest(held) && typedFence.payload === canonicalJson(held),
    'repair maintenance fence changed',
  );
  database.exec(
    'CREATE TABLE IF NOT EXISTS agent_host_synthesis_qualification_repair (workspace_id TEXT NOT NULL, repair_id TEXT NOT NULL, payload TEXT NOT NULL, digest TEXT NOT NULL, PRIMARY KEY(workspace_id,repair_id))',
  );
  const existing = decodePayloadDigestRow(
    database
      .query<unknown, [string, string]>(
        'SELECT payload,digest FROM agent_host_synthesis_qualification_repair WHERE workspace_id=? AND repair_id=?',
      )
      .get(plan.workspace_id, plan.repair_id),
  );
  if (existing) {
    required(
      existing.digest === plan.digest && existing.payload === canonicalJson(plan),
      'repair receipt conflicts with current operation',
    );
    return { alreadyApplied: true };
  }
  const ledger = decodeStateRevisionRow(
    database
      .query<unknown, [string]>(
        "SELECT revision,payload,digest FROM agent_host_state WHERE workspace_id=? AND kind='ledger' AND id='shared'",
      )
      .get(plan.workspace_id),
  );
  required(
    ledger && ledger.digest === coordinationLedgerDigest(parseJsonUnknown(ledger.payload, '$.coordination_ledger')),
    'shared coordination ledger changed',
  );
  assertRepairWorkPreimages(database, plan, work);
  assertRepairJournalPreimages(database, plan, journals);
  return { alreadyApplied: false, ledger };
}

function assertRepairWorkPreimages(
  database: SqliteDatabase,
  plan: SynthesisRepairPlan,
  work: Map<string, RepairWorkValue>,
) {
  for (const [id, value] of work) {
    const row = decodeStateRevisionRow(
      database
        .query<unknown, [string, string]>(
          "SELECT revision,payload,digest FROM agent_host_state WHERE workspace_id=? AND kind='work' AND id=?",
        )
        .get(plan.workspace_id, id),
    );
    required(
      row?.revision === value.prior.revision &&
        row.digest === value.prior.digest &&
        row.payload === value.prior.payload,
      'repair WorkState CAS changed',
    );
  }
}

function assertRepairJournalPreimages(
  database: SqliteDatabase,
  plan: SynthesisRepairPlan,
  journals: Map<string, RepairJournalValue>,
) {
  for (const value of journals.values()) {
    const row = decodeStateRevisionRow(
      database
        .query<unknown, [string, string, number]>(
          'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
        )
        .get(plan.workspace_id, value.workId, value.attempt),
    );
    required(
      row?.revision === value.prior.revision &&
        row.digest === value.prior.digest &&
        row.payload === value.prior.payload,
      'repair Mastra journal CAS changed',
    );
  }
}

function updateRepairWorkRows(database: SqliteDatabase, plan: SynthesisRepairPlan, work: Map<string, RepairWorkValue>) {
  for (const [id, value] of work) {
    const payload = canonicalJson(value.next);
    const changed = database
      .query(
        "UPDATE agent_host_state SET revision=?,payload=?,digest=? WHERE workspace_id=? AND kind='work' AND id=? AND revision=? AND digest=?",
      )
      .run(
        value.next.revision,
        payload,
        canonicalJsonDigest(value.next),
        plan.workspace_id,
        id,
        value.prior.revision,
        value.prior.digest,
      );
    required(changed.changes === 1, 'repair WorkState CAS lost');
  }
}

function updateRepairJournalRows(
  database: SqliteDatabase,
  plan: SynthesisRepairPlan,
  journals: Map<string, RepairJournalValue>,
) {
  for (const value of journals.values()) {
    const payload = canonicalJson(value.next);
    const changed = database
      .query(
        'UPDATE agent_host_mastra_session_ledger SET revision=?,payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=? AND revision=? AND digest=?',
      )
      .run(
        value.prior.revision + 1,
        payload,
        canonicalJsonDigest(value.next),
        plan.workspace_id,
        value.workId,
        value.attempt,
        value.prior.revision,
        value.prior.digest,
      );
    required(changed.changes === 1, 'repair Mastra journal CAS lost');
  }
}

function updateSharedCoordinationLedger(database: SqliteDatabase, plan: SynthesisRepairPlan, prior: StateRevisionRow) {
  const ledgerValue = parseJsonUnknown(prior.payload, '$.coordination_ledger');
  const validation = validateCoordinationLedgerV1(ledgerValue);
  required(validation.ok && validation.ledger, 'shared coordination ledger is invalid');
  const nextLedger = { ...validation.ledger, revision: validation.ledger.revision + 1 };
  const payload = coordinationLedgerJson(nextLedger);
  const changed = database
    .query(
      "UPDATE agent_host_state SET revision=?,payload=?,digest=? WHERE workspace_id=? AND kind='ledger' AND id='shared' AND revision=? AND digest=?",
    )
    .run(nextLedger.revision, payload, sha(payload), plan.workspace_id, prior.revision, prior.digest);
  required(changed.changes === 1, 'repair shared ledger CAS lost');
}

function currentHash(access: SafeRepositoryAccess, relative: string, label: string): string {
  return sha(access.readBytes(relative, label));
}

async function replacePlanned(
  access: SafeRepositoryAccess,
  relative: string,
  before: string,
  after: string,
  contents: string,
  label: string,
): Promise<'already_written' | 'written'> {
  const observed = currentHash(access, relative, label);
  if (observed === after) return 'already_written';
  required(observed === before, `${label} has third-party bytes`);
  await access.replaceAtomicAsync(relative, before, contents, label);
  required(currentHash(access, relative, label) === after, `${label} publication changed`);
  return 'written';
}

async function appendPhase(access: SafeRepositoryAccess, repairId: string, phase: RepairPhase) {
  const relative = `.agent/work/${repairId}/repair-journal.v1.jsonl`;
  const prior = access.fileExists(relative, 'synthesis repair journal')
    ? access.readText(relative, 'synthesis repair journal')
    : null;

  const lines: RepairEvent[] =
    prior === null
      ? []
      : prior
          .trimEnd()
          .split('\n')
          .map((line) => parseRepairEvent(parseJsonValue(line), repairId));
  required(prior === null || prior.endsWith('\n'), 'synthesis repair journal framing invalid');
  if (
    lines.some((entry) => entry.schema !== 'VidaSynthesisQualificationRepairEvent/v1' || entry.repair_id !== repairId)
  )
    throw new Error('synthesis repair journal differs');
  if (lines.some((entry) => entry.phase === phase)) return;
  const event = {
    schema: synthesisRepairEventSchema,
    repair_id: repairId,
    phase,
  };
  const next = `${prior ?? ''}${canonicalJson(event)}\n`;
  if (prior === null) await access.writeExclusiveAsync(relative, next, 'synthesis repair journal');
  else await access.replaceAtomicAsync(relative, sha(Buffer.from(prior)), next, 'synthesis repair journal');
}

/** Path-safe file CAS is replayable; the database transition is one later IMMEDIATE transaction. */

async function applySynthesisQualificationRepair({
  repositoryRoot,
  plan,
  database,
  hostState,
  maintenanceReceipt,
  onPhase,
}: {
  repositoryRoot: string;
  plan: SynthesisRepairPlan;
  database: SqliteDatabase;
  hostState: HostStateStore;
  maintenanceReceipt: MaintenanceFenceReceipt;
  onPhase?: (phase: string) => void;
}) {
  required(
    plan.schema === 'VidaSynthesisQualificationRepairPlan/v1' &&
      canonicalJsonDigest((({ digest: _digest, ...body }) => body)(plan)) === plan.digest,
    'frozen synthesis qualification plan invalid',
  );
  const root = path.resolve(repositoryRoot);
  const access = requireSafeRepositoryAccess(root);
  const config = loadRuntimeConfig(root);
  required(
    plan.workspace_id === deriveWorkspaceId(config.repository.repository_id, root) &&
      plan.config_digest === canonicalJsonDigest(config) &&
      plan.selector_sha256 ===
        sha(access.readBytes('.agent/active-runtime-selector.v1.json', 'active runtime selector')) &&
      plan.changelog_path === config.research_decision.paths.changelog &&
      plan.targets.length > 0,
    'repair configuration or contour changed',
  );
  hostState.assertMaintenanceFence(maintenanceReceipt);
  return access.withExclusiveLockAsync(`${plan.changelog_path}.lock`, 'synthesis qualification changelog lock', () =>
    applyUnderExclusiveLock({ root, config, plan, database, hostState, maintenanceReceipt, access, onPhase }),
  );
}

async function applyUnderExclusiveLock({
  root,
  config,
  plan,
  database,
  hostState,
  maintenanceReceipt,
  access,
  onPhase,
}: {
  readonly root: string;
  readonly config: AgentRuntimeConfig;
  readonly plan: SynthesisRepairPlan;
  readonly database: SqliteDatabase;
  readonly hostState: HostStateStore;
  readonly maintenanceReceipt: MaintenanceFenceReceipt;
  readonly access: SafeRepositoryAccess;
  readonly onPhase: ((phase: string) => void) | undefined;
}) {
  assertApplyPreimages(database, plan);
  await writeSynthesisRecordTargets(access, config, plan, onPhase);
  await replacePlanned(
    access,
    plan.changelog_path,
    plan.changelog_before_sha256,
    plan.changelog_after_sha256,
    plan.changelog_after,
    'synthesis qualification changelog',
  );
  await markRepairPhase(access, plan.repair_id, 'changelog', onPhase);
  const committed = commitSynthesisQualificationRepair({
    database,
    hostState,
    maintenanceReceipt,
    plan,
    repositoryRoot: root,
  });
  await markRepairPhase(access, plan.repair_id, 'database', onPhase);
  verifyAppliedSynthesisFiles(access, plan);
  await markRepairPhase(access, plan.repair_id, 'complete', onPhase);
  return {
    ...committed,
    changed_paths: plan.targets.map((target) => target.path),
    changelog_path: plan.changelog_path,
  };
}

function assertApplyPreimages(database: SqliteDatabase, plan: SynthesisRepairPlan) {
  const repairTable = Boolean(
    database
      .query<unknown, []>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_synthesis_qualification_repair'",
      )
      .get(),
  );
  const priorReceipt = repairTable
    ? decodePayloadDigestRow(
        database
          .query<unknown, [string, string]>(
            'SELECT payload,digest FROM agent_host_synthesis_qualification_repair WHERE workspace_id=? AND repair_id=?',
          )
          .get(plan.workspace_id, plan.repair_id),
      )
    : null;
  if (priorReceipt) {
    required(
      priorReceipt.digest === plan.digest && priorReceipt.payload === canonicalJson(plan),
      'synthesis repair receipt conflicts',
    );
    return;
  }
  assertApplyTargetPreimages(database, plan);
}

function assertApplyTargetPreimages(database: SqliteDatabase, plan: SynthesisRepairPlan) {
  for (const target of plan.targets) {
    const work = decodeStateRevisionRow(
      database
        .query<unknown, [string, string]>(
          "SELECT revision,payload,digest FROM agent_host_state WHERE workspace_id=? AND kind='work' AND id=?",
        )
        .get(plan.workspace_id, target.work_row.id),
    );
    required(
      work?.revision === target.work_row.revision &&
        work.digest === target.work_row.digest &&
        work.payload === target.work_row.payload,
      'repair WorkState preimage changed',
    );
    const journal = decodeStateRevisionRow(
      database
        .query<unknown, [string, string, number]>(
          'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
        )
        .get(plan.workspace_id, target.work_id, target.attempt),
    );
    required(
      journal?.revision === target.journal_row.revision &&
        journal.digest === target.journal_row.digest &&
        journal.payload === target.journal_row.payload,
      'repair journal preimage changed',
    );
  }
}

async function writeSynthesisRecordTargets(
  access: SafeRepositoryAccess,
  config: AgentRuntimeConfig,
  plan: SynthesisRepairPlan,
  onPhase: ((phase: string) => void) | undefined,
) {
  const archiveRoot = `.agent/work/${plan.repair_id}/archive`;
  await access.ensureDirectoryAsync(archiveRoot, 'synthesis repair archive');
  for (const [index, target] of plan.targets.entries()) {
    requireSynthesisTargetPath(config, target.path);
    const archive = `${archiveRoot}/record-${index}.json`;
    await ensureSynthesisArchive(access, archive, target.before_record, target.before_sha256);
    await replacePlanned(
      access,
      target.path,
      target.before_sha256,
      target.after_sha256,
      target.after_record,
      'qualified synthesis record',
    );
    await markRepairPhase(access, plan.repair_id, `record_${index}`, onPhase);
  }
}

function requireSynthesisTargetPath(config: AgentRuntimeConfig, targetPath: string) {
  required(
    targetPath.startsWith(`${config.research_decision.paths.research_records}/`) &&
      targetPath.endsWith('.synthesis.json'),
    'repair target path leaves configured synthesis root',
  );
}

async function ensureSynthesisArchive(access: SafeRepositoryAccess, archive: string, contents: string, digest: string) {
  if (!access.fileExists(archive, 'synthesis repair archive'))
    await access.writeExclusiveAsync(archive, contents, 'synthesis repair archive');
  required(
    currentHash(access, archive, 'synthesis repair archive') === digest,
    'synthesis repair archive differs from preimage',
  );
}

async function markRepairPhase(
  access: SafeRepositoryAccess,
  repairId: string,
  phase: RepairPhase,
  onPhase: ((phase: string) => void) | undefined,
) {
  await appendPhase(access, repairId, phase);
  onPhase?.(phase);
}

function verifyAppliedSynthesisFiles(access: SafeRepositoryAccess, plan: SynthesisRepairPlan) {
  for (const target of plan.targets)
    required(
      currentHash(access, target.path, 'qualified synthesis record') === target.after_sha256,
      'qualified synthesis record postimage changed',
    );
  required(
    currentHash(access, plan.changelog_path, 'synthesis qualification changelog') === plan.changelog_after_sha256,
    'synthesis qualification changelog postimage changed',
  );
}

const planRelative = (id: string) => `.agent/work/${id}/repair-plan.v1.json`;
const tokenRelative = (id: string) => `.agent/work/${id}/fence-token.v1.json`;
const regularDatabase = (root: string, config: AgentRuntimeConfig): string => {
  const access = requireSafeRepositoryAccess(root);
  access.assertDirectory(config.control.work_root, 'synthesis repair work root');
  const relative = sessionHandoffDatabaseRelativePath(config);
  required(access.fileExists(relative, 'synthesis repair database'), 'session database absent');
  const absolute = sessionHandoffDatabasePath(root, config);
  const stat = lstatSync(absolute);
  required(
    stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1,
    'session database is not a single-link regular file',
  );
  return absolute;
};

function parseCliPairs(args: readonly string[]) {
  required(args.length % 2 === 0, 'arguments must be paired');
  /** Exact-key validation below closes this dictionary before it is returned. */

  const values = Object.create(null) as Record<string, string>;
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    required(
      key !== undefined &&
        key.startsWith('--') &&
        value !== undefined &&
        value.length > 0 &&
        !Object.hasOwn(values, key),
      'arguments are missing or duplicate',
    );
    values[key] = value;
  }
  return values;
}

function validateSynthesisCliValues(values: Record<string, string>) {
  const mode = values['--mode'];
  const projectRoot = values['--project-root'];
  const repairId = values['--repair-id'];
  const contract = reconcileCliContracts['synthesis-qualification'];
  required(contract, 'synthesis qualification CLI contract is missing');
  required(
    values['--kind'] === 'synthesis-qualification' &&
      typeof mode === 'string' &&
      contract.modes.includes(mode) &&
      typeof projectRoot === 'string' &&
      path.isAbsolute(projectRoot) &&
      path.resolve(projectRoot) === projectRoot &&
      typeof repairId === 'string' &&
      /^[a-z0-9][a-z0-9._-]{0,79}$/.test(repairId),
    'kind, mode, root or repair ID invalid',
  );
  const expectedMode = requiredArgument(values, '--mode');
  const expected = reconcileExpectedOptions('synthesis-qualification', expectedMode, values) ?? [];
  required(
    canonicalJson(Object.keys(values).sort()) === canonicalJson(expected.sort()),
    'missing or unexpected arguments',
  );
}

function parsedArgs(args: readonly string[]) {
  const values = parseCliPairs(args);
  validateSynthesisCliValues(values);
  return values;
}

function requiredArgument(values: Record<string, string>, key: string): string {
  const value = values[key];
  required(typeof value === 'string' && value.length > 0, `required argument ${key} is missing`);
  return value;
}

function parseFenceToken(value: unknown, repairId: string): string {
  assertCanonicalJsonValue(value, '$.synthesis_repair_fence_token');
  if (
    !exactRecord(value, ['schema', 'repair_id', 'token']) ||
    value.schema !== 'VidaSynthesisRepairFenceToken/v1' ||
    value.repair_id !== repairId ||
    typeof value.token !== 'string' ||
    value.token.length === 0
  )
    throw new Error('vida synthesis qualification repair: saved fence token differs');
  return value.token;
}

function savedPlan(access: SafeRepositoryAccess, repairId: string): SynthesisRepairPlan {
  const raw = access.readText(planRelative(repairId), 'synthesis qualification plan');
  const plan = parseSynthesisRepairPlan(parseJsonValue(raw));
  required(
    raw === `${JSON.stringify(plan, null, 2)}\n` &&
      plan.repair_id === repairId &&
      plan.schema === 'VidaSynthesisQualificationRepairPlan/v1' &&
      canonicalJsonDigest((({ digest: _digest, ...body }) => body)(plan)) === plan.digest,
    'frozen synthesis qualification plan differs',
  );
  return plan;
}

function completedRepairReceipt(root: string, config: AgentRuntimeConfig, plan: SynthesisRepairPlan) {
  const access = requireSafeRepositoryAccess(root);
  const database = openCliWorkspaceDatabase(root, regularDatabase(root, config), plan.workspace_id, true);
  try {
    if (!completedReceiptReleased(database, plan)) return null;
    verifyCompletedDatabaseState(database, root, plan);
    verifyCompletedFiles(access, plan);
    return {
      status: 'already_applied',
      repair_id: plan.repair_id,
      digest: plan.digest,
      changed_paths: plan.targets.map((target) => target.path),
      changelog_path: plan.changelog_path,
    };
  } finally {
    closeWorkspaceDatabaseWithAdmission(database);
  }
}

function completedReceiptReleased(database: SqliteDatabase, plan: SynthesisRepairPlan) {
  const exists: unknown = database
    .query<unknown, []>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_synthesis_qualification_repair'",
    )
    .get();
  if (!exists) return false;
  const receipt = decodePayloadDigestRow(
    database
      .query<unknown, [string, string]>(
        'SELECT payload,digest FROM agent_host_synthesis_qualification_repair WHERE workspace_id=? AND repair_id=?',
      )
      .get(plan.workspace_id, plan.repair_id),
  );
  if (!receipt) return false;
  required(
    receipt.digest === plan.digest && receipt.payload === canonicalJson(plan),
    'completed synthesis receipt conflicts',
  );
  const maintenance = decodePayloadDigestRow(
    database
      .query<unknown, [string]>('SELECT payload,digest FROM agent_host_maintenance WHERE workspace_id=?')
      .get(plan.workspace_id),
  );
  required(maintenance, 'completed synthesis maintenance state is missing');
  const value = parseJsonUnknown(maintenance.payload, '$.maintenance_state');
  required(
    isPlainRecord(value) && typeof value.status === 'string',
    'completed synthesis maintenance state is invalid',
  );
  required(maintenance.digest === canonicalJsonDigest(value), 'completed synthesis repair maintenance state differs');
  return value.status !== 'held';
}

function verifyCompletedDatabaseState(database: SqliteDatabase, root: string, plan: SynthesisRepairPlan) {
  const hostState = createCliHostStateStore(
    database,
    plan.workspace_id,
    undefined,
    undefined,
    undefined,
    undefined,
    root,
    undefined,
    undefined,
    undefined,
    true,
  );
  const { work, journals } = repairRows(plan, hostState, root, true);
  verifyCompletedWorkRows(database, plan, work);
  verifyCompletedJournalRows(database, plan, journals);
}

function verifyCompletedWorkRows(
  database: SqliteDatabase,
  plan: SynthesisRepairPlan,
  work: Map<string, RepairWorkValue>,
) {
  for (const [id, value] of work) {
    const row = decodeStateRevisionRow(
      database
        .query<unknown, [string, string]>(
          "SELECT revision,payload,digest FROM agent_host_state WHERE workspace_id=? AND kind='work' AND id=?",
        )
        .get(plan.workspace_id, id),
    );
    required(
      row?.revision === value.next.revision &&
        row.payload === canonicalJson(value.next) &&
        row.digest === canonicalJsonDigest(value.next),
      'completed synthesis repair WorkState differs',
    );
  }
}

function verifyCompletedJournalRows(
  database: SqliteDatabase,
  plan: SynthesisRepairPlan,
  journals: Map<string, RepairJournalValue>,
) {
  for (const value of journals.values()) {
    const row = decodeStateRevisionRow(
      database
        .query<unknown, [string, string, number]>(
          'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
        )
        .get(plan.workspace_id, value.workId, value.attempt),
    );
    required(
      row?.revision === value.prior.revision + 1 &&
        row.payload === canonicalJson(value.next) &&
        row.digest === canonicalJsonDigest(value.next),
      'completed synthesis repair journal differs',
    );
  }
}

function verifyCompletedFiles(access: SafeRepositoryAccess, plan: SynthesisRepairPlan) {
  for (const [index, target] of plan.targets.entries()) {
    required(
      currentHash(access, target.path, 'qualified synthesis record') === target.after_sha256 &&
        currentHash(
          access,
          `.agent/work/${plan.repair_id}/archive/record-${index}.json`,
          'synthesis repair archive',
        ) === target.before_sha256,
      'completed synthesis repair record or archive differs',
    );
  }
  required(
    currentHash(access, plan.changelog_path, 'synthesis qualification changelog') === plan.changelog_after_sha256,
    'completed synthesis repair changelog differs',
  );
  const events = access
    .readText(`.agent/work/${plan.repair_id}/repair-journal.v1.jsonl`, 'synthesis repair journal')
    .trimEnd()
    .split('\n')
    .map((line) => parseRepairEvent(parseJsonUnknown(line, '$.synthesis_repair_event'), plan.repair_id));
  required(
    events.at(-1)?.phase === 'complete' &&
      events.at(-1)?.repair_id === plan.repair_id &&
      new Set(events.map((event) => event.phase)).size === events.length,
    'completed synthesis repair journal differs',
  );
}

function maintenanceBinding(
  root: string,
  config: AgentRuntimeConfig,
  plan: SynthesisRepairPlan,
): SynthesisMaintenanceInput {
  const access = requireSafeRepositoryAccess(root);
  const bundleDigest = activeSelectorDigest(access);
  const projectIds = config.projects.map((item) => item.project_id).sort();
  const binding: MaintenanceFenceBinding = {
    schema: maintenanceFenceBindingSchema,
    project_ids: projectIds,
    operation_id: plan.repair_id,
    manifest_digest: sha(Buffer.from(`${JSON.stringify(plan, null, 2)}\n`)),
    request_digest: plan.digest,
    bindings_digest: canonicalJsonDigest({
      paths: plan.targets.map((target) => target.path),
      changelog: plan.changelog_path,
    }),
    closure_digest: canonicalJsonDigest({
      repair_id: plan.repair_id,
      plan_digest: plan.digest,
      target_hashes: plan.targets.map((target) => target.after_sha256),
      changelog_hash: plan.changelog_after_sha256,
    }),
    bundle_digest: bundleDigest,
  };
  const verifier = {
    principal: 'vida-agent-local-synthesis-qualification-repair',
    projectIds,

    verify: async (fence: MaintenanceFence): Promise<MaintenanceReleaseAuthorization | null> => {
      if (canonicalJsonDigest(fence.binding) !== canonicalJsonDigest(binding)) return null;
      const db = openCliWorkspaceDatabase(root, regularDatabase(root, config), plan.workspace_id, true);
      try {
        const row = decodePayloadDigestRow(
          db
            .query<unknown, [string, string]>(
              'SELECT payload,digest FROM agent_host_synthesis_qualification_repair WHERE workspace_id=? AND repair_id=?',
            )
            .get(plan.workspace_id, plan.repair_id),
        );
        required(row?.digest === plan.digest && row.payload === canonicalJson(plan), 'repair receipt is incomplete');
      } finally {
        closeWorkspaceDatabaseWithAdmission(db);
      }
      for (const target of plan.targets)
        required(
          currentHash(access, target.path, 'qualified synthesis record') === target.after_sha256,
          'qualified synthesis record changed',
        );
      required(
        currentHash(access, plan.changelog_path, 'synthesis qualification changelog') === plan.changelog_after_sha256,
        'qualified changelog changed',
      );
      const events = access
        .readText(`.agent/work/${plan.repair_id}/repair-journal.v1.jsonl`, 'synthesis repair journal')
        .trimEnd()
        .split('\n')
        .map((line) => parseRepairEvent(parseJsonValue(line), plan.repair_id));
      required(
        events.at(-1)?.phase === 'complete' && events.at(-1)?.repair_id === plan.repair_id,
        'repair journal is incomplete',
      );
      return {
        schema: maintenanceReleaseAuthorizationSchema,
        principal: verifier.principal,
        fence_digest: canonicalJsonDigest(fence),
        closure_digest: binding.closure_digest,
        bundle_digest: binding.bundle_digest,
      };
    },
  };
  return { binding, verifier };
}

function activeSelectorDigest(access: SafeRepositoryAccess): string {
  const selector = parseJsonUnknown(
    access.readText('.agent/active-runtime-selector.v1.json', 'active runtime selector'),
    '$.active_runtime_selector',
  );
  required(
    isPlainRecord(selector) && typeof selector.payload_manifest_sha256 === 'string',
    'active runtime selector invalid',
  );
  required(/^[a-f0-9]{64}$/.test(selector.payload_manifest_sha256), 'active bundle digest unavailable');
  return selector.payload_manifest_sha256;
}

function canonicalRepairRoot(values: ReturnType<typeof parsedArgs>): string {
  const root = requiredArgument(values, '--project-root');
  required(
    typeof root === 'string' && path.isAbsolute(root) && path.resolve(root) === root,
    'project root must be canonical',
  );
  return root;
}

/** Existing packaged reconcile-artifacts entrypoint owns this current-v1 repair branch. */

export async function runSynthesisQualificationRepair(
  args: readonly string[],
  { onPhase }: { readonly onPhase?: (phase: string) => void } = {},
) {
  const values = parsedArgs(args);
  const root = canonicalRepairRoot(values);
  const config = loadRuntimeConfig(root);
  const access = requireSafeRepositoryAccess(root);
  const mode = values['--mode'];
  const repairId = requiredArgument(values, '--repair-id');
  const file = regularDatabase(root, config);
  if (mode === 'inspect' || mode === 'plan') {
    const database = openCliWorkspaceDatabase(
      root,
      file,
      deriveWorkspaceId(config.repository.repository_id, root),
      true,
    );
    let plan: SynthesisRepairPlan;
    try {
      plan = planSynthesisQualificationRepair({
        repositoryRoot: root,
        database,
        repairId,
        actor: requiredArgument(values, '--actor'),
        timestamp: requiredArgument(values, '--timestamp'),
      });
    } finally {
      closeWorkspaceDatabaseWithAdmission(database);
    }
    if (mode === 'plan') {
      access.ensureDirectory(`.agent/work/${repairId}`, 'synthesis qualification work root');
      access.writeExclusive(
        planRelative(repairId),
        `${JSON.stringify(plan, null, 2)}\n`,
        'synthesis qualification plan',
      );
    }
    return {
      status: mode === 'plan' ? 'planned' : 'repairable_current_v1',
      repair_id: repairId,
      plan_digest: plan.digest,
      changed_paths: plan.targets.map((target) => target.path),
      dependent_artifacts: plan.targets.map((target) => ({
        work_id: target.work_id,
        attempt: target.attempt,
        action_id: target.action_id,
      })),
    };
  }
  const plan = savedPlan(access, repairId);
  const completed = completedRepairReceipt(root, config, plan);
  if (completed) return completed;
  const { binding, verifier } = maintenanceBinding(root, config, plan);
  const tokenPath = tokenRelative(repairId);
  let token: string;
  if (access.fileExists(tokenPath, 'synthesis repair fence token')) {
    token = parseFenceToken(parseJsonValue(access.readText(tokenPath, 'synthesis repair fence token')), repairId);
  } else {
    required(mode === 'apply', 'repair fence token must exist for resume');
    token = randomUUID();
    access.writeExclusive(
      tokenPath,
      `${JSON.stringify({ schema: 'VidaSynthesisRepairFenceToken/v1', repair_id: repairId, token }, null, 2)}\n`,
      'synthesis repair fence token',
    );
  }
  required(typeof plan.workspace_id === 'string', 'repair workspace identity is missing');
  const database = openCliWorkspaceDatabase(root, file, plan.workspace_id, false);
  try {
    const hostState = createCliHostStateStore(
      database,
      plan.workspace_id,
      undefined,
      undefined,
      undefined,
      verifier,
      root,
    );
    const maintenanceReceipt = hostState.acquireMaintenanceFenceWithRecordedToken(binding, token);
    if (mode === 'apply') {
      const fresh = hostState.withMaintenanceInspection(maintenanceReceipt, () =>
        planSynthesisQualificationRepair({
          repositoryRoot: root,
          database,
          repairId,
          actor: plan.actor,
          timestamp: plan.timestamp,
          hostState,
        }),
      );
      required(fresh.digest === plan.digest, 'saved repair plan differs from current preimages');
    }
    const result = await applySynthesisQualificationRepair({
      repositoryRoot: root,
      plan,
      database,
      hostState,
      maintenanceReceipt,
      ...(onPhase === undefined ? {} : { onPhase }),
    });
    await hostState.releaseMaintenanceFence(maintenanceReceipt);
    return { ...result, maintenance_generation: maintenanceReceipt.fence.generation };
  } finally {
    closeWorkspaceDatabaseWithAdmission(database);
  }
}
