import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { FrontmatterError, parseFrontmatter } from '../skills/vp-mode/scripts/frontmatter.ts';
import { validateAgainstSchema, type Schema } from '../skills/vp-mode/scripts/schema.ts';

const instructionSchema = JSON.parse(readFileSync(fileURLToPath(new URL('../config/vpinstruction.v1.schema.json', import.meta.url)), 'utf8')) as Schema;

const instructionText = `---
instruction_id: test-first-development
title: Test-first development
summary: Write a test before the implementation so that the behavior can be verified before it appears.
capability_tags:
  - write-tests-first
  - design-test-cases
pattern_tags:
  - test-first-development
conditions_applies_when: the change adds new or changes existing behavior.
conditions_does_not_apply_when: the change touches only documentation or comments.
artifact_contract_output_type: test-suite
artifact_contract_required_data:
  - test cases
  - expected results
artifact_contract_verified_by: bun test
compatibility_excludes:
  - test-after-development
compatibility_requires:
  - define-acceptance-criteria
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/test-driven-development/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=workflows/.../test-driven.md
status: active
revision: 1
---

# Test-first development

<normative text: 20–80 lines, imperative, self-contained>
`;

describe('parseFrontmatter', () => {
  test('parses the catalog design example and preserves the instruction body', () => {
    const result = parseFrontmatter(instructionText);
    expect(validateAgainstSchema(result.data, instructionSchema)).toEqual([]);
    expect(Object.keys(result.data)).toEqual([
      'instruction_id', 'title', 'summary', 'capability_tags', 'pattern_tags', 'conditions_applies_when',
      'conditions_does_not_apply_when', 'artifact_contract_output_type', 'artifact_contract_required_data',
      'artifact_contract_verified_by', 'compatibility_excludes', 'compatibility_requires', 'provenance', 'status', 'revision',
    ]);
    expect(result.data.capability_tags).toEqual(['write-tests-first', 'design-test-cases']);
    expect(result.data.pattern_tags).toEqual(['test-first-development']);
    expect(result.data.artifact_contract_required_data).toEqual(['test cases', 'expected results']);
    expect(result.data.compatibility_excludes).toEqual(['test-after-development']);
    expect(result.data.compatibility_requires).toEqual(['define-acceptance-criteria']);
    expect(result.data.provenance).toEqual([
      'donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/test-driven-development/SKILL.md',
      'donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=workflows/.../test-driven.md',
    ]);
    expect(result.data.revision).toBe(1);
    expect(result.data.status).toBe('active');
    expect(result.body).toBe('# Test-first development\n\n<normative text: 20–80 lines, imperative, self-contained>\n');
  });

  test('keeps equals and semicolons in one list scalar', () => {
    const result = parseFrontmatter('---\nprovenance:\n  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/test-driven-development/SKILL.md\n---\nbody');
    expect(result.data.provenance).toEqual(['donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/test-driven-development/SKILL.md']);
  });

  test('removes double quotes and preserves a quoted colon', () => {
    const result = parseFrontmatter('---\ntitle: "A: B"\nplain: value\n---\nbody');
    expect(result.data).toEqual({ title: 'A: B', plain: 'value' });
  });

  test('parses the one supported empty flow value', () => {
    expect(parseFrontmatter('---\nitems: []\n---\n').data.items).toEqual([]);
  });

  test('rejects an empty flow value in a block-list item', () => {
    let caught: unknown;
    try {
      parseFrontmatter('---\nitems:\n  - []\n---\n');
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(FrontmatterError);
    expect((caught as FrontmatterError).message).toContain('unsupported flow value');
    expect((caught as FrontmatterError).line).toBe(3);
  });

  test('allows title empty arrays through parsing so the schema reports the type mismatch', () => {
    const parsed = parseFrontmatter(instructionText.replace('title: Test-first development', 'title: []'));
    expect(parsed.data.title).toEqual([]);
    expect(validateAgainstSchema(parsed.data, instructionSchema)).toContain('title: expected string');
  });

  test('decodes escaped quotes and backslashes in double-quoted values', () => {
    const text = ['---', 'quote: "a\\"b"', 'slash: "a\\\\b"', '---', ''].join('\n');
    expect(parseFrontmatter(text).data).toEqual({ quote: 'a"b', slash: 'a\\b' });
  });

  test('parses the design and guidance fixtures against the instruction schema', () => {
    expect(validateAgainstSchema(parseFrontmatter(instructionText).data, instructionSchema)).toEqual([]);
    const guidanceText = instructionText
      .replace('artifact_contract_output_type: test-suite', 'artifact_contract_output_type: none')
      .replace('artifact_contract_required_data:\n  - test cases\n  - expected results', 'artifact_contract_required_data: []')
      .replace('artifact_contract_verified_by: bun test', 'artifact_contract_verified_by:');
    const guidance = parseFrontmatter(guidanceText);
    expect(guidance.data.artifact_contract_required_data).toEqual([]);
    expect(guidance.data.artifact_contract_verified_by).toBe('');
    expect(validateAgainstSchema(guidance.data, instructionSchema)).toEqual([]);
  });

  test('parses empty, boolean, numeric, and string scalars', () => {
    const result = parseFrontmatter('---\nempty:\nyes: true\nno: false\none: 1\nzero: 0\ntext: 01x\n---\nbody');
    expect(result.data).toEqual({ empty: '', yes: true, no: false, one: 1, zero: 0, text: '01x' });
  });

  test('ignores comment-only lines and preserves hash characters inside values', () => {
    const result = parseFrontmatter('---\n# note\npath: instructions/rule#section.md\nitems:\n  # list note\n  - value # retained\n---\nbody');
    expect(result.data).toEqual({ path: 'instructions/rule#section.md', items: ['value # retained'] });
  });

  test('accepts a BOM and removes only leading blank body lines', () => {
    const result = parseFrontmatter('\uFEFF---\ntitle: ok\n---\n\n  \nbody\n\n');
    expect(result.body).toBe('body\n\n');
  });

  test('preserves prototype-sensitive keys as own JSON properties', () => {
    const prototypeKeys = Object.getOwnPropertyNames(Object.prototype);
    const data = parseFrontmatter('---\n__proto__: safe\nconstructor: value\n---\n').data;
    expect(Object.prototype.hasOwnProperty.call(data, '__proto__')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(data, 'constructor')).toBe(true);
    expect(Object.getPrototypeOf(data)).toBe(Object.prototype);
    expect(Object.getOwnPropertyNames(Object.prototype)).toEqual(prototypeKeys);
    expect(JSON.stringify(data)).toBe('{"__proto__":"safe","constructor":"value"}');
  });

  test('accepts CRLF delimiters and preserves CRLF body without adding it to values', () => {
    const result = parseFrontmatter('---\r\ntitle: clean\r\n---\r\n\r\nbody\r\n');
    expect(result.data.title).toBe('clean');
    expect(result.body).toBe('body\r\n');
  });

  test('accepts opening and closing delimiters with trailing whitespace', () => {
    expect(parseFrontmatter('--- \t\r\ntitle: accepted\r\n---  \r\nbody')).toEqual({
      data: { title: 'accepted' },
      body: 'body',
    });
  });

  test('reports unsupported and malformed syntax with source line numbers', () => {
    const invalidInputs = [
      ['---\nitems:\n  - key: value\n---\n', 'unquoted colon in value', 3],
      ['---\nroot:\n  child: value\n---\n', 'nested mappings are unsupported', 3],
      ['---\nroot:\n  |\n---\n', 'unsupported block scalar', 3],
      ['---\nvalue: |\n---\n', 'unsupported block scalar', 2],
      ['---\nvalue: >-\n---\n', 'unsupported block scalar', 2],
      ['---\nvalue: >+\n---\n', 'unsupported block scalar', 2],
      ['---\nvalue: >2\n---\n', 'unsupported block scalar', 2],
      ['---\nvalue: >foo\n---\n', 'unsupported block scalar', 2],
      ['---\nvalue: &a anchor\n---\n', 'unsupported anchor or alias', 2],
      ['---\nvalue: *a\n---\n', 'unsupported anchor or alias', 2],
      ['---\nvalue: !!str text\n---\n', 'unsupported YAML tag', 2],
      ['---\nvalue: > folded\n---\n', 'unsupported block scalar', 2],
      ['---\nvalue: [a, b]\n---\n', 'unsupported flow value', 2],
      ['---\nvalue: [,]\n---\n', 'unsupported flow value', 2],
      ['---\nvalue: {a: b}\n---\n', 'unsupported flow value', 2],
      ['---\nitems:\n  - parent\n    - child\n---\n', 'nested mappings or lists are unsupported', 4],
      ['---\nurl: https://example.test\n---\n', 'unquoted colon in value', 2],
      ['---\nvalue: "unterminated\n---\n', 'unterminated quoted value', 2],
      ['---\nvalue: "a\\n"\n---\n', 'unsupported escape sequence', 2],
      ['---\nvalue: "a\\"\n---\n', 'unterminated quoted value', 2],
      ['---\nvalue: "a"b"\n---\n', 'malformed quoted value', 2],
      ["---\nvalue: 'single quoted'\n---\n", 'unsupported single-quoted value', 2],
      ['---\nvalue: ok\nvalue: again\n---\n', 'duplicate key: value', 3],
      ['---\nbad/key: value\n---\n', 'invalid frontmatter key: bad/key', 2],
      ['---\nmalformed line\n---\n', 'invalid frontmatter entry', 2],
      ['---\nkey:value\n---\n', 'invalid frontmatter entry', 2],
      ['no frontmatter\n', 'frontmatter block is missing', 1],
      ['---\nvalue: ok\n', 'frontmatter block is not closed', 2],
    ] as const;
    for (const [input, label, line] of invalidInputs) {
      let caught: unknown;
      try {
        parseFrontmatter(input);
      } catch (error) {
        caught = error;
      }
      expect(caught, label).toBeInstanceOf(FrontmatterError);
      expect((caught as FrontmatterError).message, label).toContain(label);
      expect((caught as FrontmatterError).line, label).toBe(line);
    }
  });
});
