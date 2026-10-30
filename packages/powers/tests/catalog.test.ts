import { afterAll, describe, expect, spyOn, test } from 'bun:test';
import * as nativeFiles from 'node:fs';
import { createHash } from 'node:crypto';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CatalogError,
  catalogBrowse,
  catalogCompose,
  catalogFindTags,
  catalogGet,
  catalogSearch,
  catalogSearchWithProfile,
  catalogTags,
  loadCatalog,
  loadInstructions,
  readSchema,
  evaluateApproaches,
  parseApproachSelectors,
} from '../skills/vp-mode/scripts/catalog.ts';
import type { Catalog, CatalogBrowseResult, ComposeQuery, EffectiveProfile, LoadedInstruction, SearchQuery } from '../skills/vp-mode/scripts/catalog.ts';
import { validateAgainstSchema } from '../skills/vp-mode/scripts/schema.ts';
import type { Schema } from '../skills/vp-mode/scripts/schema.ts';
import { parseFrontmatter } from '../skills/vp-mode/scripts/frontmatter.ts';

const fixtureDir = fileURLToPath(new URL('./fixtures/catalog/', import.meta.url));
const tempDirs: string[] = [];

test('approach decisions retain uncertain states across six classified domains', async () => {
  const { catalog, instructions } = await fixture();
  const base = instructions.get('alpha');
  if (base === undefined) throw new Error('missing alpha');
  const domains = ['engineering', 'design-ux', 'product', 'business', 'research', 'operations'] as const;
  const states = ['declared', 'declared', 'unknown', 'no-decision', 'not-applicable', 'unassessed'] as const;
  const selectors = parseApproachSelectors(['execution=solo', 'review-requirement=independent', 'execution=solo']);
  const synthetic = new Map<string, LoadedInstruction>();
  for (let index = 0; index < domains.length; index++) {
    const domain = domains[index];
    const state = states[index];
    if (domain === undefined || state === undefined) throw new Error('missing case');
    const approach_assessments: LoadedInstruction['approach_assessments'] = state === 'unassessed' ? [] : state === 'declared'
      ? [{ dimension: 'execution', state, values: [index === 0 ? 'solo' : 'delegated'], evidence: { start: 0, end: 1 } }]
      : [{ dimension: 'execution', state, reason: 'fixture', evidence: { start: 0, end: 1 } }];
    synthetic.set(domain, { ...base, instruction_id: domain, classification: { classification_status: 'classified', instruction_form: 'principle', domains: [domain] }, approach_assessments });
  }
  expect(catalogSearch(catalog, synthetic, { approaches: ['execution=solo', 'review-requirement=independent'] }).map(item => item.instruction_id)).toEqual(['business', 'engineering', 'operations', 'product', 'research']);
  expect(evaluateApproaches(synthetic.get('research')!, selectors).dimensions[0]?.decision).toBe('not-applicable');
  expect(evaluateApproaches(synthetic.get('operations')!, selectors).dimensions[0]?.decision).toBe('unassessed');
  expect(() => parseApproachSelectors(['execution=solo', 'execution=delegated'])).toThrow();
});

async function copyFixture(): Promise<{ dir: string; catalogPath: string }> {
  const dir = await mkdtemp(join(tmpdir(), 'vp-catalog-'));
  tempDirs.push(dir);
  await cp(fixtureDir, dir, { recursive: true });
  const catalogPath = join(dir, 'catalog.json');
  const catalog = await readManifest(catalogPath);
  await installFacetedSchema(dir);
  for (const entry of catalog.instructions) {
    const path = join(dir, entry.path);
    const source = await readFile(path, 'utf8');
    await writeFile(path, source.replace('---\n', '---\nschema: VPInstruction/v1.2\nclassification_status: unclassified\nclassification_reason: Synthetic test fixture.\n'));
    await updateInstructionDigest(dir, catalog, entry.instruction_id);
  }
  await writeManifest(catalogPath, catalog);
  return { dir, catalogPath };
}

async function readManifest(path: string): Promise<Catalog> {
  return JSON.parse(await readFile(path, 'utf8')) as Catalog;
}

async function writeManifest(path: string, catalog: Catalog): Promise<void> {
  await writeFile(path, `${JSON.stringify(catalog, null, 2)}\n`);
}

async function updateInstructionDigest(dir: string, catalog: Catalog, id: string): Promise<void> {
  const entry = catalog.instructions.find((item) => item.instruction_id === id);
  if (entry === undefined) throw new Error(`missing fixture entry: ${id}`);
  const bytes = await readFile(join(dir, entry.path));
  entry.sha256 = createHash('sha256').update(bytes).digest('hex');
}

async function installFacetedSchema(directory: string): Promise<void> {
  const source = fileURLToPath(new URL('../config/vpinstruction.v1.2.schema.json', import.meta.url));
  await writeFile(join(directory, 'config/vpinstruction.v1.2.schema.json'), await readFile(source));
}

async function addFacetFields(copy: { dir: string; catalogPath: string }, id: string, fields: string): Promise<void> {
  const catalog = await readManifest(copy.catalogPath);
  const entry = catalog.instructions.find((item) => item.instruction_id === id);
  if (entry === undefined) throw new Error(`missing fixture entry: ${id}`);
  const path = join(copy.dir, entry.path);
  const source = await readFile(path, 'utf8');
  const firstLine = source.indexOf('\n');
  if (firstLine < 0) throw new Error(`fixture instruction has no frontmatter delimiter: ${id}`);
  const rest = source.slice(firstLine + 1).replace(/^schema: VPInstruction\/v1\.2\nclassification_status: unclassified\nclassification_reason: Synthetic test fixture\.\n/, '');
  const updated = `${source.slice(0, firstLine + 1)}${fields}\n${rest}`;
  await writeFile(path, updated);
  await updateInstructionDigest(copy.dir, catalog, id);
  await writeManifest(copy.catalogPath, catalog);
}

async function facetedFixture(): Promise<{ catalog: Catalog; instructions: Map<string, LoadedInstruction> }> {
  const copy = await copyFixture();
  await installFacetedSchema(copy.dir);
  await addFacetFields(copy, 'alpha', 'schema: VPInstruction/v1.2\nclassification_status: classified\ninstruction_form: procedure\ndomains:\n  - engineering\n  - design-ux');
  await addFacetFields(copy, 'gamma', 'schema: VPInstruction/v1.2\nclassification_status: classified\ninstruction_form: principle\ndomains:\n  - engineering\n  - operations');
  await addFacetFields(copy, 'conflict-mode', 'schema: VPInstruction/v1.2\nclassification_status: classified\ninstruction_form: checklist\ndomains:\n  - product');
  await addFacetFields(copy, 'beta', 'schema: VPInstruction/v1.2\nclassification_status: unclassified\nclassification_reason: Needs owner review.');
  await addFacetFields(copy, 'disabled-mode', 'schema: VPInstruction/v1.2\nclassification_status: classified\ninstruction_form: checklist\ndomains:\n  - operations');
  const catalog = await loadCatalog(copy.catalogPath);
  return { catalog, instructions: await loadInstructions(catalog, copy.dir) };
}

async function fixture(): Promise<{ catalog: Catalog; instructions: Map<string, LoadedInstruction> }> {
  const { dir, catalogPath } = await copyFixture();
  const catalog = await loadCatalog(catalogPath);
  return { catalog, instructions: await loadInstructions(catalog, dir) };
}

type CanonicalMethodologyProfile = {
  groups: {
    id: string;
    title?: string;
    description?: string;
    user_decision?: boolean;
    alternatives: { id: string; title?: string; description?: string; instruction_ids: string[] }[];
  }[];
};

async function readCanonicalMethodologyProfile(): Promise<CanonicalMethodologyProfile> {
  const path = join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), 'config', 'methodology-profile.json');
  return JSON.parse(await readFile(path, 'utf8')) as CanonicalMethodologyProfile;
}

async function readEffectiveProfileSchema(): Promise<Schema> {
  const path = join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), 'config', 'vpeffectiveprofile.v1.schema.json');
  return JSON.parse(await readFile(path, 'utf8')) as Schema;
}

async function policyFixture(): Promise<{
  catalog: Catalog;
  instructions: Map<string, LoadedInstruction>;
  group: string;
  alternatives: string[];
}> {
  const loaded = await fixture();
  const methodology = await readCanonicalMethodologyProfile();
  const group = methodology.groups.find((item) => item.id === 'approval-policy');
  const first = group?.alternatives[0];
  const second = group?.alternatives[1];
  if (group === undefined || first === undefined || second === undefined) throw new Error('canonical approval-policy alternatives are missing');

  const catalog = structuredClone(loaded.catalog);
  catalog.tag_dictionary.pattern[first.id] = 'Fixture policy alternative ' + first.id + '.';
  catalog.tag_dictionary.pattern[second.id] = 'Fixture policy alternative ' + second.id + '.';
  const instructions = new Map(loaded.instructions);
  const alpha = instructions.get('alpha');
  const beta = instructions.get('beta');
  if (alpha === undefined || beta === undefined) throw new Error('fixture policy instructions are missing');
  instructions.set('alpha', { ...alpha, pattern_tags: [first.id] });
  instructions.set('beta', { ...beta, pattern_tags: [second.id] });
  return { catalog, instructions, group: group.id, alternatives: [first.id, second.id] };
}

async function approvalDependencyFixture(includeMappedActive: boolean) {
  const { catalog, instructions: baseInstructions, group, alternatives } = await policyFixture();
  const methodology = await readCanonicalMethodologyProfile();
  const canonicalGroup = methodology.groups.find((item) => item.id === group);
  const activeTag = alternatives[0];
  const inactiveTag = alternatives[1];
  const activeAlternative = canonicalGroup?.alternatives.find((item) => item.id === activeTag);
  const inactiveAlternative = canonicalGroup?.alternatives.find((item) => item.id === inactiveTag);
  const inactiveDependencyId = inactiveAlternative?.instruction_ids[0];
  const alpha = baseInstructions.get('alpha');
  const beta = baseInstructions.get('beta');
  if (activeTag === undefined || inactiveTag === undefined || activeAlternative === undefined
    || inactiveAlternative === undefined || inactiveDependencyId === undefined
    || activeAlternative.instruction_ids.length === 0 || alpha === undefined || beta === undefined) {
    throw new Error('canonical approval-policy dependency fixture is incomplete');
  }
  const rootId = 'synthetic-policy-root';
  const instructions = new Map<string, LoadedInstruction>();
  instructions.set(rootId, {
    ...alpha,
    instruction_id: rootId,
    pattern_tags: [],
    compatibility: { ...alpha.compatibility, requires: [inactiveDependencyId] },
  });
  instructions.set(inactiveDependencyId, {
    ...beta,
    instruction_id: inactiveDependencyId,
    pattern_tags: [inactiveTag],
    compatibility: { excludes: [], requires: [] },
  });
  for (const id of ['unmapped-carrier-a', 'unmapped-carrier-b']) {
    instructions.set(id, {
      ...beta,
      instruction_id: id,
      pattern_tags: [activeTag],
      compatibility: { excludes: [], requires: [] },
    });
  }
  if (includeMappedActive) {
    for (const id of activeAlternative.instruction_ids) {
      instructions.set(id, {
        ...beta,
        instruction_id: id,
        pattern_tags: [activeTag],
        compatibility: { excludes: [], requires: [] },
      });
    }
  }
  const profile: EffectiveProfile = {
    schema: 'VPEffectiveProfile/v1',
    groups: { [group]: { active: activeTag, alternatives } },
    unresolved_groups: {},
  };
  return { catalog, instructions, profile, rootId, inactiveDependencyId, group, activeTag, activeInstructionIds: activeAlternative.instruction_ids };
}

