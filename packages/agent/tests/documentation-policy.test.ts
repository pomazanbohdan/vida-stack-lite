import { expect, test } from 'bun:test';
import fc from 'fast-check';
import {
  documentationRelativePath,
  validateDocumentationPolicy,
  type DocumentationPolicy,
} from '../src/documentation/policy.ts';

const basePolicy = (): DocumentationPolicy => ({
  schema: 'DocumentationPolicy/v1',
  policy_id: 'policy-main',
  project_id: 'project-main',
  source_path: 'docs/SPEC.md',
  owner: 'team-docs',
  required: true,
  canonical_roots: [],
  map_paths: [],
  excluded_roots: [],
  changelog_required: false,
  relations: [],
  updated_at: '2026-10-11T12:30:00.000Z',
});

test('documentation paths preserve safe repository-relative spellings', () => {
  for (const path of ['docs/SPEC.md', 'a b/100%/file-name.md', '日本語/概要.md'])
    expect(documentationRelativePath(path)).toBe(path);
});

test('documentation paths reject unsafe and non-string boundary values', () => {
  for (const path of [
    '',
    '/docs/SPEC.md',
    '//server/share',
    'C:docs/SPEC.md',
    'C:/docs/SPEC.md',
    '../docs/SPEC.md',
    'docs/../SPEC.md',
    'docs/./SPEC.md',
    'docs//SPEC.md',
    'docs/',
    'docs\\SPEC.md',
  ])
    expect(() => documentationRelativePath(path)).toThrow('documentation path is not safe');
  // @ts-expect-error The validator is public to untyped JSON callers at runtime.
  expect(() => documentationRelativePath(17)).toThrow('documentation path is not safe');
});

test('validates zero, one and many optional path collection entries', () => {
  const zero = basePolicy();
  expect(validateDocumentationPolicy(zero, zero.source_path).canonical_roots).toEqual([]);
  const one = { ...basePolicy(), canonical_roots: ['docs'] };
  expect(validateDocumentationPolicy(one, one.source_path).canonical_roots).toEqual(['docs']);
  const many = {
    ...basePolicy(),
    canonical_roots: ['docs', 'guides'],
    map_paths: ['docs/MAP.md', 'guides/MAP.md'],
    excluded_roots: ['docs/archive', 'guides/drafts'],
    relations: ['owns', 'documents'] as DocumentationPolicy['relations'],
  };
  expect(validateDocumentationPolicy(many, many.source_path)).toMatchObject(many);
});

test('enforces the exact v1 schema, field types and source binding', () => {
  const valid = basePolicy();
  expect(() => validateDocumentationPolicy({ ...valid, extra: true }, valid.source_path)).toThrow('schema invalid');
  expect(() => validateDocumentationPolicy({ ...valid, schema: 'DocumentationPolicy/v2' }, valid.source_path)).toThrow(
    'schema invalid',
  );
  expect(() => validateDocumentationPolicy({ ...valid, owner: 3 }, valid.source_path)).toThrow('schema invalid');
  expect(() => validateDocumentationPolicy({ ...valid, relations: ['owns', 'unknown'] }, valid.source_path)).toThrow(
    'schema invalid',
  );
  expect(() => validateDocumentationPolicy({ ...valid, relations: ['owns', 'owns'] }, valid.source_path)).toThrow(
    'schema invalid',
  );
  expect(() => validateDocumentationPolicy({ ...valid, canonical_roots: ['docs', 'docs'] }, valid.source_path)).toThrow(
    'schema invalid',
  );
  const missing: Record<string, unknown> = { ...valid };
  delete missing.owner;
  expect(() => validateDocumentationPolicy(missing, valid.source_path)).toThrow('schema invalid');
  expect(() => validateDocumentationPolicy(valid, 'docs/OTHER.md')).toThrow('source path differs');
  expect(() => validateDocumentationPolicy(valid, '../docs/SPEC.md')).toThrow('documentation path is not safe');
});

test('rejects invalid timestamps and unsafe paths in every policy path collection', () => {
  const valid = basePolicy();
  expect(() => validateDocumentationPolicy({ ...valid, updated_at: 'yesterday' }, valid.source_path)).toThrow(
    'documentation policy timestamp invalid',
  );
  for (const field of ['canonical_roots', 'map_paths', 'excluded_roots'] as const) {
    expect(() => validateDocumentationPolicy({ ...valid, [field]: ['docs/../secret'] }, valid.source_path)).toThrow(
      'documentation path is not safe',
    );
    expect(() => validateDocumentationPolicy({ ...valid, [field]: [17] }, valid.source_path)).toThrow('schema invalid');
  }
  expect(() => validateDocumentationPolicy({ ...valid, changelog_path: '../CHANGELOG.md' }, valid.source_path)).toThrow(
    'documentation path is not safe',
  );
});

test('rejects impossible, date-only and timezone-free policy timestamps', () => {
  const valid = basePolicy();
  for (const updated_at of [
    '2026-02-31T12:30:00.000Z',
    '2026-02-29T12:30:00.000Z',
    '2026-10-11',
    '2026-10-11T12:30:00',
  ])
    expect(() => validateDocumentationPolicy({ ...valid, updated_at }, valid.source_path)).toThrow(
      'documentation policy timestamp invalid',
    );
});

test('preserves valid leap-day and explicit-offset policy timestamps exactly', () => {
  const valid = basePolicy();
  for (const updated_at of ['2024-02-29T12:30:00.000Z', '2026-10-11T12:30:00+02:00'])
    expect(validateDocumentationPolicy({ ...valid, updated_at }, valid.source_path).updated_at).toBe(updated_at);
});

test('accepts an absent, null or safe string changelog path', () => {
  const valid = basePolicy();
  expect(validateDocumentationPolicy(valid, valid.source_path).changelog_path).toBeUndefined();
  expect(validateDocumentationPolicy({ ...valid, changelog_path: null }, valid.source_path).changelog_path).toBeNull();
  expect(
    validateDocumentationPolicy({ ...valid, changelog_path: 'CHANGELOG.md' }, valid.source_path).changelog_path,
  ).toBe('CHANGELOG.md');
});

test('returns an immutable detached snapshot without changing the supplied value', () => {
  const input = { ...basePolicy(), canonical_roots: ['docs'], map_paths: ['docs/MAP.md'] };
  const before = structuredClone(input);
  const result = validateDocumentationPolicy(input, input.source_path);
  expect(input).toEqual(before);
  expect(result).not.toBe(input);
  expect(result.canonical_roots).not.toBe(input.canonical_roots);
  expect(Object.isFrozen(result)).toBe(true);
  expect(Object.isFrozen(result.canonical_roots)).toBe(true);
  input.canonical_roots.push('changed');
  expect(result.canonical_roots).toEqual(['docs']);
  // The runtime snapshot freezes collection contents as well as the outer object.
  expect(() => result.canonical_roots.push('mutated')).toThrow();
});

test('safe relative paths remain unchanged across deterministic generated segments', () => {
  const segment = fc.stringMatching(/^[A-Za-z0-9_-]{1,12}$/u);
  fc.assert(
    fc.property(fc.array(segment, { minLength: 1, maxLength: 5 }), (parts) => {
      const value = parts.join('/');
      expect(documentationRelativePath(value)).toBe(value);
    }),
    { seed: 20261011, numRuns: 64 },
  );
});
