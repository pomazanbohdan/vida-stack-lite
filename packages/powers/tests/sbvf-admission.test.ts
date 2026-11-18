import { afterEach, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  admissionManifestSchemaPath, batchTagForManifest, categoryTagPair, createAdmissionContext,
  deriveVariantApplicability, deriveVariantId, fidelityDirFor, generateAdmission, sealFamilyAdmissions,
  slugify, stackDoesNotApplyWhen, stackNameFor, uupmContentRoot, type AdmissionContext, type GeneratedAdmission,
} from '../scripts/sbvf-admission.ts';
import { cellHash, parseCsv } from '../scripts/csv-intake.ts';
import { checkCorpus } from '../scripts/check-corpus.ts';
import { buildCensus } from '../scripts/sbvf-census.ts';
import { buildSbvfPlan, buildSbvfPlanWithBatch } from '../scripts/sbvf-plan.ts';
import { runSbvfApplyCli } from '../scripts/sbvf-apply.ts';
import { runSbvfRollbackCli } from '../scripts/sbvf-rollback.ts';
import { runSbvfVerifyCli } from '../scripts/sbvf-verify.ts';
import { parseFrontmatter } from '../skills/vp-mode/scripts/frontmatter.ts';
import { parseVariantScalar, parseVariantSections } from '../skills/vp-mode/scripts/variants.ts';
import { validateAgainstSchema, type Schema } from '../skills/vp-mode/scripts/schema.ts';
import { buildSbvfFixtureCorpus } from './sbvf-fixture-corpus.ts';

type Dict = Record<string, unknown>;
const cleanups: string[] = [];
afterEach(async () => { await Promise.all(cleanups.splice(0).map(path => rm(path, { recursive: true, force: true }))); });
const sha = (value: Uint8Array | string): string => createHash('sha256').update(value).digest('hex');
const isRecord = (value: unknown): value is Dict => typeof value === 'object' && value !== null && !Array.isArray(value);

const CSV_HEADERS = ['Stack', 'Category', 'Title', 'Description', 'Do', "Don't", 'Severity', 'Applies To', 'Code Good', 'Code Bad'];
const CSV_ROLES = ['metadata-other', 'metadata-other', 'normative-title', 'normative-description', 'normative-direction', 'normative-exception', 'metadata-severity', 'metadata-applicability', 'normative-example', 'normative-example'];
const CSV_ROW = ['test', 'XAML', 'Use x for y', 'Always prefer x when wiring y.', 'Wire x directly.', 'Do not wire y manually.', 'high', 'testfw current', 'wireX();', 'wireY();'];

async function fixtureRoot(): Promise<{ root: string; rawSha256: string; cellHashes: string[]; recordLine: number }> {
  const root = await mkdtemp(join(tmpdir(), 'vp-sbvf-admission-')); cleanups.push(root);
  const csvDir = join(root, '.tmp', 'donors', 'uupm', 'data');
  await mkdir(join(csvDir, 'stacks'), { recursive: true });
  await mkdir(join(root, 'instructions'), { recursive: true });
  const csvText = `${CSV_HEADERS.join(',')}\n${CSV_ROW.join(',')}\n`;
  await writeFile(join(csvDir, 'stacks', 'test.csv'), csvText);
  await writeFile(join(root, 'donors.yaml'), `local_root: ${join(root, '.tmp', 'donors').replace(/\\/gu, '/')}\n  - id: uupm\n    local_path: uupm\n    content_path: data\n`);
  await writeFile(join(root, 'instructions', 'uupm-test-sibling.md'), [
    '---',
    'classification_reason: "h2-csv-pilot-not-classified"',
    'capability_tags:', '  - "design-user-interface"',
    'pattern_tags:', '  - "design-system-adherence"',
    'conditions_applies_when: "XAML guidance for testfw current."',
    'conditions_does_not_apply_when: "A context where the test convention makes the rule unsafe."',
    '---', '', 'Sibling body.', '',
  ].join('\n'));
  const parsed = parseCsv(new TextEncoder().encode(csvText));
  const record = parsed.rows[0]!;
  return { root, rawSha256: parsed.rawSha256, cellHashes: record.cells.map(cellHash), recordLine: record.line };
}

function admissionRequest(root: string, fixture: { rawSha256: string; cellHashes: string[] }, overrides: Partial<Parameters<typeof generateAdmission>[2]> = {}): Parameters<typeof generateAdmission>[2] {
  const columns = CSV_HEADERS.map((header, index) => ({ index, header, role: CSV_ROLES[index]! }));
  return {
    variantId: 'uupm-test-use-x-for-y', familyId: 'family-test-admission',
    file: 'stacks/test.csv', rowKey: 'rk-test-1',
    unit: { file: 'stacks/test.csv', rowKey: 'rk-test-1', locator: { line: 2, row: 1 }, title: 'Use x for y', applicabilityLabel: 'testfw current', domain: 'stack', disposition: 'deferred', status: 'deferred' },
    mapRow: { cellHashes: fixture.cellHashes },
    csvSource: { rawSha256: fixture.rawSha256, columns },
    admission: { variant_id: 'uupm-test-use-x-for-y', family_id: 'family-test-admission', source: { donor: 'uupm', path: 'stacks/test.csv', rowKey: 'rk-test-1' }, disposition: 'family-held', rationale: 'test', approved_by: 'devin', approved_at: '2026-11-20T00:00:00Z' },
    sourceRevision: 'rev-test-1', asOf: '2026-11-20T00:00:00Z',
    ...overrides,
  };
}

