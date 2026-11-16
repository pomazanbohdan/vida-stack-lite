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
  const stale = only.record.algorithmVersion !== request.algorithm.version ||
    only.record.promptIdentity !== request.algorithm.promptIdentity ||
    only.record.evidencePolicy !== request.algorithm.evidencePolicy;
  if (stale) {
    return Object.freeze({ kind: 'offer', decisionType: request.decisionType, scope: request.scope, matchReason: 'stale-preference', matches: Object.freeze([only]) });
  }
  return Object.freeze({ kind: 'automatic', decisionType: request.decisionType, scope: request.scope, preference: only });
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
