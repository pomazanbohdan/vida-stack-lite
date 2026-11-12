import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'bun:test';
import { applyPreparedBatch, prepareTargetBatch, type BatchApproval } from '../scripts/convert.ts';
import { applyModulePlan, buildModulePlan, errorMessage, moduleIdFor, modulePilots, moduleSource, optionalAtoms, optionalPilot, parseCli, required, rollbackModulePlan, verifyModuleMigration } from '../scripts/module-migration.ts';
import { verifyArtifact } from '../scripts/source-packets.ts';
import { parseFrontmatter } from '../skills/vp-mode/scripts/frontmatter.ts';
import { parseModuleAtoms, parseModuleSections } from '../skills/vp-mode/scripts/modules.ts';

const powersRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = resolve(powersRoot, '../..');
const scratchRoot = join(repositoryRoot, '.tmp', 'module-pilot', 'module-migration-tests');
const asOf = '2026-11-07T12:00:00.000Z';
const sha = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

function restorePrePilot(root: string): void {
  const moduleIds = [
    'module-gsd-core-agents-gsd-security-auditor-compact-md-40e93f83-c01',
    'module-addy-skills-agents-security-auditor-md-4a372cf3-c01',
  ];
  const restored: Array<{ instruction_id: string; path: string; sha256: string }> = [];
  for (const moduleId of moduleIds) {
    const modulePath = join(root, 'instructions', `${moduleId}.md`);
    if (!existsSync(modulePath)) continue;
    const parsed = parseFrontmatter(readFileSync(modulePath, 'utf8'));
    const records = parseModuleAtoms(String(parsed.data.atoms));
    const members = parseModuleSections(parsed.body, records, moduleId);
    for (const member of members) {
      writeFileSync(join(root, 'instructions', `${member.atom_id}.md`), member.file);
      restored.push({ instruction_id: member.atom_id, path: `instructions/${member.atom_id}.md`, sha256: member.file_sha256 });
    }
    rmSync(modulePath);
  }
  if (restored.length === 0) return;
  const catalogPath = join(root, 'catalog.json');
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8')) as { instructions: Array<{ instruction_id: string; path: string; sha256: string }> };
  const moduleSet = new Set(moduleIds);
  catalog.instructions = catalog.instructions
    .filter((entry) => !moduleSet.has(entry.instruction_id))
    .concat(restored)
    .sort((left, right) => left.instruction_id < right.instruction_id ? -1 : left.instruction_id > right.instruction_id ? 1 : 0);
  writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
}

function copyProduct(pilot: string): string {
  mkdirSync(scratchRoot, { recursive: true });
  const root = mkdtempSync(join(scratchRoot, `copy-${pilot}-`));
  cpSync(powersRoot, root, { recursive: true, filter: (path) => !path.split(/[\\/]/u).some((part) => part === 'node_modules' || part === '.tmp') });
  mkdirSync(join(root, '.tmp'), { recursive: true });
  symlinkSync(join(powersRoot, '.tmp', 'donors'), join(root, '.tmp', 'donors'), 'junction');
  restorePrePilot(root);
  return root;
}

function uniqueStage(prefix: string): string {
  mkdirSync(scratchRoot, { recursive: true });
  return mkdtempSync(join(scratchRoot, `${prefix}-`));
}

function reviewFile(name: string, planSha: string): string {
  const directory = mkdtempSync(join(scratchRoot, 'review-'));
  const path = join(directory, name);
  writeFileSync(path, `${JSON.stringify({ schema: 'VPPreparedBatchReview/v1', planSha256: planSha, verdict: 'READY', reviewer: 'independent-rehearsal-reviewer', pointer: `rehearsal:${name}:${path}` }, null, 2)}\n`, { flag: 'w' });
  return path;
}

