import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'bun:test';
import { stringify } from 'yaml';
import { parseRuntimeConfigDocument, validateRuntimeConfig } from '../src/config/runtime-config.ts';
import { prepareVidaProjectConfiguration } from '../src/config/project-layout.ts';
import {
  composeProjectConfigurationInputs,
  parseProjectConfiguration,
  splitRuntimeConfig,
  type ProjectConfiguration,
} from '../src/config/project-configuration.ts';
import { LEGACY_RUNTIME_CONFIGURATION_PATH, PROJECT_CONFIGURATION_PATHS } from '../src/config/project-paths.ts';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const candidateRoot = path.resolve(packageRoot, '../..');
const original = validateRuntimeConfig(
  parseRuntimeConfigDocument(readFileSync(path.join(candidateRoot, 'agent-runtime.config.v1.yaml'), 'utf8')),
  undefined,
  LEGACY_RUNTIME_CONFIGURATION_PATH,
);
const sourceTail = '#research_decision.registry.instructions.';

type ProjectConfigurationInputs = {
  readonly project: string;
  readonly agents: string;
  readonly flows: string;
};

/**
 * Contract matrix for this focused source-domain correction:
 * - Zero: current genuine legacy instructions and prepared .vida instructions both round-trip.
 * - One: one selected source is checked against the exact registry index.
 * - Many: every selected source in both domains remains exact across split/compose/parse.
 * - Boundary: source names are finite exact alternatives; foreign and traversal suffixes deny.
 * - Interface: validate, prepare, split, compose and parse share the same selected-source rule.
 * - Exception: mixed/stale/foreign/index/traversal bindings and bad content digests deny.
 * Replay/persistence are N/A: these are pure configuration transforms; no external state changes.
 */
