import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { parseFrontmatter } from '../skills/vp-mode/scripts/frontmatter.ts';
import { parseModule } from '../skills/vp-mode/scripts/modules.ts';
import { buildModuleUpdatePlan, applyModuleUpdate, verifyModuleUpdate, rollbackModuleUpdate, parseModuleUpdateArgs, errorMessage, handleModuleUpdateCliError, runModuleUpdateCli } from '../scripts/module-update.ts';
import { renderModule } from '../scripts/module-migration.ts';

const powersRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = resolve(powersRoot, '../..');
const scratch = join(powersRoot, '.tmp', 'module-update-tests');
const asOf = '2026-11-08T12:00:00.000Z';
const sha = (bytes: Uint8Array | string): string => createHash('sha256').update(bytes).digest('hex');
let root = '';
let moduleId = '';
let modulePath = '';
let atomIds: string[] = [];
let originalModule = Buffer.alloc(0);
let originalCatalog = Buffer.alloc(0);
let catalogEntryIndex = -1;

function copyProduct(): string {
  mkdirSync(scratch, { recursive: true });
  const copy = mkdtempSync(join(scratch, 'product-'));
  for (const entry of readdirSync(powersRoot)) {
    if (entry === 'node_modules' || entry === '.tmp') continue;
    cpSync(join(powersRoot, entry), join(copy, entry), { recursive: true, filter: (path) => !path.split(/[\\/]/u).some((part) => part === 'node_modules' || part === '.tmp') });
  }
  const donorsPath = join(copy, 'donors.yaml');
  const donorsText = readFileSync(donorsPath, 'utf8').replace(/^local_root: packages\/powers\/\.tmp\/donors$/mu, `local_root: ${join(powersRoot, '.tmp', 'donors').replace(/\\/gu, '/')}`);
  writeFileSync(donorsPath, donorsText);
  mkdirSync(join(copy, '.tmp'), { recursive: true });
  symlinkSync(join(powersRoot, '.tmp', 'donors'), join(copy, '.tmp', 'donors'), 'junction');
  return copy;
}
function atomFilesFromModule(bytes: Uint8Array, path: string): Map<string, string> {
  const fm = parseFrontmatter(Buffer.from(bytes).toString('utf8'));
  const parsed = parseModule(fm.data, fm.body, path.slice('instructions/'.length, -3));
  return new Map(parsed.members.map((member) => [member.atom_id, member.file]));
}
function writeAtoms(directory: string, entries: Map<string, string>, changed: readonly string[], suffix: string): void {
  mkdirSync(directory, { recursive: true });
  for (const [id, file] of entries) {
    const fm = parseFrontmatter(file);
    const body = changed.includes(id) ? `${fm.body.slice(0, -1)}\n\nModule update fixture ${suffix}.\n` : fm.body;
    const next = `${file.slice(0, file.length - fm.body.length)}${body}`;
    writeFileSync(join(directory, `${id}.md`), next);
  }
}
function reviewFile(directory: string, planSha: string, name = 'review.json'): string {
  mkdirSync(directory, { recursive: true });
  const path = join(directory, name);
  writeFileSync(path, `${JSON.stringify({ schema: 'VPPreparedBatchReview/v1', planSha256: planSha, verdict: 'READY', reviewer: 'independent-update-reviewer', pointer: `rehearsal:${name}` }, null, 2)}\n`);
  return path;
}
async function plan(atomsDir: string, staging: string, atoms?: string[]) {
  return buildModuleUpdatePlan({ root, moduleId, atomsDir, staging, asOf, ...(atoms === undefined ? {} : { atoms }) });
}
async function applyPlan(atomsDir: string, staging: string, expectedUpdateSha: string, reviewPath: string) {
  return applyModuleUpdate({ root, moduleId, atomsDir, staging, asOf, expectedUpdateSha, reviewPath, apply: true, writer: 'module-update-test-root' });
}
async function runCli(args: string[]): Promise<{ output: string }> {
  const original = console.log; let output = '';
  console.log = (...values: unknown[]) => { output += values.map(String).join(' ') + '\n'; };
  try { await runModuleUpdateCli(args); return { output }; }
  finally { console.log = original; }
}

