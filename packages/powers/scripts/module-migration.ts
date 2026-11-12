import { createHash, randomUUID } from 'node:crypto';
import { lstat, readFile, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { Buffer } from 'node:buffer';
import { applyPreparedBatch, prepareTargetBatch, type BatchApproval, type PreparedBatch, type PreparedTargetInput } from './convert.ts';
import { checkCorpus } from './check-corpus.ts';
import { CatalogError, catalogCompose, catalogGet, catalogSearch, loadCatalog, loadInstructions, readSchema, type Catalog, type EffectiveProfile, type LoadedInstruction } from '../skills/vp-mode/scripts/catalog.ts';
import { parseFrontmatter } from '../skills/vp-mode/scripts/frontmatter.ts';
import { parseModule, type ModuleAtomRecord } from '../skills/vp-mode/scripts/modules.ts';
import { validateAgainstSchema } from '../skills/vp-mode/scripts/schema.ts';
import { verifyArtifact, type ArtifactRef } from './source-packets.ts';

const HASH = /^[0-9a-f]{64}$/u;
const PILOTS = {
  gsd: { donor: 'gsd-core', path: 'agents/gsd-security-auditor.compact.md', title: 'GSD security auditor', ids: ['a-check-in-the-wrong-layer-does-not-close-the-threat', 'count-only-the-findings-above-the-blocking-threshold', 'verify-a-transferred-risk-by-its-transfer-record-not-by-assumption'] },
  addy: { donor: 'addy-skills', path: 'agents/security-auditor.md', title: 'Addy security auditor', ids: ['audit-authentication-and-authorization', 'audit-dependency-supply-chain', 'check-data-protection-and-runtime-hardening', 'check-outbound-and-third-party-trust', 'inspect-security-surface', 'map-trust-boundaries-before-finding', 'rate-security-findings-by-exploitability', 'secure-ai-features'] },
} as const;
type Pilot = keyof typeof PILOTS;
type AnyRecord = Record<string, unknown>;
type PlanTarget = { path: string; before: string | null; after: string | null; staged: ArtifactRef | null; backup: ArtifactRef | null };
type BatchManifest = { schema: 'VPPreparedBatch/v1'; root: string; targets: PlanTarget[] };
export type ModulePlan = {
  schema: 'VPModuleMigrationPlan/v1'; root: string; pilot: Pilot | null; asOf: string; moduleId: string;
  source: { donor: string; path: string }; atoms: Array<ModuleAtomRecord & { instruction_path: string }>;
  modulePath: string; moduleSha256: string; mapSha256: string; catalogBeforeSha256: string;
  catalogAfterSha256: string; catalogCountBefore: number; catalogCountAfter: number;
  receipts: Array<{ path: string; sha256: string }>;
  targetHashes: Array<{ path: string; before: string | null; after: string | null }>;
  targetOrder: string[]; counts: { atoms: number; targets: number; writes: number; deletes: number };
  planSha: string; stagingPath: string; batchManifest: ArtifactRef; batchDirectory: string;
};
type PreparedMigration = { plan: ModulePlan; batch: PreparedBatch; manifest: BatchManifest };
type ApplyRecord = { schema: 'VPModuleMigrationApply/v1'; plan: ModulePlan; outcome: string; receipt: ArtifactRef | null; batchManifest: ArtifactRef; batchDirectory: string };

const sha = (bytes: Uint8Array | string): string => createHash('sha256').update(bytes).digest('hex');
const text = (value: string): string => JSON.stringify(value);
const jsonBytes = (value: unknown): Buffer => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
function object(value: unknown): value is AnyRecord { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function assertRoot(root: string): string { if (!root || !isAbsolute(root)) throw new Error('--root must be an absolute product root'); return resolve(root); }
function moduleBase(donor: string, sourcePath: string): string {
  const slug = sourcePath.toLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/^-|-$/gu, '');
  const hash8 = sha(`${donor}\0${sourcePath}`).slice(0, 8);
  return `module-${donor}-${slug}-${hash8}`;
}
export function moduleIdFor(source: { donor: string; path: string }, instructions: readonly { instruction_id: string }[]): { moduleId: string; ordinal: number } {
  const base = moduleBase(source.donor, source.path);
  const prefix = `${base}-c`;
  const ordinals = instructions.flatMap((entry) => {
    if (!entry.instruction_id.startsWith(prefix)) return [];
    const suffix = entry.instruction_id.slice(prefix.length);
    return /^\d{2}$/u.test(suffix) ? [Number(suffix)] : [];
  });
  const ordinal = Math.max(0, ...ordinals) + 1;
  if (ordinal > 99) throw new Error(`module ordinal exceeds c99 for ${source.donor}:${source.path}`);
  return { moduleId: `${base}-c${String(ordinal).padStart(2, '0')}`, ordinal };
}
export function validateAsOf(value: string): string {
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/u.test(value) || Number.isNaN(Date.parse(value))) throw new Error('--as-of must be an ISO UTC timestamp');
  return new Date(value).toISOString();
}
async function readUtf8(path: string): Promise<string> { return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(await readFile(path)); }
async function readJson(path: string): Promise<AnyRecord> { const value: unknown = JSON.parse(await readUtf8(path)); if (!object(value)) throw new Error(`expected JSON object: ${path}`); return value; }
export async function receiptSnapshot(root: string, map: AnyRecord): Promise<Array<{ path: string; sha256: string }>> {
  if (!object(map.donors)) throw new Error('corpus map has no donors object');
  const refs = new Map<string, string>();
  for (const donor of Object.values(map.donors)) {
    if (!object(donor) || !object(donor.csvSources)) continue;
    for (const source of Object.values(donor.csvSources)) {
      if (!object(source) || !Array.isArray(source.rows)) continue;
      for (const row of source.rows) {
        if (!object(row) || !Array.isArray(row.bindings)) continue;
        for (const binding of row.bindings) {
          if (!object(binding) || !object(binding.fidelity) || typeof binding.fidelity.path !== 'string' || typeof binding.fidelity.sha256 !== 'string' || !HASH.test(binding.fidelity.sha256)) continue;
          const previous = refs.get(binding.fidelity.path);
          if (previous !== undefined && previous !== binding.fidelity.sha256) throw new Error(`conflicting fidelity receipt hashes: ${binding.fidelity.path}`);
          refs.set(binding.fidelity.path, binding.fidelity.sha256);
        }
      }
    }
  }
  return Promise.all([...refs].sort(([a], [b]) => a.localeCompare(b)).map(async ([path, expected]) => {
    const bytes = await readFile(resolve(root, path));
    const actual = sha(bytes);
    if (actual !== expected) throw new Error(`fidelity receipt digest mismatch: ${path}`);
    return { path, sha256: actual };
  }));
}
function yamlScalar(key: string, value: string): string { return `${key}: ${text(value)}`; }
export function renderModule(record: { moduleId: string; title: string; summary: string; source: { donor: string; path: string }; atomIds: string[]; atomRecords: ModuleAtomRecord[]; body: string; revision?: number; status?: 'active' | 'disabled' }): Buffer {
  const fm = [
    '---', 'schema: VPInstructionModule/v1', yamlScalar('instruction_id', record.moduleId), yamlScalar('title', record.title),
    yamlScalar('summary', record.summary), yamlScalar('source', JSON.stringify(record.source)),
    'atom_ids:', ...record.atomIds.map((id) => `  - ${id}`), `atom_count: ${record.atomIds.length}`,
    yamlScalar('atoms', JSON.stringify(record.atomRecords)), `carrier_sha256: ${sha(record.body)}`,
    `carrier_bytes: ${Buffer.byteLength(record.body, 'utf8')}`, `revision: ${record.revision ?? 1}`, `status: ${record.status ?? 'active'}`, '---', record.body,
  ].join('\n');
  return Buffer.from(fm, 'utf8');
}
export function validatePreparedBatchReview(value: unknown, expectedPlanSha: string): { reviewer: string; pointer: string } {
  if (!object(value) || Object.keys(value).length !== 5 || value.schema !== 'VPPreparedBatchReview/v1' || value.planSha256 !== expectedPlanSha || value.verdict !== 'READY' || typeof value.reviewer !== 'string' || !value.reviewer.trim() || typeof value.pointer !== 'string' || !value.pointer.trim()) {
    throw new Error('review must be VPPreparedBatchReview/v1 READY and bind the exact planSha256');
  }
  return { reviewer: value.reviewer, pointer: value.pointer };
}
function provenanceRecords(value: unknown): Array<Record<string, string>> {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    if (typeof entry !== 'string') return {};
    const result: Record<string, string> = {};
    for (const part of entry.split('; ')) {
      const index = part.indexOf('=');
      if (index > 0) result[part.slice(0, index)] = part.slice(index + 1);
    }
    return result;
  });
}
async function prep(root: string, staging: string, source: { donor: string; path: string }, pilot: Pilot | null, asOf: string, idsOverride?: string[]): Promise<PreparedMigration> {
  const mapBytes = await readFile(join(root, 'corpus-map.json'));
  const mapValue: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(mapBytes));
  if (!object(mapValue)) throw new Error('corpus-map.json is not a JSON object');
  const map = mapValue;
  if (!object(map.donors)) throw new Error(`map-primary donor is missing: ${source.donor}`);
  const donorRecord = map.donors[source.donor];
  if (!object(donorRecord) || !object(donorRecord.files)) throw new Error(`map-primary donor is missing: ${source.donor}`);
  const mapRecord = donorRecord.files;
  if (!object(mapRecord) || !object(mapRecord[source.path])) throw new Error(`map-primary source group is missing: ${source.donor}:${source.path}`);
  const groupValue: unknown = mapRecord[source.path];
  if (!object(groupValue)) throw new Error(`map-primary source group is missing: ${source.donor}:${source.path}`);
  const group = groupValue;
  if (!Array.isArray(group.instruction_ids) || group.instruction_ids.some((id) => typeof id !== 'string')) throw new Error('map-primary group has no atom instruction_ids');
  const groupIds = group.instruction_ids as string[];
  const catalogPath = join(root, 'catalog.json');
  const catalog = await readJson(catalogPath) as unknown as Catalog;
  if (!Array.isArray(catalog.instructions) || !Number.isInteger(catalog.revision)) throw new Error('invalid catalog structure');
  const topLevelIds = groupIds.filter((id) => catalog.instructions.some((entry) => entry.instruction_id === id));
  const atomIds = idsOverride ?? (pilot === null ? [...topLevelIds].sort((a, b) => a < b ? -1 : a > b ? 1 : 0) : [...PILOTS[pilot].ids]);
  if (atomIds.length === 1) throw new Error('one-atom chunks must remain singleton instructions');
  if (atomIds.length < 2 || atomIds.length > 8) throw new Error('module cohort must contain 2..8 unique atom IDs; use module-batch for larger groups');
  if (new Set(atomIds).size !== atomIds.length) throw new Error('module cohort must contain unique atom IDs');
  if (atomIds.some((id) => !groupIds.includes(id))) throw new Error('every selected atom must belong to the selected map-primary source group');
  if (atomIds.some((id) => !topLevelIds.includes(id))) throw new Error('selected atom overlaps an existing module or is not a top-level catalog entry');
  if (pilot !== null && idsOverride === undefined && (groupIds.length !== PILOTS[pilot].ids.length || PILOTS[pilot].ids.some((id) => !groupIds.includes(id)))) throw new Error(`map-primary group does not match the ${pilot} pilot cohort`);
  const entries = atomIds.map((id) => {
    const entry = catalog.instructions.find((item) => item.instruction_id === id);
    if (entry === undefined) throw new Error(`atom is missing from catalog: ${id}`);
    return entry;
  });
  const atomFiles: Array<{ id: string; path: string; bytes: Buffer; file: string; body: string; contentSha: string }> = [];
  for (const entry of entries) {
    const path = resolve(dirname(catalogPath), entry.path);
    const bytes = await readFile(path);
    if (sha(bytes) !== entry.sha256) throw new Error(`catalog digest mismatch for atom ${entry.instruction_id}`);
    const file = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
    if (file.includes('\r') || !file.endsWith('\n')) throw new Error(`atom must be LF-only and end in LF: ${entry.instruction_id}`);
    const parsed = parseFrontmatter(file);
    if (parsed.data.instruction_id !== entry.instruction_id) throw new Error(`atom frontmatter identity mismatch: ${entry.instruction_id}`);
    atomFiles.push({ id: entry.instruction_id, path: entry.path, bytes, file, body: parsed.body, contentSha: sha(parsed.body) });
  }
  const identity = moduleIdFor(source, catalog.instructions);
  const id = identity.moduleId;
  const modulePath = `instructions/${id}.md`;
  const atomRecords: ModuleAtomRecord[] = atomFiles.map((atom) => ({ atom_id: atom.id, file_sha256: sha(atom.bytes), content_sha256: atom.contentSha, file_bytes: atom.bytes.length, body_bytes: Buffer.byteLength(atom.body, 'utf8') }));
  const body = atomFiles.map((atom) => `<!-- vpmodule:atom:begin ${atom.id} -->\n${atom.file}<!-- vpmodule:atom:end ${atom.id} -->`).join('\n');
  const title = pilot === null ? `${source.donor}: ${source.path} module` : `${PILOTS[pilot].title} module`;
  const moduleBytes = renderModule({ moduleId: id, title, summary: `Carrier for ${atomIds.length} atomic instructions from ${source.donor}:${source.path}.`, source, atomIds, atomRecords, body });
  const parsedModule = parseFrontmatter(moduleBytes.toString('utf8'));
  const record: unknown = parsedModule.data;
  const schema = await readSchema(root, 'vpinstructionmodule.v1.schema.json');
  const schemaErrors = validateAgainstSchema(record, schema);
  if (schemaErrors.length) throw new Error(`module schema validation failed: ${schemaErrors.join('; ')}`);
  parseModule(record, parsedModule.body, id);

  const nextCatalog = structuredClone(catalog);
  const firstRemoved = nextCatalog.instructions.findIndex((entry) => atomIds.includes(entry.instruction_id));
  nextCatalog.instructions = nextCatalog.instructions.filter((entry) => !atomIds.includes(entry.instruction_id));
  nextCatalog.instructions.splice(Math.max(0, firstRemoved), 0, { instruction_id: id, path: modulePath, sha256: sha(moduleBytes) });
  nextCatalog.revision += 1;
  nextCatalog.updated_at = asOf;
  const catalogSchema = await readSchema(root, 'vpcatalog.v1.schema.json');
  const catalogErrors = validateAgainstSchema(nextCatalog, catalogSchema);
  if (catalogErrors.length) throw new Error(`staged catalog schema validation failed: ${catalogErrors.join('; ')}`);
  const catalogBytes = jsonBytes(nextCatalog);
  const targets: PreparedTargetInput[] = [
    { path: modulePath, bytes: moduleBytes },
    ...atomFiles.map((atom) => ({ path: atom.path, bytes: null })),
    { path: 'catalog.json', bytes: catalogBytes },
  ];
  const mapSha256 = sha(mapBytes);
  const beforeCatalogSha = sha(await readFile(catalogPath));
  const receipts = await receiptSnapshot(root, map);
  const migrationCodePaths = [
    'config/vpinstructionmodule.v1.schema.json', 'skills/vp-mode/scripts/modules.ts',
    'skills/vp-mode/scripts/catalog.ts', 'scripts/check-corpus.ts', 'scripts/module-migration.ts',
    'scripts/module-plan.ts', 'scripts/module-apply.ts', 'scripts/module-rollback.ts', 'scripts/module-verify.ts', 'scripts/module-batch.ts',
  ];
  const migrationCode = await Promise.all(migrationCodePaths.map(async (path) => ({ path, sha256: sha(await readFile(join(root, path))) })));
  const deterministicPrefix = `module-${sha(JSON.stringify(targets.map((target) => ({ path: target.path, after: target.bytes === null ? null : sha(target.bytes) })))).slice(0, 24)}`;
  const batch = await prepareTargetBatch(targets, {
    root, stagingRoot: staging, stagingPrefix: deterministicPrefix,
    context: [{ path: 'corpus-map.json', sha256: mapSha256 }, ...receipts, ...migrationCode],
  });
  const rawManifest = JSON.parse((await verifyArtifact(batch.directory, batch.manifest)).toString('utf8')) as BatchManifest;
  const targetsFromManifest = rawManifest.targets;
  const publicPlan: ModulePlan = {
    schema: 'VPModuleMigrationPlan/v1', root, pilot, asOf, moduleId: id, source,
    atoms: atomRecords.map((item, index) => ({ ...item, instruction_path: atomFiles[index]!.path })),
    modulePath, moduleSha256: sha(moduleBytes), mapSha256, catalogBeforeSha256: beforeCatalogSha,
    catalogAfterSha256: sha(catalogBytes), catalogCountBefore: catalog.instructions.length, catalogCountAfter: nextCatalog.instructions.length,
    receipts, targetHashes: targetsFromManifest.map(({ path, before, after }) => ({ path, before, after })),
    targetOrder: targetsFromManifest.map((target) => target.path),
    counts: { atoms: atomIds.length, targets: targetsFromManifest.length, writes: targetsFromManifest.filter((target) => target.after !== null).length, deletes: targetsFromManifest.filter((target) => target.after === null).length },
    planSha: batch.manifest.sha256, stagingPath: resolve(staging), batchManifest: batch.manifest, batchDirectory: batch.directory,
  };
  if (publicPlan.targetOrder.at(-1) !== 'catalog.json' || publicPlan.targetOrder[0] !== modulePath) throw new Error('prepared module target order is invalid');
  return { plan: publicPlan, batch, manifest: rawManifest };
}

