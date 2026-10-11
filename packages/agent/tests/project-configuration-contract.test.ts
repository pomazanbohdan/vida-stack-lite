import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'bun:test';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { stringify } from 'yaml';
import fc from 'fast-check';
import runtimeSchema from '../schemas/agent-runtime-config.v1.schema.json' with { type: 'json' };
import {
  assertLoadedRuntimeConfig,
  parseRuntimeConfigDocument,
  validateRuntimeConfig,
} from '../src/config/runtime-config.js';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.js';
import {
  composeProjectConfigurationInputs,
  parseProjectConfiguration,
  projectConfigurationInputDigest,
  splitRuntimeConfig,
} from '../src/config/project-configuration.js';
import { LEGACY_RUNTIME_CONFIGURATION_PATH, PROJECT_CONFIGURATION_PATHS } from '../src/config/project-paths.js';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = path.resolve(packageRoot, '../..');
const original = validateRuntimeConfig(
  parseRuntimeConfigDocument(readFileSync(path.join(repositoryRoot, 'agent-runtime.config.v1.yaml'), 'utf8')),
);
const originalDocuments = splitRuntimeConfig(original, LEGACY_RUNTIME_CONFIGURATION_PATH);
const baseInputs = Object.freeze({
  project: stringify(originalDocuments.project, { lineWidth: 0 }),
  agents: stringify(originalDocuments.agents, { lineWidth: 0 }),
  flows: stringify(originalDocuments.flows, { lineWidth: 0 }),
});
const inputPaths = [
  PROJECT_CONFIGURATION_PATHS.project,
  PROJECT_CONFIGURATION_PATHS.agents,
  PROJECT_CONFIGURATION_PATHS.flows,
] as const;
const inputKeys = ['project', 'agents', 'flows'] as const;
const MAX_CONFIG_BYTES = 4 * 1024 * 1024;

/**
 * Contract map for every inventoried function in project-configuration.ts:
 * - projectConfigurationInputDigest: exact ordered path + UTF-8 length + text binding;
 *   digest independently modeled below. Cases: Zero, One, Many, Boundary, Interface, Exception.
 * - validator and compose: lazy Ajv validation, fixed local references, matching identity,
 *   schema revisions, runtime conversion and deep immutable documents. Cases: Simple, One,
 *   Boundary, Interface, Exception. The private functions are reached through real exported APIs.
 * - composeProjectConfigurationInputs: one caller snapshot, parse all three documents, preserve
 *   exact input capture, and expose no caller mutation/accessor effects. Cases: Zero, One, Many,
 *   Boundary, Interface, Exception.
 * - parseProjectConfiguration: same config/documents as composition plus the independent digest.
 *   Cases: Simple, Interface, Exception; parity is asserted against composition.
 * - splitRuntimeConfig: pure value-preserving v1 conversion, including configured local references
 *   and paths. Cases: Zero, One, Many, Boundary, Interface, Exception.
 *
 * Replay and persistence/restart are N/A: these functions parse and convert values in memory and
 * have no state transition or persistence contract. Cross-surface consistency applies as
 * compose/parse/split parity and is asserted below. These developer-authored contracts do not
 * establish numeric coverage, frozen CRAP budgets, or mutation qualification.
 */

