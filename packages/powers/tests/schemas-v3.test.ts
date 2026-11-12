import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validateAgainstSchema, type Schema } from '../skills/vp-mode/scripts/schema.ts';
import { encodeVariantScalar, type VariantRecord } from '../skills/vp-mode/scripts/variants.ts';

function schema(name: string): Schema {
  return JSON.parse(readFileSync(fileURLToPath(new URL(`../config/${name}`, import.meta.url)), 'utf8')) as Schema;
}

const instructionV2 = schema('vpinstruction.v2.schema.json');
const instructionV3 = schema('vpinstruction.v3.schema.json');
const mapV2 = schema('vpcorpusmap.v2.schema.json');
const mapV3 = schema('vpcorpusmap.v3.schema.json');
const receiptV1 = schema('h2fidelityreceipt.v1.schema.json');
const receiptV2 = schema('h2fidelityreceipt.v2.schema.json');

function instruction(schemaId: string): Record<string, unknown> {
  return {
    schema: schemaId,
    classification_status: 'classified',
    instruction_id: 'family-example',
    title: 'Family example',
    summary: 'Two source-bound variants.',
    capability_tags: ['build-app'],
    pattern_tags: ['component-pattern'],
    conditions_applies_when: 'When a component is needed.',
    conditions_does_not_apply_when: 'Otherwise.',
    artifact_contract_output_type: 'none',
    artifact_contract_required_data: [],
    artifact_contract_verified_by: '',
    compatibility_excludes: [],
    compatibility_requires: [],
    provenance: ['donor=example; license=MIT; revision=0123456789abcdef0123456789abcdef01234567; path=rule.md'],
    status: 'active',
    revision: 1,
    instruction_form: 'procedure',
    domains: ['engineering'],
    ...(schemaId === 'VPInstruction/v3' ? { instruction_variants: encodeVariantScalar([variant('legacy-one'), variant('legacy-two')], 'family-example') } : {}),
  };
}

function variant(id: string): VariantRecord {
  return {
    variant_id: id,
    title: `Title ${id}`,
    summary: `Summary ${id}`,
    capability_tags: ['build-app'],
    pattern_tags: ['component-pattern'],
    conditions_applies_when: 'When needed.',
    conditions_does_not_apply_when: 'Otherwise.',
    artifact_contract_output_type: 'none',
    artifact_contract_required_data: [],
    artifact_contract_verified_by: '',
    compatibility_excludes: [],
    compatibility_requires: [],
    provenance: ['donor=example; license=MIT; revision=0123456789abcdef0123456789abcdef01234567; path=rule.md'],
    status: 'active',
    revision: 1,
    classification_status: 'unclassified',
    classification_reason: 'Reason.',
    source: { donor: 'example', path: 'rules.csv', rowKey: `row=${id}`, rawSha256: 'a'.repeat(64) },
    sourceLabel: 'Example source',
    applicability: { frameworks: [{ name: 'react' }] },
    contentSha256: 'b'.repeat(64),
  };
}

