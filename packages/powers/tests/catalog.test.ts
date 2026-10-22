import { afterAll, describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CatalogError,
  catalogCompose,
  catalogGet,
  catalogSearch,
  catalogTags,
  loadCatalog,
  loadInstructions,
} from '../skills/vp-mode/scripts/catalog.ts';
import type { Catalog, ComposeQuery, Instruction, SearchQuery } from '../skills/vp-mode/scripts/catalog.ts';
import { validateAgainstSchema } from '../skills/vp-mode/scripts/schema.ts';
import type { Schema } from '../skills/vp-mode/scripts/schema.ts';

const fixtureDir = fileURLToPath(new URL('./fixtures/catalog/', import.meta.url));
const tempDirs: string[] = [];

async function copyFixture(): Promise<{ dir: string; catalogPath: string }> {
  const dir = await mkdtemp(join(tmpdir(), 'vp-catalog-'));
  tempDirs.push(dir);
  await cp(fixtureDir, dir, { recursive: true });
  return { dir, catalogPath: join(dir, 'catalog.json') };
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

async function fixture(): Promise<{ catalog: Catalog; instructions: Map<string, Instruction> }> {
  const catalogPath = join(fixtureDir, 'catalog.json');
  const catalog = await loadCatalog(catalogPath);
  return { catalog, instructions: await loadInstructions(catalog, dirname(resolve(catalogPath))) };
}

type CanonicalMethodologyProfile = { groups: { id: string; alternatives: { id: string; instruction_ids: string[] }[] }[] };

async function readCanonicalMethodologyProfile(): Promise<CanonicalMethodologyProfile> {
  const path = join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), 'config', 'methodology-profile.json');
  return JSON.parse(await readFile(path, 'utf8')) as CanonicalMethodologyProfile;
}

async function readEffectiveProfileSchema(): Promise<Schema> {
  const path = join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), 'config', 'vpeffectiveprofile.v1.schema.json');
  return JSON.parse(await readFile(path, 'utf8')) as Schema;
}

