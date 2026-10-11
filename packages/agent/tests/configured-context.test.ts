import { afterAll, describe, expect, test } from 'bun:test';
import { fileURLToPath } from 'node:url';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { loadRuntimeConfig } from '../src/config/runtime-config.ts';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { buildConfiguredContext, type ConfiguredContextRequest } from '../src/orchestration/configured-context.ts';

const sourceRoot =
  process.env.AGENT_RUNTIME_TEST_REPOSITORY_ROOT ?? path.resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const root = mkdtempSync(path.join(tmpdir(), 'vida-configured-context-'));
const yaml = readFileSync(path.join(sourceRoot, 'agent-runtime.config.v1.yaml'), 'utf8');
if (
  !yaml.includes('id: runtime-development-lifecycle') ||
  !yaml.includes('location: packages/agent/instructions/development-lifecycle.md')
)
  throw Error('configured context fixture source registration is missing');
writeFileSync(
  path.join(root, 'agent-runtime.config.v1.yaml'),
  yaml
    .replaceAll('runtime-development-lifecycle', 'candidate-testing')
    .replace('location: packages/agent/instructions/development-lifecycle.md', 'location: docs/context.md'),
);
mkdirSync(path.join(root, 'docs'), { recursive: true });
mkdirSync(path.join(root, '.codex/skills/clio'), { recursive: true });
writeFileSync(path.join(root, 'docs/context.md'), '# Fixture source\nCurrent test context.\n');
writeFileSync(path.join(root, '.codex/skills/clio/SKILL.md'), '# Fixture skill\nUse only the selected test source.\n');
writeFileSync(path.join(root, 'AGENTS.md'), '# Fixture instructions\nRead the fixture sidecar.\n');
writeFileSync(path.join(root, 'AGENT.sidecar.md'), '# Fixture source map\nSelected Source: docs/context.md\n');
afterAll(() => {
  if (!path.resolve(root).startsWith(path.resolve(tmpdir(), 'vida-configured-context-')))
    throw Error('owned context fixture cleanup target differs');
  rmSync(root, { recursive: true, force: true });
});
const config = loadRuntimeConfig(root);
const base: ConfiguredContextRequest = {
  work_id: 'context-test',
  attempt: 1,
  source_ids: ['candidate-testing', 'a2a-1'],
  skill_refs: ['.codex/skills/clio/SKILL.md'],
};

describe('configured local context', () => {
  test('is stable, sorted and explicit about unfetched official references', () => {
    const first = buildConfiguredContext(root, config, base);
    const second = buildConfiguredContext(root, config, {
      ...base,
      source_ids: [...base.source_ids].reverse(),
    });
    expect(first).toEqual(second);
    expect(first.entries.map((entry) => [entry.kind, entry.id])).toEqual([
      ['local', 'candidate-testing'],
      ['official', 'a2a-1'],
      ['skill', '.codex/skills/clio/SKILL.md'],
    ]);
    const officialEntry = first.entries.find((entry) => entry.id === 'a2a-1');
    if (!officialEntry) throw Error('official context entry is missing');
    expect(officialEntry).toMatchObject({ status: 'unfetched_reference', sha256: null, bytes: null, content: null });
    for (const entry of [first.entries[0], first.entries[2]]) {
      if (!entry) throw Error('expected local context entry is missing');
      expect(entry.status).toBe('local_excerpt');
      expect(entry.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(entry.bytes).toBeGreaterThan(0);
      if (entry.content === null) throw Error('local context content is missing');
      expect(entry.content.length).toBeLessThanOrEqual(8192);
    }
    const { digest, ...body } = first;
    expect(digest).toBe(canonicalJsonDigest(body));
  });

  test('rejects missing, duplicate and unsafe references', () => {
    expect(() => buildConfiguredContext(root, config, { ...base, source_ids: ['missing'] })).toThrow(
      /not unique and configured/,
    );
    expect(() => buildConfiguredContext(root, config, { ...base, source_ids: ['a2a-1', 'a2a-1'] })).toThrow(
      /duplicates/,
    );
    expect(() =>
      buildConfiguredContext(root, config, { ...base, skill_refs: ['.codex/skills/does-not-exist/SKILL.md'] }),
    ).toThrow();
    expect(() => buildConfiguredContext(root, config, { ...base, skill_refs: ['.codex/skills/../SKILL.md'] })).toThrow(
      /skill reference/,
    );
  });
});
