import { afterEach, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createAlgorithmDecisionOffer,
  createOfferRecord,
  createStandingPreference,
  evaluateAlgorithmDispatch,
  evaluateHumanLoopDecision,
  initialDecisionTypeRegistry,
  parseAlgorithmDecision,
  parseOfferRecord,
  parseStandingPreference,
  readAlgorithmDecision,
  readOfferRecord,
  readStandingPreference,
  revokeStandingPreference,
  sealAlgorithmDecision,
  sealAlgorithmDecisionOffer,
  sealOfferRecord,
  sealStandingPreference,
  validateDecisionTypeRegistry,
  verifyAlgorithmDecision,
  type AlgorithmDecisionOffer,
  type AlgorithmDecisionRecord,
  type AlgorithmIdentity,
  type DecisionTypeEntry,
  type OfferRecord,
  type PreferenceBinding,
  type StandingPreference,
} from '../scripts/algorithm-delegation.ts';
import { sealArtifact, type ArtifactRef } from '../scripts/source-packets.ts';

const roots: string[] = [];
async function tempRoot(prefix: string) { const root = await mkdtemp(join(tmpdir(), prefix)); roots.push(root); return root; }
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });

const algorithm: AlgorithmIdentity = { version: 'd18-panel/v1', promptIdentity: 'prompts:h1-panel', evidencePolicy: 'd18-evidence/v1' };
const decisionType = 'H1-source-admission';
const scope = 'wondelai@' + 'a'.repeat(40) + ':h1-pilot-25:25';
const d18Protocols = ['V3-delphi', 'V2-adversarial', 'V4-party-chat'] as const;
type ProtocolId = (typeof d18Protocols)[number];

function registryEntry(overrides: Partial<DecisionTypeEntry> = {}): DecisionTypeEntry {
  return {
    decisionType: 'custom-type',
    description: 'Custom decision type.',
    scope: 'per item',
    evidenceRequired: 'evidence',
    algorithmAllowed: true,
    exclusionReason: null,
    automaticRequiresPreference: true,
    reviewCadence: 'none',
    ...overrides,
  };
}

function preferenceRecord(overrides: Partial<StandingPreference> = {}): StandingPreference {
  return {
    schema: 'VPStandingPreference/v1',
    decisionType,
    scope,
    algorithmVersion: algorithm.version,
    promptIdentity: algorithm.promptIdentity,
    evidencePolicy: algorithm.evidencePolicy,
    grantedBy: 'human:owner',
    grantedAt: '2026-11-03T00:00:00Z',
    reviewCadence: 'none',
    revocation: { state: 'active', nextEffectiveDecision: null, pointer: 'prefs/h1.json' },
    ...overrides,
  };
}

async function preferenceRef(root: string, record: StandingPreference, name = 'pref.json'): Promise<ArtifactRef> {
  return sealStandingPreference(root, name, record);
}

function request(root: string, overrides: { registry?: readonly DecisionTypeEntry[]; decisionType?: string; scope?: string; algorithm?: AlgorithmIdentity; preferenceRefs?: readonly ArtifactRef[] } = {}) {
  return {
    root,
    registry: initialDecisionTypeRegistry as readonly DecisionTypeEntry[],
    decisionType,
    scope,
    algorithm,
    preferenceRefs: [] as readonly ArtifactRef[],
    ...overrides,
  };
}

test('initial registry declares the H1 type and the D19 exclusions', () => {
  const allowed = initialDecisionTypeRegistry.filter(entry => entry.algorithmAllowed);
  expect(allowed.map(entry => entry.decisionType)).toEqual(['H1-source-admission']);
  expect(allowed[0]?.automaticRequiresPreference).toBe(true);
  const excluded = initialDecisionTypeRegistry.filter(entry => !entry.algorithmAllowed);
  expect(excluded.map(entry => entry.decisionType)).toEqual([
    'legal-rights-clearance',
    'br09-authorization',
    'security-access-control',
    'destructive-operations',
    'runtime-user-acceptance',
  ]);
  for (const entry of excluded) expect(entry.exclusionReason).not.toBeNull();
});

test('registry validation rejects malformed, duplicate and inconsistent entries', () => {
  expect(validateDecisionTypeRegistry([registryEntry()])).toHaveLength(1);
  expect(() => validateDecisionTypeRegistry([])).toThrow('ALGORITHM_DELEGATION_INVALID');
  expect(() => validateDecisionTypeRegistry([{ ...registryEntry(), automaticRequiresPreference: false }])).toThrow();
  expect(() => validateDecisionTypeRegistry([{ ...registryEntry(), reviewCadence: 'weekly' }])).toThrow();
  expect(() => validateDecisionTypeRegistry([registryEntry(), registryEntry()])).toThrow('duplicate decision type');
  expect(() => validateDecisionTypeRegistry([{ ...registryEntry(), algorithmAllowed: false, exclusionReason: 'reserved' }])).not.toThrow();
  expect(() => validateDecisionTypeRegistry([{ ...registryEntry(), exclusionReason: 'reserved' }])).toThrow('allowed decision type carries exclusion');
  expect(() => validateDecisionTypeRegistry([{ ...registryEntry(), algorithmAllowed: false }])).toThrow('excluded decision type lacks reason');
});

test('excluded decisions never reach the preference lookup', async () => {
  const root = await tempRoot('vp-delegation-');
  const pref = await preferenceRef(root, preferenceRecord({ decisionType: 'legal-rights-clearance' }));
  for (const type of ['legal-rights-clearance', 'br09-authorization', 'security-access-control', 'destructive-operations', 'runtime-user-acceptance']) {
    const result = await evaluateHumanLoopDecision(request(root, { decisionType: type, scope: 'any', preferenceRefs: [pref] }));
    expect(result.kind).toBe('excluded');
    if (result.kind === 'excluded') expect(result.reason.length).toBeGreaterThan(0);
  }
  const undeclared = await evaluateHumanLoopDecision(request(root, { decisionType: 'not-declared', preferenceRefs: [pref] }));
  expect(undeclared).toMatchObject({ kind: 'excluded', reason: 'undeclared decision type: not-declared' });
  const broken = [{ ...registryEntry({ decisionType: 'custom-type', algorithmAllowed: false }), exclusionReason: null }] as unknown as DecisionTypeEntry[];
  await expect(evaluateHumanLoopDecision(request(root, { registry: broken, decisionType: 'custom-type' }))).rejects.toThrow('ALGORITHM_DELEGATION_INVALID');
});

