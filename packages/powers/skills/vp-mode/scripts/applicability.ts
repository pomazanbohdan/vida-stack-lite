export type ApplicabilityErrorCode = 'invalid-schema' | 'invalid-format';

export class ApplicabilityError extends Error {
  readonly code: ApplicabilityErrorCode;
  readonly details: Record<string, unknown>;

  constructor(code: ApplicabilityErrorCode, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'ApplicabilityError';
    this.code = code;
    this.details = details;
  }
}

export type VersionComparator = { op: '=' | '>' | '>=' | '<' | '<='; version: string };
export type VersionRange = { raw: string; comparators: VersionComparator[] };
export type FrameworkFact = { name: string; versionRange?: VersionRange; sourceLabel?: string };
export type ValueFact = { value: string; sourceLabel?: string };
export type StandardFact = { id: string; version: string; conformance?: string; sourceLabel?: string };
export type Applicability = {
  frameworks?: FrameworkFact[];
  runtimes?: ValueFact[];
  platforms?: ValueFact[];
  standards?: StandardFact[];
  accessibility?: ValueFact[];
  requiredContext?: string[];
  optionalContext?: string[];
};
export type ApplicabilityContext = {
  frameworks?: { name: string; version?: string }[];
  runtimes?: string[];
  platforms?: string[];
  standards?: { id: string; version: string; conformance?: string }[];
  accessibility?: string[];
};
export type ApplicabilityState = 'applicable' | 'inapplicable' | 'unresolved';
export type ApplicabilityReason =
  | 'source-inapplicable'
  | 'required-context-missing'
  | 'unknown-context'
  | 'unparsed-version'
  | 'context-conflict';
export type ApplicabilityResult = {
  state: ApplicabilityState;
  reason?: ApplicabilityReason;
  requiredContext?: string[];
  sourceLabels?: string[];
};
export type ApplicabilityVocab = { runtimes: string[]; platforms: string[]; accessibility: string[] };
export type ApplicabilityAliases = { frameworks?: Record<string, string>; standards?: Record<string, string> };

const MAX_COMPONENT = 2 ** 31 - 1;
const TOKEN_DIMENSIONS = ['framework', 'runtime', 'platform', 'standard', 'accessibility'] as const;
const STANDARD_ID_PATTERN = /^[A-Z0-9][A-Z0-9._-]*$/;
const NAME_PATTERN = /^[a-z0-9@][a-z0-9@/._-]*$/;
const TOKEN_VALUE_PATTERN = /^[A-Za-z0-9@][A-Za-z0-9@/._:-]*$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fail(code: ApplicabilityErrorCode, message: string, details: Record<string, unknown> = {}): never {
  throw new ApplicabilityError(code, message, details);
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().normalize('NFC');
}

function normalizeStandardId(value: string): string {
  return value.trim().toUpperCase().normalize('NFC');
}

function normalizeConformance(value: string): string {
  return value.trim().toUpperCase().normalize('NFC');
}

function normalizeLabel(value: string): string {
  return value.trim();
}

function hasControlCharacter(value: string): boolean {
  return /[\u0000-\u001F\u007F-\u009F\u2028\u2029]/u.test(value);
}

function assertString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') fail('invalid-schema', `${field} must be a non-empty string`, { field });
  if (hasControlCharacter(value)) fail('invalid-schema', `${field} contains a control character`, { field });
  return value;
}

function assertArray(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) fail('invalid-schema', `${field} must be an array`, { field });
  if (value.length === 0) fail('invalid-schema', `${field} must not be empty`, { field });
  return value;
}

function parseVersionPart(text: string, field: string): string {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(text)) {
    fail('invalid-schema', `${field} must be MAJOR.MINOR.PATCH without a leading zero`, { field, value: text });
  }
  const parts = text.split('.').map((part) => Number(part));
  if (parts.some((part) => !Number.isSafeInteger(part) || part > MAX_COMPONENT)) {
    fail('invalid-schema', `${field} component exceeds ${MAX_COMPONENT}`, { field, value: text });
  }
  return text;
}

