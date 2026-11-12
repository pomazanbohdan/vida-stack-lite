import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { applyPreparedBatch, prepareTargetBatch, type PreparedBatch, type PreparedTargetInput } from './convert.ts';
import { sealArtifact } from './source-packets.ts';
import { validateAgainstSchema, type Schema } from '../skills/vp-mode/scripts/schema.ts';

type Dict = Record<string, unknown>;
const sha = (bytes: Uint8Array | string): string => createHash('sha256').update(bytes).digest('hex');
const stable = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;
const isRecord = (value: unknown): value is Dict => typeof value === 'object' && value !== null && !Array.isArray(value);
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
type Target = { path: string; before: string | null; after: string | null; staged: { path: string; sha256: string } | null; backup: { path: string; sha256: string } | null };
export type Forward = { schema: 'VPPreparedBatch/v1'; root: string; targets: Target[]; manifest: { path: string; sha256: string } };
type Options = { batchDir: string; review?: string; staging?: string; apply: boolean };

function parseArgs(values: string[]): Options {
  const options: Partial<Options> = { apply: false };
  for (let index = 0; index < values.length; index += 1) {
    const flag = values[index]!;
    if (flag === '--apply') { options.apply = true; continue; }
    const value = values[++index];
    if (value === undefined || value.startsWith('--')) throw new Error(`${flag} requires a value`);
    if (flag === '--batch-dir') options.batchDir = resolve(value);
    else if (flag === '--review') options.review = resolve(value);
    else if (flag === '--staging') options.staging = resolve(value);
    else throw new Error(`unknown argument: ${flag}`);
  }
  if (options.batchDir === undefined) throw new Error('--batch-dir is required');
  if (options.apply && options.review === undefined) throw new Error('--review is required with --apply');
  return options as Options;
}

async function readForward(batchDir: string): Promise<{ forward: Forward; stageRoot: string }> {
  const path = join(batchDir, 'plan.json');
  const bytes = await readFile(path);
  const forward = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as Forward;
  if (!isRecord(forward) || forward.schema !== 'VPPreparedBatch/v1' || !Array.isArray(forward.targets) || typeof forward.root !== 'string') throw new Error('invalid forward batch manifest');
  forward.manifest = { path: 'plan.json', sha256: sha(bytes) };
  const stageRoot = dirname(batchDir);
  if (resolve(forward.root) === stageRoot || resolve(forward.root).startsWith(`${stageRoot}${sep}`)) throw new Error('forward product root overlaps rollback staging');
  return { forward, stageRoot };
}

async function backupBytes(stageRoot: string, ref: { path: string; sha256: string }): Promise<Buffer> {
  const path = resolve(stageRoot, ref.path); const rel = relative(resolve(stageRoot), path);
  if (rel === '..' || rel.startsWith(`..${sep}`) || resolve(rel) === resolve('')) throw new Error('forward before-image escapes staging root');
  const bytes = await readFile(path);
  if (sha(bytes) !== ref.sha256) throw new Error(`forward before-image hash mismatch: ${ref.path}`);
  return bytes;
}

async function reverseInputs(forward: Forward, stageRoot: string): Promise<PreparedTargetInput[]> {
  const targets: PreparedTargetInput[] = [];
  const priority = (target: Target): number => target.before === null ? 0 : target.path === 'catalog.json' ? 4 : target.path === 'corpus-map.json' ? 3 : target.path.startsWith('instructions/') ? 2 : 1;
  const ordered = [...forward.targets].sort((left, right) => priority(left) - priority(right) || forward.targets.indexOf(left) - forward.targets.indexOf(right));
  for (const target of ordered) {
    if (target.before === null) targets.push({ path: target.path, bytes: null });
    else {
      if (target.backup === null || target.backup.sha256 !== target.before) throw new Error(`forward before-image reference missing: ${target.path}`);
      targets.push({ path: target.path, bytes: await backupBytes(stageRoot, target.backup) });
    }
  }
  return targets;
}

function reverseSha(forward: Forward, targets: PreparedTargetInput[]): string {
  const logical = { schema: 'SBVFRollbackPlan/v1', forwardManifestSha256: forward.manifest.sha256,
    targets: targets.map(target => ({ path: target.path, afterSha256: target.bytes === null ? null : sha(target.bytes) })) };
  return sha(stable(logical));
}

async function readReview(path: string, expected: string): Promise<Dict> {
  const review: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await readFile(path)));
  const schema: Schema = { type: 'object', required: ['schema', 'planSha256', 'verdict', 'reviewer', 'pointer'], additionalProperties: false,
    properties: { schema: { const: 'VPPreparedBatchReview/v1' }, planSha256: { const: expected }, verdict: { const: 'READY' }, reviewer: { type: 'string', minLength: 1 }, pointer: { type: 'string', minLength: 1 } } };
  const errors = validateAgainstSchema(review, schema);
  if (errors.length || !isRecord(review) || String(review.reviewer).trim() === '' || String(review.pointer).trim() === '') throw new Error(`review is invalid or does not bind reverse plan SHA ${expected}: ${errors.join('; ')}`);
  return review;
}

