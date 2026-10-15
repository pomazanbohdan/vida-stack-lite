import { rejectionReason } from './helpers/expect-rejection.ts';
import { describe, expect, spyOn, test } from 'bun:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import {
  assertCanonicalJsonValue,
  buildGovernedWriteRequest,
  computeWriteOperationHash,
  resolveAgentRoleProfile,
  resolvePathProfile,
  resolveProviderWorkItemKind,
  runtimeConfigDigest,
  selectWorkflow,
  validateCandidateIsolation,
  validateWorkflowConfiguration,
  validateProjectContext,
  validateResolvedPathProfile,
  validateRuntimeConfig,
} from '../src/index.ts';
import { configuredTestContext } from './configured-context.ts';
import {
  canonicalJson,
  canonicalJsonDigest,
  computeGovernedWriteRequestDigest,
  freezeJsonValue,
  isPlainRecord,
  isStrictRfc3339Timestamp,
  rfc3339TimestampMilliseconds,
  toAuthorizationReceipt,
  type AuthorizationReceipt,
  type GovernedWriteIntent,
  type ProjectAuthorizationRequest,
  type TrustedProjectIdentity,
  type VerifiedApprovalEvidence,
  validateAuthorizationRequest,
  validateGovernedWriteRequest,
} from '../src/contracts/public-ingress.ts';
import {
  consumeRuntimeEnvelope,
  localToolEnvelope,
  validateRuntimeEnvelope,
  type RuntimeEnvelope,
} from '../src/contracts/envelopes.ts';
import {
  authorizeProject,
  createConfiguredProjectAuthorizer,
  validateCedarPolicySet,
} from '../src/authorization/cedar-boundary.ts';
import { defaultRuntimeClock, type RuntimeTimingEvent } from '../src/runtime-timing.ts';
import { createRuntimeKernel, createRuntimeKernelHost } from '../src/runtime-kernel.ts';
import type { RuntimeKernelHostBindings } from '../src/runtime-kernel.ts';
import { nativeNoFollowAvailable } from '../src/config/host-capability.ts';

import { createConfiguredMastra, sanitizeDiagnostic } from '../src/orchestration/mastra-boundary.ts';
import { requireAbsoluteRepositoryRoot } from '../src/config/project-context.ts';
import { validateConfiguredRepositoryAccess } from '../src/config/runtime-config.ts';

const packageRoot = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const { repositoryRoot, config, context: project } = configuredTestContext();
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

function recordProperty(value: unknown, key: string): Record<string, unknown> {
  if (!isPlainRecord(value)) throw new Error(`Expected a schema object at ${key}.`);
  const property = value[key];
  if (!isPlainRecord(property)) throw new Error(`Expected a schema object at ${key}.`);
  return property;
}

