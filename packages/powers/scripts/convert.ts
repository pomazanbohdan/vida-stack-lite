import { createHash } from 'node:crypto';
import { readFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { CatalogError, readSchema, type Catalog, type Provenance } from '../skills/vp-mode/scripts/catalog.ts';
import { parseFrontmatter } from '../skills/vp-mode/scripts/frontmatter.ts';
import { validateAgainstSchema, type Schema } from '../skills/vp-mode/scripts/schema.ts';

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

async function readJson(path: string, label: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as unknown;
  } catch (error) {
    if (error instanceof SyntaxError) throw new CatalogError('CATALOG_INVALID', `${label} JSON is malformed`, { path, error: error.message });
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') return undefined;
    throw new CatalogError('CATALOG_INVALID', `cannot read ${label}`, { path, error: error instanceof Error ? error.message : String(error) });
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
  const root = resolve(options.root);
  const raw = await readJson(specPath, 'instruction spec');
  if (raw === undefined) throw new CatalogError('CATALOG_INVALID', 'instruction spec file is missing', { source: specPath });
  const spec = parseInstructionSpec(raw, specPath);
  const instructionSchema = await readSchema(packageRoot, 'vpinstruction.v1.schema.json');

  const catalogPath = target(root, options.catalogPath, join(root, 'catalog.json'));
  const mapPath = target(root, options.mapPath, join(root, 'corpus-map.json'));
  const instructionsDir = target(root, options.instructionsDir, join(root, 'instructions'));
  const instructionPath = join(instructionsDir, `${spec.instruction_id}.md`);
  const relativePath = manifestInstructionPath(catalogPath, instructionPath);
  const manifestValue = await readJson(catalogPath, 'catalog manifest');
  let manifest: Catalog;
  const manifestExists = manifestValue !== undefined;
  if (manifestExists) {
    const catalogSchema = await readSchema(packageRoot, 'vpcatalog.v1.schema.json');
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
  try { oldMarkdown = await readFile(instructionPath, 'utf8'); } catch (error) {
    if (!(typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT')) throw error;
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
  const catalogSchema = await readSchema(packageRoot, 'vpcatalog.v1.schema.json');
  const catalogErrors = validateAgainstSchema(manifest, catalogSchema);
  if (catalogErrors.length > 0) throw new CatalogError('CATALOG_INVALID', 'catalog schema validation failed', { schemaErrors: catalogErrors });

  const mapValue = await readJson(mapPath, 'corpus map');
  let map: Record<string, unknown>;
  if (mapValue === undefined) map = { schema: 'VPCorpusMap/v1', revision: 1, updated_at: '', donors: {} };
  else {
    if (!record(mapValue)) throw new CatalogError('CATALOG_INVALID', 'corpus map must be an object', { path: mapPath });
    const mapSchema = await readSchema(packageRoot, 'vpcorpusmap.v1.schema.json');
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
    if (!ids.includes(spec.instruction_id)) ids.push(spec.instruction_id);
    delete existing.reason;
    files[source.path] = { status: ids.length > 1 ? 'split' : 'converted', instruction_ids: ids };
    donors[source.donor] = donor;
  }
  const mapWasMissing = (await readJson(mapPath, 'corpus map')) === undefined;
  if (mapWasMissing) map.updated_at = (options.now ?? (() => new Date().toISOString()))();
  const mapSchema = await readSchema(packageRoot, 'vpcorpusmap.v1.schema.json');
  const mapErrors = validateAgainstSchema(map, mapSchema);
  if (mapErrors.length > 0) throw new CatalogError('CATALOG_INVALID', 'corpus map schema validation failed', { schemaErrors: mapErrors });
  const oldMapValue = mapWasMissing ? undefined : await readJson(mapPath, 'corpus map');
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
  await mkdir(dirname(instructionPath), { recursive: true });
  await mkdir(dirname(catalogPath), { recursive: true });
  await mkdir(dirname(mapPath), { recursive: true });
  if (written) await writeFile(instructionPath, rendered, 'utf8');
  if (!manifestExists || manifestUpdated || written) await writeFile(catalogPath, json(manifest), 'utf8');
  if (mapUpdated) await writeFile(mapPath, json(map), 'utf8');

  return { kind: 'instruction', instructionId: spec.instruction_id, path: relativePath, sha256: digest, written, manifestUpdated, mapUpdated, manifestRevision: manifest.revision };
}

export async function convertMapRecord(recordPath: string, options: ConvertOptions): Promise<ConversionResult> {
  const root = resolve(options.root); const raw = await readJson(recordPath, 'map record');
  if (raw === undefined) throw new CatalogError('CATALOG_INVALID', 'map record file is missing', { source: recordPath });
  const spec = parseMapRecord(raw, recordPath); const mapPath = target(root, options.mapPath, join(root, 'corpus-map.json'));
  const mapValue = await readJson(mapPath, 'corpus map'); let map: Record<string, unknown>;
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
  if (mapUpdated) { await mkdir(dirname(mapPath), { recursive: true }); await writeFile(mapPath, json(map), 'utf8'); }
  return { kind: 'map-record', instructionId: '', path: spec.path, sha256: '', written: false, manifestUpdated: false, mapUpdated, manifestRevision: 0 };
}

export async function removeInstruction(instructionId: string, options: ConvertOptions): Promise<RemovalResult> {
  const root = resolve(options.root);
  const catalogPath = target(root, options.catalogPath, join(root, 'catalog.json'));
  const mapPath = target(root, options.mapPath, join(root, 'corpus-map.json'));
  const manifestValue = await readJson(catalogPath, 'catalog manifest');
  const catalogSchema = await readSchema(packageRoot, 'vpcatalog.v1.schema.json');
  if (!record(manifestValue)) throw new CatalogError('CATALOG_INVALID', 'catalog manifest must be an object', { path: catalogPath });
  const catalogErrors = validateAgainstSchema(manifestValue, catalogSchema);
  if (catalogErrors.length > 0) throw new CatalogError('CATALOG_INVALID', 'catalog schema validation failed', { schemaErrors: catalogErrors });
  const manifest = manifestValue as unknown as Catalog;
  const entry = manifest.instructions.find((item) => item.instruction_id === instructionId);
  if (entry === undefined) throw new CatalogError('CATALOG_INVALID', `instruction ${instructionId} is not in the catalog manifest`, { instruction_id: instructionId });
  const instructionPath = resolve(dirname(catalogPath), entry.path);
  const mapValue = await readJson(mapPath, 'corpus map');
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
          file.status = 'rejected'; file.reason = 'інструкцію замінено на атомарні';
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
  await rm(instructionPath, { force: true });
  await writeFile(catalogPath, json(manifest), 'utf8');
  if (map !== undefined && mapUpdated) await writeFile(mapPath, json(map), 'utf8');
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
  const results: ConversionResult[] = [];
  for (const specPath of specPaths) results.push(await convert(specPath, options));
  return results;
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
