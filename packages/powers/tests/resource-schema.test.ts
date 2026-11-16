import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validateAgainstSchema, type Schema } from '../skills/vp-mode/scripts/schema.ts';

function schema(name: string): Schema {
  return JSON.parse(readFileSync(fileURLToPath(new URL(`../config/${name}`, import.meta.url)), 'utf8')) as Schema;
}

const resourceSchema = schema('vpreference-resource.v1.schema.json');
const catalogSchema = schema('vpcatalog.v1.schema.json');
const mapV2 = schema('vpcorpusmap.v2.schema.json');
const mapV3 = schema('vpcorpusmap.v3.schema.json');

const RESOURCE_TYPES = ['palette', 'font-pairing', 'style', 'icon-list', 'standards-checklist'] as const;

function resource(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schema: 'VPReferenceResource/v1',
    resource_id: 'uupm-font-pairing-classic-elegant',
    resource_type: 'font-pairing',
    revision: 1,
    status: 'active',
    applicability: { frameworks: [{ name: 'react' }] },
    provenance: [{
      donor: 'uupm',
      license: 'MIT',
      revision: 'a'.repeat(40),
      path: 'src/ui-ux-pro-max/data/typography.csv',
      sha256: 'b'.repeat(64),
      locator: { line: 2, row: 1, column: 3 },
    }],
    payload: { heading_font: 'Playfair Display', body_font: 'Inter' },
    digest: `sha256:${'c'.repeat(64)}`,
    ...overrides,
  };
}

function catalog(resources?: Record<string, unknown>[]): Record<string, unknown> {
  return {
    schema: 'VPCatalog/v1', catalog_id: 'vida-powers', revision: 1, source_revision: 'a'.repeat(40),
    updated_at: '2026-11-13T00:00:00Z',
    tag_dictionary: { capability: { 'write-tests-first': 'Write tests before code' }, pattern: { 'test-first-development': 'Test first' } },
    tag_aliases: {},
    tag_exemptions: [],
    instructions: [{ instruction_id: 'example-rule', path: 'instructions/example-rule.md', sha256: 'a'.repeat(64) }],
    ...(resources === undefined ? {} : { resources }),
  };
}

function binding(): Record<string, unknown> {
  return {
    instructionId: 'family-example',
    variantId: 'legacy-one',
    cells: [{
      columnIndex: 0,
      columnHeader: 'Title',
      cellHash: '0'.repeat(64),
      role: 'normative-title',
      locator: { line: 2, row: 1, column: 1 },
      locators: [{ line: 2, row: 1, column: 1 }],
    }],
    fidelity: { path: 'fidelity.json', sha256: '1'.repeat(64) },
  };
}

function corpusMap(schemaId: string, row: Record<string, unknown>): Record<string, unknown> {
  return {
    schema: schemaId,
    revision: 1,
    updated_at: '2026-11-13T00:00:00Z',
    donors: {
      uupm: {
        source_revision: 'a'.repeat(40),
        files: {},
        csvSources: {
          'typography.csv': {
            rawSha256: 'b'.repeat(64),
            headersDigest: 'c'.repeat(64),
            columns: [{ index: 0, header: 'Heading', role: 'normative-title' }],
            rows: [row],
          },
        },
      },
    },
  };
}

function mapRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    rowKey: 'row=1',
    rowHash: 'd'.repeat(64),
    cellHashes: ['0'.repeat(64)],
    locator: { line: 2, row: 1 },
    locators: [{ line: 2, row: 1 }],
    disposition: 'admitted',
    bindings: [],
    resourceIds: [],
    mergedInto: null,
    ...overrides,
  };
}

