import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { prepareTargetBatch, type PreparedBatch } from './convert.ts';
import {
  batchTagForManifest, createAdmissionContext, deriveVariantApplicability, generateAdmission,
  sealFamilyAdmissions, type AdmissionContext, type GeneratedAdmission,
} from './sbvf-admission.ts';
import { parseFrontmatter } from '../skills/vp-mode/scripts/frontmatter.ts';
import { encodeVariantScalar, parseVariantSections, type VariantRecord } from '../skills/vp-mode/scripts/variants.ts';
import { parseApplicability, parseVersionRange } from '../skills/vp-mode/scripts/applicability.ts';
import { validateAgainstSchema, type Schema } from '../skills/vp-mode/scripts/schema.ts';

type Dict = Record<string, unknown>;
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sha = (value: Uint8Array | string): string => createHash('sha256').update(value).digest('hex');
const isRecord = (value: unknown): value is Dict => typeof value === 'object' && value !== null && !Array.isArray(value);
const stable = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;
const text = async (path: string): Promise<string> => new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(await readFile(path));
const json = async (path: string): Promise<Dict> => JSON.parse(await text(path)) as Dict;

export function deriveApplicability(sourceLabel: string): Dict {
  const clean = sourceLabel.replace(/\s*\([^()]*\)\s*$/u, '').trim();
  const match = /^([A-Za-z][A-Za-z0-9-]*)\s+(.+)$/u.exec(clean);
  if (match === null) throw new Error(`unparseable applicability label: ${sourceLabel}`);
  const name = (match[1] ?? '').toLowerCase();
  let versionRange;
  try { versionRange = parseVersionRange((match[2] ?? '').trim()); }
  catch { throw new Error(`unparseable applicability label: ${sourceLabel}`); }
  const result = { frameworks: [{ name, versionRange, sourceLabel }], requiredContext: [`framework:${name}`] };
  return parseApplicability(JSON.stringify(result)) as unknown as Dict;
}

