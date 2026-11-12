import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, test } from 'bun:test';
import { validateAgainstSchema, validateSchemaDefinition, type Schema } from '../skills/vp-mode/scripts/schema.ts';
import { parseFrontmatter } from '../skills/vp-mode/scripts/frontmatter.ts';
import { buildModuleCensus, renderModuleCensusJson, renderModuleCensusSummary, runModuleCensusCli } from '../scripts/module-census.ts';
import { renderModule } from '../scripts/module-migration.ts';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = join(here, 'fixtures', 'module-census');
const script = join(here, '..', 'scripts', 'module-census.ts');
const schemaPath = join(here, '..', 'config', 'vpinstructionmodule.v1.schema.json');
const tempRoots: string[] = [];

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'vp-module-census-'));
  tempRoots.push(root);
  return root;
}

function fixtureCopy(): string {
  const root = join(tempRoot(), 'product');
  cpSync(fixture, root, { recursive: true });
  return root;
}

function inventory(path: string): string[] {
  return readdirSync(path, { recursive: true }).map(String).sort();
}

afterEach(() => {
  for (const path of tempRoots.splice(0)) rmSync(path, { recursive: true, force: true });
});

describe('module census', () => {
  test('counts map-primary and provenance cohorts and keeps one-atom chunks singleton', () => {
    const census = buildModuleCensus(fixtureCopy(), 2);
    expect(census.catalogInstructions).toBe(6);
    expect(census.csvAtoms).toBe(1);
    expect(census.nonCsvAtoms).toBe(5);
    expect(census.rules['map-primary'].groups).toBe(2);
    expect(census.rules['map-primary'].carriers).toBe(3);
    expect(census.rules['map-primary'].singletonAtomFiles).toBe(1);
    expect(census.rules['map-primary'].currentEntries).toBe(4);
    expect(census.rules['map-primary'].allIn).toBe(939);
    expect(census.rules['first-provenance-donor-path'].groups).toBe(3);
    expect(census.rules['first-provenance-donor-path'].carriers).toBe(4);
    expect(census.rules['first-provenance-path-only'].groups).toBe(3);
    expect(census.rules['first-provenance-path-only'].carriers).toBe(4);
    expect(census.rules['map-primary'].groupSizeDistribution).toEqual({ '2': 1, '3': 1 });
    const noMapSource = fixtureCopy();
    const mapPath = join(noMapSource, 'corpus-map.json');
    const map = JSON.parse(readFileSync(mapPath, 'utf8')) as { donors: Record<string, { files: Record<string, { instruction_ids: string[] }> }> };
    map.donors['gsd-core']!.files['agents/gsd-security-auditor.md']!.instruction_ids.pop();
    writeFileSync(mapPath, JSON.stringify(map));
    expect(buildModuleCensus(noMapSource, 2).rules['map-primary'].groups).toBe(2);
  });

  test('repeats deterministic JSON and reports both pilot cohorts with member hashes', () => {
    const root = fixtureCopy();
    const first = buildModuleCensus(root, 2);
    const second = buildModuleCensus(root, 2);
    expect(renderModuleCensusJson(first)).toBe(renderModuleCensusJson(second));
    const member = first.rules['map-primary'].largestGroups[0];
    expect(member?.source).toBe('gsd-core:agents/gsd-security-auditor.md');
    const pilot = first.rules['map-primary'].pilots['gsd-security-auditor'];
    expect(pilot).toBeDefined();
    expect(pilot?.observedAtoms).toBe(3);
    expect(pilot?.members[0]?.fileSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(pilot?.members[0]?.contentSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(first.rules['map-primary'].pilots['security-auditor']?.observedAtoms).toBe(2);
    expect(first.rules['first-provenance-donor-path'].pilots['security-auditor']?.observedAtoms).toBe(1);
    expect(renderModuleCensusSummary(first, 17)).toContain('Runtime: 17 ms.');
  });

  test('expands module carriers back to their atomic records', () => {
    const sha = (bytes: Uint8Array | string): string => createHash('sha256').update(bytes).digest('hex');
    const root = fixtureCopy();
    const ids = ['atom-a', 'atom-b'];
    const atoms = ids.map((id) => {
      const bytes = readFileSync(join(root, 'instructions', `${id}.md`));
      const parsed = parseFrontmatter(bytes.toString('utf8'));
      return {
        id, bytes, body: parsed.body,
        record: { atom_id: id, file_sha256: sha(bytes), content_sha256: sha(parsed.body), file_bytes: bytes.length, body_bytes: Buffer.byteLength(parsed.body, 'utf8') },
      };
    });
    const body = atoms.map((atom) => `<!-- vpmodule:atom:begin ${atom.id} -->\n${atom.bytes.toString('utf8')}<!-- vpmodule:atom:end ${atom.id} -->`).join('\n');
    const moduleId = 'module-demo-c01';
    const moduleBytes = renderModule({
      moduleId, title: 'Demo module', summary: 'Demo carrier',
      source: { donor: 'gsd-core', path: 'agents/gsd-security-auditor.md' },
      atomIds: ids, atomRecords: atoms.map((atom) => atom.record), body,
    });
    writeFileSync(join(root, 'instructions', `${moduleId}.md`), moduleBytes);
    const catalogPath = join(root, 'catalog.json');
    const catalog = JSON.parse(readFileSync(catalogPath, 'utf8')) as { instructions: Array<{ instruction_id: string; path: string; sha256: string }> };
    catalog.instructions = catalog.instructions.filter((entry) => !ids.includes(entry.instruction_id));
    catalog.instructions.push({ instruction_id: moduleId, path: `instructions/${moduleId}.md`, sha256: sha(moduleBytes) });
    writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);

    const census = buildModuleCensus(root, 2);
    expect(census.catalogInstructions).toBe(5);
    expect(census.csvAtoms).toBe(1);
    expect(census.nonCsvAtoms).toBe(5);
    expect(census.rules['map-primary'].groups).toBe(2);
    expect(census.rules['map-primary'].carriers).toBe(3);
    const pilot = census.rules['map-primary'].pilots['gsd-security-auditor'];
    expect(pilot?.observedAtoms).toBe(3);
    expect(pilot?.members.map((member) => member.id)).toEqual(['atom-a', 'atom-b', 'atom-c']);
    expect(pilot?.members[0]?.file).toBe(`instructions/${moduleId}.md`);
    expect(pilot?.members[0]?.fileSha256).toBe(sha(atoms[0]!.bytes));
    expect(pilot?.members[0]?.contentSha256).toBe(sha(atoms[0]!.body));
  });

  test('rejects missing catalog, missing map, missing instruction, invalid provenance, escaping path and invalid cap', () => {
    const noCatalog = fixtureCopy();
    rmSync(join(noCatalog, 'catalog.json'));
    expect(() => buildModuleCensus(noCatalog)).toThrow('catalog.json');
    const noMap = fixtureCopy();
    rmSync(join(noMap, 'corpus-map.json'));
    expect(() => buildModuleCensus(noMap)).toThrow('corpus-map.json');
    const noInstruction = fixtureCopy();
    rmSync(join(noInstruction, 'instructions', 'atom-a.md'));
    expect(() => buildModuleCensus(noInstruction)).toThrow();
    const badProvenance = fixtureCopy();
    writeFileSync(join(badProvenance, 'instructions', 'atom-a.md'), '---\ninstruction_id: atom-a\nprovenance: []\n---\nBody.\n');
    expect(() => buildModuleCensus(badProvenance)).toThrow('provenance');
    const badFrontmatter = fixtureCopy();
    writeFileSync(join(badFrontmatter, 'instructions', 'atom-a.md'), '---\ninstruction_id: atom-a\nprovenance: [\n---\nBody.\n');
    expect(() => buildModuleCensus(badFrontmatter)).toThrow('frontmatter invalid');
    const badPath = fixtureCopy();
    const catalogPath = join(badPath, 'catalog.json');
    const catalog = JSON.parse(readFileSync(catalogPath, 'utf8')) as { instructions: Array<Record<string, string>> };
    catalog.instructions[0]!.path = '../outside.md';
    writeFileSync(catalogPath, JSON.stringify(catalog));
    expect(() => buildModuleCensus(badPath)).toThrow('escapes root');
    expect(() => buildModuleCensus(fixtureCopy(), 1)).toThrow('cap');
  });

  test('default CLI writes nothing and explicit output writes only requested files', () => {
    const root = fixtureCopy();
    const before = inventory(root);
    const defaultRun = spawnSync(process.execPath, [script, '--root', root, '--cap', '2'], { cwd: tempRoot(), encoding: 'utf8' });
    expect(defaultRun.status).toBe(0);
    expect(defaultRun.stdout).toContain('# Module census');
    expect(inventory(root)).toEqual(before);
    const outputDir = tempRoot();
    const jsonPath = join(outputDir, 'result', 'census.json');
    const summaryPath = join(outputDir, 'result', 'summary.md');
    const explicitRun = spawnSync(process.execPath, [script, '--root', root, '--cap', '2', '--out', jsonPath, '--summary', summaryPath, '--json'], { cwd: tempRoot(), encoding: 'utf8' });
    expect(explicitRun.status).toBe(0);
    expect(JSON.parse(readFileSync(jsonPath, 'utf8'))).toHaveProperty('rules.map-primary.groups', 2);
    expect(readFileSync(summaryPath, 'utf8')).toContain('Runtime:');
    expect(inventory(root)).toEqual(before);
    expect(inventory(outputDir).map((path) => path.replaceAll('\\', '/')).sort()).toEqual(['result', 'result/census.json', 'result/summary.md']);
  });

  test('CLI fails closed on malformed arguments and product data', () => {
    const root = fixtureCopy();
    const unknown = spawnSync(process.execPath, [script, '--unknown'], { encoding: 'utf8' });
    expect(unknown.status).toBe(1);
    expect(unknown.stderr).toContain('unknown argument');
    const missingValue = spawnSync(process.execPath, [script, '--root'], { encoding: 'utf8' });
    expect(missingValue.status).toBe(1);
    const malformedCap = spawnSync(process.execPath, [script, '--cap', 'x'], { encoding: 'utf8' });
    expect(malformedCap.status).toBe(1);
    const missingProduct = spawnSync(process.execPath, [script, '--root', resolve(root, 'missing')], { encoding: 'utf8' });
    expect(missingProduct.status).toBe(1);
  });

  test('in-process CLI covers JSON, summary, explicit writes and error sinks', () => {
    const root = fixtureCopy();
    const outDir = tempRoot();
    const output: string[] = [];
    const errors: string[] = [];
    const stdout = { write: (chunk: string): boolean => { output.push(chunk); return true; } };
    const stderr = { write: (chunk: string): boolean => { errors.push(chunk); return true; } };
    expect(runModuleCensusCli(['--root', root, '--cap', '2', '--json', '--out', join(outDir, 'out.json'), '--summary', join(outDir, 'summary.md')], stdout, stderr)).toBe(0);
    expect(output[0]).toContain('"groups": 2');
    expect(readFileSync(join(outDir, 'summary.md'), 'utf8')).toContain('Runtime:');
    expect(runModuleCensusCli(['--root', resolve(root, 'missing')], stdout, stderr)).toBe(1);
    expect(errors[0]).toContain('catalog.json');
    expect(runModuleCensusCli(['--invalid'], stdout, stderr)).toBe(1);
    expect(errors[1]).toContain('unknown argument');
  });

  test('module schema enforces exact identity, atom bounds, hashes and supported fields', () => {
    const schema = JSON.parse(readFileSync(schemaPath, 'utf8')) as Schema;
    expect(validateSchemaDefinition(schema)).toEqual([]);
    const value = {
      schema: 'VPInstructionModule/v1', instruction_id: 'module-demo-source-abcdef12-c01', title: 'Packaging carrier', summary: 'Original atoms packaged losslessly.',
      source: '{"donor":"demo","path":"source.md"}', atom_ids: ['atom-a', 'atom-b'], atom_count: 2,
      atoms: '[{"atom_id":"atom-a","file_sha256":"' + 'a'.repeat(64) + '","content_sha256":"' + 'b'.repeat(64) + '","file_bytes":10,"body_bytes":5}]',
      carrier_sha256: 'c'.repeat(64), carrier_bytes: 20, revision: 1, status: 'active',
    };
    expect(validateAgainstSchema(value, schema)).toEqual([]);
    expect(validateAgainstSchema({ ...value, module_id: 'module-demo' }, schema)).toContain('module_id: additional property');
    expect(validateAgainstSchema({ ...value, atom_ids: ['family-foo', 'atom-b'] }, schema)).toContain('atom_ids[0]: must match pattern');
    expect(validateAgainstSchema({ ...value, atom_ids: ['atom-a'] }, schema).length).toBeGreaterThan(0);
  });

  test('real corpus census remains opt-in and matches reconciled counts', () => {
    if (process.env.VP_REAL_CORPUS_TESTS !== '1') return;
    const census = buildModuleCensus(resolve(here, '..'));
    const catalog = JSON.parse(readFileSync(join(here, '..', 'catalog.json'), 'utf8')) as { instructions: unknown[] };
    expect(census.catalogInstructions).toBe(catalog.instructions.length);
    expect(census.csvAtoms).toBe(468);
    expect(census.rules['map-primary']).toMatchObject({ groups: 908, carriers: 1026, currentEntries: 1494, allIn: 2429 });
    expect(census.rules['first-provenance-donor-path']).toMatchObject({ groups: 929, carriers: 1050, currentEntries: 1518, allIn: 2453 });
    expect(census.rules['first-provenance-path-only']).toMatchObject({ groups: 928, carriers: 1049, currentEntries: 1517, allIn: 2452 });
    expect(census.rules['map-primary'].pilots['gsd-security-auditor']).toMatchObject({ expectedAtoms: 3, observedAtoms: 3, source: 'gsd-core:agents/gsd-security-auditor.compact.md' });
    expect(census.rules['first-provenance-donor-path'].pilots['gsd-security-auditor']).toMatchObject({ expectedAtoms: 3, observedAtoms: 3 });
    expect(census.rules['map-primary'].pilots['security-auditor']).toMatchObject({ expectedAtoms: 8, observedAtoms: 8 });
    expect(census.rules['first-provenance-donor-path'].pilots['security-auditor']).toMatchObject({ expectedAtoms: 8, observedAtoms: 7 });
  });
});
