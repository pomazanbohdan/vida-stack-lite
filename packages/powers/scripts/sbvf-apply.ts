import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, relative, sep } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { applyPreparedBatch, type ApplyOutcome } from './convert.ts';
import { sealArtifact } from './source-packets.ts';
import { buildSbvfPlan, buildSbvfPlanWithBatch } from './sbvf-plan.ts';
import { validateAgainstSchema, type Schema } from '../skills/vp-mode/scripts/schema.ts';

type Dict = Record<string, unknown>;
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sha = (bytes: Uint8Array | string): string => createHash('sha256').update(bytes).digest('hex');
const stable = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;
const isRecord = (value: unknown): value is Dict => typeof value === 'object' && value !== null && !Array.isArray(value);

type Options = { root: string; manifest: string; admissions?: string; asOf: string; expectedPlanSha: string; review: string; staging?: string; apply: boolean };
function parseArgs(values: string[]): Options {
  const options: Partial<Options> = { root: packageRoot, manifest: join(packageRoot, 'config', 'sbvf-families.json'), apply: false };
  for (let index = 0; index < values.length; index += 1) {
    const flag = values[index]!;
    if (flag === '--apply') { options.apply = true; continue; }
    const value = values[++index];
    if (value === undefined || value.startsWith('--')) throw new Error(`${flag} requires a value`);
    if (flag === '--root') options.root = resolve(value);
    else if (flag === '--manifest') options.manifest = resolve(value);
    else if (flag === '--admissions') options.admissions = resolve(value);
    else if (flag === '--as-of') options.asOf = value;
    else if (flag === '--expected-plan-sha') options.expectedPlanSha = value;
    else if (flag === '--review') options.review = resolve(value);
    else if (flag === '--staging') options.staging = resolve(value);
    else throw new Error(`unknown argument: ${flag}`);
  }
  if (options.asOf === undefined || options.expectedPlanSha === undefined || options.review === undefined) throw new Error('--as-of, --expected-plan-sha and --review are required');
  if (!/^[0-9a-f]{64}$/u.test(options.expectedPlanSha)) throw new Error('--expected-plan-sha must be a lowercase SHA-256');
  return options as Options;
}

async function readReview(path: string, expectedPlanSha: string): Promise<Dict> {
  const review: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await readFile(path)));
  const schema: Schema = { type: 'object', required: ['schema', 'planSha256', 'verdict', 'reviewer', 'pointer'], additionalProperties: false, properties: {
    schema: { const: 'VPPreparedBatchReview/v1' }, planSha256: { const: expectedPlanSha }, verdict: { const: 'READY' }, reviewer: { type: 'string', minLength: 1 }, pointer: { type: 'string', minLength: 1 },
  } };
  const errors = validateAgainstSchema(review, schema);
  if (errors.length || !isRecord(review) || String(review.reviewer).trim() === '' || String(review.pointer).trim() === '') throw new Error(`review is invalid or does not bind plan SHA ${expectedPlanSha}: ${errors.join('; ')}`);
  return review;
}

export async function snapshotSbvfFidelity(root: string): Promise<Record<string, string>> {
  const directory = join(root, 'fidelity');
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
  await visit(directory);
  return result;
}

async function priorApplyResult(staging: string): Promise<{ kind: string; receiptPath: string } | undefined> {
  let known: { kind: string; receiptPath: string } | undefined;
  let directories: Array<{ name: string; isDirectory(): boolean }> = [];
  try { directories = await readdir(staging, { withFileTypes: true }); } catch { directories = []; }
  for (const directory of directories) {
    if (!directory.isDirectory()) continue;
    const child = join(staging, directory.name);
    let names: string[] = [];
    try { names = await readdir(child); } catch { names = []; }
    for (const name of names) {
      if (!String(name).startsWith('apply-') || !String(name).endsWith('.json')) continue;
      try {
        const receipt: unknown = JSON.parse(await readFile(join(child, String(name)), 'utf8'));
        if (isRecord(receipt) && receipt.schema === 'VPPreparedBatchReceipt/v1' && typeof receipt.kind === 'string') {
          const found = { kind: receipt.kind, receiptPath: join(child, String(name)) };
          if (found.kind === 'partial-or-unknown') return found;
          if (known === undefined || found.kind === 'applied' || found.kind === 'no-change') known = found;
        }
      } catch { /* invalid evidence cannot authorize a retry or claim an outcome */ }
    }
  }
  return known;
}

async function matchesPlanTargets(root: string, plan: Dict, field: 'beforeSha256' | 'afterSha256'): Promise<boolean> {
  for (const target of plan.targets as Dict[]) {
    if (typeof target.path !== 'string') return false;
    const expected = target[field];
    try { if (sha(await readFile(join(root, target.path))) !== expected) return false; }
    catch (error) { if (isRecord(error) && error.code === 'ENOENT' && expected === null) continue; return false; }
  }
  return true;
}

async function readStoredPlan(path: string, expectedPlanSha: string): Promise<Dict> {
  const plan: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await readFile(path)));
  if (!isRecord(plan)) throw new Error('stored SBVF plan is invalid');
  const { planSha256, stagingPath: _stagingPath, targetPaths: _targetPaths, ...logicalPlan } = plan;
  if (planSha256 !== expectedPlanSha || sha(stable(logicalPlan)) !== expectedPlanSha) throw new Error('stored SBVF plan SHA mismatch');
  return plan;
}

