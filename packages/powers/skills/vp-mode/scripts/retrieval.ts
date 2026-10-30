import { tagTokens, stemToken } from './catalog.ts';
import type { LoadedInstruction } from './catalog.ts';

export type IntentDimension = 'capability' | 'pattern';

export type IntentCandidate = {
  dimension: IntentDimension;
  tag: string;
  score: number;
  matchedTokens: string[];
};

export type IntentResolution = {
  status: 'resolved' | 'weak' | 'unresolved';
  capability?: string;
  pattern?: string;
  candidates: IntentCandidate[];
  matchedTokens: string[];
  matchedAlias: boolean;
};

const STOPWORDS = new Set(['a', 'an', 'the', 'for', 'to', 'of', 'and', 'or', 'with', 'on', 'in', 'by', 'vs', 'versus', 'after', 'before', 'from', 'into', 'over', 'under', 'this', 'that']);

// Leading action verbs that head many tag names. A match that rests only on one of
// them says "this is about doing something", not which thing, so the result is weak.
const GENERIC_ACTION_TOKENS = new Set([
  'add', 'adjust', 'apply', 'ask', 'assign', 'avoid', 'build', 'call', 'change', 'check',
  'choose', 'clean', 'close', 'collect', 'compare', 'complete', 'confirm', 'convert',
  'create', 'data', 'decide', 'delete', 'detect', 'document', 'ensure', 'extract', 'find', 'fix', 'follow',
  'generate', 'give', 'handle', 'improve', 'include', 'integrate', 'keep', 'list', 'make',
  'manage', 'map', 'mark', 'move', 'name', 'open', 'pick', 'prepare', 'preserve', 'prevent',
  'process', 'produce', 'protect', 'provide', 'put', 'rank', 'reduce', 'remove', 'rename',
  'replace', 'require', 'resolve', 'restore', 'return', 'run', 'scan', 'select', 'separate',
  'set', 'show', 'split', 'start', 'stop', 'take', 'track', 'treat', 'turn', 'use', 'write',
].map(stemToken));

type Ranked = { tag: string; names: Set<string>; score: number; firstIndex: number; count: number; phraseCount: number };

function queryTokens(terms: readonly string[]): string[] {
  return [...new Set(terms.flatMap(tagTokens).map(stemToken))].filter((token) => !STOPWORDS.has(token));
}

type AliasIndex = { single: Map<string, string>; phrases: Array<{ tokens: string[]; target: string }> };

function aliasIndex(aliases: ReadonlyMap<string, string> | undefined, dictionary: ReadonlySet<string>): AliasIndex {
  const single = new Map<string, string>();
  const phrases: Array<{ tokens: string[]; target: string }> = [];
  if (aliases === undefined) return { single, phrases };
  for (const [alias, canonical] of aliases) {
    if (!dictionary.has(canonical)) continue;
    const tokens = tagTokens(alias).map(stemToken);
    if (tokens.length === 0) continue;
    if (tokens.length === 1) single.set(tokens[0] as string, canonical);
    else phrases.push({ tokens, target: canonical });
  }
  return { single, phrases };
}

function phraseAt(query: readonly string[], tokens: readonly string[]): number {
  if (tokens.length === 0 || tokens.length > query.length) return -1;
  for (let start = 0; start + tokens.length <= query.length; start += 1) {
    if (tokens.every((token, offset) => query[start + offset] === token)) return start;
  }
  return -1;
}

function phraseHits(query: readonly string[], index: AliasIndex, tag: string): Array<{ tokens: string[]; at: number }> {
  const hits: Array<{ tokens: string[]; at: number }> = [];
  for (const phrase of index.phrases) {
    if (phrase.target !== tag) continue;
    const at = phraseAt(query, phrase.tokens);
    if (at >= 0) hits.push({ tokens: phrase.tokens, at });
  }
  return hits;
}

function matchedTokensFor(names: Set<string>, query: readonly string[], tag: string, index: AliasIndex): string[] {
  const tokens = query.filter((token) => names.has(token) || index.single.get(token) === tag);
  for (const hit of phraseHits(query, index, tag)) {
    for (const token of hit.tokens) if (!tokens.includes(token)) tokens.push(token);
  }
  return tokens;
}

