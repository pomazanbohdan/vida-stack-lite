import { afterEach, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stringify } from 'yaml';
import { loadRuntimeConfig, parseRuntimeConfigYaml } from '../src/config/runtime-config.ts';
import { buildConfiguredContext } from '../src/orchestration/configured-context.ts';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const roots = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function consumer() {
  const root = await mkdtemp(path.join(tmpdir(), 'audit-package-context-'));
  roots.push(root);
  const template = (await readFile(path.join(packageRoot, 'templates/agent-runtime.config.template.v1.yaml'), 'utf8'))
    .replaceAll('{{REPOSITORY}}', 'context-consumer')
    .replaceAll('{{PROJECT}}', 'sample')
    .replaceAll('{{BUNDLE}}', 'vida-agent');
  const config = structuredClone(parseRuntimeConfigYaml(template));
  config.knowledge.sources.push({ id: 'long-local', kind: 'local', location: 'long.md', title: 'Long local source' });
  const long = 'HEAD-REQUIREMENT\n' + 'middle content\n'.repeat(900) + '\nFINAL-REQUIRED-PASSAGE';
  await Promise.all([
    writeFile(path.join(root, 'AGENTS.md'), 'consumer policy'),
    writeFile(path.join(root, 'AGENT.sidecar.md'), 'consumer source map'),
    writeFile(path.join(root, 'long.md'), long),
    writeFile(path.join(root, 'agent-runtime.config.v1.yaml'), stringify(config)),
  ]);
  return { root, config: loadRuntimeConfig(root), long };
}

test('package context works without a copied bundle and ignores a consumer package-path collision', async () => {
  const { root, config } = await consumer();
  const request = {
    work_id: 'package-context',
    attempt: 1,
    source_ids: ['runtime-development-lifecycle', 'project-context'],
    skill_refs: [],
  };
  const first = buildConfiguredContext(root, config, request);
  const packageEntry = first.entries.find((entry) => entry.id === 'runtime-development-lifecycle');
  const source = await readFile(path.join(packageRoot, 'TESTING.md'));
  expect(packageEntry.sha256).toBe(createHash('sha256').update(source).digest('hex'));
  expect(first.entries.find((entry) => entry.id === 'project-context').content).toBe('consumer source map');
  await mkdir(path.join(root, 'vida-agent'));
  await writeFile(path.join(root, 'vida-agent', 'TESTING.md'), 'untrusted collision');
  expect(buildConfiguredContext(root, config, request)).toEqual(first);
});

test('bounded local excerpts preserve the required tail and disclose the omitted middle', async () => {
  const { root, config, long } = await consumer();
  const {
    entries: [entry],
  } = buildConfiguredContext(root, config, {
    work_id: 'tail-context',
    attempt: 1,
    source_ids: ['long-local'],
    skill_refs: [],
  });
  expect(entry.content.length).toBeLessThanOrEqual(8192);
  expect(entry.content.startsWith('HEAD-REQUIREMENT')).toBe(true);
  expect(entry.content.endsWith('FINAL-REQUIRED-PASSAGE')).toBe(true);
  expect(entry.content).toContain('[middle omitted;');
  expect(entry.truncated).toBe(true);
  expect(entry.bytes).toBe(Buffer.byteLength(long));
  expect(entry.sha256).toBe(createHash('sha256').update(long).digest('hex'));
});
