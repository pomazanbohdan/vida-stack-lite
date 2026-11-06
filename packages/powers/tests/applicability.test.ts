import { describe, expect, test } from 'bun:test';
import {
  ApplicabilityError,
  evaluateApplicability,
  parseApplicability,
  parseApplicabilityContext,
  parseVersionRange,
  satisfiesVersion,
} from '../skills/vp-mode/scripts/applicability.ts';

const vocab = {
  runtimes: ['node', 'bun', 'deno'],
  platforms: ['web', 'ios', 'android'],
  accessibility: ['screen-reader', 'reduced-motion'],
};
const aliases = { frameworks: { reactjs: 'react' }, standards: { wcag2: 'WCAG' } };
const react18 = '{"frameworks":[{"name":"react","versionRange":{"raw":">=18.0.0 <20.0.0","comparators":[{"op":">=","version":"18.0.0"},{"op":"<","version":"20.0.0"}]},"sourceLabel":"React 18-19"}]}';

describe('parseApplicability', () => {
  test('parses the canonical example including stored comparators', () => {
    const value = parseApplicability(react18);
    expect(value.frameworks?.[0]?.name).toBe('react');
    expect(value.frameworks?.[0]?.versionRange?.comparators).toEqual([
      { op: '>=', version: '18.0.0' },
      { op: '<', version: '20.0.0' },
    ]);
  });

  test('rejects invalid JSON, empty objects and unknown fields', () => {
    for (const raw of ['not-json', '{}', '{"unknown":[]}']) {
      expect(() => parseApplicability(raw)).toThrow(ApplicabilityError);
    }
  });

  test('rejects duplicate framework names and empty fact arrays', () => {
    expect(() => parseApplicability('{"frameworks":[{"name":"react"},{"name":"react"}]}')).toThrow(ApplicabilityError);
    expect(() => parseApplicability('{"runtimes":[]}')).toThrow(ApplicabilityError);
  });

  test('rejects zero-major caret, bare partial versions and OR ranges', () => {
    for (const raw of ['{"frameworks":[{"name":"react","versionRange":{"raw":"^0.2.3"}}]}', '{"frameworks":[{"name":"react","versionRange":{"raw":"1.2"}}]}', '{"frameworks":[{"name":"react","versionRange":{"raw":">=1.0.0 || <2.0.0"}}]}']) {
      expect(() => parseApplicability(raw)).toThrow(ApplicabilityError);
    }
  });

  test('rejects malformed context tokens', () => {
    for (const token of ['react', 'framework:', 'framework:react:18', 'bogus:react']) {
      expect(() => parseApplicability(`{"requiredContext":["${token}"]}`)).toThrow(ApplicabilityError);
    }
  });

  test('accepts standard and optional context tokens and rejects duplicate optional tokens', () => {
    expect(parseApplicability('{"requiredContext":["standard:wcag"]}').requiredContext).toEqual(['standard:WCAG']);
    expect(parseApplicability('{"optionalContext":["platform:web"],"runtimes":[{"value":"node"}]}').optionalContext).toEqual(['platform:web']);
    expect(() => parseApplicability('{"optionalContext":["platform:web","platform:web"],"runtimes":[{"value":"node"}]}')).toThrow(ApplicabilityError);
  });

  test('rejects stored comparators that do not match the raw range', () => {
    const raw = '{"frameworks":[{"name":"react","versionRange":{"raw":">=18.0.0","comparators":[{"op":">=","version":"19.0.0"}]}}]}';
    expect(() => parseApplicability(raw)).toThrow(ApplicabilityError);
  });

  test('parses platform and accessibility facts', () => {
    expect(parseApplicability('{"platforms":[{"value":"web"}],"accessibility":[{"value":"screen-reader"}]}')).toEqual({
      platforms: [{ value: 'web' }],
      accessibility: [{ value: 'screen-reader' }],
    });
  });
});

