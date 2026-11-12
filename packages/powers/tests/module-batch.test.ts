import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { describe, expect, test } from 'bun:test';
import { composeParityIssue, rollbackModulePlan } from '../scripts/module-migration.ts';
import { modulePilots } from '../scripts/module-migration.ts';
import { CatalogError } from '../skills/vp-mode/scripts/catalog.ts';
import { parseFrontmatter } from '../skills/vp-mode/scripts/frontmatter.ts';
import { parseModuleAtoms, parseModuleSections } from '../skills/vp-mode/scripts/modules.ts';
import { chunkAtomIds, applyModuleBatch, handleModuleBatchCliError, planModuleBatch, verifyModuleBatch, runModuleBatchCli } from '../scripts/module-batch.ts';

const powersRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = resolve(powersRoot, '../..');
const scratchRoot = join(powersRoot, '.tmp', 'module-batch-tests');
const asOf = '2026-11-08T12:00:00.000Z';
const sha = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

function restoreDonor(root: string, donor: string): void {
  const catalogPath = join(root, 'catalog.json');
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8')) as { instructions: Array<{ instruction_id: string; path: string; sha256: string }> };
  const restored: Array<{ instruction_id: string; path: string; sha256: string }> = [];
  const removed = new Set<string>();
  for (const entry of catalog.instructions) {
    if (!entry.instruction_id.startsWith('module-')) continue;
    const modulePath = join(root, entry.path);
    const parsed = parseFrontmatter(readFileSync(modulePath, 'utf8'));
    const source = JSON.parse(String(parsed.data.source)) as { donor?: string };
    if (source.donor !== donor) continue;
    const records = parseModuleAtoms(String(parsed.data.atoms));
    for (const member of parseModuleSections(parsed.body, records, entry.instruction_id)) {
      writeFileSync(join(root, 'instructions', `${member.atom_id}.md`), member.file);
      restored.push({ instruction_id: member.atom_id, path: `instructions/${member.atom_id}.md`, sha256: member.file_sha256 });
    }
    removed.add(entry.instruction_id);
    rmSync(modulePath);
  }
  if (removed.size === 0) return;
  catalog.instructions = catalog.instructions
    .filter((entry) => !removed.has(entry.instruction_id))
    .concat(restored)
    .sort((left, right) => left.instruction_id < right.instruction_id ? -1 : left.instruction_id > right.instruction_id ? 1 : 0);
  writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
}
function copyProduct(name: string): string {
  mkdirSync(scratchRoot, { recursive: true });
  const root = mkdtempSync(join(scratchRoot, `copy-${name}-`));
  for (const entry of readdirSync(powersRoot, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.tmp') continue;
    cpSync(join(powersRoot, entry.name), join(root, entry.name), { recursive: entry.isDirectory() });
  }
  const donorsPath = join(root, 'donors.yaml');
  const donorManifest = readFileSync(donorsPath, 'utf8').replace('local_root: packages/powers/.tmp/donors', `local_root: ${resolve(powersRoot, '.tmp/donors').replaceAll('\\', '/')}`);
  writeFileSync(donorsPath, donorManifest);
  mkdirSync(join(root, '.tmp'), { recursive: true });
  symlinkSync(join(powersRoot, '.tmp', 'donors'), join(root, '.tmp', 'donors'), 'junction');
  restoreDonor(root, 'open-knowledge-format');
  return root;
}
function stage(name: string): string { mkdirSync(scratchRoot, { recursive: true }); return mkdtempSync(join(scratchRoot, `${name}-`)); }
function review(path: string, batchSha: string): string {
  const file = join(path, 'review.json');
  writeFileSync(file, `${JSON.stringify({ schema: 'VPPreparedBatchReview/v1', planSha256: batchSha, verdict: 'READY', reviewer: 'batch-reviewer', pointer: 'review:batch-plan' }, null, 2)}\n`);
  return file;
}
function hashReceipts(root: string, files: string[]): string {
  const digest = createHash('sha256');
  for (const file of files.filter(Boolean).sort()) digest.update(file).update(readFileSync(join(root, file)));
  return digest.digest('hex');
}

describe('module batch migration', () => {
  test('script entrypoint returns a JSON error for an unknown command', () => {
    const result = spawnSync(process.execPath, [join(powersRoot, 'scripts', 'module-batch.ts'), 'unknown'], { encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stderr).message).toBe('module-batch command must be plan, apply, or verify');
    const originalError = console.error; const originalExitCode = process.exitCode; const errors: string[] = [];
    console.error = (value?: unknown) => { errors.push(String(value)); };
    handleModuleBatchCliError(new Error('handled error'));
    expect(JSON.parse(errors[0] ?? '{}').message).toBe('handled error'); expect(process.exitCode).toBe(1);
    console.error = originalError; process.exitCode = originalExitCode ?? 0;
  });

  test('chunks groups at eight and leaves one-atom remainders singleton', () => {
    const ids = (count: number) => Array.from({ length: count }, (_, index) => `atom-${String(index).padStart(2, '0')}`);
    expect(chunkAtomIds(ids(29)).chunks.map((chunk) => chunk.length)).toEqual([8, 8, 8, 5]);
    expect(chunkAtomIds(ids(11)).chunks.map((chunk) => chunk.length)).toEqual([8, 3]);
    expect(chunkAtomIds(ids(14)).chunks.map((chunk) => chunk.length)).toEqual([8, 6]);
    expect(chunkAtomIds(ids(9))).toEqual({ chunks: [ids(8)], singleton: ['atom-08'] });
    expect(chunkAtomIds(ids(2))).toEqual({ chunks: [ids(2)], singleton: [] });
    expect(chunkAtomIds([])).toEqual({ chunks: [], singleton: [] });
  });

  test('plans deterministically, honors limit, skips packaged groups, and isolates donors', async () => {
    const root = copyProduct('plan'); const staging = stage('plan-stage');
    const first = await planModuleBatch({ root, staging, donor: 'open-knowledge-format', asOf });
    const second = await planModuleBatch({ root, staging: stage('plan-stage-repeat'), donor: 'open-knowledge-format', asOf });
    expect(first.batchSha).toBe(second.batchSha);
    expect(first.modules).toEqual(second.modules);
    expect(first.modules.map((item) => item.source)).toEqual([...first.modules.map((item) => item.source)].sort());
    expect(first.modules.every((item) => item.atomIds.length >= 2 && item.atomIds.length <= 8)).toBe(true);
    const limited = await planModuleBatch({ root, staging, donor: 'open-knowledge-format', limit: 2, asOf });
    expect(limited.modules).toEqual(first.modules.slice(0, 2));
    expect(limited.batchSha).not.toBe(first.batchSha);
    const packaged = await planModuleBatch({ root, staging, donor: modulePilots.gsd.donor, asOf });
    expect(packaged.modules.some((item) => item.source === modulePilots.gsd.path)).toBe(false);
    expect(packaged.donor).not.toBe(limited.donor);
    const out = join(staging, 'cli-plan.json');
    await runModuleBatchCli(['plan', '--root', root, '--staging', staging, '--out', out, '--donor', 'open-knowledge-format', '--limit', '2', '--as-of', asOf]);
    expect(JSON.parse(readFileSync(out, 'utf8')).batchSha).toBe(limited.batchSha);
    expect(() => chunkAtomIds(['only'])).not.toThrow();
  }, 60_000);

  test('applies queued modules sequentially, verifies once, and rolls one module back', async () => {
    const root = copyProduct('apply'); const staging = stage('apply-stage');
    const mapPath = join(root, 'corpus-map.json'); const mapSha = sha(readFileSync(mapPath));
    const beforeCatalog = JSON.parse(readFileSync(join(root, 'catalog.json'), 'utf8')) as { instructions: Array<{ instruction_id: string; path: string }> };
    const batchPlan = await planModuleBatch({ root, staging, donor: 'open-knowledge-format', limit: 2, asOf });
    expect(batchPlan.modules.length).toBe(2);
    const originalAtoms = new Map(batchPlan.modules.flatMap((module) => module.atomIds).map((id) => {
      const entry = beforeCatalog.instructions.find((item) => item.instruction_id === id);
      if (entry === undefined) throw new Error(`missing fixture atom: ${id}`);
      return [id, readFileSync(join(root, entry.path))] as const;
    }));
    const receiptPaths = batchPlan.initialState.receipts.map((item) => item.path); const receiptsBefore = hashReceipts(root, receiptPaths);
    const reviewerFile = review(staging, batchPlan.batchSha);
    const applied = await applyModuleBatch({ root, staging, donor: 'open-knowledge-format', limit: 2, asOf, expectedBatchSha: batchPlan.batchSha, reviewPath: reviewerFile, apply: true });
    expect(applied.outcome).toBe('applied'); expect(applied.modules.length).toBe(2);
    const totalAtoms = batchPlan.modules.reduce((sum, module) => sum + module.atomIds.length, 0);
    expect(JSON.parse(readFileSync(join(root, 'catalog.json'), 'utf8')).instructions.length).toBe(batchPlan.initialState.catalogCount - totalAtoms + 2);
    expect(sha(readFileSync(mapPath))).toBe(mapSha); expect(hashReceipts(root, receiptPaths)).toBe(receiptsBefore);
    let corpusCalls = 0;
    const clean = await verifyModuleBatch({ root, batchDir: applied.batchDirectory, profile: join(repositoryRoot, 'vida-project-profile.json'), corpusCheck: () => { corpusCalls += 1; return []; } });
    expect(corpusCalls).toBe(1); expect(clean.issues).toEqual([]);
    expect((clean.checks.modules as unknown[]).length).toBe(2);

    const batchRecordPath = join(applied.batchDirectory, 'module-batch-apply.json');
    const batchRecordBytes = readFileSync(batchRecordPath);
    const batchRecord = JSON.parse(batchRecordBytes.toString('utf8')) as { modules: Array<{ planSha: string; receipt: unknown }> };
    batchRecord.modules[0]!.planSha = 'f'.repeat(64);
    writeFileSync(batchRecordPath, `${JSON.stringify(batchRecord, null, 2)}\n`);
    const badPlanSha = await verifyModuleBatch({ root, batchDir: applied.batchDirectory, profile: join(repositoryRoot, 'vida-project-profile.json'), corpusCheck: () => [] });
    expect(badPlanSha.issues.some((issue) => issue.includes('batch record plan SHA mismatch'))).toBe(true);
    writeFileSync(batchRecordPath, batchRecordBytes);
    batchRecord.modules[0]!.receipt = null;
    writeFileSync(batchRecordPath, `${JSON.stringify(batchRecord, null, 2)}\n`);
    const badReceipt = await verifyModuleBatch({ root, batchDir: applied.batchDirectory, profile: join(repositoryRoot, 'vida-project-profile.json'), corpusCheck: () => [] });
    expect(badReceipt.issues.some((issue) => issue.includes('batch record receipt mismatch'))).toBe(true);
    writeFileSync(batchRecordPath, batchRecordBytes);
    const batchReviewPath = join(applied.batchDirectory, 'module-batch-review.json');
    const batchReviewBytes = readFileSync(batchReviewPath);
    rmSync(batchReviewPath);
    const missingReview = await verifyModuleBatch({ root, batchDir: applied.batchDirectory, profile: join(repositoryRoot, 'vida-project-profile.json'), corpusCheck: () => [] });
    expect(missingReview.issues.some((issue) => issue.includes('review is missing or invalid'))).toBe(true);
    writeFileSync(batchReviewPath, batchReviewBytes);
    const internalReviewPath = join(applied.batchDirectory, 'reviews', `${applied.modules[0]!.moduleId}.json`);
    const internalReviewBytes = readFileSync(internalReviewPath);
    const internalReview = JSON.parse(internalReviewBytes.toString('utf8')) as { verdict: string };
    internalReview.verdict = 'REJECTED';
    writeFileSync(internalReviewPath, `${JSON.stringify(internalReview, null, 2)}\n`);
    const badInternalReview = await verifyModuleBatch({ root, batchDir: applied.batchDirectory, profile: join(repositoryRoot, 'vida-project-profile.json'), corpusCheck: () => [] });
    expect(badInternalReview.issues.some((issue) => issue.includes('internal review is invalid'))).toBe(true);
    writeFileSync(internalReviewPath, internalReviewBytes);

    const catalogPath = join(root, 'catalog.json'); const catalogBytes = readFileSync(catalogPath);
    const sameCount = JSON.parse(catalogBytes.toString('utf8')) as { revision: number };
    sameCount.revision += 1;
    writeFileSync(catalogPath, `${JSON.stringify(sameCount, null, 2)}\n`);
    const sameCountDrift = await verifyModuleBatch({ root, batchDir: applied.batchDirectory, profile: join(repositoryRoot, 'vida-project-profile.json'), corpusCheck: () => [] });
    expect(sameCountDrift.issues.some((issue) => issue.includes('final catalog digest mismatch'))).toBe(true);
    writeFileSync(catalogPath, catalogBytes);

    await runModuleBatchCli(['verify', '--root', root, '--batch-dir', applied.batchDirectory, '--profile', join(repositoryRoot, 'vida-project-profile.json')]);

    const firstModuleApply = JSON.parse(readFileSync(join(applied.modules[0]!.batchDirectory, 'module-apply.json'), 'utf8')) as { plan: { moduleId: string; modulePath: string; atoms: Array<{ atom_id: string; instruction_path: string }> } };
    const secondModuleApply = JSON.parse(readFileSync(join(applied.modules[1]!.batchDirectory, 'module-apply.json'), 'utf8')) as { plan: { modulePath: string; catalogBeforeSha256: string; atoms: Array<{ atom_id: string; instruction_path: string }> } };
    const savedCarrier = readFileSync(join(root, firstModuleApply.plan.modulePath));
    writeFileSync(join(root, firstModuleApply.plan.modulePath), Buffer.concat([savedCarrier, Buffer.from('tampered atom payload', 'utf8')]));
    const tampered = await verifyModuleBatch({ root, batchDir: applied.batchDirectory, profile: join(repositoryRoot, 'vida-project-profile.json'), corpusCheck: () => [] });
    expect(tampered.issues.some((issue) => issue.includes('module file digest mismatch') || issue.includes('verification failed'))).toBe(true);
    writeFileSync(join(root, firstModuleApply.plan.modulePath), savedCarrier);

    const atom = firstModuleApply.plan.atoms[0]!; writeFileSync(join(root, atom.instruction_path), originalAtoms.get(atom.atom_id)!);
    const oldAtom = await verifyModuleBatch({ root, batchDir: applied.batchDirectory, profile: join(repositoryRoot, 'vida-project-profile.json'), corpusCheck: () => [] });
    expect(oldAtom.issues.some((issue) => issue.includes(`old atom file still exists: ${atom.instruction_path}`))).toBe(true);
    rmSync(join(root, atom.instruction_path));

    const catalog = JSON.parse(catalogBytes.toString('utf8')) as { instructions: unknown[] };
    catalog.instructions.push({ instruction_id: 'batch-tampered-count', path: 'instructions/missing.md', sha256: '0'.repeat(64) });
    writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
    const countMismatch = await verifyModuleBatch({ root, batchDir: applied.batchDirectory, profile: join(repositoryRoot, 'vida-project-profile.json'), corpusCheck: () => [] });
    expect(countMismatch.issues.some((issue) => issue.includes('catalog count'))).toBe(true);
    writeFileSync(catalogPath, catalogBytes);

    const rollbackStage = stage('rollback-stage');
    const rollbackDry = await rollbackModulePlan({ batchDir: applied.modules[1]!.batchDirectory, staging: rollbackStage, apply: false });
    const rollbackReview = review(rollbackStage, rollbackDry.planSha);
    const rollback = await rollbackModulePlan({ batchDir: applied.modules[1]!.batchDirectory, staging: rollbackStage, reviewPath: rollbackReview, apply: true });
    expect(rollback.kind).toBe('applied');
    expect(existsSync(join(root, firstModuleApply.plan.modulePath))).toBe(true);
    expect(existsSync(join(root, secondModuleApply.plan.modulePath))).toBe(false);
    expect(sha(readFileSync(join(root, 'catalog.json')))).toBe(secondModuleApply.plan.catalogBeforeSha256);
    for (const atomItem of secondModuleApply.plan.atoms) expect(sha(readFileSync(join(root, atomItem.instruction_path)))).toBe(sha(originalAtoms.get(atomItem.atom_id)!));
  }, 180_000);

  test('rejects bad batch SHA, review binding, catalog drift, and records terminal apply failure', async () => {
    const root = copyProduct('reject'); const staging = stage('reject-stage');
    const plan = await planModuleBatch({ root, staging, donor: 'open-knowledge-format', limit: 1, asOf });
    const goodReview = review(staging, plan.batchSha);
    await expect(applyModuleBatch({ root, staging, donor: 'open-knowledge-format', limit: 1, asOf, expectedBatchSha: '0'.repeat(64), reviewPath: goodReview, apply: true })).rejects.toThrow('module batch SHA mismatch');
    const badReview = review(staging, '1'.repeat(64));
    await expect(applyModuleBatch({ root, staging, donor: 'open-knowledge-format', limit: 1, asOf, expectedBatchSha: plan.batchSha, reviewPath: badReview, apply: true })).rejects.toThrow('VPPreparedBatchReview/v1 READY');
    await expect(applyModuleBatch({ root, staging, donor: 'open-knowledge-format', limit: 1, asOf, expectedBatchSha: plan.batchSha, reviewPath: goodReview, apply: false })).rejects.toThrow('--apply is required');
    await expect(runModuleBatchCli(['apply', '--root', root, '--staging', staging, '--donor', 'open-knowledge-format'])).rejects.toThrow('--apply is required');
    const catalogPath = join(root, 'catalog.json'); const catalogBytes = readFileSync(catalogPath); writeFileSync(catalogPath, Buffer.concat([catalogBytes, Buffer.from(' ', 'utf8')]));
    await expect(applyModuleBatch({ root, staging, donor: 'open-knowledge-format', limit: 1, asOf, expectedBatchSha: plan.batchSha, reviewPath: goodReview, apply: true })).rejects.toThrow('module batch SHA mismatch');
    writeFileSync(catalogPath, catalogBytes);

    const brokenRoot = copyProduct('terminal'); const brokenStage = stage('terminal-stage');
    const brokenPlan = await planModuleBatch({ root: brokenRoot, staging: brokenStage, donor: 'open-knowledge-format', limit: 1, asOf });
    const brokenReview = review(brokenStage, brokenPlan.batchSha);
    const id = brokenPlan.modules[0]!.atomIds[0]!;
    const catalog = JSON.parse(readFileSync(join(brokenRoot, 'catalog.json'), 'utf8')) as { instructions: Array<{ instruction_id: string; path: string }> };
    const entry = catalog.instructions.find((item) => item.instruction_id === id);
    if (entry === undefined) throw new Error(`missing atom ${id}`);
    rmSync(join(brokenRoot, entry.path));
    await expect(applyModuleBatch({ root: brokenRoot, staging: brokenStage, donor: 'open-knowledge-format', limit: 1, asOf, expectedBatchSha: brokenPlan.batchSha, reviewPath: brokenReview, apply: true })).rejects.toThrow('terminal batch record');
    const batchDirs = readdirSync(brokenStage).filter((item) => item.startsWith('module-batch-'));
    expect(batchDirs.length).toBe(1);
    const terminalRecord = JSON.parse(readFileSync(join(brokenStage, batchDirs[0]!, 'module-batch-apply.json'), 'utf8')) as { outcome: string; modules: unknown[] };
    expect(terminalRecord.outcome).toBe('partial-or-unknown'); expect(terminalRecord.modules).toEqual([]);
    const cliRoot = copyProduct('cli-apply'); const cliStage = stage('cli-apply-stage');
    const cliPlan = await planModuleBatch({ root: cliRoot, staging: cliStage, donor: 'open-knowledge-format', limit: 1, asOf });
    const cliReview = review(cliStage, cliPlan.batchSha);
    await runModuleBatchCli(['apply', '--root', cliRoot, '--staging', cliStage, '--donor', 'open-knowledge-format', '--limit', '1', '--as-of', asOf, '--expected-batch-sha', cliPlan.batchSha, '--review', cliReview, '--apply']);
  }, 120_000);

  test('compose parity accepts matching errors and rejects mismatches', () => {
    const error = (code: 'CATALOG_INVALID' | 'CATALOG_REQUIRED_CONFLICT', message: string) => ({ error: new CatalogError(code, message) });
    const bundle = (id: string, content: string) => ({ bundle: { instructions: [{ instruction_id: id, content }] } }) as unknown as Parameters<typeof composeParityIssue>[0];
    expect(composeParityIssue(error('CATALOG_INVALID', 'same'), error('CATALOG_INVALID', 'same'))).toBeNull();
    expect(composeParityIssue(error('CATALOG_INVALID', 'same'), error('CATALOG_REQUIRED_CONFLICT', 'same'))).toContain('dependency closure');
    expect(composeParityIssue(error('CATALOG_INVALID', 'same'), bundle('a', 'x'))).toContain('dependency closure');
    expect(composeParityIssue(bundle('a', 'x'), bundle('a', 'x'))).toBeNull();
    expect(composeParityIssue(bundle('a', 'x'), bundle('b', 'x'))).toContain('dependency closure');
    expect(composeParityIssue(bundle('a', 'x'), bundle('a', 'y'))).toContain('dependency closure');
  });

  test('verifies compose through mandatory dependencies without a false closure failure', async () => {
    const root = copyProduct('deps'); const staging = stage('deps-stage');
    const firstPlan = await planModuleBatch({ root, staging, donor: 'open-knowledge-format', asOf });
    const target = firstPlan.modules[0]!;
    const dependency = firstPlan.modules[1]!.atomIds[0]!;
    const catalogPath = join(root, 'catalog.json');
    const catalog = JSON.parse(readFileSync(catalogPath, 'utf8')) as { instructions: Array<{ instruction_id: string; path: string; sha256: string }> };
    const entry = catalog.instructions.find((item) => item.instruction_id === target.atomIds[0]);
    if (entry === undefined) throw new Error('missing fixture atom');
    const atomPath = join(root, entry.path);
    const original = readFileSync(atomPath, 'utf8');
    const withDependency = original.includes('compatibility_requires: []')
      ? original.replace('compatibility_requires: []', `compatibility_requires:\n  - ${dependency}`)
      : original.replace('\nprovenance:', `\ncompatibility_requires:\n  - ${dependency}\nprovenance:`);
    writeFileSync(atomPath, withDependency);
    entry.sha256 = sha(readFileSync(atomPath));
    writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);

    const plan = await planModuleBatch({ root, staging: stage('deps-stage-plan'), donor: 'open-knowledge-format', limit: 1, asOf });
    expect(plan.modules[0]!.atomIds).toEqual(target.atomIds);
    const reviewFile = review(stage('deps-stage-review'), plan.batchSha);
    const applied = await applyModuleBatch({ root, staging, donor: 'open-knowledge-format', limit: 1, asOf, expectedBatchSha: plan.batchSha, reviewPath: reviewFile, apply: true });
    const verified = await verifyModuleBatch({ root, batchDir: applied.batchDirectory, profile: join(repositoryRoot, 'vida-project-profile.json') });
    expect(verified.issues).toEqual([]);
    expect((verified.checks.modules as Array<{ checks: { composedAtomCount: number } }>)[0]!.checks.composedAtomCount).toBe(3);
  }, 120_000);

  test('verifies a cohort with a declared exclusion through compose error parity', async () => {
    const root = copyProduct('conflict'); const staging = stage('conflict-stage');
    const firstPlan = await planModuleBatch({ root, staging, donor: 'open-knowledge-format', asOf });
    const target = firstPlan.modules[0]!;
    const [first, second] = target.atomIds;
    if (first === undefined || second === undefined) throw new Error('fixture module needs two atoms');
    const catalogPath = join(root, 'catalog.json');
    const catalog = JSON.parse(readFileSync(catalogPath, 'utf8')) as { instructions: Array<{ instruction_id: string; path: string; sha256: string }> };
    const entry = catalog.instructions.find((item) => item.instruction_id === first);
    if (entry === undefined) throw new Error('missing fixture atom');
    const atomPath = join(root, entry.path);
    const original = readFileSync(atomPath, 'utf8');
    const withExclude = original.includes('compatibility_excludes: []')
      ? original.replace('compatibility_excludes: []', `compatibility_excludes:\n  - ${second}`)
      : original.replace('\nprovenance:', `\ncompatibility_excludes:\n  - ${second}\nprovenance:`);
    writeFileSync(atomPath, withExclude);
    entry.sha256 = sha(readFileSync(atomPath));
    writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
    const plan = await planModuleBatch({ root, staging: stage('conflict-plan'), donor: 'open-knowledge-format', limit: 1, asOf });
    expect(plan.modules[0]!.atomIds).toEqual(target.atomIds);
    const reviewFile = review(stage('conflict-review'), plan.batchSha);
    const applied = await applyModuleBatch({ root, staging, donor: 'open-knowledge-format', limit: 1, asOf, expectedBatchSha: plan.batchSha, reviewPath: reviewFile, apply: true });
    const verified = await verifyModuleBatch({ root, batchDir: applied.batchDirectory, profile: join(repositoryRoot, 'vida-project-profile.json') });
    expect(verified.issues).toEqual([]);
    const checks = (verified.checks.modules as Array<{ checks: { composeCode: string | null } }>)[0]!.checks;
    expect(checks.composeCode).toBe('CATALOG_REQUIRED_CONFLICT');
  }, 120_000);

  test('verifies a historical batch after later batches without weakening the latest gate', async () => {
    const root = copyProduct('historical'); const staging = stage('historical-stage');
    const planA = await planModuleBatch({ root, staging, donor: 'open-knowledge-format', limit: 1, asOf });
    const reviewA = review(stage('historical-review-a'), planA.batchSha);
    const appliedA = await applyModuleBatch({ root, staging, donor: 'open-knowledge-format', limit: 1, asOf, expectedBatchSha: planA.batchSha, reviewPath: reviewA, apply: true });
    const planB = await planModuleBatch({ root, staging: stage('historical-plan-b'), donor: 'open-knowledge-format', limit: 1, asOf });
    const reviewB = review(stage('historical-review-b'), planB.batchSha);
    const appliedB = await applyModuleBatch({ root, staging: stage('historical-apply-b'), donor: 'open-knowledge-format', limit: 1, asOf, expectedBatchSha: planB.batchSha, reviewPath: reviewB, apply: true });
    const strictA = await verifyModuleBatch({ root, batchDir: appliedA.batchDirectory, profile: join(repositoryRoot, 'vida-project-profile.json'), corpusCheck: () => [] });
    expect(strictA.issues.length).toBeGreaterThan(0);
    const historicalA = await verifyModuleBatch({ root, batchDir: appliedA.batchDirectory, profile: join(repositoryRoot, 'vida-project-profile.json'), corpusCheck: () => [], historical: true });
    expect(historicalA.issues).toEqual([]);
    expect(historicalA.checks.historical).toBe(true);
    await runModuleBatchCli(['verify', '--root', root, '--batch-dir', appliedA.batchDirectory, '--profile', join(repositoryRoot, 'vida-project-profile.json'), '--historical']);
    const strictB = await verifyModuleBatch({ root, batchDir: appliedB.batchDirectory, profile: join(repositoryRoot, 'vida-project-profile.json'), corpusCheck: () => [] });
    expect(strictB.issues).toEqual([]);
    expect(strictB.checks.historical).toBe(false);
  }, 180_000);
});