async function previousReceipt(staging: string): Promise<'partial-or-unknown' | 'applied' | 'no-change' | undefined> {
  let known: 'applied' | 'no-change' | undefined;
  let directories: Array<{ name: string; isDirectory(): boolean }> = [];
  try { directories = await readdir(staging, { withFileTypes: true }); } catch { directories = []; }
  for (const dir of directories) {
    if (!dir.isDirectory()) continue;
    let files: string[] = [];
    try { files = await readdir(join(staging, dir.name)); } catch { files = []; }
    for (const file of files) {
      if (!String(file).startsWith('apply-') || !String(file).endsWith('.json')) continue;
      try {
        const receipt: unknown = JSON.parse(await readFile(join(staging, dir.name, String(file)), 'utf8'));
        if (isRecord(receipt) && receipt.schema === 'VPPreparedBatchReceipt/v1' && receipt.kind === 'partial-or-unknown') return 'partial-or-unknown';
        if (isRecord(receipt) && receipt.schema === 'VPPreparedBatchReceipt/v1' && (receipt.kind === 'applied' || receipt.kind === 'no-change')) known = receipt.kind;
      } catch { /* malformed evidence is ignored; apply's own fenced journal remains authoritative */ }
    }
  }
  return known;
}

export async function verifyRestoredState(forward: Forward, stageRoot: string): Promise<boolean> {
  for (const target of forward.targets) {
    const path = resolve(forward.root, target.path); const rel = relative(resolve(forward.root), path);
    if (rel === '..' || rel.startsWith(`..${sep}`)) throw new Error(`forward target escapes product root: ${target.path}`);
    try {
      const bytes = await readFile(path);
      if (target.before === null || sha(bytes) !== target.before) return false;
    } catch (error) {
      if (isRecord(error) && error.code === 'ENOENT' && target.before === null) continue;
      return false;
    }
    if (target.before !== null) {
      if (target.backup === null || sha(await backupBytes(stageRoot, target.backup)) !== target.before) return false;
    }
  }
  return true;
}

export async function runSbvfRollbackCli(values: string[], output: { stdout: (value: string) => void; stderr: (value: string) => void }): Promise<number> {
  try {
    const options = parseArgs(values); const { forward, stageRoot } = await readForward(options.batchDir);
    const inputs = await reverseInputs(forward, stageRoot); const planSha256 = reverseSha(forward, inputs);
    const targets = inputs.map(target => ({ path: target.path, afterSha256: target.bytes === null ? null : sha(target.bytes) }));
    if (!options.apply) { output.stdout(stable({ outcome: 'dry-run', planSha256, targets, forwardBatchDir: options.batchDir })); return 0; }
    const review = await readReview(options.review!, planSha256);
    const staging = options.staging ?? join(forward.root, '.tmp', 'sbvf', `rollback-${planSha256}`);
    const prior = await previousReceipt(staging);
    if (prior === 'partial-or-unknown') throw new Error('rollback retry is fenced by a prior partial-or-unknown receipt');
    const alreadyRestored = await verifyRestoredState(forward, stageRoot);
    if (prior !== undefined && !alreadyRestored) throw new Error('rollback retry is fenced by a prior receipt with changed target state');
    if (alreadyRestored) {
      output.stdout(stable({ outcome: 'no-change', planSha256, targets, forwardBatchDir: options.batchDir, restored: true })); return 0;
    }
    const batch: PreparedBatch = await prepareTargetBatch(inputs, { root: forward.root, stagingRoot: staging });
    const batchDir = dirname(batch.manifest.path);
    const reviewRef = await sealArtifact(batch.directory, `${batchDir}/sbvf-review.json`, review);
    const preparedReview = await sealArtifact(batch.directory, `${batchDir}/prepared-batch-review.json`, { ...review, planSha256: batch.manifest.sha256 });
    const outcome = await applyPreparedBatch(batch, { review: preparedReview,
      observe: async () => ({ kind: 'observed', writer: 'sbvf-rollback', reviewPointer: String(review.pointer) }) });
    const restored = (outcome.kind === 'applied' || outcome.kind === 'no-change') && await verifyRestoredState(forward, stageRoot);
    const finalOutcome = restored ? outcome.kind : outcome.kind === 'partial-or-unknown' ? outcome.kind : 'partial-or-unknown';
    output.stdout(stable({ outcome: finalOutcome, planSha256, targets, restored, receiptPath: join(batch.directory, outcome.receipt.path),
      reverseBatchDir: join(batch.directory, batchDir), reviewPath: options.review, reviewArtifact: reviewRef }));
    return finalOutcome === 'partial-or-unknown' || finalOutcome === 'no-write-conflict' ? 1 : 0;
  } catch (error) { output.stderr(`sbvf-rollback: ${error instanceof Error ? error.message : String(error)}\n`); return 1; }
}

export async function startSbvfRollbackEntrypoint(argv: string[], output: { stdout: (value: string) => void; stderr: (value: string) => void }, setExitCode: (code: number) => void): Promise<boolean> {
  if (argv[1] === undefined || resolve(argv[1]) !== fileURLToPath(import.meta.url)) return false;
  setExitCode(await runSbvfRollbackCli(argv.slice(2), output)); return true;
}
export function setSbvfRollbackExitCode(code: number): void { process.exitCode = code; }
void startSbvfRollbackEntrypoint(process.argv, { stdout: process.stdout.write.bind(process.stdout), stderr: process.stderr.write.bind(process.stderr) }, setSbvfRollbackExitCode);
