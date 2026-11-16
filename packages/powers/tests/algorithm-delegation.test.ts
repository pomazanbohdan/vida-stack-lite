import { afterEach, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createOfferRecord,
  createStandingPreference,
  evaluateHumanLoopDecision,
  initialDecisionTypeRegistry,
  parseOfferRecord,
  parseStandingPreference,
  readOfferRecord,
  readStandingPreference,
  revokeStandingPreference,
  sealOfferRecord,
  sealStandingPreference,
  validateDecisionTypeRegistry,
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
