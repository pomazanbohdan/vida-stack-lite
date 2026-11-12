import { afterAll, describe, expect, test } from 'bun:test';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  catalogBrowse,
  catalogCompose,
  catalogGet,
  catalogSearch,
  catalogSearchWithProfile,
  decisionEvaluate,
  loadCatalog,
  loadInstructions,
} from '../skills/vp-mode/scripts/catalog.ts';
import type { Catalog, LoadedInstruction } from '../skills/vp-mode/scripts/catalog.ts';
import { parseFrontmatter } from '../skills/vp-mode/scripts/frontmatter.ts';
import { runCatalogCli } from '../skills/vp-mode/scripts/catalog-cli.ts';
import { topPatternFor } from '../skills/vp-mode/scripts/retrieval.ts';

const sourceFixture = fileURLToPath(new URL('./fixtures/catalog/', import.meta.url));
const powersRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const directories: string[] = [];
const digest = (value: string | Uint8Array): string => createHash('sha256').update(value).digest('hex');
const cliPath = fileURLToPath(new URL('../skills/vp-mode/scripts/catalog-cli.ts', import.meta.url));

type AtomSpec = {
  id: string; role?: string; status?: 'active' | 'disabled'; body?: string; schema?: 'VPInstruction/v1.2' | 'VPInstruction/v2';
  applicability?: unknown; approach_assessments?: string[]; approach_body_sha256?: string;
  classification_status?: 'classified' | 'unclassified'; instruction_form?: string; domains?: string[];
};

function renderAtom(spec: AtomSpec): string {
  const body = spec.body ?? `# ${spec.id}\nAtom body for ${spec.id}.\n`;
  const classified = spec.classification_status === 'classified';
  const fields: Array<[string, unknown]> = [
    ['schema', spec.schema ?? 'VPInstruction/v1.2'],
    ['classification_status', classified ? 'classified' : 'unclassified'],
    ...(classified
      ? [['instruction_form', spec.instruction_form ?? 'procedure'], ['domains', spec.domains ?? ['engineering']]] as [string, unknown][]
      : [['classification_reason', 'Synthetic module atom.']] as [string, unknown][]),
    ['instruction_id', spec.id], ['title', `Instruction ${spec.id}`], ['summary', `Guidance for ${spec.id}.`],
    ['capability_tags', ['test-design']], ['pattern_tags', ['test-first-development']],
    ['roles', spec.role === undefined ? [] : [spec.role]], ['products', []],
    ['conditions_applies_when', 'A relevant test task applies.'], ['conditions_does_not_apply_when', 'A non-test task applies.'],
    ['artifact_contract_output_type', 'test-suite'], ['artifact_contract_required_data', ['cases']], ['artifact_contract_verified_by', 'bun test'],
    ['compatibility_excludes', []], ['compatibility_requires', []],
    ['provenance', ['donor=synthetic; license=MIT; revision=1234567890123456789012345678901234567890; path=source.md']],
    ['status', spec.status ?? 'active'], ['revision', 1],
    ...('applicability' in spec ? [['applicability', spec.applicability] as [string, unknown]] : []),
    ...(spec.approach_assessments === undefined ? [] : [
      ['approach_assessments', spec.approach_assessments] as [string, unknown],
      ['approach_body_sha256', spec.approach_body_sha256 ?? digest(body)] as [string, unknown],
    ]),
  ];
  const frontmatter = fields.map(([key, value]) => Array.isArray(value)
    ? value.length === 0 ? `${key}: []` : `${key}:\n${value.map((item) => `  - ${JSON.stringify(item)}`).join('\n')}`
    : `${key}: ${JSON.stringify(value)}`).join('\n');
  return `---\n${frontmatter}\n---\n\n${body}`;
}