test('variant ID derivation is deterministic, stack-aware and collision-safe', () => {
  expect(slugify('Use x:Bind for compiled bindings!')).toBe('use-x-bind-for-compiled-bindings');
  expect(stackNameFor('stacks/winui.csv')).toBe('winui');
  expect(stackNameFor('stacks/html-tailwind.csv')).toBe('html-tailwind');
  expect(stackNameFor('ux-guidelines.csv')).toBe('ux');
  expect(fidelityDirFor('stacks/winui.csv')).toBe('stacks');
  expect(fidelityDirFor('ux-guidelines.csv')).toBe('ux-guidelines');
  expect(() => fidelityDirFor('other/file.csv')).toThrow('unsupported UUPM CSV layout');
  const used = new Set(['uupm-winui-use-x']);
  expect(deriveVariantId('stacks/winui.csv', 'Use x', used)).toBe('uupm-winui-use-x-2');
  expect(deriveVariantId('ux-guidelines.csv', 'Keep labels visible', new Set())).toBe('uupm-ux-keep-labels-visible');
  expect(() => deriveVariantId('stacks/winui.csv', '!!!', new Set())).toThrow('cannot derive variant ID');
  expect(batchTagForManifest('C:/x/config/sbvf-admissions-xaml-mvvm.json')).toBe('xaml-mvvm');
  expect(batchTagForManifest('C:/x/admissions.json')).toBe('admission');
});

test('variant applicability keeps strict ranges and degrades non-range labels to name-only facts', () => {
  const strict = deriveVariantApplicability('react 19.2.x') as { frameworks: Array<{ name: string; versionRange?: { raw: string } }> };
  expect(strict.frameworks[0]).toMatchObject({ name: 'react', versionRange: { raw: '19.2.x' } });
  const fallback = deriveVariantApplicability('winui current windows app sdk') as { frameworks: Array<{ name: string; versionRange?: unknown; sourceLabel: string }> };
  expect(fallback.frameworks[0]).toMatchObject({ name: 'winui', sourceLabel: 'winui current windows app sdk' });
  expect(fallback.frameworks[0]!.versionRange).toBeUndefined();
  expect((deriveVariantApplicability('uwp legacy') as { frameworks: Array<{ name: string }> }).frameworks[0]!.name).toBe('uwp');
  expect((deriveVariantApplicability('html-tailwind 4.3') as { frameworks: Array<{ name: string }> }).frameworks[0]!.name).toBe('html-tailwind');
  expect(() => deriveVariantApplicability('!!!')).toThrow('unparseable applicability label');
});

test('admission context derives category tags and per-stack DNA from admitted siblings', async () => {
  const { root } = await fixtureRoot();
  const ctx = createAdmissionContext(root);
  expect(categoryTagPair(ctx, 'XAML')).toEqual({ capability: ['design-user-interface'], pattern: ['design-system-adherence'] });
  expect(stackDoesNotApplyWhen(ctx, 'stacks/test.csv')).toBe('A context where the test convention makes the rule unsafe.');
  expect(stackDoesNotApplyWhen(ctx, 'stacks/other.csv')).toBe('A context where the platform convention or the stated exception makes the rule unsafe.');
  expect(() => categoryTagPair(ctx, 'Missing')).toThrow('no admitted sibling tags');
});

test('generateAdmission builds body, metadata, bindings and fails closed on bad rows', async () => {
  const { root, rawSha256, cellHashes, recordLine } = await fixtureRoot();
  expect(uupmContentRoot(root)).toBe(join(root, '.tmp', 'donors', 'uupm', 'data'));
  const ctx = createAdmissionContext(root);
  const request = admissionRequest(root, { rawSha256, cellHashes });
  request.unit.locator = { line: recordLine, row: 1 };
  const generated = generateAdmission(root, ctx, request);
  expect(generated.body.startsWith('# Use x for y\n')).toBe(true);
  expect(generated.body.endsWith('\n')).toBe(true);
  expect(generated.body).toContain('**Applies To:** testfw current');
  expect(generated.body).toContain('**Don\'t:** Do not wire y manually.');
  expect(generated.contentSha256).toBe(sha(generated.body));
  expect(generated.source).toEqual({ donor: 'uupm', path: 'stacks/test.csv', rowKey: 'rk-test-1', rawSha256 });
  expect(generated.metadata).toMatchObject({
    title: 'Use x for y', summary: 'Always prefer x when wiring y.',
    capability_tags: ['design-user-interface'], pattern_tags: ['design-system-adherence'],
    conditions_applies_when: 'XAML guidance for testfw current.',
    conditions_does_not_apply_when: 'A context where the test convention makes the rule unsafe.',
    status: 'active', revision: 1, classification_status: 'unclassified',
    classification_reason: 'h2-csv-pilot-not-classified',
  });
  expect(generated.bindingCells).toHaveLength(6);
  for (const cell of generated.bindingCells) {
    expect(isRecord(cell)).toBe(true);
    expect(Array.isArray((cell as Dict).locators)).toBe(true);
    expect((cell as Dict).cellHash).toMatch(/^[0-9a-f]{64}$/u);
  }
  const nonDeferred = admissionRequest(root, { rawSha256, cellHashes });
  nonDeferred.unit = { ...nonDeferred.unit, disposition: 'admitted' };
  expect(() => generateAdmission(root, ctx, nonDeferred)).toThrow('not deferred');
  const noLabel = admissionRequest(root, { rawSha256, cellHashes });
  noLabel.unit = { ...noLabel.unit, applicabilityLabel: '' };
  expect(() => generateAdmission(root, ctx, noLabel)).toThrow('no applicability label');
});

