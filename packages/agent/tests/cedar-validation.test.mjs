import { expect, test } from 'bun:test';
import { validate } from '@cedar-policy/cedar-wasm/nodejs';
import { assertConfiguredCedarPolicy } from '../src/authorization/cedar-boundary.ts';

const schema =
  'entity User; entity Group; entity Project; action read appliesTo { principal: User, resource: Project };';

test('Cedar 4.13 keeps invalid action applicability as a warning and candidate startup rejects it', () => {
  const policy = 'permit(principal is Group, action == Action::"read", resource);';
  const result = validate({ schema, policies: { staticPolicies: policy } });
  expect(result.type).toBe('success');
  expect(result.validationErrors).toHaveLength(0);
  expect(
    result.validationWarnings.some((warning) =>
      warning.error.message.includes('unable to find an applicable action given the policy scope constraints'),
    ),
  ).toBe(true);
  expect(() => assertConfiguredCedarPolicy(policy, schema)).toThrow(/semantic validation failed/);
});

test('configured validation keeps valid policy and rejects successful responses with semantic errors', () => {
  expect(() =>
    assertConfiguredCedarPolicy('permit(principal is User, action == Action::"read", resource);', schema),
  ).not.toThrow();
  expect(() =>
    assertConfiguredCedarPolicy('permit(principal, action == Action::"missing", resource);', schema),
  ).toThrow(/semantic validation failed/);
});
