import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import type { SpawnSyncReturns } from 'node:child_process';
import { existsSync } from 'node:fs';
import { cp, copyFile, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import * as fsPromises from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  decisionEvaluate,
  loadCatalog,
  loadInstructions,
} from '../skills/vp-mode/scripts/catalog.ts';
import type { DecisionRequest } from '../skills/vp-mode/scripts/catalog.ts';
import { defaultCatalogPath, isEntryPoint, runCatalogCli } from '../skills/vp-mode/scripts/catalog-cli.ts';
import { parseFrontmatter } from '../skills/vp-mode/scripts/frontmatter.ts';

const here = dirname(fileURLToPath(import.meta.url));
let fixtureDir: string;
const cliPath = resolve(here, '../skills/vp-mode/scripts/catalog-cli.ts');
const bunPath = process.execPath;
const profileDirs: string[] = [];
const originalFsPromises = { ...fsPromises };

beforeAll(async () => {
  fixtureDir = await mkdtemp(join(tmpdir(), 'vp-cli-v12-'));
  profileDirs.push(fixtureDir);
  await cp(join(here, 'fixtures/catalog'), fixtureDir, { recursive: true });
  await copyFile(join(here, '../config/vpinstruction.v1.2.schema.json'), join(fixtureDir, 'config/vpinstruction.v1.2.schema.json'));
  const path = join(fixtureDir, 'catalog.json');
  const catalog = await loadCatalog(path);
  for (const entry of catalog.instructions) {
    const sourcePath = join(fixtureDir, entry.path);
    const source = await readFile(sourcePath, 'utf8');
    const updated = source.replace(/^---\r?\n/u, '$&schema: VPInstruction/v1.2\nclassification_status: unclassified\nclassification_reason: Synthetic fixture.\n');
    await writeFile(sourcePath, updated);
    entry.sha256 = createHash('sha256').update(updated).digest('hex');
  }
  await writeFile(path, JSON.stringify(catalog));
});

afterAll(async () => {
  await Promise.all(profileDirs.map((directory) => rm(directory, { recursive: true, force: true })));
});

async function profileFile(value: unknown): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'vp-profile-'));
  profileDirs.push(directory);
  const path = join(directory, 'profile.json');
  await writeFile(path, typeof value === 'string' ? value : JSON.stringify(value), 'utf8');
  return path;
}

async function catalogWithProfileSchema(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'vp-profile-catalog-'));
  profileDirs.push(directory);
  await cp(fixtureDir, directory, { recursive: true });
  await copyFile(
    join(here, '../config/vpeffectiveprofile.v1.schema.json'),
    join(directory, 'config/vpeffectiveprofile.v1.schema.json'),
  );
  return join(directory, 'catalog.json');
}

async function catalogOnlySnapshot(includeSchema = true): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'vp-catalog-only-'));
  profileDirs.push(directory);
  await mkdir(join(directory, 'config'), { recursive: true });
  await copyFile(join(fixtureDir, 'catalog.json'), join(directory, 'catalog.json'));
  if (includeSchema) {
    await copyFile(join(fixtureDir, 'config/vpcatalog.v1.schema.json'), join(directory, 'config/vpcatalog.v1.schema.json'));
  }
  return join(directory, 'catalog.json');
}

async function catalogWithFacets(): Promise<string> {
  const catalogPath = await catalogWithProfileSchema();
  const directory = dirname(catalogPath);
  await copyFile(
    join(here, '../config/vpinstruction.v1.1.schema.json'),
    join(directory, 'config/vpinstruction.v1.1.schema.json'),
  );
  const catalog = await loadCatalog(catalogPath);
  const assignments: Array<[string, string]> = [
    ['alpha', 'schema: VPInstruction/v1.1\nclassification_status: classified\ninstruction_form: procedure\ndomains:\n  - engineering\n  - design-ux'],
    ['gamma', 'schema: VPInstruction/v1.1\nclassification_status: classified\ninstruction_form: principle\ndomains:\n  - engineering\n  - operations'],
    ['conflict-mode', 'schema: VPInstruction/v1.1\nclassification_status: classified\ninstruction_form: checklist\ndomains:\n  - product'],
    ['beta', 'schema: VPInstruction/v1.1\nclassification_status: unclassified\nclassification_reason: Needs owner review.'],
  ];
  for (const [id, fields] of assignments) {
    const entry = catalog.instructions.find((item) => item.instruction_id === id);
    if (entry === undefined) throw new Error(`fixture instruction ${id} is missing`);
    const path = join(directory, entry.path);
    const source = await readFile(path, 'utf8');
    const firstLine = source.indexOf('\n');
    if (firstLine < 0) throw new Error(`fixture instruction ${id} has no frontmatter delimiter`);
    const updated = source.replace(/schema: VPInstruction\/v1\.2\nclassification_status: unclassified\nclassification_reason: Synthetic fixture\.\n/u, fields.replace('VPInstruction/v1.1', 'VPInstruction/v1.2') + '\n');
    await writeFile(path, updated, 'utf8');
    entry.sha256 = createHash('sha256').update(updated).digest('hex');
  }
  await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
  return catalogPath;
}

async function catalogWithOversizedInstruction(): Promise<string> {
  const catalogPath = await catalogWithProfileSchema();
  const catalog = await loadCatalog(catalogPath);
  const alpha = catalog.instructions.find((item) => item.instruction_id === 'alpha');
  if (alpha === undefined) throw new Error('fixture alpha entry missing');
  const instructionPath = join(dirname(catalogPath), alpha.path);
  const source = await readFile(instructionPath, 'utf8');
  const frontmatter = /^---\r?\n[\s\S]*?\r?\n---\r?\n/u.exec(source);
  if (frontmatter === null) throw new Error('fixture alpha frontmatter missing');
  const bytes = `${frontmatter[0]}${'x'.repeat(64_001)}\n`;
  await writeFile(instructionPath, bytes, 'utf8');
  alpha.sha256 = createHash('sha256').update(bytes).digest('hex');
  await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
  return catalogPath;
}

async function rewriteFixtureInstruction(
  catalogPath: string,
  id: string,
  update: (source: string) => string,
  refreshDigest = true,
): Promise<void> {
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8')) as {
    instructions: { instruction_id: string; path: string; sha256: string }[];
  };
  const entry = catalog.instructions.find((item) => item.instruction_id === id);
  if (entry === undefined) throw new Error('fixture instruction entry missing: ' + id);
  const instructionPath = join(dirname(catalogPath), entry.path);
  const source = await readFile(instructionPath, 'utf8');
  const updated = update(source);
  if (updated === source) throw new Error('fixture instruction was not changed: ' + id);
  await writeFile(instructionPath, updated, 'utf8');
  if (!refreshDigest) return;
  entry.sha256 = createHash('sha256').update(updated).digest('hex');
  await writeFile(catalogPath, JSON.stringify(catalog, null, 2) + '\n', 'utf8');
}

async function assess(catalogPath: string, id: string, rows: string[]): Promise<void> {
  await rewriteFixtureInstruction(catalogPath, id, (source) => {
    const body = parseFrontmatter(source).body;
    const digest = createHash('sha256').update(body).digest('hex');
    const metadata = `approach_body_sha256: ${digest}\napproach_assessments:\n${rows.map(row => `  - "${row}; evidence=body:0-1"`).join('\n')}\n`;
    return source.replace('schema: VPInstruction/v1.2\n', `schema: VPInstruction/v1.2\n${metadata}`);
  });
}

test('approach selector explain and required conflicts on a v1.2 snapshot', async () => {
  const catalogPath = await catalogWithProfileSchema();
  await assess(catalogPath, 'alpha', ['dimension=execution; state=declared; values=solo,delegated', 'dimension=review-requirement; state=unknown; reason=insufficient']);
  await assess(catalogPath, 'beta', ['dimension=execution; state=declared; values=delegated', 'dimension=review-requirement; state=no-decision; reason=none stated']);
  await assess(catalogPath, 'gamma', ['dimension=execution; state=not-applicable; reason=irrelevant']);
  const args = ['--catalog', catalogPath, '--approach', 'execution=solo', '--approach', 'review-requirement=independent'];
  const search = runCli(['search', ...args]);
  expect(search.status).toBe(0);
  const ids = search.stdout.trim().split('\n').map(line => line.split('\t')[0] ?? '');
  expect(ids).toContain('alpha');
  expect(ids).toContain('gamma');
  expect(ids).not.toContain('beta');
  const explanation = runCli(['explain', ...args]);
  expect(explanation.status).toBe(0);
  const result = JSON.parse(explanation.stdout) as { bindings: Record<string, string>; candidates: { instruction_id: string; included: boolean; source_sha256: string; body_sha256: string; dimensions: { decision: string }[] }[] };
  expect(result.candidates.filter(row => row.included).map(row => row.instruction_id)).toEqual(ids);
  expect(result.candidates.find(row => row.instruction_id === 'beta')?.dimensions.map(row => row.decision)).toEqual(['contradictory', 'no-decision']);
  const catalog = await loadCatalog(catalogPath);
  const alpha = catalog.instructions.find(entry => entry.instruction_id === 'alpha');
  expect(result.candidates.find(row => row.instruction_id === 'alpha')?.source_sha256).toBe(alpha?.sha256);
  if (alpha === undefined) throw new Error('alpha missing');
  const alphaSource = await readFile(join(dirname(catalogPath), alpha.path), 'utf8');
  expect(result.candidates.find(row => row.instruction_id === 'alpha')?.body_sha256).toBe(createHash('sha256').update(parseFrontmatter(alphaSource).body).digest('hex'));
  expect(result.bindings.catalog_sha256).toBe(createHash('sha256').update(await readFile(catalogPath)).digest('hex'));
  expect(result.bindings.instruction_schema_sha256).toBe(createHash('sha256').update(await readFile(join(dirname(catalogPath), 'config/vpinstruction.v1.2.schema.json'))).digest('hex'));
  expect(result.bindings.policy_sha256).toBe(createHash('sha256').update(await readFile(join(here, '../config/methodology-profile.json'))).digest('hex'));
  const profilePath = await profileFile({ schema: 'VPEffectiveProfile/v1', groups: {}, unresolved_groups: {} });
  const conflict = runCli(['get', '--catalog', catalogPath, '--id', 'beta', '--profile', profilePath, '--approach', 'execution=solo']);
  expect(conflict.status).toBe(1);
  expect(conflict.stdout).toBe('');
  expect(conflict.stderr).toContain('beta');
  const dependencyConflict = runCli(['get', '--catalog', catalogPath, '--id', 'alpha', '--profile', profilePath, '--approach', 'execution=solo']);
  expect(dependencyConflict.status).toBe(1);
  expect(dependencyConflict.stdout).toBe('');
  expect(dependencyConflict.stderr).toContain('beta');
  const hardConflict = runCli(['get', '--catalog', catalogPath, '--id', 'alpha', 'conflict-mode', '--profile', profilePath, '--approach', 'execution=delegated']);
  expect(hardConflict.status).toBe(1);
  expect(hardConflict.stdout).toBe('');
  expect(hardConflict.stderr).toContain('exclude each other');
  const valid = runCli(['get', '--catalog', catalogPath, '--id', 'guidance', '--profile', profilePath, '--approach', 'execution=solo']);
  if (valid.status !== 0) throw new Error(valid.stderr);
  expect(valid.status).toBe(0);
  expect(valid.stdout).not.toContain('assessment');
  for (const invalidArgs of [['--approach', 'execution=swarm'], ['--approach', 'other=solo'], ['--approach', 'execution=solo', '--approach', 'execution=delegated'], ['--limit', '1']]) {
    const invalid = runCli(['explain', '--catalog', catalogPath, ...invalidArgs]);
    expect(invalid.status).toBe(1);
    expect(invalid.stdout).toBe('');
  }
  const repeated = runCli(['search', ...args, '--approach', 'execution=solo']);
  expect(repeated.stdout).toBe(search.stdout);
});

test('approach exclusions precede candidate profile negotiation in search and explain', async () => {
  const { catalogPath, group, alternatives } = await catalogWithPolicyAlternatives();
  await assess(catalogPath, 'alpha', ['dimension=execution; state=declared; values=delegated']);
  await assess(catalogPath, 'beta', ['dimension=execution; state=unknown; reason=insufficient']);
  const profilePath = await profileFile({ schema: 'VPEffectiveProfile/v1', groups: {}, unresolved_groups: { [group]: alternatives } });
  const common = ['--catalog', catalogPath, '--profile', profilePath, '--approach', 'execution=solo'];
  const excluded = runCli(['search', ...common, '--id', 'alpha']);
  expect(excluded.status).toBe(0);
  expect(excluded.stdout).toBe('');
  const explanation = runCli(['explain', ...common, '--id', 'alpha']);
  expect(explanation.status).toBe(0);
  expect(JSON.parse(explanation.stdout).candidates).toEqual([expect.objectContaining({ instruction_id: 'alpha', included: false })]);
  for (const command of ['search', 'explain']) {
    const uncertain = runCli([command, ...common, '--id', 'beta']);
    expect(uncertain.status).toBe(1);
    expect(uncertain.stdout).toBe('');
    expect(uncertain.stderr).toContain('unresolved');
  }
  const active = alternatives[0];
  if (active === undefined) throw new Error('missing alternative');
  const stale = await profileFile({ schema: 'VPEffectiveProfile/v1', groups: { [group]: { active, alternatives: [active] } }, unresolved_groups: {} });
  for (const command of ['search', 'explain']) {
    const invalid = runCli([command, '--catalog', catalogPath, '--profile', stale, '--id', 'alpha', '--approach', 'execution=solo']);
    expect(invalid.status).toBe(1);
    expect(invalid.stdout).toBe('');
    expect(invalid.stderr).toContain('refresh it with vp-setup');
  }
});

