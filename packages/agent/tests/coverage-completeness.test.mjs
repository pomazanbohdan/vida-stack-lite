import { describe, expect, test, vi } from 'vitest';
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
import { configuredTestContext } from './configured-context.mjs';
import {
  canonicalJson,
  canonicalJsonDigest,
  computeGovernedWriteRequestDigest,
  freezeJsonValue,
  isPlainRecord,
  isStrictRfc3339Timestamp,
  toAuthorizationReceipt,
  validateAuthorizationRequest,
  validateGovernedWriteRequest,
} from '../src/contracts/public-ingress.ts';
import { consumeRuntimeEnvelope, localToolEnvelope, validateRuntimeEnvelope } from '../src/contracts/envelopes.ts';
import {
  authorizeProject,
  createConfiguredProjectAuthorizer,
  validateCedarPolicySet,
} from '../src/authorization/cedar-boundary.ts';
import { defaultRuntimeClock, defaultRuntimeTimingSink, invokeTimed } from '../src/runtime-timing.ts';
import { createRuntimeKernel, createRuntimeKernelHost } from '../src/runtime-kernel.ts';
import {
  detectNativeNoFollowCapability,
  nativeNoFollowAvailable,
  requireNativeNoFollowCapability,
} from '../src/config/host-capability.ts';

import { createConfiguredMastra, sanitizeDiagnostic } from '../src/orchestration/mastra-boundary.ts';
import { requireAbsoluteRepositoryRoot } from '../src/config/project-context.ts';
import { validateConfiguredRepositoryAccess } from '../src/config/runtime-config.ts';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const { repositoryRoot, config, context: project } = configuredTestContext();
const projectBinding = project.project_bindings[0];
if (!projectBinding) throw new Error('Expected a configured project binding');

function clock(...values) {
  return {
    monotonicNs: () => {
      const value = values.shift();
      if (value instanceof Error) throw value;
      return value;
    },
  };
}

async function timed(action, options) {
  const events = [];
  const result = await action({ ...options, sink: { record: (event) => events.push(event) } });
  await new Promise((resolve) => setTimeout(resolve, 0));
  return { events, result };
}

