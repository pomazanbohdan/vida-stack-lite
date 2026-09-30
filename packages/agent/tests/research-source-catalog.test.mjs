import { test, expect } from 'bun:test';
import {
  qualifiedResearchSourceCatalog,
  resolveQualifiedResearchSource,
  qualifyLegacySynthesisRecord,
} from '../src/research-source-catalog.ts';
import {
  validateSynthesisReferencesForResults,
  validateSynthesisExternalValidationForResults,
} from '../src/research-decision.ts';

const source = (source_id, locator, claim) => ({ source_id, source_kind: 'internal', locator, claim });
const result = (result_id, digest, source_refs) => ({ result_id, digest, source_refs });

test('qualified citations bind local aliases to exact sorted predecessor results', () => {
  const refs = [
    { result_id: 'a-b', digest: '1'.repeat(64) },
    { result_id: 'a.b', digest: '2'.repeat(64) },
    { result_id: 'a_b', digest: '3'.repeat(64) },
  ];
  const results = [
    result('a_b', refs[2].digest, [source('business', 'current.md#L215', 'current claim')]),
    result('a-b', refs[0].digest, [source('business', 'current.md#L197', 'prior claim')]),
    result('a.b', refs[1].digest, [source('sys:form', 'form.js#L2', 'form claim')]),
  ];
  const catalog = qualifiedResearchSourceCatalog(refs, results);
  expect(catalog.map((entry) => entry.key)).toEqual(['r0:business', 'r1:sys:form', 'r2:business']);
  expect(resolveQualifiedResearchSource(catalog, 'r0:business').source.locator).toBe('current.md#L197');
  expect(resolveQualifiedResearchSource(catalog, 'r2:business').source.claim).toBe('current claim');
  expect(resolveQualifiedResearchSource(catalog, 'r1:sys:form').result_digest).toBe(refs[1].digest);
  for (const invalid of ['business', 'r9:business', 'r01:business', 'r1:business'])
    expect(() => resolveQualifiedResearchSource(catalog, invalid)).toThrow();
  expect(() => qualifiedResearchSourceCatalog([...refs].reverse(), results)).toThrow();
  expect(() => qualifiedResearchSourceCatalog(refs, results.slice(1))).toThrow();
  expect(() =>
    qualifiedResearchSourceCatalog(refs, [...results.slice(0, 2), result('a-b', refs[0].digest, [])]),
  ).toThrow();
  expect(() =>
    qualifiedResearchSourceCatalog(refs, [result('a_b', '4'.repeat(64), results[0].source_refs), ...results.slice(1)]),
  ).toThrow();
});

