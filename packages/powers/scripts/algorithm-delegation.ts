import { validateAgainstSchema, type Schema } from '../skills/vp-mode/scripts/schema.ts';
import { sealArtifact, verifyArtifact, type ArtifactRef } from './source-packets.ts';

const textSchema = { type: 'string', minLength: 1 } satisfies Schema;
const shaSchema = { type: 'string', pattern: '^[0-9a-f]{64}$' } satisfies Schema;
const timestampSchema = { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}T' } satisfies Schema;
const humanActorSchema = { type: 'string', pattern: '^human:.+' } satisfies Schema;
const reviewCadenceSchema = { enum: ['none', 'periodic-human-check'] } satisfies Schema;
function objectSchema(properties: Record<string, Schema>): Schema {
  return { type: 'object', properties, required: Object.keys(properties), additionalProperties: false };
}
function check(condition: unknown, reason: string): asserts condition {
  if (!condition) throw new Error(`ALGORITHM_DELEGATION_INVALID: ${reason}`);
}
function sameAlgorithm(left: AlgorithmIdentity, right: AlgorithmIdentity): boolean {
  return left.version === right.version && left.promptIdentity === right.promptIdentity && left.evidencePolicy === right.evidencePolicy;
}
function samePreferenceAlgorithm(record: StandingPreference, algorithm: AlgorithmIdentity): boolean {
  return record.algorithmVersion === algorithm.version && record.promptIdentity === algorithm.promptIdentity && record.evidencePolicy === algorithm.evidencePolicy;
}
function validate(value: unknown, schema: Schema): void {
  const errors = validateAgainstSchema(value, schema);
  if (errors.length) throw new Error(`ALGORITHM_DELEGATION_INVALID: ${errors.join('; ')}`);
}

export type ReviewCadence = 'none' | 'periodic-human-check';
export type AlgorithmIdentity = Readonly<{ version: string; promptIdentity: string; evidencePolicy: string }>;
export type DecisionTypeEntry = Readonly<{
  decisionType: string;
  description: string;
  scope: string;
  evidenceRequired: string;
  algorithmAllowed: boolean;
  exclusionReason: string | null;
  automaticRequiresPreference: true;
  reviewCadence: ReviewCadence;
}>;
export type StandingPreference = Readonly<{
  schema: 'VPStandingPreference/v1';
  decisionType: string;
  scope: string;
  algorithmVersion: string;
  promptIdentity: string;
  evidencePolicy: string;
  grantedBy: string;
  grantedAt: string;
  reviewCadence: ReviewCadence;
  revocation: Readonly<{ state: 'active' | 'revoked'; nextEffectiveDecision: string | null; pointer: string }>;
}>;
export type PreferenceBinding = Readonly<{ ref: ArtifactRef; record: StandingPreference }>;
export type OfferMatchReason = 'no-standing-preference' | 'ambiguous-preferences' | 'stale-preference';
export type OfferAnswer = 'human' | 'delegated-once' | 'delegated-standing' | 'declined';
export type HumanLoopEvaluation =
  | Readonly<{ kind: 'excluded'; decisionType: string; scope: string; reason: string }>
  | Readonly<{ kind: 'automatic'; decisionType: string; scope: string; preference: PreferenceBinding }>
  | Readonly<{ kind: 'offer'; decisionType: string; scope: string; matchReason: OfferMatchReason; matches: readonly PreferenceBinding[] }>;
