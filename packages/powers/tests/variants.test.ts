import { createHash } from 'node:crypto';
import { describe, expect, test } from 'bun:test';
import {
  encodeVariantScalar,
  parseVariantScalar,
  parseVariantSections,
  validateVariantFamily,
  VariantError,
  type VariantRecord,
} from '../skills/vp-mode/scripts/variants.ts';
import { parseFrontmatter } from '../skills/vp-mode/scripts/frontmatter.ts';

const hash = (value: string): string => createHash('sha256').update(value, 'utf8').digest('hex');

function variant(id: string, overrides: Record<string, unknown> = {}): VariantRecord {
  return {
    variant_id: id,
    title: `Title ${id}`,
    summary: `Summary ${id}`,
    capability_tags: ['build-app'],
    pattern_tags: ['component-pattern'],
    conditions_applies_when: 'A component is needed.',
    conditions_does_not_apply_when: 'No component is needed.',
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
    source: { donor: 'example', path: 'rules.csv', rowKey: 'row=1', rawSha256: 'a'.repeat(64) },
    sourceLabel: 'Example source',
    applicability: { frameworks: [{ name: 'react' }] },
    contentSha256: 'a'.repeat(64),
    ...overrides,
  } as VariantRecord;
}

function sectionBody(variants: readonly VariantRecord[], payloads: readonly string[]): string {
  return variants.map((item, index) => `<!-- sbvf:variant:begin ${item.variant_id} -->\n${payloads[index]}<!-- sbvf:variant:end ${item.variant_id} -->`).join('\n');
}