test('a supplied registry cannot un-exclude a canonical exclusion', async () => {
  const root = await tempRoot('vp-delegation-');
  const forged = initialDecisionTypeRegistry.map(entry =>
    entry.decisionType === 'legal-rights-clearance' ? { ...entry, algorithmAllowed: true, exclusionReason: null } : entry);
  const pref = await preferenceRef(root, preferenceRecord({ decisionType: 'legal-rights-clearance' }));
  const result = await evaluateHumanLoopDecision(request(root, { registry: forged, decisionType: 'legal-rights-clearance', preferenceRefs: [pref] }));
  expect(result.kind).toBe('excluded');
  if (result.kind === 'excluded') {
    expect(result.reason).toBe('D17 reserves legal-risk, rights and clearance decisions to the human owner.');
  }
});

test('a supplied registry cannot approve a new decision type for algorithm delegation', async () => {
  const root = await tempRoot('vp-delegation-');
  const type = 'custom-unapproved-type';
  const customScope = 'custom-scope';
  const registry = [...initialDecisionTypeRegistry, registryEntry({ decisionType: type, scope: customScope })];
  const pref = await preferenceRef(root, preferenceRecord({ decisionType: type, scope: customScope }));
  const result = await evaluateHumanLoopDecision(request(root, { registry, decisionType: type, scope: customScope, preferenceRefs: [pref] }));
  expect(result).toMatchObject({ kind: 'excluded', decisionType: type, scope: customScope, reason: `decision type is not approved for algorithm delegation: ${type}` });
});

test('forged or tampered preference artifacts are rejected', async () => {
  const root = await tempRoot('vp-delegation-');
  const ref = await preferenceRef(root, preferenceRecord());
  await writeFile(join(root, 'pref.json'), JSON.stringify(preferenceRecord({ grantedBy: 'human:other' })));
  await expect(evaluateHumanLoopDecision(request(root, { preferenceRefs: [ref] }))).rejects.toThrow();
  const wrongSha: ArtifactRef = { path: 'pref.json', sha256: '0'.repeat(64) };
  await expect(evaluateHumanLoopDecision(request(root, { preferenceRefs: [wrongSha] }))).rejects.toThrow();
});

test('no matching preference produces an offer, not an automatic run', async () => {
  const root = await tempRoot('vp-delegation-');
  const other = await preferenceRef(root, preferenceRecord({ decisionType: 'other-type' }));
  const otherScope = await preferenceRef(root, preferenceRecord({ scope: 'other-scope' }), 'pref2.json');
  const revoked = await preferenceRef(root, revokeStandingPreference(preferenceRecord(), { effectiveFromDecision: 'next', pointer: 'prefs/revoked.json' }), 'pref3.json');
  for (const preferenceRefs of [[], [other], [otherScope], [revoked]]) {
    const result = await evaluateHumanLoopDecision(request(root, { preferenceRefs }));
    expect(result).toMatchObject({ kind: 'offer', matchReason: 'no-standing-preference' });
    if (result.kind === 'offer') expect(result.matches).toHaveLength(0);
  }
});

test('exactly one valid preference with matching identity runs automatically', async () => {
  const root = await tempRoot('vp-delegation-');
  const pref = await preferenceRef(root, preferenceRecord());
  const revokedTwin = await preferenceRef(root, revokeStandingPreference(preferenceRecord(), { effectiveFromDecision: 'next', pointer: 'prefs/revoked.json' }), 'pref2.json');
  const result = await evaluateHumanLoopDecision(request(root, { preferenceRefs: [pref, revokedTwin] }));
  expect(result.kind).toBe('automatic');
  if (result.kind === 'automatic') expect(result.preference.ref).toEqual(pref);
});

test('multiple active matches are ambiguous and stale identity offers again', async () => {
  const root = await tempRoot('vp-delegation-');
  const first = await preferenceRef(root, preferenceRecord());
  const second = await preferenceRef(root, preferenceRecord({ grantedAt: '2026-11-04T00:00:00Z' }), 'pref2.json');
  const ambiguous = await evaluateHumanLoopDecision(request(root, { preferenceRefs: [first, second] }));
  expect(ambiguous).toMatchObject({ kind: 'offer', matchReason: 'ambiguous-preferences' });
  if (ambiguous.kind === 'offer') expect(ambiguous.matches).toHaveLength(2);
  for (const [index, stale] of [
    preferenceRecord({ algorithmVersion: 'd18-panel/v0' }),
    preferenceRecord({ promptIdentity: 'prompts:old' }),
    preferenceRecord({ evidencePolicy: 'd18-evidence/v0' }),
  ].entries()) {
    const ref = await preferenceRef(root, stale, `stale-${index}.json`);
    const result = await evaluateHumanLoopDecision(request(root, { preferenceRefs: [ref] }));
    expect(result).toMatchObject({ kind: 'offer', matchReason: 'stale-preference' });
    if (result.kind === 'offer') expect(result.matches).toHaveLength(1);
  }
});

test('standing preference records round-trip through sealed artifacts', async () => {
  const root = await tempRoot('vp-delegation-');
  const record = createStandingPreference({
    decisionType,
    scope,
    algorithm,
    grantedBy: 'human:owner',
    grantedAt: '2026-11-03T00:00:00Z',
    reviewCadence: 'periodic-human-check',
    pointer: 'prefs/h1.json',
  });
  expect(record.revocation).toEqual({ state: 'active', nextEffectiveDecision: null, pointer: 'prefs/h1.json' });
  const ref = await sealStandingPreference(root, 'prefs/h1.json', record);
  expect(await readStandingPreference(root, ref)).toEqual(record);
  await expect(sealStandingPreference(root, 'prefs/h1.json', record)).rejects.toThrow();
  await expect(readStandingPreference(root, { path: 'prefs/missing.json', sha256: '0'.repeat(64) })).rejects.toThrow();
  const badBytes = Buffer.from(JSON.stringify({ schema: 'VPStandingPreference/v1' }));
  await writeFile(join(root, 'prefs-bad.json'), badBytes);
  const badRef: ArtifactRef = { path: 'prefs-bad.json', sha256: createHash('sha256').update(badBytes).digest('hex') };
  await expect(readStandingPreference(root, badRef)).rejects.toThrow('ALGORITHM_DELEGATION_INVALID');
});

