import { createHash } from 'node:crypto';
import { lstat, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import process from 'node:process';
import { Buffer } from 'node:buffer';
import { applyPreparedBatch, prepareTargetBatch, type BatchApproval, type PreparedBatch, type PreparedTargetInput } from './convert.ts';
import { CatalogError, catalogCompose, catalogGet, loadCatalog, loadInstructions, readSchema, type Catalog, type EffectiveProfile } from '../skills/vp-mode/scripts/catalog.ts';
import { parseFrontmatter } from '../skills/vp-mode/scripts/frontmatter.ts';
import { parseModule } from '../skills/vp-mode/scripts/modules.ts';
import type { ModuleAtomRecord, ModuleSource } from '../skills/vp-mode/scripts/modules.ts';
import { validateAgainstSchema } from '../skills/vp-mode/scripts/schema.ts';
import { applyPreparedRollbackTargets, composeParityIssue, receiptSnapshot, renderModule, validateAsOf, validatePreparedBatchReview } from './module-migration.ts';
import { verifyArtifact, type ArtifactRef } from './source-packets.ts';

type AnyRecord = Record<string, unknown>;
type Target = { path: string; before: string | null; after: string | null; staged: ArtifactRef | null; backup: ArtifactRef | null };
type UpdateAtom = {
  atomId: string; oldFileSha256: string; newFileSha256: string; oldContentSha256: string; newContentSha256: string;
  oldFileBytes: number; newFileBytes: number; oldBodyBytes: number; newBodyBytes: number; changed: boolean;
};
export type ModuleUpdatePlan = {
  schema: 'VPModuleUpdatePlan/v1'; root: string; moduleId: string; modulePath: string; source: ModuleSource; asOf: string;
  atoms: UpdateAtom[]; moduleRevisionBefore: number; moduleRevisionAfter: number; moduleBeforeSha256: string; moduleAfterSha256: string;
  catalogBeforeSha256: string; catalogAfterSha256: string; catalogCount: number; catalogRevisionBefore: number; catalogRevisionAfter: number;
  mapSha256: string; receipts: Array<{ path: string; sha256: string }>;
  targetHashes: Array<{ path: string; before: string | null; after: string | null }>; targetOrder: string[];
  counts: { atoms: number; changed: number; targets: number; writes: number };
  planSha: string; stagingPath: string; batchManifest: ArtifactRef; batchDirectory: string;
};
type UpdatePrepared = { plan: ModuleUpdatePlan; batch: PreparedBatch };
type ApplyRecord = { schema: 'VPModuleUpdateApply/v1'; plan: ModuleUpdatePlan; outcome: string; receipt: ArtifactRef | null; batchManifest: ArtifactRef; batchDirectory: string };

const sha = (bytes: Uint8Array | string): string => createHash('sha256').update(bytes).digest('hex');
const jsonBytes = (value: unknown): Buffer => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
function object(value: unknown): value is AnyRecord { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function assertAbsolute(value: string, flag: string): string { if (!value || !isAbsolute(value)) throw new Error(`${flag} must be an absolute path`); return resolve(value); }
async function readUtf8(path: string): Promise<string> { return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(await readFile(path)); }
async function readJson(path: string): Promise<AnyRecord> { const value: unknown = JSON.parse(await readUtf8(path)); if (!object(value)) throw new Error(`expected JSON object: ${path}`); return value; }
function inside(root: string, path: string): boolean { const rel = relative(root, path); return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel); }

async function updatedFiles(directory: string, moduleIds: readonly string[]): Promise<Map<string, Buffer>> {
  const members = new Set(moduleIds);
  const result = new Map<string, Buffer>();
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isFile() || entry.isSymbolicLink() || !entry.name.endsWith('.md')) throw new Error(`atoms directory may contain only regular <atom-id>.md files: ${entry.name}`);
    const id = entry.name.slice(0, -3);
    if (!members.has(id)) throw new Error(`updated atom is not in module: ${id}`);
    if (result.has(id)) throw new Error(`duplicate updated atom file: ${id}`);
    result.set(id, await readFile(join(directory, entry.name)));
  }
  return result;
}

