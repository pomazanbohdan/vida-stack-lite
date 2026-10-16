import { expect, test } from 'bun:test';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import type {
  ResearchResult,
  ResearchResultRef,
  ResearchSourceRef,
  ResearchSynthesis,
} from '../src/research-decision.ts';
import {
  validateSynthesisExternalValidationForResults,
  validateSynthesisReferencesForResults,
} from '../src/research-decision.ts';
import {
  qualifyLegacySynthesisRecord,
  qualifiedResearchSourceCatalog,
  resolveQualifiedResearchSource,
} from '../src/research-source-catalog.ts';
import { synthesisSourceCatalog } from '../src/orchestration/observed-synthesis-result.ts';
import { expectReturned } from './helpers/expect-rejection.ts';

const source = (sourceId: string, locator: string, claim: string): ResearchSourceRef => ({
  source_id: sourceId,
  source_kind: 'internal',
  locator,
  title: sourceId,
  claim,
  retrieved_at: '2026-01-01T00:00:00Z',
});

const result = (resultId: string, digest: string, sourceRefs: readonly ResearchSourceRef[]): ResearchResult => ({
  schema: 'ResearchResult/v1',
  result_id: resultId,
  work_item_id: 'work-1',
  source_revision: 'revision-1',
  scope_id: 'scope-1',
  contour: 'research',
  topic: 'bounded research',
  objective: 'answer the research question',
  question: 'What is true?',
  source_refs: sourceRefs,
  findings: [],
  uncertainties: [],
  conflicts: [],
  evidence_classes: [],
  br_ids: [],
  sr_ids: [],
  ac_ids: [],
  gap_ids: [],
  options: [],
  recommendation: null,
  completeness: {
    status: 'pass',
    required_questions: [],
    answered_questions: [],
    missing_questions: [],
    material_gaps: [],
    external_validation: {
      required: false,
      source_count: 0,
      minimum_sources: 0,
      status: 'not_required',
    },
  },
  readiness: 'ready',
  instruction_activation: {
    use_id: 'use-1',
    risk: 'low',
    phase: 'trace',
    lane: 'research',
    trigger: 'research_intent',
    required_instruction_ids: [],
    instruction_ids: [],
    registry_digest: '0'.repeat(64),
    source_digests: [],
  },
  actor: 'test',
  pointer: 'test://research-result',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  digest,
});

const reference = (resultId: string, digest: string): ResearchResultRef => ({ result_id: resultId, digest });

const synthesis = (
  resultRefs: readonly ResearchResultRef[],
  externalValidation: ResearchSynthesis['completeness']['external_validation'],
): ResearchSynthesis => ({
  schema: 'ResearchSynthesis/v1',
  bundle_id: 'bundle-1',
  work_item_id: 'work-1',
  source_revision: 'revision-1',
  scope_id: 'scope-1',
  topic: 'bounded research',
  result_refs: resultRefs,
  findings: [],
  uncertainties: [],
  conflicts: [],
  br_ids: [],
  sr_ids: [],
  ac_ids: [],
  gap_ids: [],
  options: [],
  recommendation: null,
  completeness: {
    status: 'pass',
    required_questions: [],
    answered_questions: [],
    missing_questions: [],
    material_gaps: [],
    external_validation: externalValidation,
  },
  readiness: 'ready',
  instruction_activation: {
    use_id: 'use-1',
    risk: 'low',
    phase: 'trace',
    lane: 'research',
    trigger: 'research_intent',
    required_instruction_ids: [],
    instruction_ids: [],
    registry_digest: '0'.repeat(64),
    source_digests: [],
  },
  actor: 'test',
  pointer: 'test://research-synthesis',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  digest: '0'.repeat(64),
});