describe('parseVersionRange', () => {
  test('normalizes exact, comparator, caret, tilde and wildcard forms', () => {
    expect(parseVersionRange('1.2.3').comparators).toEqual([{ op: '=', version: '1.2.3' }]);
    expect(parseVersionRange('>=1.2.3 <2.0.0').comparators).toEqual([
      { op: '>=', version: '1.2.3' },
      { op: '<', version: '2.0.0' },
    ]);
    expect(parseVersionRange('^1.2.3').comparators).toEqual([
      { op: '>=', version: '1.2.3' },
      { op: '<', version: '2.0.0' },
    ]);
    expect(parseVersionRange('~1.2.3').comparators).toEqual([
      { op: '>=', version: '1.2.3' },
      { op: '<', version: '1.3.0' },
    ]);
    expect(parseVersionRange('1.2.x').comparators).toEqual([
      { op: '>=', version: '1.2.0' },
      { op: '<', version: '1.3.0' },
    ]);
  });

  test('checks inclusive and exclusive boundaries', () => {
    const range = parseVersionRange('>=1.2.3 <2.0.0').comparators;
    expect(satisfiesVersion('1.2.3', range)).toBe(true);
    expect(satisfiesVersion('2.0.0', range)).toBe(false);
    expect(satisfiesVersion('1.2.2', range)).toBe(false);
  });

  test('evaluates equality, greater-than and less-or-equal comparators', () => {
    expect(satisfiesVersion('1.2.3', [{ op: '=', version: '1.2.3' }])).toBe(true);
    expect(satisfiesVersion('1.2.4', [{ op: '>', version: '1.2.3' }])).toBe(true);
    expect(satisfiesVersion('1.2.3', [{ op: '<=', version: '1.2.3' }])).toBe(true);
    expect(satisfiesVersion('1.2.4', [{ op: '<=', version: '1.2.3' }])).toBe(false);
  });

  test('expands the major-only wildcard and rejects malformed or oversized components', () => {
    expect(parseVersionRange('1.x').comparators).toEqual([
      { op: '>=', version: '1.0.0' },
      { op: '<', version: '2.0.0' },
    ]);
    expect(() => parseVersionRange('^1.2')).toThrow(ApplicabilityError);
    expect(() => parseVersionRange('^2147483648.0.0')).toThrow(ApplicabilityError);
    expect(() => satisfiesVersion('2147483648.0.0', [{ op: '=', version: '1.0.0' }])).toThrow(ApplicabilityError);
  });
});

