import { afterAll, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { catalogBrowse, catalogCompose, catalogGet, catalogSearch, catalogSearchWithProfile, decisionEvaluate, loadCatalog, loadInstructions } from '../skills/vp-mode/scripts/catalog.ts';
import { runCatalogCli } from '../skills/vp-mode/scripts/catalog-cli.ts';
import type { Catalog } from '../skills/vp-mode/scripts/catalog.ts';
import { encodeVariantScalar, type VariantRecord } from '../skills/vp-mode/scripts/variants.ts';
import { parseFrontmatter } from '../skills/vp-mode/scripts/frontmatter.ts';
import { resolveIntent, topPatternFor } from '../skills/vp-mode/scripts/retrieval.ts';

const fixtureRoot = new URL('./fixtures/catalog/', import.meta.url);
const bodyUrl = new URL('./fixtures/sbvf/family-body.md', import.meta.url);
const tempDirs: string[] = [];
afterAll(async () => { for (const dir of tempDirs) await rm(dir, { recursive: true, force: true }); });

function digest(value: string): string { return createHash('sha256').update(value, 'utf8').digest('hex'); }

function yaml(value: unknown): string {
  if (Array.isArray(value)) return value.length === 0 ? '[]' : `\n${value.map((item) => `  - ${JSON.stringify(item)}`).join('\n')}`;
  return JSON.stringify(value);
}

async function familyFixture(): Promise<{ dir: string; catalogPath: string; catalog: Catalog; body: string }> {
  const dir = await mkdtemp(join(tmpdir(), 'vp-sbvf-'));
  tempDirs.push(dir);
  await cp(fixtureRoot, dir, { recursive: true });
  await writeFile(join(dir, 'config', 'vpinstruction.v1.2.schema.json'), await readFile(new URL('../config/vpinstruction.v1.2.schema.json', import.meta.url)));
  await writeFile(join(dir, 'config', 'vpinstruction.v2.schema.json'), await readFile(new URL('../config/vpinstruction.v2.schema.json', import.meta.url)));
  await writeFile(join(dir, 'config', 'vpinstruction.v3.schema.json'), await readFile(new URL('../config/vpinstruction.v3.schema.json', import.meta.url)));
  const catalogPath = join(dir, 'catalog.json');
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8')) as Catalog;
  for (const entry of catalog.instructions) {
    const path = join(dir, entry.path);
    const source = await readFile(path, 'utf8');
    const updated = source.replace('---\n', '---\nschema: VPInstruction/v1.2\nclassification_status: unclassified\nclassification_reason: Synthetic test fixture.\n');
    await writeFile(path, updated);
    entry.sha256 = digest(updated);
  }
  const alpha = catalog.instructions.find((item) => item.instruction_id === 'alpha');
  if (alpha === undefined) throw new Error('missing alpha fixture');
  const original = parseFrontmatter(await readFile(join(dir, alpha.path), 'utf8')).data;
  const body = await readFile(bodyUrl, 'utf8');
  const payloads = ['# Alpha variant one.\n', '# Alpha variant two.\n'];
  const applicability = (name: string, major: number) => ({
    frameworks: [{ name, versionRange: { raw: `${major}.x`, comparators: [{ op: '>=' as const, version: `${major}.0.0` }, { op: '<' as const, version: `${major + 1}.0.0` }] } }],
  });
  const makeVariant = (id: string, name: string, major: number, index: number): VariantRecord => ({
    variant_id: id, title: `Alpha variant ${index + 1}`, summary: `Summary for variant ${index + 1}.`,
    capability_tags: original.capability_tags as string[], pattern_tags: original.pattern_tags as string[],
    conditions_applies_when: `For ${name}.`, conditions_does_not_apply_when: `Not for ${name}.`,
    artifact_contract_output_type: original.artifact_contract_output_type as string,
    artifact_contract_required_data: original.artifact_contract_required_data as string[],
    artifact_contract_verified_by: original.artifact_contract_verified_by as string,
    compatibility_excludes: original.compatibility_excludes as string[], compatibility_requires: original.compatibility_requires as string[],
    provenance: (original.provenance as string[]).map((item) => `${item}; sha256=${'c'.repeat(64)}; locator=source.csv#L${index + 1}`), status: 'active', revision: 1,
    classification_status: 'unclassified', classification_reason: 'Synthetic fixture.',
    source: { donor: 'synthetic', path: 'source.csv', rowKey: `row=${index + 1}`, rawSha256: 'a'.repeat(64) },
    sourceLabel: name, applicability: applicability(name, major), contentSha256: digest(payloads[index]!),
  });
  const variants = [makeVariant('variant-alpha-one', 'react', 18, 0), makeVariant('variant-alpha-two', 'angular', 17, 1)];
  const familyId = 'family-alpha';
  const fields: Record<string, unknown> = {
    schema: 'VPInstruction/v3', classification_status: 'unclassified', classification_reason: 'Synthetic family.',
    instruction_id: familyId, title: 'Alpha family', summary: 'Synthetic family for read path tests.',
    capability_tags: original.capability_tags, pattern_tags: original.pattern_tags,
    conditions_applies_when: 'For the selected framework.', conditions_does_not_apply_when: 'No supported framework.',
    artifact_contract_output_type: original.artifact_contract_output_type, artifact_contract_required_data: original.artifact_contract_required_data,
    artifact_contract_verified_by: original.artifact_contract_verified_by, compatibility_excludes: [], compatibility_requires: [],
    provenance: original.provenance, status: 'active', revision: 1,
  };
  const front = Object.entries(fields).map(([key, value]) => `${key}: ${yaml(value)}`).join('\n');
  const markdown = `---\n${front}\ninstruction_variants: ${encodeVariantScalar(variants, familyId)}\n---\n${body}`;
  const familyPath = join(dir, 'instructions', `${familyId}.md`);
  await writeFile(familyPath, markdown);
  alpha.instruction_id = familyId;
  alpha.path = `instructions/${familyId}.md`;
  alpha.sha256 = digest(markdown);
  await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
  return { dir, catalogPath, catalog, body };
}

async function rewriteVariantScalar(dir: string, rawJson: string, bodyTransform?: (body: string) => string): Promise<void> {
  const catalogPath = join(dir, 'catalog.json');
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8')) as Catalog;
  const entry = catalog.instructions.find((item) => item.instruction_id === 'family-alpha');
  if (entry === undefined) throw new Error('missing family entry');
  const path = join(dir, entry.path);
  const source = await readFile(path, 'utf8');
  const parsed = parseFrontmatter(source);
  const front = source.slice(0, source.indexOf('\n---\n') + 1);
  const lines = front.split('\n');
  const scalarLine = lines.findIndex((line) => line.startsWith('instruction_variants: '));
  if (scalarLine < 0) throw new Error('missing variant scalar');
  lines[scalarLine] = `instruction_variants: ${JSON.stringify(rawJson)}`;
  const body = bodyTransform?.(parsed.body) ?? parsed.body;
  const markdown = `${lines.join('\n')}\n---\n${body}`;
  await writeFile(path, markdown);
  entry.sha256 = digest(markdown);
  await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
}

async function addInvalidFamilyApproach(dir: string): Promise<void> {
  const catalogPath = join(dir, 'catalog.json');
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8')) as Catalog;
  const entry = catalog.instructions.find((item) => item.instruction_id === 'family-alpha')!;
  const path = join(dir, entry.path);
  const source = await readFile(path, 'utf8');
  const parsed = parseFrontmatter(source);
  const lines = source.split('\n');
  const scalarLine = lines.findIndex((line) => line.startsWith('instruction_variants: '));
  lines.splice(scalarLine, 0, 'approach_assessments:', '  - "invalid"', `approach_body_sha256: ${JSON.stringify(digest(parsed.body))}`);
  const markdown = lines.join('\n');
  await writeFile(path, markdown);
  entry.sha256 = digest(markdown);
  await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
}

async function addSecondFamilyWithDuplicateVariants(dir: string): Promise<void> {
  const catalogPath = join(dir, 'catalog.json');
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8')) as Catalog;
  const familyEntry = catalog.instructions.find((item) => item.instruction_id === 'family-alpha')!;
  const source = await readFile(join(dir, familyEntry.path), 'utf8');
  const second = source.replace('instruction_id: "family-alpha"', 'instruction_id: "family-beta"').replace('title: "Alpha family"', 'title: "Beta family"');
  const secondPath = join(dir, 'instructions', 'family-beta.md');
  await writeFile(secondPath, second);
  const beta = catalog.instructions.find((item) => item.instruction_id === 'beta')!;
  beta.instruction_id = 'family-beta';
  beta.path = 'instructions/family-beta.md';
  beta.sha256 = digest(second);
  await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
}

test('v3 loader, exact variant get, family-once search, and fail-closed compose guard', async () => {
  const fixture = await familyFixture();
  const catalog = await loadCatalog(fixture.catalogPath);
  const instructions = await loadInstructions(catalog, fixture.dir);
  const family = instructions.get('family-alpha');
  const variant = instructions.get('variant-alpha-one');
  expect(family?.content).toBe('');
  expect(family?.variants?.map((item) => item.instruction_id)).toEqual(['variant-alpha-one', 'variant-alpha-two']);
  expect(variant?.familyId).toBe('family-alpha');
  expect(variant?.content).toBe('# Alpha variant one.\n');
  expect(variant?.provenance[0]?.sha256).toBe('c'.repeat(64));
  expect(variant?.provenance[0]?.locator).toBe('source.csv#L1');
  expect(() => catalogGet(catalog, instructions, 'family-alpha')).toThrow(expect.objectContaining({ code: 'CATALOG_FAMILY_REQUIRES_CONTEXT' }));
  const selected = catalogGet(catalog, instructions, 'family-alpha', { frameworks: [{ name: 'react', version: '18.2.0' }] });
  expect(selected.instruction_id).toBe('variant-alpha-one');
  const rows = catalogSearch(catalog, instructions, { instruction_ids: ['variant-alpha-one'], applicabilityContext: { frameworks: [{ name: 'react', version: '18.2.0' }] } });
  expect(rows.map((item) => item.instruction_id)).toEqual(['family-alpha']);
  expect(rows[0]?.variants?.map((item) => item.applicability?.state)).toEqual(['applicable']);
  const profile = { schema: 'VPEffectiveProfile/v1' as const, groups: {}, unresolved_groups: {} };
  expect(catalogSearchWithProfile(catalog, instructions, { instruction_ids: ['variant-alpha-one'] }, profile).map((item) => item.instruction_id)).toContain('family-alpha');
  expect(decisionEvaluate(catalog, instructions, { operation: 'choose', candidates: ['family-alpha'], applicabilityContext: { frameworks: [{ name: 'react', version: '18.2.0' }] } }).selected).toEqual(['variant-alpha-one']);
  expect(decisionEvaluate(catalog, instructions, { operation: 'choose', candidates: ['family-alpha'] })).toMatchObject({ fallback: true, fallbackReason: 'applicability-unresolved' });
  expect(topPatternFor(instructions, family!.capability_tags[0]!)).toBe(family!.pattern_tags[0]);
  expect(resolveIntent(instructions, [family!.capability_tags[0]!]).status).not.toBe('unresolved');
  expect(() => catalogCompose(catalog, instructions, { required_ids: ['family-alpha'] })).toThrow(expect.objectContaining({ code: 'CATALOG_REQUIRED_SELECTION_UNAVAILABLE' }));
  const matchedBundle = catalogCompose(catalog, instructions, { capability_tags: [family!.capability_tags[0]!] });
  expect(matchedBundle.instructions.some((item) => item.instruction_id === 'family-alpha' || item.content === '')).toBe(false);
  const composed = catalogCompose(catalog, instructions, { required_ids: ['variant-alpha-one'], applicabilityContext: { frameworks: [{ name: 'react', version: '18.2.0' }] } }).instructions.map((item) => item.instruction_id);
  expect(composed).toContain('variant-alpha-one');
  expect(composed).not.toContain('family-alpha');
});

test('P2b composes exact variants and expands selected or required families atomically', async () => {
  const exact = await familyFixture();
  const exactCatalog = await loadCatalog(exact.catalogPath);
  const exactInstructions = await loadInstructions(exactCatalog, exact.dir);
  exactInstructions.get('variant-alpha-one')!.compatibility.requires = [];
  const context = { frameworks: [{ name: 'react', version: '18.2.0' }] };
  const exactRows = catalogSearch(exactCatalog, exactInstructions, { instruction_ids: ['variant-alpha-one'] });
  expect(exactRows[0]?.variants?.map((item) => item.variant_id)).toEqual(['variant-alpha-one']);
  expect(catalogCompose(exactCatalog, exactInstructions, { instruction_ids: ['variant-alpha-one'], applicabilityContext: context }).instructions.map((item) => item.instruction_id)).toEqual(['variant-alpha-one']);
  expect(catalogCompose(exactCatalog, exactInstructions, { instruction_ids: ['family-alpha'], applicabilityContext: context }).instructions.map((item) => item.instruction_id)).toEqual(['variant-alpha-one']);

  const multiple = await familyFixture();
  const entry = multiple.catalog.instructions.find((item) => item.instruction_id === 'family-alpha')!;
  const parsed = parseFrontmatter(await readFile(join(multiple.dir, entry.path), 'utf8'));
  const records = JSON.parse(parsed.data.instruction_variants as string) as VariantRecord[];
  records[1]!.applicability = records[0]!.applicability;
  await rewriteVariantScalar(multiple.dir, JSON.stringify(records));
  const catalog = await loadCatalog(multiple.catalogPath);
  const instructions = await loadInstructions(catalog, multiple.dir);
  instructions.get('variant-alpha-one')!.compatibility.requires = [];
  instructions.get('variant-alpha-two')!.compatibility.requires = [];
  const bundle = catalogCompose(catalog, instructions, { required_ids: ['family-alpha'], applicabilityContext: context });
  expect(bundle.instructions.map((item) => item.instruction_id)).toEqual(['variant-alpha-one', 'variant-alpha-two']);
  expect(bundle.instructions.every((item) => item.family_id === 'family-alpha')).toBe(true);
  expect(() => catalogCompose(catalog, instructions, { required_ids: ['family-alpha'] })).toThrow(expect.objectContaining({
    code: 'CATALOG_REQUIRED_SELECTION_UNAVAILABLE', details: expect.objectContaining({ family_id: 'family-alpha' }),
  }));
  expect(() => catalogCompose(catalog, instructions, { required_ids: ['family-alpha'], applicabilityContext: { frameworks: [{ name: 'svelte', version: '5.0.0' }] } })).toThrow(expect.objectContaining({
    code: 'CATALOG_REQUIRED_SELECTION_UNAVAILABLE', details: expect.objectContaining({ family_id: 'family-alpha' }),
  }));

  records[1]!.applicability = { ...records[1]!.applicability!, requiredContext: ['runtime:node'] };
  await rewriteVariantScalar(multiple.dir, JSON.stringify(records));
  const partiallyUnresolvedCatalog = await loadCatalog(multiple.catalogPath);
  const partiallyUnresolvedInstructions = await loadInstructions(partiallyUnresolvedCatalog, multiple.dir);
  expect(() => catalogCompose(partiallyUnresolvedCatalog, partiallyUnresolvedInstructions, { required_ids: ['family-alpha'], applicabilityContext: context })).toThrow(expect.objectContaining({
    code: 'CATALOG_REQUIRED_SELECTION_UNAVAILABLE', details: { family_id: 'family-alpha', variants: expect.arrayContaining([
      expect.objectContaining({ variant_id: 'variant-alpha-one', state: 'applicable' }),
      expect.objectContaining({ variant_id: 'variant-alpha-two', state: 'unresolved' }),
    ]) },
  }));
});

test('v3 loader stores normalized applicability and derives version comparators', async () => {
  const runtimeFixture = await familyFixture();
  const runtimeEntry = runtimeFixture.catalog.instructions.find((item) => item.instruction_id === 'family-alpha')!;
  const runtimeParsed = parseFrontmatter(await readFile(join(runtimeFixture.dir, runtimeEntry.path), 'utf8'));
  const runtimeRecords = JSON.parse(runtimeParsed.data.instruction_variants as string) as VariantRecord[];
  runtimeRecords[0]!.applicability = { runtimes: [{ value: 'Node' }] };
  await rewriteVariantScalar(runtimeFixture.dir, JSON.stringify(runtimeRecords));
  const runtimeCatalog = await loadCatalog(runtimeFixture.catalogPath);
  const runtimeInstructions = await loadInstructions(runtimeCatalog, runtimeFixture.dir);
  expect(runtimeInstructions.get('variant-alpha-one')?.applicabilityDeclaration?.runtimes).toEqual([{ value: 'node' }]);
  expect(catalogCompose(runtimeCatalog, runtimeInstructions, {
    required_ids: ['variant-alpha-one'], applicabilityContext: { runtimes: ['node'] },
  }).instructions.map((item) => item.instruction_id)).toContain('variant-alpha-one');

  const rangeFixture = await familyFixture();
  const rangeEntry = rangeFixture.catalog.instructions.find((item) => item.instruction_id === 'family-alpha')!;
  const rangeParsed = parseFrontmatter(await readFile(join(rangeFixture.dir, rangeEntry.path), 'utf8'));
  const rangeRecords = JSON.parse(rangeParsed.data.instruction_variants as string) as VariantRecord[];
  rangeRecords[0]!.applicability = { frameworks: [{ name: 'React', versionRange: { raw: '18.x' } }] };
  await rewriteVariantScalar(rangeFixture.dir, JSON.stringify(rangeRecords));
  const rangeCatalog = await loadCatalog(rangeFixture.catalogPath);
  const rangeInstructions = await loadInstructions(rangeCatalog, rangeFixture.dir);
  expect(rangeInstructions.get('variant-alpha-one')?.applicabilityDeclaration?.frameworks?.[0]?.versionRange?.comparators).toEqual([
    { op: '>=', version: '18.0.0' }, { op: '<', version: '19.0.0' },
  ]);
  expect(catalogCompose(rangeCatalog, rangeInstructions, {
    required_ids: ['variant-alpha-one'], applicabilityContext: { frameworks: [{ name: 'react', version: '18.2.0' }] },
  }).instructions.map((item) => item.instruction_id)).toContain('variant-alpha-one');
  expect(() => catalogCompose(rangeCatalog, rangeInstructions, {
    required_ids: ['variant-alpha-one'], applicabilityContext: { frameworks: [{ name: 'react', version: '19.0.0' }] },
  })).toThrow(expect.objectContaining({ code: 'CATALOG_REQUIRED_SELECTION_UNAVAILABLE', details: expect.objectContaining({ instruction_id: 'variant-alpha-one', applicability: 'inapplicable' }) }));
});

test('P2b matched families omit unresolved variants and never emit family content', async () => {
  const fixture = await familyFixture();
  const catalog = await loadCatalog(fixture.catalogPath);
  const instructions = await loadInstructions(catalog, fixture.dir);
  const family = instructions.get('family-alpha')!;
  family.variants!.forEach((variant) => { variant.compatibility.requires = []; });
  family.variants![1]!.capability_tags = ['alternate-workflow'];
  family.variants![1]!.applicabilityDeclaration = { ...family.variants![1]!.applicabilityDeclaration!, requiredContext: ['runtime:node'] };
  const filteredRows = catalogSearch(catalog, instructions, { instruction_ids: ['family-alpha'], capability_tags: [family.capability_tags[0]!] });
  expect(filteredRows[0]?.variants?.map((item) => item.variant_id)).toEqual(['variant-alpha-one']);
  const matched = catalogCompose(catalog, instructions, {
    capability_tags: [family.capability_tags[0]!],
    applicabilityContext: { frameworks: [{ name: 'react', version: '18.2.0' }] },
  });
  expect(matched.instructions.map((item) => item.instruction_id)).toEqual(['variant-alpha-one']);
  const unresolved = catalogCompose(catalog, instructions, { instruction_ids: ['family-alpha'], capability_tags: ['alternate-workflow'], applicabilityContext: { frameworks: [{ name: 'react', version: '18.2.0' }] } });
  expect(unresolved.instructions).toEqual([]);
  expect(unresolved.omitted.unresolved).toEqual(['variant-alpha-two']);
  expect(unresolved.instructions.some((item) => item.instruction_id === 'family-alpha' || item.content === '')).toBe(false);
});

test('P2b family selection enforces per-variant count and byte limits atomically', async () => {
  const fixture = await familyFixture();
  const catalog = await loadCatalog(fixture.catalogPath);
  const instructions = await loadInstructions(catalog, fixture.dir);
  const family = instructions.get('family-alpha')!;
  const base = family.variants![0]!;
  const variants = Array.from({ length: 21 }, (_, index) => {
    const variant = { ...base, instruction_id: `variant-limit-${index}`, familyId: 'family-alpha', content: 'x', compatibility: { ...base.compatibility, requires: [] } };
    delete variant.applicabilityDeclaration;
    return variant;
  });
  family.variants = variants;
  for (const variant of variants) instructions.set(variant.instruction_id, variant);
  family.variants = variants.slice(0, 20);
  expect(catalogCompose(catalog, instructions, { required_ids: ['family-alpha'] }).instructions).toHaveLength(20);
  family.variants = variants;
  expect(() => catalogCompose(catalog, instructions, { required_ids: ['family-alpha'] })).toThrow(expect.objectContaining({ code: 'CATALOG_BUNDLE_LIMIT_EXCEEDED' }));

  const wideVariants = variants.slice(0, 2).map((variant) => ({ ...variant, content: 'x'.repeat(32_001) }));
  family.variants = wideVariants;
  for (const variant of wideVariants) instructions.set(variant.instruction_id, variant);
  expect(() => catalogCompose(catalog, instructions, { required_ids: ['family-alpha'] })).toThrow(expect.objectContaining({ code: 'CATALOG_BUNDLE_LIMIT_EXCEEDED' }));

  const unicodeFixture = await familyFixture();
  const unicodeEntry = unicodeFixture.catalog.instructions.find((item) => item.instruction_id === 'family-alpha')!;
  const unicodeParsed = parseFrontmatter(await readFile(join(unicodeFixture.dir, unicodeEntry.path), 'utf8'));
  const unicodeRecords = JSON.parse(unicodeParsed.data.instruction_variants as string) as VariantRecord[];
  const unicodePayloads = ['é'.repeat(16_000), 'é'.repeat(16_000)];
  unicodeRecords.forEach((record, index) => {
    record.compatibility_requires = [];
    record.applicability = { runtimes: [{ value: 'bun' }] };
    record.contentSha256 = digest(`${unicodePayloads[index]!}\n`);
  });
  const unicodeBody = unicodeRecords.map((record, index) => `<!-- sbvf:variant:begin ${record.variant_id} -->\n${unicodePayloads[index]}\n<!-- sbvf:variant:end ${record.variant_id} -->`).join('\n') + '\n';
  await rewriteVariantScalar(unicodeFixture.dir, JSON.stringify(unicodeRecords), () => unicodeBody);
  const unicodeCatalog = await loadCatalog(unicodeFixture.catalogPath);
  const unicodeInstructions = await loadInstructions(unicodeCatalog, unicodeFixture.dir);
  expect(() => catalogCompose(unicodeCatalog, unicodeInstructions, { required_ids: ['family-alpha'], applicabilityContext: { runtimes: ['bun'] } })).toThrow(expect.objectContaining({
    code: 'CATALOG_BUNDLE_LIMIT_EXCEEDED', details: expect.objectContaining({ instruction_text_bytes: 64_002 }),
  }));

  const repeatedFixture = await familyFixture();
  const repeatedEntry = repeatedFixture.catalog.instructions.find((item) => item.instruction_id === 'family-alpha')!;
  const repeatedParsed = parseFrontmatter(await readFile(join(repeatedFixture.dir, repeatedEntry.path), 'utf8'));
  const repeatedRecords = JSON.parse(repeatedParsed.data.instruction_variants as string) as VariantRecord[];
  const repeatedPayloads = ['é'.repeat(32_001), 'é'.repeat(32_001)];
  repeatedRecords.forEach((record, index) => {
    record.compatibility_requires = [];
    record.applicability = { runtimes: [{ value: 'bun' }] };
    record.contentSha256 = digest(`${repeatedPayloads[index]!}\n`);
  });
  const repeatedBody = repeatedRecords.map((record, index) => `<!-- sbvf:variant:begin ${record.variant_id} -->\n${repeatedPayloads[index]}\n<!-- sbvf:variant:end ${record.variant_id} -->`).join('\n') + '\n';
  await rewriteVariantScalar(repeatedFixture.dir, JSON.stringify(repeatedRecords), () => repeatedBody);
  const repeatedCatalog = await loadCatalog(repeatedFixture.catalogPath);
  const repeatedInstructions = await loadInstructions(repeatedCatalog, repeatedFixture.dir);
  expect(() => catalogCompose(repeatedCatalog, repeatedInstructions, { required_ids: ['family-alpha'], applicabilityContext: { runtimes: ['bun'] } })).toThrow(expect.objectContaining({
    code: 'CATALOG_BUNDLE_LIMIT_EXCEEDED', details: expect.objectContaining({ instruction_text_bytes: 128_006 }),
  }));
});

test('P2b reevaluates dependency applicability after closure and prunes optional cascades', async () => {
  const fixture = await familyFixture();
  const catalog = await loadCatalog(fixture.catalogPath);
  const instructions = await loadInstructions(catalog, fixture.dir);
  const a = instructions.get('variant-alpha-one')!;
  const b = instructions.get('variant-alpha-two')!;
  delete a.applicabilityDeclaration;
  a.compatibility.requires = [b.instruction_id];
  b.compatibility.requires = [];

  b.applicabilityDeclaration = { runtimes: [{ value: 'node' }] };
  expect(() => catalogCompose(catalog, instructions, {
    required_ids: [a.instruction_id], applicabilityContext: { runtimes: ['bun'] },
  })).toThrow(expect.objectContaining({ code: 'CATALOG_REQUIRED_SELECTION_UNAVAILABLE', details: expect.objectContaining({ instruction_id: b.instruction_id, applicability: 'inapplicable' }) }));

  b.applicabilityDeclaration = { runtimes: [{ value: 'bun' }] };
  expect(catalogCompose(catalog, instructions, {
    required_ids: [a.instruction_id], applicabilityContext: { runtimes: ['bun'] },
  }).instructions.map((item) => item.instruction_id)).toEqual([a.instruction_id, b.instruction_id].sort());

  b.applicabilityDeclaration = { runtimes: [{ value: 'node' }] };
  const matchedUnavailable = catalogCompose(catalog, instructions, {
    instruction_ids: [a.instruction_id], applicabilityContext: { runtimes: ['bun'] },
  });
  expect(matchedUnavailable.instructions).toEqual([]);
  expect(matchedUnavailable.omitted.inapplicable).toEqual([a.instruction_id, b.instruction_id].sort());

  b.applicabilityDeclaration = { runtimes: [{ value: 'bun' }] };
  expect(catalogCompose(catalog, instructions, {
    instruction_ids: [a.instruction_id], applicabilityContext: { runtimes: ['bun'] },
  }).instructions.map((item) => item.instruction_id)).toEqual([a.instruction_id, b.instruction_id].sort());

  const c = instructions.get('beta')!;
  a.compatibility.requires = [b.instruction_id, c.instruction_id];
  b.applicabilityDeclaration = { runtimes: [{ value: 'node' }] };
  c.compatibility.requires = [];
  c.applicabilityDeclaration = { runtimes: [{ value: 'bun' }] };
  const prunedOrphan = catalogCompose(catalog, instructions, {
    instruction_ids: [a.instruction_id], applicabilityContext: { runtimes: ['bun'] },
  });
  expect(prunedOrphan.instructions).toEqual([]);
  expect(prunedOrphan.omitted.inapplicable).toEqual([a.instruction_id, b.instruction_id].sort());
  expect(prunedOrphan.omitted.inapplicable).not.toContain(c.instruction_id);

  a.compatibility.requires = [b.instruction_id];
  b.compatibility.requires = [c.instruction_id];
  c.compatibility.requires = [];
  c.applicabilityDeclaration = { runtimes: [{ value: 'node' }] };
  expect(() => catalogCompose(catalog, instructions, {
    required_ids: [a.instruction_id], applicabilityContext: { runtimes: ['bun'] },
  })).toThrow(expect.objectContaining({ code: 'CATALOG_REQUIRED_SELECTION_UNAVAILABLE', details: expect.objectContaining({ instruction_id: c.instruction_id, applicability: 'inapplicable' }) }));
  const matchedChain = catalogCompose(catalog, instructions, {
    instruction_ids: [a.instruction_id], applicabilityContext: { runtimes: ['bun'] },
  });
  expect(matchedChain.instructions).toEqual([]);
  expect(matchedChain.omitted.inapplicable).toEqual([a.instruction_id, b.instruction_id, c.instruction_id].sort());
});

test('P2b browse counts one family and profile filtering retains only nonconflicting variants', async () => {
  const fixture = await familyFixture();
  const catalog = await loadCatalog(fixture.catalogPath);
  const instructions = await loadInstructions(catalog, fixture.dir);
  const family = instructions.get('family-alpha')!;
  const browse = catalogBrowse(catalog, instructions);
  expect(browse.unclassified.instruction_ids.filter((id) => id === 'family-alpha')).toHaveLength(1);
  expect(browse.unclassified.instruction_ids.some((id) => id.startsWith('variant-alpha-'))).toBe(false);

  instructions.get('variant-alpha-one')!.pattern_tags = ['approval-policy-choice-proceed'];
  instructions.get('variant-alpha-two')!.pattern_tags = ['approval-policy-choice-gate'];
  const profile = { schema: 'VPEffectiveProfile/v1' as const, groups: {
    'approval-policy': { active: 'approval-policy-choice-proceed', alternatives: ['approval-policy-choice-proceed', 'approval-policy-choice-gate'] },
  }, unresolved_groups: {} };
  const filtered = catalogSearchWithProfile(catalog, instructions, { instruction_ids: ['family-alpha'] }, profile);
  expect(filtered.map((item) => item.instruction_id)).toEqual(['family-alpha']);
  expect(filtered[0]?.variants?.map((item) => item.variant_id)).toEqual(['variant-alpha-one']);
  instructions.get('variant-alpha-one')!.pattern_tags = ['approval-policy-choice-gate'];
  expect(catalogSearchWithProfile(catalog, instructions, { instruction_ids: ['family-alpha'] }, profile)).toEqual([]);
  expect(family.content).toBe('');
});

test('P2b CLI keeps exact variant get and composes families with applicability context', async () => {
  const fixture = await familyFixture();
  const entry = fixture.catalog.instructions.find((item) => item.instruction_id === 'family-alpha')!;
  const parsed = parseFrontmatter(await readFile(join(fixture.dir, entry.path), 'utf8'));
  const records = JSON.parse(parsed.data.instruction_variants as string) as VariantRecord[];
  records.forEach((record) => { record.compatibility_requires = []; });
  await rewriteVariantScalar(fixture.dir, JSON.stringify(records));
  const cliPath = fileURLToPath(new URL('../skills/vp-mode/scripts/catalog-cli.ts', import.meta.url));
  const run = async (args: string[]) => {
    let stdout = '';
    let stderr = '';
    const code = await runCatalogCli([process.execPath, cliPath, ...args], {
      stdout: (value) => { stdout += value; },
      stderr: (value) => { stderr += value; },
    }, () => undefined);
    return { code, stdout, stderr };
  };
  const context = JSON.stringify({ frameworks: [{ name: 'react', version: '18.2.0' }] });
  const exact = await run(['get', '--catalog', fixture.catalogPath, '--id', 'variant-alpha-one']);
  expect(exact.code).toBe(0);
  expect(JSON.parse(exact.stdout)).toMatchObject({ instruction_id: 'variant-alpha-one', content: '# Alpha variant one.\n' });
  const missingContext = await run(['get', '--catalog', fixture.catalogPath, '--id', 'family-alpha']);
  expect(missingContext.code).toBe(1);
  expect(missingContext.stderr).toContain('family family-alpha requires applicability context');
  const familyGet = await run(['get', '--catalog', fixture.catalogPath, '--id', 'family-alpha', '--applicability-context', context]);
  expect(familyGet.code).toBe(0);
  expect(JSON.parse(familyGet.stdout)).toMatchObject({ instruction_id: 'variant-alpha-one' });
  const composed = await run(['compose', '--catalog', fixture.catalogPath, '--required', 'family-alpha', '--applicability-context', context]);
  expect(composed.code).toBe(0);
  expect(JSON.parse(composed.stdout).instructions.map((item: { instruction_id: string }) => item.instruction_id)).toEqual(['variant-alpha-one']);
});

test('disabled variants cannot be selected or emitted, and all-disabled families remain visible with empty annotations', async () => {
  const fixture = await familyFixture();
  const entry = fixture.catalog.instructions.find((item) => item.instruction_id === 'family-alpha')!;
  const parsed = parseFrontmatter(await readFile(join(fixture.dir, entry.path), 'utf8'));
  const records = JSON.parse(parsed.data.instruction_variants as string) as VariantRecord[];
  records[1]!.status = 'disabled';
  records[1]!.applicability = records[0]!.applicability;
  await rewriteVariantScalar(fixture.dir, JSON.stringify(records));
  const catalog = await loadCatalog(fixture.catalogPath);
  const instructions = await loadInstructions(catalog, fixture.dir);
  const context = { frameworks: [{ name: 'react', version: '18.2.0' }] };
  expect(decisionEvaluate(catalog, instructions, { operation: 'choose', candidates: ['family-alpha'], applicabilityContext: context }).selected).toEqual(['variant-alpha-one']);
  expect(catalogGet(catalog, instructions, 'family-alpha', context).instruction_id).toBe('variant-alpha-one');
  expect(catalogSearch(catalog, instructions, { instruction_ids: ['variant-alpha-one'], applicabilityContext: context })[0]?.variants?.map((item) => item.variant_id)).toEqual(['variant-alpha-one']);
  const profile = { schema: 'VPEffectiveProfile/v1' as const, groups: {}, unresolved_groups: {} };
  expect(catalogSearchWithProfile(catalog, instructions, { instruction_ids: ['variant-alpha-one'] }, profile)[0]?.variants?.map((item) => item.variant_id)).toEqual(['variant-alpha-one']);
  const bundle = catalogCompose(catalog, instructions, { required_ids: ['variant-alpha-one'], applicabilityContext: context });
  expect(bundle.instructions.map((item) => item.instruction_id)).not.toContain('variant-alpha-two');

  records[0]!.status = 'disabled';
  await rewriteVariantScalar(fixture.dir, JSON.stringify(records));
  const disabledCatalog = await loadCatalog(fixture.catalogPath);
  const disabledInstructions = await loadInstructions(disabledCatalog, fixture.dir);
  expect(decisionEvaluate(disabledCatalog, disabledInstructions, { operation: 'choose', candidates: ['family-alpha'], applicabilityContext: context }).selected).toEqual([]);
  expect(catalogSearch(disabledCatalog, disabledInstructions, { instruction_ids: ['variant-alpha-one'], applicabilityContext: context })).toEqual([]);
  expect(catalogSearchWithProfile(disabledCatalog, disabledInstructions, { instruction_ids: ['variant-alpha-one'] }, profile)).toEqual([]);
});

test('compose rejects dependencies that resolve to a family in either dependency path', async () => {
  const fixture = await familyFixture();
  const catalog = await loadCatalog(fixture.catalogPath);
  const instructions = await loadInstructions(catalog, fixture.dir);
  const selected = instructions.get('variant-alpha-one')!;
  selected.compatibility.requires = ['family-alpha'];
  expect(() => catalogCompose(catalog, instructions, { required_ids: ['variant-alpha-one'], applicabilityContext: { frameworks: [{ name: 'react', version: '18.2.0' }] } }))
    .toThrow(expect.objectContaining({ code: 'CATALOG_DEPENDENCY_MISSING', details: expect.objectContaining({ dependency_id: 'family-alpha' }) }));

  selected.compatibility.requires = ['variant-alpha-two'];
  instructions.get('variant-alpha-two')!.pattern_tags = ['approval-policy-choice-gate'];
  const family = instructions.get('family-alpha')!;
  const activeFamilyId = 'proceed-without-waiting-for-confirmation';
  instructions.set(activeFamilyId, { ...family, instruction_id: activeFamilyId, pattern_tags: ['approval-policy-choice-proceed'] });
  const profile = {
    schema: 'VPEffectiveProfile/v1' as const,
    groups: { 'approval-policy': { active: 'approval-policy-choice-proceed', alternatives: ['approval-policy-choice-proceed', 'approval-policy-choice-gate'] } },
    unresolved_groups: {},
  };
  expect(() => catalogCompose(catalog, instructions, { required_ids: ['variant-alpha-one'], profile, applicabilityContext: { frameworks: [{ name: 'react', version: '18.2.0' }] } }))
    .toThrow(expect.objectContaining({ code: 'CATALOG_DEPENDENCY_MISSING', details: expect.objectContaining({ dependency_id: activeFamilyId }) }));
});

test('v3 family IDs must use the family namespace', async () => {
  const fixture = await familyFixture();
  const entry = fixture.catalog.instructions.find((item) => item.instruction_id === 'family-alpha')!;
  const path = join(fixture.dir, entry.path);
  const source = (await readFile(path, 'utf8')).replace('instruction_id: "family-alpha"', 'instruction_id: "ordinary-id"');
  await writeFile(path, source);
  entry.instruction_id = 'ordinary-id';
  entry.sha256 = digest(source);
  await writeFile(fixture.catalogPath, `${JSON.stringify(fixture.catalog, null, 2)}\n`);
  const catalog = await loadCatalog(fixture.catalogPath);
  await expect(loadInstructions(catalog, fixture.dir)).rejects.toMatchObject({ code: 'CATALOG_INVALID' });
});

test('v3 loader rejects id collisions and section hash drift; family get rejects zero or multiple matches', async () => {
  const collision = await familyFixture();
  const collisionEntry = collision.catalog.instructions.find((item) => item.instruction_id === 'family-alpha')!;
  const collisionParsed = parseFrontmatter(await readFile(join(collision.dir, collisionEntry.path), 'utf8'));
  const records = JSON.parse(collisionParsed.data.instruction_variants as string) as VariantRecord[];
  records[0]!.variant_id = 'family-alpha';
  await rewriteVariantScalar(collision.dir, JSON.stringify(records));
  const collisionCatalog = await loadCatalog(collision.catalogPath);
  await expect(loadInstructions(collisionCatalog, collision.dir)).rejects.toMatchObject({ code: 'CATALOG_INVALID' });

  const drift = await familyFixture();
  const driftEntry = drift.catalog.instructions.find((item) => item.instruction_id === 'family-alpha')!;
  const driftParsed = parseFrontmatter(await readFile(join(drift.dir, driftEntry.path), 'utf8'));
  await rewriteVariantScalar(drift.dir, driftParsed.data.instruction_variants as string, (body) => body.replace('Alpha variant one', 'Changed variant one'));
  const driftCatalog = await loadCatalog(drift.catalogPath);
  await expect(loadInstructions(driftCatalog, drift.dir)).rejects.toMatchObject({ code: 'CATALOG_INVALID' });

  const multiple = await familyFixture();
  const multipleEntry = multiple.catalog.instructions.find((item) => item.instruction_id === 'family-alpha')!;
  const multipleParsed = parseFrontmatter(await readFile(join(multiple.dir, multipleEntry.path), 'utf8'));
  const multipleRecords = JSON.parse(multipleParsed.data.instruction_variants as string) as VariantRecord[];
  multipleRecords[1]!.applicability = multipleRecords[0]!.applicability;
  await rewriteVariantScalar(multiple.dir, JSON.stringify(multipleRecords));
  const multipleCatalog = await loadCatalog(multiple.catalogPath);
  const multipleInstructions = await loadInstructions(multipleCatalog, multiple.dir);
  expect(() => catalogGet(multipleCatalog, multipleInstructions, 'family-alpha', { frameworks: [{ name: 'react', version: '18.2.0' }] })).toThrow(expect.objectContaining({ code: 'CATALOG_REQUIRED_SELECTION_UNAVAILABLE' }));
  expect(() => catalogGet(multipleCatalog, multipleInstructions, 'family-alpha', { frameworks: [{ name: 'svelte', version: '5.0.0' }] })).toThrow(expect.objectContaining({ code: 'CATALOG_REQUIRED_SELECTION_UNAVAILABLE' }));
});

test('v3 loader reports invalid family and variant approach metadata as CATALOG_INVALID', async () => {
  const familyApproach = await familyFixture();
  await addInvalidFamilyApproach(familyApproach.dir);
  const familyCatalog = await loadCatalog(familyApproach.catalogPath);
  await expect(loadInstructions(familyCatalog, familyApproach.dir)).rejects.toMatchObject({ code: 'CATALOG_INVALID' });

  const variantApproach = await familyFixture();
  const entry = variantApproach.catalog.instructions.find((item) => item.instruction_id === 'family-alpha')!;
  const parsed = parseFrontmatter(await readFile(join(variantApproach.dir, entry.path), 'utf8'));
  const records = JSON.parse(parsed.data.instruction_variants as string) as VariantRecord[];
  records[0]!.approach_assessments = ['invalid'];
  records[0]!.approach_body_sha256 = digest('# Alpha variant one.\n');
  await rewriteVariantScalar(variantApproach.dir, JSON.stringify(records));
  const variantCatalog = await loadCatalog(variantApproach.catalogPath);
  await expect(loadInstructions(variantCatalog, variantApproach.dir)).rejects.toMatchObject({ code: 'CATALOG_INVALID' });
});

test('v3 loader rejects a variant id reused by a second family', async () => {
  const fixture = await familyFixture();
  await addSecondFamilyWithDuplicateVariants(fixture.dir);
  const catalog = await loadCatalog(fixture.catalogPath);
  await expect(loadInstructions(catalog, fixture.dir)).rejects.toMatchObject({ code: 'CATALOG_INVALID' });
});
