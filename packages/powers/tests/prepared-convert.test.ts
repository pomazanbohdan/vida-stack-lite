import { afterEach, expect, spyOn, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as files from 'node:fs/promises';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareBatch, prepareFacetMigration, prepareInstructionFacetBatch, applyPreparedBatch, reconcilePreparedBatch, releasePreparedOwnership, convertMany, convertMapRecord } from '../scripts/convert.ts';
import { checkCorpus } from '../scripts/check-corpus.ts';
import { parseFrontmatter } from '../skills/vp-mode/scripts/frontmatter.ts';
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
const digest = (value: Uint8Array | string): string => createHash('sha256').update(value).digest('hex');
async function facetOptions(f: Awaited<ReturnType<typeof fixture>>) {
  const evidence = await sealArtifact(f.evidence, 'facet/evidence.json', { source: 'test fixture', decision: 'classification reviewed' });
  const policy = await sealArtifact(f.evidence, 'facet/policy.json', { policy: 'current fixture policy' });
  return {
    ...f.options,
    classificationEvidence: { path: join(f.evidence, evidence.path), sha256: evidence.sha256 },
    policyConfig: { path: join(f.evidence, policy.path), sha256: policy.sha256 },
  };
}
async function seedFacetInstruction(f: Awaited<ReturnType<typeof fixture>>, index: number, options: { body?: string; status?: 'active' | 'disabled' } = {}) {
  const original = fixtureSpec(index);
  const spec = { ...original, body: options.body ?? original.body, status: options.status ?? original.status };
  const specPath = join(f.evidence, `facet-spec-${index}.json`);
  await writeFile(specPath, JSON.stringify(spec));
  await convertMany([specPath], { root: f.root, now: () => '2026-01-02T00:00:00Z' });
  const catalog = JSON.parse(await readFile(join(f.root, 'catalog.json'), 'utf8'));
  const entry = catalog.instructions.find((item: { instruction_id: string }) => item.instruction_id === spec.instruction_id);
  if (entry === undefined) throw new Error(`fixture instruction was not created: ${spec.instruction_id}`);
  const path = join(f.root, entry.path);
  return { entry, path, bytes: await readFile(path) };
}
function suffixAfterFrontmatter(bytes: Buffer): Buffer {
  const markdown = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  const source = markdown.startsWith('\uFEFF') ? markdown.slice(1) : markdown;
  const firstEnd = source.indexOf('\n');
  if (firstEnd < 0) throw new Error('fixture frontmatter opening line is missing');
  let start = firstEnd + 1;
  while (start < source.length) {
    const newline = source.indexOf('\n', start);
    const lineEnd = newline < 0 ? source.length : newline;
    const end = newline < 0 ? lineEnd : newline + 1;
    const line = source.slice(start, lineEnd).replace(/\r$/u, '');
    if (line.trimEnd() === '---') return Buffer.from(source.slice(end), 'utf8');
    start = end;
  }
  throw new Error('fixture frontmatter closing line is missing');
}
const facetFields = new Set(['schema', 'revision', 'classification_status', 'instruction_form', 'domains', 'classification_reason']);
test('unbound first batch of a mixed cohort is fenced before either instruction changes', async () => {
  const f = await fixture(2);
  const seeded = [await seedFacetInstruction(f, 0), await seedFacetInstruction(f, 1)];
  const catalogPath = join(f.root, 'catalog.json');
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  const legacy = seeded.map(item => Buffer.from(item.bytes.toString('utf8').replace('schema: VPInstruction/v1.2\nclassification_status: unclassified\nclassification_reason: classification-not-assessed\n', '')));
  for (const [index, item] of seeded.entries()) {
    const bytes = legacy[index];
    if (bytes === undefined || bytes.equals(item.bytes)) throw new Error('fixture did not create a legacy preimage');
    await writeFile(item.path, bytes);
    catalog.instructions.find((entry: { instruction_id: string }) => entry.instruction_id === item.entry.instruction_id).sha256 = digest(bytes);
  }
  await writeFile(catalogPath, JSON.stringify(catalog));
  const beforeCatalog = await readFile(catalogPath);
  const beforeMap = await readFile(join(f.root, 'corpus-map.json'));
  const first = seeded[0];
  const firstBytes = legacy[0];
  if (first === undefined || firstBytes === undefined) throw new Error('fixture has no first instruction');
  const plan = await prepareInstructionFacetBatch([{ instruction_id: first.entry.instruction_id, expected_sha256: digest(firstBytes), classification: { classification_status: 'unclassified', classification_reason: 'Not assessed.' } }], await facetOptions(f));
  expect((await applyPreparedBatch(plan, await approval(plan, f.staging))).kind).toBe('no-write-conflict');
  for (const [index, item] of seeded.entries()) { const bytes = legacy[index]; if (bytes === undefined) throw new Error('missing fixture'); expect(await readFile(item.path)).toEqual(bytes); }
  expect(await readFile(catalogPath)).toEqual(beforeCatalog);
  expect(await readFile(join(f.root, 'corpus-map.json'))).toEqual(beforeMap);
});
async function migrationFixture() {
  const f = await fixture(2);
  const seeded = [await seedFacetInstruction(f, 0, { body: 'Україна\r\nfirst\n' }), await seedFacetInstruction(f, 1, { body: 'second 🌍\r\n' })];
  const catalogPath = join(f.root, 'catalog.json');
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  const legacy: Buffer[] = [];
  for (const item of seeded) {
    const bytes = Buffer.from(item.bytes.toString('utf8').replace('schema: VPInstruction/v1.2\nclassification_status: unclassified\nclassification_reason: classification-not-assessed\n', ''));
    if (bytes.equals(item.bytes)) throw new Error('fixture did not create legacy bytes');
    legacy.push(bytes); await writeFile(item.path, bytes);
    catalog.instructions.find((entry: { instruction_id: string }) => entry.instruction_id === item.entry.instruction_id).sha256 = digest(bytes);
  }
  await writeFile(catalogPath, JSON.stringify(catalog));
  const migration = await prepareFacetMigration(f.root);
  const options = { ...await facetOptions(f), migration };
  const assignment = (index: number) => {
    const item = seeded[index]; const bytes = legacy[index];
    if (item === undefined || bytes === undefined) throw new Error('missing fixture');
    return { instruction_id: item.entry.instruction_id, expected_sha256: digest(bytes), classification: { classification_status: 'unclassified' as const, classification_reason: 'Not assessed.' } };
  };
  return { f, seeded, legacy, options, assignment, catalogPath };
}
test('cohort-bound batches preserve bodies and map through mixed state to strict corpus', async () => {
  const { f, seeded, legacy, options, assignment, catalogPath } = await migrationFixture();
  const map = await readFile(join(f.root, 'corpus-map.json'));
  const initialCatalog = digest(await readFile(catalogPath));
  expect(checkCorpus(f.root).some(issue => issue.code === 'CORPUS_INSTRUCTION_VERSION_UNSUPPORTED')).toBe(true);
  const first = await prepareInstructionFacetBatch([assignment(0)], options);
  const firstManifest = JSON.parse(await readFile(join(first.directory, first.manifest.path), 'utf8'));
  expect(firstManifest.migration.initialCatalog).toBe(initialCatalog);
  expect((await applyPreparedBatch(first, await approval(first, f.staging))).kind).toBe('applied');
  expect(checkCorpus(f.root).some(issue => issue.code === 'CORPUS_INSTRUCTION_VERSION_UNSUPPORTED')).toBe(true);
  const second = await prepareInstructionFacetBatch([assignment(1)], options);
  const secondManifest = JSON.parse(await readFile(join(second.directory, second.manifest.path), 'utf8'));
  expect(secondManifest.migration.initialCatalog).toBe(initialCatalog);
  expect(secondManifest.migration.catalog).not.toBe(initialCatalog);
  const result = await applyPreparedBatch(second, await approval(second, f.staging));
  expect(result.kind).toBe('applied');
  const receipt = JSON.parse(await readFile(join(f.staging, result.receipt.path), 'utf8'));
  expect(receipt.details).toMatchObject({ validation: 'strict-corpus', remaining: 0 });
  expect(checkCorpus(f.root)).toEqual([]);
  expect(await readFile(join(f.root, 'corpus-map.json'))).toEqual(map);
  for (const [index, item] of seeded.entries()) { const bytes = legacy[index]; if (bytes === undefined) throw new Error('missing fixture'); expect(suffixAfterFrontmatter(await readFile(item.path))).toEqual(suffixAfterFrontmatter(bytes)); }
});
test('forged and serialized migration capabilities cannot prepare a batch', async () => {
  const { options, assignment } = await migrationFixture();
  await expect(prepareInstructionFacetBatch([assignment(0)], { ...options, migration: { kind: 'facet-migration' } })).rejects.toThrow('capability');
  const serialized = JSON.parse(JSON.stringify(options.migration));
  await expect(prepareInstructionFacetBatch([assignment(0)], { ...options, migration: serialized })).rejects.toThrow('capability');
});
test('a competing live migration capability cannot publish a stale plan', async () => {
  const { f, options, assignment } = await migrationFixture();
  const other = await prepareFacetMigration(f.root);
  const first = await prepareInstructionFacetBatch([assignment(0)], options);
  const competing = await prepareInstructionFacetBatch([assignment(1)], { ...options, migration: other });
  expect((await applyPreparedBatch(first, await approval(first, f.staging))).kind).toBe('applied');
  expect((await applyPreparedBatch(competing, await approval(competing, f.staging))).kind).toBe('no-write-conflict');
  await expect(prepareInstructionFacetBatch([assignment(1)], { ...options, migration: other })).rejects.toThrow('changed');
});
test('cohort reorder alone fences a prepared migration', async () => {
  const { f, options, assignment, catalogPath, seeded } = await migrationFixture();
  const plan = await prepareInstructionFacetBatch([assignment(0)], options);
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  catalog.instructions.reverse();
  await writeFile(catalogPath, JSON.stringify(catalog));
  const before = await readFile(seeded[0]!.path);
  expect((await applyPreparedBatch(plan, await approval(plan, f.staging))).kind).toBe('no-write-conflict');
  expect(await readFile(seeded[0]!.path)).toEqual(before);
});
test('a target changed after the first write is preserved and fences migration reuse', async () => {
  const { f, seeded, options, assignment } = await migrationFixture();
  const plan = await prepareInstructionFacetBatch([assignment(0), assignment(1)], options);
  const approved = await approval(plan, f.staging);
  const first = seeded[0]; const second = seeded[1];
  if (first === undefined || second === undefined) throw new Error('missing fixture');
  const foreign = Buffer.from('foreign concurrent bytes');
  const realWrite = files.writeFile;
  const spy = spyOn(files, 'writeFile').mockImplementation(async (...args: Parameters<typeof files.writeFile>) => {
    await realWrite(...args);
    if (String(args[0]) === first.path) await realWrite(second.path, foreign);
  });
  try { expect((await applyPreparedBatch(plan, approved)).kind).toBe('partial-or-unknown'); }
  finally { spy.mockRestore(); }
  expect(await readFile(second.path)).toEqual(foreign);
  expect((await reconcilePreparedBatch(plan)).state).toBe('CONFLICT_OR_UNKNOWN');
  await expect(applyPreparedBatch(plan, approved)).rejects.toThrow('fenced');
  await expect(prepareInstructionFacetBatch([assignment(1)], options)).rejects.toThrow('fenced');
});
for (const name of ['catalog.json', 'corpus-map.json'] as const) {
  test(`migration rejects a symlinked ${name} before effects`, async () => {
    const { f, options, assignment } = await migrationFixture();
    const plan = await prepareInstructionFacetBatch([assignment(0)], options);
    const path = join(f.root, name); const external = join(f.evidence, `external-${name}`);
    const bytes = await readFile(path); await mkdir(external); await writeFile(join(external, 'sentinel'), bytes); await rm(path);
    await files.symlink(external, path, process.platform === 'win32' ? 'junction' : 'dir');
    await expect(prepareFacetMigration(f.root)).rejects.toThrow('symlink');
    await expect(prepareInstructionFacetBatch([assignment(0)], options)).rejects.toThrow('symlink');
    expect((await applyPreparedBatch(plan, await approval(plan, f.staging))).kind).toBe('no-write-conflict');
    expect(await readFile(join(external, 'sentinel'))).toEqual(bytes);
  });
}
test('a newly created foreign target is not overwritten after preflight', async () => {
  const f = await fixture(2);
  const plan = await prepareBatch(f.sources, f.options);
  const approved = await approval(plan, f.staging);
  const manifest = JSON.parse(await readFile(join(plan.directory, plan.manifest.path), 'utf8'));
  const creates = manifest.targets.filter((item: { before: string | null }) => item.before === null);
  expect(creates).toHaveLength(3);
  const first = join(f.root, creates[0].path); const second = join(f.root, creates[1].path);
  const realWrite = files.writeFile; const foreign = 'foreign new file';
  const spy = spyOn(files, 'writeFile').mockImplementation(async (...args: Parameters<typeof files.writeFile>) => {
    await realWrite(...args);
    if (String(args[0]) === first) await realWrite(second, foreign);
  });
  try { expect((await applyPreparedBatch(plan, approved)).kind).toBe('partial-or-unknown'); }
  finally { spy.mockRestore(); }
  expect(await readFile(second, 'utf8')).toBe(foreign);
  await expect(applyPreparedBatch(plan, approved)).rejects.toThrow('fenced');
});
for (const tamper of ['legacy', 'body', 'map', 'extra', 'missing', 'path', 'marker'] as const) {
  test(`migration rejects ${tamper} drift before writing the next batch`, async () => {
    const { f, seeded, options, assignment, catalogPath } = await migrationFixture();
    const first = await prepareInstructionFacetBatch([assignment(0)], options);
    expect((await applyPreparedBatch(first, await approval(first, f.staging))).kind).toBe('applied');
    const second = await prepareInstructionFacetBatch([assignment(1)], options);
    const firstItem = seeded[0]; const secondItem = seeded[1];
    if (firstItem === undefined || secondItem === undefined) throw new Error('missing fixture');
    if (tamper === 'legacy') await writeFile(secondItem.path, 'changed legacy');
    if (tamper === 'body') await writeFile(firstItem.path, Buffer.concat([await readFile(firstItem.path), Buffer.from('changed body')]));
    if (tamper === 'marker') await writeFile(secondItem.path, (await readFile(secondItem.path, 'utf8')).replace('revision:', 'schema: unknown\nrevision:'));
    if (tamper === 'map') await writeFile(join(f.root, 'corpus-map.json'), '{}');
    if (tamper === 'extra') await writeFile(join(f.root, 'instructions', 'extra.md'), 'extra');
    if (tamper === 'missing') await rm(firstItem.path);
    if (tamper === 'path') { const catalog = JSON.parse(await readFile(catalogPath, 'utf8')); catalog.instructions[1].path = 'instructions/other.md'; await writeFile(catalogPath, JSON.stringify(catalog)); }
    const before = await readFile(secondItem.path);
    expect((await applyPreparedBatch(second, await approval(second, f.staging))).kind).toBe('no-write-conflict');
    expect(await readFile(secondItem.path)).toEqual(before);
  });
}
test('migration binding rejects a malformed current assessment even when the catalog digest matches', async () => {
  const { f, seeded, options, assignment, catalogPath } = await migrationFixture();
  const plan = await prepareInstructionFacetBatch([assignment(0)], options);
  expect((await applyPreparedBatch(plan, await approval(plan, f.staging))).kind).toBe('applied');
  const item = seeded[0]; if (item === undefined) throw new Error('missing fixture');
  const bytes = Buffer.from((await readFile(item.path, 'utf8')).replace('revision:', `approach_assessments:\n  - "dimension=execution; state=declared; values=solo; evidence=body:0-1"\napproach_body_sha256: ${'0'.repeat(64)}\nrevision:`));
  await writeFile(item.path, bytes);
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  catalog.instructions[0].sha256 = digest(bytes);
  await writeFile(catalogPath, JSON.stringify(catalog));
  expect(checkCorpus(f.root).some(issue => issue.code === 'CORPUS_INSTRUCTION_APPROACH_INVALID')).toBe(true);
  await expect(prepareFacetMigration(f.root)).rejects.toThrow('migration corpus validation');
});
test('legacy preimage stages v1.2 while mixed corpus apply is fenced before effects', async () => {
  const f = await fixture(1);
  const seeded = await seedFacetInstruction(f, 0, { body: 'Україна\r\nbody\r\n' });
  const legacy = Buffer.from('\uFEFF' + seeded.bytes.toString('utf8').replace('schema: VPInstruction/v1.2\nclassification_status: unclassified\nclassification_reason: classification-not-assessed\n', '').replace(/\r?\n/g, '\r\n'));
  await writeFile(seeded.path, legacy);
  const catalogPath = join(f.root, 'catalog.json');
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  catalog.instructions[0].sha256 = digest(legacy);
  await writeFile(catalogPath, JSON.stringify(catalog));
  const catalogBefore = await readFile(catalogPath);
  const mapBefore = await readFile(join(f.root, 'corpus-map.json'));
  const assignment = { instruction_id: seeded.entry.instruction_id, expected_sha256: digest(legacy), classification: { classification_status: 'unclassified' as const, classification_reason: 'Not assessed.' } };
  const plan = await prepareInstructionFacetBatch([assignment], await facetOptions(f));
  const manifest = JSON.parse(await readFile(join(plan.directory, plan.manifest.path), 'utf8'));
  const target = manifest.targets.find((item: { path: string }) => item.path.endsWith(`${seeded.entry.instruction_id}.md`));
  const staged = await readFile(join(plan.directory, target.staged.path));
  expect(staged.toString('utf8').startsWith('\uFEFF')).toBe(true);
  expect(suffixAfterFrontmatter(staged)).toEqual(suffixAfterFrontmatter(legacy));
  expect(parseFrontmatter(staged.toString('utf8')).data).toMatchObject({ schema: 'VPInstruction/v1.2', revision: 2 });
  expect((await applyPreparedBatch(plan, await approval(plan, f.staging))).kind).toBe('no-write-conflict');
  expect(await readFile(seeded.path)).toEqual(legacy);
  expect(await readFile(catalogPath)).toEqual(catalogBefore);
  expect(await readFile(join(f.root, 'corpus-map.json'))).toEqual(mapBefore);
});
function nonFacetMetadata(data: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(data).filter(([key]) => !facetFields.has(key)));
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
test('metadata-only batches stage strict v1.2 classifications, preserve raw body and map bytes, then apply through the shared owner', async () => {
  const f = await fixture(2);
  const first = await seedFacetInstruction(f, 0, { body: 'Alpha Ω\r\n\r\nSecond line.\n\n😀\r\n' });
  const second = await seedFacetInstruction(f, 1, { status: 'disabled' });
  const options = await facetOptions(f);
  const catalogBefore = JSON.parse(await readFile(join(f.root, 'catalog.json'), 'utf8'));
  const catalogBytesBefore = await readFile(join(f.root, 'catalog.json'));
  const mapBytesBefore = await readFile(join(f.root, 'corpus-map.json'));
  const firstBefore = first.bytes;
  const secondBefore = second.bytes;
  const assignments = [
    { instruction_id: first.entry.instruction_id, expected_sha256: digest(firstBefore), classification: { classification_status: 'classified' as const, instruction_form: 'procedure' as const, domains: ['engineering' as const, 'design-ux' as const] } },
    { instruction_id: second.entry.instruction_id, expected_sha256: digest(secondBefore), classification: { classification_status: 'unclassified' as const, classification_reason: 'Evidence is not sufficient yet.' } },
  ];
  const plan = await prepareInstructionFacetBatch(assignments, options);
  const manifest = JSON.parse(await readFile(join(plan.directory, plan.manifest.path), 'utf8'));
  expect(manifest.sources).toEqual([]);
  expect(manifest.specs).toEqual([options.classificationEvidence, options.policyConfig]);
  expect(await readFile(first.path)).toEqual(firstBefore);
  expect(await readFile(second.path)).toEqual(secondBefore);
  expect(await readFile(join(f.root, 'catalog.json'))).toEqual(catalogBytesBefore);
  expect(await readFile(join(f.root, 'corpus-map.json'))).toEqual(mapBytesBefore);
  expect((await reconcilePreparedBatch(plan)).state).toBe('NO_EFFECT_OBSERVED');

  expect((await applyPreparedBatch(plan, await approval(plan, f.staging))).kind).toBe('applied');
  expect((await reconcilePreparedBatch(plan)).state).toBe('TARGET_STATE_MATCHES');
  const firstAfter = await readFile(first.path);
  const secondAfter = await readFile(second.path);
  const firstData = parseFrontmatter(firstAfter.toString('utf8')).data;
  const secondData = parseFrontmatter(secondAfter.toString('utf8')).data;
  expect(firstData).toMatchObject({ schema: 'VPInstruction/v1.2', classification_status: 'classified', instruction_form: 'procedure', domains: ['engineering', 'design-ux'], revision: 2, status: 'active' });
  expect(firstData).not.toHaveProperty('classification_reason');
  expect(secondData).toMatchObject({ schema: 'VPInstruction/v1.2', classification_status: 'unclassified', classification_reason: 'Evidence is not sufficient yet.', revision: 2, status: 'disabled' });
  expect(secondData).not.toHaveProperty('instruction_form');
  expect(secondData).not.toHaveProperty('domains');
  expect(nonFacetMetadata(firstData)).toEqual(nonFacetMetadata(parseFrontmatter(firstBefore.toString('utf8')).data));
  expect(nonFacetMetadata(secondData)).toEqual(nonFacetMetadata(parseFrontmatter(secondBefore.toString('utf8')).data));
  expect(suffixAfterFrontmatter(firstAfter)).toEqual(suffixAfterFrontmatter(firstBefore));
  expect(suffixAfterFrontmatter(secondAfter)).toEqual(suffixAfterFrontmatter(secondBefore));
  const catalogAfter = JSON.parse(await readFile(join(f.root, 'catalog.json'), 'utf8'));
  expect(catalogAfter.revision).toBe(catalogBefore.revision + 2);
  expect(catalogAfter.instructions.find((item: { instruction_id: string }) => item.instruction_id === first.entry.instruction_id)).toMatchObject({ path: first.entry.path, sha256: digest(firstAfter) });
  expect(catalogAfter.instructions.find((item: { instruction_id: string }) => item.instruction_id === second.entry.instruction_id)).toMatchObject({ path: second.entry.path, sha256: digest(secondAfter) });
  expect(await readFile(join(f.root, 'corpus-map.json'))).toEqual(mapBytesBefore);
  expect(await readFile(join(f.root, 'unrelated.txt'), 'utf8')).toBe('Keep unrelated bytes.');
});