export async function buildModulePlan(options: { root: string; pilot?: Pilot; source?: { donor: string; path: string }; atoms?: string[]; staging: string; asOf?: string }): Promise<ModulePlan> {
  const root = assertRoot(options.root);
  if (options.pilot !== undefined && options.source !== undefined) throw new Error('--pilot is mutually exclusive with --donor/--source');
  const pilot = options.pilot ?? null;
  if (pilot !== null && !(pilot in PILOTS)) throw new Error('--pilot must be gsd or addy');
  const source = options.source ?? (pilot === null ? undefined : { donor: PILOTS[pilot].donor, path: PILOTS[pilot].path });
  if (source === undefined || !source.donor || !source.path) throw new Error('--donor and --source are required without --pilot');
  const asOf = validateAsOf(options.asOf ?? new Date().toISOString());
  const staging = resolve(options.staging);
  const prepared = await prep(root, staging, source, pilot, asOf, options.atoms);
  return prepared.plan;
}

export async function applyModulePlan(options: { root: string; pilot?: Pilot; source?: { donor: string; path: string }; atoms?: string[]; staging: string; asOf?: string; expectedPlanSha?: string; reviewPath: string; apply: boolean; writer?: string }): Promise<{ kind: string; plan: ModulePlan; receipt: ArtifactRef | null; batchDirectory: string }> {
  if (options.pilot !== undefined && options.source !== undefined) throw new Error('--pilot is mutually exclusive with --donor/--source');
  const pilot = options.pilot ?? null;
  const source = options.source ?? (pilot === null ? undefined : { donor: PILOTS[pilot].donor, path: PILOTS[pilot].path });
  if (source === undefined || !source.donor || !source.path) throw new Error('--donor and --source are required without --pilot');
  const staging = resolve(options.staging, `module-apply-${randomUUID()}`);
  const prepared = await prep(assertRoot(options.root), staging, source, pilot, validateAsOf(options.asOf ?? new Date().toISOString()), options.atoms);
  const plan = prepared.plan;
  if (options.expectedPlanSha !== undefined && options.expectedPlanSha !== plan.planSha) throw new Error(`module plan SHA mismatch: expected ${options.expectedPlanSha}, rebuilt ${plan.planSha}`);
  if (options.apply && options.expectedPlanSha === undefined) throw new Error('--expected-plan-sha is required with --apply');
  if (!options.apply) return { kind: 'dry-run', plan, receipt: null, batchDirectory: prepared.batch.directory };
  const reviewBytes = await readFile(options.reviewPath);
  const reviewValue: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(reviewBytes));
  const review = validatePreparedBatchReview(reviewValue, plan.planSha);
  const reviewPath = 'module-review.json';
  await writeFile(join(prepared.batch.directory, reviewPath), reviewBytes, { flag: 'wx' });
  const approval: BatchApproval = {
    review: { path: reviewPath, sha256: sha(reviewBytes) },
    observe: async () => ({ kind: 'observed', writer: options.writer?.trim() || process.env.USERNAME || 'module-apply-operator', reviewPointer: review.pointer }),
  };
  const outcome = await applyPreparedBatch(prepared.batch, approval);
  const record: ApplyRecord = { schema: 'VPModuleMigrationApply/v1', plan, outcome: outcome.kind, receipt: outcome.receipt, batchManifest: prepared.batch.manifest, batchDirectory: prepared.batch.directory };
  await writeFile(join(prepared.batch.directory, 'module-apply.json'), jsonBytes(record), { flag: 'wx' });
  return { kind: outcome.kind, plan, receipt: outcome.receipt, batchDirectory: prepared.batch.directory };
}