function createModule(moduleId: string, specs: AtomSpec[]) {
  const files = specs.map(renderAtom);
  const atoms = files.map((file, index) => {
    const parsed = parseFrontmatter(file);
    return {
      atom_id: specs[index]!.id,
      file_sha256: digest(file),
      content_sha256: digest(parsed.body),
      file_bytes: Buffer.byteLength(file, 'utf8'),
      body_bytes: Buffer.byteLength(parsed.body, 'utf8'),
    };
  });
  const body = atoms.map((atom, index) => `<!-- vpmodule:atom:begin ${atom.atom_id} -->\n${files[index]}<!-- vpmodule:atom:end ${atom.atom_id} -->`).join('\n');
  const record = {
    schema: 'VPInstructionModule/v1', instruction_id: moduleId, title: `Carrier ${moduleId}`, summary: 'Lossless module carrier.',
    source: JSON.stringify({ donor: 'synthetic', path: 'source.md' }), atom_ids: specs.map((spec) => spec.id), atom_count: specs.length,
    atoms: JSON.stringify(atoms), carrier_sha256: digest(body), carrier_bytes: Buffer.byteLength(body, 'utf8'), revision: 1, status: 'active',
  };
  const fields = [
    `schema: ${record.schema}`, `instruction_id: ${record.instruction_id}`, `title: ${JSON.stringify(record.title)}`,
    `summary: ${JSON.stringify(record.summary)}`, `source: ${JSON.stringify(record.source)}`,
    `atom_ids:\n${record.atom_ids.map((id) => `  - ${JSON.stringify(id)}`).join('\n')}`,
    `atom_count: ${record.atom_count}`, `atoms: ${JSON.stringify(record.atoms)}`,
    `carrier_sha256: ${record.carrier_sha256}`, `carrier_bytes: ${record.carrier_bytes}`,
    `revision: ${record.revision}`, `status: ${record.status}`,
  ].join('\n');
  const text = `---\n${fields}\n---\n${body}`;
  return { entry: { instruction_id: moduleId, path: `instructions/${moduleId}.md`, sha256: digest(text) }, text };
}

async function workspace(modules: Array<{ id: string; atoms: AtomSpec[] }>): Promise<{ dir: string; catalog: Catalog; instructions: Map<string, LoadedInstruction> }> {
  const dir = await mkdtemp(join(tmpdir(), 'vp-catalog-modules-'));
  directories.push(dir);
  await cp(sourceFixture, dir, { recursive: true });
  const catalog = JSON.parse(await readFile(join(dir, 'catalog.json'), 'utf8')) as Catalog;
  const instructionSchema = await readFile(join(powersRoot, 'config', 'vpinstruction.v1.2.schema.json'));
  const instructionV2Schema = await readFile(join(powersRoot, 'config', 'vpinstruction.v2.schema.json'));
  const moduleSchema = await readFile(join(powersRoot, 'config', 'vpinstructionmodule.v1.schema.json'));
  await writeFile(join(dir, 'config', 'vpinstruction.v1.2.schema.json'), instructionSchema);
  await writeFile(join(dir, 'config', 'vpinstruction.v2.schema.json'), instructionV2Schema);
  await writeFile(join(dir, 'config', 'vpinstructionmodule.v1.schema.json'), moduleSchema);
  for (const entry of catalog.instructions) {
    const path = join(dir, entry.path);
    const text = await readFile(path, 'utf8');
    const updated = text.replace('---\n', '---\nschema: VPInstruction/v1.2\nclassification_status: unclassified\nclassification_reason: Synthetic test fixture.\n');
    await writeFile(path, updated);
    entry.sha256 = digest(updated);
  }
  for (const module of modules) {
    const built = createModule(module.id, module.atoms);
    catalog.instructions.push(built.entry);
    await writeFile(join(dir, built.entry.path), built.text);
  }
  await writeFile(join(dir, 'catalog.json'), `${JSON.stringify(catalog, null, 2)}\n`);
  const loaded = await loadCatalog(join(dir, 'catalog.json'));
  return { dir, catalog: loaded, instructions: await loadInstructions(loaded, dir) };
}

afterAll(async () => { await Promise.all(directories.map((dir) => rm(dir, { recursive: true, force: true }))); });