export type OfferRecord = Readonly<{
  schema: 'VPAlgorithmOffer/v1';
  decisionType: string;
  scope: string;
  algorithm: AlgorithmIdentity;
  offer: Readonly<{ evidenceRequired: string; algorithmDecides: string; limits: string }>;
  evaluation: 'excluded' | 'automatic' | 'offer';
  exclusionReason: string | null;
  matchReason: OfferMatchReason | null;
  matchedPreferences: readonly ArtifactRef[];
  answer: OfferAnswer | null;
  answeredBy: string | null;
  answeredAt: string | null;
  standingPreference: ArtifactRef | null;
  recordedAt: string;
  pointer: string;
}>;
export type AlgorithmDecisionOffer = Readonly<{
  schema: 'VPAlgorithmDecisionOffer/v1';
  decisionId: string;
  decisionType: string;
  scope: string;
  algorithm: AlgorithmIdentity;
  offer: Readonly<{ evidenceRequired: string; algorithmDecides: string; limits: string }>;
  evaluation: 'excluded' | 'automatic' | 'offer';
  exclusionReason: string | null;
  matchReason: OfferMatchReason | null;
  matchedPreferences: readonly ArtifactRef[];
  answer: OfferAnswer | null;
  answeredBy: string | null;
  answeredAt: string | null;
  standingPreference: ArtifactRef | null;
  recordedAt: string;
  pointer: string;
}>;
export type D18ProtocolId = 'V3-delphi' | 'V2-adversarial' | 'V4-party-chat';
export type D18ProtocolEvidence = Readonly<{ protocol: D18ProtocolId; report: ArtifactRef }>;
export type AlgorithmDecisionBasis = Readonly<{ kind: 'offer' | 'standing-preference'; ref: ArtifactRef }>;
export type AlgorithmDecisionRecord = Readonly<{
  schema: 'VPAlgorithmDecision/v1';
  decisionId: string;
  decisionType: string;
  scope: string;
  algorithm: AlgorithmIdentity;
  basis: AlgorithmDecisionBasis;
  sourceRefs: readonly ArtifactRef[];
  protocols: readonly D18ProtocolEvidence[];
  aggregation: ArtifactRef;
  recordedAt: string;
  pointer: string;
}>;
export type AlgorithmDecisionExpected = Readonly<{ decisionId: string; decisionType: string; scope: string; algorithm: AlgorithmIdentity; sourceRefs: readonly ArtifactRef[]; basis: AlgorithmDecisionBasis }>;
type AlgorithmDecisionIdentity = Readonly<{ decisionId: string; decisionType: string; scope: string; algorithm: AlgorithmIdentity }>;
export type AlgorithmDecisionVerification =
  | Readonly<{ kind: 'verified'; record: AlgorithmDecisionRecord; basis: AlgorithmDecisionOffer | StandingPreference }>
  | Readonly<{ kind: 'rejected'; reasons: readonly string[] }>;
export type AlgorithmDispatchEvaluation =
  | Readonly<{ kind: 'dispatch'; decisionType: string; scope: string; basis: 'offer' | 'standing-preference' }>
  | Readonly<{ kind: 'owner-action'; decisionType: string; scope: string; reason: string }>;

type DecisionResultValue = Readonly<{ outcome: string; refs: readonly ArtifactRef[] }>;
type DecisionResult = Readonly<{ status: 'resolved' | 'unresolved' | 'missing'; value: DecisionResultValue | null }>;
type ReviewerIdentity = Readonly<{ actor: string; session: string }>;
type ProtocolEvidencePayload = Readonly<{
  schema: 'VPAlgorithmProtocolEvidence/v1';
  protocol: D18ProtocolId;
  decisionId: string;
  decisionType: string;
  scope: string;
  algorithm: AlgorithmIdentity;
  sourceRefs: readonly ArtifactRef[];
  reviewer: ReviewerIdentity;
  result: DecisionResult;
}>;
type AggregateEvidencePayload = Readonly<{
  schema: 'VPAlgorithmAggregateEvidence/v1';
  decisionId: string;
  decisionType: string;
  scope: string;
  algorithm: AlgorithmIdentity;
  sourceRefs: readonly ArtifactRef[];
  protocols: readonly D18ProtocolEvidence[];
  aggregator: ReviewerIdentity;
  result: DecisionResult;
}>;

