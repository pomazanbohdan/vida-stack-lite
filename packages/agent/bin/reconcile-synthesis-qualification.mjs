import {
  createCliHostStateStore,
  closeWorkspaceDatabaseWithAdmission,
  openCliWorkspaceDatabase,
} from './workspace-database-cli.ts';
import { reconcileCliContracts, reconcileExpectedOptions } from './reconcile-cli-contracts.ts';
import { createHash, randomUUID } from 'node:crypto';
import { lstatSync, readdirSync } from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
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
import {
  qualifiedResearchSourceCatalog,
  qualifyLegacySynthesisCitations,
  qualifyLegacySynthesisRecord,
} from '../src/research-source-catalog.ts';
import {
  validateResearchResult,
  validateResearchSynthesis,
  validateSynthesisReferencesForResults,
  validateSynthesisExternalValidationForResults,
  validateObservedResearchRecordPlan,
} from '../src/research-decision.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
/** @typedef {import('../src/host-state.ts').HostStateStore} HostStateStore */
import { sessionHandoffDatabasePath, sessionHandoffDatabaseRelativePath } from '../src/config/project-paths.ts';
import { queryWorkspaceRowsUnknown } from '../src/config/workspace-database.ts';
import { decodeWorkspaceSqlRow } from '../src/config/host-persisted-row.ts';
import { parseMastraSessionLedgerState } from '../src/orchestration/mastra-session-ledger-codec.ts';
import { validateWorkSessionBinding } from '../src/orchestration/final-assurance.ts';
import { parseSessionBridgeObservation } from '../src/orchestration/mastra-session-bridge-contract.ts';
/** @typedef {import('../src/config/runtime-config.ts').AgentRuntimeConfig} AgentRuntimeConfig */
/** @typedef {import('../src/config/safe-repository-access.ts').SafeRepositoryAccess} SafeRepositoryAccess */
/** @typedef {import('../src/research-source-catalog.ts').ResearchResultRef} ResearchResultRef */
/** @typedef {import('../src/research-source-catalog.ts').QualifiedResearchSource} QualifiedResearchSource */
/** @typedef {import('../src/research-decision.ts').ResearchResult} ResearchResult */
/** @typedef {import('../src/research-decision.ts').ResearchSynthesis} ResearchSynthesis */
/** @typedef {import('../src/research-decision.ts').ObservedResearchRecordPlan} ObservedResearchRecordPlan */
/** @typedef {import('../src/orchestration/persistent-session-handoff.ts').MastraSessionLedgerState} MastraSessionLedgerState */
/** @typedef {import('../src/orchestration/persistent-session-handoff.ts').MastraLedgerItem} MastraLedgerItem */
/** @typedef {import('../src/orchestration/mastra-session-bridge.ts').SessionBridgeObservation} SessionBridgeObservation */
/** @typedef {import('../src/host-state.ts').WorkArtifactReference} WorkArtifactReference */
/** @typedef {import('../src/host-state.ts').WorkIdentity} WorkIdentity */
/** @typedef {import('../src/host-state.ts').WorkState} WorkState */
/** @typedef {import('../src/host-state.ts').StateVersion} StateVersion */
/** @typedef {import('../src/host-state.ts').MaintenanceFenceReceipt} MaintenanceFenceReceipt */
/** @typedef {import('../src/host-state.ts').MaintenanceFence} MaintenanceFence */
/** @typedef {import('../src/host-state.ts').MaintenanceFenceBinding} MaintenanceFenceBinding */
/** @typedef {import('../src/host-state.ts').MaintenanceReleaseAuthorization} MaintenanceReleaseAuthorization */
/** @typedef {import('../src/config/host-persisted-row.ts').WorkspaceStateSqlRow} WorkspaceStateSqlRow */
/** @typedef {import('../src/config/host-persisted-row.ts').WorkspaceMastraSqlRow} WorkspaceMastraSqlRow */
/** @typedef {import('bun:sqlite').Database} SqliteDatabase */
/** @typedef {{readonly id: string; readonly revision: number; readonly digest: string; readonly payload: string}} RepairWorkRow */
/** @typedef {{readonly revision: number; readonly digest: string; readonly payload: string}} RepairJournalRow */
/** @typedef {{readonly path: string; readonly artifact_id: string; readonly before_sha256: string; readonly after_sha256: string; readonly before_digest: string; readonly after_digest: string; readonly action_id: string; readonly issue_id: string; readonly work_id: string; readonly attempt: number; readonly before_record: string; readonly after_record: string; readonly before_observation: SessionBridgeObservation; readonly after_observation: SessionBridgeObservation; readonly before_normalization: ObservedResearchRecordPlan; readonly changelog_before_sha256: string; readonly work_row: RepairWorkRow; readonly journal_row: RepairJournalRow}} SynthesisRepairTarget */
/** @typedef {{readonly schema: 'VidaSynthesisQualificationRepairPlan/v1'; readonly repair_id: string; readonly workspace_id: string; readonly config_digest: string; readonly selector_sha256: string; readonly actor: string; readonly timestamp: string; readonly changelog_path: string; readonly changelog_before: string; readonly changelog_after: string; readonly changelog_before_sha256: string; readonly changelog_after_sha256: string; readonly targets: readonly SynthesisRepairTarget[]; readonly digest: string}} SynthesisRepairPlan */
/** @typedef {{readonly prior: RepairWorkRow; readonly original: WorkState; readonly alreadyApplied: boolean; next: WorkState}} RepairWorkValue */
/** @typedef {{readonly prior: RepairJournalRow; readonly workId: string; readonly attempt: number; readonly original: MastraSessionLedgerState; next: MastraSessionLedgerState}} RepairJournalValue */
/** @typedef {{readonly payload: string; readonly digest: string}} PayloadDigestRow */
/** @typedef {{readonly revision: number; readonly payload: string; readonly digest: string}} StateRevisionRow */
/** @typedef {'changelog' | 'database' | 'complete' | `record_${number}`} RepairPhase */
/** @typedef {{readonly schema: 'VidaSynthesisQualificationRepairEvent/v1'; readonly repair_id: string; readonly phase: RepairPhase}} RepairEvent */
/** @typedef {{readonly binding: MaintenanceFenceBinding; readonly verifier: import('../src/host-state.ts').MaintenanceReleaseVerifier}} SynthesisMaintenanceInput */
/** @typedef {Record<string, unknown> & {path: string; artifact_id: string; before_sha256: string; after_sha256: string; before_digest: string; after_digest: string; action_id: string; issue_id: string; work_id: string; attempt: number; before_record: string; after_record: string; changelog_before_sha256: string; work_row: RepairWorkRow; journal_row: RepairJournalRow}} SynthesisRepairTargetInput */
/** @typedef {Record<string, unknown> & {schema: 'VidaSynthesisQualificationRepairPlan/v1'; repair_id: string; workspace_id: string; config_digest: string; selector_sha256: string; actor: string; timestamp: string; changelog_path: string; changelog_before: string; changelog_after: string; changelog_before_sha256: string; changelog_after_sha256: string; targets: unknown[]; digest: string}} SynthesisRepairPlanInput */