async function applyReverse(root: string, staging: string, reviewPath: string, targets: PreparedTargetInput[], expected?: string, writer?: string): Promise<{ kind: string; planSha: string; receipt: ArtifactRef | null; batchDirectory: string; targets: PlanTarget[] }> {
  const batchDirectory = resolve(staging, `module-rollback-${randomUUID()}`);
  const prefix = `rollback-${sha(JSON.stringify(targets.map((target) => ({ path: target.path, after: target.bytes === null ? null : sha(target.bytes) })))).slice(0, 24)}`;
  const batch = await prepareTargetBatch(targets, { root, stagingRoot: batchDirectory, stagingPrefix: prefix });
  const manifest = JSON.parse((await verifyArtifact(batch.directory, batch.manifest)).toString('utf8')) as BatchManifest;
  const planSha = batch.manifest.sha256;
  if (expected !== undefined && expected !== planSha) throw new Error(`rollback plan SHA mismatch: expected ${expected}, rebuilt ${planSha}`);
  if (!reviewPath) return { kind: 'dry-run', planSha, receipt: null, batchDirectory: batch.directory, targets: manifest.targets };
  const reviewBytes = await readFile(reviewPath);
  const review = validatePreparedBatchReview(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(reviewBytes)) as unknown, planSha);
  const reviewRel = 'module-rollback-review.json';
  await writeFile(join(batch.directory, reviewRel), reviewBytes, { flag: 'wx' });
  const outcome = await applyPreparedBatch(batch, {
    review: { path: reviewRel, sha256: sha(reviewBytes) },
    observe: async () => ({ kind: 'observed', writer: writer?.trim() || process.env.USERNAME || 'module-rollback-operator', reviewPointer: review.pointer }),
  });
  return { kind: outcome.kind, planSha, receipt: outcome.receipt, batchDirectory: batch.directory, targets: manifest.targets };
}