const decisionTypeEntrySchema = objectSchema({
  decisionType: textSchema,
  description: textSchema,
  scope: textSchema,
  evidenceRequired: textSchema,
  algorithmAllowed: { type: 'boolean' },
  exclusionReason: { type: ['string', 'null'], minLength: 1 },
  automaticRequiresPreference: { const: true },
  reviewCadence: reviewCadenceSchema,
});
const decisionTypeRegistrySchema: Schema = { type: 'array', minItems: 1, items: decisionTypeEntrySchema };
const revocationSchema = objectSchema({
  state: { enum: ['active', 'revoked'] },
  nextEffectiveDecision: { type: ['string', 'null'], minLength: 1 },
  pointer: textSchema,
});
const standingPreferenceSchema = objectSchema({
  schema: { const: 'VPStandingPreference/v1' },
  decisionType: textSchema,
  scope: textSchema,
  algorithmVersion: textSchema,
  promptIdentity: textSchema,
  evidencePolicy: textSchema,
  grantedBy: humanActorSchema,
  grantedAt: timestampSchema,
  reviewCadence: reviewCadenceSchema,
  revocation: revocationSchema,
});
const artifactRefSchema = objectSchema({ path: textSchema, sha256: shaSchema });
const nullableArtifactRefSchema: Schema = {
  type: ['object', 'null'],
  if: { type: 'object' },
  then: artifactRefSchema,
};
const nullableTimestampSchema: Schema = { type: ['string', 'null'], pattern: '^\\d{4}-\\d{2}-\\d{2}T' };
const nullableHumanSchema: Schema = { type: ['string', 'null'], pattern: '^human:.+' };
const offerSchema = objectSchema({
  schema: { const: 'VPAlgorithmOffer/v1' },
  decisionType: textSchema,
  scope: textSchema,
  algorithm: objectSchema({ version: textSchema, promptIdentity: textSchema, evidencePolicy: textSchema }),
  offer: objectSchema({ evidenceRequired: textSchema, algorithmDecides: textSchema, limits: textSchema }),
  evaluation: { enum: ['excluded', 'automatic', 'offer'] },
  exclusionReason: { type: ['string', 'null'], minLength: 1 },
  matchReason: { type: ['string', 'null'], enum: ['no-standing-preference', 'ambiguous-preferences', 'stale-preference', null] },
  matchedPreferences: { type: 'array', items: artifactRefSchema },
  answer: { type: ['string', 'null'], enum: ['human', 'delegated-once', 'delegated-standing', 'declined', null] },
  answeredBy: nullableHumanSchema,
  answeredAt: nullableTimestampSchema,
  standingPreference: nullableArtifactRefSchema,
  recordedAt: timestampSchema,
  pointer: textSchema,
});
const d18ProtocolIdSchema = { enum: ['V3-delphi', 'V2-adversarial', 'V4-party-chat'] } satisfies Schema;
const d18ProtocolIds: readonly D18ProtocolId[] = ['V3-delphi', 'V2-adversarial', 'V4-party-chat'];
const d18ProtocolEvidenceSchema = objectSchema({ protocol: d18ProtocolIdSchema, report: artifactRefSchema });
const algorithmIdentitySchema = objectSchema({ version: textSchema, promptIdentity: textSchema, evidencePolicy: textSchema });
const sourceRefsSchema = { type: 'array', minItems: 1, uniqueItems: true, items: artifactRefSchema } satisfies Schema;
const reviewerIdentitySchema = objectSchema({ actor: textSchema, session: textSchema });
const decisionResultValueSchema = objectSchema({ outcome: textSchema, refs: { type: 'array', uniqueItems: true, items: artifactRefSchema } });
const decisionResultSchema = objectSchema({
  status: { enum: ['resolved', 'unresolved', 'missing'] },
  value: { type: ['object', 'null'], if: { type: 'object' }, then: decisionResultValueSchema },
});
const protocolEvidenceSchema = objectSchema({
  schema: { const: 'VPAlgorithmProtocolEvidence/v1' },
  protocol: d18ProtocolIdSchema,
  decisionId: textSchema,
  decisionType: textSchema,
  scope: textSchema,
  algorithm: algorithmIdentitySchema,
  sourceRefs: sourceRefsSchema,
  reviewer: reviewerIdentitySchema,
  result: decisionResultSchema,
});
const aggregateEvidenceSchema = objectSchema({
  schema: { const: 'VPAlgorithmAggregateEvidence/v1' },
  decisionId: textSchema,
  decisionType: textSchema,
  scope: textSchema,
  algorithm: algorithmIdentitySchema,
  sourceRefs: sourceRefsSchema,
  protocols: { type: 'array', minItems: 3, maxItems: 3, uniqueItems: true, items: d18ProtocolEvidenceSchema },
  aggregator: reviewerIdentitySchema,
  result: decisionResultSchema,
});
const algorithmDecisionOfferSchema = objectSchema({
  schema: { const: 'VPAlgorithmDecisionOffer/v1' },
  decisionId: textSchema,
  decisionType: textSchema,
  scope: textSchema,
  algorithm: algorithmIdentitySchema,
  offer: objectSchema({ evidenceRequired: textSchema, algorithmDecides: textSchema, limits: textSchema }),
  evaluation: { enum: ['excluded', 'automatic', 'offer'] },
  exclusionReason: { type: ['string', 'null'], minLength: 1 },
  matchReason: { type: ['string', 'null'], enum: ['no-standing-preference', 'ambiguous-preferences', 'stale-preference', null] },
  matchedPreferences: { type: 'array', items: artifactRefSchema },
  answer: { type: ['string', 'null'], enum: ['human', 'delegated-once', 'delegated-standing', 'declined', null] },
  answeredBy: nullableHumanSchema,
  answeredAt: nullableTimestampSchema,
  standingPreference: nullableArtifactRefSchema,
  recordedAt: timestampSchema,
  pointer: textSchema,
});
const algorithmDecisionBasisSchema = objectSchema({ kind: { enum: ['offer', 'standing-preference'] }, ref: artifactRefSchema });
const algorithmDecisionSchema = objectSchema({
  schema: { const: 'VPAlgorithmDecision/v1' },
  decisionId: textSchema,
  decisionType: textSchema,
  scope: textSchema,
  algorithm: algorithmIdentitySchema,
  basis: algorithmDecisionBasisSchema,
  sourceRefs: sourceRefsSchema,
  protocols: { type: 'array', minItems: 3, maxItems: 3, uniqueItems: true, items: d18ProtocolEvidenceSchema },
  aggregation: artifactRefSchema,
  recordedAt: timestampSchema,
  pointer: textSchema,
});

