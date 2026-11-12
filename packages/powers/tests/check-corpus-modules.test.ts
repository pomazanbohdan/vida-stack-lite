import { afterEach, describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkCorpus } from '../scripts/check-corpus.ts';

const donorId = 'synthetic-donor';
const revision = '1234567890123456789012345678901234567890';
const sourcePath = 'source.md';
const roots: string[] = [];
const digest = (text: string | Uint8Array): string => createHash('sha256').update(text).digest('hex');

type Atom = { atom_id: string; file_sha256: string; content_sha256: string; file_bytes: number; body_bytes: number };

function renderAtom(id: string, changes: Record<string, unknown> = {}): string {
  const data: Record<string, unknown> = {
    schema: 'VPInstruction/v1.2', classification_status: 'unclassified', classification_reason: 'Synthetic module atom.',
    instruction_id: id, title: `Instruction ${id}`, summary: 'A complete source instruction.',
    capability_tags: ['write-tests-first'], pattern_tags: ['test-first-development'], roles: [], products: [],
    conditions_applies_when: 'A test task applies.', conditions_does_not_apply_when: 'A non-test task applies.',
    artifact_contract_output_type: 'test-suite', artifact_contract_required_data: ['cases'], artifact_contract_verified_by: 'bun test',
    compatibility_excludes: [], compatibility_requires: [],
    provenance: [`donor=${donorId}; license=MIT; revision=${revision}; path=${sourcePath}`], status: 'active', revision: 1,
    ...changes,
  };
  const frontmatter = Object.entries(data).map(([key, value]) => {
    if (Array.isArray(value)) return value.length === 0 ? `${key}: []` : `${key}:\n${value.map((item) => `  - ${JSON.stringify(item)}`).join('\n')}`;
    return `${key}: ${JSON.stringify(value)}`;
  }).join('\n');
  return `---\n${frontmatter}\n---\n\n# ${data.title}\nInstruction body.\n`;
}

function makeAtoms(atomIds: string[], overrides: Record<string, Record<string, unknown>> = {}): { files: string[]; atoms: Atom[] } {
  const files = atomIds.map((id) => renderAtom(id, overrides[id]));
  const atoms = files.map((file, index) => {
    const frontmatterEnd = file.indexOf('\n---\n', 4) + 5;
    const body = file.slice(frontmatterEnd).replace(/^\n+/, '');
    return {
      atom_id: atomIds[index] as string,
      file_sha256: digest(file),
      content_sha256: digest(body),
      file_bytes: Buffer.byteLength(file, 'utf8'),
      body_bytes: Buffer.byteLength(body, 'utf8'),
    };
  });
  return { files, atoms };
}

function makeModule(atomIds: string[], overrides: Record<string, Record<string, unknown>> = {}) {
  const { files, atoms } = makeAtoms(atomIds, overrides);
  const body = atoms.map((atom, index) => `<!-- vpmodule:atom:begin ${atom.atom_id} -->\n${files[index]}<!-- vpmodule:atom:end ${atom.atom_id} -->`).join('\n');
  const record = {
    schema: 'VPInstructionModule/v1', instruction_id: 'module-sample-c01', title: 'Sample carrier', summary: 'Lossless packaging only.',
    source: JSON.stringify({ donor: donorId, path: sourcePath }), atom_ids: [...atomIds], atom_count: atomIds.length,
    atoms: JSON.stringify(atoms), carrier_sha256: digest(body), carrier_bytes: Buffer.byteLength(body, 'utf8'), revision: 1, status: 'active',
  };
  return { record, body, files, atoms };
}

function renderModule(record: Record<string, unknown>, body: string): string {
  const fields = [
    `schema: ${JSON.stringify(record.schema)}`,
    `instruction_id: ${JSON.stringify(record.instruction_id)}`,
    `title: ${JSON.stringify(record.title)}`,
    `summary: ${JSON.stringify(record.summary)}`,
    `source: ${JSON.stringify(record.source)}`,
    `atom_ids:\n${(record.atom_ids as string[]).map((id) => `  - ${JSON.stringify(id)}`).join('\n')}`,
    `atom_count: ${record.atom_count}`,
    `atoms: ${JSON.stringify(record.atoms)}`,
    `carrier_sha256: ${record.carrier_sha256}`,
    `carrier_bytes: ${record.carrier_bytes}`,
    `revision: ${record.revision}`,
    `status: ${record.status}`,
  ].join('\n');
  return `---\n${fields}\n---\n${body}`;
}

