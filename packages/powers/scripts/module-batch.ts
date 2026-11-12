import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { applyModulePlan, buildModulePlan, errorMessage, moduleIdFor, parseCli, receiptSnapshot, required, validateAsOf, validatePreparedBatchReview, verifyModuleMigration, type ModulePlan } from './module-migration.ts';
import { checkCorpus } from './check-corpus.ts';
import { verifyArtifact, type ArtifactRef } from './source-packets.ts';

type RecordValue = Record<string, unknown>;
type State = { catalogSha256: string; catalogRevision: number; catalogCount: number; mapSha256: string; receiptSha256: string; receipts: Array<{ path: string; sha256: string }> };
export type ModuleBatchPlan = { schema: 'VPModuleBatchPlan/v1'; root: string; donor: string; asOf: string; limit: number | null; initialState: State; modules: Array<{ moduleId: string; source: string; atomIds: string[]; ordinal: number }>; batchSha: string; stagingPath: string };
type BatchModuleApply = { moduleId: string; planSha: string; receipt: ArtifactRef | null; batchDirectory: string };
type BatchApplyRecord = { schema: 'VPModuleBatchApply/v1'; batchPlan: { path: string; sha256: string }; outcome: 'rejected' | 'applying' | 'applied' | 'partial-or-unknown'; modules: BatchModuleApply[]; finalCatalogSha256?: string; batchDirectory: string; error?: string };
type AppliedModuleRecord = { schema?: string; outcome?: string; plan: ModulePlan; receipt: ArtifactRef | null; batchDirectory?: string };
const HASH = /^[0-9a-f]{64}$/u;
const sha = (bytes: Uint8Array | string): string => createHash('sha256').update(bytes).digest('hex');
const jsonBytes = (value: unknown): Buffer => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
function object(value: unknown): value is RecordValue { return typeof value === 'object' && value !== null && !Array.isArray(value); }
export function chunkAtomIds(atomIds: readonly string[]): { chunks: string[][]; singleton: string[] } {
  const chunks: string[][] = []; const singleton: string[] = [];
  for (let offset = 0; offset < atomIds.length; offset += 8) {
    const chunk = atomIds.slice(offset, offset + 8);
    if (chunk.length === 1) singleton.push(chunk[0]!); else chunks.push(chunk);
  }
  return { chunks, singleton };
}
async function readJson(path: string): Promise<RecordValue> { const value: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await readFile(path))); if (!object(value)) throw new Error(`expected JSON object: ${path}`); return value; }
async function stateAt(root: string): Promise<State> {
  const catalogPath = join(root, 'catalog.json'); const catalogBytes = await readFile(catalogPath); const catalog = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(catalogBytes)) as { revision?: unknown; instructions?: unknown };
  if (!Number.isInteger(catalog.revision) || !Array.isArray(catalog.instructions)) throw new Error('invalid catalog structure');
  const mapBytes = await readFile(join(root, 'corpus-map.json')); const map = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(mapBytes)) as unknown;
  if (!object(map)) throw new Error('corpus-map.json is not a JSON object');
  return stateFrom(root, catalogBytes, mapBytes, catalog.revision as number, catalog.instructions.length, map);
}
async function stateFrom(root: string, catalogBytes: Uint8Array, mapBytes: Uint8Array, catalogRevision: number, catalogCount: number, map: RecordValue): Promise<State> {
  const receipts = await receiptSnapshot(root, map);
  return { catalogSha256: sha(catalogBytes), catalogRevision, catalogCount, mapSha256: sha(mapBytes), receiptSha256: sha(JSON.stringify(receipts)), receipts };
}
function batchDigest(plan: Omit<ModuleBatchPlan, 'batchSha' | 'stagingPath'>): string { return sha(JSON.stringify(plan)); }
function compareState(actual: State, expected: State): void {
  if (actual.catalogSha256 !== expected.catalogSha256 || actual.catalogRevision !== expected.catalogRevision || actual.catalogCount !== expected.catalogCount) throw new Error('module batch catalog drift detected');
  if (actual.mapSha256 !== expected.mapSha256) throw new Error('module batch corpus-map drift detected');
  if (actual.receiptSha256 !== expected.receiptSha256 || JSON.stringify(actual.receipts) !== JSON.stringify(expected.receipts)) throw new Error('module batch fidelity receipt drift detected');
}
export async function planModuleBatch(options: { root: string; staging: string; donor: string; limit?: number; asOf?: string }): Promise<ModuleBatchPlan> {
  if (!isAbsolute(options.root) || !isAbsolute(options.staging)) throw new Error('--root and --staging must be absolute paths');
  if (!options.donor.trim()) throw new Error('--donor must be non-empty');
  if (options.limit !== undefined && (!Number.isInteger(options.limit) || options.limit < 1)) throw new Error('--limit must be a positive integer');
  const root = resolve(options.root); const stagingPath = resolve(options.staging); const asOf = validateAsOf(options.asOf ?? new Date().toISOString());
  const catalogBytes = await readFile(join(root, 'catalog.json')); const catalog = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(catalogBytes)) as unknown;
  if (!object(catalog) || !Number.isInteger(catalog.revision) || !Array.isArray(catalog.instructions)) throw new Error('invalid catalog structure');
  const mapBytes = await readFile(join(root, 'corpus-map.json')); const mapValue: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(mapBytes));
  if (!object(mapValue)) throw new Error('corpus-map.json is not a JSON object');
  const map = mapValue; const state = await stateFrom(root, catalogBytes, mapBytes, catalog.revision as number, catalog.instructions.length, map);
  if (!object(map.donors) || !object(map.donors[options.donor]) || !object((map.donors[options.donor] as RecordValue).files)) throw new Error(`map-primary donor is missing: ${options.donor}`);
  const donor = map.donors[options.donor] as RecordValue; const files = donor.files as RecordValue;
  const entries = catalog.instructions as Array<{ instruction_id: string }>;
  const topLevel = new Set(entries.map((entry) => entry.instruction_id));
  const queuedAtoms = new Set<string>();
  const modules: ModuleBatchPlan['modules'] = [];
  for (const sourcePath of Object.keys(files).sort((a, b) => a < b ? -1 : a > b ? 1 : 0)) {
    const group = files[sourcePath];
    if (!object(group)) throw new Error(`map-primary source group is invalid: ${options.donor}:${sourcePath}`);
    if (!Array.isArray(group.instruction_ids)) continue;
    if (group.instruction_ids.some((id) => typeof id !== 'string')) throw new Error(`map-primary source group has invalid instruction_ids: ${options.donor}:${sourcePath}`);
    const remaining = (group.instruction_ids as string[]).filter((id) => topLevel.has(id) && !queuedAtoms.has(id)).sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
    const partition = chunkAtomIds(remaining);
    for (const id of partition.singleton) queuedAtoms.add(id);
    for (const atomIds of partition.chunks) {
      const identity = moduleIdFor({ donor: options.donor, path: sourcePath }, entries);
      const moduleId = identity.moduleId;
      modules.push({ moduleId, source: sourcePath, atomIds, ordinal: identity.ordinal });
      for (const id of atomIds) queuedAtoms.add(id);
      entries.push({ instruction_id: moduleId });
    }
  }
  const limited = options.limit === undefined ? modules : modules.slice(0, options.limit);
  const limit = options.limit ?? null;
  const base = { schema: 'VPModuleBatchPlan/v1' as const, root, donor: options.donor, asOf, limit, initialState: state, modules: limited };
  const batchSha = batchDigest(base);
  return { ...base, batchSha, stagingPath };
}
export async function applyModuleBatch(options: { root: string; staging: string; donor: string; limit?: number; asOf?: string; expectedBatchSha?: string; reviewPath?: string; apply: boolean; writer?: string }): Promise<BatchApplyRecord> {
  if (!options.apply) throw new Error('--apply is required for module-batch apply');
  if (!options.expectedBatchSha) throw new Error('--expected-batch-sha is required for module-batch apply');
  if (!options.reviewPath) throw new Error('--review is required for module-batch apply');
  const plan = await planModuleBatch(options);
  const stagingRoot = resolve(options.staging);
  await mkdir(stagingRoot, { recursive: true });
  const batchDirectory = join(stagingRoot, `module-batch-${plan.batchSha.slice(0, 16)}-${randomUUID()}`);
  const planPath = 'module-batch-plan.json'; const recordPath = join(batchDirectory, 'module-batch-apply.json');
  await mkdir(batchDirectory, { recursive: false }); await writeFile(join(batchDirectory, planPath), jsonBytes(plan), { flag: 'wx' });
  const record: BatchApplyRecord = { schema: 'VPModuleBatchApply/v1', batchPlan: { path: planPath, sha256: plan.batchSha }, outcome: 'rejected', modules: [], batchDirectory };
  const save = async (): Promise<void> => { await writeFile(recordPath, jsonBytes(record)); };
  await save();
  let reviewInfo: { reviewer: string; pointer: string };
  let reviewBytes: Buffer;
  try {
    if (options.expectedBatchSha !== plan.batchSha) throw new Error(`module batch SHA mismatch: expected ${options.expectedBatchSha}, rebuilt ${plan.batchSha}`);
    reviewBytes = await readFile(options.reviewPath);
    reviewInfo = validatePreparedBatchReview(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(reviewBytes)) as unknown, plan.batchSha);
    compareState(await stateAt(plan.root), plan.initialState);
    await writeFile(join(batchDirectory, 'module-batch-review.json'), reviewBytes, { flag: 'wx' });
    record.outcome = 'applying'; await save();
  } catch (error) {
    record.error = errorMessage(error); await save(); throw new Error(`${errorMessage(error)}; terminal batch record: ${recordPath}`);
  }
  let expectedCount = plan.initialState.catalogCount;
  let expectedCatalogSha256 = plan.initialState.catalogSha256;
  try {
    for (const queued of plan.modules) {
      const source = { donor: plan.donor, path: queued.source };
      const modulePlan = await buildModulePlan({ root: plan.root, source, atoms: queued.atomIds, staging: join(batchDirectory, queued.moduleId), asOf: plan.asOf });
      if (modulePlan.moduleId !== queued.moduleId || JSON.stringify(modulePlan.atoms.map((atom) => atom.atom_id)) !== JSON.stringify(queued.atomIds)) throw new Error(`rebuilt module does not match batch queue: ${queued.moduleId}`);
      const expectedAfter = expectedCount - queued.atomIds.length + 1;
      if (modulePlan.catalogCountBefore !== expectedCount) throw new Error(`module catalog chain mismatch: ${queued.moduleId}`);
      if (modulePlan.catalogBeforeSha256 !== expectedCatalogSha256) throw new Error(`module catalog chain SHA mismatch: ${queued.moduleId}`);
      if (modulePlan.catalogCountAfter !== expectedAfter) throw new Error(`module catalog count chain mismatch: ${queued.moduleId}`);
      const internalReviewPath = join(batchDirectory, 'reviews', `${queued.moduleId}.json`);
      await mkdir(dirname(internalReviewPath), { recursive: true });
      await writeFile(internalReviewPath, jsonBytes({ schema: 'VPPreparedBatchReview/v1', planSha256: modulePlan.planSha, verdict: 'READY', reviewer: reviewInfo.reviewer, pointer: `${reviewInfo.pointer}#${queued.moduleId}` }), { flag: 'wx' });
      const result = await applyModulePlan({ root: plan.root, source, atoms: queued.atomIds, staging: join(batchDirectory, queued.moduleId), asOf: plan.asOf, expectedPlanSha: modulePlan.planSha, reviewPath: internalReviewPath, apply: true, ...(options.writer === undefined ? {} : { writer: options.writer }) });
      if (result.kind !== 'applied') throw new Error(`module apply did not complete: ${queued.moduleId} (${result.kind})`);
      if (result.plan.moduleId !== queued.moduleId || JSON.stringify(result.plan.atoms.map((atom) => atom.atom_id)) !== JSON.stringify(queued.atomIds)) throw new Error(`applied module differs from batch queue: ${queued.moduleId}`);
      record.modules.push({ moduleId: queued.moduleId, planSha: result.plan.planSha, receipt: result.receipt, batchDirectory: result.batchDirectory });
      expectedCount = expectedAfter;
      expectedCatalogSha256 = result.plan.catalogAfterSha256;
      await save();
    }
    const finalCatalogSha256 = sha(await readFile(join(plan.root, 'catalog.json')));
    if (finalCatalogSha256 !== expectedCatalogSha256) throw new Error('module batch final catalog digest mismatch');
    record.finalCatalogSha256 = finalCatalogSha256;
    record.outcome = 'applied'; await save(); return record;
  } catch (error) {
    record.outcome = 'partial-or-unknown'; record.error = errorMessage(error); await save(); throw new Error(`${errorMessage(error)}; terminal batch record: ${recordPath}`);
  }
}
export async function verifyModuleBatch(options: { root: string; batchDir: string; profile: string; corpusCheck?: (root: string) => string[]; historical?: boolean }): Promise<{ issues: string[]; checks: Record<string, unknown> }> {
  const root = resolve(options.root); const batchDirectory = resolve(options.batchDir); const record = await readJson(join(batchDirectory, 'module-batch-apply.json')) as unknown as BatchApplyRecord;
  if (record.schema !== 'VPModuleBatchApply/v1' || record.outcome !== 'applied') throw new Error('verification requires a terminal applied module batch record');
  const batchPlan = await readJson(join(batchDirectory, record.batchPlan.path)) as unknown as ModuleBatchPlan;
  if (batchPlan.schema !== 'VPModuleBatchPlan/v1' || batchPlan.batchSha !== record.batchPlan.sha256 || batchDigest({ schema: batchPlan.schema, root: batchPlan.root, donor: batchPlan.donor, asOf: batchPlan.asOf, limit: batchPlan.limit, initialState: batchPlan.initialState, modules: batchPlan.modules }) !== batchPlan.batchSha) throw new Error('module batch plan binding is invalid');
  const issues: string[] = []; const corpusIssues = (options.corpusCheck ?? checkCorpus)(root);
  if (corpusIssues.length) issues.push(`check-corpus: ${JSON.stringify(corpusIssues)}`);
  const finalState = await stateAt(root);
  if (finalState.mapSha256 !== batchPlan.initialState.mapSha256) issues.push('corpus map changed from the batch initial state');
  if (finalState.receiptSha256 !== batchPlan.initialState.receiptSha256 || JSON.stringify(finalState.receipts) !== JSON.stringify(batchPlan.initialState.receipts)) issues.push('fidelity receipts changed from the batch initial state');
  const catalog = await readJson(join(root, 'catalog.json')); const catalogCount = (catalog.instructions as unknown[]).length;
  const finalCatalogSha256 = sha(await readFile(join(root, 'catalog.json')));
  const historical = options.historical === true;
  if (record.finalCatalogSha256 === undefined || !HASH.test(record.finalCatalogSha256)) issues.push('module batch final catalog SHA is missing');
  else if (!historical && record.finalCatalogSha256 !== finalCatalogSha256) issues.push('module batch final catalog digest mismatch');
  try {
    const review = await readJson(join(batchDirectory, 'module-batch-review.json'));
    validatePreparedBatchReview(review, batchPlan.batchSha);
  } catch (error) { issues.push(`module batch review is missing or invalid: ${errorMessage(error)}`); }
  const totalAtoms = batchPlan.modules.reduce((sum, module) => sum + module.atomIds.length, 0); const expectedCatalogCount = batchPlan.initialState.catalogCount - totalAtoms + batchPlan.modules.length;
  if (!historical && catalogCount !== expectedCatalogCount) issues.push(`catalog count ${catalogCount} != ${expectedCatalogCount}`);
  let expectedCount = batchPlan.initialState.catalogCount;
  let expectedSha256 = batchPlan.initialState.catalogSha256;
  const moduleChecks: Array<{ moduleId: string; issues: string[]; checks: Record<string, unknown> }> = [];
  for (const [index, module] of record.modules.entries()) {
    if (batchPlan.modules[index]?.moduleId !== module.moduleId) issues.push(`module record order or identity mismatch at index ${index}`);
    try {
      const queued = batchPlan.modules[index];
      const applied = await readJson(join(module.batchDirectory, 'module-apply.json')) as unknown as AppliedModuleRecord;
      if (applied.schema !== 'VPModuleMigrationApply/v1' || applied.outcome !== 'applied') issues.push(`${module.moduleId}: apply record is not terminal applied`);
      if (applied.plan.planSha !== module.planSha) issues.push(`${module.moduleId}: batch record plan SHA mismatch`);
      if (JSON.stringify(applied.receipt) !== JSON.stringify(module.receipt)) issues.push(`${module.moduleId}: batch record receipt mismatch`);
      if (applied.receipt === null) issues.push(`${module.moduleId}: applied module has no receipt`);
      else await verifyArtifact(module.batchDirectory, applied.receipt);
      if (resolve(applied.batchDirectory ?? '') !== resolve(module.batchDirectory)) issues.push(`${module.moduleId}: apply record directory mismatch`);
      if (queued !== undefined) {
        if (applied.plan.source?.donor !== batchPlan.donor || applied.plan.source?.path !== queued.source) issues.push(`${module.moduleId}: apply record source mismatch`);
        if (JSON.stringify(applied.plan.atoms.map((atom) => atom.atom_id)) !== JSON.stringify(queued.atomIds)) issues.push(`${module.moduleId}: apply record atom cohort mismatch`);
      }
      if (applied.plan.catalogCountBefore !== expectedCount || applied.plan.catalogBeforeSha256 !== expectedSha256) issues.push(`${module.moduleId}: apply record catalog input chain mismatch`);
      expectedCount = applied.plan.catalogCountAfter;
      expectedSha256 = applied.plan.catalogAfterSha256;
      if (historical) {
        const entry = (catalog.instructions as Array<{ instruction_id: string; path: string; sha256: string }>).find((item) => item.instruction_id === module.moduleId);
        if (entry === undefined || entry.path !== applied.plan.modulePath || entry.sha256 !== applied.plan.moduleSha256) issues.push(`${module.moduleId}: historical batch module is missing or changed in the current catalog`);
      }
      const internalReview = await readJson(join(batchDirectory, 'reviews', `${module.moduleId}.json`));
      try { validatePreparedBatchReview(internalReview, module.planSha); }
      catch (error) { issues.push(`${module.moduleId}: internal review is invalid: ${errorMessage(error)}`); }
      const result = await verifyModuleMigration(root, module.batchDirectory, options.profile, { corpus: false, catalog: false });
      moduleChecks.push({ moduleId: module.moduleId, ...result });
      for (const issue of result.issues) issues.push(`${module.moduleId}: ${issue}`);
      const parity = result.checks.atomParity as Array<{ content: boolean; metadata: boolean }>;
      if (parity.some((item) => !item.content || !item.metadata)) issues.push(`${module.moduleId}: atom parity is false`);
      if (result.checks.moduleGetCode !== 'CATALOG_MODULE_ATOM_REQUIRED') issues.push(`${module.moduleId}: module get is not fail-closed`);
      for (const atom of applied.plan.atoms) {
        try { await readFile(join(root, atom.instruction_path)); issues.push(`${module.moduleId}: old atom file still exists: ${atom.instruction_path}`); }
        catch (error) { if (!(object(error) && error.code === 'ENOENT')) throw error; }
      }
    } catch (error) { issues.push(`${module.moduleId}: verification failed: ${errorMessage(error)}`); }
  }
  if (record.modules.length !== batchPlan.modules.length) issues.push(`module record count ${record.modules.length} != ${batchPlan.modules.length}`);
  if (!historical && expectedCount !== catalogCount) issues.push(`module record catalog count chain ${expectedCount} != ${catalogCount}`);
  if (!historical && expectedSha256 !== finalCatalogSha256) issues.push('module record catalog SHA chain mismatch');
  const checks = { corpusIssueCount: corpusIssues.length, catalogCount, expectedCatalogCount, finalCatalogSha256, historical, totalAtoms, moduleCount: record.modules.length, mapSha256: finalState.mapSha256, receiptSha256: finalState.receiptSha256, modules: moduleChecks };
  return { issues, checks };
}
function optionalLimit(values: Map<string, string>): number | undefined { const raw = values.get('--limit'); if (raw === undefined) return undefined; if (!/^\d+$/u.test(raw) || Number(raw) < 1) throw new Error('--limit must be a positive integer'); return Number(raw); }
export async function runModuleBatchCli(args: string[]): Promise<void> {
  const command = args[0];
  if (command !== 'plan' && command !== 'apply' && command !== 'verify') throw new Error('module-batch command must be plan, apply, or verify');
  const { values, flags } = parseCli(args.slice(1));
  const allowed = command === 'plan' ? ['--root', '--staging', '--out', '--donor', '--limit', '--as-of'] : command === 'apply' ? ['--root', '--staging', '--donor', '--limit', '--as-of', '--expected-batch-sha', '--review', '--writer'] : ['--root', '--batch-dir', '--profile'];
  for (const flag of values.keys()) if (!allowed.includes(flag)) throw new Error(`unknown flag: ${flag}`);
  if (command === 'plan' && flags.size) throw new Error(`unknown flag: ${[...flags].join(', ')}`);
  if (command === 'apply' && [...flags].some((flag) => flag !== '--apply')) throw new Error(`unknown flag: ${[...flags].join(', ')}`);
  if (command === 'verify' && [...flags].some((flag) => flag !== '--historical')) throw new Error(`unknown flag: ${[...flags].join(', ')}`);
  const root = required(values, '--root');
  if (!isAbsolute(root)) throw new Error('--root must be an absolute path');
  const donor = command === 'verify' ? '' : required(values, '--donor'); const limit = optionalLimit(values); const asOf = values.get('--as-of');
  if (command === 'plan') {
    const staging = required(values, '--staging'); const out = required(values, '--out');
    if (!isAbsolute(staging) || !isAbsolute(out)) throw new Error('--staging and --out must be absolute paths');
    const plan = await planModuleBatch({ root, staging, donor, ...(limit === undefined ? {} : { limit }), ...(asOf === undefined ? {} : { asOf }) });
    await mkdir(plan.stagingPath, { recursive: true }); await writeFile(resolve(out), jsonBytes(plan), { flag: 'wx' });
    console.log(JSON.stringify({ kind: 'planned', batchSha: plan.batchSha, modules: plan.modules.length, output: resolve(out), stagingPath: plan.stagingPath })); return;
  }
  if (command === 'apply') {
    const staging = required(values, '--staging'); if (!isAbsolute(staging)) throw new Error('--staging must be an absolute path');
    const expectedBatchSha = values.get('--expected-batch-sha'); const reviewPath = values.get('--review'); const writer = values.get('--writer');
    const result = await applyModuleBatch({ root, staging, donor, ...(limit === undefined ? {} : { limit }), ...(asOf === undefined ? {} : { asOf }), ...(expectedBatchSha === undefined ? {} : { expectedBatchSha }), ...(reviewPath === undefined ? {} : { reviewPath }), apply: flags.has('--apply'), ...(writer === undefined ? {} : { writer }) });
    console.log(JSON.stringify(result)); if (result.outcome !== 'applied') process.exitCode = 4; return;
  }
  const batchDir = required(values, '--batch-dir'); if (!isAbsolute(batchDir)) throw new Error('--batch-dir must be an absolute path');
  const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
  const profile = resolve(values.get('--profile') ?? join(repositoryRoot, 'vida-project-profile.json'));
  const result = await verifyModuleBatch({ root, batchDir, profile, ...(flags.has('--historical') ? { historical: true } : {}) });
  console.log(JSON.stringify({ command: 'verify', issueCount: result.issues.length, issues: result.issues, checks: result.checks })); if (result.issues.length) process.exitCode = 1;
}
export function handleModuleBatchCliError(error: unknown): void { console.error(JSON.stringify({ kind: 'error', message: errorMessage(error) })); process.exitCode = 1; }
if (import.meta.main) runModuleBatchCli(process.argv.slice(2)).catch(handleModuleBatchCliError);
