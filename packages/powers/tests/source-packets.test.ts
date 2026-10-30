import { afterEach, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, symlink, truncate, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { capturePacket, checkDecomposition, locateSpan, sourceInputDigest, verifyArtifact, sealArtifact, verifyPreparedPacket, evaluateAdmission, reconcileAdmissionAtRoot, readEligibleSource, type PacketContext } from '../scripts/source-packets.ts';

const roots: string[] = [];
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });
async function fixture(bytes: Uint8Array = Buffer.from('\uFEFFa😀e\u0301\r\nb\rc\n')) {
  const root = await mkdtemp(join(tmpdir(), 'vp-packet-')); roots.push(root);
  await writeFile(join(root, 'source.md'), bytes);
  const source = { donor: 'fixture', pinnedRevision: 'a'.repeat(40), canonicalCarrierPath: 'source.md', rawSha256: hash(bytes), rawBytes: bytes.length };
  return { root, source, capture: await capturePacket(source, root) };
}
test('capture retains BOM, every newline and scalar/byte coordinates', async () => {
  const { capture } = await fixture();
  expect(capture.input.schema).toBe('scratch-markdown-input/v1');
  expect(capture.input.source.lines.map(line => [line.text, line.length])).toEqual([['\uFEFFa😀e\u0301', 5], ['b', 1], ['c', 1], ['', 0]]);
  expect(locateSpan(capture, 1, 2, 3)).toEqual({ text: '😀', byteStart: 4, byteEnd: 8 });
  expect(locateSpan(capture, 2, 0, 1)).toEqual({ text: 'b', byteStart: 13, byteEnd: 14 });
  expect(() => locateSpan(capture, 1, 0, 6)).toThrow();
  expect(() => locateSpan(capture, 0, 0, 1)).toThrow();
});
test('rejects malformed UTF-8, stale identity and traversal before capture', async () => {
  await expect(fixture(Uint8Array.from([0xc0, 0xaf]))).rejects.toThrow();
  const { root, source } = await fixture();
  await expect(capturePacket({ ...source, rawSha256: '0'.repeat(64) }, root)).rejects.toThrow();
  await expect(capturePacket({ ...source, canonicalCarrierPath: '../source.md' }, root)).rejects.toThrow();
});
test('decision validation preserves held roles and rejects gaps, invalid links and scalar bounds', async () => {
  const { capture } = await fixture(Buffer.from('Keep 😀.\n'));
  const decisions = { schema: 'scratch-markdown-decisions/v1', sourceSha256: capture.source.rawSha256, admission: false, canonicalIds: null, rightsLineage: 'HOLD', units: [{ id: 'u1', tier: 'H1', meaning: 'Keep 😀.', conditions: [], alternatives: [], note: 'Literal fixture.' }], spans: [{ line: 1, start: 0, end: 7, role: 'held', unitIds: ['u1'], reason: 'Unadmitted fixture.' }] };
  expect(checkDecomposition(capture, decisions)).toMatchObject({ status: 'PASS_MECHANICAL_ONLY', units: 1, spans: 1, admission: false });
  expect(() => checkDecomposition(capture, { ...decisions, spans: [] })).toThrow();
  expect(() => checkDecomposition(capture, { ...decisions, spans: [{ ...decisions.spans[0], end: 8 }] })).toThrow();
  expect(() => checkDecomposition(capture, { ...decisions, admission: true })).toThrow();
  expect(() => checkDecomposition(capture, { ...decisions, spans: [{ ...decisions.spans[0], unitIds: ['absent'] }] })).toThrow();
});
test('artifacts are sealed once and stale bytes fail verification', async () => {
  const { root } = await fixture();
  const ref = await sealArtifact(root, 'evidence.json', { held: true });
  expect(JSON.parse((await verifyArtifact(root, ref)).toString('utf8'))).toEqual({ held: true });
  await expect(sealArtifact(root, 'evidence.json', { held: false })).rejects.toThrow();
  await writeFile(join(root, 'evidence.json'), '{}');
  await expect(verifyArtifact(root, ref)).rejects.toThrow();
  await expect(verifyArtifact(root, { ...ref, path: '../evidence.json' })).rejects.toThrow();
  expect((await readFile(join(root, 'evidence.json'), 'utf8'))).toBe('{}');
});

