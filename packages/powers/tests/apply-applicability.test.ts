import { afterAll, describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyApplicability } from '../scripts/apply-applicability.ts';
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
});