describe('project configuration component contracts', () => {
  test('serialize then parse preserves supported IDs and YAML-sensitive settings', () => {
    const identifier = fc.oneof(fc.stringMatching(/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/), fc.constant('z'.repeat(128)));
    const title = fc.oneof(
      fc.string({ minLength: 1, maxLength: 48 }).filter((value) => value.trim().length > 0),
      fc.constantFrom('Ключ: "значення"\n# рядок', '例 & * [ ] { } : \t', 'emoji 🧪 and \u2028 separator'),
    );
    fc.assert(
      fc.property(identifier, title, (configId, repositoryTitle) => {
        const config = {
          ...original,
          config_id: configId,
          repository: { ...original.repository, title: repositoryTitle },
        };
        const documents = splitRuntimeConfig(config, LEGACY_RUNTIME_CONFIGURATION_PATH);
        const inputs = {
          project: stringify(documents.project),
          agents: stringify(documents.agents),
          flows: stringify(documents.flows),
        };
        const parsed = parseProjectConfiguration(inputs, undefined, LEGACY_RUNTIME_CONFIGURATION_PATH);
        expect(parsed.config).toEqual(config);
        expect(parsed.documents).toEqual(documents);
      }),
      { seed: 20261010, numRuns: 50 },
    );
  });

  test('splits and recomposes the genuine repository v1 configuration without changing values or references', () => {
    const roundTrip = splitRuntimeConfig(original, LEGACY_RUNTIME_CONFIGURATION_PATH);
    expect(roundTrip).toEqual(originalDocuments);
    expect(roundTrip.project.components).toEqual({ agents: 'agents.yaml', flows: 'flows.yaml' });
    expect(roundTrip.project.schema).toBe('VidaProjectConfig/v1');
    expect(roundTrip.agents.schema).toBe('VidaAgentsConfig/v1');
    expect(roundTrip.flows.schema).toBe('VidaFlowsConfig/v1');
    expect(roundTrip.project.revision).toBe(original.config_revision);
    expect(roundTrip.project.research_decision.registry.instructions).toEqual(
      original.research_decision.registry.instructions,
    );
    expect(roundTrip.project.knowledge).toEqual(original.knowledge);
    for (const source of original.knowledge.sources.filter((entry) => entry.kind === 'local')) {
      expect(existsSync(path.resolve(repositoryRoot, source.location))).toBe(true);
    }
    expect(Object.isFrozen(roundTrip)).toBe(true);
    expect(Object.isFrozen(roundTrip.project)).toBe(true);
    expect(Object.isFrozen(roundTrip.project.knowledge.sources)).toBe(true);
  });

  test('parse and compose return equivalent immutable values and bind all captured files', () => {
    const composed = composeProjectConfigurationInputs(baseInputs, repositoryRoot, LEGACY_RUNTIME_CONFIGURATION_PATH);
    const parsed = parseProjectConfiguration(baseInputs, repositoryRoot, LEGACY_RUNTIME_CONFIGURATION_PATH);
    expect(parsed.config).toEqual(composed.config);
    expect(parsed.documents).toEqual(composed.documents);
    expect(Object.keys(parsed).sort()).toEqual(['config', 'documents', 'input_digest']);
    expect(isFrozenTree(parsed.documents)).toBe(true);
    expect(() => assertLoadedRuntimeConfig(parsed.config)).toThrow(/must come from loadRuntimeConfig/);
    expect(parsed.input_digest).toBe(independentDigest(composed.captured));
    expect(Object.keys(composed.captured).sort()).toEqual(['agents', 'flows', 'project']);
    expect(composed.captured).toEqual(baseInputs);
  });

  test('accepts project source references emitted by the project layout caller', () => {
    const inputs = projectSourceInputs();
    expect(() => parseProjectConfiguration(inputs, undefined, PROJECT_CONFIGURATION_PATHS.project)).not.toThrow();
  });

  test('captures own input text before caller changes and rejects accessors without invoking them', () => {
    const mutable = { ...baseInputs };
    const composed = composeProjectConfigurationInputs(mutable);
    const captured = structuredClone(composed.captured);
    mutable.project = 'schema: changed\n';
    mutable.agents = '';
    expect(composed.captured).toEqual(captured);
    expect(isFrozenTree(composed.documents)).toBe(true);
    expect(isFrozenTree(composed.config)).toBe(true);

    let getterCalls = 0;
    const accessorInput = { ...baseInputs };
    Object.defineProperty(accessorInput, 'project', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return baseInputs.project;
      },
    });
    expect(() => composeProjectConfigurationInputs(accessorInput)).toThrow(/own data properties/);
    expect(() => projectConfigurationInputDigest(accessorInput)).toThrow(/own data properties/);
    expect(getterCalls).toBe(0);
  });

  test('returns the captured file set as an immutable snapshot', () => {
    const composed = composeProjectConfigurationInputs(baseInputs);
    expect(isFrozenTree(composed.captured)).toBe(true);
  });

  test('independently binds exact path, byte length and text in the fixed input order', () => {
    const expected = independentDigest(baseInputs);
    expect(projectConfigurationInputDigest(baseInputs)).toBe(expected);
    expect(
      projectConfigurationInputDigest({
        flows: baseInputs.flows,
        project: baseInputs.project,
        agents: baseInputs.agents,
      }),
    ).toBe(expected);
    for (const key of inputKeys) {
      const changed: Record<'project' | 'agents' | 'flows', string> = { ...baseInputs, [key]: `${baseInputs[key]}\n` };
      expect(projectConfigurationInputDigest(changed)).not.toBe(expected);
    }
    const revision = { ...asRecord(parseRuntimeConfigDocument(baseInputs.project)) };
    revision.revision = Number(revision.revision) + 1;
    const revisionInput = { ...baseInputs, project: stringify(revision, { lineWidth: 0 }) };
    expect(projectConfigurationInputDigest(revisionInput)).not.toBe(expected);
  });

  test('requires exactly the three fixed text inputs', () => {
    for (const invalid of [
      {},
      { project: '', agents: '', flows: '', extra: 'unexpected' },
      { project: '', agents: undefined, flows: '' },
    ]) {
      expect(() => projectConfigurationInputDigest(invalid)).toThrow();
      expect(() => composeProjectConfigurationInputs(invalid)).toThrow();
    }
  });

  test('accepts the aggregate byte limit and rejects one byte over it', () => {
    const exact = { project: 'p'.repeat(MAX_CONFIG_BYTES), agents: '', flows: '' };
    expect(projectConfigurationInputDigest(exact)).toBe(independentDigest(exact));
    expect(() => projectConfigurationInputDigest({ ...exact, flows: 'x' })).toThrow(/byte budget/);
  });

  test('runtime schema caps every unrestricted integer at the safe boundary', () => {
    const ajv = new Ajv2020({ strict: true, allErrors: false, ownProperties: true });
    ajv.addSchema(runtimeSchema);
    const validate = ajv.getSchema('https://agent-runtime.invalid/schemas/agent-runtime-config.v1.schema.json');
    if (validate === undefined) throw new Error('runtime config schema was not registered');
    const fields: readonly (readonly (string | number)[])[] = [
      ['config_revision'],
      ['workflow_bindings', 0, 'priority'],
      ['research_decision', 'registry', 'revision'],
      ['research_decision', 'registry', 'instructions', 0, 'revision'],
      ['governance', 'edictum', 'limits', 'max_attempts'],
      ['governance', 'edictum', 'limits', 'max_tool_calls'],
      ['governance', 'edictum', 'limits', 'max_calls_per_tool', 'runtime.read'],
      ['governance', 'edictum', 'approval', 'clock_skew_ms'],
      ['governance', 'edictum', 'approval', 'max_age_ms'],
      ['verification', 'differential', 'execution', 'operation_timeout_ms'],
      ['verification', 'differential', 'execution', 'worker_output_bytes'],
      ['observability', 'max_error_log_bytes'],
      ['timing', 'threshold_ms'],
    ];
    for (const field of fields) {
      const atBoundary = structuredClone(original);
      setNumericField(atBoundary, field, Number.MAX_SAFE_INTEGER);
      expect(validate(atBoundary), field.join('.')).toBe(true);

      const overBoundary = structuredClone(original);
      setNumericField(overBoundary, field, Number.MAX_SAFE_INTEGER + 1);
      expect(validate(overBoundary), field.join('.')).toBe(false);
    }
  });

  test('runtime config revisions use the canonical safe integer boundary', () => {
    const safeMaximum = Number.MAX_SAFE_INTEGER;
    const atBoundary = validateRuntimeConfig({ ...original, config_revision: safeMaximum });
    expect(atBoundary.config_revision).toBe(safeMaximum);
    expect(() => validateRuntimeConfig({ ...original, config_revision: safeMaximum + 1 })).toThrow(
      /canonical JSON numbers/,
    );
  });

  test('enforces schema versions, local component references, identity and safe revision bounds', () => {
    const parsed = asRecord(parseRuntimeConfigDocument(baseInputs.project));
    const wrongSchema = { ...parsed, schema: 'VidaProjectConfig/v2' };
    expect(() => composeProjectConfigurationInputs({ ...baseInputs, project: stringify(wrongSchema) })).toThrow(
      /schema is invalid/,
    );
    const movedReference = { ...parsed, components: { agents: 'elsewhere.yaml', flows: 'flows.yaml' } };
    expect(() => composeProjectConfigurationInputs({ ...baseInputs, project: stringify(movedReference) })).toThrow(
      /schema is invalid/,
    );

    const agentsDoc = asRecord(parseRuntimeConfigDocument(baseInputs.agents));
    agentsDoc.config_id = 'different-project';
    expect(() => composeProjectConfigurationInputs({ ...baseInputs, agents: stringify(agentsDoc) })).toThrow(
      /identities differ/,
    );

    const safeMaximum = Number.MAX_SAFE_INTEGER;
    const maxProject = { ...parsed, revision: safeMaximum };
    const maxAgents = { ...agentsDoc, config_id: parsed.config_id, revision: safeMaximum };
    const flowsDoc = { ...asRecord(parseRuntimeConfigDocument(baseInputs.flows)), revision: safeMaximum };
    expect(() =>
      composeProjectConfigurationInputs({
        project: stringify(maxProject),
        agents: stringify(maxAgents),
        flows: stringify(flowsDoc),
      }),
    ).not.toThrow();
    for (const { revision: invalidRevision, error: expectedError } of [
      { revision: 0, error: /schema is invalid/ },
      { revision: -1, error: /schema is invalid/ },
      { revision: 1.5, error: /schema is invalid/ },
      { revision: Number.MAX_SAFE_INTEGER + 1, error: /canonical JSON numbers/ },
    ]) {
      expect(() =>
        composeProjectConfigurationInputs({
          ...baseInputs,
          agents: stringify({ ...asRecord(parseRuntimeConfigDocument(baseInputs.agents)), revision: invalidRevision }),
        }),
      ).toThrow(expectedError);
    }
  });

  test('rejects malformed, multi-document, aliased, over-deep and invalid Unicode inputs', () => {
    for (const invalid of [
      'project: [\n',
      `${baseInputs.project}\n---\nschema: second-document\n`,
      'schema: VidaProjectConfig/v1\nanchor: &base { value: 1 }\ncopy: *base\n',
      `x: ${'['.repeat(65)}0${']'.repeat(65)}\n`,
      `x:\n${'  '.repeat(65)}leaf: 0\n`,
    ]) {
      expect(() => parseProjectConfiguration({ ...baseInputs, project: invalid })).toThrow();
    }
    const loneSurrogate = { project: '\ud800', agents: '', flows: '' };
    expect(() => projectConfigurationInputDigest(loneSurrogate)).toThrow(/invalid Unicode/);
  });
});