test('v1.1 domain order is a set and an identical assignment remains a true no-op', async () => {
  const f = await fixture(1);
  const seeded = await seedFacetInstruction(f, 0);
  const options = await facetOptions(f);
  const classification = { classification_status: 'classified' as const, instruction_form: 'principle' as const, domains: ['engineering' as const, 'design-ux' as const] };
  const firstPlan = await prepareInstructionFacetBatch([{ instruction_id: seeded.entry.instruction_id, expected_sha256: digest(seeded.bytes), classification }], options);
  expect((await applyPreparedBatch(firstPlan, await approval(firstPlan, f.staging))).kind).toBe('applied');
  const pathBytes = await readFile(seeded.path);
  const catalogBytes = await readFile(join(f.root, 'catalog.json'));
  const mapBytes = await readFile(join(f.root, 'corpus-map.json'));
  const reversed = { ...classification, domains: ['design-ux' as const, 'engineering' as const] };
  const noOp = await prepareInstructionFacetBatch([{ instruction_id: seeded.entry.instruction_id, expected_sha256: digest(pathBytes), classification: reversed }], options);
  expect((await reconcilePreparedBatch(noOp)).state).toBe('NO_CHANGE');
  expect((await applyPreparedBatch(noOp, await approval(noOp, f.staging))).kind).toBe('no-change');
  expect(await readFile(seeded.path)).toEqual(pathBytes);
  expect(await readFile(join(f.root, 'catalog.json'))).toEqual(catalogBytes);
  expect(await readFile(join(f.root, 'corpus-map.json'))).toEqual(mapBytes);
});