async function validateUpdatedAtom(bytes: Buffer, atomId: string, root: string): Promise<{ file: string; body: string; record: ModuleAtomRecord }> {
  const file = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  if (file.includes('\r') || !file.endsWith('\n')) throw new Error(`updated atom must be LF-only and end in LF: ${atomId}`);
  const parsed = parseFrontmatter(file);
  if (parsed.data.instruction_id !== atomId) throw new Error(`updated atom identity mismatch: expected ${atomId}, got ${String(parsed.data.instruction_id)}`);
  const schemaName = parsed.data.schema === 'VPInstruction/v1.2' ? 'vpinstruction.v1.2.schema.json' : parsed.data.schema === 'VPInstruction/v2' ? 'vpinstruction.v2.schema.json' : undefined;
  if (schemaName === undefined) throw new Error(`updated atom schema is unsupported: ${String(parsed.data.schema)}`);
  const schema = await readSchema(root, schemaName);
  const errors = validateAgainstSchema(parsed.data, schema);
  if (errors.length) throw new Error(`updated atom schema validation failed for ${atomId}: ${errors.join('; ')}`);
  return {
    file, body: parsed.body,
    record: { atom_id: atomId, file_sha256: sha(bytes), content_sha256: sha(parsed.body), file_bytes: bytes.length, body_bytes: Buffer.byteLength(parsed.body, 'utf8') },
  };
}