test('sealFamilyAdmissions emits deterministic v2 receipts and per-file evidence', () => {
  const item = (variantId: string, file: string): GeneratedAdmission => ({
    variantId, familyId: 'family-test', file, rowKey: `rk-${variantId}`, locator: { line: 2, row: 1 },
    disposition: 'family-held', metadata: {}, body: '# b\n', contentSha256: sha('# b\n'),
    source: { donor: 'uupm', path: file, rowKey: `rk-${variantId}`, rawSha256: 'a'.repeat(64) },
    sourceLabel: 'testfw current', applicability: {}, bindingCells: [
      { columnIndex: 2, columnHeader: 'Title', cellHash: 'b'.repeat(64), role: 'normative-title', locator: { line: 2, row: 1, column: 3 }, locators: [{ line: 2, row: 1, column: 3 }] },
    ],
    evidenceRow: { variantId, familyId: 'family-test', rowKey: `rk-${variantId}`, locator: { line: 2, row: 1 }, disposition: 'family-held', verdict: 'READY', notes: 'n' },
  });
  const items = [item('uupm-winui-a', 'stacks/winui.csv'), item('uupm-wpf-b', 'stacks/wpf.csv'), item('uupm-winui-c', 'stacks/winui.csv')];
  const options = { asOf: '2026-11-20T00:00:00Z', batchTag: 'test-batch', sourceRevision: 'rev1', rawSha256ByFile: new Map([['stacks/winui.csv', 'c'.repeat(64)], ['stacks/wpf.csv', 'd'.repeat(64)]]) };
  const first = sealFamilyAdmissions(items, options);
  const second = sealFamilyAdmissions([...items].reverse(), options);
  expect(first.admissions.map(a => a.receiptSha256).sort()).toEqual(second.admissions.map(a => a.receiptSha256).sort());
  expect(first.admissions).toHaveLength(3);
  expect(first.targets).toHaveLength(5);
  const evidenceTargets = first.targets.filter(t => t.path.includes('evidence'));
  expect(evidenceTargets).toHaveLength(2);
  const winuiEvidence = evidenceTargets.find(t => t.path.includes('winui'))!;
  const evidenceDoc = JSON.parse(winuiEvidence.bytes.toString('utf8')) as Dict;
  expect(evidenceDoc.schema).toBe('H2FamilyAdmissionEvidence/v1');
  expect((evidenceDoc.rows as Dict[]).map(r => r.variantId).sort()).toEqual(['uupm-winui-a', 'uupm-winui-c']);
  const receiptTarget = first.targets.find(t => t.path.endsWith('uupm-winui-a.json'))!;
  const receipt = JSON.parse(receiptTarget.bytes.toString('utf8')) as Dict;
  expect(receipt).toMatchObject({ schema: 'H2FidelityReceipt/v2', instructionId: 'uupm-winui-a', variantId: 'uupm-winui-a', variantBodySha256: sha('# b\n'), verdict: 'READY', recordedAt: '2026-11-20T00:00:00Z' });
  expect((receipt.reviewer as Dict).kind).toBe('delegated');
  expect((receipt.evidence as Dict).path).toBe(winuiEvidence.path);
  const admission = first.admissions.find(a => a.variantId === 'uupm-winui-a')!;
  expect(admission.receiptPath).toBe(receiptTarget.path);
  expect(admission.evidencePath).toBe(winuiEvidence.path);
  expect(admission.binding).toMatchObject({ instructionId: 'family-test', variantId: 'uupm-winui-a' });
});

test('admission manifest schema accepts family-held rows and rejects other dispositions', async () => {
  const schema = JSON.parse(await readFile(admissionManifestSchemaPath(), 'utf8')) as Schema;
  const base = { variant_id: 'uupm-winui-x', family_id: 'family-x', source: { donor: 'uupm', path: 'stacks/winui.csv', rowKey: 'rk' }, disposition: 'family-held', rationale: 'r', approved_by: 'a', approved_at: '2026-11-20T00:00:00Z', evidence: { path: '.tmp/h2a2-stack-review/winui.json', sha256: 'a'.repeat(64) } };
  expect(validateAgainstSchema({ schema: 'SBVFAdmissionManifest/v1', admissions: [base] }, schema)).toEqual([]);
  expect(validateAgainstSchema({ schema: 'SBVFAdmissionManifest/v1', admissions: [{ ...base, disposition: 'split' }] }, schema).length).toBeGreaterThan(0);
  expect(validateAgainstSchema({ schema: 'SBVFAdmissionManifest/v1', admissions: [{ ...base, variant_id: 'family-x' }] }, schema).length).toBeGreaterThan(0);
  const { evidence: _evidence, ...withoutEvidence } = base;
  expect(validateAgainstSchema({ schema: 'SBVFAdmissionManifest/v1', admissions: [withoutEvidence] }, schema).length).toBeGreaterThan(0);
  expect(validateAgainstSchema({ schema: 'SBVFAdmissionManifest/v1', admissions: [{ ...base, evidence: { path: 'e.json' } }] }, schema).length).toBeGreaterThan(0);
  expect(validateAgainstSchema({ schema: 'SBVFAdmissionManifest/v1', admissions: [{ ...base, approved_by: '' }] }, schema).length).toBeGreaterThan(0);
});

// Admission generation derives category tags and per-stack DNA from admitted
// sibling instructions whose classification_reason is the H2 CSV pilot marker.
// The fixture corpus ships generic rehearsal instructions, so rewrite the two
// admitted fixture instructions into pilot-marker siblings covering the
// categories of the deferred rows under test (vue row 2 = Composition,
// react row 2 = State) and refresh their catalog digests.
async function patchAdmissionSiblings(root: string): Promise<void> {
  const appliesWhen: Record<string, string> = {
    'uupm-fixture-vue-composition.md': 'Composition guidance for vue 3.5.x.',
    'uupm-fixture-react-state.md': 'State guidance for react 19.2.x.',
  };
  const catalogPath = join(root, 'catalog.json');
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8')) as Dict;
  for (const entry of catalog.instructions as Dict[]) {
    const name = String(entry.path).split('/').pop()!;
    const categoryLine = appliesWhen[name];
    if (categoryLine === undefined) continue;
    const path = join(root, String(entry.path));
    const patched = (await readFile(path, 'utf8'))
      .replace('classification_reason: "Fixture rehearsal instruction."', 'classification_reason: "h2-csv-pilot-not-classified"')
      .replace('conditions_applies_when: "The fixture stack guidance applies."', `conditions_applies_when: ${JSON.stringify(categoryLine)}`);
    await writeFile(path, patched);
    entry.sha256 = sha(patched);
  }
  await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
}

