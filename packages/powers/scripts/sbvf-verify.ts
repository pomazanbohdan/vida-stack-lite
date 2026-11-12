import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { checkCorpus } from './check-corpus.ts';
import { parseFrontmatter } from '../skills/vp-mode/scripts/frontmatter.ts';
import { parseVariantScalar, parseVariantSections, type VariantRecord } from '../skills/vp-mode/scripts/variants.ts';
import { catalogCompose, catalogGet, loadCatalog, loadInstructions } from '../skills/vp-mode/scripts/catalog.ts';

type Dict = Record<string, unknown>;
const sha = (bytes: Uint8Array | string): string => createHash('sha256').update(bytes).digest('hex');
const isRecord = (value: unknown): value is Dict => typeof value === 'object' && value !== null && !Array.isArray(value);
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
type TargetPlan = { path: string; beforeSha256: string | null; afterSha256: string | null };
type ForwardTarget = { path: string; before: string | null; after: string | null; backup: { path: string; sha256: string } | null };
type Options = { root: string; plan: string; batchDir: string };

function parseArgs(values: string[]): Options {
  const options: Partial<Options> = { root: packageRoot };
  for (let index = 0; index < values.length; index += 1) {
    const flag = values[index]!; const value = values[++index];
    if (value === undefined || value.startsWith('--')) throw new Error(`${flag} requires a value`);
    if (flag === '--root') options.root = resolve(value);
    else if (flag === '--plan') options.plan = resolve(value);
    else if (flag === '--batch-dir') options.batchDir = resolve(value);
    else throw new Error(`unknown argument: ${flag}`);
  }
  if (options.plan === undefined || options.batchDir === undefined) throw new Error('--plan and --batch-dir are required');
  return options as Options;
}

export async function fidelityHashes(root: string): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const visit = async (path: string): Promise<void> => {
    let entries;
    try { entries = await readdir(path, { withFileTypes: true }); }
    catch (error) { if (isRecord(error) && error.code === 'ENOENT') return; throw error; }
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name, 'en'))) {
      const child = join(path, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`fidelity snapshot refuses symbolic link: ${relative(root, child)}`);
      if (entry.isDirectory()) await visit(child);
      else if (entry.isFile()) result[relative(root, child).split(sep).join('/')] = sha(await readFile(child));
    }
  };
  await visit(join(root, 'fidelity'));
  return result;
}

async function readArtifact(stageRoot: string, target: ForwardTarget): Promise<Buffer> {
  if (target.backup === null || target.before === null) throw new Error(`missing forward before-image: ${target.path}`);
  const path = resolve(stageRoot, target.backup.path); const rel = relative(resolve(stageRoot), path);
  if (rel === '..' || rel.startsWith(`..${sep}`)) throw new Error(`before-image escapes staging root: ${target.path}`);
  const bytes = await readFile(path);
  if (sha(bytes) !== target.backup.sha256 || target.before !== target.backup.sha256) throw new Error(`before-image hash mismatch: ${target.path}`);
  return bytes;
}

export function variantContextVersion(framework: Dict): string | undefined {
  const range = framework.versionRange;
  if (!isRecord(range)) return undefined;
  const comparators = Array.isArray(range.comparators) ? range.comparators.filter(isRecord) : [];
  const bound = comparators.find(item => (item.op === '=' || item.op === '>=') && typeof item.version === 'string');
  if (bound !== undefined) return String(bound.version);
  if (typeof range.raw !== 'string') return undefined;
  const raw = range.raw.trim();
  const single = /^v?(0|[1-9]\d*)\.[xX]$/u.exec(raw);
  if (single !== null) return `${single[1]}.0.0`;
  const padded = raw.replace(/\.x$/iu, '.0');
  return /^\d+\.\d+$/u.test(padded) ? `${padded}.0` : padded;
}