describe('variant family scalar', () => {
  test('encodes the quoted scalar and parses decoded JSON through frontmatter', () => {
    const records = [variant('legacy-one', { title: 'A "quoted" title', summary: 'path\\with\\slashes' }), variant('legacy-two')];
    const scalar = encodeVariantScalar(records, 'family-example');
    const parsed = parseFrontmatter(`---\ninstruction_variants: ${scalar}\n---\n`);
    expect(parsed.data.instruction_variants).toBe(JSON.stringify(records));
    expect(parseVariantScalar(parsed.data.instruction_variants as string, 'family-example')).toEqual(records);
    expect(() => parseVariantScalar(scalar, 'family-example')).toThrow(VariantError);
  });

  test('rejects malformed family shape and metadata', () => {
    const two = [variant('legacy-one'), variant('legacy-two')];
    expect(() => encodeVariantScalar([two[0]!])).toThrow(VariantError);
    expect(() => encodeVariantScalar([two[0]!, two[0]!])).toThrow(VariantError);
    expect(() => encodeVariantScalar([variant('family-example'), two[1]!], 'family-example')).toThrow(VariantError);
    expect(() => encodeVariantScalar([variant('Bad_ID'), two[1]!])).toThrow(VariantError);
    expect(() => encodeVariantScalar([variant('family-member'), two[1]!])).toThrow(VariantError);
    expect(() => encodeVariantScalar([{ ...two[0]!, unexpected: true } as unknown as VariantRecord, two[1]!])).toThrow(VariantError);
    expect(() => encodeVariantScalar([{ ...two[0]!, contentSha256: 'z'.repeat(64) }, two[1]!])).toThrow(VariantError);
    expect(() => encodeVariantScalar([{ ...two[0]!, applicability: {} }, two[1]!])).toThrow(VariantError);
    expect(() => encodeVariantScalar([{ ...two[0]!, applicability: null }, two[1]!])).toThrow(VariantError);
    const cyclic = variant('legacy-one') as VariantRecord & { nested?: unknown };
    cyclic.nested = cyclic;
    expect(() => validateVariantFamily([cyclic, two[1]!])).toThrow(VariantError);
    expect(() => encodeVariantScalar([{ ...two[0]!, status: 'pending' } as unknown as VariantRecord, two[1]!])).toThrow(VariantError);
    expect(() => encodeVariantScalar([{ ...two[0]!, revision: 1.5 }, two[1]!])).toThrow(VariantError);
    expect(() => encodeVariantScalar([{ ...two[0]!, source: { donor: 'd', path: 'p', rawSha256: '0'.repeat(64) } } as unknown as VariantRecord, two[1]!])).toThrow(VariantError);
    expect(() => encodeVariantScalar([{ ...two[0]!, capability_tags: 'bad' } as unknown as VariantRecord, two[1]!])).toThrow(VariantError);
    expect(() => encodeVariantScalar([{ ...two[0]!, capability_tags: [null] } as unknown as VariantRecord, two[1]!])).toThrow(VariantError);
    expect(() => encodeVariantScalar([{ ...two[0]!, capability_tags: [''] }, two[1]!])).toThrow(VariantError);
    expect(() => encodeVariantScalar([{ ...two[0]!, capability_tags: ['NOT A TAG'] }, two[1]!])).toThrow(VariantError);
    expect(() => encodeVariantScalar([{ ...two[0]!, roles: ['Bad Role'] }, two[1]!])).toThrow(VariantError);
    expect(() => encodeVariantScalar([{ ...two[0]!, products: ['Bad Product'] }, two[1]!])).toThrow(VariantError);
    expect(() => encodeVariantScalar([{ ...two[0]!, provenance: ['free text'] }, two[1]!])).toThrow(VariantError);
    expect(() => encodeVariantScalar([{ ...two[0]!, provenance: [] }, two[1]!])).toThrow(VariantError);
    expect(() => encodeVariantScalar([{ ...two[0]!, source: { ...two[0]!.source, rawSha256: 'A'.repeat(64) } }, two[1]!])).toThrow(VariantError);
    expect(() => encodeVariantScalar([{ ...two[0]!, classification_status: undefined } as unknown as VariantRecord, two[1]!])).toThrow(VariantError);
    expect(() => encodeVariantScalar([{ ...two[0]!, classification_status: undefined, domains: ['engineering'] } as unknown as VariantRecord, two[1]!])).toThrow(VariantError);
    expect(encodeVariantScalar([{ ...two[0]!, artifact_contract_verified_by: '' }, two[1]!])).toContain('artifact_contract_verified_by');
  });

  test('validates approach metadata and conditional classification', () => {
    const two = [variant('legacy-one'), variant('legacy-two')];
    const approached = { ...two[0]!, approach_assessments: ['direct'], approach_body_sha256: 'c'.repeat(64) };
    expect(encodeVariantScalar([approached, two[1]!])).toContain('approach_assessments');
    expect(() => encodeVariantScalar([{ ...approached, approach_assessments: ['direct', 'direct'] }, two[1]!])).toThrow(VariantError);
    expect(() => encodeVariantScalar([{ ...approached, approach_body_sha256: 'bad' }, two[1]!])).toThrow(VariantError);
    expect(() => encodeVariantScalar([{ ...two[0]!, approach_assessments: ['direct'] }, two[1]!])).toThrow(VariantError);

    expect(() => encodeVariantScalar([{ ...two[0]!, classification_status: 'other' } as unknown as VariantRecord, two[1]!])).toThrow(VariantError);
    expect(() => encodeVariantScalar([{ ...two[0]!, classification_status: 'classified' }, two[1]!])).toThrow(VariantError);
    expect(() => encodeVariantScalar([{ ...two[0]!, classification_status: 'classified', instruction_form: 'unknown', domains: ['engineering'] } as unknown as VariantRecord, two[1]!])).toThrow(VariantError);
    expect(() => encodeVariantScalar([{ ...two[0]!, classification_status: 'classified', instruction_form: 'procedure', domains: ['unknown'] }, two[1]!])).toThrow(VariantError);
    expect(() => encodeVariantScalar([{ ...two[0]!, classification_status: 'classified', instruction_form: 'procedure', domains: ['engineering'], classification_reason: 'reason' }, two[1]!])).toThrow(VariantError);
    expect(encodeVariantScalar([{ ...two[0]!, classification_status: 'unclassified', classification_reason: 'Reason.' }, two[1]!])).toContain('classification_reason');
    expect(() => encodeVariantScalar([{ ...two[0]!, classification_status: 'unclassified', classification_reason: undefined } as unknown as VariantRecord, two[1]!])).toThrow(VariantError);
    expect(() => encodeVariantScalar([{ ...two[0]!, classification_status: 'unclassified', classification_reason: 'Reason.', domains: ['engineering'] }, two[1]!])).toThrow(VariantError);
  });

  test('rejects decoded escaped controls in parsed and direct payloads', () => {
    const two = [variant('legacy-one'), variant('legacy-two')];
    expect(() => validateVariantFamily([variant('legacy-one', { title: 'line\u2028separator' }), two[1]!])).toThrow(VariantError);
    expect(() => validateVariantFamily([variant('legacy-one', { title: 'line\u0001control' }), two[1]!])).toThrow(VariantError);
    const decodedJson = JSON.stringify(two).replace('"title":"Title legacy-one"', '"title":"line\\u2028separator"');
    const yamlScalar = `"${decodedJson.replace(/\\/gu, '\\\\').replace(/"/gu, '\\"')}"`;
    const parsed = parseFrontmatter(`---\ninstruction_variants: ${yamlScalar}\n---\n`);
    expect(() => parseVariantScalar(parsed.data.instruction_variants as string)).toThrow(VariantError);
    expect(() => parseVariantScalar('not-json')).toThrow(VariantError);
    expect(() => parseVariantScalar('"[]"')).toThrow(VariantError);
    expect(() => parseVariantScalar(JSON.stringify(two.map((item, index) => index === 0 ? { ...item, title: 'line\u0001control' } : item)))).toThrow(VariantError);
  });
});