async function prepareUpdate(options: { root: string; moduleId: string; atomsDir: string; atoms?: string[]; staging: string; asOf?: string }): Promise<UpdatePrepared> {
  const root = assertAbsolute(options.root, '--root');
  const atomsDir = assertAbsolute(options.atomsDir, '--atoms-dir');
  const staging = assertAbsolute(options.staging, '--staging');
  const moduleId = options.moduleId;
  if (!moduleId || isAbsolute(moduleId) || /[\\/:\0]/u.test(moduleId)) throw new Error('--module must be a module ID, not a path');
  const asOf = validateAsOf(options.asOf ?? new Date().toISOString());
  const catalogPath = join(root, 'catalog.json');
  const catalogBytes = await readFile(catalogPath);
  const catalogValue: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(catalogBytes));
  if (!object(catalogValue) || !Array.isArray(catalogValue.instructions) || !Number.isSafeInteger(catalogValue.revision)) throw new Error('invalid catalog structure');
  const catalog = catalogValue as unknown as Catalog;
  const entryIndex = catalog.instructions.findIndex((item) => item.instruction_id === moduleId);
  if (entryIndex < 0) throw new Error(`module ID is not in the catalog: ${moduleId}`);
  const entry = catalog.instructions[entryIndex]!;
  const modulePath = entry.path;
  if (modulePath.startsWith('/') || modulePath.includes('\\') || modulePath.split('/').some((part) => !part || part === '.' || part === '..')) throw new Error(`module catalog path is not canonical: ${modulePath}`);
  const moduleAbsolute = resolve(root, modulePath);
  if (!inside(root, moduleAbsolute)) throw new Error(`module path escapes product root: ${modulePath}`);
  const moduleBytes = await readFile(moduleAbsolute);
  if (sha(moduleBytes) !== entry.sha256) throw new Error(`catalog digest mismatch for module ${moduleId}`);
  const moduleText = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(moduleBytes);
  if (moduleText.includes('\r')) throw new Error(`module carrier must be LF-only: ${moduleId}`);
  const moduleFm = parseFrontmatter(moduleText);
  const moduleSchema = await readSchema(root, 'vpinstructionmodule.v1.schema.json');
  const moduleSchemaErrors = validateAgainstSchema(moduleFm.data, moduleSchema);
  if (moduleSchemaErrors.length) throw new Error(`module schema validation failed: ${moduleSchemaErrors.join('; ')}`);
  if (moduleFm.data.schema !== 'VPInstructionModule/v1' || moduleFm.data.instruction_id !== moduleId) throw new Error(`module ID is not a VPInstructionModule/v1 carrier: ${moduleId}`);
  const parsedModule = parseModule(moduleFm.data, moduleFm.body, moduleId);
  const moduleIds = parsedModule.atoms.map((atom) => atom.atom_id);
  const files = await updatedFiles(atomsDir, moduleIds);
  const selected = options.atoms === undefined ? [...files.keys()] : [...options.atoms];
  if (selected.length === 0) throw new Error('at least one updated atom is required');
  if (new Set(selected).size !== selected.length) throw new Error('--atoms must contain unique atom IDs');
  for (const id of selected) {
    if (!moduleIds.includes(id)) throw new Error(`selected atom is not in module: ${id}`);
    if (!files.has(id)) throw new Error(`selected atom file is missing: ${id}.md`);
  }
  const validated = new Map<string, { file: string; body: string; record: ModuleAtomRecord }>();
  for (const [id, bytes] of files) validated.set(id, await validateUpdatedAtom(bytes, id, root));
  const selectedSet = new Set(selected);
  const atoms: UpdateAtom[] = [];
  const atomRecords: ModuleAtomRecord[] = [];
  const memberFiles: string[] = [];
  for (const member of parsedModule.members) {
    const next = selectedSet.has(member.atom_id) ? validated.get(member.atom_id)! : {
      file: member.file, body: member.body,
      record: { atom_id: member.atom_id, file_sha256: member.file_sha256, content_sha256: member.content_sha256, file_bytes: member.file_bytes, body_bytes: member.body_bytes },
    };
    const changed = next.file !== member.file;
    atoms.push({
      atomId: member.atom_id, oldFileSha256: member.file_sha256, newFileSha256: next.record.file_sha256,
      oldContentSha256: member.content_sha256, newContentSha256: next.record.content_sha256,
      oldFileBytes: member.file_bytes, newFileBytes: next.record.file_bytes, oldBodyBytes: member.body_bytes,
      newBodyBytes: next.record.body_bytes, changed,
    });
    atomRecords.push(next.record);
    memberFiles.push(`<!-- vpmodule:atom:begin ${member.atom_id} -->\n${next.file}<!-- vpmodule:atom:end ${member.atom_id} -->`);
  }
  if (!atoms.some((atom) => atom.changed)) throw new Error('module update is a no-op: selected atom payloads are byte-identical');
  const body = memberFiles.join('\n');
  const revisionBefore = parsedModule.record.revision;
  const moduleAfter = renderModule({
    moduleId, title: parsedModule.record.title, summary: parsedModule.record.summary, source: parsedModule.source,
    atomIds: moduleIds, atomRecords, body, revision: revisionBefore + 1, status: parsedModule.record.status,
  });
  const nextModuleFm = parseFrontmatter(moduleAfter.toString('utf8'));
  parseModule(nextModuleFm.data, nextModuleFm.body, moduleId);
  const catalogNext = structuredClone(catalog);
  const beforeRevision = catalog.revision;
  catalogNext.instructions[entryIndex] = { ...entry, sha256: sha(moduleAfter) };
  catalogNext.revision = beforeRevision + 1;
  catalogNext.updated_at = asOf;
  const catalogSchema = await readSchema(root, 'vpcatalog.v1.schema.json');
  const catalogErrors = validateAgainstSchema(catalogNext, catalogSchema);
  if (catalogErrors.length) throw new Error(`updated catalog schema validation failed: ${catalogErrors.join('; ')}`);
  const catalogAfter = jsonBytes(catalogNext);
  if (catalogNext.instructions.length !== catalog.instructions.length) throw new Error('module update changed catalog count');
  const mapBytes = await readFile(join(root, 'corpus-map.json'));
  const mapValue: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(mapBytes));
  if (!object(mapValue)) throw new Error('corpus-map.json is not a JSON object');
  const receipts = await receiptSnapshot(root, mapValue);
  const codePaths = [
    'config/vpinstructionmodule.v1.schema.json', 'config/vpcatalog.v1.schema.json',
    'scripts/module-update.ts', 'scripts/module-migration.ts', 'scripts/convert.ts',
    'scripts/source-packets.ts', 'skills/vp-mode/scripts/modules.ts', 'skills/vp-mode/scripts/catalog.ts',
    'skills/vp-mode/scripts/frontmatter.ts', 'skills/vp-mode/scripts/schema.ts',
  ];
  const context = [
    { path: 'corpus-map.json', sha256: sha(mapBytes) }, ...receipts,
    ...await Promise.all(codePaths.map(async (path) => ({ path, sha256: sha(await readFile(join(root, path))) }))),
  ];
  const targets: PreparedTargetInput[] = [{ path: modulePath, bytes: moduleAfter }, { path: 'catalog.json', bytes: catalogAfter }];
  const stagingPrefix = `module-update-${sha(JSON.stringify(targets.map((target) => ({ path: target.path, after: target.bytes === null ? null : sha(target.bytes) })))).slice(0, 32)}`;
  const batch = await prepareTargetBatch(targets, { root, stagingRoot: staging, stagingPrefix, context });
  const batchValue = JSON.parse((await verifyArtifact(batch.directory, batch.manifest)).toString('utf8')) as { targets: Target[] };
  const targetOrder = batchValue.targets.map((target) => target.path);
  if (targetOrder[0] !== modulePath || targetOrder.at(-1) !== 'catalog.json') throw new Error('prepared module update target order is invalid');
  const plan: ModuleUpdatePlan = {
    schema: 'VPModuleUpdatePlan/v1', root, moduleId, modulePath, source: parsedModule.source, asOf,
    atoms, moduleRevisionBefore: revisionBefore, moduleRevisionAfter: revisionBefore + 1,
    moduleBeforeSha256: sha(moduleBytes), moduleAfterSha256: sha(moduleAfter),
    catalogBeforeSha256: sha(catalogBytes), catalogAfterSha256: sha(catalogAfter), catalogCount: catalog.instructions.length,
    catalogRevisionBefore: beforeRevision, catalogRevisionAfter: catalogNext.revision,
    mapSha256: sha(mapBytes), receipts,
    targetHashes: batchValue.targets.map(({ path, before, after }) => ({ path, before, after })), targetOrder,
    counts: { atoms: atoms.length, changed: atoms.filter((atom) => atom.changed).length, targets: batchValue.targets.length, writes: batchValue.targets.filter((target) => target.after !== null).length },
    planSha: batch.manifest.sha256, stagingPath: staging, batchManifest: batch.manifest, batchDirectory: batch.directory,
  };
  return { plan, batch };
}