test('preference parsing enforces revocation consistency and human grantor', () => {
  expect(() => parseStandingPreference(preferenceRecord({ grantedBy: 'model:agent' }))).toThrow();
  expect(() => parseStandingPreference(preferenceRecord({ grantedAt: 'not-a-time' }))).toThrow();
  expect(() => parseStandingPreference({ ...preferenceRecord(), reviewCadence: 'daily' })).toThrow();
  expect(() => parseStandingPreference(preferenceRecord({ revocation: { state: 'revoked', nextEffectiveDecision: null, pointer: 'p' } }))).toThrow('next effective decision');
  expect(() => parseStandingPreference(preferenceRecord({ revocation: { state: 'active', nextEffectiveDecision: 'next', pointer: 'p' } }))).toThrow('next effective decision');
  const revoked = revokeStandingPreference(preferenceRecord(), { effectiveFromDecision: 'decision-7', pointer: 'prefs/revoked.json' });
  expect(revoked.revocation).toEqual({ state: 'revoked', nextEffectiveDecision: 'decision-7', pointer: 'prefs/revoked.json' });
  expect(() => revokeStandingPreference(revoked, { effectiveFromDecision: 'next', pointer: 'p2' })).toThrow('already revoked');
  expect(() => createStandingPreference({ decisionType, scope, algorithm, grantedBy: 'model:agent', grantedAt: '2026-11-03T00:00:00Z', reviewCadence: 'none', pointer: 'p' })).toThrow();
});

function offerRecord(evaluation: Parameters<typeof createOfferRecord>[0]['evaluation'], answer: Parameters<typeof createOfferRecord>[0]['answer'] = null): OfferRecord {
  return createOfferRecord({
    decisionType,
    scope,
    algorithm,
    offer: { evidenceRequired: 'panel evidence', algorithmDecides: 'source admission', limits: 'model evidence only' },
    evaluation,
    answer,
    recordedAt: '2026-11-16T00:00:00Z',
    pointer: 'offers/h1.json',
  });
}

function decisionOfferRecord(decisionId: string, evaluation: Parameters<typeof createOfferRecord>[0]['evaluation'], answer: Parameters<typeof createOfferRecord>[0]['answer'] = null): AlgorithmDecisionOffer {
  return createAlgorithmDecisionOffer({
    decisionId,
    decisionType,
    scope,
    algorithm,
    offer: { evidenceRequired: 'panel evidence', algorithmDecides: 'source admission', limits: 'model evidence only' },
    evaluation,
    answer,
    recordedAt: '2026-11-16T00:00:00Z',
    pointer: `offers/${decisionId}.json`,
  });
}

test('offer records capture excluded, automatic and answered evaluations', async () => {
  const root = await tempRoot('vp-delegation-');
  const excluded = offerRecord({ kind: 'excluded', decisionType, scope, reason: 'undeclared decision type: x' });
  expect(excluded).toMatchObject({ evaluation: 'excluded', exclusionReason: 'undeclared decision type: x', answer: null, matchedPreferences: [] });
  const pref = preferenceRecord();
  const prefRef = await sealArtifact(root, 'pref.json', pref);
  const bindingItem: PreferenceBinding = { ref: prefRef, record: pref };
  const automatic = offerRecord({ kind: 'automatic', decisionType, scope, preference: bindingItem });
  expect(automatic.matchedPreferences).toEqual([prefRef]);
  const answered = offerRecord(
    { kind: 'offer', decisionType, scope, matchReason: 'no-standing-preference', matches: [] },
    { answer: 'human', answeredBy: 'human:owner', answeredAt: '2026-11-16T01:00:00Z', standingPreference: null },
  );
  expect(answered).toMatchObject({ evaluation: 'offer', answer: 'human', matchReason: 'no-standing-preference' });
  const standingRef = await sealArtifact(root, 'standing.json', pref);
  const standing = offerRecord(
    { kind: 'offer', decisionType, scope, matchReason: 'stale-preference', matches: [bindingItem] },
    { answer: 'delegated-standing', answeredBy: 'human:owner', answeredAt: '2026-11-16T02:00:00Z', standingPreference: standingRef },
  );
  expect(standing.standingPreference).toEqual(standingRef);
  expect(standing.matchedPreferences).toEqual([prefRef]);
  const ref = await sealOfferRecord(root, 'offers/h1.json', answered);
  expect(await readOfferRecord(root, ref)).toEqual(answered);
  await expect(sealOfferRecord(root, 'offers/h1.json', answered)).rejects.toThrow();
  await expect(readOfferRecord(root, { path: 'offers/missing.json', sha256: '0'.repeat(64) })).rejects.toThrow();
});

