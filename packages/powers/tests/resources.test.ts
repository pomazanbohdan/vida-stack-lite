import { afterAll, describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { cp, copyFile, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  catalogCompose,
  catalogResourceGet,
  loadCatalog,
  loadCatalogResources,
  loadInstructions,
} from '../skills/vp-mode/scripts/catalog.ts';
import type { Catalog, ComposeQuery } from '../skills/vp-mode/scripts/catalog.ts';
import { canonicalJson, validateAgainstSchema } from '../skills/vp-mode/scripts/schema.ts';
import { runCatalogCli } from '../skills/vp-mode/scripts/catalog-cli.ts';

const here = dirname(fileURLToPath(import.meta.url));
const fixtureCatalog = join(here, 'fixtures/catalog');
const cliPath = resolve(here, '../skills/vp-mode/scripts/catalog-cli.ts');
const bunPath = process.execPath;
const tempDirs: string[] = [];

afterAll(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

async function resourceCatalog(): Promise<{ dir: string; catalogPath: string }> {
  const dir = await mkdtemp(join(tmpdir(), 'vp-resources-'));
  tempDirs.push(dir);
  await cp(fixtureCatalog, dir, { recursive: true });
  await copyFile(join(here, '../config/vpinstruction.v1.2.schema.json'), join(dir, 'config/vpinstruction.v1.2.schema.json'));
  await copyFile(join(here, '../config/vpreference-resource.v1.schema.json'), join(dir, 'config/vpreference-resource.v1.schema.json'));
  await copyFile(join(here, '../config/vpeffectiveprofile.v1.schema.json'), join(dir, 'config/vpeffectiveprofile.v1.schema.json'));
  const catalogPath = join(dir, 'catalog.json');
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8')) as Catalog;
  for (const entry of catalog.instructions) {
    const path = join(dir, entry.path);
    const source = await readFile(path, 'utf8');
    const updated = source.replace(/^---\r?\n/u, '$&schema: VPInstruction/v1.2\nclassification_status: unclassified\nclassification_reason: Synthetic test fixture.\n');
    await writeFile(path, updated);
    entry.sha256 = createHash('sha256').update(updated).digest('hex');
  }
  await writeFile(catalogPath, JSON.stringify(catalog));
  return { dir, catalogPath };
}

function resourceRecord(id: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schema: 'VPReferenceResource/v1',
    resource_id: id,
    resource_type: 'font-pairing',
    revision: 1,
    status: 'active',
    provenance: [{
      donor: 'uupm',
      license: 'MIT',
      revision: 'a'.repeat(40),
      path: 'src/ui-ux-pro-max/data/typography.csv',
      sha256: 'b'.repeat(64),
      locator: { line: 2, row: 0 },
    }],
    payload: { heading_font: 'Inter', body_font: 'Source Sans 3' },
    ...overrides,
  };
}

function signResource(record: Record<string, unknown>): Record<string, unknown> {
  const unsigned = { ...record };
  delete unsigned.digest;
  const digest = `sha256:${createHash('sha256').update(canonicalJson(unsigned) ?? '', 'utf8').digest('hex')}`;
  return { ...unsigned, digest };
}

async function addResource(
  dir: string,
  catalogPath: string,
  id: string,
  options: { record?: Record<string, unknown>; content?: string | Buffer; path?: string; sha256?: string } = {},
): Promise<string> {
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8')) as Catalog;
  const relativePath = options.path ?? `resources/${id}.json`;
  const absolute = join(dir, relativePath);
  await mkdir(dirname(absolute), { recursive: true });
  const content = options.content ?? JSON.stringify(signResource(options.record ?? resourceRecord(id)));
  await writeFile(absolute, content);
  const bytes = typeof content === 'string' ? Buffer.from(content, 'utf8') : content;
  catalog.resources = [...(catalog.resources ?? []), {
    resource_id: id,
    path: relativePath,
    sha256: options.sha256 ?? createHash('sha256').update(bytes).digest('hex'),
  }];
  await writeFile(catalogPath, JSON.stringify(catalog));
  return id;
}

async function loaded(dir: string, catalogPath: string) {
  const catalog = await loadCatalog(catalogPath);
  const instructions = await loadInstructions(catalog, dir);
  const resources = await loadCatalogResources(catalog, dir);
  return { catalog, instructions, resources };
}

async function resourceFixture(record: Record<string, unknown> = resourceRecord('res-1')): Promise<{ dir: string; catalogPath: string }> {
  const fixture = await resourceCatalog();
  await addResource(fixture.dir, fixture.catalogPath, 'res-1', { record });
  return fixture;
}

async function runCli(args: string[]): Promise<{ status: number; stdout: string; stderr: string }> {
  let stdout = '';
  let stderr = '';
  const status = await runCatalogCli([bunPath, cliPath, ...args], {
    stdout: (text) => { stdout += text; },
    stderr: (text) => { stderr += text; },
  }, () => undefined);
  if (status === undefined) throw new Error('CLI entry was not invoked');
  return { status, stdout, stderr };
}

function stderrJson(stderr: string): { code: string; message: string; details: Record<string, unknown> } {
  return JSON.parse(stderr) as { code: string; message: string; details: Record<string, unknown> };
}

describe('loadCatalogResources', () => {
  test('returns an empty map for a catalog without resources', async () => {
    const { dir, catalogPath } = await resourceCatalog();
    const catalog = await loadCatalog(catalogPath);
    expect(catalog.resources).toBeUndefined();
    expect((await loadCatalogResources(catalog, dir)).size).toBe(0);
  });

  test('loads a valid VPReferenceResource/v1 record', async () => {
    const { dir, catalogPath } = await resourceFixture();
    const { catalog, resources } = await loaded(dir, catalogPath);
    const resource = resources.get('res-1');
    expect(resource?.resource_type).toBe('font-pairing');
    expect(resource?.payload).toEqual({ heading_font: 'Inter', body_font: 'Source Sans 3' });
    expect(resource?.digest).toMatch(/^sha256:[0-9a-f]{64}$/u);
    expect(catalogResourceGet(catalog, resources, 'res-1').untrusted).toBe(true);
  });

  test('rejects duplicate resource ids and paths in the manifest', async () => {
    const { catalogPath } = await resourceFixture();
    const catalog = JSON.parse(await readFile(catalogPath, 'utf8')) as Catalog;
    const entry = catalog.resources?.[0];
    if (entry === undefined) throw new Error('resource entry missing');
    catalog.resources = [entry, { ...entry }];
    await writeFile(catalogPath, JSON.stringify(catalog));
    await expect(loadCatalog(catalogPath)).rejects.toMatchObject({ code: 'CATALOG_INVALID' });
    const pathCatalog = JSON.parse(await readFile(catalogPath, 'utf8')) as Catalog;
    pathCatalog.resources = [entry, { resource_id: 'res-2', path: entry.path, sha256: entry.sha256 }];
    await writeFile(catalogPath, JSON.stringify(pathCatalog));
    await expect(loadCatalog(catalogPath)).rejects.toMatchObject({ code: 'CATALOG_INVALID' });
  });

  test('rejects a manifest path that escapes resources/', async () => {
    const { dir, catalogPath } = await resourceCatalog();
    await addResource(dir, catalogPath, 'escape', { path: 'instructions/alpha.md', content: '{}' });
    const catalog = await loadCatalog(catalogPath);
    await expect(loadCatalogResources(catalog, dir)).rejects.toMatchObject({ code: 'CATALOG_RESOURCE_PATH_UNSAFE' });
  });

  test('rejects a missing resource file', async () => {
    const { dir, catalogPath } = await resourceCatalog();
    await addResource(dir, catalogPath, 'absent', { path: 'resources/absent.json', content: '{}' });
    await rm(join(dir, 'resources/absent.json'));
    const catalog = await loadCatalog(catalogPath);
    await expect(loadCatalogResources(catalog, dir)).rejects.toMatchObject({ code: 'CATALOG_RESOURCE_PATH_MISSING' });
  });

  test('rejects a symlinked resource file when the platform permits it', async () => {
    const { dir, catalogPath } = await resourceCatalog();
    const outside = join(dir, 'outside.json');
    await writeFile(outside, '{}');
    await mkdir(join(dir, 'resources'), { recursive: true });
    try {
      await symlink(outside, join(dir, 'resources/linked.json'), 'file');
    } catch {
      return;
    }
    await addResource(dir, catalogPath, 'linked', { path: 'resources/linked.json' });
    const catalog = await loadCatalog(catalogPath);
    await expect(loadCatalogResources(catalog, dir)).rejects.toMatchObject({ code: 'CATALOG_RESOURCE_PATH_UNSAFE' });
  });

  test('rejects an escaping directory link inside resources/', async () => {
    const { dir, catalogPath } = await resourceCatalog();
    const outside = await mkdtemp(join(tmpdir(), 'vp-resource-outside-'));
    tempDirs.push(outside);
    await writeFile(join(outside, 'evil.json'), '{}');
    await mkdir(join(dir, 'resources'), { recursive: true });
    await symlink(outside, join(dir, 'resources/escape'), process.platform === 'win32' ? 'junction' : 'dir');
    await addResource(dir, catalogPath, 'escape', { path: 'resources/escape/evil.json' });
    const catalog = await loadCatalog(catalogPath);
    await expect(loadCatalogResources(catalog, dir)).rejects.toMatchObject({ code: 'CATALOG_RESOURCE_PATH_UNSAFE' });
  });

  test('rejects an oversized resource record', async () => {
    const { dir, catalogPath } = await resourceFixture(resourceRecord('res-1', { payload: { data: 'x'.repeat(70_000) } }));
    const catalog = await loadCatalog(catalogPath);
    await expect(loadCatalogResources(catalog, dir)).rejects.toMatchObject({ code: 'CATALOG_RESOURCE_TOO_LARGE' });
  });

  test('rejects a file whose bytes do not match the manifest sha256', async () => {
    const { dir, catalogPath } = await resourceFixture();
    await writeFile(join(dir, 'resources/res-1.json'), '{"tampered":true}');
    const catalog = await loadCatalog(catalogPath);
    await expect(loadCatalogResources(catalog, dir)).rejects.toMatchObject({ code: 'CATALOG_RESOURCE_DIGEST_MISMATCH' });
  });

  test('rejects malformed JSON and invalid UTF-8', async () => {
    const { dir, catalogPath } = await resourceCatalog();
    await addResource(dir, catalogPath, 'bad-json', { content: '{not json' });
    let catalog = await loadCatalog(catalogPath);
    await expect(loadCatalogResources(catalog, dir)).rejects.toMatchObject({ code: 'CATALOG_RESOURCE_MALFORMED' });
    const second = await resourceCatalog();
    await addResource(second.dir, second.catalogPath, 'bad-utf8', { content: Buffer.from([0xff, 0xfe, 0x7b, 0x7d]) });
    catalog = await loadCatalog(second.catalogPath);
    await expect(loadCatalogResources(catalog, second.dir)).rejects.toMatchObject({ code: 'CATALOG_RESOURCE_MALFORMED' });
  });

  test('rejects a schema-invalid record', async () => {
    const record = resourceRecord('res-1');
    delete record.payload;
    const { dir, catalogPath } = await resourceFixture(record);
    const catalog = await loadCatalog(catalogPath);
    await expect(loadCatalogResources(catalog, dir)).rejects.toMatchObject({ code: 'CATALOG_RESOURCE_SCHEMA_INVALID' });
  });

  test('rejects a record whose internal digest does not match', async () => {
    const signed = signResource(resourceRecord('res-1'));
    const tampered = { ...signed, payload: { heading_font: 'Comic Sans' } };
    const { dir, catalogPath } = await resourceCatalog();
    await addResource(dir, catalogPath, 'res-1', { content: JSON.stringify(tampered) });
    const catalog = await loadCatalog(catalogPath);
    await expect(loadCatalogResources(catalog, dir)).rejects.toMatchObject({ code: 'CATALOG_RESOURCE_DIGEST_MISMATCH' });
  });

  test('rejects a record id that differs from the manifest id', async () => {
    const { dir, catalogPath } = await resourceCatalog();
    await addResource(dir, catalogPath, 'res-1', { record: resourceRecord('other-id') });
    const catalog = await loadCatalog(catalogPath);
    await expect(loadCatalogResources(catalog, dir)).rejects.toMatchObject({ code: 'CATALOG_INVALID' });
  });

  test('rejects an invalid applicability declaration', async () => {
    const { dir, catalogPath } = await resourceFixture(resourceRecord('res-1', { applicability: { platforms: ['web'] } }));
    const catalog = await loadCatalog(catalogPath);
    await expect(loadCatalogResources(catalog, dir)).rejects.toMatchObject({ code: 'CATALOG_INVALID' });
  });
});

describe('catalogResourceGet', () => {
  test('returns the exact record and rejects unknown and disabled ids', async () => {
    const { dir, catalogPath } = await resourceCatalog();
    await addResource(dir, catalogPath, 'res-1');
    await addResource(dir, catalogPath, 'res-off', { record: resourceRecord('res-off', { status: 'disabled' }) });
    const { catalog, resources } = await loaded(dir, catalogPath);
    const result = catalogResourceGet(catalog, resources, 'res-1');
    expect(result.resource_id).toBe('res-1');
    expect(result.untrusted).toBe(true);
    expect(result.applicability).toBeUndefined();
    expect(() => catalogResourceGet(catalog, resources, 'missing')).toThrow(expect.objectContaining({ code: 'CATALOG_RESOURCE_UNKNOWN' }));
    expect(() => catalogResourceGet(catalog, resources, 'res-off')).toThrow(expect.objectContaining({ code: 'CATALOG_RESOURCE_DISABLED' }));
    expect(() => catalogResourceGet(catalog, new Map(), 'res-1')).toThrow(expect.objectContaining({ code: 'CATALOG_INVALID' }));
  });

  test('enforces the requested resource_type', async () => {
    const { dir, catalogPath } = await resourceFixture();
    const { catalog, resources } = await loaded(dir, catalogPath);
    expect(catalogResourceGet(catalog, resources, 'res-1', { resourceType: 'font-pairing' }).resource_type).toBe('font-pairing');
    expect(() => catalogResourceGet(catalog, resources, 'res-1', { resourceType: 'palette' })).toThrow(expect.objectContaining({ code: 'CATALOG_RESOURCE_TYPE_MISMATCH' }));
    expect(() => catalogResourceGet(catalog, resources, 'res-1', { resourceType: 'bogus' })).toThrow(expect.objectContaining({ code: 'CATALOG_INVALID' }));
  });

  test('evaluates resource applicability when a declaration or context is present', async () => {
    const { dir, catalogPath } = await resourceCatalog();
    await addResource(dir, catalogPath, 'res-plain');
    await addResource(dir, catalogPath, 'res-app', {
      record: resourceRecord('res-app', { applicability: { platforms: [{ value: 'web' }] } }),
    });
    const { catalog, resources } = await loaded(dir, catalogPath);
    const unresolved = catalogResourceGet(catalog, resources, 'res-app');
    expect(unresolved.applicability).toMatchObject({ state: 'unresolved' });
    const applicable = catalogResourceGet(catalog, resources, 'res-app', { applicabilityContext: { platforms: ['web'] } });
    expect(applicable.applicability).toMatchObject({ state: 'applicable' });
    const contextual = catalogResourceGet(catalog, resources, 'res-plain', { applicabilityContext: { platforms: ['web'] } });
    expect(contextual.applicability).toMatchObject({ state: 'applicable' });
  });
});

describe('catalogCompose resource_ids', () => {
  test('composes explicit resource ids after instruction selection and counts payload bytes', async () => {
    const { dir, catalogPath } = await resourceFixture();
    const { catalog, instructions, resources } = await loaded(dir, catalogPath);
    const bundle = catalogCompose(catalog, instructions, { required_ids: ['guidance'], resource_ids: ['res-1'] }, resources);
    expect(bundle.instructions.map((item) => item.instruction_id)).toEqual(['guidance']);
    expect(bundle.resources).toHaveLength(1);
    expect(bundle.resources[0]).toMatchObject({ resource_id: 'res-1', resource_type: 'font-pairing', untrusted: true });
    const plain = catalogCompose(catalog, instructions, { required_ids: ['guidance'] }, resources);
    expect(plain.resources).toEqual([]);
  });

  test('rejects unknown, disabled and unloaded resource ids', async () => {
    const { dir, catalogPath } = await resourceCatalog();
    await addResource(dir, catalogPath, 'res-1');
    await addResource(dir, catalogPath, 'res-off', { record: resourceRecord('res-off', { status: 'disabled' }) });
    const { catalog, instructions, resources } = await loaded(dir, catalogPath);
    expect(() => catalogCompose(catalog, instructions, { required_ids: ['guidance'], resource_ids: ['missing'] }, resources))
      .toThrow(expect.objectContaining({ code: 'CATALOG_RESOURCE_UNKNOWN' }));
    expect(() => catalogCompose(catalog, instructions, { required_ids: ['guidance'], resource_ids: ['res-off'] }, resources))
      .toThrow(expect.objectContaining({ code: 'CATALOG_RESOURCE_DISABLED' }));
    expect(() => catalogCompose(catalog, instructions, { required_ids: ['guidance'], resource_ids: ['res-1'] }))
      .toThrow(expect.objectContaining({ code: 'CATALOG_INVALID' }));
    expect(() => catalogCompose(catalog, instructions, { resource_ids: 'res-1' } as unknown as ComposeQuery, resources))
      .toThrow(expect.objectContaining({ code: 'CATALOG_INVALID' }));
    expect(() => catalogCompose(catalog, instructions, { resource_ids: [''] }, resources))
      .toThrow(expect.objectContaining({ code: 'CATALOG_INVALID' }));
  });

  test('shares the 64,000-byte budget between instruction content and resource payloads', async () => {
    const { dir, catalogPath } = await resourceCatalog();
    const catalogBefore = await loadCatalog(catalogPath);
    const instructionsBefore = await loadInstructions(catalogBefore, dir);
    const guidance = instructionsBefore.get('guidance');
    if (guidance === undefined) throw new Error('guidance fixture missing');
    const instructionBytes = Buffer.byteLength(guidance.content, 'utf8');
    const payloadBytes = (length: number) => Buffer.byteLength(canonicalJson({ data: 'x'.repeat(length) }) ?? '', 'utf8');
    const base = 64_000 - instructionBytes - payloadBytes(0);
    const passLength = base - 50;
    const failLength = base + 50;
    await addResource(dir, catalogPath, 'res-pass', { record: resourceRecord('res-pass', { payload: { data: 'x'.repeat(passLength) } }) });
    await addResource(dir, catalogPath, 'res-fail', { record: resourceRecord('res-fail', { payload: { data: 'x'.repeat(failLength) } }) });
    const { catalog, instructions, resources } = await loaded(dir, catalogPath);
    const passing = catalogCompose(catalog, instructions, { required_ids: ['guidance'], resource_ids: ['res-pass'] }, resources);
    expect(passing.resources).toHaveLength(1);
    expect(passing.instructions).toHaveLength(1);
    expect(() => catalogCompose(catalog, instructions, { required_ids: ['guidance'], resource_ids: ['res-fail'] }, resources))
      .toThrow(expect.objectContaining({
        code: 'CATALOG_BUNDLE_LIMIT_EXCEEDED',
        details: expect.objectContaining({ resource_payload_bytes: payloadBytes(failLength), bundle_text_bytes: instructionBytes + payloadBytes(failLength) }),
      }));
    // The failed composition produced no partial bundle; the instruction-only compose still succeeds.
    expect(catalogCompose(catalog, instructions, { required_ids: ['guidance'] }, resources).resources).toEqual([]);
  });
});

describe('catalog-cli resource command', () => {
  test('returns the exact record as JSON and enforces --type', async () => {
    const { catalogPath } = await resourceFixture();
    const args = ['resource', '--catalog', catalogPath];
    const result = await runCli([...args, '--id', 'res-1']);
    expect(result.status).toBe(0);
    const record = JSON.parse(result.stdout) as Record<string, unknown>;
    expect(record.resource_id).toBe('res-1');
    expect(record.untrusted).toBe(true);
    expect(record.payload).toEqual({ heading_font: 'Inter', body_font: 'Source Sans 3' });
    const typed = await runCli([...args, '--id', 'res-1', '--type', 'font-pairing']);
    expect(typed.status).toBe(0);
    const mismatch = await runCli([...args, '--id', 'res-1', '--type', 'palette']);
    expect(mismatch.status).toBe(1);
    expect(mismatch.stdout).toBe('');
    expect(stderrJson(mismatch.stderr).code).toBe('CATALOG_RESOURCE_TYPE_MISMATCH');
    const bogus = await runCli([...args, '--id', 'res-1', '--type', 'bogus']);
    expect(bogus.status).toBe(1);
    expect(stderrJson(bogus.stderr).code).toBe('CATALOG_INVALID');
  });

  test('reports distinct error codes for missing, unknown and malformed input', async () => {
    const { catalogPath } = await resourceFixture();
    const missing = await runCli(['resource', '--catalog', catalogPath]);
    expect(missing.status).toBe(1);
    expect(stderrJson(missing.stderr).code).toBe('CATALOG_INVALID');
    const unknown = await runCli(['resource', '--catalog', catalogPath, '--id', 'nope']);
    expect(unknown.status).toBe(1);
    expect(stderrJson(unknown.stderr).code).toBe('CATALOG_RESOURCE_UNKNOWN');
    const unknownFlag = await runCli(['resource', '--catalog', catalogPath, '--id', 'res-1', '--bogus']);
    expect(unknownFlag.status).toBe(1);
    expect(stderrJson(unknownFlag.stderr).code).toBe('CATALOG_INVALID');
    const help = await runCli(['resource', '--help']);
    expect(help.status).toBe(0);
    expect(help.stdout).toContain('VPReferenceResource/v1');
  });

  test('compose and get --profile accept --resource-id and share the budget', async () => {
    const { dir, catalogPath } = await resourceFixture();
    const composed = await runCli(['compose', '--catalog', catalogPath, '--required', 'guidance', '--resource-id', 'res-1']);
    expect(composed.status).toBe(0);
    const bundle = JSON.parse(composed.stdout) as { instructions: unknown[]; resources: { resource_id: string }[] };
    expect(bundle.instructions).toHaveLength(1);
    expect(bundle.resources.map((item) => item.resource_id)).toEqual(['res-1']);
    const noResources = await runCli(['compose', '--catalog', catalogPath, '--required', 'guidance']);
    expect((JSON.parse(noResources.stdout) as { resources: unknown[] }).resources).toEqual([]);
    const profilePath = join(dir, 'profile.json');
    await writeFile(profilePath, JSON.stringify({ schema: 'VPEffectiveProfile/v1', groups: {}, unresolved_groups: {} }));
    const got = await runCli(['get', '--catalog', catalogPath, '--id', 'guidance', '--profile', profilePath, '--resource-id', 'res-1']);
    expect(got.status).toBe(0);
    expect(got.stdout).toContain('resource res-1 (font-pairing, untrusted)');
    expect(got.stderr).toContain('1 resources');
    const rejected = await runCli(['get', '--catalog', catalogPath, '--id', 'guidance', '--resource-id', 'res-1']);
    expect(rejected.status).toBe(1);
    expect(rejected.stdout).toBe('');
  });
});

test('fixture catalog stays schema-valid with resources entries', async () => {
  const { dir, catalogPath } = await resourceFixture();
  const catalog = await loadCatalog(catalogPath);
  expect(catalog.resources).toHaveLength(1);
  const schema = JSON.parse(await readFile(join(dir, 'config/vpcatalog.v1.schema.json'), 'utf8')) as Record<string, unknown>;
  expect(validateAgainstSchema(JSON.parse(await readFile(catalogPath, 'utf8')), schema)).toEqual([]);
});
