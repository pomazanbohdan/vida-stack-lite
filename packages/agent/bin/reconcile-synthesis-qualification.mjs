import { createHash, randomUUID } from 'node:crypto';
import { lstatSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { Database } from 'bun:sqlite';
import { loadRuntimeConfig } from '../src/config/runtime-config.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { canonicalJson, canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { coordinationLedgerJson, coordinationLedgerDigest } from '../src/contracts/envelopes.ts';
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
} from '../src/research-decision.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { HostStateStore } from '../src/host-state.ts';
import { sessionHandoffDatabasePath, sessionHandoffDatabaseRelativePath } from '../src/config/project-paths.ts';

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const required = (condition, message) => {
  if (!condition) throw new Error(`vida synthesis qualification repair: ${message}`);
};
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const recordBytes = (value) => `${JSON.stringify(JSON.parse(canonicalJson(value)), null, 2)}\n`;

function observedSources(root, config, references, workId, sourceRevision, scopeId) {
  const access = requireSafeRepositoryAccess(root);
  const directory = config.research_decision.paths.research_records;
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

function normalizeObservation(observation, catalog) {
  required(
    observation?.status === 'reported_complete' && typeof observation.summary === 'string',
    'native synthesis observation is not complete',
  );
  const original = JSON.parse(observation.summary);
  const qualified = qualifyLegacySynthesisCitations(original, catalog);
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
  required(matches.length === 1, 'synthesis artifact has no exact journal normalization');
  return matches[0];
}

/** Read-only complete contour plan. Apply must rederive it from current bytes before mutation. */
export function planSynthesisQualificationRepair({ repositoryRoot, repairId, actor, timestamp, database }) {
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
  const workRows = database
    .query("SELECT id,revision,payload,digest FROM agent_host_state WHERE workspace_id=? AND kind='work'")
    .all(workspaceId);
  const targets = [];
  for (const workRow of workRows) {
    const work = JSON.parse(workRow.payload);
    required(workRow.digest === canonicalJsonDigest(work), 'HostState work row digest differs');
    for (const artifact of work.artifacts.filter((entry) => entry.schema === 'ResearchSynthesis/v1')) {
      required(
        work.execution.status === 'suspended' &&
          work.lease === null &&
          work.lifecycle.phase !== 'COMPLETE' &&
          work.lifecycle.phase !== 'DELIVERY',
        'active synthesis owner is not quiescent for qualification',
      );
      const rows = database
        .query(
          'SELECT attempt,revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=?',
        )
        .all(workspaceId, work.binding.lifecycle_work_id);
      const matches = rows.flatMap((row) => {
        const value = JSON.parse(row.payload);
        required(row.digest === canonicalJsonDigest(value), 'Mastra journal digest differs');
        const items = [...value.completed.flatMap((wave) => wave.items), ...value.items];
        return items.some(
          (entry) =>
            entry.research_normalization?.record_path === artifact.path &&
            entry.research_normalization.record_sha256 === artifact.sha256,
        )
          ? [{ row, value }]
          : [];
      });
      required(matches.length === 1, 'active synthesis has no exact Mastra journal');
      const journalRow = matches[0].row;
      const journal = matches[0].value;
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
      const record = validateResearchSynthesis(JSON.parse(raw.toString('utf8')));
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
      const observation = normalizeObservation(item.observation, catalog);
      const newBytes = recordBytes(qualified);
      targets.push({
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
        work_row: { id: workRow.id, revision: workRow.revision, digest: workRow.digest, payload: workRow.payload },
        journal_row: { revision: journalRow.revision, digest: journalRow.digest, payload: journalRow.payload },
      });
    }
  }
  required(
    targets.length > 0 && new Set(targets.map((target) => target.path)).size === targets.length,
    'active synthesis contour is empty or duplicated',
  );
  targets.sort((left, right) => cmp(left.path, right.path));
  const events = synthesisQualificationChangeEvents({ targets, repairId, actor, timestamp });
  const changelogAfter = changelogBefore + events.map((event) => `${canonicalJson(event)}\n`).join('');
  const body = {
    schema: 'VidaSynthesisQualificationRepairPlan/v1',
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
function synthesisQualificationChangeEvents({ targets, repairId, actor, timestamp }) {
  return targets.map((target) => ({
    schema: 'DocumentationChangeEvent/v1',
    event_id: `documentation-event-${canonicalJsonDigest({
      repairId,
      path: target.path,
      after: target.after_digest,
    }).slice(0, 48)}`,
    logical_edit_id: `ResearchSynthesis/v1:${target.path}`,
    work_id: target.work_id,
    source_revision: JSON.parse(target.after_record).source_revision,
    operation: 'finalize',
    document_id: target.artifact_id,
    path_before: target.path,
    path_after: target.path,
    before_sha256: target.before_sha256,
    after_sha256: target.after_sha256,
    actor,
    pointer: `.agent/work/${repairId}/repair-plan.v1.json`,
    timestamp,
  }));
}

export function inspectSynthesisQualificationRepair({ repositoryRoot, repairId, actor, timestamp }) {
  const config = loadRuntimeConfig(repositoryRoot);
  const dbPath = sessionHandoffDatabasePath(repositoryRoot, config);
  const db = new Database(dbPath, { readonly: true, create: false });
  try {
    return planSynthesisQualificationRepair({ repositoryRoot, repairId, actor, timestamp, database: db });
  } finally {
    db.close();
  }
}

function mappedJournal(state, target, changelogSha) {
  let changed = 0;
  const mapItem = (item) => {
    if (item.request.action_id !== target.action_id) return item;
    required(
      item.issue_id === target.issue_id &&
        canonicalJsonDigest(item.observation) === canonicalJsonDigest(target.before_observation) &&
        canonicalJsonDigest(item.research_normalization) === canonicalJsonDigest(target.before_normalization),
      'journal item changed before qualification',
    );
    changed++;
    const before = item.research_normalization;
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
    return {
      ...item,
      observation: target.after_observation,
      research_normalization: { ...withoutDigest, digest: canonicalJsonDigest(withoutDigest) },
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

function repairRows(plan) {
  const work = new Map();
  const journals = new Map();
  for (const target of plan.targets) {
    const key = target.work_row.id;
    const priorWork = work.get(key)?.next ?? JSON.parse(target.work_row.payload);
    const artifacts = priorWork.artifacts.map((artifact) =>
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
    work.set(key, { prior: target.work_row, next: { ...priorWork, artifacts } });
    const jkey = `${target.work_id}\0${target.attempt}`;
    const priorJournal = journals.get(jkey)?.next ?? JSON.parse(target.journal_row.payload);
    journals.set(jkey, {
      prior: target.journal_row,
      workId: target.work_id,
      attempt: target.attempt,
      next: mappedJournal(priorJournal, target, plan.changelog_after_sha256),
    });
  }
  for (const value of work.values()) {
    const old = JSON.parse(value.prior.payload);
    value.next = {
      ...value.next,
      revision: old.revision + 1,
      lifecycle: { ...value.next.lifecycle, revision: old.lifecycle.revision + 1 },
    };
  }
  return { work, journals };
}

/** One typed, maintenance-fenced CAS for the exact planned artifact and journal projection. */
export function commitSynthesisQualificationRepair({ database, hostState, maintenanceReceipt, plan }) {
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
  const { work, journals } = repairRows(plan);
  return database
    .transaction(() => {
      const fence = database
        .query('SELECT payload,digest FROM agent_host_maintenance WHERE workspace_id=?')
        .get(plan.workspace_id);
      required(
        fence?.digest === canonicalJsonDigest(held) && fence.payload === canonicalJson(held),
        'repair maintenance fence changed',
      );
      database.exec(
        'CREATE TABLE IF NOT EXISTS agent_host_synthesis_qualification_repair (workspace_id TEXT NOT NULL, repair_id TEXT NOT NULL, payload TEXT NOT NULL, digest TEXT NOT NULL, PRIMARY KEY(workspace_id,repair_id))',
      );
      const existing = database
        .query(
          'SELECT payload,digest FROM agent_host_synthesis_qualification_repair WHERE workspace_id=? AND repair_id=?',
        )
        .get(plan.workspace_id, plan.repair_id);
      if (existing) {
        required(
          existing.digest === plan.digest && existing.payload === canonicalJson(plan),
          'repair receipt conflicts with current operation',
        );
        return { status: 'already_applied', repair_id: plan.repair_id, digest: plan.digest };
      }
      const shared = database
        .query(
          "SELECT revision,payload,digest FROM agent_host_state WHERE workspace_id=? AND kind='ledger' AND id='shared'",
        )
        .get(plan.workspace_id);
      required(
        shared && shared.digest === coordinationLedgerDigest(JSON.parse(shared.payload)),
        'shared coordination ledger changed',
      );
      for (const [id, value] of work) {
        const row = database
          .query("SELECT revision,payload,digest FROM agent_host_state WHERE workspace_id=? AND kind='work' AND id=?")
          .get(plan.workspace_id, id);
        required(
          row?.revision === value.prior.revision &&
            row.digest === value.prior.digest &&
            row.payload === value.prior.payload,
          'repair WorkState CAS changed',
        );
      }
      for (const value of journals.values()) {
        const row = database
          .query(
            'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
          )
          .get(plan.workspace_id, value.workId, value.attempt);
        required(
          row?.revision === value.prior.revision &&
            row.digest === value.prior.digest &&
            row.payload === value.prior.payload,
          'repair Mastra journal CAS changed',
        );
      }
      for (const [id, value] of work) {
        const payload = canonicalJson(value.next),
          digest = canonicalJsonDigest(value.next);
        const changed = database
          .query(
            "UPDATE agent_host_state SET revision=?,payload=?,digest=? WHERE workspace_id=? AND kind='work' AND id=? AND revision=? AND digest=?",
          )
          .run(value.next.revision, payload, digest, plan.workspace_id, id, value.prior.revision, value.prior.digest);
        required(changed.changes === 1, 'repair WorkState CAS lost');
      }
      for (const value of journals.values()) {
        const payload = canonicalJson(value.next),
          digest = canonicalJsonDigest(value.next);
        const changed = database
          .query(
            'UPDATE agent_host_mastra_session_ledger SET revision=?,payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=? AND revision=? AND digest=?',
          )
          .run(
            value.prior.revision + 1,
            payload,
            digest,
            plan.workspace_id,
            value.workId,
            value.attempt,
            value.prior.revision,
            value.prior.digest,
          );
        required(changed.changes === 1, 'repair Mastra journal CAS lost');
      }
      const ledger = JSON.parse(shared.payload);
      const nextLedger = { ...ledger, revision: ledger.revision + 1 };
      const ledgerPayload = coordinationLedgerJson(nextLedger);
      const changedLedger = database
        .query(
          "UPDATE agent_host_state SET revision=?,payload=?,digest=? WHERE workspace_id=? AND kind='ledger' AND id='shared' AND revision=? AND digest=?",
        )
        .run(nextLedger.revision, ledgerPayload, sha(ledgerPayload), plan.workspace_id, shared.revision, shared.digest);
      required(changedLedger.changes === 1, 'repair shared ledger CAS lost');
      database
        .query('INSERT INTO agent_host_synthesis_qualification_repair VALUES(?,?,?,?)')
        .run(plan.workspace_id, plan.repair_id, canonicalJson(plan), plan.digest);
      return { status: 'applied', repair_id: plan.repair_id, digest: plan.digest };
    })
    .immediate();
}

function currentHash(access, relative, label) {
  return sha(access.readBytes(relative, label));
}

async function replacePlanned(access, relative, before, after, contents, label) {
  const observed = currentHash(access, relative, label);
  if (observed === after) return 'already_written';
  required(observed === before, `${label} has third-party bytes`);
  await access.replaceAtomicAsync(relative, before, contents, label);
  required(currentHash(access, relative, label) === after, `${label} publication changed`);
  return 'written';
}

async function appendPhase(access, repairId, phase) {
  const relative = `.agent/work/${repairId}/repair-journal.v1.jsonl`;
  const prior = access.fileExists(relative, 'synthesis repair journal')
    ? access.readText(relative, 'synthesis repair journal')
    : null;
  const lines =
    prior === null
      ? []
      : prior
          .trimEnd()
          .split('\n')
          .map((line) => JSON.parse(line));
  required(prior === null || prior.endsWith('\n'), 'synthesis repair journal framing invalid');
  if (
    lines.some((entry) => entry.schema !== 'VidaSynthesisQualificationRepairEvent/v1' || entry.repair_id !== repairId)
  )
    throw new Error('synthesis repair journal differs');
  if (lines.some((entry) => entry.phase === phase)) return;
  const event = { schema: 'VidaSynthesisQualificationRepairEvent/v1', repair_id: repairId, phase };
  const next = `${prior ?? ''}${canonicalJson(event)}\n`;
  if (prior === null) await access.writeExclusiveAsync(relative, next, 'synthesis repair journal');
  else await access.replaceAtomicAsync(relative, sha(Buffer.from(prior)), next, 'synthesis repair journal');
}

/** Path-safe file CAS is replayable; the database transition is one later IMMEDIATE transaction. */
export async function applySynthesisQualificationRepair({
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
  return access.withExclusiveLockAsync(
    `${plan.changelog_path}.lock`,
    'synthesis qualification changelog lock',
    async () => {
      const priorReceipt = database
        .query("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_synthesis_qualification_repair'")
        .get()
        ? database
            .query(
              'SELECT payload,digest FROM agent_host_synthesis_qualification_repair WHERE workspace_id=? AND repair_id=?',
            )
            .get(plan.workspace_id, plan.repair_id)
        : null;
      if (priorReceipt)
        required(
          priorReceipt.digest === plan.digest && priorReceipt.payload === canonicalJson(plan),
          'synthesis repair receipt conflicts',
        );
      else {
        for (const target of plan.targets) {
          const row = database
            .query("SELECT revision,payload,digest FROM agent_host_state WHERE workspace_id=? AND kind='work' AND id=?")
            .get(plan.workspace_id, target.work_row.id);
          required(
            row?.revision === target.work_row.revision &&
              row.digest === target.work_row.digest &&
              row.payload === target.work_row.payload,
            'repair WorkState preimage changed',
          );
          const journal = database
            .query(
              'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
            )
            .get(plan.workspace_id, target.work_id, target.attempt);
          required(
            journal?.revision === target.journal_row.revision &&
              journal.digest === target.journal_row.digest &&
              journal.payload === target.journal_row.payload,
            'repair journal preimage changed',
          );
        }
      }
      const archiveRoot = `.agent/work/${plan.repair_id}/archive`;
      await access.ensureDirectoryAsync(archiveRoot, 'synthesis repair archive');
      for (const [index, target] of plan.targets.entries()) {
        required(
          target.path.startsWith(`${config.research_decision.paths.research_records}/`) &&
            target.path.endsWith('.synthesis.json'),
          'repair target path leaves configured synthesis root',
        );
        const archive = `${archiveRoot}/record-${index}.json`;
        if (!access.fileExists(archive, 'synthesis repair archive'))
          await access.writeExclusiveAsync(archive, target.before_record, 'synthesis repair archive');
        required(
          currentHash(access, archive, 'synthesis repair archive') === target.before_sha256,
          'synthesis repair archive differs from preimage',
        );
        await replacePlanned(
          access,
          target.path,
          target.before_sha256,
          target.after_sha256,
          target.after_record,
          'qualified synthesis record',
        );
        await appendPhase(access, plan.repair_id, `record_${index}`);
        onPhase?.(`record_${index}`);
      }
      await replacePlanned(
        access,
        plan.changelog_path,
        plan.changelog_before_sha256,
        plan.changelog_after_sha256,
        plan.changelog_after,
        'synthesis qualification changelog',
      );
      await appendPhase(access, plan.repair_id, 'changelog');
      onPhase?.('changelog');
      const committed = commitSynthesisQualificationRepair({ database, hostState, maintenanceReceipt, plan });
      await appendPhase(access, plan.repair_id, 'database');
      onPhase?.('database');
      for (const target of plan.targets)
        required(
          currentHash(access, target.path, 'qualified synthesis record') === target.after_sha256,
          'qualified synthesis record postimage changed',
        );
      required(
        currentHash(access, plan.changelog_path, 'synthesis qualification changelog') === plan.changelog_after_sha256,
        'synthesis qualification changelog postimage changed',
      );
      await appendPhase(access, plan.repair_id, 'complete');
      onPhase?.('complete');
      return {
        ...committed,
        changed_paths: plan.targets.map((target) => target.path),
        changelog_path: plan.changelog_path,
      };
    },
  );
}

const planRelative = (id) => `.agent/work/${id}/repair-plan.v1.json`;
const tokenRelative = (id) => `.agent/work/${id}/fence-token.v1.json`;
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

function parsedArgs(args) {
  required(args.length % 2 === 0, 'arguments must be paired');
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    required(
      args[index]?.startsWith('--') && args[index + 1] && !Object.hasOwn(values, args[index]),
      'arguments are missing or duplicate',
    );
    values[args[index]] = args[index + 1];
  }
  required(
    values['--kind'] === 'synthesis-qualification' &&
      ['inspect', 'plan', 'apply', 'resume'].includes(values['--mode']) &&
      path.isAbsolute(values['--project-root'] ?? '') &&
      path.resolve(values['--project-root']) === values['--project-root'] &&
      /^[a-z0-9][a-z0-9._-]{0,79}$/.test(values['--repair-id'] ?? ''),
    'kind, mode, root or repair ID invalid',
  );
  const expected = ['inspect', 'plan'].includes(values['--mode'])
    ? ['--kind', '--mode', '--project-root', '--repair-id', '--actor', '--timestamp']
    : ['--kind', '--mode', '--project-root', '--repair-id'];
  required(
    canonicalJson(Object.keys(values).sort()) === canonicalJson(expected.sort()),
    'missing or unexpected arguments',
  );
  return values;
}

function savedPlan(access, repairId) {
  const raw = access.readText(planRelative(repairId), 'synthesis qualification plan');
  const plan = JSON.parse(raw);
  required(
    raw === `${JSON.stringify(plan, null, 2)}\n` &&
      plan.repair_id === repairId &&
      plan.schema === 'VidaSynthesisQualificationRepairPlan/v1' &&
      canonicalJsonDigest((({ digest: _digest, ...body }) => body)(plan)) === plan.digest,
    'frozen synthesis qualification plan differs',
  );
  return plan;
}

function completedRepairReceipt(root, config, plan) {
  const access = requireSafeRepositoryAccess(root);
  const database = new Database(regularDatabase(root, config), { readonly: true, create: false });
  try {
    const exists = database
      .query("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_synthesis_qualification_repair'")
      .get();
    if (!exists) return null;
    const receipt = database
      .query(
        'SELECT payload,digest FROM agent_host_synthesis_qualification_repair WHERE workspace_id=? AND repair_id=?',
      )
      .get(plan.workspace_id, plan.repair_id);
    if (!receipt) return null;
    required(
      receipt.digest === plan.digest && receipt.payload === canonicalJson(plan),
      'completed synthesis repair receipt conflicts',
    );
    const maintenance = database
      .query('SELECT payload,digest FROM agent_host_maintenance WHERE workspace_id=?')
      .get(plan.workspace_id);
    required(
      maintenance?.digest === canonicalJsonDigest(JSON.parse(maintenance.payload)),
      'completed synthesis repair maintenance state differs',
    );
    if (JSON.parse(maintenance.payload).status === 'held') return null;
    const { work, journals } = repairRows(plan);
    for (const [id, value] of work) {
      const row = database
        .query("SELECT revision,payload,digest FROM agent_host_state WHERE workspace_id=? AND kind='work' AND id=?")
        .get(plan.workspace_id, id);
      required(
        row?.revision === value.next.revision &&
          row.payload === canonicalJson(value.next) &&
          row.digest === canonicalJsonDigest(value.next),
        'completed synthesis repair WorkState differs',
      );
    }
    for (const value of journals.values()) {
      const row = database
        .query(
          'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
        )
        .get(plan.workspace_id, value.workId, value.attempt);
      required(
        row?.revision === value.prior.revision + 1 &&
          row.payload === canonicalJson(value.next) &&
          row.digest === canonicalJsonDigest(value.next),
        'completed synthesis repair journal differs',
      );
    }
    for (const target of plan.targets) {
      required(
        currentHash(access, target.path, 'qualified synthesis record') === target.after_sha256 &&
          currentHash(
            access,
            `.agent/work/${plan.repair_id}/archive/record-${plan.targets.indexOf(target)}.json`,
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
      .map((line) => JSON.parse(line));
    required(
      events.at(-1)?.phase === 'complete' &&
        events.at(-1)?.repair_id === plan.repair_id &&
        new Set(events.map((event) => event.phase)).size === events.length,
      'completed synthesis repair journal differs',
    );
    return {
      status: 'already_applied',
      repair_id: plan.repair_id,
      digest: plan.digest,
      changed_paths: plan.targets.map((target) => target.path),
      changelog_path: plan.changelog_path,
    };
  } finally {
    database.close();
  }
}

function maintenanceBinding(root, config, plan) {
  const access = requireSafeRepositoryAccess(root);
  const selector = JSON.parse(access.readText('.agent/active-runtime-selector.v1.json', 'active runtime selector'));
  required(/^[a-f0-9]{64}$/.test(selector.payload_manifest_sha256 ?? ''), 'active bundle digest unavailable');
  const projectIds = config.projects.map((item) => item.project_id).sort();
  const binding = {
    schema: 'MaintenanceFenceBinding/v1',
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
    bundle_digest: selector.payload_manifest_sha256,
  };
  const verifier = {
    principal: 'vida-agent-local-synthesis-qualification-repair',
    projectIds,
    verify: async (fence) => {
      if (canonicalJsonDigest(fence.binding) !== canonicalJsonDigest(binding)) return null;
      const db = new Database(regularDatabase(root, config), { readonly: true, create: false });
      try {
        const row = db
          .query(
            'SELECT payload,digest FROM agent_host_synthesis_qualification_repair WHERE workspace_id=? AND repair_id=?',
          )
          .get(plan.workspace_id, plan.repair_id);
        required(row?.digest === plan.digest && row.payload === canonicalJson(plan), 'repair receipt is incomplete');
      } finally {
        db.close();
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
        .map((line) => JSON.parse(line));
      required(
        events.at(-1)?.phase === 'complete' && events.at(-1)?.repair_id === plan.repair_id,
        'repair journal is incomplete',
      );
      return {
        schema: 'MaintenanceReleaseAuthorization/v1',
        principal: verifier.principal,
        fence_digest: canonicalJsonDigest(fence),
        closure_digest: binding.closure_digest,
        bundle_digest: binding.bundle_digest,
      };
    },
  };
  return { binding, verifier };
}

/** Existing packaged reconcile-artifacts entrypoint owns this current-v1 repair branch. */
export async function runSynthesisQualificationRepair(args, { onPhase } = {}) {
  const values = parsedArgs(args);
  const root = values['--project-root'];
  const config = loadRuntimeConfig(root);
  const access = requireSafeRepositoryAccess(root);
  const mode = values['--mode'];
  const repairId = values['--repair-id'];
  const file = regularDatabase(root, config);
  if (mode === 'inspect' || mode === 'plan') {
    const database = new Database(file, { readonly: true, create: false });
    let plan;
    try {
      plan = planSynthesisQualificationRepair({
        repositoryRoot: root,
        database,
        repairId,
        actor: values['--actor'],
        timestamp: values['--timestamp'],
      });
    } finally {
      database.close();
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
    const value = JSON.parse(access.readText(tokenPath, 'synthesis repair fence token'));
    required(
      value.schema === 'VidaSynthesisRepairFenceToken/v1' &&
        value.repair_id === repairId &&
        typeof value.token === 'string',
      'saved synthesis repair fence token differs',
    );
    token = value.token;
  } else {
    required(mode === 'apply', 'repair fence token must exist for resume');
    token = randomUUID();
    access.writeExclusive(
      tokenPath,
      `${JSON.stringify({ schema: 'VidaSynthesisRepairFenceToken/v1', repair_id: repairId, token }, null, 2)}\n`,
      'synthesis repair fence token',
    );
  }
  const database = new Database(file, { strict: true });
  try {
    const hostState = new HostStateStore(database, plan.workspace_id, undefined, undefined, undefined, verifier, root);
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
      onPhase,
    });
    await hostState.releaseMaintenanceFence(maintenanceReceipt);
    return { ...result, maintenance_generation: maintenanceReceipt.fence.generation };
  } finally {
    database.close();
  }
}