test('approach checks effective profile replacements rather than inactive dependencies', async () => {
  const { catalog, instructions, profile, rootId, inactiveDependencyId, activeInstructionIds } = await approvalDependencyFixture(true);
  const inactive = instructions.get(inactiveDependencyId);
  if (inactive === undefined) throw new Error('missing inactive dependency');
  instructions.set(inactiveDependencyId, { ...inactive, approach_assessments: [{ dimension: 'execution', state: 'declared', values: ['delegated'], evidence: { start: 0, end: 1 } }] });
  const query = { required_ids: [rootId], profile, approaches: ['execution=solo'] };
  const bundle = catalogCompose(catalog, instructions, query);
  expect(bundle.instructions.map(item => item.instruction_id)).toEqual([rootId, ...activeInstructionIds].sort());
  const activeId = activeInstructionIds[0];
  const active = activeId === undefined ? undefined : instructions.get(activeId);
  if (activeId === undefined || active === undefined) throw new Error('missing active replacement');
  instructions.set(activeId, { ...active, approach_assessments: [{ dimension: 'execution', state: 'declared', values: ['delegated'], evidence: { start: 0, end: 1 } }] });
  expect(() => catalogCompose(catalog, instructions, query)).toThrow(expect.objectContaining({ code: 'CATALOG_REQUIRED_CONFLICT', details: expect.objectContaining({ instruction_id: activeId, requiring_instruction_id: rootId }) }));
  for (const state of ['unknown', 'no-decision', 'not-applicable'] as const) {
    instructions.set(activeId, { ...active, approach_assessments: [{ dimension: 'execution', state, reason: 'fixture', evidence: { start: 0, end: 1 } }] });
    expect(catalogCompose(catalog, instructions, query).instructions.map(item => item.instruction_id)).toContain(activeId);
  }
});

test('required and transitive uncertain assessments and declared multi-value overlap remain selectable', async () => {
  const { catalog, instructions } = await fixture();
  const alpha = instructions.get('alpha');
  const beta = instructions.get('beta');
  if (alpha === undefined || beta === undefined) throw new Error('fixture missing');
  for (const state of ['unknown', 'no-decision', 'not-applicable'] as const) {
    const assessment = { dimension: 'execution', state, reason: 'fixture', evidence: { start: 0, end: 1 } };
    instructions.set('alpha', { ...alpha, approach_assessments: [assessment] });
    instructions.set('beta', { ...beta, approach_assessments: [assessment] });
    expect(catalogCompose(catalog, instructions, { required_ids: ['alpha'], approaches: ['execution=solo'] }).instructions.map(item => item.instruction_id)).toEqual(['alpha', 'beta', 'gamma']);
  }
  instructions.set('alpha', { ...alpha, approach_assessments: [{ dimension: 'execution', state: 'declared', values: ['solo', 'delegated'], evidence: { start: 0, end: 1 } }] });
  instructions.set('beta', { ...beta, approach_assessments: [{ dimension: 'execution', state: 'declared', values: ['solo', 'delegated'], evidence: { start: 0, end: 1 } }] });
  expect(catalogCompose(catalog, instructions, { required_ids: ['alpha'], approaches: ['execution=solo'] }).instructions.map(item => item.instruction_id)).toEqual(['alpha', 'beta', 'gamma']);
});

function syntheticInstructions(
  seed: LoadedInstruction,
  count: number,
  content: string,
  requiresFor: (index: number, ids: string[]) => string[] = () => [],
): { instructions: Map<string, LoadedInstruction>; ids: string[] } {
  const ids = Array.from({ length: count }, (_, index) => `budget-${index + 1}`);
  const instructions = new Map(ids.map((id, index) => [id, {
    ...seed,
    instruction_id: id,
    title: id,
    summary: 'Synthetic instruction for bundle budget coverage.',
    capability_tags: [],
    pattern_tags: [],
    content,
    compatibility: { excludes: [], requires: requiresFor(index, ids) },
  }]));
  return { instructions, ids };
}