function rankByNames(
  query: readonly string[],
  entries: ReadonlyMap<string, Set<string>>,
  counts: ReadonlyMap<string, number>,
  aliases: AliasIndex,
): Ranked[] {
  const ranked: Ranked[] = [];
  for (const [tag, names] of entries) {
    const hits = phraseHits(query, aliases, tag);
    const matches = hits.length > 0 || query.some((token) => names.has(token) || aliases.single.get(token) === tag);
    if (!matches) continue;
    ranked.push({ tag, names, score: 0, firstIndex: Number.MAX_SAFE_INTEGER, count: counts.get(tag) ?? 0, phraseCount: hits.length });
  }
  const documentFrequency = new Map<string, number>();
  for (const { names } of ranked) for (const token of names) documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
  for (const item of ranked) {
    item.score = query.reduce((total, token) => total
      + (item.names.has(token) ? 1 / (documentFrequency.get(token) ?? 1) : 0)
      + (aliases.single.get(token) === item.tag ? 1 : 0), 0) + 2 * item.phraseCount;
    const nameIndex = query.findIndex((token) => item.names.has(token) || aliases.single.get(token) === item.tag);
    const phraseIndex = Math.min(...phraseHits(query, aliases, item.tag).map((hit) => hit.at));
    item.firstIndex = Math.min(nameIndex === -1 ? Number.MAX_SAFE_INTEGER : nameIndex, phraseIndex);
  }
  ranked.sort((left, right) => right.score - left.score
    || left.firstIndex - right.firstIndex
    || right.count - left.count
    || (left.tag < right.tag ? -1 : left.tag > right.tag ? 1 : 0));
  return ranked;
}

function nameSets(instructions: Map<string, LoadedInstruction>, dimension: IntentDimension): { entries: Map<string, Set<string>>; counts: Map<string, number> } {
  const entries = new Map<string, Set<string>>();
  const counts = new Map<string, number>();
  for (const instruction of instructions.values()) {
    const tags = dimension === 'capability' ? instruction.capability_tags : instruction.pattern_tags;
    for (const tag of tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
      if (!entries.has(tag)) entries.set(tag, new Set(tagTokens(tag).map(stemToken)));
    }
  }
  return { entries, counts };
}

export function topPatternFor(instructions: Map<string, LoadedInstruction>, capability: string): string | undefined {
  const counts = new Map<string, number>();
  for (const instruction of instructions.values()) {
    if (!instruction.capability_tags.includes(capability)) continue;
    for (const tag of instruction.pattern_tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || (left[0] < right[0] ? -1 : left[0] > right[0] ? 1 : 0))[0]?.[0];
}

function editDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = previous[0] as number;
    previous[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const saved = previous[j] as number;
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      previous[j] = Math.min((previous[j] as number) + 1, (previous[j - 1] as number) + 1, diagonal + cost);
      diagonal = saved;
    }
  }
  return previous[right.length] as number;
}

export function nearestInstructionId(target: string, ids: Iterable<string>): string | undefined {
  let best: string | undefined;
  let bestDistance = Number.MAX_SAFE_INTEGER;
  const lengthLimit = Math.max(6, Math.floor(target.length / 4));
  for (const id of ids) {
    if (Math.abs(id.length - target.length) > lengthLimit) continue;
    const distance = editDistance(target, id);
    if (distance < bestDistance || (distance === bestDistance && best !== undefined && id < best)) {
      bestDistance = distance;
      best = id;
    }
  }
  const allowed = Math.max(3, Math.floor(target.length / 4));
  return best !== undefined && bestDistance <= allowed ? best : undefined;
}

export type TagSuggestion = { dimension: 'capability' | 'pattern'; tag: string };

export function rankSuggestions(
  terms: readonly string[],
  matches: readonly TagSuggestion[],
): { names: string[]; descriptions: string[] } {
  const query = new Set(queryTokens(terms));
  const names: string[] = [];
  const descriptions: string[] = [];
  for (const match of matches) {
    const label = `${match.dimension}:${match.tag}`;
    const tokens = tagTokens(match.tag).map(stemToken);
    if (tokens.some((token) => query.has(token))) names.push(label);
    else descriptions.push(label);
  }
  return { names: names.slice(0, 3), descriptions: descriptions.slice(0, Math.max(0, 3 - names.length)) };
}

