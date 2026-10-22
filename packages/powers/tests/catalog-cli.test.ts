import { afterAll, describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cp, copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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

const here = dirname(fileURLToPath(import.meta.url));
const fixtureDir = join(here, 'fixtures/catalog');
const cliPath = resolve(here, '../skills/vp-mode/scripts/catalog-cli.ts');
const bunPath = process.execPath;
const profileDirs: string[] = [];

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

function runCli(args: string[]): ReturnType<typeof spawnSync> {
  return spawnSync(bunPath, [cliPath, ...args], {
    cwd: process.env.TMP ?? process.env.TEMP ?? '.',
    encoding: 'utf8',
  });
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
  test('tags prints JSON dimensions', () => {
    const result = runCli(fixtureArgs(['tags', '--json']));
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(stdoutJson(result)).toMatchObject({
      capability: expect.arrayContaining([expect.objectContaining({ tag: 'test-design' })]),
      pattern: expect.arrayContaining([expect.objectContaining({ tag: 'test-first-development' })]),
    });
  });

  test('search prints metadata without instruction content', () => {
    const result = runCli(fixtureArgs(['search', '--capability', 'test-design']));
    expect(result.status).toBe(0);
    const value = (stdoutJson(result) as { results: Record<string, unknown>[] }).results;
    expect(value).toEqual(expect.arrayContaining([expect.objectContaining({ instruction_id: 'alpha' })]));
    expect((value as Record<string, unknown>[]).every((item) => !Object.hasOwn(item, 'content'))).toBe(true);
  });

  test('search accepts comma-separated instruction ids', () => {
    const result = runCli(fixtureArgs(['search', '--id', 'alpha,beta']));
    expect(result.status).toBe(0);
    expect((stdoutJson(result) as { results: { instruction_id: string }[] }).results.map((item) => item.instruction_id)).toEqual(['alpha', 'beta']);
  });

  test('search product comma list returns the union of both product matches', () => {
    const idsFor = (product: string): string[] => {
      const result = runCli(fixtureArgs(['search', '--product', product]));
      expect(result.status).toBe(0);
      return (stdoutJson(result) as { results: { instruction_id: string }[] }).results.map((item) => item.instruction_id).sort();
    };
    const expected = [...new Set([...idsFor('vida-powers'), ...idsFor('agent-runtime')])].sort();
    const result = runCli(fixtureArgs(['search', '--product', 'vida-powers,agent-runtime']));
    expect(result.status).toBe(0);
    expect((stdoutJson(result) as { results: { instruction_id: string }[] }).results.map((item) => item.instruction_id).sort()).toEqual(expected);
  });

  test('search unknown tag emits a JSON error on stderr', () => {
    const result = runCli(fixtureArgs(['search', '--capability', 'unknown-tag']));
    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(stderrJson(result)).toMatchObject({ code: 'CATALOG_INVALID', details: { tag: 'unknown-tag', dimension: 'capability' } });
  });

  test('get prints the full instruction', () => {
    const result = runCli(fixtureArgs(['get', '--id', 'alpha']));
    expect(result.status).toBe(0);
    expect(stdoutJson(result)).toMatchObject({ instruction: { instruction_id: 'alpha', content: 'Alpha body.\n' } });
  });

  test('get unknown id emits the catalog error', () => {
    const result = runCli(fixtureArgs(['get', '--id', 'unknown']));
    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(stderrJson(result)).toMatchObject({ code: 'CATALOG_ID_UNKNOWN', message: 'unknown instruction id: unknown', details: { instruction_id: 'unknown' } });
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

  test('unknown command and unknown flag emit CATALOG_INVALID', () => {
    const unknownCommand = runCli(fixtureArgs(['unknown']));
    expect(unknownCommand.status).toBe(1);
    expect(stderrJson(unknownCommand)).toMatchObject({ code: 'CATALOG_INVALID', details: { usage: expect.stringContaining('--roles <r1,r2>') } });
    const unknownFlag = runCli(fixtureArgs(['tags', '--bogus']));
    expect(unknownFlag.status).toBe(1);
    expect(stderrJson(unknownFlag).code).toBe('CATALOG_INVALID');
  });

  test('missing required flags emit CATALOG_INVALID', () => {
    const missingGetId = runCli(fixtureArgs(['get']));
    expect(missingGetId.status).toBe(1);
    expect(stderrJson(missingGetId).code).toBe('CATALOG_INVALID');
    const missingOperation = runCli(fixtureArgs(['evaluate']));
    expect(missingOperation.status).toBe(1);
    expect(stderrJson(missingOperation).code).toBe('CATALOG_INVALID');
  });

  test('in-process entry reports malformed argument forms as JSON', async () => {
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
      expect(JSON.parse(result.stderr).code).toBe('CATALOG_INVALID');
    }
    const skipped = await runCatalogCli([bunPath], { stdout: () => undefined, stderr: () => undefined });
    expect(skipped).toBeUndefined();
    const direct = await runCatalogCli([bunPath, cliPath, 'tags', '--catalog', join(fixtureDir, 'catalog.json')], {
      stdout: () => undefined,
      stderr: () => undefined,
    });
    expect(direct).toBe(0);
  });

  test('repeated json flag is rejected with the exact error payload', async () => {
    const result = await runInProcess(['tags', '--json', '--json']);
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stderr)).toEqual({
      code: 'CATALOG_INVALID',
      message: 'flag --json may only be supplied once',
      details: { flag: '--json' },
    });
  });

  test('in-process entry exercises successful dispatch for every operation', async () => {
    const prefix = ['--catalog', join(fixtureDir, 'catalog.json')];
    for (const command of [
      ['tags'],
      ['search', '--capability', 'test-design'],
      ['get', '--id', 'alpha'],
      ['compose', '--required', 'alpha'],
      ['evaluate', '--operation', 'plan', '--candidate', 'alpha', '--tag', 'tdd'],
    ]) {
      const result = await runInProcess([command[0] ?? '', ...prefix, ...command.slice(1)]);
      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout)).toBeTruthy();
      expect(result.stderr).toBe('');
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

  test('custom catalogs without an effective profile schema use the package schema', async () => {
    const profilePath = await profileFile({ schema: 'VPEffectiveProfile/v1', groups: {}, unresolved_groups: {} });
    const result = await runInProcess(['compose', '--catalog', join(fixtureDir, 'catalog.json'), '--required', 'alpha', '--profile', profilePath]);
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect((JSON.parse(result.stdout) as { instructions: { instruction_id: string }[] }).instructions).toEqual(
      expect.arrayContaining([expect.objectContaining({ instruction_id: 'alpha' })]),
    );
  });

  test('compose uses the package-owned effective profile schema with a custom catalog', async () => {
    const catalogPath = await catalogWithProfileSchema();
    const callerSchemaPath = join(dirname(catalogPath), 'config', 'vpeffectiveprofile.v1.schema.json');
    await writeFile(callerSchemaPath, JSON.stringify({ type: 'object', required: ['caller_owned_marker'] }), 'utf8');
    const profilePath = await profileFile({ schema: 'VPEffectiveProfile/v1', groups: {}, unresolved_groups: {} });
    const result = await runInProcess(['compose', '--catalog', catalogPath, '--required', 'alpha', '--profile', profilePath]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect((JSON.parse(result.stdout) as { instructions: { instruction_id: string }[] }).instructions).toEqual(
      expect.arrayContaining([expect.objectContaining({ instruction_id: 'alpha' })]),
    );
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