test('qualified citations bind local aliases to exact sorted predecessor results', () => {
  const refs = [reference('a-b', '1'.repeat(64)), reference('a.b', '2'.repeat(64)), reference('a_b', '3'.repeat(64))];
  const results = [
    result('a_b', refs[2]!.digest, [source('business', 'current.md#L215', 'current claim')]),
    result('a-b', refs[0]!.digest, [source('business', 'current.md#L197', 'prior claim')]),
    result('a.b', refs[1]!.digest, [source('sys:form', 'form.js#L2', 'form claim')]),
  ];
  const catalog = expectReturned(() => qualifiedResearchSourceCatalog(refs, results));
  expect(Array.isArray(catalog)).toBe(true);
  expect(catalog.map((entry) => entry.key)).toEqual(['r0:business', 'r1:sys:form', 'r2:business']);
  const prior = expectReturned(() => resolveQualifiedResearchSource(catalog, 'r0:business'));
  expect(prior).toEqual({
    key: 'r0:business',
    result_id: 'a-b',
    result_digest: refs[0]!.digest,
    source: source('business', 'current.md#L197', 'prior claim'),
  });
  const current = expectReturned(() => resolveQualifiedResearchSource(catalog, 'r2:business'));
  expect(current).toEqual({
    key: 'r2:business',
    result_id: 'a_b',
    result_digest: refs[2]!.digest,
    source: source('business', 'current.md#L215', 'current claim'),
  });
  const qualified = expectReturned(() => resolveQualifiedResearchSource(catalog, 'r1:sys:form'));
  expect(qualified).toEqual({
    key: 'r1:sys:form',
    result_id: 'a.b',
    result_digest: refs[1]!.digest,
    source: source('sys:form', 'form.js#L2', 'form claim'),
  });
  for (const invalid of ['business', 'r9:business', 'r01:business', 'r1:business'])
    expect(() => resolveQualifiedResearchSource(catalog, invalid)).toThrow();
  expect(() => resolveQualifiedResearchSource([...catalog, catalog[0]!], 'r0:business')).toThrow(
    'unknown or ambiguous',
  );
  expect(() => qualifiedResearchSourceCatalog([], [])).toThrow('predecessor set is missing');
  expect(() =>
    qualifiedResearchSourceCatalog(
      [reference('a-b', refs[0]!.digest), reference('a-b', refs[0]!.digest)],
      [results[0]!, results[0]!],
    ),
  ).toThrow('predecessor set is missing');
  expect(() => qualifiedResearchSourceCatalog([...refs].reverse(), results)).toThrow();
  expect(() => qualifiedResearchSourceCatalog(refs, results.slice(1))).toThrow();
  expect(() =>
    qualifiedResearchSourceCatalog(refs, [...results.slice(0, 2), result('a-b', refs[0]!.digest, [])]),
  ).toThrow();
  expect(() =>
    qualifiedResearchSourceCatalog(refs, [result('a_b', '4'.repeat(64), results[0]!.source_refs), ...results.slice(1)]),
  ).toThrow();
});

test('explicit repair qualifies only legacy citations with one exact provenance', () => {
  const results = [
    result('research-a', '1'.repeat(64), [source('business', 'requirements.md#L197', 'old claim')]),
    result('research-b', '2'.repeat(64), [source('system', 'spec.js#L2', 'system claim')]),
    result('research-c', '3'.repeat(64), [source('registry', 'registry.js', 'registry claim')]),
  ];
  const refs = results.map(({ result_id, digest }) => reference(result_id, digest));
  const catalog = expectReturned(() => qualifiedResearchSourceCatalog(refs, results));
  expect(Array.isArray(catalog)).toBe(true);
  const old = {
    digest: '0'.repeat(64),
    result_refs: refs,
    findings: [{ source_refs: ['business'] }],
    conflicts: [{ source_refs: ['business', 'system'] }],
    options: [{ evidence_refs: ['registry'] }],
    recommendation: { evidence_refs: ['system'] },
  };
  const original = structuredClone(old);
  const repaired = expectReturned(() => qualifyLegacySynthesisRecord(old, catalog));
  expect(typeof repaired.digest).toBe('string');
  expect(Array.isArray(repaired.findings)).toBe(true);
  expect(Array.isArray(repaired.conflicts)).toBe(true);
  expect(Array.isArray(repaired.options)).toBe(true);
  expect(repaired.findings[0]?.source_refs).toEqual(['r0:business']);
  expect(repaired.conflicts[0]?.source_refs).toEqual(['r0:business', 'r1:system']);
  expect(repaired.options[0]?.evidence_refs).toEqual(['r2:registry']);
  expect(repaired.recommendation?.evidence_refs).toEqual(['r1:system']);
  expect(repaired.digest).not.toBe(old.digest);
  const { digest, ...qualifiedBody } = repaired;
  expect(digest).toBe(canonicalJsonDigest(qualifiedBody));
  expect(old).toEqual(original);
  const conflict = expectReturned(() =>
    qualifiedResearchSourceCatalog(refs, [
      ...results.slice(0, 2),
      result('research-c', refs[2]!.digest, [source('business', 'requirements.md#L215', 'new claim')]),
    ]),
  );
  expect(Array.isArray(conflict)).toBe(true);
  expect(() => qualifyLegacySynthesisRecord(old, conflict)).toThrow('conflicting provenance');
  expect(old).toEqual(original);
  const unresolved = {
    ...old,
    findings: [{ source_refs: ['unrecorded-source'] }],
  };
  const unresolvedOriginal = structuredClone(unresolved);
  expect(() => qualifyLegacySynthesisRecord(unresolved, catalog)).toThrow('legacy citation has no predecessor source');
  expect(unresolved).toEqual(unresolvedOriginal);
  const withoutRecommendation = { ...old, recommendation: null };
  expect(qualifyLegacySynthesisRecord(withoutRecommendation, catalog).recommendation).toBeNull();
});