describe('variant family body sections', () => {
  test('returns exact payloads for two ordered sections', () => {
    const payloads = ['First body\n', 'Другий текст\n'];
    const variants = [variant('legacy-one', { contentSha256: hash(payloads[0]!) }), variant('legacy-two', { contentSha256: hash(payloads[1]!) })];
    expect([...parseVariantSections(sectionBody(variants, payloads), variants)]).toEqual([['legacy-one', payloads[0]!], ['legacy-two', payloads[1]!]]);
  });

  test('rejects missing, duplicate, unknown, and out-of-order markers', () => {
    const payloads = ['one\n', 'two\n'];
    const variants = [variant('legacy-one', { contentSha256: hash(payloads[0]!) }), variant('legacy-two', { contentSha256: hash(payloads[1]!) })];
    expect(() => parseVariantSections('outside', variants)).toThrow(VariantError);
    expect(() => parseVariantSections(sectionBody(variants, payloads).replace('<!-- sbvf:variant:begin legacy-two -->', '<!-- sbvf:variant:begin legacy-one -->'), variants)).toThrow(VariantError);
    expect(() => parseVariantSections(sectionBody(variants, payloads).replace('two\n<!-- sbvf:variant:end legacy-two -->', 'two\n<!-- sbvf:variant:begin unknown -->\n<!-- sbvf:variant:end legacy-two -->'), variants)).toThrow(VariantError);
    expect(() => parseVariantSections(sectionBody([...variants].reverse(), [...payloads].reverse()), variants)).toThrow(VariantError);
  });

  test('rejects outside text, CRLF, missing payload LF, hash mismatch, and marker injection', () => {
    const payloads = ['body\n', 'second\n'];
    const variants = [variant('legacy-one', { contentSha256: hash(payloads[0]!) }), variant('legacy-two', { contentSha256: hash(payloads[1]!) })];
    const body = sectionBody(variants, payloads);
    expect(() => parseVariantSections(`x${body}`, variants)).toThrow(VariantError);
    expect(() => parseVariantSections(`${body}\nextra`, variants)).toThrow(VariantError);
    expect(() => parseVariantSections(body.replace(/\n/gu, '\r\n'), variants)).toThrow(VariantError);
    expect(() => parseVariantSections(body.replace('body\n<!--', 'body<!--'), variants)).toThrow(VariantError);
    expect(() => parseVariantSections(body, [variant('legacy-one'), variants[1]!])).toThrow(VariantError);
    const injected = sectionBody([variants[0]!, variants[1]!], ['body\n<!-- sbvf:variant:end legacy-one -->\n', payloads[1]!]);
    expect(() => parseVariantSections(injected, variants)).toThrow(VariantError);
  });
});
