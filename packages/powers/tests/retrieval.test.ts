import { expect, test } from 'bun:test';
import { nearestInstructionId, rankSuggestions, resolveIntent, suggestionHint, suggestionText, topPatternFor } from '../skills/vp-mode/scripts/retrieval.ts';
import type { LoadedInstruction } from '../skills/vp-mode/scripts/catalog.ts';

function instruction(id: string, capability: string[], pattern: string[]): LoadedInstruction {
  return { instruction_id: id, capability_tags: capability, pattern_tags: pattern } as unknown as LoadedInstruction;
}

function catalogOf(...items: LoadedInstruction[]): Map<string, LoadedInstruction> {
  return new Map(items.map((item) => [item.instruction_id, item]));
}

const base = catalogOf(
  instruction('a', ['debug-root-cause'], ['systematic-debugging']),
  instruction('b', ['debug-root-cause'], ['systematic-debugging']),
  instruction('c', ['design-structure'], ['structural-design']),
  instruction('d', ['improve-performance'], ['performance-measurement']),
  instruction('e', ['review-code'], ['code-review']),
);

test('resolves a capability by tag name and adds its most frequent pattern', () => {
  const result = resolveIntent(base, ['debug', 'incident']);
  expect(result.status).toBe('resolved');
  expect(result.capability).toBe('debug-root-cause');
  expect(result.pattern).toBe('systematic-debugging');
  expect(result.matchedAlias).toBe(false);
  expect(result.matchedTokens).toEqual(['debug']);
});

test('resolves a capability through a declared alias and marks the alias match', () => {
  const result = resolveIntent(base, ['architecture', 'improve'], new Map([['architecture', 'design-structure']]));
  expect(result.status).toBe('resolved');
  expect(result.capability).toBe('design-structure');
  expect(result.matchedAlias).toBe(true);
  expect(result.matchedTokens).toContain('architectur');
});

test('ignores an alias whose canonical target carries no instruction', () => {
  const result = resolveIntent(base, ['ghostword'], new Map([['ghostword', 'missing-capability']]));
  expect(result.status).toBe('unresolved');
});

test('falls back to the most frequent matching pattern when no capability matches', () => {
  const result = resolveIntent(base, ['systematic', 'debugging']);
  expect(result.status).toBe('resolved');
  expect(result.capability).toBe('debug-root-cause');
  expect(result.pattern).toBe('systematic-debugging');

  const patternOnly = catalogOf(instruction('p1', ['something-else'], ['incremental-cutover']), instruction('p2', ['something-else'], ['incremental-cutover']));
  const fallback = resolveIntent(patternOnly, ['incremental', 'cutover']);
  expect(fallback.capability).toBeUndefined();
  expect(fallback.pattern).toBe('incremental-cutover');
});

test('marks a generic verb-only match as weak', () => {
  const result = resolveIntent(base, ['properly', 'handling', 'anything']);
  expect(result.capability).toBeUndefined();
  expect(result.status).toBe('unresolved');

  const generic = catalogOf(instruction('h', ['handle-an-authentication-prompt'], ['human-in-the-loop']));
  const weak = resolveIntent(generic, ['properly', 'handling', 'request']);
  expect(weak.status).toBe('weak');
  expect(weak.capability).toBe('handle-an-authentication-prompt');
  expect(weak.matchedTokens).toEqual(['handl']);
});

test('does not weaken a single-term query or an alias-backed match', () => {
  const single = resolveIntent(base, ['review']);
  expect(single.status).toBe('resolved');

  const aliased = resolveIntent(
    catalogOf(instruction('h', ['handle-an-authentication-prompt'], ['human-in-the-loop'])),
    ['handling', 'auth'],
    new Map([['auth', 'handle-an-authentication-prompt']]),
  );
  expect(aliased.status).toBe('resolved');
  expect(aliased.matchedAlias).toBe(true);
});

test('returns unresolved for stopwords only or for no match', () => {
  expect(resolveIntent(base, ['the', 'and', 'of']).status).toBe('unresolved');
  expect(resolveIntent(base, ['zzzznotatag']).status).toBe('unresolved');
  expect(resolveIntent(base, []).status).toBe('unresolved');
});