async function fixture(options: { atomIds?: string[]; mapIds?: string[]; overrides?: Record<string, Record<string, unknown>> } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'vp-corpus-module-'));
  roots.push(root);
  const atomIds = options.atomIds ?? ['atom-alpha', 'atom-beta'];
  const module = makeModule(atomIds, options.overrides);
  const moduleText = renderModule(module.record, module.body);
  const catalog = {
    schema: 'VPCatalog/v1', catalog_id: 'synthetic-module', revision: 1, source_revision: revision, updated_at: '2026-11-07',
    tag_dictionary: { capability: { 'write-tests-first': 'Write tests first.' }, pattern: { 'test-first-development': 'Use test first.' } },
    tag_aliases: {}, tag_exemptions: [],
    instructions: [{ instruction_id: 'module-sample-c01', path: 'instructions/module-sample-c01.md', sha256: digest(moduleText) }],
  };
  const mapIds = options.mapIds ?? atomIds;
  const map = {
    schema: 'VPCorpusMap/v1', revision: 1, updated_at: '2026-11-07',
    donors: { [donorId]: { source_revision: revision, files: { [sourcePath]: { status: 'split', instruction_ids: mapIds } } } },
  };
  await mkdir(join(root, 'instructions'), { recursive: true });
  await mkdir(join(root, '.tmp', 'donors', 'synthetic'), { recursive: true });
  await writeFile(join(root, 'instructions', 'module-sample-c01.md'), moduleText);
  await writeFile(join(root, '.tmp', 'donors', 'synthetic', sourcePath), 'synthetic donor source\n');
  await writeFile(join(root, 'catalog.json'), `${JSON.stringify(catalog, null, 2)}\n`);
  await writeFile(join(root, 'corpus-map.json'), `${JSON.stringify(map, null, 2)}\n`);
  await writeFile(join(root, 'donors.yaml'), `schema: vida-powers-donors/v1\nlocal_root: .tmp/donors\ndonors:\n  - id: ${donorId}\n    local_path: synthetic\n    head_sha: '${revision}'\n    license: MIT\n`);
  return { root, catalog, map, module };
}

async function saveModule(corpus: Awaited<ReturnType<typeof fixture>>): Promise<void> {
  const text = renderModule(corpus.module.record, corpus.module.body);
  corpus.catalog.instructions[0]!.sha256 = digest(text);
  await writeFile(join(corpus.root, 'instructions', 'module-sample-c01.md'), text);
  await writeFile(join(corpus.root, 'catalog.json'), `${JSON.stringify(corpus.catalog, null, 2)}\n`);
}

afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