test('legacy conversion refuses to erase an existing v1.1 classification', async () => {
  const f = await fixture(1);
  const seeded = await seedFacetInstruction(f, 0);
  const plan = await prepareInstructionFacetBatch([{ instruction_id: seeded.entry.instruction_id, expected_sha256: digest(seeded.bytes), classification: { classification_status: 'classified', instruction_form: 'decision-rule', domains: ['operations'] } }], await facetOptions(f));
  expect((await applyPreparedBatch(plan, await approval(plan, f.staging))).kind).toBe('applied');
  const beforeInstruction = await readFile(seeded.path);
  const beforeCatalog = await readFile(join(f.root, 'catalog.json'));
  const beforeMap = await readFile(join(f.root, 'corpus-map.json'));
  await expect(convertMany([join(f.evidence, 'facet-spec-0.json')], { root: f.root })).rejects.toThrow('prepareInstructionFacetBatch');
  await expect(prepareBatch(f.sources, f.options)).rejects.toThrow('prepareInstructionFacetBatch');
  expect(await readFile(seeded.path)).toEqual(beforeInstruction);
  expect(await readFile(join(f.root, 'catalog.json'))).toEqual(beforeCatalog);
  expect(await readFile(join(f.root, 'corpus-map.json'))).toEqual(beforeMap);
});

