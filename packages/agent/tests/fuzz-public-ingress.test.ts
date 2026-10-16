import { describe, expect, test } from 'bun:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { assertProperty } from './helpers/assert-property.js';
import { expectReturned } from './helpers/expect-rejection.ts';
import { outcome, parameters, unknownValue } from './helpers/fuzz-boundary.ts';
import {
  assertCanonicalJsonValue,
  canonicalJson,
  validateAuthorizationRequest,
  validateGovernedWriteIntent,
  validateGovernedWriteRequest,
} from '../src/contracts/public-ingress.ts';

describe('deterministic public-ingress fuzz boundaries', () => {
  test('authorization validation rejects individually malformed required fields', () => {
    const request = {
      principal: 'fuzz-principal',
      role: 'developer-orchestrator',
      action: 'write',
      tenant: 'fixture-repository',
      project: 'fixture-project',
      resourceTenant: 'fixture-repository',
      resourceProject: 'fixture-project',
      registryHash: 'a'.repeat(64),
      operationHash: 'a'.repeat(64),
    };
    assert.deepEqual(structuredClone(expectReturned(() => validateAuthorizationRequest(request))), request);
    assertProperty(
      fc.property(
        fc.constantFrom('principal', 'role', 'action', 'tenant', 'project', 'registryHash', 'operationHash'),
        fc.constantFrom(null, undefined, 0, false, [], {}),
        (field, value) => {
          assert.throws(() => validateAuthorizationRequest({ ...request, [field]: value }), Error);
        },
      ),
      parameters,
    );
  });
  test('canonical JSON accepts bounded JSON values with equivalent native wire data', () => {
    const scalar = fc.oneof(
      fc.constant(null),
      fc.boolean(),
      fc.integer(),
      fc.string({ maxLength: 32 }),
      fc.constantFrom(0.5, -1.25),
    );
    const key = fc.string({ maxLength: 16 });
    const shallow = fc.oneof(
      scalar,
      fc.array(scalar, { maxLength: 8 }),
      fc.dictionary(key, scalar, { maxKeys: 8, noNullPrototype: true }),
    );
    const valid = fc.oneof(
      shallow,
      fc.array(shallow, { maxLength: 8 }),
      fc.dictionary(key, shallow, { maxKeys: 8, noNullPrototype: true }),
    );
    assertProperty(
      fc.property(valid, (value) => {
        expect(() => assertCanonicalJsonValue(value)).not.toThrow();
        const expected: unknown = JSON.parse(JSON.stringify(value));
        const serialized = expectReturned(() => canonicalJson(value));
        expect(typeof serialized).toBe('string');
        const actual: unknown = JSON.parse(serialized);
        expect(actual).toEqual(expected);
      }),
      parameters,
    );
  });

  test('canonical JSON rejects unsupported nested wire values', () => {
    assertProperty(
      fc.property(
        fc.oneof(fc.bigInt(), fc.constantFrom(undefined, NaN, Infinity, -Infinity, -0, Number.MAX_SAFE_INTEGER + 1)),
        (value) => expect(() => assertCanonicalJsonValue({ unsupported: value })).toThrow(),
      ),
      parameters,
    );
  });

  test('canonical JSON preserves the wire value of legal shared references', () => {
    const shared = { nested: [null, 'ї', 7, false] };
    const value = { right: shared, left: shared };
    expect(value.left).toBe(value.right);
    expect(() => assertCanonicalJsonValue(value)).not.toThrow();
    const expected: unknown = JSON.parse(JSON.stringify(value));
    const serialized = expectReturned(() => canonicalJson(value));
    expect(typeof serialized).toBe('string');
    const actual: unknown = JSON.parse(serialized);
    expect(actual).toEqual(expected);
    expect(value.left).toBe(value.right);
  });

  test('public-ingress unknown-value validators return their canonical image or fail closed', () => {
    const validators = [validateAuthorizationRequest, validateGovernedWriteIntent, validateGovernedWriteRequest];
    assertProperty(
      fc.property(unknownValue, fc.integer({ min: 0, max: validators.length - 1 }), (value, index) => {
        const result = outcome(() => validators[index]!(value));
        if (result.returned) {
          expect<unknown>(result.value).toEqual(value);
          if (value !== null && typeof value === 'object') expect(result.value).not.toBe(value);
        }
      }),
      parameters,
    );
  });
});
