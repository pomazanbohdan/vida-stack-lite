import { afterEach, expect, spyOn, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import * as files from 'node:fs/promises';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareBatch, applyPreparedBatch, reconcilePreparedBatch, releasePreparedOwnership, convertMany, convertMapRecord } from '../scripts/convert.ts';
import { sealArtifact } from '../scripts/source-packets.ts';
import { fixtureCatalog, fixtureEligibility, fixtureSpec } from './source-packet-fixture.ts';

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });
async function fixture(count = 2) {
  const root = await mkdtemp(join(tmpdir(), 'vp-prepared-')); roots.push(root);
  const evidence = await mkdtemp(join(tmpdir(), 'vp-evidence-')); roots.push(evidence);
  const staging = await mkdtemp(join(tmpdir(), 'vp-staging-')); roots.push(staging);
  await writeFile(join(root, 'catalog.json'), JSON.stringify(fixtureCatalog));
  await writeFile(join(root, 'donors.yaml'), JSON.stringify({ local_root: evidence, donors: [{ id: 'fixture-donor', local_path: '.', content_path: '.', license: 'MIT', head_sha: 'a'.repeat(40) }] }));
  await writeFile(join(root, 'unrelated.txt'), 'Keep unrelated bytes.');
  const sources = [];
  for (let index = 0; index < count; index++) sources.push(await fixtureEligibility(evidence, fixtureSpec(index), index));
  const options = { root, stagingRoot: staging, now: () => '2026-01-01T00:00:00Z' };
  return { root, evidence, staging, sources, options };
}
async function approval(plan: Awaited<ReturnType<typeof prepareBatch>>, staging: string) {
  const review = await sealArtifact(staging, `review-${plan.manifest.sha256}.json`, { schema: 'VPPreparedBatchReview/v1', planSha256: plan.manifest.sha256, verdict: 'READY', reviewer: 'model:fixture-reviewer', pointer: 'fixture:review' });
  return { review, observe: async () => ({ kind: 'observed' as const, writer: 'root:fixture', reviewPointer: 'fixture:review' }) };
}
test('prepared batch stages all outputs without writing, then applies once and preserves unrelated bytes', async () => {
  const f = await fixture();
  const old = await readFile(join(f.root, 'catalog.json'), 'utf8');
  const plan = await prepareBatch(f.sources, f.options);
  expect(await readFile(join(f.root, 'catalog.json'), 'utf8')).toBe(old);
  expect((await reconcilePreparedBatch(plan)).state).toBe('NO_EFFECT_OBSERVED');
  const result = await applyPreparedBatch(plan, await approval(plan, f.staging));
  expect(result.kind).toBe('applied');
  expect((await reconcilePreparedBatch(plan)).state).toBe('TARGET_STATE_MATCHES');
  expect(JSON.parse(await readFile(join(f.root, 'catalog.json'), 'utf8')).instructions).toHaveLength(2);
  expect(await readFile(join(f.root, 'unrelated.txt'), 'utf8')).toBe('Keep unrelated bytes.');
  await expect(applyPreparedBatch(plan, { review: { path: 'review.json', sha256: '0'.repeat(64) }, observe: async () => ({ kind: 'unconfirmed' }) })).rejects.toThrow();
});
test('stale preimage and donor revision conflict write nothing', async () => {
  const f = await fixture(1);
  const plan = await prepareBatch(f.sources, f.options);
  await writeFile(join(f.root, 'catalog.json'), 'unrelated change');
  expect((await applyPreparedBatch(plan, await approval(plan, f.staging))).kind).toBe('no-write-conflict');
  expect(await readFile(join(f.root, 'catalog.json'), 'utf8')).toBe('unrelated change');
  const g = await fixture(1);
  await writeFile(join(g.root, 'corpus-map.json'), JSON.stringify({ schema: 'VPCorpusMap/v1', revision: 1, updated_at: '2026-01-01T00:00:00Z', donors: { 'fixture-donor': { source_revision: 'b'.repeat(40), files: { 'preserved.md': { status: 'rejected', reason: 'Keep.' } } } } }));
  await expect(prepareBatch(g.sources, g.options)).rejects.toThrow('revision');
  expect(JSON.parse(await readFile(join(g.root, 'corpus-map.json'), 'utf8')).donors['fixture-donor'].files['preserved.md']).toBeDefined();
});
test('interruption preserves a mixed state and fences blind retry', async () => {
  const f = await fixture();
  const plan = await prepareBatch(f.sources, f.options);
  await mkdir(join(f.root, 'instructions'));
  await writeFile(join(f.root, 'instructions', 'fixture-method-1.md'), 'intervening bytes');
  const result = await applyPreparedBatch(plan, await approval(plan, f.staging));
  expect(result.kind).toBe('no-write-conflict');
  expect((await reconcilePreparedBatch(plan)).state).toBe('CONFLICT_OR_UNKNOWN');
});
test('legacy sequential conversion retains prior success when a later spec fails', async () => {
  const f = await fixture(0);
  await writeFile(join(f.evidence, 'good.json'), JSON.stringify(fixtureSpec(0)));
  await writeFile(join(f.evidence, 'bad.json'), '{}');
  await expect(convertMany([join(f.evidence, 'good.json'), join(f.evidence, 'bad.json')], { root: f.root })).rejects.toThrow();
  expect(JSON.parse(await readFile(join(f.root, 'catalog.json'), 'utf8')).instructions).toHaveLength(1);
  expect(await convertMany([join(f.evidence, 'good.json')], { root: f.root })).toHaveLength(1);
});