export async function buildModuleUpdatePlan(options: { root: string; moduleId: string; atomsDir: string; atoms?: string[]; staging: string; asOf?: string }): Promise<ModuleUpdatePlan> {
  return (await prepareUpdate({ ...options, ...(options.atoms === undefined ? {} : { atoms: options.atoms }) })).plan;
}

export async function applyModuleUpdate(options: { root: string; moduleId: string; atomsDir: string; atoms?: string[]; staging: string; asOf: string; expectedUpdateSha: string; reviewPath: string; apply: boolean; writer?: string }): Promise<{ kind: string; plan: ModuleUpdatePlan; receipt: ArtifactRef | null; batchDirectory: string }> {
  const prepared = await prepareUpdate({ ...options, ...(options.atoms === undefined ? {} : { atoms: options.atoms }) });
  const plan = prepared.plan;
  if (options.expectedUpdateSha !== plan.planSha) throw new Error(`module update SHA mismatch: expected ${options.expectedUpdateSha}, rebuilt ${plan.planSha}`);
  if (!options.apply) return { kind: 'dry-run', plan, receipt: null, batchDirectory: prepared.batch.directory };
  const reviewBytes = await readFile(options.reviewPath);
  const reviewValue: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(reviewBytes));
  const review = validatePreparedBatchReview(reviewValue, plan.planSha);
  const reviewRel = 'module-update-review.json';
  await writeFile(join(prepared.batch.directory, reviewRel), reviewBytes, { flag: 'wx' });
  const approval: BatchApproval = {
    review: { path: reviewRel, sha256: sha(reviewBytes) },
    observe: async () => ({ kind: 'observed', writer: options.writer?.trim() || process.env.USERNAME || 'module-update-operator', reviewPointer: review.pointer }),
  };
  const outcome = await applyPreparedBatch(prepared.batch, approval);
  const record: ApplyRecord = { schema: 'VPModuleUpdateApply/v1', plan, outcome: outcome.kind, receipt: outcome.receipt, batchManifest: prepared.batch.manifest, batchDirectory: prepared.batch.directory };
  await writeFile(join(prepared.batch.directory, 'module-update-apply.json'), jsonBytes(record), { flag: 'wx' });
  return { kind: outcome.kind, plan, receipt: outcome.receipt, batchDirectory: prepared.batch.directory };
}

