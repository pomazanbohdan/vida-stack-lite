import { describe, expect, test } from 'bun:test';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validateAgainstSchema, validateSchemaDefinition, type Schema } from '../skills/vp-mode/scripts/schema.ts';

function readSchema(name: string): Schema {
  return JSON.parse(readFileSync(fileURLToPath(new URL(`../config/${name}`, import.meta.url)), 'utf8')) as Schema;
}

const catalogSchema = readSchema('vpcatalog.v1.schema.json');
const instructionSchema = readSchema('vpinstruction.v1.schema.json');
const profileSchema = readSchema('vpeffectiveprofile.v1.schema.json');
const sourceProfileSchema = readSchema('vpmethodologyprofile.v1.schema.json');
const corpusMapSchema = readSchema('vpcorpusmap.v1.schema.json');

const catalog = {
  schema: 'VPCatalog/v1', catalog_id: 'vida-powers', revision: 1, source_revision: 'a'.repeat(40),
  updated_at: '2026-10-19T00:00:00Z',
  tag_dictionary: { capability: { 'write-tests-first': 'Write tests before code' }, pattern: { 'test-first-development': 'Test first' } },
  // Task 5 validates alias membership; each key maps alias → canonical tag.
  tag_aliases: { tdd: 'test-first-development' },
  tag_exemptions: [{ instruction_id: 'example-rule', dimension: 'capability', reason: 'Exception reason' }],
  instructions: [{ instruction_id: 'example-rule', path: 'instructions/example-rule.md', sha256: 'a'.repeat(64) }],
};

const instruction = {
  instruction_id: 'test-first-development', title: 'Test first', summary: 'Write a test before implementation.',
  capability_tags: ['write-tests-first'], pattern_tags: ['test-first-development'],
  conditions_applies_when: 'A behavior change is made.', conditions_does_not_apply_when: 'Only documentation changes.',
  artifact_contract_output_type: 'none', artifact_contract_required_data: [], artifact_contract_verified_by: '',
  compatibility_excludes: [], compatibility_requires: [],
  provenance: ['donor=superpowers; license=MIT; revision=0123456789abcdef0123456789abcdef01234567; path=skills/test/SKILL.md'],
  status: 'active', revision: 1,
};

const profile = {
  schema: 'VPEffectiveProfile/v1',
  groups: {
    'testing-sequence': { active: 'test-first-development', alternatives: ['test-first-development', 'test-after-development'] },
  },
};