afterAll(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('loadCatalog', () => {
  test('loads a schema-valid manifest', async () => {
    const catalog = await loadCatalog(join(fixtureDir, 'catalog.json'));
    expect(catalog.catalog_id).toBe('test-catalog');
    expect(catalog.instructions).toHaveLength(6);
  });

  test('rejects schema-invalid manifests with schema messages', async () => {
    const copy = await copyFixture();
    const catalog = await readManifest(copy.catalogPath);
    catalog.catalog_id = '';
    await writeManifest(copy.catalogPath, catalog);
    await expect(loadCatalog(copy.catalogPath)).rejects.toMatchObject({
      code: 'CATALOG_INVALID',
      details: { schemaErrors: expect.arrayContaining(['catalog_id: must have at least 1 characters']) },
    });
  });

  test('rejects malformed JSON', async () => {
    const copy = await copyFixture();
    await writeFile(copy.catalogPath, '{');
    await expect(loadCatalog(copy.catalogPath)).rejects.toMatchObject({ code: 'CATALOG_INVALID' });
  });

  test('rejects aliases whose canonical tag is absent', async () => {
    const copy = await copyFixture();
    const catalog = await readManifest(copy.catalogPath);
    catalog.tag_aliases.tdd = 'missing-tag';
    await writeManifest(copy.catalogPath, catalog);
    await expect(loadCatalog(copy.catalogPath)).rejects.toMatchObject({ code: 'CATALOG_INVALID' });
  });

  test('rejects duplicate ids with both paths in details', async () => {
    const duplicateId = await copyFixture();
    const byId = await readManifest(duplicateId.catalogPath);
    const firstId = byId.instructions[0];
    const secondId = byId.instructions[1];
    if (firstId === undefined || secondId === undefined) throw new Error('fixture entries missing');
    secondId.instruction_id = firstId.instruction_id;
    await writeManifest(duplicateId.catalogPath, byId);
    await expect(loadCatalog(duplicateId.catalogPath)).rejects.toMatchObject({
      code: 'CATALOG_INVALID', details: { instruction_id: firstId.instruction_id, paths: [firstId.path, secondId.path] },
    });

  });

  test('rejects duplicate paths with both ids in details', async () => {
    const duplicatePath = await copyFixture();
    const byPath = await readManifest(duplicatePath.catalogPath);
    const pathFirst = byPath.instructions[0];
    const pathSecond = byPath.instructions[1];
    if (pathFirst === undefined || pathSecond === undefined) throw new Error('fixture entries missing');
    pathSecond.path = pathFirst.path;
    await writeManifest(duplicatePath.catalogPath, byPath);
    await expect(loadCatalog(duplicatePath.catalogPath)).rejects.toMatchObject({
      code: 'CATALOG_INVALID', details: { path: pathFirst.path, instruction_ids: [pathFirst.instruction_id, pathSecond.instruction_id] },
    });
  });

  test('rejects an invalid schema file', async () => {
    const copy = await copyFixture();
    await writeFile(join(copy.dir, 'config/vpcatalog.v1.schema.json'), '{');
    await expect(loadCatalog(copy.catalogPath)).rejects.toMatchObject({ code: 'CATALOG_INVALID' });
  });
});

describe('loadInstructions', () => {
  test('loads normalized instructions, provenance, defaults, and guidance empty arrays', async () => {
    const { instructions } = await fixture();
    const alpha = instructions.get('alpha');
    const guidance = instructions.get('guidance');
    expect(alpha).toMatchObject({
      instruction_id: 'alpha', roles: ['engineer'], products: ['vida-powers'],
      conditions: { applies_when: 'implementation code changes, code. changes', does_not_apply_when: 'documentation only' },
      provenance: [{ donor: 'superpowers', license: 'MIT', revision: 'bb92a77741419a4ab5f06e711a283343f1ada0c3', path: 'skills/test-driven-development/SKILL.md' }],
      content: 'Alpha body.\n',
    });
    expect(instructions.get('beta')?.roles).toEqual(['qa-engineer']);
    expect(instructions.get('beta')?.products).toEqual(['agent-runtime']);
    expect(instructions.get('disabled-mode')?.status).toBe('disabled');
    expect(guidance).toMatchObject({ capability_tags: [], pattern_tags: [], artifact_contract: { output_type: 'none', required_data: [], verified_by: '' } });
    expect(guidance?.classification).toEqual({ classification_status: 'unclassified', classification_reason: 'Synthetic test fixture.' });
  });

  test('dispatches exact v1.2 states and rejects unsupported markers and closed-field additions', async () => {
    const mixed = await facetedFixture();
    expect(mixed.instructions.get('alpha')?.classification).toEqual({
      classification_status: 'classified', instruction_form: 'procedure', domains: ['engineering', 'design-ux'],
    });
    expect(mixed.instructions.get('beta')?.classification).toEqual({
      classification_status: 'unclassified', classification_reason: 'Needs owner review.',
    });
    expect(mixed.instructions.get('guidance')?.classification).toEqual({
      classification_status: 'unclassified', classification_reason: 'Synthetic test fixture.',
    });

    for (const marker of ['VPInstruction/v1.1', 'VPInstruction/v2', 'null']) {
      const copy = await copyFixture();
      await addFacetFields(copy, 'alpha', `schema: ${marker}`);
      await expect(loadInstructions(await loadCatalog(copy.catalogPath), copy.dir)).rejects.toMatchObject({ code: 'CATALOG_INVALID' });
    }

    const unmarked = await copyFixture();
    await addFacetFields(unmarked, 'alpha', 'classification_status: unclassified\nclassification_reason: Explicit classification required.');
    await expect(loadInstructions(await loadCatalog(unmarked.catalogPath), unmarked.dir)).rejects.toMatchObject({ code: 'CATALOG_INVALID' });

    const extra = await copyFixture();
    await installFacetedSchema(extra.dir);
    await addFacetFields(extra, 'alpha', 'schema: VPInstruction/v1.2\nclassification_status: classified\ninstruction_form: procedure\ndomains:\n  - engineering\nextra_facet: true');
    await expect(loadInstructions(await loadCatalog(extra.catalogPath), extra.dir)).rejects.toMatchObject({ code: 'CATALOG_INVALID' });
  });

  test('classification changes remain local to one loaded instruction', async () => {
    const { instructions } = await fixture();
    const alpha = instructions.get('alpha');
    const beta = instructions.get('beta');
    if (alpha?.classification.classification_status !== 'unclassified' || beta === undefined) throw new Error('legacy fixture missing');
    alpha.classification.classification_reason = 'Local caller annotation';
    expect(beta.classification).toEqual({ classification_status: 'unclassified', classification_reason: 'Synthetic test fixture.' });
  });

  test('loads assessments and preserves Unicode body bytes; absence is unassessed', async () => {
    const copy = await copyFixture();
    const path = join(copy.dir, 'instructions/alpha.md');
    const source = await readFile(path, 'utf8');
    const body = '??? ?? now.\n';
    await writeFile(path, source.replace('Alpha body.\n', body));
    const hash = createHash('sha256').update(body, 'utf8').digest('hex');
    await addFacetFields(copy, 'alpha', 'schema: VPInstruction/v1.2\nclassification_status: unclassified\nclassification_reason: Synthetic test fixture.\napproach_body_sha256: ' + hash + '\napproach_assessments:\n  - "dimension=execution; state=declared; values=solo; evidence=body:0-6"');
    const loaded = await loadInstructions(await loadCatalog(copy.catalogPath), copy.dir);
    expect(Buffer.from(loaded.get('alpha')?.content ?? '', 'utf8')).toEqual(Buffer.from(body, 'utf8'));
    expect(loaded.get('alpha')?.approach_assessments).toEqual([{ dimension: 'execution', state: 'declared', values: ['solo'], evidence: { start: 0, end: 6 } }]);
    expect(loaded.get('beta')?.approach_assessments).toEqual([]);
  });

  test.each(['malformed', 'stale', 'unpaired'])('rejects %s assessment metadata', async kind => {
    const copy = await copyFixture();
    const digest = kind === 'stale' ? '0'.repeat(64) : createHash('sha256').update('Alpha body.\n').digest('hex');
    const row = kind === 'malformed' ? 'dimension=execution; state=declared; values=bogus; evidence=body:0-5' : 'dimension=execution; state=declared; values=solo; evidence=body:0-5';
    const assessment = 'approach_body_sha256: ' + digest + (kind === 'unpaired' ? '' : '\napproach_assessments:\n  - "' + row + '"');
    await addFacetFields(copy, 'alpha', 'schema: VPInstruction/v1.2\nclassification_status: unclassified\nclassification_reason: Synthetic test fixture.\n' + assessment);
    await expect(loadInstructions(await loadCatalog(copy.catalogPath), copy.dir)).rejects.toMatchObject(kind === 'unpaired'
      ? { code: 'CATALOG_INVALID', details: { schemaErrors: expect.any(Array) } }
      : { code: 'CATALOG_INVALID', message: expect.stringContaining('approach assessments are invalid'), details: { message: kind === 'stale' ? 'approach body digest mismatch' : 'invalid declared approach values' } });
  });

  test('uses the selected snapshot v1.2 schema', async () => {
    const copy = await copyFixture();
    const schemaPath = join(copy.dir, 'config/vpinstruction.v1.2.schema.json');
    const schema = JSON.parse(await readFile(schemaPath, 'utf8'));
    schema.properties.title = { const: 'snapshot-only-title' };
    await writeFile(schemaPath, JSON.stringify(schema));
    await expect(loadInstructions(await loadCatalog(copy.catalogPath), copy.dir)).rejects.toMatchObject({ code: 'CATALOG_INVALID', details: { schemaErrors: expect.any(Array) } });
  });

  test('loads a catalog object with the caller-supplied directory', async () => {
    const copy = await copyFixture();
    const catalog = await readManifest(copy.catalogPath);
    expect((await loadInstructions(catalog, copy.dir)).size).toBe(6);
  });

  test('rejects raw-byte digest mismatches', async () => {
    const copy = await copyFixture();
    await writeFile(join(copy.dir, 'instructions/alpha.md'), `${await readFile(join(copy.dir, 'instructions/alpha.md'), 'utf8')}changed`);
    const catalog = await loadCatalog(copy.catalogPath);
    await expect(loadInstructions(catalog, copy.dir)).rejects.toMatchObject({
      code: 'CATALOG_DIGEST_MISMATCH',
      details: { instruction_id: 'alpha', expected: expect.any(String), actual: expect.any(String) },
    });
  });

  test('rejects unknown tags unless the instruction dimension has an exemption', async () => {
    const copy = await copyFixture();
    const file = join(copy.dir, 'instructions/alpha.md');
    await writeFile(file, (await readFile(file, 'utf8')).replace('test-design', 'outside-dictionary'));
    const catalog = await readManifest(copy.catalogPath);
    catalog.tag_exemptions = [];
    await updateInstructionDigest(copy.dir, catalog, 'alpha');
    await writeManifest(copy.catalogPath, catalog);
    await expect(loadInstructions(await loadCatalog(copy.catalogPath), copy.dir)).rejects.toMatchObject({ code: 'CATALOG_TAG_UNKNOWN' });

    const allowed = await copyFixture();
    const allowedFile = join(allowed.dir, 'instructions/alpha.md');
    await writeFile(allowedFile, (await readFile(allowedFile, 'utf8')).replace('test-design', 'outside-dictionary'));
    const allowedCatalog = await readManifest(allowed.catalogPath);
    await updateInstructionDigest(allowed.dir, allowedCatalog, 'alpha');
    await writeManifest(allowed.catalogPath, allowedCatalog);
    expect((await loadInstructions(await loadCatalog(allowed.catalogPath), allowed.dir)).get('alpha')?.capability_tags).toEqual(['outside-dictionary']);
  });

  test('rejects a frontmatter id that differs from its manifest entry', async () => {
    const copy = await copyFixture();
    const file = join(copy.dir, 'instructions/alpha.md');
    await writeFile(file, (await readFile(file, 'utf8')).replace('instruction_id: alpha', 'instruction_id: beta'));
    const catalog = await readManifest(copy.catalogPath);
    await updateInstructionDigest(copy.dir, catalog, 'alpha');
    await writeManifest(copy.catalogPath, catalog);
    await expect(loadInstructions(await loadCatalog(copy.catalogPath), copy.dir)).rejects.toMatchObject({ code: 'CATALOG_INVALID' });
  });

  test('wraps frontmatter and instruction-schema errors as CATALOG_INVALID', async () => {
    const copy = await copyFixture();
    const file = join(copy.dir, 'instructions/alpha.md');
    await writeFile(file, 'no frontmatter');
    const catalog = await readManifest(copy.catalogPath);
    await updateInstructionDigest(copy.dir, catalog, 'alpha');
    await writeManifest(copy.catalogPath, catalog);
    await expect(loadInstructions(await loadCatalog(copy.catalogPath), copy.dir)).rejects.toMatchObject({
      code: 'CATALOG_INVALID', details: { line: expect.any(Number), message: expect.any(String) },
    });
  });

  test('rejects exemptions without a reason', async () => {
    const copy = await copyFixture();
    const catalog = await readManifest(copy.catalogPath);
    (catalog.tag_exemptions[0] as unknown as Record<string, unknown>).reason = '';
    await writeManifest(copy.catalogPath, catalog);
    await expect(loadCatalog(copy.catalogPath)).rejects.toMatchObject({ code: 'CATALOG_INVALID' });
  });

  test('rejects schema-invalid and malformed provenance instructions', async () => {
    const schemaCopy = await copyFixture();
    const schemaFile = join(schemaCopy.dir, 'instructions/alpha.md');
    await writeFile(schemaFile, (await readFile(schemaFile, 'utf8')).replace('title: Alpha instruction', 'title:'));
    const schemaCatalog = await readManifest(schemaCopy.catalogPath);
    await updateInstructionDigest(schemaCopy.dir, schemaCatalog, 'alpha');
    await writeManifest(schemaCopy.catalogPath, schemaCatalog);
    await expect(loadInstructions(await loadCatalog(schemaCopy.catalogPath), schemaCopy.dir)).rejects.toMatchObject({
      code: 'CATALOG_INVALID', details: { schemaErrors: expect.arrayContaining(['title: must have at least 1 characters']) },
    });

    const provenanceCopy = await copyFixture();
    const provenanceFile = join(provenanceCopy.dir, 'instructions/alpha.md');
    await writeFile(provenanceFile, (await readFile(provenanceFile, 'utf8')).replace('donor=superpowers', 'donor= '));
    const provenanceCatalog = await readManifest(provenanceCopy.catalogPath);
    await updateInstructionDigest(provenanceCopy.dir, provenanceCatalog, 'alpha');
    await writeManifest(provenanceCopy.catalogPath, provenanceCatalog);
    await expect(loadInstructions(await loadCatalog(provenanceCopy.catalogPath), provenanceCopy.dir)).rejects.toMatchObject({ code: 'CATALOG_INVALID' });
  });

  test('reports CRLF bytes as a digest mismatch against the LF manifest digest', async () => {
    const copy = await copyFixture();
    const file = join(copy.dir, 'instructions/alpha.md');
    const lfText = await readFile(file, 'utf8');
    await writeFile(file, lfText.replace(/\r?\n/g, '\r\n'));
    const catalog = await loadCatalog(copy.catalogPath);
    await expect(loadInstructions(catalog, copy.dir)).rejects.toMatchObject({ code: 'CATALOG_DIGEST_MISMATCH' });
  });
});

describe('catalogTags', () => {
  test('tag lookup rejects invalid matching from a JavaScript caller', async () => {
    const { catalog } = await fixture();
    expect(() => Reflect.apply(catalogFindTags, undefined, [catalog, ['test'], 'bogus'])).toThrow('tag match must be any or all');
  });

  test('returns sorted canonical tags with sorted aliases', async () => {
    const { catalog } = await fixture();
    expect(catalogTags(catalog)).toEqual({
      capability: [
        { tag: 'acceptance-design', description: 'Define acceptance criteria.', aliases: [] },
        { tag: 'alternate-workflow', description: 'Use an alternate workflow.', aliases: [] },
        { tag: 'disabled-capability', description: 'Disabled capability.', aliases: [] },
        { tag: 'evidence-review', description: 'Review evidence.', aliases: [] },
        { tag: 'test-design', description: 'Design behavior tests.', aliases: [] },
      ],
      pattern: [
        { tag: 'test-after-development', description: 'Test after implementation.', aliases: [] },
        { tag: 'test-first-development', description: 'Write tests first.', aliases: ['tdd', 'test-first'] },
      ],
    });
  });
});

describe('catalogFindTags', () => {
  test('matches Unicode-normalized multi-word queries with ANY and ALL token modes', async () => {
    const { catalog } = await fixture();
    const any = catalogFindTags(catalog, ['test first', 'TEST']);
    const all = catalogFindTags(catalog, ['test first'], 'all');
    expect(any.map(({ dimension, tag }) => `${dimension}:${tag}`)).toEqual([
      'capability:test-design',
      'pattern:test-after-development',
      'pattern:test-first-development',
    ]);
    expect(all.map(({ dimension, tag }) => `${dimension}:${tag}`)).toEqual(['pattern:test-first-development']);
  });

  test('puts exact canonical and declared alias hits first and emits one canonical identity', async () => {
    const { catalog } = await fixture();
    const matches = catalogFindTags(catalog, ['ＴＤＤ', 'tdd', 'test-first', 'implementation']);
    expect(matches.map(({ dimension, tag }) => `${dimension}:${tag}`)).toEqual([
      'pattern:test-first-development',
      'capability:test-design',
      'pattern:test-after-development',
    ]);
    expect(matches.filter(({ dimension, tag }) => dimension === 'pattern' && tag === 'test-first-development')).toHaveLength(1);
    expect(catalogFindTags(catalog, ['test-after-development'])[0]).toEqual({
      dimension: 'pattern', tag: 'test-after-development', description: 'Test after implementation.',
    });
  });

  test('uses literal tokens and deterministic dimension/tag ties without matching pr inside product', async () => {
    const { catalog } = await fixture();
    const expanded: Catalog = {
      ...catalog,
      tag_dictionary: {
        ...catalog.tag_dictionary,
        capability: {
          ...catalog.tag_dictionary.capability,
          'product-review': 'Review product work.',
          'review-code': 'Review code changes.',
        },
        pattern: {
          ...catalog.tag_dictionary.pattern,
          'test-review': 'Review tests.',
        },
      },
    };
    expect(catalogFindTags(expanded, ['pr'])).toEqual([]);
    expect(catalogFindTags(expanded, ['product-review', 'review']).map(({ dimension, tag }) => `${dimension}:${tag}`)).toEqual([
      'capability:product-review',
      'capability:evidence-review',
      'capability:review-code',
      'pattern:test-review',
    ]);
  });
});

describe('catalogSearch', () => {
  test('returns only metadata with exact keys and stable id order', async () => {
    const { catalog, instructions } = await fixture();
    const results = catalogSearch(catalog, instructions, {});
    expect(results.map((item) => item.instruction_id)).toEqual(['alpha', 'beta', 'conflict-mode', 'gamma', 'guidance']);
    expect(Object.keys(results[0] ?? {}).sort()).toEqual(['capability_tags', 'instruction_id', 'pattern_tags', 'revision', 'summary', 'title']);
    expect(JSON.stringify(results[0])).toBe('{"instruction_id":"alpha","title":"Alpha instruction","summary":"Applies to implementation tasks.","capability_tags":["test-design"],"pattern_tags":["test-first-development"],"revision":1}');
    expect(results.some((item) => 'content' in item)).toBe(false);
  });

  test('filters explicit facets with OR within dimensions and AND across dimensions', async () => {
    const { catalog, instructions } = await facetedFixture();
    expect(catalogSearch(catalog, instructions, {}).map((item) => item.instruction_id)).toEqual(['alpha', 'beta', 'conflict-mode', 'gamma', 'guidance']);
    expect(catalogSearch(catalog, instructions, { instruction_forms: ['principle', 'procedure'] }).map((item) => item.instruction_id)).toEqual(['alpha', 'gamma']);
    expect(catalogSearch(catalog, instructions, { domains: ['design-ux', 'operations'] }).map((item) => item.instruction_id)).toEqual(['alpha', 'gamma']);
    expect(catalogSearch(catalog, instructions, {
      instruction_forms: ['procedure'], domains: ['engineering'], classification_statuses: ['classified'], roles: ['engineer'],
    }).map((item) => item.instruction_id)).toEqual(['alpha']);
    expect(catalogSearch(catalog, instructions, { instruction_forms: ['procedure'], domains: ['operations'] })).toEqual([]);
    expect(catalogSearch(catalog, instructions, { classification_statuses: ['unclassified'] }).map((item) => item.instruction_id)).toEqual(['beta', 'guidance']);
    expect(catalogSearch(catalog, instructions, { classification_statuses: ['classified', 'unclassified'] }).map((item) => item.instruction_id)).toEqual(['alpha', 'beta', 'conflict-mode', 'gamma', 'guidance']);
  });

  test('rejects empty, duplicate, unknown, non-string, and non-array facet dimensions', async () => {
    const { catalog, instructions } = await facetedFixture();
    const malformedQueries: unknown[] = [
      { instruction_forms: [] },
      { instruction_forms: ['procedure', 'procedure'] },
      { instruction_forms: ['unknown-form'] },
      { instruction_forms: ['procedure', 7] },
      { domains: 'engineering' },
      { domains: [] },
      { domains: ['engineering', 'engineering'] },
      { domains: ['unknown-domain'] },
      { classification_statuses: [] },
      { classification_statuses: ['unclassified', 'unclassified'] },
      { classification_statuses: ['unknown-status'] },
    ];
    for (const query of malformedQueries) {
      expect(() => Reflect.apply(catalogSearch, undefined, [catalog, instructions, query])).toThrow(expect.objectContaining({ code: 'CATALOG_INVALID' }));
    }
  });

  test('browse returns stable complete groups from listed active instructions only', async () => {
    const { catalog, instructions } = await facetedFixture();
    const expected: CatalogBrowseResult = {
      forms: [
        { value: 'checklist', count: 1, instruction_ids: ['conflict-mode'] },
        { value: 'decision-rule', count: 0, instruction_ids: [] },
        { value: 'principle', count: 1, instruction_ids: ['gamma'] },
        { value: 'procedure', count: 1, instruction_ids: ['alpha'] },
      ],
      domains: [
        { value: 'business', count: 0, instruction_ids: [] },
        { value: 'design-ux', count: 1, instruction_ids: ['alpha'] },
        { value: 'engineering', count: 2, instruction_ids: ['alpha', 'gamma'] },
        { value: 'operations', count: 1, instruction_ids: ['gamma'] },
        { value: 'product', count: 1, instruction_ids: ['conflict-mode'] },
        { value: 'research', count: 0, instruction_ids: [] },
      ],
      unclassified: { count: 2, instruction_ids: ['beta', 'guidance'] },
    };
    expect(catalogBrowse(catalog, instructions)).toEqual(expected);
    const alpha = instructions.get('alpha');
    if (alpha === undefined) throw new Error('fixture alpha missing');
    const withExtra = new Map(instructions);
    withExtra.set('outside-catalog', { ...alpha, instruction_id: 'outside-catalog' });
    expect(catalogBrowse(catalog, withExtra)).toEqual(expected);
    const missing = new Map(instructions);
    missing.delete('alpha');
    expect(() => catalogBrowse(catalog, missing)).toThrow(expect.objectContaining({ code: 'CATALOG_INVALID' }));
    const malformed = new Map(instructions);
    const malformedAlpha = { ...alpha };
    Reflect.set(malformedAlpha, 'classification', { classification_status: 'unclassified', classification_reason: 'invalid', domains: ['engineering'] });
    malformed.set('alpha', malformedAlpha);
    expect(() => catalogBrowse(catalog, malformed)).toThrow(expect.objectContaining({ code: 'CATALOG_INVALID' }));
    Reflect.set(malformedAlpha, 'classification', { classification_status: 'unknown' });
    expect(() => catalogBrowse(catalog, malformed)).toThrow(expect.objectContaining({ code: 'CATALOG_INVALID' }));
  });

  test('filters by capability, pattern alias, and instruction ids with AND across dimensions', async () => {
    const { catalog, instructions } = await fixture();
    expect(catalogSearch(catalog, instructions, { capability_tags: ['test-design'] }).map((item) => item.instruction_id)).toEqual(['alpha']);
    expect(catalogSearch(catalog, instructions, { pattern_tags: ['tdd'] }).map((item) => item.instruction_id)).toEqual(['alpha', 'beta', 'gamma']);
    expect(catalogSearch(catalog, instructions, { capability_tags: ['test-design'], pattern_tags: ['test-after-development'] })).toEqual([]);
    expect(catalogSearch(catalog, instructions, { instruction_ids: ['gamma'] }).map((item) => item.instruction_id)).toEqual(['gamma']);
  });

  test('filters roles and products while treating an empty instruction list as universal', async () => {
    const { catalog, instructions } = await fixture();
    const byRole = catalogSearch(catalog, instructions, { roles: ['engineer'] }).map((item) => item.instruction_id);
    const byProduct = catalogSearch(catalog, instructions, { products: ['vida-powers'] }).map((item) => item.instruction_id);
    expect(byRole).toContain('alpha');
    expect(byProduct).toContain('alpha');
    expect(byRole).not.toContain('beta');
    expect(byProduct).not.toContain('beta');
    expect(catalogSearch(catalog, instructions, { roles: ['qa-engineer'], instruction_ids: ['beta'] })).toHaveLength(1);
    expect(catalogSearch(catalog, instructions, { products: ['agent-runtime'], instruction_ids: ['beta'] })).toHaveLength(1);
  });

  test('matches condition tokens case-insensitively at word boundaries and excludes negative conditions', async () => {
    const { catalog, instructions } = await fixture();
    expect(catalogSearch(catalog, instructions, { instruction_ids: ['alpha'], conditions: ['IMPLEMENTATION'] })).toHaveLength(1);
    expect(catalogSearch(catalog, instructions, { instruction_ids: ['alpha'], conditions: ['mentation'] })).toEqual([]);
    expect(catalogSearch(catalog, instructions, { instruction_ids: ['alpha'], conditions: ['documentation'] })).toEqual([]);
    expect(catalogSearch(catalog, instructions, { instruction_ids: ['alpha'], conditions: ['implementation', 'code'] })).toHaveLength(1);
  });

  test('rejects empty and whitespace-only condition tokens', async () => {
    const { catalog, instructions } = await fixture();
    expect(() => catalogSearch(catalog, instructions, { conditions: [''] })).toThrow(expect.objectContaining({
      code: 'CATALOG_INVALID', message: 'condition token must not be empty', details: { token: '', dimension: 'conditions' },
    }));
    expect(() => catalogSearch(catalog, instructions, { conditions: ['  \t '] })).toThrow(expect.objectContaining({
      code: 'CATALOG_INVALID', message: 'condition token must not be empty', details: { token: '  \t ', dimension: 'conditions' },
    }));
  });

  test('matches punctuation literally', async () => {
    const { catalog, instructions } = await fixture();
    expect(catalogSearch(catalog, instructions, { instruction_ids: ['alpha'], conditions: ['code.'] })).toHaveLength(1);
  });

  test('matches non-ASCII conditions positively and rejects terms found only in exclusions', async () => {
    const { catalog, instructions } = await fixture();
    expect(catalogSearch(catalog, instructions, { instruction_ids: ['alpha'], conditions: ['code'] })).toHaveLength(1);
    expect(catalogSearch(catalog, instructions, { instruction_ids: ['alpha'], conditions: ['documentation'] })).toEqual([]);
  });

  test('rejects unknown query tags before matching and accepts known aliases', async () => {
    const { catalog, instructions } = await fixture();
    expect(() => catalogSearch(catalog, instructions, { capability_tags: ['write-tets-first'] })).toThrow(expect.objectContaining({
      code: 'CATALOG_INVALID', details: { tag: 'write-tets-first', dimension: 'capability' },
    }));
    expect(catalogSearch(catalog, instructions, { pattern_tags: ['tdd'] }).length).toBeGreaterThan(0);
    expect(() => catalogCompose(catalog, instructions, { pattern_tags: ['typo'] })).toThrow(expect.objectContaining({ code: 'CATALOG_INVALID' }));
  });

  test('catalogSearch rejects a non-array query dimension', async () => {
    const { catalog, instructions } = await fixture();
    expect(() => catalogSearch(catalog, instructions, { roles: 'engineer' } as unknown as SearchQuery)).toThrow(expect.objectContaining({
      code: 'CATALOG_INVALID', message: 'query dimension roles must be an array', details: { dimension: 'roles', value: 'engineer' },
    }));
  });

  test('catalogCompose rejects a non-array query dimension', async () => {
    const { catalog, instructions } = await fixture();
    expect(() => catalogCompose(catalog, instructions, { roles: 'engineer' } as unknown as ComposeQuery)).toThrow(expect.objectContaining({
      code: 'CATALOG_INVALID', message: 'query dimension roles must be an array', details: { dimension: 'roles', value: 'engineer' },
    }));
  });

  test('never returns disabled instructions', async () => {
    const { catalog, instructions } = await fixture();
    expect(catalogSearch(catalog, instructions, { instruction_ids: ['disabled-mode'] })).toEqual([]);
  });

  test('profile-aware search filters resolved inactive alternatives without changing metadata', async () => {
    const { catalog, instructions, group, alternatives } = await policyFixture();
    const active = alternatives[0];
    if (active === undefined) throw new Error('active policy alternative missing');
    const profile: EffectiveProfile = {
      schema: 'VPEffectiveProfile/v1',
      groups: { [group]: { active, alternatives } },
      unresolved_groups: {},
    };
    const query = { instruction_ids: ['alpha', 'beta'] };
    const expected = catalogSearch(catalog, instructions, query).filter((item) => item.instruction_id === 'alpha');
    const actual = catalogSearchWithProfile(catalog, instructions, query, profile);
    expect(actual).toEqual(expected);
    expect(Object.keys(actual[0] ?? {}).sort()).toEqual(['capability_tags', 'instruction_id', 'pattern_tags', 'revision', 'summary', 'title']);
  });

  test('profile-aware search requires refresh for stale canonical alternatives', async () => {
    const { catalog, instructions, group, alternatives } = await policyFixture();
    const active = alternatives[0];
    if (active === undefined) throw new Error('active policy alternative missing');
    const profile: EffectiveProfile = {
      schema: 'VPEffectiveProfile/v1',
      groups: { [group]: { active, alternatives: [...alternatives, 'stale-alternative'] } },
      unresolved_groups: {},
    };
    expect(() => catalogSearchWithProfile(catalog, instructions, { instruction_ids: ['alpha'] }, profile)).toThrow(expect.objectContaining({
      code: 'CATALOG_PROFILE_CONFLICT',
      details: expect.objectContaining({ group, profile_refresh_required: true }),
    }));
  });

  test('profile-aware search requires a choice for a matched unresolved alternative', async () => {
    const { catalog, instructions, group, alternatives } = await policyFixture();
    const profile: EffectiveProfile = {
      schema: 'VPEffectiveProfile/v1',
      groups: {},
      unresolved_groups: { [group]: alternatives },
    };
    expect(() => catalogSearchWithProfile(catalog, instructions, { instruction_ids: ['beta'] }, profile)).toThrow(expect.objectContaining({
      code: 'CATALOG_PROFILE_CONFLICT',
      details: expect.objectContaining({ group, resolution_required: true, alternatives }),
    }));
  });
});

describe('fixture integrity', () => {
  test('fixture schemas stay byte-identical to package schemas', async () => {
    const schemaNames = ['vpcatalog.v1.schema.json', 'vpinstruction.v1.schema.json'];
    for (const name of schemaNames) {
      const fixtureBytes = await readFile(new URL(`./fixtures/catalog/config/${name}`, import.meta.url));
      const packageBytes = await readFile(new URL(`../config/${name}`, import.meta.url));
      expect(fixtureBytes.equals(packageBytes)).toBe(true);
    }
  });
});

describe('catalogGet', () => {
  test('returns active instructions and reports unknown or disabled ids', async () => {
    const { catalog, instructions } = await fixture();
    const alpha = catalogGet(catalog, instructions, 'alpha');
    expect(alpha.content).toBe('Alpha body.\n');
    expect(Object.hasOwn(alpha, 'classification')).toBe(false);
    expect(() => catalogGet(catalog, instructions, 'missing')).toThrow(expect.objectContaining({ code: 'CATALOG_ID_UNKNOWN' }));
    expect(() => catalogGet(catalog, instructions, 'disabled-mode')).toThrow(expect.objectContaining({ code: 'CATALOG_INSTRUCTION_DISABLED' }));
  });
});

describe('catalogCompose', () => {
  const emptyDimensions: [string, ComposeQuery][] = [
    ['capability_tags', { capability_tags: [] }],
    ['pattern_tags', { pattern_tags: [] }],
    ['instruction_ids', { instruction_ids: [] }],
    ['roles', { roles: [] }],
    ['products', { products: [] }],
    ['conditions', { conditions: [] }],
  ];

  for (const [dimension, query] of emptyDimensions) {
    test(`empty ${dimension} behaves like an absent dimension`, async () => {
      const { catalog, instructions } = await fixture();
      const baseline = catalogCompose(catalog, instructions, { required_ids: ['guidance'] });
      expect(catalogCompose(catalog, instructions, { required_ids: ['guidance'], ...query })).toEqual(baseline);
    });
  }

  test('empty selection arrays do not match the whole corpus or raise excludes conflicts', async () => {
    const { catalog, instructions } = await fixture();
    expect(catalogCompose(catalog, instructions, { capability_tags: [] }).instructions).toEqual([]);
  });

  test('includes required ids and transitive dependencies in stable order', async () => {
    const { catalog, instructions } = await fixture();
    const result = catalogCompose(catalog, instructions, { required_ids: ['guidance'], capability_tags: ['test-design'], role: 'engineer' });
    expect(result.instructions.map((item) => [item.instruction_id, item.selection_reason])).toEqual([
      ['alpha', 'matched'], ['beta', 'dependency'], ['gamma', 'dependency'], ['guidance', 'required'],
    ]);
    expect(result.role).toBe('engineer');
  });

  test('facet matches add required dependencies without filtering the closure', async () => {
    const { catalog, instructions } = await facetedFixture();
    const result = catalogCompose(catalog, instructions, { instruction_forms: ['procedure'] });
    expect(result.instructions.map((item) => [item.instruction_id, item.selection_reason])).toEqual([
      ['alpha', 'matched'], ['beta', 'dependency'], ['gamma', 'dependency'],
    ]);
    expect(result.instructions.every((item) => !Object.hasOwn(item, 'classification'))).toBe(true);
  });

  test('keeps required reason when an instruction also matches query tags', async () => {
    const { catalog, instructions } = await fixture();
    const result = catalogCompose(catalog, instructions, { required_ids: ['alpha'], capability_tags: ['test-design'] });
    expect(result.instructions.find((item) => item.instruction_id === 'alpha')?.selection_reason).toBe('required');
  });

  test('terminates cyclic dependencies with stable selection reasons', async () => {
    const { catalog, instructions } = await fixture();
    const alpha = instructions.get('alpha');
    const beta = instructions.get('beta');
    if (alpha === undefined || beta === undefined) throw new Error('cycle fixture instructions missing');
    const cyclicInstructions = new Map(instructions);
    cyclicInstructions.set('cycle-a', { ...alpha, instruction_id: 'cycle-a', compatibility: { excludes: [], requires: ['cycle-b'] } });
    cyclicInstructions.set('cycle-b', { ...beta, instruction_id: 'cycle-b', compatibility: { excludes: [], requires: ['cycle-a'] } });
    const result = catalogCompose(catalog, cyclicInstructions, { required_ids: ['cycle-a'] });
    expect(result.instructions.map((item) => [item.instruction_id, item.selection_reason])).toEqual([
      ['cycle-a', 'required'], ['cycle-b', 'dependency'],
    ]);
  });

  test('required-only compose returns only required ids and transitive dependencies', async () => {
    const { catalog, instructions } = await fixture();
    const required = catalogCompose(catalog, instructions, { required_ids: ['alpha'] });
    expect(required.instructions.map((item) => item.instruction_id)).toEqual(['alpha', 'beta', 'gamma']);
  });

  test('empty compose query returns an empty bundle', async () => {
    const { catalog, instructions } = await fixture();
    expect(catalogCompose(catalog, instructions, {}).instructions).toEqual([]);
  });

  test('includes matched instructions and all execution context, with empty defaults', async () => {
    const { catalog, instructions } = await fixture();
    expect(catalogCompose(catalog, instructions, {
      capability_tags: ['test-design'], role: 'engineer', task_contract: 'contract', effective_methodology: 'tdd',
      work_scope: 'source', materialization_requirements: ['file'], artifact_references: ['artifact.md'],
    })).toMatchObject({
      role: 'engineer', task_contract: 'contract', effective_methodology: 'tdd', work_scope: 'source',
      materialization_requirements: ['file'], artifact_references: ['artifact.md'],
    });
    const defaults = catalogCompose(catalog, instructions, { profile: { schema: 'VPEffectiveProfile/v1', groups: {
      'testing-sequence': { active: 'test-first-development', alternatives: ['test-first-development'] },
    }, unresolved_groups: {} } });
    expect(defaults).toMatchObject({
      role: '', task_contract: '', effective_methodology: '', work_scope: '', materialization_requirements: [], artifact_references: [],
    });
  });

  test('reports unknown required ids and unknown or disabled dependencies', async () => {
    const { catalog, instructions } = await fixture();
    expect(() => catalogCompose(catalog, instructions, { required_ids: ['missing'] })).toThrow(expect.objectContaining({ code: 'CATALOG_ID_UNKNOWN' }));
    const alpha = instructions.get('alpha');
    if (alpha === undefined) throw new Error('fixture alpha missing');
    const unknownDeps = new Map(instructions);
    unknownDeps.set('alpha', { ...alpha, compatibility: { ...alpha.compatibility, requires: ['missing'] } });
    expect(() => catalogCompose(catalog, unknownDeps, { required_ids: ['alpha'] })).toThrow(expect.objectContaining({ code: 'CATALOG_DEPENDENCY_MISSING' }));
    const disabledDeps = new Map(instructions);
    const beta = instructions.get('beta');
    if (beta === undefined) throw new Error('fixture beta missing');
    disabledDeps.set('beta', { ...beta, status: 'disabled' });
    expect(() => catalogCompose(catalog, disabledDeps, { required_ids: ['alpha'] })).toThrow(expect.objectContaining({ code: 'CATALOG_DEPENDENCY_DISABLED' }));
    expect(() => catalogCompose(catalog, instructions, { required_ids: ['disabled-mode'] })).toThrow(expect.objectContaining({
      code: 'CATALOG_INSTRUCTION_DISABLED', message: 'instruction is disabled: disabled-mode',
    }));
  });

  test('reports an inactive dependency instead of dropping it', async () => {
    const scenario = await approvalDependencyFixture(false);
    expect(() => catalogCompose(scenario.catalog, scenario.instructions, { required_ids: [scenario.rootId], profile: scenario.profile })).toThrow(expect.objectContaining({
      code: 'CATALOG_PROFILE_CONFLICT', details: expect.objectContaining({ group: scenario.group, active: scenario.activeTag, dependency_id: scenario.inactiveDependencyId, requiring_instruction_id: scenario.rootId }),
    }));
  });

  test('uses the declared active-policy instruction mapping when tag carriers are ambiguous', async () => {
    const scenario = await approvalDependencyFixture(true);
    expect(validateAgainstSchema(scenario.profile, await readEffectiveProfileSchema())).toEqual([]);
    const result = catalogCompose(scenario.catalog, scenario.instructions, { required_ids: [scenario.rootId], profile: scenario.profile });
    const expectedIds = [scenario.rootId, ...scenario.activeInstructionIds].sort();
    expect(result.instructions.map((item) => item.instruction_id)).toEqual(expectedIds);
    expect(result.instructions.map((item) => item.selection_reason)).toEqual(expectedIds.map((id) => id === scenario.rootId ? 'required' : 'dependency'));
    expect(result.instructions.some((item) => item.instruction_id.startsWith('unmapped-carrier-'))).toBe(false);
  });

  test('keeps the profile-conflict error when mapped active instructions are unavailable', async () => {
    const scenario = await approvalDependencyFixture(false);
    expect(() => catalogCompose(scenario.catalog, scenario.instructions, { required_ids: [scenario.rootId], profile: scenario.profile })).toThrow(expect.objectContaining({
      code: 'CATALOG_PROFILE_CONFLICT',
      message: 'active profile pattern ' + scenario.activeTag + ' has no instruction in ' + scenario.group,
      details: {
        group: scenario.group,
        active: scenario.activeTag,
        dependency_id: scenario.inactiveDependencyId,
        requiring_instruction_id: scenario.rootId,
      },
    }));
  });

  test.each(['disabled', 'untagged'])('rejects a mapped active-policy instruction that is %s', async condition => {
    const scenario = await approvalDependencyFixture(true);
    const id = scenario.activeInstructionIds[0];
    const mapped = id === undefined ? undefined : scenario.instructions.get(id);
    if (id === undefined || mapped === undefined) throw new Error('Missing mapped active instruction');
    scenario.instructions.set(id, condition === 'disabled'
      ? { ...mapped, status: 'disabled' }
      : { ...mapped, pattern_tags: [] });
    expect(() => catalogCompose(scenario.catalog, scenario.instructions, { required_ids: [scenario.rootId], profile: scenario.profile }))
      .toThrow(expect.objectContaining({ code: 'CATALOG_PROFILE_CONFLICT' }));
  });

  test('rejects fabricated unresolved groups before dependency substitution', async () => {
    const scenario = await approvalDependencyFixture(true);
    const activeId = scenario.activeInstructionIds[0];
    if (activeId === undefined) throw new Error('active approval-policy mapping is missing');
    const active = scenario.instructions.get(activeId);
    if (active === undefined) throw new Error('mapped active instruction is missing');
    scenario.instructions.set(activeId, { ...active, pattern_tags: [...active.pattern_tags, 'secondary-policy-choice'] });
    const profile: EffectiveProfile = {
      ...scenario.profile,
      unresolved_groups: { 'secondary-policy': ['secondary-policy-choice'] },
    };
    expect(() => catalogCompose(scenario.catalog, scenario.instructions, { required_ids: [scenario.rootId], profile })).toThrow(expect.objectContaining({
      code: 'CATALOG_PROFILE_CONFLICT',
      details: expect.objectContaining({ group: 'secondary-policy', profile_refresh_required: true }),
    }));
  });

  test('does not compose either unresolved approval-policy alternative and returns a negotiation error', async () => {
    const { catalog, instructions } = await fixture();
    const beta = instructions.get('beta');
    const gamma = instructions.get('gamma');
    if (beta === undefined || gamma === undefined) throw new Error('approval-policy fixture instructions missing');
    const alternatives = new Map(instructions);
    alternatives.set('beta', { ...beta, pattern_tags: ['approval-policy-choice-gate'] });
    alternatives.set('gamma', { ...gamma, pattern_tags: ['approval-policy-choice-proceed'] });
    const profile = {
      schema: 'VPEffectiveProfile/v1' as const,
      groups: {},
      unresolved_groups: { 'approval-policy': ['approval-policy-choice-proceed', 'approval-policy-choice-gate'] },
    };
    for (const query of [
      { instruction_ids: ['beta', 'gamma'], profile },
      { required_ids: ['beta', 'gamma'], profile },
    ]) {
      let bundle: unknown;
      let error: unknown;
      try {
        bundle = catalogCompose(catalog, alternatives, query);
      } catch (caught) {
        error = caught;
      }
      expect(error).toMatchObject({
        code: 'CATALOG_PROFILE_CONFLICT',
        details: { group: 'approval-policy', resolution_required: true, alternatives: ['approval-policy-choice-proceed', 'approval-policy-choice-gate'] },
      });
      expect(bundle).toBeUndefined();
    }
  });

  test('rejects unresolved groups without alternatives', async () => {
    const { catalog, instructions } = await fixture();
    expect(() => catalogCompose(catalog, instructions, {
      required_ids: ['beta'],
      profile: {
        schema: 'VPEffectiveProfile/v1',
        groups: {},
        unresolved_groups: { 'approval-policy': [] },
      },
    })).toThrow(expect.objectContaining({
      code: 'CATALOG_PROFILE_CONFLICT',
      details: { group: 'approval-policy' },
    }));
  });

  test('negotiates when an unresolved policy alternative is required by a dependency', async () => {
    const { catalog, instructions } = await fixture();
    const alpha = instructions.get('alpha');
    const beta = instructions.get('beta');
    if (alpha === undefined || beta === undefined) throw new Error('dependency fixture instructions missing');
    const dependent = new Map(instructions);
    dependent.set('alpha', { ...alpha, compatibility: { excludes: [], requires: ['beta'] } });
    dependent.set('beta', { ...beta, pattern_tags: ['approval-policy-choice-gate'] });
    const profile = {
      schema: 'VPEffectiveProfile/v1' as const,
      groups: {},
      unresolved_groups: { 'approval-policy': ['approval-policy-choice-proceed', 'approval-policy-choice-gate'] },
    };
    expect(() => catalogCompose(catalog, dependent, { required_ids: ['alpha'], profile })).toThrow(expect.objectContaining({
      code: 'CATALOG_PROFILE_CONFLICT',
      details: {
        group: 'approval-policy',
        resolution_required: true,
        alternatives: ['approval-policy-choice-proceed', 'approval-policy-choice-gate'],
        dependency_id: 'beta',
        requiring_instruction_id: 'alpha',
      },
    }));
  });

  test('requires unresolved-group state on supplied effective profiles', async () => {
    const { catalog, instructions } = await fixture();
    expect(() => catalogCompose(catalog, instructions, {
      required_ids: ['beta'],
      profile: { schema: 'VPEffectiveProfile/v1', groups: {} },
    })).toThrow(expect.objectContaining({
      code: 'CATALOG_PROFILE_CONFLICT',
      details: expect.objectContaining({ resolution_required: true, profile_refresh_required: true }),
    }));
  });

  test('rejects schema-valid resolved alternative subsets against the canonical source before composing', async () => {
    const { catalog, instructions } = await fixture();
    const methodology = await readCanonicalMethodologyProfile();
    const group = methodology.groups.find((item) => item.id === 'approval-policy');
    if (group === undefined || group.alternatives.length < 2) throw new Error('canonical approval-policy alternatives are missing');
    const active = group.alternatives[0];
    const omitted = group.alternatives[1];
    const beta = instructions.get('beta');
    if (active === undefined || omitted === undefined || beta === undefined) throw new Error('canonical policy fixture is incomplete');
    const profile = {
      schema: 'VPEffectiveProfile/v1' as const,
      groups: { [group.id]: { active: active.id, alternatives: [active.id] } },
      unresolved_groups: {},
    };
    expect(validateAgainstSchema(profile, await readEffectiveProfileSchema())).toEqual([]);
    const policyInstructions = new Map(instructions);
    policyInstructions.set('beta', { ...beta, pattern_tags: [omitted.id] });
    expect(() => catalogCompose(catalog, policyInstructions, { required_ids: ['beta'], profile })).toThrow(expect.objectContaining({
      code: 'CATALOG_PROFILE_CONFLICT',
      details: expect.objectContaining({
        group: group.id,
        expected_alternatives: group.alternatives.map((item) => item.id),
        actual_alternatives: [active.id],
        profile_refresh_required: true,
      }),
    }));
  });

  test('rejects schema-valid unresolved alternative subsets before resolving dependency closure', async () => {
    const { catalog, instructions } = await fixture();
    const methodology = await readCanonicalMethodologyProfile();
    const group = methodology.groups.find((item) => item.id === 'approval-policy');
    if (group === undefined || group.alternatives.length < 2) throw new Error('canonical approval-policy alternatives are missing');
    const active = group.alternatives[0];
    const omitted = group.alternatives[1];
    const alpha = instructions.get('alpha');
    const beta = instructions.get('beta');
    if (active === undefined || omitted === undefined || alpha === undefined || beta === undefined) throw new Error('canonical policy dependency fixture is incomplete');
    const profile = {
      schema: 'VPEffectiveProfile/v1' as const,
      groups: {},
      unresolved_groups: { [group.id]: [active.id] },
    };
    expect(validateAgainstSchema(profile, await readEffectiveProfileSchema())).toEqual([]);
    const dependent = new Map(instructions);
    dependent.set('alpha', { ...alpha, pattern_tags: [], compatibility: { excludes: [], requires: ['beta'] } });
    dependent.set('beta', { ...beta, pattern_tags: [omitted.id] });
    expect(() => catalogCompose(catalog, dependent, { required_ids: ['alpha'], profile })).toThrow(expect.objectContaining({
      code: 'CATALOG_PROFILE_CONFLICT',
      details: expect.objectContaining({
        group: group.id,
        expected_alternatives: group.alternatives.map((item) => item.id),
        actual_alternatives: [active.id],
        profile_refresh_required: true,
      }),
    }));
  });

  test('rejects schema-valid unknown alternatives in resolved and unresolved canonical groups', async () => {
    const { catalog, instructions } = await fixture();
    const methodology = await readCanonicalMethodologyProfile();
    const group = methodology.groups.find((item) => item.id === 'approval-policy');
    if (group === undefined || group.alternatives.length < 2) throw new Error('canonical approval-policy alternatives are missing');
    const active = group.alternatives[0];
    const beta = instructions.get('beta');
    if (active === undefined || beta === undefined) throw new Error('canonical policy fixture is incomplete');
    const canonicalAlternatives = group.alternatives.map((item) => item.id);
    const unknown = 'unknown-policy-alternative';
    const resolved = {
      schema: 'VPEffectiveProfile/v1' as const,
      groups: { [group.id]: { active: active.id, alternatives: [...canonicalAlternatives, unknown] } },
      unresolved_groups: {},
    };
    const unresolved = {
      schema: 'VPEffectiveProfile/v1' as const,
      groups: {},
      unresolved_groups: { [group.id]: [...canonicalAlternatives, unknown] },
    };
    const schema = await readEffectiveProfileSchema();
    expect(validateAgainstSchema(resolved, schema)).toEqual([]);
    expect(validateAgainstSchema(unresolved, schema)).toEqual([]);
    const policyInstructions = new Map(instructions);
    policyInstructions.set('beta', { ...beta, pattern_tags: [canonicalAlternatives[1] ?? ''] });
    for (const profile of [resolved, unresolved]) {
      expect(() => catalogCompose(catalog, policyInstructions, { required_ids: ['beta'], profile })).toThrow(expect.objectContaining({
        code: 'CATALOG_PROFILE_CONFLICT',
        details: expect.objectContaining({
          group: group.id,
          expected_alternatives: canonicalAlternatives,
          actual_alternatives: [...canonicalAlternatives, unknown],
          profile_refresh_required: true,
        }),
      }));
    }
  });

  test('validates profile alternatives from canonical source groups beyond approval policy', async () => {
    const { catalog, instructions } = await fixture();
    const methodology = await readCanonicalMethodologyProfile();
    const group = methodology.groups.find((item) => item.id === 'testing-sequence');
    const active = group?.alternatives[0];
    if (group === undefined || active === undefined) throw new Error('canonical testing-sequence group is missing');
    const unknown = 'stale-testing-alternative';
    const profiles = [
      {
        schema: 'VPEffectiveProfile/v1' as const,
        groups: { [group.id]: { active: active.id, alternatives: [active.id, unknown] } },
        unresolved_groups: {},
      },
      {
        schema: 'VPEffectiveProfile/v1' as const,
        groups: {},
        unresolved_groups: { [group.id]: [active.id, unknown] },
      },
    ];
    const schema = await readEffectiveProfileSchema();
    for (const profile of profiles) {
      expect(validateAgainstSchema(profile, schema)).toEqual([]);
      expect(() => catalogCompose(catalog, instructions, { required_ids: ['alpha'], profile })).toThrow(expect.objectContaining({
        code: 'CATALOG_PROFILE_CONFLICT',
        details: expect.objectContaining({
          group: group.id,
          expected_alternatives: [active.id],
          actual_alternatives: [active.id, unknown],
          profile_refresh_required: true,
        }),
      }));
    }
  });

  test('refreshes a supplied profile missing a selected canonical user-decision group', async () => {
    const { catalog, instructions } = await fixture();
    const methodology = await readCanonicalMethodologyProfile();
    const group = methodology.groups.find((item) => item.id === 'approval-policy');
    const alternative = group?.alternatives[0];
    const beta = instructions.get('beta');
    if (group === undefined || alternative === undefined || beta === undefined) throw new Error('canonical approval-policy fixture is incomplete');
    const profile = { schema: 'VPEffectiveProfile/v1' as const, groups: {}, unresolved_groups: {} };
    expect(validateAgainstSchema(profile, await readEffectiveProfileSchema())).toEqual([]);
    const policyInstructions = new Map(instructions);
    policyInstructions.set('beta', { ...beta, pattern_tags: [alternative.id] });
    expect(() => catalogCompose(catalog, policyInstructions, { required_ids: ['beta'], profile })).toThrow(expect.objectContaining({
      code: 'CATALOG_PROFILE_CONFLICT',
      details: expect.objectContaining({
        group: group.id,
        expected_alternatives: group.alternatives.map((item) => item.id),
        actual_alternatives: [],
        profile_refresh_required: true,
      }),
    }));
  });

  test('does not treat an unrelated unresolved group as resolving a selected decision group', async () => {
    const { catalog, instructions } = await fixture();
    const methodology = await readCanonicalMethodologyProfile();
    const policyGroup = methodology.groups.find((item) => item.id === 'approval-policy');
    const unrelatedGroup = methodology.groups.find((item) => item.id === 'testing-sequence');
    const policyAlternative = policyGroup?.alternatives[0];
    const beta = instructions.get('beta');
    if (policyGroup === undefined || unrelatedGroup === undefined || policyAlternative === undefined || beta === undefined) {
      throw new Error('canonical policy fixture is incomplete');
    }
    const profile = {
      schema: 'VPEffectiveProfile/v1' as const,
      groups: {},
      unresolved_groups: { [unrelatedGroup.id]: unrelatedGroup.alternatives.map((item) => item.id) },
    };
    expect(validateAgainstSchema(profile, await readEffectiveProfileSchema())).toEqual([]);
    const policyInstructions = new Map(instructions);
    policyInstructions.set('beta', {
      ...beta,
      pattern_tags: [policyAlternative.id],
      compatibility: { excludes: [], requires: [] },
    });

    expect(() => catalogCompose(catalog, policyInstructions, { required_ids: ['beta'], profile })).toThrow(expect.objectContaining({
      code: 'CATALOG_PROFILE_CONFLICT',
      details: expect.objectContaining({
        group: policyGroup.id,
        expected_alternatives: policyGroup.alternatives.map((item) => item.id),
        actual_alternatives: [],
        profile_refresh_required: true,
      }),
    }));
  });

  test('rejects policy alternatives selected without a profile while preserving unrelated diagnostics', async () => {
    const { catalog, instructions } = await fixture();
    const methodology = await readCanonicalMethodologyProfile();
    const group = methodology.groups.find((item) => item.id === 'approval-policy');
    const first = group?.alternatives[0];
    const second = group?.alternatives[1];
    const alpha = instructions.get('alpha');
    const beta = instructions.get('beta');
    if (group === undefined || first === undefined || second === undefined || alpha === undefined || beta === undefined) throw new Error('canonical policy fixture is incomplete');
    const conflicting = new Map(instructions);
    conflicting.set('alpha', { ...alpha, pattern_tags: [first.id], compatibility: { excludes: [], requires: [] } });
    conflicting.set('beta', { ...beta, pattern_tags: [second.id], compatibility: { excludes: [], requires: [] } });
    expect(() => catalogCompose(catalog, conflicting, { required_ids: ['alpha', 'beta'] })).toThrow(expect.objectContaining({
      code: 'CATALOG_PROFILE_CONFLICT',
      details: expect.objectContaining({
        group: group.id,
        alternatives: [first.id, second.id],
        resolution_required: true,
        profile_refresh_required: true,
      }),
    }));
    const dependent = new Map(conflicting);
    dependent.set('alpha', { ...alpha, pattern_tags: [first.id], compatibility: { excludes: [], requires: ['beta'] } });
    expect(() => catalogCompose(catalog, dependent, { required_ids: ['alpha'] })).toThrow(expect.objectContaining({
      code: 'CATALOG_PROFILE_CONFLICT',
      details: expect.objectContaining({ group: group.id, alternatives: [first.id, second.id], resolution_required: true }),
    }));
    expect(catalogCompose(catalog, instructions, { required_ids: ['gamma'] }).instructions.map((item) => item.instruction_id)).toEqual(['gamma']);
  });

  test('accepts exactly 20 selected instructions', async () => {
    const { catalog, instructions } = await fixture();
    const seed = instructions.get('alpha');
    if (seed === undefined) throw new Error('fixture alpha missing');
    const selected = syntheticInstructions(seed, 20, 'x');
    expect(catalogCompose(catalog, selected.instructions, { required_ids: selected.ids }).instructions).toHaveLength(20);
  });

  test('rejects 21 selected instructions without returning a partial bundle', async () => {
    const { catalog, instructions } = await fixture();
    const seed = instructions.get('alpha');
    if (seed === undefined) throw new Error('fixture alpha missing');
    const selected = syntheticInstructions(seed, 21, 'x');
    expect(() => catalogCompose(catalog, selected.instructions, { required_ids: selected.ids })).toThrow(expect.objectContaining({
      code: 'CATALOG_BUNDLE_LIMIT_EXCEEDED', details: expect.objectContaining({ instruction_count: 21, max_instructions: 20 }),
    }));
  });

  test('facet selectors do not bypass the required-instruction count limit', async () => {
    const { catalog, instructions } = await fixture();
    const seed = instructions.get('alpha');
    if (seed === undefined) throw new Error('fixture alpha missing');
    const selected = syntheticInstructions(seed, 21, 'x');
    expect(() => catalogCompose(catalog, selected.instructions, {
      required_ids: selected.ids,
      instruction_forms: ['procedure'],
    })).toThrow(expect.objectContaining({
      code: 'CATALOG_BUNDLE_LIMIT_EXCEEDED',
      details: expect.objectContaining({ instruction_count: 21, max_instructions: 20 }),
    }));
  });

  test('accepts exactly 64,000 UTF-8 bytes of instruction content', async () => {
    const { catalog, instructions } = await fixture();
    const seed = instructions.get('alpha');
    if (seed === undefined) throw new Error('fixture alpha missing');
    const body = 'x'.repeat(64_000);
    const selected = syntheticInstructions(seed, 1, body);
    expect(catalogCompose(catalog, selected.instructions, { required_ids: selected.ids }).instructions[0]?.content).toBe(body);
  });

  test('rejects 64,001 UTF-8 bytes of instruction content', async () => {
    const { catalog, instructions } = await fixture();
    const seed = instructions.get('alpha');
    if (seed === undefined) throw new Error('fixture alpha missing');
    const selected = syntheticInstructions(seed, 1, 'x'.repeat(64_001));
    expect(() => catalogCompose(catalog, selected.instructions, { required_ids: selected.ids })).toThrow(expect.objectContaining({
      code: 'CATALOG_BUNDLE_LIMIT_EXCEEDED', details: expect.objectContaining({ instruction_count: 1, instruction_text_bytes: 64_001 }),
    }));
  });

  test('counts multibyte UTF-8 content bytes at the exact limit', async () => {
    const { catalog, instructions } = await fixture();
    const seed = instructions.get('alpha');
    if (seed === undefined) throw new Error('fixture alpha missing');
    const body = 'é'.repeat(32_000);
    const selected = syntheticInstructions(seed, 1, body);
    expect(body.length).toBe(32_000);
    expect(catalogCompose(catalog, selected.instructions, { required_ids: selected.ids }).instructions[0]?.content).toBe(body);
  });

  test('rejects 64,002 UTF-8 bytes from 32,001 multibyte characters', async () => {
    const { catalog, instructions } = await fixture();
    const seed = instructions.get('alpha');
    if (seed === undefined) throw new Error('fixture alpha missing');
    const body = 'é'.repeat(32_001);
    const selected = syntheticInstructions(seed, 1, body);
    expect(() => catalogCompose(catalog, selected.instructions, { required_ids: selected.ids })).toThrow(expect.objectContaining({
      code: 'CATALOG_BUNDLE_LIMIT_EXCEEDED',
      details: expect.objectContaining({ instruction_count: 1, instruction_text_bytes: 64_002, max_instruction_text_bytes: 64_000 }),
    }));
  });

  test('aggregates instruction content bytes at the exact and over-limit boundaries', async () => {
    const { catalog, instructions } = await fixture();
    const seed = instructions.get('alpha');
    if (seed === undefined) throw new Error('fixture alpha missing');
    const selected = syntheticInstructions(seed, 2, '');
    const first = selected.instructions.get('budget-1');
    const second = selected.instructions.get('budget-2');
    if (first === undefined || second === undefined) throw new Error('aggregate fixture instructions missing');
    selected.instructions.set('budget-1', { ...first, content: 'é'.repeat(16_000) });
    selected.instructions.set('budget-2', { ...second, content: 'é'.repeat(16_000) });
    expect(catalogCompose(catalog, selected.instructions, { required_ids: selected.ids }).instructions).toHaveLength(2);

    selected.instructions.set('budget-2', { ...second, content: `${'é'.repeat(16_000)}x` });
    expect(() => catalogCompose(catalog, selected.instructions, { required_ids: selected.ids })).toThrow(expect.objectContaining({
      code: 'CATALOG_BUNDLE_LIMIT_EXCEEDED',
      details: expect.objectContaining({ instruction_count: 2, instruction_text_bytes: 64_001, max_instruction_text_bytes: 64_000 }),
    }));
  });

  test('does not count the full tag dictionary as instruction text', async () => {
    const { catalog, instructions } = await fixture();
    const seed = instructions.get('alpha');
    if (seed === undefined) throw new Error('fixture alpha missing');
    const selected = syntheticInstructions(seed, 1, 'small instruction body');
    const wideCatalog: Catalog = {
      ...catalog,
      tag_dictionary: {
        ...catalog.tag_dictionary,
        capability: { ...catalog.tag_dictionary.capability, 'large-description': 'x'.repeat(64_001) },
      },
    };
    const bundle = catalogCompose(wideCatalog, selected.instructions, { required_ids: selected.ids });
    expect(bundle.tag_dictionary.capability['large-description']).toHaveLength(64_001);
  });

  test('rejects overflow caused by mandatory dependencies instead of trimming them', async () => {
    const { catalog, instructions } = await fixture();
    const seed = instructions.get('alpha');
    if (seed === undefined) throw new Error('fixture alpha missing');
    const selected = syntheticInstructions(seed, 21, 'x', (index, ids) => index === 0 ? ids.slice(1) : []);
    const rootId = selected.ids[0];
    if (rootId === undefined) throw new Error('synthetic dependency root missing');
    expect(() => catalogCompose(catalog, selected.instructions, { required_ids: [rootId] })).toThrow(expect.objectContaining({
      code: 'CATALOG_BUNDLE_LIMIT_EXCEEDED', details: expect.objectContaining({ instruction_count: 21 }),
    }));
  });

  test('rejects overflow caused by transitive dependencies instead of trimming them', async () => {
    const { catalog, instructions } = await fixture();
    const seed = instructions.get('alpha');
    if (seed === undefined) throw new Error('fixture alpha missing');
    const selected = syntheticInstructions(seed, 21, 'x', (index, ids) => {
      const next = ids[index + 1];
      return next === undefined ? [] : [next];
    });
    const rootId = selected.ids[0];
    if (rootId === undefined) throw new Error('synthetic dependency root missing');
    expect(() => catalogCompose(catalog, selected.instructions, { required_ids: [rootId] })).toThrow(expect.objectContaining({
      code: 'CATALOG_BUNDLE_LIMIT_EXCEEDED', details: expect.objectContaining({ instruction_count: 21 }),
    }));
  });

  test('drops an inactive matched parent before collecting its dependencies', async () => {
    const { catalog, instructions, group, alternatives } = await policyFixture();
    const [activeTag, inactiveTag] = alternatives;
    if (!activeTag || !inactiveTag) throw new Error('Missing alternatives');
    const profile = { schema: 'VPEffectiveProfile/v1' as const, groups: {
      [group]: { active: activeTag, alternatives },
    }, unresolved_groups: {} };
    const alpha = instructions.get('alpha');
    if (alpha === undefined) throw new Error('fixture alpha missing');
    const inactiveParent = new Map(instructions);
    inactiveParent.set('alpha', { ...alpha, pattern_tags: [inactiveTag] });
    expect(catalogCompose(catalog, inactiveParent, { capability_tags: ['test-design'], profile }).instructions).toEqual([]);
    expect(() => catalogCompose(catalog, inactiveParent, { required_ids: ['alpha'], profile })).toThrow(expect.objectContaining({ code: 'CATALOG_PROFILE_CONFLICT' }));
  });

  test('detects excludes conflicts and names both ids', async () => {
    const { catalog, instructions } = await fixture();
    try {
      catalogCompose(catalog, instructions, { capability_tags: ['test-design', 'alternate-workflow'] });
      throw new Error('expected excludes conflict');
    } catch (error) {
      expect(error).toBeInstanceOf(CatalogError);
      expect(error).toMatchObject({ code: 'CATALOG_REQUIRED_CONFLICT', details: { instruction_ids: ['alpha', 'conflict-mode'] } });
      expect((error as Error).message).toContain('alpha');
      expect((error as Error).message).toContain('conflict-mode');
    }
  });

  test('profile drops inactive alternatives and rejects a required inactive instruction', async () => {
    const { catalog, instructions, group, alternatives } = await policyFixture();
    const [activeTag, inactiveTag] = alternatives;
    if (!activeTag || !inactiveTag) throw new Error('Missing alternatives');
    const profile = { schema: 'VPEffectiveProfile/v1' as const, groups: {
      [group]: { active: activeTag, alternatives },
    }, unresolved_groups: {} };
    const conflict = instructions.get('conflict-mode');
    if (!conflict) throw new Error('Missing conflict');
    instructions.set('conflict-mode', { ...conflict, pattern_tags: [inactiveTag] });
    const filtered = catalogCompose(catalog, instructions, { capability_tags: ['alternate-workflow'], profile });
    expect(filtered.instructions.map((item) => item.instruction_id)).toEqual([]);
    expect(() => catalogCompose(catalog, instructions, { required_ids: ['conflict-mode'], profile })).toThrow(expect.objectContaining({ code: 'CATALOG_PROFILE_CONFLICT' }));
    expect(() => catalogCompose(catalog, instructions, { profile: { ...profile, groups: { testing: { active: 'unknown', alternatives: [activeTag] } } } })).toThrow(expect.objectContaining({ code: 'CATALOG_PROFILE_CONFLICT' }));
    expect(() => catalogCompose(catalog, instructions, {
      capability_tags: ['no-match'], profile: { ...profile, groups: { testing: { active: 'unknown', alternatives: [activeTag] } } },
    })).toThrow(expect.objectContaining({ code: 'CATALOG_PROFILE_CONFLICT' }));
  });

  test('profile preserves an active required instruction and still checks excludes', async () => {
    const { catalog, instructions, group, alternatives } = await policyFixture();
    const [activeTag, inactiveTag] = alternatives;
    if (!activeTag || !inactiveTag) throw new Error('Missing alternatives');
    const profile = { schema: 'VPEffectiveProfile/v1' as const, groups: {
      [group]: { active: activeTag, alternatives },
    }, unresolved_groups: {} };
    const conflict = instructions.get('conflict-mode');
    if (!conflict) throw new Error('Missing conflict');
    instructions.set('conflict-mode', { ...conflict, pattern_tags: [inactiveTag] });
    const beta = instructions.get('beta');
    if (!beta) throw new Error('Missing beta');
    instructions.set('beta', { ...beta, pattern_tags: [] });
    const active = catalogCompose(catalog, instructions, { required_ids: ['alpha'], capability_tags: ['test-design'], profile });
    expect(active.instructions.map((item) => item.instruction_id)).toEqual(['alpha', 'beta', 'gamma']);
    const original = await fixture();
    expect(() => catalogCompose(original.catalog, original.instructions, {
      capability_tags: ['test-design', 'alternate-workflow'],
    })).toThrow(expect.objectContaining({ code: 'CATALOG_REQUIRED_CONFLICT' }));
  });
});

test('the context-degradation pair is one user-decision group, not a bare exclusion', async () => {
  const canonical = await readCanonicalMethodologyProfile();
  const group = canonical.groups.find((item) => item.id === 'context-degradation-policy');
  expect(group).toEqual({
    id: 'context-degradation-policy',
    title: expect.any(String),
    description: expect.any(String),
    user_decision: true,
    alternatives: [
      {
        id: 'context-degradation-signals',
        title: expect.any(String),
        description: expect.any(String),
        instruction_ids: ['adjust-the-behaviour-to-the-context-degradation-signals'],
      },
      {
        id: 'context-degradation-measured',
        title: expect.any(String),
        description: expect.any(String),
        instruction_ids: ['measure-the-context-and-start-a-fresh-session-before-it-degrades'],
      },
    ],
  });
});

test('an unresolved context-degradation group asks for a choice before the exclusion fires', async () => {
  const { catalog, instructions } = await fixture();
  const alpha = instructions.get('alpha');
  const beta = instructions.get('beta');
  if (alpha === undefined || beta === undefined) throw new Error('missing fixture instructions');
  instructions.set('alpha', {
    ...alpha,
    pattern_tags: ['context-degradation-signals'],
    compatibility: { excludes: ['beta'], requires: [] },
  });
  instructions.set('beta', {
    ...beta,
    pattern_tags: ['context-degradation-measured'],
    compatibility: { excludes: ['alpha'], requires: [] },
  });

  expect(() => catalogCompose(catalog, instructions, { instruction_ids: ['alpha', 'beta'] }))
    .toThrow(expect.objectContaining({
      code: 'CATALOG_PROFILE_CONFLICT',
      details: expect.objectContaining({
        group: 'context-degradation-policy',
        resolution_required: true,
        profile_required: true,
      }),
    }));

  const unresolved: EffectiveProfile = {
    schema: 'VPEffectiveProfile/v1',
    groups: {},
    unresolved_groups: {
      'context-degradation-policy': ['context-degradation-signals', 'context-degradation-measured'],
    },
  };
  expect(() => catalogCompose(catalog, instructions, { instruction_ids: ['alpha', 'beta'], profile: unresolved }))
    .toThrow(expect.objectContaining({
      code: 'CATALOG_PROFILE_CONFLICT',
      details: expect.objectContaining({
        group: 'context-degradation-policy',
        resolution_required: true,
        alternatives: ['context-degradation-signals', 'context-degradation-measured'],
      }),
    }));
});

test('a deprecated architecture decision stays readable and unlocked', async () => {
  const source = await readFile(join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), 'instructions/lock-only-an-accepted-architecture-decision.md'), 'utf8');
  const front = parseFrontmatter(source);
  expect(front.data.revision).toBe(3);
  expect(front.data.summary).toContain('deprecated');
  expect(front.body).toContain('`Deprecated`');
  expect(front.body).toContain('only `Accepted` counts as locked');
});