test('reclassification preserves BOM, CRLF, body bytes and non-facet fields while removing an old domain block', async () => {
  const f = await fixture(1);
  const seeded = await seedFacetInstruction(f, 0, { body: 'Original Unicode guidance: Україна 🌍.\n\nKeep this body.' });
  const original = Buffer.from('\uFEFF' + seeded.bytes.toString('utf8').replace(/\r?\n/g, '\r\n'));
  await writeFile(seeded.path, original);
  const catalog = JSON.parse(await readFile(join(f.root, 'catalog.json'), 'utf8'));
  catalog.instructions[0].sha256 = digest(original);
  await writeFile(join(f.root, 'catalog.json'), JSON.stringify(catalog));
  const mapBefore = await readFile(join(f.root, 'corpus-map.json'));
  const options = await facetOptions(f);
  const classified = await prepareInstructionFacetBatch([{
    instruction_id: seeded.entry.instruction_id, expected_sha256: digest(original),
    classification: { classification_status: 'classified', instruction_form: 'principle', domains: ['engineering', 'research'] },
  }], options);
  expect((await applyPreparedBatch(classified, await approval(classified, f.staging))).kind).toBe('applied');
  const classifiedBytes = await readFile(seeded.path);
  const decorated = classifiedBytes.toString('utf8').replace('domains:\r\n', 'domains:\r\n# domain annotation\r\n\r\n')
    .replace('revision: 2\r\n', '').replace('\r\n---\r\n', '\r\nrevision: 2\r\n---\r\n');
  expect(decorated).not.toBe(classifiedBytes.toString('utf8'));
  const decoratedBytes = Buffer.from(decorated);
  await writeFile(seeded.path, decoratedBytes);
  const updatedCatalog = JSON.parse(await readFile(join(f.root, 'catalog.json'), 'utf8'));
  updatedCatalog.instructions[0].sha256 = digest(decoratedBytes);
  await writeFile(join(f.root, 'catalog.json'), JSON.stringify(updatedCatalog));
  const second = await prepareInstructionFacetBatch([{
    instruction_id: seeded.entry.instruction_id, expected_sha256: digest(decoratedBytes),
    classification: { classification_status: 'unclassified', classification_reason: 'Further source review is needed.' },
  }], options);
  expect((await applyPreparedBatch(second, await approval(second, f.staging))).kind).toBe('applied');
  const after = await readFile(seeded.path);
  const parsed = parseFrontmatter(after.toString('utf8')).data;
  expect(parsed).toMatchObject({ schema: 'VPInstruction/v1.2', revision: 3, classification_status: 'unclassified' });
  expect(parsed).not.toHaveProperty('instruction_form');
  expect(parsed).not.toHaveProperty('domains');
  expect(after.subarray(0, 3)).toEqual(Buffer.from([0xef, 0xbb, 0xbf]));
  expect(after.toString('utf8')).toContain('# domain annotation\r\n');
  expect(suffixAfterFrontmatter(after)).toEqual(suffixAfterFrontmatter(original));
  expect(nonFacetMetadata(parsed)).toEqual(nonFacetMetadata(parseFrontmatter(original.toString('utf8')).data));
  expect(await readFile(join(f.root, 'corpus-map.json'))).toEqual(mapBefore);
});

