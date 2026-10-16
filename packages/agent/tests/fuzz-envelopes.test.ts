import { describe, expect, test } from 'bun:test';
import fc from 'fast-check';
import assert from 'node:assert/strict';
import { assertProperty } from './helpers/assert-property.js';
import { outcome, parameters, unknownValue } from './helpers/fuzz-boundary.ts';
import {
  consumeRuntimeEnvelope,
  validateRuntimeEnvelope,
  type RuntimeEnvelopeRevisionBinding,
} from '../src/contracts/envelopes.ts';

describe('deterministic envelope fuzz boundaries', () => {
  test('runtime-envelope unknown-value validator returns its canonical image or fails closed', () => {
    assertProperty(
      fc.property(unknownValue, (value) => {
        const result = outcome(() => validateRuntimeEnvelope(value));
        if (result.returned) {
          assert.ok(result.value !== null && typeof result.value === 'object' && !Array.isArray(result.value));
          const returned = result.value;
          assert.equal(returned.schema, 'RuntimeEnvelope/v1');
          assert.equal(typeof returned.kind, 'string');
          assert.equal(typeof returned.operation, 'string');
          assert.equal(typeof returned.sourceRevision, 'string');
          assert.equal(typeof returned.expectedRevision, 'number');
          assert.ok(Object.hasOwn(returned, 'payload'));
          expect<unknown>(result.value).toEqual(value);
          if (value !== null && typeof value === 'object') expect(result.value).not.toBe(value);
        }
      }),
      parameters,
    );
  });

  test('runtime envelope revision binding rejects arbitrary payload and binding mutations', () => {
    assertProperty(
      fc.property(unknownValue, unknownValue, (value, binding) => {
        const result = outcome(() => consumeRuntimeEnvelope(value, binding as RuntimeEnvelopeRevisionBinding));
        if (result.returned) {
          assert.ok(result.value !== null && typeof result.value === 'object' && !Array.isArray(result.value));
          assert.ok(binding !== null && typeof binding === 'object' && !Array.isArray(binding));
          const returned = result.value;
          const revisionBinding = binding as Record<string, unknown>;
          assert.equal(returned.schema, 'RuntimeEnvelope/v1');
          assert.equal(typeof returned.sourceRevision, 'string');
          assert.equal(typeof returned.expectedRevision, 'number');
          assert.equal(returned.sourceRevision, revisionBinding.sourceRevision);
          assert.equal(returned.expectedRevision, revisionBinding.currentRevision);
        }
      }),
      parameters,
    );
  });
});
