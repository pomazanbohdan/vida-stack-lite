import { describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { parseFrontmatter } from '../skills/vp-mode/scripts/frontmatter.ts';
import { APPROACH_VOCABULARY, parseApproachAssessments } from '../skills/vp-mode/scripts/instruction-approaches.ts';
import { validateAgainstSchema, validateSchemaDefinition } from '../skills/vp-mode/scripts/schema.ts';
import schema from '../config/vpinstruction.v1.2.schema.json' with { type: 'json' };

const declarations = new Map<string, readonly string[]>([
  ['execution', ['solo', 'delegated']],
  ['remediation-timing', ['none', 'immediate', 'after-review']],
  ['review-requirement', ['none', 'independent']],
]);
const body = 'Aé🙂\r\nend\r\n';
const hash = createHash('sha256').update(body).digest('hex');
function input(rows: string[], digest = hash, content = body) {
  return parseFrontmatter(`---\r\napproach_assessments:\r\n${rows.map((row) => `  - "${row}"\r\n`).join('')}approach_body_sha256: ${digest}\r\n---\r\n\r\n${content}`);
}
const declared = 'dimension=execution; state=declared; values=solo,delegated; evidence=body:1-7';

describe('approach assessments', () => {
  test('parses exact UTF8 body bytes and preserves assessed states', () => {
    expect(hash).toBe('053da0c07e506a6949d7d85005f1f7f3511a88af94c28d5c9272c70e3174ff67');
    const parsed = input([declared, 'dimension=remediation-timing; state=unknown; reason=insufficient evidence; evidence=body:0-1', 'dimension=review-requirement; state=no-decision; reason=no choice; evidence=body:7-12']);
    expect(parsed.body).toBe(body);
    expect(parseApproachAssessments(parsed, declarations)).toEqual([
      { dimension: 'execution', state: 'declared', values: ['solo', 'delegated'], evidence: { start: 1, end: 7 } },
      { dimension: 'remediation-timing', state: 'unknown', reason: 'insufficient evidence', evidence: { start: 0, end: 1 } },
      { dimension: 'review-requirement', state: 'no-decision', reason: 'no choice', evidence: { start: 7, end: 12 } },
    ]);
    expect(parseApproachAssessments(input(['dimension=execution; state=not-applicable; reason=irrelevant; evidence=body:0-1']), declarations)[0]?.state).toBe('not-applicable');
    expect(parseApproachAssessments(parseFrontmatter('---\n---\ntext'), declarations)).toEqual([]);
    expect(parseApproachAssessments(input([declared]), declarations)).toHaveLength(1);
    expect(APPROACH_VOCABULARY.execution).toEqual(['solo', 'delegated']);
    expect(Object.isFrozen(APPROACH_VOCABULARY.execution)).toBe(true);
    const bom = parseFrontmatter(`\uFEFF---\r\napproach_assessments:\r\n  - "${declared}"\r\napproach_body_sha256: ${hash}\r\n---\r\n\r\n${body}`);
    expect(bom.body).toBe(body);
    expect(parseApproachAssessments(bom, declarations)[0]?.evidence).toEqual({ start: 1, end: 7 });
  });
  test('rejects stale hashes, invalid boundaries and missing digest or rows', () => {
    expect(() => parseApproachAssessments(input([declared], hash, body + '!'), declarations)).toThrow('approach body digest mismatch');
    for (const span of ['0-0', '2-3', '1-4', '0-99', '01-2', '0-9007199254740992']) {
      expect(() => parseApproachAssessments(input([declared.replace('1-7', span)]), declarations)).toThrow();
    }
    expect(() => parseApproachAssessments({ data: { approach_assessments: [declared] }, body }, declarations)).toThrow();
    expect(() => parseApproachAssessments({ data: { approach_body_sha256: hash }, body }, declarations)).toThrow();
  });
  test('rejects malformed rows, duplicate dimensions, values and incompatible states', () => {
    const bad = [
      declared.replace('solo,delegated', 'solo,solo'), declared.replace('solo,delegated', 'swarm'),
      declared.replace('execution', 'other'), declared + '; extra=x', declared + '; state=unknown',
      declared.replace('; values=solo,delegated', '; reason=x'), declared.replace('declared', 'unknown'),
      'dimension=execution; state=unknown; reason= ; evidence=body:0-1',
      'dimension=execution; state=unknown; reason=x; values=solo; evidence=body:0-1',
      declared.replace('; state', ';state'), declared.replace('declared', 'unassessed'),
    ];
    for (const row of bad) expect(() => parseApproachAssessments(input([row]), declarations)).toThrow();
    expect(() => parseApproachAssessments(input([declared, declared]), declarations)).toThrow();
    expect(() => parseApproachAssessments(input([declared.replace('execution', 'other')]), declarations)).toThrow('unknown approach dimension');
    expect(() => parseApproachAssessments(input([declared, declared]), declarations)).toThrow('duplicate approach dimension');
    expect(() => parseApproachAssessments(input([declared.replace('values=solo,delegated', 'extra=x')]), declarations)).toThrow('invalid declared approach keys');
    expect(() => parseApproachAssessments(input([declared.replace('declared', 'unassessed')]), declarations)).toThrow('invalid approach state');
  });
  test('schema enforces paired fields and unique rows', () => {
    const base = { schema: 'VPInstruction/v1.1', classification_status: 'unclassified', classification_reason: 'pending', instruction_id: 'sample', title: 'Sample', summary: 'Summary', capability_tags: [], pattern_tags: [], conditions_applies_when: 'always', conditions_does_not_apply_when: 'never', artifact_contract_output_type: 'none', artifact_contract_required_data: [], artifact_contract_verified_by: '', compatibility_excludes: [], compatibility_requires: [], provenance: ['donor=x; license=y; revision=0123456789012345678901234567890123456789; path=z'], status: 'active', revision: 1 };
    expect(validateSchemaDefinition(schema)).toEqual([]);
    expect(validateAgainstSchema({ ...base, schema: 'VPInstruction/v1.2' }, schema)).toEqual([]);
    const next = { ...base, schema: 'VPInstruction/v1.2', approach_assessments: [declared], approach_body_sha256: hash };
    expect(validateAgainstSchema(next, schema)).toEqual([]);
    expect(validateAgainstSchema({ ...next, revision: 0 }, schema).length).toBeGreaterThan(0);
    expect(validateAgainstSchema({ ...next, approach_body_sha256: 'bad' }, schema).length).toBeGreaterThan(0);
    const { approach_assessments: rows, approach_body_sha256: digest, ...withoutApproaches } = next;
    expect(validateAgainstSchema({ ...withoutApproaches, approach_assessments: rows }, schema).length).toBeGreaterThan(0);
    expect(validateAgainstSchema({ ...withoutApproaches, approach_body_sha256: digest }, schema).length).toBeGreaterThan(0);
    expect(validateAgainstSchema({ ...next, approach_assessments: [declared, declared] }, schema).length).toBeGreaterThan(0);
  });
});