export function parseVersion(text: string): { major: number; minor: number; patch: number } {
  const match = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(text.trim());
  if (!match) fail('invalid-schema', `unsupported version: ${text}`, { value: text });
  const parts = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (parts.some((part) => !Number.isSafeInteger(part) || part > MAX_COMPONENT)) {
    fail('invalid-schema', `version component exceeds ${MAX_COMPONENT}: ${text}`, { value: text });
  }
  return { major: parts[0]!, minor: parts[1]!, patch: parts[2]! };
}

function compareVersions(left: string, right: string): number {
  const a = parseVersion(left);
  const b = parseVersion(right);
  return a.major - b.major || a.minor - b.minor || a.patch - b.patch;
}

export function satisfiesVersion(version: string, comparators: VersionComparator[]): boolean {
  return comparators.every((comparator) => {
    const order = compareVersions(version, comparator.version);
    switch (comparator.op) {
      case '=': return order === 0;
      case '>': return order > 0;
      case '>=': return order >= 0;
      case '<': return order < 0;
      case '<=': return order <= 0;
    }
  });
}

function comparator(op: VersionComparator['op'], version: string): VersionComparator {
  return { op, version };
}

function normalizeComparators(comparators: VersionComparator[]): VersionComparator[] {
  const rank: Record<VersionComparator['op'], number> = { '=': 0, '>': 1, '>=': 2, '<': 3, '<=': 4 };
  return [...comparators].sort((a, b) => rank[a.op] - rank[b.op] || compareVersions(a.version, b.version));
}

function expandRange(raw: string): VersionComparator[] {
  const text = raw.trim();
  if (text === '' || text.includes('||')) fail('invalid-schema', `unsupported version range: ${raw}`, { value: raw });
  if (text.startsWith('^') || text.startsWith('~')) {
    const body = text.slice(1).trim();
    const parsed = parseVersionPart(body, 'versionRange');
    const { major, minor } = parseVersion(parsed);
    if (major === 0) fail('invalid-schema', `zero-major ${text[0]} forms are unsupported: ${raw}`, { value: raw });
    if (text.startsWith('^')) {
      return normalizeComparators([comparator('>=', parsed), comparator('<', `${major + 1}.0.0`)]);
    }
    return normalizeComparators([comparator('>=', parsed), comparator('<', `${major}.${minor + 1}.0`)]);
  }
  const wildcard = /^(0|[1-9]\d*)\.(x|X)$/.exec(text) ?? /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(x|X)$/.exec(text);
  if (wildcard) {
    const major = Number(wildcard[1]);
    if (!Number.isSafeInteger(major) || major > MAX_COMPONENT) fail('invalid-schema', `version component exceeds ${MAX_COMPONENT}`, { value: raw });
    if (wildcard.length === 3) {
      return normalizeComparators([comparator('>=', `${major}.0.0`), comparator('<', `${major + 1}.0.0`)]);
    }
    const minor = Number(wildcard[2]);
    if (!Number.isSafeInteger(minor) || minor > MAX_COMPONENT) fail('invalid-schema', `version component exceeds ${MAX_COMPONENT}`, { value: raw });
    return normalizeComparators([comparator('>=', `${major}.${minor}.0`), comparator('<', `${major}.${minor + 1}.0`)]);
  }
  const parts = text.split(/\s+/);
  if (parts.length === 0) fail('invalid-schema', `empty version range: ${raw}`, { value: raw });
  const comparators: VersionComparator[] = [];
  for (const part of parts) {
    const match = /^(=|>|>=|<|<=)?\s*(v?(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))$/.exec(part);
    if (!match) fail('invalid-schema', `unsupported comparator: ${part}`, { value: raw, part });
    const op = (match[1] ?? '=') as VersionComparator['op'];
    const version = parseVersionPart(match[2]!, 'versionRange');
    comparators.push(comparator(op, version));
  }
  return normalizeComparators(comparators);
}