async function inProcessCli(args: string[]): Promise<{ status: number; stdout: string; stderr: string }> {
  let stdout = '';
  let stderr = '';
  let exitCode = 0;
  const status = await runCatalogCli([process.execPath, cliPath, ...args], {
    stdout: (value) => { stdout += value; },
    stderr: (value) => { stderr += value; },
  }, (code) => { exitCode = code; });
  return { status: status ?? exitCode, stdout, stderr };
}

describe('catalog source modules', () => {
  test('loader rejects module schema, section, hash and atom collisions', async () => {
    const schemaCase = await workspace([{ id: 'module-bad-schema-c01', atoms: [{ id: 'schema-atom-a' }, { id: 'schema-atom-b' }] }]);
    const schemaEntry = schemaCase.catalog.instructions.find((entry) => entry.instruction_id === 'module-bad-schema-c01')!;
    const schemaPath = join(schemaCase.dir, schemaEntry.path);
    const invalidSchema = (await readFile(schemaPath, 'utf8')).replace('title: "Carrier module-bad-schema-c01"', 'title: ""');
    await writeFile(schemaPath, invalidSchema);
    schemaEntry.sha256 = digest(invalidSchema);
    await expect(loadInstructions(schemaCase.catalog, schemaCase.dir)).rejects.toThrow(/module schema validation failed/u);

    const sectionCase = await workspace([{ id: 'module-bad-section-c01', atoms: [{ id: 'section-atom-a' }, { id: 'section-atom-b' }] }]);
    const sectionEntry = sectionCase.catalog.instructions.find((entry) => entry.instruction_id === 'module-bad-section-c01')!;
    const sectionPath = join(sectionCase.dir, sectionEntry.path);
    const invalidSection = (await readFile(sectionPath, 'utf8')).replace('<!-- vpmodule:atom:begin section-atom-a -->\n', '');
    await writeFile(sectionPath, invalidSection);
    sectionEntry.sha256 = digest(invalidSection);
    await expect(loadInstructions(sectionCase.catalog, sectionCase.dir)).rejects.toThrow(expect.objectContaining({
      code: 'CATALOG_INVALID', details: expect.objectContaining({ code: 'MODULE_SECTION_INVALID' }),
    }));

    const hashCase = await workspace([{ id: 'module-bad-hash-c01', atoms: [{ id: 'hash-atom-a' }, { id: 'hash-atom-b' }] }]);
    const hashEntry = hashCase.catalog.instructions.find((entry) => entry.instruction_id === 'module-bad-hash-c01')!;
    const hashPath = join(hashCase.dir, hashEntry.path);
    const invalidHash = (await readFile(hashPath, 'utf8')).replace('Atom body for hash-atom-a.', 'Changed body for hash-atom-a.');
    await writeFile(hashPath, invalidHash);
    hashEntry.sha256 = digest(invalidHash);
    await expect(loadInstructions(hashCase.catalog, hashCase.dir)).rejects.toThrow(expect.objectContaining({
      code: 'CATALOG_INVALID', details: expect.objectContaining({ code: 'MODULE_HASH_MISMATCH' }),
    }));

    const collisionCase = await workspace([{ id: 'module-collision-c01', atoms: [{ id: 'collision-atom-a' }, { id: 'collision-atom-b' }] }]);
    const collisionEntry = collisionCase.catalog.instructions.find((entry) => entry.instruction_id === 'module-collision-c01')!;
    const collided = createModule('module-collision-c01', [{ id: 'alpha' }, { id: 'collision-atom-b' }]);
    await writeFile(join(collisionCase.dir, collisionEntry.path), collided.text);
    collisionEntry.sha256 = collided.entry.sha256;
    await expect(loadInstructions(collisionCase.catalog, collisionCase.dir)).rejects.toThrow(/module or atom instruction id collision/u);
  });

  test('loads v2 atoms and reports applicability and approach parser failures', async () => {
    const valid = await workspace([{ id: 'module-v2-c01', atoms: [
      { id: 'v2-atom-a', schema: 'VPInstruction/v2', applicability: '{"runtimes":[{"value":"node"}]}' },
      { id: 'v2-atom-b', schema: 'VPInstruction/v2', applicability: '{"runtimes":[{"value":"node"}]}' },
    ] }]);
    expect(valid.instructions.get('v2-atom-a')?.applicabilityDeclaration).toBeDefined();

    const applicabilityCase = await workspace([{ id: 'module-v2-app-c01', atoms: [{ id: 'v2-app-atom-a' }, { id: 'v2-app-atom-b' }] }]);
    await replaceModule(applicabilityCase, 'module-v2-app-c01', [
      { id: 'v2-app-atom-a', schema: 'VPInstruction/v2', applicability: 'not-json' }, { id: 'v2-app-atom-b' },
    ]);
    await expect(loadInstructions(applicabilityCase.catalog, applicabilityCase.dir)).rejects.toThrow(/applicability is invalid/u);

    const nonStringCase = await workspace([{ id: 'module-v2-type-c01', atoms: [{ id: 'v2-type-atom-a' }, { id: 'v2-type-atom-b' }] }]);
    const schemaPath = join(nonStringCase.dir, 'config', 'vpinstruction.v2.schema.json');
    const schema = JSON.parse(await readFile(schemaPath, 'utf8')) as { properties: Record<string, unknown> };
    schema.properties.applicability = {};
    await writeFile(schemaPath, JSON.stringify(schema));
    await replaceModule(nonStringCase, 'module-v2-type-c01', [
      { id: 'v2-type-atom-a', schema: 'VPInstruction/v2', applicability: 5 }, { id: 'v2-type-atom-b' },
    ]);
    await expect(loadInstructions(nonStringCase.catalog, nonStringCase.dir)).rejects.toThrow(/applicability must be a string/u);

    const approachCase = await workspace([{ id: 'module-approach-c01', atoms: [{ id: 'approach-atom-a' }, { id: 'approach-atom-b' }] }]);
    await replaceModule(approachCase, 'module-approach-c01', [
      { id: 'approach-atom-a', approach_assessments: ['malformed'] }, { id: 'approach-atom-b' },
    ]);
    await expect(loadInstructions(approachCase.catalog, approachCase.dir)).rejects.toThrow(/instruction approach assessments are invalid/u);
  });

  test('loads module and atoms, searches once with member hits, gets an atom, and rejects carrier get', async () => {
    const { catalog, instructions } = await workspace([{ id: 'module-sample-c01', atoms: [
      { id: 'sample-atom-alpha', role: 'backend' }, { id: 'sample-atom-beta', role: 'frontend' }, { id: 'sample-atom-disabled', role: 'backend', status: 'disabled' },
    ] }]);
    const module = instructions.get('module-sample-c01');
    expect(module?.content).toBe('');
    expect(module?.moduleAtoms).toEqual(['sample-atom-alpha', 'sample-atom-beta', 'sample-atom-disabled']);
    expect(instructions.get('sample-atom-alpha')?.moduleId).toBe('module-sample-c01');
    const matches = catalogSearch(catalog, instructions, { instruction_ids: ['module-sample-c01'], roles: ['backend'] });
    expect(matches.map((item) => item.instruction_id)).toEqual(['module-sample-c01']);
    expect(matches[0]?.members).toEqual([
      { atom_id: 'sample-atom-alpha', matched: true }, { atom_id: 'sample-atom-beta', matched: false },
    ]);
    const exact = catalogSearch(catalog, instructions, { instruction_ids: ['sample-atom-beta'] });
    expect(exact[0]?.members?.map((item) => item.atom_id)).toEqual(['sample-atom-beta']);
    expect(catalogGet(catalog, instructions, 'sample-atom-alpha').content).toContain('Atom body for sample-atom-alpha.');
    expect(() => catalogGet(catalog, instructions, 'module-sample-c01')).toThrow(expect.objectContaining({
      code: 'CATALOG_MODULE_ATOM_REQUIRED', details: { module_id: 'module-sample-c01', atom_ids: module?.moduleAtoms },
    }));
    expect(() => catalogGet(catalog, instructions, 'sample-atom-disabled')).toThrow(expect.objectContaining({ code: 'CATALOG_INSTRUCTION_DISABLED' }));
  });

  test('compose expands only matched active atoms and rejects a required module ID', async () => {
    const { catalog, instructions } = await workspace([{ id: 'module-sample-c01', atoms: [
      { id: 'sample-atom-alpha', role: 'backend' }, { id: 'sample-atom-beta', role: 'frontend' }, { id: 'sample-atom-disabled', role: 'backend', status: 'disabled' },
    ] }]);
    const bundle = catalogCompose(catalog, instructions, { instruction_ids: ['module-sample-c01'], roles: ['backend'] });
    expect(bundle.instructions.map((item) => item.instruction_id)).toEqual(['sample-atom-alpha']);
    expect(bundle.instructions[0]?.content).toContain('Atom body for sample-atom-alpha.');
    expect(() => catalogCompose(catalog, instructions, { required_ids: ['module-sample-c01'] })).toThrow(expect.objectContaining({
      code: 'CATALOG_MODULE_ATOM_REQUIRED', details: { module_id: 'module-sample-c01', atom_ids: ['sample-atom-alpha', 'sample-atom-beta', 'sample-atom-disabled'] },
    }));
    expect(decisionEvaluate(catalog, instructions, { operation: 'choose', candidates: ['module-sample-c01'] })).toMatchObject({
      selected: [], fallback: true, fallbackReason: 'candidate-not-allowed', rationale: expect.stringContaining('choose an atom ID'),
    });
  });

  test('compose rejects module carriers in ordinary and canonical-profile dependency closure', async () => {
    const { catalog, instructions } = await workspace([{ id: 'module-dependency-c01', atoms: [
      { id: 'dependency-atom-alpha' }, { id: 'dependency-atom-beta' },
    ] }]);
    const atom = instructions.get('dependency-atom-alpha')!;
    atom.compatibility.requires = ['module-dependency-c01'];
    expect(() => catalogCompose(catalog, instructions, { required_ids: [atom.instruction_id] })).toThrow(expect.objectContaining({
      code: 'CATALOG_MODULE_ATOM_REQUIRED', details: expect.objectContaining({ module_id: 'module-dependency-c01' }),
    }));

    const dependency = instructions.get(catalog.instructions[0]!.instruction_id)!;
    dependency.pattern_tags = ['approval-policy-choice-gate'];
    atom.compatibility.requires = [dependency.instruction_id];
    instructions.set('proceed-without-waiting-for-confirmation', {
      ...instructions.get('module-dependency-c01')!,
      instruction_id: 'proceed-without-waiting-for-confirmation',
      pattern_tags: ['approval-policy-choice-proceed'],
    });
    const profile = {
      schema: 'VPEffectiveProfile/v1' as const,
      groups: { 'approval-policy': { active: 'approval-policy-choice-proceed', alternatives: ['approval-policy-choice-proceed', 'approval-policy-choice-gate'] } },
      unresolved_groups: {},
    };
    expect(() => catalogCompose(catalog, instructions, { required_ids: [atom.instruction_id], profile })).toThrow(expect.objectContaining({
      code: 'CATALOG_MODULE_ATOM_REQUIRED', details: expect.objectContaining({ module_id: 'proceed-without-waiting-for-confirmation' }),
    }));
  });

  test('profile search retains only matched active module members and builds a classified carrier', async () => {
    const { catalog, instructions } = await workspace([{ id: 'module-classified-c01', atoms: [
      { id: 'classified-atom-a', role: 'backend', classification_status: 'classified', instruction_form: 'procedure', domains: ['engineering'] },
      { id: 'classified-atom-b', role: 'frontend', classification_status: 'classified', instruction_form: 'procedure', domains: ['engineering'] },
    ] }]);
    expect(instructions.get('module-classified-c01')?.classification).toMatchObject({ classification_status: 'classified', instruction_form: 'procedure', domains: ['engineering'] });
    const results = catalogSearchWithProfile(catalog, instructions, { instruction_ids: ['module-classified-c01'], roles: ['backend'] }, {
      schema: 'VPEffectiveProfile/v1', groups: {}, unresolved_groups: {},
    });
    expect(results).toHaveLength(1);
    expect(results[0]?.members).toEqual([{ atom_id: 'classified-atom-a', matched: true }]);
  });

  test('classifies a module when member domain sets use different orders', async () => {
    const { instructions } = await workspace([{ id: 'module-domain-order-c01', atoms: [
      { id: 'domain-order-atom-a', classification_status: 'classified', instruction_form: 'procedure', domains: ['engineering', 'operations'] },
      { id: 'domain-order-atom-b', classification_status: 'classified', instruction_form: 'procedure', domains: ['operations', 'engineering'] },
    ] }]);
    expect(instructions.get('module-domain-order-c01')?.classification).toEqual({
      classification_status: 'classified', instruction_form: 'procedure', domains: ['engineering', 'operations'],
    });
  });

  test('in-process catalog CLI searches, gets and composes module atoms', async () => {
    const { dir } = await workspace([{ id: 'module-cli-c01', atoms: [{ id: 'cli-atom-alpha' }, { id: 'cli-atom-beta' }] }]);
    const catalogPath = join(dir, 'catalog.json');
    const search = await inProcessCli(['search', '--catalog', catalogPath, '--id', 'module-cli-c01']);
    expect(search.status).toBe(0);
    expect(search.stdout).toContain('module-cli-c01');
    expect(search.stdout).toContain('cli-atom-alpha');

    const get = await inProcessCli(['get', '--catalog', catalogPath, '--id', 'cli-atom-alpha']);
    expect(get.status).toBe(0);
    expect(JSON.parse(get.stdout)).toMatchObject({ instruction_id: 'cli-atom-alpha', content: expect.stringContaining('Atom body for cli-atom-alpha.') });

    const compose = await inProcessCli(['compose', '--catalog', catalogPath, '--required', 'cli-atom-beta']);
    expect(compose.status).toBe(0);
    expect(JSON.parse(compose.stdout).instructions.map((item: { instruction_id: string }) => item.instruction_id)).toEqual(['cli-atom-beta']);

    const carrierGet = await inProcessCli(['get', '--catalog', catalogPath, '--id', 'module-cli-c01']);
    expect(carrierGet.status).toBe(1);
    expect(carrierGet.stderr).toContain('is a carrier; select one of its atom IDs');
  });

  test('browse lists a carrier once and retrieval frequencies count its atom group once', async () => {
    const { catalog, instructions } = await workspace([{ id: 'module-sample-c01', atoms: [
      { id: 'sample-atom-alpha' }, { id: 'sample-atom-beta' }, { id: 'sample-atom-gamma' },
    ] }]);
    const browse = catalogBrowse(catalog, instructions);
    expect(browse.unclassified.instruction_ids.filter((id) => id === 'module-sample-c01')).toHaveLength(1);
    expect(browse.unclassified.instruction_ids).not.toContain('sample-atom-alpha');
    const base = instructions.get('alpha');
    if (base === undefined) throw new Error('fixture base instruction missing');
    const synthetic = new Map<string, LoadedInstruction>([
      ['module-carrier', { ...base, instruction_id: 'module-carrier', moduleAtoms: ['atom-1', 'atom-2', 'atom-3', 'atom-4', 'atom-5'], capability_tags: ['test-design'], pattern_tags: ['test-first-development'] }],
      ['atom-1', { ...base, instruction_id: 'atom-1', moduleId: 'module-carrier', capability_tags: ['test-design'], pattern_tags: ['test-first-development'] }],
      ['atom-2', { ...base, instruction_id: 'atom-2', moduleId: 'module-carrier', capability_tags: ['test-design'], pattern_tags: ['test-first-development'] }],
      ['atom-3', { ...base, instruction_id: 'atom-3', moduleId: 'module-carrier', capability_tags: ['test-design'], pattern_tags: ['test-first-development'] }],
      ['atom-4', { ...base, instruction_id: 'atom-4', moduleId: 'module-carrier', capability_tags: ['test-design'], pattern_tags: ['test-first-development'] }],
      ['atom-5', { ...base, instruction_id: 'atom-5', moduleId: 'module-carrier', capability_tags: ['test-design'], pattern_tags: ['test-first-development'] }],
      ['other-1', { ...base, instruction_id: 'other-1', capability_tags: ['test-design'], pattern_tags: ['test-after-development'] }],
      ['other-2', { ...base, instruction_id: 'other-2', capability_tags: ['test-design'], pattern_tags: ['test-after-development'] }],
      ['other-3', { ...base, instruction_id: 'other-3', capability_tags: ['test-design'], pattern_tags: ['test-after-development'] }],
      ['other-4', { ...base, instruction_id: 'other-4', capability_tags: ['test-design'], pattern_tags: ['test-after-development'] }],
    ]);
    expect(topPatternFor(synthetic, 'test-design')).toBe('test-after-development');
  });

  test('counts atomic members against 20 and 64,000 byte compose limits', async () => {
    const atomSpecs = Array.from({ length: 21 }, (_, index) => ({ id: `member-atom-${String(index + 1).padStart(2, '0')}` }));
    const modules = [
      { id: 'module-pack-c01', atoms: atomSpecs.slice(0, 8) },
      { id: 'module-pack-c02', atoms: atomSpecs.slice(8, 16) },
      { id: 'module-pack-c03', atoms: atomSpecs.slice(16, 21) },
    ];
    const countWorkspace = await workspace(modules);
    expect(() => catalogCompose(countWorkspace.catalog, countWorkspace.instructions, { required_ids: atomSpecs.map((item) => item.id) })).toThrow(expect.objectContaining({
      code: 'CATALOG_BUNDLE_LIMIT_EXCEEDED', details: expect.objectContaining({ instruction_count: 21, max_instructions: 20 }),
    }));

    const exactBody = `${'x'.repeat(63_999)}\n`;
    const byteWorkspace = await workspace([{ id: 'module-byte-c01', atoms: [
      { id: 'byte-atom-large', body: exactBody }, { id: 'byte-atom-small', body: '# Small.\n' },
    ] }]);
    const exact = catalogCompose(byteWorkspace.catalog, byteWorkspace.instructions, { required_ids: ['byte-atom-large'] });
    expect(Buffer.byteLength(exact.instructions[0]?.content ?? '', 'utf8')).toBe(64_000);
    const overWorkspace = await workspace([{ id: 'module-over-c01', atoms: [
      { id: 'over-atom-large', body: `${'x'.repeat(64_000)}\n` }, { id: 'over-atom-small', body: '# Small.\n' },
    ] }]);
    expect(() => catalogCompose(overWorkspace.catalog, overWorkspace.instructions, { required_ids: ['over-atom-large'] })).toThrow(expect.objectContaining({
      code: 'CATALOG_BUNDLE_LIMIT_EXCEEDED', details: expect.objectContaining({ instruction_text_bytes: 64_001, max_instruction_text_bytes: 64_000 }),
    }));
  });
});

async function replaceModule(
  context: { dir: string; catalog: Catalog },
  moduleId: string,
  atoms: AtomSpec[],
): Promise<void> {
  const entry = context.catalog.instructions.find((candidate) => candidate.instruction_id === moduleId);
  if (entry === undefined) throw new Error(`module fixture missing: ${moduleId}`);
  const built = createModule(moduleId, atoms);
  await writeFile(join(context.dir, entry.path), built.text);
  entry.sha256 = built.entry.sha256;
}