test('native CLI returns a failing status without leaking it into the test process', () => {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('../scripts/convert.ts', import.meta.url))], { encoding: 'utf8' });
  expect(result.status).toBe(1);
  expect(JSON.parse(result.stderr).code).toBe('CATALOG_INVALID');
});

test.each([1, 2, 3, 4])('a failure after target %i retains evidence and requires explicit recovery', async stoppedAfter => {
    const f = await fixture(2);
    const plan = await prepareBatch(f.sources, f.options);
    const approved = await approval(plan, f.staging);
    const realWrite = files.writeFile;
    let targetWrites = 0;
    const spy = spyOn(files, 'writeFile').mockImplementation(async (...args: Parameters<typeof files.writeFile>) => {
      await realWrite(...args);
      const path = String(args[0]);
      if (path === join(f.root, 'catalog.json') || path === join(f.root, 'corpus-map.json') || path.startsWith(join(f.root, 'instructions') + '\\') || path.startsWith(join(f.root, 'instructions') + '/')) {
        targetWrites++;
        if (targetWrites === stoppedAfter) throw new Error('Injected failure after a completed native write.');
      }
    });
    try {
      expect((await applyPreparedBatch(plan, approved)).kind).toBe('partial-or-unknown');
      expect(targetWrites).toBe(stoppedAfter);
    } finally { spy.mockRestore(); }
    expect((await reconcilePreparedBatch(plan)).state).toBe(stoppedAfter === 4 ? 'TARGET_STATE_MATCHES' : 'KNOWN_PARTIAL');
    await expect(applyPreparedBatch(plan, approved)).rejects.toThrow('fenced');
    expect((await releasePreparedOwnership(plan, async () => ({ kind: 'unconfirmed' }))).released).toBe(false);
    expect((await releasePreparedOwnership(plan, async request => ({ kind: 'observed-quiescent', ownerSha256: request.owner.sha256, pointer: 'fixture:terminal-producer-and-no-descendants' }))).released).toBe(true);
    const recovery = await prepareBatch(f.sources, f.options);
    expect((await applyPreparedBatch(recovery, await approval(recovery, f.staging))).kind).toBe(stoppedAfter === 4 ? 'no-change' : 'applied');
    expect(await readFile(join(f.root, 'unrelated.txt'), 'utf8')).toBe('Keep unrelated bytes.');
});

test('a shared spec cannot omit one of its selected source contributions', async () => {
  const f = await fixture(0);
  const spec = fixtureSpec(1);
  const sharedSpec = await sealArtifact(f.evidence, 'shared-spec.json', spec);
  const first = await fixtureEligibility(f.evidence, spec, 0, { carrierPath: 'source-0.md', sharedSpec });
  const second = await fixtureEligibility(f.evidence, spec, 1, { sharedSpec });
  const before = await readFile(join(f.root, 'catalog.json'), 'utf8');
  await expect(prepareBatch([first, second], f.options)).rejects.toThrow('source contribution');
  expect(await readFile(join(f.root, 'catalog.json'), 'utf8')).toBe(before);
});

test('a shared spec retains both independently eligible source contributions', async () => {
  const f = await fixture(0);
  const spec = { ...fixtureSpec(0), provenance: [...fixtureSpec(0).provenance, ...fixtureSpec(1).provenance] };
  const sharedSpec = await sealArtifact(f.evidence, 'shared-spec.json', spec);
  const first = await fixtureEligibility(f.evidence, spec, 0, { carrierPath: 'source-0.md', sharedSpec });
  const second = await fixtureEligibility(f.evidence, spec, 1, { carrierPath: 'source-1.md', sharedSpec });
  const plan = await prepareBatch([first, second], f.options);
  expect((await applyPreparedBatch(plan, await approval(plan, f.staging))).kind).toBe('applied');
  const map = JSON.parse(await readFile(join(f.root, 'corpus-map.json'), 'utf8'));
  expect(Object.keys(map.donors['fixture-donor'].files).sort()).toEqual(['source-0.md', 'source-1.md']);
  expect(JSON.parse(await readFile(join(f.root, 'catalog.json'), 'utf8')).instructions).toHaveLength(1);
});

