import { expect, spyOn, test } from 'bun:test';
import * as cedarWasm from '@cedar-policy/cedar-wasm/nodejs';
import { validate } from '@cedar-policy/cedar-wasm/nodejs';
import { copyFile, mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { stringify as stringifyYaml } from 'yaml';
import {
  assertConfiguredCedarPolicy,
  authorizeProject,
  createConfiguredProjectAuthorizer,
  validateCedarPolicySet,
} from '../src/authorization/cedar-boundary.ts';
import {
  canonicalJsonDigest,
  type ProjectAuthorizationRequest,
  type TrustedProjectIdentity,
} from '../src/contracts/public-ingress.ts';
import {
  loadProjectSetContext,
  requireAbsoluteRepositoryRoot,
  validateResolvedPathProfile,
} from '../src/config/project-context.ts';
import { loadRuntimeConfig } from '../src/config/runtime-config.ts';
import { configuredTestContext } from './configured-context.ts';
import { expectReturned } from './helpers/expect-rejection.ts';

const schema =
  'entity User; entity Group; entity Project; action read appliesTo { principal: User, resource: Project };';

test('Cedar 4.13 keeps invalid action applicability as a warning and candidate startup rejects it', () => {
  const policy = 'permit(principal is Group, action == Action::"read", resource);';
  const result = validate({ schema, policies: { staticPolicies: policy } });
  expect(result.type).toBe('success');
  if (result.type !== 'success') throw new Error('Cedar fixture validation failed');
  expect(result.validationErrors).toHaveLength(0);
  const applicabilityWarning = result.validationWarnings.find((warning) =>
    warning.error.message.includes('unable to find an applicable action given the policy scope constraints'),
  );
  expect(applicabilityWarning).toBeDefined();
  expect(() => assertConfiguredCedarPolicy(policy, schema)).toThrow(/semantic validation failed/);
});

test('configured validation keeps valid policy and rejects successful responses with semantic errors', () => {
  expect(() =>
    assertConfiguredCedarPolicy('permit(principal is User, action == Action::"read", resource);', schema),
  ).not.toThrow();
  const invalidAttributePolicy =
    'permit(principal is User, action == Action::"read", resource) when { principal.missing == "alice" };';
  const validation = validate({ schema, policies: { staticPolicies: invalidAttributePolicy } });
  expect(validation.type).toBe('success');
  if (validation.type !== 'success') throw new Error('Cedar fixture validation failed');
  expect(validation.validationErrors.length).toBeGreaterThan(0);
  expect(() => assertConfiguredCedarPolicy(invalidAttributePolicy, schema)).toThrow(/semantic validation failed/);
});

test('configured validation permits an impossible-condition warning with no semantic errors', () => {
  const warningPolicy = 'permit(principal is User, action == Action::"read", resource) when { false };';
  const result = validate({ schema, policies: { staticPolicies: warningPolicy } });
  expect(result.type).toBe('success');
  if (result.type !== 'success') throw new Error('Cedar fixture validation failed');
  expect(result.validationErrors).toHaveLength(0);
  expect(result.validationWarnings.length).toBeGreaterThan(0);
  expect(
    result.validationWarnings.some((warning) =>
      warning.error.message.includes('unable to find an applicable action given the policy scope constraints'),
    ),
  ).toBe(false);
  expect(() => assertConfiguredCedarPolicy(warningPolicy, schema)).not.toThrow();
});

test('configured validation rejects malformed policy and schema at their parse boundaries', () => {
  const policy = 'permit(principal is User, action == Action::"read", resource);';
  expect(() => assertConfiguredCedarPolicy('not cedar', schema)).toThrow('configured Cedar policy is invalid');
  expect(() => assertConfiguredCedarPolicy(policy, 'not a schema')).toThrow('configured Cedar schema is invalid');
  expect(() => assertConfiguredCedarPolicy(policy, schema)).not.toThrow();
});

test('configured validation fails closed on a validation failure envelope after successful parsing', () => {
  const policy = 'permit(principal is User, action == Action::"read", resource);';
  const validation = spyOn(cedarWasm, 'validate').mockReturnValue({ type: 'failure', errors: [], warnings: [] });
  try {
    expect(() => assertConfiguredCedarPolicy(policy, schema)).toThrow(
      'configured Cedar policy/schema semantic validation failed',
    );
    expect(validation).toHaveBeenCalledTimes(1);
  } finally {
    validation.mockRestore();
  }
  expect(() => assertConfiguredCedarPolicy(policy, schema)).not.toThrow();
});

test('configured authorizer validates Cedar from an authentic loaded repository configuration', async () => {
  const deadline = performance.now() + 5_000;
  const { repositoryRoot, config } = configuredTestContext();
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), 'vida-cedar-validation-'));
  let succeeded = false;
  try {
    const files = [
      'AGENTS.md',
      'AGENT.sidecar.md',
      'agent-runtime.config.v1.yaml',
      'docs/agent-instructions/documentation-policy.v1.json',
    ];
    for (const relative of files) {
      const destination = path.join(fixtureRoot, relative);
      await mkdir(path.dirname(destination), { recursive: true });
      await copyFile(path.join(repositoryRoot, relative), destination);
    }

    const alteredConfig = structuredClone(config) as {
      authorization: { cedar: { policy: string; schema_text: string } };
    };
    // Keep the shallow embedded-policy marker while making Cedar parsing fail.
    alteredConfig.authorization.cedar.policy = 'permit {';
    await writeFile(
      path.join(fixtureRoot, 'agent-runtime.config.v1.yaml'),
      stringifyYaml(alteredConfig, { lineWidth: 0 }),
    );

    const loadedConfig = loadRuntimeConfig(fixtureRoot);
    expect(() => createConfiguredProjectAuthorizer(fixtureRoot, loadedConfig)).toThrow(
      'configured Cedar policy is invalid',
    );
    succeeded = true;
  } finally {
    if (succeeded && performance.now() < deadline) rmSync(fixtureRoot, { recursive: true, force: true });
    else console.error(`Retained Cedar configuration fixture: ${fixtureRoot}`);
  }
}, 5_000);