// Census admission validation requires family-held review evidence under
// <root>/.tmp/h2a2-stack-review/<stack>.json: one row per CSV row keyed by
// rowKey, with HELD disposition and an 'SBVF family candidate' reason for
// deferred units. Non-deferred units get a neutral row so admission attempts
// against them surface 'not a family-held review row'.
async function writeReviewEvidence(root: string): Promise<void> {
  const census = buildCensus(root);
  const dir = join(root, '.tmp', 'h2a2-stack-review');
  await mkdir(dir, { recursive: true });
  const byStack = new Map<string, Dict[]>();
  for (const unit of census.units as Dict[]) {
    const stack = String(unit.file).split('/').pop()!.replace(/\.csv$/u, '');
    const held = unit.disposition === 'deferred' && unit.status === 'deferred';
    const row: Dict = {
      rowKey: unit.rowKey, line: (unit.locator as Dict).line,
      disposition: held ? 'HELD' : String(unit.status),
      reason: held ? 'SBVF family candidate held for family admission.' : 'reviewed row outside family admission scope.',
    };
    const list = byStack.get(stack) ?? [];
    list.push(row);
    byStack.set(stack, list);
  }
  for (const [stack, rows] of byStack) await writeFile(join(dir, `${stack}.json`), `${JSON.stringify(rows, null, 2)}\n`);
}

async function admissionFixture(mutate?: (root: string) => Promise<void>): Promise<{ root: string; area: string }> {
  const area = await mkdtemp(join(tmpdir(), 'vp-sbvf-adm-fixture-')); cleanups.push(area);
  const root = join(area, 'product');
  await buildSbvfFixtureCorpus(root);
  await patchAdmissionSiblings(root);
  if (mutate !== undefined) await mutate(root);
  await writeReviewEvidence(root);
  return { root, area };
}

async function deferredUnits(root: string): Promise<{ vue: Dict; react: Dict }> {
  const census = buildCensus(root);
  const units = census.units as Dict[];
  const vue = units.find(unit => unit.file === 'stacks/vue.csv' && unit.disposition === 'deferred' && unit.status === 'deferred');
  const react = units.find(unit => unit.file === 'stacks/react.csv' && unit.disposition === 'deferred' && unit.status === 'deferred');
  if (vue === undefined || react === undefined) throw new Error('fixture deferred rows missing');
  expect(typeof vue.proposedVariantId).toBe('string');
  expect(String(vue.proposedVariantId)).toMatch(/^uupm-vue-/u);
  expect(typeof react.proposedVariantId).toBe('string');
  expect(String(react.proposedVariantId)).toMatch(/^uupm-react-/u);
  return { vue, react };
}

function reviewEvidenceFor(root: string, file: unknown): Dict {
  const stack = String(file).split('/').pop()!.replace(/\.csv$/u, '');
  const rel = `.tmp/h2a2-stack-review/${stack}.json`;
  return { path: rel, sha256: sha(readFileSync(join(root, rel))) };
}

function admissionEntry(root: string, unit: Dict, familyId: string, overrides: Dict = {}): Dict {
  return { variant_id: unit.proposedVariantId, family_id: familyId, source: { donor: 'uupm', path: unit.file, rowKey: unit.rowKey }, disposition: 'family-held', rationale: 'P6 admission test', approved_by: 'devin', approved_at: '2026-11-20T00:00:00Z', evidence: reviewEvidenceFor(root, unit.file), ...overrides };
}

test('census validates admission manifests against deferred units and proposes variant IDs', async () => {
  const { root } = await admissionFixture();
  const { vue, react } = await deferredUnits(root);
  const dir = await mkdtemp(join(tmpdir(), 'vp-sbvf-adm-census-')); cleanups.push(dir);
  const familyId = 'family-admission-census-test';
  const family = { schema: 'SBVFFamilyManifest/v1', families: [{ family_id: familyId, title: 'Admission census test', summary: 's', rationale: 'r', variants: [vue.proposedVariantId, react.proposedVariantId], approved_by: 'devin', approved_at: '2026-11-20T00:00:00Z' }] };
  const familyPath = join(dir, 'family.json'); await writeFile(familyPath, JSON.stringify(family));
  const admissions = { schema: 'SBVFAdmissionManifest/v1', asOf: '2026-11-20T00:00:00Z', admissions: [admissionEntry(root, vue, familyId), admissionEntry(root, react, familyId)] };
  const admissionsPath = join(dir, 'admissions.json'); await writeFile(admissionsPath, JSON.stringify(admissions));
  const valid = buildCensus(root, 0.7, familyPath, admissionsPath);
  expect((valid.manifestValidation as Dict).valid).toBe(true);
  const badAdmissions = { ...admissions, admissions: [
    { ...admissionEntry(root, vue, familyId), source: { donor: 'uupm', path: 'stacks/vue.csv', rowKey: 'nonexistent' } },
    admissionEntry(root, react, familyId),
    { ...admissionEntry(root, vue, familyId), variant_id: 'uupm-orphan-admission' },
  ] };
  const badPath = join(dir, 'admissions-bad.json'); await writeFile(badPath, JSON.stringify(badAdmissions));
  const invalid = buildCensus(root, 0.7, familyPath, badPath);
  const issues = ((invalid.manifestValidation as Dict).issues as string[]).join('\n');
  expect(issues).toContain('admission source row not found');
  expect(issues).toContain('not referenced by the family manifest');
  const admittedUnit = (buildCensus(root).units as Dict[]).find(unit => unit.disposition === 'admitted' && unit.status === 'admitted');
  if (admittedUnit !== undefined) {
    const wrongRow = { ...admissions, admissions: [admissionEntry(root, vue, familyId), { ...admissionEntry(root, react, familyId), source: { donor: 'uupm', path: String(admittedUnit.file), rowKey: String(admittedUnit.rowKey) } }] };
    const wrongPath = join(dir, 'admissions-wrong.json'); await writeFile(wrongPath, JSON.stringify(wrongRow));
    const wrong = buildCensus(root, 0.7, familyPath, wrongPath);
    expect((((wrong.manifestValidation as Dict).issues as string[]).join('\n'))).toContain('not a deferred family-held row');
  }
});