test.each(['profile-read', 'profile-json', 'schema-json', 'profile-shape', 'duplicate-groups', 'duplicate-alternatives', 'shared-alternative'])('a warmed canonical policy cache rejects changed invalid %s inputs', async kind => {
  const { catalog, instructions } = await fixture();
  expect(catalogCompose(catalog, instructions, { instruction_ids: ['alpha'] }).instructions.some(item => item.instruction_id === 'alpha')).toBe(true);
  const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const profilePath = join(packageRoot, 'config/methodology-profile.json');
  const schemaPath = join(packageRoot, 'config/vpmethodologyprofile.v1.schema.json');
  const realRead = nativeFiles.readFileSync;
  const profile = await readCanonicalMethodologyProfile();
  const first = profile.groups[0];
  const second = profile.groups[1];
  const alternative = first?.alternatives[0];
  if (!first || !second || !alternative) throw new Error('Canonical fixture lacks distinct groups/alternatives');
  let replacement = '{';
  if (kind === 'profile-shape') replacement = '{}';
  if (kind === 'duplicate-groups') { profile.groups.push(structuredClone(first)); replacement = JSON.stringify(profile); }
  if (kind === 'duplicate-alternatives') { first.alternatives.push(structuredClone(alternative)); replacement = JSON.stringify(profile); }
  if (kind === 'shared-alternative') { second.alternatives.push(structuredClone(alternative)); replacement = JSON.stringify(profile); }
  const expected: Record<string, string> = { 'profile-read': 'cannot read canonical', 'profile-json': 'canonical methodology profile is malformed', 'schema-json': 'canonical methodology profile schema is malformed', 'profile-shape': 'canonical methodology profile schema validation failed', 'duplicate-groups': 'duplicate groups', 'duplicate-alternatives': 'duplicate alternatives', 'shared-alternative': 'belongs to multiple groups' };
  const target = kind === 'schema-json' ? schemaPath : profilePath;
  let reads = 0;
  const io = spyOn(nativeFiles, 'readFileSync').mockImplementation(new Proxy(realRead, { apply(read, receiver: unknown, args: unknown[]) {
    if (String(args[0]) === target) {
      reads++;
      if (kind === 'profile-read') throw Object.assign(new Error('fixture policy read denied'), { code: 'EACCES' });
      return args[1] === 'utf8' ? replacement : Buffer.from(replacement);
    }
    return Reflect.apply(read, receiver, args);
  } }));
  try {
    expect(() => catalogCompose(catalog, instructions, { instruction_ids: ['alpha'] })).toThrow(expected[kind]);
    expect(reads).toBeGreaterThan(0);
  } finally { io.mockRestore(); }
  expect(catalogCompose(catalog, instructions, { instruction_ids: ['alpha'] }).instructions.some(item => item.instruction_id === 'alpha')).toBe(true);
});

