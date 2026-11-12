import { afterEach, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkCorpus } from '../scripts/check-corpus.ts';
import { buildSbvfPlan } from '../scripts/sbvf-plan.ts';
import { runSbvfApplyCli, setSbvfApplyExitCode, snapshotSbvfFidelity, startSbvfApplyEntrypoint } from '../scripts/sbvf-apply.ts';
import { runSbvfRollbackCli, setSbvfRollbackExitCode, startSbvfRollbackEntrypoint, verifyRestoredState } from '../scripts/sbvf-rollback.ts';
import { fidelityHashes, runSbvfVerifyCli, setSbvfVerifyExitCode, startSbvfVerifyEntrypoint } from '../scripts/sbvf-verify.ts';
import { buildSbvfFixtureCorpus } from './sbvf-fixture-corpus.ts';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const asOf = '2026-11-07T00:00:00Z';
const rehearsalAsOf = '2026-11-20T00:00:00Z';

const cleanup: string[] = [];
const sha = (value: Uint8Array | string): string => createHash('sha256').update(value).digest('hex');
const stable = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;
const jsonOutput = (values: string[]): unknown => JSON.parse(values.at(-1) ?? '{}');
afterEach(async () => { await Promise.all(cleanup.splice(0).map(path => rm(path, { recursive: true, force: true }))); });