export function validateDecisionTypeRegistry(value: unknown): readonly DecisionTypeEntry[] {
  validate(value, decisionTypeRegistrySchema);
  const entries = value as DecisionTypeEntry[];
  const seen = new Set<string>();
  for (const entry of entries) {
    check(!seen.has(entry.decisionType), `duplicate decision type: ${entry.decisionType}`);
    seen.add(entry.decisionType);
    if (entry.algorithmAllowed) check(entry.exclusionReason === null, `allowed decision type carries exclusion: ${entry.decisionType}`);
    else check(entry.exclusionReason !== null, `excluded decision type lacks reason: ${entry.decisionType}`);
  }
  return Object.freeze(entries.map(entry => Object.freeze({ ...entry })));
}

const excludedEntry = (decisionType: string, description: string, scope: string, evidenceRequired: string, exclusionReason: string): DecisionTypeEntry => ({
  decisionType,
  description,
  scope,
  evidenceRequired,
  algorithmAllowed: false,
  exclusionReason,
  automaticRequiresPreference: true,
  reviewCadence: 'periodic-human-check',
});

export const initialDecisionTypeRegistry: readonly DecisionTypeEntry[] = validateDecisionTypeRegistry([
  {
    decisionType: 'H1-source-admission',
    description: 'H1 Wondelai 25-file source-fidelity review and source admission under D18.',
    scope: 'one donor pilot: donor id, pinned revision, pilot id and file count',
    evidenceRequired: 'D18 panel evidence: three blind protocol outputs, orchestrator aggregation and source SHA-256 bindings',
    algorithmAllowed: true,
    exclusionReason: null,
    automaticRequiresPreference: true,
    reviewCadence: 'none',
  },
  excludedEntry('legal-rights-clearance', 'Legal-risk, rights or clearance decision reserved by D17.', 'per rights or clearance question', 'owner rights evidence and D17 attribution record', 'D17 reserves legal-risk, rights and clearance decisions to the human owner.'),
  excludedEntry('br09-authorization', 'Authorization for significant ambiguity with external or irreversible effect, security, scope or product-policy change under BR-09.', 'per authorization request', 'owner authorization record', 'BR-09 reserves this authorization to the human owner.'),
  excludedEntry('security-access-control', 'Secrets, credential, access-control or security-incident decision.', 'per security decision', 'security owner evidence', 'Security, credential and access-control decisions are never delegated.'),
  excludedEntry('destructive-operations', 'Destructive or irreversible operation, data deletion, or migration without rollback.', 'per operation', 'owner approval and rollback evidence', 'Destructive or irreversible operations without rollback stay human.'),
  excludedEntry('runtime-user-acceptance', 'Runtime acceptance, user acceptance, human UAT or human testing under SR-71 and BR-12.', 'per acceptance event', 'attributable human testing evidence', 'Runtime and user acceptance require attributable human testing.'),
]);

const canonicalExclusionFloor = new Map(
  initialDecisionTypeRegistry.filter(entry => !entry.algorithmAllowed).map(entry => [entry.decisionType, entry] as const),
);

// Canonical allowed floor: only decision types declared algorithmAllowed:true in
// initialDecisionTypeRegistry may reach offer/automatic evaluation. D19 requires
// an owner decision for new types, so a caller-supplied registry can add excluded
// types and metadata but can never create a new delegable type.
const canonicalAllowedTypes = new Set(
  initialDecisionTypeRegistry.filter(entry => entry.algorithmAllowed).map(entry => entry.decisionType),
);