export function parseVersionRange(raw: string): VersionRange {
  const comparators = expandRange(raw);
  if (comparators.length === 0) fail('invalid-schema', `empty version range: ${raw}`, { value: raw });
  return { raw: raw.trim(), comparators };
}

function parseFrameworkFact(value: unknown, index: number): FrameworkFact {
  if (!isRecord(value)) fail('invalid-schema', `frameworks[${index}] must be an object`, { index });
  const name = normalizeName(assertString(value.name, `frameworks[${index}].name`));
  if (!NAME_PATTERN.test(name)) fail('invalid-schema', `frameworks[${index}].name is not normalized`, { name });
  const result: FrameworkFact = { name };
  if (value.versionRange !== undefined) {
    if (!isRecord(value.versionRange)) fail('invalid-schema', `frameworks[${index}].versionRange must be an object`, { index });
    const raw = assertString(value.versionRange.raw, `frameworks[${index}].versionRange.raw`);
    const parsed = parseVersionRange(raw);
    if (value.versionRange.comparators !== undefined) {
      const supplied = value.versionRange.comparators;
      if (!Array.isArray(supplied)) fail('invalid-schema', `frameworks[${index}].versionRange.comparators must be an array`, { index });
      if (JSON.stringify(supplied) !== JSON.stringify(parsed.comparators)) {
        fail('invalid-schema', `frameworks[${index}].versionRange.comparators does not match raw`, { index });
      }
    }
    result.versionRange = parsed;
  }
  if (value.sourceLabel !== undefined) result.sourceLabel = normalizeLabel(assertString(value.sourceLabel, `frameworks[${index}].sourceLabel`));
  return result;
}

function parseValueFact(value: unknown, field: string, index: number): ValueFact {
  if (!isRecord(value)) fail('invalid-schema', `${field}[${index}] must be an object`, { field, index });
  const token = normalizeName(assertString(value.value, `${field}[${index}].value`));
  const result: ValueFact = { value: token };
  if (value.sourceLabel !== undefined) result.sourceLabel = normalizeLabel(assertString(value.sourceLabel, `${field}[${index}].sourceLabel`));
  return result;
}

function parseStandardFact(value: unknown, index: number): StandardFact {
  if (!isRecord(value)) fail('invalid-schema', `standards[${index}] must be an object`, { index });
  const id = normalizeStandardId(assertString(value.id, `standards[${index}].id`));
  if (!STANDARD_ID_PATTERN.test(id)) fail('invalid-schema', `standards[${index}].id is not canonical`, { id });
  const version = assertString(value.version, `standards[${index}].version`).trim();
  const result: StandardFact = { id, version };
  if (value.conformance !== undefined) result.conformance = normalizeConformance(assertString(value.conformance, `standards[${index}].conformance`));
  if (value.sourceLabel !== undefined) result.sourceLabel = normalizeLabel(assertString(value.sourceLabel, `standards[${index}].sourceLabel`));
  return result;
}

function parseToken(value: unknown, field: string): string {
  const token = assertString(value, field);
  const separator = token.indexOf(':');
  if (separator <= 0 || separator === token.length - 1) fail('invalid-schema', `${field} must be <dimension>:<value>`, { token });
  const dimension = token.slice(0, separator);
  const tokenValue = token.slice(separator + 1);
  if (!(TOKEN_DIMENSIONS as readonly string[]).includes(dimension)) fail('invalid-schema', `${field} has an unknown dimension`, { token });
  if (tokenValue.includes(':') || !TOKEN_VALUE_PATTERN.test(tokenValue)) fail('invalid-schema', `${field} has an invalid value`, { token });
  if (dimension === 'standard') {
    const normalized = normalizeStandardId(tokenValue);
    if (!STANDARD_ID_PATTERN.test(normalized)) fail('invalid-schema', `${field} has an invalid standard id`, { token });
    return `${dimension}:${normalized}`;
  }
  return `${dimension}:${normalizeName(tokenValue)}`;
}

