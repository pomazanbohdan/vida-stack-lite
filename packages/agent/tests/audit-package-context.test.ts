import { afterEach, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stringify } from 'yaml';
import { loadRuntimeConfig, parseRuntimeConfigYaml } from '../src/config/runtime-config.ts';
import { buildConfiguredContext } from '../src/orchestration/configured-context.ts';
import { cleanupTrackedFixtureRoots } from './helpers/tracked-fixture-root-cleanup.ts';
import type { AgentRuntimeConfig } from '../src/config/runtime-config.ts';

interface ConsumerFixture {
  readonly root: string;
  readonly config: AgentRuntimeConfig;
  readonly long: string;
}

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const roots = new Set<string>();
const retainedRoots = new Set<string>();
afterEach(async () => cleanupTrackedFixtureRoots(roots, retainedRoots));

async function consumer(): Promise<ConsumerFixture> {
  const root = await mkdtemp(path.join(tmpdir(), 'audit-package-context-'));
  roots.add(root);
  const template = (await readFile(path.join(packageRoot, 'templates/agent-runtime.config.template.v1.yaml'), 'utf8'))
    .replaceAll('{{REPOSITORY}}', 'context-consumer')
    .replaceAll('{{PROJECT}}', 'sample')
    .replaceAll('{{BUNDLE}}', 'vida-agent');
  const parsed = parseRuntimeConfigYaml(template);
  const config: AgentRuntimeConfig = {
    ...parsed,
    knowledge: {
      ...parsed.knowledge,
      sources: [
        ...parsed.knowledge.sources,
        { id: 'long-local', kind: 'local', location: 'long.md', title: 'Long local source' },
      ],
    },
  };
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
  const pilotPhaseKey = 'VIDA_CALLER_RESOURCE_PILOT_PHASE';
  const callerPilot = process.env.VIDA_CALLER_RESOURCE_PILOT_ID?.startsWith('configured-context-') ?? false;
  const previousPilotPhase = process.env[pilotPhaseKey];
  let first: ReturnType<typeof buildConfiguredContext>;
  try {
    if (callerPilot) process.env[pilotPhaseKey] = 'operation';
    first = buildConfiguredContext(root, config, request);
  } finally {
    if (callerPilot) {
      if (previousPilotPhase === undefined) delete process.env[pilotPhaseKey];
      else process.env[pilotPhaseKey] = previousPilotPhase;
    }
  }
  const packageEntry = first.entries.find((entry) => entry.id === 'runtime-development-lifecycle');
  if (!packageEntry) throw Error('package context entry is missing');
  const source = await readFile(path.join(packageRoot, 'instructions/development-lifecycle.md'));
  expect(packageEntry.sha256).toBe(createHash('sha256').update(source).digest('hex'));
  const projectEntry = first.entries.find((entry) => entry.id === 'project-context');
  if (!projectEntry) throw Error('consumer context entry is missing');
  expect(projectEntry.content).toBe('consumer source map');
  await mkdir(path.join(root, 'vida-agent', 'instructions'), { recursive: true });
  await writeFile(path.join(root, 'vida-agent', 'instructions', 'development-lifecycle.md'), 'untrusted collision');
  expect(buildConfiguredContext(root, config, request)).toEqual(first);
});

test('bounded local excerpts preserve the required tail and disclose the omitted middle', async () => {
  const { root, config, long } = await consumer();
  const result = buildConfiguredContext(root, config, {
    work_id: 'tail-context',
    attempt: 1,
    source_ids: ['long-local'],
    skill_refs: [],
  });
  const entry = result.entries[0];
  if (!entry || entry.content === null) throw Error('long local context entry is missing');
  expect(entry.content.length).toBeLessThanOrEqual(8192);
  expect(entry.content).toStartWith('HEAD-REQUIREMENT');
  expect(entry.content).toEndWith('FINAL-REQUIRED-PASSAGE');
  expect(entry.content).toContain('[middle omitted;');
  expect(entry.truncated).toBe(true);
  expect(entry.bytes).toBe(Buffer.byteLength(long));
  expect(entry.sha256).toBe(createHash('sha256').update(long).digest('hex'));
});

test('bounded excerpts cut inward at both supplementary-character boundaries', async () => {
  const { root, config } = await consumer();
  const omission = '\n[middle omitted; read source for complete content]\n';
  const head = Math.ceil((8192 - omission.length) / 2);
  const tail = Math.floor((8192 - omission.length) / 2);
  const content = 'H'.repeat(head - 1) + '😀' + 'middle'.repeat(300) + '𝄞' + 'T'.repeat(tail - 1);
  await writeFile(path.join(root, 'long.md'), content);
  const result = buildConfiguredContext(root, config, {
    work_id: 'unicode-context',
    attempt: 1,
    source_ids: ['long-local'],
    skill_refs: [],
  });
  const entry = result.entries[0];
  if (!entry) throw Error('unicode context entry is missing');
  expect(entry.content).toBe('H'.repeat(head - 1) + omission + 'T'.repeat(tail - 1));
  if (entry.content === null) throw Error('unicode context content is missing');
  expect(entry.content.length).toBeLessThanOrEqual(8192);
  expect(entry.content.isWellFormed()).toBe(true);
  expect(entry.sha256).toBe(createHash('sha256').update(content).digest('hex'));
  expect(entry.truncated).toBe(true);
});

test('local UTF-8 rejects encoded lone surrogates and preserves complete supplementary characters', async () => {
  const { root, config } = await consumer();
  const request = { work_id: 'unicode-context', attempt: 1, source_ids: ['long-local'], skill_refs: [] };
  const content = '😀𝄞 valid';
  await writeFile(path.join(root, 'long.md'), content);
  const validResult = buildConfiguredContext(root, config, request);
  const validEntry = validResult.entries[0];
  if (!validEntry) throw Error('valid unicode context entry is missing');
  expect(validEntry.content).toBe(content);
  for (const bytes of [Buffer.from([0xed, 0xa0, 0x80]), Buffer.from([0xed, 0xb0, 0x80])]) {
    await writeFile(path.join(root, 'long.md'), bytes);
    expect(() => buildConfiguredContext(root, config, request)).toThrow();
  }
});