function invokeUntrusted(
  target: (...args: never[]) => unknown,
  ...invocation: [readonly unknown[]] | [unknown, readonly unknown[]]
): unknown {
  const [receiver, args] = invocation.length === 1 ? [undefined, invocation[0]] : invocation;
  const result: unknown = Reflect.apply(target, receiver, args);
  return result;
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

function governedEvidence(): {
  approval: VerifiedApprovalEvidence;
  intent: GovernedWriteIntent;
  operationHash: string;
  receipt: AuthorizationReceipt;
} {
  const payload = { path: 'agent-runtime-new/example.txt', value: 'updated' };
  const operation = 'repository.write';
  const operationHash = computeWriteOperationHash({
    operation,
    payload,
    principal: 'principal-1',
    role: 'developer-orchestrator',
    tenant: project.repository_id,
    project: projectBinding.project_id,
    resourceTenant: project.repository_id,
    resourceProject: projectBinding.project_id,
    registryHash: project.registry_hash,
  });
  const approvedAt = new Date(Date.now() - 1_000).toISOString();
  const expiresAt = new Date(Date.now() + 60_000).toISOString();
  const intent: GovernedWriteIntent = {
    operation,
    payload,
    authorization: authorizationRequest(),
    approval: {
      decision: 'approved',
      decision_id: 'approval-1',
      approver: 'operator-1',
      tenant: project.repository_id,
      project: projectBinding.project_id,
      operation_hash: operationHash,
      approved_at: approvedAt,
      expires_at: expiresAt,
    },
  };
  const receipt = toAuthorizationReceipt(authorizationRequest(operationHash), 'decision-1', approvedAt);
  if (!receipt) throw new Error('Expected write authorization to produce a receipt.');
  const approval: VerifiedApprovalEvidence = {
    ...intent.approval,
    verified: true,
    issuer: 'test-authority',
    verification_id: 'verification-1',
    verified_at: approvedAt,
  };
  return { approval, intent, operationHash, receipt };
}

describe('direct maintained-source completeness', () => {
  test('canonical JSON rejects hostile descriptors and preserves deterministic data', () => {
    expect(isPlainRecord({})).toBe(true);
    expect(isPlainRecord(Object.create(null))).toBe(true);
    expect(isPlainRecord(null)).toBe(false);
    expect(isPlainRecord([])).toBe(false);
    expect(isPlainRecord(new Date())).toBe(false);
    expect(isPlainRecord('record')).toBe(false);
    for (const value of [null, true, 1, 'text', { nested: [false] }])
      expect(() => assertCanonicalJsonValue(value)).not.toThrow();
    expect(() => assertCanonicalJsonValue(new Date(0))).toThrow(/non-canonical JSON object/);
    expect(() => canonicalJson(new Date(0))).toThrow(/non-canonical JSON object/);
    expect(canonicalJson({ z: 1, a: [true, null, 'x'] })).toBe('{"a":[true,null,"x"],"z":1}');
    expect(canonicalJsonDigest({ a: 1 })).toMatch(/^[a-f0-9]{64}$/);
    expect(canonicalJson({ nested: { b: 2, a: 1 }, items: [3, 2, 1] })).toBe(
      '{"items":[3,2,1],"nested":{"a":1,"b":2}}',
    );
    for (const value of [undefined, 1n, Symbol('x'), () => true, Number.NaN, Infinity, -0]) {
      expect(() => assertCanonicalJsonValue(value)).toThrow();
      expect(() => canonicalJson(value)).toThrow();
    }
    expect(() => canonicalJson('\ud800')).toThrow();
    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;
    expect(() => assertCanonicalJsonValue(cycle)).toThrow(/cyclic/);
    const sparse: unknown[] = [];
    sparse[1] = true;
    expect(() => assertCanonicalJsonValue(sparse)).toThrow();
    const nonCanonicalIndex = [true];
    Object.defineProperty(nonCanonicalIndex, '01', { value: true, enumerable: true });
    expect(() => assertCanonicalJsonValue(nonCanonicalIndex)).toThrow(/array/);
    const nonEnumerableIndex = [true];
    Object.defineProperty(nonEnumerableIndex, '0', { value: true, enumerable: false });
    expect(() => assertCanonicalJsonValue(nonEnumerableIndex)).toThrow(/descriptor/);
    const accessor: Record<string, unknown> = {};
    Object.defineProperty(accessor, 'x', { enumerable: true, get: () => 1 });
    expect(() => assertCanonicalJsonValue(accessor)).toThrow(/descriptor/);
    const inheritedHook = Object.getOwnPropertyDescriptor(Object.prototype, 'toJSON');
    try {
      Object.defineProperty(Object.prototype, 'toJSON', { configurable: true, value: () => ({ a: 2 }) });
      expect(() => canonicalJson({ a: 1 })).toThrow(/serialization hook/);
    } finally {
      if (inheritedHook) Object.defineProperty(Object.prototype, 'toJSON', inheritedHook);
      else Reflect.deleteProperty(Object.prototype, 'toJSON');
    }
    const arrayWithInheritedHook = [1];
    const arrayPrototype: object = {};
    Object.setPrototypeOf(arrayPrototype, Array.prototype);
    Object.defineProperty(arrayPrototype, 'toJSON', { configurable: true, value: () => ({ pwned: true }) });
    Object.setPrototypeOf(arrayWithInheritedHook, arrayPrototype);
    expect(() => canonicalJson(arrayWithInheritedHook)).toThrow(/non-canonical array prototype/);
    const hidden: Record<string, unknown> = {};
    Object.defineProperty(hidden, 'x', { value: 1, enumerable: false });
    expect(() => assertCanonicalJsonValue(hidden)).toThrow();
    const symbol: Record<PropertyKey, unknown> = { a: 1 };
    symbol[Symbol('x')] = 2;
    expect(() => assertCanonicalJsonValue(symbol)).toThrow();
    expect(() => assertCanonicalJsonValue('x', '$', new WeakSet(), 0, { nodes: 10_000, bytes: 0 })).toThrow(/node/);
    expect(() => assertCanonicalJsonValue('x', '$', new WeakSet(), 65, { nodes: 0, bytes: 0 })).toThrow(/depth/);
    expect(() =>
      assertCanonicalJsonValue('x', '$', new WeakSet(), 0, { nodes: 0, bytes: 8_388_608 - 1 }),
    ).not.toThrow();
    expect(() => assertCanonicalJsonValue('x', '$', new WeakSet(), 0, { nodes: 0, bytes: 8_388_608 })).toThrow(/byte/);
    const frozenCycle: Record<string, unknown> = {};
    frozenCycle.self = frozenCycle;
    expect(freezeJsonValue(frozenCycle)).toBe(frozenCycle);
    expect(Object.isFrozen(frozenCycle)).toBe(true);
    const frozen = freezeJsonValue({ nested: [{ value: 1 }] });
    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen.nested)).toBe(true);
    expect(Object.isFrozen(frozen.nested[0])).toBe(true);
    expect(freezeJsonValue(1)).toBe(1);
    expect(freezeJsonValue(null)).toBeNull();
    let getterCalls = 0;
    const frozenAccessor = Object.defineProperty({}, 'value', {
      enumerable: true,
      get() {
        getterCalls++;
        return { value: 1 };
      },
    });
    expect(freezeJsonValue(frozenAccessor)).toBe(frozenAccessor);
    expect(Object.isFrozen(frozenAccessor)).toBe(true);
    expect(getterCalls).toBe(0);
    expect(isStrictRfc3339Timestamp('2026-08-30T10:00:00Z')).toBe(true);
    expect(isStrictRfc3339Timestamp('2026-08-30T10:00:00.12Z')).toBe(true);
    expect(isStrictRfc3339Timestamp('2026-08-30T10:00:00+00:00')).toBe(true);
    expect(isStrictRfc3339Timestamp('2024-02-29T10:00:00Z')).toBe(true);
    expect(isStrictRfc3339Timestamp('2016-12-31T23:59:60Z')).toBe(true);
    expect(isStrictRfc3339Timestamp('2024-01-01T00:00:60Z')).toBe(false);
    expect(isStrictRfc3339Timestamp('2024-01-01T23:59:60Z')).toBe(false);
    expect(isStrictRfc3339Timestamp('2016-12-31T23:59:60+00:00')).toBe(true);
    expect(isStrictRfc3339Timestamp('2016-12-31T23:59:60+01:00')).toBe(false);
    expect(isStrictRfc3339Timestamp('2026-08-30T10:00:00.1234567890Z')).toBe(false);
    expect(isStrictRfc3339Timestamp('2026-02-29T10:00:00Z')).toBe(false);
    expect(isStrictRfc3339Timestamp('2026-02-31T10:00:00Z')).toBe(false);
    expect(isStrictRfc3339Timestamp('2026-04-31T10:00:00Z')).toBe(false);
    expect(isStrictRfc3339Timestamp('2026-13-30T10:00:00Z')).toBe(false);
    expect(isStrictRfc3339Timestamp('2026-08-30T24:00:00Z')).toBe(false);
    expect(isStrictRfc3339Timestamp('2026-08-30T10:00:00+24:00')).toBe(false);
    expect(isStrictRfc3339Timestamp('x2026-08-30T10:00:00Z')).toBe(false);
    expect(isStrictRfc3339Timestamp('2026-08-30T10:00:00Zx')).toBe(false);
    expect(isStrictRfc3339Timestamp(null)).toBe(false);
  });

  test('timestamp parsing rejects trailing line terminators', () => {
    const timestamp = '2026-10-15T00:00:00Z';
    expect(rfc3339TimestampMilliseconds(timestamp)).toBe(Date.UTC(2026, 9, 15));
    for (const suffix of ['\n', '\r', '\r\n', '\u2028', '\u2029']) {
      const input = timestamp + suffix;
      expect(rfc3339TimestampMilliseconds(input)).toBeNull();
      expect(isStrictRfc3339Timestamp(input)).toBe(false);
    }
  });

  test('timestamp parsing fails closed when the native parser returns a non-finite time', () => {
    const timestamp = '2026-10-15T00:00:00Z';
    const expected = Date.UTC(2026, 9, 15);
    expect(rfc3339TimestampMilliseconds(timestamp)).toBe(expected);
    const parse = spyOn(Date, 'parse').mockReturnValue(NaN);
    try {
      expect(rfc3339TimestampMilliseconds(timestamp)).toBeNull();
      expect(isStrictRfc3339Timestamp(timestamp)).toBe(false);
      expect(parse.mock.calls).toEqual([[timestamp], [timestamp]]);
    } finally {
      parse.mockRestore();
    }
    expect(rfc3339TimestampMilliseconds(timestamp)).toBe(expected);
  });

  test('governed write schemas match the maintained RFC3339 timestamp parser', () => {
    const schema: unknown = JSON.parse(
      readFileSync(path.join(packageRoot, 'schemas/governed-write.v1.schema.json'), 'utf8'),
    );
    const timestampSchemas = [
      recordProperty(recordProperty(recordProperty(schema, 'properties'), 'authorization'), 'properties').issued_at,
      recordProperty(recordProperty(recordProperty(schema, 'properties'), 'approval'), 'properties').approved_at,
      recordProperty(recordProperty(recordProperty(schema, 'properties'), 'approval'), 'properties').expires_at,
      recordProperty(recordProperty(recordProperty(schema, 'properties'), 'approval'), 'properties').verified_at,
    ];
    const values = [
      '2000-02-29T00:00:00Z',
      '1900-02-29T00:00:00Z',
      '2016-12-31T23:59:60Z',
      '2016-12-31T23:59:60+01:00',
    ];
    for (const timestampSchema of timestampSchemas) {
      if (!isPlainRecord(timestampSchema) || typeof timestampSchema.pattern !== 'string')
        throw new Error('Governed write timestamp schema pattern is missing.');
      const pattern = new RegExp(timestampSchema.pattern);
      for (const value of values) {
        expect(pattern.test(value)).toBe(isStrictRfc3339Timestamp(value));
      }
    }
  });

  test('canonical JSON rejects inherited serialization hooks without invoking accessors', () => {
    const original = Object.getOwnPropertyDescriptor(Object.prototype, 'toJSON');
    let invoked = false;
    try {
      Object.defineProperty(Object.prototype, 'toJSON', {
        configurable: true,
        get() {
          invoked = true;
          return () => 'attacker-controlled';
        },
      });
      expect(() => canonicalJson({ safe: 1 })).toThrow(/serialization hook/);
      expect(() => canonicalJsonDigest({ safe: 1 })).toThrow(/serialization hook/);
      expect(invoked).toBe(false);
    } finally {
      if (original === undefined) Reflect.deleteProperty(Object.prototype, 'toJSON');
      else Object.defineProperty(Object.prototype, 'toJSON', original);
    }
  });

  test('envelopes validate JSON data, revision bindings, and local tool inputs', () => {
    const envelope: RuntimeEnvelope<unknown> = {
      schema: 'RuntimeEnvelope/v1',
      kind: 'quality-check',
      operation: 'runtime.read',
      sourceRevision: 'source-1',
      expectedRevision: 1,
      payload: { value: true },
    };
    expect(validateRuntimeEnvelope(envelope)).toBe(envelope);
    expect(consumeRuntimeEnvelope(envelope, { sourceRevision: 'source-1', currentRevision: 1 })).toBe(envelope);
    expect(() => validateRuntimeEnvelope({ ...envelope, payload: 1n })).toThrow(/non-canonical/);
    expect(() => validateRuntimeEnvelope({ ...envelope, kind: '', operation: '' })).toThrow(
      'runtime envelope rejected: must NOT have fewer than 1 characters; must match pattern "^[A-Za-z][A-Za-z0-9._/-]*$"; must NOT have fewer than 1 characters; must match pattern "^[A-Za-z][A-Za-z0-9._:/-]*$"',
    );
    expect(() =>
      invokeUntrusted(consumeRuntimeEnvelope, [envelope, { sourceRevision: 1, currentRevision: 1 }]),
    ).toThrow('runtime envelope source revision binding is required');
    expect(() => invokeUntrusted(consumeRuntimeEnvelope, [envelope, undefined])).toThrow(
      'runtime envelope source revision binding is required',
    );
    expect(() => invokeUntrusted(consumeRuntimeEnvelope, [envelope, { currentRevision: 1 }])).toThrow(
      'runtime envelope source revision binding is required',
    );
    expect(() => consumeRuntimeEnvelope(envelope, { sourceRevision: '', currentRevision: 1 })).toThrow(
      'runtime envelope source revision binding is required',
    );
    expect(() => consumeRuntimeEnvelope(envelope, { sourceRevision: 'source-1', currentRevision: 0 })).toThrow(
      'runtime envelope current revision binding is invalid',
    );
    expect(() => consumeRuntimeEnvelope(envelope, { sourceRevision: 'source-1', currentRevision: 2 })).toThrow(
      'runtime envelope expected revision is stale',
    );
    expect(
      localToolEnvelope.parse({ tool: 'source.read', tenant: 'tenant', project: 'project', input: {} }),
    ).toStrictEqual({
      tool: 'source.read',
      tenant: 'tenant',
      project: 'project',
      input: {},
    });
    expect(localToolEnvelope.safeParse({ tool: '', tenant: 'tenant', project: 'project', input: {} }).success).toBe(
      false,
    );
    expect(
      localToolEnvelope.safeParse({ tool: 'source.read', tenant: 'tenant', project: 'project', input: {}, extra: true })
        .success,
    ).toBe(false);
  });

  test('governed write builders bind and validate all evidence', () => {
    const { approval, intent, operationHash, receipt } = governedEvidence();
    expect(receipt.operation_hash).toBe(operationHash);
    const request = buildGovernedWriteRequest(intent, receipt, approval);
    const unchangedAuthorization: Partial<typeof request.authorization> = {};
    const unchangedApproval: Partial<typeof request.approval> = {};
    expect(validateGovernedWriteRequest(request)).toBe(request);
    expect(computeGovernedWriteRequestDigest(request)).toMatch(/^[a-f0-9]{64}$/);
    expect(() => validateGovernedWriteRequest({})).toThrow(
      "governed write request rejected:  must have required property 'operation';  must have required property 'payload';  must have required property 'authorization';  must have required property 'approval'",
    );
    expect(() => validateAuthorizationRequest({})).toThrow(
      "authorization request rejected:  must have required property 'principal';  must have required property 'role';  must have required property 'action';  must have required property 'tenant';  must have required property 'project';  must have required property 'resourceTenant';  must have required property 'resourceProject';  must have required property 'registryHash'",
    );
    expect(() => validateGovernedWriteRequest({ ...request, payload: 1n })).toThrow(/non-canonical/);
    const directReceipt = toAuthorizationReceipt(
      authorizationRequest(operationHash),
      'decision-1',
      approval.approved_at,
    );
    expect(directReceipt).toMatchObject({
      schema: 'AuthorizationReceipt/v1',
      source: 'cedar',
      decision: 'allow',
      decision_id: 'decision-1',
      principal: 'principal-1',
      role: 'developer-orchestrator',
      action: 'write',
      tenant: project.repository_id,
      project: projectBinding.project_id,
      resourceTenant: project.repository_id,
      resourceProject: projectBinding.project_id,
      registry_hash: project.registry_hash,
      operation_hash: operationHash,
      issued_at: approval.approved_at,
    });
    expect(toAuthorizationReceipt(authorizationRequest(), 'read-decision', new Date().toISOString())).toBeUndefined();
    for (const field of [
      'principal',
      'role',
      'action',
      'tenant',
      'project',
      'resourceTenant',
      'resourceProject',
      'registryHash',
    ]) {
      expect(() =>
        buildGovernedWriteRequest(
          intent,
          { ...receipt, [field === 'registryHash' ? 'registry_hash' : field]: 'other-value' },
          approval,
        ),
      ).toThrow(/authorization receipt/);
    }
    for (const field of [
      'decision',
      'decision_id',
      'approver',
      'tenant',
      'project',
      'operation_hash',
      'approved_at',
      'expires_at',
    ]) {
      expect(() =>
        buildGovernedWriteRequest(intent, receipt, {
          ...approval,
          [field]: field === 'decision' ? 'rejected' : 'other-value',
        }),
      ).toThrow(/approval evidence/);
    }
    const rebased = (
      authorizationChanges: Partial<typeof request.authorization>,
      approvalChanges: Partial<typeof request.approval>,
    ) => {
      const authorization = { ...request.authorization, ...authorizationChanges };
      const nextHash = computeWriteOperationHash({
        operation: request.operation,
        payload: request.payload,
        principal: authorization.principal,
        role: authorization.role,
        tenant: authorization.tenant,
        project: authorization.project,
        resourceTenant: authorization.resourceTenant,
        resourceProject: authorization.resourceProject,
        registryHash: authorization.registry_hash,
      });
      return {
        ...request,
        authorization: { ...authorization, operation_hash: nextHash },
        approval: { ...request.approval, ...approvalChanges, operation_hash: nextHash },
      };
    };
    expect(() =>
      validateGovernedWriteRequest({
        ...request,
        authorization: { ...request.authorization, operation_hash: 'b'.repeat(64) },
      }),
    ).toThrow('authorization and approval are not bound to this operation');
    expect(() =>
      validateGovernedWriteRequest({ ...request, approval: { ...request.approval, operation_hash: 'b'.repeat(64) } }),
    ).toThrow('authorization and approval are not bound to this operation');
    for (const changes of [{ resourceTenant: 'other-tenant' }, { resourceProject: 'other-project' }])
      expect(() => validateGovernedWriteRequest(rebased(changes, unchangedApproval))).toThrow(
        'authorization resource is outside the principal tenant/project scope',
      );
    expect(() => validateGovernedWriteRequest(rebased({ registry_hash: 'B'.repeat(64) }, unchangedApproval))).toThrow(
      /registry_hash/,
    );
    for (const changes of [{ tenant: 'other-tenant' }, { project: 'other-project' }])
      expect(() => validateGovernedWriteRequest(rebased({}, changes))).toThrow(
        'approval scope does not match authorization scope',
      );
    const now = Date.now();
    const timeRequest = (
      authorizationChanges: Partial<typeof request.authorization>,
      approvalChanges: Partial<typeof request.approval>,
    ) => ({
      ...request,
      authorization: { ...request.authorization, ...authorizationChanges },
      approval: { ...request.approval, ...approvalChanges },
    });
    expect(() =>
      validateGovernedWriteRequest(
        timeRequest({ issued_at: new Date(now + 120_000).toISOString() }, unchangedApproval),
      ),
    ).toThrow('governed write evidence is from the future');
    expect(() =>
      validateGovernedWriteRequest(
        timeRequest(
          {},
          { approved_at: new Date(now + 120_000).toISOString(), expires_at: new Date(now + 240_000).toISOString() },
        ),
      ),
    ).toThrow('governed write evidence is from the future');
    expect(() =>
      validateGovernedWriteRequest(
        timeRequest(
          { issued_at: new Date(now - 1_000).toISOString() },
          { approved_at: new Date(now - 2_000).toISOString(), expires_at: new Date(now + 60_000).toISOString() },
        ),
      ),
    ).toThrow('approval evidence predates authorization receipt');
    expect(() =>
      validateGovernedWriteRequest(
        timeRequest(
          { issued_at: new Date(now - 400_000).toISOString() },
          { approved_at: new Date(now - 399_000).toISOString(), expires_at: new Date(now + 60_000).toISOString() },
        ),
      ),
    ).toThrow('governed write evidence is stale');
    expect(() =>
      validateGovernedWriteRequest(
        timeRequest(
          { issued_at: new Date(now - 2_000).toISOString() },
          { approved_at: new Date(now - 1_000).toISOString(), expires_at: new Date(now - 1).toISOString() },
        ),
      ),
    ).toThrow('approval evidence is expired');
    expect(() =>
      validateGovernedWriteRequest(
        timeRequest(
          { issued_at: new Date(now - 2_000).toISOString() },
          { approved_at: new Date(now + 1_000).toISOString(), expires_at: new Date(now + 500).toISOString() },
        ),
      ),
    ).toThrow('approval evidence is expired');
    expect(() =>
      validateGovernedWriteRequest({ ...request, approval: { ...approval, expires_at: approval.approved_at } }),
    ).toThrow();
    expect(() =>
      validateGovernedWriteRequest(timeRequest(unchangedAuthorization, { verified_at: '2023-02-29T00:00:00Z' })),
    ).toThrow(/governed write (request rejected|evidence timestamps invalid)/);
  });

  test('configuration and project selectors cover valid and invalid interfaces', () => {
    expect(runtimeConfigDigest(validateRuntimeConfig(config, repositoryRoot))).toBe(runtimeConfigDigest(config));
    expect(resolveAgentRoleProfile(repositoryRoot, 'executor').model).toBeTypeOf('string');
    expect(() => resolveAgentRoleProfile(repositoryRoot, 'missing')).toThrow(/not registered/);
    expect(resolveProviderWorkItemKind(config, 'azure', 'Epic')).toBe('epic');
    expect(() => resolveProviderWorkItemKind(config, 'missing', 'missing')).toThrow(/not registered/);
    expect(validateRuntimeConfig(config).schema).toBe('AgentRuntimeConfig/v1');
    const optionalContours = structuredClone(config);
    const firstProject = optionalContours.projects[0];
    const defaultTeam = optionalContours.teams['default-development'];
    if (!firstProject || !defaultTeam) throw new Error('Expected default configuration entries.');
    Object.defineProperty(firstProject, 'path_overrides', {
      value: { work_root: 'agent-runtime-new' },
      enumerable: true,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(defaultTeam, 'stage_overrides', {
      value: { develop_fix: 'executor' },
      enumerable: true,
      configurable: true,
      writable: true,
    });
    expect(validateRuntimeConfig(optionalContours).schema).toBe('AgentRuntimeConfig/v1');
    const forged = {
      ...config,
      workflow_bindings: config.workflow_bindings.map((binding) => ({ ...binding, priority: binding.priority - 100 })),
    };
    expect(() =>
      selectWorkflow(forged, {
        team: 'default-development',
        kind: 'bug',
        intent: 'bug_fix',
        project: projectBinding.project_id,
        risk_flags: ['security'],
        labels: [],
      }),
    ).toThrow(/loadRuntimeConfig/);
    expect(() =>
      selectWorkflow(config, {
        team: 'missing',
        kind: 'task',
        intent: 'task_execution',
        project: projectBinding.project_id,
        risk_flags: [],
        labels: [],
      }),
    ).toThrow();
    expect(() => validateCandidateIsolation({ ...config, runtime: { ...config.runtime, bundle: 'other' } })).toThrow();
    for (const rootKey of ['schema_root', 'instruction_root', 'tooling_root']) {
      expect(() =>
        validateCandidateIsolation({ ...config, runtime: { ...config.runtime, [rootKey]: 'agent-runtime' } }),
      ).toThrow(/GAP-RTNEW-ISOLATION/);
    }
    const malformedWorkflow = structuredClone(config);
    Object.defineProperty(malformedWorkflow.agents.role_instructions, 'fake', {
      configurable: true,
      enumerable: true,
      value: {
        description: 'fake',
        consumes: ['DevelopmentTaskPacket/v1'],
        produces: ['ImplementationResult/v1'],
        rules: ['fake'],
      },
    });
    const implementationWorkflow = required(
      malformedWorkflow.workflows.implementation_new,
      'implementation_new workflow',
    );
    Object.defineProperty(implementationWorkflow, 'stages', {
      value: implementationWorkflow.stages.map((stage) =>
        stage.kind === 'develop' ? { ...stage, assignments: [{ ...stage.assignments[0], role: 'fake' }] } : stage,
      ),
    });
    expect(() => validateWorkflowConfiguration(malformedWorkflow)).toThrow(/developer-orchestrator/);
    const duplicateDeveloper = structuredClone(config);
    const duplicateWorkflow = required(duplicateDeveloper.workflows.implementation_new, 'implementation_new workflow');
    Object.defineProperty(duplicateWorkflow, 'stages', {
      value: duplicateWorkflow.stages.map((stage) =>
        stage.kind === 'develop' ? { ...stage, assignments: [...stage.assignments, ...stage.assignments] } : stage,
      ),
    });
    expect(() => validateWorkflowConfiguration(duplicateDeveloper)).toThrow(/developer-orchestrator/);
    const whole = resolvePathProfile(repositoryRoot, config, { processing_scope: 'whole_repository' });
    expect(validateResolvedPathProfile(whole, repositoryRoot)).toBe(whole);
    expect(() => validateResolvedPathProfile({ ...whole }, repositoryRoot)).toThrow(/issued/);
    expect(validateConfiguredRepositoryAccess(repositoryRoot).attested).toBe(true);
    expect(validateProjectContext(project, repositoryRoot)).toBe(project);
    expect(() => validateProjectContext({ ...project }, repositoryRoot)).toThrow(/issued/);
  });

  test('Cedar capabilities fail closed on malformed boundaries', () => {
    expect(validateCedarPolicySet('permit(principal, action, resource);')).toEqual({ valid: true, diagnostics: [] });
    expect(() => invokeUntrusted(requireAbsoluteRepositoryRoot, [null])).toThrow(/absolute/);
    expect(() => validateResolvedPathProfile(null, repositoryRoot)).toThrow(/issued/);
    const invalidCedar = validateCedarPolicySet('not cedar');
    expect(invalidCedar.valid).toBe(false);
    expect(invalidCedar.diagnostics[0]).toMatch(/parse|token|input/i);
    const authorize = createConfiguredProjectAuthorizer(repositoryRoot, config);
    const invalidSchemaResult = authorizeProject(
      authorizationRequest('a'.repeat(64)),
      identity(),
      project,
      repositoryRoot,
      config.authorization.cedar.policy,
      'invalid schema',
    );
    expect(invalidSchemaResult).toMatchObject({ decision: 'deny' });
    expect(invalidSchemaResult.diagnostics.length).toBeGreaterThan(0);
    const invalidPolicyResult = authorizeProject(
      authorizationRequest('a'.repeat(64)),
      identity(),
      project,
      repositoryRoot,
      'not cedar',
      config.authorization.cedar.schema_text,
    );
    expect(invalidPolicyResult.decision).toBe('deny');
    expect(invalidPolicyResult.diagnostics.length).toBeGreaterThan(0);
    expect(required(invalidPolicyResult.diagnostics[0], 'invalid Cedar diagnostic')).toMatch(/parse|token|input/i);
    expect(authorize(authorizationRequest('a'.repeat(64)), identity(), project).decision).toBe('allow');
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
    const expectedDecisionId = 'cedar-' + canonicalJsonDigest(validAuthorization).slice(0, 24);
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
    expect(authorize({}, identity(), project).decision).toBe('deny');
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

  test('Mastra defaults, hooks, and diagnostic boundaries execute', async () => {
    expect(() => invokeUntrusted(sanitizeDiagnostic, [config, null])).toThrow(/diagnostic|string|non-empty/i);
    expect(Buffer.byteLength(sanitizeDiagnostic(config, 'x'.repeat(10_000)), 'utf8')).toBeLessThanOrEqual(10_000);
    expect(
      Buffer.byteLength(
        sanitizeDiagnostic(
          { ...config, observability: { ...config.observability, max_error_log_bytes: 5 } },
          'abcdefgh',
        ),
        'utf8',
      ),
    ).toBeLessThanOrEqual(5);
    expect(sanitizeDiagnostic(config, 'url=https://alice:supersecret@example.com')).toContain(
      'https://alice:[REDACTED]@example.com',
    );
    expect(() => sanitizeDiagnostic(config, 'x'.repeat(4 * 1024 * 1024 + 1))).toThrow(/bounded input/);
    const configured = createConfiguredMastra(repositoryRoot);
    expect(configured.workflowId).toBeTypeOf('string');
    {
      const failure = await rejectionReason(configured.dispatch(''));
      expect(() => {
        throw failure;
      }).toThrow(/work item id/i);
    }
    {
      const failure = await rejectionReason(configured.dispatch('work-coverage'));
      expect(() => {
        throw failure;
      }).toThrow(/opaque host capability/);
    }
    const afterToolCall = configured.hooks.afterToolCall;
    if (!afterToolCall) throw new Error('Expected the configured afterToolCall hook.');
    expect(await afterToolCall({ toolName: 'source.read', input: {}, context: {} })).toBeUndefined();
  });

  test('runtime kernel composes issued hosts and exposes timed reads', async () => {
    expect(nativeNoFollowAvailable).toBe(true);
    const events: RuntimeTimingEvent[] = [];
    const host = createRuntimeKernelHost({
      repositoryRoot,
      repositoryId: project.repository_id,
      projectIds: project.project_ids,
      integrationsDigest: project.integrations_digest,
      resolveIdentity: () => identity(),
      verifyApproval: () => null,
      runtimeRevision: () => ({ sourceRevision: 'source-1', currentRevision: 1 }),
      casWriter: () => ({ applied: true }),
      clock: defaultRuntimeClock(),
      timingSink: {
        record: (event) => {
          events.push(event);
        },
      },
    });
    const kernel = await createRuntimeKernel(repositoryRoot, host);
    expect((await kernel.readConfig()).schema).toBe('AgentRuntimeConfig/v1');
    expect((await kernel.readProjectContext()).project_ids).toContain(projectBinding.project_id);
    expect((await kernel.evaluateGovernance('runtime.read', {})).decision).toBe('allow');
    const fixture = governedEvidence();
    {
      const failure = await rejectionReason(
        kernel.runGovernedWrite({
          envelope: {
            schema: 'RuntimeEnvelope/v1',
            kind: 'governed-write',
            operation: 'runtime.write',
            sourceRevision: 'source-1',
            expectedRevision: 1,
            payload: { operation: fixture.intent.operation },
          },
          intent: fixture.intent,
        }),
      );
      expect(() => {
        throw failure;
      }).toThrow(/denied|approval|Cedar ingress/i);
    }
    const crossAuthorization = {
      ...fixture.intent.authorization,
      tenant: 'other-tenant',
      resourceTenant: 'other-tenant',
    };
    const crossOperationHash = computeWriteOperationHash({
      operation: fixture.intent.operation,
      payload: fixture.intent.payload,
      ...crossAuthorization,
    });
    const crossIntent = {
      ...fixture.intent,
      authorization: crossAuthorization,
      approval: { ...fixture.intent.approval, tenant: 'other-tenant', operation_hash: crossOperationHash },
    };
    {
      const failure = await rejectionReason(
        kernel.runGovernedWrite({
          envelope: {
            schema: 'RuntimeEnvelope/v1',
            kind: 'governed-write',
            operation: 'runtime.write',
            sourceRevision: 'source-1',
            expectedRevision: 1,
            payload: { operation: fixture.intent.operation },
          },
          intent: crossIntent,
        }),
      );
      expect(() => {
        throw failure;
      }).toThrow(/canonical Cedar|identity|denied|approval/i);
    }
    expect(kernel.schema).toBe('RuntimeKernel/v1');
    expect(kernel.repositoryRoot).toBe(repositoryRoot);
    expect(Object.isFrozen(kernel)).toBe(true);
    expect((await kernel.evaluateGovernance('runtime.write', {})).decision).toBe('deny');
    const bindingDefaults = {
      repositoryRoot,
      repositoryId: project.repository_id,
      projectIds: project.project_ids,
      integrationsDigest: project.integrations_digest,
      resolveIdentity: () => identity(),
      verifyApproval: () => null,
      runtimeRevision: () => ({ sourceRevision: 'source-1', currentRevision: 1 }),
      casWriter: () => ({ applied: true }),
    } satisfies RuntimeKernelHostBindings;
    const requiredHostFields: readonly (readonly [keyof RuntimeKernelHostBindings, string])[] = [
      ['resolveIdentity', 'runtime kernel host identity resolver is required'],
      ['verifyApproval', 'runtime kernel host approval verifier is required'],
      ['runtimeRevision', 'runtime kernel host revision provider is required'],
      ['casWriter', 'runtime kernel host CAS writer is required'],
    ];
    for (const [field, message] of requiredHostFields) {
      const incomplete: Partial<RuntimeKernelHostBindings> = { ...bindingDefaults };
      Reflect.deleteProperty(incomplete, field);
      expect(() => invokeUntrusted(createRuntimeKernelHost, [incomplete])).toThrow(message);
    }
    expect(() => invokeUntrusted(createRuntimeKernelHost, [{ ...bindingDefaults, repositoryRoot: null }])).toThrow(
      'runtime kernel host repository root is required',
    );
    expect(() => invokeUntrusted(createRuntimeKernelHost, [{ ...bindingDefaults, repositoryId: null }])).toThrow(
      'runtime kernel host repository id is required',
    );
    expect(() => invokeUntrusted(createRuntimeKernelHost, [{ ...bindingDefaults, projectIds: null }])).toThrow(
      'runtime kernel host project ids are required',
    );
    expect(() => invokeUntrusted(createRuntimeKernelHost, [{ ...bindingDefaults, integrationsDigest: null }])).toThrow(
      'runtime kernel host integrations digest is required',
    );
    expect(() =>
      createRuntimeKernelHost({ ...bindingDefaults, repositoryRoot: repositoryRoot + path.sep + '.' }),
    ).toThrow(/canonical/);
    const defaultTimingHost = createRuntimeKernelHost(bindingDefaults);
    const defaultTimingKernel = await createRuntimeKernel(repositoryRoot, defaultTimingHost);
    expect((await defaultTimingKernel.readConfig()).schema).toBe('AgentRuntimeConfig/v1');
    {
      const failure = await rejectionReason(invokeUntrusted(createRuntimeKernel, [repositoryRoot, {}]));
      expect(() => {
        throw failure;
      }).toThrow('runtime kernel requires an opaque host capability');
    }
    {
      const failure = await rejectionReason(invokeUntrusted(createRuntimeKernel, [repositoryRoot, () => undefined]));
      expect(() => {
        throw failure;
      }).toThrow('runtime kernel requires an opaque host capability');
    }
    {
      const failure = await rejectionReason(invokeUntrusted(createRuntimeKernel, [repositoryRoot, 1]));
      expect(() => {
        throw failure;
      }).toThrow('runtime kernel requires an opaque host capability');
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(events.map((event) => event.operation)).toContain('createRuntimeKernel');
    for (const bindings of [
      { ...bindingDefaults, repositoryRoot: '' },
      { ...bindingDefaults, repositoryId: '' },
      { ...bindingDefaults, projectIds: [] },
    ])
      expect(() => invokeUntrusted(createRuntimeKernelHost, [bindings])).toThrow();
    const otherRootHost = createRuntimeKernelHost({
      repositoryRoot: packageRoot,
      repositoryId: 'x',
      projectIds: ['y'],
      integrationsDigest: '0'.repeat(64),
      resolveIdentity: () => null,
      verifyApproval: () => null,
      runtimeRevision: () => ({ sourceRevision: 'x', currentRevision: 1 }),
      casWriter: () => null,
    });
    {
      const failure = await rejectionReason(createRuntimeKernel(repositoryRoot, otherRootHost));
      expect(() => {
        throw failure;
      }).toThrow(/different repository/);
    }
  });
});
