import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import * as filesystem from 'node:fs';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkCorpus, corpusCli, runCorpusCli, startCorpusCli } from '../scripts/check-corpus.ts';

type Instruction = {
  schema: string; classification_status: string; classification_reason: string;
  instruction_id: string; title: string; summary: string; capability_tags: string[]; pattern_tags: string[];
  conditions_applies_when: string; conditions_does_not_apply_when: string;
  artifact_contract_output_type: string; artifact_contract_required_data: string[]; artifact_contract_verified_by: string;
  compatibility_excludes: string[]; compatibility_requires: string[]; provenance: string[]; status: string; revision: number;
};
type Corpus = { root: string; catalog: any; map: any; instructions: Instruction[]; save: () => Promise<void> };

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bun = process.execPath;
const revision = '1234567890123456789012345678901234567890';
const donorId = 'synthetic-donor';
const donorFile = 'source.md';
const cloneRoot = join('.tmp', 'donors', 'synthetic');
const tempRoots: string[] = [];
const realCorpusOptIn = process.env.VP_REAL_CORPUS_TESTS === '1';

function defaultInstruction(id = 'alpha-instruction'): Instruction {
  return {
    schema: 'VPInstruction/v1.2', classification_status: 'unclassified', classification_reason: 'Not assessed.',
    instruction_id: id, title: 'Alpha instruction', summary: 'Synthetic test instruction.',
    capability_tags: ['write-tests-first'], pattern_tags: ['test-first-development'],
    conditions_applies_when: 'A test applies.', conditions_does_not_apply_when: 'A test does not apply.',
    artifact_contract_output_type: 'test-suite', artifact_contract_required_data: ['cases'],
    artifact_contract_verified_by: 'bun test', compatibility_excludes: [], compatibility_requires: [],
    provenance: [`donor=${donorId}; license=MIT; revision=${revision}; path=${donorFile}`], status: 'active', revision: 1,
  };
}

function renderInstruction(item: Instruction): string {
  const fields: Array<[string, string | string[] | number]> = Object.entries(item) as Array<[string, string | string[] | number]>;
  const frontmatter = fields.map(([key, value]) => {
    if (Array.isArray(value)) return value.length === 0 ? `${key}: []` : `${key}:\n${value.map((entry) => `  - ${JSON.stringify(entry)}`).join('\n')}`;
    return `${key}: ${JSON.stringify(value)}`;
  }).join('\n');
  return `---\n${frontmatter}\n---\n\n# ${item.title}\nSynthetic guidance.\n`;
}

function digest(text: string | Uint8Array): string { return createHash('sha256').update(text).digest('hex'); }

async function fixture(options: { twoInstructions?: boolean; root?: string; localRoot?: string } = {}): Promise<Corpus> {
  const root = options.root ?? await mkdtemp(join(tmpdir(), 'vp-corpus-fixture-'));
  tempRoots.push(root);
  const instructions = [defaultInstruction()];
  if (options.twoInstructions) instructions.push({ ...defaultInstruction('beta-instruction'), title: 'Beta instruction' });
  const markdown = new Map(instructions.map((item) => [item.instruction_id, renderInstruction(item)]));
  const catalog: any = {
    schema: 'VPCatalog/v1', catalog_id: 'synthetic', revision: 1, source_revision: revision, updated_at: '2026-10-20',
    tag_dictionary: { capability: { 'write-tests-first': 'Write tests first.' }, pattern: { 'test-first-development': 'Use test first.' } },
    tag_aliases: {}, tag_exemptions: [],
    instructions: instructions.map((item) => ({ instruction_id: item.instruction_id, path: `instructions/${item.instruction_id}.md`, sha256: digest(markdown.get(item.instruction_id) as string) })),
  };
  const map: any = {
    schema: 'VPCorpusMap/v1', revision: 1, updated_at: '2026-10-20', donors: {
      [donorId]: { source_revision: revision, files: { [donorFile]: options.twoInstructions
        ? { status: 'split', instruction_ids: instructions.map((item) => item.instruction_id) }
        : { status: 'converted', instruction_ids: [instructions[0]?.instruction_id] } } },
    },
  };
  const save = async (): Promise<void> => {
    await mkdir(join(root, 'instructions'), { recursive: true });
    await writeFile(join(root, 'catalog.json'), `${JSON.stringify(catalog, null, 2)}\n`);
    await writeFile(join(root, 'corpus-map.json'), `${JSON.stringify(map, null, 2)}\n`);
    await writeFile(join(root, 'donors.yaml'), `schema: vida-powers-donors/v1\nlocal_root: ${options.localRoot ?? '.tmp/donors'}\ndonors:\n  - id: ${donorId}\n    local_path: synthetic\n    head_sha: '${revision}'\n    license: MIT\n`);
  };
  await mkdir(join(root, cloneRoot), { recursive: true });
  await writeFile(join(root, cloneRoot, donorFile), 'synthetic donor source\n');
  await save();
  for (const item of instructions) await writeFile(join(root, 'instructions', `${item.instruction_id}.md`), markdown.get(item.instruction_id) as string);
  return { root, catalog, map, instructions, save };
}

async function rewriteInstruction(corpus: Corpus, item: Instruction): Promise<void> {
  const text = renderInstruction(item);
  await writeFile(join(corpus.root, 'instructions', `${item.instruction_id}.md`), text);
  const entry = corpus.catalog.instructions.find((candidate: any) => candidate.instruction_id === item.instruction_id);
  if (entry) entry.sha256 = digest(text);
  await corpus.save();
}

async function addFacetFields(corpus: Corpus, id: string, fields: string): Promise<void> {
  const entry = corpus.catalog.instructions.find((candidate: any) => candidate.instruction_id === id);
  if (entry === undefined) throw new Error(`fixture instruction ${id} is missing`);
  const path = join(corpus.root, entry.path);
  const source = readFileSync(path, 'utf8');
  const firstLine = source.indexOf('\n');
  if (firstLine < 0) throw new Error(`fixture instruction ${id} has no frontmatter delimiter`);
  const updated = `${source.slice(0, firstLine + 1)}${fields}\n${source.slice(firstLine + 1)}`;
  await writeFile(path, updated);
  entry.sha256 = digest(updated);
  await corpus.save();
}

