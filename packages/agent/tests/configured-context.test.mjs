import { afterAll, describe, expect, test } from 'bun:test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createConsumerFixture } from './helpers/consumer-fixture.mjs';
import { loadRuntimeConfig } from '../src/config/runtime-config.ts';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { buildConfiguredContext } from '../src/orchestration/configured-context.ts';

const packageRoot = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const root = createConsumerFixture(packageRoot, 'vida-configured-context-');
afterAll(() => rmSync(root, { recursive: true, force: true }));
mkdirSync(path.join(root, '.codex/skills/fixture-skill'), { recursive: true });
writeFileSync(
  path.join(root, '.codex/skills/fixture-skill/SKILL.md'),
  '# Authored fixture skill\nRead the configured source.\n',
);
const config = loadRuntimeConfig(root);
const base = {
  work_id: 'context-test',
  attempt: 1,
  source_ids: ['runtime-development-lifecycle', 'a2a-1'],
  skill_refs: ['.codex/skills/fixture-skill/SKILL.md'],
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
      ['local', 'runtime-development-lifecycle'],
      ['official', 'a2a-1'],
      ['skill', '.codex/skills/fixture-skill/SKILL.md'],
    ]);
    expect(first.entries[1]).toMatchObject({ status: 'unfetched_reference', sha256: null, bytes: null, content: null });
    for (const entry of [first.entries[0], first.entries[2]]) {
      expect(entry.status).toBe('local_excerpt');
      expect(entry.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(entry.bytes).toBeGreaterThan(0);
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