test('metadata plans require the live WeakMap handle and a distinct Root-observed writer, then stay one-attempt', async () => {
  const f = await fixture(1);
  const seeded = await seedFacetInstruction(f, 0);
  const inputs = await facetOptions(f);
  const options = { root: inputs.root, stagingRoot: inputs.stagingRoot, classificationEvidence: inputs.classificationEvidence, policyConfig: inputs.policyConfig };
  const plan = await prepareInstructionFacetBatch([{ instruction_id: seeded.entry.instruction_id, expected_sha256: digest(seeded.bytes), classification: { classification_status: 'classified', instruction_form: 'checklist', domains: ['operations'] } }], options);
  const approved = await approval(plan, f.staging);
  const forged = { directory: plan.directory, manifest: plan.manifest };
  await expect(applyPreparedBatch(forged, approved)).rejects.toThrow('fresh live Root-owned plan');
  await expect(applyPreparedBatch(plan, { ...approved, observe: async () => ({ kind: 'observed' as const, writer: 'model:fixture-reviewer', reviewPointer: 'fixture:review' }) })).rejects.toThrow('independent review');
  expect((await reconcilePreparedBatch(plan)).state).toBe('NO_EFFECT_OBSERVED');
  expect((await applyPreparedBatch(plan, approved)).kind).toBe('applied');
  expect(Number.isFinite(Date.parse(JSON.parse(await readFile(join(f.root, 'catalog.json'), 'utf8')).updated_at))).toBe(true);
  await expect(applyPreparedBatch(plan, approved)).rejects.toThrow('retry is fenced');
});
test('invalid metadata assignments and ArtifactRefs fail before publication', async () => {
  const f = await fixture(1);
  const seeded = await seedFacetInstruction(f, 0);
  const options = await facetOptions(f);
  const valid = { instruction_id: seeded.entry.instruction_id, expected_sha256: digest(seeded.bytes), classification: { classification_status: 'classified' as const, instruction_form: 'principle' as const, domains: ['engineering' as const] } };
  const beforeFile = await readFile(seeded.path);
  const beforeCatalog = await readFile(join(f.root, 'catalog.json'));
  const beforeMap = await readFile(join(f.root, 'corpus-map.json'));
  const tooMany = Array.from({ length: 26 }, (_, index) => ({ ...valid, instruction_id: `fixture-method-${index}` }));
  const invalidAssignments: unknown[] = [
    [],
    tooMany,
    [valid, valid],
    [{ ...valid, instruction_id: 'unknown-fixture-id' }],
    [{ ...valid, expected_sha256: '0'.repeat(64) }],
    [{ ...valid, output_path: 'instructions/arbitrary.md' }],
    [{ ...valid, classification: { ...valid.classification, domains: ['engineering', 'engineering'] } }],
    [{ ...valid, classification: { ...valid.classification, extra: true } }],
    [{ ...valid, classification: { classification_status: 'unclassified', classification_reason: 'First line.\nSecond line.' } }],
  ];
  for (const assignments of invalidAssignments) await expect(prepareInstructionFacetBatch(assignments as never, options)).rejects.toThrow();
  await expect(Reflect.apply(prepareInstructionFacetBatch, undefined, [[valid], { ...options, classificationEvidence: { ...options.classificationEvidence, extra: true } }])).rejects.toThrow('strict ArtifactRef');
  await expect(prepareInstructionFacetBatch([valid], { ...options, policyConfig: { path: options.policyConfig.path, sha256: 'BAD' } })).rejects.toThrow('strict ArtifactRef');
  expect(await readFile(seeded.path)).toEqual(beforeFile);
  expect(await readFile(join(f.root, 'catalog.json'))).toEqual(beforeCatalog);
  expect(await readFile(join(f.root, 'corpus-map.json'))).toEqual(beforeMap);
});