describe('production VP schemas', () => {
  test('all config schema definitions are structurally valid', () => {
    const configDir = fileURLToPath(new URL('../config/', import.meta.url));
    const schemaFiles = readdirSync(configDir).filter((name) => name.endsWith('.schema.json'));
    expect(schemaFiles.length).toBeGreaterThan(0);
    for (const name of schemaFiles) expect(validateSchemaDefinition(readSchema(name))).toEqual([]);
  });
  test('accept valid catalog, frontmatter instruction, and effective profile documents', () => {
    expect(validateAgainstSchema(catalog, catalogSchema)).toEqual([]);
    expect(validateAgainstSchema(instruction, instructionSchema)).toEqual([]);
    expect(validateAgainstSchema(profile, profileSchema)).toEqual([]);
  });

  test('validates optional flow and verification profile fields without breaking the groups-only profile', () => {
    const complete = {
      ...profile,
      flow_level: 'medium',
      verification: {
        available_models: [{ provider: 'provider', model: 'model', family: 'family', roles: ['main', 'agent'], available: true }],
        lane_assignment: [{ lane: 'review', provider: 'provider', model: 'model', blind: true }],
        lane_policy: 'blind-same-model', limitations: 'One model is available.',
      },
    };
    expect(validateAgainstSchema(complete, profileSchema)).toEqual([]);
    expect(validateAgainstSchema({ ...profile, flow_level: 'unknown' }, profileSchema)).toEqual([
      'flow_level: must be one of enum values',
    ]);
    expect(validateAgainstSchema(profile, profileSchema)).toEqual([]);
  });

  test('validates the source methodology profile schema and rejects extra object properties', () => {
    const source = { schema: 'VPMethodologyProfile/v1', groups: [{ id: 'policy', title: 'Policy', description: 'Choice.', user_decision: false, default: 'test-first-development', alternatives: [
      { id: 'test-first-development', title: 'Test first', description: 'Test before implementation.', instruction_ids: [] },
    ] }] };
    expect(validateAgainstSchema(source, sourceProfileSchema)).toEqual([]);
    expect(validateAgainstSchema({ ...source, extra: true }, sourceProfileSchema)).toEqual(['extra: additional property']);
  });

  test('enforces corpus map status conditions', () => {
    const map = {
      schema: 'VPCorpusMap/v1', revision: 1, updated_at: '2026-10-19T00:00:00Z',
      donors: { donor: { source_revision: 'a'.repeat(40), files: { 'skill.md': { status: 'converted', instruction_ids: ['test-first-development'] } } } },
    };
    expect(validateAgainstSchema(map, corpusMapSchema)).toEqual([]);
    expect(validateAgainstSchema({ ...map, donors: { donor: { ...map.donors.donor, files: { 'skill.md': { status: 'rejected', reason: 'out of scope' } } } } }, corpusMapSchema)).toEqual([]);
    expect(validateAgainstSchema({ ...map, donors: { donor: { ...map.donors.donor, files: { 'skill.md': { status: 'rejected', reason: 'out of scope', instruction_ids: ['test-first-development'] } } } } }, corpusMapSchema)).toEqual([
      'donors.donor.files.skill.md: must not match the excluded schema',
    ]);
    expect(validateAgainstSchema({ ...map, donors: { donor: { ...map.donors.donor, files: { 'skill.md': { status: 'converted' } } } } }, corpusMapSchema)).toEqual([
      'donors.donor.files.skill.md.instruction_ids: required',
    ]);
    expect(validateAgainstSchema({ ...map, donors: { donor: { ...map.donors.donor, files: { 'skill.md': { status: 'rejected' } } } } }, corpusMapSchema)).toEqual([
      'donors.donor.files.skill.md.reason: required',
    ]);
  });

  test('checks catalog fields and dynamic string maps with exact errors', () => {
    expect(validateAgainstSchema({ ...catalog, catalog_id: '' }, catalogSchema)).toEqual([
      'catalog_id: must have at least 1 characters',
    ]);
    expect(validateAgainstSchema({ ...catalog, tag_dictionary: { capability: { nope: '' }, pattern: {} } }, catalogSchema)).toEqual([
      'tag_dictionary.capability.nope: must have at least 1 characters',
    ]);
    expect(validateAgainstSchema({ ...catalog, tag_aliases: { tdd: 1 } }, catalogSchema)).toEqual([
      'tag_aliases.tdd: expected string',
    ]);
    expect(validateAgainstSchema({ ...catalog, schema: 'wrong' }, catalogSchema)).toEqual(['schema: must equal const value']);
    expect(validateAgainstSchema({ ...catalog, revision: 0 }, catalogSchema)).toEqual(['revision: must be >= 1']);
    expect(validateAgainstSchema({ ...catalog, tag_dictionary: { capability: {}, pattern: {} }, extra: true }, catalogSchema)).toEqual([
      'extra: additional property',
    ]);
    expect(validateAgainstSchema({ ...catalog, tag_exemptions: [{ instruction_id: 'valid-id', dimension: 'other', reason: 'why' }] }, catalogSchema)).toEqual([
      'tag_exemptions[0].dimension: must be one of enum values',
    ]);
    expect(validateAgainstSchema({ ...catalog, instructions: [{ instruction_id: 'valid-id', path: 'x', sha256: 'bad' }] }, catalogSchema)).toEqual([
      'instructions[0].sha256: must match pattern',
    ]);
    expect(validateAgainstSchema({ ...catalog, instructions: [{ instruction_id: 'Bad_Id', path: 'x', sha256: 'a'.repeat(64) }] }, catalogSchema)).toEqual([
      'instructions[0].instruction_id: must match pattern',
    ]);
    expect(validateAgainstSchema({ ...catalog, tag_exemptions: [{ instruction_id: 'Bad_Id', dimension: 'capability', reason: 'why' }] }, catalogSchema)).toEqual([
      'tag_exemptions[0].instruction_id: must match pattern',
    ]);
    expect(validateAgainstSchema({ ...catalog, tag_exemptions: [{ instruction_id: 'x' }] }, catalogSchema)).toEqual([
      'tag_exemptions[0].dimension: required', 'tag_exemptions[0].reason: required',
    ]);
    expect(validateAgainstSchema({ ...catalog, instructions: [{ instruction_id: 'x' }] }, catalogSchema)).toEqual([
      'instructions[0].path: required', 'instructions[0].sha256: required',
    ]);
    for (const key of ['catalog_id', 'revision', 'source_revision', 'updated_at', 'tag_dictionary', 'tag_aliases', 'tag_exemptions', 'instructions']) {
      const value: Record<string, unknown> = { ...catalog };
      delete value[key];
      expect(validateAgainstSchema(value, catalogSchema)).toEqual([`${key}: required`]);
    }
  });

  test('checks frontmatter shape, scalar conditions, provenance and guidance contract', () => {
    expect(validateAgainstSchema({ ...instruction, content: 'not frontmatter' }, instructionSchema)).toEqual([
      'content: additional property',
    ]);
    expect(validateAgainstSchema({ ...instruction, conditions_applies_when: ['wrong shape'] }, instructionSchema)).toEqual([
      'conditions_applies_when: expected string',
    ]);
    expect(validateAgainstSchema({ ...instruction, provenance: ['bad provenance'] }, instructionSchema)).toEqual([
      'provenance[0]: must match pattern',
    ]);
    expect(validateAgainstSchema({ ...instruction, provenance: [] }, instructionSchema)).toEqual([
      'provenance: must contain at least 1 items',
    ]);
    expect(validateAgainstSchema({ ...instruction, artifact_contract_output_type: 'none', artifact_contract_required_data: ['thing'] }, instructionSchema)).toEqual([
      'artifact_contract_required_data: must contain at most 0 items',
    ]);
    expect(validateAgainstSchema({ ...instruction, instruction_id: 'Not-Kebab' }, instructionSchema)).toEqual([
      'instruction_id: must match pattern',
    ]);
    expect(validateAgainstSchema({ ...instruction, instruction_id: 'review' }, instructionSchema)).toEqual([]);
    expect(validateAgainstSchema({ ...instruction, instruction_id: 'Review' }, instructionSchema)).toEqual([
      'instruction_id: must match pattern',
    ]);
    expect(validateAgainstSchema({ ...instruction, instruction_id: 'review_v2' }, instructionSchema)).toEqual([
      'instruction_id: must match pattern',
    ]);
    expect(validateAgainstSchema({ ...instruction, capability_tags: ['bad tag'] }, instructionSchema)).toEqual([
      'capability_tags[0]: must match pattern',
    ]);
    expect(validateAgainstSchema({ ...instruction, status: 'draft' }, instructionSchema)).toEqual(['status: must be one of enum values']);
    expect(validateAgainstSchema({ ...instruction, revision: 0 }, instructionSchema)).toEqual(['revision: must be >= 1']);
    expect(validateAgainstSchema({ ...instruction, title: '' }, instructionSchema)).toEqual(['title: must have at least 1 characters']);
    expect(validateAgainstSchema({ ...instruction, summary: '' }, instructionSchema)).toEqual(['summary: must have at least 1 characters']);
    expect(validateAgainstSchema({ ...instruction, artifact_contract_output_type: '' }, instructionSchema)).toEqual([
      'artifact_contract_output_type: must have at least 1 characters',
    ]);
    expect(validateAgainstSchema({ ...instruction, compatibility_requires: [1] }, instructionSchema)).toEqual([
      'compatibility_requires[0]: expected string',
    ]);
    expect(validateAgainstSchema({ ...instruction, pattern_tags: [''] }, instructionSchema)).toEqual([
      'pattern_tags[0]: must match pattern',
    ]);
    expect(validateAgainstSchema({ ...instruction, capability_tags: [1] }, instructionSchema)).toEqual([
      'capability_tags[0]: expected string',
    ]);
    expect(validateAgainstSchema({ ...instruction, artifact_contract_required_data: [1] }, instructionSchema)).toEqual([
      'artifact_contract_required_data[0]: expected string', 'artifact_contract_required_data: must contain at most 0 items',
    ]);
    expect(validateAgainstSchema({ ...instruction, conditions_does_not_apply_when: '' }, instructionSchema)).toEqual([
      'conditions_does_not_apply_when: must have at least 1 characters',
    ]);
    expect(validateAgainstSchema({ ...instruction, conditions_applies_when: '' }, instructionSchema)).toEqual([
      'conditions_applies_when: must have at least 1 characters',
    ]);
    expect(validateAgainstSchema({ ...instruction, provenance: [1] }, instructionSchema)).toEqual(['provenance[0]: expected string']);
    // Task 5 check-corpus owns the complementary non-none => non-empty verified_by rule.
    expect(validateAgainstSchema({ ...instruction, artifact_contract_output_type: 'report', artifact_contract_required_data: ['result'] }, instructionSchema)).toEqual([]);
    for (const key of [
      'instruction_id', 'title', 'summary', 'capability_tags', 'pattern_tags', 'conditions_applies_when',
      'conditions_does_not_apply_when', 'artifact_contract_output_type', 'artifact_contract_required_data',
      'artifact_contract_verified_by', 'compatibility_excludes', 'compatibility_requires', 'provenance', 'status', 'revision',
    ]) {
      const value: Record<string, unknown> = { ...instruction };
      delete value[key];
      expect(validateAgainstSchema(value, instructionSchema)).toEqual([`${key}: required`]);
    }
  });

  test('checks profile group fields and tag patterns', () => {
    expect(validateAgainstSchema({ ...profile, groups: { x: { active: 'Bad', alternatives: ['also_bad'] } } }, profileSchema)).toEqual([
      'groups.x.active: must match pattern',
      'groups.x.alternatives[0]: must match pattern',
    ]);
    expect(validateAgainstSchema({ ...profile, groups: { x: { active: 'valid-tag' } } }, profileSchema)).toEqual([
      'groups.x.alternatives: required',
    ]);
    expect(validateAgainstSchema({ ...profile, schema: 'wrong' }, profileSchema)).toEqual(['schema: must equal const value']);
    expect(validateAgainstSchema({ ...profile, groups: { x: { active: '', alternatives: [] } } }, profileSchema)).toEqual([
      'groups.x.active: must have at least 1 characters', 'groups.x.active: must match pattern',
    ]);
    expect(validateAgainstSchema({ ...profile, groups: { x: { active: 'valid-tag', alternatives: [1] } } }, profileSchema)).toEqual([
      'groups.x.alternatives[0]: expected string',
    ]);
    expect(validateAgainstSchema({ ...profile, groups: { x: { active: 'valid-tag', alternatives: [''] } } }, profileSchema)).toEqual([
      'groups.x.alternatives[0]: must have at least 1 characters', 'groups.x.alternatives[0]: must match pattern',
    ]);
    expect(validateAgainstSchema({ ...profile, groups: { x: { active: 'valid-tag', alternatives: [], extra: true } } }, profileSchema)).toEqual([
      'groups.x.extra: additional property',
    ]);
    for (const key of ['schema', 'groups']) {
      const value: Record<string, unknown> = { ...profile };
      delete value[key];
      expect(validateAgainstSchema(value, profileSchema)).toEqual([`${key}: required`]);
    }
  });
});