async function snapshot(root: string): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const walk = async (path: string, prefix: string): Promise<void> => {
    let entries;
    try { entries = await readdir(path, { withFileTypes: true }); }
    catch (error) { if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') return; throw error; }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
      const child = join(path, entry.name); const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await walk(child, rel);
      else if (entry.isFile()) result[rel] = sha(await readFile(child));
    }
  };
  for (const name of ['catalog.json', 'corpus-map.json', 'instructions', 'fidelity']) {
    const path = join(root, name);
    try { if ((await stat(path)).isDirectory()) await walk(path, name); else result[name] = sha(await readFile(path)); }
    catch (error) { if (!(typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT')) throw error; }
  }
  return result;
}

test('apply rejects malformed inputs and plan/review mismatch before staging', async () => {
  const stdout: string[] = []; const stderr: string[] = [];
  const output = { stdout: (value: string) => stdout.push(value), stderr: (value: string) => stderr.push(value) };
  const root = await mkdtemp(join(packageRoot, '.tmp', 'sbvf-helper-')); cleanup.push(root);
  expect(await snapshotSbvfFidelity(root)).toEqual({});
  expect(await fidelityHashes(root)).toEqual({});
  expect(await verifyRestoredState({ schema: 'VPPreparedBatch/v1', root, targets: [{ path: 'missing.txt', before: 'a'.repeat(64), after: null, staged: null, backup: null }], manifest: { path: 'plan.json', sha256: 'b'.repeat(64) } }, root)).toBe(false);
  expect(await runSbvfApplyCli(['--root'], output)).toBe(1);
  expect(stderr.at(-1)).toContain('requires a value');
  expect(await runSbvfApplyCli(['--unknown', 'x'], output)).toBe(1);
  expect(stderr.at(-1)).toContain('unknown argument');
  expect(await runSbvfApplyCli(['--as-of', asOf, '--expected-plan-sha', 'bad', '--review', 'review.json'], output)).toBe(1);
  expect(stderr.at(-1)).toContain('lowercase SHA-256');
  expect(await runSbvfRollbackCli([], output)).toBe(1);
  expect(stderr.at(-1)).toContain('--batch-dir is required');
  expect(await runSbvfRollbackCli(['--batch-dir', 'missing', '--unknown', 'x'], output)).toBe(1);
  expect(stderr.at(-1)).toContain('unknown argument');
  expect(await runSbvfVerifyCli([], output)).toBe(1);
  expect(stderr.at(-1)).toContain('--plan and --batch-dir are required');
  expect(await runSbvfVerifyCli(['--unknown', 'x'], output)).toBe(1);
  expect(stderr.at(-1)).toContain('unknown argument');
  const applyEntrypoint = fileURLToPath(new URL('../scripts/sbvf-apply.ts', import.meta.url));
  const rollbackEntrypoint = fileURLToPath(new URL('../scripts/sbvf-rollback.ts', import.meta.url));
  const verifyEntrypoint = fileURLToPath(new URL('../scripts/sbvf-verify.ts', import.meta.url));
  const codes: number[] = [];
  expect(await startSbvfApplyEntrypoint(['bun', applyEntrypoint, '--root'], output, code => codes.push(code))).toBe(true);
  expect(await startSbvfRollbackEntrypoint(['bun', rollbackEntrypoint, '--unknown', 'x'], output, code => codes.push(code))).toBe(true);
  expect(await startSbvfVerifyEntrypoint(['bun', verifyEntrypoint, '--unknown', 'x'], output, code => codes.push(code))).toBe(true);
  expect(codes).toEqual([1, 1, 1]);
});

test('pilot apply, verify, tamper detection, rollback and no-op rehearsal stay on a .tmp copy', async () => {
  const tmpRoot = join(packageRoot, '.tmp', 'sbvf', 'tests'); await mkdir(tmpRoot, { recursive: true });
  const area = await mkdtemp(join(tmpRoot, 'p4b-')); cleanup.push(area);
  const beforeReal = await snapshot(packageRoot);
  const root = join(area, 'product');
  await buildSbvfFixtureCorpus(root);
  const manifest = join(area, 'family.json');
  await writeFile(manifest, stable({ schema: 'SBVFFamilyManifest/v1', families: [{
    family_id: 'family-fixture-rehearsal', title: 'Fixture rehearsal family', summary: 's', rationale: 'r',
    variants: ['uupm-fixture-vue-composition', 'uupm-fixture-react-state'], approved_by: 'devin', approved_at: rehearsalAsOf }] }));
  const plan = await buildSbvfPlan(root, manifest, rehearsalAsOf);
  expect(plan.planSha256).toMatch(/^[0-9a-f]{64}$/);
  const planSha256 = String(plan.planSha256);
  const planPath = join(area, 'pilot-plan.json'); await writeFile(planPath, stable(plan));
  const reviewPath = join(area, 'review.json');
  await writeFile(reviewPath, stable({ schema: 'VPPreparedBatchReview/v1', planSha256, verdict: 'READY', reviewer: 'rehearsal', pointer: planPath }));
  const staging = join(root, '.tmp', 'sbvf', `apply-${planSha256}`);
  const applyArgs = ['--root', root, '--manifest', manifest, '--as-of', rehearsalAsOf];
  const stdout: string[] = []; const stderr: string[] = [];
  const output = { stdout: (value: string) => stdout.push(value), stderr: (value: string) => stderr.push(value) };
  const stagingCreated = async (): Promise<boolean> => readdir(join(root, '.tmp')).then(items => items.includes('sbvf'));

  expect(await runSbvfApplyCli([...applyArgs, '--expected-plan-sha', '0'.repeat(64), '--review', reviewPath, '--apply', '--staging', staging], output)).toBe(1);
  expect(stderr.at(-1)).toContain('plan SHA mismatch');
  expect(await stagingCreated()).toBe(false);
  expect(await runSbvfApplyCli([...applyArgs, '--expected-plan-sha', planSha256, '--review', join(area, 'missing.json'), '--apply', '--staging', staging], output)).toBe(1);
  expect(stderr.at(-1)).toContain('ENOENT');
  const wrongReview = join(area, 'wrong-review.json');
  await writeFile(wrongReview, stable({ schema: 'VPPreparedBatchReview/v1', planSha256: '0'.repeat(64), verdict: 'READY', reviewer: 'rehearsal', pointer: planPath }));
  expect(await runSbvfApplyCli([...applyArgs, '--expected-plan-sha', planSha256, '--review', wrongReview, '--apply', '--staging', staging], output)).toBe(1);
  expect(stderr.at(-1)).toContain('review is invalid');
  expect(await stagingCreated()).toBe(false);

  expect(await runSbvfApplyCli([...applyArgs, '--expected-plan-sha', planSha256, '--review', reviewPath, '--staging', staging], output)).toBe(0);
  expect(jsonOutput(stdout) as { outcome: string }).toMatchObject({ outcome: 'dry-run', planSha256: planSha256 });
  expect(await stagingCreated()).toBe(false);
  expect(await runSbvfApplyCli([...applyArgs, '--expected-plan-sha', planSha256, '--review', reviewPath, '--apply', '--staging', staging], output)).toBe(0);
  const applied = jsonOutput(stdout) as { outcome: string; appliedBatchDir: string; planPath: string };
  expect(applied.outcome).toBe('applied');
  expect(checkCorpus(root)).toHaveLength(0);
  expect(JSON.parse(await readFile(join(root, 'catalog.json'), 'utf8')).instructions).toHaveLength((plan.catalogDelta as { afterCount: number }).afterCount);
  expect(await runSbvfApplyCli([...applyArgs, '--expected-plan-sha', planSha256, '--review', reviewPath, '--apply', '--staging', staging], output)).toBe(0);
  expect(jsonOutput(stdout) as { outcome: string }).toMatchObject({ outcome: 'no-change' });

  const verifyCode = await runSbvfVerifyCli(['--root', root, '--plan', applied.planPath, '--batch-dir', applied.appliedBatchDir], output);
  if (verifyCode !== 0) throw new Error(stderr.at(-1));
  expect(verifyCode).toBe(0);
  expect(jsonOutput(stdout) as { outcome: string; fidelityReceipts: string }).toMatchObject({ outcome: 'verified', fidelityReceipts: 'unchanged' });
  const family = (plan.families as Array<{ path: string }>)[0]!;
  const familyPath = join(root, family.path); const familyBytes = await readFile(familyPath);
  await writeFile(familyPath, Buffer.concat([familyBytes, Buffer.from('tamper\n')]));
  expect(await runSbvfVerifyCli(['--root', root, '--plan', applied.planPath, '--batch-dir', applied.appliedBatchDir], output)).toBe(1);
  expect(stderr.at(-1)).toContain('check-corpus reported issues');
  await writeFile(familyPath, familyBytes);
  expect(await runSbvfVerifyCli(['--root', root, '--plan', applied.planPath, '--batch-dir', applied.appliedBatchDir], output)).toBe(0);

  expect(await runSbvfRollbackCli(['--batch-dir', applied.appliedBatchDir], output)).toBe(0);
  const reverse = jsonOutput(stdout) as { planSha256: string };
  const rollbackReview = join(area, 'rollback-review.json');
  await writeFile(rollbackReview, stable({ schema: 'VPPreparedBatchReview/v1', planSha256: reverse.planSha256, verdict: 'READY', reviewer: 'rehearsal-rollback', pointer: planPath }));
  expect(await runSbvfRollbackCli(['--batch-dir', applied.appliedBatchDir, '--review', rollbackReview, '--staging', join(root, '.tmp', 'sbvf', `rollback-${reverse.planSha256}`), '--apply'], output)).toBe(0);
  expect(jsonOutput(stdout) as { outcome: string; restored: boolean }).toMatchObject({ outcome: 'applied', restored: true });
  expect(checkCorpus(root)).toHaveLength(0);
  expect(await runSbvfRollbackCli(['--batch-dir', applied.appliedBatchDir, '--review', rollbackReview, '--staging', join(root, '.tmp', 'sbvf', `rollback-${reverse.planSha256}`), '--apply'], output)).toBe(0);
  expect(jsonOutput(stdout) as { outcome: string; restored: boolean }).toMatchObject({ outcome: 'no-change', restored: true });
  const rollbackStaging = join(root, '.tmp', 'sbvf', `rollback-${reverse.planSha256}`);
  const rollbackMalformed = join(rollbackStaging, 'prior-unknown'); await mkdir(rollbackMalformed, { recursive: true });
  await writeFile(join(rollbackMalformed, 'apply-bad.json'), 'not-json');
  expect(await runSbvfRollbackCli(['--batch-dir', applied.appliedBatchDir, '--review', rollbackReview, '--staging', rollbackStaging, '--apply'], output)).toBe(0);
  expect(jsonOutput(stdout) as { outcome: string }).toMatchObject({ outcome: 'no-change' });
  const rollbackUnknown = join(rollbackStaging, 'prior-unknown'); await mkdir(rollbackUnknown, { recursive: true });
  await writeFile(join(rollbackUnknown, 'apply-unknown.json'), stable({ schema: 'VPPreparedBatchReceipt/v1', kind: 'partial-or-unknown' }));
  expect(await runSbvfRollbackCli(['--batch-dir', applied.appliedBatchDir, '--review', rollbackReview, '--staging', rollbackStaging, '--apply'], output)).toBe(1);
  expect(stderr.at(-1)).toContain('rollback retry is fenced');
  const unknownDir = join(staging, 'prior-unknown'); await mkdir(unknownDir, { recursive: true });
  await writeFile(join(unknownDir, 'apply-bad.json'), 'not-json');
  await writeFile(join(unknownDir, 'apply-unknown.json'), stable({ schema: 'VPPreparedBatchReceipt/v1', kind: 'partial-or-unknown' }));
  expect(await runSbvfApplyCli([...applyArgs, '--expected-plan-sha', planSha256, '--review', reviewPath, '--apply', '--staging', staging], output)).toBe(1);
  expect(stderr.at(-1)).toContain('apply retry is fenced');
  expect(await snapshot(packageRoot)).toEqual(beforeReal);
}, 300_000);

test('entrypoint wrappers execute through a real process', () => {
  for (const script of ['sbvf-apply.ts', 'sbvf-rollback.ts', 'sbvf-verify.ts']) {
    const result = spawnSync(process.execPath, [join(packageRoot, 'scripts', script), '--unknown', 'x'], { encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(String(result.stderr)).toContain('unknown argument');
  }
});

test('entrypoint exit-code setters are callable', () => {
  setSbvfApplyExitCode(0);
  setSbvfRollbackExitCode(0);
  setSbvfVerifyExitCode(0);
  expect(process.exitCode).toBe(0);
});