export async function evaluateHumanLoopDecision(request: Readonly<{
  root: string;
  registry: readonly DecisionTypeEntry[];
  decisionType: string;
  scope: string;
  algorithm: AlgorithmIdentity;
  preferenceRefs: readonly ArtifactRef[];
}>): Promise<HumanLoopEvaluation> {
  validateDecisionTypeRegistry(request.registry);
  const floor = canonicalExclusionFloor.get(request.decisionType);
  if (floor !== undefined) {
    return Object.freeze({ kind: 'excluded', decisionType: request.decisionType, scope: request.scope, reason: floor.exclusionReason ?? 'algorithm delegation refused' });
  }
  const entry = request.registry.find(item => item.decisionType === request.decisionType);
  if (entry === undefined) {
    return Object.freeze({ kind: 'excluded', decisionType: request.decisionType, scope: request.scope, reason: `undeclared decision type: ${request.decisionType}` });
  }
  if (!entry.algorithmAllowed) {
    return Object.freeze({ kind: 'excluded', decisionType: request.decisionType, scope: request.scope, reason: entry.exclusionReason ?? 'algorithm delegation refused' });
  }
  if (!canonicalAllowedTypes.has(request.decisionType)) {
    return Object.freeze({ kind: 'excluded', decisionType: request.decisionType, scope: request.scope, reason: `decision type is not approved for algorithm delegation: ${request.decisionType}` });
  }
  const preferences: PreferenceBinding[] = [];
  for (const ref of request.preferenceRefs) {
    preferences.push({ ref, record: await readStandingPreference(request.root, ref) });
  }
  const active = preferences.filter(binding =>
    binding.record.revocation.state === 'active' &&
    binding.record.decisionType === request.decisionType &&
    binding.record.scope === request.scope);
  if (active.length > 1) {
    return Object.freeze({ kind: 'offer', decisionType: request.decisionType, scope: request.scope, matchReason: 'ambiguous-preferences', matches: Object.freeze([...active]) });
  }
  const only = active[0];
  if (only === undefined) {
    return Object.freeze({ kind: 'offer', decisionType: request.decisionType, scope: request.scope, matchReason: 'no-standing-preference', matches: Object.freeze([]) });
  }
  const stale = !samePreferenceAlgorithm(only.record, request.algorithm);
  if (stale) {
    return Object.freeze({ kind: 'offer', decisionType: request.decisionType, scope: request.scope, matchReason: 'stale-preference', matches: Object.freeze([only]) });
  }
  return Object.freeze({ kind: 'automatic', decisionType: request.decisionType, scope: request.scope, preference: only });
}