function countBindings(map: Dict): { total: number; singleton: number; family: number } {
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

async function verify(options: Options): Promise<Dict> {
  const plan: Dict = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await readFile(options.plan)));
  const { planSha256, stagingPath: _stagingPath, targetPaths: _targetPaths, ...logicalPlan } = plan;
  if (typeof planSha256 !== 'string' || sha(`${JSON.stringify(logicalPlan, null, 2)}\n`) !== planSha256) throw new Error('plan SHA integrity mismatch');
  const forward: Dict = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await readFile(join(options.batchDir, 'plan.json'))));
  if (!Array.isArray(plan.targets) || !Array.isArray(forward.targets) || forward.schema !== 'VPPreparedBatch/v1' || resolve(String(forward.root)) !== options.root) throw new Error('plan/batch root or target manifest is invalid');
  const stageRoot = dirname(options.batchDir);
  const planTargets = plan.targets as TargetPlan[]; const forwardTargets = forward.targets as ForwardTarget[];
  const expected = new Map(planTargets.map(target => [target.path, target]));
  if (expected.size !== forwardTargets.length || forwardTargets.some(target => !expected.has(target.path))) throw new Error('forward batch targets do not match the plan');
  const targetByPath = new Map(forwardTargets.map(target => [target.path, target]));
  const targetPlan = (path: string): TargetPlan => { const value = expected.get(path); if (value === undefined) throw new Error(`plan target missing: ${path}`); return value; };
  for (const target of forwardTargets) {
    const logical = targetPlan(target.path);
    if (target.before !== logical.beforeSha256 || target.after !== logical.afterSha256) throw new Error(`forward batch hashes do not match plan: ${target.path}`);
  }
  const issues = checkCorpus(options.root);
  if (issues.length !== 0) throw new Error(`check-corpus reported issues: ${JSON.stringify(issues)}`);
  const catalogBytes = await readFile(join(options.root, 'catalog.json'));
  const catalog = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(catalogBytes)) as Dict;
  const map = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await readFile(join(options.root, 'corpus-map.json')))) as Dict;
  const catalogTarget = targetPlan('catalog.json'); const mapTarget = targetPlan('corpus-map.json');
  if (sha(catalogBytes) !== catalogTarget.afterSha256 || sha(catalogBytes) !== plan.catalogAfterSha256) throw new Error('catalog after hash mismatch');
  if (sha(await readFile(join(options.root, 'corpus-map.json'))) !== mapTarget.afterSha256 || map.schema !== 'VPCorpusMap/v3') throw new Error('corpus map after hash/schema mismatch');
  const catalogEntries = Array.isArray(catalog.instructions) ? catalog.instructions as Dict[] : [];
  const delta = plan.catalogDelta as Dict;
  const bindings = countBindings(map);
  const bindingTarget = plan.bindingCounts as Dict | undefined;
  const expectedBindings = bindingTarget === undefined ? { total: 468, singleton: 464, family: 4 } : bindingTarget;
  if (catalogEntries.length !== delta.afterCount || bindings.total !== expectedBindings.total || bindings.singleton !== expectedBindings.singleton || bindings.family !== expectedBindings.family) throw new Error(`catalog/map counts mismatch: ${JSON.stringify({ catalog: catalogEntries.length, bindings, expected: expectedBindings })}`);

  const beforeCatalogTarget = targetByPath.get('catalog.json');
  if (beforeCatalogTarget === undefined) throw new Error('catalog before-image target missing');
  const beforeCatalog = JSON.parse((await readArtifact(stageRoot, beforeCatalogTarget)).toString('utf8')) as Dict;
  const beforeEntries = Array.isArray(beforeCatalog.instructions) ? beforeCatalog.instructions as Dict[] : [];
  const familyIds = new Set((Array.isArray(plan.families) ? plan.families : []).filter(isRecord).map(family => String(family.familyId)));
  const deletedIds = new Set((Array.isArray(plan.deleteList) ? plan.deleteList : []).map(path => String(path).replace(/^instructions\//u, '').replace(/\.md$/u, '')));
  const afterById = new Map(catalogEntries.map(entry => [String(entry.instruction_id), entry]));
  for (const entry of beforeEntries) {
    const id = String(entry.instruction_id);
    if (deletedIds.has(id)) continue;
    const current = afterById.get(id);
    if (current === undefined || current.path !== entry.path || current.sha256 !== entry.sha256) throw new Error(`non-family catalog entry changed: ${id}`);
    const bytes = await readFile(join(options.root, String(current.path)));
    if (sha(bytes) !== current.sha256) throw new Error(`non-family instruction bytes changed: ${id}`);
  }
  for (const id of familyIds) if (!afterById.has(id)) throw new Error(`family catalog entry missing: ${id}`);

  const families = Array.isArray(plan.families) ? plan.families.filter(isRecord) : [];
  const variants = Array.isArray(plan.variants) ? plan.variants.filter(isRecord) : [];
  const variantById = new Map(variants.map(variant => [String(variant.variantId), variant]));
  const admissionMode = plan.schema === 'SBVFAdmissionPlan/v1';
  const admissions = Array.isArray(plan.admissions) ? plan.admissions.filter(isRecord) : [];
  const admitByVariant = new Map(admissions.map(item => [String(item.variantId), item]));
  const declaredFidelity = new Map<string, string>();
  if (admissionMode) for (const item of admissions) {
    declaredFidelity.set(String(item.receiptPath), String(item.receiptSha256));
    declaredFidelity.set(String(item.evidencePath), String(item.evidenceSha256));
  }
  const admissionReceiptCheck = async (id: string, admit: Dict): Promise<void> => {
    const receiptRel = String(admit.receiptPath);
    const receiptBytes = await readFile(join(options.root, receiptRel));
    if (sha(receiptBytes) !== admit.receiptSha256 || admit.receiptSha256 !== targetPlan(receiptRel).afterSha256) throw new Error(`admission receipt hash mismatch: ${id}`);
    const receipt = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(receiptBytes)) as Dict;
    const source = isRecord(receipt.source) ? receipt.source : {};
    const reviewer = isRecord(receipt.reviewer) ? receipt.reviewer : {};
    if (receipt.schema !== 'H2FidelityReceipt/v2' || receipt.instructionId !== id || receipt.variantId !== id
      || receipt.variantBodySha256 !== admit.contentSha256 || receipt.verdict !== 'READY'
      || reviewer.kind !== 'delegated' || typeof reviewer.model !== 'string' || reviewer.model === ''
      || source.donor !== 'uupm' || source.path !== admit.file || source.rowKey !== admit.rowKey) throw new Error(`admission receipt contract mismatch: ${id}`);
    const evidenceRel = String(admit.evidencePath);
    const evidenceBytes = await readFile(join(options.root, evidenceRel));
    if (sha(evidenceBytes) !== admit.evidenceSha256) throw new Error(`admission evidence hash mismatch: ${id}`);
    const evidence = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(evidenceBytes)) as Dict;
    const evidenceRows = Array.isArray(evidence.rows) ? evidence.rows.filter(isRecord) : [];
    if (evidence.schema !== 'H2FamilyAdmissionEvidence/v1' || !evidenceRows.some(row => row.variantId === id && row.rowKey === admit.rowKey)) throw new Error(`admission evidence contract mismatch: ${id}`);
    const uupm = isRecord(map.donors) && isRecord(map.donors.uupm) ? map.donors.uupm : {};
    const csvSources = isRecord(uupm.csvSources) ? uupm.csvSources : {};
    const csvSource = csvSources[String(admit.file)];
    const rows = isRecord(csvSource) && Array.isArray(csvSource.rows) ? csvSource.rows : [];
    const row = rows.find(item => isRecord(item) && item.rowKey === admit.rowKey);
    const bindings = isRecord(row) && Array.isArray(row.bindings) ? row.bindings.filter(isRecord) : [];
    const binding = bindings.find(item => item.variantId === id && item.instructionId === admit.familyId);
    if (binding === undefined || !Array.isArray(binding.cells)) throw new Error(`admission map binding missing: ${id}`);
    const fidelity = isRecord(binding.fidelity) ? binding.fidelity : {};
    if (fidelity.path !== receiptRel || fidelity.sha256 !== admit.receiptSha256) throw new Error(`admission binding fidelity mismatch: ${id}`);
    const receiptCells = Array.isArray(source.cells) ? source.cells.filter(isRecord) : [];
    const bindingCells = binding.cells.filter(isRecord);
    if (receiptCells.length !== bindingCells.length) throw new Error(`admission receipt cell count mismatch: ${id}`);
    for (const [index, receiptCell] of receiptCells.entries()) {
      const bindingCell = bindingCells[index]!;
      if (receiptCell.columnIndex !== bindingCell.columnIndex || receiptCell.columnHeader !== bindingCell.columnHeader
        || receiptCell.cellHash !== bindingCell.cellHash || receiptCell.role !== bindingCell.role
        || JSON.stringify(receiptCell.locator) !== JSON.stringify(bindingCell.locator)
        || JSON.stringify(receiptCell.locators) !== JSON.stringify(bindingCell.locators)) throw new Error(`admission receipt cell mismatch: ${id}`);
    }
  };
  for (const family of families) {
    const familyPath = String(family.path); const familyBytes = await readFile(join(options.root, familyPath));
    if (sha(familyBytes) !== family.sha256) throw new Error(`family instruction hash mismatch: ${String(family.familyId)}`);
    const parsedFamily = parseFrontmatter(new TextDecoder('utf-8', { fatal: true }).decode(familyBytes));
    const familyVariants = parseVariantScalar(String(parsedFamily.data.instruction_variants), String(family.familyId));
    const sections = parseVariantSections(parsedFamily.body, familyVariants, String(family.familyId));
    for (const variant of familyVariants) {
      const id = variant.variant_id;
      const admit = admitByVariant.get(id);
      if (admit !== undefined) {
        const section = sections.get(id);
        if (section === undefined || sha(section) !== admit.contentSha256 || variant.contentSha256 !== admit.contentSha256) throw new Error(`admission section bytes hash mismatch: ${id}`);
        await admissionReceiptCheck(id, admit);
      } else {
        const target = targetByPath.get(`instructions/${id}.md`);
        if (target === undefined) throw new Error(`variant before-image missing: ${id}`);
        const original = parseFrontmatter((await readArtifact(stageRoot, target)).toString('utf8'));
        if (sections.get(id) !== original.body || variant.contentSha256 !== sha(original.body)) throw new Error(`variant body differs from before-image: ${id}`);
      }
      const binding = variantById.get(id);
      if (binding === undefined || !isRecord(binding.applicability) || !Array.isArray(binding.applicability.frameworks)) throw new Error(`variant applicability missing: ${id}`);
      const framework = binding.applicability.frameworks[0];
      if (!isRecord(framework) || typeof framework.name !== 'string') throw new Error(`variant framework context invalid: ${id}`);
      const context: { frameworks: { name: string; version?: string }[] } = { frameworks: [{ name: framework.name }] };
      const contextVersion = variantContextVersion(framework);
      if (contextVersion !== undefined) context.frameworks[0]!.version = contextVersion;
      const loadedCatalog = await loadCatalog(join(options.root, 'catalog.json'));
      const loadedInstructions = await loadInstructions(loadedCatalog, options.root);
      const selected = catalogGet(loadedCatalog, loadedInstructions, String(family.familyId), context);
      if (selected.instruction_id !== id) throw new Error(`family get mismatch: ${id}`);
      const composed = catalogCompose(loadedCatalog, loadedInstructions, { required_ids: [String(family.familyId)], applicabilityContext: context });
      if (!composed.instructions.some(item => item.instruction_id === id)) throw new Error(`family compose omitted variant: ${id}`);
    }
  }
  const snapshotPath = join(options.batchDir, 'fidelity-before.json');
  const snapshot = JSON.parse(await readFile(snapshotPath, 'utf8')) as Record<string, string>;
  const currentFidelity = await fidelityHashes(options.root);
  if (!admissionMode) {
    if (JSON.stringify(snapshot) !== JSON.stringify(currentFidelity)) throw new Error('fidelity receipt hashes changed');
  } else {
    for (const [key, value] of Object.entries(snapshot)) if (currentFidelity[key] !== value) throw new Error(`fidelity receipt changed: ${key}`);
    for (const [key, value] of declaredFidelity) {
      if (key in snapshot) throw new Error(`admission fidelity artifact already existed before apply: ${key}`);
      if (currentFidelity[key] !== value) throw new Error(`admission fidelity artifact missing or hash mismatch: ${key}`);
    }
    for (const key of Object.keys(currentFidelity)) if (!(key in snapshot) && !declaredFidelity.has(key)) throw new Error(`unexpected new fidelity artifact: ${key}`);
  }
  return { outcome: 'verified', planSha256: plan.planSha256, catalogCount: catalogEntries.length, mapBindings: bindings,
    familyCount: families.length, variantCount: variants.length, checkCorpusIssues: issues.length,
    variantBodies: admissionMode ? 'hash-verified' : 'byte-identical', admittedVariants: admissions.length,
    nonFamilyInstructions: 'unchanged', fidelityReceipts: admissionMode ? 'extended' : 'unchanged', batchDir: options.batchDir };
}

export async function runSbvfVerifyCli(values: string[], output: { stdout: (value: string) => void; stderr: (value: string) => void }): Promise<number> {
  try { const result = await verify(parseArgs(values)); output.stdout(`${JSON.stringify(result, null, 2)}\n`); return 0; }
  catch (error) { output.stderr(`sbvf-verify: ${error instanceof Error ? error.message : String(error)}\n`); return 1; }
}
export async function startSbvfVerifyEntrypoint(argv: string[], output: { stdout: (value: string) => void; stderr: (value: string) => void }, setExitCode: (code: number) => void): Promise<boolean> {
  if (argv[1] === undefined || resolve(argv[1]) !== fileURLToPath(import.meta.url)) return false;
  setExitCode(await runSbvfVerifyCli(argv.slice(2), output)); return true;
}
export function setSbvfVerifyExitCode(code: number): void { process.exitCode = code; }
void startSbvfVerifyEntrypoint(process.argv, { stdout: process.stdout.write.bind(process.stdout), stderr: process.stderr.write.bind(process.stderr) }, setSbvfVerifyExitCode);