export async function applyPreparedRollbackTargets(options: { root: string; staging: string; targets: PreparedTargetInput[]; reviewPath?: string; writer?: string }): Promise<{ kind: string; planSha: string; receipt: ArtifactRef | null; batchDirectory: string; targets: PlanTarget[] }> {
  return applyReverse(options.root, options.staging, options.reviewPath ?? '', options.targets, undefined, options.writer);
}

export async function rollbackModulePlan(options: { batchDir: string; reviewPath?: string; staging: string; apply: boolean; writer?: string }): Promise<{ kind: string; planSha: string; receipt: ArtifactRef | null; batchDirectory: string; targets: PlanTarget[] }> {
  const batchDir = resolve(options.batchDir);
  const record = await readJson(join(batchDir, 'module-apply.json')) as unknown as ApplyRecord;
  if (record.schema !== 'VPModuleMigrationApply/v1' || record.outcome !== 'applied') throw new Error('rollback requires a terminal applied M2a batch record');
  const originalManifest = JSON.parse((await verifyArtifact(batchDir, record.batchManifest)).toString('utf8')) as BatchManifest;
  const targetByPath = new Map(originalManifest.targets.map((target) => [target.path, target]));
  const moduleTarget = targetByPath.get(record.plan.modulePath);
  const catalogTarget = targetByPath.get('catalog.json');
  if (moduleTarget === undefined || catalogTarget === undefined || moduleTarget.before !== null || catalogTarget.backup === null) throw new Error('applied module batch lacks required before-images');
  const reverse: PreparedTargetInput[] = [{ path: record.plan.modulePath, bytes: null }];
  for (const atom of record.plan.atoms) {
    const target = targetByPath.get(atom.instruction_path);
    if (target?.backup === null || target === undefined) throw new Error(`missing atom before-image: ${atom.instruction_path}`);
    reverse.push({ path: atom.instruction_path, bytes: await verifyArtifact(batchDir, target.backup) });
  }
  reverse.push({ path: 'catalog.json', bytes: await verifyArtifact(batchDir, catalogTarget.backup) });
  for (const target of originalManifest.targets) {
    const current = await readFile(join(record.plan.root, target.path)).catch((error: unknown) => object(error) && error.code === 'ENOENT' ? undefined : Promise.reject(error));
    if ((current === undefined ? null : sha(current)) !== target.after) throw new Error(`rollback blocked by post-apply drift: ${target.path}`);
  }
  if (!options.apply) {
    const dry = await applyPreparedRollbackTargets({ root: record.plan.root, staging: options.staging, targets: reverse });
    return dry;
  }
  if (!options.reviewPath) throw new Error('--review is required with --apply');
  const result = await applyPreparedRollbackTargets({ root: record.plan.root, staging: options.staging, reviewPath: options.reviewPath, targets: reverse, ...(options.writer === undefined ? {} : { writer: options.writer }) });
  if (result.kind === 'applied') {
    const catalogBytes = await readFile(join(record.plan.root, 'catalog.json'));
    if (sha(catalogBytes) !== record.plan.catalogBeforeSha256) throw new Error('rollback catalog readback hash mismatch');
    for (const atom of record.plan.atoms) {
      const bytes = await readFile(join(record.plan.root, atom.instruction_path));
      if (sha(bytes) !== atom.file_sha256) throw new Error(`rollback atom readback hash mismatch: ${atom.atom_id}`);
    }
  }
  return result;
}