test('offer record consistency rejects incoherent evaluation, answer and match data', async () => {
  const root = await tempRoot('vp-delegation-');
  const pref = preferenceRecord();
  const prefRef = await sealArtifact(root, 'pref.json', pref);
  const bindingItem: PreferenceBinding = { ref: prefRef, record: pref };
  const base = { decisionType, scope, algorithm, offer: { evidenceRequired: 'e', algorithmDecides: 'd', limits: 'l' }, recordedAt: '2026-11-16T00:00:00Z', pointer: 'p' };
  const build = (evaluation: Parameters<typeof createOfferRecord>[0]['evaluation'], answer: Parameters<typeof createOfferRecord>[0]['answer']) => () => createOfferRecord({ ...base, evaluation, answer });
  expect(build({ kind: 'excluded', decisionType: 'other', scope, reason: 'r' }, null)).toThrow('evaluation binding mismatch');
  expect(build({ kind: 'offer', decisionType, scope, matchReason: 'no-standing-preference', matches: [] }, null)).toThrow('lacks user answer');
  expect(build({ kind: 'offer', decisionType, scope, matchReason: 'ambiguous-preferences', matches: [bindingItem] }, { answer: 'human', answeredBy: 'human:owner', answeredAt: '2026-11-16T00:00:00Z', standingPreference: null })).toThrow('at least two');
  expect(build({ kind: 'offer', decisionType, scope, matchReason: 'stale-preference', matches: [bindingItem, bindingItem] }, { answer: 'human', answeredBy: 'human:owner', answeredAt: '2026-11-16T00:00:00Z', standingPreference: null })).toThrow('exactly one');
  expect(build({ kind: 'offer', decisionType, scope, matchReason: 'no-standing-preference', matches: [bindingItem] }, { answer: 'human', answeredBy: 'human:owner', answeredAt: '2026-11-16T00:00:00Z', standingPreference: null })).toThrow('empty match');
  expect(build({ kind: 'offer', decisionType, scope, matchReason: 'no-standing-preference', matches: [] }, { answer: 'delegated-standing', answeredBy: 'human:owner', answeredAt: '2026-11-16T00:00:00Z', standingPreference: null })).toThrow('lacks preference artifact');
  expect(build({ kind: 'offer', decisionType, scope, matchReason: 'no-standing-preference', matches: [] }, { answer: 'human', answeredBy: 'human:owner', answeredAt: '2026-11-16T00:00:00Z', standingPreference: prefRef })).toThrow('non-standing answer');
  expect(build({ kind: 'automatic', decisionType, scope, preference: bindingItem }, { answer: 'human', answeredBy: 'human:owner', answeredAt: '2026-11-16T00:00:00Z', standingPreference: null })).toThrow('carries an answer');
  expect(build({ kind: 'excluded', decisionType, scope, reason: 'r' }, { answer: 'human', answeredBy: 'human:owner', answeredAt: '2026-11-16T00:00:00Z', standingPreference: null })).toThrow('carries an answer');
  const declined = offerRecord({ kind: 'offer', decisionType, scope, matchReason: 'no-standing-preference', matches: [] }, { answer: 'declined', answeredBy: 'human:owner', answeredAt: '2026-11-16T00:00:00Z', standingPreference: null });
  expect(() => parseOfferRecord({ ...declined, answeredBy: null })).toThrow('answer fields inconsistent');
  expect(() => parseOfferRecord({ ...declined, evaluation: 'excluded' })).toThrow();
});

test('dispatch gate verifies sealed basis before owner or dispatch', async () => {
  const root = await tempRoot('vp-delegation-dispatch-');
  const offerEvaluation = await evaluateHumanLoopDecision(request(root));
  expect(await evaluateAlgorithmDispatch(root, offerEvaluation, algorithm, 'h1-decision-1')).toMatchObject({ kind: 'owner-action', reason: 'algorithm offer has no recorded delegation answer' });
  const offerEvaluationInput = { kind: 'offer', decisionType, scope, matchReason: 'no-standing-preference', matches: [] } as const;
  for (const answer of ['human', 'declined'] as const) {
    const offer = decisionOfferRecord(
      'h1-decision-1',
      offerEvaluationInput,
      { answer, answeredBy: 'human:owner', answeredAt: '2026-11-18T01:00:00Z', standingPreference: null },
    );
    const offerRef = await sealAlgorithmDecisionOffer(root, `offers/${answer}.json`, offer);
    expect(await evaluateAlgorithmDispatch(root, offerEvaluation, algorithm, 'h1-decision-1', offerRef)).toMatchObject({ kind: 'owner-action', reason: 'offer answer does not delegate the decision' });
  }
  const delegatedOnce = decisionOfferRecord(
    'h1-decision-1',
    offerEvaluationInput,
    { answer: 'delegated-once', answeredBy: 'human:owner', answeredAt: '2026-11-18T01:00:00Z', standingPreference: null },
  );
  const delegatedOnceRef = await sealAlgorithmDecisionOffer(root, 'offers/once.json', delegatedOnce);
  expect(await evaluateAlgorithmDispatch(root, offerEvaluation, algorithm, 'h1-decision-1', delegatedOnceRef)).toMatchObject({ kind: 'dispatch', basis: 'offer' });
  const staleAlgorithmOffer = { ...delegatedOnce, algorithm: { ...algorithm, version: 'd18-panel/v0' } };
  const staleAlgorithmRef = await sealAlgorithmDecisionOffer(root, 'offers/stale-algorithm.json', staleAlgorithmOffer);
  expect(await evaluateAlgorithmDispatch(root, offerEvaluation, algorithm, 'h1-decision-1', staleAlgorithmRef)).toMatchObject({ kind: 'owner-action', reason: 'offer binding mismatch' });
  const legacyDelegated = offerRecord(
    offerEvaluationInput,
    { answer: 'delegated-once', answeredBy: 'human:owner', answeredAt: '2026-11-18T01:00:00Z', standingPreference: null },
  );
  const legacyRef = await sealOfferRecord(root, 'offers/legacy-dispatch.json', legacyDelegated);
  const legacyDispatch = await evaluateAlgorithmDispatch(root, offerEvaluation, algorithm, 'h1-decision-1', legacyRef);
  expect(legacyDispatch.kind).toBe('owner-action');
  if (legacyDispatch.kind === 'owner-action') expect(legacyDispatch.reason).toContain('must equal const value');

  const standingRef = await preferenceRef(root, preferenceRecord(), 'prefs/good-standing.json');
  const delegatedStanding = decisionOfferRecord(
    'h1-decision-1',
    offerEvaluationInput,
    { answer: 'delegated-standing', answeredBy: 'human:owner', answeredAt: '2026-11-18T02:00:00Z', standingPreference: standingRef },
  );
  const delegatedStandingRef = await sealAlgorithmDecisionOffer(root, 'offers/delegated-standing.json', delegatedStanding);
  expect(await evaluateAlgorithmDispatch(root, offerEvaluation, algorithm, 'h1-decision-1', delegatedStandingRef)).toMatchObject({ kind: 'dispatch', basis: 'offer' });

  const missingPreferenceRef: ArtifactRef = { path: 'prefs/missing.json', sha256: '0'.repeat(64) };
  const missingStanding = decisionOfferRecord(
    'h1-decision-1',
    offerEvaluationInput,
    { answer: 'delegated-standing', answeredBy: 'human:owner', answeredAt: '2026-11-18T02:05:00Z', standingPreference: missingPreferenceRef },
  );
  const missingStandingRef = await sealAlgorithmDecisionOffer(root, 'offers/missing-standing.json', missingStanding);
  expect(await evaluateAlgorithmDispatch(root, offerEvaluation, algorithm, 'h1-decision-1', missingStandingRef)).toMatchObject({ kind: 'owner-action' });
  const revoked = revokeStandingPreference(preferenceRecord(), { effectiveFromDecision: 'next', pointer: 'prefs/revoked-dispatch.json' });
  const revokedRef = await preferenceRef(root, revoked, 'prefs/revoked-dispatch.json');
  const revokedStanding = decisionOfferRecord(
    'h1-decision-1',
    offerEvaluationInput,
    { answer: 'delegated-standing', answeredBy: 'human:owner', answeredAt: '2026-11-18T02:10:00Z', standingPreference: revokedRef },
  );
  const revokedStandingRef = await sealAlgorithmDecisionOffer(root, 'offers/revoked-standing-dispatch.json', revokedStanding);
  expect(await evaluateAlgorithmDispatch(root, offerEvaluation, algorithm, 'h1-decision-1', revokedStandingRef)).toMatchObject({ kind: 'owner-action', reason: 'standing preference is revoked' });
  const mismatchedPreferenceRef = await preferenceRef(root, preferenceRecord({ algorithmVersion: 'd18-panel/v0' }), 'prefs/mismatched-dispatch.json');
  const mismatchedStanding = decisionOfferRecord(
    'h1-decision-1',
    offerEvaluationInput,
    { answer: 'delegated-standing', answeredBy: 'human:owner', answeredAt: '2026-11-18T02:15:00Z', standingPreference: mismatchedPreferenceRef },
  );
  const mismatchedStandingRef = await sealAlgorithmDecisionOffer(root, 'offers/mismatched-standing.json', mismatchedStanding);
  expect(await evaluateAlgorithmDispatch(root, offerEvaluation, algorithm, 'h1-decision-1', mismatchedStandingRef)).toMatchObject({ kind: 'owner-action', reason: 'standing preference binding mismatch' });

  const automatic = await evaluateHumanLoopDecision(request(root, { preferenceRefs: [await preferenceRef(root, preferenceRecord(), 'prefs/automatic.json')] }));
  expect(await evaluateAlgorithmDispatch(root, automatic, algorithm, 'h1-decision-1')).toMatchObject({ kind: 'dispatch', basis: 'standing-preference' });
  expect(await evaluateAlgorithmDispatch(root, automatic, { ...algorithm, promptIdentity: 'prompts:changed' }, 'h1-decision-1')).toMatchObject({ kind: 'owner-action', reason: 'standing preference binding mismatch' });
  const excluded = await evaluateHumanLoopDecision(request(root, { decisionType: 'legal-rights-clearance', scope: 'rights' }));
  expect(await evaluateAlgorithmDispatch(root, excluded, algorithm, 'h1-decision-1')).toMatchObject({ kind: 'owner-action', reason: 'D17 reserves legal-risk, rights and clearance decisions to the human owner.' });
});

