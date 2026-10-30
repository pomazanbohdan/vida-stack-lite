import { createHash, randomUUID } from 'node:crypto';
import { readFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { CatalogError, readSchema, type Catalog, type Provenance } from '../skills/vp-mode/scripts/catalog.ts';
import { parseFrontmatter } from '../skills/vp-mode/scripts/frontmatter.ts';
import { instructionSchemaVersion, isInstructionClassification, LEGACY_CLASSIFICATION, parseFacetClassification, type InstructionClassification } from '../skills/vp-mode/scripts/instruction-facets.ts';
import { APPROACH_VOCABULARY, parseApproachAssessments } from '../skills/vp-mode/scripts/instruction-approaches.ts';
import { validateAgainstSchema, type Schema } from '../skills/vp-mode/scripts/schema.ts';
import { readEligibleSource, sealArtifact, verifyArtifact, resolveArtifactPath, type ArtifactRef, type EligibleSource } from './source-packets.ts';
import { checkCorpus } from './check-corpus.ts';

export type InstructionSpec = {
  instruction_id: string; title: string; summary: string;
  capability_tags: string[]; pattern_tags: string[]; roles: string[]; products: string[];
  conditions_applies_when: string; conditions_does_not_apply_when: string;
  artifact_contract_output_type: string; artifact_contract_required_data: string[]; artifact_contract_verified_by: string;
  compatibility_excludes: string[]; compatibility_requires: string[];
  provenance: Provenance[]; status: 'active' | 'disabled'; revision: number; body: string;
};
export type ConvertOptions = {
  root: string; catalogPath?: string; mapPath?: string; instructionsDir?: string;
  now?: () => string;
};
export type InstructionFacetAssignment = Readonly<{
  instruction_id: string;
  expected_sha256: string;
  classification: InstructionClassification;
}>;
export type PrepareInstructionFacetBatchOptions = Omit<ConvertOptions, 'instructionsDir'> & {
  stagingRoot: string;
  classificationEvidence: ArtifactRef;
  policyConfig: ArtifactRef;
  migration?: FacetMigration;
};
export type ConversionResult = {
  kind: 'instruction';
  instructionId: string; path: string; sha256: string; written: boolean;
  manifestUpdated: boolean; mapUpdated: boolean; manifestRevision: number;
} | {
  kind: 'map-record';
  instructionId: string; path: string; sha256: string; written: boolean;
  manifestUpdated: boolean; mapUpdated: boolean; manifestRevision: number;
} | { kind: 'removal'; instructionId: string; removed: true; manifestUpdated: boolean; mapUpdated: boolean; manifestRevision: number };
export type RemovalResult = Extract<ConversionResult, { kind: 'removal' }>;
export type MapRecordSpec = { donor: string; source_revision: string; path: string; status: 'rejected' | 'converted' | 'merged' | 'split'; reason?: string; instruction_ids?: string[]; contributed_sources?: string[] };

const specFields = [
  'instruction_id', 'title', 'summary', 'capability_tags', 'pattern_tags', 'roles', 'products',
  'conditions_applies_when', 'conditions_does_not_apply_when', 'artifact_contract_output_type',
  'artifact_contract_required_data', 'artifact_contract_verified_by', 'compatibility_excludes',
  'compatibility_requires', 'provenance', 'status', 'revision', 'body',
] as const;
const kebab = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const tag = /^[a-z0-9]+(?:-[a-z0-9]+)+$/;
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function fail(field: string, source: string, message = `invalid instruction spec field: ${field}`): never {
  throw new CatalogError('CATALOG_INVALID', message, { field, source });
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmpty(value: unknown, field: string, source: string): string {
  if (typeof value !== 'string' || value.trim() === '') fail(field, source);
  return value;
}

function parseMapRecord(value: unknown, source: string): MapRecordSpec {
  if (!record(value)) fail('$', source, 'map record must be an object');
  const allowed = ['donor', 'source_revision', 'path', 'status', 'reason', 'instruction_ids', 'contributed_sources'];
  const extra = Object.keys(value).find((key) => !allowed.includes(key));
  if (extra !== undefined) fail(extra, source, `unknown map record field: ${extra}`);
  for (const field of ['donor', 'source_revision', 'path', 'status']) if (!Object.prototype.hasOwnProperty.call(value, field)) fail(field, source, `missing map record field: ${field}`);
  const mapText = (input: unknown, field: string): string => {
    if (typeof input !== 'string' || input.trim() === '') throw new CatalogError('CATALOG_INVALID', `invalid map record field: ${field}`, { field, source });
    return input;
  };
  const donor = mapText(value.donor, 'donor'); const source_revision = mapText(value.source_revision, 'source_revision'); const path = mapText(value.path, 'path');
  if (!/^[0-9a-f]{40}$/.test(source_revision)) fail('source_revision', source);
  if (value.status === 'rejected') {
    const reason = mapText(value.reason, 'reason');
    if (Object.prototype.hasOwnProperty.call(value, 'instruction_ids')) fail('instruction_ids', source);
    if (Object.prototype.hasOwnProperty.call(value, 'contributed_sources')) fail('contributed_sources', source);
    return { donor, source_revision, path, status: 'rejected', reason };
  }
  if (value.status === 'merged') {
    const instruction_ids = stringArray(value.instruction_ids, 'instruction_ids', source);
    const contributed_sources = stringArray(value.contributed_sources, 'contributed_sources', source);
    if (instruction_ids.length === 0 || !instruction_ids.every((item) => item.trim() !== '')) fail('instruction_ids', source);
    if (contributed_sources.length === 0 || !contributed_sources.every((item) => item.trim() !== '')) fail('contributed_sources', source);
    return { donor, source_revision, path, status: 'merged', instruction_ids, contributed_sources };
  }
  if (value.status === 'converted') {
    const instruction_ids = stringArray(value.instruction_ids, 'instruction_ids', source);
    if (instruction_ids.length !== 1 || !instruction_ids.every((item) => item.trim() !== '')) fail('instruction_ids', source);
    if (Object.prototype.hasOwnProperty.call(value, 'reason')) fail('reason', source);
    if (Object.prototype.hasOwnProperty.call(value, 'contributed_sources')) fail('contributed_sources', source);
    return { donor, source_revision, path, status: 'converted', instruction_ids };
  }
  if (value.status === 'split') {
    const instruction_ids = stringArray(value.instruction_ids, 'instruction_ids', source);
    if (instruction_ids.length === 0 || !instruction_ids.every((item) => item.trim() !== '')) fail('instruction_ids', source);
    if (Object.prototype.hasOwnProperty.call(value, 'reason')) fail('reason', source);
    if (Object.prototype.hasOwnProperty.call(value, 'contributed_sources')) fail('contributed_sources', source);
    return { donor, source_revision, path, status: 'split', instruction_ids };
  }
  fail('status', source);
}

function stringArray(value: unknown, field: string, source: string): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) fail(field, source);
  return value;
}