describe('project instruction source domains', () => {
  test('round-trips genuine legacy and prepared .vida instructions through real split and composition', () => {
    const legacy = splitRuntimeConfig(original, LEGACY_RUNTIME_CONFIGURATION_PATH);
    expect(legacy.project.research_decision.registry.instructions).toEqual(
      original.research_decision.registry.instructions,
    );
    const legacyInputs = asInputs(legacy);
    const legacyParsed = parseProjectConfiguration(legacyInputs, undefined, LEGACY_RUNTIME_CONFIGURATION_PATH);
    expect(legacyParsed.config).toEqual(original);
    expect(
      composeProjectConfigurationInputs(legacyInputs, undefined, LEGACY_RUNTIME_CONFIGURATION_PATH).config,
    ).toEqual(original);

    const prepared = prepareVidaProjectConfiguration(original);
    const preparedInstructions = prepared.documents.project.research_decision.registry.instructions;
    expect(preparedInstructions.length).toBeGreaterThan(0);
    preparedInstructions.forEach((instruction, index) => {
      expect(instruction.source_path).toBe(PROJECT_CONFIGURATION_PATHS.project + sourceTail + index);
    });
    const parsed = parseProjectConfiguration(prepared.inputs, undefined, PROJECT_CONFIGURATION_PATHS.project);
    const composed = composeProjectConfigurationInputs(prepared.inputs, undefined, PROJECT_CONFIGURATION_PATHS.project);
    expect(parsed.config).toEqual(prepared.config);
    expect(composed.config).toEqual(prepared.config);
    expect(splitRuntimeConfig(prepared.config, PROJECT_CONFIGURATION_PATHS.project)).toEqual(prepared.documents);
  });

  test('accepts each domain only when it is the explicitly selected source', () => {
    const prepared = prepareVidaProjectConfiguration(original);
    const legacy = splitRuntimeConfig(original, LEGACY_RUNTIME_CONFIGURATION_PATH);
    const vidaInputs = prepared.inputs;
    const legacyInputs = asInputs(legacy);

    expect(() => parseProjectConfiguration(legacyInputs, undefined, LEGACY_RUNTIME_CONFIGURATION_PATH)).not.toThrow();
    expect(() => parseProjectConfiguration(vidaInputs, undefined, PROJECT_CONFIGURATION_PATHS.project)).not.toThrow();
    expect(() => parseProjectConfiguration(legacyInputs, undefined, PROJECT_CONFIGURATION_PATHS.project)).toThrow();
    expect(() => parseProjectConfiguration(vidaInputs, undefined, LEGACY_RUNTIME_CONFIGURATION_PATH)).toThrow();
  });

  test('rejects mixed, stale, foreign, wrong-index and suffix-traversal source bindings', () => {
    const prepared = prepareVidaProjectConfiguration(original);
    const inputs = prepared.documents;
    const first = inputs.project.research_decision.registry.instructions[0];
    if (first === undefined) throw new Error('Expected a configured instruction row.');
    const invalid = [
      withSource(inputs, 0, LEGACY_RUNTIME_CONFIGURATION_PATH + sourceTail + '0'),
      withSource(inputs, 0, PROJECT_CONFIGURATION_PATHS.project + sourceTail + '64'),
      withSource(inputs, 0, '.other/project.yaml' + sourceTail + '0'),
      withSource(inputs, 0, '.vida/project.yaml/../project.yaml' + sourceTail + '0'),
    ];
    invalid.forEach((candidate) =>
      expect(() => parseProjectConfiguration(candidate, undefined, PROJECT_CONFIGURATION_PATHS.project)).toThrow(),
    );
    expect(() =>
      parseProjectConfiguration(
        withSource(inputs, 0, PROJECT_CONFIGURATION_PATHS.project + sourceTail + '0'),
        undefined,
        LEGACY_RUNTIME_CONFIGURATION_PATH,
      ),
    ).toThrow();
    expect(first.source_path).toBe(PROJECT_CONFIGURATION_PATHS.project + sourceTail + '0');
  });

  test('rejects stale instruction content digests after otherwise valid source binding', () => {
    const prepared = prepareVidaProjectConfiguration(original);
    const project = prepared.documents.project;
    const registry = project.research_decision.registry;
    const instructions = registry.instructions.map((instruction, index) =>
      index === 0 ? { ...instruction, source_sha256: '0'.repeat(64) } : instruction,
    );
    const registryBody = { ...registry, instructions };
    const withoutDigest = Object.fromEntries(Object.entries(registryBody).filter(([key]) => key !== 'digest'));
    const invalidProject: ProjectConfiguration['project'] = {
      ...project,
      research_decision: {
        ...project.research_decision,
        registry: { ...registryBody, digest: canonicalJsonDigest(withoutDigest) },
      },
    };
    const invalid = {
      ...prepared.inputs,
      project: stringify(invalidProject, { lineWidth: 0 }),
    };
    expect(() => parseProjectConfiguration(invalid, undefined, PROJECT_CONFIGURATION_PATHS.project)).toThrow(
      /instruction source digest is stale/,
    );
  });

  test('pins the complete canonical schema bytes to the schema activated by the validator', () => {
    const schemaBytes = readFileSync(path.join(packageRoot, 'schemas/agent-runtime-config.v1.schema.json'));
    const source = readFileSync(path.join(packageRoot, 'src/config/runtime-config.ts'), 'utf8');
    const pin = source.match(/const CONFIG_SCHEMA_SHA256 = '([0-9a-f]{64})';/u)?.[1];
    if (pin === undefined) throw new Error('Runtime schema digest pin is missing.');
    expect(createHash('sha256').update(schemaBytes).digest('hex')).toBe(pin);
  });
});

function asInputs(documents: ProjectConfiguration): ProjectConfigurationInputs {
  return {
    project: stringify(documents.project, { lineWidth: 0 }),
    agents: stringify(documents.agents, { lineWidth: 0 }),
    flows: stringify(documents.flows, { lineWidth: 0 }),
  };
}

function withSource(inputs: ProjectConfiguration, index: number, source: string): ProjectConfigurationInputs {
  const instructions = inputs.project.research_decision.registry.instructions.map((instruction, row) =>
    row === index ? { ...instruction, source_path: source } : instruction,
  );
  const registryBody = { ...inputs.project.research_decision.registry, instructions };
  const registryWithoutDigest = Object.fromEntries(Object.entries(registryBody).filter(([key]) => key !== 'digest'));
  return asInputs({
    ...inputs,
    project: {
      ...inputs.project,
      research_decision: {
        ...inputs.project.research_decision,
        registry: { ...registryBody, digest: canonicalJsonDigest(registryWithoutDigest) },
      },
    },
  });
}