function setUnclassified(root: string, instructionId: string): void {
  const catalogPath = join(root, 'catalog.json');
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8')) as { instructions: Array<{ instruction_id: string; path: string; sha256: string }> };
  const entry = catalog.instructions.find((item) => item.instruction_id === instructionId);
  if (entry === undefined) throw new Error(`fixture atom missing from catalog: ${instructionId}`);
  const path = join(root, entry.path);
  const original = readFileSync(path, 'utf8');
  const unclassified = original.replace(/classification_status: classified\ninstruction_form: [^\n]+\ndomains:\n(?:  - [^\n]+\n)+/u, 'classification_status: unclassified\nclassification_reason: module-migration test fixture\n');
  if (unclassified === original) throw new Error(`fixture atom classification was not replaced: ${instructionId}`);
  const bytes = Buffer.from(unclassified, 'utf8');
  writeFileSync(path, bytes);
  entry.sha256 = sha(bytes);
  writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
}

async function rehearse(pilot: 'gsd' | 'addy') {
  const root = copyProduct(pilot);
  const staging = uniqueStage(`${pilot}-stage`);
  const planA = await buildModulePlan({ root, staging: join(staging, 'plan'), pilot, asOf });
  const planB = await buildModulePlan({ root, staging: join(staging, 'plan-copy'), pilot, asOf });
  expect(planA.planSha).toBe(planB.planSha);
  expect(planA.counts.atoms).toBe(pilot === 'gsd' ? 3 : 8);
  expect(planA.targetOrder[0]).toBe(planA.modulePath);
  expect(planA.targetOrder.at(-1)).toBe('catalog.json');
  expect(planA.targetOrder.slice(1, -1)).toEqual(planA.atoms.map((atom) => atom.instruction_path));
  expect(sha(readFileSync(join(root, 'catalog.json')))).toBe(planA.catalogBeforeSha256);
  expect(existsSync(join(root, planA.modulePath))).toBe(false);
  for (const atom of planA.atoms) expect(existsSync(join(root, atom.instruction_path))).toBe(true);

  const dry = await applyModulePlan({ root, pilot, staging, asOf, expectedPlanSha: planA.planSha, reviewPath: '', apply: false });
  expect(dry.kind).toBe('dry-run');
  const review = reviewFile(`${pilot}-apply-review.json`, planA.planSha);
  const applied = await applyModulePlan({ root, pilot, staging, asOf, expectedPlanSha: planA.planSha, reviewPath: review, apply: true, writer: 'm2a-rehearsal-root' });
  expect(applied.kind).toBe('applied');
  const verification = await verifyModuleMigration(root, applied.batchDirectory, join(repositoryRoot, 'vida-project-profile.json'));
  expect(verification.issues).toEqual([]);
  expect(verification.checks.corpusIssueCount).toBe(0);
  expect(verification.checks.moduleGetCode).toBe('CATALOG_MODULE_ATOM_REQUIRED');
  expect(verification.checks.moduleSearchCount).toBe(1);
  expect(verification.checks.receiptCount).toBeGreaterThan(0);
  expect((verification.checks.atomParity as unknown[]).length).toBe(planA.atoms.length);

  const rollbackDry = await rollbackModulePlan({ batchDir: applied.batchDirectory, staging, apply: false });
  expect(rollbackDry.kind).toBe('dry-run');
  expect(rollbackDry.targets[0]?.path).toBe(planA.modulePath);
  expect(rollbackDry.targets.at(-1)?.path).toBe('catalog.json');
  const rollbackReview = reviewFile(`${pilot}-rollback-review.json`, rollbackDry.planSha);
  const rolledBack = await rollbackModulePlan({ batchDir: applied.batchDirectory, reviewPath: rollbackReview, staging, apply: true, writer: 'm2a-rehearsal-root' });
  expect(rolledBack.kind).toBe('applied');
  expect(sha(readFileSync(join(root, 'catalog.json')))).toBe(planA.catalogBeforeSha256);
  expect(existsSync(join(root, planA.modulePath))).toBe(false);
  for (const atom of planA.atoms) expect(sha(readFileSync(join(root, atom.instruction_path)))).toBe(atom.file_sha256);
  expect(JSON.parse(readFileSync(join(root, 'corpus-map.json'), 'utf8'))).toEqual(JSON.parse(readFileSync(join(powersRoot, 'corpus-map.json'), 'utf8')));
  return { plan: planA, applied, verification, rolledBack };
}

