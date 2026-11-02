import { expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

async function json(path: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(join(root, path), 'utf8')) as Record<string, unknown>;
}

test('the portable, Codex and Pi payloads share one identity and version', async () => {
  const pkg = await json('package.json');
  const portable = await json('plugin.json');
  const codex = await json('.codex-plugin/plugin.json');
  const marketplace = await json('.agents/plugins/marketplace.json');
  const inputs = await json('config/plugin-manifest-inputs.json');

  expect(portable.name).toBe(pkg.name);
  expect(portable.version).toBe(pkg.version);
  expect(portable.description).toBe(pkg.description);
  expect(codex.name).toBe(pkg.name);
  expect(codex.version).toBe(pkg.version);

  const entry = (marketplace.plugins as Array<Record<string, unknown>>)[0] as Record<string, unknown>;
  expect(entry.name).toBe(pkg.name);
  expect(entry.version).toBe(pkg.version);
  expect((entry.source as Record<string, unknown>).path).toBe('./');
  expect(inputs.targets).toEqual(['portable', 'codex']);
});

test('Pi metadata points at all shipped skills and keeps the package discoverable', async () => {
  const pkg = await json('package.json');
  expect(pkg.keywords).toContain('pi-package');
  const pi = pkg.pi as Record<string, unknown>;
  const skills = pi.skills as string[];
  expect(skills).toContain('./skills');

  for (const name of ['vida-bootstrap', 'vp-mode', 'vp-setup']) {
    const body = await readFile(join(root, 'skills', name, 'SKILL.md'), 'utf8');
    expect(body).toMatch(new RegExp(`^---\\nname: ${name}\\n`, 'u'));
    expect(body).toMatch(/\ndescription: .+/u);
  }
});