export async function verifyModuleUpdate(rootPath: string, batchDirPath: string, profilePath: string): Promise<{ issues: string[]; checks: Record<string, unknown> }> {
  const root = resolve(rootPath);
  const batchDir = resolve(batchDirPath);
  const record = await readJson(join(batchDir, 'module-update-apply.json')) as unknown as ApplyRecord;
  if (record.schema !== 'VPModuleUpdateApply/v1' || record.outcome !== 'applied') throw new Error('verification requires a terminal applied module update record');
  const plan = record.plan;
  const issues: string[] = [];
  if (plan.root !== root) issues.push('plan root mismatch');
  if (resolve(record.batchDirectory) !== batchDir) issues.push('apply record batch directory mismatch');
  if (record.batchManifest.sha256 !== plan.planSha) issues.push('update plan SHA does not bind the batch manifest');
  try {
    const manifest = JSON.parse((await verifyArtifact(batchDir, record.batchManifest)).toString('utf8')) as { schema?: string; targets: Target[] };
    if (manifest.schema !== 'VPPreparedBatch/v1') issues.push('batch manifest schema is invalid');
    if (JSON.stringify(manifest.targets.map(({ path, before, after }) => ({ path, before, after }))) !== JSON.stringify(plan.targetHashes)) issues.push('batch manifest target hashes do not match the plan');
    if (JSON.stringify(manifest.targets.map((target) => target.path)) !== JSON.stringify(plan.targetOrder)) issues.push('batch manifest target order does not match the plan');
  } catch (error) { issues.push(`batch manifest verification failed: ${error instanceof Error ? error.message : String(error)}`); }
  let reviewRef: ArtifactRef | null = null;
  try {
    const reviewBytes = await readFile(join(batchDir, 'module-update-review.json'));
    validatePreparedBatchReview(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(reviewBytes)), plan.planSha);
    reviewRef = { path: 'module-update-review.json', sha256: sha(reviewBytes) };
  } catch (error) { issues.push(`update review is missing or invalid: ${error instanceof Error ? error.message : String(error)}`); }
  if (record.receipt === null) issues.push('update receipt is missing');
  else {
    try {
      const receipt = JSON.parse((await verifyArtifact(batchDir, record.receipt)).toString('utf8')) as AnyRecord;
      if (receipt.schema !== 'VPPreparedBatchReceipt/v1' || receipt.kind !== 'applied') issues.push('update receipt is not an applied VPPreparedBatchReceipt/v1');
      if (!object(receipt.plan) || receipt.plan.path !== record.batchManifest.path || receipt.plan.sha256 !== record.batchManifest.sha256) issues.push('update receipt plan binding mismatch');
      if (reviewRef === null || !object(receipt.review) || receipt.review.path !== reviewRef.path || receipt.review.sha256 !== reviewRef.sha256) issues.push('update receipt review binding mismatch');
    } catch (error) { issues.push(`update receipt verification failed: ${error instanceof Error ? error.message : String(error)}`); }
  }
  const catalogPath = join(root, 'catalog.json');
  const moduleAbsolute = resolve(root, plan.modulePath);
  let moduleBytes: Buffer | undefined;
  let catalogBytes: Buffer | undefined;
  try { moduleBytes = await readFile(moduleAbsolute); } catch { issues.push('module file is missing'); }
  try { catalogBytes = await readFile(catalogPath); } catch { issues.push('catalog file is missing'); }
  if (moduleBytes !== undefined && sha(moduleBytes) !== plan.moduleAfterSha256) issues.push('module after-image digest mismatch');
  if (catalogBytes !== undefined && sha(catalogBytes) !== plan.catalogAfterSha256) issues.push('catalog after-image digest mismatch');
  let catalog: Catalog | undefined;
  let loaded: Awaited<ReturnType<typeof loadInstructions>> | undefined;
  if (catalogBytes !== undefined) {
    try {
      catalog = await loadCatalog(catalogPath);
      if (catalog.instructions.length !== plan.catalogCount) issues.push(`catalog count ${catalog.instructions.length} != ${plan.catalogCount}`);
      if (catalog.revision !== plan.catalogRevisionAfter) issues.push(`catalog revision ${catalog.revision} != ${plan.catalogRevisionAfter}`);
      loaded = await loadInstructions(catalog, root);
    } catch (error) { issues.push(`catalog load failed: ${error instanceof Error ? error.message : String(error)}`); }
  }
  if (moduleBytes !== undefined) {
    try {
      const moduleFm = parseFrontmatter(new TextDecoder('utf-8', { fatal: true }).decode(moduleBytes));
      const parsed = parseModule(moduleFm.data, moduleFm.body, plan.moduleId);
      if (parsed.record.revision !== plan.moduleRevisionAfter) issues.push(`module revision ${parsed.record.revision} != ${plan.moduleRevisionAfter}`);
      for (const atom of plan.atoms) {
        const member = parsed.members.find((item) => item.atom_id === atom.atomId);
        if (member === undefined || member.file_sha256 !== atom.newFileSha256 || member.content_sha256 !== atom.newContentSha256 || member.file_bytes !== atom.newFileBytes || member.body_bytes !== atom.newBodyBytes) issues.push(`module atom payload mismatch: ${atom.atomId}`);
      }
    } catch (error) { issues.push(`module parse failed: ${error instanceof Error ? error.message : String(error)}`); }
  }
  let mapSha256: string | null = null;
  try {
    const mapBytes = await readFile(join(root, 'corpus-map.json'));
    mapSha256 = sha(mapBytes);
    if (mapSha256 !== plan.mapSha256) issues.push('corpus map changed');
    const mapValue: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(mapBytes));
    if (!object(mapValue)) issues.push('corpus map is invalid');
    else {
      try {
        const expectedReceipts = await receiptSnapshot(root, mapValue);
        if (JSON.stringify(expectedReceipts) !== JSON.stringify(plan.receipts)) issues.push('receipt snapshot does not match the plan');
      } catch { issues.push('receipt snapshot could not be read'); }
    }
  } catch { issues.push('corpus map is missing'); }

  let receiptCount = 0;
  for (const receipt of plan.receipts) {
    try { if (sha(await readFile(join(root, receipt.path))) !== receipt.sha256) issues.push(`fidelity receipt changed: ${receipt.path}`); else receiptCount += 1; }
    catch { issues.push(`fidelity receipt missing: ${receipt.path}`); }
  }
  for (const atom of plan.atoms) {
    try { await lstat(join(root, 'instructions', `${atom.atomId}.md`)); issues.push(`old atom file still exists: ${atom.atomId}`); }
    catch (error) { if (!(object(error) && error.code === 'ENOENT')) issues.push(`old atom file check failed: ${atom.atomId}`); }
  }
  let moduleGetCode: string | null = null;
  let composeIssue: string | null = null;
  if (catalog !== undefined && loaded !== undefined) {
    try { catalogGet(catalog, loaded, plan.moduleId); }
    catch (error) { moduleGetCode = object(error) && typeof error.code === 'string' ? error.code : null; }
    if (moduleGetCode !== 'CATALOG_MODULE_ATOM_REQUIRED') issues.push(`module get returned ${moduleGetCode ?? 'success'}`);
    try {
      const profile = JSON.parse(await readUtf8(profilePath)) as EffectiveProfile;
      const compose = (ids: string[]) => {
        try { return { bundle: catalogCompose(catalog!, loaded!, { instruction_ids: ids, profile }) }; }
        catch (error) { if (error instanceof CatalogError) return { error }; throw error; }
      };
      composeIssue = composeParityIssue(compose([plan.moduleId]), compose(plan.atoms.map((atom) => atom.atomId)));
      if (composeIssue !== null) issues.push(composeIssue);
    } catch (error) { issues.push(`compose verification failed: ${error instanceof Error ? error.message : String(error)}`); }
  }
  const checks = {
    moduleAfterSha256: moduleBytes === undefined ? null : sha(moduleBytes), catalogAfterSha256: catalogBytes === undefined ? null : sha(catalogBytes),
    catalogCount: catalog?.instructions.length ?? null, catalogRevision: catalog?.revision ?? null,
    moduleRevision: moduleBytes === undefined ? null : (() => { try { return parseFrontmatter(moduleBytes!.toString('utf8')).data.revision; } catch { return null; } })(),
    mapSha256, receiptCount, expectedReceiptCount: plan.receipts.length, atomPayloadCount: plan.atoms.length,
    moduleGetCode, composeParity: composeIssue === null,
  };
  return { issues, checks };
}