test('schema and payload intake distinguish unreadable files from invalid data', async () => {
  const copy = await copyFixture();
  await expect(readSchema(copy.dir, 'missing.json')).rejects.toMatchObject({ code: 'CATALOG_INVALID', message: 'cannot read missing.json' });
  await writeFile(join(copy.dir, 'config/broken.json'), '{');
  await expect(readSchema(copy.dir, 'broken.json')).rejects.toMatchObject({ code: 'CATALOG_INVALID', message: 'broken.json is malformed JSON' });
  await expect(loadCatalog(join(copy.dir, 'missing.json'))).rejects.toMatchObject({ code: 'CATALOG_INVALID', message: 'cannot read catalog manifest' });
  const catalog = await loadCatalog(copy.catalogPath);
  const entry = catalog.instructions[0];
  if (entry === undefined) throw new Error('Missing fixture entry');
  await rm(join(copy.dir, entry.path));
  await expect(loadInstructions(catalog, copy.dir)).rejects.toMatchObject({ code: 'CATALOG_INVALID', details: { instruction_id: entry.instruction_id, path: entry.path } });
});

test('product policy rejects a non-default effective selection while user decision permits it', async () => {
  const { catalog, instructions } = await fixture();
  const canonical = await readCanonicalMethodologyProfile();
  const group = canonical.groups.find(item => item.alternatives.length >= 2);
  const first = group?.alternatives[0]?.id;
  const second = group?.alternatives[1]?.id;
  if (!group || !first || !second) throw new Error('Missing multi-alternative fixture');
  const profile: EffectiveProfile = { schema: 'VPEffectiveProfile/v1', groups: { [group.id]: { active: second, alternatives: group.alternatives.map(item => item.id) } }, unresolved_groups: {} };
  const realRead = nativeFiles.readFileSync;
  const profilePath = resolve(dirname(fileURLToPath(import.meta.url)), '../config/methodology-profile.json');
  const productPolicy = { ...canonical, groups: canonical.groups.map(item => item.id === group.id ? { ...item, user_decision: false, default: first } : item) };
  const io = spyOn(nativeFiles, 'readFileSync').mockImplementation(new Proxy(realRead, { apply(read, receiver: unknown, args: unknown[]) {
    if (String(args[0]) === profilePath) return Buffer.from(JSON.stringify(productPolicy));
    return Reflect.apply(read, receiver, args);
  } }));
  try {
    expect(() => catalogCompose(catalog, instructions, { instruction_ids: ['alpha'], profile })).toThrow(expect.objectContaining({
      code: 'CATALOG_PROFILE_CONFLICT', details: expect.objectContaining({ group: group.id, active: second, expected_active: first, profile_refresh_required: true, resolution_required: true }),
    }));
    const renamed: EffectiveProfile = { ...profile, groups: { renamed: { active: second, alternatives: [first, second] } } };
    expect(() => catalogCompose(catalog, instructions, { instruction_ids: ['alpha'], profile: renamed })).toThrow(expect.objectContaining({ code: 'CATALOG_PROFILE_CONFLICT' }));
    const alpha = instructions.get('alpha');
    if (alpha === undefined) throw new Error('Missing alpha');
    const records = new Map(instructions);
    records.set('alpha', { ...alpha, pattern_tags: [second] });
    try {
      catalogCompose(catalog, records, { required_ids: ['alpha'] });
      throw new Error('expected policy conflict');
    } catch (error) {
      expect(error).toMatchObject({ code: 'CATALOG_PROFILE_CONFLICT', details: { expected_active: first } });
      expect((error as CatalogError).details.profile_refresh_required).toBeUndefined();
    }
  } finally { io.mockRestore(); }
  expect(catalogCompose(catalog, instructions, { instruction_ids: ['alpha'], profile }).instructions.map(item => item.instruction_id)).toContain('alpha');
});