export function yaml(value: unknown): string {
  if (typeof value === 'string') {
    if (/[\u0000-\u001f\u007f-\u009f]/u.test(value)) throw new Error('frontmatter string contains control characters');
    return `"${value.replace(/\\/gu, '\\\\').replace(/"/gu, '\\"')}"`;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.length === 0 ? '[]' : `\n${value.map(item => `  - ${yaml(item)}`).join('\n')}`;
  throw new Error('unsupported frontmatter value');
}

function stripProvenanceLocators(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value.map(entry => typeof entry === 'string' ? entry.replace(/;\s*locator=[^;]*/gu, '').replace(/^\s*locator=[^;]*;\s*/u, '') : entry);
}

function mapVariantMetadata(id: string, front: Dict, source: Dict, sourceLabel: string, applicability: Dict, body: string): VariantRecord {
  const keys = ['title','summary','capability_tags','pattern_tags','conditions_applies_when','conditions_does_not_apply_when','artifact_contract_output_type','artifact_contract_required_data','artifact_contract_verified_by','compatibility_excludes','compatibility_requires','roles','products','provenance','status','revision','classification_status','instruction_form','domains','classification_reason','approach_assessments','approach_body_sha256'];
  const data: Dict = Object.fromEntries(keys.filter(key => front[key] !== undefined).map(key => [key, front[key]]));
  return { ...data, variant_id: id, source, sourceLabel, applicability, contentSha256: sha(body) } as unknown as VariantRecord;
}

export function updateDonorFileInstructionIds(donors: Dict, ownerByVariant: ReadonlyMap<string, string>): void {
  for (const donor of Object.values(donors)) if (isRecord(donor) && isRecord(donor.files)) for (const file of Object.values(donor.files)) if (isRecord(file) && Array.isArray(file.instruction_ids)) {
    file.instruction_ids = [...new Set(file.instruction_ids.map(value => {
      const id = String(value);
      return ownerByVariant.get(id) ?? id;
    }))];
  }
}

type AdmissionLane = {
  entries: Map<string, Dict>;
  ctx: AdmissionContext;
  asOf: string;
  sourceRevision: string;
  generated: GeneratedAdmission[];
};

async function makeFamilyFile(root: string, family: Dict, units: Dict[], map: Dict, catalog: Dict, lane?: AdmissionLane): Promise<{ bytes: Buffer; variants: VariantRecord[]; assignments: Dict[]; admittedIds: string[] }> {
  const donors = map.donors as Dict; const uupm = donors.uupm as Dict; const csvSources = uupm.csvSources as Dict;
  const entries = (catalog.instructions as Dict[]);
  const variants: VariantRecord[] = []; const assignments: Dict[] = []; const bodyParts: string[] = [];
  const admittedIds: string[] = [];
  for (const id of family.variants as string[]) {
    const unit = units.find(item => item.instructionId === id || (Array.isArray(item.instructionIds) && item.instructionIds.includes(id)));
    if (unit === undefined) {
      if (lane === undefined) throw new Error(`variant has no admitted binding and no admission manifest covers it: ${id}`);
      const entry = lane.entries.get(id);
      if (entry === undefined) throw new Error(`admission manifest has no entry for variant: ${id}`);
      if (String(entry.family_id ?? '') !== String(family.family_id)) throw new Error(`admission family mismatch for ${id}: ${String(entry.family_id)} != ${String(family.family_id)}`);
      const source = isRecord(entry.source) ? entry.source : {};
      const admitUnit = units.find(item => item.file === String(source.path ?? '') && item.rowKey === String(source.rowKey ?? '') && item.disposition === 'deferred' && item.status === 'deferred');
      if (admitUnit === undefined) throw new Error(`admission source row is not a deferred census unit: ${id}`);
      const admitLocator = admitUnit.locator;
      if (typeof admitUnit.file !== 'string' || typeof admitUnit.rowKey !== 'string' || !isRecord(admitLocator)
        || typeof admitLocator.line !== 'number' || typeof admitLocator.row !== 'number'
        || typeof admitUnit.applicabilityLabel !== 'string' || (admitUnit.domain !== 'stack' && admitUnit.domain !== 'ux')
        || typeof admitUnit.disposition !== 'string' || typeof admitUnit.status !== 'string') throw new Error(`admission census unit is incomplete: ${id}`);
      const sourceFile = csvSources[admitUnit.file];
      const row = isRecord(sourceFile) && Array.isArray(sourceFile.rows) ? sourceFile.rows.find(item => isRecord(item) && item.rowKey === admitUnit.rowKey) : undefined;
      if (!isRecord(sourceFile) || !isRecord(row) || typeof sourceFile.rawSha256 !== 'string') throw new Error(`admission source row missing: ${id}`);
      const locators = Array.isArray(row.locators) ? row.locators : [];
      if (locators.length === 0 || !locators.some(item => isRecord(item) && item.row === admitLocator.row)) throw new Error(`admission locator missing: ${id}`);
      const generated = generateAdmission(root, lane.ctx, {
        variantId: id, familyId: String(family.family_id), file: admitUnit.file, rowKey: admitUnit.rowKey,
        unit: {
          file: admitUnit.file, rowKey: admitUnit.rowKey,
          locator: { line: admitLocator.line, row: admitLocator.row },
          title: String(admitUnit.title ?? ''), applicabilityLabel: admitUnit.applicabilityLabel,
          domain: admitUnit.domain, disposition: admitUnit.disposition, status: admitUnit.status,
        },
        mapRow: row, csvSource: sourceFile, admission: entry, sourceRevision: lane.sourceRevision, asOf: lane.asOf,
      });
      lane.generated.push(generated); admittedIds.push(id);
      const variant = mapVariantMetadata(id, generated.metadata, generated.source, generated.sourceLabel, generated.applicability, generated.body);
      variants.push(variant); assignments.push({ variantId: id, source: generated.source, applicability: generated.applicability });
      if (!generated.body.endsWith('\n')) throw new Error(`admission body must end with LF for exact section payload: ${id}`);
      bodyParts.push(`<!-- sbvf:variant:begin ${id} -->\n${generated.body}<!-- sbvf:variant:end ${id} -->`);
      continue;
    }
    if (typeof unit.file !== 'string' || typeof unit.rowKey !== 'string' || typeof unit.applicabilityLabel !== 'string') throw new Error(`variant is missing census/source binding: ${id}`);
    const sourceFile = csvSources[unit.file];
    const row = isRecord(sourceFile) && Array.isArray(sourceFile.rows) ? sourceFile.rows.find(item => isRecord(item) && item.rowKey === unit.rowKey) : undefined;
    if (!isRecord(sourceFile) || !isRecord(row) || typeof sourceFile.rawSha256 !== 'string') throw new Error(`variant source row missing: ${id}`);
    const binding = Array.isArray(row.bindings) ? row.bindings.find(item => isRecord(item) && (item.variantId ?? item.instructionId) === id) : undefined;
    if (!isRecord(binding)) throw new Error(`variant admitted binding missing: ${id}`);
    const entry = entries.find(item => item.instruction_id === id);
    if (!isRecord(entry) || typeof entry.path !== 'string') throw new Error(`variant catalog entry missing: ${id}`);
    const oldBytes = await readFile(join(root, entry.path));
    if (sha(oldBytes) !== entry.sha256) throw new Error(`variant catalog digest mismatch: ${id}`);
    const oldText = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(oldBytes);
    const parsed = parseFrontmatter(oldText); const applicability = deriveVariantApplicability(unit.applicabilityLabel);
    const locators = Array.isArray(row.locators) ? row.locators : [];
    const source = { donor: 'uupm', path: unit.file, rowKey: unit.rowKey, rawSha256: sourceFile.rawSha256 };
    const variant = mapVariantMetadata(id, { ...parsed.data, provenance: stripProvenanceLocators(parsed.data.provenance) }, source, unit.applicabilityLabel, applicability, parsed.body);
    variants.push(variant); assignments.push({ variantId: id, source, applicability });
    if (!parsed.body.endsWith('\n')) throw new Error(`variant body must end with LF for exact section payload: ${id}`);
    bodyParts.push(`<!-- sbvf:variant:begin ${id} -->\n${parsed.body}<!-- sbvf:variant:end ${id} -->`);
    if (locators.length === 0 || !locators.some(item => isRecord(item) && isRecord(item) && item.row === (unit.locator as Dict).row)) throw new Error(`variant locator missing: ${id}`);
  }
  const meta = (key: string): string[] => [...new Set(variants.flatMap(item => Array.isArray(item[key as keyof VariantRecord]) ? item[key as keyof VariantRecord] as string[] : []))].sort();
  // Variant provenance drops per-row locators so variants from the same CSV share
  // one byte-identical source string; check-corpus requires every variant provenance
  // verbatim in the family frontmatter while rejecting repeated donor+revision+path
  // keys. Row-level provenance stays in variant.source.rowKey, map bindings, receipts.
  const provenance = [...new Set(variants.flatMap(item => item.provenance))];
  const fields: Dict = { schema: 'VPInstruction/v3', classification_status: 'unclassified', classification_reason: 'sbvf-family-pilot', instruction_id: family.family_id,
    title: family.title, summary: family.summary, capability_tags: meta('capability_tags'), pattern_tags: meta('pattern_tags'),
    conditions_applies_when: 'Applies when the selected framework variant matches.',
    conditions_does_not_apply_when: 'The framework is not one of the declared variants or the variant exception applies.',
    artifact_contract_output_type: 'none', artifact_contract_required_data: [], artifact_contract_verified_by: 'Each selected variant retains its source-specific contract and is checked against its source-bound guidance.',
    compatibility_excludes: [], compatibility_requires: [], roles: meta('roles'), products: meta('products'), provenance, status: 'active', revision: 1 };
  fields.instruction_variants = JSON.stringify(variants);
  const errors = validateAgainstSchema(fields, JSON.parse(await text(join(packageRoot, 'config', 'vpinstruction.v3.schema.json'))) as Schema);
  if (errors.length) throw new Error(`family metadata schema invalid: ${errors.join('; ')}`);
  const front = Object.entries(fields).filter(([key]) => key !== 'instruction_variants').map(([key, value]) => `${key}: ${yaml(value)}`).join('\n');
  const markdown = `---\n${front}\ninstruction_variants: ${encodeVariantScalar(variants, String(family.family_id))}\n---\n${bodyParts.join('\n')}\n`;
  parseVariantSections(bodyParts.join('\n') + '\n', variants, String(family.family_id));
  return { bytes: Buffer.from(markdown, 'utf8'), variants, assignments, admittedIds };
}

async function buildSbvfPlanInternal(rootInput: string, manifestPathInput: string, asOf: string, stagingRoot?: string, admissionsPathInput?: string): Promise<{ plan: Dict; batch?: PreparedBatch }> {
  const root = resolve(rootInput); const manifestPath = resolve(manifestPathInput);
  if (!Number.isFinite(Date.parse(asOf)) || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/u.test(asOf)) throw new Error('--as-of must be an ISO-8601 timestamp');
  const manifest = await json(manifestPath); const familySchema = JSON.parse(await text(join(packageRoot, 'config', 'sbvf-families.v1.schema.json'))) as Schema;
  const schemaErrors = validateAgainstSchema(manifest, familySchema); if (schemaErrors.length) throw new Error(`manifest validation failed: ${schemaErrors.join('; ')}`);
  let admissionManifest: Dict | undefined; let admissionManifestBytes: Buffer | undefined; let admissionsPath: string | undefined;
  if (admissionsPathInput !== undefined) {
    admissionsPath = resolve(admissionsPathInput);
    admissionManifestBytes = await readFile(admissionsPath);
    admissionManifest = JSON.parse(new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(admissionManifestBytes)) as Dict;
    const admissionSchema = JSON.parse(await text(join(packageRoot, 'config', 'sbvf-admissions.v1.schema.json'))) as Schema;
    const admissionErrors = validateAgainstSchema(admissionManifest, admissionSchema);
    if (admissionErrors.length) throw new Error(`admission manifest validation failed: ${admissionErrors.join('; ')}`);
  }
  const censusArgs = [join(packageRoot, 'scripts', 'sbvf-census.ts'), '--root', root, '--manifest', manifestPath, '--json'];
  if (admissionsPath !== undefined) censusArgs.push('--admissions', admissionsPath);
  const censusRun = spawnSync(process.execPath, censusArgs, { encoding: 'utf8', cwd: root, maxBuffer: 16 * 1024 * 1024 });
  if (censusRun.status !== 0) throw new Error(`manifest/corpus validation failed: ${(censusRun.stderr || censusRun.error?.message || censusRun.stdout).trim()}`);
  const census: Dict = JSON.parse(censusRun.stdout) as Dict;
  if (!isRecord(census.manifestValidation) || census.manifestValidation.valid !== true) throw new Error(`manifest/corpus validation failed: ${JSON.stringify(census.manifestValidation)}`);
  const units = Array.isArray(census.units) ? census.units.filter(isRecord) : [];
  const admittedBindings = units.reduce((count, unit) => count + (Array.isArray(unit.instructionIds) ? unit.instructionIds.length : typeof unit.instructionId === 'string' && unit.instructionId !== '' ? 1 : 0), 0);
  const catalog = await json(join(root, 'catalog.json')); const map = await json(join(root, 'corpus-map.json'));
  const catalogEntries = catalog.instructions as Dict[]; const mapNext = structuredClone(map) as Dict; const catalogNext = structuredClone(catalog) as Dict;
  const targets: Array<{ path: string; bytes: Buffer | null }> = []; const assignments: Dict[] = [];
  const familyDetails: Dict[] = []; const familyIds = new Set<string>(); const memberIds = new Set<string>(); const migratedIds = new Set<string>();
  let lane: AdmissionLane | undefined; let laneSealed: ReturnType<typeof sealFamilyAdmissions> | undefined;
  if (admissionManifest !== undefined) {
    const entries = new Map<string, Dict>();
    for (const raw of (admissionManifest.admissions as unknown[]).filter(isRecord)) {
      const id = String(raw.variant_id ?? '');
      if (entries.has(id)) throw new Error(`duplicate admission variant_id: ${id}`);
      entries.set(id, raw);
    }
    const uupm = isRecord(map.donors) && isRecord(map.donors.uupm) ? map.donors.uupm : {};
    const sourceRevision = typeof uupm.source_revision === 'string' ? uupm.source_revision : '';
    if (sourceRevision === '') throw new Error('corpus-map donors.uupm.source_revision is required for admission provenance');
    lane = { entries, ctx: createAdmissionContext(root), asOf, sourceRevision, generated: [] };
  }
  for (const family of manifest.families as Dict[]) {
    if (familyIds.has(String(family.family_id))) throw new Error(`duplicate family ID: ${String(family.family_id)}`); familyIds.add(String(family.family_id));
    for (const id of family.variants as string[]) { if (familyIds.has(id) || memberIds.has(id)) throw new Error(`family/variant ID collision: ${id}`); memberIds.add(id); }
    const result = await makeFamilyFile(root, family, units, map, catalog, lane);
    for (const id of family.variants as string[]) if (!result.admittedIds.includes(id)) migratedIds.add(id);
    const path = `instructions/${String(family.family_id)}.md`; targets.push({ path, bytes: result.bytes }); assignments.push(...result.assignments);
    familyDetails.push({ familyId: family.family_id, variants: result.variants.map(item => item.variant_id), path, sha256: sha(result.bytes) });
  }
  if (lane !== undefined) {
    const generatedIds = new Set(lane.generated.map(item => item.variantId));
    for (const id of lane.entries.keys()) if (!generatedIds.has(id)) throw new Error(`admission manifest entry is not referenced by any family variant: ${id}`);
    const rawSha256ByFile = new Map<string, string>();
    for (const item of lane.generated) rawSha256ByFile.set(item.file, item.source.rawSha256);
    const sealed = sealFamilyAdmissions(lane.generated, { asOf, batchTag: batchTagForManifest(admissionsPath ?? manifestPath), sourceRevision: lane.sourceRevision, rawSha256ByFile });
    laneSealed = sealed;
    for (const target of sealed.targets) targets.push(target);
  }
  const donors = mapNext.donors as Dict;
  const ownerByVariant = new Map<string, string>();
  for (const family of manifest.families as Dict[]) for (const id of family.variants as string[]) ownerByVariant.set(id, String(family.family_id));
  updateDonorFileInstructionIds(donors, ownerByVariant);
  for (const source of Object.values((donors.uupm as Dict).csvSources as Dict)) if (isRecord(source) && Array.isArray(source.rows)) for (const row of source.rows) if (isRecord(row) && Array.isArray(row.bindings)) for (const binding of row.bindings) if (isRecord(binding)) {
    const oldId = String(binding.variantId ?? binding.instructionId); const owner = (manifest.families as Dict[]).find(f => (f.variants as string[]).includes(oldId));
    binding.variantId = oldId; if (owner !== undefined) binding.instructionId = owner.family_id;
  }
  if (laneSealed !== undefined) {
    const csvSourcesNext = (donors.uupm as Dict).csvSources as Dict;
    for (const admission of laneSealed.admissions) {
      const source = csvSourcesNext[admission.file];
      const row = isRecord(source) && Array.isArray(source.rows) ? source.rows.find(item => isRecord(item) && item.rowKey === admission.rowKey) : undefined;
      if (!isRecord(row)) throw new Error(`admission map row missing: ${admission.file}:${admission.rowKey}`);
      row.disposition = 'admitted';
      delete row.reason;
      row.bindings = [admission.binding];
    }
  }
  const oldMap = await readFile(join(root, 'corpus-map.json')); mapNext.schema = 'VPCorpusMap/v3'; mapNext.revision = Number(map.revision) + 1;
  const mapBytes = Buffer.from(stable(mapNext)); targets.push({ path: 'corpus-map.json', bytes: mapBytes });
  for (const id of migratedIds) targets.push({ path: `instructions/${id}.md`, bytes: null });
  const removed = new Set([...migratedIds]);
  const nextEntries = catalogEntries.filter(entry => !removed.has(String(entry.instruction_id)));
  for (const family of manifest.families as Dict[]) nextEntries.push({ instruction_id: family.family_id, path: `instructions/${String(family.family_id)}.md`, sha256: familyDetails.find(item => item.familyId === family.family_id)!.sha256 });
  nextEntries.sort((left, right) => String(left.instruction_id) < String(right.instruction_id) ? -1 : String(left.instruction_id) > String(right.instruction_id) ? 1 : 0);
  catalogNext.instructions = nextEntries; catalogNext.revision = Number(catalog.revision) + 1; catalogNext.updated_at = asOf;
  const catalogBytes = Buffer.from(stable(catalogNext)); targets.push({ path: 'catalog.json', bytes: catalogBytes });
  const admitCount = laneSealed?.admissions.length ?? 0;
  const admitIds = (laneSealed?.admissions ?? []).map(item => item.variantId).sort();
  const logical: Dict = {
    schema: admitCount > 0 ? 'SBVFAdmissionPlan/v1' : 'SBVFMigrationPlan/v1', asOf, manifestSha256: sha(await readFile(manifestPath)),
    ...(admissionManifestBytes === undefined ? {} : { admissionManifestSha256: sha(admissionManifestBytes) }),
    families: familyDetails, variants: assignments,
    bindingChanges: { singletonToFamily: assignments.length - admitCount, deferredToFamily: admitCount, unchangedSingletons: admittedBindings - (assignments.length - admitCount) },
    bindingCounts: countCsvBindings(mapNext),
    catalogDelta: { removed: [...migratedIds].sort(), added: familyDetails.map(item => item.familyId), beforeCount: catalogEntries.length, afterCount: nextEntries.length, admittedVariants: admitIds, newReceiptCount: admitCount },
    ...(laneSealed === undefined ? {} : { admissions: laneSealed.admissions }),
    targets: targets.map(item => ({ path: item.path, beforeSha256: exists(join(root, item.path)) ? sha(readFileSync(join(root, item.path))) : null, afterSha256: item.bytes === null ? null : sha(item.bytes) })),
    deleteList: [...migratedIds].map(id => `instructions/${id}.md`).sort(), mapBeforeSha256: sha(oldMap), mapAfterSha256: sha(mapBytes), catalogAfterSha256: sha(catalogBytes) };
  const plan: Dict = { ...logical, planSha256: sha(stable(logical)) };
  let batch: PreparedBatch | undefined;
  if (stagingRoot !== undefined) {
    batch = await prepareTargetBatch(targets, { root, stagingRoot });
    plan.stagingPath = resolve(stagingRoot); plan.targetPaths = targets.map(item => item.path);
  }
  return { plan, ...(batch === undefined ? {} : { batch }) };
}

export async function buildSbvfPlan(rootInput: string, manifestPathInput: string, asOf: string, stagingRoot?: string, admissionsPath?: string): Promise<Dict> {
  return (await buildSbvfPlanInternal(rootInput, manifestPathInput, asOf, stagingRoot, admissionsPath)).plan;
}

export async function buildSbvfPlanWithBatch(rootInput: string, manifestPathInput: string, asOf: string, stagingRoot: string, admissionsPath?: string): Promise<{ plan: Dict; batch: PreparedBatch }> {
  const result = await buildSbvfPlanInternal(rootInput, manifestPathInput, asOf, stagingRoot, admissionsPath);
  if (result.batch === undefined) throw new Error('prepared batch was not created');
  return { plan: result.plan, batch: result.batch };
}

function exists(path: string): boolean { try { readFileSync(path); return true; } catch { return false; } }

function countCsvBindings(map: Dict): { total: number; singleton: number; family: number } {
  let total = 0; let singleton = 0; let family = 0;
  const donors = isRecord(map.donors) ? map.donors : {};
  for (const donor of Object.values(donors)) {
    if (!isRecord(donor) || !isRecord(donor.csvSources)) continue;
    for (const source of Object.values(donor.csvSources)) {
      if (!isRecord(source) || !Array.isArray(source.rows)) continue;
      for (const row of source.rows) {
        if (!isRecord(row) || !Array.isArray(row.bindings)) continue;
        for (const binding of row.bindings) if (isRecord(binding)) {
          total += 1;
          if (String(binding.instructionId).startsWith('family-')) family += 1; else singleton += 1;
        }
      }
    }
  }
  return { total, singleton, family };
}

type Options = { root: string; manifest: string; admissions?: string; staging: string; asOf: string; out?: string; check?: string };
function args(values: string[]): Options {
  const options: Options = { root: packageRoot, manifest: join(packageRoot, 'config', 'sbvf-families.json'), staging: '', asOf: '2026-11-07T00:00:00Z' };
  for (let i = 0; i < values.length; i += 1) { const flag = values[i]!; const value = values[++i]; if (value === undefined) throw new Error(`${flag} requires a value`);
    if (flag === '--root') options.root = resolve(value); else if (flag === '--manifest') options.manifest = resolve(value); else if (flag === '--admissions') options.admissions = resolve(value); else if (flag === '--staging') options.staging = resolve(value);
    else if (flag === '--as-of') options.asOf = value; else if (flag === '--out') options.out = resolve(value); else if (flag === '--check') options.check = value; else throw new Error(`unknown argument: ${flag}`); }
  return options;
}
async function verifyStaging(staging: string, plan: Dict): Promise<void> {
  const expected = new Map((plan.targets as Dict[]).map(target => [String(target.path), target.afterSha256]));
  for (const item of await readdir(staging, { withFileTypes: true })) {
    if (!item.isDirectory()) continue;
    const manifestPath = join(staging, item.name, 'plan.json');
    let batch: Dict;
    try { batch = await json(manifestPath); } catch { continue; }
    if (!Array.isArray(batch.targets)) continue;
    const targets = batch.targets.filter(isRecord);
    if (targets.length !== expected.size || targets.some(target => !expected.has(String(target.path)) || expected.get(String(target.path)) !== target.after)) continue;
    const expectedOrder = (plan.targets as Dict[]).map(target => String(target.path));
    if (expectedOrder.includes('catalog.json') && expectedOrder[expectedOrder.length - 1] !== 'catalog.json') throw new Error('plan target order must place catalog.json last');
    if (targets.map(target => String(target.path)).join('\n') !== expectedOrder.join('\n')) continue;
    for (const target of targets) {
      if ((target.before === null) !== (target.backup === null)) throw new Error('staged before-image proof is missing');
      if (target.backup !== null) {
        if (!isRecord(target.backup) || typeof target.backup.path !== 'string' || typeof target.backup.sha256 !== 'string') throw new Error('staged before-image reference is invalid');
        const backupPath = resolve(staging, target.backup.path); const backupRel = relative(resolve(staging), backupPath);
        if (isAbsolute(backupRel) || backupRel === '..' || backupRel.startsWith(`..${sep}`)) throw new Error('staged before-image escapes staging root');
        if (sha(await readFile(backupPath)) !== target.backup.sha256 || target.backup.sha256 !== target.before) throw new Error(`staged before-image hash mismatch: ${String(target.path)}`);
      }
      if (target.after === null) { if (target.staged !== null) throw new Error('staged delete target unexpectedly has output'); continue; }
      if (!isRecord(target.staged) || typeof target.staged.path !== 'string' || typeof target.staged.sha256 !== 'string' || !/^[0-9a-f]{64}$/u.test(target.staged.sha256)) throw new Error('staged output reference is invalid');
      const stagedPath = resolve(staging, target.staged.path);
      const rel = relative(resolve(staging), stagedPath);
      if (isAbsolute(rel) || rel === '..' || rel.startsWith(`..${sep}`)) throw new Error('staged output escapes staging root');
      const bytes = await readFile(stagedPath);
      if (sha(bytes) !== target.staged.sha256 || sha(bytes) !== target.after) throw new Error(`staged output hash mismatch: ${String(target.path)}`);
    }
    return;
  }
  throw new Error('no staged prepared batch matches the plan targets');
}
export async function runSbvfPlanCli(values: string[], output: { stdout: (value: string) => void; stderr: (value: string) => void }): Promise<number> {
  try {
    const options = args(values); const base = await buildSbvfPlan(options.root, options.manifest, options.asOf, undefined, options.admissions);
    if (!options.staging) options.staging = join(packageRoot, '.tmp', 'sbvf', String(base.planSha256));
    const logical = options.check === undefined ? await buildSbvfPlan(options.root, options.manifest, options.asOf, options.staging, options.admissions) : base;
    if (options.check !== undefined) {
      if (options.check !== logical.planSha256) throw new Error(`plan SHA mismatch: expected ${options.check}, observed ${String(logical.planSha256)}`);
      await verifyStaging(options.staging, logical);
    }
    if (options.out !== undefined) { await mkdir(dirname(options.out), { recursive: true }); await writeFile(options.out, stable(logical), 'utf8'); }
    output.stdout(stable(logical)); return 0;
  } catch (error) { output.stderr(`sbvf-plan: ${error instanceof Error ? error.message : String(error)}\n`); return 1; }
}
export function startSbvfPlanEntrypoint(argv: string[], output: { stdout: (value: string) => void; stderr: (value: string) => void }, setExitCode: (code: number) => void): Promise<boolean> {
  if (argv[1] === undefined || resolve(argv[1]) !== fileURLToPath(import.meta.url)) return Promise.resolve(false);
  return runSbvfPlanCli(argv.slice(2), output).then(code => { setExitCode(code); return true; });
}
export function setPlanProcessExitCode(code: number): void { process.exitCode = code; }
void startSbvfPlanEntrypoint(process.argv, {
  stdout: process.stdout.write.bind(process.stdout), stderr: process.stderr.write.bind(process.stderr),
}, setPlanProcessExitCode);
