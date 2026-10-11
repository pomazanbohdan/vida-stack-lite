import { Ajv } from 'ajv';

export type PatternState = 'present' | 'missing' | 'not-applicable' | 'unreviewed';
export const patternNames = [
  'contract',
  'zombies',
  'persistence',
  'restart',
  'crossSurface',
  'cas',
  'unknown',
  'auth',
] as const;
export type PatternName = (typeof patternNames)[number];
type PatternMap = Partial<Record<PatternName, PatternState>>;
type ProfileFunction = {
  identity: string;
  risk?: { reviewed: true; priority: 'P0' | 'P1'; rationale: string };
  cases: Array<{
    file: string;
    name: string;
    scenario: string;
    overrides?: PatternMap;
    justification?: string;
  }>;
};
export type ProfileDocument = {
  schemaVersion: 2;
  configHash: string;
  sourceHashes: Record<string, string>;
  testHashes: Record<string, string>;
  profiles: Array<{ id: string; patterns: PatternMap; justification?: string }>;
  scenarios: Array<{ id: string; profile: string; patterns?: PatternMap; justification?: string }>;
  functions: ProfileFunction[];
};

const states = ['present', 'missing', 'not-applicable', 'unreviewed'];
const sha256Schema = { type: 'string', pattern: '^[a-f0-9]{64}$' };
const hashMapSchema = { type: 'object', additionalProperties: sha256Schema };
const patternSchema = {
  type: 'object',
  additionalProperties: false,
  properties: Object.fromEntries(patternNames.map((key) => [key, { enum: states }])),
};
const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['schemaVersion', 'configHash', 'sourceHashes', 'testHashes', 'profiles', 'scenarios', 'functions'],
  properties: {
    schemaVersion: { const: 2 },
    configHash: sha256Schema,
    sourceHashes: hashMapSchema,
    testHashes: hashMapSchema,
    profiles: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'patterns'],
        properties: {
          id: { type: 'string', minLength: 1 },
          patterns: patternSchema,
          justification: { type: 'string' },
        },
      },
    },
    scenarios: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'profile'],
        properties: {
          id: { type: 'string', minLength: 1 },
          profile: { type: 'string', minLength: 1 },
          patterns: patternSchema,
          justification: { type: 'string' },
        },
      },
    },
    functions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['identity', 'cases'],
        properties: {
          identity: { type: 'string', minLength: 1 },
          risk: {
            type: 'object',
            additionalProperties: false,
            required: ['reviewed', 'priority', 'rationale'],
            properties: {
              reviewed: { const: true },
              priority: { enum: ['P0', 'P1'] },
              rationale: { type: 'string', minLength: 12 },
            },
          },
          cases: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['file', 'name', 'scenario'],
              properties: {
                file: { type: 'string', minLength: 1 },
                name: { type: 'string', minLength: 1 },
                scenario: { type: 'string', minLength: 1 },
                overrides: patternSchema,
                justification: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
} as const;

const validateProfile = new Ajv({ allErrors: false }).compile(schema);

function mergePatterns(...maps: Array<PatternMap | undefined>): PatternMap {
  const merged: PatternMap = {};
  for (const map of maps) {
    if (!map) continue;
    for (const [name, state] of Object.entries(map)) if (state) merged[name as PatternName] = state;
  }
  return merged;
}

function uniqueIndex<T extends { id: string }>(entries: T[]): Map<string, T> | null {
  const result = new Map<string, T>();
  for (const entry of entries) {
    if (result.has(entry.id)) return null;
    result.set(entry.id, entry);
  }
  return result;
}

function profilePatterns(
  profile: ProfileDocument['profiles'][number],
  scenario: ProfileDocument['scenarios'][number],
  local: ProfileFunction['cases'][number],
): { patterns: PatternMap; justification?: string } {
  const patterns = mergePatterns(profile.patterns, scenario.patterns, local.overrides);
  const justification = local.justification ?? scenario.justification ?? profile.justification;
  return { patterns, ...(justification ? { justification } : {}) };
}

export function normalizeProfile(value: unknown): Record<string, unknown> | null {
  if (!validateProfile(value)) return null;
  const document = value as ProfileDocument;
  const profiles = uniqueIndex(document.profiles);
  const scenarios = uniqueIndex(document.scenarios);
  if (!profiles || !scenarios) return null;
  const usedScenarios = new Set<string>();
  const normalized = normalizeFunctions(document.functions, profiles, scenarios, usedScenarios);
  if (!normalized || usedScenarios.size !== scenarios.size) return null;
  return {
    schemaVersion: 1,
    configHash: document.configHash,
    sourceHashes: document.sourceHashes,
    testHashes: document.testHashes,
    functions: normalized,
  };
}

function normalizeFunctions(
  functions: ProfileFunction[],
  profiles: Map<string, ProfileDocument['profiles'][number]>,
  scenarios: Map<string, ProfileDocument['scenarios'][number]>,
  usedScenarios: Set<string>,
): Array<{ identity: string; cases: Array<Record<string, unknown>>; risk?: ProfileFunction['risk'] }> | null {
  const normalized = [];
  for (const entry of functions) {
    const result = normalizeFunction(entry, profiles, scenarios, usedScenarios);
    if (!result) return null;
    normalized.push(result);
  }
  return normalized;
}

function normalizeFunction(
  entry: ProfileFunction,
  profiles: Map<string, ProfileDocument['profiles'][number]>,
  scenarios: Map<string, ProfileDocument['scenarios'][number]>,
  usedScenarios: Set<string>,
): { identity: string; cases: Array<Record<string, unknown>>; risk?: ProfileFunction['risk'] } | null {
  const cases = [];
  for (const item of entry.cases) {
    const scenario = scenarios.get(item.scenario);
    const profile = scenario ? profiles.get(scenario.profile) : undefined;
    if (!scenario || !profile) return null;
    usedScenarios.add(scenario.id);
    const resolved = profilePatterns(profile, scenario, item);
    cases.push({
      file: item.file,
      name: item.name,
      patterns: resolved.patterns,
      justification: resolved.justification,
    });
  }
  return { identity: entry.identity, cases, ...(entry.risk ? { risk: entry.risk } : {}) };
}

export function draftProfile(report: {
  inputHashes: { sources: Record<string, string>; tests: Record<string, string>; config: string };
  functions: Array<{ identity: string; cases: Array<{ file: string; name: string }> }>;
  cases: Array<{ file: string; name: string; assertion: boolean; skipped: boolean }>;
}): ProfileDocument {
  const eligibleCases = new Set(
    report.cases.filter((item) => item.assertion && !item.skipped).map((item) => `${item.file}\0${item.name}`),
  );
  const scenarioByCase = new Map<string, string>();
  const functions: ProfileFunction[] = [];
  for (const row of report.functions) {
    const cases = row.cases.filter((item) => eligibleCases.has(`${item.file}\0${item.name}`));
    if (!cases.length) continue;
    const links = cases.map((item) => {
      const key = `${item.file}\0${item.name}`;
      const scenario = scenarioByCase.get(key) ?? `case-${scenarioByCase.size + 1}`;
      scenarioByCase.set(key, scenario);
      return { file: item.file, name: item.name, scenario };
    });
    functions.push({ identity: row.identity, cases: links });
  }
  const scenarios = [...scenarioByCase].map(([key, id]) => {
    const [file, name] = key.split('\0');
    return { id, profile: 'unreviewed-default', case: { file, name } };
  });
  return {
    schemaVersion: 2,
    configHash: report.inputHashes.config,
    sourceHashes: report.inputHashes.sources,
    testHashes: report.inputHashes.tests,
    profiles: [{ id: 'unreviewed-default', patterns: {} }],
    scenarios: scenarios.map(({ id, profile }) => ({ id, profile })),
    functions,
  };
}