describe('evaluateApplicability', () => {
  test('absent applicability is neutral', () => {
    expect(evaluateApplicability(undefined, undefined, vocab).state).toBe('applicable');
  });

  test('missing context is unresolved, not inapplicable', () => {
    const value = parseApplicability(react18);
    expect(evaluateApplicability(value, undefined, vocab).reason).toBe('required-context-missing');
  });

  test('matching framework and version is applicable', () => {
    const value = parseApplicability(react18);
    const context = parseApplicabilityContext({ frameworks: [{ name: 'react', version: '18.2.0' }] });
    expect(evaluateApplicability(value, context, vocab).state).toBe('applicable');
  });

  test('wrong framework or version is inapplicable', () => {
    const value = parseApplicability(react18);
    expect(evaluateApplicability(value, parseApplicabilityContext({ frameworks: [{ name: 'vue', version: '18.2.0' }] }), vocab).state).toBe('inapplicable');
    expect(evaluateApplicability(value, parseApplicabilityContext({ frameworks: [{ name: 'react', version: '17.0.0' }] }), vocab).state).toBe('inapplicable');
  });

  test('versionless supplied framework against a range is unresolved', () => {
    const value = parseApplicability(react18);
    expect(evaluateApplicability(value, parseApplicabilityContext({ frameworks: [{ name: 'react' }] }), vocab).reason).toBe('required-context-missing');
  });

  test('range-less framework matches by name alone', () => {
    const value = parseApplicability('{"frameworks":[{"name":"react"}]}');
    expect(evaluateApplicability(value, parseApplicabilityContext({ frameworks: [{ name: 'react', version: '99.0.0' }] }), vocab).state).toBe('applicable');
    expect(evaluateApplicability(value, parseApplicabilityContext({ frameworks: [{ name: 'react' }] }), vocab).state).toBe('applicable');
  });

  test('runtime absence and mismatch are distinct', () => {
    const value = parseApplicability('{"runtimes":[{"value":"node"}]}');
    expect(evaluateApplicability(value, parseApplicabilityContext({ platforms: ['web'] }), vocab).reason).toBe('required-context-missing');
    expect(evaluateApplicability(value, parseApplicabilityContext({ runtimes: ['bun'] }), vocab).state).toBe('inapplicable');
    expect(evaluateApplicability(value, parseApplicabilityContext({ runtimes: ['node'] }), vocab).state).toBe('applicable');
  });

  test('unknown vocabulary values are unresolved', () => {
    const value = parseApplicability('{"runtimes":[{"value":"node"}]}');
    expect(evaluateApplicability(value, parseApplicabilityContext({ runtimes: ['rust'] }), vocab).reason).toBe('unknown-context');
  });

  test('standards match exact id and version and require conformance when declared', () => {
    const value = parseApplicability('{"standards":[{"id":"WCAG","version":"2.2","conformance":"AA"}]}');
    expect(evaluateApplicability(value, parseApplicabilityContext({ standards: [{ id: 'WCAG', version: '2.2', conformance: 'AA' }] }), vocab).state).toBe('applicable');
    expect(evaluateApplicability(value, parseApplicabilityContext({ standards: [{ id: 'WCAG', version: '2.3', conformance: 'AA' }] }), vocab).state).toBe('inapplicable');
    expect(evaluateApplicability(value, parseApplicabilityContext({ standards: [{ id: 'WCAG', version: '2.2' }] }), vocab).reason).toBe('required-context-missing');
  });

  test('required context tokens are presence checks', () => {
    const value = parseApplicability('{"requiredContext":["framework:react"]}');
    expect(evaluateApplicability(value, parseApplicabilityContext({ frameworks: [{ name: 'react', version: '18.2.0' }] }), vocab, aliases).state).toBe('applicable');
    expect(evaluateApplicability(value, parseApplicabilityContext({ frameworks: [{ name: 'vue', version: '3.0.0' }] }), vocab, aliases).state).toBe('inapplicable');
  });

  test('standard and non-framework required tokens distinguish absence, mismatch and presence', () => {
    const standard = parseApplicability('{"requiredContext":["standard:WCAG"]}');
    expect(evaluateApplicability(standard, parseApplicabilityContext({ standards: [{ id: 'WCAG', version: '2.2' }] }), vocab).state).toBe('applicable');
    expect(evaluateApplicability(standard, parseApplicabilityContext({ platforms: ['web'] }), vocab).reason).toBe('required-context-missing');
    expect(evaluateApplicability(standard, parseApplicabilityContext({ standards: [{ id: 'ISO', version: '1.0.0' }] }), vocab).state).toBe('inapplicable');

    const runtime = parseApplicability('{"requiredContext":["runtime:node"]}');
    expect(evaluateApplicability(runtime, parseApplicabilityContext({ runtimes: ['node'] }), vocab).state).toBe('applicable');
    expect(evaluateApplicability(runtime, parseApplicabilityContext({ platforms: ['web'] }), vocab).reason).toBe('required-context-missing');
    expect(evaluateApplicability(runtime, parseApplicabilityContext({ runtimes: ['bun'] }), vocab).state).toBe('inapplicable');
  });

  test('duplicate supplied context is a conflict', () => {
    const value = parseApplicability('{"runtimes":[{"value":"node"}]}');
    expect(evaluateApplicability(value, parseApplicabilityContext({ runtimes: ['node', 'node'] }), vocab).reason).toBe('context-conflict');
  });

  test('malformed supplied version is unparsed', () => {
    const value = parseApplicability(react18);
    expect(evaluateApplicability(value, parseApplicabilityContext({ frameworks: [{ name: 'react', version: '18' }] }), vocab).reason).toBe('unparsed-version');
  });

  test('empty supplied arrays are a request-format error', () => {
    expect(() => parseApplicabilityContext({ runtimes: [] })).toThrow(ApplicabilityError);
  });

  test('normalizes accessibility context values', () => {
    expect(parseApplicabilityContext({ accessibility: ['screen-reader'] }).accessibility).toEqual(['screen-reader']);
  });

  test('parses a full context with every dimension', () => {
    expect(parseApplicabilityContext({
      frameworks: [{ name: 'react', version: '18.2.0' }],
      runtimes: ['node'],
      platforms: ['web'],
      standards: [{ id: 'WCAG', version: '2.2', conformance: 'AA' }],
      accessibility: ['screen-reader'],
    })).toEqual({
      frameworks: [{ name: 'react', version: '18.2.0' }],
      runtimes: ['node'],
      platforms: ['web'],
      standards: [{ id: 'WCAG', version: '2.2', conformance: 'AA' }],
      accessibility: ['screen-reader'],
    });
  });
});