function authorizationRequest(operationHash) {
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

function identity() {
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

function governedEvidence() {
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
  const intent = {
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
  const approval = {
    ...intent.approval,
    verified: true,
    issuer: 'test-authority',
    verification_id: 'verification-1',
    verified_at: approvedAt,
  };
  return { approval, intent, operationHash, receipt };
}

describe('direct maintained-source completeness', () => {
  test('timing handles success, threshold, clock failure, regression, sink rejection, and classified errors', async () => {
    expect(defaultRuntimeClock().monotonicNs()).toBeTypeOf('bigint');
    expect(defaultRuntimeTimingSink().record).toBeTypeOf('function');
    const threshold = await timed((options) => invokeTimed('readConfig', () => 'ok', options), {
      clock: clock(0n, 3_000_000n),
      thresholdMs: 2,
      optimizationReason: 'slow path',
    });
    expect(threshold.result).toBe('ok');
    expect(threshold.events[0]).toMatchObject({ optimization_required: true, optimization_reason: 'slow path' });
    const thresholdCallId = threshold.events[0].call_id;
    expect(threshold.events[0]).toMatchObject({
      schema: 'RuntimeTiming/v1',
      operation: 'readConfig',
      call_id: expect.stringMatching(/^runtime-call-[0-9]+$/),
      started_at_ns: '0',
      elapsed_ns: '3000000',
      elapsed_ms: 3,
      processing_time_ms: 3,
      threshold_ms: 2,
      within_budget: false,
      outcome: 'success',
    });
    const exactThreshold = await timed((options) => invokeTimed('readConfig', () => 'exact', options), {
      clock: clock(0n, 2_000_000n),
      thresholdMs: 2,
    });
    const exactCallId = exactThreshold.events[0].call_id;
    expect(exactThreshold.events[0]).toMatchObject({
      elapsed_ns: '2000000',
      elapsed_ms: 2,
      within_budget: false,
      optimization_required: true,
      optimization_reason: 'runtime call exceeded 2ms',
    });
    expect(exactThreshold.events[0]).not.toHaveProperty('clock_error');
    expect(Number(exactCallId.slice('runtime-call-'.length))).toBe(
      Number(thresholdCallId.slice('runtime-call-'.length)) + 1,
    );
    const nonZeroElapsed = await timed((options) => invokeTimed('readConfig', () => 'non-zero', options), {
      clock: clock(10n, 3_000_010n),
      thresholdMs: 2,
    });
    expect(nonZeroElapsed.events[0]).toMatchObject({
      started_at_ns: '10',
      elapsed_ns: '3000000',
      elapsed_ms: 3,
      processing_time_ms: 3,
      optimization_required: true,
    });
    const equalClock = await timed((options) => invokeTimed('readConfig', () => 'equal', options), {
      clock: clock(5n, 5n),
      thresholdMs: 1,
    });
    expect(equalClock.events[0]).toMatchObject({
      started_at_ns: '5',
      elapsed_ns: '0',
      elapsed_ms: 0,
      within_budget: true,
      optimization_required: false,
    });
    expect(equalClock.events[0]).not.toHaveProperty('clock_error');
    const invalidClockType = await timed((options) => invokeTimed('readConfig', () => 'invalid-type', options), {
      clock: clock(0, 1n),
    });
    expect(invalidClockType.events[0]).toMatchObject({
      clock_error: 'CLOCK_READ_FAILED',
      elapsed_ns: '0',
      within_budget: false,
      optimization_required: false,
    });
    const invalidClockValue = await timed((options) => invokeTimed('readConfig', () => 'invalid-value', options), {
      clock: clock(0n, -1n),
    });
    expect(invalidClockValue.events[0]).toMatchObject({
      clock_error: 'CLOCK_READ_FAILED',
      elapsed_ns: '0',
      within_budget: false,
      optimization_required: false,
    });
    const invalidClockBudget = await timed((options) => invokeTimed('readConfig', () => 'invalid-budget', options), {
      clock: clock(0, 2_000_000_000n),
      thresholdMs: 2,
    });
    expect(invalidClockBudget.events[0]).toMatchObject({
      clock_error: 'CLOCK_READ_FAILED',
      elapsed_ns: '0',
      within_budget: false,
      optimization_required: false,
    });
    const failedClock = await timed((options) => invokeTimed('readConfig', () => 'ok', options), {
      clock: clock(new Error('clock'), -1n),
    });
    expect(failedClock.events[0].clock_error).toBe('CLOCK_READ_FAILED');
    const regressed = await timed((options) => invokeTimed('readConfig', () => 'ok', options), {
      clock: clock(5n, 4n),
    });
    expect(regressed.events[0]).toMatchObject({
      schema: 'RuntimeTiming/v1',
      operation: 'readConfig',
      started_at_ns: '5',
      elapsed_ns: '0',
      elapsed_ms: 0,
      processing_time_ms: 0,
      within_budget: false,
      optimization_required: false,
      optimization_reason: 'monotonic clock error',
      clock_error: 'CLOCK_REGRESSION',
      outcome: 'success',
    });
    const invalidEnd = await timed((options) => invokeTimed('readConfig', () => 'ok', options), {
      clock: clock(0n, new Error('clock')),
    });
    expect(invalidEnd.events[0].clock_error).toBe('CLOCK_READ_FAILED');
    for (const [message, code] of [
      ['authorization denied', 'DENIED'],
      ['topology config changed', 'CONFIG_CHANGED'],
      ['CAS revision mismatch', 'CAS_FAILURE'],
      ['native host capability', 'HOST_GAP'],
      ['required value invalid', 'VALIDATION_ERROR'],
      ['other', 'UNEXPECTED_ERROR'],
      ['approval rejected', 'DENIED'],
      ['AUTHORIZATION DENIED', 'DENIED'],
    ]) {
      const failure = Object.assign(new Error(message), { code: message });
      const events = [];
      await expect(
        invokeTimed(
          'runGovernedWrite',
          () => {
            throw failure;
          },
          {
            clock: clock(0n, 1n),
            sink: { record: (event) => events.push(event) },
          },
        ),
      ).rejects.toBe(failure);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(events[0]).toMatchObject({
        schema: 'RuntimeTiming/v1',
        operation: 'runGovernedWrite',
        call_id: expect.stringMatching(/^runtime-call-[0-9]+$/),
        started_at_ns: '0',
        elapsed_ns: '1',
        elapsed_ms: 0.000001,
        processing_time_ms: 0.000001,
        threshold_ms: 2_000,
        within_budget: true,
        optimization_required: false,
        outcome: 'error',
        error_code: code,
      });
      expect(events[0]).not.toHaveProperty('optimization_reason');
    }
    const structuredFailure = Object.create(null);
    Object.defineProperty(structuredFailure, 'message', { value: 'authorization denied', enumerable: true });
    const structuredEvents = [];
    await expect(
      invokeTimed(
        'runGovernedWrite',
        () => {
          throw structuredFailure;
        },
        {
          clock: clock(0n, 1n),
          sink: { record: (event) => structuredEvents.push(event) },
        },
      ),
    ).rejects.toBe(structuredFailure);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(structuredEvents[0].error_code).toBe('DENIED');
    const functionFailure = Object.assign(() => undefined, { message: 'topology config changed' });
    const functionEvents = [];
    await expect(
      invokeTimed(
        'runGovernedWrite',
        () => {
          throw functionFailure;
        },
        {
          clock: clock(0n, 1n),
          sink: { record: (event) => functionEvents.push(event) },
        },
      ),
    ).rejects.toBe(functionFailure);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(functionEvents[0].error_code).toBe('CONFIG_CHANGED');
    const nonStringMessage = Object.create(null);
    Object.defineProperty(nonStringMessage, 'message', {
      value: { slice: () => 'authorization denied' },
      enumerable: true,
    });
    const nonStringEvents = [];
    await expect(
      invokeTimed(
        'runGovernedWrite',
        () => {
          throw nonStringMessage;
        },
        {
          clock: clock(0n, 1n),
          sink: { record: (event) => nonStringEvents.push(event) },
        },
      ),
    ).rejects.toBe(nonStringMessage);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(nonStringEvents[0].error_code).toBe('UNEXPECTED_ERROR');
    const codeOnlyFailure = Object.create(null);
    Object.defineProperty(codeOnlyFailure, 'code', { value: 'authorization denied', enumerable: true });
    const codeOnlyEvents = [];
    await expect(
      invokeTimed(
        'runGovernedWrite',
        () => {
          throw codeOnlyFailure;
        },
        {
          clock: clock(0n, 1n),
          sink: { record: (event) => codeOnlyEvents.push(event) },
        },
      ),
    ).rejects.toBe(codeOnlyFailure);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(codeOnlyEvents[0].error_code).toBe('DENIED');
    const lowercaseStringEvents = [];
    await expect(
      invokeTimed(
        'runGovernedWrite',
        () => {
          throw 'authorization denied';
        },
        {
          clock: clock(0n, 1n),
          sink: { record: (event) => lowercaseStringEvents.push(event) },
        },
      ),
    ).rejects.toBe('authorization denied');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(lowercaseStringEvents[0].error_code).toBe('DENIED');
    const longStringEvents = [];
    const longFailure = 'x'.repeat(300) + ' authorization denied';
    await expect(
      invokeTimed(
        'runGovernedWrite',
        () => {
          throw longFailure;
        },
        {
          clock: clock(0n, 1n),
          sink: { record: (event) => longStringEvents.push(event) },
        },
      ),
    ).rejects.toBe(longFailure);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(longStringEvents[0].error_code).toBe('UNEXPECTED_ERROR');
    await expect(invokeTimed('readConfig', () => true, { thresholdMs: 0 })).rejects.toThrow(/positive/);
    await expect(invokeTimed('readConfig', () => true, { thresholdMs: Number.NaN })).rejects.toThrow(/positive/);
    await expect(
      invokeTimed('readConfig', () => true, { sink: { record: () => Promise.reject(new Error('sink')) } }),
    ).resolves.toBe(true);
    const huge = await timed((options) => invokeTimed('readConfig', () => 'huge', options), {
      clock: clock(0n, 10n ** 400n),
    });
    expect(huge.events[0].elapsed_ms).toBe(Number.MAX_VALUE);
    const hostile = new Proxy(
      {},
      {
        getOwnPropertyDescriptor: () => {
          throw new Error('hostile descriptor');
        },
      },
    );
    await expect(
      invokeTimed(
        'readConfig',
        () => {
          throw hostile;
        },
        { clock: clock(0n, 1n) },
      ),
    ).rejects.toBe(hostile);
    await expect(
      invokeTimed(
        'readConfig',
        () => {
          throw 'plain failure';
        },
        { clock: clock(0n, 1n) },
      ),
    ).rejects.toBe('plain failure');
    const longMessageFailure = Object.create(null);
    Object.defineProperty(longMessageFailure, 'message', {
      value: 'x'.repeat(300) + ' authorization denied',
      enumerable: true,
    });
    const longMessageEvents = [];
    await expect(
      invokeTimed(
        'runGovernedWrite',
        () => {
          throw longMessageFailure;
        },
        {
          clock: clock(0n, 1n),
          sink: { record: (event) => longMessageEvents.push(event) },
        },
      ),
    ).rejects.toBe(longMessageFailure);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(longMessageEvents[0].error_code).toBe('UNEXPECTED_ERROR');
    const defaultClock = defaultRuntimeClock();
    expect(defaultClock).toBe(defaultRuntimeClock());
    expect(Object.isFrozen(defaultClock)).toBe(true);
    expect(defaultClock.monotonicNs()).toBeTypeOf('bigint');
    const defaultThreshold = await timed((options) => invokeTimed('readConfig', () => 'default-threshold', options), {
      clock: clock(0n, 2_000_000_001n),
      thresholdMs: 2_000,
    });
    expect(defaultThreshold.events[0]).toMatchObject({
      threshold_ms: 2_000,
      optimization_required: true,
      optimization_reason: 'runtime call exceeded 2000ms',
    });
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    defaultRuntimeTimingSink().record(threshold.events[0]);
    defaultRuntimeTimingSink().record(exactThreshold.events[0]);
    defaultRuntimeTimingSink().record({ ...exactThreshold.events[0], optimization_required: false });
    expect(info.mock.calls[0][0]).toMatch(/^runtime call requires optimization: /);
    expect(info.mock.calls[1][0]).toMatch(/^runtime call requires optimization: /);
    expect(info.mock.calls[2][0]).toMatch(/^runtime call: /);
    info.mockRestore();
  });

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
    const cycle = {};
    cycle.self = cycle;
    expect(() => assertCanonicalJsonValue(cycle)).toThrow(/cyclic/);
    const sparse = [];
    sparse[1] = true;
    expect(() => assertCanonicalJsonValue(sparse)).toThrow();
    const nonCanonicalIndex = [true];
    Object.defineProperty(nonCanonicalIndex, '01', { value: true, enumerable: true });
    expect(() => assertCanonicalJsonValue(nonCanonicalIndex)).toThrow(/array/);
    const nonEnumerableIndex = [true];
    Object.defineProperty(nonEnumerableIndex, '0', { value: true, enumerable: false });
    expect(() => assertCanonicalJsonValue(nonEnumerableIndex)).toThrow(/descriptor/);
    const accessor = {};
    Object.defineProperty(accessor, 'x', { enumerable: true, get: () => 1 });
    expect(() => assertCanonicalJsonValue(accessor)).toThrow(/descriptor/);
    const inheritedHook = Object.getOwnPropertyDescriptor(Object.prototype, 'toJSON');
    try {
      Object.defineProperty(Object.prototype, 'toJSON', { configurable: true, value: () => ({ a: 2 }) });
      expect(() => canonicalJson({ a: 1 })).toThrow(/serialization hook/);
    } finally {
      if (inheritedHook) Object.defineProperty(Object.prototype, 'toJSON', inheritedHook);
      else delete Object.prototype.toJSON;
    }
    const arrayWithInheritedHook = [1];
    const arrayPrototype = Object.create(Array.prototype);
    Object.defineProperty(arrayPrototype, 'toJSON', { configurable: true, value: () => ({ pwned: true }) });
    Object.setPrototypeOf(arrayWithInheritedHook, arrayPrototype);
    expect(() => canonicalJson(arrayWithInheritedHook)).toThrow(/serialization hook/);
    const hidden = {};
    Object.defineProperty(hidden, 'x', { value: 1, enumerable: false });
    expect(() => assertCanonicalJsonValue(hidden)).toThrow();
    const symbol = { a: 1 };
    symbol[Symbol('x')] = 2;
    expect(() => assertCanonicalJsonValue(symbol)).toThrow();
    expect(() => assertCanonicalJsonValue('x', '$', new WeakSet(), 0, { nodes: 10_000, bytes: 0 })).toThrow(/node/);
    expect(() => assertCanonicalJsonValue('x', '$', new WeakSet(), 65, { nodes: 0, bytes: 0 })).toThrow(/depth/);
    expect(() =>
      assertCanonicalJsonValue('x', '$', new WeakSet(), 0, { nodes: 0, bytes: 8_388_608 - 1 }),
    ).not.toThrow();
    expect(() => assertCanonicalJsonValue('x', '$', new WeakSet(), 0, { nodes: 0, bytes: 8_388_608 })).toThrow(/byte/);
    const frozenCycle = {};
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
    const frozenAccessor = Object.defineProperty({}, 'value', {enumerable: true, get() { getterCalls++; return {value: 1}; }});
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

  test('governed write schemas match the maintained RFC3339 timestamp parser', () => {
    const schema = JSON.parse(readFileSync(path.join(packageRoot, 'schemas/governed-write.v1.schema.json'), 'utf8'));
    const timestampSchemas = [
      schema.properties.authorization.properties.issued_at,
      schema.properties.approval.properties.approved_at,
      schema.properties.approval.properties.expires_at,
      schema.properties.approval.properties.verified_at,
    ];
    const values = [
      '2000-02-29T00:00:00Z',
      '1900-02-29T00:00:00Z',
      '2016-12-31T23:59:60Z',
      '2016-12-31T23:59:60+01:00',
    ];
    for (const timestampSchema of timestampSchemas) {
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
      if (original === undefined) delete Object.prototype.toJSON;
      else Object.defineProperty(Object.prototype, 'toJSON', original);
    }
  });

  test('envelopes validate JSON data, revision bindings, and local tool inputs', () => {
    const envelope = {
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
    expect(() => consumeRuntimeEnvelope(envelope, { sourceRevision: 1, currentRevision: 1 })).toThrow(
      'runtime envelope source revision binding is required',
    );
    expect(() => consumeRuntimeEnvelope(envelope, undefined)).toThrow(
      'runtime envelope source revision binding is required',
    );
    expect(() => consumeRuntimeEnvelope(envelope, { currentRevision: 1 })).toThrow(
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
    const rebased = (authorizationChanges = {}, approvalChanges = {}) => {
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
      expect(() => validateGovernedWriteRequest(rebased(changes))).toThrow(
        'authorization resource is outside the principal tenant/project scope',
      );
    expect(() => validateGovernedWriteRequest(rebased({ registry_hash: 'B'.repeat(64) }))).toThrow(/registry_hash/);
    for (const changes of [{ tenant: 'other-tenant' }, { project: 'other-project' }])
      expect(() => validateGovernedWriteRequest(rebased({}, changes))).toThrow(
        'approval scope does not match authorization scope',
      );
    const now = Date.now();
    const timeRequest = (authorizationChanges = {}, approvalChanges = {}) => ({
      ...request,
      authorization: { ...request.authorization, ...authorizationChanges },
      approval: { ...request.approval, ...approvalChanges },
    });
    expect(() =>
      validateGovernedWriteRequest(timeRequest({ issued_at: new Date(now + 120_000).toISOString() })),
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
    expect(() => validateGovernedWriteRequest(timeRequest({}, { verified_at: '2023-02-29T00:00:00Z' }))).toThrow(
      /governed write (request rejected|evidence timestamps invalid)/,
    );
  });

  test('configuration and project selectors cover valid and invalid interfaces', () => {
    expect(runtimeConfigDigest(validateRuntimeConfig(config, repositoryRoot))).toBe(runtimeConfigDigest(config));
    expect(resolveAgentRoleProfile(repositoryRoot, 'executor').model).toBeTypeOf('string');
    expect(() => resolveAgentRoleProfile(repositoryRoot, 'missing')).toThrow(/not registered/);
    expect(resolveProviderWorkItemKind(config, 'azure', 'Epic')).toBe('epic');
    expect(() => resolveProviderWorkItemKind(config, 'missing', 'missing')).toThrow(/not registered/);
    expect(validateRuntimeConfig(config).schema).toBe('AgentRuntimeConfig/v1');
    const optionalContours = structuredClone(config);
    optionalContours.projects[0].path_overrides = { work_root: 'agent-runtime-new' };
    optionalContours.teams['default-development'].stage_overrides = { develop_fix: 'executor' };
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
    malformedWorkflow.agents.role_instructions.fake = {
      description: 'fake',
      consumes: ['DevelopmentTaskPacket/v1'],
      produces: ['ImplementationResult/v1'],
      rules: ['fake'],
    };
    malformedWorkflow.workflows.implementation_new.stages = malformedWorkflow.workflows.implementation_new.stages.map(
      (stage) =>
        stage.kind === 'develop' ? { ...stage, assignments: [{ ...stage.assignments[0], role: 'fake' }] } : stage,
    );
    expect(() => validateWorkflowConfiguration(malformedWorkflow)).toThrow(/developer-orchestrator/);
    const duplicateDeveloper = structuredClone(config);
    duplicateDeveloper.workflows.implementation_new.stages = duplicateDeveloper.workflows.implementation_new.stages.map(
      (stage) =>
        stage.kind === 'develop' ? { ...stage, assignments: [...stage.assignments, ...stage.assignments] } : stage,
    );
    expect(() => validateWorkflowConfiguration(duplicateDeveloper)).toThrow(/developer-orchestrator/);
    if (!nativeNoFollowAvailable) return;
    const whole = resolvePathProfile(repositoryRoot, config);
    expect(validateResolvedPathProfile(whole, repositoryRoot)).toBe(whole);
    expect(() => validateResolvedPathProfile({ ...whole }, repositoryRoot)).toThrow(/issued/);
    expect(validateConfiguredRepositoryAccess(repositoryRoot).attested).toBe(true);
    expect(validateProjectContext(project, repositoryRoot)).toBe(project);
    expect(() => validateProjectContext({ ...project }, repositoryRoot)).toThrow(/issued/);
  });

  test('Cedar and host capabilities fail closed on malformed boundaries', () => {
    expect(validateCedarPolicySet('permit(principal, action, resource);')).toEqual({ valid: true, diagnostics: [] });
    expect(() => requireAbsoluteRepositoryRoot(null)).toThrow(/absolute/);
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
    expect(invalidPolicyResult).toEqual({
      decision: 'deny',
      diagnostics: expect.arrayContaining([expect.any(String)]),
    });
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
      decision_id: expect.stringMatching(/^cedar-[a-f0-9]{24}$/),
      operation_hash: validAuthorization.operationHash,
    });
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
    const viewerIdentity = { ...validIdentity, role: 'viewer' };
    expect(
      authorizeProject(
        viewerAuthorization,
        viewerIdentity,
        project,
        repositoryRoot,
        config.authorization.cedar.policy,
        config.authorization.cedar.schema_text,
      ),
    ).toEqual({ decision: 'deny', diagnostics: [] });
    for (const [field, value] of [
      ['schema', 'TrustedProjectIdentity/v2'],
      ['source', 'untrusted-context'],
    ]) {
      expect(
        authorizeProject(
          validAuthorization,
          { ...validIdentity, [field]: value },
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
    for (const field of ['principal', 'role', 'tenant', 'project']) {
      expect(
        authorizeProject(
          validAuthorization,
          { ...validIdentity, [field]: 'other-value' },
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
      authorizeProject(
        validAuthorization,
        { ...validIdentity, registry_hash: 'b'.repeat(64) },
        project,
        repositoryRoot,
        config.authorization.cedar.policy,
        config.authorization.cedar.schema_text,
      ),
    ).toEqual({
      decision: 'deny',
      diagnostics: ['authorization claims do not satisfy the configured project boundary'],
    });
    for (const [requestChange, identityChange] of [
      [{ tenant: 'other-tenant' }, { tenant: 'other-tenant' }],
      [{ project: 'other-project' }, { project: 'other-project' }],
      [{ resourceTenant: 'other-tenant' }, {}],
      [{ resourceProject: 'other-project' }, {}],
      [{ registryHash: 'b'.repeat(64) }, {}],
      [{}, { registry_hash: 'b'.repeat(64) }],
    ]) {
      expect(
        authorizeProject(
          { ...validAuthorization, ...requestChange },
          { ...validIdentity, ...identityChange },
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
    if (!nativeNoFollowAvailable) return;
    expect(nativeNoFollowAvailable).toBe(true);
    expect(() => detectNativeNoFollowCapability(null)).toThrow(/absolute/);
    expect(() => detectNativeNoFollowCapability('relative')).toThrow(/absolute/);
    expect(() => detectNativeNoFollowCapability(repositoryRoot + path.sep + '.')).toThrow(/canonical/);
    const capability = detectNativeNoFollowCapability(repositoryRoot);
    expect(() =>
      createConfiguredProjectAuthorizer(repositoryRoot, {
        ...config,
        authorization: { ...config.authorization, cedar: { ...config.authorization.cedar, policy: 'not cedar' } },
      }),
    ).toThrow('runtime config must come from loadRuntimeConfig');
    expect(() => createConfiguredProjectAuthorizer(path.resolve(repositoryRoot, 'agent-runtime-new'), config)).toThrow(
      'runtime config is not bound to the repository root',
    );
    expect(capability).toStrictEqual({
      schema: 'NativeNoFollowCapability/v1',
      platform: process.platform,
      node_version: process.versions.node,
      primitive: 'fs-safe-root-boundary',
      provider: 'fs-safe-windows',
      ancestor_binding: 'root-identity',
      atomic_replace: 'fsync-temp-rename',
      containment: 'best-effort',
      assurance_profile: 'windows-best-effort-v1',
      filesystem: 'unknown',
      package: {
        name: '@openclaw/fs-safe',
        version: '0.5.6',
        integrity: 'sha512-0M1vz1PEFAgCwTxhB1lt/B7z+TRTTWmlYJ3dSbdhjZp2AcfM7rXPGjQVJqHXpzpsb9SRxvKGrAM454Uul/Xy5g==',
      },
      residual_risks: [
        'Windows reparse containment is best-effort and requires supported-host NTFS/ReFS evidence.',
        'Windows synchronous mutation operations fail closed until a native component-wise no-follow mutation primitive is available.',
        'The fs-safe package does not provide the runtime revision/fence CAS; the candidate kernel retains that responsibility.',
        'Windows compare-and-replace removes the expected target before no-replace publication; external recreation wins and causes a fail-closed restore conflict.',
      ],
      attested: true,
    });
    expect(capability?.attested).toBe(true);
    expect(requireNativeNoFollowCapability(repositoryRoot)).toStrictEqual(capability);
  });

  test('Mastra defaults, hooks, and diagnostic boundaries execute', async () => {
    expect(() => sanitizeDiagnostic(config, null)).toThrow(/diagnostic|string|non-empty/i);
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
    await expect(configured.dispatch('')).rejects.toThrow(/work item id/i);
    await expect(configured.dispatch('work-coverage')).rejects.toThrow(/opaque host capability/);
    await expect(configured.hooks.afterToolCall({ toolName: 'source.read' })).resolves.toBeUndefined();
  });

  test.skipIf(!nativeNoFollowAvailable)('runtime kernel composes issued hosts and exposes timed reads', async () => {
    const events = [];
    const host = createRuntimeKernelHost({
      repositoryRoot,
      tenantId: project.repository_id,
      projectId: projectBinding.project_id,
      resolveIdentity: () => identity(),
      verifyApproval: () => null,
      runtimeRevision: () => ({ sourceRevision: 'source-1', currentRevision: 1 }),
      casWriter: () => ({ applied: true }),
      clock: defaultRuntimeClock(),
      timingSink: { record: (event) => events.push(event) },
    });
    const kernel = await createRuntimeKernel(repositoryRoot, host);
    expect((await kernel.readConfig()).schema).toBe('AgentRuntimeConfig/v1');
    expect((await kernel.readProjectContext()).project_id).toBe(projectBinding.project_id);
    expect((await kernel.evaluateGovernance('runtime.read', {})).decision).toBe('allow');
    const fixture = governedEvidence();
    await expect(
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
    ).rejects.toThrow(/denied|approval|Cedar ingress/i);
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
    await expect(
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
    ).rejects.toThrow(/canonical Cedar|identity|denied|approval/i);
    expect(kernel.schema).toBe('RuntimeKernel/v1');
    expect(kernel.repositoryRoot).toBe(repositoryRoot);
    expect(Object.isFrozen(kernel)).toBe(true);
    expect((await kernel.evaluateGovernance('runtime.write', {})).decision).toBe('deny');
    const bindingDefaults = {
      repositoryRoot,
      tenantId: project.repository_id,
      projectId: projectBinding.project_id,
      resolveIdentity: () => identity(),
      verifyApproval: () => null,
      runtimeRevision: () => ({ sourceRevision: 'source-1', currentRevision: 1 }),
      casWriter: () => ({ applied: true }),
    };
    for (const [field, message] of [
      ['resolveIdentity', 'runtime kernel host identity resolver is required'],
      ['verifyApproval', 'runtime kernel host approval verifier is required'],
      ['runtimeRevision', 'runtime kernel host revision provider is required'],
      ['casWriter', 'runtime kernel host CAS writer is required'],
    ]) {
      const incomplete = { ...bindingDefaults };
      delete incomplete[field];
      expect(() => createRuntimeKernelHost(incomplete)).toThrow(message);
    }
    expect(() => createRuntimeKernelHost({ ...bindingDefaults, repositoryRoot: null })).toThrow(
      'runtime kernel host repository root is required',
    );
    expect(() => createRuntimeKernelHost({ ...bindingDefaults, tenantId: null })).toThrow(
      'runtime kernel host tenant id is required',
    );
    expect(() => createRuntimeKernelHost({ ...bindingDefaults, projectId: null })).toThrow(
      'runtime kernel host project id is required',
    );
    expect(() =>
      createRuntimeKernelHost({ ...bindingDefaults, repositoryRoot: repositoryRoot + path.sep + '.' }),
    ).toThrow(/canonical/);
    const defaultTimingHost = createRuntimeKernelHost(bindingDefaults);
    const defaultTimingKernel = await createRuntimeKernel(repositoryRoot, defaultTimingHost);
    expect((await defaultTimingKernel.readConfig()).schema).toBe('AgentRuntimeConfig/v1');
    await expect(createRuntimeKernel(repositoryRoot, {})).rejects.toThrow(
      'runtime kernel requires an opaque host capability',
    );
    await expect(createRuntimeKernel(repositoryRoot, () => undefined)).rejects.toThrow(
      'runtime kernel requires an opaque host capability',
    );
    await expect(createRuntimeKernel(repositoryRoot, 1)).rejects.toThrow(
      'runtime kernel requires an opaque host capability',
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(events.map((event) => event.operation)).toContain('createRuntimeKernel');
    for (const bindings of [
      { repositoryRoot: '', tenantId: 'x', projectId: 'y' },
      { repositoryRoot, tenantId: '', projectId: 'y' },
      { repositoryRoot, tenantId: 'x', projectId: '', resolveIdentity: () => null },
    ])
      expect(() => createRuntimeKernelHost(bindings)).toThrow();
    const otherRootHost = createRuntimeKernelHost({
      repositoryRoot: packageRoot,
      tenantId: 'x',
      projectId: 'y',
      resolveIdentity: () => null,
      verifyApproval: () => null,
      runtimeRevision: () => ({ sourceRevision: 'x', currentRevision: 1 }),
      casWriter: () => null,
    });
    await expect(createRuntimeKernel(repositoryRoot, otherRootHost)).rejects.toThrow(/different repository/);
  });
});