function protocolEvidence(decisionId: string, protocol: ProtocolId, sourceRefs: readonly ArtifactRef[], overrides: Record<string, unknown> = {}) {
  return {
    schema: 'VPAlgorithmProtocolEvidence/v1',
    protocol,
    decisionId,
    decisionType,
    scope,
    algorithm,
    sourceRefs,
    reviewer: { actor: `model:${protocol}`, session: `session:${decisionId}:${protocol}` },
    result: { status: 'resolved', value: { outcome: 'admit', refs: sourceRefs } },
    ...overrides,
  };
}

function aggregateEvidence(decisionId: string, sourceRefs: readonly ArtifactRef[], protocols: readonly { protocol: ProtocolId; report: ArtifactRef }[], overrides: Record<string, unknown> = {}) {
  return {
    schema: 'VPAlgorithmAggregateEvidence/v1',
    decisionId,
    decisionType,
    scope,
    algorithm,
    sourceRefs,
    protocols,
    aggregator: { actor: 'orchestrator', session: `aggregate:${decisionId}` },
    result: { status: 'resolved', value: { outcome: 'admit', refs: sourceRefs } },
    ...overrides,
  };
}

async function decisionArtifacts(root: string, decisionId = 'h1-decision-1') {
  const key = decisionId.replace(/[^a-z0-9._-]+/gi, '-');
  const sourceRefs = [
    await sealArtifact(root, `source-packets/${key}-packet-a.json`, { schema: 'VPSourcePacket/v1', fixture: `${key}-a` }),
    await sealArtifact(root, `source-packets/${key}-packet-b.json`, { schema: 'VPSourcePacket/v1', fixture: `${key}-b` }),
  ];
  const protocols: { protocol: ProtocolId; report: ArtifactRef }[] = [];
  for (const protocol of d18Protocols) {
    protocols.push({ protocol, report: await sealArtifact(root, `d18/${key}/${protocol}.json`, protocolEvidence(decisionId, protocol, sourceRefs)) });
  }
  const aggregation = await sealArtifact(root, `d18/${key}/aggregation.json`, aggregateEvidence(decisionId, sourceRefs, protocols));
  return { sourceRefs, protocols, aggregation };
}

function decisionRecord(
  artifacts: Awaited<ReturnType<typeof decisionArtifacts>>,
  basis: AlgorithmDecisionRecord['basis'],
  overrides: Partial<AlgorithmDecisionRecord> = {},
): AlgorithmDecisionRecord {
  return {
    schema: 'VPAlgorithmDecision/v1',
    decisionId: 'h1-decision-1',
    decisionType,
    scope,
    algorithm,
    basis,
    sourceRefs: artifacts.sourceRefs,
    protocols: artifacts.protocols,
    aggregation: artifacts.aggregation,
    recordedAt: '2026-11-18T03:00:00Z',
    pointer: 'decisions/h1-decision-1.json',
    ...overrides,
  };
}

