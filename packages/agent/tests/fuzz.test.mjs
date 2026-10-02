import { configuredTestContext } from './configured-context.mjs';
import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import path from 'node:path';
import {
  assertCanonicalJsonValue,
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
const seed = Number.parseInt(process.env.FAST_CHECK_SEED ?? '20260830', 10);
const numRuns = Number.parseInt(process.env.FAST_CHECK_NUM_RUNS ?? '1000', 10);
const replayPath = process.env.FAST_CHECK_PATH;
const parameters = Object.freeze({
  seed,
  numRuns,
  endOnFailure: true,
  ...(replayPath ? { path: replayPath } : {}),
});
const unknownValue = fc.anything({
  withBigInt: true,
  withDate: true,
  withMap: true,
  withNullPrototype: true,
  withObjectString: true,
  withSet: true,
  withSparseArray: true,
  withTypedArray: true,
});

function outcome(action) {
  try {
    return { returned: true, value: action() };
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    return { returned: false, value: error };
  }
}

function assertProperty(property) {
  void fc.assert(property, parameters);
}

describe('deterministic shrinking fuzz boundaries', () => {
  test('canonical JSON accepts only stable JSON data', () => {
    assertProperty(
      fc.property(unknownValue, (value) => {
        const result = outcome(() => assertCanonicalJsonValue(value));
        if (result.returned) {
          expect(() => JSON.stringify(value)).not.toThrow();
          expect(value).not.toBeUndefined();
        }
      }),
    );
  });

  test('all root unknown-value validators return their input or fail closed', () => {
    const validators = [
      validateAuthorizationRequest,
      validateGovernedWriteIntent,
      validateGovernedWriteRequest,
      validateRuntimeEnvelope,
      (value) => validateRuntimeConfig(value, repositoryRoot),
      (value) => validateProjectContext(value, repositoryRoot),
      (value) => validateResolvedPathProfile(value, repositoryRoot),
    ];
    assertProperty(
      fc.property(unknownValue, fc.integer({ min: 0, max: validators.length - 1 }), (value, index) => {
        const result = outcome(() => validators[index](value));
        if (result.returned) expect(result.value).toBe(value);
      }),
    );
  });

  test('runtime envelope revision binding rejects arbitrary payload and binding mutations', () => {
    assertProperty(
      fc.property(unknownValue, unknownValue, (value, binding) => {
        const result = outcome(() => consumeRuntimeEnvelope(value, binding));
        if (result.returned) {
          expect(result.value.sourceRevision).toBe(binding.sourceRevision);
          expect(result.value.expectedRevision).toBe(binding.currentRevision);
        }
      }),
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
    );
  });

  test('configured authorization denies requests without trusted identity', () => {
    assertProperty(
      fc.property(unknownValue, (value) => {
        const result = authorizer(value, undefined, context);
        expect(result.decision).toBe('deny');
        expect(result.diagnostics.length).toBeGreaterThan(0);
      }),
    );
  });

  test('configured authorization rejects malformed requests with matched trusted identity', () => {
    const request = {
      principal: 'fuzz-principal',
      role: 'developer-orchestrator',
      action: 'write',
      tenant: context.repository_id,
      project: context.project_ids[0],
      resourceTenant: context.repository_id,
      resourceProject: context.project_ids[0],
      registryHash: context.registry_hash,
      operationHash: 'a'.repeat(64),
    };
    const identity = {
      schema: 'TrustedProjectIdentity/v1',
      source: 'authenticated-context',
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
    );
  });
});