test('metadata preparation requires existing schema-valid catalog and map and rejects duplicate catalog IDs or invalid v1.1 state', async () => {
  const noMap = await fixture(1);
  await expect(prepareInstructionFacetBatch([{ instruction_id: 'fixture-method-0', expected_sha256: '0'.repeat(64), classification: { classification_status: 'unclassified', classification_reason: 'Unknown.' } }], await facetOptions(noMap))).rejects.toThrow('existing corpus map');

  const noCatalog = await fixture(1);
  const noCatalogSeed = await seedFacetInstruction(noCatalog, 0);
  await rm(join(noCatalog.root, 'catalog.json'));
  await expect(prepareInstructionFacetBatch([{ instruction_id: noCatalogSeed.entry.instruction_id, expected_sha256: digest(noCatalogSeed.bytes), classification: { classification_status: 'unclassified', classification_reason: 'Unknown.' } }], await facetOptions(noCatalog))).rejects.toThrow('existing catalog manifest');

  const f = await fixture(1);
  const seeded = await seedFacetInstruction(f, 0);
  const options = await facetOptions(f);
  const originalCatalog = await readFile(join(f.root, 'catalog.json'));
  const duplicateCatalog = JSON.parse(originalCatalog.toString('utf8'));
  duplicateCatalog.instructions.push({ ...duplicateCatalog.instructions[0] });
  await writeFile(join(f.root, 'catalog.json'), JSON.stringify(duplicateCatalog));
  const duplicateBytes = await readFile(join(f.root, 'catalog.json'));
  await expect(prepareInstructionFacetBatch([{ instruction_id: seeded.entry.instruction_id, expected_sha256: digest(seeded.bytes), classification: { classification_status: 'unclassified', classification_reason: 'Review pending.' } }], options)).rejects.toThrow('duplicate instruction id');
  expect(await readFile(join(f.root, 'catalog.json'))).toEqual(duplicateBytes);

  const badCatalog = await fixture(1);
  const badCatalogSeed = await seedFacetInstruction(badCatalog, 0);
  const catalogPath = join(badCatalog.root, 'catalog.json');
  const wrongCatalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  delete wrongCatalog.catalog_id;
  await writeFile(catalogPath, JSON.stringify(wrongCatalog));
  const wrongCatalogBytes = await readFile(catalogPath);
  await expect(prepareInstructionFacetBatch([{ instruction_id: badCatalogSeed.entry.instruction_id, expected_sha256: digest(badCatalogSeed.bytes), classification: { classification_status: 'unclassified', classification_reason: 'Review pending.' } }], await facetOptions(badCatalog))).rejects.toThrow('catalog schema validation');
  expect(await readFile(catalogPath)).toEqual(wrongCatalogBytes);
  await writeFile(catalogPath, '{ malformed JSON');
  await expect(prepareInstructionFacetBatch([{ instruction_id: badCatalogSeed.entry.instruction_id, expected_sha256: digest(badCatalogSeed.bytes), classification: { classification_status: 'unclassified', classification_reason: 'Review pending.' } }], { ...options, root: badCatalog.root, stagingRoot: badCatalog.staging })).rejects.toThrow('catalog manifest is malformed');
  expect(await readFile(catalogPath, 'utf8')).toBe('{ malformed JSON');

  const badMap = await fixture(1);
  const badMapSeed = await seedFacetInstruction(badMap, 0);
  const mapPath = join(badMap.root, 'corpus-map.json');
  const wrongMap = JSON.parse(await readFile(mapPath, 'utf8'));
  wrongMap.schema = 'VPCorpusMap/v2';
  await writeFile(mapPath, JSON.stringify(wrongMap));
  const wrongMapBytes = await readFile(mapPath);
  await expect(prepareInstructionFacetBatch([{ instruction_id: badMapSeed.entry.instruction_id, expected_sha256: digest(badMapSeed.bytes), classification: { classification_status: 'unclassified', classification_reason: 'Review pending.' } }], await facetOptions(badMap))).rejects.toThrow('corpus map schema');
  expect(await readFile(mapPath)).toEqual(wrongMapBytes);

  const g = await fixture(1);
  const malformed = await seedFacetInstruction(g, 0);
  const invalidMarkdown = (await readFile(malformed.path, 'utf8')).replace('\n---\n', '\nschema: VPInstruction/v1.1\nclassification_status: classified\n---\n');
  await writeFile(malformed.path, invalidMarkdown);
  const invalidBytes = await readFile(malformed.path);
  const catalog = JSON.parse(await readFile(join(g.root, 'catalog.json'), 'utf8'));
  catalog.instructions[0].sha256 = digest(invalidBytes);
  await writeFile(join(g.root, 'catalog.json'), JSON.stringify(catalog));
  const catalogBytes = await readFile(join(g.root, 'catalog.json'));
  await expect(prepareInstructionFacetBatch([{ instruction_id: malformed.entry.instruction_id, expected_sha256: digest(invalidBytes), classification: { classification_status: 'unclassified', classification_reason: 'Review pending.' } }], await facetOptions(g))).rejects.toThrow();
  expect(await readFile(malformed.path)).toEqual(invalidBytes);
  expect(await readFile(join(g.root, 'catalog.json'))).toEqual(catalogBytes);
});