function expectedDecision(record: AlgorithmDecisionRecord) {
  return { decisionId: record.decisionId, decisionType: record.decisionType, scope: record.scope, algorithm: record.algorithm, sourceRefs: record.sourceRefs, basis: record.basis };
}

test('algorithm decision evidence binds the exact decision and verifies D18 artifacts', async () => {
  const root = await tempRoot('vp-decision-evidence-');
  const offer = decisionOfferRecord(
    'h1-decision-1',
    { kind: 'offer', decisionType, scope, matchReason: 'no-standing-preference', matches: [] },
    { answer: 'delegated-once', answeredBy: 'human:owner', answeredAt: '2026-11-18T01:00:00Z', standingPreference: null },
  );
  const offerRef = await sealAlgorithmDecisionOffer(root, 'offers/h1-decision-1.json', offer);
  const artifacts = await decisionArtifacts(root);
  const record = decisionRecord(artifacts, { kind: 'offer', ref: offerRef });
  const ref = await sealAlgorithmDecision(root, 'decisions/h1-decision-1.json', record);
  expect(await readAlgorithmDecision(root, ref)).toEqual(record);
  const verified = await verifyAlgorithmDecision(root, ref, expectedDecision(record));
  expect(verified.kind).toBe('verified');
  if (verified.kind === 'verified') expect(verified.basis).toEqual(offer);
});

test('algorithm decision evidence accepts exact standing and delegated-standing bases', async () => {
  const root = await tempRoot('vp-decision-standing-');
  const artifacts = await decisionArtifacts(root);
  const preference = preferenceRecord();
  const preferenceRefValue = await preferenceRef(root, preference, 'standing-active.json');
  const automaticRecord = decisionRecord(artifacts, { kind: 'standing-preference', ref: preferenceRefValue });
  const automaticRef = await sealAlgorithmDecision(root, 'decisions/automatic.json', automaticRecord);
  const automatic = await verifyAlgorithmDecision(root, automaticRef, expectedDecision(automaticRecord));
  expect(automatic.kind).toBe('verified');
  if (automatic.kind === 'verified') expect(automatic.basis).toEqual(preference);
  const standingArtifacts = await decisionArtifacts(root, 'h1-decision-standing');
  const standingOffer = decisionOfferRecord(
    'h1-decision-standing',
    { kind: 'offer', decisionType, scope, matchReason: 'no-standing-preference', matches: [] },
    { answer: 'delegated-standing', answeredBy: 'human:owner', answeredAt: '2026-11-18T02:00:00Z', standingPreference: preferenceRefValue },
  );
  const standingOfferRef = await sealAlgorithmDecisionOffer(root, 'offers/delegated-standing.json', standingOffer);
  const standingRecord = decisionRecord(standingArtifacts, { kind: 'offer', ref: standingOfferRef }, { decisionId: 'h1-decision-standing' });
  const standingRef = await sealAlgorithmDecision(root, 'decisions/delegated-standing.json', standingRecord);
  const standing = await verifyAlgorithmDecision(root, standingRef, expectedDecision(standingRecord));
  expect(standing.kind).toBe('verified');
  if (standing.kind === 'verified') expect(standing.basis).toEqual(standingOffer);
});