beforeAll(() => {
  if (existsSync(scratch)) rmSync(scratch, { recursive: true, force: true });
  root = copyProduct();
  const catalog = JSON.parse(readFileSync(join(root, 'catalog.json'), 'utf8')) as { instructions: Array<{ instruction_id: string; path: string }> };
  for (const entry of catalog.instructions) {
    if (!entry.instruction_id.startsWith('module-')) continue;
    const file = readFileSync(join(root, entry.path));
    const fm = parseFrontmatter(file.toString('utf8'));
    if (fm.data.schema !== 'VPInstructionModule/v1') continue;
    const source = JSON.parse(String(fm.data.source)) as { donor: string };
    if (source.donor !== 'open-knowledge-format') continue;
    moduleId = entry.instruction_id;
    modulePath = entry.path;
    atomIds = fm.data.atom_ids as string[];
    catalogEntryIndex = catalog.instructions.findIndex((item) => item.instruction_id === moduleId);
    originalModule = file;
    originalCatalog = readFileSync(join(root, 'catalog.json'));
    break;
  }
  if (!moduleId) throw new Error('open-knowledge-format module carrier was not found through catalog.json');
}, 120_000);
afterAll(() => { if (existsSync(scratch)) rmSync(scratch, { recursive: true, force: true }); });

