import { afterAll, describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyApplicability, isEntryPoint, runApplyApplicabilityCli } from '../scripts/apply-applicability.ts';
import { parseApplicability } from '../skills/vp-mode/scripts/applicability.ts';
import { loadCatalog, loadInstructions } from '../skills/vp-mode/scripts/catalog.ts';
import { parseFrontmatter } from '../skills/vp-mode/scripts/frontmatter.ts';

const here = dirname(fileURLToPath(import.meta.url));
const roots: string[] = [];

afterAll(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'vp-apply-applicability-'));
  roots.push(root);
  await cp(join(here, 'fixtures/catalog'), root, { recursive: true });
  for (const name of ['vpinstruction.v1.2.schema.json', 'vpinstruction.v2.schema.json']) {
    await writeFile(join(root, 'config', name), await readFile(join(here, '..', 'config', name)));
  }
  const catalogPath = join(root, 'catalog.json');
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8')) as Record<string, any>;
  for (const entry of catalog.instructions) {
    const path = join(root, entry.path);
    const source = await readFile(path, 'utf8');
    const next = source.replace(/^---\r?\n/u, '$&schema: VPInstruction/v1.2\nclassification_status: unclassified\nclassification_reason: Synthetic fixture.\n');
    await writeFile(path, next);
    entry.sha256 = createHash('sha256').update(next).digest('hex');
  }
  await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
  return root;
}

describe('applyApplicability', () => {
  test('rewrites a v1.2 instruction to v2 and updates the catalog digest', async () => {
    const root = await fixture();
    const result = await applyApplicability({ root, instructionId: 'alpha', applicability: { runtimes: [{ value: 'node' }] }, now: () => '2026-11-05T00:00:00Z' });
    const text = await readFile(result.path, 'utf8');
    const parsed = parseFrontmatter(text);
    expect(parsed.data.schema).toBe('VPInstruction/v2');
    expect(typeof parsed.data.applicability).toBe('string');
    expect(parseApplicability(parsed.data.applicability as string).runtimes?.[0]?.value).toBe('node');
    const catalog = JSON.parse(await readFile(join(root, 'catalog.json'), 'utf8')) as Record<string, any>;
    expect(catalog.instructions.find((entry: Record<string, any>) => entry.instruction_id === 'alpha').sha256).toBe(result.sha256);
    const loaded = await loadCatalog(join(root, 'catalog.json'));
    const instructions = await loadInstructions(loaded, root);
    expect(instructions.get('alpha')?.applicabilityDeclaration?.runtimes?.[0]?.value).toBe('node');
  });

  test('rejects invalid applicability before writing', async () => {
    const root = await fixture();
    await expect(applyApplicability({ root, instructionId: 'alpha', applicability: { frameworks: [{ name: 'react', versionRange: { raw: '^0.2.3' } }] } })).rejects.toThrow();
  });

  test('runs the CLI in process for inline and file applicability and reports errors', async () => {
    const root = await fixture();
    const modulePath = join(here, '../scripts/apply-applicability.ts');
    const run = async (args: string[]) => {
      let stdout = '';
      let stderr = '';
      let exit: number | undefined;
      const status = await runApplyApplicabilityCli([process.execPath, modulePath, ...args], {
        stdout: (text) => { stdout += text; },
        stderr: (text) => { stderr += text; },
      }, (code) => { exit = code; });
      return { status, stdout, stderr, exit };
    };

    const inline = await run(['--root', root, '--id', 'alpha', '--catalog', join(root, 'catalog.json'), '--applicability', '{"runtimes":[{"value":"node"}]}']);
    expect(inline.status).toBe(0);
    expect(JSON.parse(inline.stdout)).toMatchObject({ catalogRevision: expect.any(Number) });

    const file = join(root, 'applicability.json');
    await writeFile(file, JSON.stringify({ runtimes: [{ value: 'bun' }] }), 'utf8');
    const viaFile = await run(['--root', root, '--id', 'alpha', '--applicability-file', file]);
    expect(viaFile.status).toBe(0);

    const badJson = await run(['--root', root, '--id', 'alpha', '--applicability', '{']);
    expect(badJson.status).toBe(1);
    expect(badJson.exit).toBe(1);
    expect(badJson.stderr.length).toBeGreaterThan(0);

    const missing = await run(['--root', root, '--id', 'missing', '--applicability', '{"runtimes":[{"value":"node"}]}']);
    expect(missing.status).toBe(1);
    expect(missing.stderr).toContain('is not in the catalog');

    const usage = await run(['--root', root]);
    expect(usage.status).toBe(1);
    expect(usage.stderr).toContain('usage:');

    const both = await run(['--root', root, '--id', 'alpha', '--applicability', '{}', '--applicability-file', file]);
    expect(both.status).toBe(1);
    expect(both.stderr).toContain('usage:');

    expect(isEntryPoint(new URL('../scripts/apply-applicability.ts', import.meta.url).href, modulePath)).toBe(true);
    expect(isEntryPoint(new URL('../scripts/apply-applicability.ts', import.meta.url).href, undefined)).toBe(false);
  });

  test('rejects an unsupported schema marker from the CLI', async () => {
    const root = await fixture();
    const path = join(root, 'instructions/alpha.md');
    const source = await readFile(path, 'utf8');
    await writeFile(path, source.replace('schema: VPInstruction/v1.2', 'schema: VPInstruction/v1'), 'utf8');
    let stderr = '';
    const status = await runApplyApplicabilityCli(
      [process.execPath, join(here, '../scripts/apply-applicability.ts'), '--root', root, '--id', 'alpha', '--applicability', '{"runtimes":[{"value":"node"}]}'],
      { stdout: () => undefined, stderr: (text) => { stderr += text; } },
    );
    expect(status).toBe(1);
    expect(stderr).toContain('unsupported schema marker');
  });

  test('rejects a catalog without an instruction list', async () => {
    const root = await fixture();
    const catalogPath = join(root, 'catalog.json');
    const catalog = JSON.parse(await readFile(catalogPath, 'utf8')) as Record<string, unknown>;
    catalog.instructions = {};
    await writeFile(catalogPath, JSON.stringify(catalog), 'utf8');
    await expect(applyApplicability({ root, instructionId: 'alpha', applicability: { runtimes: [{ value: 'node' }] } })).rejects.toThrow('is not in the catalog');
  });
});
