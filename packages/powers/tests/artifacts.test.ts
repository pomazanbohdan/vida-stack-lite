import { afterEach, describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  appendArtifactEvent,
  indexArtifacts,
  verifyArtifact,
  type ArtifactEventInput,
  type SemanticJudgment,
} from '../skills/vp-mode/scripts/artifacts.ts';

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function fixture(): Promise<{ root: string; store: string }> {
  const root = await mkdtemp(join(tmpdir(), 'vp-artifacts-'));
  roots.push(root);
  const store = join(root, 'artifacts.jsonl');
  return { root, store };
}

function event(overrides: Partial<ArtifactEventInput> = {}): ArtifactEventInput {
  return {
    kind: 'artifact',
    artifact_id: 'VP-6',
    artifact_type: 'markdown',
    product: 'vida-powers',
    work_scope: 'stage-6',
    locator: 'docs/work/VP-6.md',
    revision: 1,
    digest: 'a'.repeat(64),
    links: ['VP-5'],
    source: { origin: 'observed', actor: 'root', reference: 'run-1' },
    ...overrides,
  };
}

const semantic: SemanticJudgment = { verdict: 'pass', actor: 'root', reference: 'review-1', basis: 'scope and contract agree' };

describe('appendArtifactEvent', () => {
  test('appends one event and replays an identical delivery without a second line', async () => {
    const { store } = await fixture();
    const first = await appendArtifactEvent(store, event());
    expect(first).toMatchObject({ operation: 'append', outcome: 'appended', artifact_id: 'VP-6', revision: 1 });
    const replay = await appendArtifactEvent(store, event());
    expect(replay).toMatchObject({ outcome: 'replayed', event_id: first.event_id });
    expect((await readFile(store, 'utf8')).trim().split('\n')).toHaveLength(1);
  });

  test('rejects a changed digest under the same artifact revision and keeps the store intact', async () => {
    const { store } = await fixture();
    await appendArtifactEvent(store, event());
    const before = await readFile(store, 'utf8');
    await expect(appendArtifactEvent(store, event({ digest: 'b'.repeat(64) })))
      .rejects.toThrow('ARTIFACT_REVISION_CONFLICT');
    expect(await readFile(store, 'utf8')).toBe(before);
  });

  test('accepts a higher revision as an explicit update of an existing artifact', async () => {
    const { store } = await fixture();
    await appendArtifactEvent(store, event());
    const update = await appendArtifactEvent(store, event({ kind: 'update', revision: 2, digest: 'c'.repeat(64) }));
    expect(update).toMatchObject({ outcome: 'appended', artifact_id: 'VP-6', revision: 2 });
  });

  test('refuses an update for an artifact that was never recorded', async () => {
    const { store } = await fixture();
    await expect(appendArtifactEvent(store, event({ kind: 'update', revision: 2 })))
      .rejects.toThrow('ARTIFACT_NOT_FOUND');
    await expect(stat(store)).rejects.toThrow();
  });

  test('rejects unknown fields, a bad digest, a bad revision and a bad kind', async () => {
    const { store } = await fixture();
    await expect(appendArtifactEvent(store, { ...event(), extra: true })).rejects.toThrow('ARTIFACT_INVALID');
    await expect(appendArtifactEvent(store, event({ digest: 'not-a-digest' }))).rejects.toThrow('ARTIFACT_INVALID');
    await expect(appendArtifactEvent(store, event({ revision: 0 }))).rejects.toThrow('ARTIFACT_INVALID');
    await expect(appendArtifactEvent(store, { ...event(), kind: 'edit' })).rejects.toThrow('ARTIFACT_INVALID');
    await expect(appendArtifactEvent(store, event({ artifact_type: 'binary' as never }))).rejects.toThrow('ARTIFACT_INVALID');
  });

  test('requires an absolute artifacts.jsonl store path with an existing parent', async () => {
    const { root } = await fixture();
    await expect(appendArtifactEvent('artifacts.jsonl', event())).rejects.toThrow('ARTIFACT_PATH_INVALID');
    await expect(appendArtifactEvent(join(root, 'other.jsonl'), event())).rejects.toThrow('ARTIFACT_PATH_INVALID');
    await expect(appendArtifactEvent(join(root, 'missing', 'artifacts.jsonl'), event())).rejects.toThrow('ARTIFACT_PATH_INVALID');
    await expect(appendArtifactEvent(`${root}/a/../artifacts.jsonl`, event())).rejects.toThrow('ARTIFACT_PATH_INVALID');
  });

  test('fails closed on a store with an unreadable line', async () => {
    const { store } = await fixture();
    await writeFile(store, '{"event_id":"x"}\n');
    await expect(appendArtifactEvent(store, event())).rejects.toThrow('ARTIFACT_STORE_INVALID');
    await writeFile(store, 'not-json\n');
    await expect(appendArtifactEvent(store, event())).rejects.toThrow('ARTIFACT_STORE_INVALID');
  });
});

