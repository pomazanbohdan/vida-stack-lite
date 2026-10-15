import { expect, test } from 'bun:test';
import fc from 'fast-check';
import {
  compileImplementationScopeValidator,
  validateImplementationScope,
} from '../src/contracts/implementation-scope.js';
import { expectReturned } from './helpers/expect-rejection.ts';

const scope = {
  schema: 'ImplementationScope/v1',
  scope_id: 'scope-synthetic',
  work_id: 'work-synthetic',
  source_revision: '1'.repeat(64),
  ac_ids: ['AC-synthetic'],
  allowed_paths: ['src/example.ts'],
  implementation_paths: ['src/example.ts'],
  changed_symbols: [],
  non_goals: [],
  acceptance_trace: ['AC-synthetic'],
  behavior_trace: ['behavior-synthetic'],
  test_trace: ['test-synthetic'],
  diagnostic_trace: ['diagnostic-synthetic'],
  attribution: { thread_id: 'thread-synthetic', pointer: 'test setup only' },
  owner: 'synthetic-owner',
  created_at: '2026-10-10T00:00:00Z',
};

test('bundled scope denies missing fields, unknown fields and duplicate paths', () => {
  expect(expectReturned(() => validateImplementationScope(scope))).toBe(true);
  for (const key of Object.keys(scope)) {
    const incomplete: Record<string, unknown> = { ...scope };
    delete incomplete[key];
    expect(expectReturned(() => validateImplementationScope(incomplete))).toBe(false);
  }
  expect(expectReturned(() => validateImplementationScope({ ...scope, unlisted: true }))).toBe(false);
  expect(
    expectReturned(() =>
      validateImplementationScope({ ...scope, allowed_paths: ['src/example.ts', 'src/example.ts'] }),
    ),
  ).toBe(false);
  expect(expectReturned(() => validateImplementationScope({ ...scope, allowed_paths: [] }))).toBe(false);
});

test('selected schemas control validation independently of the bundled contract', () => {
  fc.assert(
    fc.property(fc.string(), (selected) => {
      const validate = expectReturned(() => compileImplementationScopeValidator({ type: 'string', const: selected }));
      const other = expectReturned(() =>
        compileImplementationScopeValidator({ type: 'string', const: `${selected}x` }),
      );
      expect(expectReturned(() => validate(selected))).toBe(true);
      expect(expectReturned(() => validate(`${selected}x`))).toBe(false);
      expect(expectReturned(() => validate(scope))).toBe(false);
      expect(expectReturned(() => other(`${selected}x`))).toBe(true);
      expect(expectReturned(() => other(selected))).toBe(false);
      expect(expectReturned(() => validate(selected))).toBe(true);
    }),
    { seed: 20261010, numRuns: 50 },
  );
});

test('selected schema compilation remains strict', () => {
  expect(() => compileImplementationScopeValidator({ type: 'object', unknownKeyword: true })).toThrow(
    /unknown keyword/,
  );
});

test('selected schema retains every validation error in one decision', () => {
  const validate = expectReturned(() =>
    compileImplementationScopeValidator({
      type: 'object',
      properties: { left: { type: 'integer' }, right: { type: 'boolean' } },
      required: ['left', 'right'],
      additionalProperties: false,
    }),
  );
  expect(expectReturned(() => validate({ left: 'invalid', right: 12, extra: true }))).toBe(false);
  expect(validate.errors).toHaveLength(3);
  expect(validate.errors?.map((error) => error.keyword).sort()).toEqual(['additionalProperties', 'type', 'type']);
});