export function parseApplicability(raw: string): Applicability {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    fail('invalid-schema', 'applicability is not valid JSON');
  }
  if (!isRecord(value)) fail('invalid-schema', 'applicability must be a JSON object');
  const allowed = new Set(['frameworks', 'runtimes', 'platforms', 'standards', 'accessibility', 'requiredContext', 'optionalContext']);
  for (const key of Object.keys(value)) if (!allowed.has(key)) fail('invalid-schema', `unknown applicability field: ${key}`, { field: key });
  const result: Applicability = {};
  if (value.frameworks !== undefined) {
    const items = assertArray(value.frameworks, 'frameworks').map(parseFrameworkFact);
    const names = new Set<string>();
    for (const item of items) {
      if (names.has(item.name)) fail('invalid-schema', `duplicate framework name: ${item.name}`, { name: item.name });
      names.add(item.name);
    }
    result.frameworks = items;
  }
  if (value.runtimes !== undefined) result.runtimes = assertArray(value.runtimes, 'runtimes').map((item, index) => parseValueFact(item, 'runtimes', index));
  if (value.platforms !== undefined) result.platforms = assertArray(value.platforms, 'platforms').map((item, index) => parseValueFact(item, 'platforms', index));
  if (value.accessibility !== undefined) result.accessibility = assertArray(value.accessibility, 'accessibility').map((item, index) => parseValueFact(item, 'accessibility', index));
  if (value.standards !== undefined) {
    result.standards = assertArray(value.standards, 'standards').map(parseStandardFact);
    const ids = new Set<string>();
    for (const item of result.standards) {
      if (ids.has(item.id)) fail('invalid-schema', `duplicate standard id: ${item.id}`, { id: item.id });
      ids.add(item.id);
    }
  }
  if (value.requiredContext !== undefined) {
    result.requiredContext = assertArray(value.requiredContext, 'requiredContext').map((item, index) => parseToken(item, `requiredContext[${index}]`));
    if (duplicate(result.requiredContext)) fail('invalid-schema', 'duplicate requiredContext token');
  }
  if (value.optionalContext !== undefined) {
    result.optionalContext = assertArray(value.optionalContext, 'optionalContext').map((item, index) => parseToken(item, `optionalContext[${index}]`));
    if (duplicate(result.optionalContext)) fail('invalid-schema', 'duplicate optionalContext token');
  }
  const facts = (result.frameworks?.length ?? 0) + (result.runtimes?.length ?? 0) + (result.platforms?.length ?? 0) + (result.standards?.length ?? 0) + (result.accessibility?.length ?? 0) + (result.requiredContext?.length ?? 0);
  if (facts === 0) fail('invalid-schema', 'applicability must declare at least one fact or required token');
  return result;
}

export function parseApplicabilityContext(value: unknown): ApplicabilityContext {
  if (!isRecord(value)) fail('invalid-format', 'applicabilityContext must be an object');
  const allowed = new Set(['frameworks', 'runtimes', 'platforms', 'standards', 'accessibility']);
  for (const key of Object.keys(value)) if (!allowed.has(key)) fail('invalid-format', `unknown applicabilityContext field: ${key}`, { field: key });
  const result: ApplicabilityContext = {};
  if (value.frameworks !== undefined) {
    if (!Array.isArray(value.frameworks)) fail('invalid-format', 'applicabilityContext.frameworks must be an array');
    if (value.frameworks.length === 0) fail('invalid-format', 'applicabilityContext.frameworks must not be empty');
    result.frameworks = value.frameworks.map((item, index) => {
      if (!isRecord(item)) fail('invalid-format', `applicabilityContext.frameworks[${index}] must be an object`, { index });
      const name = normalizeName(assertString(item.name, `applicabilityContext.frameworks[${index}].name`));
      const entry: { name: string; version?: string } = { name };
      if (item.version !== undefined) entry.version = assertString(item.version, `applicabilityContext.frameworks[${index}].version`).trim();
      return entry;
    });
  }
  for (const key of ['runtimes', 'platforms', 'accessibility'] as const) {
    const raw = value[key];
    if (raw === undefined) continue;
    if (!Array.isArray(raw)) fail('invalid-format', `applicabilityContext.${key} must be an array`);
    if (raw.length === 0) fail('invalid-format', `applicabilityContext.${key} must not be empty`);
    result[key] = raw.map((item, index) => normalizeName(assertString(item, `applicabilityContext.${key}[${index}]`)));
  }
  if (value.standards !== undefined) {
    if (!Array.isArray(value.standards)) fail('invalid-format', 'applicabilityContext.standards must be an array');
    if (value.standards.length === 0) fail('invalid-format', 'applicabilityContext.standards must not be empty');
    result.standards = value.standards.map((item, index) => {
      if (!isRecord(item)) fail('invalid-format', `applicabilityContext.standards[${index}] must be an object`, { index });
      const entry: { id: string; version: string; conformance?: string } = {
        id: normalizeStandardId(assertString(item.id, `applicabilityContext.standards[${index}].id`)),
        version: assertString(item.version, `applicabilityContext.standards[${index}].version`).trim(),
      };
      if (item.conformance !== undefined) entry.conformance = normalizeConformance(assertString(item.conformance, `applicabilityContext.standards[${index}].conformance`));
      return entry;
    });
  }
  return result;
}