test('fabricated resolved and unresolved profile groups cannot suppress canonical defaults', async () => {
  const { catalog, instructions } = await fixture();
  const bogus: EffectiveProfile = { schema: 'VPEffectiveProfile/v1', groups: { 'bogus-x': { active: 'code-review', alternatives: ['code-review', 'test-first-development'] } }, unresolved_groups: {} };
  for (const profile of [bogus, { ...bogus, groups: {}, unresolved_groups: { 'bogus-x': ['code-review', 'test-first-development'] } }]) {
    expect(() => catalogCompose(catalog, instructions, { instruction_ids: ['alpha'], profile })).toThrow(expect.objectContaining({ code: 'CATALOG_PROFILE_CONFLICT', details: expect.objectContaining({ group: 'bogus-x', profile_refresh_required: true }) }));
    expect(() => catalogSearchWithProfile(catalog, instructions, {}, profile)).toThrow(expect.objectContaining({ code: 'CATALOG_PROFILE_CONFLICT', details: expect.objectContaining({ group: 'bogus-x' }) }));
  }
});

test.each(['resolved', 'missing-default-choice'])('canonical conflicting required alternatives fail closed with %s profile state', async mode => {
  const { catalog, instructions } = await fixture();
  const canonical = await readCanonicalMethodologyProfile();
  const group = canonical.groups.find(item => item.alternatives.length >= 2);
  const first = group?.alternatives[0]?.id;
  const second = group?.alternatives[1]?.id;
  const alpha = instructions.get('alpha');
  const beta = instructions.get('beta');
  if (!group || !first || !second || !alpha || !beta) throw new Error('Missing canonical conflict fixture');
  const alternatives = group.alternatives.map(item => item.id);
  const records = new Map(instructions);
  records.set('alpha', { ...alpha, pattern_tags: [first], compatibility: { requires: [], excludes: [] } });
  records.set('beta', { ...beta, pattern_tags: [second], compatibility: { requires: [], excludes: [] } });
  for (const tag of alternatives) catalog.tag_dictionary.pattern[tag] = 'Synthetic policy conflict fixture.';
  if (mode === 'resolved') {
    const gamma = instructions.get('gamma');
    const activeId = group.alternatives[0]?.instruction_ids[0];
    if (gamma === undefined || activeId === undefined) throw new Error('Missing active replacement fixture');
    catalog.tag_dictionary.pattern['synthetic-root-policy'] = 'Synthetic root outside the conflicting group.';
    records.set('alpha', { ...alpha, pattern_tags: ['synthetic-root-policy'], compatibility: { requires: ['beta'], excludes: [] } });
    records.set(activeId, { ...gamma, instruction_id: activeId, status: 'active', pattern_tags: [first, second], compatibility: { requires: [], excludes: [] } });
  }
  const profile = { schema: 'VPEffectiveProfile/v1' as const, groups: mode === 'resolved' ? { [group.id]: { active: first, alternatives } } : {}, unresolved_groups: {} };
  const realRead = nativeFiles.readFileSync;
  const profilePath = resolve(dirname(fileURLToPath(import.meta.url)), '../config/methodology-profile.json');
  const fixturePolicy = { ...canonical, groups: canonical.groups.map(item => item.id === group.id ? { ...item, user_decision: false, default: first } : item) };
  const io = spyOn(nativeFiles, 'readFileSync').mockImplementation(new Proxy(realRead, { apply(read, receiver: unknown, args: unknown[]) {
    if (mode === 'missing-default-choice' && String(args[0]) === profilePath) return args[1] === 'utf8' ? JSON.stringify(fixturePolicy) : Buffer.from(JSON.stringify(fixturePolicy));
    return Reflect.apply(read, receiver, args);
  } }));
  try {
    expect(() => catalogCompose(catalog, records, { required_ids: mode === 'resolved' ? ['alpha'] : ['alpha', 'beta'], profile })).toThrow(expect.objectContaining({
      code: 'CATALOG_PROFILE_CONFLICT',
      details: expect.objectContaining(mode === 'resolved' ? { selected_alternatives: expect.arrayContaining(alternatives) } : { group: group.id, expected_active: first, selected_alternatives: expect.arrayContaining([second]) }),
    }));
  } finally { io.mockRestore(); }
});

test.each(['methodology-profile.json', 'vpmethodologyprofile.v1.schema.json'])('ill-formed UTF-8 canonical %s bytes fail before policy reuse', async name => {
  const { catalog, instructions } = await fixture();
  expect(catalogCompose(catalog, instructions, { instruction_ids: ['alpha'] }).instructions).not.toHaveLength(0);
  const path = resolve(dirname(fileURLToPath(import.meta.url)), '../config', name);
  const realRead = nativeFiles.readFileSync;
  const malformed = Buffer.concat([Buffer.from([0xff]), realRead(path)]);
  const io = spyOn(nativeFiles, 'readFileSync').mockImplementation(new Proxy(realRead, { apply(read, receiver: unknown, args: unknown[]) {
    if (String(args[0]) === path) return args[1] === 'utf8' ? malformed.toString('utf8') : malformed;
    return Reflect.apply(read, receiver, args);
  } }));
  try { expect(() => catalogCompose(catalog, instructions, { instruction_ids: ['alpha'] })).toThrow('cannot read canonical methodology profile or schema'); }
  finally { io.mockRestore(); }
});