export async function evaluateAlgorithmDispatch(root: string, evaluation: HumanLoopEvaluation, algorithm: AlgorithmIdentity, decisionId: string, offerRef: ArtifactRef | null = null): Promise<AlgorithmDispatchEvaluation> {
  if (evaluation.kind === 'excluded') {
    return Object.freeze({ kind: 'owner-action', decisionType: evaluation.decisionType, scope: evaluation.scope, reason: evaluation.reason });
  }
  const expected: AlgorithmDecisionIdentity = { decisionId, decisionType: evaluation.decisionType, scope: evaluation.scope, algorithm };
  try {
    if (evaluation.kind === 'automatic') {
      await readAlgorithmBasis(root, expected, { kind: 'standing-preference', ref: evaluation.preference.ref });
      return Object.freeze({ kind: 'dispatch', decisionType: evaluation.decisionType, scope: evaluation.scope, basis: 'standing-preference' });
    }
    if (offerRef === null) {
      return Object.freeze({ kind: 'owner-action', decisionType: evaluation.decisionType, scope: evaluation.scope, reason: 'algorithm offer has no recorded delegation answer' });
    }
    await readAlgorithmBasis(root, expected, { kind: 'offer', ref: offerRef });
    return Object.freeze({ kind: 'dispatch', decisionType: evaluation.decisionType, scope: evaluation.scope, basis: 'offer' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const reason = message.startsWith('ALGORITHM_DELEGATION_INVALID: ') ? message.slice('ALGORITHM_DELEGATION_INVALID: '.length) : message;
    return Object.freeze({ kind: 'owner-action', decisionType: evaluation.decisionType, scope: evaluation.scope, reason });
  }
}

export function createStandingPreference(input: Readonly<{
  decisionType: string;
  scope: string;
  algorithm: AlgorithmIdentity;
  grantedBy: string;
  grantedAt: string;
  reviewCadence: ReviewCadence;
  pointer: string;
}>): StandingPreference {
  return parseStandingPreference({
    schema: 'VPStandingPreference/v1',
    decisionType: input.decisionType,
    scope: input.scope,
    algorithmVersion: input.algorithm.version,
    promptIdentity: input.algorithm.promptIdentity,
    evidencePolicy: input.algorithm.evidencePolicy,
    grantedBy: input.grantedBy,
    grantedAt: input.grantedAt,
    reviewCadence: input.reviewCadence,
    revocation: { state: 'active', nextEffectiveDecision: null, pointer: input.pointer },
  });
}

export function revokeStandingPreference(record: StandingPreference, input: Readonly<{ effectiveFromDecision: string; pointer: string }>): StandingPreference {
  check(record.revocation.state === 'active', 'preference is already revoked');
  return parseStandingPreference({ ...record, revocation: { state: 'revoked', nextEffectiveDecision: input.effectiveFromDecision, pointer: input.pointer } });
}

export function parseStandingPreference(value: unknown): StandingPreference {
  validate(value, standingPreferenceSchema);
  const record = value as StandingPreference;
  if (record.revocation.state === 'revoked') check(record.revocation.nextEffectiveDecision !== null, 'revoked preference lacks next effective decision');
  else check(record.revocation.nextEffectiveDecision === null, 'active preference carries next effective decision');
  return record;
}

export function parseOfferRecord(value: unknown): OfferRecord {
  validate(value, offerSchema);
  const record = value as OfferRecord;
  check((record.answer !== null) === (record.answeredBy !== null && record.answeredAt !== null), 'offer answer fields inconsistent');
  const matched = record.matchedPreferences.length;
  if (record.evaluation === 'excluded') {
    check(record.exclusionReason !== null && record.matchReason === null && matched === 0, 'excluded offer carries match data');
  } else if (record.evaluation === 'automatic') {
    check(record.exclusionReason === null && record.matchReason === null && matched === 1, 'automatic offer match binding');
  } else {
    check(record.exclusionReason === null && record.matchReason !== null, 'offer evaluation lacks match reason');
    if (record.matchReason === 'no-standing-preference') check(matched === 0, 'empty match carries preference artifacts');
    else if (record.matchReason === 'stale-preference') check(matched === 1, 'stale match must bind exactly one preference');
    else check(matched >= 2, 'ambiguous match needs at least two preferences');
  }
  if (record.evaluation === 'offer') {
    check(record.answer !== null, 'offer evaluation lacks user answer');
    if (record.answer === 'delegated-standing') check(record.standingPreference !== null, 'standing delegation lacks preference artifact');
    else check(record.standingPreference === null, 'non-standing answer carries preference artifact');
  } else {
    check(record.answer === null && record.answeredBy === null && record.answeredAt === null && record.standingPreference === null, 'non-offer evaluation carries an answer');
  }
  return record;
}

export function createOfferRecord(input: Readonly<{
  decisionType: string;
  scope: string;
  algorithm: AlgorithmIdentity;
  offer: Readonly<{ evidenceRequired: string; algorithmDecides: string; limits: string }>;
  evaluation: HumanLoopEvaluation;
  answer: Readonly<{ answer: OfferAnswer; answeredBy: string; answeredAt: string; standingPreference: ArtifactRef | null }> | null;
  recordedAt: string;
  pointer: string;
}>): OfferRecord {
  check(input.evaluation.decisionType === input.decisionType && input.evaluation.scope === input.scope, 'evaluation binding mismatch');
  const matchedPreferences = input.evaluation.kind === 'automatic'
    ? [input.evaluation.preference.ref]
    : input.evaluation.kind === 'offer'
      ? input.evaluation.matches.map(binding => binding.ref)
      : [];
  return parseOfferRecord({
    schema: 'VPAlgorithmOffer/v1',
    decisionType: input.decisionType,
    scope: input.scope,
    algorithm: { ...input.algorithm },
    offer: { ...input.offer },
    evaluation: input.evaluation.kind,
    exclusionReason: input.evaluation.kind === 'excluded' ? input.evaluation.reason : null,
    matchReason: input.evaluation.kind === 'offer' ? input.evaluation.matchReason : null,
    matchedPreferences,
    answer: input.answer?.answer ?? null,
    answeredBy: input.answer?.answeredBy ?? null,
    answeredAt: input.answer?.answeredAt ?? null,
    standingPreference: input.answer === null ? null : input.answer.standingPreference,
    recordedAt: input.recordedAt,
    pointer: input.pointer,
  });
}

async function readArtifactValue(root: string, ref: ArtifactRef): Promise<unknown> {
  const bytes = await verifyArtifact(root, ref);
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

export async function readStandingPreference(root: string, ref: ArtifactRef): Promise<StandingPreference> {
  return parseStandingPreference(await readArtifactValue(root, ref));
}

export async function sealStandingPreference(root: string, path: string, value: unknown): Promise<ArtifactRef> {
  parseStandingPreference(value);
  return sealArtifact(root, path, value);
}

export async function readOfferRecord(root: string, ref: ArtifactRef): Promise<OfferRecord> {
  return parseOfferRecord(await readArtifactValue(root, ref));
}

export async function sealOfferRecord(root: string, path: string, value: unknown): Promise<ArtifactRef> {
  parseOfferRecord(value);
  return sealArtifact(root, path, value);
}

export function parseAlgorithmDecisionOffer(value: unknown): AlgorithmDecisionOffer {
  validate(value, algorithmDecisionOfferSchema);
  const offer = value as AlgorithmDecisionOffer;
  const legacy: Record<string, unknown> = { ...(offer as unknown as Record<string, unknown>) };
  legacy.schema = 'VPAlgorithmOffer/v1';
  delete legacy.decisionId;
  parseOfferRecord(legacy);
  return offer;
}

export function createAlgorithmDecisionOffer(input: Readonly<{ decisionId: string } & Parameters<typeof createOfferRecord>[0]>): AlgorithmDecisionOffer {
  const legacy = createOfferRecord(input);
  return parseAlgorithmDecisionOffer({ ...legacy, schema: 'VPAlgorithmDecisionOffer/v1', decisionId: input.decisionId });
}

export async function readAlgorithmDecisionOffer(root: string, ref: ArtifactRef): Promise<AlgorithmDecisionOffer> {
  return parseAlgorithmDecisionOffer(await readArtifactValue(root, ref));
}

export async function sealAlgorithmDecisionOffer(root: string, path: string, value: unknown): Promise<ArtifactRef> {
  parseAlgorithmDecisionOffer(value);
  return sealArtifact(root, path, value);
}

async function readAlgorithmBasis(root: string, expected: AlgorithmDecisionIdentity, basis: AlgorithmDecisionBasis): Promise<AlgorithmDecisionOffer | StandingPreference> {
  if (basis.kind === 'offer') {
    const offer = await readAlgorithmDecisionOffer(root, basis.ref);
    check(offer.decisionId === expected.decisionId, 'offer decision binding mismatch');
    check(offer.decisionType === expected.decisionType && offer.scope === expected.scope && sameAlgorithm(offer.algorithm, expected.algorithm), 'offer binding mismatch');
    check(offer.evaluation === 'offer', 'offer basis is not an offered decision');
    check(offer.answer === 'delegated-once' || offer.answer === 'delegated-standing', 'offer answer does not delegate the decision');
    if (offer.answer === 'delegated-standing') {
      const standingPreference = offer.standingPreference;
      if (standingPreference === null) throw new Error('ALGORITHM_DELEGATION_INVALID: standing delegation lacks preference artifact');
      const preference = await readStandingPreference(root, standingPreference);
      check(preference.decisionType === expected.decisionType && preference.scope === expected.scope && samePreferenceAlgorithm(preference, expected.algorithm), 'standing preference binding mismatch');
      check(preference.revocation.state === 'active', 'standing preference is revoked');
    }
    return offer;
  }
  const preference = await readStandingPreference(root, basis.ref);
  check(preference.decisionType === expected.decisionType && preference.scope === expected.scope && samePreferenceAlgorithm(preference, expected.algorithm), 'standing preference binding mismatch');
  check(preference.revocation.state === 'active', 'standing preference is revoked');
  return preference;
}

function refKey(ref: ArtifactRef): string {
  return `${ref.path}\u0000${ref.sha256}`;
}
function sortedKeys(values: readonly string[]): string[] {
  return [...values].sort();
}
function sameArtifactRefs(left: readonly ArtifactRef[], right: readonly ArtifactRef[]): boolean {
  const leftKeys = sortedKeys(left.map(refKey));
  const rightKeys = sortedKeys(right.map(refKey));
  return leftKeys.length === rightKeys.length && leftKeys.every((key, index) => key === rightKeys[index]);
}
function protocolBindingKey(item: D18ProtocolEvidence): string {
  return `${item.protocol}\u0000${refKey(item.report)}`;
}
function sameProtocolBindings(left: readonly D18ProtocolEvidence[], right: readonly D18ProtocolEvidence[]): boolean {
  const leftKeys = sortedKeys(left.map(protocolBindingKey));
  const rightKeys = sortedKeys(right.map(protocolBindingKey));
  return leftKeys.length === rightKeys.length && leftKeys.every((key, index) => key === rightKeys[index]);
}
function sameBasis(left: AlgorithmDecisionBasis, right: AlgorithmDecisionBasis): boolean {
  return left.kind === right.kind && refKey(left.ref) === refKey(right.ref);
}
function sameDecisionResultValue(left: DecisionResultValue, right: DecisionResultValue): boolean {
  return left.outcome === right.outcome && sameArtifactRefs(left.refs, right.refs);
}
function parseProtocolEvidence(value: unknown): ProtocolEvidencePayload {
  validate(value, protocolEvidenceSchema);
  const payload = value as ProtocolEvidencePayload;
  check(payload.result.status === 'resolved' && payload.result.value !== null, 'D18 protocol result is unresolved or missing');
  return payload;
}
function parseAggregateEvidence(value: unknown): AggregateEvidencePayload {
  validate(value, aggregateEvidenceSchema);
  const payload = value as AggregateEvidencePayload;
  check(payload.result.status === 'resolved' && payload.result.value !== null, 'D18 aggregation result is unresolved or missing');
  return payload;
}

export function parseAlgorithmDecision(value: unknown): AlgorithmDecisionRecord {
  validate(value, algorithmDecisionSchema);
  const record = value as AlgorithmDecisionRecord;
  const protocols = new Set(record.protocols.map(item => item.protocol));
  check(protocols.size === d18ProtocolIds.length && d18ProtocolIds.every(protocol => protocols.has(protocol)), 'decision evidence lacks the three D18 protocols');
  check(new Set(record.protocols.map(item => refKey(item.report))).size === record.protocols.length, 'duplicate D18 protocol report');
  const refs = [record.basis.ref, record.aggregation, ...record.sourceRefs, ...record.protocols.map(item => item.report)];
  check(new Set(refs.map(refKey)).size === refs.length, 'decision evidence reuses an artifact ref');
  return record;
}

export async function sealAlgorithmDecision(root: string, path: string, value: unknown): Promise<ArtifactRef> {
  parseAlgorithmDecision(value);
  return sealArtifact(root, path, value);
}

export async function readAlgorithmDecision(root: string, ref: ArtifactRef): Promise<AlgorithmDecisionRecord> {
  return parseAlgorithmDecision(await readArtifactValue(root, ref));
}

export async function verifyAlgorithmDecision(root: string, ref: ArtifactRef, expected: AlgorithmDecisionExpected): Promise<AlgorithmDecisionVerification> {
  try {
    const record = await readAlgorithmDecision(root, ref);
    const mismatches: string[] = [];
    if (record.decisionId !== expected.decisionId) mismatches.push('decisionId');
    if (record.decisionType !== expected.decisionType) mismatches.push('decisionType');
    if (record.scope !== expected.scope) mismatches.push('scope');
    if (!sameAlgorithm(record.algorithm, expected.algorithm)) mismatches.push('algorithm');
    if (!sameArtifactRefs(record.sourceRefs, expected.sourceRefs)) mismatches.push('sourceRefs');
    if (!sameBasis(record.basis, expected.basis)) mismatches.push('basis');
    check(mismatches.length === 0, `decision binding mismatch: ${mismatches.join(', ')}`);
    const basis = await readAlgorithmBasis(root, record, record.basis);
    for (const sourceRef of record.sourceRefs) await verifyArtifact(root, sourceRef);
    const reviewers = new Set<string>();
    let expectedResult: DecisionResultValue | null = null;
    for (const protocol of record.protocols) {
      const payload = parseProtocolEvidence(await readArtifactValue(root, protocol.report));
      check(payload.protocol === protocol.protocol, `D18 ${protocol.protocol} report is mislabeled`);
      check(payload.decisionId === record.decisionId && payload.decisionType === record.decisionType && payload.scope === record.scope && sameAlgorithm(payload.algorithm, record.algorithm), `D18 ${protocol.protocol} decision binding mismatch`);
      check(sameArtifactRefs(payload.sourceRefs, record.sourceRefs), `D18 ${protocol.protocol} source refs mismatch`);
      const resultValue = payload.result.value;
      check(resultValue !== null, `D18 ${protocol.protocol} result is unresolved or missing`);
      if (expectedResult === null) expectedResult = resultValue;
      else check(sameDecisionResultValue(expectedResult, resultValue), `D18 ${protocol.protocol} result disagrees`);
      const reviewerKey = `${payload.reviewer.actor}\u0000${payload.reviewer.session}`;
      check(!reviewers.has(reviewerKey), 'D18 protocol reviewer identity is not distinct');
      reviewers.add(reviewerKey);
    }
    check(expectedResult !== null, 'D18 protocol results are missing');
    const aggregation = parseAggregateEvidence(await readArtifactValue(root, record.aggregation));
    check(aggregation.decisionId === record.decisionId && aggregation.decisionType === record.decisionType && aggregation.scope === record.scope && sameAlgorithm(aggregation.algorithm, record.algorithm), 'D18 aggregation decision binding mismatch');
    check(sameArtifactRefs(aggregation.sourceRefs, record.sourceRefs), 'D18 aggregation source refs mismatch');
    check(sameProtocolBindings(aggregation.protocols, record.protocols), 'D18 aggregation protocol refs mismatch');
    const aggregateResult = aggregation.result.value;
    check(aggregateResult !== null && sameDecisionResultValue(expectedResult, aggregateResult), 'D18 aggregation result disagrees');
    return Object.freeze({ kind: 'verified', record, basis });
  } catch (error) {
    return Object.freeze({ kind: 'rejected', reasons: Object.freeze([error instanceof Error ? error.message : String(error)]) });
  }
}