test('explicit repair qualifies only legacy citations with one exact provenance', () => {
  const results = [
    result('research-a', '1'.repeat(64), [source('business', 'requirements.md#L197', 'old claim')]),
    result('research-b', '2'.repeat(64), [source('system', 'spec.js#L2', 'system claim')]),
    result('research-c', '3'.repeat(64), [source('registry', 'registry.js', 'registry claim')]),
  ];
  const refs = results.map(({ result_id, digest }) => ({ result_id, digest }));
  const catalog = qualifiedResearchSourceCatalog(refs, results);
  const old = {
    digest: '0'.repeat(64),
    result_refs: refs,
    findings: [{ source_refs: ['business'] }],
    conflicts: [{ source_refs: ['business', 'system'] }],
    options: [{ evidence_refs: ['registry'] }],
    recommendation: { evidence_refs: ['system'] },
  };
  const repaired = qualifyLegacySynthesisRecord(old, catalog);
  expect(repaired.findings[0].source_refs).toEqual(['r0:business']);
  expect(repaired.conflicts[0].source_refs).toEqual(['r0:business', 'r1:system']);
  expect(repaired.options[0].evidence_refs).toEqual(['r2:registry']);
  expect(repaired.recommendation.evidence_refs).toEqual(['r1:system']);
  expect(repaired.digest).not.toBe(old.digest);
  expect(old.findings[0].source_refs).toEqual(['business']);
  const conflict = qualifiedResearchSourceCatalog(refs, [
    ...results.slice(0, 2),
    result('research-c', refs[2].digest, [source('business', 'requirements.md#L215', 'new claim')]),
  ]);
  expect(() => qualifyLegacySynthesisRecord(old, conflict)).toThrow('conflicting provenance');
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
  const refs = results.map(({ result_id, digest }) => ({ result_id, digest }));
  const catalog = qualifiedResearchSourceCatalog(refs, results);
  const synthesis = {
    result_refs: refs,
    topic: '3Mob restoration',
    instruction_activation: { trigger: 'research_intent' },
    findings: [{ source_refs: ['r0:business', 'r2:business'] }],
    conflicts: [{ source_refs: ['r0:system', 'r2:system'] }],
    options: [{ evidence_refs: ['r1:registry'] }],
    recommendation: { evidence_refs: ['r2:business'] },
    completeness: { external_validation: { required: false, source_count: 0, status: 'not_required' } },
  };
  expect(catalog.map(({ key }) => key)).toEqual([
    'r0:business',
    'r0:system',
    'r1:registry',
    'r2:business',
    'r2:system',
  ]);
  expect(() => validateSynthesisReferencesForResults(synthesis, results)).not.toThrow();
  expect(() => validateSynthesisExternalValidationForResults(synthesis, results)).not.toThrow();
  expect(() =>
    validateSynthesisReferencesForResults({ ...synthesis, findings: [{ source_refs: ['business'] }] }, results),
  ).toThrow('unknown or unqualified');
  try {
    validateSynthesisReferencesForResults({ ...synthesis, findings: [{ source_refs: ['business'] }] }, results);
    throw new Error('unqualified reference unexpectedly accepted');
  } catch (error) {
    expect(error.code).toBe('GAP-RESEARCH-REFERENCE-001');
  }
  expect(() =>
    validateSynthesisReferencesForResults({ ...synthesis, findings: [{ source_refs: ['r9:business'] }] }, results),
  ).toThrow('unknown or unqualified');
  expect(() =>
    validateSynthesisReferencesForResults({ ...synthesis, result_refs: [...refs].reverse() }, results),
  ).toThrow('catalog is invalid');
  const summary = JSON.stringify({
    schema: 'VidaSynthesisObservationOutput/v1',
    ...synthesis,
    statement: 'x'.repeat(2200),
  });
  expect(summary.length).toBeLessThan(4096);
});

test('shared official citations retain qualified aliases and count unique external support', () => {
  const sources = [
    {
      source_id: 'official-a',
      source_kind: 'external',
      locator: 'https://example.org/a',
      independence_group: 'group-a',
    },
    {
      source_id: 'official-b',
      source_kind: 'external',
      locator: 'https://example.org/b',
      independence_group: 'group-b',
    },
  ];
  const results = [result('one', '1'.repeat(64), sources), result('two', '2'.repeat(64), sources)];
  const references = results.map((entry) => ({ result_id: entry.result_id, digest: entry.digest }));
  const synthesis = {
    result_refs: references,
    topic: 'bounded research',
    instruction_activation: { trigger: 'research_intent' },
    findings: [{ source_refs: ['r0:official-a', 'r1:official-a'] }],
    conflicts: [],
    options: [],
    recommendation: null,
    completeness: {
      external_validation: { required: true, status: 'pass', source_count: 2, minimum_sources: 2, live_check: false },
    },
  };
  expect(qualifiedResearchSourceCatalog(references, results).map((entry) => entry.key)).toEqual([
    'r0:official-a',
    'r0:official-b',
    'r1:official-a',
    'r1:official-b',
  ]);
  expect(() => validateSynthesisReferencesForResults(synthesis, results)).not.toThrow();
  expect(() => validateSynthesisExternalValidationForResults(synthesis, results)).not.toThrow();
  expect(() =>
    validateSynthesisExternalValidationForResults(
      {
        ...synthesis,
        completeness: { external_validation: { ...synthesis.completeness.external_validation, source_count: 4 } },
      },
      results,
    ),
  ).toThrow('source_count');
  const conflicting = [
    results[0],
    result('two', '2'.repeat(64), [{ ...sources[0], independence_group: 'inflated-group' }, sources[1]]),
  ];
  expect(() => validateSynthesisExternalValidationForResults(synthesis, conflicting)).toThrow(
    'conflicting independence',
  );
  const oneGroup = results.map((entry) => ({
    ...entry,
    source_refs: entry.source_refs.map((source) => ({ ...source, independence_group: 'one-group' })),
  }));
  expect(() => validateSynthesisExternalValidationForResults(synthesis, oneGroup)).toThrow('independent source groups');
  expect(() =>
    validateSynthesisReferencesForResults(synthesis, [
      result('one', '1'.repeat(64), [sources[0], sources[0]]),
      results[1],
    ]),
  ).toThrow('catalog is invalid');
});