const Ajv2020Constructor =
  /** @type {new (options: object) => {compile(schema: object): import('ajv').ValidateFunction<WorkState>}} */ (
    /** @type {unknown} */ (Ajv2020)
  );
const validateWorkState = new Ajv2020Constructor({ allErrors: true }).compile(workSchema);

/** @param {unknown} value @param {readonly string[]} keys @returns {value is Record<string, unknown>} */
function exactRecord(value, keys) {
  return (
    isPlainRecord(value) &&
    Reflect.ownKeys(value).length === keys.length &&
    Reflect.ownKeys(value).every((key) => typeof key === 'string' && keys.includes(key))
  );
}

/** @param {unknown} value @returns {PayloadDigestRow | null} */
function decodePayloadDigestRow(value) {
  if (value === null || value === undefined) return null;
  if (!exactRecord(value, ['payload', 'digest']) || typeof value.payload !== 'string' || !isDigest(value.digest))
    throw new Error('vida synthesis qualification repair: SQL payload row invalid');
  return { payload: value.payload, digest: value.digest };
}

/** @param {unknown} value @returns {StateRevisionRow | null} */
function decodeStateRevisionRow(value) {
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

/** @param {unknown} value @returns {value is string[]} */
function isSortedProjectIds(value) {
  if (!Array.isArray(value) || value.length === 0) return false;
  const values = /** @type {unknown[]} */ (value);
  return values.every((projectId, index) => {
    const previous = index === 0 ? undefined : values[index - 1];
    return (
      typeof projectId === 'string' &&
      projectId.length > 0 &&
      (index === 0 || (typeof previous === 'string' && previous < projectId))
    );
  });
}

/** @param {unknown} value @returns {value is [string, string[], string, string]} */
function isWorkIdentityKeyTuple(value) {
  if (!Array.isArray(value)) return false;
  const tuple = /** @type {unknown[]} */ (value);
  return (
    tuple.length === 4 &&
    isNonemptyString(tuple[0]) &&
    isSortedProjectIds(tuple[1]) &&
    isNonemptyString(tuple[2]) &&
    isNonemptyString(tuple[3])
  );
}

/** @param {unknown} value @returns {value is string} */
function isNonemptyString(value) {
  return typeof value === 'string' && value.length > 0;
}

/** @param {string} text @param {string} label @returns {unknown} */
function parseJsonUnknown(text, label) {
  const value = /** @type {unknown} */ (JSON.parse(text));
  assertCanonicalJsonValue(value, label);
  return value;
}

/** @param {unknown} value @param {string} repairId @returns {RepairEvent} */
function parseRepairEvent(value, repairId) {
  if (
    !exactRecord(value, ['schema', 'repair_id', 'phase']) ||
    value.schema !== 'VidaSynthesisQualificationRepairEvent/v1' ||
    value.repair_id !== repairId ||
    !isRepairPhase(value.phase)
  )
    throw new Error('vida synthesis qualification repair: repair journal event invalid');
  return { schema: 'VidaSynthesisQualificationRepairEvent/v1', repair_id: repairId, phase: value.phase };
}

/** @param {unknown} value @returns {value is RepairPhase} */
function isRepairPhase(value) {
  return (
    value === 'changelog' ||
    value === 'database' ||
    value === 'complete' ||
    (typeof value === 'string' && /^record_(0|[1-9][0-9]*)$/.test(value))
  );
}

/** @param {unknown} value @returns {value is string} */
function isDigest(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
}

/** @param {unknown} value @returns {value is {readonly id: string; readonly revision: number; readonly digest: string; readonly payload: string}} */
function isRepairWorkRow(value) {
  return (
    exactRecord(value, ['id', 'revision', 'digest', 'payload']) &&
    typeof value.id === 'string' &&
    isPositiveInteger(value.revision) &&
    isDigest(value.digest) &&
    typeof value.payload === 'string'
  );
}

/** @param {unknown} value @returns {value is {readonly revision: number; readonly digest: string; readonly payload: string}} */
function isRepairJournalRow(value) {
  return (
    exactRecord(value, ['revision', 'digest', 'payload']) &&
    isPositiveInteger(value.revision) &&
    isDigest(value.digest) &&
    typeof value.payload === 'string'
  );
}

/** @param {unknown} value @returns {value is number} */
function isPositiveInteger(value) {
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

/** @param {unknown} value @returns {value is SynthesisRepairTargetInput} */
function isSynthesisRepairTargetFields(value) {
  return (
    exactRecord(value, synthesisTargetKeys) &&
    isRepairWorkRow(value.work_row) &&
    isRepairJournalRow(value.journal_row) &&
    isSynthesisRepairTargetTextFields(value) &&
    isSynthesisRepairTargetDigestFields(value)
  );
}

/** @param {Record<string, unknown>} value */
function isSynthesisRepairTargetTextFields(value) {
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

/** @param {Record<string, unknown>} value */
function isSynthesisRepairTargetDigestFields(value) {
  return (
    isDigest(value.before_sha256) &&
    isDigest(value.after_sha256) &&
    isDigest(value.before_digest) &&
    isDigest(value.after_digest) &&
    isDigest(value.action_id) &&
    isDigest(value.changelog_before_sha256)
  );
}

/** @param {unknown} value @returns {SynthesisRepairTarget} */
function parseSynthesisRepairTarget(value) {
  if (!isSynthesisRepairTargetFields(value))
    throw new Error('vida synthesis qualification repair: target fields invalid');
  const workRow = value.work_row;
  const journalRow = value.journal_row;
  return {
    path: value.path,
    artifact_id: value.artifact_id,
    before_sha256: value.before_sha256,
    after_sha256: value.after_sha256,
    before_digest: value.before_digest,
    after_digest: value.after_digest,
    action_id: value.action_id,
    issue_id: value.issue_id,
    work_id: value.work_id,
    attempt: value.attempt,
    before_record: value.before_record,
    after_record: value.after_record,
    before_observation: parseSessionBridgeObservation(value.before_observation),
    after_observation: parseSessionBridgeObservation(value.after_observation),
    before_normalization: validateObservedResearchRecordPlan(value.before_normalization),
    changelog_before_sha256: value.changelog_before_sha256,
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

/** Validate the complete persisted current repair plan before it reaches mutation code. @param {unknown} value @returns {SynthesisRepairPlan} */
/** @param {unknown} value @returns {value is SynthesisRepairPlanInput} */
function isSynthesisRepairPlanFields(value) {
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

/** @param {Record<string, unknown>} value */
function isSynthesisRepairPlanIdentity(value) {
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

/** @param {Record<string, unknown>} value */
function isSynthesisRepairPlanContent(value) {
  return (
    isSynthesisRepairPlanAttribution(value) &&
    isSynthesisRepairPlanText(value) &&
    isSynthesisRepairPlanPostimages(value)
  );
}

/** @param {Record<string, unknown>} value */
function isSynthesisRepairPlanAttribution(value) {
  return (
    typeof value.actor === 'string' &&
    value.actor.length > 0 &&
    typeof value.timestamp === 'string' &&
    !Number.isNaN(Date.parse(value.timestamp))
  );
}

/** @param {Record<string, unknown>} value */
function isSynthesisRepairPlanText(value) {
  return (
    typeof value.changelog_path === 'string' &&
    typeof value.changelog_before === 'string' &&
    typeof value.changelog_after === 'string'
  );
}

/** @param {Record<string, unknown>} value */
function isSynthesisRepairPlanPostimages(value) {
  return (
    isDigest(value.changelog_before_sha256) &&
    isDigest(value.changelog_after_sha256) &&
    Array.isArray(value.targets) &&
    value.targets.length > 0
  );
}

/** @param {unknown} value @returns {SynthesisRepairPlan} */
function parseSynthesisRepairPlan(value) {
  assertCanonicalJsonValue(value, '$.synthesis_qualification_repair');
  if (!isSynthesisRepairPlanFields(value)) throw new Error('vida synthesis qualification repair: plan fields invalid');
  const targetValues = /** @type {unknown[]} */ (value.targets);
  const targets = targetValues.map(parseSynthesisRepairTarget);
  const { digest, ...body } = value;
  if (canonicalJsonDigest(body) !== digest) throw new Error('vida synthesis qualification repair: plan digest invalid');
  return {
    schema: /** @type {const} */ ('VidaSynthesisQualificationRepairPlan/v1'),
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

/** @param {string | Uint8Array} bytes */
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
/** @type {(condition: unknown, message: string) => asserts condition} */
const required = (condition, message) => {
  if (!condition) throw new Error(`vida synthesis qualification repair: ${message}`);
};
/** @param {string} a @param {string} b */
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
/** @param {unknown} value */
const recordBytes = (value) => `${JSON.stringify(JSON.parse(canonicalJson(value)), null, 2)}\n`;

/** @param {unknown} value @returns {WorkIdentity | null} */
function workIdentityFromKey(value) {
  if (typeof value !== 'string') return null;
  let decoded;
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

/** @param {WorkspaceStateSqlRow} row @param {HostStateStore} store @param {string} workspaceId @returns {{readonly work: WorkState; readonly row: RepairWorkRow}} */
function currentWorkFromRow(row, store, workspaceId) {
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

/** @param {string} root @param {AgentRuntimeConfig} config @param {readonly ResearchResultRef[]} references @param {string} workId @param {string} sourceRevision @param {string} scopeId */
function observedSources(root, config, references, workId, sourceRevision, scopeId) {
  const access = requireSafeRepositoryAccess(root);
  const directory = config.research_decision.paths.research_records;
  /** @type {Map<string, ResearchResult>} */
  const byId = new Map();
  for (const name of readdirSync(path.join(root, directory))) {
    if (!name.endsWith('.research.json')) continue;
    const result = validateResearchResult(JSON.parse(access.readText(`${directory}/${name}`, 'research predecessor')));
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

/** @param {SessionBridgeObservation} observation @param {readonly QualifiedResearchSource[]} catalog */
function normalizeObservation(observation, catalog) {
  required(
    observation?.status === 'reported_complete' && typeof observation.summary === 'string',
    'native synthesis observation is not complete',
  );
  const original = validateResearchSynthesis(JSON.parse(observation.summary));
  const qualified = validateResearchSynthesis(qualifyLegacySynthesisCitations(original, catalog));
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

/** @param {MastraSessionLedgerState} state @param {WorkArtifactReference} artifact */
function itemForArtifact(state, artifact) {
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

/** @param {MastraLedgerItem[]} matches @returns {MastraLedgerItem} */
function exactSynthesisItem(matches) {
  const item = matches[0];
  if (matches.length !== 1 || !item)
    throw new Error('vida synthesis qualification repair: synthesis artifact has no exact journal normalization');
  return item;
}

/** @param {MastraSessionLedgerState} state @param {WorkArtifactReference} artifact */
function journalHasArtifact(state, artifact) {
  const items = [...state.completed.flatMap((wave) => wave.items), ...state.items];
  return items.some(
    (item) =>
      item.research_normalization?.record_path === artifact.path &&
      item.research_normalization.record_sha256 === artifact.sha256,
  );
}

/** @param {SqliteDatabase} database @param {string} workspaceId @param {WorkState} work @param {WorkArtifactReference} artifact @param {string} root @returns {{readonly row: WorkspaceMastraSqlRow; readonly value: MastraSessionLedgerState}} */
function journalForArtifact(database, workspaceId, work, artifact, root) {
  const rows = queryWorkspaceRowsUnknown(
    database,
    'SELECT workspace_id,work_id,attempt,revision,payload,digest,CAST(payload AS BLOB) AS raw_payload_bytes FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? ORDER BY attempt',
    [workspaceId, work.binding.lifecycle_work_id],
  ).map((row) => decodeWorkspaceSqlRow('agent_host_mastra_session_ledger', row, workspaceId));
  /** @type {Array<{readonly row: WorkspaceMastraSqlRow; readonly value: MastraSessionLedgerState}>} */
  const matches = [];
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

/** @param {WorkState} work */
function requireQuiescentSynthesisOwner(work) {
  required(
    work.execution.status === 'suspended' &&
      work.lease === null &&
      work.lifecycle.phase !== 'COMPLETE' &&
      work.lifecycle.phase !== 'DELIVERY',
    'active synthesis owner is not quiescent for qualification',
  );
}

/** @param {{readonly database: SqliteDatabase; readonly root: string; readonly config: AgentRuntimeConfig; readonly workspaceId: string; readonly access: SafeRepositoryAccess; readonly current: ReturnType<typeof currentWorkFromRow>; readonly artifact: WorkArtifactReference; readonly changelogBefore: string}} input @returns {SynthesisRepairTarget} */
function planSynthesisTarget({ database, root, config, workspaceId, access, current, artifact, changelogBefore }) {
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

/** @param {{readonly database: SqliteDatabase; readonly root: string; readonly config: AgentRuntimeConfig; readonly workspaceId: string; readonly access: SafeRepositoryAccess; readonly hostStore: HostStateStore; readonly workRows: readonly WorkspaceStateSqlRow[]; readonly changelogBefore: string}} input @returns {SynthesisRepairTarget[]} */
function planSynthesisTargets({ database, root, config, workspaceId, access, hostStore, workRows, changelogBefore }) {
  const targets = [];
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
 * @param {{repositoryRoot: string; repairId: string; actor: string; timestamp: string; database: SqliteDatabase}} input
 * @returns {SynthesisRepairPlan}
 */
function planSynthesisQualificationRepair({ repositoryRoot, repairId, actor, timestamp, database }) {
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
  const hostStore = createCliHostStateStore(database, workspaceId, undefined, undefined, undefined, undefined, root);
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
  const body = {
    schema: /** @type {const} */ ('VidaSynthesisQualificationRepairPlan/v1'),
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
/** @param {{readonly targets: readonly SynthesisRepairTarget[]; readonly repairId: string; readonly actor: string; readonly timestamp: string}} input */
function synthesisQualificationChangeEvents({ targets, repairId, actor, timestamp }) {
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

/** @param {SynthesisRepairTarget} target @returns {string} */
function sourceRevisionForTarget(target) {
  const after = parseJsonUnknown(target.after_record, '$.research_synthesis_record');
  if (!isPlainRecord(after) || typeof after.source_revision !== 'string')
    throw new Error('vida synthesis qualification repair: repaired record source revision invalid');
  return after.source_revision;
}

/** @param {{repositoryRoot: string; repairId: string; actor: string; timestamp: string}} input */
function inspectSynthesisQualificationRepair({ repositoryRoot, repairId, actor, timestamp }) {
  const config = loadRuntimeConfig(repositoryRoot);
  const dbPath = sessionHandoffDatabasePath(repositoryRoot, config);
  const db = openCliWorkspaceDatabase(
    repositoryRoot,
    dbPath,
    deriveWorkspaceId(config.repository.repository_id, repositoryRoot),
    true,
  );
  try {
    return planSynthesisQualificationRepair({ repositoryRoot, repairId, actor, timestamp, database: db });
  } finally {
    closeWorkspaceDatabaseWithAdmission(db);
  }
}

/** @param {MastraSessionLedgerState} state @param {SynthesisRepairTarget} target @param {string} changelogSha @returns {MastraSessionLedgerState} */
function mappedJournal(state, target, changelogSha) {
  let changed = 0;
  /** @param {MastraLedgerItem} item */
  const mapItem = (item) => {
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

/** @param {MastraLedgerItem} item @returns {ObservedResearchRecordPlan} */
function requiredResearchNormalization(item) {
  const before = item.research_normalization;
  if (!before) throw new Error('vida synthesis qualification repair: journal normalization is missing');
  return before;
}

/** @param {MastraLedgerItem} item */
function optionalHostReservation(item) {
  return item.host_reservation === undefined ? {} : { host_reservation: item.host_reservation };
}

/** @param {MastraLedgerItem} item */
function optionalResearchActivation(item) {
  return item.research_activation === undefined ? {} : { research_activation: item.research_activation };
}

/** @param {SynthesisRepairPlan} plan @param {HostStateStore} hostState @param {string} root @param {boolean} [allowApplied] @returns {{readonly work: Map<string, RepairWorkValue>; readonly journals: Map<string, RepairJournalValue>}} */
function repairRows(plan, hostState, root, allowApplied = false) {
  /** @type {Map<string, RepairWorkValue>} */
  const work = new Map();
  /** @type {Map<string, RepairJournalValue>} */
  const journals = new Map();
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

/** @param {RepairWorkValue} value */
function advanceRepairWorkState(value) {
  if (value.alreadyApplied) return;
  value.next = {
    ...value.next,
    revision: value.original.revision + 1,
    lifecycle: { ...value.next.lifecycle, revision: value.original.lifecycle.revision + 1 },
  };
  required(validateWorkState(value.next), 'planned WorkState postimage does not match current WorkState/v1');
}

/** @param {string} payload @param {SynthesisRepairTarget} target @returns {WorkState} */
function plannedWorkState(payload, target) {
  const value = parseJsonUnknown(payload, '$.work_row.payload');
  const work = /** @type {WorkState} */ (value);
  required(
    validateWorkState(work) &&
      canonicalJson(work) === payload &&
      canonicalJsonDigest(work) === target.work_row.digest &&
      work.revision === target.work_row.revision,
    'frozen repair WorkState preimage is invalid',
  );
  return work;
}

/** @param {SynthesisRepairPlan} plan @param {WorkState} work @param {SynthesisRepairTarget} target @param {string} key @returns {WorkState} */
function plannedWorkPostimage(plan, work, target, key) {
  /** @type {RepairWorkValue} */
  let value = { prior: target.work_row, original: work, alreadyApplied: false, next: work };
  for (const entry of plan.targets.filter((candidate) => candidate.work_row.id === key))
    value = mapRepairWorkTarget(value, entry);
  advanceRepairWorkState(value);
  return value.next;
}

/** @param {SynthesisRepairPlan} plan @param {HostStateStore} hostState @param {SynthesisRepairTarget} target @param {string} key @param {boolean} allowApplied @returns {RepairWorkValue} */
function createRepairWorkState(plan, hostState, target, key, allowApplied) {
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

/** @param {WorkState} work @param {StateVersion} version @param {SynthesisRepairTarget} target */
function workPreimageMatches(work, version, target) {
  return (
    version.revision === target.work_row.revision &&
    version.digest === target.work_row.digest &&
    canonicalJson(work) === target.work_row.payload
  );
}

/** @param {WorkState} expected @param {WorkState} current @param {StateVersion} version @param {SynthesisRepairTarget} target */
function workPostimageMatches(expected, current, version, target) {
  return (
    version.revision === target.work_row.revision + 1 &&
    version.digest === canonicalJsonDigest(expected) &&
    canonicalJson(current) === canonicalJson(expected)
  );
}

/** @param {RepairWorkValue} prior @param {SynthesisRepairTarget} target @returns {RepairWorkValue} */
function mapRepairWorkTarget(prior, target) {
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

/** @param {SynthesisRepairPlan} plan @param {RepairWorkValue} work @param {SynthesisRepairTarget} target @param {string} root @returns {RepairJournalValue} */
function createRepairJournalState(plan, work, target, root) {
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

/** @param {RepairJournalValue} prior @param {SynthesisRepairTarget} target @param {string} changelogDigest @returns {RepairJournalValue} */
function mapRepairJournalTarget(prior, target, changelogDigest) {
  return { ...prior, next: mappedJournal(prior.next, target, changelogDigest) };
}

/** One typed, maintenance-fenced CAS for the exact planned artifact and journal projection. */
/** @param {{database: SqliteDatabase; hostState: HostStateStore; maintenanceReceipt: MaintenanceFenceReceipt; plan: SynthesisRepairPlan; repositoryRoot: string}} input */
function commitSynthesisQualificationRepair({ database, hostState, maintenanceReceipt, plan, repositoryRoot }) {
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
  const { work, journals } = repairRows(plan, hostState, path.resolve(repositoryRoot));
  return database.transaction(() => runRepairSqlTransaction(database, plan, held, work, journals)).immediate();
}

/** @param {SqliteDatabase} database @param {SynthesisRepairPlan} plan @param {MaintenanceFence} held @param {Map<string, RepairWorkValue>} work @param {Map<string, RepairJournalValue>} journals */
function runRepairSqlTransaction(database, plan, held, work, journals) {
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

/** @param {SqliteDatabase} database @param {SynthesisRepairPlan} plan @param {MaintenanceFence} held @param {Map<string, RepairWorkValue>} work @param {Map<string, RepairJournalValue>} journals @returns {{readonly alreadyApplied: true} | {readonly alreadyApplied: false; readonly ledger: StateRevisionRow}} */
function validateRepairSqlPreimages(database, plan, held, work, journals) {
  const typedFence = decodePayloadDigestRow(
    /** @type {unknown} */ (
      database.query('SELECT payload,digest FROM agent_host_maintenance WHERE workspace_id=?').get(plan.workspace_id)
    ),
  );
  required(
    typedFence?.digest === canonicalJsonDigest(held) && typedFence.payload === canonicalJson(held),
    'repair maintenance fence changed',
  );
  database.exec(
    'CREATE TABLE IF NOT EXISTS agent_host_synthesis_qualification_repair (workspace_id TEXT NOT NULL, repair_id TEXT NOT NULL, payload TEXT NOT NULL, digest TEXT NOT NULL, PRIMARY KEY(workspace_id,repair_id))',
  );
  const existing = decodePayloadDigestRow(
    /** @type {unknown} */ (
      database
        .query(
          'SELECT payload,digest FROM agent_host_synthesis_qualification_repair WHERE workspace_id=? AND repair_id=?',
        )
        .get(plan.workspace_id, plan.repair_id)
    ),
  );
  if (existing) {
    required(
      existing.digest === plan.digest && existing.payload === canonicalJson(plan),
      'repair receipt conflicts with current operation',
    );
    return { alreadyApplied: true };
  }
  const ledger = decodeStateRevisionRow(
    /** @type {unknown} */ (
      database
        .query(
          "SELECT revision,payload,digest FROM agent_host_state WHERE workspace_id=? AND kind='ledger' AND id='shared'",
        )
        .get(plan.workspace_id)
    ),
  );
  required(
    ledger && ledger.digest === coordinationLedgerDigest(parseJsonUnknown(ledger.payload, '$.coordination_ledger')),
    'shared coordination ledger changed',
  );
  assertRepairWorkPreimages(database, plan, work);
  assertRepairJournalPreimages(database, plan, journals);
  return { alreadyApplied: false, ledger };
}

/** @param {SqliteDatabase} database @param {SynthesisRepairPlan} plan @param {Map<string, RepairWorkValue>} work */
function assertRepairWorkPreimages(database, plan, work) {
  for (const [id, value] of work) {
    const row = decodeStateRevisionRow(
      /** @type {unknown} */ (
        database
          .query("SELECT revision,payload,digest FROM agent_host_state WHERE workspace_id=? AND kind='work' AND id=?")
          .get(plan.workspace_id, id)
      ),
    );
    required(
      row?.revision === value.prior.revision &&
        row.digest === value.prior.digest &&
        row.payload === value.prior.payload,
      'repair WorkState CAS changed',
    );
  }
}

/** @param {SqliteDatabase} database @param {SynthesisRepairPlan} plan @param {Map<string, RepairJournalValue>} journals */
function assertRepairJournalPreimages(database, plan, journals) {
  for (const value of journals.values()) {
    const row = decodeStateRevisionRow(
      /** @type {unknown} */ (
        database
          .query(
            'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
          )
          .get(plan.workspace_id, value.workId, value.attempt)
      ),
    );
    required(
      row?.revision === value.prior.revision &&
        row.digest === value.prior.digest &&
        row.payload === value.prior.payload,
      'repair Mastra journal CAS changed',
    );
  }
}

/** @param {SqliteDatabase} database @param {SynthesisRepairPlan} plan @param {Map<string, RepairWorkValue>} work */
function updateRepairWorkRows(database, plan, work) {
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

/** @param {SqliteDatabase} database @param {SynthesisRepairPlan} plan @param {Map<string, RepairJournalValue>} journals */
function updateRepairJournalRows(database, plan, journals) {
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

/** @param {SqliteDatabase} database @param {SynthesisRepairPlan} plan @param {StateRevisionRow} prior */
function updateSharedCoordinationLedger(database, plan, prior) {
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

/** @param {SafeRepositoryAccess} access @param {string} relative @param {string} label @returns {string} */
function currentHash(access, relative, label) {
  return sha(access.readBytes(relative, label));
}

/** @param {SafeRepositoryAccess} access @param {string} relative @param {string} before @param {string} after @param {string} contents @param {string} label @returns {Promise<'already_written' | 'written'>} */
async function replacePlanned(access, relative, before, after, contents, label) {
  const observed = currentHash(access, relative, label);
  if (observed === after) return 'already_written';
  required(observed === before, `${label} has third-party bytes`);
  await access.replaceAtomicAsync(relative, before, contents, label);
  required(currentHash(access, relative, label) === after, `${label} publication changed`);
  return 'written';
}

/** @param {SafeRepositoryAccess} access @param {string} repairId @param {RepairPhase} phase */
async function appendPhase(access, repairId, phase) {
  const relative = `.agent/work/${repairId}/repair-journal.v1.jsonl`;
  const prior = access.fileExists(relative, 'synthesis repair journal')
    ? access.readText(relative, 'synthesis repair journal')
    : null;
  /** @type {RepairEvent[]} */
  const lines =
    prior === null
      ? []
      : prior
          .trimEnd()
          .split('\n')
          .map((line) => parseRepairEvent(JSON.parse(line), repairId));
  required(prior === null || prior.endsWith('\n'), 'synthesis repair journal framing invalid');
  if (
    lines.some((entry) => entry.schema !== 'VidaSynthesisQualificationRepairEvent/v1' || entry.repair_id !== repairId)
  )
    throw new Error('synthesis repair journal differs');
  if (lines.some((entry) => entry.phase === phase)) return;
  const event = {
    schema: /** @type {const} */ ('VidaSynthesisQualificationRepairEvent/v1'),
    repair_id: repairId,
    phase,
  };
  const next = `${prior ?? ''}${canonicalJson(event)}\n`;
  if (prior === null) await access.writeExclusiveAsync(relative, next, 'synthesis repair journal');
  else await access.replaceAtomicAsync(relative, sha(Buffer.from(prior)), next, 'synthesis repair journal');
}

/** Path-safe file CAS is replayable; the database transition is one later IMMEDIATE transaction. */
/** @param {{repositoryRoot: string; plan: SynthesisRepairPlan; database: SqliteDatabase; hostState: HostStateStore; maintenanceReceipt: MaintenanceFenceReceipt; onPhase?: (phase: string) => void}} input */
async function applySynthesisQualificationRepair({
  repositoryRoot,
  plan,
  database,
  hostState,
  maintenanceReceipt,
  onPhase,
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

/** @param {{readonly root: string; readonly config: AgentRuntimeConfig; readonly plan: SynthesisRepairPlan; readonly database: SqliteDatabase; readonly hostState: HostStateStore; readonly maintenanceReceipt: MaintenanceFenceReceipt; readonly access: SafeRepositoryAccess; readonly onPhase: ((phase: string) => void) | undefined}} input */
async function applyUnderExclusiveLock({
  root,
  config,
  plan,
  database,
  hostState,
  maintenanceReceipt,
  access,
  onPhase,
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

/** @param {SqliteDatabase} database @param {SynthesisRepairPlan} plan */
function assertApplyPreimages(database, plan) {
  const repairTable = Boolean(
    database
      .query("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_synthesis_qualification_repair'")
      .get(),
  );
  const priorReceipt = repairTable
    ? decodePayloadDigestRow(
        /** @type {unknown} */ (
          database
            .query(
              'SELECT payload,digest FROM agent_host_synthesis_qualification_repair WHERE workspace_id=? AND repair_id=?',
            )
            .get(plan.workspace_id, plan.repair_id)
        ),
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

/** @param {SqliteDatabase} database @param {SynthesisRepairPlan} plan */
function assertApplyTargetPreimages(database, plan) {
  for (const target of plan.targets) {
    const work = decodeStateRevisionRow(
      /** @type {unknown} */ (
        database
          .query("SELECT revision,payload,digest FROM agent_host_state WHERE workspace_id=? AND kind='work' AND id=?")
          .get(plan.workspace_id, target.work_row.id)
      ),
    );
    required(
      work?.revision === target.work_row.revision &&
        work.digest === target.work_row.digest &&
        work.payload === target.work_row.payload,
      'repair WorkState preimage changed',
    );
    const journal = decodeStateRevisionRow(
      /** @type {unknown} */ (
        database
          .query(
            'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
          )
          .get(plan.workspace_id, target.work_id, target.attempt)
      ),
    );
    required(
      journal?.revision === target.journal_row.revision &&
        journal.digest === target.journal_row.digest &&
        journal.payload === target.journal_row.payload,
      'repair journal preimage changed',
    );
  }
}

/** @param {SafeRepositoryAccess} access @param {AgentRuntimeConfig} config @param {SynthesisRepairPlan} plan @param {((phase: string) => void) | undefined} onPhase */
async function writeSynthesisRecordTargets(access, config, plan, onPhase) {
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

/** @param {AgentRuntimeConfig} config @param {string} targetPath */
function requireSynthesisTargetPath(config, targetPath) {
  required(
    targetPath.startsWith(`${config.research_decision.paths.research_records}/`) &&
      targetPath.endsWith('.synthesis.json'),
    'repair target path leaves configured synthesis root',
  );
}

/** @param {SafeRepositoryAccess} access @param {string} archive @param {string} contents @param {string} digest */
async function ensureSynthesisArchive(access, archive, contents, digest) {
  if (!access.fileExists(archive, 'synthesis repair archive'))
    await access.writeExclusiveAsync(archive, contents, 'synthesis repair archive');
  required(
    currentHash(access, archive, 'synthesis repair archive') === digest,
    'synthesis repair archive differs from preimage',
  );
}

/** @param {SafeRepositoryAccess} access @param {string} repairId @param {RepairPhase} phase @param {((phase: string) => void) | undefined} onPhase */
async function markRepairPhase(access, repairId, phase, onPhase) {
  await appendPhase(access, repairId, phase);
  onPhase?.(phase);
}

/** @param {SafeRepositoryAccess} access @param {SynthesisRepairPlan} plan */
function verifyAppliedSynthesisFiles(access, plan) {
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

/** @param {string} id */
const planRelative = (id) => `.agent/work/${id}/repair-plan.v1.json`;
/** @param {string} id */
const tokenRelative = (id) => `.agent/work/${id}/fence-token.v1.json`;
/** @param {string} root @param {AgentRuntimeConfig} config @returns {string} */
const regularDatabase = (root, config) => {
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

/** @param {readonly string[]} args */
function parseCliPairs(args) {
  required(args.length % 2 === 0, 'arguments must be paired');
  /** Exact-key validation below closes this dictionary before it is returned. */
  /** @type {Record<string, string>} */
  const values = /** @type {Record<string, string>} */ (Object.create(null));
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

/** @param {Record<string, string>} values */
function validateSynthesisCliValues(values) {
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

/** @param {readonly string[]} args */
function parsedArgs(args) {
  const values = parseCliPairs(args);
  validateSynthesisCliValues(values);
  return values;
}

/** @param {Record<string, string>} values @param {string} key @returns {string} */
function requiredArgument(values, key) {
  const value = values[key];
  required(typeof value === 'string' && value.length > 0, `required argument ${key} is missing`);
  return value;
}

/** @param {unknown} value @param {string} repairId @returns {string} */
function parseFenceToken(value, repairId) {
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

/** @param {SafeRepositoryAccess} access @param {string} repairId @returns {SynthesisRepairPlan} */
function savedPlan(access, repairId) {
  const raw = access.readText(planRelative(repairId), 'synthesis qualification plan');
  const plan = parseSynthesisRepairPlan(JSON.parse(raw));
  required(
    raw === `${JSON.stringify(plan, null, 2)}\n` &&
      plan.repair_id === repairId &&
      plan.schema === 'VidaSynthesisQualificationRepairPlan/v1' &&
      canonicalJsonDigest((({ digest: _digest, ...body }) => body)(plan)) === plan.digest,
    'frozen synthesis qualification plan differs',
  );
  return plan;
}

/** @param {string} root @param {AgentRuntimeConfig} config @param {SynthesisRepairPlan} plan */
function completedRepairReceipt(root, config, plan) {
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

/** @param {SqliteDatabase} database @param {SynthesisRepairPlan} plan */
function completedReceiptReleased(database, plan) {
  const exists = /** @type {unknown} */ (
    database
      .query("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_synthesis_qualification_repair'")
      .get()
  );
  if (!exists) return false;
  const receipt = decodePayloadDigestRow(
    /** @type {unknown} */ (
      database
        .query(
          'SELECT payload,digest FROM agent_host_synthesis_qualification_repair WHERE workspace_id=? AND repair_id=?',
        )
        .get(plan.workspace_id, plan.repair_id)
    ),
  );
  if (!receipt) return false;
  required(
    receipt.digest === plan.digest && receipt.payload === canonicalJson(plan),
    'completed synthesis receipt conflicts',
  );
  const maintenance = decodePayloadDigestRow(
    /** @type {unknown} */ (
      database.query('SELECT payload,digest FROM agent_host_maintenance WHERE workspace_id=?').get(plan.workspace_id)
    ),
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

/** @param {SqliteDatabase} database @param {string} root @param {SynthesisRepairPlan} plan */
function verifyCompletedDatabaseState(database, root, plan) {
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

/** @param {SqliteDatabase} database @param {SynthesisRepairPlan} plan @param {Map<string, RepairWorkValue>} work */
function verifyCompletedWorkRows(database, plan, work) {
  for (const [id, value] of work) {
    const row = decodeStateRevisionRow(
      /** @type {unknown} */ (
        database
          .query("SELECT revision,payload,digest FROM agent_host_state WHERE workspace_id=? AND kind='work' AND id=?")
          .get(plan.workspace_id, id)
      ),
    );
    required(
      row?.revision === value.next.revision &&
        row.payload === canonicalJson(value.next) &&
        row.digest === canonicalJsonDigest(value.next),
      'completed synthesis repair WorkState differs',
    );
  }
}

/** @param {SqliteDatabase} database @param {SynthesisRepairPlan} plan @param {Map<string, RepairJournalValue>} journals */
function verifyCompletedJournalRows(database, plan, journals) {
  for (const value of journals.values()) {
    const row = decodeStateRevisionRow(
      /** @type {unknown} */ (
        database
          .query(
            'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
          )
          .get(plan.workspace_id, value.workId, value.attempt)
      ),
    );
    required(
      row?.revision === value.prior.revision + 1 &&
        row.payload === canonicalJson(value.next) &&
        row.digest === canonicalJsonDigest(value.next),
      'completed synthesis repair journal differs',
    );
  }
}

/** @param {SafeRepositoryAccess} access @param {SynthesisRepairPlan} plan */
function verifyCompletedFiles(access, plan) {
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

/** @param {string} root @param {AgentRuntimeConfig} config @param {SynthesisRepairPlan} plan @returns {SynthesisMaintenanceInput} */
function maintenanceBinding(root, config, plan) {
  const access = requireSafeRepositoryAccess(root);
  const bundleDigest = activeSelectorDigest(access);
  const projectIds = config.projects.map((item) => item.project_id).sort();
  const binding = {
    schema: /** @type {const} */ ('MaintenanceFenceBinding/v1'),
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
    /** @param {MaintenanceFence} fence @returns {Promise<MaintenanceReleaseAuthorization | null>} */
    verify: async (fence) => {
      if (canonicalJsonDigest(fence.binding) !== canonicalJsonDigest(binding)) return null;
      const db = openCliWorkspaceDatabase(root, regularDatabase(root, config), plan.workspace_id, true);
      try {
        const row = decodePayloadDigestRow(
          /** @type {unknown} */ (
            db
              .query(
                'SELECT payload,digest FROM agent_host_synthesis_qualification_repair WHERE workspace_id=? AND repair_id=?',
              )
              .get(plan.workspace_id, plan.repair_id)
          ),
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
        .map((line) => parseRepairEvent(JSON.parse(line), plan.repair_id));
      required(
        events.at(-1)?.phase === 'complete' && events.at(-1)?.repair_id === plan.repair_id,
        'repair journal is incomplete',
      );
      return {
        schema: /** @type {const} */ ('MaintenanceReleaseAuthorization/v1'),
        principal: verifier.principal,
        fence_digest: canonicalJsonDigest(fence),
        closure_digest: binding.closure_digest,
        bundle_digest: binding.bundle_digest,
      };
    },
  };
  return { binding, verifier };
}

/** @param {SafeRepositoryAccess} access @returns {string} */
function activeSelectorDigest(access) {
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

/** @param {ReturnType<typeof parsedArgs>} values @returns {string} */
function canonicalRepairRoot(values) {
  const root = requiredArgument(values, '--project-root');
  required(
    typeof root === 'string' && path.isAbsolute(root) && path.resolve(root) === root,
    'project root must be canonical',
  );
  return root;
}

/** Existing packaged reconcile-artifacts entrypoint owns this current-v1 repair branch. */
/** @param {readonly string[]} args @param {{readonly onPhase?: (phase: string) => void}} [options] */
export async function runSynthesisQualificationRepair(args, { onPhase } = {}) {
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
    let plan;
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
  let token;
  if (access.fileExists(tokenPath, 'synthesis repair fence token')) {
    token = parseFenceToken(JSON.parse(access.readText(tokenPath, 'synthesis repair fence token')), repairId);
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
      const fresh = planSynthesisQualificationRepair({
        repositoryRoot: root,
        database,
        repairId,
        actor: plan.actor,
        timestamp: plan.timestamp,
      });
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