function tokenParts(token: string): { dimension: string; value: string } {
  const separator = token.indexOf(':');
  return { dimension: token.slice(0, separator), value: token.slice(separator + 1) };
}

function allLabels(applicability: Applicability): string[] {
  const labels: string[] = [];
  for (const group of [applicability.frameworks, applicability.runtimes, applicability.platforms, applicability.standards, applicability.accessibility] as const) {
    for (const item of group ?? []) if (item.sourceLabel !== undefined) labels.push(item.sourceLabel);
  }
  return labels;
}

function result(state: ApplicabilityState, reason?: ApplicabilityReason, applicability?: Applicability, requiredContext?: string[]): ApplicabilityResult {
  const value: ApplicabilityResult = { state };
  if (reason !== undefined) value.reason = reason;
  if (requiredContext !== undefined) value.requiredContext = requiredContext;
  if (applicability !== undefined) {
    const labels = allLabels(applicability);
    if (labels.length > 0) value.sourceLabels = labels;
  }
  return value;
}

function duplicate(values: string[]): boolean {
  return new Set(values).size !== values.length;
}

function resolveAlias(name: string, aliases: Record<string, string> | undefined): string {
  return aliases?.[name] ?? name;
}

function normalizedVocab(values: string[]): Set<string> {
  return new Set(values.map(normalizeName));
}

