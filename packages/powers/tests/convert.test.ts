import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCatalog, loadInstructions } from '../skills/vp-mode/scripts/catalog.ts';
import { CatalogError } from '../skills/vp-mode/scripts/catalog.ts';
import { parseFrontmatter } from '../skills/vp-mode/scripts/frontmatter.ts';
import * as frontmatterModule from '../skills/vp-mode/scripts/frontmatter.ts';
import { validateAgainstSchema, type Schema } from '../skills/vp-mode/scripts/schema.ts';
import { convert, convertMany, convertMapRecord, parseInstructionSpec, renderInstruction, runConvertCli, type InstructionSpec } from '../scripts/convert.ts';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const temporaryRoots: string[] = [];
const sha = (text: string): string => createHash('sha256').update(text).digest('hex');

async function makeRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'vida-convert-'));
  temporaryRoots.push(root);
  await mkdir(join(root, 'config'), { recursive: true });
  for (const name of ['vpinstruction.v1.2.schema.json', 'vpcatalog.v1.schema.json', 'vpcorpusmap.v1.schema.json']) {
    await writeFile(join(root, 'config', name), await readFile(join(packageRoot, 'config', name)));
  }
  await writeFile(join(root, 'catalog.json'), JSON.stringify({ schema: 'VPCatalog/v1', catalog_id: 'vida-powers', revision: 1, source_revision: 'seed-v1', updated_at: '2026-01-01T00:00:00.000Z', tag_dictionary: { capability: { 'release-note': 'Release note' }, pattern: { 'delivery-review': 'Delivery review' } }, tag_aliases: {}, tag_exemptions: [], instructions: [] }));
  return root;
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

function validSpec(overrides: Partial<InstructionSpec> = {}): InstructionSpec {
  return {
    instruction_id: 'write-release-note',
    title: 'Write release note',
    summary: 'Prepare a concise release note.',
    capability_tags: ['release-note'],
    pattern_tags: ['delivery-review'],
    roles: ['release-manager'],
    products: ['vida-powers'],
    conditions_applies_when: 'A release is prepared.',
    conditions_does_not_apply_when: 'No release is planned.',
    artifact_contract_output_type: 'markdown',
    artifact_contract_required_data: ['version'],
    artifact_contract_verified_by: 'Release owner review',
    compatibility_excludes: [],
    compatibility_requires: [],
    provenance: [{ donor: 'sample-donor', license: 'MIT', revision: 'a'.repeat(40), path: 'docs/release.md' }],
    status: 'active',
    revision: 1,
    body: '## Steps\n\nKeep this body verbatim.\n',
    ...overrides,
  };
}

function mapRecord(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { donor: 'map-donor', source_revision: 'b'.repeat(40), path: 'docs/no-method.md', status: 'rejected', reason: 'not methodology', ...overrides };
}

async function writeMapRecord(root: string, value: unknown, name = 'record.json'): Promise<string> {
  const path = join(root, name);
  await writeFile(path, JSON.stringify(value));
  return path;
}

async function writeSpec(root: string, value: unknown): Promise<string> {
  const path = join(root, 'spec.json');
  await writeFile(path, JSON.stringify(value));
  return path;
}

async function runCliInProcess(args: string[], cliPath: string): Promise<{ stdout: string; stderr: string; exitCode: number | undefined }> {
  let stdout = '';
  let stderr = '';
  const code = await runConvertCli([process.execPath, cliPath, ...args], { stdout: (text) => { stdout += text; }, stderr: (text) => { stderr += text; } }, () => {});
  return { stdout, stderr, exitCode: code };
}

describe('parseInstructionSpec', () => {
  test('accepts the exact instruction shape', () => {
    expect(parseInstructionSpec(validSpec(), 'sample.json')).toEqual(validSpec());
  });

  test.each([
    ['missing provenance', { provenance: undefined }, 'provenance'],
    ['non-kebab id', { instruction_id: 'Write Note' }, 'instruction_id'],
    ['single component capability tag', { capability_tags: ['release'] }, 'capability_tags'],
    ['none output with required data', { artifact_contract_output_type: 'none' }, 'artifact_contract_required_data'],
    ['unknown field', { unexpected: true }, 'unexpected'],
    ['empty body', { body: '' }, 'body'],
  ] as const)('rejects %s', (_label, change, field) => {
    const input = { ...validSpec(), ...change } as unknown;
    expect(() => parseInstructionSpec(input, 'bad.json')).toThrow(CatalogError);
    try {
      parseInstructionSpec(input, 'bad.json');
    } catch (error) {
      expect(error).toMatchObject({ code: 'CATALOG_INVALID', details: { field } });
    }
  });

  test('rejects invalid field types, missing keys, nested extras, and invalid enums', () => {
    const cases: Array<[unknown, string]> = [
      [null, '$'],
      [{ ...validSpec(), title: ' ' }, 'title'],
      [{ ...validSpec(), summary: '' }, 'summary'],
      [{ ...validSpec(), pattern_tags: ['review'] }, 'pattern_tags'],
      [{ ...validSpec(), roles: [3] }, 'roles'],
      [{ ...validSpec(), products: ['Bad Product'] }, 'products'],
      [{ ...validSpec(), conditions_applies_when: '' }, 'conditions_applies_when'],
      [{ ...validSpec(), conditions_does_not_apply_when: '' }, 'conditions_does_not_apply_when'],
      [{ ...validSpec(), artifact_contract_output_type: '' }, 'artifact_contract_output_type'],
      [{ ...validSpec(), artifact_contract_verified_by: 7 }, 'artifact_contract_verified_by'],
      [{ ...validSpec(), compatibility_requires: ['Bad Id'] }, 'compatibility_requires'],
      [{ ...validSpec(), provenance: [{ ...validSpec().provenance[0], extra: true }] }, 'provenance[0].extra'],
      [{ ...validSpec(), provenance: [{ donor: '', license: 'MIT', revision: 'a'.repeat(40), path: 'x' }] }, 'provenance[0].donor'],
      [{ ...validSpec(), provenance: [{ donor: 'd', license: 'MIT', revision: 'bad', path: 'x' }] }, 'provenance[0]'],
      [{ ...validSpec(), status: 'pending' }, 'status'],
      [{ ...validSpec(), revision: 0 }, 'revision'],
      [Object.fromEntries(Object.entries(validSpec()).filter(([key]) => key !== 'title')), 'title'],
    ];
    for (const [input, field] of cases) expect(() => parseInstructionSpec(input, 'bad.json')).toThrow(expect.objectContaining({ code: 'CATALOG_INVALID', details: { field, source: 'bad.json' } }));
  });
});