test('admission plan produces SBVFAdmissionPlan/v1 with fidelity targets and deterministic SHA', async () => {
  const { root } = await admissionFixture();
  const { vue, react } = await deferredUnits(root);
  const dir = await mkdtemp(join(tmpdir(), 'vp-sbvf-adm-plan-')); cleanups.push(dir);
  const staging = join(dir, 'staging');
  const familyId = 'family-admission-plan-test';
  const family = { schema: 'SBVFFamilyManifest/v1', families: [{ family_id: familyId, title: 'Admission plan test', summary: 's', rationale: 'r', variants: [vue.proposedVariantId, react.proposedVariantId], approved_by: 'devin', approved_at: '2026-11-20T00:00:00Z' }] };
  const familyPath = join(dir, 'family.json'); await writeFile(familyPath, JSON.stringify(family));
  const admissions = { schema: 'SBVFAdmissionManifest/v1', asOf: '2026-11-20T00:00:00Z', admissions: [admissionEntry(root, vue, familyId), admissionEntry(root, react, familyId)] };
  const admissionsPath = join(dir, 'sbvf-admissions-plan-test.json'); await writeFile(admissionsPath, JSON.stringify(admissions));
  const asOf = '2026-11-20T00:00:00Z';
  const plan = await buildSbvfPlan(root, familyPath, asOf, staging, admissionsPath);
  const repeat = await buildSbvfPlan(root, familyPath, asOf, undefined, admissionsPath);
  expect(plan.planSha256).toBe(repeat.planSha256);
  expect(plan.schema).toBe('SBVFAdmissionPlan/v1');
  expect(plan.admissionManifestSha256).toMatch(/^[0-9a-f]{64}$/u);
  const planAdmissions = plan.admissions as Dict[];
  expect(planAdmissions).toHaveLength(2);
  expect(planAdmissions.map(a => a.variantId).sort()).toEqual([react.proposedVariantId, vue.proposedVariantId].sort());
  for (const admission of planAdmissions) {
    expect(String(admission.receiptPath)).toMatch(/^fidelity\/uupm\/stacks\//u);
    expect(String(admission.evidencePath)).toMatch(/-plan-test-admission-evidence\.json$/u);
    expect(admission.contentSha256).toMatch(/^[0-9a-f]{64}$/u);
    expect(admission.receiptSha256).toMatch(/^[0-9a-f]{64}$/u);
    expect(admission.evidenceSha256).toMatch(/^[0-9a-f]{64}$/u);
  }
  const targets = plan.targets as Dict[];
  const last = targets.at(-1)!;
  expect(last.path).toBe('catalog.json');
  const fidelityTargets = targets.filter(t => String(t.path).startsWith('fidelity/'));
  expect(fidelityTargets).toHaveLength(4);
  for (const target of fidelityTargets) expect(target.beforeSha256).toBeNull();
  expect(plan.deleteList).toEqual([]);
  expect(plan.bindingChanges).toMatchObject({ singletonToFamily: 0, deferredToFamily: 2 });
  expect(plan.catalogDelta).toMatchObject({ removed: [], newReceiptCount: 2 });
  expect((plan.catalogDelta as Dict).admittedVariants).toHaveLength(2);

  const { batch } = await buildSbvfPlanWithBatch(root, familyPath, asOf, join(dir, 'staging-batch'), admissionsPath);
  const batchDir = join(batch.directory, dirname(batch.manifest.path));
  const stagingRoot = batch.directory;
  const stagedManifest = JSON.parse(await readFile(join(batchDir, 'plan.json'), 'utf8')) as { targets: Array<{ path: string; staged: { path: string } | null; after: string }> };
  const stagedBytes = async (path: string): Promise<Buffer> => {
    const target = stagedManifest.targets.find(item => item.path === path);
    expect(target?.staged).not.toBeNull();
    const bytes = await readFile(join(stagingRoot, target!.staged!.path));
    expect(sha(bytes)).toBe(target!.after);
    return bytes;
  };
  const familyBytes = await stagedBytes(`instructions/${familyId}.md`);
  const parsedFamily = parseFrontmatter(new TextDecoder().decode(familyBytes));
  const variants = parseVariantScalar(String(parsedFamily.data.instruction_variants), familyId);
  const sections = parseVariantSections(parsedFamily.body, variants, familyId);
  expect(variants).toHaveLength(2);
  for (const variant of variants) {
    const id = variant.variant_id;
    const section = sections.get(id)!;
    expect(section.endsWith('\n')).toBe(true);
    expect(sha(section)).toBe(variant.contentSha256);
    const source = variant.source as Dict;
    const admission = planAdmissions.find(a => a.variantId === id)!;
    expect(source.rowKey).toBe(admission.rowKey);
    expect(source.path).toBe(admission.file);
    const framework = (variant.applicability as Dict).frameworks as Dict[];
    const stack = String(source.path).includes('vue') ? 'vue' : 'react';
    expect(framework[0]!.name).toBe(stack);
    expect(framework[0]!.versionRange).toMatchObject({ raw: stack === 'vue' ? '3.5.x' : '19.2.x' });
    const receiptBytes = await stagedBytes(String(admission.receiptPath));
    const receipt = JSON.parse(new TextDecoder().decode(receiptBytes)) as Dict;
    expect(receipt).toMatchObject({ schema: 'H2FidelityReceipt/v2', instructionId: id, variantId: id, variantBodySha256: variant.contentSha256, verdict: 'READY' });
    expect(((receipt.reviewer as Dict).kind)).toBe('delegated');
    const receiptCells = (receipt.source as Dict).cells as unknown[];
    expect(receiptCells).toHaveLength(6);
    const evidenceBytes = await stagedBytes(String(admission.evidencePath));
    const evidence = JSON.parse(new TextDecoder().decode(evidenceBytes)) as Dict;
    expect(evidence.schema).toBe('H2FamilyAdmissionEvidence/v1');
    expect(sha(evidenceBytes)).toBe(String(admission.evidenceSha256));
  }
  const mapBytes = await stagedBytes('corpus-map.json');
  const map = JSON.parse(new TextDecoder().decode(mapBytes)) as Dict;
  const uupm = ((map.donors as Dict).uupm as Dict).csvSources as Dict;
  for (const unit of [vue, react]) {
    const source = uupm[String(unit.file)] as Dict;
    const row = (source.rows as Dict[]).find(item => item.rowKey === unit.rowKey)!;
    expect(row.disposition).toBe('admitted');
    expect(row.reason).toBeUndefined();
    const binding = (row.bindings as Dict[])[0]!;
    const admission = planAdmissions.find(a => a.rowKey === unit.rowKey)!;
    expect(binding).toMatchObject({ instructionId: familyId, variantId: admission.variantId });
    expect((binding.fidelity as Dict).path).toBe(admission.receiptPath);
    expect(((binding.cells as unknown[]))).toHaveLength(6);
  }
  const catalogBytes = await stagedBytes('catalog.json');
  const catalog = JSON.parse(new TextDecoder().decode(catalogBytes)) as Dict;
  expect((catalog.instructions as Dict[]).some(item => item.instruction_id === familyId)).toBe(true);
  expect((catalog.instructions as Dict[]).some(item => item.instruction_id === vue.proposedVariantId)).toBe(false);
}, 120_000);

test('plan rejects family variants that are neither admitted nor covered by admissions', async () => {
  const { root } = await admissionFixture();
  const { vue, react } = await deferredUnits(root);
  const dir = await mkdtemp(join(tmpdir(), 'vp-sbvf-adm-reject-')); cleanups.push(dir);
  const familyId = 'family-admission-reject-test';
  const family = { schema: 'SBVFFamilyManifest/v1', families: [{ family_id: familyId, title: 't', summary: 's', rationale: 'r', variants: [vue.proposedVariantId, react.proposedVariantId], approved_by: 'devin', approved_at: '2026-11-20T00:00:00Z' }] };
  const familyPath = join(dir, 'family.json'); await writeFile(familyPath, JSON.stringify(family));
  await expect(buildSbvfPlan(root, familyPath, '2026-11-20T00:00:00Z')).rejects.toThrow(/no admitted binding|no READY matching fidelity receipt|not an admitted catalog instruction/u);
  const admissions = { schema: 'SBVFAdmissionManifest/v1', asOf: '2026-11-20T00:00:00Z', admissions: [admissionEntry(root, vue, familyId)] };
  const admissionsPath = join(dir, 'admissions.json'); await writeFile(admissionsPath, JSON.stringify(admissions));
  await expect(buildSbvfPlan(root, familyPath, '2026-11-20T00:00:00Z', undefined, admissionsPath)).rejects.toThrow(/not referenced|READY matching fidelity receipt|not an admitted catalog instruction|no admitted binding/u);
});

function familyManifest(familyId: string, variants: unknown[]): Dict {
  return { schema: 'SBVFFamilyManifest/v1', families: [{ family_id: familyId, title: 't', summary: 's', rationale: 'r', variants, approved_by: 'devin', approved_at: '2026-11-20T00:00:00Z' }] };
}

function admissionManifest(admissions: Dict[]): Dict {
  return { schema: 'SBVFAdmissionManifest/v1', asOf: '2026-11-20T00:00:00Z', admissions };
}

async function manifestIssues(root: string, dir: string, family: Dict, admissions: Dict): Promise<string> {
  const familyPath = join(dir, 'family.json'); await writeFile(familyPath, JSON.stringify(family));
  const admissionsPath = join(dir, 'admissions.json'); await writeFile(admissionsPath, JSON.stringify(admissions));
  const census = buildCensus(root, 0.7, familyPath, admissionsPath);
  return ((census.manifestValidation as Dict).issues as string[]).join('\n');
}

test('census binds admission entries to family-held review evidence', async () => {
  const { root } = await admissionFixture();
  const { vue, react } = await deferredUnits(root);
  const dir = await mkdtemp(join(tmpdir(), 'vp-sbvf-adm-evidence-')); cleanups.push(dir);
  const familyId = 'family-admission-evidence-test';
  const variants = [vue.proposedVariantId, react.proposedVariantId, 'uupm-test-bad-sha', 'uupm-test-wrong-doc'];
  const issues = await manifestIssues(root, dir, familyManifest(familyId, variants), admissionManifest([
    admissionEntry(root, vue, familyId, { evidence: { path: reviewEvidenceFor(root, vue.file).path, sha256: '0'.repeat(64) } }),
    admissionEntry(root, react, familyId, { variant_id: 'uupm-test-wrong-doc', evidence: reviewEvidenceFor(root, 'stacks/vue.csv') }),
    admissionEntry(root, vue, familyId, { variant_id: 'uupm-test-bad-sha' }),
  ]));
  expect(issues).toContain('admission review evidence hash mismatch');
  expect(issues).toContain('has no entry in review evidence');
});

// The fixture corpus emits only admitted/deferred rows, so fabricate the
// rejected/SPLIT/held census units by editing corpus-map dispositions and
// review reasons (row identity hashes are unaffected). vue row 3 becomes
// rejected, react row 3 SPLIT, vue row 4 held-applicability.
async function mutateHeldRows(root: string): Promise<void> {
  const mapPath = join(root, 'corpus-map.json');
  const map = JSON.parse(await readFile(mapPath, 'utf8')) as Dict;
  const csvSources = ((map.donors as Dict).uupm as Dict).csvSources as Dict;
  const rowAt = (file: string, row: number): Dict => {
    const source = csvSources[file] as Dict;
    const found = (source.rows as Dict[]).find(item => (item.locator as Dict).row === row);
    if (found === undefined) throw new Error(`fixture row missing: ${file}#${row}`);
    return found;
  };
  const rejected = rowAt('stacks/vue.csv', 3);
  rejected.disposition = 'rejected';
  rejected.reason = 'fixture rejected row';
  rowAt('stacks/react.csv', 3).reason = 'fixture split row';
  rowAt('stacks/vue.csv', 4).reason = 'held applicability fixture row';
  await writeFile(mapPath, `${JSON.stringify(map, null, 2)}\n`);
}

test('census rejects admission entries for rejected, split and non-family-held rows', async () => {
  const { root } = await admissionFixture(mutateHeldRows);
  const { vue, react } = await deferredUnits(root);
  const units = buildCensus(root).units as Dict[];
  const rejected = units.find(unit => unit.disposition === 'rejected' && unit.file === 'stacks/vue.csv');
  const split = units.find(unit => unit.status === 'SPLIT');
  const heldNonFamily = units.find(unit => unit.file === 'stacks/vue.csv' && unit.status === 'held');
  if (rejected === undefined || split === undefined || heldNonFamily === undefined) throw new Error('rejection fixture rows missing');
  const dir = await mkdtemp(join(tmpdir(), 'vp-sbvf-adm-held-')); cleanups.push(dir);
  const familyId = 'family-admission-held-test';
  const variants = [vue.proposedVariantId, react.proposedVariantId, 'uupm-test-rejected-row', 'uupm-test-split-row', 'uupm-test-held-row'];
  const issues = await manifestIssues(root, dir, familyManifest(familyId, variants), admissionManifest([
    admissionEntry(root, vue, familyId),
    admissionEntry(root, react, familyId),
    admissionEntry(root, rejected, familyId, { variant_id: 'uupm-test-rejected-row' }),
    { variant_id: 'uupm-test-split-row', family_id: familyId, source: { donor: 'uupm', path: split.file, rowKey: split.rowKey }, disposition: 'family-held', rationale: 'r', approved_by: 'a', approved_at: '2026-11-20T00:00:00Z', evidence: reviewEvidenceFor(root, split.file) },
    admissionEntry(root, heldNonFamily, familyId, { variant_id: 'uupm-test-held-row' }),
  ]));
  expect(issues).toContain('not a deferred family-held row');
  expect(issues).toContain('not a family-held review row');
});

test('family manifest with fewer than two variants is rejected', async () => {
  const { root } = await admissionFixture();
  const { vue } = await deferredUnits(root);
  const dir = await mkdtemp(join(tmpdir(), 'vp-sbvf-adm-degenerate-')); cleanups.push(dir);
  const familyPath = join(dir, 'family.json');
  await writeFile(familyPath, JSON.stringify(familyManifest('family-degenerate-test', [vue.proposedVariantId])));
  await expect(buildSbvfPlan(root, familyPath, '2026-11-20T00:00:00Z')).rejects.toThrow(/manifest validation failed/u);
});

test('mixed admit+migrate family plan separates migration and admission lanes', async () => {
  const { root } = await admissionFixture();
  const { vue, react } = await deferredUnits(root);
  const census = buildCensus(root);
  const admittedUnit = (census.units as Dict[]).find(unit => unit.disposition === 'admitted'
    && Array.isArray(unit.instructionIds) && unit.instructionIds.some(id => String(id).startsWith('uupm-')));
  if (admittedUnit === undefined) throw new Error('admitted fixture unit missing');
  const migratedId = String((admittedUnit.instructionIds as unknown[])[0]);
  const dir = await mkdtemp(join(tmpdir(), 'vp-sbvf-adm-mixed-')); cleanups.push(dir);
  const familyId = 'family-mixed-lane-test';
  const familyPath = join(dir, 'family.json');
  await writeFile(familyPath, JSON.stringify(familyManifest(familyId, [migratedId, vue.proposedVariantId, react.proposedVariantId])));
  const admissionsPath = join(dir, 'sbvf-admissions-mixed-test.json');
  await writeFile(admissionsPath, JSON.stringify(admissionManifest([admissionEntry(root, vue, familyId), admissionEntry(root, react, familyId)])));
  const plan = await buildSbvfPlan(root, familyPath, '2026-11-20T00:00:00Z', undefined, admissionsPath);
  expect(plan.schema).toBe('SBVFAdmissionPlan/v1');
  expect(plan.bindingChanges).toMatchObject({ singletonToFamily: 1, deferredToFamily: 2 });
  expect(plan.deleteList).toEqual([`instructions/${migratedId}.md`]);
  expect((plan.catalogDelta as Dict).removed).toEqual([migratedId]);
  expect((plan.catalogDelta as Dict).admittedVariants).toHaveLength(2);
  expect((plan.admissions as unknown[])).toHaveLength(2);
  const targets = plan.targets as Dict[];
  const migrated = targets.find(target => target.path === `instructions/${migratedId}.md`)!;
  expect(migrated.beforeSha256).toMatch(/^[0-9a-f]{64}$/u);
  expect(migrated.afterSha256).toBeNull();
}, 120_000);

const stableJson = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;
const cliOutput = (): { stdout: string[]; stderr: string[]; io: { stdout: (value: string) => void; stderr: (value: string) => void } } => {
  const stdout: string[] = []; const stderr: string[] = [];
  return { stdout, stderr, io: { stdout: (value: string) => stdout.push(value), stderr: (value: string) => stderr.push(value) } };
};

test('admission batch applies, verifies, detects stale preimage and rolls back on a fixture corpus', async () => {
  const { root, area } = await admissionFixture();
  const { vue, react } = await deferredUnits(root);
  const familyId = 'family-admission-e2e-test';
  const familyPath = join(area, 'family.json');
  await writeFile(familyPath, JSON.stringify(familyManifest(familyId, [vue.proposedVariantId, react.proposedVariantId])));
  const admissionsPath = join(area, 'sbvf-admissions-e2e-test.json');
  await writeFile(admissionsPath, JSON.stringify(admissionManifest([admissionEntry(root, vue, familyId), admissionEntry(root, react, familyId)])));
  const asOf = '2026-11-20T00:00:00Z';
  const plan = await buildSbvfPlan(root, familyPath, asOf, join(area, 'staging'), admissionsPath);
  expect(plan.schema).toBe('SBVFAdmissionPlan/v1');
  const planPath = join(area, 'plan.json'); await writeFile(planPath, stableJson(plan));
  const reviewPath = join(area, 'review.json');
  await writeFile(reviewPath, stableJson({ schema: 'VPPreparedBatchReview/v1', planSha256: plan.planSha256, verdict: 'READY', reviewer: 'admission-e2e', pointer: planPath }));
  const { stdout, stderr, io } = cliOutput();
  const applyArgs = ['--root', root, '--manifest', familyPath, '--admissions', admissionsPath, '--as-of', asOf, '--expected-plan-sha', String(plan.planSha256), '--review', reviewPath];

  const catalogPath = join(root, 'catalog.json');
  const catalogBefore = await readFile(catalogPath, 'utf8');
  const catalogTampered = catalogBefore.replace(/"revision": \d+/u, '"revision": 999999');
  expect(catalogTampered).not.toBe(catalogBefore);
  await writeFile(catalogPath, catalogTampered);
  expect(await runSbvfApplyCli([...applyArgs, '--apply'], io)).toBe(1);
  expect(stderr.at(-1)).toContain('plan SHA mismatch');
  await writeFile(catalogPath, catalogBefore);

  expect(await runSbvfApplyCli(applyArgs, io)).toBe(0);
  expect(JSON.parse(stdout.at(-1)!) as { outcome: string }).toMatchObject({ outcome: 'dry-run' });
  expect(await runSbvfApplyCli([...applyArgs, '--apply'], io)).toBe(0);
  const applied = JSON.parse(stdout.at(-1)!) as { outcome: string; planPath: string; appliedBatchDir: string };
  expect(applied.outcome).toBe('applied');
  expect(checkCorpus(root)).toHaveLength(0);

  expect(await runSbvfVerifyCli(['--root', root, '--plan', applied.planPath, '--batch-dir', applied.appliedBatchDir], io)).toBe(0);
  expect(JSON.parse(stdout.at(-1)!) as { outcome: string; admittedVariants: number; fidelityReceipts: string })
    .toMatchObject({ outcome: 'verified', admittedVariants: 2, fidelityReceipts: 'extended' });

  const rollbackDry = cliOutput();
  expect(await runSbvfRollbackCli(['--batch-dir', applied.appliedBatchDir], rollbackDry.io)).toBe(0);
  const reverse = JSON.parse(rollbackDry.stdout.at(-1)!) as { planSha256: string };
  const rollbackReview = join(area, 'rollback-review.json');
  await writeFile(rollbackReview, stableJson({ schema: 'VPPreparedBatchReview/v1', planSha256: reverse.planSha256, verdict: 'READY', reviewer: 'admission-e2e-rollback', pointer: planPath }));
  const rollbackOut = cliOutput();
  expect(await runSbvfRollbackCli(['--batch-dir', applied.appliedBatchDir, '--review', rollbackReview, '--staging', join(root, '.tmp', 'sbvf', `rollback-${reverse.planSha256}`), '--apply'], rollbackOut.io)).toBe(0);
  expect(JSON.parse(rollbackOut.stdout.at(-1)!) as { outcome: string; restored: boolean }).toMatchObject({ outcome: 'applied', restored: true });
  expect(checkCorpus(root)).toHaveLength(0);
  const map = JSON.parse(await readFile(join(root, 'corpus-map.json'), 'utf8')) as Dict;
  const uupm = ((map.donors as Dict).uupm as Dict).csvSources as Dict;
  for (const unit of [vue, react]) {
    const source = uupm[String(unit.file)] as Dict;
    const row = (source.rows as Dict[]).find(item => item.rowKey === unit.rowKey)!;
    expect(row.disposition).toBe('deferred');
    expect(row.bindings).toEqual([]);
  }
  const planAdmissions = plan.admissions as Dict[];
  for (const admission of planAdmissions) {
    await expect(readFile(join(root, String(admission.receiptPath)))).rejects.toThrow();
    await expect(readFile(join(root, String(admission.evidencePath)))).rejects.toThrow();
  }
}, 300_000);

test('stackNameFor falls back to the file basename outside stacks/ and ux-guidelines', () => {
  expect(stackNameFor('misc/other.csv')).toBe('other');
  expect(stackNameFor('plain.csv')).toBe('plain');
});

test('createAdmissionContext tolerates a missing instructions dir and unreadable entries', async () => {
  const root = await mkdtemp(join(tmpdir(), 'vp-sbvf-adm-empty-')); cleanups.push(root);
  const empty = createAdmissionContext(root);
  expect(empty.categoryTags.size).toBe(0);
  expect(empty.dnaByInstruction.size).toBe(0);
  await mkdir(join(root, 'instructions', 'broken.md'), { recursive: true });
  const ctx = createAdmissionContext(root);
  expect(ctx.categoryTags.size).toBe(0);
});

test('uupmContentRoot rejects a donors manifest without a uupm record', async () => {
  const root = await mkdtemp(join(tmpdir(), 'vp-sbvf-adm-donors-')); cleanups.push(root);
  await writeFile(join(root, 'donors.yaml'), 'local_root: .tmp/donors\n  - id: other\n    local_path: x\n    content_path: y\n');
  expect(() => uupmContentRoot(root)).toThrow('donors.yaml has no uupm donor record');
});

test('categoryTagPair orders multi-entry buckets and rejects ambiguous ties', async () => {
  const root = await mkdtemp(join(tmpdir(), 'vp-sbvf-adm-tags-')); cleanups.push(root);
  const instructions = join(root, 'instructions');
  await mkdir(instructions, { recursive: true });
  const sibling = async (name: string, capability: string, pattern: string): Promise<void> => writeFile(join(instructions, name), [
    '---',
    'classification_reason: "h2-csv-pilot-not-classified"',
    'capability_tags:', `  - "${capability}"`,
    'pattern_tags:', `  - "${pattern}"`,
    'conditions_applies_when: "XAML guidance for testfw current."',
    'conditions_does_not_apply_when: "A context where the test convention makes the rule unsafe."',
    '---', '', 'Sibling body.', '',
  ].join('\n'));
  await sibling('uupm-a.md', 'cap-a', 'pat-a');
  await sibling('uupm-b.md', 'cap-b', 'pat-b');
  expect(() => categoryTagPair(createAdmissionContext(root), 'XAML')).toThrow('ambiguous admitted sibling tags');
  await sibling('uupm-c.md', 'cap-a', 'pat-a');
  expect(categoryTagPair(createAdmissionContext(root), 'XAML')).toEqual({ capability: ['cap-a'], pattern: ['pat-a'] });
});