function plain(value: string): string {
  if (value === '' || value.trim() !== value || /[:#"'\[\]{}&,*!|>%@`\n\r]/.test(value) || /^(?:[-?]|\s)/.test(value) || /^(?:true|false|null|~|[-+]?(?:[0-9]|\.[0-9]))(?:$|\s)/i.test(value)) return JSON.stringify(value);
  return value;
}

function yamlList(key: string, values: string[]): string[] {
  if (values.length === 0) return [`${key}: []`];
  return [`${key}:`, ...values.map((value) => `  - ${plain(value)}`)];
}

function provenanceText(item: Provenance): string {
  return `donor=${item.donor}; license=${item.license}; revision=${item.revision}; path=${item.path}`;
}

function yamlString(key: string, value: string): string {
  return `${key}: ${plain(value)}`;
}

export function parseInstructionSpec(value: unknown, source: string): InstructionSpec {
  if (!record(value)) fail('$', source, 'instruction spec must be an object');
  for (const key of Object.keys(value)) if (!specFields.includes(key as (typeof specFields)[number])) fail(key, source, `unknown instruction spec field: ${key}`);
  for (const key of specFields) if (!Object.prototype.hasOwnProperty.call(value, key)) fail(key, source, `missing instruction spec field: ${key}`);
  const instructionId = nonEmpty(value.instruction_id, 'instruction_id', source);
  if (!kebab.test(instructionId)) fail('instruction_id', source);
  const title = nonEmpty(value.title, 'title', source);
  const summary = nonEmpty(value.summary, 'summary', source);
  const capabilityTags = stringArray(value.capability_tags, 'capability_tags', source);
  const patternTags = stringArray(value.pattern_tags, 'pattern_tags', source);
  for (const field of ['capability_tags', 'pattern_tags'] as const) {
    const tags = field === 'capability_tags' ? capabilityTags : patternTags;
    if (!tags.every((item) => tag.test(item))) fail(field, source);
  }
  const roles = stringArray(value.roles, 'roles', source);
  const products = stringArray(value.products, 'products', source);
  const requiredData = stringArray(value.artifact_contract_required_data, 'artifact_contract_required_data', source);
  const excludes = stringArray(value.compatibility_excludes, 'compatibility_excludes', source);
  const requires = stringArray(value.compatibility_requires, 'compatibility_requires', source);
  for (const field of ['compatibility_excludes', 'compatibility_requires'] as const) {
    const values = field === 'compatibility_excludes' ? excludes : requires;
    if (!values.every((item) => kebab.test(item))) fail(field, source);
  }
  const applies = nonEmpty(value.conditions_applies_when, 'conditions_applies_when', source);
  const excludesWhen = nonEmpty(value.conditions_does_not_apply_when, 'conditions_does_not_apply_when', source);
  const outputType = nonEmpty(value.artifact_contract_output_type, 'artifact_contract_output_type', source);
  if (typeof value.artifact_contract_verified_by !== 'string') fail('artifact_contract_verified_by', source);
  const verifiedBy = value.artifact_contract_verified_by;
  const body = nonEmpty(value.body, 'body', source);
  if (outputType === 'none' && requiredData.length !== 0) fail('artifact_contract_required_data', source);
  if (outputType !== 'none' && verifiedBy.trim() === '') fail('artifact_contract_verified_by', source);
  for (const [field, text] of [['title', title], ['summary', summary], ['conditions_applies_when', applies], ['conditions_does_not_apply_when', excludesWhen], ['artifact_contract_verified_by', verifiedBy]] as const) {
    if (/[\u0000-\u001f\u007f-\u009f]/.test(text)) fail(field, source, `control character in ${field}`);
  }
  if (/[\u0000-\u001f\u007f-\u009f]/.test(outputType)) fail('artifact_contract_output_type', source, 'control character in artifact_contract_output_type');
  if (!Array.isArray(value.provenance) || value.provenance.length === 0) fail('provenance', source);
  const provenance: Provenance[] = value.provenance.map((item, index) => {
    if (!record(item)) fail(`provenance[${index}]`, source);
    const donor = nonEmpty(item.donor, `provenance[${index}].donor`, source);
    const license = nonEmpty(item.license, `provenance[${index}].license`, source);
    const revision = nonEmpty(item.revision, `provenance[${index}].revision`, source);
    const path = nonEmpty(item.path, `provenance[${index}].path`, source);
    for (const [field, text] of [['donor', donor], ['license', license], ['path', path]] as const) {
      if (/[\u0000-\u001f\u007f-\u009f]/.test(text)) fail(`provenance[${index}].${field}`, source, `control character in provenance[${index}].${field}`);
    }
    if (!/^[0-9a-f]{40}$/.test(revision) || /[;=]/.test(donor) || /[;=]/.test(license) || /[;=]/.test(path)) fail(`provenance[${index}]`, source);
    const extra = Object.keys(item).find((key) => !['donor', 'license', 'revision', 'path'].includes(key));
    if (extra !== undefined) fail(`provenance[${index}].${extra}`, source, `unknown instruction spec field: provenance[${index}].${extra}`);
    return { donor, license, revision, path };
  });
  const provenanceKeys = new Set<string>();
  provenance.forEach((item, index) => {
    const key = `${item.donor}\0${item.revision}\0${item.path}`;
    if (provenanceKeys.has(key)) throw new CatalogError('CATALOG_INVALID', 'duplicate provenance source', { provenance_index: index });
    provenanceKeys.add(key);
  });
  const revisions = new Map<string, Set<string>>();
  for (const item of provenance) {
    const values = revisions.get(item.donor) ?? new Set<string>(); values.add(item.revision); revisions.set(item.donor, values);
  }
  for (const [donor, values] of revisions) if (values.size > 1) throw new CatalogError('CATALOG_INVALID', 'provenance mixes donor revisions', { donor, revisions: [...values] });
  if (value.status !== 'active' && value.status !== 'disabled') fail('status', source);
  if (typeof value.revision !== 'number' || !Number.isInteger(value.revision) || value.revision < 1) fail('revision', source);
  for (const [field, values] of [['roles', roles], ['products', products]] as const) if (!values.every((item) => kebab.test(item))) fail(field, source);
  return {
    instruction_id: instructionId, title, summary, capability_tags: capabilityTags, pattern_tags: patternTags,
    roles, products, conditions_applies_when: applies, conditions_does_not_apply_when: excludesWhen,
    artifact_contract_output_type: outputType, artifact_contract_required_data: requiredData,
    artifact_contract_verified_by: verifiedBy, compatibility_excludes: excludes, compatibility_requires: requires,
    provenance, status: value.status, revision: value.revision, body,
  };
}

export function renderInstruction(spec: InstructionSpec): string {
  const lines = [
    '---',
    'schema: VPInstruction/v1.2',
    'classification_status: unclassified',
    'classification_reason: classification-not-assessed',
    yamlString('instruction_id', spec.instruction_id),
    yamlString('title', spec.title),
    yamlString('summary', spec.summary),
    ...yamlList('capability_tags', spec.capability_tags),
    ...yamlList('pattern_tags', spec.pattern_tags),
  ];
  if (spec.roles.length > 0) lines.push(...yamlList('roles', spec.roles));
  if (spec.products.length > 0) lines.push(...yamlList('products', spec.products));
  lines.push(
    yamlString('conditions_applies_when', spec.conditions_applies_when),
    yamlString('conditions_does_not_apply_when', spec.conditions_does_not_apply_when),
    yamlString('artifact_contract_output_type', spec.artifact_contract_output_type),
    ...yamlList('artifact_contract_required_data', spec.artifact_contract_required_data),
    yamlString('artifact_contract_verified_by', spec.artifact_contract_verified_by),
    ...yamlList('compatibility_excludes', spec.compatibility_excludes),
    ...yamlList('compatibility_requires', spec.compatibility_requires),
    ...yamlList('provenance', spec.provenance.map(provenanceText)),
    yamlString('status', spec.status),
    `revision: ${spec.revision}`,
    '---',
    '',
    spec.body,
  );
  let output = lines.join('\n');
  if (!output.endsWith('\n')) output += '\n';
  return output;
}

function json(value: unknown): string {
  return JSON.stringify(value, null, 2) + '\n';
}

function target(root: string, path: string | undefined, fallback: string): string {
  const value = path ?? fallback;
  return resolve(isAbsolute(value) ? value : join(root, value));
}

function manifestInstructionPath(manifestPath: string, instructionPath: string): string {
  return relative(dirname(manifestPath), instructionPath).split(sep).join('/');
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

type ConversionIO = { read: (path: string) => Promise<string | undefined>; write: (path: string, text: string) => Promise<void> };
type OwnedConversionIO = ConversionIO & { remove: (path: string) => Promise<void> };
async function readJson(path: string, label: string, io?: ConversionIO): Promise<unknown> {
  try {
    const text = io === undefined ? await readFile(path, 'utf8') : await io.read(path);
    return text === undefined ? undefined : JSON.parse(text) as unknown;
  } catch (error) {
    if (error instanceof SyntaxError) throw new CatalogError('CATALOG_INVALID', `${label} JSON is malformed`, { path, error: error.message });
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') return undefined;
    throw new CatalogError('CATALOG_INVALID', `cannot read ${label}`, { path, error: error instanceof Error ? error.message : String(error) });
  }
}

async function withConverterOwnership<T>(root: string, run: (io: OwnedConversionIO, fence: () => void) => Promise<T>, operation: ArtifactRef | null = null): Promise<T> {
  const lock = join(resolve(root), '.vp-convert-publication.lock');
  await mkdir(resolve(root), { recursive: true });
  try { await mkdir(lock); } catch (error) {
    throw new CatalogError('CATALOG_INVALID', 'converter ownership unavailable; reconcile any retained writer before retry', { lock, error: error instanceof Error ? error.message : String(error) });
  }
  const token = randomUUID();
  let writeUnknown = false;
  let fenced = false;
  let completed = false;
  const io: OwnedConversionIO = {
    read: async path => { try { return await readFile(path, 'utf8'); } catch (error) { if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') return undefined; throw error; } },
    write: async (path, text) => { await mkdir(dirname(path), { recursive: true }); writeUnknown = true; await writeFile(path, text, 'utf8'); writeUnknown = false; },
    remove: async path => { writeUnknown = true; await rm(path, { force: true }); writeUnknown = false; },
  };
  try {
    await writeFile(join(lock, 'owner.json'), json({ token, pid: process.pid, root: resolve(root), operation }), { flag: 'wx' });
    const result = await run(io, () => { fenced = true; });
    completed = true;
    return result;
  } finally {
    if (!fenced && (completed || !writeUnknown)) {
      const bytes = await optionalBytes(join(lock, 'owner.json'));
      const owner: unknown = bytes === undefined ? undefined : JSON.parse(bytes.toString('utf8'));
      if (record(owner) && owner.token === token) await rm(lock, { recursive: true });
    }
  }
}

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function validateRenderedSpec(spec: InstructionSpec, schema: Schema): void {
  let parsed: ReturnType<typeof parseFrontmatter>;
  try { parsed = parseFrontmatter(renderInstruction(spec)); } catch (error) {
    throw new CatalogError('CATALOG_INVALID', 'rendered instruction frontmatter is invalid', { field: 'frontmatter', line: typeof error === 'object' && error !== null && 'line' in error ? error.line : 0, error: error instanceof Error ? error.message : String(error) });
  }
  const errors = validateAgainstSchema(parsed.data, schema);
  if (errors.length > 0) throw new CatalogError('CATALOG_INVALID', 'rendered instruction is invalid', { schemaErrors: errors });
}

export async function convert(specPath: string, options: ConvertOptions): Promise<ConversionResult> {
  return withConverterOwnership(options.root, io => compileInstruction(specPath, options, io));
}

async function compileInstruction(specPath: string, options: ConvertOptions, io: ConversionIO, schemas = new Map<string, Schema>()): Promise<ConversionResult> {
  const schema = async (name: string): Promise<Schema> => {
    const previous = schemas.get(name);
    if (previous !== undefined) return previous;
    const value = await readSchema(packageRoot, name); schemas.set(name, value); return value;
  };
  const root = resolve(options.root);
  const raw = await readJson(specPath, 'instruction spec', io);
  if (raw === undefined) throw new CatalogError('CATALOG_INVALID', 'instruction spec file is missing', { source: specPath });
  const spec = parseInstructionSpec(raw, specPath);
  const instructionSchema = await schema('vpinstruction.v1.2.schema.json');

  const catalogPath = target(root, options.catalogPath, join(root, 'catalog.json'));
  const mapPath = target(root, options.mapPath, join(root, 'corpus-map.json'));
  const instructionsDir = target(root, options.instructionsDir, join(root, 'instructions'));
  const instructionPath = join(instructionsDir, `${spec.instruction_id}.md`);
  const relativePath = manifestInstructionPath(catalogPath, instructionPath);
  const manifestValue = await readJson(catalogPath, 'catalog manifest', io);
  let manifest: Catalog;
  const manifestExists = manifestValue !== undefined;
  if (manifestExists) {
    const catalogSchema = await schema('vpcatalog.v1.schema.json');
    if (!record(manifestValue)) throw new CatalogError('CATALOG_INVALID', 'catalog manifest must be an object', { path: catalogPath });
    const errors = validateAgainstSchema(manifestValue, catalogSchema);
    if (errors.length > 0) throw new CatalogError('CATALOG_INVALID', 'catalog schema validation failed', { schemaErrors: errors });
    manifest = manifestValue as unknown as Catalog;
  } else {
    throw new CatalogError('CATALOG_INVALID', 'catalog manifest must be created first with the owner-approved tag dictionary');
  }
  spec.capability_tags = spec.capability_tags.map((value) => manifest.tag_aliases[value] ?? value);
  spec.pattern_tags = spec.pattern_tags.map((value) => manifest.tag_aliases[value] ?? value);
  const rendered = renderInstruction(spec);
  const existingEntry = manifest.instructions.find((entry) => entry.instruction_id === spec.instruction_id);
  if (existingEntry !== undefined && existingEntry.path !== relativePath) throw new CatalogError('CATALOG_INVALID', `duplicate instruction id ${spec.instruction_id}`, { instruction_id: spec.instruction_id, paths: [existingEntry.path, relativePath] });
  const exemptions = manifest.tag_exemptions;
  const exempt = (dimension: 'capability' | 'pattern') => exemptions.some((item) => item.instruction_id === spec.instruction_id && item.dimension === dimension);
  for (const [dimension, values] of [['capability', spec.capability_tags], ['pattern', spec.pattern_tags]] as const) {
    if (values.length === 0 && !exempt(dimension)) throw new CatalogError('CATALOG_INVALID', `empty ${dimension} tags require an exemption`, { dimension });
    for (const value of values) {
      if (!Object.prototype.hasOwnProperty.call(manifest.tag_dictionary[dimension], value) && !exempt(dimension)) throw new CatalogError('CATALOG_INVALID', `unknown ${dimension} tag: ${value}`, { tag: value, dimension });
    }
  }
  validateRenderedSpec(spec, instructionSchema);

  let oldMarkdown: string | undefined;
  try { oldMarkdown = await io.read(instructionPath); } catch (error) {
    if (!(typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT')) throw error;
  }
  if (oldMarkdown !== undefined && instructionSchemaVersion(parseFrontmatter(oldMarkdown).data.schema) !== 'faceted-v1.2') {
    throw new CatalogError('CATALOG_INVALID', `instruction ${spec.instruction_id} has faceted or unsupported metadata; use prepareInstructionFacetBatch for a reviewed metadata update`, { instruction_id: spec.instruction_id });
  }
  if (oldMarkdown !== undefined && oldMarkdown !== rendered) {
    const existing = parseFrontmatter(oldMarkdown);
    const errors = validateAgainstSchema(existing.data, instructionSchema);
    if (errors.length || !same(parseFacetClassification(existing.data), { classification_status: 'unclassified', classification_reason: 'classification-not-assessed' }) || existing.data.approach_assessments !== undefined || existing.data.approach_body_sha256 !== undefined) {
      throw new CatalogError('CATALOG_INVALID', 'existing instruction has metadata requiring a reviewed update; use prepareInstructionFacetBatch', { instruction_id: spec.instruction_id });
    }
  }
  const written = oldMarkdown !== rendered;
  const digest = sha256(rendered);
  const nextEntries = manifest.instructions.filter((entry) => entry.instruction_id !== spec.instruction_id);
  nextEntries.push({ instruction_id: spec.instruction_id, path: relativePath, sha256: digest });
  nextEntries.sort((left, right) => left.instruction_id < right.instruction_id ? -1 : left.instruction_id > right.instruction_id ? 1 : 0);
  const manifestUpdated = manifest.instructions.length !== nextEntries.length || manifest.instructions.some((entry, index) => {
    const next = nextEntries[index]; return next === undefined || entry.instruction_id !== next.instruction_id || entry.path !== next.path || entry.sha256 !== next.sha256;
  });
  if (manifestUpdated && manifestExists) manifest.revision += 1;
  manifest.instructions = nextEntries;
  if (written && manifestExists) manifest.updated_at = (options.now ?? (() => new Date().toISOString()))();
  const catalogSchema = await schema('vpcatalog.v1.schema.json');
  const catalogErrors = validateAgainstSchema(manifest, catalogSchema);
  if (catalogErrors.length > 0) throw new CatalogError('CATALOG_INVALID', 'catalog schema validation failed', { schemaErrors: catalogErrors });

  const mapValue = await readJson(mapPath, 'corpus map', io);
  let map: Record<string, unknown>;
  if (mapValue === undefined) map = { schema: 'VPCorpusMap/v1', revision: 1, updated_at: '', donors: {} };
  else {
    if (!record(mapValue)) throw new CatalogError('CATALOG_INVALID', 'corpus map must be an object', { path: mapPath });
    const mapSchema = await schema('vpcorpusmap.v1.schema.json');
    const errors = validateAgainstSchema(mapValue, mapSchema);
    if (errors.length > 0) throw new CatalogError('CATALOG_INVALID', 'corpus map schema validation failed', { schemaErrors: errors });
    map = mapValue;
  }
  const donors = record(map.donors) ? map.donors : {};
  map.donors = donors;
  for (const source of spec.provenance) {
    const previousDonor = donors[source.donor];
    const donor = record(previousDonor) ? previousDonor : { source_revision: source.revision, files: {} };
    const revisionChanged = donor.source_revision !== source.revision;
    const files = revisionChanged ? {} : record(donor.files) ? donor.files : {};
    donor.files = files;
    donor.source_revision = source.revision;
    const fileRecord = files[source.path];
    const existing: Record<string, unknown> = record(fileRecord) ? fileRecord : {};
    const ids = Array.isArray(existing.instruction_ids) ? existing.instruction_ids.filter((id): id is string => typeof id === 'string') : [];
    const alreadyMapped = ids.includes(spec.instruction_id);
    if (!alreadyMapped) ids.push(spec.instruction_id);
    delete existing.reason;
    files[source.path] = { ...existing, status: existing.status === 'merged' && alreadyMapped ? 'merged' : ids.length > 1 ? 'split' : 'converted', instruction_ids: ids };
    donors[source.donor] = donor;
  }
  const mapWasMissing = (await readJson(mapPath, 'corpus map', io)) === undefined;
  if (mapWasMissing) map.updated_at = (options.now ?? (() => new Date().toISOString()))();
  const mapSchema = await schema('vpcorpusmap.v1.schema.json');
  const mapErrors = validateAgainstSchema(map, mapSchema);
  if (mapErrors.length > 0) throw new CatalogError('CATALOG_INVALID', 'corpus map schema validation failed', { schemaErrors: mapErrors });
  const oldMapValue = mapWasMissing ? undefined : await readJson(mapPath, 'corpus map', io);
  const mapComparable = { ...map } as Record<string, unknown>;
  const oldComparable = record(oldMapValue) ? { ...oldMapValue } : undefined;
  delete mapComparable.updated_at;
  if (oldComparable !== undefined) delete oldComparable.updated_at;
  const mapUpdated = oldComparable === undefined || !same(oldComparable, mapComparable);
  if (!mapWasMissing && mapUpdated) {
    map.revision = Number(map.revision) + 1;
    map.updated_at = (options.now ?? (() => new Date().toISOString()))();
  }

  const finalMapErrors = validateAgainstSchema(map, mapSchema);
  if (finalMapErrors.length > 0) throw new CatalogError('CATALOG_INVALID', 'corpus map schema validation failed', { schemaErrors: finalMapErrors });
  if (written) await io.write(instructionPath, rendered);
  if (!manifestExists || manifestUpdated || written) await io.write(catalogPath, json(manifest));
  if (mapUpdated) await io.write(mapPath, json(map));

  return { kind: 'instruction', instructionId: spec.instruction_id, path: relativePath, sha256: digest, written, manifestUpdated, mapUpdated, manifestRevision: manifest.revision };
}

export async function convertMapRecord(recordPath: string, options: ConvertOptions): Promise<ConversionResult> {
  return withConverterOwnership(options.root, io => compileMapRecord(recordPath, options, io));
}

async function compileMapRecord(recordPath: string, options: ConvertOptions, io: ConversionIO): Promise<ConversionResult> {
  const root = resolve(options.root); const raw = await readJson(recordPath, 'map record', io);
  if (raw === undefined) throw new CatalogError('CATALOG_INVALID', 'map record file is missing', { source: recordPath });
  const spec = parseMapRecord(raw, recordPath); const mapPath = target(root, options.mapPath, join(root, 'corpus-map.json'));
  const mapValue = await readJson(mapPath, 'corpus map', io); let map: Record<string, unknown>;
  if (mapValue === undefined) map = { schema: 'VPCorpusMap/v1', revision: 1, updated_at: (options.now ?? (() => new Date().toISOString()))(), donors: {} };
  else {
    if (!record(mapValue)) throw new CatalogError('CATALOG_INVALID', 'corpus map must be an object', { path: mapPath });
    map = mapValue;
  }
  const oldComparable = mapValue === undefined ? undefined : JSON.parse(JSON.stringify(mapValue)) as Record<string, unknown>;
  if (oldComparable !== undefined) delete oldComparable.updated_at;
  const mapSchema = await readSchema(packageRoot, 'vpcorpusmap.v1.schema.json');
  const initialErrors = validateAgainstSchema(map, mapSchema);
  if (initialErrors.length > 0) throw new CatalogError('CATALOG_INVALID', 'corpus map schema validation failed', { schemaErrors: initialErrors });
  const donors = map.donors as Record<string, unknown>; const existingDonor = donors[spec.donor];
  let donor: Record<string, unknown>;
  if (existingDonor === undefined) donor = { source_revision: spec.source_revision, files: {} };
  else {
    if (!record(existingDonor)) throw new CatalogError('CATALOG_INVALID', 'corpus donor must be an object', { donor: spec.donor });
    if (existingDonor.source_revision !== spec.source_revision) throw new CatalogError('CATALOG_INVALID', `donor ${spec.donor} revision conflict: stored ${String(existingDonor.source_revision)}, requested ${spec.source_revision}`, { donor: spec.donor, stored_revision: existingDonor.source_revision, source_revision: spec.source_revision });
    donor = existingDonor;
  }
  const files = record(donor.files) ? donor.files : {}; donor.files = files;
  const entry = spec.status === 'rejected' ? { status: 'rejected', reason: spec.reason! } : spec.status === 'converted' ? { status: 'converted', instruction_ids: spec.instruction_ids! } : spec.status === 'split' ? { status: 'split', instruction_ids: spec.instruction_ids! } : { status: 'merged', instruction_ids: spec.instruction_ids!, contributed_sources: spec.contributed_sources! };
  files[spec.path] = entry; donors[spec.donor] = donor;
  const comparable = { ...map } as Record<string, unknown>; delete comparable.updated_at;
  const mapUpdated = oldComparable === undefined || !same(oldComparable, comparable);
  if (mapValue === undefined) map.updated_at = (options.now ?? (() => new Date().toISOString()))();
  else if (mapUpdated) { map.revision = Number(map.revision) + 1; map.updated_at = (options.now ?? (() => new Date().toISOString()))(); }
  const errors = validateAgainstSchema(map, mapSchema);
  if (errors.length > 0) throw new CatalogError('CATALOG_INVALID', 'corpus map schema validation failed', { schemaErrors: errors });
  if (mapUpdated) await io.write(mapPath, json(map));
  return { kind: 'map-record', instructionId: '', path: spec.path, sha256: '', written: false, manifestUpdated: false, mapUpdated, manifestRevision: 0 };
}

export async function removeInstruction(instructionId: string, options: ConvertOptions): Promise<RemovalResult> {
  return withConverterOwnership(options.root, io => compileRemoval(instructionId, options, io));
}

async function compileRemoval(instructionId: string, options: ConvertOptions, io: OwnedConversionIO): Promise<RemovalResult> {
  const root = resolve(options.root);
  const catalogPath = target(root, options.catalogPath, join(root, 'catalog.json'));
  const mapPath = target(root, options.mapPath, join(root, 'corpus-map.json'));
  const manifestValue = await readJson(catalogPath, 'catalog manifest', io);
  const catalogSchema = await readSchema(packageRoot, 'vpcatalog.v1.schema.json');
  if (!record(manifestValue)) throw new CatalogError('CATALOG_INVALID', 'catalog manifest must be an object', { path: catalogPath });
  const catalogErrors = validateAgainstSchema(manifestValue, catalogSchema);
  if (catalogErrors.length > 0) throw new CatalogError('CATALOG_INVALID', 'catalog schema validation failed', { schemaErrors: catalogErrors });
  const manifest = manifestValue as unknown as Catalog;
  const entry = manifest.instructions.find((item) => item.instruction_id === instructionId);
  if (entry === undefined) throw new CatalogError('CATALOG_INVALID', `instruction ${instructionId} is not in the catalog manifest`, { instruction_id: instructionId });
  const instructionPath = resolve(dirname(catalogPath), entry.path);
  const mapValue = await readJson(mapPath, 'corpus map', io);
  let map: Record<string, unknown> | undefined;
  let mapUpdated = false;
  if (mapValue !== undefined) {
    if (!record(mapValue)) throw new CatalogError('CATALOG_INVALID', 'corpus map must be an object', { path: mapPath });
    const mapSchema = await readSchema(packageRoot, 'vpcorpusmap.v1.schema.json');
    const errors = validateAgainstSchema(mapValue, mapSchema);
    if (errors.length > 0) throw new CatalogError('CATALOG_INVALID', 'corpus map schema validation failed', { schemaErrors: errors });
    map = mapValue;
    const donors = record(map.donors) ? map.donors : {};
    for (const donor of Object.values(donors)) {
      if (!record(donor) || !record(donor.files)) continue;
      for (const file of Object.values(donor.files)) {
        if (!record(file) || !Array.isArray(file.instruction_ids) || !file.instruction_ids.includes(instructionId)) continue;
        const ids = file.instruction_ids.filter((id): id is string => typeof id === 'string' && id !== instructionId);
        if (ids.length === 0) {
          delete file.instruction_ids; delete file.contributed_sources;
          file.status = 'rejected'; file.reason = 'the instruction was replaced by atomic ones';
        } else {
          delete file.reason;
          file.instruction_ids = ids; file.status = ids.length > 1 ? 'split' : 'converted';
        }
        mapUpdated = true;
      }
    }
  }
  manifest.instructions = manifest.instructions.filter((item) => item.instruction_id !== instructionId);
  manifest.instructions.sort((left, right) => left.instruction_id < right.instruction_id ? -1 : left.instruction_id > right.instruction_id ? 1 : 0);
  manifest.revision += 1;
  manifest.updated_at = (options.now ?? (() => new Date().toISOString()))();
  const catalogErrorsAfter = validateAgainstSchema(manifest, catalogSchema);
  if (catalogErrorsAfter.length > 0) throw new CatalogError('CATALOG_INVALID', 'catalog schema validation failed', { schemaErrors: catalogErrorsAfter });
  if (map !== undefined && mapUpdated) {
    map.revision = Number(map.revision) + 1;
    map.updated_at = (options.now ?? (() => new Date().toISOString()))();
    const mapSchema = await readSchema(packageRoot, 'vpcorpusmap.v1.schema.json');
    const errors = validateAgainstSchema(map, mapSchema);
    if (errors.length > 0) throw new CatalogError('CATALOG_INVALID', 'corpus map schema validation failed', { schemaErrors: errors });
  }
  await io.remove(instructionPath);
  await io.write(catalogPath, json(manifest));
  if (map !== undefined && mapUpdated) await io.write(mapPath, json(map));
  return { kind: 'removal', instructionId, removed: true, manifestUpdated: true, mapUpdated, manifestRevision: manifest.revision };
}

export async function convertMany(specPaths: string[], options: ConvertOptions): Promise<ConversionResult[]> {
  const seen = new Map<string, string>();
  for (const path of specPaths) {
    const raw = await readJson(path, 'instruction spec');
    if (raw === undefined) throw new CatalogError('CATALOG_INVALID', 'instruction spec file is missing', { source: path });
    if (!record(raw) || typeof raw.instruction_id !== 'string') continue;
    const previous = seen.get(raw.instruction_id);
    if (previous !== undefined && resolve(previous) !== resolve(path)) throw new CatalogError('CATALOG_INVALID', `duplicate instruction id ${raw.instruction_id}`, { instruction_id: raw.instruction_id, paths: [previous, path] });
    seen.set(raw.instruction_id, path);
  }
  return withConverterOwnership(options.root, async io => {
    const results: ConversionResult[] = [];
    for (const specPath of specPaths) results.push(await compileInstruction(specPath, options, io));
    return results;
  });
}

export async function releasePreparedOwnership(plan: PreparedBatch, observe: (request: Readonly<{ owner: ArtifactRef; pid: number; token: string; plan: ArtifactRef }>) => Promise<{ kind: 'observed-quiescent'; ownerSha256: string; pointer: string } | { kind: 'unconfirmed' }>): Promise<{ released: boolean; receipt: ArtifactRef }> {
  const manifest = await readBatchManifest(plan);
  const lockRelative = '.vp-convert-publication.lock/owner.json';
  const ownerPath = await resolveArtifactPath(manifest.root, lockRelative);
  const ownerBytes = await readFile(ownerPath);
  const owner: unknown = JSON.parse(ownerBytes.toString('utf8'));
  if (!record(owner) || typeof owner.pid !== 'number' || !Number.isSafeInteger(owner.pid) || typeof owner.token !== 'string' || owner.root !== manifest.root || !record(owner.operation) || owner.operation.path !== plan.manifest.path || owner.operation.sha256 !== plan.manifest.sha256) throw new Error('retained ownership does not bind this exact prepared plan');
  const ref = { path: lockRelative, sha256: fingerprint(ownerBytes) };
  const observation = await observe({ owner: ref, pid: owner.pid, token: owner.token, plan: plan.manifest });
  const reconciliation = await reconcilePreparedBatch(plan);
  const released = observation.kind === 'observed-quiescent' && observation.ownerSha256 === ref.sha256 && observation.pointer.trim() !== '' && reconciliation.state !== 'CONFLICT_OR_UNKNOWN';
  if (fingerprint(await readFile(ownerPath)) !== ref.sha256) throw new Error('ownership changed during reconciliation');
  const receipt = await sealArtifact(plan.directory, `${dirname(plan.manifest.path)}/reconcile-${randomUUID()}.json`, { schema: 'VPPreparedOwnershipReconciliation/v1', plan: plan.manifest, owner: ref, observation, reconciliation, released, recordedAt: new Date().toISOString() });
  if (released) {
    const lock = dirname(ownerPath);
    if (resolve(lock) !== join(resolve(manifest.root), '.vp-convert-publication.lock')) throw new Error('ownership cleanup path changed');
    await rm(lock, { recursive: true });
  }
  return { released, receipt };
}

type PreparedTarget = { path: string; before: string | null; after: string; staged: ArtifactRef; backup: ArtifactRef | null };
type MigrationRecord = { id: string; path: string; before: string; body: string; marker: 'legacy' | 'v1.1' | 'v1.2' };
type MigrationBinding = { initialCatalog: string; map: string; cohort: MigrationRecord[]; catalog: string; current: string[] };
type BatchManifest = { schema: 'VPPreparedBatch/v1'; root: string; targets: PreparedTarget[]; specs: ArtifactRef[]; tools: ArtifactRef[]; context: { path: string; sha256: string | null }[]; runtime: ArtifactRef; sources: { source: Awaited<ReturnType<typeof readEligibleSource>>['source']; packet: ArtifactRef; unitIds: string[]; specs: ArtifactRef[] }[]; migration?: MigrationBinding };
export type PreparedBatch = Readonly<{ directory: string; manifest: ArtifactRef }>;
export type BatchApproval = Readonly<{ review: ArtifactRef; observe: (request: Readonly<{ plan: ArtifactRef; review: ArtifactRef; targets: readonly string[] }>) => Promise<{ kind: 'observed'; writer: string; reviewPointer: string } | { kind: 'unconfirmed' }> }>;
export type ApplyOutcome = { kind: 'applied' | 'no-change' | 'no-write-conflict' | 'partial-or-unknown'; receipt: ArtifactRef };
type BatchState = { manifest: BatchManifest; sources: readonly EligibleSource[]; migration?: FacetMigration | undefined };
const preparedBatches = new WeakMap<PreparedBatch, BatchState>();
const attemptedBatches = new WeakSet<PreparedBatch>();

// Temporary cutover capability. Remove with the preimage decoder after cutover.
export type FacetMigration = Readonly<{ readonly kind: 'facet-migration' }>;
type MigrationState = { root: string; binding: MigrationBinding; fenced: boolean };
const migrations = new WeakMap<FacetMigration, MigrationState>();
const fingerprint = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');
async function optionalBytes(path: string): Promise<Buffer | undefined> {
  try { return await readFile(path); } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') return undefined;
    throw error;
  }
}
function targetRelative(root: string, path: string): string {
  const value = relative(root, path).split(sep).join('/');
  if (!value || value.startsWith('../') || value === '..' || isAbsolute(value)) throw new Error('prepared target escapes publication root');
  return value;
}
async function preparedTargetBytes(root: string, path: string): Promise<Buffer | undefined> {
  return optionalBytes(await resolveArtifactPath(root, path));
}
async function assertFileBinding(ref: ArtifactRef): Promise<void> {
  if (fingerprint(await readFile(ref.path)) !== ref.sha256) throw new Error(`stale publication input: ${ref.path}`);
}

const facetArtifactText: Schema = { type: 'string', minLength: 1 };
const facetArtifactSha: Schema = { type: 'string', pattern: '^[0-9a-f]{64}$' };
const facetArtifactRefSchema: Schema = { type: 'object', required: ['path', 'sha256'], properties: { path: facetArtifactText, sha256: facetArtifactSha }, additionalProperties: false };

function checkedFacetArtifactRef(value: unknown, label: string): ArtifactRef {
  if (!record(value) || validateAgainstSchema(value, facetArtifactRefSchema).length > 0 || typeof value.path !== 'string' || !isAbsolute(value.path) || typeof value.sha256 !== 'string') throw new Error(`${label} must be an absolute strict ArtifactRef`);
  return Object.freeze({ path: value.path, sha256: value.sha256 });
}

function parseFacetAssignments(value: unknown): InstructionFacetAssignment[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 25) throw new Error('instruction facet batches require 1–25 unique assignments');
  const items: unknown[] = value;
  const ids = new Set<string>();
  return items.map((item, index) => {
    if (!record(item) || Object.keys(item).length !== 3 || typeof item.instruction_id !== 'string' || !kebab.test(item.instruction_id)
      || typeof item.expected_sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(item.expected_sha256)
      || !isInstructionClassification(item.classification)) throw new Error(`invalid instruction facet assignment at index ${index}`);
    if (ids.has(item.instruction_id)) throw new Error(`duplicate instruction facet assignment: ${item.instruction_id}`);
    ids.add(item.instruction_id);
    const classification: InstructionClassification = item.classification.classification_status === 'classified'
      ? { classification_status: 'classified', instruction_form: item.classification.instruction_form, domains: [...item.classification.domains] }
      : { classification_status: 'unclassified', classification_reason: item.classification.classification_reason };
    return { instruction_id: item.instruction_id, expected_sha256: item.expected_sha256, classification };
  });
}

type PreservedLine = { value: string; ending: string; start: number };

function preservedLines(source: string): PreservedLine[] {
  const result: PreservedLine[] = [];
  let start = 0;
  while (start < source.length) {
    const newline = source.indexOf('\n', start);
    const end = newline === -1 ? source.length : newline + 1;
    let value = source.slice(start, newline === -1 ? end : newline);
    let ending = '';
    if (newline !== -1) {
      if (value.endsWith('\r')) { value = value.slice(0, -1); ending = '\r\n'; }
      else ending = '\n';
    }
    result.push({ value, ending, start });
    start = end;
  }
  return result;
}

function frontmatterEnvelope(markdown: string): { bom: string; source: string; lines: PreservedLine[]; closingIndex: number; bodySuffix: string } {
  const bom = markdown.startsWith('\uFEFF') ? '\uFEFF' : '';
  const source = bom === '' ? markdown : markdown.slice(1);
  const lines = preservedLines(source);
  if (lines[0]?.value.trimEnd() !== '---') throw new Error('instruction frontmatter opening delimiter is missing');
  const closingIndex = lines.findIndex((line, index) => index > 0 && line.value.trimEnd() === '---');
  if (closingIndex === -1) throw new Error('instruction frontmatter closing delimiter is missing');
  const closing = lines[closingIndex];
  if (closing === undefined) throw new Error('instruction frontmatter closing delimiter is missing');
  const bodyStart = closing.start + closing.value.length + closing.ending.length;
  return { bom, source, lines, closingIndex, bodySuffix: source.slice(bodyStart) };
}

// Cutover-only: the returned opaque capability is valid only in this process.
export async function prepareFacetMigration(rootPath: string): Promise<FacetMigration> {
  const root = resolve(rootPath);
  const catalogBytes = await readFile(await resolveArtifactPath(root, 'catalog.json'));
  const mapBytes = await readFile(await resolveArtifactPath(root, 'corpus-map.json'));
  const catalog: unknown = JSON.parse(catalogBytes.toString('utf8'));
  if (!record(catalog) || !Array.isArray(catalog.instructions)) throw new Error('invalid migration catalog');
  const cohort: MigrationRecord[] = [];
  const ids = new Set<string>(); const paths = new Set<string>();
  const legacySchema = await readSchema(packageRoot, 'vpinstruction.v1.schema.json');
  const oldSchema = await readSchema(packageRoot, 'vpinstruction.v1.1.schema.json');
  for (const item of catalog.instructions) {
    if (!record(item) || typeof item.instruction_id !== 'string' || !kebab.test(item.instruction_id) || typeof item.path !== 'string' || item.path !== `instructions/${item.instruction_id}.md` || typeof item.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(item.sha256) || ids.has(item.instruction_id) || paths.has(item.path)) throw new Error('invalid or duplicate migration identity');
    ids.add(item.instruction_id); paths.add(item.path);
    const bytes = await readFile(await resolveArtifactPath(root, item.path));
    if (fingerprint(bytes) !== item.sha256) throw new Error(`migration preimage digest mismatch: ${item.instruction_id}`);
    const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
    const parsed = parseFrontmatter(text);
    if (parsed.data.instruction_id !== item.instruction_id) throw new Error('migration frontmatter identity mismatch');
    const marker = parsed.data.schema === undefined ? 'legacy' : parsed.data.schema === 'VPInstruction/v1.1' ? 'v1.1' : parsed.data.schema === 'VPInstruction/v1.2' ? 'v1.2' : undefined;
    if (marker === undefined) throw new Error('unsupported migration preimage marker');
    if (marker !== 'v1.2' && validateAgainstSchema(parsed.data, marker === 'legacy' ? legacySchema : oldSchema).length) throw new Error(`invalid migration preimage: ${item.instruction_id}`);
    if (marker === 'v1.1' && parseFacetClassification(parsed.data) === undefined) throw new Error(`invalid migration classification: ${item.instruction_id}`);
    cohort.push({ id: item.instruction_id, path: item.path, before: item.sha256, body: fingerprint(Buffer.from(frontmatterEnvelope(text).bodySuffix, 'utf8')), marker });
  }
  const capability: FacetMigration = Object.freeze({ kind: 'facet-migration' });
  const binding: MigrationBinding = { initialCatalog: fingerprint(catalogBytes), map: fingerprint(mapBytes), cohort, catalog: fingerprint(catalogBytes), current: cohort.map(item => item.before) };
  const state: MigrationState = { root, binding, fenced: false };
  await validateFacetMigration(state, binding);
  migrations.set(capability, state);
  return capability;
}

async function validateFacetMigration(state: MigrationState, binding: MigrationBinding): Promise<number> {
  if (state.fenced) throw new Error('migration capability is fenced');
  const catalogBytes = await readFile(await resolveArtifactPath(state.root, 'catalog.json'));
  if (fingerprint(catalogBytes) !== binding.catalog || fingerprint(await readFile(await resolveArtifactPath(state.root, 'corpus-map.json'))) !== binding.map) throw new Error('migration catalog or map changed');
  const catalog: unknown = JSON.parse(catalogBytes.toString('utf8'));
  if (!record(catalog) || !Array.isArray(catalog.instructions) || catalog.instructions.length !== binding.cohort.length || binding.current.length !== binding.cohort.length) throw new Error('migration cohort changed');
  const legacyIds = new Set<string>();
  for (const [index, item] of binding.cohort.entries()) {
    const entry: unknown = catalog.instructions[index];
    if (!record(entry) || entry.instruction_id !== item.id || entry.path !== item.path || entry.sha256 !== binding.current[index]) throw new Error(`migration catalog identity changed: ${item.id}`);
    const bytes = await readFile(await resolveArtifactPath(state.root, item.path));
    if (fingerprint(bytes) !== binding.current[index]) throw new Error(`migration instruction changed: ${item.id}`);
    const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
    const parsed = parseFrontmatter(text);
    if (parsed.data.instruction_id !== item.id || fingerprint(Buffer.from(frontmatterEnvelope(text).bodySuffix, 'utf8')) !== item.body) throw new Error(`migration body or identity changed: ${item.id}`);
    if (parsed.data.schema !== 'VPInstruction/v1.2') {
      const marker = parsed.data.schema === undefined ? 'legacy' : parsed.data.schema === 'VPInstruction/v1.1' ? 'v1.1' : undefined;
      if (marker === undefined || marker !== item.marker || fingerprint(bytes) !== item.before) throw new Error(`migration legacy preimage changed: ${item.id}`);
      legacyIds.add(item.id);
    }
  }
  const issues = checkCorpus(state.root).filter(issue => !(issue.code === 'CORPUS_INSTRUCTION_VERSION_UNSUPPORTED' && typeof issue.details?.instruction_id === 'string' && legacyIds.has(issue.details.instruction_id)));
  if (issues.length) throw new Error(`migration corpus validation: ${JSON.stringify(issues)}`);
  return legacyIds.size;
}

function sameClassification(left: InstructionClassification, right: InstructionClassification): boolean {
  if (left.classification_status === 'unclassified') return right.classification_status === 'unclassified' && left.classification_reason === right.classification_reason;
  return right.classification_status === 'classified' && left.instruction_form === right.instruction_form
    && left.domains.length === right.domains.length && left.domains.every(domain => right.domains.includes(domain));
}

function classificationFrontmatterLines(classification: InstructionClassification): string[] {
  if (classification.classification_status === 'classified') return [
    'classification_status: classified',
    yamlString('instruction_form', classification.instruction_form),
    ...yamlList('domains', classification.domains),
  ];
  if (/[\u0000-\u001f\u007f-\u009f]/u.test(classification.classification_reason)) throw new Error('classification reason cannot be represented by flat frontmatter');
  return ['classification_status: unclassified', yamlString('classification_reason', classification.classification_reason)];
}

// Cutover-only decoder; remove legacy schema handling after migration.
function updateInstructionFacets(markdown: string, instructionId: string, classification: InstructionClassification, legacySchema: Schema, oldFacetedSchema: Schema, facetedSchema: Schema): Buffer {
  const parsed = parseFrontmatter(markdown);
  const marker = parsed.data.schema;
  if (marker !== undefined && marker !== 'VPInstruction/v1.1' && marker !== 'VPInstruction/v1.2') throw new Error(`unsupported instruction schema marker for ${instructionId}`);
  const sourceSchema = marker === undefined ? legacySchema : marker === 'VPInstruction/v1.1' ? oldFacetedSchema : facetedSchema;
  const sourceErrors = validateAgainstSchema(parsed.data, sourceSchema);
  if (sourceErrors.length > 0) throw new Error(`invalid current instruction ${instructionId}: ${sourceErrors.join('; ')}`);
  if (parsed.data.instruction_id !== instructionId) throw new Error(`catalog ID does not match instruction frontmatter: ${instructionId}`);
  const previous = marker === undefined ? LEGACY_CLASSIFICATION : parseFacetClassification(parsed.data);
  if (previous === undefined) throw new Error(`invalid current facet classification: ${instructionId}`);
  if (marker === 'VPInstruction/v1.2') {
    parseApproachAssessments(parsed, new Map(Object.entries(APPROACH_VOCABULARY)));
    if (sameClassification(previous, classification)) return Buffer.from(markdown, 'utf8');
  }
  const revision = parsed.data.revision;
  if (typeof revision !== 'number' || !Number.isSafeInteger(revision)) throw new Error(`invalid current revision: ${instructionId}`);

  const envelope = frontmatterEnvelope(markdown);
  const removals = new Set<number>();
  let schemaIndex = -1;
  let revisionIndex = -1;
  for (let index = 1; index < envelope.closingIndex; index += 1) {
    const line = envelope.lines[index];
    if (line === undefined) continue;
    const match = /^([A-Za-z0-9_.-]+):(?:[ \t]+(.*))?$/.exec(line.value);
    if (match === null) continue;
    const key = match[1] ?? '';
    if (key === 'schema') schemaIndex = index;
    if (key === 'revision') revisionIndex = index;
    if (['classification_status', 'instruction_form', 'domains', 'classification_reason'].includes(key)) {
      removals.add(index);
      if (key === 'domains' && (match[2] ?? '').trim() === '') {
        for (let item = index + 1; item < envelope.closingIndex; item += 1) {
          const candidate = envelope.lines[item]?.value;
          if (candidate === undefined) break;
          if (candidate.trim() === '' || candidate.trimStart().startsWith('#')) continue;
          if (/^  -(?:\s|$)/u.test(candidate)) { removals.add(item); continue; }
          break;
        }
      }
    }
  }
  if (revisionIndex === -1) throw new Error(`missing revision field: ${instructionId}`);
  const insertionEnding = envelope.lines[envelope.closingIndex - 1]?.ending || envelope.lines[0]?.ending || '\n';
  const header = envelope.lines.slice(0, envelope.closingIndex).flatMap((line, index) => {
    if (removals.has(index)) return [];
    if (index === schemaIndex) return [{ ...line, value: 'schema: VPInstruction/v1.2' }];
    if (index === revisionIndex) return [{ ...line, value: `revision: ${revision + 1}` }];
    return [line];
  });
  if (schemaIndex === -1) header.push({ value: 'schema: VPInstruction/v1.2', ending: insertionEnding, start: 0 });
  const classificationLines = classificationFrontmatterLines(classification).map(value => ({ value, ending: insertionEnding, start: 0 }));
  const output = envelope.bom + [...header, ...classificationLines, ...envelope.lines.slice(envelope.closingIndex)].map(line => line.value + line.ending).join('');
  const next = parseFrontmatter(output);
  const errors = validateAgainstSchema(next.data, facetedSchema);
  const nextClassification = parseFacetClassification(next.data);
  if (errors.length > 0 || nextClassification === undefined) throw new Error(`staged instruction is invalid: ${instructionId}${errors.length ? `; ${errors.join('; ')}` : ''}`);
  if (!sameClassification(nextClassification, classification) || next.data.revision !== revision + 1) throw new Error(`staged instruction did not preserve the requested classification: ${instructionId}`);
  const changedFields = new Set(['schema', 'revision', 'classification_status', 'instruction_form', 'domains', 'classification_reason']);
  for (const [key, value] of Object.entries(parsed.data)) {
    if (!changedFields.has(key) && (!Object.prototype.hasOwnProperty.call(next.data, key) || !same(value, next.data[key]))) throw new Error(`frontmatter surgery changed unrelated metadata: ${instructionId}.${key}`);
  }
  const nextEnvelope = frontmatterEnvelope(output);
  if (nextEnvelope.bodySuffix !== envelope.bodySuffix) throw new Error(`frontmatter surgery changed Markdown body suffix: ${instructionId}`);
  return Buffer.from(output, 'utf8');
}

type PreparedBatchInputs = {
  root: string; directory: string; prefix: string; targetPaths: readonly string[];
  before: Map<string, Buffer | undefined>; outputs: Map<string, Buffer>; specs: readonly ArtifactRef[];
  context: BatchManifest['context']; sources: readonly EligibleSource[];
  sourceData: readonly Awaited<ReturnType<typeof readEligibleSource>>[];
  migration?: FacetMigration | undefined;
};
async function createPreparedBatch({ root, directory, prefix, targetPaths, before, outputs, specs, context, sources, sourceData, migration }: PreparedBatchInputs): Promise<PreparedBatch> {
  const targets: PreparedTarget[] = [];
  for (const [index, path] of [...new Set(targetPaths)].entries()) {
    const name = targetRelative(root, path);
    const old = before.get(path);
    const next = outputs.get(path) ?? old;
    if (next === undefined) throw new Error(`missing prepared output: ${name}`);
    const stagedPath = `${prefix}/outputs/${index}.txt`;
    const stagedAbsolute = await resolveArtifactPath(directory, stagedPath, true);
    await writeFile(stagedAbsolute, next, { flag: 'wx' });
    const staged = { path: stagedPath, sha256: fingerprint(next) };
    let backup: ArtifactRef | null = null;
    if (old !== undefined) {
      const backupPath = `${prefix}/before/${index}.txt`;
      await writeFile(await resolveArtifactPath(directory, backupPath, true), old, { flag: 'wx' });
      backup = { path: backupPath, sha256: fingerprint(old) };
    }
    targets.push({ path: name, before: old === undefined ? null : fingerprint(old), after: fingerprint(next), staged, backup });
  }
  const toolPaths = ['scripts/convert.ts', 'scripts/source-packets.ts', 'scripts/check-corpus.ts', 'skills/vp-mode/scripts/catalog.ts', 'skills/vp-mode/scripts/frontmatter.ts', 'skills/vp-mode/scripts/schema.ts', 'skills/vp-mode/scripts/instruction-facets.ts', 'skills/vp-mode/scripts/instruction-approaches.ts', 'config/vpinstruction.v1.schema.json', 'config/vpinstruction.v1.1.schema.json', 'config/vpinstruction.v1.2.schema.json', 'config/vpcatalog.v1.schema.json', 'config/vpcorpusmap.v1.schema.json'];
  const tools: ArtifactRef[] = [];
  for (const path of toolPaths) { const absolute = join(packageRoot, path); tools.push({ path: absolute, sha256: fingerprint(await readFile(absolute)) }); }
  const manifest: BatchManifest = { schema: 'VPPreparedBatch/v1', root, targets, specs: [...specs], tools, context, runtime: { path: process.execPath, sha256: fingerprint(await readFile(process.execPath)) }, sources: sourceData.map(source => ({ source: source.source, packet: source.evidence, unitIds: [...new Set(source.specs.flatMap(spec => [...spec.unitIds]))], specs: source.specs.map(spec => ({ ...spec.ref })) })) };
  if (migration !== undefined) {
    const state = migrations.get(migration);
    if (state === undefined || state.root !== root || state.fenced) throw new Error('invalid migration capability');
    manifest.migration = structuredClone(state.binding);
  }
  const plan: PreparedBatch = Object.freeze({ directory, manifest: await sealArtifact(directory, `${prefix}/plan.json`, manifest) });
  preparedBatches.set(plan, { manifest, sources: [...sources], migration });
  return plan;
}

export async function prepareInstructionFacetBatch(assignments: readonly InstructionFacetAssignment[], options: PrepareInstructionFacetBatchOptions): Promise<PreparedBatch> {
  const parsedAssignments = parseFacetAssignments(assignments);
  const classificationEvidence = checkedFacetArtifactRef(options.classificationEvidence, 'classificationEvidence');
  const policyConfig = checkedFacetArtifactRef(options.policyConfig, 'policyConfig');
  await assertFileBinding(classificationEvidence);
  await assertFileBinding(policyConfig);
  const root = resolve(options.root);
  if (options.migration !== undefined) {
    const state = migrations.get(options.migration);
    if (state === undefined || state.root !== root || options.catalogPath !== undefined || options.mapPath !== undefined) throw new Error('invalid migration capability or corpus paths');
    await validateFacetMigration(state, state.binding);
  }
  const directory = resolve(options.stagingRoot);
  const prefix = randomUUID();
  const catalogPath = target(root, options.catalogPath, join(root, 'catalog.json'));
  const mapPath = target(root, options.mapPath, join(root, 'corpus-map.json'));
  const catalogName = targetRelative(root, catalogPath);
  const mapName = targetRelative(root, mapPath);
  const catalogTarget = await resolveArtifactPath(root, catalogName);
  const mapTarget = await resolveArtifactPath(root, mapName);
  const catalogBefore = await optionalBytes(catalogTarget);
  const mapBefore = await optionalBytes(mapTarget);
  if (catalogBefore === undefined) throw new Error('metadata-only preparation requires an existing catalog manifest');
  if (mapBefore === undefined) throw new Error('metadata-only preparation requires an existing corpus map');
  const parseJsonBytes = (bytes: Buffer, label: string): unknown => {
    try { return JSON.parse(new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes)) as unknown; }
    catch (error) { throw new Error(`${label} is malformed: ${error instanceof Error ? error.message : String(error)}`); }
  };
  const catalogSchema = await readSchema(packageRoot, 'vpcatalog.v1.schema.json');
  const mapSchema = await readSchema(packageRoot, 'vpcorpusmap.v1.schema.json');
  const legacySchema = await readSchema(packageRoot, 'vpinstruction.v1.schema.json');
  const oldFacetedSchema = await readSchema(packageRoot, 'vpinstruction.v1.1.schema.json');
  const facetedSchema = await readSchema(packageRoot, 'vpinstruction.v1.2.schema.json');
  const catalogValue = parseJsonBytes(catalogBefore, 'catalog manifest');
  if (!record(catalogValue)) throw new Error('catalog manifest must be an object');
  const catalogErrors = validateAgainstSchema(catalogValue, catalogSchema);
  if (catalogErrors.length > 0) throw new Error(`catalog schema validation failed: ${catalogErrors.join('; ')}`);
  const catalog = catalogValue as unknown as Catalog;
  const catalogIds = new Set<string>();
  const catalogPaths = new Set<string>();
  for (const entry of catalog.instructions) {
    if (catalogIds.has(entry.instruction_id)) throw new Error(`duplicate instruction id in catalog: ${entry.instruction_id}`);
    if (catalogPaths.has(entry.path)) throw new Error(`duplicate instruction path in catalog: ${entry.path}`);
    catalogIds.add(entry.instruction_id);
    catalogPaths.add(entry.path);
  }
  const mapValue = parseJsonBytes(mapBefore, 'corpus map');
  if (!record(mapValue)) throw new Error('corpus map must be an object');
  const mapErrors = validateAgainstSchema(mapValue, mapSchema);
  if (mapErrors.length > 0) throw new Error(`corpus map schema validation failed: ${mapErrors.join('; ')}`);

  const before = new Map<string, Buffer | undefined>([[catalogTarget, catalogBefore], [mapTarget, mapBefore]]);
  const outputs = new Map<string, Buffer>();
  const instructionTargets: string[] = [];
  const now = options.now ?? (() => new Date().toISOString());
  for (const assignment of parsedAssignments) {
    const entry = catalog.instructions.find(item => item.instruction_id === assignment.instruction_id);
    if (entry === undefined) throw new Error(`instruction ID is not in the catalog: ${assignment.instruction_id}`);
    if (/[\\:\u0000]/u.test(entry.path) || entry.path.startsWith('/') || entry.path.split('/').some(part => part === '' || part === '.' || part === '..')) throw new Error(`catalog instruction path is not canonical: ${entry.path}`);
    const instructionAbsolute = resolve(dirname(catalogPath), entry.path);
    const instructionName = targetRelative(root, instructionAbsolute);
    const instructionPath = await resolveArtifactPath(root, instructionName);
    const original = await optionalBytes(instructionPath);
    if (original === undefined) throw new Error(`catalog instruction file is missing: ${assignment.instruction_id}`);
    const originalDigest = fingerprint(original);
    if (originalDigest !== assignment.expected_sha256) throw new Error(`stale expected instruction digest: ${assignment.instruction_id}`);
    if (originalDigest !== entry.sha256) throw new Error(`catalog instruction digest mismatch: ${assignment.instruction_id}`);
    const markdown = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(original);
    const next = updateInstructionFacets(markdown, assignment.instruction_id, assignment.classification, legacySchema, oldFacetedSchema, facetedSchema);
    before.set(instructionPath, original);
    instructionTargets.push(instructionPath);
    if (!next.equals(original)) {
      outputs.set(instructionPath, next);
      entry.sha256 = fingerprint(next);
      catalog.revision += 1;
      catalog.updated_at = now();
    }
  }
  const publicationTargets = new Set([...instructionTargets, catalogTarget, mapTarget].map(path => resolve(path)));
  for (const ref of [classificationEvidence, policyConfig]) if (publicationTargets.has(resolve(ref.path))) throw new Error(`prepared input cannot also be a publication target: ${ref.path}`);
  if (outputs.size > 0) {
    const finalCatalogErrors = validateAgainstSchema(catalog, catalogSchema);
    if (finalCatalogErrors.length > 0) throw new Error(`staged catalog validation failed: ${finalCatalogErrors.join('; ')}`);
    outputs.set(catalogTarget, Buffer.from(json(catalog), 'utf8'));
  }
  const context: BatchManifest['context'] = [];
  for (const path of [join(root, 'donors.yaml'), join(root, 'config', 'methodology-profile.json')]) {
    const bytes = await optionalBytes(path);
    context.push({ path, sha256: bytes === undefined ? null : fingerprint(bytes) });
  }
  return createPreparedBatch({ root, directory, prefix, targetPaths: [...instructionTargets, catalogTarget, mapTarget], before, outputs, specs: [classificationEvidence, policyConfig], context, sources: [], sourceData: [], migration: options.migration });
}

export async function prepareBatch(sources: readonly EligibleSource[], options: ConvertOptions & { stagingRoot: string }): Promise<PreparedBatch> {
  if (sources.length < 1 || sources.length > 25) throw new Error('prepared batches require 1–25 separately admitted source files');
  const root = resolve(options.root);
  const directory = resolve(options.stagingRoot);
  const prefix = randomUUID();
  const sourceData = [];
  const sourceKeys = new Set<string>();
  const specs = new Map<string, ArtifactRef>();
  for (const source of sources) {
    const data = await readEligibleSource(source);
    const key = JSON.stringify([data.source.donor, data.source.pinnedRevision, data.source.canonicalCarrierPath]);
    if (sourceKeys.has(key)) throw new Error('duplicate source in prepared batch');
    sourceKeys.add(key); sourceData.push(data);
    for (const spec of data.specs) {
      const previous = specs.get(spec.path);
      if (previous !== undefined && previous.sha256 !== spec.ref.sha256) throw new Error('conflicting prepared spec binding');
      specs.set(spec.path, { path: spec.path, sha256: spec.ref.sha256 });
    }
  }
  const before = new Map<string, Buffer | undefined>();
  const outputs = new Map<string, Buffer>();
  const read = async (path: string): Promise<Buffer | undefined> => {
    if (!before.has(path)) before.set(path, await optionalBytes(path));
    return outputs.get(path) ?? before.get(path);
  };
  const io: ConversionIO = {
    read: async path => (await read(path))?.toString('utf8'),
    write: async (path, text) => { await resolveArtifactPath(root, targetRelative(root, path)); await read(path); outputs.set(path, Buffer.from(text)); },
  };
  const mapPath = target(root, options.mapPath, join(root, 'corpus-map.json'));
  const catalogPath = target(root, options.catalogPath, join(root, 'catalog.json'));
  const instructionsDir = target(root, options.instructionsDir, join(root, 'instructions'));
  targetRelative(root, mapPath); targetRelative(root, catalogPath);
  const map = await readJson(mapPath, 'corpus map', io);
  const donors = record(map) && record(map.donors) ? map.donors : {};
  for (const data of sourceData) {
    const donor = donors[data.source.donor];
    if (record(donor) && donor.source_revision !== data.source.pinnedRevision) throw new Error(`prepared donor revision conflict: ${data.source.donor}; a separately reviewed complete remap is required`);
  }
  const ids = new Set<string>();
  const schemas = new Map<string, Schema>();
  const intendedInstructions: string[] = [];
  for (const ref of specs.values()) {
    await assertFileBinding(ref);
    const spec = parseInstructionSpec(await readJson(ref.path, 'prepared instruction spec', io), ref.path);
    if (ids.has(spec.instruction_id)) throw new Error(`duplicate instruction id ${spec.instruction_id}`);
    ids.add(spec.instruction_id);
    for (const provenance of spec.provenance) if (!sourceData.some(data => data.source.donor === provenance.donor && data.source.pinnedRevision === provenance.revision && data.source.canonicalCarrierPath === provenance.path && data.specs.some(item => item.path === ref.path))) throw new Error('spec provenance lacks exact source eligibility');
    for (const data of sourceData) if (data.specs.some(item => item.path === ref.path) && !spec.provenance.some(source => source.donor === data.source.donor && source.revision === data.source.pinnedRevision && source.path === data.source.canonicalCarrierPath)) throw new Error('selected source contribution missing from spec provenance');
    intendedInstructions.push(join(instructionsDir, `${spec.instruction_id}.md`));
    await compileInstruction(ref.path, options, io, schemas);
  }
  const context: BatchManifest['context'] = [];
  for (const path of [join(root, 'donors.yaml'), join(root, 'config', 'methodology-profile.json')]) { const bytes = await optionalBytes(path); context.push({ path, sha256: bytes === undefined ? null : fingerprint(bytes) }); }
  return createPreparedBatch({ root, directory, prefix, targetPaths: [...intendedInstructions, catalogPath, mapPath], before, outputs, specs: [...specs.values()], context, sources, sourceData });
}
const batchText: Schema = { type: 'string', minLength: 1 };
const batchSha: Schema = { type: 'string', pattern: '^[0-9a-f]{64}$' };
const batchRef: Schema = { type: 'object', required: ['path', 'sha256'], properties: { path: batchText, sha256: batchSha }, additionalProperties: false };
const nullableRef: Schema = { ...batchRef, type: ['object', 'null'] };
const manifestSchema: Schema = { type: 'object', required: ['schema', 'root', 'targets', 'specs', 'tools', 'context', 'runtime', 'sources'], additionalProperties: false, properties: {
  schema: { const: 'VPPreparedBatch/v1' }, root: batchText, specs: { type: 'array', items: batchRef }, tools: { type: 'array', items: batchRef }, runtime: batchRef, sources: { type: 'array', items: { type: 'object' } },
  context: { type: 'array', items: { type: 'object', required: ['path', 'sha256'], properties: { path: batchText, sha256: { type: ['string', 'null'] } }, additionalProperties: false } },
  targets: { type: 'array', items: { type: 'object', required: ['path', 'before', 'after', 'staged', 'backup'], additionalProperties: false, properties: { path: batchText, before: { type: ['string', 'null'] }, after: batchSha, staged: batchRef, backup: nullableRef } } },
  migration: { type: 'object', required: ['initialCatalog', 'map', 'cohort', 'catalog', 'current'], additionalProperties: false, properties: {
    initialCatalog: batchSha, map: batchSha, catalog: batchSha, current: { type: 'array', items: batchSha },
    cohort: { type: 'array', items: { type: 'object', required: ['id', 'path', 'before', 'body', 'marker'], additionalProperties: false, properties: { id: batchText, path: batchText, before: batchSha, body: batchSha, marker: { enum: ['legacy', 'v1.1', 'v1.2'] } } } },
  } },
} };
async function readBatchManifest(plan: PreparedBatch): Promise<BatchManifest> {
  const value: unknown = JSON.parse((await verifyArtifact(plan.directory, plan.manifest)).toString('utf8'));
  const errors = validateAgainstSchema(value, manifestSchema);
  if (errors.length) throw new Error(`invalid prepared plan: ${errors.join('; ')}`);
  return value as BatchManifest;
}
export async function reconcilePreparedBatch(plan: PreparedBatch): Promise<{ state: 'NO_CHANGE' | 'NO_EFFECT_OBSERVED' | 'TARGET_STATE_MATCHES' | 'KNOWN_PARTIAL' | 'CONFLICT_OR_UNKNOWN'; targets: { path: string; state: 'old' | 'intended' | 'noop' | 'unexpected' }[]; retry: 'fenced' }> {
  const targets: { path: string; state: 'old' | 'intended' | 'noop' | 'unexpected' }[] = [];
  try {
    const manifest = await readBatchManifest(plan);
    for (const target of manifest.targets) {
      const staged = await verifyArtifact(plan.directory, target.staged);
      if (fingerprint(staged) !== target.after) throw new Error('staged output binding mismatch');
      if (target.backup !== null && fingerprint(await verifyArtifact(plan.directory, target.backup)) !== target.before) throw new Error('backup binding mismatch');
      if ((target.before === null) !== (target.backup === null)) throw new Error('missing preimage proof');
      const bytes = await preparedTargetBytes(manifest.root, target.path);
      const digest = bytes === undefined ? null : fingerprint(bytes);
      targets.push({ path: target.path, state: digest === target.after ? target.before === target.after ? 'noop' : 'intended' : digest === target.before ? 'old' : 'unexpected' });
    }
    const changed = targets.filter(target => target.state !== 'noop');
    const state = changed.some(target => target.state === 'unexpected') ? 'CONFLICT_OR_UNKNOWN' : changed.length === 0 ? 'NO_CHANGE' : changed.every(target => target.state === 'old') ? 'NO_EFFECT_OBSERVED' : changed.every(target => target.state === 'intended') ? 'TARGET_STATE_MATCHES' : 'KNOWN_PARTIAL';
    return { state, targets, retry: 'fenced' };
  } catch {
    return { state: 'CONFLICT_OR_UNKNOWN', targets, retry: 'fenced' };
  }
}
export async function applyPreparedBatch(plan: PreparedBatch, approval: BatchApproval): Promise<ApplyOutcome> {
  const state = preparedBatches.get(plan);
  if (state === undefined || attemptedBatches.has(plan)) throw new Error('prepared apply requires a fresh live Root-owned plan; retry is fenced');
  const manifest = await readBatchManifest(plan);
  if (JSON.stringify(manifest) !== JSON.stringify(state.manifest)) throw new Error('live plan differs from its reviewed manifest');
  const review: unknown = JSON.parse((await verifyArtifact(plan.directory, approval.review)).toString('utf8'));
  const reviewErrors = validateAgainstSchema(review, { type: 'object', required: ['schema', 'planSha256', 'verdict', 'reviewer', 'pointer'], additionalProperties: false, properties: { schema: { const: 'VPPreparedBatchReview/v1' }, planSha256: { const: plan.manifest.sha256 }, verdict: { const: 'READY' }, reviewer: batchText, pointer: batchText } });
  if (reviewErrors.length || !record(review)) throw new Error('independent review does not bind this exact plan');
  const observed = await approval.observe({ plan: plan.manifest, review: approval.review, targets: manifest.targets.map(target => target.path) });
  if (observed.kind !== 'observed' || !observed.writer || observed.writer === review.reviewer || observed.reviewPointer !== review.pointer) throw new Error('Root has not observed independent review and publication ownership');
  attemptedBatches.add(plan);
  const receipt = async (kind: ApplyOutcome['kind'], details: unknown): Promise<ApplyOutcome> => ({ kind, receipt: await sealArtifact(plan.directory, `${dirname(plan.manifest.path)}/apply-${randomUUID()}.json`, { schema: 'VPPreparedBatchReceipt/v1', kind, plan: plan.manifest, review: approval.review, writer: observed.writer, pid: process.pid, recordedAt: new Date().toISOString(), details }) });
  return withConverterOwnership(manifest.root, async (io, fence) => {
    try {
      for (const source of state.sources) await readEligibleSource(source);
      for (const ref of [...manifest.specs, ...manifest.tools, manifest.runtime]) await assertFileBinding(ref);
      for (const item of manifest.context) { const bytes = await optionalBytes(item.path); if ((bytes === undefined ? null : fingerprint(bytes)) !== item.sha256) throw new Error(`stale corpus context: ${item.path}`); }
      await verifyArtifact(plan.directory, approval.review);
      const observation = await reconcilePreparedBatch(plan);
      if (observation.state !== 'NO_EFFECT_OBSERVED' && observation.state !== 'NO_CHANGE') return receipt('no-write-conflict', observation);
      if (state.migration !== undefined) {
        const migration = migrations.get(state.migration);
        if (migration === undefined || manifest.migration === undefined || JSON.stringify(migration.binding) !== JSON.stringify(manifest.migration)) throw new Error('stale or unbound migration capability');
        await validateFacetMigration(migration, manifest.migration);
      } else {
        const currentIssues = checkCorpus(manifest.root);
        if ((state.sources.length === 0 && currentIssues.length > 0) || currentIssues.some(issue => issue.code === 'CORPUS_INSTRUCTION_VERSION_UNSUPPORTED' || issue.code === 'CORPUS_FRONTMATTER_INVALID')) throw new Error('corpus preflight failed; mixed-version cutover requires a preimage-bound transition validator');
      }
      if (observation.state === 'NO_CHANGE') return receipt('no-change', observation);
    } catch (error) { return receipt('no-write-conflict', { error: error instanceof Error ? error.message : String(error) }); }
    try {
      for (const target of manifest.targets) {
        if (target.before === target.after) continue;
        const bytes = await verifyArtifact(plan.directory, target.staged);
        const path = await resolveArtifactPath(manifest.root, target.path, true);
        const current = await optionalBytes(path);
        if ((current === undefined ? null : fingerprint(current)) !== target.before) throw new Error(`publication target changed before write: ${target.path}`);
        await io.write(path, bytes.toString('utf8'));
      }
      const observation = await reconcilePreparedBatch(plan);
      if (observation.state !== 'TARGET_STATE_MATCHES') throw new Error(`publication readback: ${observation.state}`);
      if (state.migration !== undefined && manifest.migration !== undefined) {
        const migration = migrations.get(state.migration);
        if (migration === undefined) throw new Error('migration capability disappeared');
        const next = structuredClone(manifest.migration);
        const catalogTarget = manifest.targets.find(target => target.path === 'catalog.json');
        if (catalogTarget === undefined) throw new Error('migration catalog target missing');
        next.catalog = catalogTarget.after;
        for (const [index, item] of next.cohort.entries()) {
          const target = manifest.targets.find(target => target.path === item.path);
          if (target !== undefined) next.current[index] = target.after;
        }
        const remaining = await validateFacetMigration(migration, next);
        migration.binding = next;
        return receipt('applied', { observation, validation: remaining === 0 ? 'strict-corpus' : 'migration-transition', remaining });
      }
      const issues = checkCorpus(manifest.root);
      if (issues.length) throw new Error(`published corpus validation: ${JSON.stringify(issues)}`);
      return receipt('applied', { observation, corpusIssues: issues });
    } catch (error) {
      fence();
      if (state.migration !== undefined) { const migration = migrations.get(state.migration); if (migration !== undefined) migration.fenced = true; }
      return receipt('partial-or-unknown', { error: error instanceof Error ? error.message : String(error), observation: await reconcilePreparedBatch(plan), retry: 'fenced' });
    }
  }, plan.manifest);
}

function cliError(error: unknown): { code: string; message: string; details: Record<string, unknown> } {
  if (error instanceof CatalogError) return { code: error.code, message: error.message, details: error.details };
  return { code: 'CATALOG_INVALID', message: error instanceof Error ? error.message : String(error), details: {} };
}

function parseArgs(args: string[]): { inputs: Array<{ kind: 'instruction'; path: string } | { kind: 'map-record'; path: string } | { kind: 'removal'; instructionId: string }>; options: ConvertOptions } {
  const options: ConvertOptions = { root: packageRoot };
  const inputs: Array<{ kind: 'instruction'; path: string } | { kind: 'map-record'; path: string } | { kind: 'removal'; instructionId: string }> = [];
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    const value = args[index + 1];
    if (flag === '--spec') {
      if (value === undefined || value.startsWith('--')) throw new CatalogError('CATALOG_INVALID', '--spec requires a file path', { flag });
      inputs.push({ kind: 'instruction', path: value }); index += 1;
    } else if (flag === '--map-record') {
      if (value === undefined || value.startsWith('--')) throw new CatalogError('CATALOG_INVALID', '--map-record requires a file path', { flag });
      inputs.push({ kind: 'map-record', path: value }); index += 1;
    } else if (flag === '--remove') {
      if (value === undefined || value.startsWith('--')) throw new CatalogError('CATALOG_INVALID', '--remove requires an instruction id', { flag });
      inputs.push({ kind: 'removal', instructionId: value }); index += 1;
    } else if (flag === '--root' || flag === '--catalog' || flag === '--map') {
      if (value === undefined || value.startsWith('--')) throw new CatalogError('CATALOG_INVALID', `${flag} requires a value`, { flag });
      if (flag === '--root') options.root = value;
      else if (flag === '--catalog') options.catalogPath = value;
      else options.mapPath = value;
      index += 1;
    } else {
      throw new CatalogError('CATALOG_INVALID', `unknown argument: ${String(flag)}`, { flag });
    }
  }
  if (inputs.length === 0) throw new CatalogError('CATALOG_INVALID', 'at least one --spec, --map-record, or --remove is required', { field: 'spec' });
  return { inputs, options };
}

type CliOutput = { stdout: (text: string) => void; stderr: (text: string) => void };

async function main(args: string[], output: CliOutput): Promise<number> {
  try {
    const { inputs, options } = parseArgs(args);
    const results: ConversionResult[] = [];
    for (const input of inputs) results.push(input.kind === 'instruction' ? await convert(input.path, options) : input.kind === 'map-record' ? await convertMapRecord(input.path, options) : await removeInstruction(input.instructionId, options));
    output.stdout(json(results));
    return 0;
  } catch (error) {
    output.stderr(json(cliError(error)));
    return 1;
  }
}

function isEntryPoint(scriptUrl: string, argvPath: string | undefined): boolean {
  return argvPath !== undefined && resolve(argvPath) === fileURLToPath(scriptUrl);
}

export function runConvertCli(
  argv: string[],
  output: CliOutput,
  setExitCode: (code: number) => void = (code) => { process.exitCode = code; },
): Promise<number | undefined> {
  if (!isEntryPoint(import.meta.url, argv[1])) return Promise.resolve(undefined);
  return main(argv.slice(2), output).then((code) => {
    setExitCode(code);
    return code;
  });
}

await runConvertCli(process.argv, {
  stdout: process.stdout.write.bind(process.stdout),
  stderr: process.stderr.write.bind(process.stderr),
});