function independentDigest(inputs: Readonly<Record<'project' | 'agents' | 'flows', string>>): string {
  const hash = createHash('sha256');
  hash.update('VidaProjectConfigurationInputs/v1\0');
  const keys = inputKeys;
  for (let index = 0; index < inputPaths.length; index += 1) {
    const key = keys[index];
    const inputPath = inputPaths[index];
    if (key === undefined || inputPath === undefined) throw new Error('Digest input order is incomplete.');
    const text = inputs[key];
    const bytes = Buffer.byteLength(text, 'utf8');
    hash.update(inputPath);
    hash.update('\0');
    hash.update(String(bytes));
    hash.update('\0');
    hash.update(text);
  }
  return hash.digest('hex');
}

function projectSourceInputs(): Readonly<Record<'project' | 'agents' | 'flows', string>> {
  const project = asRecord(parseRuntimeConfigDocument(baseInputs.project));
  const research = asRecord(project.research_decision);
  const registry = asRecord(research.registry);
  if (!Array.isArray(registry.instructions)) throw new TypeError('Expected instruction rows.');
  const instructions = registry.instructions.map((value, index) => ({
    ...asRecord(value),
    source_path: `${PROJECT_CONFIGURATION_PATHS.project}#research_decision.registry.instructions.${index}`,
  }));
  const registryBody: Record<string, unknown> = { ...registry, instructions };
  delete registryBody.digest;
  const projectYaml = stringify(
    {
      ...project,
      research_decision: { ...research, registry: { ...registryBody, digest: canonicalJsonDigest(registryBody) } },
    },
    { lineWidth: 0 },
  );
  return { ...baseInputs, project: projectYaml };
}

/** @param {unknown} value @returns {boolean} */
function isFrozenTree(value: unknown): boolean {
  if (value === null || typeof value !== 'object') return true;
  if (!Object.isFrozen(value)) return false;
  return Reflect.ownKeys(value).every((key) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor !== undefined && isFrozenTree(descriptor.value);
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Expected a record.');
  return value as Record<string, unknown>;
}

function setNumericField(root: unknown, pathParts: readonly (string | number)[], value: number): void {
  let current: unknown = root;
  for (const segment of pathParts.slice(0, -1)) {
    if (typeof segment === 'number') {
      if (!Array.isArray(current) || current[segment] === undefined) throw new Error('numeric test path is invalid');
      current = current[segment];
    } else {
      if (typeof current !== 'object' || current === null || !(segment in current))
        throw new Error('numeric test path is invalid');
      current = (current as Record<string, unknown>)[segment];
    }
  }
  const leaf = pathParts[pathParts.length - 1];
  if (typeof leaf !== 'string' || typeof current !== 'object' || current === null)
    throw new Error('numeric test path leaf is invalid');
  (current as Record<string, unknown>)[leaf] = value;
}