function counts(plan: Dict): Dict {
  return { families: Array.isArray(plan.families) ? plan.families.length : 0, variants: Array.isArray(plan.variants) ? plan.variants.length : 0,
    targets: Array.isArray(plan.targets) ? plan.targets.length : 0, deletes: Array.isArray(plan.deleteList) ? plan.deleteList.length : 0,
    catalogBefore: isRecord(plan.catalogDelta) ? plan.catalogDelta.beforeCount : null, catalogAfter: isRecord(plan.catalogDelta) ? plan.catalogDelta.afterCount : null,
    mapSingletonToFamily: isRecord(plan.bindingChanges) ? plan.bindingChanges.singletonToFamily : null,
    deferredToFamily: isRecord(plan.bindingChanges) ? plan.bindingChanges.deferredToFamily ?? 0 : 0,
    admittedVariants: isRecord(plan.catalogDelta) && Array.isArray(plan.catalogDelta.admittedVariants) ? plan.catalogDelta.admittedVariants.length : 0,
    admissions: Array.isArray(plan.admissions) ? plan.admissions.length : 0 };
}

async function run(values: string[], output: { stdout: (value: string) => void; stderr: (value: string) => void }): Promise<number> {
  try {
    const options = parseArgs(values);
    const staging = options.staging ?? join(options.root, '.tmp', 'sbvf', `apply-${options.expectedPlanSha}`);
    const previous = options.apply ? await priorApplyResult(staging) : undefined;
    if (previous?.kind === 'partial-or-unknown') throw new Error('apply retry is fenced by a prior partial-or-unknown receipt');
    if (previous !== undefined && (previous.kind === 'applied' || previous.kind === 'no-change')) {
      const plan = await readStoredPlan(join(dirname(previous.receiptPath), 'sbvf-plan.json'), options.expectedPlanSha);
      await readReview(options.review, options.expectedPlanSha);
      const outcome = await matchesPlanTargets(options.root, plan, 'afterSha256') ? 'no-change' : 'no-write-conflict';
      output.stdout(stable({ outcome, planSha256: plan.planSha256, targets: plan.targets, deleteList: plan.deleteList, counts: counts(plan), receiptPath: previous.receiptPath, reviewPath: options.review }));
      return outcome === 'no-write-conflict' ? 1 : 0;
    }
    const plan = await buildSbvfPlan(options.root, options.manifest, options.asOf, undefined, options.admissions);
    if (plan.planSha256 !== options.expectedPlanSha) throw new Error(`plan SHA mismatch: expected ${options.expectedPlanSha}, observed ${String(plan.planSha256)}`);
    const review = await readReview(options.review, options.expectedPlanSha);
    if (!options.apply) {
      output.stdout(stable({ outcome: 'dry-run', planSha256: plan.planSha256, targets: plan.targets, deleteList: plan.deleteList, counts: counts(plan) }));
      return 0;
    }
    const built = await buildSbvfPlanWithBatch(options.root, options.manifest, options.asOf, staging, options.admissions);
    if (built.plan.planSha256 !== options.expectedPlanSha) throw new Error(`prepared plan SHA changed: expected ${options.expectedPlanSha}, observed ${String(built.plan.planSha256)}`);
    const batchPath = dirname(built.batch.manifest.path);
    const reviewDirectory = join(built.batch.directory, batchPath);
    await mkdir(reviewDirectory, { recursive: true });
    const planPath = join(reviewDirectory, 'sbvf-plan.json');
    await writeFile(planPath, stable(built.plan), { flag: 'wx' });
    const externalReview = await sealArtifact(built.batch.directory, `${batchPath}/sbvf-review.json`, review);
    const fidelitySnapshot = await snapshotSbvfFidelity(options.root);
    await writeFile(join(reviewDirectory, 'fidelity-before.json'), stable(fidelitySnapshot), { flag: 'wx' });
    // The public review binds the deterministic SBVF plan; this derived review binds its live PreparedBatch carrier.
    const preparedReview = await sealArtifact(built.batch.directory, `${batchPath}/prepared-batch-review.json`, {
      ...review, planSha256: built.batch.manifest.sha256,
    });
    const outcome: ApplyOutcome = await applyPreparedBatch(built.batch, {
      review: preparedReview,
      observe: async () => ({ kind: 'observed', writer: 'sbvf-apply', reviewPointer: String(review.pointer) }),
    });
    output.stdout(stable({ outcome: outcome.kind, planSha256: built.plan.planSha256, targets: built.plan.targets, deleteList: built.plan.deleteList,
      counts: counts(built.plan), planPath, receiptPath: join(built.batch.directory, outcome.receipt.path), reviewPath: options.review,
      appliedBatchDir: join(built.batch.directory, batchPath), externalReview: { path: externalReview.path, sha256: externalReview.sha256 } }));
    return outcome.kind === 'no-write-conflict' || outcome.kind === 'partial-or-unknown' ? 1 : 0;
  } catch (error) {
    output.stderr(`sbvf-apply: ${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

export async function runSbvfApplyCli(values: string[], output: { stdout: (value: string) => void; stderr: (value: string) => void }): Promise<number> {
  return run(values, output);
}

export async function startSbvfApplyEntrypoint(argv: string[], output: { stdout: (value: string) => void; stderr: (value: string) => void }, setExitCode: (code: number) => void): Promise<boolean> {
  if (argv[1] === undefined || resolve(argv[1]) !== fileURLToPath(import.meta.url)) return false;
  setExitCode(await runSbvfApplyCli(argv.slice(2), output));
  return true;
}

export function setSbvfApplyExitCode(code: number): void { process.exitCode = code; }
void startSbvfApplyEntrypoint(process.argv, { stdout: process.stdout.write.bind(process.stdout), stderr: process.stderr.write.bind(process.stderr) }, setSbvfApplyExitCode);