function codes(root: string): string[] { return checkCorpus(root).map((issue) => issue.code).sort(); }

async function expectCodes(corpus: Corpus, expected: string[]): Promise<void> {
  await corpus.save();
  expect(codes(corpus.root)).toEqual([...expected].sort());
}

function snapshot(root: string): Array<{ path: string; mtime: number; digest: string }> {
  const files: Array<{ path: string; mtime: number; digest: string }> = [];
  const visit = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      const stat = statSync(path);
      if (stat.isDirectory()) visit(path);
      else files.push({ path: path.slice(root.length + 1), mtime: stat.mtimeMs, digest: digest(readFileSync(path)) });
    }
  };
  visit(root);
  return files.sort((left, right) => left.path.localeCompare(right.path));
}

afterEach(async () => { await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

describe('checkCorpus synthetic fixtures', () => {
  test('v1.2 rejects old markers and malformed or stale approach assessments', async () => {
    const corpus = await fixture();
    const item = corpus.instructions[0]!;
    for (const marker of ['VPInstruction/v1.1', 'VPInstruction/v2']) {
      item.schema = marker;
      await rewriteInstruction(corpus, item);
      expect(codes(corpus.root)).toContain('CORPUS_INSTRUCTION_VERSION_UNSUPPORTED');
    }
    item.schema = 'VPInstruction/v1.2';
    await rewriteInstruction(corpus, item);
    await addFacetFields(corpus, item.instruction_id, `approach_assessments:\n  - "dimension=execution; state=declared; values=solo; evidence=body:0-1"\napproach_body_sha256: ${'0'.repeat(64)}`);
    expect(codes(corpus.root)).toContain('CORPUS_INSTRUCTION_APPROACH_INVALID');
  });
  test('accepts a fully synthetic corpus without external clones', async () => {
    const corpus = await fixture();
    expect(codes(corpus.root)).toEqual([]);
  });

  test('resolves a repository-relative local_root from the repository root', async () => {
    const repository = await mkdtemp(join(tmpdir(), 'vp-corpus-repository-'));
    tempRoots.push(repository);
    const root = join(repository, 'packages', 'powers');
    const corpus = await fixture({ root, localRoot: 'packages/powers/.tmp/donors' });
    expect(checkCorpus(corpus.root)).toEqual([]);
    expect(corpusCli(['--root', corpus.root])).toMatchObject({ instructions: 1, exitCode: 0, issues: [] });
  });

  test('v1.2 validation checks catalog digests', async () => {
    const corpus = await fixture({ twoInstructions: true });
    expect(checkCorpus(corpus.root)).toEqual([]);
    expect(corpusCli(['--root', corpus.root])).toMatchObject({ instructions: 2, exitCode: 0, issues: [] });
    corpus.catalog.instructions[0].sha256 = '0'.repeat(64);
    await corpus.save();
    const stale = checkCorpus(corpus.root);
    expect(stale.map(item => item.code)).toContain('CORPUS_DIGEST_MISMATCH');
  });

  test('rejects unknown schema markers and malformed v1.1 classification states', async () => {
    const unknown = await fixture();
    unknown.instructions[0]!.schema = 'VPInstruction/v2';
    await rewriteInstruction(unknown, unknown.instructions[0]!);
    expect(checkCorpus(unknown.root).map((item) => item.code)).toContain('CORPUS_INSTRUCTION_VERSION_UNSUPPORTED');

    const invalid = await fixture();
    invalid.instructions[0]!.classification_reason = '   ';
    await rewriteInstruction(invalid, invalid.instructions[0]!);
    const codesFound = checkCorpus(invalid.root).map((item) => item.code);
    expect(codesFound).toContain('CORPUS_INSTRUCTION_SCHEMA_INVALID');
    expect(codesFound).toContain('CORPUS_INSTRUCTION_CLASSIFICATION_INVALID');
  });

  test('an unreadable facet schema fails closed for every strict disposition', async () => {
    const corpus = await fixture({ twoInstructions: true });
    const schemaPath = join(packageRoot, 'config/vpinstruction.v1.2.schema.json');
    const realRead = filesystem.readFileSync;
    const fault = spyOn(filesystem, 'readFileSync').mockImplementation(new Proxy(realRead, { apply(read, receiver: unknown, args: unknown[]) {
      if (args[0] === schemaPath) throw new Error('facet schema read denied');
      return Reflect.apply(read, receiver, args);
    } }));
    try {
      const issues = checkCorpus(corpus.root);
      expect(issues.map(item => item.code)).toContain('CORPUS_FILESYSTEM_ERROR');
    } finally {
      fault.mockRestore();
    }
    expect(checkCorpus(corpus.root)).toEqual([]);
  });

  test('validates source methodology profiles against schema, corpus, pattern tags, decisions, and unique ownership', async () => {
    const corpus = await fixture();
    await mkdir(join(corpus.root, 'config'), { recursive: true });
    const schema = readFileSync(join(packageRoot, 'config/vpmethodologyprofile.v1.schema.json'));
    await writeFile(join(corpus.root, 'config/vpmethodologyprofile.v1.schema.json'), schema);
    const profilePath = join(corpus.root, 'config/methodology-profile.json');
    corpus.catalog.tag_dictionary.pattern['code-review'] = 'Review code.';
    corpus.catalog.tag_dictionary.pattern['review-policy'] = 'Review policy.';
    await corpus.save();
    const valid = { schema: 'VPMethodologyProfile/v1', groups: [{ id: 'policy', title: 'Policy', description: 'Policy choice.', user_decision: true, alternatives: [
      { id: 'code-review', title: 'First', description: 'First policy.', instruction_ids: [] },
      { id: 'review-policy', title: 'Second', description: 'Second policy.', instruction_ids: [] },
    ] }, { id: 'testing', title: 'Testing', description: 'Testing policy.', user_decision: false, default: 'test-first-development', alternatives: [
      { id: 'test-first-development', title: 'First', description: 'First policy.', instruction_ids: ['alpha-instruction'] },
    ] }] };
    await writeFile(profilePath, JSON.stringify(valid));
    expect(codes(corpus.root)).toEqual([]);
    for (const duplicate of [
      { ...valid, groups: [...valid.groups, valid.groups[0]!] },
      { ...valid, groups: valid.groups.map((item, index) => index === 0 ? { ...item, alternatives: [...item.alternatives, item.alternatives[0]!] } : item) },
      { ...valid, groups: valid.groups.map((item, index) => index === 0 ? { ...item, alternatives: [...item.alternatives, valid.groups[1]!.alternatives[0]!] } : item) },
    ]) {
      await writeFile(profilePath, JSON.stringify(duplicate));
      expect(codes(corpus.root)).toContain(duplicate.groups[2] ? 'CORPUS_PROFILE_GROUP_DUPLICATE' : 'CORPUS_PROFILE_ALTERNATIVE_DUPLICATE');
    }
    const invalidSchema = { ...valid, extra: true };
    await writeFile(profilePath, JSON.stringify(invalidSchema));
    expect(codes(corpus.root)).toContain('CORPUS_PROFILE_INVALID');
    const invalid = structuredClone(valid);
    const group = invalid.groups[0];
    const firstAlternative = group?.alternatives[0];
    if (group === undefined || firstAlternative === undefined) throw new Error('profile fixture alternatives missing');
    firstAlternative.instruction_ids = ['missing'];
    firstAlternative.id = 'missing-pattern';
    group.alternatives = [firstAlternative];
    await writeFile(profilePath, JSON.stringify(invalid));
    const found = checkCorpus(corpus.root).map((item) => item.code);
    expect(found).toContain('CORPUS_PROFILE_INSTRUCTION_UNKNOWN');
    expect(found).toContain('CORPUS_PROFILE_TAG_UNKNOWN');
    expect(found).toContain('CORPUS_PROFILE_DECISION_INVALID');
    firstAlternative.instruction_ids = ['alpha-instruction'];
    group.alternatives.push({ id: 'test-first-development', title: 'Other', description: 'Other.', instruction_ids: ['alpha-instruction'] });
    await writeFile(profilePath, JSON.stringify(invalid));
    expect(checkCorpus(corpus.root).map((item) => item.code)).toContain('CORPUS_PROFILE_INSTRUCTION_DUPLICATE');
    const missingDefault = structuredClone(valid);
    const missingDefaultGroup = missingDefault.groups[1];
    if (missingDefaultGroup !== undefined) Reflect.deleteProperty(missingDefaultGroup, 'default');
    await writeFile(profilePath, JSON.stringify(missingDefault));
    expect(checkCorpus(corpus.root).map((item) => item.code)).toContain('CORPUS_PROFILE_POLICY_DEFAULT_INVALID');
    const userDefault = structuredClone(valid);
    userDefault.groups[0]!.default = 'test-first-development';
    await writeFile(profilePath, JSON.stringify(userDefault));
    expect(checkCorpus(corpus.root).map((item) => item.code)).toContain('CORPUS_PROFILE_POLICY_DEFAULT_INVALID');
  });

  test.each(['disabled', 'untagged'])('rejects %s instructions in canonical alternative mappings', async condition => {
    const corpus = await fixture();
    await mkdir(join(corpus.root, 'config'), { recursive: true });
    await writeFile(join(corpus.root, 'config/methodology-profile.json'), JSON.stringify({ schema: 'VPMethodologyProfile/v1', groups: [{
      id: 'testing', title: 'Testing', description: 'Testing policy.', user_decision: false, default: 'test-first-development', alternatives: [
        { id: 'test-first-development', title: 'First', description: 'First policy.', instruction_ids: ['alpha-instruction'] },
      ],
    }] }));
    expect(checkCorpus(corpus.root).filter(item => item.code.startsWith('CORPUS_PROFILE_'))).toEqual([]);
    const instruction = corpus.instructions[0];
    if (instruction === undefined) throw new Error('Missing fixture instruction');
    if (condition === 'disabled') instruction.status = 'disabled';
    else instruction.pattern_tags = [];
    await rewriteInstruction(corpus, instruction);
    expect(checkCorpus(corpus.root)).toContainEqual(expect.objectContaining({
      code: condition === 'disabled' ? 'CORPUS_PROFILE_INSTRUCTION_DISABLED' : 'CORPUS_PROFILE_INSTRUCTION_TAG_MISMATCH',
      details: expect.objectContaining({ group_id: 'testing', alternative_id: 'test-first-development', instruction_id: 'alpha-instruction' }),
    }));
  });

  test('reports a donor carrier file missing from the corpus map', async () => {
    const corpus = await fixture();
    await writeFile(join(corpus.root, cloneRoot, 'unmapped.md'), 'unprocessed donor source\n');
    const coverage = checkCorpus(corpus.root).filter((item) => item.code === 'CORPUS_MAP_COVERAGE_MISSING');
    expect(coverage).toHaveLength(1);
    expect(coverage[0]).toMatchObject({ details: { donor: donorId, path: 'unmapped.md' } });
    expect(coverage[0]?.message).toContain('unmapped.md');
  });

  test('limits donor coverage to donors present in the corpus map', async () => {
    const corpus = await fixture();
    await writeFile(join(corpus.root, cloneRoot, 'unmapped.md'), 'unprocessed donor source\n');
    await writeFile(join(corpus.root, 'donors.yaml'), `schema: vida-powers-donors/v1\nlocal_root: .tmp/donors\ndonors:\n  - id: ${donorId}\n    local_path: synthetic\n    head_sha: '${revision}'\n    license: MIT\n  - id: later-donor\n    local_path: not-processed\n    head_sha: '${revision}'\n    license: MIT\n`);
    const issues = checkCorpus(corpus.root);
    expect(issues.filter((item) => item.code === 'CORPUS_MAP_COVERAGE_MISSING')).toMatchObject([
      { details: { donor: donorId, path: 'unmapped.md' } },
    ]);
    expect(issues.some((item) => item.details?.donor === 'later-donor' && ['CORPUS_MAP_COVERAGE_MISSING', 'CORPUS_MAP_COVERAGE_UNKNOWN', 'CORPUS_CLONE_MISSING'].includes(item.code))).toBe(false);
  });

  test('reports a corpus map record absent from the donor clone', async () => {
    const corpus = await fixture();
    corpus.map.donors[donorId].files['not-in-clone.md'] = { status: 'rejected', reason: 'Not a carrier.' };
    await corpus.save();
    const coverage = checkCorpus(corpus.root).filter((item) => item.code === 'CORPUS_MAP_COVERAGE_UNKNOWN');
    expect(coverage).toHaveLength(1);
    expect(coverage[0]).toMatchObject({ details: { donor: donorId, path: 'not-in-clone.md' } });
    expect(coverage[0]?.message).toContain('not-in-clone.md');
  });

  test('accepts map records for every donor carrier file', async () => {
    const corpus = await fixture();
    await writeFile(join(corpus.root, cloneRoot, 'second.md'), 'second donor source\n');
    corpus.map.donors[donorId].files['second.md'] = { status: 'rejected', reason: 'No instruction content.' };
    await corpus.save();
    const coverage = checkCorpus(corpus.root).filter((item) => item.code.startsWith('CORPUS_MAP_COVERAGE_'));
    expect(coverage).toEqual([]);
  });

  test('reports one clone-missing issue per donor when clone is unavailable', async () => {
    const corpus = await fixture();
    await rm(join(corpus.root, cloneRoot), { recursive: true });
    const coverage = checkCorpus(corpus.root).filter((item) => item.code === 'CORPUS_CLONE_MISSING');
    expect(coverage).toHaveLength(1);
    expect(coverage[0]?.details?.donor).toBe(donorId);
  });

  test('reports a donor clone path that is a file', async () => {
    const corpus = await fixture();
    await rm(join(corpus.root, cloneRoot), { recursive: true });
    await writeFile(join(corpus.root, cloneRoot), 'not a directory');
    expect(checkCorpus(corpus.root).some((item) => item.code === 'CORPUS_FILESYSTEM_ERROR' && item.details?.donor === donorId)).toBe(true);
  });

  test('allows two instructions to share one donor source recorded as split', async () => {
    const corpus = await fixture({ twoInstructions: true });
    expect(corpus.map.donors[donorId].files[donorFile].status).toBe('split');
    expect(codes(corpus.root)).toEqual([]);
  });

  test('rejects manifest identity that differs from the path basename', async () => {
    const corpus = await fixture(); corpus.catalog.instructions[0].instruction_id = 'renamed-id';
    await expectCodes(corpus, ['CORPUS_INSTRUCTION_ID_MISMATCH']);
    const identity = checkCorpus(corpus.root).find((item) => item.code === 'CORPUS_INSTRUCTION_ID_MISMATCH');
    expect(identity?.details).toMatchObject({ instruction_id: 'renamed-id', filename: 'alpha-instruction' });
  });

  test('does not treat normalized manifest path spelling as an identity mismatch', async () => {
    const corpus = await fixture();
    corpus.catalog.instructions[0].path = 'instructions/./alpha-instruction.md';
    await corpus.save();
    expect(codes(corpus.root)).not.toContain('CORPUS_INSTRUCTION_ID_MISMATCH');
  });

  test('rejects frontmatter identity that differs from the filename', async () => {
    const corpus = await fixture(); const item = { ...corpus.instructions[0] as Instruction, instruction_id: 'wrong-id' };
    const text = renderInstruction(item); await writeFile(join(corpus.root, 'instructions/alpha-instruction.md'), text);
    await expectCodes(corpus, ['CORPUS_DIGEST_MISMATCH', 'CORPUS_INSTRUCTION_ID_MISMATCH']);
  });

  test('reports invalid frontmatter without throwing', async () => {
    const corpus = await fixture();
    const malformed = '---\ninvalid frontmatter\n---\n';
    await writeFile(join(corpus.root, 'instructions/alpha-instruction.md'), malformed);
    corpus.catalog.instructions[0].sha256 = digest(malformed);
    await expectCodes(corpus, ['CORPUS_FRONTMATTER_INVALID', 'CORPUS_MAP_INCONSISTENT']);
  });

  test('rejects an unmanifested instruction file', async () => {
    const corpus = await fixture(); await writeFile(join(corpus.root, 'instructions/extra.md'), renderInstruction(defaultInstruction('extra')));
    corpus.map.donors[donorId].files['extra-source.md'] = { status: 'converted', instruction_ids: ['extra'] };
    await writeFile(join(corpus.root, cloneRoot, 'extra-source.md'), 'mapped extra donor source\n');
    await expectCodes(corpus, ['CORPUS_FILE_UNMANIFESTED']);
  });

  test('rejects a manifest path without a file', async () => {
    const corpus = await fixture(); await rm(join(corpus.root, 'instructions/alpha-instruction.md'));
    delete corpus.map.donors[donorId].files[donorFile];
    await expectCodes(corpus, ['CORPUS_MANIFEST_FILE_MISSING', 'CORPUS_MAP_COVERAGE_MISSING']);
  });

  test('rejects manifest path that resolves to a directory', async () => {
    const corpus = await fixture();
    await rm(join(corpus.root, 'instructions/alpha-instruction.md'));
    await mkdir(join(corpus.root, 'instructions/alpha-instruction.md'));
    delete corpus.map.donors[donorId].files[donorFile];
    await expectCodes(corpus, ['CORPUS_PATH_INVALID', 'CORPUS_MAP_COVERAGE_MISSING']);
  });

  test('rejects a manifest path outside instructions', async () => {
    const corpus = await fixture(); corpus.catalog.instructions[0].path = '../outside.md';
    await expectCodes(corpus, ['CORPUS_FILE_UNMANIFESTED', 'CORPUS_PATH_INVALID']);
  });

  test('rejects a schema-invalid manifest', async () => {
    const corpus = await fixture(); delete corpus.catalog.catalog_id;
    await expectCodes(corpus, ['CORPUS_MANIFEST_SCHEMA_INVALID']);
  });

  test('rejects a schema-invalid map', async () => {
    const corpus = await fixture(); corpus.map.revision = 'bad';
    await expectCodes(corpus, ['CORPUS_MAP_SCHEMA_INVALID']);
  });

  test('rejects an exemption with no reason', async () => {
    const corpus = await fixture(); corpus.catalog.tag_exemptions = [{ instruction_id: 'alpha-instruction', dimension: 'capability', reason: '' }];
    await expectCodes(corpus, ['CORPUS_MANIFEST_SCHEMA_INVALID', 'CORPUS_TAG_EXEMPTION_INVALID']);
  });

  test('rejects an exemption for an unknown instruction', async () => {
    const corpus = await fixture(); corpus.catalog.tag_exemptions = [{ instruction_id: 'missing', dimension: 'capability', reason: 'x' }];
    await expectCodes(corpus, ['CORPUS_TAG_EXEMPTION_INVALID']);
  });

  test('rejects duplicate exemptions for one instruction dimension', async () => {
    const corpus = await fixture(); corpus.catalog.tag_exemptions = [
      { instruction_id: 'alpha-instruction', dimension: 'capability', reason: 'x' },
      { instruction_id: 'alpha-instruction', dimension: 'capability', reason: 'y' },
    ];
    await expectCodes(corpus, ['CORPUS_TAG_EXEMPTION_INVALID']);
  });

  test('requires tags unless the dimension has a reasoned exemption', async () => {
    const corpus = await fixture(); const item = { ...corpus.instructions[0] as Instruction, capability_tags: [], pattern_tags: [] };
    await rewriteInstruction(corpus, item);
    await expectCodes(corpus, ['CORPUS_TAG_EMPTY', 'CORPUS_TAG_EMPTY']);
  });

  test('allows zero tags with a matching exemption', async () => {
    const corpus = await fixture(); const item = { ...corpus.instructions[0] as Instruction, capability_tags: [] };
    corpus.catalog.tag_exemptions = [{ instruction_id: item.instruction_id, dimension: 'capability', reason: 'Approved.' }];
    await rewriteInstruction(corpus, item);
    await expectCodes(corpus, []);
  });

  test('rejects an alias with an unknown canonical target', async () => {
    const corpus = await fixture(); corpus.catalog.tag_aliases = { bad: 'not-canonical' };
    await expectCodes(corpus, ['CORPUS_TAG_ALIAS_INVALID']);
  });

  test('rejects an alias that is also a canonical tag', async () => {
    const corpus = await fixture();
    corpus.catalog.tag_dictionary.capability['extra-canonical'] = 'An extra canonical tag.';
    corpus.catalog.tag_aliases = { 'extra-canonical': 'write-tests-first' };
    await expectCodes(corpus, ['CORPUS_TAG_ALIAS_INVALID']);
  });

  test('rejects an alias stored in instruction tags', async () => {
    const corpus = await fixture(); corpus.catalog.tag_aliases = { 'short-cut': 'write-tests-first' };
    await rewriteInstruction(corpus, { ...corpus.instructions[0] as Instruction, capability_tags: ['short-cut'] });
    await expectCodes(corpus, ['CORPUS_TAG_ALIAS_IN_INSTRUCTION']);
  });

  test('rejects a non-dictionary tag without an exemption', async () => {
    const corpus = await fixture();
    await rewriteInstruction(corpus, { ...corpus.instructions[0] as Instruction, capability_tags: ['unknown-capability'] });
    await expectCodes(corpus, ['CORPUS_TAG_UNKNOWN']);
  });

  test('rejects empty tag descriptions', async () => {
    const corpus = await fixture(); corpus.catalog.tag_dictionary.capability['write-tests-first'] = ' ';
    await expectCodes(corpus, ['CORPUS_TAG_DESCRIPTION_EMPTY']);
  });

  test('rejects a producing instruction with empty verified_by', async () => {
    const corpus = await fixture(); const item = { ...corpus.instructions[0] as Instruction, artifact_contract_verified_by: '' };
    await rewriteInstruction(corpus, item);
    await expectCodes(corpus, ['CORPUS_ARTIFACT_CONTRACT_INVALID']);
  });

  test('rejects required data on guidance instructions', async () => {
    const corpus = await fixture(); const item = { ...corpus.instructions[0] as Instruction, artifact_contract_output_type: 'none' };
    await rewriteInstruction(corpus, item);
    await expectCodes(corpus, ['CORPUS_ARTIFACT_CONTRACT_INVALID', 'CORPUS_INSTRUCTION_SCHEMA_INVALID']);
  });

  test('rejects an unknown provenance donor', async () => {
    const unknown = await fixture(); unknown.instructions[0]!.provenance = [`donor=missing; license=MIT; revision=${revision}; path=${donorFile}`]; await rewriteInstruction(unknown, unknown.instructions[0]!);
    await expectCodes(unknown, ['CORPUS_PROVENANCE_MISMATCH']);
  });

  test('rejects a provenance license mismatch', async () => {
    const license = await fixture(); license.instructions[0]!.provenance = [`donor=${donorId}; license=BSD; revision=${revision}; path=${donorFile}`]; await rewriteInstruction(license, license.instructions[0]!);
    await expectCodes(license, ['CORPUS_PROVENANCE_MISMATCH']);
  });

  test('rejects a provenance revision mismatch', async () => {
    const rev = await fixture(); rev.instructions[0]!.provenance = [`donor=${donorId}; license=MIT; revision=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa; path=${donorFile}`]; await rewriteInstruction(rev, rev.instructions[0]!);
    await expectCodes(rev, ['CORPUS_PROVENANCE_MISMATCH']);
  });

  test('rejects a provenance path missing from the clone', async () => {
    const missing = await fixture(); missing.instructions[0]!.provenance = [`donor=${donorId}; license=MIT; revision=${revision}; path=absent.md`]; await rewriteInstruction(missing, missing.instructions[0]!);
    await expectCodes(missing, ['CORPUS_PROVENANCE_PATH_MISSING']);
  });

  test('rejects a provenance path that resolves to a directory', async () => {
    const directory = await fixture(); directory.instructions[0]!.provenance = [`donor=${donorId}; license=MIT; revision=${revision}; path=.`]; await rewriteInstruction(directory, directory.instructions[0]!);
    await expectCodes(directory, ['CORPUS_PROVENANCE_PATH_INVALID']);
  });

  test('rejects a repeated provenance source within one instruction', async () => {
    const duplicate = await fixture(); duplicate.instructions[0]!.provenance.push(duplicate.instructions[0]!.provenance[0] as string); await rewriteInstruction(duplicate, duplicate.instructions[0]!);
    await expectCodes(duplicate, ['CORPUS_PROVENANCE_DUPLICATE']);
  });

  test('rejects an instruction without provenance', async () => {
    const corpus = await fixture(); await rewriteInstruction(corpus, { ...corpus.instructions[0] as Instruction, provenance: [] });
    await expectCodes(corpus, ['CORPUS_INSTRUCTION_SCHEMA_INVALID', 'CORPUS_PROVENANCE_MISSING']);
  });

  test('reports an absent donor clone', async () => {
    const clone = await fixture(); await rm(join(clone.root, cloneRoot), { recursive: true });
    await expectCodes(clone, ['CORPUS_CLONE_MISSING']);
  });

  test('rejects unknown compatibility references', async () => {
    const unknown = await fixture(); await rewriteInstruction(unknown, { ...unknown.instructions[0]!, compatibility_requires: ['missing'] });
    await expectCodes(unknown, ['CORPUS_COMPATIBILITY_UNKNOWN']);
  });

  test('rejects self compatibility references', async () => {
    const self = await fixture(); await rewriteInstruction(self, { ...self.instructions[0]!, compatibility_requires: ['alpha-instruction'] });
    await expectCodes(self, ['CORPUS_COMPATIBILITY_SELF_REQUIRE']);
  });

  test('rejects missing corpus map instruction references', async () => {
    const missing = await fixture(); delete missing.map.donors[donorId].files[donorFile];
    await expectCodes(missing, ['CORPUS_MAP_INCONSISTENT', 'CORPUS_MAP_COVERAGE_MISSING']);
  });

  test('rejects unknown corpus map instruction references', async () => {
    const unknown = await fixture(); unknown.map.donors[donorId].files[donorFile].instruction_ids = ['unknown'];
    await expectCodes(unknown, ['CORPUS_MAP_INCONSISTENT', 'CORPUS_MAP_INCONSISTENT']);
  });

  test('rejects converted status with two instruction ids', async () => {
    const converted = await fixture({ twoInstructions: true });
    converted.map.donors[donorId].files[donorFile] = { status: 'converted', instruction_ids: ['alpha-instruction', 'beta-instruction'] };
    await expectCodes(converted, ['CORPUS_MAP_INCONSISTENT']);
  });

  test('rejects rejected status without a reason', async () => {
    const corpus = await fixture(); corpus.map.donors[donorId].files[donorFile] = { status: 'rejected' };
    await expectCodes(corpus, ['CORPUS_MAP_INCONSISTENT', 'CORPUS_MAP_INCONSISTENT', 'CORPUS_MAP_SCHEMA_INVALID']);
  });

  test('rejects split status with one instruction id', async () => {
    const split = await fixture(); split.map.donors[donorId].files[donorFile].status = 'split';
    await expectCodes(split, ['CORPUS_MAP_INCONSISTENT']);
  });

  test('rejects merged status without contributed sources', async () => {
    const merged = await fixture(); merged.map.donors[donorId].files[donorFile] = { status: 'merged', instruction_ids: ['alpha-instruction'] };
    await expectCodes(merged, ['CORPUS_MAP_INCONSISTENT']);
  });

  test('rejects a corpus-map donor revision mismatch', async () => {
    const revisionMismatch = await fixture(); revisionMismatch.map.donors[donorId].source_revision = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    await expectCodes(revisionMismatch, ['CORPUS_MAP_INCONSISTENT']);
  });

  test('does not write: all fixture file mtimes and hashes remain unchanged', async () => {
    const corpus = await fixture(); const before = snapshot(corpus.root);
    expect(checkCorpus(corpus.root)).toEqual([]);
    expect(snapshot(corpus.root)).toEqual(before);
  });

  test('contains missing-root filesystem errors as issues', () => {
    const result = checkCorpus(join(tmpdir(), 'vp-path-does-not-exist'));
    expect(result.map((item) => item.code).sort()).toEqual(['CORPUS_DONORS_INVALID', 'CORPUS_FILESYSTEM_ERROR', 'CORPUS_MANIFEST_INVALID', 'CORPUS_MANIFEST_SCHEMA_INVALID', 'CORPUS_MAP_INCONSISTENT', 'CORPUS_MAP_SCHEMA_INVALID'].sort());
  });
});

describe('real corpus (requires ignored pinned donor clones)', () => {
  const realTest = realCorpusOptIn ? test : test.skip;
  const cloneRequirement = 'requires VP_REAL_CORPUS_TESTS=1 and pinned donor clones';
  const cloneTests = [
    `the real corpus has complete map coverage (${cloneRequirement})`,
    `CLI reports no issues for the real corpus (${cloneRequirement})`,
    `CLI uses package root by default (${cloneRequirement})`,
  ] as const;
  realTest(cloneTests[0], () => {
    expect(checkCorpus(packageRoot).some((item) => item.code === 'CORPUS_MAP_COVERAGE_MISSING')).toBe(false);
  });
  realTest(cloneTests[1], () => {
    const result = spawnSync(bun, [join(packageRoot, 'scripts/check-corpus.ts'), '--root', packageRoot], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
    expect(result.status).toBe(0); expect(JSON.parse(result.stdout).issues).toEqual([]);
  });
  realTest(cloneTests[2], () => {
    const result = spawnSync(bun, [join(packageRoot, 'scripts/check-corpus.ts')], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
    const manifest = JSON.parse(readFileSync(join(packageRoot, 'catalog.json'), 'utf8'));
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).instructions).toBe(manifest.instructions.length);
  });
  test('names all clone-dependent tests with their skip reason', () => {
    expect(cloneTests).toHaveLength(3);
    expect(cloneTests.every((name) => name.includes(cloneRequirement))).toBe(true);
  });
});

describe('CLI helpers', () => {
  test('invalid arguments return JSON and nonzero status', () => {
    const output: string[] = [];
    expect(runCorpusCli(['--wrong'], (value) => output.push(value))).toBe(1);
    expect(JSON.parse(output[0] as string).issues[0].code).toBe('CORPUS_ARGUMENT_INVALID');
  });

  test('accepts an explicit synthetic root', async () => {
    const corpus = await fixture(); const result = corpusCli(['--root', corpus.root]);
    expect(result).toMatchObject({ issues: [], instructions: 1, exitCode: 0 });
  });

  test('uses content_path as the donor root for provenance and map coverage', async () => {
    const corpus = await fixture();
    const contentRoot = join(corpus.root, cloneRoot, 'content');
    await mkdir(contentRoot, { recursive: true });
    await writeFile(join(contentRoot, donorFile), 'synthetic donor source\n');
    await writeFile(join(corpus.root, cloneRoot, 'other-plugin.md'), 'outside donor content\n');
    await rm(join(corpus.root, cloneRoot, donorFile));
    await writeFile(join(corpus.root, 'donors.yaml'), `schema: vida-powers-donors/v1\nlocal_root: .tmp/donors\ndonors:\n  - id: ${donorId}\n    local_path: synthetic\n    content_path: content\n    head_sha: '${revision}'\n    license: MIT\n`);
    expect(checkCorpus(corpus.root)).toEqual([]);
  });

  test('reports a missing content subdirectory at the content root', async () => {
    const corpus = await fixture();
    await writeFile(join(corpus.root, 'donors.yaml'), `schema: vida-powers-donors/v1\nlocal_root: .tmp/donors\ndonors:\n  - id: ${donorId}\n    local_path: synthetic\n    content_path: missing\n    head_sha: '${revision}'\n    license: MIT\n`);
    expect(checkCorpus(corpus.root).filter((item) => item.code === 'CORPUS_CLONE_MISSING').map((item) => item.details?.path)).toEqual([resolve(corpus.root, cloneRoot, 'missing')]);
  });

  test('reports a non-directory content root as a filesystem error', async () => {
    const corpus = await fixture();
    await writeFile(join(corpus.root, cloneRoot, 'not-a-directory'), 'file\n');
    await writeFile(join(corpus.root, 'donors.yaml'), `schema: vida-powers-donors/v1\nlocal_root: .tmp/donors\ndonors:\n  - id: ${donorId}\n    local_path: synthetic\n    content_path: not-a-directory\n    head_sha: '${revision}'\n    license: MIT\n`);
    expect(checkCorpus(corpus.root).some((item) => item.code === 'CORPUS_FILESYSTEM_ERROR' && item.details?.path === resolve(corpus.root, cloneRoot, 'not-a-directory'))).toBe(true);
  });

  test('contains filesystem errors while inspecting a content root', async () => {
    const corpus = await fixture();
    await writeFile(join(corpus.root, cloneRoot, 'not-a-directory'), 'file\n');
    await writeFile(join(corpus.root, 'donors.yaml'), `schema: vida-powers-donors/v1\nlocal_root: .tmp/donors\ndonors:\n  - id: ${donorId}\n    local_path: synthetic\n    content_path: not-a-directory/child\n    head_sha: '${revision}'\n    license: MIT\n`);
    expect(checkCorpus(corpus.root).some((item) => ['CORPUS_CLONE_MISSING', 'CORPUS_FILESYSTEM_ERROR'].includes(item.code) && item.details?.path === resolve(corpus.root, cloneRoot, 'not-a-directory/child'))).toBe(true);
  });
});

test('non-object corpus JSON and malformed profile JSON remain explicit validation failures', async () => {
  const corpus = await fixture();
  await writeFile(join(corpus.root, 'catalog.json'), '[]');
  expect(checkCorpus(corpus.root).some(issue => issue.message === 'catalog.json must contain an object')).toBe(true);
  await corpus.save();
  await mkdir(join(corpus.root, 'config'), { recursive: true });
  await writeFile(join(corpus.root, 'config/methodology-profile.json'), '{');
  expect(checkCorpus(corpus.root).some(issue => issue.code === 'CORPUS_PROFILE_INVALID' && issue.message.includes('cannot read'))).toBe(true);
});

test('filesystem faults are reported at the manifest, provenance and enumeration boundaries', async () => {
  const corpus = await fixture();
  const before = snapshot(corpus.root);
  const realStat = filesystem.statSync;
  const realReaddir = filesystem.readdirSync;
  const manifestPath = join(corpus.root, 'instructions/alpha-instruction.md');
  const donorPath = join(corpus.root, cloneRoot, donorFile);
  for (const target of [manifestPath, donorPath]) {
    let calls = 0;
    const fault = spyOn(filesystem, 'statSync').mockImplementation(new Proxy(realStat, { apply(stat, receiver: unknown, args: unknown[]) {
      if (String(args[0]) === target && ++calls === (target === manifestPath ? 2 : 1)) throw Object.assign(new Error('fixture denied stat'), { code: 'EACCES' });
      return Reflect.apply(stat, receiver, args);
    } }));
    try {
      const issues = checkCorpus(corpus.root);
      expect(calls).toBeGreaterThan(0);
      expect(issues.filter(issue => issue.code === 'CORPUS_FILESYSTEM_ERROR').map(issue => issue.details?.path)).toContain(target === manifestPath ? 'instructions/alpha-instruction.md' : donorFile);
    } finally { fault.mockRestore(); }
  }
  let enumerations = 0;
  const readFault = spyOn(filesystem, 'readdirSync').mockImplementation(new Proxy(realReaddir, { apply(read, receiver: unknown, args: unknown[]) {
    if (String(args[0]) === join(corpus.root, cloneRoot)) { enumerations++; throw Object.assign(new Error('fixture denied enumeration'), { code: 'EACCES' }); }
    return Reflect.apply(read, receiver, args);
  } }));
  try {
    expect(checkCorpus(corpus.root).some(issue => issue.message.includes('cannot enumerate donor clone'))).toBe(true);
    expect(enumerations).toBe(1);
  } finally { readFault.mockRestore(); }
  expect(snapshot(corpus.root)).toEqual(before);
});

test.each(['clone', 'content'])('coverage traversal reports a later %s stat failure', async boundary => {
  const corpus = await fixture();
  const content = join(corpus.root, cloneRoot, 'content');
  await mkdir(content);
  await writeFile(join(content, donorFile), 'synthetic donor source\n');
  await writeFile(join(corpus.root, 'donors.yaml'), JSON.stringify({ local_root: '.tmp/donors', donors: [{ id: donorId, local_path: 'synthetic', content_path: 'content', license: 'MIT', head_sha: revision }] }));
  const target = boundary === 'clone' ? join(corpus.root, cloneRoot) : content;
  const realStat = filesystem.statSync;
  let calls = 0;
  const failAt = 2;
  const fault = spyOn(filesystem, 'statSync').mockImplementation(new Proxy(realStat, { apply(stat, receiver: unknown, args: unknown[]) {
    if (String(args[0]) === target && ++calls === failAt) throw Object.assign(new Error('fixture later stat failure'), { code: 'EACCES' });
    return Reflect.apply(stat, receiver, args);
  } }));
  try {
    const issues = checkCorpus(corpus.root);
    expect(calls).toBe(failAt);
    expect(issues.some(issue => issue.code === 'CORPUS_FILESYSTEM_ERROR' && issue.message.startsWith(`cannot inspect donor ${boundary === 'clone' ? 'clone' : 'content root'}`))).toBe(true);
  } finally { fault.mockRestore(); }
});

test('an unavailable schema becomes a corpus failure and an absent directory produces zero instructions', async () => {
  const corpus = await fixture();
  const realRead = filesystem.readFileSync;
  const schema = join(packageRoot, 'config/vpcatalog.v1.schema.json');
  const fault = spyOn(filesystem, 'readFileSync').mockImplementation(new Proxy(realRead, { apply(read, receiver: unknown, args: unknown[]) {
    if (String(args[0]) === schema) throw Object.assign(new Error('fixture unavailable schema'), { code: 'EACCES' });
    return Reflect.apply(read, receiver, args);
  } }));
  try { expect(checkCorpus(corpus.root).some(issue => issue.message.includes('corpus validation could not complete'))).toBe(true); }
  finally { fault.mockRestore(); }
  await rm(join(corpus.root, 'instructions'), { recursive: true });
  expect(corpusCli(['--root', corpus.root])).toMatchObject({ instructions: 0, exitCode: 1 });
});

test('the corpus entry adapter preserves import isolation, printed output and native exit status', async () => {
  const corpus = await fixture();
  const script = fileURLToPath(new URL('../scripts/check-corpus.ts', import.meta.url));
  const output: string[] = [];
  const exits: number[] = [];
  expect(startCorpusCli([process.execPath], text => output.push(text), code => exits.push(code))).toBeUndefined();
  expect(startCorpusCli([process.execPath, join(corpus.root, 'other.ts')], text => output.push(text), code => exits.push(code))).toBeUndefined();
  expect(exits).toEqual([]);
  expect(startCorpusCli([process.execPath, script, '--wrong'], text => output.push(text), code => exits.push(code))).toBe(1);
  expect(exits).toEqual([1]);
  expect(JSON.parse(output[0] ?? '').issues[0].code).toBe('CORPUS_ARGUMENT_INVALID');
  const previous = process.exitCode;
  const print = spyOn(console, 'log').mockImplementation(() => {});
  try {
    expect(startCorpusCli([process.execPath, script, '--root', corpus.root, '--require-facets'], text => output.push(text), code => exits.push(code))).toBe(1);
    expect(exits).toEqual([1, 1]);
    expect(JSON.parse(output[1] ?? '').issues[0].code).toBe('CORPUS_ARGUMENT_INVALID');
    const nativeStrict = spawnSync(bun, [script, '--root', corpus.root, '--require-facets'], { encoding: 'utf8' });
    expect(nativeStrict.status).toBe(1);
    expect(JSON.parse(nativeStrict.stdout).issues[0].code).toBe('CORPUS_ARGUMENT_INVALID');
    expect(startCorpusCli([process.execPath, script, '--root', corpus.root])).toBe(0);
    expect(process.exitCode).toBe(0);
    expect(JSON.parse(String(print.mock.calls[0]?.[0]))).toMatchObject({ instructions: 1, issues: [] });
  } finally { print.mockRestore(); process.exitCode = previous ?? 0; }
});