test('three colliding predecessor aliases require exact qualified citations before a report can commit', () => {
  const results = [
    result('research-a', '1'.repeat(64), [
      source('business', 'requirements.md#L197', 'old business'),
      source('system', 'spec.js#branch', 'old system'),
    ]),
    result('research-b', '2'.repeat(64), [source('registry', 'registry.js', 'registry')]),
    result('research-c', '3'.repeat(64), [
      source('business', 'requirements.md#L215', 'current business'),
      source('system', 'spec.js', 'current system'),
    ]),
  ];
  const refs = results.map(({ result_id, digest }) => reference(result_id, digest));
  const value = {
    ...synthesis(refs, { required: false, source_count: 0, minimum_sources: 0, status: 'not_required' }),
    findings: [
      {
        finding_id: 'finding-1',
        statement: 'bounded finding',
        evidence_class: 'Code' as const,
        status: 'confirmed' as const,
        source_refs: ['r0:business', 'r2:business'],
      },
    ],
    conflicts: [
      {
        conflict_id: 'conflict-1',
        statement: 'bounded conflict',
        status: 'open' as const,
        source_refs: ['r0:system', 'r2:system'],
      },
    ],
    options: [
      { option_id: 'option-1', label: 'Option', description: 'Evidence-backed option', evidence_refs: ['r1:registry'] },
    ],
    recommendation: {
      option_id: 'option-1',
      rationale: 'Supported by current evidence',
      evidence_refs: ['r2:business'],
    },
  } satisfies ResearchSynthesis;
  const catalog = expectReturned(() => qualifiedResearchSourceCatalog(refs, results));
  expect(Array.isArray(catalog)).toBe(true);
  expect(catalog.map(({ key }) => key)).toEqual([
    'r0:business',
    'r0:system',
    'r1:registry',
    'r2:business',
    'r2:system',
  ]);
  expect(() => validateSynthesisReferencesForResults(value, results)).not.toThrow();
  expect(() => validateSynthesisExternalValidationForResults(value, results)).not.toThrow();
  const unqualified = {
    ...value,
    findings: [{ ...value.findings[0]!, source_refs: ['business'] }],
  } satisfies ResearchSynthesis;
  expect(() => validateSynthesisReferencesForResults(unqualified, results)).toThrow('unknown or unqualified');
  try {
    validateSynthesisReferencesForResults(unqualified, results);
    throw new Error('unqualified reference unexpectedly accepted');
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(Error);
    if (!(error instanceof Error) || !('code' in error)) throw error;
    expect(error.code).toBe('GAP-RESEARCH-REFERENCE-001');
  }
  const unknown = {
    ...value,
    findings: [{ ...value.findings[0]!, source_refs: ['r9:business'] }],
  } satisfies ResearchSynthesis;
  expect(() => validateSynthesisReferencesForResults(unknown, results)).toThrow('unknown or unqualified');
  const unsorted = { ...value, result_refs: [...refs].reverse() } satisfies ResearchSynthesis;
  expect(() => validateSynthesisReferencesForResults(unsorted, results)).toThrow('catalog is invalid');
  const summary = JSON.stringify({
    ...value,
    schema: 'VidaSynthesisObservationOutput/v1',
    statement: 'x'.repeat(2200),
  });
  expect(summary.length).toBeLessThan(4096);
});