test.each(['instruction', 'catalog', 'map'] as const)('metadata preimage drift in %s is observed and fenced before writes', async target => {
  const f = await fixture(1);
  const seeded = await seedFacetInstruction(f, 0);
  const plan = await prepareInstructionFacetBatch([{ instruction_id: seeded.entry.instruction_id, expected_sha256: digest(seeded.bytes), classification: { classification_status: 'classified', instruction_form: 'decision-rule', domains: ['business'] } }], await facetOptions(f));
  const targetPath = target === 'instruction' ? seeded.path : join(f.root, target === 'catalog' ? 'catalog.json' : 'corpus-map.json');
  await writeFile(targetPath, 'external preimage drift');
  expect((await reconcilePreparedBatch(plan)).state).toBe('CONFLICT_OR_UNKNOWN');
  expect((await applyPreparedBatch(plan, await approval(plan, f.staging))).kind).toBe('no-write-conflict');
  expect(await readFile(targetPath, 'utf8')).toBe('external preimage drift');
});

test.each(['classificationEvidence', 'policyConfig'] as const)('stale %s binding prevents metadata publication', async input => {
  const f = await fixture(1);
  const seeded = await seedFacetInstruction(f, 0);
  const options = await facetOptions(f);
  const plan = await prepareInstructionFacetBatch([{ instruction_id: seeded.entry.instruction_id, expected_sha256: digest(seeded.bytes), classification: { classification_status: 'classified', instruction_form: 'procedure', domains: ['research'] } }], options);
  const inputPath = options[input].path;
  await writeFile(inputPath, 'changed bound input');
  expect((await applyPreparedBatch(plan, await approval(plan, f.staging))).kind).toBe('no-write-conflict');
  expect(await readFile(seeded.path)).toEqual(seeded.bytes);
});

