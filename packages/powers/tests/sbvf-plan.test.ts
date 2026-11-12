import { afterEach, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { buildSbvfPlan, deriveApplicability, runSbvfPlanCli, setPlanProcessExitCode, startSbvfPlanEntrypoint, updateDonorFileInstructionIds, yaml } from '../scripts/sbvf-plan.ts';
import { parseFrontmatter } from '../skills/vp-mode/scripts/frontmatter.ts';
import { parseVariantScalar, parseVariantSections } from '../skills/vp-mode/scripts/variants.ts';
import { buildSbvfFixtureCorpus, type FixtureAdmission } from './sbvf-fixture-corpus.ts';

const cleanups: string[] = [];
afterEach(async () => { await Promise.all(cleanups.splice(0).map(path => rm(path, { recursive: true, force: true }))); });
const sha = (value: Uint8Array | string): string => createHash('sha256').update(value).digest('hex');

const pilotAdmissions = new Map<string, FixtureAdmission[]>([
  ['stacks/vue.csv', [
    { row: 1, instructionId: 'uupm-fixture-vue-state-a', title: 'Use Composition API for new projects' },
    { row: 2, instructionId: 'uupm-fixture-vue-state-b', title: 'Use script setup syntax' },
  ]],
  ['stacks/react.csv', [
    { row: 1, instructionId: 'uupm-fixture-react-state-a', title: 'Use useState for local state' },
    { row: 2, instructionId: 'uupm-fixture-react-state-b', title: 'Lift state up when needed' },
  ]],
]);
const pilotManifest = {
  schema: 'SBVFFamilyManifest/v1',
  families: [
    { family_id: 'family-fixture-plan-a', title: 't', summary: 's', rationale: 'r', variants: ['uupm-fixture-vue-state-a', 'uupm-fixture-react-state-a'], approved_by: 'devin', approved_at: '2026-11-07T00:00:00Z' },
    { family_id: 'family-fixture-plan-b', title: 't', summary: 's', rationale: 'r', variants: ['uupm-fixture-vue-state-b', 'uupm-fixture-react-state-b'], approved_by: 'devin', approved_at: '2026-11-07T00:00:00Z' },
  ],
};
const pilotVariantIds = ['uupm-fixture-vue-state-a', 'uupm-fixture-react-state-a', 'uupm-fixture-vue-state-b', 'uupm-fixture-react-state-b'];

async function pilotFixture(): Promise<{ root: string; manifestPath: string }> {
  const area = await mkdtemp(join(tmpdir(), 'vp-sbvf-plan-')); cleanups.push(area);
  const root = join(area, 'product');
  await buildSbvfFixtureCorpus(root, pilotAdmissions);
  const manifestPath = join(area, 'manifest.json');
  await writeFile(manifestPath, `${JSON.stringify(pilotManifest, null, 2)}\n`);
  return { root, manifestPath };
}

test('applicability labels derive framework ranges and reject unparseable text', () => {
  expect(deriveApplicability('react 19.2.x')).toMatchObject({ frameworks: [{ name: 'react', versionRange: { raw: '19.2.x' }, sourceLabel: 'react 19.2.x' }], requiredContext: ['framework:react'] });
  expect(deriveApplicability('react-native 0.86.x (official active line)')).toMatchObject({ frameworks: [{ name: 'react-native', versionRange: { raw: '0.86.x' }, sourceLabel: 'react-native 0.86.x (official active line)' }], requiredContext: ['framework:react-native'] });
  expect(() => deriveApplicability('current framework')).toThrow('unparseable applicability label');
});

test('frontmatter value encoding covers supported values and rejects invalid payloads', () => {
  expect(yaml('quoted "text" \\ value')).toBe('"quoted \\"text\\" \\\\ value"');
  expect(yaml([])).toBe('[]'); expect(yaml(['one', 'two'])).toContain('  - "one"');
  expect(yaml(3)).toBe('3'); expect(yaml(true)).toBe('true');
  expect(() => yaml('bad\nvalue')).toThrow('control characters');
  expect(() => yaml({ unsupported: true })).toThrow('unsupported frontmatter value');
});

test('donor file references replace pilot variants and preserve unrelated IDs', () => {
  const donors = { donor: { files: { source: { instruction_ids: ['variant-one', 'legacy', 'variant-one'] } } } };
  updateDonorFileInstructionIds(donors, new Map([['variant-one', 'family-one']]));
  expect(donors.donor.files.source.instruction_ids).toEqual(['family-one', 'legacy']);
  const previous = process.exitCode; setPlanProcessExitCode(0); expect(process.exitCode).toBe(0); process.exitCode = previous;
});

test('pilot manifest stages deterministic family, v3 map/catalog outputs and deletes without product writes', async () => {
  const { root, manifestPath } = await pilotFixture();
  const staging = join(root, '..', 'staging'); await mkdir(staging);
  const asOf = '2026-11-07T00:00:00Z';
  const catalogBefore = JSON.parse(await readFile(join(root, 'catalog.json'), 'utf8')) as { instructions: unknown[] };
  const beforeCount = catalogBefore.instructions.length;
  const productPaths = ['catalog.json', 'corpus-map.json', ...pilotVariantIds.map(id => `instructions/${id}.md`)];
  const before = new Map(await Promise.all(productPaths.map(async path => [path, await readFile(join(root, path))] as const)));
  const plan = await buildSbvfPlan(root, manifestPath, asOf, staging);
  const repeat = await buildSbvfPlan(root, manifestPath, asOf);
  expect(plan.planSha256).toBe(repeat.planSha256);
  expect(plan.families).toHaveLength(2); expect(plan.variants).toHaveLength(4);
  expect(plan.bindingChanges).toMatchObject({ singletonToFamily: 4 });
  expect(plan.catalogDelta).toMatchObject({ beforeCount, afterCount: beforeCount - 2, removed: expect.arrayContaining(['uupm-fixture-vue-state-a']), added: expect.arrayContaining(['family-fixture-plan-a']) });
  expect(plan.deleteList).toHaveLength(4);
  const batchDir = (await readdir(staging))[0];
  const manifest = JSON.parse(await readFile(join(staging, batchDir!, 'plan.json'), 'utf8'));
  const output = async (path: string): Promise<Buffer> => {
    const target = manifest.targets.find((item: { path: string }) => item.path === path);
    expect(target.staged).not.toBeNull();
    const bytes = await readFile(join(staging, target.staged.path)); expect(sha(bytes)).toBe(target.after); return bytes;
  };
  for (const family of plan.families as Array<{ familyId: string; variants: string[]; path: string; sha256: string }>) {
    const bytes = await output(family.path); expect(sha(bytes)).toBe(family.sha256);
    const parsed = parseFrontmatter(bytes.toString('utf8'));
    const variants = parseVariantScalar(String(parsed.data.instruction_variants), family.familyId);
    const sections = parseVariantSections(parsed.body, variants, family.familyId);
    for (const variant of variants) {
      const oldId = variant.variant_id;
      const oldPath = `instructions/${oldId}.md`;
      const old = parseFrontmatter((before.get(oldPath) ?? await readFile(join(root, oldPath))).toString('utf8'));
      expect(sections.get(oldId)).toBe(old.body);
      expect(variant.contentSha256).toBe(sha(old.body));
    }
  }
  const map = JSON.parse((await output('corpus-map.json')).toString('utf8'));
  expect(map.schema).toBe('VPCorpusMap/v3');
  for (const source of Object.values(map.donors.uupm.csvSources) as Array<{ rows: Array<{ bindings: Array<{ instructionId: string; variantId?: string }> }> }>) for (const row of source.rows) for (const binding of row.bindings) {
    expect(binding.variantId).toBeDefined();
    if (pilotVariantIds.includes(binding.variantId ?? '')) expect(binding.instructionId.startsWith('family-')).toBe(true);
  }
  const catalog = JSON.parse((await output('catalog.json')).toString('utf8'));
  expect(catalog.instructions.some((item: { instruction_id: string }) => item.instruction_id === 'family-fixture-plan-a')).toBe(true);
  expect(catalog.instructions.some((item: { instruction_id: string }) => item.instruction_id === 'uupm-fixture-vue-state-a')).toBe(false);
  for (const [path, bytes] of before) expect(await readFile(join(root, path))).toEqual(bytes);
  const out = join(staging, 'plan.json'); const stdout: string[] = []; const stderr: string[] = [];
  expect(await runSbvfPlanCli(['--root', root, '--manifest', manifestPath, '--staging', staging, '--as-of', asOf, '--check', String(plan.planSha256), '--out', out], { stdout: value => stdout.push(value), stderr: value => stderr.push(value) })).toBe(0);
  expect(JSON.parse(await readFile(out, 'utf8')).planSha256).toBe(plan.planSha256); expect(stderr).toEqual([]);
  const deleteTarget = manifest.targets.find((item: { after: string | null }) => item.after === null);
  const planPath = join(staging, batchDir!, 'plan.json');
  deleteTarget.staged = { path: 'forged-output.txt', sha256: '0'.repeat(64) };
  await writeFile(planPath, JSON.stringify(manifest));
  expect(await runSbvfPlanCli(['--root', root, '--manifest', manifestPath, '--staging', staging, '--as-of', asOf, '--check', String(plan.planSha256)], { stdout: () => undefined, stderr: value => stderr.push(value) })).toBe(1);
  expect(stderr.at(-1)).toContain('delete target unexpectedly has output');
  deleteTarget.staged = null; await writeFile(planPath, JSON.stringify(manifest));
  const stagedTarget = manifest.targets.find((item: { staged: { path: string } | null }) => item.staged !== null);
  await writeFile(join(staging, stagedTarget.staged.path), 'corrupted staged bytes');
  expect(await runSbvfPlanCli(['--root', root, '--manifest', manifestPath, '--staging', staging, '--as-of', asOf, '--check', String(plan.planSha256)], { stdout: () => undefined, stderr: value => stderr.push(value) })).toBe(1);
  expect(stderr.at(-1)).toContain('staged output hash mismatch');
  const emptyStage = join(staging, 'empty-stage'); await mkdir(emptyStage);
  expect(await runSbvfPlanCli(['--root', root, '--manifest', manifestPath, '--staging', emptyStage, '--as-of', asOf, '--check', String(plan.planSha256)], { stdout: () => undefined, stderr: value => stderr.push(value) })).toBe(1);
  expect(stderr.at(-1)).toContain('no staged prepared batch matches');
}, 30_000);

test('plan CLI reports argument, date, and plan SHA failures without staging', async () => {
  const { root, manifestPath } = await pilotFixture();
  const stderr: string[] = []; const output = { stdout: () => undefined, stderr: (value: string) => stderr.push(value) };
  expect(await runSbvfPlanCli(['--root'], output)).toBe(1); expect(stderr.at(-1)).toContain('requires a value');
  expect(await runSbvfPlanCli(['--unknown', 'value'], output)).toBe(1); expect(stderr.at(-1)).toContain('unknown argument');
  expect(await runSbvfPlanCli(['--as-of', 'bad'], output)).toBe(1); expect(stderr.at(-1)).toContain('ISO-8601');
  expect(await runSbvfPlanCli(['--root', root, '--manifest', manifestPath, '--check', 'bad'], output)).toBe(1); expect(stderr.at(-1)).toContain('plan SHA mismatch');
  expect(await startSbvfPlanEntrypoint([], output, () => undefined)).toBe(false);
  const entryFile = fileURLToPath(new URL('../scripts/sbvf-plan.ts', import.meta.url)); const codes: number[] = [];
  expect(await startSbvfPlanEntrypoint(['bun', entryFile, '--unknown', 'value'], output, code => codes.push(code))).toBe(true);
  expect(codes).toEqual([1]);
});

test('plan rejects variants without one admitted binding and READY receipt', async () => {
  const { root, manifestPath } = await pilotFixture();
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  manifest.families[0].variants[1] = 'uupm-fixture-unbound-variant';
  const path = join(root, '..', 'invalid-manifest.json'); await writeFile(path, JSON.stringify(manifest));
  await expect(buildSbvfPlan(root, path, '2026-11-07T00:00:00Z')).rejects.toThrow(/exactly one corpus binding|READY matching fidelity receipt|not an admitted catalog instruction/u);
});