describe('checkCorpus module carriers', () => {
  test('accepts carrier basenames while mapping atom IDs and keeps Markdown receipt scope empty', async () => {
    const corpus = await fixture();
    expect(checkCorpus(corpus.root)).toEqual([]);
  });

  test('reports missing atom map coverage and orphan map IDs', async () => {
    const corpus = await fixture({ mapIds: ['atom-alpha'] });
    const missing = checkCorpus(corpus.root);
    expect(missing.map((item) => item.code)).toContain('CORPUS_MODULE_MAP_COVERAGE');
    corpus.map.donors[donorId].files[sourcePath].instruction_ids = ['atom-alpha', 'orphan-atom'];
    await writeFile(join(corpus.root, 'corpus-map.json'), `${JSON.stringify(corpus.map, null, 2)}\n`);
    expect(checkCorpus(corpus.root).map((item) => item.code)).toContain('CORPUS_MAP_INCONSISTENT');
  });

  test('rejects a module carrier ID in corpus map instruction bindings', async () => {
    const corpus = await fixture({ mapIds: ['atom-alpha', 'atom-beta', 'module-sample-c01'] });
    const issues = checkCorpus(corpus.root);
    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'CORPUS_MAP_INCONSISTENT',
        details: expect.objectContaining({ instruction_id: 'module-sample-c01' }),
      }),
    ]));
  });

  test('reports atom collisions and module bijection failures', async () => {
    const corpus = await fixture();
    const atomFile = renderAtom('atom-alpha');
    corpus.catalog.instructions.push({ instruction_id: 'atom-alpha', path: 'instructions/atom-alpha.md', sha256: digest(atomFile) });
    await writeFile(join(corpus.root, 'instructions', 'atom-alpha.md'), atomFile);
    corpus.map.donors[donorId].files[sourcePath].instruction_ids.push('atom-alpha');
    await writeFile(join(corpus.root, 'catalog.json'), `${JSON.stringify(corpus.catalog, null, 2)}\n`);
    await writeFile(join(corpus.root, 'corpus-map.json'), `${JSON.stringify(corpus.map, null, 2)}\n`);
    const found = checkCorpus(corpus.root).map((item) => item.code);
    expect(found).toContain('CORPUS_MODULE_ATOM_COLLISION');
    expect(found).toContain('CORPUS_MODULE_BIJECTION');
  });

  test('reports schema, section, and nested hash failures with module codes', async () => {
    const schema = await fixture();
    schema.module.record.title = '';
    await saveModule(schema);
    expect(checkCorpus(schema.root).map((item) => item.code)).toContain('CORPUS_MODULE_INVALID');

    const section = await fixture();
    section.module.body = section.module.body.replace('<!-- vpmodule:atom:begin atom-alpha -->\n', '');
    await saveModule(section);
    expect(checkCorpus(section.root).map((item) => item.code)).toContain('CORPUS_MODULE_SECTION_INVALID');

    const outside = await fixture();
    outside.module.body = `\n${outside.module.body}`;
    await saveModule(outside);
    expect(checkCorpus(outside.root).map((item) => item.code)).toContain('CORPUS_MODULE_SECTION_INVALID');

    const hash = await fixture();
    const atoms = JSON.parse(hash.module.record.atoms as string) as Atom[];
    atoms[0]!.file_sha256 = '0'.repeat(64);
    hash.module.record.atoms = JSON.stringify(atoms);
    await saveModule(hash);
    expect(checkCorpus(hash.root).map((item) => item.code)).toContain('CORPUS_MODULE_HASH_MISMATCH');
  });

  test('resolves profile, tag, and compatibility references through module atom IDs', async () => {
    const corpus = await fixture({ overrides: { 'atom-alpha': { compatibility_requires: ['atom-beta'] } } });
    await mkdir(join(corpus.root, 'config'), { recursive: true });
    await writeFile(join(corpus.root, 'config', 'methodology-profile.json'), `${JSON.stringify({
      schema: 'VPMethodologyProfile/v1',
      groups: [{
        id: 'module-test', title: 'Module test', description: 'Profile reference to an atom.', user_decision: false,
        default: 'test-first-development',
        alternatives: [{
          id: 'test-first-development', title: 'Test first', description: 'Use the module atom.', instruction_ids: ['atom-alpha'],
        }],
      }],
    }, null, 2)}\n`);
    expect(checkCorpus(corpus.root)).toEqual([]);
  });

  test('reports module atom applicability, approach, and guidance contract errors', async () => {
    const applicability = await fixture({ overrides: {
      'atom-alpha': { schema: 'VPInstruction/v2', applicability: 'not-json' },
    } });
    expect(checkCorpus(applicability.root).map((item) => item.code)).toContain('CORPUS_INSTRUCTION_APPLICABILITY_INVALID');

    const approach = await fixture({ overrides: {
      'atom-alpha': {
        approach_assessments: ['malformed'],
        approach_body_sha256: digest('# Instruction atom-alpha\nInstruction body.\n'),
      },
    } });
    expect(checkCorpus(approach.root).map((item) => item.code)).toContain('CORPUS_INSTRUCTION_APPROACH_INVALID');

    const contract = await fixture({ overrides: {
      'atom-alpha': { artifact_contract_output_type: 'none', artifact_contract_required_data: ['cases'] },
    } });
    expect(checkCorpus(contract.root).map((item) => item.code)).toContain('CORPUS_ARTIFACT_CONTRACT_INVALID');
  });
});
