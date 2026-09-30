import { createHash, randomUUID } from 'node:crypto';
import { closeSync, constants, fsyncSync, lstatSync, openSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const json = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const stable = (value) => Array.isArray(value) ? `[${value.map(stable).join(',')}]` :
  value && typeof value === 'object'
    ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`
    : JSON.stringify(value);
const digest = (value) => sha(Buffer.from(stable(value)));
const fail = (message) => { throw new Error(`vida research repair: ${message}`); };
function stat(file) { try { return lstatSync(file); } catch (error) { if (error.code === 'ENOENT') return null; throw error; } }
function projectRoot(root) {
  const absolute = path.resolve(root);
  let current = path.parse(absolute).root;
  const rootInfo = stat(current);
  if (!rootInfo?.isDirectory() || rootInfo.isSymbolicLink()) fail('unsafe project root');
  for (const part of absolute.slice(current.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    const info = stat(current);
    if (!info?.isDirectory() || info.isSymbolicLink()) fail('unsafe project root ancestor');
  }
  return absolute;
}
function bytes(file) {
  const info = stat(file);
  if (!info?.isFile() || info.isSymbolicLink()) fail(`unsafe or absent file: ${file}`);
  return readFileSync(file);
}
function at(root, relative) {
  if (typeof relative !== 'string' || !relative || relative.includes('\\') || relative.startsWith('/') ||
      relative.split('/').some((part) => !part || part === '.' || part === '..' || part.includes(':')))
    fail('unsafe relative path');
  let parent = root;
  for (const part of relative.split('/').slice(0, -1)) {
    parent = path.join(parent, part);
    const info = stat(parent);
    if (!info?.isDirectory() || info.isSymbolicLink()) fail('unsafe parent directory');
  }
  return path.join(parent, relative.split('/').at(-1));
}
function parseRecord(raw, schema) {
  let value;
  try { value = JSON.parse(raw.toString('utf8')); } catch { fail('invalid JSON record'); }
  if (value?.schema !== schema || !/^[a-f0-9]{64}$/.test(value.digest) ||
      !raw.equals(json(value))) fail('record shape or encoding differs');
  const { digest: actual, ...body } = value;
  if (actual !== digest(body)) fail('record digest differs');
  return value;
}
function schemaValidator(runtimeRoot, schema) {
  const runtime = path.resolve(runtimeRoot);
  const require = createRequire(path.join(runtime, 'package.json'));
  const Ajv2020 = require('ajv/dist/2020').default;
  const name = schema === 'ResearchResult/v1' ? 'research-result' : 'research-synthesis';
  const definition = JSON.parse(bytes(path.join(runtime, 'schemas', `${name}.v1.schema.json`)));
  return new Ajv2020({ strict: false, allErrors: true }).compile(definition);
}
function validateRecord(raw, schema, runtimeRoot) {
  const value = parseRecord(raw, schema);
  if (!schemaValidator(runtimeRoot, schema)(value)) fail(`${schema} violates current schema`);
  return value;
}
function configuredPaths(project, runtimeRoot) {
  const require = createRequire(path.join(path.resolve(runtimeRoot), 'package.json'));
  const YAML = require('yaml');
  const config = YAML.parse(bytes(at(project, 'agent-runtime.config.v1.yaml')).toString('utf8'));
  const paths = config?.research_decision?.paths;
  if (!paths || typeof paths.research_records !== 'string' ||
      typeof paths.changelog !== 'string') fail('configured research paths unavailable');
  at(project, paths.research_records);
  at(project, paths.changelog);
  return paths;
}
function dependencyPaths(root, recordsRoot, resultIds, runtimeRoot) {
  const folder = at(root, recordsRoot);
  const info = stat(folder);
  if (!info?.isDirectory() || info.isSymbolicLink()) fail('research records directory is unsafe');
  const synthesis = [];
  for (const name of readdirSync(folder)) {
    if (!name.endsWith('.synthesis.json')) continue;
    const value = validateRecord(bytes(path.join(folder, name)), 'ResearchSynthesis/v1', runtimeRoot);
    if (value.result_refs?.some((ref) => resultIds.has(ref.result_id))) synthesis.push(name);
  }
  return synthesis.sort();
}
function replaceReferences(result, oldId, newId) {
  const replace = (list) => list.map((value) => value === oldId ? newId : value);
  const next = structuredClone(result);
  const source = next.source_refs.find((item) => item.source_id === oldId);
  if (!source || next.source_refs.filter((item) => item.source_id === oldId).length !== 1)
    fail('ambiguous source ID within result');
  source.source_id = newId;
  for (const finding of next.findings) finding.source_ids = replace(finding.source_ids);
  for (const conflict of next.conflicts) conflict.source_ids = replace(conflict.source_ids);
  for (const option of next.options) option.evidence_refs = replace(option.evidence_refs);
  if (next.recommendation) next.recommendation.evidence_refs = replace(next.recommendation.evidence_refs);
  const { digest: ignored, ...body } = next;
  next.digest = digest(body);
  return next;
}

function deriveRepairPlan({ repairId, actor, timestamp, records, recordsRoot, changelogPath,
  changelogBefore, runtimeRoot }) {
  if (!/^[a-z0-9][a-z0-9._-]{0,79}$/.test(repairId) || typeof actor !== 'string' || !actor.trim() ||
      !/^\d{4}-\d{2}-\d{2}T/.test(timestamp) || !Array.isArray(records) || records.length !== 2 ||
      records[0].path === records[1].path) fail('repair identity or exact two-file contour invalid');
  records = records.map(({ path: relative, raw }) => {
    if (!relative.startsWith(`${recordsRoot}/`) || !relative.endsWith('.research.json'))
      fail('repair path escapes configured research records');
    return { path: relative, raw, value: validateRecord(raw, 'ResearchResult/v1', runtimeRoot) };
  });
  if (records[0].value.work_item_id !== records[1].value.work_item_id ||
      records[0].value.scope_id !== records[1].value.scope_id ||
      records[0].value.source_revision !== records[1].value.source_revision ||
      records[0].value.result_id === records[1].value.result_id)
    fail('repair records do not share one distinct-result scope');
  const firstSources = new Map(records[0].value.source_refs.map((item) => [item.source_id, item]));
  const conflicts = records[1].value.source_refs.filter((item) => firstSources.has(item.source_id) &&
    stable({ source_kind: item.source_kind, locator: item.locator, digest: item.digest ?? null }) !==
    stable({ source_kind: firstSources.get(item.source_id).source_kind,
      locator: firstSources.get(item.source_id).locator, digest: firstSources.get(item.source_id).digest ?? null }));
  if (conflicts.length !== 1) fail('expected exactly one source-ID provenance conflict');
  const oldId = conflicts[0].source_id;
  const changes = records.map(({ path: relative, raw, value }) => {
    const source = value.source_refs.find((item) => item.source_id === oldId);
    if (!source) fail('both results must bind conflicting source ID');
    const identity = { source_kind: source.source_kind, locator: source.locator, digest: source.digest ?? null };
    const newId = `src-${digest(identity)}`;
    if (value.source_refs.some((item) => item.source_id === newId && item.source_id !== oldId))
      fail('derived source identity collides with existing source');
    const next = replaceReferences(value, oldId, newId);
    validateRecord(json(next), 'ResearchResult/v1', runtimeRoot);
    return { path: relative, before_sha256: sha(raw), after_sha256: sha(json(next)),
      before_digest: value.digest, after_digest: next.digest, old_source_id: oldId,
      new_source_id: newId, before: raw.toString('utf8'), after: json(next).toString('utf8'),
      result_id: value.result_id };
  });
  if (changes[0].new_source_id === changes[1].new_source_id) fail('new source identities still collide');
  if (!changelogBefore.endsWith('\n')) fail('changelog is incomplete');
  const events = changes.map((item) => ({
    schema: 'DocumentationChangeEvent/v1',
    event_id: `documentation-event-${digest({ repairId, path: item.path, after: item.after_digest }).slice(0, 48)}`,
    logical_edit_id: `ResearchResult/v1:${item.path}`, work_id: records[0].value.work_item_id,
    source_revision: records[0].value.source_revision, operation: 'finalize',
    document_id: item.result_id, path_before: item.path, path_after: item.path,
    before_sha256: item.before_sha256, after_sha256: item.after_sha256,
    actor, pointer: `.agent/work/${repairId}/repair-plan.v1.json`, timestamp,
  }));
  const changelogAfter = changelogBefore + events.map((event) => stable(event) + '\n').join('');
  const body = { schema: 'VidaResearchSourceIdentityRepairPlan/v1', repair_id: repairId, actor,
    work_item_id: records[0].value.work_item_id, records_root: recordsRoot,
    changelog_path: changelogPath, old_source_id: oldId, changes,
    changelog_before_sha256: sha(Buffer.from(changelogBefore)),
    changelog_after_sha256: sha(Buffer.from(changelogAfter)),
    changelog_before: changelogBefore, changelog_after: changelogAfter,
    dependent_synthesis_paths: [], timestamp };
  return { ...body, digest: digest(body) };
}

/** Specific current-v1 repair plan for one observed cross-result source-ID provenance conflict. */
export function planResearchSourceIdentityRepair({ root, repairId, actor, timestamp, recordPaths,
  recordsRoot, changelogPath, runtimeRoot = path.join(root, 'vida-agent') }) {
  const project = projectRoot(root);
  const configured = configuredPaths(project, runtimeRoot);
  if (recordsRoot !== configured.research_records || changelogPath !== configured.changelog)
    fail('repair paths differ from current configuration');
  if (!Array.isArray(recordPaths) || recordPaths.length !== 2) fail('exact two-file contour required');
  const records = recordPaths.map((relative) => ({ path: relative, raw: bytes(at(project, relative)) }));
  const resultIds = new Set(records.map(({ raw }) => validateRecord(raw, 'ResearchResult/v1', runtimeRoot).result_id));
  if (dependencyPaths(project, recordsRoot, resultIds, runtimeRoot).length)
    fail('dependent synthesis exists; this narrow repair cannot update it');
  return deriveRepairPlan({ repairId, actor, timestamp, records, recordsRoot, changelogPath,
    changelogBefore: bytes(at(project, changelogPath)).toString('utf8'), runtimeRoot });
}

function replaceCas(file, beforeSha, afterSha, content) {
  const current = bytes(file);
  if (sha(current) === afterSha) return;
  if (sha(current) !== beforeSha) fail(`third-party bytes: ${file}`);
  const pending = `${file}.pending-${randomUUID()}`;
  try {
    const fd = openSync(pending, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
    try { writeFileSync(fd, content); fsyncSync(fd); } finally { closeSync(fd); }
    if (sha(bytes(file)) !== beforeSha) fail(`CAS lost: ${file}`);
    renameSync(pending, file);
    if (sha(bytes(file)) !== afterSha) fail(`repair publication failed: ${file}`);
  } finally {
    if (stat(pending)) unlinkSync(pending);
  }
}
function journal(file, repairId, phase) {
  const expected = ['record_0', 'record_1', 'changelog', 'complete'];
  const raw = stat(file) ? bytes(file).toString('utf8') : '';
  if (raw && !raw.endsWith('\n')) fail('incomplete repair journal');
  const events = raw ? raw.trimEnd().split('\n').map((line) => JSON.parse(line)) : [];
  if (events.some((event, index) => event.schema !== 'VidaResearchRepairEvent/v1' ||
      event.repair_id !== repairId || event.phase !== expected[index]) || events.length > expected.length)
    fail('repair journal drift');
  const position = expected.indexOf(phase);
  if (position < events.length) return;
  if (position !== events.length) fail('repair journal phase gap');
  const fd = openSync(file, constants.O_CREAT | constants.O_APPEND | constants.O_WRONLY, 0o600);
  try { writeFileSync(fd, `${JSON.stringify({ schema: 'VidaResearchRepairEvent/v1', repair_id: repairId, phase })}\n`);
    fsyncSync(fd); } finally { closeSync(fd); }
}

/** Journaled exact-byte CAS; the caller must provide a quiesced isolated work root. */
export function applyResearchSourceIdentityRepair({ root, repairId, runtimeRoot = path.join(root, 'vida-agent'),
  resume = false, onPhase }) {
  const project = projectRoot(root);
  const workRoot = at(project, `.agent/work/${repairId}`);
  const plan = parseRecord(bytes(path.join(workRoot, 'repair-plan.v1.json')),
    'VidaResearchSourceIdentityRepairPlan/v1');
  if (plan.repair_id !== repairId || plan.changes.length !== 2 || plan.dependent_synthesis_paths.length)
    fail('repair plan scope invalid');
  const configured = configuredPaths(project, runtimeRoot);
  if (plan.records_root !== configured.research_records || plan.changelog_path !== configured.changelog)
    fail('repair paths differ from current configuration');
  // Treat the durable plan as a proposal, never as authority to name arbitrary files or bytes.
  const rebuilt = deriveRepairPlan({ repairId, actor: plan.actor, timestamp: plan.timestamp,
    records: plan.changes.map((item) => ({ path: item.path, raw: Buffer.from(item.before) })),
    recordsRoot: plan.records_root, changelogPath: plan.changelog_path,
    changelogBefore: plan.changelog_before, runtimeRoot });
  if (!json(rebuilt).equals(json(plan))) fail('repair plan differs from deterministic transformation');
  const allowedRoot = at(project, plan.records_root);
  if (!stat(allowedRoot)?.isDirectory() || stat(allowedRoot).isSymbolicLink())
    fail('configured research records root is unsafe');
  for (const item of plan.changes)
    if (!item.path.startsWith(`${plan.records_root}/`) || item.path === plan.changelog_path)
      fail('repair path escapes research records');
  const allPaths = [plan.changelog_path, ...plan.changes.map((item) => item.path)];
  if (new Set(allPaths).size !== allPaths.length) fail('repair path aliases another target');
  const lockPath = path.join(workRoot, 'repair-lock.v1.json');
  const lock = { schema: 'VidaResearchRepairLock/v1', repair_id: repairId, plan_digest: plan.digest };
  if (resume) {
    if (!bytes(lockPath).equals(json(lock))) fail('repair lock differs');
  } else {
    const fd = openSync(lockPath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
    try { writeFileSync(fd, json(lock)); fsyncSync(fd); } finally { closeSync(fd); }
  }
  if (dependencyPaths(project, plan.records_root, new Set(plan.changes.map((item) => item.result_id)), runtimeRoot).length)
    fail('new dependent synthesis blocks repair');
  const journalPath = path.join(workRoot, 'repair-journal.v1.jsonl');
  plan.changes.forEach((item, index) => {
    replaceCas(at(project, item.path), item.before_sha256, item.after_sha256, Buffer.from(item.after));
    journal(journalPath, repairId, `record_${index}`);
    onPhase?.(`record_${index}`);
  });
  replaceCas(at(project, plan.changelog_path), plan.changelog_before_sha256,
    plan.changelog_after_sha256, Buffer.from(plan.changelog_after));
  journal(journalPath, repairId, 'changelog');
  onPhase?.('changelog');
  journal(journalPath, repairId, 'complete');
  onPhase?.('complete');
  return { schema: 'VidaResearchSourceIdentityRepairResult/v1', repair_id: repairId,
    status: 'complete', plan_digest: plan.digest };
}