describe('module migration M2a', () => {
  test('CLI helpers cover flag parsing and value validation', () => {
    const parsed = parseCli(['--root', 'a', '--apply']);
    expect(parsed.values.get('--root')).toBe('a');
    expect(parsed.flags.has('--apply')).toBe(true);
    expect(() => parseCli(['x'])).toThrow('unexpected argument: x');
    expect(() => parseCli(['--root'])).toThrow('--root requires a value');
    expect(() => parseCli(['--root', 'a', '--root', 'b'])).toThrow('duplicate argument: --root');

    expect(() => required(new Map(), '--root')).toThrow('--root is required');
    expect(required(new Map([['--root', 'a']]), '--root')).toBe('a');
    expect(optionalPilot(new Map())).toBe('gsd');
    expect(optionalPilot(new Map([['--pilot', 'addy']]))).toBe('addy');
    expect(() => optionalPilot(new Map([['--pilot', 'invalid']]))).toThrow('--pilot must be gsd or addy');
    expect(moduleSource(new Map([['--donor', 'other'], ['--source', 'path.md']]))).toEqual({ source: { donor: 'other', path: 'path.md' } });
    expect(moduleSource(new Map())).toEqual({ pilot: 'gsd' });
    expect(moduleSource(new Map([['--pilot', 'addy']]))).toEqual({ pilot: 'addy' });
    expect(() => moduleSource(new Map([['--pilot', 'gsd'], ['--donor', 'other'], ['--source', 'path.md']]))).toThrow('--pilot is mutually exclusive');
    expect(() => moduleSource(new Map([['--donor', 'other']]))).toThrow('provided together');
    expect(optionalAtoms(new Map())).toBeUndefined();
    expect(optionalAtoms(new Map([['--atoms', ' a, b ']]))).toEqual(['a', 'b']);
    expect(() => optionalAtoms(new Map([['--atoms', 'a,,b']]))).toThrow('--atoms must be a comma-separated list of IDs');
    expect(errorMessage(new Error('x'))).toBe('x');
    expect(errorMessage('x')).toBe('x');
  });

  test('general source selector validates groups, packaging, and stable ordinals', async () => {
    const root = copyProduct('general-selector'); const staging = uniqueStage('general-selector-stage');
    const donor = modulePilots.gsd.donor; const path = modulePilots.gsd.path; const ids = [...modulePilots.gsd.ids];
    const defaultPlan = await buildModulePlan({ root, source: { donor, path }, staging: join(staging, 'default'), asOf });
    expect(defaultPlan.atoms.map((atom) => atom.atom_id)).toEqual([...ids].sort());
    const first = ids.slice(0, 2);
    const plan = await buildModulePlan({ root, source: { donor, path }, atoms: first, staging: join(staging, 'plan'), asOf });
    expect(plan.pilot).toBeNull(); expect(plan.atoms.map((atom) => atom.atom_id)).toEqual(first);
    expect(plan.moduleId).toBe('module-gsd-core-agents-gsd-security-auditor-compact-md-40e93f83-c01');
    const preparedManifest = JSON.parse((await verifyArtifact(plan.batchDirectory, plan.batchManifest)).toString('utf8')) as { targets: Array<{ staged: { path: string; sha256: string } | null }> };
    const stagedModule = preparedManifest.targets[0]?.staged;
    if (stagedModule === null || stagedModule === undefined) throw new Error('prepared module target is missing');
    const moduleText = (await verifyArtifact(plan.batchDirectory, stagedModule)).toString('utf8');
    expect(moduleText).toContain('title: "gsd-core: agents/gsd-security-auditor.compact.md module"');
    expect(moduleText).toContain('summary: "Carrier for 2 atomic instructions from gsd-core:agents/gsd-security-auditor.compact.md."');
    expect(moduleIdFor({ donor, path }, [{ instruction_id: plan.moduleId }]).ordinal).toBe(2);
    const planOut = join(staging, 'generic-module-plan.json');
    const planCli = spawnSync(process.execPath, [join(powersRoot, 'scripts', 'module-plan.ts'), '--root', root, '--donor', donor, '--source', path, '--atoms', first.join(','), '--staging', join(staging, 'cli-plan'), '--out', planOut, '--as-of', asOf], { encoding: 'utf8' });
    expect(planCli.status).toBe(0); expect(JSON.parse(readFileSync(planOut, 'utf8')).moduleId).toBe(plan.moduleId);
    await expect(buildModulePlan({ root, source: { donor, path }, atoms: [first[0]!, first[0]!], staging: join(staging, 'duplicate'), asOf })).rejects.toThrow('unique atom IDs');
    await expect(buildModulePlan({ root, source: { donor, path }, atoms: [modulePilots.addy.ids[0]!, ids[1]!], staging: join(staging, 'outside'), asOf })).rejects.toThrow('belong to the selected');
    await expect(buildModulePlan({ root, source: { donor, path }, atoms: [ids[0]!], staging: join(staging, 'singleton'), asOf })).rejects.toThrow('one-atom chunks');
    await expect(buildModulePlan({ root, source: { donor, path }, atoms: Array.from({ length: 9 }, (_, index) => `atom-${index}`), staging: join(staging, 'oversized'), asOf })).rejects.toThrow('2..8');
    const review = reviewFile('general-selector-review.json', plan.planSha);
    const applyCli = spawnSync(process.execPath, [join(powersRoot, 'scripts', 'module-apply.ts'), '--root', root, '--donor', donor, '--source', path, '--atoms', first.join(','), '--staging', staging, '--as-of', asOf, '--expected-plan-sha', plan.planSha, '--review', review, '--apply'], { encoding: 'utf8' });
    expect(applyCli.status).toBe(0); expect(JSON.parse(applyCli.stdout).kind).toBe('applied');
    await expect(buildModulePlan({ root, source: { donor, path }, atoms: first, staging: join(staging, 'overlap'), asOf })).rejects.toThrow('overlaps an existing module');
  }, 120_000);

  test('rejects an invalid review before writing module targets', async () => {
    mkdirSync(scratchRoot, { recursive: true });
    const root = copyProduct('invalid-review');
    const staging = uniqueStage('invalid-review-stage');
    const plan = await buildModulePlan({ root, staging: join(staging, 'plan'), pilot: 'gsd', asOf });
    const catalogPath = join(root, 'catalog.json');
    const catalogBefore = sha(readFileSync(catalogPath));
    const invalidReview = join(staging, 'invalid-review.json');
    writeFileSync(invalidReview, `${JSON.stringify({ schema: 'VPPreparedBatchReview/v2', planSha256: plan.planSha, verdict: 'READY', reviewer: 'fixture-reviewer', pointer: 'fixture:invalid' })}\n`);

    await expect(applyModulePlan({ root, staging, pilot: 'gsd', asOf, expectedPlanSha: plan.planSha, reviewPath: invalidReview, apply: true })).rejects.toThrow('review must be VPPreparedBatchReview/v1 READY and bind the exact planSha256');
    expect(sha(readFileSync(catalogPath))).toBe(catalogBefore);
    expect(existsSync(join(root, plan.modulePath))).toBe(false);
    for (const atom of plan.atoms) expect(existsSync(join(root, atom.instruction_path))).toBe(true);
  }, 60_000);

  test('verifies atom parity for classified and unclassified fixture atoms', async () => {
    mkdirSync(scratchRoot, { recursive: true });
    const root = copyProduct('classification');
    const [unclassifiedId, classifiedId] = modulePilots.gsd.ids;
    if (unclassifiedId === undefined || classifiedId === undefined) throw new Error('fixture pilot requires two atom IDs');
    setUnclassified(root, unclassifiedId);
    const atomIds = [unclassifiedId, classifiedId];
    const staging = uniqueStage('classification-stage');
    const plan = await buildModulePlan({ root, staging: join(staging, 'plan'), pilot: 'gsd', atoms: atomIds, asOf });
    const review = reviewFile('classification-apply-review.json', plan.planSha);
    const applied = await applyModulePlan({ root, staging, pilot: 'gsd', atoms: atomIds, asOf, expectedPlanSha: plan.planSha, reviewPath: review, apply: true, writer: 'm2a-fixture-root' });
    const verification = await verifyModuleMigration(root, applied.batchDirectory, join(repositoryRoot, 'vida-project-profile.json'));
    expect(verification.issues).toEqual([]);
    expect(verification.checks.atomParity).toEqual([
      { atomId: unclassifiedId, content: true, metadata: true },
      { atomId: classifiedId, content: true, metadata: true },
    ]);
  }, 60_000);

  test('plans deterministically and rehearses 3-atom and 8-atom cohorts through rollback', async () => {
    mkdirSync(scratchRoot, { recursive: true });
    const gsd = await rehearse('gsd');
    const addy = await rehearse('addy');
    expect(gsd.plan.counts.atoms).toBe(3);
    expect(addy.plan.counts.atoms).toBe(8);
    expect(gsd.applied.kind).toBe('applied');
    expect(addy.applied.kind).toBe('applied');
    expect(gsd.rolledBack.kind).toBe('applied');
    expect(addy.rolledBack.kind).toBe('applied');
  }, 240_000);

  test('catalog CAS drift rejects the rebuilt plan before product writes', async () => {
    const root = copyProduct('cas');
    const staging = uniqueStage('cas-stage');
    const plan = await buildModulePlan({ root, staging: join(staging, 'plan'), pilot: 'gsd', asOf });
    const catalogPath = join(root, 'catalog.json');
    const original = readFileSync(catalogPath);
    writeFileSync(catalogPath, Buffer.concat([original, Buffer.from(' ', 'utf8')]));
    await expect(applyModulePlan({ root, staging, pilot: 'gsd', asOf, expectedPlanSha: plan.planSha, reviewPath: '', apply: false })).rejects.toThrow('plan SHA mismatch');
    expect(existsSync(join(root, plan.modulePath))).toBe(false);
  }, 60_000);

  test('partial publication is terminal and fenced against retry', async () => {
    const root = copyProduct('fence');
    const first = 'module-m2a-fence-first.tmp'; const second = 'module-m2a-fence-second.tmp';
    const before = Buffer.from('before');
    writeFileSync(join(root, first), before); writeFileSync(join(root, second), before);
    const staging = uniqueStage('fence-stage');
    const batch = await prepareTargetBatch([
      { path: first, bytes: Buffer.from('after-first') }, { path: second, bytes: Buffer.from('after-second') },
    ], { root, stagingRoot: staging, stagingPrefix: 'fence-batch' });
    const manifest = JSON.parse((await verifyArtifact(batch.directory, batch.manifest)).toString('utf8')) as { targets: Array<{ staged: { path: string } | null }> };
    expect(manifest.targets[1]?.staged).not.toBeNull();
    chmodSync(join(root, second), 0o444);
    const reviewRel = 'review.json';
    const review = Buffer.from(`${JSON.stringify({ schema: 'VPPreparedBatchReview/v1', planSha256: batch.manifest.sha256, verdict: 'READY', reviewer: 'independent-reviewer', pointer: 'rehearsal:fence' })}\n`);
    writeFileSync(join(staging, reviewRel), review);
    const approval: BatchApproval = { review: { path: reviewRel, sha256: sha(review) }, observe: async () => ({ kind: 'observed', writer: 'm2a-test-root', reviewPointer: 'rehearsal:fence' }) };
    const outcome = await applyPreparedBatch(batch, approval);
    chmodSync(join(root, second), 0o644);
    expect(outcome.kind).toBe('partial-or-unknown');
    expect(readFileSync(join(root, first), 'utf8')).toBe('after-first');
    expect(readFileSync(join(root, second), 'utf8')).toBe('before');
    await expect(applyPreparedBatch(batch, approval)).rejects.toThrow('retry is fenced');
  }, 60_000);
});
