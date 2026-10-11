import { createHash, randomUUID } from 'node:crypto';
import {
  closeSync,
  constants,
  fsyncSync,
  lstatSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { runtimePackageAccess } from '../src/config/runtime-config.ts';
import { validateResearchResult, validateResearchSynthesis } from '../src/research-decision.ts';
import type { ResearchResult, ResearchSynthesis } from '../src/research-decision.ts';
import type { AnySchema } from 'ajv';

interface ResearchRepairChange {
  path: string;
  before_sha256: string;
  after_sha256: string;
  before_digest: string;
  after_digest: string;
  old_source_id: string;
  new_source_id: string;
  before: string;
  after: string;
  result_id: string;
}

interface ResearchRepairPlan {
  schema: 'VidaResearchSourceIdentityRepairPlan/v1';
  repair_id: string;
  actor: string;
  work_item_id: string;
  records_root: string;
  changelog_path: string;
  old_source_id: string;
  changes: ResearchRepairChange[];
  changelog_before_sha256: string;
  changelog_after_sha256: string;
  changelog_before: string;
  changelog_after: string;
  dependent_synthesis_paths: [];
  timestamp: string;
  digest: string;
}

interface DeriveResearchRepairInput {
  repairId: string;
  actor: string;
  timestamp: string;
  records: Array<{ path: string; raw: Buffer }>;
  recordsRoot: string;
  changelogPath: string;
  changelogBefore: string;
  runtimeRoot: string;
}

type RepairPhase = 'record_0' | 'record_1' | 'changelog' | 'complete';
type RecordPhase = 'record_0' | 'record_1';
type Ajv2020Constructor = typeof import('ajv/dist/2020.js').default;
type ResearchSchema = 'ResearchResult/v1' | 'ResearchSynthesis/v1';

const parseUnknown = (source: string): unknown => JSON.parse(source);
const sha = (bytes: string | Uint8Array): string => createHash('sha256').update(bytes).digest('hex');
const json = (value: unknown): Buffer => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const stable = (value: unknown): string =>
  Array.isArray(value)
    ? `[${value.map(stable).join(',')}]`
    : isRecord(value)
      ? `{${Object.keys(value)
          .sort()
          .map((key) => `${JSON.stringify(key)}:${stable(value[key])}`)
          .join(',')}}`
      : (JSON.stringify(value) ?? 'undefined');
const digest = (value: unknown): string => sha(Buffer.from(stable(value)));
function isMissingFileError(error: unknown): boolean {
  return isRecord(error) && error.code === 'ENOENT';
}
function fail(message: string): never {
  throw new Error(`vida research repair: ${message}`);
}
function stat(file: string): ReturnType<typeof lstatSync> | null {
  try {
    return lstatSync(file);
  } catch (error) {
    if (isMissingFileError(error)) return null;
    throw error;
  }
}
function projectRoot(root: string): string {
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
function bytes(file: string): Buffer {
  const info = stat(file);
  if (!info?.isFile() || info.isSymbolicLink()) fail(`unsafe or absent file: ${file}`);
  return readFileSync(file);
}
function at(root: string, relative: string): string {
  if (
    typeof relative !== 'string' ||
    !relative ||
    relative.includes('\\') ||
    relative.startsWith('/') ||
    relative.split('/').some((part) => !part || part === '.' || part === '..' || part.includes(':'))
  )
    fail('unsafe relative path');
  let parent = root;
  for (const part of relative.split('/').slice(0, -1)) {
    parent = path.join(parent, part);
    const info = stat(parent);
    if (!info?.isDirectory() || info.isSymbolicLink()) fail('unsafe parent directory');
  }
  return path.join(parent, requiredLeaf(relative.split('/')));
}
function requiredLeaf(parts: string[]): string {
  const leaf = parts.at(-1);
  if (!leaf) fail('unsafe relative path');
  return leaf;
}
function parseRecord(raw: Buffer, schema: string): Record<string, unknown> {
  let value: unknown;
  try {
    value = parseUnknown(raw.toString('utf8'));
  } catch {
    fail('invalid JSON record');
  }
  if (!isCanonicalResearchRecord(value, raw, schema)) fail('record shape or encoding differs');
  const { digest: actual, ...body } = value;
  if (actual !== digest(body)) fail('record digest differs');
  return value;
}
function isCanonicalResearchRecord(value: unknown, raw: Buffer, schema: string): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    value.schema === schema &&
    typeof value.digest === 'string' &&
    /^[a-f0-9]{64}$/.test(value.digest) &&
    raw.equals(json(value))
  );
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function isString(value: unknown): value is string {
  return typeof value === 'string';
}
function isResearchRepairChange(value: unknown): value is ResearchRepairChange {
  return (
    isRecord(value) &&
    Object.keys(value).sort().join(',') ===
      'after,after_digest,after_sha256,before,before_digest,before_sha256,new_source_id,old_source_id,path,result_id' &&
    [
      'path',
      'before_sha256',
      'after_sha256',
      'before_digest',
      'after_digest',
      'old_source_id',
      'new_source_id',
      'before',
      'after',
      'result_id',
    ].every((key) => isString(value[key]))
  );
}
function isResearchRepairPlan(value: unknown): value is ResearchRepairPlan {
  if (!isRecord(value)) return false;
  const keys = [
    'schema',
    'repair_id',
    'actor',
    'work_item_id',
    'records_root',
    'changelog_path',
    'old_source_id',
    'changes',
    'changelog_before_sha256',
    'changelog_after_sha256',
    'changelog_before',
    'changelog_after',
    'dependent_synthesis_paths',
    'timestamp',
    'digest',
  ];
  return (
    Object.keys(value).sort().join(',') === [...keys].sort().join(',') &&
    value.schema === 'VidaResearchSourceIdentityRepairPlan/v1' &&
    [
      'repair_id',
      'actor',
      'work_item_id',
      'records_root',
      'changelog_path',
      'old_source_id',
      'changelog_before_sha256',
      'changelog_after_sha256',
      'changelog_before',
      'changelog_after',
      'timestamp',
      'digest',
    ].every((key) => isString(value[key])) &&
    Array.isArray(value.changes) &&
    value.changes.length === 2 &&
    value.changes.every(isResearchRepairChange) &&
    Array.isArray(value.dependent_synthesis_paths) &&
    value.dependent_synthesis_paths.length === 0
  );
}
function schemaValidator(runtimeRoot: string, schema: ResearchSchema): (value: unknown) => boolean {
  const runtime = path.resolve(runtimeRoot);
  const require = createRequire(path.join(runtime, 'package.json'));
  const Ajv2020 = ajv2020Constructor(require('ajv/dist/2020'));
  const name = schema === 'ResearchResult/v1' ? 'research-result' : 'research-synthesis';
  const definition = readAjvSchema(path.join(runtime, 'schemas', `${name}.v1.schema.json`));
  return new Ajv2020({ strict: false, allErrors: true }).compile(definition);
}
function ajv2020Constructor(value: unknown): Ajv2020Constructor {
  if (!isAjv2020Module(value)) fail('schema validator is unavailable');
  return value.default;
}
function readAjvSchema(file: string): AnySchema {
  const definition = parseUnknown(bytes(file).toString('utf8'));
  if (!isAjvSchema(definition)) fail('current schema definition is invalid');
  return definition;
}
function isAjv2020Module(value: unknown): value is { default: Ajv2020Constructor } {
  return (isRecord(value) || typeof value === 'function') && 'default' in value && typeof value.default === 'function';
}
function isAjvSchema(value: unknown): value is AnySchema {
  return typeof value === 'boolean' || isRecord(value);
}
function isYamlModule(value: unknown): value is { parse: (source: string) => unknown } {
  return isRecord(value) && 'parse' in value && typeof value.parse === 'function';
}
function validateRecord(raw: Buffer, schema: 'ResearchResult/v1', runtimeRoot: string): ResearchResult;
function validateRecord(raw: Buffer, schema: 'ResearchSynthesis/v1', runtimeRoot: string): ResearchSynthesis;
function validateRecord(raw: Buffer, schema: ResearchSchema, runtimeRoot: string): ResearchResult | ResearchSynthesis {
  const value = parseRecord(raw, schema);
  if (!schemaValidator(runtimeRoot, schema)(value)) fail(`${schema} violates current schema`);
  return validateSourceRecord(value, schema);
}
function validateSourceRecord(
  value: Record<string, unknown>,
  schema: ResearchSchema,
): ResearchResult | ResearchSynthesis {
  return schema === 'ResearchResult/v1' ? validateResearchResult(value) : validateResearchSynthesis(value);
}
function configuredPaths(project: string, runtimeRoot: string): { research_records: string; changelog: string } {
  const require = createRequire(path.join(path.resolve(runtimeRoot), 'package.json'));
  const yamlModule: unknown = require('yaml');
  if (!isYamlModule(yamlModule)) fail('runtime configuration parser is unavailable');
  const YAML = yamlModule;
  const config = YAML.parse(bytes(at(project, 'agent-runtime.config.v1.yaml')).toString('utf8'));
  const paths = configuredResearchPaths(config);
  const researchRecords = paths.research_records;
  const changelog = paths.changelog;
  if (typeof researchRecords !== 'string' || typeof changelog !== 'string')
    fail('configured research paths unavailable');
  at(project, researchRecords);
  at(project, changelog);
  return { research_records: researchRecords, changelog };
}
function configuredResearchPaths(config: unknown): Record<string, unknown> {
  if (!isRecord(config) || !isRecord(config.research_decision) || !isRecord(config.research_decision.paths))
    fail('configured research paths unavailable');
  return config.research_decision.paths;
}
function dependencyPaths(root: string, recordsRoot: string, resultIds: Set<string>, runtimeRoot: string): string[] {
  const folder = at(root, recordsRoot);
  const info = stat(folder);
  if (!info?.isDirectory() || info.isSymbolicLink()) fail('research records directory is unsafe');
  const synthesis: string[] = [];
  for (const name of readdirSync(folder)) {
    if (!name.endsWith('.synthesis.json')) continue;
    const value = validateRecord(bytes(path.join(folder, name)), 'ResearchSynthesis/v1', runtimeRoot);
    if (value.result_refs?.some((ref) => resultIds.has(ref.result_id))) synthesis.push(name);
  }
  return synthesis.sort();
}
function exactPair<T>(values: T[], message: string): [T, T] {
  const first = values[0];
  const second = values[1];
  if (values.length !== 2 || !first || !second) fail(message);
  return [first, second];
}
function replaceReferences(result: ResearchResult, oldId: string, newId: string): ResearchResult {
  const replace = (list: readonly string[]): string[] => list.map((value) => (value === oldId ? newId : value));
  const matches = result.source_refs.filter((item) => item.source_id === oldId);
  if (matches.length !== 1) fail('ambiguous source ID within result');
  const next = {
    ...result,
    source_refs: result.source_refs.map((item) =>
      item.source_id === oldId ? { ...item, source_id: newId } : { ...item },
    ),
    findings: result.findings.map((item) => ({ ...item, source_ids: replace(item.source_ids) })),
    conflicts: result.conflicts.map((item) => ({ ...item, source_ids: replace(item.source_ids) })),
    options: result.options.map((item) => ({ ...item, evidence_refs: replace(item.evidence_refs) })),
    recommendation: result.recommendation
      ? { ...result.recommendation, evidence_refs: replace(result.recommendation.evidence_refs) }
      : null,
  };
  const { digest: _oldDigest, ...body } = next;
  void _oldDigest;
  next.digest = digest(body);
  return next;
}

function deriveRepairPlan({
  repairId,
  actor,
  timestamp,
  records,
  recordsRoot,
  changelogPath,
  changelogBefore,
  runtimeRoot,
}: DeriveResearchRepairInput): ResearchRepairPlan {
  const [firstInput, secondInput] = exactPair(records, 'repair identity or exact two-file contour invalid');
  if (
    !/^[a-z0-9][a-z0-9._-]{0,79}$/.test(repairId) ||
    typeof actor !== 'string' ||
    !actor.trim() ||
    !/^\d{4}-\d{2}-\d{2}T/.test(timestamp) ||
    firstInput.path === secondInput.path
  )
    fail('repair identity or exact two-file contour invalid');
  const checkedRecords = records.map(({ path: relative, raw }) => {
    if (!relative.startsWith(`${recordsRoot}/`) || !relative.endsWith('.research.json'))
      fail('repair path escapes configured research records');
    return { path: relative, raw, value: validateRecord(raw, 'ResearchResult/v1', runtimeRoot) };
  });
  const [first, second] = exactPair(checkedRecords, 'repair records disappeared during validation');
  if (
    first.value.work_item_id !== second.value.work_item_id ||
    first.value.scope_id !== second.value.scope_id ||
    first.value.source_revision !== second.value.source_revision ||
    first.value.result_id === second.value.result_id
  )
    fail('repair records do not share one distinct-result scope');
  const firstSources = new Map(first.value.source_refs.map((item) => [item.source_id, item]));
  const conflicts = second.value.source_refs.filter(
    (item) =>
      firstSources.has(item.source_id) &&
      stable({ source_kind: item.source_kind, locator: item.locator, digest: item.digest ?? null }) !==
        stable({
          source_kind: firstSources.get(item.source_id)?.source_kind,
          locator: firstSources.get(item.source_id)?.locator,
          digest: firstSources.get(item.source_id)?.digest ?? null,
        }),
  );
  if (conflicts.length !== 1) fail('expected exactly one source-ID provenance conflict');
  const conflict = conflicts[0];
  if (!conflict) throw new Error('vida research repair: source conflict disappeared');
  const oldId = conflict.source_id;
  const changes = checkedRecords.map(({ path: relative, raw, value }) => {
    const source = value.source_refs.find((item) => item.source_id === oldId);
    if (!source) throw new Error('vida research repair: both results must bind conflicting source ID');
    const identity = { source_kind: source.source_kind, locator: source.locator, digest: source.digest ?? null };
    const newId = `src-${digest(identity)}`;
    if (value.source_refs.some((item) => item.source_id === newId && item.source_id !== oldId))
      fail('derived source identity collides with existing source');
    const next = replaceReferences(value, oldId, newId);
    validateRecord(json(next), 'ResearchResult/v1', runtimeRoot);
    return {
      path: relative,
      before_sha256: sha(raw),
      after_sha256: sha(json(next)),
      before_digest: value.digest,
      after_digest: next.digest,
      old_source_id: oldId,
      new_source_id: newId,
      before: raw.toString('utf8'),
      after: json(next).toString('utf8'),
      result_id: value.result_id,
    };
  });
  const [firstChange, secondChange] = exactPair(changes, 'repair changes disappeared during validation');
  if (firstChange.new_source_id === secondChange.new_source_id) fail('new source identities still collide');
  if (!changelogBefore.endsWith('\n')) fail('changelog is incomplete');
  const events = changes.map((item) => ({
    schema: 'DocumentationChangeEvent/v1',
    event_id: `documentation-event-${digest({ repairId, path: item.path, after: item.after_digest }).slice(0, 48)}`,
    logical_edit_id: `ResearchResult/v1:${item.path}`,
    work_id: first.value.work_item_id,
    source_revision: first.value.source_revision,
    operation: 'finalize',
    document_id: item.result_id,
    path_before: item.path,
    path_after: item.path,
    before_sha256: item.before_sha256,
    after_sha256: item.after_sha256,
    actor,
    pointer: `.agent/work/${repairId}/repair-plan.v1.json`,
    timestamp,
  }));
  const changelogAfter = changelogBefore + events.map((event) => stable(event) + '\n').join('');
  const schema: ResearchRepairPlan['schema'] = 'VidaResearchSourceIdentityRepairPlan/v1';
  const dependentSynthesisPaths: ResearchRepairPlan['dependent_synthesis_paths'] = [];
  const body = {
    schema,
    repair_id: repairId,
    actor,
    work_item_id: first.value.work_item_id,
    records_root: recordsRoot,
    changelog_path: changelogPath,
    old_source_id: oldId,
    changes,
    changelog_before_sha256: sha(Buffer.from(changelogBefore)),
    changelog_after_sha256: sha(Buffer.from(changelogAfter)),
    changelog_before: changelogBefore,
    changelog_after: changelogAfter,
    dependent_synthesis_paths: dependentSynthesisPaths,
    timestamp,
  };
  return { ...body, digest: digest(body) };
}

/** Specific current-v1 repair plan for one observed cross-result source-ID provenance conflict. */
export function planResearchSourceIdentityRepair({
  root,
  repairId,
  actor,
  timestamp,
  recordPaths,
  recordsRoot,
  changelogPath,
  runtimeRoot = runtimePackageAccess().repository_root,
}: {
  root: string;
  repairId: string;
  actor: string;
  timestamp: string;
  recordPaths: string[];
  recordsRoot: string;
  changelogPath: string;
  runtimeRoot?: string;
}): ResearchRepairPlan {
  const project = projectRoot(root);
  const configured = configuredPaths(project, runtimeRoot);
  if (recordsRoot !== configured.research_records || changelogPath !== configured.changelog)
    fail('repair paths differ from current configuration');
  if (!Array.isArray(recordPaths) || recordPaths.length !== 2) fail('exact two-file contour required');
  const records = recordPaths.map((relative) => ({ path: relative, raw: bytes(at(project, relative)) }));
  const resultIds = new Set(records.map(({ raw }) => validateRecord(raw, 'ResearchResult/v1', runtimeRoot).result_id));
  if (dependencyPaths(project, recordsRoot, resultIds, runtimeRoot).length)
    fail('dependent synthesis exists; this narrow repair cannot update it');
  return deriveRepairPlan({
    repairId,
    actor,
    timestamp,
    records,
    recordsRoot,
    changelogPath,
    changelogBefore: bytes(at(project, changelogPath)).toString('utf8'),
    runtimeRoot,
  });
}

function replaceCas(file: string, beforeSha: string, afterSha: string, content: Buffer): void {
  const current = bytes(file);
  if (sha(current) === afterSha) return;
  if (sha(current) !== beforeSha) fail(`third-party bytes: ${file}`);
  const pending = `${file}.pending-${randomUUID()}`;
  try {
    const fd = openSync(pending, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
    try {
      writeFileSync(fd, content);
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    if (sha(bytes(file)) !== beforeSha) fail(`CAS lost: ${file}`);
    renameSync(pending, file);
    if (sha(bytes(file)) !== afterSha) fail(`repair publication failed: ${file}`);
  } finally {
    if (stat(pending)) unlinkSync(pending);
  }
}
function journal(file: string, repairId: string, phase: RepairPhase): void {
  const expected: RepairPhase[] = ['record_0', 'record_1', 'changelog', 'complete'];
  const raw = stat(file) ? bytes(file).toString('utf8') : '';
  if (raw && !raw.endsWith('\n')) fail('incomplete repair journal');
  const events: unknown[] = raw
    ? raw
        .trimEnd()
        .split('\n')
        .map((line) => {
          return parseUnknown(line);
        })
    : [];
  if (
    events.some((event, index) => !isResearchRepairJournalEvent(event, repairId, expected[index] ?? '')) ||
    events.length > expected.length
  )
    fail('repair journal drift');
  const position = expected.indexOf(phase);
  if (position < events.length) return;
  if (position !== events.length) fail('repair journal phase gap');
  const fd = openSync(file, constants.O_CREAT | constants.O_APPEND | constants.O_WRONLY, 0o600);
  try {
    writeFileSync(fd, `${JSON.stringify({ schema: 'VidaResearchRepairEvent/v1', repair_id: repairId, phase })}\n`);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}
function isResearchRepairJournalEvent(value: unknown, repairId: string, phase: string): boolean {
  return (
    isRecord(value) &&
    value.schema === 'VidaResearchRepairEvent/v1' &&
    value.repair_id === repairId &&
    value.phase === phase
  );
}
/** Shared exact-byte/digest/shape parser; callers retain their file-access boundary. */
export function parseResearchRepairPlan(raw: Buffer): ResearchRepairPlan {
  const value = parseRecord(raw, 'VidaResearchSourceIdentityRepairPlan/v1');
  if (!isResearchRepairPlan(value)) throw new Error('vida research repair: repair plan shape invalid');
  return value;
}
function readResearchRepairPlan(file: string): ResearchRepairPlan {
  return parseResearchRepairPlan(bytes(file));
}
function repairRecordPhase(index: number): RecordPhase {
  if (index === 0) return 'record_0';
  if (index === 1) return 'record_1';
  fail('repair record phase is outside the exact two-record plan');
}

/** Journaled exact-byte CAS; the caller must provide a quiesced isolated work root. */
export function applyResearchSourceIdentityRepair({
  root,
  repairId,
  runtimeRoot = runtimePackageAccess().repository_root,
  resume = false,
  onPhase,
}: {
  root: string;
  repairId: string;
  runtimeRoot?: string;
  resume?: boolean;
  onPhase?: (phase: string) => void;
}): {
  schema: 'VidaResearchSourceIdentityRepairResult/v1';
  repair_id: string;
  status: 'complete';
  plan_digest: string;
} {
  const project = projectRoot(root);
  const workRoot = at(project, `.agent/work/${repairId}`);
  const plan = readResearchRepairPlan(path.join(workRoot, 'repair-plan.v1.json'));
  if (plan.repair_id !== repairId || plan.changes.length !== 2 || plan.dependent_synthesis_paths.length)
    fail('repair plan scope invalid');
  const configured = configuredPaths(project, runtimeRoot);
  if (plan.records_root !== configured.research_records || plan.changelog_path !== configured.changelog)
    fail('repair paths differ from current configuration');
  // Treat the durable plan as a proposal, never as authority to name arbitrary files or bytes.
  const rebuilt = deriveRepairPlan({
    repairId,
    actor: plan.actor,
    timestamp: plan.timestamp,
    records: plan.changes.map((item) => ({ path: item.path, raw: Buffer.from(item.before) })),
    recordsRoot: plan.records_root,
    changelogPath: plan.changelog_path,
    changelogBefore: plan.changelog_before,
    runtimeRoot,
  });
  if (!json(rebuilt).equals(json(plan))) fail('repair plan differs from deterministic transformation');
  const allowedRoot = at(project, plan.records_root);
  const allowedInfo = stat(allowedRoot);
  if (!allowedInfo?.isDirectory() || allowedInfo.isSymbolicLink()) fail('configured research records root is unsafe');
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
    try {
      writeFileSync(fd, json(lock));
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
  }
  if (
    dependencyPaths(project, plan.records_root, new Set(plan.changes.map((item) => item.result_id)), runtimeRoot).length
  )
    fail('new dependent synthesis blocks repair');
  const journalPath = path.join(workRoot, 'repair-journal.v1.jsonl');
  plan.changes.forEach((item, index) => {
    const phase = repairRecordPhase(index);
    replaceCas(at(project, item.path), item.before_sha256, item.after_sha256, Buffer.from(item.after));
    journal(journalPath, repairId, phase);
    onPhase?.(phase);
  });
  replaceCas(
    at(project, plan.changelog_path),
    plan.changelog_before_sha256,
    plan.changelog_after_sha256,
    Buffer.from(plan.changelog_after),
  );
  journal(journalPath, repairId, 'changelog');
  onPhase?.('changelog');
  journal(journalPath, repairId, 'complete');
  onPhase?.('complete');
  return {
    schema: 'VidaResearchSourceIdentityRepairResult/v1',
    repair_id: repairId,
    status: 'complete',
    plan_digest: plan.digest,
  };
}
