import { configuredTestContext } from './configured-context.ts';
import { describe, expect, test } from 'bun:test';
import fc from 'fast-check';
import path from 'node:path';
import { assertProperty } from './helpers/assert-property.js';
import type { RuntimeEnvelopeRevisionBinding } from '../src/contracts/envelopes.js';
import {
  assertCanonicalJsonValue,
  canonicalJson,
  consumeRuntimeEnvelope,
  resolveConfigPath,
  validateAuthorizationRequest,
  validateGovernedWriteIntent,
  validateGovernedWriteRequest,
  validateProjectContext,
  validateResolvedPathProfile,
  validateRuntimeConfig,
  validateRuntimeEnvelope,
} from '../src/index.ts';
import { createConfiguredProjectAuthorizer } from '../src/authorization/cedar-boundary.ts';

const { repositoryRoot, config, context } = configuredTestContext();
const authorizer = createConfiguredProjectAuthorizer(repositoryRoot, config);
const projectId = context.project_ids[0];
if (projectId === undefined) throw new Error('Fuzz fixture requires a configured project');
const seed = Number(process.env.FAST_CHECK_SEED ?? '20260830');
const numRuns = Number(process.env.FAST_CHECK_NUM_RUNS ?? '1000');
if (!Number.isSafeInteger(seed) || !Number.isSafeInteger(numRuns) || numRuns < 1)
  throw new Error('Property seed and positive run count must be safe integers.');
const replayPath = process.env.FAST_CHECK_PATH;
const parameters = Object.freeze({
  seed,
  numRuns,
  endOnFailure: true,
  ...(replayPath ? { path: replayPath } : {}),
});
const unknownValue: fc.Arbitrary<unknown> = fc.anything({
  withBigInt: true,
  withDate: true,
  withMap: true,
  withNullPrototype: true,
  withObjectString: true,
  withSet: true,
  withSparseArray: true,
  withTypedArray: true,
});

function outcome<T>(action: () => T): { returned: true; value: T } | { returned: false; value: unknown } {
  try {
    return { returned: true, value: action() };
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    return { returned: false, value: error };
  }
}

describe('deterministic shrinking fuzz boundaries', () => {
  test('canonical JSON accepts bounded JSON values with equivalent native wire data', () => {
    // The wire contract excludes unsafe integers and -0, which jsonValue can generate.
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
        const actual: unknown = JSON.parse(canonicalJson(value));
        expect(actual).toEqual(expected);
      }),
      parameters,
    );
  });

  test('canonical JSON rejects unsupported nested wire values', () => {
    assertProperty(
      fc.property(
        fc.oneof(fc.bigInt(), fc.constantFrom(undefined, NaN, Infinity, -Infinity, -0, Number.MAX_SAFE_INTEGER + 1)),
        (value) => {
          expect(() => assertCanonicalJsonValue({ unsupported: value })).toThrow();
        },
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
    const actual: unknown = JSON.parse(canonicalJson(value));
    expect(actual).toEqual(expected);
    expect(value.left).toBe(value.right);
  });

  test('all root unknown-value validators return their input or fail closed', () => {
    const validators = [
      validateAuthorizationRequest,
      validateGovernedWriteIntent,
      validateGovernedWriteRequest,
      validateRuntimeEnvelope,
      (value: unknown) => validateRuntimeConfig(value, repositoryRoot),
      (value: unknown) => validateProjectContext(value, repositoryRoot),
      (value: unknown) => validateResolvedPathProfile(value, repositoryRoot),
    ];
    assertProperty(
      fc.property(unknownValue, fc.integer({ min: 0, max: validators.length - 1 }), (value, index) => {
        const result = outcome(() => validators[index]!(value));
        if (result.returned) expect<unknown>(result.value).toBe(value);
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

  test('repository paths never resolve outside the trusted root', () => {
    assertProperty(
      fc.property(fc.string({ maxLength: 512 }), (relative) => {
        const result = outcome(() => resolveConfigPath(repositoryRoot, relative, 'fuzz path'));
        if (result.returned) {
          const normalizedRoot = path.resolve(repositoryRoot);
          const normalizedTarget = path.resolve(result.value);
          expect(path.relative(normalizedRoot, normalizedTarget).startsWith('..')).toBe(false);
        }
      }),
      parameters,
    );
  });

  test('configured authorization denies requests without trusted identity', () => {
    assertProperty(
      fc.property(unknownValue, (value) => {
        const result = authorizer(value, undefined, context);
        expect(result.decision).toBe('deny');
        expect(result.diagnostics.length).toBeGreaterThan(0);
      }),
      parameters,
    );
  });

  test('configured authorization rejects malformed requests with matched trusted identity', () => {
    const request = {
      principal: 'fuzz-principal',
      role: 'developer-orchestrator',
      action: 'write',
      tenant: context.repository_id,
      project: projectId,
      resourceTenant: context.repository_id,
      resourceProject: projectId,
      registryHash: context.registry_hash,
      operationHash: 'a'.repeat(64),
    };
    const identity = {
      schema: 'TrustedProjectIdentity/v1' as const,
      source: 'authenticated-context' as const,
      principal: request.principal,
      role: request.role,
      tenant: request.tenant,
      project: request.project,
      registry_hash: context.registry_hash,
    };
    expect(authorizer(request, identity, context).decision).toBe('allow');
    assertProperty(
      fc.property(
        fc.constantFrom('principal', 'role', 'action', 'tenant', 'project', 'registryHash', 'operationHash'),
        fc.constantFrom(null, undefined, 0, false, [], {}),
        (field, value) => {
          const malformed = { ...request, [field]: value };
          expect(() => validateAuthorizationRequest(malformed)).toThrow();
          const result = authorizer(malformed, identity, context);
          expect(result.decision).toBe('deny');
          expect(result.diagnostics.length).toBeGreaterThan(0);
        },
      ),
      parameters,
    );
  });
});