describe('indexArtifacts', () => {
  test('returns the latest revision per artifact, grouped by work scope, and reads only', async () => {
    const { store } = await fixture();
    await expect(indexArtifacts(store)).rejects.toThrow('ARTIFACT_STORE_MISSING');
    await appendArtifactEvent(store, event());
    await appendArtifactEvent(store, event({ kind: 'update', revision: 2, digest: 'c'.repeat(64) }));
    await appendArtifactEvent(store, event({ artifact_id: 'VP-7', work_scope: 'stage-7', locator: 'docs/work/VP-7.md' }));
    const index = await indexArtifacts(store);
    expect(index.artifacts).toEqual([
      { artifact_id: 'VP-6', work_scope: 'stage-6', artifact_type: 'markdown', revision: 2, locator: 'docs/work/VP-6.md', digest: 'c'.repeat(64), links: ['VP-5'], events: 2 },
      { artifact_id: 'VP-7', work_scope: 'stage-7', artifact_type: 'markdown', revision: 1, locator: 'docs/work/VP-7.md', digest: 'a'.repeat(64), links: ['VP-5'], events: 1 },
    ]);
  });

  test('keeps the highest recorded revision when a later event carries a lower one', async () => {
    const { store } = await fixture();
    await appendArtifactEvent(store, event({ revision: 2, digest: 'c'.repeat(64) }));
    await appendArtifactEvent(store, event({ kind: 'update', revision: 1 }));
    const index = await indexArtifacts(store);
    expect(index.artifacts).toHaveLength(1);
    expect(index.artifacts[0]).toMatchObject({ artifact_id: 'VP-6', revision: 2, digest: 'c'.repeat(64), events: 2 });
  });
});