describe('renderInstruction', () => {
  test('emits canonical frontmatter, preserves the body, and validates against the schema', async () => {
    const rendered = renderInstruction(validSpec({ roles: [], products: [] }));
    const parsed = parseFrontmatter(rendered);
    const schema = JSON.parse(await readFile(join(packageRoot, 'config', 'vpinstruction.v1.2.schema.json'), 'utf8')) as Schema;
    expect(validateAgainstSchema(parsed.data, schema)).toEqual([]);
    expect(parsed.body).toBe(validSpec({ roles: [], products: [] }).body);
    expect(rendered).toBe(`---\nschema: VPInstruction/v1.2\nclassification_status: unclassified\nclassification_reason: classification-not-assessed\ninstruction_id: write-release-note\ntitle: Write release note\nsummary: Prepare a concise release note.\ncapability_tags:\n  - release-note\npattern_tags:\n  - delivery-review\nconditions_applies_when: A release is prepared.\nconditions_does_not_apply_when: No release is planned.\nartifact_contract_output_type: markdown\nartifact_contract_required_data:\n  - version\nartifact_contract_verified_by: Release owner review\ncompatibility_excludes: []\ncompatibility_requires: []\nprovenance:\n  - donor=sample-donor; license=MIT; revision=${'a'.repeat(40)}; path=docs/release.md\nstatus: active\nrevision: 1\n---\n\n## Steps\n\nKeep this body verbatim.\n`);
  });
});