export type ComposeOutcome = { bundle: ReturnType<typeof catalogCompose> } | { error: CatalogError };
export function composeParityIssue(actual: ComposeOutcome, expected: ComposeOutcome): string | null {
  if ('error' in actual || 'error' in expected) {
    return !('error' in actual) || !('error' in expected)
      || actual.error.code !== expected.error.code
      || actual.error.message !== expected.error.message
      ? 'compose did not match the atom-cohort dependency closure'
      : null;
  }
  const composedById = new Map(actual.bundle.instructions.map((item) => [item.instruction_id, item.content]));
  const expectedById = new Map(expected.bundle.instructions.map((item) => [item.instruction_id, item.content]));
  return composedById.size !== expectedById.size || [...expectedById].some(([id, content]) => composedById.get(id) !== content)
    ? 'compose did not match the atom-cohort dependency closure'
    : null;
}

export async function verifyModuleMigration(rootPath: string, batchDirPath: string, profilePath: string, options: { corpus: boolean; catalog?: boolean } = { corpus: true }): Promise<{ issues: string[]; checks: Record<string, unknown> }> {
  const root = resolve(rootPath);
  const batchDir = resolve(batchDirPath);
  const record = await readJson(join(batchDir, 'module-apply.json')) as unknown as ApplyRecord;
  if (record.schema !== 'VPModuleMigrationApply/v1' || record.outcome !== 'applied') throw new Error('verification requires a terminal applied M2a batch record');
  const plan = record.plan;
  const issues: string[] = [];
  const corpusIssues = options.corpus ? checkCorpus(root) : [];
  if (corpusIssues.length) issues.push(`check-corpus: ${JSON.stringify(corpusIssues)}`);
  const catalog = await loadCatalog(join(root, 'catalog.json'));
  const catalogCount = catalog.instructions.length;
  if (options.catalog !== false && catalogCount !== plan.catalogCountAfter) issues.push(`catalog count ${catalogCount} != ${plan.catalogCountAfter}`);
  const moduleFile = await readFile(join(root, plan.modulePath));
  if (sha(moduleFile) !== plan.moduleSha256) issues.push('module file digest mismatch');
  if (options.catalog !== false && sha(await readFile(join(root, 'catalog.json'))) !== plan.catalogAfterSha256) issues.push('catalog after-image digest mismatch');
  for (const atom of plan.atoms) {
    try { await lstat(join(root, atom.instruction_path)); issues.push(`old atom file still exists: ${atom.instruction_path}`); }
    catch (error) { if (!(object(error) && error.code === 'ENOENT')) throw error; }
  }
  const mapSha256 = sha(await readFile(join(root, 'corpus-map.json')));
  if (mapSha256 !== plan.mapSha256) issues.push('corpus map changed');
  for (const receipt of plan.receipts) if (sha(await readFile(join(root, receipt.path))) !== receipt.sha256) issues.push(`fidelity receipt changed: ${receipt.path}`);
  const loaded: Map<string, LoadedInstruction> = await loadInstructions(catalog, root);
  const beforeManifest = JSON.parse((await verifyArtifact(batchDir, record.batchManifest)).toString('utf8')) as BatchManifest;
  const beforeMap = new Map(beforeManifest.targets.filter((target) => target.backup !== null).map((target) => [target.path, target.backup!]));
  const parity: Array<{ atomId: string; content: boolean; metadata: boolean }> = [];
  for (const atom of plan.atoms) {
    const before = beforeMap.get(atom.instruction_path);
    if (before === undefined) throw new Error(`before-image missing for ${atom.atom_id}`);
    const original = parseFrontmatter((await verifyArtifact(batchDir, before)).toString('utf8'));
    const retrieved = catalogGet(catalog, loaded, atom.atom_id);
    const expectedProvenance = provenanceRecords(original.data.provenance).map((item) => ({
      donor: item.donor, license: item.license, revision: item.revision, path: item.path,
      ...(item.sha256 === undefined ? {} : { sha256: item.sha256 }), ...(item.locator === undefined ? {} : { locator: item.locator }),
    }));
    const rawClassification = original.data.classification_status === 'classified'
      ? { classification_status: 'classified', instruction_form: original.data.instruction_form, domains: original.data.domains }
      : { classification_status: 'unclassified', classification_reason: original.data.classification_reason };
    const metadata = retrieved.title === original.data.title && retrieved.summary === original.data.summary
      && JSON.stringify(retrieved.capability_tags) === JSON.stringify(original.data.capability_tags)
      && JSON.stringify(retrieved.pattern_tags) === JSON.stringify(original.data.pattern_tags)
      && JSON.stringify(retrieved.roles) === JSON.stringify(original.data.roles ?? [])
      && JSON.stringify(retrieved.products) === JSON.stringify(original.data.products ?? [])
      && JSON.stringify(retrieved.conditions) === JSON.stringify({ applies_when: original.data.conditions_applies_when, does_not_apply_when: original.data.conditions_does_not_apply_when })
      && JSON.stringify(retrieved.artifact_contract) === JSON.stringify({ output_type: original.data.artifact_contract_output_type, required_data: original.data.artifact_contract_required_data ?? [], verified_by: original.data.artifact_contract_verified_by })
      && JSON.stringify(retrieved.compatibility) === JSON.stringify({ excludes: original.data.compatibility_excludes ?? [], requires: original.data.compatibility_requires ?? [] })
      && JSON.stringify(retrieved.provenance) === JSON.stringify(expectedProvenance)
      && JSON.stringify(loaded.get(atom.atom_id)?.classification) === JSON.stringify(rawClassification)
      && retrieved.revision === original.data.revision && retrieved.status === original.data.status;
    const content = retrieved.content === original.body;
    parity.push({ atomId: atom.atom_id, content, metadata });
    if (!content || !metadata) issues.push(`atom get parity mismatch: ${atom.atom_id}`);
  }
  let moduleGetCode: string | null = null;
  try { catalogGet(catalog, loaded, plan.moduleId); }
  catch (error) { if (error instanceof CatalogError) moduleGetCode = error.code; else throw error; }
  if (moduleGetCode !== 'CATALOG_MODULE_ATOM_REQUIRED') issues.push(`module get returned ${moduleGetCode ?? 'success'}`);
  const search = catalogSearch(catalog, loaded, { instruction_ids: [plan.moduleId] });
  const moduleSearchCount = search.filter((item) => item.instruction_id === plan.moduleId).length;
  if (moduleSearchCount !== 1) issues.push(`module search count ${moduleSearchCount} != 1`);
  const profile = JSON.parse(await readUtf8(profilePath)) as EffectiveProfile;
  const composeOrError = (ids: string[]): ComposeOutcome => {
    try { return { bundle: catalogCompose(catalog, loaded, { instruction_ids: ids, profile }) }; }
    catch (error) { return { error: error instanceof CatalogError ? error : new CatalogError('CATALOG_INVALID', `compose failed: ${errorMessage(error)}`) }; }
  };
  const actualCompose = composeOrError([plan.moduleId]);
  const expectedCompose = composeOrError(plan.atoms.map((atom) => atom.atom_id));
  const composeIssue = composeParityIssue(actualCompose, expectedCompose);
  if (composeIssue !== null) issues.push(composeIssue);
  const atomIds = 'bundle' in actualCompose ? actualCompose.bundle.instructions.map((item) => item.instruction_id) : [];
  const composedBytes = 'bundle' in actualCompose ? actualCompose.bundle.instructions.reduce((total, item) => total + Buffer.byteLength(item.content, 'utf8'), 0) : 0;
  if (atomIds.length > 20 || composedBytes > 64_000) issues.push(`compose cap exceeded: atoms=${atomIds.length}, bytes=${composedBytes}`);
  const checks = { corpusIssueCount: corpusIssues.length, catalogCount, expectedCatalogCount: plan.catalogCountAfter, moduleFileSha256: sha(moduleFile), mapSha256, receiptCount: plan.receipts.length, atomParity: parity, moduleGetCode, moduleSearchCount, composedAtomIds: atomIds, composedAtomCount: atomIds.length, composedBodyBytes: composedBytes, composeCode: 'error' in actualCompose ? actualCompose.error.code : null, composeExpectedCode: 'error' in expectedCompose ? expectedCompose.error.code : null };
  return { issues, checks };
}