function syntheticInstructions(
  seed: Instruction,
  count: number,
  content: string,
  requiresFor: (index: number, ids: string[]) => string[] = () => [],
): { instructions: Map<string, Instruction>; ids: string[] } {
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

describe('catalogSearch', () => {
  test('returns only metadata with exact keys and stable id order', async () => {
    const { catalog, instructions } = await fixture();
    const results = catalogSearch(catalog, instructions, {});
    expect(results.map((item) => item.instruction_id)).toEqual(['alpha', 'beta', 'conflict-mode', 'gamma', 'guidance']);
    expect(Object.keys(results[0] ?? {}).sort()).toEqual(['capability_tags', 'instruction_id', 'pattern_tags', 'revision', 'summary', 'title']);
    expect(results.some((item) => 'content' in item)).toBe(false);
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
    expect(catalogGet(catalog, instructions, 'alpha').content).toBe('Alpha body.\n');
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
      testing: { active: 'test-first-development', alternatives: ['test-first-development', 'test-after-development'] },
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
    const { catalog, instructions } = await fixture();
    const profile = { schema: 'VPEffectiveProfile/v1' as const, groups: {
      testing: { active: 'missing-active-pattern', alternatives: ['missing-active-pattern', 'test-after-development'] },
    }, unresolved_groups: {} };
    const gamma = instructions.get('gamma');
    const alpha = instructions.get('alpha');
    if (gamma === undefined || alpha === undefined) throw new Error('fixture instructions missing');
    const inactiveDependency = new Map(instructions);
    inactiveDependency.set('gamma', { ...gamma, pattern_tags: ['test-after-development'] });
    expect(() => catalogCompose(catalog, inactiveDependency, { capability_tags: ['test-design'], profile })).toThrow(expect.objectContaining({
      code: 'CATALOG_PROFILE_CONFLICT', details: { group: 'testing', active: 'missing-active-pattern', dependency_id: 'gamma', requiring_instruction_id: 'beta' },
    }));

  });

  test('replaces an inactive approval-policy dependency with the active alternative', async () => {
    const { catalog, instructions } = await fixture();
    const alpha = instructions.get('alpha');
    const beta = instructions.get('beta');
    const gamma = instructions.get('gamma');
    if (alpha === undefined || beta === undefined || gamma === undefined) throw new Error('fixture instructions missing');
    const profile = { schema: 'VPEffectiveProfile/v1' as const, groups: {
      'approval-policy': { active: 'approval-policy-proceed', alternatives: ['approval-policy-proceed', 'approval-policy-gate'] },
    }, unresolved_groups: {} };
    expect(validateAgainstSchema(profile, await readEffectiveProfileSchema())).toEqual([]);
    const alternatives = new Map(instructions);
    alternatives.set('alpha', { ...alpha, compatibility: { excludes: [], requires: ['beta'] } });
    alternatives.set('beta', { ...beta, pattern_tags: ['approval-policy-gate'] });
    alternatives.set('gamma', { ...gamma, pattern_tags: ['approval-policy-proceed'] });
    const result = catalogCompose(catalog, alternatives, { required_ids: ['alpha'], profile });
    expect(result.instructions.map((item) => [item.instruction_id, item.selection_reason])).toEqual([
      ['alpha', 'required'], ['gamma', 'dependency'],
    ]);
  });

  test('negotiates when the active dependency replacement belongs to another unresolved group', async () => {
    const { catalog, instructions } = await fixture();
    const alpha = instructions.get('alpha');
    const beta = instructions.get('beta');
    const gamma = instructions.get('gamma');
    if (alpha === undefined || beta === undefined || gamma === undefined) throw new Error('replacement fixture instructions missing');
    const candidates = new Map<string, Instruction>([...instructions].map(([id, instruction]) => [id, { ...instruction, pattern_tags: [] }]));
    candidates.set('alpha', { ...alpha, pattern_tags: [], compatibility: { excludes: [], requires: ['beta'] } });
    candidates.set('beta', { ...beta, pattern_tags: ['test-after-development'] });
    candidates.set('gamma', { ...gamma, pattern_tags: ['test-first-development', 'approval-policy-proceed'] });
    const profile = {
      schema: 'VPEffectiveProfile/v1' as const,
      groups: { testing: { active: 'test-first-development', alternatives: ['test-first-development', 'test-after-development'] } },
      unresolved_groups: { 'approval-policy': ['approval-policy-proceed', 'approval-policy-gate'] },
    };
    expect(() => catalogCompose(catalog, candidates, { required_ids: ['alpha'], profile })).toThrow(expect.objectContaining({
      code: 'CATALOG_PROFILE_CONFLICT',
      details: {
        group: 'approval-policy',
        resolution_required: true,
        alternatives: ['approval-policy-proceed', 'approval-policy-gate'],
        dependency_id: 'gamma',
        requiring_instruction_id: 'alpha',
      },
    }));
  });

  test('does not compose either unresolved approval-policy alternative and returns a negotiation error', async () => {
    const { catalog, instructions } = await fixture();
    const beta = instructions.get('beta');
    const gamma = instructions.get('gamma');
    if (beta === undefined || gamma === undefined) throw new Error('approval-policy fixture instructions missing');
    const alternatives = new Map(instructions);
    alternatives.set('beta', { ...beta, pattern_tags: ['approval-policy-gate'] });
    alternatives.set('gamma', { ...gamma, pattern_tags: ['approval-policy-proceed'] });
    const profile = {
      schema: 'VPEffectiveProfile/v1' as const,
      groups: {},
      unresolved_groups: { 'approval-policy': ['approval-policy-proceed', 'approval-policy-gate'] },
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
        details: { group: 'approval-policy', resolution_required: true, alternatives: ['approval-policy-proceed', 'approval-policy-gate'] },
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
    dependent.set('beta', { ...beta, pattern_tags: ['approval-policy-gate'] });
    const profile = {
      schema: 'VPEffectiveProfile/v1' as const,
      groups: {},
      unresolved_groups: { 'approval-policy': ['approval-policy-proceed', 'approval-policy-gate'] },
    };
    expect(() => catalogCompose(catalog, dependent, { required_ids: ['alpha'], profile })).toThrow(expect.objectContaining({
      code: 'CATALOG_PROFILE_CONFLICT',
      details: {
        group: 'approval-policy',
        resolution_required: true,
        alternatives: ['approval-policy-proceed', 'approval-policy-gate'],
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
    const { catalog, instructions } = await fixture();
    const profile = { schema: 'VPEffectiveProfile/v1' as const, groups: {
      testing: { active: 'test-first-development', alternatives: ['test-first-development', 'test-after-development'] },
    }, unresolved_groups: {} };
    const alpha = instructions.get('alpha');
    if (alpha === undefined) throw new Error('fixture alpha missing');
    const inactiveParent = new Map(instructions);
    inactiveParent.set('alpha', { ...alpha, pattern_tags: ['test-after-development'] });
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
    const { catalog, instructions } = await fixture();
    const profile = { schema: 'VPEffectiveProfile/v1' as const, groups: {
      testing: { active: 'test-first-development', alternatives: ['test-first-development', 'test-after-development'] },
    }, unresolved_groups: {} };
    const filtered = catalogCompose(catalog, instructions, { capability_tags: ['alternate-workflow'], profile });
    expect(filtered.instructions.map((item) => item.instruction_id)).toEqual([]);
    expect(() => catalogCompose(catalog, instructions, { required_ids: ['conflict-mode'], profile })).toThrow(expect.objectContaining({ code: 'CATALOG_PROFILE_CONFLICT' }));
    expect(() => catalogCompose(catalog, instructions, { profile: { ...profile, groups: { testing: { active: 'unknown', alternatives: ['test-first-development'] } } } })).toThrow(expect.objectContaining({ code: 'CATALOG_PROFILE_CONFLICT' }));
    expect(() => catalogCompose(catalog, instructions, {
      capability_tags: ['no-match'], profile: { ...profile, groups: { testing: { active: 'unknown', alternatives: ['test-first-development'] } } },
    })).toThrow(expect.objectContaining({ code: 'CATALOG_PROFILE_CONFLICT' }));
  });

  test('profile preserves an active required instruction and still checks excludes', async () => {
    const { catalog, instructions } = await fixture();
    const profile = { schema: 'VPEffectiveProfile/v1' as const, groups: {
      testing: { active: 'test-first-development', alternatives: ['test-first-development', 'test-after-development'] },
    }, unresolved_groups: {} };
    const active = catalogCompose(catalog, instructions, { required_ids: ['alpha'], capability_tags: ['test-design'], profile });
    expect(active.instructions.map((item) => item.instruction_id)).toEqual(['alpha', 'beta', 'gamma']);
    expect(() => catalogCompose(catalog, instructions, {
      capability_tags: ['test-design', 'alternate-workflow'], profile: { ...profile, groups: {} },
    })).toThrow(expect.objectContaining({ code: 'CATALOG_REQUIRED_CONFLICT' }));
  });
});