describe('verifyArtifact', () => {
  test('keeps presence, format and digest separate and reports no completion without a semantic check', async () => {
    const { root, store } = await fixture();
    const bytes = '# VP-6\n';
    await mkdir(join(root, 'docs/work'), { recursive: true });
    await writeFile(join(root, 'docs/work/VP-6.md'), bytes);
    const digest = createHash('sha256').update(bytes).digest('hex');
    await appendArtifactEvent(store, event({ digest }));
    const receipt = await verifyArtifact(store, 'VP-6', { root });
    expect(receipt).toEqual({
      artifact_id: 'VP-6',
      revision: 1,
      presence: { exists: true, regular_file: true, symlink: false },
      format: { artifact_type: 'markdown', valid: true },
      digest: { declared: digest, actual: digest, match: true },
      mechanical_ok: true,
      semantic: null,
      complete: false,
    });
    const withSemantic = await verifyArtifact(store, 'VP-6', { root, semantic });
    expect(withSemantic.complete).toBe(true);
    expect(withSemantic.semantic).toEqual(semantic);
  });

  test('reports a missing artifact and a digest mismatch without a completion claim', async () => {
    const { root, store } = await fixture();
    await appendArtifactEvent(store, event());
    const missing = await verifyArtifact(store, 'VP-6', { root });
    expect(missing.presence).toEqual({ exists: false, regular_file: false, symlink: false });
    expect(missing.format.valid).toBe(false);
    expect(missing.digest.actual).toBeNull();
    expect(missing.mechanical_ok).toBe(false);
    expect(missing.complete).toBe(false);

    await mkdir(join(root, 'docs/work'), { recursive: true });
    await writeFile(join(root, 'docs/work/VP-6.md'), 'different');
    const mismatch = await verifyArtifact(store, 'VP-6', { root, semantic });
    expect(mismatch.digest.match).toBe(false);
    expect(mismatch.mechanical_ok).toBe(false);
    expect(mismatch.complete).toBe(false);
  });

  test('validates the declared format independently of the digest', async () => {
    const { root, store } = await fixture();
    await mkdir(join(root, 'docs/work'), { recursive: true });
    await writeFile(join(root, 'docs/work/VP-6.json'), '{"broken":');
    const digest = createHash('sha256').update(await readFile(join(root, 'docs/work/VP-6.json'))).digest('hex');
    await appendArtifactEvent(store, event({ artifact_type: 'json', locator: 'docs/work/VP-6.json', digest }));
    const receipt = await verifyArtifact(store, 'VP-6', { root });
    expect(receipt.format).toEqual({ artifact_type: 'json', valid: false });
    expect(receipt.digest.match).toBe(true);
    expect(receipt.mechanical_ok).toBe(false);
  });

  test('rejects an unknown artifact id and a non-directory root', async () => {
    const { root, store } = await fixture();
    await appendArtifactEvent(store, event());
    await expect(verifyArtifact(store, 'missing', { root })).rejects.toThrow('ARTIFACT_NOT_FOUND');
    const file = join(root, 'file.txt');
    await writeFile(file, 'x');
    await expect(verifyArtifact(store, 'VP-6', { root: file })).rejects.toThrow('ARTIFACT_ROOT_INVALID');
    await expect(verifyArtifact(store, 'VP-6', { root: join(root, 'absent') })).rejects.toThrow('ARTIFACT_ROOT_INVALID');
  });

  test('rejects an incomplete semantic judgment before reporting a receipt', async () => {
    const { root, store } = await fixture();
    await mkdir(join(root, 'docs/work'), { recursive: true });
    await writeFile(join(root, 'docs/work/VP-6.md'), '# VP-6\n');
    await appendArtifactEvent(store, event());
    await expect(verifyArtifact(store, 'VP-6', { root, semantic: { ...semantic, basis: ' ' } })).rejects.toThrow('ARTIFACT_INVALID');
    await expect(verifyArtifact(store, 'VP-6', { root, semantic: { ...semantic, verdict: 'maybe' as never } })).rejects.toThrow('ARTIFACT_INVALID');
  });

  test('validates jsonl and markdown frontmatter shapes', async () => {
    const { root, store } = await fixture();
    await mkdir(join(root, 'docs/work'), { recursive: true });
    const goodJsonl = '{"a":1}\n{"b":2}\n';
    const badJsonl = '{"a":1}\nnot-json\n';
    const goodMarkdown = '---\ntitle: x\n---\nbody\n';
    const badMarkdown = '---\ntitle: x\nbody\n';
    await writeFile(join(root, 'docs/work/good.jsonl'), goodJsonl);
    await writeFile(join(root, 'docs/work/bad.jsonl'), badJsonl);
    await writeFile(join(root, 'docs/work/good.md'), goodMarkdown);
    await writeFile(join(root, 'docs/work/bad.md'), badMarkdown);
    const cases = [
      ['jsonl-good', 'jsonl', 'docs/work/good.jsonl', goodJsonl, true],
      ['jsonl-bad', 'jsonl', 'docs/work/bad.jsonl', badJsonl, false],
      ['md-good', 'markdown', 'docs/work/good.md', goodMarkdown, true],
      ['md-bad', 'markdown', 'docs/work/bad.md', badMarkdown, false],
    ] as const;
    for (const [id, type, locator, body, expected] of cases) {
      const digest = createHash('sha256').update(body).digest('hex');
      await appendArtifactEvent(store, event({ artifact_id: id, artifact_type: type, locator, digest }));
      const receipt = await verifyArtifact(store, id, { root });
      expect(receipt.format).toEqual({ artifact_type: type, valid: expected });
      expect(receipt.mechanical_ok).toBe(expected);
    }
  });

  test('verifies the highest recorded revision of an artifact', async () => {
    const { root, store } = await fixture();
    await mkdir(join(root, 'docs/work'), { recursive: true });
    const bytes = '# VP-6 v2\n';
    await writeFile(join(root, 'docs/work/VP-6.md'), bytes);
    const digest = createHash('sha256').update(bytes).digest('hex');
    await appendArtifactEvent(store, event({ digest: 'd'.repeat(64) }));
    await appendArtifactEvent(store, event({ kind: 'update', revision: 2, digest }));
    const receipt = await verifyArtifact(store, 'VP-6', { root });
    expect(receipt).toMatchObject({ revision: 2, mechanical_ok: true, complete: false });
  });

  test('normalizes a failing semantic verdict into an incomplete receipt', async () => {
    const { root, store } = await fixture();
    await mkdir(join(root, 'docs/work'), { recursive: true });
    const bytes = '# VP-6\n';
    await writeFile(join(root, 'docs/work/VP-6.md'), bytes);
    const digest = createHash('sha256').update(bytes).digest('hex');
    await appendArtifactEvent(store, event({ digest }));
    const receipt = await verifyArtifact(store, 'VP-6', { root, semantic: { ...semantic, verdict: 'fail' } });
    expect(receipt.complete).toBe(false);
  });
});