test('reconversion preserves merged disposition and locators; a new output retains them in a split', async () => {
  const f = await fixture(1);
  const specPath = join(f.evidence, 'p0/spec.json');
  await convertMany([specPath], { root: f.root });
  const merged = { donor: 'fixture-donor', source_revision: 'a'.repeat(40), path: 'source-0.md', status: 'merged', instruction_ids: ['fixture-method-0'], contributed_sources: ['other:source.md#L4'] };
  const recordPath = join(f.evidence, 'merged.json');
  await writeFile(recordPath, JSON.stringify(merged));
  await convertMapRecord(recordPath, { root: f.root });
  const before = await readFile(join(f.root, 'corpus-map.json'), 'utf8');
  const plan = await prepareBatch(f.sources, f.options);
  expect((await applyPreparedBatch(plan, await approval(plan, f.staging))).kind).toBe('no-change');
  expect(await readFile(join(f.root, 'corpus-map.json'), 'utf8')).toBe(before);
  expect((await convertMany([specPath], { root: f.root }))[0]?.mapUpdated).toBe(false);
  const additional = { ...fixtureSpec(0), instruction_id: 'additional-method' };
  await writeFile(join(f.evidence, 'additional.json'), JSON.stringify(additional));
  await convertMany([join(f.evidence, 'additional.json')], { root: f.root });
  expect(JSON.parse(await readFile(join(f.root, 'corpus-map.json'), 'utf8')).donors['fixture-donor'].files['source-0.md']).toEqual({ status: 'split', instruction_ids: ['fixture-method-0', 'additional-method'], contributed_sources: ['other:source.md#L4'] });
});

test('an occupied converter owner blocks legacy publication without changing the target set', async () => {
  const f = await fixture(0);
  const specPath = join(f.evidence, 'spec.json');
  await writeFile(specPath, JSON.stringify(fixtureSpec(0)));
  await mkdir(join(f.root, '.vp-convert-publication.lock'));
  await writeFile(join(f.root, '.vp-convert-publication.lock', 'owner.json'), 'foreign owner');
  const before = await readFile(join(f.root, 'catalog.json'), 'utf8');
  await expect(convertMany([specPath], { root: f.root })).rejects.toThrow('ownership unavailable');
  expect(await readFile(join(f.root, 'catalog.json'), 'utf8')).toBe(before);
  expect(await readFile(join(f.root, '.vp-convert-publication.lock', 'owner.json'), 'utf8')).toBe('foreign owner');
});

test('prepared targets outside the publication root are rejected before staging effects', async () => {
  const f = await fixture(1);
  const outside = join(f.evidence, 'outside-catalog.json');
  await writeFile(outside, 'outside sentinel');
  const before = await readFile(join(f.root, 'catalog.json'), 'utf8');
  await expect(prepareBatch(f.sources, { ...f.options, catalogPath: outside })).rejects.toThrow('escapes');
  expect(await readFile(outside, 'utf8')).toBe('outside sentinel');
  expect(await readFile(join(f.root, 'catalog.json'), 'utf8')).toBe(before);
});

test('missing staged bytes keep reconciliation unknown and prevent any publication', async () => {
  const f = await fixture(1);
  const plan = await prepareBatch(f.sources, f.options);
  const manifest = JSON.parse(await readFile(join(plan.directory, plan.manifest.path), 'utf8'));
  const staged = manifest.targets[0].staged.path;
  await rm(join(plan.directory, staged));
  expect((await reconcilePreparedBatch(plan)).state).toBe('CONFLICT_OR_UNKNOWN');
  const before = await readFile(join(f.root, 'catalog.json'), 'utf8');
  expect((await applyPreparedBatch(plan, await approval(plan, f.staging))).kind).toBe('no-write-conflict');
  expect(await readFile(join(f.root, 'catalog.json'), 'utf8')).toBe(before);
});

test('a changed donor manifest invalidates a reviewed publication before writes', async () => {
  const f = await fixture(1);
  const plan = await prepareBatch(f.sources, f.options);
  const before = await readFile(join(f.root, 'catalog.json'), 'utf8');
  await writeFile(join(f.root, 'donors.yaml'), 'changed donor manifest');
  const result = await applyPreparedBatch(plan, await approval(plan, f.staging));
  expect(result.kind).toBe('no-write-conflict');
  expect(await readFile(join(f.root, 'catalog.json'), 'utf8')).toBe(before);
  expect(await readFile(join(f.root, 'donors.yaml'), 'utf8')).toBe('changed donor manifest');
});

test('an unreadable corpus context is refused without overwriting canonical bytes', async () => {
  const f = await fixture(1);
  const plan = await prepareBatch(f.sources, f.options);
  const before = await readFile(join(f.root, 'catalog.json'), 'utf8');
  await rm(join(f.root, 'donors.yaml'));
  await mkdir(join(f.root, 'donors.yaml'));
  expect((await applyPreparedBatch(plan, await approval(plan, f.staging))).kind).toBe('no-write-conflict');
  expect(await readFile(join(f.root, 'catalog.json'), 'utf8')).toBe(before);
  expect((await files.lstat(join(f.root, 'donors.yaml'))).isDirectory()).toBe(true);
});