test('synthesis issues a sorted catalog bound to each exact predecessor digest', () => {
  const predecessors = [
    result('z-result', '2'.repeat(64), [source('local', 'z.md#L1', 'later predecessor')]),
    result('a-result', '1'.repeat(64), [source('local', 'a.md#L1', 'earlier predecessor')]),
  ];
  const catalog = synthesisSourceCatalog(predecessors);
  expect(catalog.result_refs).toEqual([
    { result_id: 'a-result', digest: '1'.repeat(64) },
    { result_id: 'z-result', digest: '2'.repeat(64) },
  ]);
  expect(catalog.sources).toEqual([
    { key: 'r0:local', locator: 'a.md#L1', claim: 'earlier predecessor', source_kind: 'internal' },
    { key: 'r1:local', locator: 'z.md#L1', claim: 'later predecessor', source_kind: 'internal' },
  ]);
});

test('shared official citations retain qualified aliases and count unique external support', () => {
  const sources: readonly ResearchSourceRef[] = [
    {
      source_id: 'official-a',
      source_kind: 'external',
      locator: 'https://example.org/a',
      title: 'Official A',
      claim: 'official claim A',
      retrieved_at: '2026-01-01T00:00:00Z',
      independence_group: 'group-a',
    },
    {
      source_id: 'official-b',
      source_kind: 'external',
      locator: 'https://example.org/b',
      title: 'Official B',
      claim: 'official claim B',
      retrieved_at: '2026-01-01T00:00:00Z',
      independence_group: 'group-b',
    },
  ];
  const results = [result('one', '1'.repeat(64), sources), result('two', '2'.repeat(64), sources)];
  const references = results.map((entry) => reference(entry.result_id, entry.digest));
  const value = {
    ...synthesis(references, {
      required: true,
      status: 'pass',
      source_count: 2,
      minimum_sources: 2,
      live_check: false,
    }),
    findings: [
      {
        finding_id: 'finding-1',
        statement: 'External support',
        evidence_class: 'Code' as const,
        status: 'confirmed' as const,
        source_refs: ['r0:official-a', 'r1:official-a'],
      },
    ],
  } satisfies ResearchSynthesis;
  const catalog = expectReturned(() => qualifiedResearchSourceCatalog(references, results));
  expect(Array.isArray(catalog)).toBe(true);
  expect(catalog.map((entry) => entry.key)).toEqual([
    'r0:official-a',
    'r0:official-b',
    'r1:official-a',
    'r1:official-b',
  ]);
  expect(() => validateSynthesisReferencesForResults(value, results)).not.toThrow();
  expect(() => validateSynthesisExternalValidationForResults(value, results)).not.toThrow();
  const inflatedCount = {
    ...value,
    completeness: {
      ...value.completeness,
      external_validation: { ...value.completeness.external_validation, source_count: 4 },
    },
  } satisfies ResearchSynthesis;
  expect(() => validateSynthesisExternalValidationForResults(inflatedCount, results)).toThrow('source_count');
  const conflicting = [
    results[0]!,
    result('two', '2'.repeat(64), [{ ...sources[0]!, independence_group: 'inflated-group' }, sources[1]!]),
  ];
  expect(() => validateSynthesisExternalValidationForResults(value, conflicting)).toThrow('conflicting independence');
  const oneGroup = results.map((entry) => ({
    ...entry,
    source_refs: entry.source_refs.map((researchSource) => ({ ...researchSource, independence_group: 'one-group' })),
  }));
  expect(() => validateSynthesisExternalValidationForResults(value, oneGroup)).toThrow('independent source groups');
  expect(() =>
    validateSynthesisReferencesForResults(value, [
      result('one', '1'.repeat(64), [sources[0]!, sources[0]!]),
      results[1]!,
    ]),
  ).toThrow('catalog is invalid');
});