export async function rollbackModuleUpdate(options: { batchDir: string; staging: string; reviewPath?: string; apply: boolean; writer?: string }): Promise<{ kind: string; planSha: string; receipt: ArtifactRef | null; batchDirectory: string; targets: Target[] }> {
  const batchDir = assertAbsolute(options.batchDir, '--batch-dir');
  const staging = assertAbsolute(options.staging, '--staging');
  const record = await readJson(join(batchDir, 'module-update-apply.json')) as unknown as ApplyRecord;
  if (record.schema !== 'VPModuleUpdateApply/v1' || record.outcome !== 'applied') throw new Error('rollback requires a terminal applied module update record');
  const original = JSON.parse((await verifyArtifact(batchDir, record.batchManifest)).toString('utf8')) as { targets: Target[] };
  const moduleTarget = original.targets.find((target) => target.path === record.plan.modulePath);
  const catalogTarget = original.targets.find((target) => target.path === 'catalog.json');
  if (moduleTarget?.backup === null || moduleTarget === undefined || catalogTarget?.backup === null || catalogTarget === undefined) throw new Error('update batch lacks module or catalog before-images');
  for (const target of [moduleTarget, catalogTarget]) {
    let current: Buffer | undefined;
    try { current = await readFile(resolve(record.plan.root, target.path)); } catch { /* missing is a distinct digest */ }
    if ((current === undefined ? null : sha(current)) !== target.after) throw new Error(`rollback blocked by post-update drift: ${target.path}`);
  }
  const reverse: PreparedTargetInput[] = [
    { path: record.plan.modulePath, bytes: await verifyArtifact(batchDir, moduleTarget.backup) },
    { path: 'catalog.json', bytes: await verifyArtifact(batchDir, catalogTarget.backup) },
  ];
  if (options.apply && !options.reviewPath) throw new Error('--review is required with --apply');
  const result = await applyPreparedRollbackTargets({ root: record.plan.root, staging, targets: reverse, ...(options.apply ? { reviewPath: options.reviewPath } : {}), ...(options.writer === undefined ? {} : { writer: options.writer }) });
  if (options.apply && result.kind === 'applied') {
    if (sha(await readFile(resolve(record.plan.root, record.plan.modulePath))) !== record.plan.moduleBeforeSha256) throw new Error('rollback module readback hash mismatch');
    if (sha(await readFile(join(record.plan.root, 'catalog.json'))) !== record.plan.catalogBeforeSha256) throw new Error('rollback catalog readback hash mismatch');
  }
  return result;
}