test('explain binds every discovery input digest and reports approach decisions without a profile', async () => {
  const catalogPath = await catalogWithProfileSchema();
  await assess(catalogPath, 'alpha', ['dimension=execution; state=declared; values=solo,delegated']);
  await assess(catalogPath, 'beta', ['dimension=execution; state=declared; values=delegated']);
  const result = await runInProcess(['explain', '--catalog', catalogPath, '--approach', 'execution=solo']);
  expect(result.status).toBe(0);
  expect(result.stderr).toBe('');
  const explained = JSON.parse(result.stdout) as {
    bindings: Record<string, string>;
    selectors: unknown[];
    candidates: { instruction_id: string; included: boolean; dimensions: { decision: string }[] }[];
  };
  expect(explained.bindings).toEqual({
    catalog_sha256: createHash('sha256').update(await readFile(catalogPath)).digest('hex'),
    catalog_schema_sha256: createHash('sha256').update(await readFile(join(dirname(catalogPath), 'config/vpcatalog.v1.schema.json'))).digest('hex'),
    instruction_schema_sha256: createHash('sha256').update(await readFile(join(dirname(catalogPath), 'config/vpinstruction.v1.2.schema.json'))).digest('hex'),
    policy_sha256: createHash('sha256').update(await readFile(join(here, '../config/methodology-profile.json'))).digest('hex'),
    policy_schema_sha256: createHash('sha256').update(await readFile(join(here, '../config/vpmethodologyprofile.v1.schema.json'))).digest('hex'),
  });
  expect(explained.selectors).toHaveLength(1);
  expect(explained.candidates.find((row) => row.instruction_id === 'alpha')?.included).toBe(true);
  expect(explained.candidates.find((row) => row.instruction_id === 'beta')).toMatchObject({
    included: false,
    dimensions: [{ decision: 'contradictory' }],
  });
});

test('explain adds the selected profile digests when a resolved profile is supplied', async () => {
  const catalogPath = await catalogWithProfileSchema();
  await assess(catalogPath, 'alpha', ['dimension=execution; state=declared; values=solo']);
  const profilePath = await profileFile({ schema: 'VPEffectiveProfile/v1', groups: {}, unresolved_groups: {} });
  const result = await runInProcess(['explain', '--catalog', catalogPath, '--profile', profilePath, '--approach', 'execution=solo']);
  expect(result.status).toBe(0);
  const explained = JSON.parse(result.stdout) as { bindings: Record<string, string>; candidates: { instruction_id: string; included: boolean }[] };
  expect(explained.bindings.profile_sha256).toBe(createHash('sha256').update(await readFile(profilePath)).digest('hex'));
  expect(explained.bindings.profile_schema_sha256).toBe(createHash('sha256').update(await readFile(join(dirname(catalogPath), 'config/vpeffectiveprofile.v1.schema.json'))).digest('hex'));
  expect(explained.candidates.find((row) => row.instruction_id === 'alpha')?.included).toBe(true);
});

test('browse counts retain uncertain and exclude contradictory approaches', async () => {
  const catalogPath = await catalogWithFacets();
  await assess(catalogPath, 'alpha', ['dimension=execution; state=declared; values=delegated']);
  await assess(catalogPath, 'gamma', ['dimension=execution; state=unknown; reason=insufficient']);
  const browse = runCli(['browse', '--catalog', catalogPath, '--axis', 'domain', '--approach', 'execution=solo']);
  expect(browse.status).toBe(0);
  expect(browse.stdout).toContain('domain:engineering\tDomain engineering; 1 active instructions.');
  expect(browse.stdout).toContain('domain:design-ux\tDomain design-ux; 0 active instructions.');
  expect(browse.stdout).toContain('domain:operations\tDomain operations; 1 active instructions.');
  const invalid = runCli(['browse', '--catalog', catalogPath, '--profile', 'unused']);
  expect(invalid.status).toBe(1);
  expect(invalid.stdout).toBe('');
});

test('get checks substituted dependency approaches and stays atomic on effective conflict', async () => {
  const { catalogPath, group, alternatives } = await catalogWithPolicyAlternatives();
  const policy = JSON.parse(await readFile(join(here, '../config/methodology-profile.json'), 'utf8')) as { groups: { id: string; alternatives: { id: string; instruction_ids: string[] }[] }[] };
  const canonical = policy.groups.find(item => item.id === group);
  const activeTag = alternatives[0];
  const inactiveTag = alternatives[1];
  const activeIds = canonical?.alternatives.find(item => item.id === activeTag)?.instruction_ids;
  const inactiveId = canonical?.alternatives.find(item => item.id === inactiveTag)?.instruction_ids[0];
  if (activeTag === undefined || inactiveTag === undefined || activeIds === undefined || activeIds.length === 0 || inactiveId === undefined) throw new Error('missing canonical mapping');
  const catalog = await loadCatalog(catalogPath);
  const beta = catalog.instructions.find(entry => entry.instruction_id === 'beta');
  if (beta === undefined) throw new Error('missing beta');
  const template = await readFile(join(dirname(catalogPath), beta.path), 'utf8');
  for (const [id, tag] of [[inactiveId, inactiveTag], ...activeIds.map(id => [id, activeTag])]) {
    if (id === undefined || tag === undefined) throw new Error('missing mapping');
    const path = `instructions/${id}.md`;
    const source = template.replace('instruction_id: beta', `instruction_id: ${id}`)
      .replace(`  - ${inactiveTag}`, `  - ${tag}`)
      .replace('compatibility_requires:\n  - gamma', 'compatibility_requires: []');
    await writeFile(join(dirname(catalogPath), path), source);
    catalog.instructions.push({ instruction_id: id, path, sha256: createHash('sha256').update(source).digest('hex') });
  }
  await writeFile(catalogPath, JSON.stringify(catalog));
  await rewriteFixtureInstruction(catalogPath, 'alpha', source => source.replace('compatibility_requires:\n  - beta', `compatibility_requires:\n  - ${inactiveId}`));
  await assess(catalogPath, inactiveId, ['dimension=execution; state=declared; values=delegated']);
  for (const id of activeIds) await assess(catalogPath, id, ['dimension=execution; state=declared; values=solo,delegated']);
  const profilePath = await profileFile({ schema: 'VPEffectiveProfile/v1', groups: { [group]: { active: activeTag, alternatives } }, unresolved_groups: {} });
  const args = ['get', '--catalog', catalogPath, '--id', 'alpha', '--profile', profilePath, '--approach', 'execution=solo'];
  const compatible = runCli(args);
  expect(compatible.status).toBe(0);
  expect(compatible.stdout).toContain('Beta body.');
  const conflictId = activeIds[0];
  if (conflictId === undefined) throw new Error('missing active mapping');
  await rewriteFixtureInstruction(catalogPath, conflictId, source => source.replace('values=solo,delegated', 'values=delegated'));
  const conflict = runCli(args);
  expect(conflict.status).toBe(1);
  expect(conflict.stdout).toBe('');
  expect(conflict.stderr).toContain(conflictId);
});

async function catalogWithLargeProjection(): Promise<string> {
  const catalogPath = await catalogWithProfileSchema();
  const marker = 'Guidance body.\n';
  await rewriteFixtureInstruction(catalogPath, 'guidance', (source) => {
    if (!source.endsWith(marker)) throw new Error('fixture guidance body marker is missing');
    return source.slice(0, -marker.length) + 'x'.repeat(63_980);
  });
  return catalogPath;
}

async function catalogWithPolicyAlternatives(): Promise<{ catalogPath: string; group: string; alternatives: string[] }> {
  const catalogPath = await catalogWithProfileSchema();
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8')) as {
    tag_dictionary: { pattern: Record<string, string> };
    instructions: { instruction_id: string; path: string; sha256: string }[];
  };
  const sourcePath = join(here, '../config/methodology-profile.json');
  const methodology = JSON.parse(await readFile(sourcePath, 'utf8')) as {
    groups: { id: string; alternatives: { id: string }[] }[];
  };
  const group = methodology.groups.find((item) => item.id === 'approval-policy');
  const first = group?.alternatives[0];
  const second = group?.alternatives[1];
  if (group === undefined || first === undefined || second === undefined) throw new Error('canonical approval-policy alternatives are missing');
  for (const alternative of [first, second]) catalog.tag_dictionary.pattern[alternative.id] = `Fixture policy alternative ${alternative.id}.`;
  for (const [id, tag] of [['alpha', first.id], ['beta', second.id]]) {
    const entry = catalog.instructions.find((item) => item.instruction_id === id);
    if (entry === undefined) throw new Error(`fixture instruction ${id} is missing`);
    const path = join(dirname(catalogPath), entry.path);
    const source = await readFile(path, 'utf8');
    const match = /^pattern_tags:\r?\n(?:  - [^\r\n]*\r?\n)*/mu.exec(source);
    if (match === null) throw new Error(`fixture pattern_tags are missing for ${id}`);
    const updated = source.replace(match[0], `pattern_tags:\n  - ${tag}\n`);
    await writeFile(path, updated, 'utf8');
    entry.sha256 = createHash('sha256').update(updated).digest('hex');
  }
  await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
  return { catalogPath, group: group.id, alternatives: [first.id, second.id] };
}

function runCli(
  args: string[],
  cwd = process.env.TMP ?? process.env.TEMP ?? '.',
  scriptPath = cliPath,
): SpawnSyncReturns<string> {
  return spawnSync(bunPath, [scriptPath, ...args], {
    cwd,
    encoding: 'utf8',
  });
}

function observationEvent(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    kind: 'observation',
    finding_id: 'cli-finding-1',
    problem: 'CLI findings test input',
    evidence: ['test-only evidence'],
    source: { origin: 'observed', actor: 'cli-test', reference: 'process-test' },
    product: 'vida-powers',
    work_scope: 'VP-6 findings caller',
    blocking_impact: 'non-blocking test input',
    context: {},
    provenance: ['tests/catalog-cli.test.ts'],
    ...overrides,
  };
}

async function findingsFiles(event: unknown): Promise<{ directory: string; storePath: string; eventPath: string }> {
  const directory = await mkdtemp(join(tmpdir(), 'vp-findings-cli-'));
  profileDirs.push(directory);
  const storePath = join(directory, 'findings.jsonl');
  const eventPath = join(directory, 'event.json');
  await writeFile(eventPath, JSON.stringify(event), 'utf8');
  return { directory, storePath, eventPath };
}

async function cliWithoutCatalog(): Promise<{ directory: string; scriptPath: string }> {
  const directory = await mkdtemp(join(tmpdir(), 'vp-cli-no-catalog-'));
  profileDirs.push(directory);
  const sourceScripts = join(here, '../skills/vp-mode/scripts');
  const destinationScripts = join(directory, 'skills/vp-mode/scripts');
  await mkdir(destinationScripts, { recursive: true });
  for (const entry of await readdir(sourceScripts, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.ts')) {
      await copyFile(join(sourceScripts, entry.name), join(destinationScripts, entry.name));
    }
  }
  return { directory, scriptPath: join(destinationScripts, 'catalog-cli.ts') };
}

function oneJsonLine(value: string | Uint8Array): unknown {
  const text = typeof value === 'string' ? value : new TextDecoder().decode(value);
  expect(text.endsWith('\n')).toBe(true);
  expect(text.slice(0, -1).includes('\n')).toBe(false);
  return JSON.parse(text) as unknown;
}

function fixtureArgs(args: string[]): string[] {
  const [command, ...options] = args;
  return [command ?? '', '--catalog', join(fixtureDir, 'catalog.json'), ...options];
}

function stdoutJson(result: ReturnType<typeof spawnSync>): unknown {
  return JSON.parse(result.stdout as string) as unknown;
}

function stderrJson(result: ReturnType<typeof spawnSync>): { code: string; message: string; details: Record<string, unknown> } {
  return JSON.parse(result.stderr as string) as { code: string; message: string; details: Record<string, unknown> };
}

async function runInProcess(args: string[]): Promise<{ status: number; stdout: string; stderr: string }> {
  let stdout = '';
  let stderr = '';
  const status = await runCatalogCli([bunPath, cliPath, ...args], {
    stdout: (text) => { stdout += text; },
    stderr: (text) => { stderr += text; },
  }, () => undefined);
  if (status === undefined) throw new Error('CLI entry was not invoked');
  return { status, stdout, stderr };
}