describe('convert', () => {
  test('refuses to overwrite non-v1.2 metadata without the reviewed batch owner', async () => {
    const root = await makeRoot();
    const specPath = await writeSpec(root, validSpec());
    await mkdir(join(root, 'instructions'), { recursive: true });
    const instructionPath = join(root, 'instructions', 'write-release-note.md');
    const legacy = '---\nschema: VPInstruction/v1\ninstruction_id: write-release-note\nrevision: 1\n---\n\nLegacy body.\n';
    await writeFile(instructionPath, legacy, 'utf8');
    const raised = await convert(specPath, { root }).then(() => undefined, (error: unknown) => error);
    expect(raised).toBeInstanceOf(CatalogError);
    expect(raised).toMatchObject({
      code: 'CATALOG_INVALID',
      message: expect.stringContaining('faceted or unsupported metadata'),
      details: { instruction_id: 'write-release-note' },
    });
    expect(await readFile(instructionPath, 'utf8')).toBe(legacy);
  });

  test('removes an instruction and recomputes all affected map entries', async () => {
    const root = await makeRoot();
    await convert(await writeSpec(root, validSpec()), { root });
    const mapPath = join(root, 'corpus-map.json');
    const map = JSON.parse(await readFile(mapPath, 'utf8')) as any;
    map.donors['sample-donor'].files['docs/release.md'].instruction_ids.push('other-rule');
    map.donors['sample-donor'].files['docs/release.md'].status = 'split';
    map.donors.extra = { source_revision: 'c'.repeat(40), files: { 'docs/only.md': { status: 'converted', instruction_ids: ['write-release-note'] } } };
    await writeFile(mapPath, JSON.stringify(map));
    const { removeInstruction } = await import('../scripts/convert.ts');
    const result = await removeInstruction('write-release-note', { root, now: () => 'removed-time' });
    expect(result).toMatchObject({ kind: 'removal', instructionId: 'write-release-note', removed: true, manifestUpdated: true, mapUpdated: true, manifestRevision: 3 });
    await expect(readFile(join(root, 'instructions', 'write-release-note.md'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
    expect(JSON.parse(await readFile(join(root, 'catalog.json'), 'utf8')).instructions).toEqual([]);
    expect(JSON.parse(await readFile(mapPath, 'utf8')).donors).toMatchObject({ 'sample-donor': { files: { 'docs/release.md': { status: 'converted', instruction_ids: ['other-rule'] } } }, extra: { files: { 'docs/only.md': { status: 'rejected', reason: 'the instruction was replaced by atomic ones' } } } });
  });

  test('unknown removal fails without writing and exposes the missing id', async () => {
    const root = await makeRoot();
    const before = await readFile(join(root, 'catalog.json'), 'utf8');
    const { removeInstruction } = await import('../scripts/convert.ts');
    await expect(removeInstruction('missing-rule', { root })).rejects.toMatchObject({ code: 'CATALOG_INVALID', details: { instruction_id: 'missing-rule' } });
    expect(await readFile(join(root, 'catalog.json'), 'utf8')).toBe(before);
    expect(await readdir(root)).not.toContain('corpus-map.json');
  });

  test('a repeated id in one removal run fails on the second removal', async () => {
    const root = await makeRoot();
    await convert(await writeSpec(root, validSpec()), { root });
    const cli = join(packageRoot, 'scripts', 'convert.ts');
    const result = await runCliInProcess(['--remove', 'write-release-note', '--remove', 'write-release-note', '--root', root], cli);
    expect(result.exitCode).toBe(1);
    expect(JSON.parse(result.stderr)).toMatchObject({ details: { instruction_id: 'write-release-note' } });
    expect(JSON.parse(await readFile(join(root, 'catalog.json'), 'utf8')).instructions).toEqual([]);
  });

  test('CLI reports removals and emits JSON error for unknown ids', async () => {
    const root = await makeRoot();
    await convert(await writeSpec(root, validSpec()), { root });
    const cli = join(packageRoot, 'scripts', 'convert.ts');
    const removed = await runCliInProcess(['--remove', 'write-release-note', '--root', root], cli);
    expect(removed.exitCode).toBe(0);
    expect(JSON.parse(removed.stdout)).toMatchObject([{ kind: 'removal', instructionId: 'write-release-note', removed: true }]);
    const missing = await runCliInProcess(['--remove', 'missing-rule', '--root', root], cli);
    expect(missing.exitCode).toBe(1);
    expect(JSON.parse(missing.stderr)).toEqual({ code: 'CATALOG_INVALID', message: 'instruction missing-rule is not in the catalog manifest', details: { instruction_id: 'missing-rule' } });
  });

  test('removal preserves sorted manifest order and bumps its revision', async () => {
    const root = await makeRoot();
    const catalog = JSON.parse(await readFile(join(root, 'catalog.json'), 'utf8'));
    catalog.instructions = ['a-rule', 'm-rule', 'z-rule'].map((id) => ({ instruction_id: id, path: `instructions/${id}.md`, sha256: '0'.repeat(64) }));
    await writeFile(join(root, 'catalog.json'), JSON.stringify(catalog));
    const { removeInstruction } = await import('../scripts/convert.ts');
    const result = await removeInstruction('m-rule', { root, now: () => 'removed-time' });
    const updated = JSON.parse(await readFile(join(root, 'catalog.json'), 'utf8'));
    expect(result.manifestRevision).toBe(2);
    expect(updated.instructions.map((entry: { instruction_id: string }) => entry.instruction_id)).toEqual(['a-rule', 'z-rule']);
    expect(updated.updated_at).toBe('removed-time');
  });
  test('writes rejected and merged map records without instruction artifacts', async () => {
    const root = await makeRoot();
    const rejectedPath = await writeMapRecord(root, mapRecord());
    const rejected = await convertMapRecord(rejectedPath, { root });
    expect(rejected).toMatchObject({ kind: 'map-record', mapUpdated: true, manifestUpdated: false, written: false });
    expect(JSON.parse(await readFile(join(root, 'corpus-map.json'), 'utf8'))).toMatchObject({ donors: { 'map-donor': { files: { 'docs/no-method.md': { status: 'rejected', reason: 'not methodology' } } } } });
    expect(await readdir(root)).not.toContain('instructions');
    const mergedPath = await writeMapRecord(root, mapRecord({ path: 'docs/merged.md', status: 'merged', reason: undefined, instruction_ids: ['existing-rule'], contributed_sources: ['other:docs/a.md'] }), 'merged.json');
    await convertMapRecord(mergedPath, { root });
    expect(JSON.parse(await readFile(join(root, 'corpus-map.json'), 'utf8'))).toMatchObject({ donors: { 'map-donor': { files: { 'docs/merged.md': { status: 'merged', instruction_ids: ['existing-rule'], contributed_sources: ['other:docs/a.md'] } } } } });
  });

  test('writes converted map records with exactly one instruction id', async () => {
    const root = await makeRoot();
    const converted = mapRecord({ status: 'converted', reason: undefined, instruction_ids: ['single-rule'] });
    const path = await writeMapRecord(root, converted);
    await convertMapRecord(path, { root });
    expect(JSON.parse(await readFile(join(root, 'corpus-map.json'), 'utf8')).donors['map-donor'].files['docs/no-method.md']).toEqual({ status: 'converted', instruction_ids: ['single-rule'] });
    for (const [name, field, overrides] of [['two.json', 'instruction_ids', { instruction_ids: ['one', 'two'] }], ['missing.json', 'instruction_ids', { instruction_ids: undefined }], ['reason.json', 'reason', { reason: 'unexpected' }]] as const) {
      const invalidPath = await writeMapRecord(root, { ...converted, ...overrides }, name);
      await expect(convertMapRecord(invalidPath, { root })).rejects.toMatchObject({ code: 'CATALOG_INVALID', message: `invalid instruction spec field: ${field}`, details: { field, source: invalidPath } });
    }
  });

  test('converted map record writes are byte-idempotent', async () => {
    const root = await makeRoot();
    const path = await writeMapRecord(root, mapRecord({ status: 'converted', reason: undefined, instruction_ids: ['single-rule'] }));
    await convertMapRecord(path, { root }); const before = await readFile(join(root, 'corpus-map.json'), 'utf8');
    const result = await convertMapRecord(path, { root });
    expect(result.mapUpdated).toBe(false);
    expect(await readFile(join(root, 'corpus-map.json'), 'utf8')).toBe(before);
  });

  test('validates map record requirements and donor revisions', async () => {
    const root = await makeRoot();
    for (const input of [mapRecord({ reason: '' }), mapRecord({ reason: undefined }), mapRecord({ status: 'rejected', instruction_ids: ['x'] }), mapRecord({ status: 'merged', reason: undefined, contributed_sources: ['d:x'] }), mapRecord({ status: 'merged', reason: undefined, instruction_ids: ['x'] }), mapRecord({ status: 'other' })]) {
      await expect(convertMapRecord(await writeMapRecord(root, input, `bad-${Math.random()}.json`), { root })).rejects.toMatchObject({ code: 'CATALOG_INVALID' });
    }
    await convertMapRecord(await writeMapRecord(root, mapRecord()), { root });
    const conflict = await writeMapRecord(root, mapRecord({ source_revision: 'c'.repeat(40) }), 'conflict.json');
    await expect(convertMapRecord(conflict, { root })).rejects.toMatchObject({ message: expect.stringContaining('map-donor'), details: { donor: 'map-donor', stored_revision: 'b'.repeat(40), source_revision: 'c'.repeat(40) } });
  });

  test('map record writes are byte-idempotent', async () => {
    const root = await makeRoot(); const path = await writeMapRecord(root, mapRecord());
    await convertMapRecord(path, { root }); const before = await readFile(join(root, 'corpus-map.json'), 'utf8');
    const result = await convertMapRecord(path, { root });
    expect(result).toMatchObject({ kind: 'map-record', mapUpdated: false });
    expect(await readFile(join(root, 'corpus-map.json'), 'utf8')).toBe(before);
  });

  test('writes split map records and validates their fields', async () => {
    const root = await makeRoot();
    const split = mapRecord({ path: 'docs/split.md', status: 'split', reason: undefined, instruction_ids: ['first', 'second'] });
    await convertMapRecord(await writeMapRecord(root, split), { root });
    expect(JSON.parse(await readFile(join(root, 'corpus-map.json'), 'utf8')).donors['map-donor'].files['docs/split.md']).toEqual({ status: 'split', instruction_ids: ['first', 'second'] });
    const missingPath = await writeMapRecord(root, mapRecord({ path: 'docs/missing.md', status: 'split', reason: undefined }), 'missing-ids.json');
    await expect(convertMapRecord(missingPath, { root })).rejects.toMatchObject({ code: 'CATALOG_INVALID', message: 'invalid instruction spec field: instruction_ids', details: { field: 'instruction_ids', source: missingPath } });
    const reasonPath = await writeMapRecord(root, mapRecord({ path: 'docs/reason.md', status: 'split', instruction_ids: ['only'], reason: 'bad' }), 'has-reason.json');
    await expect(convertMapRecord(reasonPath, { root })).rejects.toMatchObject({ code: 'CATALOG_INVALID', message: 'invalid instruction spec field: reason', details: { field: 'reason', source: reasonPath } });
  });

  test('split map records are byte-idempotent', async () => {
    const root = await makeRoot();
    const path = await writeMapRecord(root, mapRecord({ status: 'split', reason: undefined, instruction_ids: ['one'] }));
    await convertMapRecord(path, { root }); const before = await readFile(join(root, 'corpus-map.json'), 'utf8');
    const result = await convertMapRecord(path, { root });
    expect(result.mapUpdated).toBe(false);
    expect(await readFile(join(root, 'corpus-map.json'), 'utf8')).toBe(before);
  });

  test('removal recomputes a one-id split entry to converted', async () => {
    const root = await makeRoot();
    await convert(await writeSpec(root, validSpec()), { root });
    const mapPath = join(root, 'corpus-map.json');
    const map = JSON.parse(await readFile(mapPath, 'utf8')) as any;
    map.donors['sample-donor'].files['docs/release.md'].status = 'split';
    map.donors['sample-donor'].files['docs/release.md'].instruction_ids.push('other-rule');
    await writeFile(mapPath, JSON.stringify(map));
    const { removeInstruction } = await import('../scripts/convert.ts');
    await removeInstruction('write-release-note', { root, now: () => 'removed-time' });
    expect(JSON.parse(await readFile(mapPath, 'utf8')).donors['sample-donor'].files['docs/release.md']).toEqual({ status: 'converted', instruction_ids: ['other-rule'] });
  });

  test('mixed CLI input preserves order and reports kind; invalid records emit JSON error', async () => {
    const root = await makeRoot(); const spec = await writeSpec(root, validSpec()); const rejected = await writeMapRecord(root, mapRecord());
    const cli = join(packageRoot, 'scripts', 'convert.ts');
    const result = await runCliInProcess(['--spec', spec, '--map-record', rejected, '--root', root], cli);
    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout).map((item: { kind: string }) => item.kind)).toEqual(['instruction', 'map-record']);
    const schema = JSON.parse(await readFile(join(packageRoot, 'config', 'vpcorpusmap.v1.schema.json'), 'utf8')) as Schema;
    expect(validateAgainstSchema(JSON.parse(await readFile(join(root, 'corpus-map.json'), 'utf8')), schema)).toEqual([]);
    const invalid = await writeMapRecord(root, mapRecord({ reason: '' }), 'invalid.json');
    const error = await runCliInProcess(['--map-record', invalid, '--root', root], cli);
    expect(error.exitCode).toBe(1);
    expect(JSON.parse(error.stderr)).toEqual({ code: 'CATALOG_INVALID', message: 'invalid map record field: reason', details: { field: 'reason', source: invalid } });
  });
  test('canonicalizes aliased tags before writing a loadable instruction', async () => {
    const root = await makeRoot();
    const catalogPath = join(root, 'catalog.json');
    const catalogData = JSON.parse(await readFile(catalogPath, 'utf8')) as Record<string, any>;
    catalogData.tag_aliases['test-driven'] = 'test-first-development';
    catalogData.tag_dictionary.pattern['test-first-development'] = 'Test first development';
    await writeFile(catalogPath, JSON.stringify(catalogData));
    const source = await writeSpec(root, validSpec({ pattern_tags: ['test-driven'] }));
    await convert(source, { root });
    const catalog = await loadCatalog(catalogPath);
    const instructions = await loadInstructions(catalog, root);
    expect(instructions.get('write-release-note')?.pattern_tags).toEqual(['test-first-development']);
  });

  test('writes instruction, digest manifest entry, and validated corpus map within the three targets', async () => {
    const root = await makeRoot();
    const specPath = await writeSpec(root, validSpec());
    const result = await convert(specPath, { root, now: () => '2026-01-02T03:04:05.000Z' });
    const markdownPath = join(root, 'instructions', 'write-release-note.md');
    const markdown = await readFile(markdownPath, 'utf8');
    const manifest = JSON.parse(await readFile(join(root, 'catalog.json'), 'utf8')) as Record<string, unknown>;
    const map = JSON.parse(await readFile(join(root, 'corpus-map.json'), 'utf8')) as Record<string, unknown>;
    const mapSchema = JSON.parse(await readFile(join(root, 'config', 'vpcorpusmap.v1.schema.json'), 'utf8')) as Schema;
    expect(result).toMatchObject({ instructionId: 'write-release-note', path: 'instructions/write-release-note.md', sha256: sha(markdown), written: true, manifestUpdated: true, mapUpdated: true, manifestRevision: 2 });
    expect(manifest.instructions).toEqual([{ instruction_id: 'write-release-note', path: 'instructions/write-release-note.md', sha256: sha(markdown) }]);
    expect(map).toMatchObject({ schema: 'VPCorpusMap/v1', revision: 1, donors: { 'sample-donor': { source_revision: 'a'.repeat(40), files: { 'docs/release.md': { status: 'converted', instruction_ids: ['write-release-note'] } } } } });
    expect(validateAgainstSchema(map, mapSchema)).toEqual([]);
    const walk = async (dir: string): Promise<string[]> => (await Promise.all((await readdir(dir, { withFileTypes: true })).map(async (entry) => entry.isDirectory() ? (await walk(join(dir, entry.name))).map((path) => join(entry.name, path)) : [entry.name]))).flat().sort();
    expect((await walk(root)).map((path) => path.replaceAll('\\', '/'))).toEqual(['catalog.json', 'config/vpcatalog.v1.schema.json', 'config/vpcorpusmap.v1.schema.json', 'config/vpinstruction.v1.2.schema.json', 'corpus-map.json', 'instructions/write-release-note.md', 'spec.json'].sort());
  });

  test('is idempotent, then updates only on changed content without duplicate manifest entries', async () => {
    const root = await makeRoot();
    const specPath = await writeSpec(root, validSpec());
    const first = await convert(specPath, { root, now: () => '2026-01-01T00:00:00.000Z' });
    const original = await readFile(join(root, 'catalog.json'), 'utf8');
    const second = await convert(specPath, { root, now: () => '2027-01-01T00:00:00.000Z' });
    expect(second).toMatchObject({ written: false, manifestUpdated: false, mapUpdated: false, manifestRevision: first.manifestRevision });
    expect(await readFile(join(root, 'catalog.json'), 'utf8')).toBe(original);
    await writeSpec(root, validSpec({ body: '## Changed\n' }));
    const third = await convert(specPath, { root });
    const manifest = JSON.parse(await readFile(join(root, 'catalog.json'), 'utf8')) as { revision: number; instructions: unknown[]; updated_at: string };
    expect(third).toMatchObject({ written: true, manifestUpdated: true, mapUpdated: false, manifestRevision: first.manifestRevision + 1 });
    expect(manifest.instructions).toHaveLength(1);
    expect(manifest.updated_at).not.toBe('2026-01-01T00:00:00.000Z');
  });

  test('preserves manifest metadata and sorts instruction entries when updating', async () => {
    const root = await makeRoot();
    const manifest = { schema: 'VPCatalog/v1', catalog_id: 'kept-id', revision: 9, source_revision: 'kept-source', updated_at: 'kept-time', tag_dictionary: { capability: { 'release-note': 'Release note' }, pattern: { 'delivery-review': 'Delivery review' } }, tag_aliases: { 'release-notes': 'release-note' }, tag_exemptions: [{ instruction_id: 'old-id', dimension: 'pattern', reason: 'legacy' }], instructions: [{ instruction_id: 'z-last', path: 'instructions/z-last.md', sha256: '0'.repeat(64) }] };
    await writeFile(join(root, 'catalog.json'), JSON.stringify(manifest));
    await convert(await writeSpec(root, validSpec()), { root, now: () => 'changed-time' });
    const updated = JSON.parse(await readFile(join(root, 'catalog.json'), 'utf8')) as typeof manifest;
    expect(updated).toMatchObject({ schema: manifest.schema, catalog_id: manifest.catalog_id, source_revision: manifest.source_revision, tag_dictionary: manifest.tag_dictionary, tag_aliases: manifest.tag_aliases, tag_exemptions: manifest.tag_exemptions, revision: 10 });
    expect(updated.instructions.map((entry) => entry.instruction_id)).toEqual(['write-release-note', 'z-last']);
  });

  test('requires an owner-approved manifest before conversion', async () => {
    const root = await makeRoot();
    const specPath = await writeSpec(root, validSpec());
    await rm(join(root, 'catalog.json'));
    await expect(convert(specPath, { root })).rejects.toMatchObject({ code: 'CATALOG_INVALID', message: 'catalog manifest must be created first with the owner-approved tag dictionary' });
    expect(await readdir(root)).not.toContain('instructions');
  });

  test('converts twice without target config and remains byte-identical', async () => {
    const root = await makeRoot();
    const specPath = await writeSpec(root, validSpec());
    await rm(join(root, 'config'), { recursive: true });
    await convert(specPath, { root });
    const before = await Promise.all(['catalog.json', 'corpus-map.json', 'instructions/write-release-note.md'].map((name) => readFile(join(root, name), 'utf8')));
    await convert(specPath, { root });
    expect(await Promise.all(['catalog.json', 'corpus-map.json', 'instructions/write-release-note.md'].map((name) => readFile(join(root, name), 'utf8')))).toEqual(before);
  });

  test('rejects malformed catalog and corpus map inputs before writing', async () => {
    const root = await makeRoot();
    const specPath = await writeSpec(root, validSpec());
    await writeFile(join(root, 'catalog.json'), '{');
    await expect(convert(specPath, { root })).rejects.toMatchObject({ message: 'catalog manifest JSON is malformed' });
    await rm(join(root, 'catalog.json'));
    await writeFile(join(root, 'catalog.json'), JSON.stringify({ schema: 'VPCatalog/v1', catalog_id: 'vida-powers', revision: 1, source_revision: 'seed-v1', updated_at: '2026-01-01T00:00:00.000Z', tag_dictionary: { capability: { 'release-note': 'Release note' }, pattern: { 'delivery-review': 'Delivery review' } }, tag_aliases: {}, tag_exemptions: [], instructions: [] }));
    await writeFile(join(root, 'corpus-map.json'), '[]');
    await expect(convert(specPath, { root })).rejects.toMatchObject({ message: 'corpus map must be an object' });
    expect(await readdir(root)).not.toContain('instructions');
  });

  test('accepts explicit target paths and writes the map once for a donor file', async () => {
    const root = await makeRoot();
    const specPath = await writeSpec(root, validSpec());
    await writeFile(join(root, 'custom-catalog.json'), await readFile(join(root, 'catalog.json')));
    const first = await convert(specPath, { root, catalogPath: join(root, 'custom-catalog.json'), mapPath: join(root, 'custom-map.json'), instructionsDir: join(root, 'custom-instructions') });
    const second = await convert(specPath, { root, catalogPath: join(root, 'custom-catalog.json'), mapPath: join(root, 'custom-map.json'), instructionsDir: join(root, 'custom-instructions') });
    expect(first).toMatchObject({ path: 'custom-instructions/write-release-note.md', mapUpdated: true });
    expect(second.mapUpdated).toBe(false);
  });

  test('increments an existing corpus map revision when a processed source changes', async () => {
    const root = await makeRoot();
    const specPath = await writeSpec(root, validSpec());
    await convert(specPath, { root, now: () => '2026-01-01T00:00:00.000Z' });
    await writeSpec(root, validSpec({ provenance: [{ donor: 'sample-donor', license: 'MIT', revision: 'a'.repeat(40), path: 'docs/other.md' }] }));
    const result = await convert(specPath, { root });
    const map = JSON.parse(await readFile(join(root, 'corpus-map.json'), 'utf8')) as { revision: number; updated_at: string };
    expect(result.mapUpdated).toBe(true);
    expect(map.revision).toBe(2);
    expect(map.updated_at).not.toBe('2026-01-01T00:00:00.000Z');
  });

  test('splits one donor file across ids and converges byte for byte', async () => {
    const root = await makeRoot();
    const a = await writeSpec(root, validSpec({ instruction_id: 'first-note' }));
    const b = join(root, 'second.json'); await writeFile(b, JSON.stringify(validSpec({ instruction_id: 'second-note' })));
    await convertMany([a, b], { root });
    const mapPath = join(root, 'corpus-map.json'); const bytes = await readFile(mapPath, 'utf8');
    expect(JSON.parse(bytes)).toMatchObject({ donors: { 'sample-donor': { files: { 'docs/release.md': { status: 'split', instruction_ids: ['first-note', 'second-note'] } } } } });
    expect((await convertMany([a, b], { root })).every((result) => !result.mapUpdated)).toBe(true);
    expect(await readFile(mapPath, 'utf8')).toBe(bytes);
  });

  test('rejects duplicate ids across different spec paths', async () => {
    const root = await makeRoot(); const a = await writeSpec(root, validSpec()); const b = join(root, 'duplicate.json'); await writeFile(b, JSON.stringify(validSpec()));
    await expect(convertMany([a, b], { root })).rejects.toMatchObject({ code: 'CATALOG_INVALID', details: { instruction_id: 'write-release-note', paths: [a, b] } });
  });

  test('rejects an empty tag dimension and unknown tags unless exempted', async () => {
    const root = await makeRoot();
    const empty = await writeSpec(root, validSpec({ capability_tags: [] }));
    await expect(convert(empty, { root })).rejects.toMatchObject({ message: 'empty capability tags require an exemption', details: { dimension: 'capability' } });
    const valid = await writeSpec(root, validSpec()); await convert(valid, { root });
    const catalogPath = join(root, 'catalog.json'); const catalog = JSON.parse(await readFile(catalogPath, 'utf8')) as Record<string, any>;
    catalog.tag_dictionary.capability = {}; catalog.tag_dictionary.pattern = {};
    await writeFile(catalogPath, JSON.stringify(catalog));
    await expect(convert(valid, { root })).rejects.toMatchObject({ message: 'unknown capability tag: release-note', details: { tag: 'release-note', dimension: 'capability' } });
    catalog.tag_exemptions.push({ instruction_id: 'write-release-note', dimension: 'capability', reason: 'legacy tag' }, { instruction_id: 'write-release-note', dimension: 'pattern', reason: 'legacy tag' });
    await writeFile(catalogPath, JSON.stringify(catalog));
    await expect(convert(valid, { root })).resolves.toMatchObject({ instructionId: 'write-release-note' });
  });

  test('accepts an empty tag dimension with its exemption', async () => {
    const root = await makeRoot();
    const catalogPath = join(root, 'catalog.json');
    const catalog = JSON.parse(await readFile(catalogPath, 'utf8')) as Record<string, any>;
    catalog.tag_exemptions.push({ instruction_id: 'write-release-note', dimension: 'capability', reason: 'guidance' });
    await writeFile(catalogPath, JSON.stringify(catalog));
    await expect(convert(await writeSpec(root, validSpec({ capability_tags: [] })), { root })).resolves.toMatchObject({ instructionId: 'write-release-note' });
  });

  test('rejects empty verified_by for producing instructions and title control chars', async () => {
    expect(() => parseInstructionSpec(validSpec({ artifact_contract_verified_by: '' }), 'bad.json')).toThrow(expect.objectContaining({ message: 'invalid instruction spec field: artifact_contract_verified_by' }));
    expect(() => parseInstructionSpec(validSpec({ title: 'bad\nvalue' }), 'bad.json')).toThrow(expect.objectContaining({ message: 'control character in title' }));
    expect(() => parseInstructionSpec(validSpec({ provenance: [{ donor: 'bad\u0085donor', license: 'MIT', revision: 'a'.repeat(40), path: 'docs/release.md' }] }), 'bad.json')).toThrow(expect.objectContaining({ message: 'control character in provenance[0].donor' }));
    expect(() => parseInstructionSpec(validSpec({ artifact_contract_output_type: 'none', artifact_contract_required_data: [], artifact_contract_verified_by: '' }), 'bad.json')).not.toThrow();
  });

  test('resets donor files on revision change and rejects mixed revisions', async () => {
    const root = await makeRoot(); const source = await writeSpec(root, validSpec());
    await convert(source, { root });
    await writeSpec(root, validSpec({ provenance: [{ donor: 'sample-donor', license: 'MIT', revision: 'b'.repeat(40), path: 'docs/new.md' }] }));
    const result = await convert(source, { root });
    expect(result.mapUpdated).toBe(true);
    expect(JSON.parse(await readFile(join(root, 'corpus-map.json'), 'utf8'))).toMatchObject({ donors: { 'sample-donor': { source_revision: 'b'.repeat(40), files: { 'docs/new.md': { instruction_ids: ['write-release-note'] } } } } });
    await writeSpec(root, validSpec({ provenance: [{ donor: 'sample-donor', license: 'MIT', revision: 'b'.repeat(40), path: 'a.md' }, { donor: 'sample-donor', license: 'MIT', revision: 'c'.repeat(40), path: 'b.md' }] }));
    await expect(convert(source, { root })).rejects.toMatchObject({ message: 'provenance mixes donor revisions', details: { donor: 'sample-donor', revisions: ['bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 'cccccccccccccccccccccccccccccccccccccccc'] } });
  });

  test('rejects a repeated provenance tuple and duplicate manifest id at another path', async () => {
    const root = await makeRoot(); const duplicate = validSpec({ provenance: [validSpec().provenance[0]!, validSpec().provenance[0]!] });
    expect(() => parseInstructionSpec(duplicate, 'bad.json')).toThrow(expect.objectContaining({ message: 'duplicate provenance source', details: { provenance_index: 1 } }));
    const source = await writeSpec(root, validSpec()); await convert(source, { root });
    await writeSpec(root, validSpec({ provenance: [{ donor: 'other-donor', license: 'MIT', revision: 'b'.repeat(40), path: 'elsewhere.md' }] }));
    await expect(convert(source, { root, instructionsDir: 'alternate-instructions' })).rejects.toMatchObject({ message: 'duplicate instruction id write-release-note', details: { instruction_id: 'write-release-note', paths: ['instructions/write-release-note.md', 'alternate-instructions/write-release-note.md'] } });
  });

  test('round trips the generated digest-bound catalog', async () => {
    const root = await makeRoot(); await convert(await writeSpec(root, validSpec()), { root });
    const catalog = await loadCatalog(join(root, 'catalog.json'));
    expect((await loadInstructions(catalog, root)).has('write-release-note')).toBe(true);
  });

  test('ignores key order changes within manifest entries', async () => {
    const root = await makeRoot(); const source = await writeSpec(root, validSpec());
    await convert(source, { root });
    const manifestPath = join(root, 'catalog.json'); const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as { instructions: Array<Record<string, string>>; revision: number };
    manifest.instructions = manifest.instructions.map((entry) => ({ sha256: entry.sha256!, path: entry.path!, instruction_id: entry.instruction_id! }));
    await writeFile(manifestPath, JSON.stringify(manifest));
    expect(await convert(source, { root })).toMatchObject({ manifestUpdated: false, manifestRevision: manifest.revision });
  });
});

describe('convertMany and CLI', () => {
  test('converts every spec in the provided order', async () => {
    const root = await makeRoot();
    const first = await writeSpec(root, validSpec({ instruction_id: 'second-note' }));
    const second = join(root, 'first.json');
    await writeFile(second, JSON.stringify(validSpec({ instruction_id: 'first-note' })));
    const result = await convertMany([first, second], { root });
    expect(result.map((entry) => entry.instructionId)).toEqual(['second-note', 'first-note']);
  });

  test('converts in order and aborts invalid specs before writing that spec', async () => {
    const root = await makeRoot();
    const a = await writeSpec(root, validSpec({ instruction_id: 'first-note' }));
    const b = join(root, 'bad.json');
    await writeFile(b, JSON.stringify({ ...validSpec({ instruction_id: 'second-note' }), provenance: [] }));
    await expect(convertMany([a, b], { root })).rejects.toMatchObject({ code: 'CATALOG_INVALID', details: { field: 'provenance' } });
    expect(await readdir(join(root, 'instructions'))).toEqual(['first-note.md']);
  });

  test('CLI prints JSON results and JSON errors', async () => {
    const root = await makeRoot();
    const specPath = await writeSpec(root, { ...validSpec(), instruction_id: 'bad id' });
    const cli = join(packageRoot, 'scripts', 'convert.ts');
    const error = await runCliInProcess(['--spec', specPath, '--root', root], cli);
    expect(error.exitCode).toBe(1);
    expect(JSON.parse(error.stderr)).toMatchObject({ code: 'CATALOG_INVALID', details: { field: 'instruction_id' } });
  });

  test('in-process CLI covers every supported flag and malformed argument path', async () => {
    const root = await makeRoot();
    const specPath = await writeSpec(root, validSpec());
    const cli = join(packageRoot, 'scripts', 'convert.ts');
    expect(await runConvertCli([process.execPath, join(root, 'other.ts')], { stdout: () => {}, stderr: () => {} })).toBeUndefined();
    await writeFile(join(root, 'explicit-catalog.json'), await readFile(join(root, 'catalog.json')));
    const success = await runCliInProcess(['--spec', specPath, '--root', root, '--catalog', join(root, 'explicit-catalog.json'), '--map', join(root, 'explicit-map.json')], cli);
    expect(success.exitCode).toBe(0);
    expect(JSON.parse(success.stdout)).toHaveLength(1);
    for (const args of [[], ['--spec'], ['--spec', specPath, '--root'], ['--spec', specPath, '--catalog'], ['--spec', specPath, '--map'], ['--unknown']]) {
      const failed = await runCliInProcess(args, cli);
      expect(failed.exitCode).toBe(1);
      expect(JSON.parse(failed.stderr)).toMatchObject({ code: 'CATALOG_INVALID' });
    }
    const generic = await runCliInProcess(['--spec', root, '--root', root], cli);
    expect(generic.exitCode).toBe(1);
    expect(JSON.parse(generic.stderr)).toMatchObject({ code: 'CATALOG_INVALID' });
    const ioRoot = await makeRoot();
    const ioSpec = await writeSpec(ioRoot, validSpec());
    await mkdir(join(ioRoot, 'instructions', 'write-release-note.md'), { recursive: true });
    const ioError = await runCliInProcess(['--spec', ioSpec, '--root', ioRoot], cli);
    expect(ioError.exitCode).toBe(1);
    expect(JSON.parse(ioError.stderr)).toMatchObject({ code: 'CATALOG_INVALID', details: {} });
  });
});

test('render parsing failures are structured and leave all canonical preimages intact', async () => {
  const root = await makeRoot();
  const specPath = await writeSpec(root, validSpec());
  const before = await readFile(join(root, 'catalog.json'), 'utf8');
  const failure = Object.assign(new Error('fixture renderer failure'), { line: 17 });
  const parser = spyOn(frontmatterModule, 'parseFrontmatter').mockImplementation(() => { throw failure; });
  try {
    await expect(convert(specPath, { root })).rejects.toMatchObject({ code: 'CATALOG_INVALID', details: { field: 'frontmatter', line: 17, error: 'fixture renderer failure' } });
    expect(parser).toHaveBeenCalledWith(renderInstruction(validSpec()));
  } finally { parser.mockRestore(); }
  expect(await readFile(join(root, 'catalog.json'), 'utf8')).toBe(before);
  expect((await readdir(root)).sort()).toEqual(['catalog.json', 'config', 'spec.json']);
});

test('the default native CLI exit sink records successful execution', async () => {
  const root = await makeRoot();
  const path = await writeSpec(root, validSpec());
  const previous = process.exitCode;
  let stdout = '';
  try {
    const code = await runConvertCli([process.execPath, join(packageRoot, 'scripts/convert.ts'), '--spec', path, '--root', root], { stdout: text => { stdout += text; }, stderr: text => { throw new Error(text); } });
    expect(code).toBe(0);
    expect(process.exitCode).toBe(0);
    expect(JSON.parse(stdout)).toHaveLength(1);
  } finally { process.exitCode = previous ?? 0; }
});