async function preparedFixture() {
  const { root, source, capture } = await fixture(Buffer.from('Keep.\n'));
  const captured = await sealArtifact(root, 'capture.json', capture);
  const decisions = await sealArtifact(root, 'decisions.json', { schema: 'scratch-markdown-decisions/v1', sourceSha256: source.rawSha256, admission: false, canonicalIds: null, rightsLineage: 'HOLD', units: [{ id: 'u1', tier: 'H1', meaning: 'Keep.', conditions: [], alternatives: [], note: 'Fixture.' }], spans: [{ line: 1, start: 0, end: 5, role: 'held', unitIds: ['u1'], reason: 'Fixture.' }] });
  const scope = await sealArtifact(root, 'scope.json', { fixture: true });
  const checker = await sealArtifact(root, 'checker.json', { fixture: 'not native execution proof' });
  const configuration = await sealArtifact(root, 'configuration.json', { fixture: true });
  const selection = await sealArtifact(root, 'selection.json', { schema: 'VPSourceSelection/v1', source, scope, domain: 'product', disposition: 'selected', rationale: 'Synthetic selection fixture.', previousDisposition: 'excluded', previousReason: 'Old domain boundary.', exclusion: 'none', unitIds: ['u1'] });
  const stdout = await sealArtifact(root, 'stdout.json', { status: 'PASS_MECHANICAL_ONLY', sourceSha256: source.rawSha256 });
  await writeFile(join(root, 'stderr.txt'), '');
  const stderr = { path: 'stderr.txt', sha256: hash(Buffer.from('')) };
  const receipt = await sealArtifact(root, 'check.json', { schema: 'VPSourceCheck/v1', captureSha256: captured.sha256, decisionsSha256: decisions.sha256, checker, runtimeSha256: capture.runtime.sha256, configuration, command: [process.execPath, checker.path, captured.path, decisions.path], exitCode: 0, stdout, stderr });
  const review = await sealArtifact(root, 'review.json', { schema: 'VPSourceReview/v1', source, inputSha256: sourceInputDigest(capture), decisionsSha256: decisions.sha256, scopeSha256: scope.sha256, scope: 'full', unitIds: ['u1'], verdict: 'READY', actor: 'model:fixture-reviewer', pointer: 'fixture:independent-review' });
  const spec = await sealArtifact(root, 'spec.json', { fixture: 'proposal, not an admitted instruction' });
  const packet = { schema: 'VPSourcePacket/v1', capture: captured, decisions, selection, check: receipt, reviews: [review], specs: [{ artifact: spec, unitIds: ['u1'] }] };
  const packetRef = await sealArtifact(root, 'packet.json', packet);
  const context: PacketContext = { evidenceRoot: root, sourceRoot: root, allowedSources: [source], scope, checker, configuration };
  const gates = {} as Record<'fidelity' | 'rights' | 'admission', { path: string; sha256: string }>;
  for (const kind of ['fidelity', 'rights', 'admission'] as const) {
    gates[kind] = await sealArtifact(root, `${kind}.json`, { schema: 'VPHumanSourceGate/v1', kind, verdict: kind === 'rights' ? 'cleared' : kind === 'fidelity' ? 'human-approved' : 'owner-admitted', source, inputSha256: sourceInputDigest(capture), decisionsSha256: decisions.sha256, scopeSha256: scope.sha256, unitIds: ['u1'], specs: [spec], actor: 'human:fixture-owner', pointer: `fixture:${kind}` });
  }
  return { root, source, packet, packetRef, context, gates, spec };
}
test('hash-bound gate files alone cannot grant authority; Root must observe every exact decision', async () => {
  const f = await preparedFixture();
  const candidate = await verifyPreparedPacket(f.packetRef, f.context);
  const assessment = await evaluateAdmission(candidate, f.gates);
  const denied = await reconcileAdmissionAtRoot(assessment, async () => ({ kind: 'unconfirmed' }));
  expect(denied.kind).toBe('blocked');
  const seen: string[] = [];
  const allowed = await reconcileAdmissionAtRoot(assessment, async request => { seen.push(request.kind); return { kind: 'observed', actor: request.actor, pointer: request.pointer }; });
  expect(seen).toEqual(['fidelity', 'rights', 'admission']);
  expect(allowed.kind).toBe('eligible');
  if (allowed.kind !== 'eligible') throw new Error('Fixture admission failed');
  expect((await readEligibleSource(allowed.source)).source).toEqual(f.source);
  await expect(readEligibleSource(JSON.parse(JSON.stringify(allowed.source)))).rejects.toThrow();
  await writeFile(join(f.root, 'spec.json'), '{}');
  await expect(readEligibleSource(allowed.source)).rejects.toThrow();
});
test('stale tool, omitted review scope and unknown allowlist block preparation', async () => {
  const f = await preparedFixture();
  await expect(verifyPreparedPacket(f.packetRef, { ...f.context, allowedSources: [] })).rejects.toThrow();
  const omitted = await sealArtifact(f.root, 'omitted-review.json', { ...f.packet, reviews: [] });
  await expect(verifyPreparedPacket(omitted, f.context)).rejects.toThrow();
  await writeFile(join(f.root, f.context.checker.path), '{}');
  await expect(verifyPreparedPacket(f.packetRef, f.context)).rejects.toThrow();
});
test('journey exclusions and unconfirmed human gates remain blocked', async () => {
  const f = await preparedFixture();
  const selection = JSON.parse((await verifyArtifact(f.root, f.packet.selection)).toString('utf8'));
  const excluded = await sealArtifact(f.root, 'journey-selection.json', { ...selection, exclusion: 'journey', disposition: 'excluded' });
  const packet = await sealArtifact(f.root, 'journey-packet.json', { ...f.packet, selection: excluded });
  const candidate = await verifyPreparedPacket(packet, f.context);
  expect((await evaluateAdmission(candidate, f.gates)).kind).toBe('assessment-blocked');
  const changedScope = await sealArtifact(f.root, 'changed-scope.json', { changed: true });
  await expect(verifyPreparedPacket(f.packetRef, { ...f.context, scope: changedScope })).rejects.toThrow();
});
test('source and evidence reads reject junction traversal and excessive size', async () => {
  const f = await fixture();
  const outside = await fixture();
  await symlink(outside.root, join(f.root, 'linked'), 'junction');
  await expect(capturePacket({ ...outside.source, canonicalCarrierPath: 'linked/source.md' }, f.root)).rejects.toThrow('symlink');
  await writeFile(join(f.root, 'large'), '');
  await truncate(join(f.root, 'large'), 32 * 1024 * 1024 + 1);
  await expect(verifyArtifact(f.root, { path: 'large', sha256: '0'.repeat(64) })).rejects.toThrow('size');
});
test('semantic input identity ignores execution metadata and changes with literal input', async () => {
  const f = await fixture(Buffer.from('Keep.\n'));
  const changedExecution = { ...f.capture, producer: { ...f.capture.producer, sha256: '0'.repeat(64) }, runtime: { ...f.capture.runtime, sha256: '1'.repeat(64) } };
  expect(sourceInputDigest(changedExecution)).toBe(sourceInputDigest(f.capture));
  const edited = await fixture(Buffer.from('Keep!\n'));
  expect(sourceInputDigest(edited.capture)).not.toBe(sourceInputDigest(f.capture));
});
