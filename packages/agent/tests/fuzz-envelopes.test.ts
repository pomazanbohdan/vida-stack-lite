import { describe, expect, test } from 'bun:test';
import fc from 'fast-check';
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
          expect(result.value.sourceRevision).toBe((binding as RuntimeEnvelopeRevisionBinding).sourceRevision);
          expect(result.value.expectedRevision).toBe((binding as RuntimeEnvelopeRevisionBinding).currentRevision);
        }
      }),
      parameters,
    );
  });
});