export function suggestionHint(alternatives: readonly string[]): string {
  return alternatives.length === 0
    ? 'run tags --query with canonical nouns'
    : `nearest tags: ${alternatives.join(', ')}; search one with --capability <tag> or --pattern <tag>`;
}

export function suggestionText(
  terms: readonly string[],
  matches: readonly TagSuggestion[],
): string {
  const { names, descriptions } = rankSuggestions(terms, matches);
  if (names.length === 0 && descriptions.length === 0) return suggestionHint([]);
  const parts: string[] = [];
  if (names.length > 0) parts.push(`nearest tags: ${names.join(', ')}`);
  if (descriptions.length > 0) parts.push(`description matches (heuristic): ${descriptions.join(', ')}`);
  parts.push('search one with --capability <tag> or --pattern <tag>');
  return parts.join('; ');
}

export function resolveIntent(
  instructions: Map<string, LoadedInstruction>,
  terms: readonly string[],
  aliases?: ReadonlyMap<string, string>,
): IntentResolution {
  const query = queryTokens(terms);
  const empty: IntentResolution = { status: 'unresolved', candidates: [], matchedTokens: [], matchedAlias: false };
  if (query.length === 0) return empty;

  const capabilityNames = nameSets(instructions, 'capability');
  const patternNames = nameSets(instructions, 'pattern');
  const capabilityDictionary = new Set(capabilityNames.entries.keys());
  const patternDictionary = new Set(patternNames.entries.keys());
  const capabilityAliases = aliasIndex(aliases, capabilityDictionary);
  const patternAliases = aliasIndex(aliases, patternDictionary);

  const capabilities = rankByNames(query, capabilityNames.entries, capabilityNames.counts, capabilityAliases);
  const patterns = rankByNames(query, patternNames.entries, patternNames.counts, patternAliases);
  const candidates: IntentCandidate[] = [
    ...capabilities.slice(0, 3).map((item) => ({
      dimension: 'capability' as const,
      tag: item.tag,
      score: item.score,
      matchedTokens: matchedTokensFor(item.names, query, item.tag, capabilityAliases),
    })),
    ...patterns.slice(0, 3).map((item) => ({
      dimension: 'pattern' as const,
      tag: item.tag,
      score: item.score,
      matchedTokens: matchedTokensFor(item.names, query, item.tag, patternAliases),
    })),
  ].sort((left, right) => right.score - left.score
    || (left.tag < right.tag ? -1 : left.tag > right.tag ? 1 : 0))
    .slice(0, 3);

  const bestCapability = capabilities[0];
  const bestPattern = bestCapability === undefined ? patterns[0] : undefined;
  const best = bestCapability ?? bestPattern;
  if (best === undefined) return empty;

  const matchedTokens = bestCapability === undefined
    ? matchedTokensFor(best.names, query, best.tag, patternAliases)
    : matchedTokensFor(best.names, query, best.tag, capabilityAliases);
  const activeAliases = bestCapability === undefined ? patternAliases : capabilityAliases;
  const matchedAlias = phraseHits(query, activeAliases, best.tag).length > 0
    || matchedTokens.some((token) => activeAliases.single.get(token) === best.tag);
  const genericOnly = matchedTokens.length > 0 && !matchedAlias && matchedTokens.every((token) => GENERIC_ACTION_TOKENS.has(token));
  const weak = genericOnly && query.length > 1;

  const resolution: IntentResolution = {
    status: weak ? 'weak' : 'resolved',
    candidates,
    matchedTokens,
    matchedAlias,
  };
  if (bestCapability !== undefined) {
    resolution.capability = bestCapability.tag;
    const pattern = topPatternFor(instructions, bestCapability.tag);
    if (pattern !== undefined) resolution.pattern = pattern;
  } else if (bestPattern !== undefined) {
    resolution.pattern = bestPattern.tag;
  }
  return resolution;
}