describe('JSON Schema subset validator', () => {
  test('accepts valid objects and reports required and extra properties', () => {
    const schema: Schema = {
      type: 'object', required: ['catalog_id'],
      properties: { catalog_id: { type: 'string', minLength: 1 } }, additionalProperties: false,
    };
    expect(validateAgainstSchema({ catalog_id: 'vida' }, schema)).toEqual([]);
    expect(validateAgainstSchema({}, schema)).toEqual(['catalog_id: required']);
    expect(validateAgainstSchema({ catalog_id: 'vida', extra: true }, schema)).toEqual(['extra: additional property']);
  });

  test('checks scalar and array constraints with exact paths', () => {
    const schema: Schema = { type: 'object', properties: {
      mode: { enum: ['a', 'b'] }, version: { const: 1 }, name: { type: 'string', pattern: '^[a-z]+$', minLength: 2, maxLength: 4 },
      count: { type: 'number', minimum: 1, maximum: 3 }, tags: { type: 'array', minItems: 1, maxItems: 2, items: { type: 'string' } },
    } };
    expect(validateAgainstSchema({ mode: 'c', version: 2, name: 'A!long', count: 4, tags: [] }, schema)).toEqual([
      'mode: must be one of enum values', 'version: must equal const value',
      'name: must have at most 4 characters', 'name: must match pattern', 'count: must be <= 3', 'tags: must contain at least 1 items',
    ]);
    expect(validateAgainstSchema({ mode: 'a', version: 1, name: 'x', count: 0, tags: ['ok', 1, 'extra'] }, schema)).toEqual([
      'name: must have at least 2 characters', 'count: must be >= 1', 'tags: must contain at most 2 items', 'tags[1]: expected string',
    ]);
  });

  test('resolves local references, checks all allOf branches and gates then on if', () => {
    const schema: Schema = {
      definitions: { text: { type: 'string', minLength: 3 } },
      allOf: [
        { properties: { name: { $ref: '#/definitions/text' } } },
        { if: { properties: { mode: { const: 'strict' } }, required: ['mode'] }, then: { required: ['approval'] } },
      ],
    };
    expect(validateAgainstSchema({ name: 'okay', mode: 'relaxed' }, schema)).toEqual([]);
    expect(validateAgainstSchema({ name: 'no', mode: 'strict' }, schema)).toEqual([
      'name: must have at least 3 characters', 'approval: required',
    ]);
  });

  test('uses deep equality for const and enum and code points for string lengths', () => {
    const schema: Schema = { type: 'object', properties: {
      exact: { const: { a: [1, { b: true }], z: 2 } },
      choice: { enum: [{ x: 1 }, ['a', 2]] },
      emoji: { type: 'string', minLength: 1, maxLength: 1, pattern: '^.$' },
    } };
    expect(validateAgainstSchema({ exact: { z: 2, a: [1, { b: true }] }, choice: { x: 1 }, emoji: '😀' }, schema)).toEqual([]);
  });

  test('supports schema-valued additionalProperties and ignores schema metadata', () => {
    const schema: Schema = { $schema: 'ignored', $id: 'ignored', type: 'object', properties: { known: { type: 'string' } }, additionalProperties: { type: 'number', minimum: 1 } };
    expect(validateAgainstSchema({ known: 'yes', count: 2 }, schema)).toEqual([]);
    expect(validateAgainstSchema({ count: 0 }, schema)).toEqual(['count: must be >= 1']);
  });

  test('supports annotations and not semantics, including schema validation under not', () => {
    const schema: Schema = { title: 'not example', description: 'excluded names', not: { type: 'string', pattern: '^blocked$' } };
    expect(validateAgainstSchema('allowed', schema)).toEqual([]);
    expect(validateAgainstSchema('blocked', schema)).toEqual(['$: must not match the excluded schema']);
    expect(validateSchemaDefinition({ not: true } as unknown as Schema)).toEqual(['invalid schema keyword value: not']);
    expect(validateSchemaDefinition({ not: { typo: {} } })).toEqual(['unsupported schema keyword: typo']);
  });

  test('compiles patterns with unicode first and plain fallback', () => {
    expect(validateAgainstSchema('abc', { type: 'string', pattern: '^a+$' })).toEqual(['$: must match pattern']);
    expect(validateAgainstSchema('a-b', { type: 'string', pattern: '^a\\-b$' })).toEqual([]);
    expect(validateAgainstSchema('x', { pattern: '[' })).toEqual(['invalid schema pattern: [']);
  });

  test('reports invalid values for every supported keyword shape', () => {
    const schema = {
      type: 'wat', required: 'x', properties: [], additionalProperties: 4, enum: {}, pattern: 1,
      minLength: '1', maxLength: null, minimum: '2', maximum: {}, minItems: '0', maxItems: false,
      items: [], $ref: 1, allOf: {}, if: [], then: null, definitions: [],
    } as unknown as Schema;
    expect(validateAgainstSchema({}, schema)).toEqual([
      'invalid schema keyword value: type', 'invalid schema keyword value: required', 'invalid schema keyword value: properties',
      'invalid schema keyword value: additionalProperties', 'invalid schema keyword value: enum', 'invalid schema keyword value: pattern',
      'invalid schema keyword value: minLength', 'invalid schema keyword value: maxLength', 'invalid schema keyword value: minimum',
      'invalid schema keyword value: maximum', 'invalid schema keyword value: minItems', 'invalid schema keyword value: maxItems',
      'invalid schema keyword value: items', 'invalid schema keyword value: $ref', 'invalid schema keyword value: allOf',
      'invalid schema keyword value: if', 'invalid schema keyword value: then', 'invalid schema keyword value: definitions',
    ]);
    expect(validateAgainstSchema({}, { type: ['string', 'wat'] })).toEqual(['invalid schema keyword value: type']);
  });

  test('reports unsupported keywords at every depth and rejects unresolved and cyclic refs', () => {
    expect(validateAgainstSchema({}, { properties: { unused: { not: {} } } })).toEqual([]);
    expect(validateAgainstSchema({}, { properties: { unused: { not: { typo: {} } } } })).toEqual(['unsupported schema keyword: typo']);
    expect(validateAgainstSchema('x', { $ref: '#/definitions/missing' })).toEqual(['unresolved schema reference: #/definitions/missing']);
    const cyclic: Schema = { definitions: { loop: { $ref: '#/definitions/loop' } }, $ref: '#/definitions/loop' };
    expect(validateAgainstSchema('x', cyclic)).toEqual(['cyclic schema reference: #/definitions/loop']);
    const cycleInIf: Schema = {
      definitions: { loop: { $ref: '#/definitions/loop' } },
      if: { $ref: '#/definitions/loop' },
      then: { required: ['approval'] },
    };
    expect(validateAgainstSchema('x', cycleInIf)).toEqual(['cyclic schema reference: #/definitions/loop']);
    const cycleInItems: Schema = {
      definitions: { loop: { $ref: '#/definitions/loop' } },
      items: { $ref: '#/definitions/loop' },
    };
    expect(validateAgainstSchema('not an array', cycleInItems)).toEqual(['cyclic schema reference: #/definitions/loop']);
    const cycleInSkippedThen: Schema = {
      definitions: { loop: { $ref: '#/definitions/loop' } },
      if: { properties: { mode: { const: 'enabled' } } },
      then: { $ref: '#/definitions/loop' },
    };
    expect(validateAgainstSchema({ mode: 'disabled' }, cycleInSkippedThen)).toEqual([
      'cyclic schema reference: #/definitions/loop',
    ]);
  });

  test('validates item types and reports invalid schema containers and regexes', () => {
    expect(validateAgainstSchema([1], { type: 'array', items: { type: 'string' } })).toEqual(['[0]: expected string']);
    expect(validateAgainstSchema('x', { type: 'object' })).toEqual(['$: expected object']);
    expect(validateAgainstSchema(1, { type: 'boolean' })).toEqual(['$: expected boolean']);
    expect(validateAgainstSchema(false, { type: 'null' })).toEqual(['$: expected null']);
    expect(validateAgainstSchema({}, [] as unknown as Schema)).toEqual(['schema must be an object']);
    expect(validateAgainstSchema({}, { properties: { x: [] } } as unknown as Schema)).toEqual(['invalid schema keyword value: properties']);
    expect(validateAgainstSchema('x', { pattern: '[' })).toEqual(['invalid schema pattern: [']);
    expect(validateAgainstSchema(7, { pattern: '[' })).toEqual(['invalid schema pattern: [']);
    expect(validateAgainstSchema({}, { properties: 'bad' } as unknown as Schema)).toEqual(['invalid schema keyword value: properties']);
  });
});
