import { describe, expect, test } from 'bun:test';
import fc from 'fast-check';
import { assertProperty } from './helpers/assert-property.js';
import { expectReturned } from './helpers/expect-rejection.ts';
import { parameters, unknownValue } from './helpers/fuzz-boundary.ts';
import { createConfiguredProjectAuthorizer } from '../src/authorization/cedar-boundary.ts';
import { configuredTestContext } from './configured-context.ts';

// This owner-specific suite intentionally keeps the authentic issued config and
// context capabilities required by Cedar authorization.
const { repositoryRoot, config, context } = configuredTestContext();
const projectId = context.project_ids[0];
if (projectId === undefined) throw new Error('Fuzz fixture requires a configured project');
function configuredAuthorizer() {
  const authorizer = expectReturned(() => createConfiguredProjectAuthorizer(repositoryRoot, config));
  expect(typeof authorizer).toBe('function');
  return authorizer;
}

describe('deterministic configured-authorization fuzz boundaries', () => {
  test('configured authorization denies requests without trusted identity', () => {
    const authorizer = configuredAuthorizer();
    assertProperty(
      fc.property(unknownValue, (value) => {
        const result = expectReturned(() => authorizer(value, undefined, context));
        expect(result).toBeDefined();
        expect(result).toMatchObject({ decision: 'deny' });
        expect(Array.isArray(result.diagnostics)).toBe(true);
        expect(result.diagnostics.length).toBeGreaterThan(0);
      }),
      parameters,
    );
  });

  test('configured authorization rejects malformed requests with matched trusted identity', () => {
    const authorizer = configuredAuthorizer();
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
    const allowed = expectReturned(() => authorizer(request, identity, context));
    expect(allowed).toBeDefined();
    expect(allowed).toMatchObject({ decision: 'allow' });
    assertProperty(
      fc.property(
        fc.constantFrom('principal', 'role', 'action', 'tenant', 'project', 'registryHash', 'operationHash'),
        fc.constantFrom(null, undefined, 0, false, [], {}),
        (field, value) => {
          const malformed = { ...request, [field]: value };
          const result = expectReturned(() => authorizer(malformed, identity, context));
          expect(result).toBeDefined();
          expect(result).toMatchObject({ decision: 'deny' });
          expect(Array.isArray(result.diagnostics)).toBe(true);
          expect(result.diagnostics.length).toBeGreaterThan(0);
        },
      ),
      parameters,
    );
  });
});