export function parseModuleUpdateArgs(args: string[]): { values: Map<string, string>; flags: Set<string> } {
  const values = new Map<string, string>(); const flags = new Set<string>();
  for (let i = 0; i < args.length; i += 1) {
    const flag = args[i];
    if (flag === '--apply') { if (flags.has(flag)) throw new Error(`duplicate argument: ${flag}`); flags.add(flag); continue; }
    if (flag === undefined || !flag.startsWith('--')) throw new Error(`unexpected argument: ${String(flag)}`);
    const value = args[++i];
    if (value === undefined || value.startsWith('--')) throw new Error(`${flag} requires a value`);
    if (values.has(flag)) throw new Error(`duplicate argument: ${flag}`);
    values.set(flag, value);
  }
  return { values, flags };
}
function required(values: Map<string, string>, flag: string): string { const value = values.get(flag); if (!value) throw new Error(`${flag} is required`); return value; }
function optionalAtoms(values: Map<string, string>): string[] | undefined {
  const raw = values.get('--atoms'); if (raw === undefined) return undefined;
  const atoms = raw.split(',').map((item) => item.trim());
  if (atoms.some((id) => !id)) throw new Error('--atoms must be a comma-separated list of IDs');
  if (new Set(atoms).size !== atoms.length) throw new Error('--atoms must contain unique atom IDs');
  return atoms;
}
export function errorMessage(error: unknown): string { return error instanceof Error ? error.message : String(error); }