const completenessContext = configuredTestContext();
const repositoryRoot = completenessContext.repositoryRoot;
const config = completenessContext.config;
const project = completenessContext.context;
function required<T>(value: T | undefined, label: string): T {
  if (value === undefined) throw new Error(`Expected ${label}.`);
  return value;
}
const projectBinding = required(project.project_bindings[0], 'a configured project binding');
function authorizationRequest(operationHash?: string): ProjectAuthorizationRequest {
  return {
    principal: 'principal-1',
    role: 'developer-orchestrator',
    action: 'write',
    tenant: project.repository_id,
    project: projectBinding.project_id,
    resourceTenant: project.repository_id,
    resourceProject: projectBinding.project_id,
    registryHash: project.registry_hash,
    ...(operationHash ? { operationHash } : {}),
  };
}
function identity(): TrustedProjectIdentity {
  return Object.freeze({
    schema: 'TrustedProjectIdentity/v1',
    source: 'authenticated-context',
    principal: 'principal-1',
    role: 'developer-orchestrator',
    tenant: project.repository_id,
    project: projectBinding.project_id,
    registry_hash: project.registry_hash,
  });
}
function identityWithChanges(changes: Readonly<Record<string, unknown>>): unknown {
  const value = { ...identity() };
  for (const [key, replacement] of Object.entries(changes))
    Object.defineProperty(value, key, { configurable: true, enumerable: true, value: replacement });
  return value;
}
function invokeUntrusted(
  target: (...args: never[]) => unknown,
  ...invocation: [readonly unknown[]] | [unknown, readonly unknown[]]
): unknown {
  const [receiver, args] = invocation.length === 1 ? [undefined, invocation[0]] : invocation;
  return Reflect.apply(target, receiver, args);
}
test('Cedar capabilities fail closed on malformed boundaries', () => {
  expect(expectReturned(() => validateCedarPolicySet('permit(principal, action, resource);'))).toEqual({
    valid: true,
    diagnostics: [],
  });
  expect(() => invokeUntrusted(requireAbsoluteRepositoryRoot, [null])).toThrow(/absolute/);
  expect(() => validateResolvedPathProfile(null, repositoryRoot)).toThrow(/issued/);
  const invalidCedar = expectReturned(() => validateCedarPolicySet('not cedar'));
  expect(invalidCedar).toMatchObject({ valid: false });
  expect(Array.isArray(invalidCedar.diagnostics)).toBe(true);
  expect(typeof invalidCedar.diagnostics[0]).toBe('string');
  expect(invalidCedar.diagnostics[0]).toMatch(/parse|token|input/i);
  const authorize = expectReturned(() => createConfiguredProjectAuthorizer(repositoryRoot, config));
  expect(typeof authorize).toBe('function');
  const invalidSchemaResult = authorizeProject(
    authorizationRequest('a'.repeat(64)),
    identity(),
    project,
    repositoryRoot,
    config.authorization.cedar.policy,
    'invalid schema',
  );
  expect(invalidSchemaResult).toMatchObject({ decision: 'deny' });
  expect(Array.isArray(invalidSchemaResult.diagnostics)).toBe(true);
  expect(invalidSchemaResult.diagnostics.length).toBeGreaterThan(0);
  const invalidPolicyResult = authorizeProject(
    authorizationRequest('a'.repeat(64)),
    identity(),
    project,
    repositoryRoot,
    'not cedar',
    config.authorization.cedar.schema_text,
  );
  expect(invalidPolicyResult).toMatchObject({ decision: 'deny' });
  expect(Array.isArray(invalidPolicyResult.diagnostics)).toBe(true);
  expect(invalidPolicyResult.diagnostics.length).toBeGreaterThan(0);
  expect(typeof invalidPolicyResult.diagnostics[0]).toBe('string');
  expect(invalidPolicyResult.diagnostics[0]).toMatch(/parse|token|input/i);
  expect(authorize(authorizationRequest('a'.repeat(64)), identity(), project)).toMatchObject({ decision: 'allow' });
  const validAuthorization = authorizationRequest('a'.repeat(64));
  const validIdentity = identity();
  const allowed = authorizeProject(
    validAuthorization,
    validIdentity,
    project,
    repositoryRoot,
    config.authorization.cedar.policy,
    config.authorization.cedar.schema_text,
  );
  expect(allowed).toMatchObject({ decision: 'allow', diagnostics: ['policy1'] });
  const decisionId = allowed.receipt?.decision_id;
  const authorizationDigest = expectReturned(() => canonicalJsonDigest(validAuthorization));
  expect(authorizationDigest).toMatch(/^[a-f0-9]{64}$/);
  const expectedDecisionId = 'cedar-' + authorizationDigest.slice(0, 24);
  expect(allowed.receipt).toMatchObject({
    schema: 'AuthorizationReceipt/v1',
    source: 'cedar',
    decision: 'allow',
    operation_hash: validAuthorization.operationHash,
  });
  expect(required(allowed.receipt, 'authorization receipt').decision_id).toMatch(/^cedar-[a-f0-9]{24}$/);
  expect(decisionId).toBe(expectedDecisionId);
  expect(
    authorizeProject(
      validAuthorization,
      validIdentity,
      { ...project },
      repositoryRoot,
      config.authorization.cedar.policy,
      config.authorization.cedar.schema_text,
    ),
  ).toEqual({
    decision: 'deny',
    diagnostics: ['GAP-RTNEW-PATH-PROFILE-001: project context must be issued by loadProjectSetContext'],
  });
  const { operationHash: _ignoredOperationHash, ...readAuthorization } = { ...validAuthorization, action: 'read' };
  const readAllowed = authorizeProject(
    readAuthorization,
    validIdentity,
    project,
    repositoryRoot,
    config.authorization.cedar.policy,
    config.authorization.cedar.schema_text,
  );
  expect(readAllowed).toMatchObject({ decision: 'allow', diagnostics: ['policy0'] });
  expect(readAllowed).not.toHaveProperty('receipt');
  const { operationHash: _ignoredWriteHash, ...writeWithoutHash } = validAuthorization;
  expect(
    authorizeProject(
      writeWithoutHash,
      validIdentity,
      project,
      repositoryRoot,
      config.authorization.cedar.policy,
      config.authorization.cedar.schema_text,
    ),
  ).toEqual({
    decision: 'deny',
    diagnostics: ['authorization claims do not satisfy the configured project boundary'],
  });
  const viewerAuthorization = { ...validAuthorization, role: 'viewer' };
  expect(
    invokeUntrusted(authorizeProject, [
      viewerAuthorization,
      identityWithChanges({ role: 'viewer' }),
      project,
      repositoryRoot,
      config.authorization.cedar.policy,
      config.authorization.cedar.schema_text,
    ]),
  ).toEqual({ decision: 'deny', diagnostics: [] });
  const identityFieldChanges: readonly (readonly [string, string])[] = [
    ['schema', 'TrustedProjectIdentity/v2'],
    ['source', 'untrusted-context'],
  ];
  for (const [field, value] of identityFieldChanges) {
    expect(
      invokeUntrusted(authorizeProject, [
        validAuthorization,
        identityWithChanges({ [field]: value }),
        project,
        repositoryRoot,
        config.authorization.cedar.policy,
        config.authorization.cedar.schema_text,
      ]),
    ).toEqual({
      decision: 'deny',
      diagnostics: ['authorization claims do not satisfy the configured project boundary'],
    });
  }
  for (const field of ['principal', 'role', 'tenant', 'project']) {
    expect(
      invokeUntrusted(authorizeProject, [
        validAuthorization,
        identityWithChanges({ [field]: 'other-value' }),
        project,
        repositoryRoot,
        config.authorization.cedar.policy,
        config.authorization.cedar.schema_text,
      ]),
    ).toEqual({
      decision: 'deny',
      diagnostics: ['authorization claims do not satisfy the configured project boundary'],
    });
  }
  for (const requestChange of [
    { tenant: 'other-tenant', resourceTenant: 'other-tenant' },
    { project: 'other-project', resourceProject: 'other-project' },
    { resourceTenant: 'other-tenant' },
    { resourceProject: 'other-project' },
    { registryHash: 'b'.repeat(64) },
  ]) {
    expect(
      authorizeProject(
        { ...validAuthorization, ...requestChange },
        validIdentity,
        project,
        repositoryRoot,
        config.authorization.cedar.policy,
        config.authorization.cedar.schema_text,
      ),
    ).toEqual({
      decision: 'deny',
      diagnostics: ['authorization claims do not satisfy the configured project boundary'],
    });
  }
  expect(
    invokeUntrusted(authorizeProject, [
      validAuthorization,
      identityWithChanges({ registry_hash: 'b'.repeat(64) }),
      project,
      repositoryRoot,
      config.authorization.cedar.policy,
      config.authorization.cedar.schema_text,
    ]),
  ).toEqual({
    decision: 'deny',
    diagnostics: ['authorization claims do not satisfy the configured project boundary'],
  });
  const authorizationChanges: readonly (readonly [
    Readonly<Record<string, unknown>>,
    Readonly<Record<string, unknown>>,
  ])[] = [
    [{ tenant: 'other-tenant' }, { tenant: 'other-tenant' }],
    [{ project: 'other-project' }, { project: 'other-project' }],
    [{ resourceTenant: 'other-tenant' }, {}],
    [{ resourceProject: 'other-project' }, {}],
    [{ registryHash: 'b'.repeat(64) }, {}],
    [{}, { registry_hash: 'b'.repeat(64) }],
  ];
  for (const [requestChange, identityChange] of authorizationChanges) {
    expect(
      invokeUntrusted(authorizeProject, [
        { ...validAuthorization, ...requestChange },
        identityWithChanges(identityChange),
        project,
        repositoryRoot,
        config.authorization.cedar.policy,
        config.authorization.cedar.schema_text,
      ]),
    ).toEqual({
      decision: 'deny',
      diagnostics: ['authorization claims do not satisfy the configured project boundary'],
    });
  }
  expect(authorize({}, identity(), project)).toMatchObject({ decision: 'deny' });
  expect(authorize(validAuthorization, undefined, project)).toEqual({
    decision: 'deny',
    diagnostics: ['authorization claims do not satisfy the configured project boundary'],
  });
  expect(authorize(validAuthorization, validIdentity, undefined)).toEqual({
    decision: 'deny',
    diagnostics: ['authorization claims do not satisfy the configured project boundary'],
  });
  expect(authorize(authorizationRequest('a'.repeat(64)), identity(), undefined)).toEqual({
    decision: 'deny',
    diagnostics: ['authorization claims do not satisfy the configured project boundary'],
  });
  expect(() =>
    createConfiguredProjectAuthorizer(repositoryRoot, {
      ...config,
      authorization: { ...config.authorization, cedar: { ...config.authorization.cedar, policy: 'not cedar' } },
    }),
  ).toThrow('runtime config must come from loadRuntimeConfig');
  expect(() => createConfiguredProjectAuthorizer(path.resolve(repositoryRoot, 'agent-runtime-new'), config)).toThrow(
    'runtime config is not bound to the repository root',
  );
});