test('exposes at most three ranked candidates and the matched tokens', () => {
  const result = resolveIntent(base, ['design', 'structure', 'review']);
  expect(result.candidates).toHaveLength(3);
  expect(result.candidates[0]?.tag).toBe('design-structure');
  expect(result.candidates.map((candidate) => candidate.dimension)).toContain('capability');
  expect(result.candidates.every((candidate) => candidate.score > 0)).toBe(true);
  expect(result.candidates[0]?.matchedTokens.length).toBeGreaterThan(0);
});

test('resolves a pattern alias declared in the dictionary', () => {
  const result = resolveIntent(
    catalogOf(instruction('p', ['something-else'], ['single-source-of-truth'])),
    ['truth'],
    new Map([['truth', 'single-source-of-truth']]),
  );
  expect(result.pattern).toBe('single-source-of-truth');
  expect(result.matchedAlias).toBe(true);
});

test('topPatternFor returns the most frequent pattern or nothing for an unknown capability', () => {
  expect(topPatternFor(base, 'debug-root-cause')).toBe('systematic-debugging');
  expect(topPatternFor(base, 'missing')).toBeUndefined();
});

test('lets a phrase alias select a pattern over a weaker capability match', () => {
  const catalog = catalogOf(
    instruction('d', ['write-knowledge-documents'], ['documentation-writing']),
    instruction('s', ['some-capability'], ['single-source-of-truth']),
  );
  const result = resolveIntent(catalog, ['one', 'owner', 'per', 'document'], new Map([['one owner', 'single-source-of-truth']]));
  expect(result.capability).toBeUndefined();
  expect(result.pattern).toBe('single-source-of-truth');
  expect(result.matchedAlias).toBe(true);
});

test('resolves a phrase alias only when all of its tokens appear in order', () => {  const catalog = catalogOf(
    instruction('r', ['review-code'], ['code-review']),
    instruction('m', ['migrate-consumers-off-the-old-system'], ['incremental-cutover']),
  );
  const aliases = new Map([
    ['pull request review', 'review-code'],
    ['consumer migration', 'migrate-consumers-off-the-old-system'],
  ]);
  const review = resolveIntent(catalog, ['pull', 'request', 'review'], aliases);
  expect(review.capability).toBe('review-code');
  expect(review.matchedAlias).toBe(true);

  const merge = resolveIntent(catalog, ['process', 'pull', 'request', 'merge'], aliases);
  expect(merge.capability).not.toBe('review-code');

  const migration = resolveIntent(catalog, ['consumer', 'migration', 'plan'], aliases);
  expect(migration.capability).toBe('migrate-consumers-off-the-old-system');
});

test('finds the nearest instruction id within a bounded distance', () => {
  const ids = ['call-a-fix-verified-only-when-all-five-conditions-hold', 'debug-systematically', 'review-code'];
  expect(nearestInstructionId('call-a-fix-only-when-all-five-conditions-hold', ids)).toBe('call-a-fix-verified-only-when-all-five-conditions-hold');
  expect(nearestInstructionId('zzzznotatag', ids)).toBeUndefined();
});

test('builds a nearest-tag hint or falls back to the tag query', () => {
  expect(suggestionHint([])).toBe('run tags --query with canonical nouns');
  expect(suggestionHint(['capability:review-code', 'pattern:code-review'])).toBe('nearest tags: capability:review-code, pattern:code-review; search one with --capability <tag> or --pattern <tag>');
});

test('separates name matches from description-only suggestions', () => {
  const ranked = rankSuggestions(['review', 'spreadsheet'], [
    { dimension: 'pattern', tag: 'release-readiness' },
    { dimension: 'capability', tag: 'review-code' },
  ]);
  expect(ranked.names).toEqual(['capability:review-code']);
  expect(ranked.descriptions).toEqual(['pattern:release-readiness']);

  const text = suggestionText(['review', 'spreadsheet'], [
    { dimension: 'pattern', tag: 'release-readiness' },
    { dimension: 'capability', tag: 'review-code' },
  ]);
  expect(text).toContain('nearest tags: capability:review-code');
  expect(text).toContain('description matches (heuristic): pattern:release-readiness');

  expect(suggestionText(['zzzz'], [])).toBe('run tags --query with canonical nouns');
  expect(suggestionText(['zzzz'], [{ dimension: 'pattern', tag: 'release-readiness' }])).toContain('description matches (heuristic)');
});