test('stale v1.1 schema tool binding and changed current configuration fence metadata writes', async () => {
  const f = await fixture(1);
  const seeded = await seedFacetInstruction(f, 0);
  await mkdir(join(f.root, 'config'));
  const profilePath = join(f.root, 'config', 'methodology-profile.json');
  await writeFile(profilePath, 'bound profile');
  const options = await facetOptions(f);
  const plan = await prepareInstructionFacetBatch([{ instruction_id: seeded.entry.instruction_id, expected_sha256: digest(seeded.bytes), classification: { classification_status: 'classified', instruction_form: 'checklist', domains: ['operations'] } }], options);
  const schemaPath = fileURLToPath(new URL('../config/vpinstruction.v1.1.schema.json', import.meta.url));
  const realRead = files.readFile;
  const readSpy = spyOn(files, 'readFile').mockImplementation(new Proxy(realRead, { async apply(read, receiver: unknown, args: unknown[]) {
    const bytes = await Reflect.apply(read, receiver, args);
    return String(args[0]) === schemaPath ? Buffer.from('changed tool bytes') : bytes;
  } }));
  try {
    expect((await applyPreparedBatch(plan, await approval(plan, f.staging))).kind).toBe('no-write-conflict');
  } finally { readSpy.mockRestore(); }
  expect(await readFile(seeded.path)).toEqual(seeded.bytes);

  const second = await prepareInstructionFacetBatch([{ instruction_id: seeded.entry.instruction_id, expected_sha256: digest(seeded.bytes), classification: { classification_status: 'unclassified', classification_reason: 'Review pending.' } }], options);
  await writeFile(profilePath, 'changed bound profile');
  expect((await applyPreparedBatch(second, await approval(second, f.staging))).kind).toBe('no-write-conflict');
  expect(await readFile(seeded.path)).toEqual(seeded.bytes);
});

test('catalog traversal paths and junction targets are rejected without following them', async () => {
  const f = await fixture(1);
  const seeded = await seedFacetInstruction(f, 0);
  const options = await facetOptions(f);
  const catalogPath = join(f.root, 'catalog.json');
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  const outside = join(f.evidence, 'outside.md');
  await writeFile(outside, 'outside sentinel');
  catalog.instructions[0].path = '../outside.md';
  await writeFile(catalogPath, JSON.stringify(catalog));
  const traversalBytes = await readFile(catalogPath);
  await expect(prepareInstructionFacetBatch([{ instruction_id: seeded.entry.instruction_id, expected_sha256: digest(seeded.bytes), classification: { classification_status: 'unclassified', classification_reason: 'Review pending.' } }], options)).rejects.toThrow('not canonical');
  expect(await readFile(outside, 'utf8')).toBe('outside sentinel');
  expect(await readFile(catalogPath)).toEqual(traversalBytes);

  const g = await fixture(1);
  const junctionSeed = await seedFacetInstruction(g, 0);
  const junctionOptions = await facetOptions(g);
  const junctionRoot = join(g.evidence, 'junction-target');
  await mkdir(junctionRoot);
  await writeFile(join(junctionRoot, 'fixture-method-0.md'), junctionSeed.bytes);
  const junctionPath = join(g.root, 'instructions', 'hostile');
  await files.symlink(junctionRoot, junctionPath, process.platform === 'win32' ? 'junction' : 'dir');
  const linkedCatalog = JSON.parse(await readFile(join(g.root, 'catalog.json'), 'utf8'));
  linkedCatalog.instructions[0].path = 'instructions/hostile/fixture-method-0.md';
  await writeFile(join(g.root, 'catalog.json'), JSON.stringify(linkedCatalog));
  const linkedCatalogBytes = await readFile(join(g.root, 'catalog.json'));
  await expect(prepareInstructionFacetBatch([{ instruction_id: junctionSeed.entry.instruction_id, expected_sha256: digest(junctionSeed.bytes), classification: { classification_status: 'unclassified', classification_reason: 'Review pending.' } }], junctionOptions)).rejects.toThrow('symlink traversal');
  expect(await readFile(join(g.root, 'catalog.json'))).toEqual(linkedCatalogBytes);
  expect(await readFile(junctionSeed.path)).toEqual(junctionSeed.bytes);
});

test.each([1, 2, 3])('metadata interruption after target %i remains fenced with terminal readback', async stoppedAfter => {
  const f = await fixture(2);
  const first = await seedFacetInstruction(f, 0);
  const second = await seedFacetInstruction(f, 1);
  const plan = await prepareInstructionFacetBatch([
    { instruction_id: first.entry.instruction_id, expected_sha256: digest(first.bytes), classification: { classification_status: 'classified', instruction_form: 'principle', domains: ['engineering'] } },
    { instruction_id: second.entry.instruction_id, expected_sha256: digest(second.bytes), classification: { classification_status: 'classified', instruction_form: 'procedure', domains: ['product'] } },
  ], await facetOptions(f));
  const approved = await approval(plan, f.staging);
  const realWrite = files.writeFile;
  let targetWrites = 0;
  const writeSpy = spyOn(files, 'writeFile').mockImplementation(async (...args: Parameters<typeof files.writeFile>) => {
    await realWrite(...args);
    const path = String(args[0]);
    if (path === join(f.root, 'catalog.json') || path === join(f.root, 'corpus-map.json') || path.startsWith(join(f.root, 'instructions') + '\\') || path.startsWith(join(f.root, 'instructions') + '/')) {
      targetWrites += 1;
      if (targetWrites === stoppedAfter) throw new Error('Injected failure after a completed metadata write.');
    }
  });
  try {
    expect((await applyPreparedBatch(plan, approved)).kind).toBe('partial-or-unknown');
    expect(targetWrites).toBe(stoppedAfter);
  } finally { writeSpy.mockRestore(); }
  expect((await reconcilePreparedBatch(plan)).state).toBe(stoppedAfter === 3 ? 'TARGET_STATE_MATCHES' : 'KNOWN_PARTIAL');
  await expect(applyPreparedBatch(plan, approved)).rejects.toThrow('fenced');
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
