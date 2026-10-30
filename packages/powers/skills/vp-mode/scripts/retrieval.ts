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
  'create', 'delete', 'detect', 'document', 'ensure', 'extract', 'find', 'fix', 'follow',
  'generate', 'give', 'handle', 'improve', 'include', 'integrate', 'keep', 'list', 'make',
  'manage', 'map', 'mark', 'move', 'name', 'open', 'pick', 'prepare', 'preserve', 'prevent',
  'process', 'produce', 'protect', 'provide', 'put', 'rank', 'reduce', 'remove', 'rename',
  'replace', 'require', 'resolve', 'restore', 'return', 'run', 'scan', 'select', 'separate',
  'set', 'show', 'split', 'start', 'stop', 'take', 'track', 'treat', 'turn', 'use', 'write',
].map(stemToken));

type Ranked = { tag: string; names: Set<string>; score: number; firstIndex: number; count: number };

function queryTokens(terms: readonly string[]): string[] {
  return [...new Set(terms.flatMap(tagTokens).map(stemToken))].filter((token) => !STOPWORDS.has(token));
}

function aliasTargets(aliases: ReadonlyMap<string, string> | undefined, dictionary: ReadonlySet<string>): Map<string, string> {
  const targets = new Map<string, string>();
  if (aliases === undefined) return targets;
  for (const [alias, canonical] of aliases) {
    if (!dictionary.has(canonical)) continue;
    targets.set(stemToken(tagTokens(alias)[0] ?? alias), canonical);
  }
  return targets;
}

function matchedTokensFor(names: Set<string>, query: readonly string[], tag: string, aliases: Map<string, string>): string[] {
  return query.filter((token) => names.has(token) || aliases.get(token) === tag);
}

function rankByNames(
  query: readonly string[],
  entries: ReadonlyMap<string, Set<string>>,
  counts: ReadonlyMap<string, number>,
  aliases: Map<string, string>,
  aliasesApply: boolean,
): Ranked[] {
  const ranked: Ranked[] = [];
  for (const [tag, names] of entries) {
    const matches = query.some((token) => names.has(token) || (aliasesApply && aliases.get(token) === tag));
    if (!matches) continue;
    ranked.push({ tag, names, score: 0, firstIndex: Number.MAX_SAFE_INTEGER, count: counts.get(tag) ?? 0 });
  }
  const documentFrequency = new Map<string, number>();
  for (const { names } of ranked) for (const token of names) documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
  for (const item of ranked) {
    item.score = query.reduce((total, token) => total
      + (item.names.has(token) ? 1 / (documentFrequency.get(token) ?? 1) : 0)
      + (aliasesApply && aliases.get(token) === item.tag ? 2 : 0), 0);
    const firstIndex = query.findIndex((token) => item.names.has(token));
    item.firstIndex = firstIndex === -1 ? Number.MAX_SAFE_INTEGER : firstIndex;
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
  const capabilityAliases = aliasTargets(aliases, capabilityDictionary);
  const patternAliases = aliasTargets(aliases, patternDictionary);

  const capabilities = rankByNames(query, capabilityNames.entries, capabilityNames.counts, capabilityAliases, true);
  const patterns = rankByNames(query, patternNames.entries, patternNames.counts, patternAliases, true);
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
  const matchedAlias = matchedTokens.some((token) => (bestCapability === undefined ? patternAliases : capabilityAliases).get(token) === best.tag);
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