test('Cedar membership independently bounds both projects in an authentic multi-project context', () => {
  const projectIds = config.projects.map((entry) => entry.project_id);
  expect(projectIds.length).toBeGreaterThan(1);
  const context = loadProjectSetContext(repositoryRoot, config, project.repository_id, projectIds);
  const permissivePolicy = 'permit(principal, action, resource);';
  const request = authorizationRequest('a'.repeat(64));
  const authorize = (requestChange: Partial<ProjectAuthorizationRequest>) => {
    const changed = { ...request, ...requestChange };
    return authorizeProject(
      changed,
      { ...identity(), tenant: changed.tenant, project: changed.project },
      context,
      repositoryRoot,
      permissivePolicy,
      config.authorization.cedar.schema_text,
    );
  };
  // Every selected principal/resource pair is valid; another selected binding must not cause denial.
  for (const principalProject of projectIds)
    for (const resourceProject of projectIds) {
      const result = authorize({ project: principalProject, resourceProject });
      expect(result).toMatchObject({ decision: 'allow', receipt: { operation_hash: request.operationHash } });
    }
  // Matching trusted identity and permissive policy cannot waive either configured membership boundary.
  for (const change of [{ project: 'outside-selected-projects' }, { resourceProject: 'outside-selected-projects' }])
    expect(authorize(change)).toEqual({
      decision: 'deny',
      diagnostics: ['authorization claims do not satisfy the configured project boundary'],
    });
});