test('algorithm decision evidence rejects mismatched, revoked, stale and non-delegating bases', async () => {
  const root = await tempRoot('vp-decision-rejections-');
  const offer = decisionOfferRecord(
    'h1-decision-1',
    { kind: 'offer', decisionType, scope, matchReason: 'no-standing-preference', matches: [] },
    { answer: 'delegated-once', answeredBy: 'human:owner', answeredAt: '2026-11-18T01:00:00Z', standingPreference: null },
  );
  const offerRef = await sealAlgorithmDecisionOffer(root, 'offers/base.json', offer);
  const artifacts = await decisionArtifacts(root);
  const record = decisionRecord(artifacts, { kind: 'offer', ref: offerRef });
  const ref = await sealAlgorithmDecision(root, 'decisions/base.json', record);
  const expected = expectedDecision(record);
  const otherOffer = decisionOfferRecord(
    'h1-decision-1',
    { kind: 'offer', decisionType, scope, matchReason: 'no-standing-preference', matches: [] },
    { answer: 'delegated-once', answeredBy: 'human:owner', answeredAt: '2026-11-18T01:15:00Z', standingPreference: null },
  );
  const otherOfferRef = await sealAlgorithmDecisionOffer(root, 'offers/other.json', otherOffer);
  for (const mismatch of [
    { ...expected, decisionId: 'other-decision' },
    { ...expected, scope: 'other-scope' },
    { ...expected, algorithm: { ...algorithm, version: 'd18-panel/v0' } },
    { ...expected, sourceRefs: expected.sourceRefs.slice(0, 1) },
    { ...expected, basis: { kind: 'offer' as const, ref: otherOfferRef } },
  ]) {
    const result = await verifyAlgorithmDecision(root, ref, mismatch);
    expect(result.kind).toBe('rejected');
    if (result.kind === 'rejected') expect(result.reasons[0]).toContain('decision binding mismatch');
  }
  for (const answer of ['human', 'declined'] as const) {
    const nonDelegating = decisionOfferRecord(
      `h1-${answer}`,
      { kind: 'offer', decisionType, scope, matchReason: 'no-standing-preference', matches: [] },
      { answer, answeredBy: 'human:owner', answeredAt: '2026-11-18T01:30:00Z', standingPreference: null },
    );
    const nonDelegatingRef = await sealAlgorithmDecisionOffer(root, `offers/${answer}.json`, nonDelegating);
    const nonDelegatingRecord = decisionRecord(artifacts, { kind: 'offer', ref: nonDelegatingRef }, { decisionId: `h1-${answer}` });
    const nonDelegatingDecision = await sealAlgorithmDecision(root, `decisions/${answer}.json`, nonDelegatingRecord);
    const result = await verifyAlgorithmDecision(root, nonDelegatingDecision, expectedDecision(nonDelegatingRecord));
    expect(result.kind).toBe('rejected');
    if (result.kind === 'rejected') expect(result.reasons[0]).toContain('does not delegate');
  }
  const revoked = revokeStandingPreference(preferenceRecord(), { effectiveFromDecision: 'next', pointer: 'prefs/revoked.json' });
  const revokedRef = await preferenceRef(root, revoked, 'standing-revoked.json');
  const revokedRecord = decisionRecord(artifacts, { kind: 'standing-preference', ref: revokedRef }, { decisionId: 'h1-revoked' });
  const revokedDecision = await sealAlgorithmDecision(root, 'decisions/revoked.json', revokedRecord);
  const revokedResult = await verifyAlgorithmDecision(root, revokedDecision, expectedDecision(revokedRecord));
  expect(revokedResult.kind).toBe('rejected');
  if (revokedResult.kind === 'rejected') expect(revokedResult.reasons[0]).toContain('revoked');
  const revokedOffer = decisionOfferRecord(
    'h1-revoked-offer',
    { kind: 'offer', decisionType, scope, matchReason: 'no-standing-preference', matches: [] },
    { answer: 'delegated-standing', answeredBy: 'human:owner', answeredAt: '2026-11-18T01:45:00Z', standingPreference: revokedRef },
  );
  const revokedOfferRef = await sealAlgorithmDecisionOffer(root, 'offers/revoked-standing.json', revokedOffer);
  const revokedOfferRecord = decisionRecord(artifacts, { kind: 'offer', ref: revokedOfferRef }, { decisionId: 'h1-revoked-offer' });
  const revokedOfferDecision = await sealAlgorithmDecision(root, 'decisions/revoked-offer.json', revokedOfferRecord);
  const revokedOfferResult = await verifyAlgorithmDecision(root, revokedOfferDecision, expectedDecision(revokedOfferRecord));
  expect(revokedOfferResult.kind).toBe('rejected');
  if (revokedOfferResult.kind === 'rejected') expect(revokedOfferResult.reasons[0]).toContain('revoked');
  const stalePreference = preferenceRecord({ algorithmVersion: 'd18-panel/v0' });
  const staleRef = await preferenceRef(root, stalePreference, 'standing-stale.json');
  const staleRecord = decisionRecord(artifacts, { kind: 'standing-preference', ref: staleRef }, { decisionId: 'h1-stale' });
  const staleDecision = await sealAlgorithmDecision(root, 'decisions/stale.json', staleRecord);
  const staleResult = await verifyAlgorithmDecision(root, staleDecision, expectedDecision(staleRecord));
  expect(staleResult.kind).toBe('rejected');
  if (staleResult.kind === 'rejected') expect(staleResult.reasons[0]).toContain('binding mismatch');
});

test('algorithm decision parsing requires distinct D18 reports and non-reused refs', async () => {
  const root = await tempRoot('vp-decision-shape-');
  const offer = decisionOfferRecord(
    'h1-decision-1',
    { kind: 'offer', decisionType, scope, matchReason: 'no-standing-preference', matches: [] },
    { answer: 'delegated-once', answeredBy: 'human:owner', answeredAt: '2026-11-18T01:00:00Z', standingPreference: null },
  );
  const offerRef = await sealAlgorithmDecisionOffer(root, 'offers/shape.json', offer);
  const artifacts = await decisionArtifacts(root);
  const record = decisionRecord(artifacts, { kind: 'offer', ref: offerRef });
  expect(parseAlgorithmDecision(record)).toEqual(record);
  const duplicateReport = {
    ...artifacts,
    protocols: artifacts.protocols.map((item, index) => index === 1 ? { ...item, report: artifacts.protocols[0]!.report } : item),
  };
  expect(() => parseAlgorithmDecision(decisionRecord(duplicateReport, record.basis))).toThrow('duplicate D18 protocol report');
  expect(() => parseAlgorithmDecision({ ...record, protocols: [record.protocols[0]!, record.protocols[0]!, record.protocols[2]!] })).toThrow();
  expect(() => parseAlgorithmDecision({ ...record, aggregation: artifacts.protocols[0]!.report })).toThrow('reuses an artifact ref');
  expect(() => parseAlgorithmDecision({ ...record, sourceRefs: [] })).toThrow();
  const staleSource = { ...record, sourceRefs: [{ path: artifacts.sourceRefs[0]!.path, sha256: '0'.repeat(64) }, ...artifacts.sourceRefs.slice(1)] };
  const staleRef = await sealAlgorithmDecision(root, 'decisions/stale-source.json', staleSource);
  const staleResult = await verifyAlgorithmDecision(root, staleRef, expectedDecision(staleSource));
  expect(staleResult.kind).toBe('rejected');
  if (staleResult.kind === 'rejected') expect(staleResult.reasons[0]).toContain('stale artifact');
});