export async function runModuleUpdateCli(args: string[]): Promise<void> {
  const command = args[0];
  const { values, flags } = parseModuleUpdateArgs(args.slice(1));
  const allowed = command === 'plan' ? ['--root', '--module', '--atoms-dir', '--atoms', '--staging', '--out', '--as-of']
    : command === 'apply' ? ['--root', '--module', '--atoms-dir', '--atoms', '--staging', '--as-of', '--expected-update-sha', '--review', '--writer']
      : command === 'verify' ? ['--root', '--batch-dir', '--profile']
        : command === 'rollback' ? ['--batch-dir', '--staging', '--review', '--writer'] : [];
  if (allowed.length === 0) throw new Error('command must be plan, apply, verify, or rollback');
  for (const flag of values.keys()) if (!allowed.includes(flag)) throw new Error(`unknown flag: ${flag}`);
  if (flags.has('--apply') && command !== 'apply' && command !== 'rollback') throw new Error('--apply is supported only by apply and rollback');
  if (command === 'plan') {
    const root = assertAbsolute(required(values, '--root'), '--root'); const moduleId = required(values, '--module');
    const atomsDir = assertAbsolute(required(values, '--atoms-dir'), '--atoms-dir'); const staging = assertAbsolute(required(values, '--staging'), '--staging'); const out = assertAbsolute(required(values, '--out'), '--out');
    const plan = await buildModuleUpdatePlan({ root, moduleId, atomsDir, ...(optionalAtoms(values) === undefined ? {} : { atoms: optionalAtoms(values)! }), staging, ...(values.has('--as-of') ? { asOf: values.get('--as-of')! } : {}) });
    await writeFile(out, jsonBytes(plan)); console.log(JSON.stringify(plan)); return;
  }
  if (command === 'apply') {
    const root = assertAbsolute(required(values, '--root'), '--root'); const moduleId = required(values, '--module');
    const atomsDir = assertAbsolute(required(values, '--atoms-dir'), '--atoms-dir'); const staging = assertAbsolute(required(values, '--staging'), '--staging');
    const atoms = optionalAtoms(values);
    const result = await applyModuleUpdate({ root, moduleId, atomsDir, ...(atoms === undefined ? {} : { atoms }), staging, asOf: required(values, '--as-of'), expectedUpdateSha: required(values, '--expected-update-sha'), reviewPath: required(values, '--review'), apply: flags.has('--apply'), ...(values.has('--writer') ? { writer: values.get('--writer')! } : {}) });
    console.log(JSON.stringify(result)); if (result.kind !== 'applied' && flags.has('--apply')) process.exitCode = 4; return;
  }
  if (command === 'verify') {
    const root = assertAbsolute(required(values, '--root'), '--root'); const batchDir = assertAbsolute(required(values, '--batch-dir'), '--batch-dir'); const profile = assertAbsolute(required(values, '--profile'), '--profile');
    const result = await verifyModuleUpdate(root, batchDir, profile);
    console.log(JSON.stringify({ command, issueCount: result.issues.length, issues: result.issues, checks: result.checks })); if (result.issues.length) process.exitCode = 1; return;
  }
  const batchDir = assertAbsolute(required(values, '--batch-dir'), '--batch-dir'); const staging = assertAbsolute(required(values, '--staging'), '--staging');
  const result = await rollbackModuleUpdate({ batchDir, staging, apply: flags.has('--apply'), ...(values.has('--review') ? { reviewPath: values.get('--review')! } : {}), ...(values.has('--writer') ? { writer: values.get('--writer')! } : {}) });
  console.log(JSON.stringify(result)); if (result.kind !== 'applied' && flags.has('--apply')) process.exitCode = 4;
}
export function handleModuleUpdateCliError(error: unknown, setExitCode: (code: number) => void = (code) => { process.exitCode = code; }): void {
  console.error(JSON.stringify({ kind: 'error', message: errorMessage(error) }));
  setExitCode(1);
}
if (import.meta.main) runModuleUpdateCli(process.argv.slice(2)).catch(handleModuleUpdateCliError);