export function evaluateApplicability(
  applicability: Applicability | undefined,
  context: ApplicabilityContext | undefined,
  vocab: ApplicabilityVocab,
  aliases: ApplicabilityAliases = {},
): ApplicabilityResult {
  if (applicability === undefined) return { state: 'applicable' };
  const requiredContext = applicability.requiredContext ? [...applicability.requiredContext] : [];
  if (context === undefined) return result('unresolved', 'required-context-missing', applicability, requiredContext);

  const frameworkAliases = aliases.frameworks;
  const standardAliases = aliases.standards;
  const runtimeVocab = normalizedVocab(vocab.runtimes);
  const platformVocab = normalizedVocab(vocab.platforms);
  const accessibilityVocab = normalizedVocab(vocab.accessibility);
  const suppliedFrameworks = (context.frameworks ?? []).map((item) => ({ ...item, name: resolveAlias(item.name, frameworkAliases) }));
  const suppliedStandards = (context.standards ?? []).map((item) => ({ ...item, id: resolveAlias(item.id, standardAliases) }));

  if (duplicate(suppliedFrameworks.map((item) => item.name)) || duplicate(suppliedStandards.map((item) => item.id))
    || duplicate(context.runtimes ?? []) || duplicate(context.platforms ?? []) || duplicate(context.accessibility ?? [])) {
    return result('unresolved', 'context-conflict', applicability, requiredContext);
  }

  for (const value of context.runtimes ?? []) if (!runtimeVocab.has(value)) return result('unresolved', 'unknown-context', applicability, requiredContext);
  for (const value of context.platforms ?? []) if (!platformVocab.has(value)) return result('unresolved', 'unknown-context', applicability, requiredContext);
  for (const value of context.accessibility ?? []) if (!accessibilityVocab.has(value)) return result('unresolved', 'unknown-context', applicability, requiredContext);

  for (const token of requiredContext) {
    const { dimension, value } = tokenParts(token);
    if (dimension === 'framework') {
      if (context.frameworks === undefined) return result('unresolved', 'required-context-missing', applicability, requiredContext);
      if (!suppliedFrameworks.some((item) => item.name === value)) return result('inapplicable', 'source-inapplicable', applicability, requiredContext);
    } else if (dimension === 'standard') {
      if (context.standards === undefined) return result('unresolved', 'required-context-missing', applicability, requiredContext);
      if (!suppliedStandards.some((item) => item.id === value)) return result('inapplicable', 'source-inapplicable', applicability, requiredContext);
    } else {
      const values = context[dimension as 'runtimes' | 'platforms' | 'accessibility'];
      if (values === undefined) return result('unresolved', 'required-context-missing', applicability, requiredContext);
      if (!values.includes(value)) return result('inapplicable', 'source-inapplicable', applicability, requiredContext);
    }
  }

  for (const fact of applicability.frameworks ?? []) {
    const name = resolveAlias(fact.name, frameworkAliases);
    if (context.frameworks === undefined) return result('unresolved', 'required-context-missing', applicability, requiredContext);
    const matches = suppliedFrameworks.filter((item) => item.name === name);
    if (matches.length === 0) return result('inapplicable', 'source-inapplicable', applicability, requiredContext);
    if (fact.versionRange !== undefined) {
      const supplied = matches[0]!;
      if (supplied.version === undefined) return result('unresolved', 'required-context-missing', applicability, requiredContext);
      let version: string;
      try {
        parseVersion(supplied.version);
        version = supplied.version;
      } catch {
        return result('unresolved', 'unparsed-version', applicability, requiredContext);
      }
      if (!satisfiesVersion(version, fact.versionRange.comparators)) return result('inapplicable', 'source-inapplicable', applicability, requiredContext);
    }
  }

  const valueFacts: Array<[keyof ApplicabilityContext, ValueFact[], Set<string>]> = [
    ['runtimes', applicability.runtimes ?? [], runtimeVocab],
    ['platforms', applicability.platforms ?? [], platformVocab],
    ['accessibility', applicability.accessibility ?? [], accessibilityVocab],
  ];
  for (const [dimension, facts, vocabulary] of valueFacts) {
    if (facts.length === 0) continue;
    const values = context[dimension] as string[] | undefined;
    if (values === undefined) return result('unresolved', 'required-context-missing', applicability, requiredContext);
    for (const value of values) if (!vocabulary.has(value)) return result('unresolved', 'unknown-context', applicability, requiredContext);
    for (const fact of facts) if (!values.includes(fact.value)) return result('inapplicable', 'source-inapplicable', applicability, requiredContext);
  }

  for (const fact of applicability.standards ?? []) {
    const id = resolveAlias(fact.id, standardAliases);
    if (context.standards === undefined) return result('unresolved', 'required-context-missing', applicability, requiredContext);
    const matches = suppliedStandards.filter((item) => item.id === id);
    if (matches.length === 0) return result('inapplicable', 'source-inapplicable', applicability, requiredContext);
    const supplied = matches[0]!;
    if (supplied.version !== fact.version) return result('inapplicable', 'source-inapplicable', applicability, requiredContext);
    if (fact.conformance !== undefined) {
      if (supplied.conformance === undefined) return result('unresolved', 'required-context-missing', applicability, requiredContext);
      if (supplied.conformance !== fact.conformance) return result('inapplicable', 'source-inapplicable', applicability, requiredContext);
    }
  }

  return result('applicable', undefined, applicability, requiredContext);
}