test('algorithm decision evidence rejects unrelated or swapped D18 payloads', async () => {
  const root = await tempRoot('vp-decision-evidence-rejections-');
  const offer = decisionOfferRecord(
    'h1-decision-1',
    { kind: 'offer', decisionType, scope, matchReason: 'no-standing-preference', matches: [] },
    { answer: 'delegated-once', answeredBy: 'human:owner', answeredAt: '2026-11-18T01:00:00Z', standingPreference: null },
  );
  const offerRef = await sealAlgorithmDecisionOffer(root, 'offers/evidence.json', offer);
  const artifacts = await decisionArtifacts(root);
  const basis = { kind: 'offer' as const, ref: offerRef };
  const record = decisionRecord(artifacts, basis);
  let variant = 0;
  async function verifyVariant(candidate: AlgorithmDecisionRecord) {
    variant += 1;
    const decisionRef = await sealAlgorithmDecision(root, `decisions/evidence-${variant}.json`, candidate);
    return verifyAlgorithmDecision(root, decisionRef, expectedDecision(candidate));
  }
  async function expectRejected(candidate: AlgorithmDecisionRecord, reason: string) {
    const result = await verifyVariant(candidate);
    expect(result.kind).toBe('rejected');
    if (result.kind === 'rejected') expect(result.reasons[0]).toContain(reason);
  }

  const arbitraryReport = await sealArtifact(root, 'd18/h1-decision-1/arbitrary.json', { fixture: true });
  await expectRejected(decisionRecord({ ...artifacts, protocols: artifacts.protocols.map((item, index) => index === 0 ? { ...item, report: arbitraryReport } : item) }, basis), 'ALGORITHM_DELEGATION_INVALID');
  const wrongAggregate = await sealArtifact(root, 'd18/h1-decision-1/aggregate-wrong.json', { schema: 'UnrelatedAggregate/v1' });
  await expectRejected(decisionRecord({ ...artifacts, aggregation: wrongAggregate }, basis), 'ALGORITHM_DELEGATION_INVALID');
  const swappedProtocols = [
    { ...artifacts.protocols[0]!, report: artifacts.protocols[1]!.report },
    { ...artifacts.protocols[1]!, report: artifacts.protocols[0]!.report },
    artifacts.protocols[2]!,
  ];
  await expectRejected(decisionRecord({ ...artifacts, protocols: swappedProtocols }, basis), 'mislabeled');

  const otherArtifacts = await decisionArtifacts(root, 'h1-decision-2');
  await expectRejected(decisionRecord(artifacts, basis, { sourceRefs: otherArtifacts.sourceRefs }), 'source refs mismatch');
  const swappedAggregate = await sealArtifact(root, 'd18/h1-decision-1/aggregation-swap.json', aggregateEvidence(record.decisionId, artifacts.sourceRefs, otherArtifacts.protocols));
  await expectRejected(decisionRecord({ ...artifacts, aggregation: swappedAggregate }, basis), 'protocol refs mismatch');
  const unresolvedReport = await sealArtifact(root, 'd18/h1-decision-1/V3-delphi-unresolved.json', protocolEvidence(record.decisionId, 'V3-delphi', artifacts.sourceRefs, { result: { status: 'unresolved', value: null } }));
  await expectRejected(decisionRecord({ ...artifacts, protocols: [{ ...artifacts.protocols[0]!, report: unresolvedReport }, artifacts.protocols[1]!, artifacts.protocols[2]!] }, basis), 'unresolved or missing');

  const contradictoryProtocols: { protocol: ProtocolId; report: ArtifactRef }[] = [];
  for (const [protocol, outcome] of [['V3-delphi', 'admit'], ['V2-adversarial', 'reject'], ['V4-party-chat', 'escalate']] as const) {
    contradictoryProtocols.push({
      protocol,
      report: await sealArtifact(root, `d18/h1-decision-1/contradictory-${protocol}.json`, protocolEvidence(record.decisionId, protocol, artifacts.sourceRefs, { result: { status: 'resolved', value: { outcome, refs: artifacts.sourceRefs } } })),
    });
  }
  const contradictoryAggregate = await sealArtifact(root, 'd18/h1-decision-1/aggregation-contradictory.json', aggregateEvidence(record.decisionId, artifacts.sourceRefs, contradictoryProtocols, { result: { status: 'resolved', value: { outcome: 'admit', refs: artifacts.sourceRefs } } }));
  await expectRejected(decisionRecord({ ...artifacts, protocols: contradictoryProtocols, aggregation: contradictoryAggregate }, basis), 'result disagrees');
});

test('decision offer authorizes only its own decisionId and legacy offers cannot verify', async () => {
  const root = await tempRoot('vp-decision-replay-');
  const offer = decisionOfferRecord(
    'h1-decision-a',
    { kind: 'offer', decisionType, scope, matchReason: 'no-standing-preference', matches: [] },
    { answer: 'delegated-once', answeredBy: 'human:owner', answeredAt: '2026-11-18T01:00:00Z', standingPreference: null },
  );
  const offerRef = await sealAlgorithmDecisionOffer(root, 'offers/replay.json', offer);
  const evaluation = await evaluateHumanLoopDecision(request(root));
  expect(await evaluateAlgorithmDispatch(root, evaluation, algorithm, 'h1-decision-a', offerRef)).toMatchObject({ kind: 'dispatch', basis: 'offer' });
  expect(await evaluateAlgorithmDispatch(root, evaluation, algorithm, 'h1-decision-b', offerRef)).toMatchObject({ kind: 'owner-action', reason: 'offer decision binding mismatch' });

  const artifactsA = await decisionArtifacts(root, 'h1-decision-a');
  const recordA = decisionRecord(artifactsA, { kind: 'offer', ref: offerRef }, { decisionId: 'h1-decision-a' });
  const refA = await sealAlgorithmDecision(root, 'decisions/a.json', recordA);
  const verifiedA = await verifyAlgorithmDecision(root, refA, expectedDecision(recordA));
  expect(verifiedA.kind).toBe('verified');

  const artifactsB = await decisionArtifacts(root, 'h1-decision-b');
  const recordB = decisionRecord(artifactsB, { kind: 'offer', ref: offerRef }, { decisionId: 'h1-decision-b' });
  const refB = await sealAlgorithmDecision(root, 'decisions/b.json', recordB);
  const verifiedB = await verifyAlgorithmDecision(root, refB, expectedDecision(recordB));
  expect(verifiedB.kind).toBe('rejected');
  if (verifiedB.kind === 'rejected') expect(verifiedB.reasons[0]).toContain('offer decision binding mismatch');

  const legacy = offerRecord(
    { kind: 'offer', decisionType, scope, matchReason: 'no-standing-preference', matches: [] },
    { answer: 'delegated-once', answeredBy: 'human:owner', answeredAt: '2026-11-18T01:00:00Z', standingPreference: null },
  );
  const legacyRef = await sealOfferRecord(root, 'offers/legacy.json', legacy);
  const recordLegacy = decisionRecord(artifactsA, { kind: 'offer', ref: legacyRef }, { decisionId: 'h1-decision-a' });
  const refLegacy = await sealAlgorithmDecision(root, 'decisions/legacy.json', recordLegacy);
  const verifiedLegacy = await verifyAlgorithmDecision(root, refLegacy, expectedDecision(recordLegacy));
  expect(verifiedLegacy.kind).toBe('rejected');
});