describe('catalog CLI', () => {
  test('findings queries before append, uses explicit paths across CWDs, and dispatches without catalog loading', async () => {
    const event = observationEvent();
    const { directory, storePath, eventPath } = await findingsFiles(event);
    const otherCwd = await mkdtemp(join(tmpdir(), 'vp-findings-cwd-'));
    profileDirs.push(otherCwd);
    const isolatedCli = await cliWithoutCatalog();

    const beforeAppend = runCli([
      'findings', 'candidates', '--store', storePath, '--event-file', eventPath,
    ], otherCwd, isolatedCli.scriptPath);
    expect(beforeAppend.status).toBe(0);
    expect(beforeAppend.stderr).toBe('');
    expect(oneJsonLine(beforeAppend.stdout)).toMatchObject({ candidates: [] });
    expect(await readFile(eventPath, 'utf8')).toBe(JSON.stringify(event));

    const appended = runCli([
      'findings', 'append', '--store', storePath, '--event-file', eventPath,
    ], otherCwd, isolatedCli.scriptPath);
    expect(appended.status).toBe(0);
    expect(appended.stderr).toBe('');
    expect(oneJsonLine(appended.stdout)).toMatchObject({ operation: 'append', outcome: 'appended' });
    const originalBytes = await readFile(storePath, 'utf8');

    const afterAppend = runCli([
      'findings', 'candidates', '--store', storePath, '--event-file', eventPath,
    ], '.', isolatedCli.scriptPath);
    expect(afterAppend.status).toBe(0);
    expect(afterAppend.stderr).toBe('');
    expect(oneJsonLine(afterAppend.stdout)).toMatchObject({ candidates: [expect.objectContaining({ event })] });

    const replay = runCli(['findings', 'append', '--store', storePath, '--event-file', eventPath], otherCwd);
    expect(replay.status).toBe(0);
    expect(oneJsonLine(replay.stdout)).toMatchObject({ operation: 'append', outcome: 'replayed' });
    expect(await readFile(storePath, 'utf8')).toBe(originalBytes);

    await writeFile(eventPath, JSON.stringify(observationEvent({ evidence: ['changed evidence'] })), 'utf8');
    const reusedId = runCli(['findings', 'append', '--store', storePath, '--event-file', eventPath], otherCwd);
    expect(reusedId.status).toBe(1);
    expect(reusedId.stdout).toBe('');
    expect(oneJsonLine(reusedId.stderr)).toMatchObject({ code: 'FINDING_ID_CONFLICT' });
    expect(await readFile(storePath, 'utf8')).toBe(originalBytes);
  });

  test('findings validates event files and serializes stable errors without leaking sentinels', async () => {
    const sentinel = 'PRIVATE_FINDING_EVENT_SENTINEL_9F23';
    const event = observationEvent({ problem: sentinel });
    const { directory, storePath, eventPath } = await findingsFiles(event);
    const malformedPath = join(directory, 'malformed.json');
    const missingPath = join(directory, 'missing.json');
    await writeFile(malformedPath, '{', 'utf8');

    const malformed = runCli(['findings', 'append', '--store', storePath, '--event-file', malformedPath]);
    expect(malformed.status).toBe(1);
    expect(malformed.stdout).toBe('');
    expect(oneJsonLine(malformed.stderr)).toMatchObject({ code: 'FINDING_INPUT_JSON_INVALID' });

    const missing = runCli(['findings', 'append', '--store', storePath, '--event-file', missingPath]);
    expect(missing.status).toBe(1);
    expect(missing.stdout).toBe('');
    expect(oneJsonLine(missing.stderr)).toMatchObject({ code: 'FINDING_INPUT_READ_FAILED' });
    expect(missing.stderr).not.toContain(missingPath);
    expect(missing.stderr).not.toMatch(/ENOENT|Error:|stack/iu);

    const parentFile = join(directory, 'not-a-directory');
    await writeFile(parentFile, 'test-only', 'utf8');
    const invalidStore = join(parentFile, 'findings.jsonl');
    const filesystemFailure = runCli([
      'findings', 'append', '--store', invalidStore, '--event-file', eventPath,
    ], undefined, (await cliWithoutCatalog()).scriptPath);
    expect(filesystemFailure.status).toBe(1);
    expect(filesystemFailure.stdout).toBe('');
    expect(oneJsonLine(filesystemFailure.stderr)).toMatchObject({ code: 'FINDING_STORE_PATH_INVALID' });
    expect(filesystemFailure.stderr).not.toContain(sentinel);
    expect(filesystemFailure.stderr).not.toMatch(/ENOTDIR|Error:|stack/iu);
  });

  test('findings rejects malformed event shapes and merge-event candidate queries', async () => {
    const { storePath, eventPath } = await findingsFiles({ ...observationEvent(), provenance: [] });
    const invalidShape = runCli(['findings', 'append', '--store', storePath, '--event-file', eventPath]);
    expect(invalidShape.status).toBe(1);
    expect(invalidShape.stdout).toBe('');
    expect(oneJsonLine(invalidShape.stderr)).toMatchObject({ code: 'FINDING_INVALID' });

    await writeFile(eventPath, JSON.stringify({
      kind: 'merge', canonical_finding_id: 'a', duplicate_finding_id: 'b',
      source: { origin: 'reported', actor: 'cli-test', reference: 'merge-query' },
      evidence: ['test-only'], context: {}, provenance: ['tests/catalog-cli.test.ts'],
    }), 'utf8');
    const query = runCli(['findings', 'candidates', '--store', storePath, '--event-file', eventPath]);
    expect(query.status).toBe(1);
    expect(query.stdout).toBe('');
    expect(oneJsonLine(query.stderr)).toMatchObject({ code: 'FINDING_CANDIDATE_QUERY_INVALID' });

    const missingMergeTargets = runCli(['findings', 'append', '--store', storePath, '--event-file', eventPath]);
    expect(missingMergeTargets.status).toBe(1);
    expect(missingMergeTargets.stdout).toBe('');
    expect(oneJsonLine(missingMergeTargets.stderr)).toMatchObject({ code: 'FINDING_MERGE_TARGET_MISSING' });
  });

  test('findings parser errors never echo positional values, operations, or unknown flags', async () => {
    const sentinel = 'private-event-sentinel-17d4a9';
    const { storePath, eventPath } = await findingsFiles(observationEvent({ problem: sentinel }));
    const invalidArguments = [
      ['findings', 'append', '--store', storePath, '--event-file', eventPath, sentinel],
      ['findings', 'append', '--store', storePath, '--event-file', eventPath, `--${sentinel}`],
      ['findings', sentinel],
    ];

    for (const args of invalidArguments) {
      const result = runCli(args);
      expect(result.status).toBe(1);
      expect(result.stdout).toBe('');
      expect(oneJsonLine(result.stderr)).toMatchObject({ code: 'CATALOG_INVALID' });
      expect(result.stderr).not.toContain(sentinel);
    }
    expect(existsSync(storePath)).toBe(false);
  });

  test('findings rejects catalog-only and JSON-mode flags', async () => {
    const { storePath, eventPath } = await findingsFiles(observationEvent());
    const missingCatalog = join(tmpdir(), 'not-a-findings-catalog.json');

    for (const extra of [['--catalog', missingCatalog], ['--json']]) {
      const result = runCli(['findings', 'candidates', '--store', storePath, '--event-file', eventPath, ...extra]);
      expect(result.status).toBe(1);
      expect(result.stdout).toBe('');
      expect(oneJsonLine(result.stderr)).toMatchObject({ code: 'CATALOG_INVALID' });
      expect(existsSync(storePath)).toBe(false);
    }
  });

  test('findings rejects raw dot components in event paths before reading or writing', async () => {
    const { directory, storePath } = await findingsFiles(observationEvent());
    const separators = process.platform === 'win32' ? ['\\', '/'] : ['/'];

    for (const separator of separators) {
      for (const component of ['.', '..']) {
        const middle = component === '.' ? `.${separator}` : `child${separator}..${separator}`;
        const eventPath = `${directory}${separator}${middle}missing-event.json`;
        const result = runCli(['findings', 'candidates', '--store', storePath, '--event-file', eventPath]);
        expect(result.status).toBe(1);
        expect(result.stdout).toBe('');
        expect(oneJsonLine(result.stderr)).toMatchObject({ code: 'FINDING_INPUT_PATH_INVALID' });
        expect(existsSync(storePath)).toBe(false);
      }
    }
  });

  test('findings rejects a final event-file junction before reading it', async () => {
    const { directory, storePath } = await findingsFiles(observationEvent());
    const eventDirectory = join(directory, 'event-directory');
    await mkdir(eventDirectory);
    const eventPath = join(directory, 'event-link.json');
    await symlink(eventDirectory, eventPath, 'junction');

    const result = runCli(['findings', 'candidates', '--store', storePath, '--event-file', eventPath]);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(oneJsonLine(result.stderr)).toMatchObject({ code: 'FINDING_INPUT_PATH_INVALID' });
  });

  test('tags emits compact rows and places exact declared aliases before token matches', () => {
    const result = runCli(fixtureArgs(['tags', '--query', 'tdd', 'test']));
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout.split('\n').filter(Boolean)).toEqual([
      'pattern:test-first-development\tWrite tests first.',
      'capability:test-design\tDesign behavior tests.',
      'pattern:test-after-development\tTest after implementation.',
    ]);
    expect(result.stdout).not.toContain('{');
  });

  test('tags accepts one multi-word query occurrence and applies ANY or ALL literally', () => {
    const any = runCli(fixtureArgs(['tags', '--query', 'pr', 'review']));
    expect(any.status).toBe(0);
    expect(any.stdout).toBe('capability:evidence-review\tReview evidence.\n');

    const all = runCli(fixtureArgs(['tags', '--query', 'tdd', 'test-first', 'TDD', '--match', 'all']));
    expect(all.status).toBe(0);
    expect(all.stdout).toBe('pattern:test-first-development\tWrite tests first.\n');
  });

  test('tags deduplicates repeated query aliases before offset and limit', () => {
    const result = runCli(fixtureArgs(['tags', '--query', 'tdd', 'test-first', 'TDD', '--match', 'all', '--limit', '1', '--offset', '1']));
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('pagination: showing 0 of 1; no more rows\n');
  });

  test('tags reads a catalog-only snapshot without instruction bodies', async () => {
    const catalogPath = await catalogOnlySnapshot();
    const directory = dirname(catalogPath);
    const entries = await readdir(directory);
    expect(entries).toHaveLength(2);
    expect(entries).toEqual(expect.arrayContaining(['catalog.json', 'config']));
    expect(await readdir(join(directory, 'config'))).toEqual(['vpcatalog.v1.schema.json']);
    const result = await runInProcess(['tags', '--catalog', catalogPath]);
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('capability:test-design\tDesign behavior tests.');
    expect(result.stdout).not.toContain('Alpha instruction');
  });

  test('tags does not borrow the production schema for an explicit incomplete snapshot', async () => {
    const catalogPath = await catalogOnlySnapshot(false);
    const result = await runInProcess(['tags', '--catalog', catalogPath]);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('cannot read vpcatalog.v1.schema.json');
  });

  test('search emits ID and summary once across tags with no JSON metadata columns', () => {
    const result = runCli(fixtureArgs(['search', '--capability', 'test-design', 'acceptance-design', '--pattern', 'test-first-development']));
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toBe('alpha\tApplies to implementation tasks.\nbeta\tDefines acceptance checks.\n');
    expect(result.stdout).not.toContain('Alpha instruction');
    expect(result.stdout).not.toContain('revision');
  });

  test('search pagination follows candidate dedup and no-facet search keeps legacy records', () => {
    const paged = runCli(fixtureArgs([
      'search', '--capability', 'test-design', 'acceptance-design', '--pattern', 'test-first-development', '--limit', '1', '--offset', '1',
    ]));
    expect(paged.status).toBe(0);
    expect(paged.stdout).toBe('beta\tDefines acceptance checks.\n');
    expect(paged.stderr).toBe('pagination: showing 1 of 2; no more rows\n');

    const broad = runCli(fixtureArgs(['search']));
    expect(broad.status).toBe(0);
    expect(broad.stdout).toContain('guidance\tA guidance instruction with no artifact output.');
    expect(broad.stdout).toContain('beta\tDefines acceptance checks.');
  });

  test('search preserves distinct instruction IDs from opposing tag matches', () => {
    const result = runCli(fixtureArgs(['search', '--pattern', 'test-first-development', 'test-after-development']));
    expect(result.status).toBe(0);
    expect(result.stdout.split('\n').filter(Boolean).map((line) => line.split('\t')[0])).toEqual([
      'alpha', 'beta', 'conflict-mode', 'gamma',
    ]);
  });

  test('search accepts multi-value facet lists and normalizes duplicate values before validation', async () => {
    const catalogPath = await catalogWithFacets();
    const search = runCli([
      'search', '--catalog', catalogPath,
      '--form', 'procedure', 'procedure', 'principle',
      '--domain', 'engineering', 'engineering', 'design-ux',
      '--classification-status', 'classified', 'classified',
    ]);
    expect(search.status).toBe(0);
    expect(search.stderr).toBe('');
    expect(search.stdout).toBe('alpha\tApplies to implementation tasks.\ngamma\tSupplies a transitive dependency.\n');
  });

  test('browse emits dimension-qualified domain/form groups, including known zero and unclassified groups', async () => {
    const catalogPath = await catalogWithFacets();
    const domain = runCli(['browse', '--catalog', catalogPath, '--axis', 'domain']);
    expect(domain.status).toBe(0);
    expect(domain.stderr).toBe('');
    expect(domain.stdout.split('\n').filter(Boolean).map((line) => line.split('\t')[0])).toEqual([
      'domain:business', 'domain:design-ux', 'domain:engineering', 'domain:operations', 'domain:product', 'domain:research',
      'classification_status:unclassified',
    ]);
    expect(domain.stdout).toContain('domain:business\tDomain business; 0 active instructions.');
    expect(domain.stdout).toContain('classification_status:unclassified\t2 active instructions are unclassified.');

    const form = runCli(['browse', '--catalog', catalogPath, '--axis', 'form']);
    expect(form.status).toBe(0);
    expect(form.stdout.split('\n').filter(Boolean).map((line) => line.split('\t')[0])).toEqual([
      'form:checklist', 'form:decision-rule', 'form:principle', 'form:procedure', 'classification_status:unclassified',
    ]);
    expect(form.stdout).toContain('form:decision-rule\tExpresses a conditional choice or obligation. 0 active instructions.');

    const all = runCli(['browse', '--catalog', catalogPath]);
    expect(all.status).toBe(0);
    expect(all.stdout.split('\n').filter(Boolean)).toHaveLength(11);
    expect(all.stdout).toContain('domain:engineering\tDomain engineering; 2 active instructions.');
    expect(all.stdout).toContain('form:procedure\tRequires an ordered action sequence. 1 active instructions.');
    expect(all.stdout).not.toContain('instruction_ids');
  });

  test('browse paginates unique groups and rejects unsupported policy axes', async () => {
    const catalogPath = await catalogWithFacets();
    const paged = runCli(['browse', '--catalog', catalogPath, '--axis', 'domain', '--limit', '1', '--offset', '1']);
    expect(paged.status).toBe(0);
    expect(paged.stdout).toBe('domain:design-ux\tDomain design-ux; 1 active instructions.\n');
    expect(paged.stderr).toBe('pagination: showing 1 of 7; next: --offset 2 (5 remaining; same search, not a new query)\n');

    const unsupported = await runInProcess(['browse', '--catalog', catalogPath, '--axis', 'policy']);
    expect(unsupported.status).toBe(1);
    expect(unsupported.stdout).toBe('');
    expect(unsupported.stderr).toContain('flag --axis must be domain or form');
  });

  test('search rejects duplicate option occurrences, unsupported values and compact JSON mode', async () => {
    const catalogPath = await catalogWithFacets();
    for (const args of [
      ['--form', 'procedure', '--form', 'principle'],
      ['--domain', 'unknown-domain'],
      ['--form', ''],
      ['--limit', '1', '--limit', '2'],
      ['--json'],
      ['--query', 'BM25'],
    ]) {
      const result = await runInProcess(['search', '--catalog', catalogPath, ...args]);
      expect(result.status).toBe(1);
      expect(result.stdout).toBe('');
      expect(result.stderr.trim()).not.toBe('');
      expect(result.stderr).not.toMatch(/^\{/u);
    }
    for (const command of ['tags', 'search', 'browse']) {
      const jsonMode = await runInProcess([command, '--catalog', catalogPath, '--json']);
      expect(jsonMode.status).toBe(1);
      expect(jsonMode.stdout).toBe('');
      expect(jsonMode.stderr).not.toMatch(/^\{/u);
    }
    const missingQuery = await runInProcess(['tags', '--query', '--match', 'any']);
    expect(missingQuery.status).toBe(1);
    expect(missingQuery.stdout).toBe('');
    expect(missingQuery.stderr).toContain('missing value for --query');
  });

  test('search accepts comma-separated instruction ids', () => {
    const result = runCli(fixtureArgs(['search', '--id', 'alpha,beta']));
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('alpha\tApplies to implementation tasks.\nbeta\tDefines acceptance checks.\n');
  });

  test('search product comma list returns the union of both product matches', () => {
    const idsFor = (product: string): string[] => {
      const result = runCli(fixtureArgs(['search', '--product', product]));
      expect(result.status).toBe(0);
      return result.stdout.split('\n').filter(Boolean).map((line) => line.split('\t')[0] ?? '').sort();
    };
    const expected = [...new Set([...idsFor('vida-powers'), ...idsFor('agent-runtime')])].sort();
    const result = runCli(fixtureArgs(['search', '--product', 'vida-powers,agent-runtime']));
    expect(result.status).toBe(0);
    expect(result.stdout.split('\n').filter(Boolean).map((line) => line.split('\t')[0] ?? '').sort()).toEqual(expected);
  });

  test('search unknown tag emits concise stderr and no partial stdout', () => {
    const result = runCli(fixtureArgs(['search', '--capability', 'unknown-tag']));
    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('unknown capability query tag unknown-tag');
    expect(result.stderr).not.toMatch(/^\{/u);
  });

  test('search with a resolved profile filters inactive alternatives', async () => {
    const { catalogPath, group, alternatives } = await catalogWithPolicyAlternatives();
    const active = alternatives[0];
    if (active === undefined) throw new Error('fixture active alternative is missing');
    const profilePath = await profileFile({
      schema: 'VPEffectiveProfile/v1',
      groups: { [group]: { active, alternatives } },
      unresolved_groups: {},
    });
    const result = await runInProcess(['search', '--catalog', catalogPath, '--id', 'alpha', 'beta', '--profile', profilePath]);
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toBe('alpha\tApplies to implementation tasks.\n');
  });

  test('profile-aware search reports stale data before needed unresolved choices', async () => {
    const { catalogPath, group, alternatives } = await catalogWithPolicyAlternatives();
    const active = alternatives[0];
    if (active === undefined) throw new Error('fixture active alternative is missing');
    const staleProfile = await profileFile({
      schema: 'VPEffectiveProfile/v1',
      groups: { [group]: { active, alternatives: [active] } },
      unresolved_groups: {},
    });
    const stale = runCli(['search', '--catalog', catalogPath, '--id', 'alpha', '--profile', staleProfile]);
    expect(stale.status).toBe(1);
    expect(stale.stdout).toBe('');
    expect(stale.stderr).toContain('refresh it with vp-setup');
    expect(stale.stderr).not.toMatch(/^\{/u);

    const unresolvedProfile = await profileFile({
      schema: 'VPEffectiveProfile/v1',
      groups: {},
      unresolved_groups: { [group]: alternatives },
    });
    const unresolved = runCli(['search', '--catalog', catalogPath, '--id', 'alpha', '--profile', unresolvedProfile]);
    expect(unresolved.status).toBe(1);
    expect(unresolved.stdout).toBe('');
    expect(unresolved.stderr).toContain('policy group ' + group + ' is unresolved');
    expect(unresolved.stderr).not.toMatch(/^\{/u);
  });

  test('get emits unique required IDs and transitive dependencies as one plain-text batch', async () => {
    const catalogPath = await catalogWithProfileSchema();
    const profilePath = await profileFile({ schema: 'VPEffectiveProfile/v1', groups: {}, unresolved_groups: {} });
    const result = runCli(['get', '--catalog', catalogPath, '--id', 'alpha', 'beta', 'alpha', '--profile', profilePath]);
    expect(result.status).toBe(0);
    expect(result.stderr).toContain('bundle: ');
    expect(result.stdout).not.toContain('{');
    expect((result.stdout.match(/Alpha body\./gu) ?? []).length).toBe(1);
    expect((result.stdout.match(/Beta body\./gu) ?? []).length).toBe(1);
    expect((result.stdout.match(/Gamma body\./gu) ?? []).length).toBe(1);
    expect(result.stdout.indexOf('Alpha body.')).toBeLessThan(result.stdout.indexOf('Beta body.'));
    expect(result.stdout.indexOf('Beta body.')).toBeLessThan(result.stdout.indexOf('Gamma body.'));
  });

  test('get rejects a later missing ID without partial stdout', async () => {
    const catalogPath = await catalogWithProfileSchema();
    const profilePath = await profileFile({ schema: 'VPEffectiveProfile/v1', groups: {}, unresolved_groups: {} });
    const result = runCli(['get', '--catalog', catalogPath, '--id', 'alpha', 'missing', '--profile', profilePath]);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('unknown instruction id: missing');
    expect(result.stderr).not.toMatch(/^\{/u);
  });

  test('get preserves literal Unicode body, source conditions, and artifact obligations', async () => {
    const catalogPath = await catalogWithProfileSchema();
    await rewriteFixtureInstruction(catalogPath, 'alpha', (source) => source.replace(
      'Alpha body.\n',
      'Alpha body keeps caf\u00e9, \u03a9, and --query literally.\nApplies when: implementation code changes, code. changes\nRequired data: cases\n',
    ));
    const profilePath = await profileFile({ schema: 'VPEffectiveProfile/v1', groups: {}, unresolved_groups: {} });
    const result = runCli(['get', '--catalog', catalogPath, '--id', 'alpha', '--profile', profilePath]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Alpha body keeps caf\u00e9, \u03a9, and --query literally.');
    expect(result.stdout.split('implementation code changes, code. changes').length - 1).toBe(1);
    expect(result.stdout).toContain('Does not apply when: documentation only');
    expect(result.stdout).toContain('Output type: test-suite');
    expect(result.stdout).toContain('Required data: cases');
    expect(result.stdout.split('Required data: cases').length - 1).toBe(1);
    expect(result.stdout).toContain('Verified by: bun test');
  });

  test('snapshot policy files cannot override canonical approval-policy requirements', async () => {
    const { catalogPath } = await catalogWithPolicyAlternatives();
    const config = join(dirname(catalogPath), 'config');
    await writeFile(join(config, 'methodology-profile.json'), JSON.stringify({ schema: 'VPMethodologyProfile/v1', groups: [] }), 'utf8');
    await writeFile(join(config, 'vpmethodologyprofile.v1.schema.json'), JSON.stringify({ type: 'object' }), 'utf8');
    const profilePath = await profileFile({ schema: 'VPEffectiveProfile/v1', groups: {}, unresolved_groups: {} });
    const result = await runInProcess(['get', '--catalog', catalogPath, '--id', 'alpha', '--profile', profilePath]);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('refresh it with vp-setup');
  });

  test('get preserves short obligations embedded incidentally in a larger word', async () => {
    const catalogPath = await catalogWithProfileSchema();
    await rewriteFixtureInstruction(catalogPath, 'alpha', source => source
      .replace('conditions_applies_when: implementation code changes, code. changes', 'conditions_applies_when: code')
      .replace('Alpha body.\n', 'Unicode keeps the word encoded literal.\n'));
    const profilePath = await profileFile({ schema: 'VPEffectiveProfile/v1', groups: {}, unresolved_groups: {} });
    const result = await runInProcess(['get', '--catalog', catalogPath, '--id', 'alpha', '--profile', profilePath]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Unicode keeps the word encoded literal.');
    expect(result.stdout).toContain('\nApplies when: code\n');
  });

  test('findings help includes its required operation in flag examples', async () => {
    const result = await runInProcess(['findings', '--help']);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('findings <append|candidates> --store');
    expect(result.stdout).not.toContain('  findings --store');
  });

  test('get keeps complementary same-theme instructions and rejects the declared hard opposite pair', async () => {
    const fixtureCatalog = await catalogWithProfileSchema();
    const profilePath = await profileFile({ schema: 'VPEffectiveProfile/v1', groups: {}, unresolved_groups: {} });
    const complementary = runCli(['get', '--catalog', fixtureCatalog, '--id', 'alpha', 'beta', '--profile', profilePath]);
    expect(complementary.status).toBe(0);
    expect(complementary.stdout).toContain('Alpha body.');
    expect(complementary.stdout).toContain('Beta body.');

    const productionCatalog = join(here, '../catalog.json');
    const hardOpposites = runCli([
      'get', '--catalog', productionCatalog, '--id',
      'keep-review-read-only', 'run-the-lenses-and-fix-what-they-find', '--profile', profilePath,
    ]);
    expect(hardOpposites.status).toBe(1);
    expect(hardOpposites.stdout).toBe('');
    expect(hardOpposites.stderr).toContain('keep-review-read-only');
    expect(hardOpposites.stderr).toContain('run-the-lenses-and-fix-what-they-find');
    expect(hardOpposites.stderr).not.toMatch(/^\{/u);
  });

  test('get rejects a required ID that is inactive under the current profile', async () => {
    const { catalogPath, group, alternatives } = await catalogWithPolicyAlternatives();
    const active = alternatives[0];
    const inactive = alternatives[1];
    if (active === undefined || inactive === undefined) throw new Error('fixture alternatives are missing');
    const profilePath = await profileFile({
      schema: 'VPEffectiveProfile/v1',
      groups: { [group]: { active, alternatives } },
      unresolved_groups: {},
    });
    const result = runCli(['get', '--catalog', catalogPath, '--id', 'beta', '--profile', profilePath]);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('required instruction beta conflicts with profile ' + group);
    expect(result.stderr).not.toMatch(/^\{/u);
  });

  test('get rejects source digest, schema, status, and selected-snapshot failures atomically', async () => {
    const profilePath = await profileFile({ schema: 'VPEffectiveProfile/v1', groups: {}, unresolved_groups: {} });

    const digestCatalog = await catalogWithProfileSchema();
    await rewriteFixtureInstruction(digestCatalog, 'alpha', (source) => source.replace('Alpha body.', 'Changed body.'), false);
    const digest = runCli(['get', '--catalog', digestCatalog, '--id', 'alpha', '--profile', profilePath]);
    expect(digest.status).toBe(1);
    expect(digest.stdout).toBe('');
    expect(digest.stderr).toContain('digest mismatch for alpha');

    const schemaCatalog = await catalogWithProfileSchema();
    await rewriteFixtureInstruction(schemaCatalog, 'alpha', (source) => source.replace('status: active', 'status: invalid'));
    const schema = runCli(['get', '--catalog', schemaCatalog, '--id', 'alpha', '--profile', profilePath]);
    expect(schema.status).toBe(1);
    expect(schema.stdout).toBe('');
    expect(schema.stderr).toContain('instruction schema validation failed for alpha');

    const disabledCatalog = await catalogWithProfileSchema();
    await rewriteFixtureInstruction(disabledCatalog, 'alpha', (source) => source.replace('status: active', 'status: disabled'));
    const disabled = runCli(['get', '--catalog', disabledCatalog, '--id', 'alpha', '--profile', profilePath]);
    expect(disabled.status).toBe(1);
    expect(disabled.stdout).toBe('');
    expect(disabled.stderr).toContain('instruction is disabled: alpha');

    const snapshotCatalog = await catalogOnlySnapshot();
    await copyFile(
      join(here, '../config/vpeffectiveprofile.v1.schema.json'),
      join(dirname(snapshotCatalog), 'config/vpeffectiveprofile.v1.schema.json'),
    );
    const snapshot = runCli(['get', '--catalog', snapshotCatalog, '--id', 'alpha', '--profile', profilePath]);
    expect(snapshot.status).toBe(1);
    expect(snapshot.stdout).toBe('');
    expect(snapshot.stderr).toContain('cannot read vpinstruction.v1.2.schema.json');
  });

  test('get enforces the compose body limit and adds no output-byte limit', async () => {
    const oversizedCatalog = await catalogWithOversizedInstruction();
    const profilePath = await profileFile({ schema: 'VPEffectiveProfile/v1', groups: {}, unresolved_groups: {} });
    const oversized = runCli(['get', '--catalog', oversizedCatalog, '--id', 'alpha', '--profile', profilePath]);
    expect(oversized.status).toBe(1);
    expect(oversized.stdout).toBe('');
    expect(oversized.stderr).toContain('composed bundle exceeds the session instruction limit');

    const largeProjectionCatalog = await catalogWithLargeProjection();
    const largeProjection = runCli(['get', '--catalog', largeProjectionCatalog, '--id', 'guidance', '--profile', profilePath]);
    expect(largeProjection.status).toBe(0);
    expect(new TextEncoder().encode(largeProjection.stdout).length).toBeGreaterThan(64_000);
  });

  test('get unknown id emits concise plain-text diagnostics', async () => {
    const catalogPath = await catalogWithProfileSchema();
    const profilePath = await profileFile({ schema: 'VPEffectiveProfile/v1', groups: {}, unresolved_groups: {} });
    const result = runCli(['get', '--catalog', catalogPath, '--id', 'unknown', '--profile', profilePath]);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('unknown instruction id: unknown');
    expect(result.stderr).not.toMatch(/^\{/u);
  });

  test('compose returns required instructions with execution context', () => {
    const result = runCli(fixtureArgs(['compose', '--required', 'alpha', '--role', 'engineer']));
    expect(result.status).toBe(0);
    expect(stdoutJson(result)).toMatchObject({
      role: 'engineer',
      instructions: expect.arrayContaining([
        expect.objectContaining({ instruction_id: 'alpha', selection_reason: 'required', content: 'Alpha body.\n' }),
        expect.objectContaining({ instruction_id: 'beta', selection_reason: 'dependency' }),
      ]),
    });
  });

  test('unprofiled canonical alternative conflicts fail while non-conflicting diagnostics remain available', async () => {
    const { catalogPath, group, alternatives } = await catalogWithPolicyAlternatives();
    for (const required of ['alpha,beta', 'alpha']) {
      const result = runCli(['compose', '--catalog', catalogPath, '--required', required]);
      expect(result.status).toBe(1);
      expect(result.stdout).toBe('');
      expect(stderrJson(result)).toMatchObject({
        code: 'CATALOG_PROFILE_CONFLICT',
        details: expect.objectContaining({
          group,
          alternatives,
          resolution_required: true,
          profile_refresh_required: true,
        }),
      });
    }
    const diagnostic = runCli(['compose', '--catalog', catalogPath, '--required', 'beta']);
    expect(diagnostic.status).toBe(0);
    expect(diagnostic.stderr).toBe('');
    expect((stdoutJson(diagnostic) as { instructions: { instruction_id: string }[] }).instructions.map((item) => item.instruction_id)).toEqual(['beta', 'gamma']);
  });

  test('compose exposes the shared content limit as a structured CLI error', async () => {
    const catalog = await catalogWithOversizedInstruction();
    const result = runCli(['compose', '--catalog', catalog, '--required', 'alpha']);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(stderrJson(result)).toMatchObject({ code: 'CATALOG_BUNDLE_LIMIT_EXCEEDED' });
  });

  test('compose accepts id, product and condition filters', () => {
    const result = runCli(fixtureArgs(['compose', '--id', 'alpha', '--product', 'vida-powers', '--condition', 'implementation']));
    expect(result.status).toBe(0);
    expect((stdoutJson(result) as { instructions: Record<string, unknown>[] }).instructions.map((item) => item.instruction_id)).toEqual(['alpha', 'beta', 'gamma']);
    const noMatch = runCli(fixtureArgs(['compose', '--id', 'beta', '--product', 'no-such-product']));
    expect(noMatch.status).toBe(0);
    expect((stdoutJson(noMatch) as { instructions: unknown[] }).instructions).toEqual([]);
  });

  test('compose --roles filters instructions while --role sets execution context', () => {
    const result = runCli(fixtureArgs(['compose', '--roles', 'qa-engineer', '--role', 'qa-lead']));
    expect(result.status).toBe(0);
    const bundle = stdoutJson(result) as { role: string; instructions: { instruction_id: string }[] };
    expect(bundle.role).toBe('qa-lead');
    expect(bundle.instructions.map((item) => item.instruction_id)).toEqual(['beta', 'conflict-mode', 'gamma', 'guidance']);
  });

  test('evaluate returns a tag shortlist', () => {
    const result = runCli(fixtureArgs(['evaluate', '--operation', 'plan', '--candidate', 'alpha', '--tag', 'tdd']));
    expect(result.status).toBe(0);
    expect(stdoutJson(result)).toMatchObject({ selected: ['alpha'], provider: 'catalog', fallback: false, score: 1 });
  });

  test('evaluate without candidates returns agent fallback', () => {
    const result = runCli(fixtureArgs(['evaluate', '--operation', 'plan']));
    expect(result.status).toBe(0);
    expect(stdoutJson(result)).toMatchObject({ selected: [], provider: 'agent', fallback: true, fallbackReason: 'no-candidates' });
  });

  test('default catalog path resolves from the script URL', () => {
    expect(defaultCatalogPath(pathToFileURL(cliPath).href)).toBe(resolve(here, '../catalog.json'));
  });

  test('entry-point matching resolves aliases and compares Windows paths case-insensitively', () => {
    const scriptUrl = pathToFileURL(cliPath).href;
    expect(isEntryPoint(scriptUrl, cliPath)).toBe(true);
    expect(isEntryPoint(scriptUrl, cliPath.toUpperCase())).toBe(process.platform === 'win32');
    expect(isEntryPoint(scriptUrl, join(here, 'not-catalog-cli.ts'))).toBe(false);
    expect(isEntryPoint(scriptUrl, undefined)).toBe(false);
    const missingPath = join(here, 'unresolved-cli.ts');
    expect(isEntryPoint(pathToFileURL(missingPath).href, missingPath)).toBe(true);
  });

  test('unknown command retains JSON diagnostics and compact commands reject unknown flags', () => {
    const unknownCommand = runCli(fixtureArgs(['unknown']));
    expect(unknownCommand.status).toBe(1);
    expect(stderrJson(unknownCommand)).toMatchObject({ code: 'CATALOG_INVALID', details: { usage: expect.stringContaining('usage:') } });
    const unknownFlag = runCli(fixtureArgs(['tags', '--bogus']));
    expect(unknownFlag.status).toBe(1);
    expect(unknownFlag.stdout).toBe('');
    expect(unknownFlag.stderr).toContain('unknown flag --bogus');
    expect(unknownFlag.stderr).not.toMatch(/^\{/u);
  });

  test('global and command help work without catalog or body files', async () => {
    const isolated = await cliWithoutCatalog();
    const global = runCli(['--help'], undefined, isolated.scriptPath);
    expect(global.status).toBe(0);
    expect(global.stderr).toBe('');
    expect(global.stdout).toContain('tags --query <TERM...>');
    expect(global.stdout).toContain('browse --axis <domain|form>');
    expect(global.stdout).toContain('axes: domain (engineering, design-ux, product, business, research, operations)');
    expect(global.stdout).toContain('form (principle, decision-rule, procedure, checklist)');
    expect(global.stdout).toContain('tags --query pr review');
    expect(global.stdout).toContain('search --profile <PATH>');
    expect(global.stdout).toContain('get --id <ID...>');
    expect(global.stdout).toContain('--role <ROLE>');
    expect(global.stdout).toContain('--roles <ROLE...>');
    expect(global.stdout).not.toContain('browse --axis policy');
    expect(global.stdout).not.toContain('search --query');

    const getHelp = runCli(['get', '--help'], undefined, isolated.scriptPath);
    expect(getHelp.status).toBe(0);
    expect(getHelp.stdout).toContain('get --id <ID...>');
    expect(getHelp.stdout).toContain('get --profile <PATH>');
    expect(getHelp.stdout).not.toContain('get --json');
  });

  test('help rejects unsupported options instead of hiding an invalid request', async () => {
    for (const args of [
      ['tags', '--help', '--private-flag'],
      ['tags', '--profile', 'unused.json', '--help'],
      ['findings', '--help', '--private-flag'],
      ['tags', '--help', '--help'],
    ]) {
      const result = await runInProcess(args);
      expect(result.status).toBe(1);
      expect(result.stdout).toBe('');
      expect(result.stderr).not.toBe('');
    }
  });

  test('help validates supplied argument forms and documents compact output contracts', async () => {
    for (const args of [
      ['tags', '--help', 'junk'], ['tags', '--help', '-x'],
      ['tags', '--limit', 'nope', '--help'], ['findings', 'bogus', '--help'],
      ['search', '--domain', 'unknown', '--help'], ['browse', '--axis', 'policy', '--help'],
      ['tags', '--match', 'all', '--help'],
    ]) {
      const result = await runInProcess(args);
      expect(result.status).toBe(1);
      expect(result.stdout).toBe('');
      expect(result.stderr.length).toBeGreaterThan(0);
    }
    for (const command of ['tags', 'search', 'browse', 'get']) {
      const result = await runInProcess([command, '--help']);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('empty stdout');
      if (command === 'get') expect(result.stdout).toContain('instruction text');
      else expect(result.stdout).toContain('ID<TAB>description');
      expect(result.stdout).toContain('dedup');
    }
    expect((await runInProcess(['findings', '--help'])).status).toBe(0);
  });

  test('static selector errors precede any catalog or instruction file access', async () => {
    const missing = join(tmpdir(), 'vp-intentionally-missing-catalog', 'catalog.json');
    for (const [command, ...flags] of [
      ['browse', '--axis', 'policy'], ['search', '--domain', 'unknown'],
      ['search', '--form', 'unknown'], ['search', '--classification-status', 'unknown'],
      ['search', '--id', 'alpha,,beta'], ['tags', '--query', 'test', '--match', 'bogus'],
      ['tags', '--limit', 'nope'], ['search', '--offset', '-1'],
    ]) {
      const result = await runInProcess([command ?? '', '--catalog', missing, ...flags]);
      expect(result.status).toBe(1);
      expect(result.stdout).toBe('');
      expect(result.stderr).toContain('flag --');
      expect(result.stderr).not.toContain('cannot read');
    }
  });

  test('compact fields escape tabs newlines carriage returns and backslashes once', async () => {
    const catalogPath = await catalogWithProfileSchema();
    const catalog = await loadCatalog(catalogPath);
    catalog.tag_dictionary.capability['test-design'] = 'A\tB\nC\rD\\E';
    await writeFile(catalogPath, JSON.stringify(catalog), 'utf8');
    const result = await runInProcess(['tags', '--catalog', catalogPath, '--query', 'test-design', 'test-design']);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('capability:test-design\tA\\tB\\nC\\rD\\\\E\n');
    expect(result.stdout.split('\n').filter(Boolean).every(line => line.split('\t').length === 2)).toBe(true);
    expect(result.stdout.split('\n').filter(line => line.startsWith('capability:test-design\t'))).toHaveLength(1);
  });

  test('in-process help documents the same scalar and list-valued command grammar', async () => {
    for (const args of [['--help'], ['tags', '--help'], ['search', '--help'], ['get', '--help']]) {
      const result = await runInProcess(args);
      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');
      if (args[0] === '--help' || args[0] === 'tags') expect(result.stdout).toContain('tags --query <TERM...>');
      if (args[0] === 'search') expect(result.stdout).toContain('search --profile <PATH>');
      if (args[0] === 'get') {
        expect(result.stdout).toContain('get --id <ID...>');
        expect(result.stdout).toContain('get --profile <PATH>');
      }
      if (args[0] === 'tags') expect(result.stdout).toContain('tags --match <any|all>');
    }
  });

  test('in-process vocabulary queries preserve literal ANY and ALL results', async () => {
    const any = await runInProcess(fixtureArgs(['tags', '--query', 'tdd', 'test']));
    expect(any.status).toBe(0);
    expect(any.stderr).toBe('');
    expect(any.stdout.split('\n').filter(Boolean)).toEqual([
      'pattern:test-first-development\tWrite tests first.',
      'capability:test-design\tDesign behavior tests.',
      'pattern:test-after-development\tTest after implementation.',
    ]);
    const all = await runInProcess(fixtureArgs(['tags', '--query', 'tdd', 'test-first', '--match', 'all']));
    expect(all.status).toBe(0);
    expect(all.stdout).toBe('pattern:test-first-development\tWrite tests first.\n');
  });

  test('vocabulary rejects invalid matching and pagination without partial rows', async () => {
    for (const flags of [
      ['--match', 'all'],
      ['--query', 'test', '--match', 'neither'],
      ['--query', ''],
      ['--limit', '-1'],
      ['--offset', '1.5'],
      ['--limit', '9007199254740992'],
    ]) {
      const result = await runInProcess(fixtureArgs(['tags', ...flags]));
      expect(result.status).toBe(1);
      expect(result.stdout).toBe('');
      expect(result.stderr.trim()).not.toBe('');
    }
    const emptyPage = await runInProcess(fixtureArgs(['tags', '--limit', '0']));
    expect(emptyPage.status).toBe(0);
    expect(emptyPage.stdout).toBe('');
    expect(emptyPage.stderr).toContain('pagination: showing 0 of');
  });

  test('get requires IDs and a profile while evaluate keeps its JSON error contract', () => {
    const missingGetId = runCli(fixtureArgs(['get', '--profile', 'profile.json']));
    expect(missingGetId.status).toBe(1);
    expect(missingGetId.stdout).toBe('');
    expect(missingGetId.stderr).toContain('missing required flag --id');
    expect(missingGetId.stderr).not.toMatch(/^\{/u);
    const missingGetProfile = runCli(fixtureArgs(['get', '--id', 'alpha']));
    expect(missingGetProfile.status).toBe(1);
    expect(missingGetProfile.stdout).toBe('');
    expect(missingGetProfile.stderr).toContain('missing required flag --profile');
    expect(missingGetProfile.stderr).not.toMatch(/^\{/u);
    const missingOperation = runCli(fixtureArgs(['evaluate']));
    expect(missingOperation.status).toBe(1);
    expect(stderrJson(missingOperation).code).toBe('CATALOG_INVALID');
  });

  test('in-process entry reports malformed argument forms without partial output', async () => {
    for (const args of [
      [],
      ['tags', 'extra'],
      ['tags', '--catalog'],
      ['tags', '--id', 'alpha'],
      ['evaluate', '--operation'],
    ]) {
      const result = await runInProcess(args);
      expect(result.status).toBe(1);
      expect(result.stdout).toBe('');
      if (args[0] === 'tags') expect(result.stderr).not.toMatch(/^\{/u);
      else expect(JSON.parse(result.stderr).code).toBe('CATALOG_INVALID');
    }
    const skipped = await runCatalogCli([bunPath], { stdout: () => undefined, stderr: () => undefined });
    expect(skipped).toBeUndefined();
    const direct = await runCatalogCli([bunPath, cliPath, 'tags', '--catalog', join(fixtureDir, 'catalog.json')], {
      stdout: () => undefined,
      stderr: () => undefined,
    });
    expect(direct).toBe(0);
  });

  test('get rejects JSON mode and duplicate scalar profile options', async () => {
    const jsonMode = await runInProcess(['get', '--id', 'alpha', '--profile', 'profile.json', '--json']);
    expect(jsonMode.status).toBe(1);
    expect(jsonMode.stdout).toBe('');
    expect(jsonMode.stderr).toContain('flag --json is not valid for get');
    expect(jsonMode.stderr).not.toMatch(/^\{/u);

    const duplicateProfile = await runInProcess(['get', '--id', 'alpha', '--profile', 'one.json', '--profile', 'two.json']);
    expect(duplicateProfile.status).toBe(1);
    expect(duplicateProfile.stdout).toBe('');
    expect(duplicateProfile.stderr).toContain('flag --profile may only be supplied once');
    expect(duplicateProfile.stderr).not.toMatch(/^\{/u);
  });

  test('in-process entry exercises successful dispatch for every operation', async () => {
    const prefix = ['--catalog', await catalogWithProfileSchema()];
    const profilePath = await profileFile({ schema: 'VPEffectiveProfile/v1', groups: {}, unresolved_groups: {} });
    for (const command of [
      ['tags'],
      ['search', '--capability', 'test-design'],
      ['search', '--form', 'principle', '--domain', 'engineering', 'business', '--classification-status', 'unclassified'],
      ['browse'],
      ['get', '--id', 'alpha', '--profile', profilePath],
      ['compose', '--required', 'alpha', '--json'],
      ['evaluate', '--operation', 'plan', '--candidate', 'alpha', '--tag', 'tdd', '--json'],
    ]) {
      const result = await runInProcess([command[0] ?? '', ...prefix, ...command.slice(1)]);
      expect(result.status).toBe(0);
      if (['tags', 'search', 'browse'].includes(command[0] ?? '')) {
        expect(result.stdout.split('\n').filter(Boolean).every((line) => line.split('\t').length === 2)).toBe(true);
      } else if (command[0] === 'get') {
        expect(result.stdout).toContain('Alpha body.');
        expect(result.stderr).toContain('bundle: ');
      } else expect(JSON.parse(result.stdout)).toBeTruthy();
      if (command[0] !== 'get') expect(result.stderr).toBe('');
    }
  });

  test('in-process findings appends and queries through the JSON CLI protocol', async () => {
    const event = observationEvent();
    const { storePath, eventPath } = await findingsFiles(event);
    const args = ['--store', storePath, '--event-file', eventPath];

    const beforeAppend = await runInProcess(['findings', 'candidates', ...args]);
    expect(beforeAppend.status).toBe(0);
    expect(beforeAppend.stderr).toBe('');
    expect(oneJsonLine(beforeAppend.stdout)).toMatchObject({ candidates: [] });

    const appended = await runInProcess(['findings', 'append', ...args]);
    expect(appended.status).toBe(0);
    expect(appended.stderr).toBe('');
    expect(oneJsonLine(appended.stdout)).toMatchObject({ operation: 'append', outcome: 'appended' });

    const afterAppend = await runInProcess(['findings', 'candidates', ...args]);
    expect(afterAppend.status).toBe(0);
    expect(afterAppend.stderr).toBe('');
    expect(oneJsonLine(afterAppend.stdout)).toMatchObject({
      candidates: [expect.objectContaining({ event })],
    });
  });

  test('in-process findings reports parser and required-flag failures as JSON', async () => {
    const { storePath, eventPath } = await findingsFiles(observationEvent());
    const base = ['findings', 'append', '--store', storePath, '--event-file', eventPath];
    const invalidCalls = [
      { args: [...base, 'unexpected-value'], message: 'unexpected findings argument' },
      { args: [...base, '--private-flag'], message: 'unknown findings flag' },
      { args: ['tags', '--private-flag'], message: 'unknown flag --private-flag' },
      { args: ['archive'], message: 'unknown command archive' },
      { args: ['findings', 'archive'], message: 'unknown findings operation' },
      { args: ['findings', 'append', '--event-file', eventPath], message: 'missing required flag --store' },
      { args: ['findings', 'append', '--store', storePath], message: 'missing required flag --event-file' },
      { args: [...base, '--catalog', join(tmpdir(), 'not-a-findings-catalog.json')], message: 'flag --catalog is not valid for findings' },
    ];

    for (const call of invalidCalls) {
      const result = await runInProcess(call.args);
      expect(result.status).toBe(1);
      expect(result.stdout).toBe('');
      if (call.args[0] === 'tags') expect(result.stderr).toBe(`${call.message}\n`);
      else expect(oneJsonLine(result.stderr)).toMatchObject({ code: 'CATALOG_INVALID', message: call.message });
    }
    expect(existsSync(storePath)).toBe(false);
  });

  test('in-process findings rejects unsafe, missing, non-file and malformed event inputs', async () => {
    const { directory, storePath } = await findingsFiles(observationEvent());
    const separator = process.platform === 'win32' ? '\\' : '/';
    const parentFile = join(directory, 'not-a-directory');
    const eventDirectory = join(directory, 'event-directory');
    const junctionPath = join(directory, 'event-junction');
    const malformedPath = join(directory, 'malformed.json');
    const notDirectoryPath = join(parentFile, 'event.json');
    const relativePath = 'relative-event.json';
    const dotPath = `${directory}${separator}.${separator}missing-event.json`;
    const missingPath = join(directory, 'missing-event.json');
    await writeFile(parentFile, 'test-only', 'utf8');
    await mkdir(eventDirectory);
    await symlink(eventDirectory, junctionPath, 'junction');
    await writeFile(malformedPath, '{', 'utf8');

    const invalidPaths = [
      { path: relativePath, code: 'FINDING_INPUT_PATH_INVALID' },
      { path: dotPath, code: 'FINDING_INPUT_PATH_INVALID' },
      { path: notDirectoryPath, code: process.platform === 'win32' ? 'FINDING_INPUT_READ_FAILED' : 'FINDING_INPUT_PATH_INVALID' },
      { path: eventDirectory, code: 'FINDING_INPUT_PATH_INVALID' },
      { path: junctionPath, code: 'FINDING_INPUT_PATH_INVALID' },
      { path: missingPath, code: 'FINDING_INPUT_READ_FAILED' },
      { path: malformedPath, code: 'FINDING_INPUT_JSON_INVALID' },
    ];

    for (const input of invalidPaths) {
      const result = await runInProcess(['findings', 'candidates', '--store', storePath, '--event-file', input.path]);
      expect(result.status).toBe(1);
      expect(result.stdout).toBe('');
      expect(oneJsonLine(result.stderr)).toMatchObject({ code: input.code });
    }
    expect(existsSync(storePath)).toBe(false);
  });

  test('in-process findings serializes actual input-read and failed-store-recovery errors', async () => {
    const { storePath, eventPath } = await findingsFiles(observationEvent());
    const args = ['findings', 'append', '--store', storePath, '--event-file', eventPath];
    let observedEventReads = 0;
    let observedEventStats = 0;
    let observedStoreOpens = 0;
    const observingReadFile = async (...readArgs: Parameters<typeof fsPromises.readFile>): ReturnType<typeof fsPromises.readFile> => {
      if (readArgs[0] === eventPath) observedEventReads += 1;
      return originalFsPromises.readFile(...readArgs);
    };
    const observingOpen = async (...openArgs: Parameters<typeof fsPromises.open>): ReturnType<typeof fsPromises.open> => {
      if (openArgs[0] === storePath) observedStoreOpens += 1;
      return originalFsPromises.open(...openArgs);
    };
    const observingLstat = async (...statArgs: Parameters<typeof fsPromises.lstat>): ReturnType<typeof fsPromises.lstat> => {
      if (statArgs[0] === eventPath) observedEventStats += 1;
      return originalFsPromises.lstat(...statArgs);
    };

    await mock.module('node:fs/promises', () => ({
      ...originalFsPromises,
      readFile: observingReadFile,
      open: observingOpen,
      lstat: observingLstat,
    }));
    try {
      const successful = await runInProcess(args);
      expect(successful.status).toBe(0);
      expect(oneJsonLine(successful.stdout)).toMatchObject({ operation: 'append', outcome: 'appended' });
      expect({ observedEventReads, observedEventStats, observedStoreOpens }).toEqual({
        observedEventReads: 1,
        observedEventStats: 1,
        observedStoreOpens: 2,
      });
    } finally {
      await mock.module('node:fs/promises', () => originalFsPromises);
    }

    let injectedStatCalls = 0;
    const notDirectoryError = Object.assign(new Error('injected not-a-directory error'), { code: 'ENOTDIR' });
    const failingLstat = async (...statArgs: Parameters<typeof fsPromises.lstat>): ReturnType<typeof fsPromises.lstat> => {
      if (statArgs[0] === eventPath) {
        injectedStatCalls += 1;
        throw notDirectoryError;
      }
      return originalFsPromises.lstat(...statArgs);
    };
    await mock.module('node:fs/promises', () => ({ ...originalFsPromises, lstat: failingLstat }));
    try {
      const failedStat = await runInProcess(['findings', 'candidates', '--store', storePath, '--event-file', eventPath]);
      expect(failedStat.status).toBe(1);
      expect(failedStat.stdout).toBe('');
      expect(oneJsonLine(failedStat.stderr)).toMatchObject({ code: 'FINDING_INPUT_PATH_INVALID' });
    } finally {
      await mock.module('node:fs/promises', () => originalFsPromises);
    }
    expect(injectedStatCalls).toBe(1);

    const originalBytes = await readFile(storePath, 'utf8');
    let injectedReadCalls = 0;
    const failingReadFile = async (...readArgs: Parameters<typeof fsPromises.readFile>): ReturnType<typeof fsPromises.readFile> => {
      if (readArgs[0] === eventPath) {
        injectedReadCalls += 1;
        throw new Error('injected event-file read failure');
      }
      return originalFsPromises.readFile(...readArgs);
    };
    await mock.module('node:fs/promises', () => ({ ...originalFsPromises, readFile: failingReadFile }));
    try {
      const failedRead = await runInProcess(args);
      expect(failedRead.status).toBe(1);
      expect(oneJsonLine(failedRead.stderr)).toMatchObject({ code: 'FINDING_INPUT_READ_FAILED' });
      expect(failedRead.stderr).not.toContain('injected event-file read failure');
    } finally {
      await mock.module('node:fs/promises', () => originalFsPromises);
    }
    expect(injectedReadCalls).toBe(1);
    expect(await readFile(storePath, 'utf8')).toBe(originalBytes);

    await writeFile(eventPath, JSON.stringify(observationEvent({ finding_id: 'cli-recovery-event' })), 'utf8');
    const originalRecoveryBytes = await readFile(storePath, 'utf8');
    let injectedWrites = 0;
    const failingOpen = async (...openArgs: Parameters<typeof fsPromises.open>): ReturnType<typeof fsPromises.open> => {
      const handle = await originalFsPromises.open(...openArgs);
      if (openArgs[0] !== storePath || openArgs[1] !== 'r+') return handle;
      Object.defineProperty(handle, 'write', {
        configurable: true,
        value: async (...writeArgs: unknown[]) => {
          const data = writeArgs[0];
          const text = typeof data === 'string'
            ? data
            : data instanceof Uint8Array
            ? new TextDecoder().decode(data)
            : 'partial write';
          await originalFsPromises.appendFile(storePath, text.slice(0, 12), 'utf8');
          injectedWrites += 1;
          throw new Error('injected partial store write');
        },
      });
      Object.defineProperty(handle, 'truncate', {
        configurable: true,
        value: async () => { throw new Error('injected rollback failure'); },
      });
      return handle;
    };
    await mock.module('node:fs/promises', () => ({ ...originalFsPromises, open: failingOpen }));
    try {
      const failedRecovery = await runInProcess(args);
      expect(failedRecovery.status).toBe(1);
      expect(oneJsonLine(failedRecovery.stderr)).toMatchObject({
        code: 'FINDING_STORE_RECOVERY_REQUIRED',
        message: 'FINDING_STORE_RECOVERY_REQUIRED',
        details: {},
      });
    } finally {
      await mock.module('node:fs/promises', () => originalFsPromises);
    }
    expect(injectedWrites).toBe(1);
    expect(await readFile(storePath, 'utf8')).not.toBe(originalRecoveryBytes);
  });

  test('in-process findings wraps deep-input errors and reports output-sink failures', async () => {
    const { storePath, eventPath } = await findingsFiles(observationEvent());
    const depth = 16_000;
    const nestedContext = `${'{"nested":'.repeat(depth)}null${'}'.repeat(depth)}`;
    const shallowEvent = JSON.stringify(observationEvent());
    const deepEvent = shallowEvent.replace('"context":{}', `"context":${nestedContext}`);
    expect(deepEvent).not.toBe(shallowEvent);
    await writeFile(eventPath, deepEvent, 'utf8');
    const deepResult = await runInProcess(['findings', 'append', '--store', storePath, '--event-file', eventPath]);
    expect(deepResult.status).toBe(1);
    expect(oneJsonLine(deepResult.stderr)).toEqual({
      code: 'FINDING_OPERATION_FAILED', message: 'findings operation failed', details: {},
    });
    expect(existsSync(storePath)).toBe(false);

    for (const command of ['tags', 'compose']) for (const failure of [new Error('stdout is unavailable'), undefined]) {
      let stderr = '';
      let exitCode: number | undefined;
      const args = command === 'compose' ? ['compose', '--required', 'alpha'] : ['tags'];
      const status = await runCatalogCli([bunPath, cliPath, ...args, '--catalog', join(fixtureDir, 'catalog.json')], {
        stdout: () => { throw failure; },
        stderr: (text) => { stderr += text; },
      }, (code) => { exitCode = code; });
      expect(status).toBe(1);
      expect(exitCode).toBe(1);
      const message = failure instanceof Error ? 'stdout is unavailable' : 'undefined';
      if (command === 'tags') expect(stderr).toBe(`${message}\n`);
      else expect(oneJsonLine(stderr)).toEqual({ code: 'CATALOG_INVALID', message, details: {} });
    }
  });

  test('profile schema rejects invalid shapes and accepts valid profiles', async () => {
    const prefix = ['compose', '--catalog', await catalogWithProfileSchema()];
    const malformedJsonPath = await profileFile('{');
    const missingPath = join(dirname(malformedJsonPath), 'missing-profile.json');
    const missing = await runInProcess([...prefix, '--profile', missingPath]);
    expect(missing.status).toBe(1);
    expect(JSON.parse(missing.stderr)).toMatchObject({ code: 'CATALOG_INVALID', message: 'cannot read profile JSON' });
    const malformedJson = await runInProcess([...prefix, '--profile', malformedJsonPath]);
    expect(malformedJson.status).toBe(1);
    expect(JSON.parse(malformedJson.stderr)).toMatchObject({ code: 'CATALOG_INVALID', message: 'profile JSON is malformed' });
    const invalidProfiles = [
      { schema: 'VPEffectiveProfile/v1', groups: 7 },
      { schema: 'VPEffectiveProfile/v2', groups: {} },
      { groups: {} },
    ];
    for (const value of invalidProfiles) {
      const result = await runInProcess([...prefix, '--profile', await profileFile(value)]);
      expect(result.status).toBe(1);
      expect(JSON.parse(result.stderr)).toMatchObject({
        code: 'CATALOG_INVALID',
        message: 'profile schema validation failed',
        details: { schemaErrors: expect.any(Array) },
      });
    }
    const valid = await runInProcess([...prefix, '--required', 'alpha', '--profile', await profileFile({ schema: 'VPEffectiveProfile/v1', groups: {}, unresolved_groups: {} })]);
    expect(valid.status).toBe(0);
    expect((JSON.parse(valid.stdout) as { instructions: Record<string, unknown>[] }).instructions).toEqual(
      expect.arrayContaining([expect.objectContaining({ instruction_id: 'alpha' })]),
    );
  });

  test('custom catalogs without an effective profile schema fail instead of borrowing the package schema', async () => {
    const profilePath = await profileFile({ schema: 'VPEffectiveProfile/v1', groups: {}, unresolved_groups: {} });
    const result = await runInProcess(['compose', '--catalog', join(fixtureDir, 'catalog.json'), '--required', 'alpha', '--profile', profilePath]);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(JSON.parse(result.stderr)).toMatchObject({ code: 'CATALOG_INVALID', message: 'cannot read vpeffectiveprofile.v1.schema.json' });
  });

  test('compose validates profiles against the selected catalog snapshot schema', async () => {
    const catalogPath = await catalogWithProfileSchema();
    const callerSchemaPath = join(dirname(catalogPath), 'config', 'vpeffectiveprofile.v1.schema.json');
    await writeFile(callerSchemaPath, JSON.stringify({ type: 'object', required: ['caller_owned_marker'] }), 'utf8');
    const profilePath = await profileFile({ schema: 'VPEffectiveProfile/v1', groups: {}, unresolved_groups: {} });
    const result = await runInProcess(['compose', '--catalog', catalogPath, '--required', 'alpha', '--profile', profilePath]);

    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(JSON.parse(result.stderr)).toMatchObject({ code: 'CATALOG_INVALID', message: 'profile schema validation failed' });
  });
});

describe('decisionEvaluate', () => {
  test('shortlists by canonical aliases and ANDs dimensions', async () => {
    const catalogPath = join(fixtureDir, 'catalog.json');
    const catalog = await loadCatalog(catalogPath);
    const instructions = await loadInstructions(catalog, dirname(resolve(catalogPath)));
    const result = decisionEvaluate(catalog, instructions, {
      operation: 'plan', candidates: ['alpha'], tags: ['test-design', 'tdd'],
    });
    expect(result).toMatchObject({ selected: ['alpha'], score: 2, provider: 'catalog', fallback: false, fallbackReason: null });
    expect(result.rationale).toContain('uncalibrated');
  });

  test('no tag match is a successful empty shortlist', async () => {
    const catalogPath = join(fixtureDir, 'catalog.json');
    const catalog = await loadCatalog(catalogPath);
    const instructions = await loadInstructions(catalog, dirname(resolve(catalogPath)));
    expect(decisionEvaluate(catalog, instructions, { operation: 'plan', candidates: ['alpha'], tags: ['evidence-review'] })).toMatchObject({
      selected: [], score: 0, provider: 'catalog', fallback: false, fallbackReason: null,
    });
  });

  test('empty candidate list falls back to the agent', async () => {
    const catalogPath = join(fixtureDir, 'catalog.json');
    const catalog = await loadCatalog(catalogPath);
    const instructions = await loadInstructions(catalog, dirname(resolve(catalogPath)));
    expect(decisionEvaluate(catalog, instructions, { operation: 'plan', candidates: [] })).toMatchObject({
      selected: [], score: 0, provider: 'agent', fallback: true, fallbackReason: 'no-candidates',
    });
  });

  test('unknown candidate falls back and names the id', async () => {
    const catalogPath = join(fixtureDir, 'catalog.json');
    const catalog = await loadCatalog(catalogPath);
    const instructions = await loadInstructions(catalog, dirname(resolve(catalogPath)));
    const result = decisionEvaluate(catalog, instructions, { operation: 'plan', candidates: ['missing'] });
    expect(result).toMatchObject({ selected: [], score: 0, provider: 'agent', fallback: true, fallbackReason: 'unknown-candidate' });
    expect(result.rationale).toContain('missing');
  });

  test('disabled candidate falls back and names the id', async () => {
    const catalogPath = join(fixtureDir, 'catalog.json');
    const catalog = await loadCatalog(catalogPath);
    const instructions = await loadInstructions(catalog, dirname(resolve(catalogPath)));
    const result = decisionEvaluate(catalog, instructions, { operation: 'plan', candidates: ['disabled-mode'] });
    expect(result).toMatchObject({ selected: [], score: 0, provider: 'agent', fallback: true, fallbackReason: 'candidate-not-allowed' });
    expect(result.rationale).toContain('disabled-mode');
  });

  test('malformed request falls back with a reason naming the malformed field', async () => {
    const catalogPath = join(fixtureDir, 'catalog.json');
    const catalog = await loadCatalog(catalogPath);
    const instructions = await loadInstructions(catalog, dirname(resolve(catalogPath)));
    const request = { operation: '', candidates: ['alpha'], tags: [1] } as unknown as DecisionRequest;
    expect(decisionEvaluate(catalog, instructions, request)).toMatchObject({
      selected: [], score: 0, provider: 'agent', fallback: true, fallbackReason: 'invalid-format',
    });
  });

  test('non-object, malformed candidate, tags, product and context are handled', async () => {
    const catalogPath = join(fixtureDir, 'catalog.json');
    const catalog = await loadCatalog(catalogPath);
    const instructions = await loadInstructions(catalog, dirname(resolve(catalogPath)));
    const evaluate = (request: unknown) => decisionEvaluate(catalog, instructions, request as DecisionRequest);
    expect(evaluate(null)).toMatchObject({ fallbackReason: 'invalid-format', provider: 'agent' });
    expect(evaluate({ operation: 'plan', candidates: 'alpha' })).toMatchObject({ fallbackReason: 'invalid-format' });
    expect(evaluate({ operation: 'plan', candidates: [1] })).toMatchObject({ fallbackReason: 'invalid-format' });
    expect(evaluate({ operation: 'plan', candidates: ['alpha'], tags: 'tdd' })).toMatchObject({ fallbackReason: 'invalid-format' });
    for (const request of [
      { operation: 'plan', candidates: ['alpha'], tags: ['unknown'] },
      { operation: 'plan', candidates: ['alpha'], product: 7 },
      { operation: 'plan', candidates: ['alpha'], context: {} },
    ]) {
      const result = evaluate(request);
      expect(result).toMatchObject({ fallbackReason: 'invalid-format', provider: 'agent', selected: [], score: 0 });
      expect(result.rationale).toMatch(request.tags ? /unknown/ : /product|context/);
    }
    expect(evaluate({ operation: 'plan', candidates: ['alpha'], tags: ['unknown'] }).rationale).toContain('"unknown"');
  });

  test('a tag present in both dictionaries matches either dimension and score counts matched tags', async () => {
    const catalogPath = join(fixtureDir, 'catalog.json');
    const catalog = await loadCatalog(catalogPath);
    catalog.tag_dictionary.pattern['test-design'] = 'Same canonical label in both dimensions.';
    const instructions = await loadInstructions(await loadCatalog(catalogPath), dirname(resolve(catalogPath)));
    const ambiguousOnly = decisionEvaluate(catalog, instructions, {
      operation: 'plan', candidates: ['alpha'], tags: ['test-design'],
    });
    expect(ambiguousOnly).toMatchObject({ selected: ['alpha'], score: 1, fallback: false });
    const result = decisionEvaluate(catalog, instructions, {
      operation: 'plan', candidates: ['alpha'], tags: ['test-design', 'test-first-development', 'evidence-review'],
    });
    expect(result).toMatchObject({ selected: ['alpha'], score: 2, fallback: false, fallbackReason: null });
    expect(result.rationale).toContain('matched 2 of 3 requested tags');
  });

  test('untagged candidates are sorted and score zero', async () => {
    const catalogPath = join(fixtureDir, 'catalog.json');
    const catalog = await loadCatalog(catalogPath);
    const instructions = await loadInstructions(catalog, dirname(resolve(catalogPath)));
    const result = decisionEvaluate(catalog, instructions, { operation: 'plan', candidates: ['gamma', 'alpha'], product: 'vida-powers', context: 'review' });
    expect(result).toMatchObject({ selected: ['alpha', 'gamma'], score: 0, provider: 'catalog' });
    expect(result.rationale).toContain('product "vida-powers" in context "review"');
  });

});

describe('retrieval workflow contract', () => {
  const realCatalog = join(here, '../catalog.json');

  test('search defaults to twenty rows, points at the next page, and --all lifts the default', async () => {
    const first = await runInProcess(['search', '--capability', 'review-code', '--catalog', realCatalog]);
    expect(first.status).toBe(0);
    expect(first.stdout.trim().split('\n')).toHaveLength(20);
    expect(first.stderr).toContain('pagination: showing 20 of');
    expect(first.stderr).toContain('next: --offset 20');
    expect(first.stderr).toContain('refine:');

    const next = await runInProcess(['search', '--capability', 'review-code', '--catalog', realCatalog, '--offset', '20']);
    expect(next.status).toBe(0);
    expect(next.stdout.trim().split('\n')).toHaveLength(20);

    const all = await runInProcess(['search', '--capability', 'review-code', '--catalog', realCatalog, '--all']);
    expect(all.status).toBe(0);
    expect(all.stdout.trim().split('\n').length).toBeGreaterThan(20);
  });

  test('--for resolves a capability and its most frequent pattern in one call', async () => {
    const resolved = await runInProcess(['search', '--for', 'debugging', 'incident', '--catalog', realCatalog]);
    expect(resolved.status).toBe(0);
    expect(resolved.stderr).toContain('resolved: capability=debug-root-cause');
    expect(resolved.stderr).toContain('pattern=systematic-debugging');
    expect(resolved.stdout.trim().split('\n').length).toBeGreaterThan(0);

    const debugging = await runInProcess(['search', '--for', 'systematic', 'debugging', 'failing', 'test', 'fix', 'deploy', '--catalog', realCatalog]);
    expect(debugging.status).toBe(0);
    expect(debugging.stderr).toContain('resolved: capability=debug-root-cause');

    const review = await runInProcess(['search', '--for', 'review', 'typescript', 'pull', 'request', '--catalog', realCatalog]);
    expect(review.status).toBe(0);
    expect(review.stderr).toContain('resolved: capability=review-code');

    const decision = await runInProcess(['search', '--for', 'endpoint', 'deprecation', 'fix', 'decision', '--catalog', realCatalog]);
    expect(decision.status).toBe(0);
    expect(decision.stderr).toContain('resolved: capability=decide-on-deprecation');

    const verification = await runInProcess(['search', '--for', 'completion', 'verification', 'acceptance', 'checks', '--catalog', realCatalog]);
    expect(verification.status).toBe(0);
    expect(verification.stderr).toContain('resolved: capability=verify-work-results');

    const docs = await runInProcess(['search', '--for', 'API', 'documentation', 'endpoint', 'contract', '--catalog', realCatalog]);
    expect(docs.status).toBe(0);
    expect(docs.stderr).toContain('resolved: capability=write-technical-prose');

    const migration = await runInProcess(['search', '--for', 'legacy', 'endpoint', 'consumer', 'migration', '--catalog', realCatalog]);
    expect(migration.status).toBe(0);
    expect(migration.stderr).toContain('resolved: capability=migrate-consumers-off-the-old-system');

    const explicit = await runInProcess(['search', '--for', 'debugging', '--capability', 'review-code', '--catalog', realCatalog]);
    expect(explicit.status).toBe(0);
    expect(explicit.stderr).toContain('resolved: capability=review-code');

    const parserIntent = await runInProcess(['search', '--for', 'argument', 'option', 'parser', 'flag', '--catalog', realCatalog]);
    expect(parserIntent.status).toBe(0);
    expect(parserIntent.stderr).toContain('resolved: pattern=strict-argument-parsing');

    const missing = await runInProcess(['search', '--for', 'zzzznotatag', '--catalog', realCatalog]);
    expect(missing.status).toBe(1);
    expect(missing.stderr).toContain('no capability or pattern matched --for');

    const nearest = await runInProcess(['search', '--for', 'checklist', '--catalog', realCatalog]);
    expect(nearest.status).toBe(1);
    expect(nearest.stderr).toContain('nearest tags: pattern:release-readiness');
    expect(nearest.stderr).toContain('search one with --capability <tag> or --pattern <tag>');

    const weakNearest = await runInProcess(['search', '--for', 'properly', 'handling', 'any', 'request', '--catalog', realCatalog]);
    expect(weakNearest.status).toBe(0);
    expect(weakNearest.stderr).toContain('weak match');
    expect(weakNearest.stderr).toContain('nearest tags:');

    const patternOnly = await runInProcess(['search', '--for', 'incremental', 'cutover', '--catalog', realCatalog]);
    expect(patternOnly.status).toBe(0);
    expect(patternOnly.stderr).toContain('resolved: pattern=incremental-cutover');

    const diagnosis = await runInProcess(['search', '--for', 'diagnosis', 'intermittent', '500', '--catalog', realCatalog]);
    expect(diagnosis.status).toBe(0);
    expect(diagnosis.stderr).toContain('resolved: capability=debug-root-cause');

    const alerting = await runInProcess(['search', '--for', 'alerting', 'production', 'errors', '--catalog', realCatalog]);
    expect(alerting.status).toBe(0);
    expect(alerting.stderr).toContain('resolved: capability=instrument-production-code');

    const sentence = await runInProcess(['search', '--for', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', '--catalog', realCatalog]);
    expect(sentence.status).toBe(1);
    expect(sentence.stderr).toContain('run one focused --for per intent');
  }, 20000);

  test('--for falls back to the most frequent matching pattern when no capability matches', async () => {
    const competingCatalog = await catalogWithProfileSchema();
    const competing = await runInProcess(['search', '--for', 'development', '--catalog', competingCatalog]);
    expect(competing.status).toBe(0);
    expect(competing.stderr).toContain('resolved: pattern=test-first-development');

    const equalCounts = await runInProcess(['search', '--for', 'staged', '--catalog', realCatalog]);
    expect(equalCounts.status).toBe(0);
    expect(equalCounts.stderr).toContain('resolved: pattern=staged-elicitation');
  });

  test('search accepts a namespaced tag copied from tags output', async () => {
    const result = await runInProcess(['search', '--capability', 'capability:review-code', '--catalog', realCatalog]);
    expect(result.status).toBe(0);
    expect(result.stdout.trim().split('\n')).toHaveLength(20);
    const wrongDimension = await runInProcess(['search', '--capability', 'pattern:code-review', '--catalog', realCatalog]);
    expect(wrongDimension.status).toBe(1);
    expect(wrongDimension.stderr).toContain('expects a capability tag');
  });

  test('natural word forms reach the canonical tag', async () => {
    const debugging = await runInProcess(['tags', '--query', 'debugging', '--catalog', realCatalog]);
    expect(debugging.status).toBe(0);
    expect(debugging.stdout).toContain('capability:debug-root-cause');
    const alias = await runInProcess(['tags', '--query', 'pr-review', '--catalog', realCatalog]);
    expect(alias.status).toBe(0);
    expect(alias.stdout).toContain('capability:review-code');
  });

  test('search explains that free text belongs to tags', async () => {
    const result = await runInProcess(['search', '--query', 'debug', '--catalog', realCatalog]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('free-text discovery uses tags --query');
  });

  test('get explains that a tag is not an instruction id', async () => {
    const profilePath = await profileFile({ schema: 'VPEffectiveProfile/v1', groups: {}, unresolved_groups: {} });
    const capability = await runInProcess(['get', '--catalog', join(fixtureDir, 'catalog.json'), '--id', 'test-design', '--profile', profilePath]);
    expect(capability.status).toBe(1);
    expect(capability.stderr).toContain('is a capability, not an instruction');
    expect(capability.stderr).toContain('search --capability test-design');
    const pattern = await runInProcess(['get', '--catalog', join(fixtureDir, 'catalog.json'), '--id', 'test-first-development', '--profile', profilePath]);
    expect(pattern.status).toBe(1);
    expect(pattern.stderr).toContain('is a pattern, not an instruction');
    expect(pattern.stderr).toContain('search --pattern test-first-development');
    const alias = await runInProcess(['get', '--catalog', join(fixtureDir, 'catalog.json'), '--id', 'tdd', '--profile', profilePath]);
    expect(alias.status).toBe(1);
    expect(alias.stderr).toContain('is a tag alias, not an instruction');
  });
});

describe('artifacts commands', () => {
  async function storeFixture(): Promise<{ root: string; store: string; eventPath: string; semanticPath: string }> {
    const root = await mkdtemp(join(tmpdir(), 'vp-artifacts-cli-'));
    const store = join(root, 'artifacts.jsonl');
    const eventPath = join(root, 'event.json');
    const semanticPath = join(root, 'semantic.json');
    const bytes = '# VP-6\n';
    await mkdir(join(root, 'docs/work'), { recursive: true });
    await writeFile(join(root, 'docs/work/VP-6.md'), bytes);
    await writeFile(eventPath, JSON.stringify({
      kind: 'artifact',
      artifact_id: 'VP-6',
      artifact_type: 'markdown',
      product: 'vida-powers',
      work_scope: 'stage-6',
      locator: 'docs/work/VP-6.md',
      revision: 1,
      digest: createHash('sha256').update(bytes).digest('hex'),
      links: [],
      source: { origin: 'observed', actor: 'root', reference: 'run-1' },
    }));
    await writeFile(semanticPath, JSON.stringify({ verdict: 'pass', actor: 'root', reference: 'review-1', basis: 'scope and contract agree' }));
    return { root, store, eventPath, semanticPath };
  }

  test('appends, indexes and verifies without loading a catalog', async () => {
    const { root, store, eventPath, semanticPath } = await storeFixture();
    try {
      const appended = await runInProcess(['artifacts', 'append', '--store', store, '--event-file', eventPath]);
      expect(appended.status).toBe(0);
      expect(JSON.parse(appended.stdout)).toMatchObject({ operation: 'append', outcome: 'appended', artifact_id: 'VP-6', revision: 1 });

      const index = await runInProcess(['artifacts', 'index', '--store', store]);
      expect(index.status).toBe(0);
      expect(JSON.parse(index.stdout)).toMatchObject({ artifacts: [{ artifact_id: 'VP-6', revision: 1, events: 1 }] });

      const mechanical = await runInProcess(['artifacts', 'verify', '--store', store, '--id', 'VP-6', '--root', root]);
      expect(mechanical.status).toBe(0);
      expect(JSON.parse(mechanical.stdout)).toMatchObject({ mechanical_ok: true, complete: false, semantic: null });

      const complete = await runInProcess(['artifacts', 'verify', '--store', store, '--id', 'VP-6', '--root', root, '--semantic-file', semanticPath]);
      expect(complete.status).toBe(0);
      expect(JSON.parse(complete.stdout)).toMatchObject({ mechanical_ok: true, complete: true });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test('reports stable codes for a missing store, an unknown id and a bad input file', async () => {
    const { root, store, eventPath } = await storeFixture();
    try {
      const missing = await runInProcess(['artifacts', 'index', '--store', store]);
      expect(missing.status).toBe(1);
      expect(JSON.parse(missing.stderr)).toMatchObject({ code: 'ARTIFACT_STORE_MISSING' });

      const appended = await runInProcess(['artifacts', 'append', '--store', store, '--event-file', eventPath]);
      expect(appended.status).toBe(0);

      const unknown = await runInProcess(['artifacts', 'verify', '--store', store, '--id', 'nope', '--root', root]);
      expect(unknown.status).toBe(1);
      expect(JSON.parse(unknown.stderr)).toMatchObject({ code: 'ARTIFACT_NOT_FOUND' });

      const badInput = await runInProcess(['artifacts', 'append', '--store', store, '--event-file', join(root, 'nope.json')]);
      expect(badInput.status).toBe(1);
      expect(JSON.parse(badInput.stderr)).toMatchObject({ code: 'ARTIFACT_INPUT_READ_FAILED' });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test('rejects parser misuse and reports uncoded failures stably', async () => {
    const { root, store, eventPath } = await storeFixture();
    try {
      const unknownOperation = await runInProcess(['artifacts', 'nope', '--store', store]);
      expect(unknownOperation.status).toBe(1);
      expect(JSON.parse(unknownOperation.stderr)).toMatchObject({ code: 'CATALOG_INVALID' });

      const unknownFlag = await runInProcess(['artifacts', 'index', '--store', store, '--bogus', 'x']);
      expect(unknownFlag.status).toBe(1);
      expect(JSON.parse(unknownFlag.stderr).message).toContain('unknown artifacts flag');

      const missingFlag = await runInProcess(['artifacts', 'index']);
      expect(missingFlag.status).toBe(1);
      expect(JSON.parse(missingFlag.stderr).message).toContain('missing required flag --store');

      const directoryStore = join(root, 'dir');
      await mkdir(directoryStore);
      const uncoded = await runInProcess(['artifacts', 'index', '--store', join(directoryStore, 'nested', 'artifacts.jsonl')]);
      expect(uncoded.status).toBe(1);
      expect(JSON.parse(uncoded.stderr)).toMatchObject({ code: 'ARTIFACT_PATH_INVALID' });

      const blocked = join(root, 'blocked');
      await mkdir(join(blocked, 'artifacts.jsonl'), { recursive: true });
      const fallback = await runInProcess(['artifacts', 'append', '--store', join(blocked, 'artifacts.jsonl'), '--event-file', eventPath]);
      expect(fallback.status).toBe(1);
      expect(JSON.parse(fallback.stderr)).toMatchObject({ code: 'ARTIFACT_OPERATION_FAILED' });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