export function parseCli(args: string[]): { values: Map<string, string>; flags: Set<string> } {
  const values = new Map<string, string>(); const flags = new Set<string>();
  for (let i = 0; i < args.length; i += 1) {
    const flag = args[i];
    if (flag === '--apply' || flag === '--historical') { flags.add(flag); continue; }
    if (flag === undefined || !flag.startsWith('--')) throw new Error(`unexpected argument: ${String(flag)}`);
    const value = args[++i];
    if (value === undefined || value.startsWith('--')) throw new Error(`${flag} requires a value`);
    if (values.has(flag)) throw new Error(`duplicate argument: ${flag}`);
    values.set(flag, value);
  }
  return { values, flags };
}
export function required(values: Map<string, string>, flag: string): string { const value = values.get(flag); if (!value) throw new Error(`${flag} is required`); return value; }
export function optionalPilot(values: Map<string, string>): Pilot { const value = values.get('--pilot') ?? 'gsd'; if (value !== 'gsd' && value !== 'addy') throw new Error('--pilot must be gsd or addy'); return value; }
export function moduleSource(values: Map<string, string>): { pilot?: Pilot; source?: { donor: string; path: string } } {
  const hasPilot = values.has('--pilot'); const donor = values.get('--donor'); const path = values.get('--source');
  if (hasPilot && (donor !== undefined || path !== undefined)) throw new Error('--pilot is mutually exclusive with --donor/--source');
  if ((donor === undefined) !== (path === undefined)) throw new Error('--donor and --source must be provided together');
  if (donor !== undefined && path !== undefined) return { source: { donor, path } };
  return { pilot: optionalPilot(values) };
}
export function optionalAtoms(values: Map<string, string>): string[] | undefined { const raw = values.get('--atoms'); if (raw === undefined) return undefined; const ids = raw.split(',').map((item) => item.trim()); if (ids.some((id) => !id)) throw new Error('--atoms must be a comma-separated list of IDs'); return ids; }
export function errorMessage(error: unknown): string { return error instanceof Error ? error.message : String(error); }
export const modulePilots = PILOTS;
