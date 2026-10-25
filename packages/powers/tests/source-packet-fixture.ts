import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { capturePacket, sourceInputDigest, sealArtifact, verifyPreparedPacket, evaluateAdmission, reconcileAdmissionAtRoot, type ArtifactRef, type EligibleSource, type PacketContext } from '../scripts/source-packets.ts';
import type { InstructionSpec } from '../scripts/convert.ts';

export function fixtureSpec(index: number): InstructionSpec {
  return { instruction_id: `fixture-method-${index}`, title: `Fixture method ${index}`, summary: 'Synthetic qualification fixture.', capability_tags: ['release-note'], pattern_tags: ['delivery-review'], roles: ['integrator'], products: ['vida-powers'], conditions_applies_when: 'Qualifying the converter.', conditions_does_not_apply_when: 'Admitting donor content.', artifact_contract_output_type: 'markdown', artifact_contract_required_data: ['receipt'], artifact_contract_verified_by: 'Fixture assertions', compatibility_excludes: [], compatibility_requires: [], status: 'active', revision: 1, provenance: [{ donor: 'fixture-donor', revision: 'a'.repeat(40), path: `source-${index}.md`, license: 'MIT' }], body: 'Keep.\n' };
}
export const fixtureCatalog = { schema: 'VPCatalog/v1', catalog_id: 'vida-powers', revision: 1, source_revision: 'seed-v1', updated_at: '2026-01-01T00:00:00Z', tag_dictionary: { capability: { 'release-note': 'Release note' }, pattern: { 'delivery-review': 'Delivery review' } }, tag_aliases: {}, tag_exemptions: [], instructions: [] };

export async function fixtureEligibility(root: string, spec: InstructionSpec, index: number, options: { carrierPath?: string; sharedSpec?: ArtifactRef } = {}): Promise<EligibleSource> {
  const prefix = `p${index}`;
  const path = options.carrierPath ?? spec.provenance[0]?.path;
  if (!path) throw new Error('Fixture needs provenance');
  await writeFile(join(root, path), 'Keep.\n');
  const source = { donor: 'fixture-donor', pinnedRevision: 'a'.repeat(40), canonicalCarrierPath: path, rawSha256: createHash('sha256').update('Keep.\n').digest('hex'), rawBytes: 6 };
  const captured = await capturePacket(source, root);
  const capture = await sealArtifact(root, `${prefix}/capture.json`, captured);
  const decisions = await sealArtifact(root, `${prefix}/decisions.json`, { schema: 'scratch-markdown-decisions/v1', sourceSha256: source.rawSha256, admission: false, canonicalIds: null, rightsLineage: 'HOLD', units: [{ id: 'u1', tier: 'H1', meaning: 'Keep.', conditions: [], alternatives: [], note: 'Fixture, not human authority.' }], spans: [{ line: 1, start: 0, end: 5, role: 'held', unitIds: ['u1'], reason: 'Fixture.' }] });
  const scope = await sealArtifact(root, `${prefix}/scope.json`, { synthetic: true });
  const checker = await sealArtifact(root, `${prefix}/checker.json`, { synthetic: true });
  const configuration = await sealArtifact(root, `${prefix}/configuration.json`, { synthetic: true });
  const selection = await sealArtifact(root, `${prefix}/selection.json`, { schema: 'VPSourceSelection/v1', source, scope, domain: 'product', disposition: 'selected', rationale: 'Inert qualification fixture.', previousDisposition: 'unprepared', previousReason: 'Fixture.', exclusion: 'none', unitIds: ['u1'] });
  const stdout = await sealArtifact(root, `${prefix}/stdout.json`, { status: 'PASS_MECHANICAL_ONLY', sourceSha256: source.rawSha256 });
  await writeFile(join(root, prefix, 'stderr'), '');
  const stderr = { path: `${prefix}/stderr`, sha256: createHash('sha256').update('').digest('hex') };
  const receipt = await sealArtifact(root, `${prefix}/check.json`, { schema: 'VPSourceCheck/v1', captureSha256: capture.sha256, decisionsSha256: decisions.sha256, checker, runtimeSha256: captured.runtime.sha256, configuration, command: [process.execPath, checker.path, capture.path, decisions.path], exitCode: 0, stdout, stderr });
  const review = await sealArtifact(root, `${prefix}/review.json`, { schema: 'VPSourceReview/v1', source, inputSha256: sourceInputDigest(captured), decisionsSha256: decisions.sha256, scopeSha256: scope.sha256, scope: 'full', unitIds: ['u1'], verdict: 'READY', actor: 'model:fixture-reviewer', pointer: 'fixture:review' });
  const specRef = options.sharedSpec ?? await sealArtifact(root, `${prefix}/spec.json`, spec);
  const packet = await sealArtifact(root, `${prefix}/packet.json`, { schema: 'VPSourcePacket/v1', capture, decisions, selection, check: receipt, reviews: [review], specs: [{ artifact: specRef, unitIds: ['u1'] }] });
  const context: PacketContext = { evidenceRoot: root, sourceRoot: root, allowedSources: [source], scope, checker, configuration };
  const gate = async (kind: 'fidelity' | 'rights' | 'admission', verdict: string) => sealArtifact(root, `${prefix}/${kind}.json`, { schema: 'VPHumanSourceGate/v1', kind, verdict, source, inputSha256: sourceInputDigest(captured), decisionsSha256: decisions.sha256, scopeSha256: scope.sha256, unitIds: ['u1'], specs: [specRef], actor: 'human:fixture-owner', pointer: `fixture:${kind}` });
  const gates = { fidelity: await gate('fidelity', 'human-approved'), rights: await gate('rights', 'cleared'), admission: await gate('admission', 'owner-admitted') };
  const assessment = await evaluateAdmission(await verifyPreparedPacket(packet, context), gates);
  const eligibility = await reconcileAdmissionAtRoot(assessment, async request => ({ kind: 'observed', actor: request.actor, pointer: request.pointer }));
  if (eligibility.kind !== 'eligible') throw new Error(eligibility.reasons.join('; '));
  return eligibility.source;
}