describe('VPReferenceResource/v1 schema', () => {
  test('accepts a valid record for every admitted resource type', () => {
    for (const type of RESOURCE_TYPES) {
      expect(validateAgainstSchema(resource({ resource_type: type }), resourceSchema)).toEqual([]);
    }
  });

  test('accepts the H3-B palette payload shape under the envelope', () => {
    const palettePayload = {
      palette_name: 'SaaS (General)',
      colors: {
        primary: '#2563EB', on_primary: '#FFFFFF', secondary: '#3B82F6', on_secondary: '#000000',
        accent: '#EA580C', on_accent: '#000000', background: '#F8FAFC', foreground: '#1E293B',
        card: '#FFFFFF', card_foreground: '#1E293B', muted: '#E9EFF8', muted_foreground: '#475569',
        border: '#E2E8F0', destructive: '#DC2626', on_destructive: '#FFFFFF', ring: '#2563EB',
      },
      notes: 'Trust blue + orange CTA contrast [Accent adjusted from #F97316]',
    };
    expect(validateAgainstSchema(resource({
      resource_id: 'uupm-palette-saas-general',
      resource_type: 'palette',
      provenance: [{
        donor: 'uupm', license: 'MIT', revision: 'a'.repeat(40),
        path: 'src/ui-ux-pro-max/data/colors.csv', sha256: 'b'.repeat(64),
        locator: { line: 2, row: 1 },
      }],
      payload: palettePayload,
    }), resourceSchema)).toEqual([]);
  });

  test('rejects unknown resource types and malformed identity fields', () => {
    for (const type of ['color-palette', 'FONT-PAIRING', '']) {
      expect(validateAgainstSchema(resource({ resource_type: type }), resourceSchema)).not.toEqual([]);
    }
    for (const id of ['Bad_Id', 'UPPER', 'has space', '']) {
      expect(validateAgainstSchema(resource({ resource_id: id }), resourceSchema)).not.toEqual([]);
    }
    expect(validateAgainstSchema(resource({ schema: 'VPReferenceResource/v2' }), resourceSchema)).not.toEqual([]);
    expect(validateAgainstSchema(resource({ status: 'draft' }), resourceSchema)).not.toEqual([]);
    expect(validateAgainstSchema(resource({ revision: 0 }), resourceSchema)).not.toEqual([]);
    expect(validateAgainstSchema(resource({ extra: true }), resourceSchema)).not.toEqual([]);
  });

  test('rejects missing or malformed digest and missing provenance', () => {
    const { digest: _digest, ...noDigest } = resource();
    expect(validateAgainstSchema(noDigest, resourceSchema)).toEqual(['digest: required']);
    expect(validateAgainstSchema(resource({ digest: 'c'.repeat(64) }), resourceSchema)).not.toEqual([]);
    expect(validateAgainstSchema(resource({ digest: `sha256:${'C'.repeat(64)}` }), resourceSchema)).not.toEqual([]);
    const { provenance: _provenance, ...noProvenance } = resource();
    expect(validateAgainstSchema(noProvenance, resourceSchema)).toEqual(['provenance: required']);
    expect(validateAgainstSchema(resource({ provenance: [] }), resourceSchema)).not.toEqual([]);
  });

  test('rejects incomplete provenance entries and unknown applicability keys', () => {
    const base = resource().provenance as Record<string, unknown>[];
    for (const key of ['donor', 'license', 'revision', 'path', 'sha256', 'locator']) {
      const entry = { ...base[0]! };
      delete entry[key];
      expect(validateAgainstSchema(resource({ provenance: [entry] }), resourceSchema)).not.toEqual([]);
    }
    expect(validateAgainstSchema(resource({
      provenance: [{ ...base[0]!, revision: 'not-a-sha', locator: { line: 2, row: 1, column: 0 } }],
    }), resourceSchema)).not.toEqual([]);
    expect(validateAgainstSchema(resource({ applicability: { frameworks: [], unknownKey: [] } }), resourceSchema)).not.toEqual([]);
    expect(validateAgainstSchema(resource({ applicability: 'react' }), resourceSchema)).not.toEqual([]);
  });
});

describe('VPCatalog/v1 resources extension', () => {
  test('accepts a catalog with resources[] and keeps the v1 shape without it valid', () => {
    const entry = { resource_id: 'uupm-font-pairing-classic-elegant', path: 'resources/uupm-font-pairing-classic-elegant.json', sha256: 'e'.repeat(64) };
    expect(validateAgainstSchema(catalog([entry]), catalogSchema)).toEqual([]);
    expect(validateAgainstSchema(catalog([]), catalogSchema)).toEqual([]);
    expect(validateAgainstSchema(catalog(), catalogSchema)).toEqual([]);
  });

  test('rejects malformed resource manifest entries', () => {
    for (const entry of [
      { resource_id: 'Bad_Id', path: 'resources/x.json', sha256: 'e'.repeat(64) },
      { resource_id: 'uupm-palette-x', path: 'resources/x.json', sha256: 'bad' },
      { resource_id: 'uupm-palette-x', path: 'resources/x.json', sha256: 'e'.repeat(64), extra: 1 },
      { resource_id: 'uupm-palette-x', path: 'resources/x.json' },
    ]) {
      expect(validateAgainstSchema(catalog([entry]), catalogSchema)).not.toEqual([]);
    }
  });
});

describe('VPCorpusMap/v3 admitted resourceIds', () => {
  const admittedResource = { id: 'uupm-font-pairing-classic-elegant', disposition: 'admitted', reason: 'admitted under the H3 font-pairing pilot' };

  test('accepts a resource-only admitted row and keeps the instruction-bound shape valid', () => {
    expect(validateAgainstSchema(corpusMap('VPCorpusMap/v3', mapRow({ resourceIds: [admittedResource] })), mapV3)).toEqual([]);
    expect(validateAgainstSchema(corpusMap('VPCorpusMap/v3', mapRow({ bindings: [binding()] })), mapV3)).toEqual([]);
    expect(validateAgainstSchema(corpusMap('VPCorpusMap/v3', mapRow({ bindings: [binding()], resourceIds: [admittedResource] })), mapV3)).toEqual([]);
    expect(validateAgainstSchema(corpusMap('VPCorpusMap/v3', mapRow({ resourceIds: [{ id: 'uupm-palette-saas-general', disposition: 'admitted', reason: 'materialized as VPReferenceResource/v1 palette record' }] })), mapV3)).toEqual([]);
    expect(validateAgainstSchema(corpusMap('VPCorpusMap/v3', mapRow({ disposition: 'deferred', reason: 'held', resourceIds: [{ id: 'uupm-palette-x', disposition: 'deferred', reason: 'not yet reviewed' }] })), mapV3)).toEqual([]);
  });

  test('still rejects an admitted row with neither bindings nor resourceIds', () => {
    expect(validateAgainstSchema(corpusMap('VPCorpusMap/v3', mapRow()), mapV3)).not.toEqual([]);
    expect(validateAgainstSchema(corpusMap('VPCorpusMap/v3', mapRow({ bindings: [binding()], resourceIds: [{ ...admittedResource, disposition: 'bogus' }] })), mapV3)).not.toEqual([]);
  });

  test('keeps v2 maps on the old resourceId enum', () => {
    const v2Binding = binding();
    delete v2Binding.variantId;
    expect(validateAgainstSchema(corpusMap('VPCorpusMap/v2', mapRow({ bindings: [v2Binding] })), mapV2)).toEqual([]);
    expect(validateAgainstSchema(corpusMap('VPCorpusMap/v2', mapRow({ resourceIds: [admittedResource] })), mapV2)).not.toEqual([]);
  });
});