function binding(instructionId: string, variantId: string): Record<string, unknown> {
  return {
    instructionId,
    variantId,
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

function corpusMap(schemaId: string, bindings: Record<string, unknown>[]): Record<string, unknown> {
  return {
    schema: schemaId,
    revision: 1,
    updated_at: '2026-11-07T00:00:00Z',
    donors: {
      donor: {
        source_revision: 'a'.repeat(40),
        files: {},
        csvSources: {
          'rules.csv': {
            rawSha256: 'b'.repeat(64),
            headersDigest: 'c'.repeat(64),
            columns: [{ index: 0, header: 'Title', role: 'normative-title' }],
            rows: [{
              rowKey: 'row=1',
              rowHash: 'd'.repeat(64),
              cellHashes: ['0'.repeat(64)],
              locator: { line: 2, row: 1 },
              locators: [{ line: 2, row: 1 }],
              disposition: 'admitted',
              bindings,
              resourceIds: [],
              mergedInto: null,
            }],
          },
        },
      },
    },
  };
}

function receipt(schemaId: string, v2 = false): Record<string, unknown> {
  return {
    schema: schemaId,
    instructionId: 'legacy-one',
    ...(v2 ? { variantId: 'legacy-one', variantBodySha256: 'a'.repeat(64) } : {}),
    source: {
      donor: 'donor',
      path: 'rules.csv',
      rowKey: 'row=1',
      cells: [v2
        ? { columnIndex: 0, columnHeader: 'Title', cellHash: '0'.repeat(64), role: 'normative-title', locator: { line: 2, row: 1, column: 1 }, locators: [{ line: 2, row: 1, column: 1 }] }
        : { columnIndex: 0, cellHash: '0'.repeat(64), locator: { line: 2, row: 1, column: 1 } }],
    },
    reviewer: { kind: 'human', actor: 'reviewer' },
    verdict: 'READY',
    evidence: { path: 'review.json', sha256: '1'.repeat(64) },
    recordedAt: '2026-11-07T00:00:00Z',
  };
}

function bindingWithSubspans(spans: Record<string, unknown>[]): Record<string, unknown> {
  const base = binding('legacy-one', 'legacy-one');
  const cells = base.cells as Record<string, unknown>[];
  return { ...base, cells: [{ ...cells[0]!, subspans: spans }] };
}

function withReceiptSubspans(value: Record<string, unknown>, spans: Record<string, unknown>[]): Record<string, unknown> {
  const source = value.source as Record<string, unknown>;
  const cells = source.cells as Record<string, unknown>[];
  return { ...value, source: { ...source, cells: [{ ...cells[0]!, subspans: spans }] } };
}

describe('P1 versioned schemas', () => {
  test('accepts a synthetic two-variant instruction family and rejects missing or invalid scalar', () => {
    const valid = instruction('VPInstruction/v3');
    expect(validateAgainstSchema(valid, instructionV3)).toEqual([]);
    const { instruction_variants: _variants, ...missing } = valid;
    expect(validateAgainstSchema(missing, instructionV3)).not.toEqual([]);
    expect(validateAgainstSchema({ ...valid, applicability: '{}' }, instructionV3)).not.toEqual([]);
    expect(validateAgainstSchema({ ...valid, instruction_variants: ['{}', '{}'] }, instructionV3)).not.toEqual([]);
  });

  test('requires variantId on both family and singleton v3 map bindings', () => {
    const valid = corpusMap('VPCorpusMap/v3', [binding('family-example', 'legacy-one'), binding('legacy-one', 'legacy-one')]);
    expect(validateAgainstSchema(valid, mapV3)).toEqual([]);
    const invalid = corpusMap('VPCorpusMap/v3', [{ ...binding('family-example', 'legacy-one'), variantId: undefined }]);
    expect(validateAgainstSchema(invalid, mapV3)).not.toEqual([]);
  });

  test('requires both v2 receipt identity fields and keeps v1 fixtures valid', () => {
    const v2 = receipt('H2FidelityReceipt/v2', true);
    expect(validateAgainstSchema(v2, receiptV2)).toEqual([]);
    const { variantId: _variantId, ...withoutVariantId } = v2;
    expect(validateAgainstSchema(withoutVariantId, receiptV2)).not.toEqual([]);
    const { variantBodySha256: _bodyHash, ...withoutBodyHash } = v2;
    expect(validateAgainstSchema(withoutBodyHash, receiptV2)).not.toEqual([]);
    expect(validateAgainstSchema(receipt('H2FidelityReceipt/v1'), receiptV1)).toEqual([]);
  });

  test('accepts exact subspan shapes in v3 map bindings and v2 receipts', () => {
    const spans = [{ startCodePoint: 0, endCodePoint: 4, textSha256: 'e'.repeat(64) }];
    expect(validateAgainstSchema(corpusMap('VPCorpusMap/v3', [bindingWithSubspans(spans)]), mapV3)).toEqual([]);
    expect(validateAgainstSchema(withReceiptSubspans(receipt('H2FidelityReceipt/v2', true), spans), receiptV2)).toEqual([]);
  });

  test('rejects malformed subspans and keeps them out of v2 maps and v1 receipts', () => {
    const span = { startCodePoint: 0, endCodePoint: 4, textSha256: 'e'.repeat(64) };
    for (const bad of [{ startCodePoint: 0, endCodePoint: 4 }, { ...span, textSha256: 'bad' }, { ...span, startCodePoint: -1 }]) {
      expect(validateAgainstSchema(corpusMap('VPCorpusMap/v3', [bindingWithSubspans([bad])]), mapV3)).not.toEqual([]);
      expect(validateAgainstSchema(withReceiptSubspans(receipt('H2FidelityReceipt/v2', true), [bad]), receiptV2)).not.toEqual([]);
    }
    expect(validateAgainstSchema(corpusMap('VPCorpusMap/v2', [bindingWithSubspans([span])]), mapV2)).not.toEqual([]);
    expect(validateAgainstSchema(withReceiptSubspans(receipt('H2FidelityReceipt/v1'), [span]), receiptV1)).not.toEqual([]);
  });

  test('keeps existing v2 instruction and map fixture shapes valid', () => {
    expect(validateAgainstSchema(instruction('VPInstruction/v2'), instructionV2)).toEqual([]);
    const singleton = { ...binding('legacy-one', 'legacy-one') };
    delete singleton.variantId;
    expect(validateAgainstSchema(corpusMap('VPCorpusMap/v2', [singleton]), mapV2)).toEqual([]);
  });
});