describe('prepared module update D59/SR-110', () => {
  test('plans, validates, applies, verifies, and rolls back module updates', async () => {
  {
    const originalFm = parseFrontmatter(originalModule.toString('utf8'));
    const parsedOriginal = parseModule(originalFm.data, originalFm.body, moduleId);
    const renderArgs = { moduleId, title: parsedOriginal.record.title, summary: parsedOriginal.record.summary, source: parsedOriginal.source, atomIds, atomRecords: parsedOriginal.atoms, body: parsedOriginal.body };
    expect(renderModule(renderArgs)).toEqual(renderModule({ ...renderArgs, revision: 1 }));
    expect(renderModule(renderArgs)).toEqual(originalModule);
    const originals = atomFilesFromModule(originalModule, modulePath);
    const first = atomIds[0]!;
    const oneDir = join(scratch, 'single-input'); writeAtoms(oneDir, originals, [first], 'single');
    const one = await plan(oneDir, join(scratch, 'single-stage'));
    expect(one.atoms.map((atom) => atom.atomId)).toEqual(atomIds);
    expect(one.atoms.filter((atom) => atom.changed).map((atom) => atom.atomId)).toEqual([first]);
    expect(one.moduleRevisionAfter).toBe(one.moduleRevisionBefore + 1);
    expect(one.catalogRevisionAfter).toBe(one.catalogRevisionBefore + 1);
    expect(one.catalogCount).toBe(JSON.parse(originalCatalog.toString('utf8')).instructions.length);
    expect(one.targetOrder).toEqual([modulePath, 'catalog.json']);
    expect(one.receipts.length).toBeGreaterThan(0);
    const staged = JSON.parse(readFileSync(join(one.batchDirectory, one.batchManifest.path), 'utf8')) as { targets: Array<{ staged: { path: string } | null }> };
    const moduleTarget = staged.targets[0]!.staged!;
    const stagedModule = readFileSync(join(one.batchDirectory, moduleTarget.path), 'utf8');
    expect(stagedModule).toContain('Module update fixture single.');
    for (const id of atomIds) expect(stagedModule).toContain(`  - ${id}`);
    for (const atom of one.atoms.filter((item) => !item.changed)) expect(atom.newFileSha256).toBe(atom.oldFileSha256);

    const allDir = join(scratch, 'all-input'); writeAtoms(allDir, originals, atomIds, 'all');
    const all = await plan(allDir, join(scratch, 'all-stage'));
    expect(all.counts.changed).toBe(atomIds.length);
    expect(all.atoms.every((item) => item.changed)).toBe(true);

    const subsetDir = join(scratch, 'subset-input'); writeAtoms(subsetDir, originals, atomIds, 'subset');
    const subset = await plan(subsetDir, join(scratch, 'subset-stage'), [first]);
    expect(subset.counts.changed).toBe(1);
    expect(subset.atoms.filter((item) => item.atomId !== first).every((item) => !item.changed && item.oldFileSha256 === item.newFileSha256)).toBe(true);
  }

  {
    const originals = atomFilesFromModule(originalModule, modulePath);
    const first = atomIds[0]!;
    const sameDir = join(scratch, 'noop-input'); writeAtoms(sameDir, originals, [], 'noop');
    await expect(plan(sameDir, join(scratch, 'noop-stage'))).rejects.toThrow('no-op');
    await expect(buildModuleUpdatePlan({ root, moduleId: 'unknown-module-id', atomsDir: sameDir, staging: join(scratch, 'unknown-stage'), asOf })).rejects.toThrow('not in the catalog');

    const extra = join(scratch, 'extra-input'); mkdirSync(extra, { recursive: true }); writeFileSync(join(extra, 'foreign-atom.md'), originals.get(first)!);
    await expect(plan(extra, join(scratch, 'extra-stage'))).rejects.toThrow('not in module');
    const mismatch = join(scratch, 'mismatch-input'); mkdirSync(mismatch, { recursive: true }); writeFileSync(join(mismatch, `${first}.md`), originals.get(atomIds[1]!)!);
    await expect(plan(mismatch, join(scratch, 'mismatch-stage'))).rejects.toThrow('identity mismatch');
    const missing = join(scratch, 'missing-input'); mkdirSync(missing, { recursive: true });
    const missingFm = parseFrontmatter(originals.get(first)!);
    writeFileSync(join(missing, `${first}.md`), `${originals.get(first)!.slice(0, originals.get(first)!.length - missingFm.body.length)}${missingFm.body.slice(0, -1)}\n\nMissing-file fixture.\n`);
    await expect(plan(missing, join(scratch, 'missing-stage'), [atomIds[1]!])).rejects.toThrow('file is missing');
    await expect(plan(missing, join(scratch, 'duplicate-stage'), [first, first])).rejects.toThrow('unique atom IDs');

    const invalid = join(scratch, 'invalid-schema-input'); mkdirSync(invalid, { recursive: true });
    writeFileSync(join(invalid, `${first}.md`), originals.get(first)!.replace('VPInstruction/v1.2', 'VPInstruction/invalid'));
    await expect(plan(invalid, join(scratch, 'invalid-schema-stage'))).rejects.toThrow('schema is unsupported');
    const crlf = join(scratch, 'crlf-input'); mkdirSync(crlf, { recursive: true });
    writeFileSync(join(crlf, `${first}.md`), originals.get(first)!.replace(/\n/gu, '\r\n'));
    await expect(plan(crlf, join(scratch, 'crlf-stage'))).rejects.toThrow('LF-only');
    const noFinalLf = join(scratch, 'no-final-lf-input'); mkdirSync(noFinalLf, { recursive: true });
    writeFileSync(join(noFinalLf, `${first}.md`), originals.get(first)!.slice(0, -1));
    await expect(plan(noFinalLf, join(scratch, 'no-final-lf-stage'))).rejects.toThrow('end in LF');
  }

  {
    const originals = atomFilesFromModule(originalModule, modulePath);
    const first = atomIds[0]!; const second = atomIds[1]!;
    const oneDir = join(scratch, 'apply-one-input'); writeAtoms(oneDir, originals, [first], 'apply-one');
    const firstPlan = await plan(oneDir, join(scratch, 'apply-one-plan-stage'));
    await expect(applyModuleUpdate({ root, moduleId, atomsDir: oneDir, staging: join(scratch, 'sha-mismatch-stage'), asOf, expectedUpdateSha: '0'.repeat(64), reviewPath: '', apply: false })).rejects.toThrow('SHA mismatch');
    const badReview = reviewFile(scratch, firstPlan.planSha.replace(/.$/u, firstPlan.planSha.endsWith('0') ? '1' : '0'), 'bad-review.json');
    await expect(applyPlan(oneDir, join(scratch, 'bad-review-stage'), firstPlan.planSha, badReview)).rejects.toThrow('review must be');

    const firstReview = reviewFile(scratch, firstPlan.planSha, 'apply-one-review.json');
    const applied1 = await applyPlan(oneDir, join(scratch, 'apply-one-live-stage'), firstPlan.planSha, firstReview);
    expect(applied1.kind).toBe('applied');
    const clean = await verifyModuleUpdate(root, applied1.batchDirectory, join(repositoryRoot, 'vida-project-profile.json'));
    expect(clean.issues).toEqual([]);
    expect(clean.checks.moduleGetCode).toBe('CATALOG_MODULE_ATOM_REQUIRED');
    expect(clean.checks.receiptCount).toBe(firstPlan.receipts.length);
    const applyRecordPath = join(applied1.batchDirectory, 'module-update-apply.json');
    const applyRecordBytes = readFileSync(applyRecordPath);
    const applyRecord = JSON.parse(applyRecordBytes.toString('utf8')) as { receipt: unknown; batchManifest: unknown };
    applyRecord.receipt = applyRecord.batchManifest;
    writeFileSync(applyRecordPath, `${JSON.stringify(applyRecord, null, 2)}\n`);
    const manifestAsReceipt = await verifyModuleUpdate(root, applied1.batchDirectory, join(repositoryRoot, 'vida-project-profile.json'));
    expect(manifestAsReceipt.issues.some((issue) => issue.includes('update receipt is not an applied'))).toBe(true);
    writeFileSync(applyRecordPath, applyRecordBytes);
    applyRecord.receipt = { path: 'module-update-review.json', sha256: sha(readFileSync(join(applied1.batchDirectory, 'module-update-review.json'))) };
    writeFileSync(applyRecordPath, `${JSON.stringify(applyRecord, null, 2)}\n`);
    const reviewAsReceipt = await verifyModuleUpdate(root, applied1.batchDirectory, join(repositoryRoot, 'vida-project-profile.json'));
    expect(reviewAsReceipt.issues.some((issue) => issue.includes('update receipt is not an applied'))).toBe(true);
    writeFileSync(applyRecordPath, applyRecordBytes);
    applyRecord.receipt = { path: 'missing-receipt.json', sha256: '0'.repeat(64) };
    writeFileSync(applyRecordPath, `${JSON.stringify(applyRecord, null, 2)}\n`);
    const missingReceiptArtifact = await verifyModuleUpdate(root, applied1.batchDirectory, join(repositoryRoot, 'vida-project-profile.json'));
    expect(missingReceiptArtifact.issues.some((issue) => issue.includes('update receipt verification failed'))).toBe(true);
    writeFileSync(applyRecordPath, applyRecordBytes);
    const syntheticDir = join(scratch, 'synthetic-record'); mkdirSync(syntheticDir, { recursive: true });
    writeFileSync(join(syntheticDir, 'module-update-apply.json'), `${JSON.stringify({
      schema: 'VPModuleUpdateApply/v1', plan: { ...firstPlan, receipts: [] }, outcome: 'applied',
      receipt: null, batchManifest: { path: 'missing-manifest.json', sha256: firstPlan.planSha }, batchDirectory: syntheticDir,
    }, null, 2)}\n`);
    const synthetic = await verifyModuleUpdate(root, syntheticDir, join(repositoryRoot, 'vida-project-profile.json'));
    expect(synthetic.issues.some((issue) => issue.includes('batch manifest verification failed'))).toBe(true);
    expect(synthetic.issues.some((issue) => issue.includes('update review is missing'))).toBe(true);
    expect(synthetic.issues.some((issue) => issue.includes('update receipt is missing'))).toBe(true);
    expect(synthetic.issues.some((issue) => issue.includes('receipt snapshot does not match the plan'))).toBe(true);
    const savedMap = readFileSync(join(root, 'corpus-map.json'));
    rmSync(join(root, 'corpus-map.json'));
    const missingMap = await verifyModuleUpdate(root, applied1.batchDirectory, join(repositoryRoot, 'vida-project-profile.json'));
    expect(missingMap.issues.some((issue) => issue.includes('corpus map is missing'))).toBe(true);
    writeFileSync(join(root, 'corpus-map.json'), savedMap);
    const savedReceipt = readFileSync(join(root, firstPlan.receipts[0]!.path));
    rmSync(join(root, firstPlan.receipts[0]!.path));
    const missingReceipt = await verifyModuleUpdate(root, applied1.batchDirectory, join(repositoryRoot, 'vida-project-profile.json'));
    expect(missingReceipt.issues.some((issue) => issue.includes('fidelity receipt missing'))).toBe(true);
    writeFileSync(join(root, firstPlan.receipts[0]!.path), savedReceipt);
    const invalidProfile = join(scratch, 'invalid-profile.json');
    writeFileSync(invalidProfile, 'null');
    const badProfile = await verifyModuleUpdate(root, applied1.batchDirectory, invalidProfile);
    expect(badProfile.issues.some((issue) => issue.includes('compose verification failed'))).toBe(true);

    const currentModule = readFileSync(join(root, modulePath)); const currentCatalog = readFileSync(join(root, 'catalog.json'));
    const currentMap = readFileSync(join(root, 'corpus-map.json'));
    const currentReceipt = readFileSync(join(root, firstPlan.receipts[0]!.path));
    const checkTamper = async (path: string, content: Buffer, expectedIssue: string) => {
      writeFileSync(path, content);
      const result = await verifyModuleUpdate(root, applied1.batchDirectory, join(repositoryRoot, 'vida-project-profile.json'));
      expect(result.issues.some((issue) => issue.includes(expectedIssue))).toBe(true);
    };
    try {
      await checkTamper(join(root, modulePath), Buffer.concat([currentModule, Buffer.from('tamper')]), 'module after-image');
      await checkTamper(join(root, 'catalog.json'), Buffer.concat([currentCatalog, Buffer.from(' ')]), 'catalog after-image');
      await checkTamper(join(root, 'corpus-map.json'), Buffer.concat([readFileSync(join(root, 'corpus-map.json')), Buffer.from(' ')]), 'corpus map changed');
      const receiptPath = join(root, firstPlan.receipts[0]!.path);
      await checkTamper(receiptPath, Buffer.concat([currentReceipt, Buffer.from(' ')]), 'fidelity receipt changed');
      writeFileSync(join(root, 'instructions', `${first}.md`), originals.get(first)!);
      const oldAtom = await verifyModuleUpdate(root, applied1.batchDirectory, join(repositoryRoot, 'vida-project-profile.json'));
      expect(oldAtom.issues.some((issue) => issue.includes('old atom file still exists'))).toBe(true);
      rmSync(join(root, 'instructions', `${first}.md`));
    } finally {
      writeFileSync(join(root, modulePath), currentModule);
      writeFileSync(join(root, 'catalog.json'), currentCatalog);
      writeFileSync(join(root, 'corpus-map.json'), currentMap);
      writeFileSync(join(root, firstPlan.receipts[0]!.path), currentReceipt);
    }

    const secondDir = join(scratch, 'apply-two-input');
    const currentEntries = atomFilesFromModule(readFileSync(join(root, modulePath)), modulePath);
    writeAtoms(secondDir, currentEntries, [second], 'apply-two');
    const secondPlan = await plan(secondDir, join(scratch, 'apply-two-plan-stage'));
    const secondReview = reviewFile(scratch, secondPlan.planSha, 'apply-two-review.json');
    const cliApplied = await runCli(['apply', '--root', root, '--module', moduleId, '--atoms-dir', secondDir, '--staging', join(scratch, 'apply-two-live-stage'), '--as-of', asOf, '--expected-update-sha', secondPlan.planSha, '--review', secondReview, '--writer', 'module-update-test-root', '--apply']);
    const applied2 = JSON.parse(cliApplied.output) as { kind: string; batchDirectory: string };
    expect(applied2.kind).toBe('applied');
    const cliVerified = await runCli(['verify', '--root', root, '--batch-dir', applied2.batchDirectory, '--profile', join(repositoryRoot, 'vida-project-profile.json')]);
    expect(JSON.parse(cliVerified.output).issueCount).toBe(0);
    await expect(rollbackModuleUpdate({ batchDir: applied1.batchDirectory, staging: join(scratch, 'old-rollback-stage'), apply: false })).rejects.toThrow('post-update drift');
    const dry2 = await rollbackModuleUpdate({ batchDir: applied2.batchDirectory, staging: join(scratch, 'rollback-two-dry'), apply: false });
    expect(dry2.kind).toBe('dry-run');
    const rollback2Review = reviewFile(scratch, dry2.planSha, 'rollback-two-review.json');
    const rolled2 = await runCli(['rollback', '--batch-dir', applied2.batchDirectory, '--staging', join(scratch, 'rollback-two-live'), '--review', rollback2Review, '--writer', 'module-update-test-root', '--apply']);
    expect((JSON.parse(rolled2.output) as { kind: string }).kind).toBe('applied');
    const dry1 = await rollbackModuleUpdate({ batchDir: applied1.batchDirectory, staging: join(scratch, 'rollback-one-dry'), apply: false });
    const rollback1Review = reviewFile(scratch, dry1.planSha, 'rollback-one-review.json');
    const rolled1 = await rollbackModuleUpdate({ batchDir: applied1.batchDirectory, staging: join(scratch, 'rollback-one-live'), reviewPath: rollback1Review, apply: true, writer: 'module-update-test-root' });
    expect(rolled1.kind).toBe('applied');
    expect(readFileSync(join(root, modulePath))).toEqual(originalModule);
    expect(readFileSync(join(root, 'catalog.json'))).toEqual(originalCatalog);
    expect(JSON.parse(originalCatalog.toString('utf8')).instructions[catalogEntryIndex].instruction_id).toBe(moduleId);
  }

  {
    const originals = atomFilesFromModule(originalModule, modulePath); const first = atomIds[0]!;
    const dir = join(scratch, 'drift-input'); writeAtoms(dir, originals, [first], 'before-drift');
    const prepared = await plan(dir, join(scratch, 'drift-plan-stage'));
    const cliOut = join(scratch, 'cli-plan.json');
    const cliPlan = await runCli(['plan', '--root', root, '--module', moduleId, '--atoms-dir', dir, '--staging', join(scratch, 'cli-plan-stage'), '--out', cliOut, '--as-of', asOf]);
    expect(JSON.parse(readFileSync(cliOut, 'utf8')).planSha).toBe(prepared.planSha);
    writeAtoms(dir, originals, [first], 'after-drift');
    await expect(applyModuleUpdate({ root, moduleId, atomsDir: dir, staging: join(scratch, 'drift-apply-stage'), asOf, expectedUpdateSha: prepared.planSha, reviewPath: '', apply: false })).rejects.toThrow('SHA mismatch');
    expect(parseModuleUpdateArgs(['--root', 'x', '--apply']).flags.has('--apply')).toBe(true);
    expect(() => parseModuleUpdateArgs(['x'])).toThrow('unexpected argument');
    expect(() => parseModuleUpdateArgs(['--root'])).toThrow('requires a value');
    expect(() => parseModuleUpdateArgs(['--root', 'a', '--root', 'b'])).toThrow('duplicate argument');
    expect(() => parseModuleUpdateArgs(['--apply', '--apply'])).toThrow('duplicate argument');
    await expect(runCli(['plan', '--root', root, '--module', moduleId, '--atoms-dir', dir, '--atoms', ',', '--staging', join(scratch, 'bad-atoms-stage'), '--out', join(scratch, 'bad-atoms.json')])).rejects.toThrow('comma-separated');
    await expect(runCli(['plan', '--root', root, '--module', moduleId, '--atoms-dir', dir, '--atoms', `${first},${first}`, '--staging', join(scratch, 'duplicate-atoms-stage'), '--out', join(scratch, 'duplicate-atoms.json')])).rejects.toThrow('unique atom IDs');
    const validAtomsOut = join(scratch, 'valid-atoms-plan.json');
    const validAtoms = await runCli(['plan', '--root', root, '--module', moduleId, '--atoms-dir', dir, '--atoms', first, '--staging', join(scratch, 'valid-atoms-stage'), '--out', validAtomsOut]);
    expect(JSON.parse(validAtoms.output).counts.changed).toBe(1);
    expect(readFileSync(validAtomsOut, 'utf8')).toContain(moduleId);
    await expect(runModuleUpdateCli(['invalid'])).rejects.toThrow('command must be plan, apply, verify, or rollback');
    await expect(runModuleUpdateCli(['plan', '--unknown', 'x'])).rejects.toThrow('unknown flag');
    expect(errorMessage(new Error('message'))).toBe('message');
    expect(errorMessage('message')).toBe('message');
    const stderr = console.error; let errorOutput = ''; let requestedExitCode = 0;
    console.error = (...values: unknown[]) => { errorOutput += values.map(String).join(' '); };
    handleModuleUpdateCliError('cli-test-error', (code) => { requestedExitCode = code; });
    expect(errorOutput).toContain('cli-test-error');
    console.error = stderr;
    expect(requestedExitCode).toBe(1);
    const previousExitCode = process.exitCode;
    console.error = () => {};
    handleModuleUpdateCliError('default-exit-test');
    expect(process.exitCode).toBe(1);
    process.exitCode = previousExitCode ?? 0;
    console.error = stderr;
  }

  {
    const originals = atomFilesFromModule(originalModule, modulePath);
    const first = atomIds[0]!; const second = atomIds[1]!;
    const dir = join(scratch, 'conflict-input'); mkdirSync(dir, { recursive: true });
    const file = originals.get(first)!;
    const withExclude = file.includes('compatibility_excludes: []')
      ? file.replace('compatibility_excludes: []', `compatibility_excludes:\n  - ${second}`)
      : file.replace('\nprovenance:', `\ncompatibility_excludes:\n  - ${second}\nprovenance:`);
    writeFileSync(join(dir, `${first}.md`), withExclude);
    const prepared = await plan(dir, join(scratch, 'conflict-plan-stage'), [first]);
    const review = reviewFile(scratch, prepared.planSha, 'conflict-review.json');
    const applied = await applyPlan(dir, join(scratch, 'conflict-apply-stage'), prepared.planSha, review);
    expect(applied.kind).toBe('applied');
    const verified = await verifyModuleUpdate(root, applied.batchDirectory, join(repositoryRoot, 'vida-project-profile.json'));
    expect(verified.issues).toEqual([]);
    expect(verified.checks.composeParity).toBe(true);
  }

  {
    const currentModuleBytes = readFileSync(join(root, modulePath));
    const disabledBytes = Buffer.from(currentModuleBytes.toString('utf8').replace('\nstatus: active\n', '\nstatus: disabled\n'));
    if (!disabledBytes.toString('utf8').includes('status: disabled')) throw new Error('failed to disable the carrier fixture');
    writeFileSync(join(root, modulePath), disabledBytes);
    const catalogPath = join(root, 'catalog.json');
    const catalog = JSON.parse(readFileSync(catalogPath, 'utf8')) as { instructions: Array<{ instruction_id: string; sha256: string }> };
    const entry = catalog.instructions.find((item) => item.instruction_id === moduleId);
    if (entry === undefined) throw new Error('disabled fixture entry is missing');
    entry.sha256 = sha(disabledBytes);
    writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
    const entries = atomFilesFromModule(disabledBytes, modulePath);
    const first = atomIds[0]!;
    const dir = join(scratch, 'disabled-input'); writeAtoms(dir, entries, [first], 'disabled');
    const planned = await plan(dir, join(scratch, 'disabled-plan-stage'), [first]);
    const manifest = JSON.parse(readFileSync(join(planned.batchDirectory, planned.batchManifest.path), 'utf8')) as { targets: Array<{ staged: { path: string } | null }> };
    const staged = manifest.targets[0]!.staged!;
    const newModule = readFileSync(join(planned.batchDirectory, staged.path), 'utf8');
    expect(newModule).toContain('status: disabled');
    expect(newModule).toContain(`revision: ${planned.moduleRevisionAfter}`);
  }
  }, 240_000);
});
