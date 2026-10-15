import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, spyOn, test } from 'bun:test';
import { configuredTestContext } from './configured-context.ts';
import { rfc3339LeapSecondAlternation, updateLeapSecondSchemaPatterns } from '../tooling/rfc3339-schema-patterns.ts';
import {
  assertCanonicalJsonValue,
  canonicalJson,
  canonicalJsonDigest,
  computeGovernedWriteRequestDigest,
  freezeJsonValue,
  isPlainRecord,
  isStrictRfc3339Timestamp,
  rfc3339TimestampMilliseconds,
  toAuthorizationReceipt,
  validateAuthorizationRequest,
  validateGovernedWriteRequest,
} from '../src/contracts/public-ingress.ts';
import { buildGovernedWriteRequest, computeWriteOperationHash } from '../src/index.ts';
import { expectReturned } from './helpers/expect-rejection.ts';
import { createGovernedEvidenceFixture } from './helpers/governed-evidence-fixture.ts';

const packageRoot = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const { context: project } = configuredTestContext();
function required<T>(value: T | undefined, label: string): T {
  if (value === undefined) throw new Error(`Expected ${label}.`);
  return value;
}
const projectBinding = required(project.project_bindings[0], 'a configured project binding');
describe('direct maintained-source completeness', () => {
  test('canonical JSON rejects hostile descriptors and preserves deterministic data', () => {
    expect(expectReturned(() => isPlainRecord({}))).toBe(true);
    expect(expectReturned(() => isPlainRecord(Object.create(null)))).toBe(true);
    expect(expectReturned(() => isPlainRecord(null))).toBe(false);
    expect(expectReturned(() => isPlainRecord([]))).toBe(false);
    expect(expectReturned(() => isPlainRecord(new Date()))).toBe(false);
    expect(expectReturned(() => isPlainRecord('record'))).toBe(false);
    for (const value of [null, true, 1, 'text', { nested: [false] }])
      expectReturned(() => assertCanonicalJsonValue(value));
    expect(() => assertCanonicalJsonValue(new Date(0))).toThrow(/non-canonical JSON object/);
    expect(() => canonicalJson(new Date(0))).toThrow(/non-canonical JSON object/);
    expect(expectReturned(() => canonicalJson({ z: 1, a: [true, null, 'x'] }))).toBe('{"a":[true,null,"x"],"z":1}');
    expect(expectReturned(() => canonicalJsonDigest({ a: 1 }))).toMatch(/^[a-f0-9]{64}$/);
    expect(expectReturned(() => canonicalJson({ nested: { b: 2, a: 1 }, items: [3, 2, 1] }))).toBe(
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
    expect(expectReturned(() => freezeJsonValue(frozenCycle))).toBe(frozenCycle);
    expect(Object.isFrozen(frozenCycle)).toBe(true);
    const frozen = expectReturned(() => freezeJsonValue({ nested: [{ value: 1 }] }));
    expect(frozen).toMatchObject({ nested: [{ value: 1 }] });
    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen.nested)).toBe(true);
    expect(Object.isFrozen(frozen.nested[0])).toBe(true);
    expect(expectReturned(() => freezeJsonValue(1))).toBe(1);
    expect(expectReturned(() => freezeJsonValue(null))).toBeNull();
    let getterCalls = 0;
    const frozenAccessor = Object.defineProperty({}, 'value', {
      enumerable: true,
      get() {
        getterCalls++;
        return { value: 1 };
      },
    });
    expect(expectReturned(() => freezeJsonValue(frozenAccessor))).toBe(frozenAccessor);
    expect(Object.isFrozen(frozenAccessor)).toBe(true);
    expect(getterCalls).toBe(0);
    expect(expectReturned(() => isStrictRfc3339Timestamp('2026-08-30T10:00:00Z'))).toBe(true);
    expect(expectReturned(() => isStrictRfc3339Timestamp('2026-08-30T10:00:00.12Z'))).toBe(true);
    expect(expectReturned(() => isStrictRfc3339Timestamp('2026-08-30T10:00:00+00:00'))).toBe(true);
    expect(expectReturned(() => isStrictRfc3339Timestamp('2024-02-29T10:00:00Z'))).toBe(true);
    expect(expectReturned(() => isStrictRfc3339Timestamp('2016-12-31T23:59:60Z'))).toBe(true);
    expect(expectReturned(() => isStrictRfc3339Timestamp('2024-01-01T00:00:60Z'))).toBe(false);
    expect(expectReturned(() => isStrictRfc3339Timestamp('2024-01-01T23:59:60Z'))).toBe(false);
    expect(expectReturned(() => isStrictRfc3339Timestamp('2016-12-31T23:59:60+00:00'))).toBe(true);
    expect(expectReturned(() => isStrictRfc3339Timestamp('2016-12-31T23:59:60+01:00'))).toBe(false);
    expect(expectReturned(() => isStrictRfc3339Timestamp('2026-08-30T10:00:00.1234567890Z'))).toBe(false);
    expect(expectReturned(() => isStrictRfc3339Timestamp('2026-02-29T10:00:00Z'))).toBe(false);
    expect(expectReturned(() => isStrictRfc3339Timestamp('2026-02-31T10:00:00Z'))).toBe(false);
    expect(expectReturned(() => isStrictRfc3339Timestamp('2026-04-31T10:00:00Z'))).toBe(false);
    expect(expectReturned(() => isStrictRfc3339Timestamp('2026-13-30T10:00:00Z'))).toBe(false);
    expect(expectReturned(() => isStrictRfc3339Timestamp('2026-08-30T24:00:00Z'))).toBe(false);
    expect(expectReturned(() => isStrictRfc3339Timestamp('2026-08-30T10:00:00+24:00'))).toBe(false);
    expect(expectReturned(() => isStrictRfc3339Timestamp('x2026-08-30T10:00:00Z'))).toBe(false);
    expect(expectReturned(() => isStrictRfc3339Timestamp('2026-08-30T10:00:00Zx'))).toBe(false);
    expect(expectReturned(() => isStrictRfc3339Timestamp(null))).toBe(false);
  });

  test('timestamp parsing rejects trailing line terminators', () => {
    const timestamp = '2026-10-15T00:00:00Z';
    expect(expectReturned(() => rfc3339TimestampMilliseconds(timestamp))).toBe(Date.UTC(2026, 9, 15));
    for (const suffix of ['\n', '\r', '\r\n', '\u2028', '\u2029']) {
      const input = timestamp + suffix;
      expect(expectReturned(() => rfc3339TimestampMilliseconds(input))).toBeNull();
      expect(expectReturned(() => isStrictRfc3339Timestamp(input))).toBe(false);
    }
  });

  test('timestamp parsing fails closed when the native parser returns a non-finite time', () => {
    const timestamp = '2026-10-15T00:00:00Z';
    const expected = Date.UTC(2026, 9, 15);
    expect(expectReturned(() => rfc3339TimestampMilliseconds(timestamp))).toBe(expected);
    const parse = spyOn(Date, 'parse').mockReturnValue(NaN);
    try {
      expect(expectReturned(() => rfc3339TimestampMilliseconds(timestamp))).toBeNull();
      expect(expectReturned(() => isStrictRfc3339Timestamp(timestamp))).toBe(false);
      expect(parse.mock.calls).toEqual([[timestamp], [timestamp]]);
    } finally {
      parse.mockRestore();
    }
    expect(expectReturned(() => rfc3339TimestampMilliseconds(timestamp))).toBe(expected);
  });

  const RFC3339_KNOWN_LEAP_DATES_FOR_TEST = [
    '1972-06-30',
    '1972-12-31',
    '1973-12-31',
    '1974-12-31',
    '1975-12-31',
    '1976-12-31',
    '1977-12-31',
    '1978-12-31',
    '1979-12-31',
    '1981-06-30',
    '1982-06-30',
    '1983-06-30',
    '1985-06-30',
    '1987-12-31',
    '1989-12-31',
    '1990-12-31',
    '1992-06-30',
    '1993-06-30',
    '1994-06-30',
    '1995-12-31',
    '1997-06-30',
    '1998-12-31',
    '2005-12-31',
    '2008-12-31',
    '2012-06-30',
    '2015-06-30',
    '2016-12-31',
  ] as const;

  test('strict RFC3339 parser accepts the independent UTC leap-date list and offset spellings', () => {
    expect(RFC3339_KNOWN_LEAP_DATES_FOR_TEST).toHaveLength(27);

    for (const date of RFC3339_KNOWN_LEAP_DATES_FOR_TEST) {
      const utc = `${date}T23:59:60Z`;
      expect(
        expectReturned(() => isStrictRfc3339Timestamp(utc)),
        utc,
      ).toBe(true);
      expect(
        expectReturned(() => rfc3339TimestampMilliseconds(utc)),
        utc,
      ).not.toBeNull();
    }

    const equivalentInstants = [
      ['1990-12-31T15:59:60-08:00', '1990-12-31T23:59:60Z'],
      ['2017-01-01T00:59:60+01:00', '2016-12-31T23:59:60Z'],
      ['2016-12-31T18:59:60-05:00', '2016-12-31T23:59:60Z'],
      ['2016-12-31T23:59:60+00:00', '2016-12-31T23:59:60Z'],
      ['2016-12-31T23:59:60-00:00', '2016-12-31T23:59:60Z'],
      ['1990-12-31T15:59:60.123456789-08:00', '1990-12-31T23:59:60.123456789Z'],
      ['2017-01-01T00:59:60.5+01:00', '2016-12-31T23:59:60.5Z'],
    ] as const;
    for (const [local, utc] of equivalentInstants) {
      expect(
        expectReturned(() => isStrictRfc3339Timestamp(local)),
        local,
      ).toBe(true);
      expect(
        expectReturned(() => rfc3339TimestampMilliseconds(local)),
        local,
      ).toBe(expectReturned(() => rfc3339TimestampMilliseconds(utc)));
    }

    // -00:00 has zero numeric offset for instant computation, but its unknown
    // local-offset provenance remains in the original evidence string.
    expect(expectReturned(() => rfc3339TimestampMilliseconds(equivalentInstants[3]![0]))).toBe(
      expectReturned(() => rfc3339TimestampMilliseconds(equivalentInstants[3]![1])),
    );

    const rejected = [
      '2016-12-31T23:58:60Z', // wrong UTC minute
      '2016-12-31T22:59:60Z', // wrong UTC hour
      '2016-12-30T23:59:60Z', // not a UTC leap date
      '2017-01-01T00:58:60+01:00', // positive-offset minute relation is wrong
      '2017-01-02T00:59:60+01:00', // positive-offset local date is wrong
      '2016-12-31T18:58:60-05:00', // negative-offset minute relation is wrong
      '2017-01-01T18:59:60-05:00', // negative-offset local date is wrong
      '2016-12-31T23:59:60+00:01', // zero-hour positive offset maps to next date
      '2016-12-31T23:59:60+24:00', // malformed offset
      '2016-12-31T23:59:60Z\n',
      '2016-12-31T23:59:60Z\r',
      '2016-12-31T23:59:60Z\r\n',
      '2016-12-31T23:59:60Z\u2028',
      '2016-12-31T23:59:60Z\u2029',
    ];
    for (const value of rejected) {
      expect(
        expectReturned(() => rfc3339TimestampMilliseconds(value)),
        value,
      ).toBeNull();
      expect(
        expectReturned(() => isStrictRfc3339Timestamp(value)),
        value,
      ).toBe(false);
    }
  });

  test('all sixteen published timestamp patterns agree with independent offset arithmetic', () => {
    const schemaSpecs = [
      ['research-synthesis.v1.schema.json', ['created_at', 'updated_at']],
      ['research-result.v1.schema.json', ['retrieved_at', 'created_at', 'updated_at']],
      ['instruction-registry.v1.schema.json', ['updated_at']],
      ['instruction-activation-use.v1.schema.json', ['timestamp']],
      ['governed-write.v1.schema.json', ['issued_at', 'approved_at', 'expires_at', 'verified_at']],
      ['governed-write-intent.v1.schema.json', ['approved_at', 'expires_at']],
      ['decision-record.v1.schema.json', ['created_at', 'updated_at']],
      ['agent-runtime-config.v1.schema.json', ['updated_at']],
    ] as const;
    const leaves: Array<{ readonly file: string; readonly key: string; readonly pattern: string }> = [];
    const collect = (value: unknown, file: string, path: readonly string[]): void => {
      if (Array.isArray(value)) {
        value.forEach((entry, index) => collect(entry, file, [...path, String(index)]));
        return;
      }
      if (!isPlainRecord(value)) return;
      if (typeof value.pattern === 'string' && value.pattern.includes('T') && value.pattern.includes(':60')) {
        leaves.push({ file, key: path.at(-1) ?? '', pattern: value.pattern });
      }
      for (const [key, child] of Object.entries(value)) collect(child, file, [...path, key]);
    };
    for (const [file, expectedKeys] of schemaSpecs) {
      collect(JSON.parse(readFileSync(path.join(packageRoot, 'schemas', file), 'utf8')), file, []);
      expect(
        leaves
          .filter((leaf) => leaf.file === file)
          .map((leaf) => leaf.key)
          .sort(),
      ).toEqual([...expectedKeys].sort());
    }
    expect(leaves).toHaveLength(16);
    const generated = expectReturned(() => rfc3339LeapSecondAlternation(RFC3339_KNOWN_LEAP_DATES_FOR_TEST));
    for (const leaf of leaves) expect(leaf.pattern.includes(generated), `${leaf.file}:${leaf.key}`).toBe(true);
    const patterns = [...new Set(leaves.map((leaf) => leaf.pattern))].map((pattern) => new RegExp(pattern));
    const check = (value: string, expected: number | null): void => {
      expect(
        expectReturned(() => rfc3339TimestampMilliseconds(value)),
        value,
      ).toBe(expected);
      for (const pattern of patterns) expect(pattern.test(value), value).toBe(expected !== null);
    };
    for (const date of RFC3339_KNOWN_LEAP_DATES_FOR_TEST) {
      const [year, month, day] = date.split('-').map(Number);
      const expected = Date.UTC(year!, month! - 1, day!, 23, 59, 59) + 1_123;
      for (const zone of ['Z', '+00:00', '-00:00']) check(`${date}T23:59:60.123456789${zone}`, expected);
    }
    const utcMinute = Date.UTC(2016, 11, 31, 23, 59);
    for (let offset = -1439; offset <= 1439; offset++) {
      const absolute = Math.abs(offset);
      const zone = `${offset < 0 ? '-' : '+'}${String(Math.floor(absolute / 60)).padStart(2, '0')}:${String(absolute % 60).padStart(2, '0')}`;
      // Independent instant arithmetic produces local wall time without Date.parse.
      const localMinute = new Date(utcMinute + offset * 60_000).toISOString().slice(0, 16);
      check(`${localMinute}:60.123456789${zone}`, Date.UTC(2017, 0, 1) + 123);
      if ([-1439, -330, -1, 1, 90, 1439].includes(offset)) {
        for (const drift of [60_000, 3_600_000, 86_400_000]) {
          const wrongMinute = new Date(utcMinute + offset * 60_000 + drift).toISOString().slice(0, 16);
          check(`${wrongMinute}:60.123456789${zone}`, null);
        }
      }
    }
    for (const value of [
      '2016-12-31T23:59:60+24:00',
      '2016-12-31T23:59:60.1234567890Z',
      '1900-02-29T00:00:00Z',
      ...['\n', '\r', '\r\n', '\u2028', '\u2029'].map((suffix) => '2016-12-31T23:59:60Z' + suffix),
    ])
      check(value, null);
    check('2000-02-29T00:00:00Z', Date.UTC(2000, 1, 29));
    check('0000-02-29T00:00:00Z', -62_162_121_600_000);
  });

  test('timestamp pattern regeneration preserves ordinary branches and is idempotent', () => {
    const dates = `(?:${RFC3339_KNOWN_LEAP_DATES_FOR_TEST.join('|')})`;
    const time = String.raw`T23:59:60(?:\.\d{1,9})?(?:Z|\+00:00)`;
    const fixture = {
      plain: { pattern: `^(?:ordinary|${dates}${time})$` },
      nested: [{ pattern: `^(?:ordinary|(?:${dates})${time})$` }, null, 'text'],
      untouched: { pattern: '^[a-z]+$', maximum: 10 },
    };
    const replacements = expectReturned(() => updateLeapSecondSchemaPatterns(fixture));
    expect(replacements).toHaveLength(2);
    const expected = `^(?:ordinary|${rfc3339LeapSecondAlternation(RFC3339_KNOWN_LEAP_DATES_FOR_TEST)})$`;
    expect(fixture.plain.pattern).toBe(expected);
    expect(fixture.nested[0]).toEqual({ pattern: expected });
    expect(fixture.nested.slice(1)).toEqual([null, 'text']);
    expect(fixture.untouched).toEqual({ pattern: '^[a-z]+$', maximum: 10 });
    expect(expectReturned(() => updateLeapSecondSchemaPatterns(fixture))).toEqual([]);
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

  test('governed write builders bind and validate all evidence', () => {
    const fixture = createGovernedEvidenceFixture(project, Date.now(), expectReturned);
    expect(fixture.operationHash).toMatch(/^[a-f0-9]{64}$/);
    assert.ok(fixture.receipt);
    expect(fixture.receipt).toMatchObject({ schema: 'AuthorizationReceipt/v1', operation_hash: fixture.operationHash });
    const { approval, intent, operationHash, receipt } = fixture;
    expect(receipt.operation_hash).toBe(operationHash);
    const request = expectReturned(() => buildGovernedWriteRequest(intent, receipt, approval));
    assert.ok(isPlainRecord(request));
    expect(request.operation).toBe(intent.operation);
    expect(request.payload).toEqual(intent.payload);
    assert.ok(isPlainRecord(request.authorization));
    assert.ok(isPlainRecord(request.approval));
    const unchangedAuthorization: Partial<typeof request.authorization> = {};
    const unchangedApproval: Partial<typeof request.approval> = {};
    expect(expectReturned(() => validateGovernedWriteRequest(request))).toBe(request);
    expect(expectReturned(() => computeGovernedWriteRequestDigest(request))).toMatch(/^[a-f0-9]{64}$/);
    expect(() => validateGovernedWriteRequest({})).toThrow(
      "governed write request rejected:  must have required property 'operation';  must have required property 'payload';  must have required property 'authorization';  must have required property 'approval'",
    );
    expect(() => validateAuthorizationRequest({})).toThrow(
      "authorization request rejected:  must have required property 'principal';  must have required property 'role';  must have required property 'action';  must have required property 'tenant';  must have required property 'project';  must have required property 'resourceTenant';  must have required property 'resourceProject';  must have required property 'registryHash'",
    );
    expect(() => validateGovernedWriteRequest({ ...request, payload: 1n })).toThrow(/non-canonical/);
    const directReceipt = expectReturned(() =>
      toAuthorizationReceipt(fixture.authorizationRequest(operationHash), 'decision-1', approval.approved_at),
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
    expect(
      expectReturned(() =>
        toAuthorizationReceipt(fixture.authorizationRequest(), 'read-decision', new Date().toISOString()),
      ),
    ).toBeUndefined();
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
      const nextHash = expectReturned(() =>
        computeWriteOperationHash({
          operation: request.operation,
          payload: request.payload,
          principal: authorization.principal,
          role: authorization.role,
          tenant: authorization.tenant,
          project: authorization.project,
          resourceTenant: authorization.resourceTenant,
          resourceProject: authorization.resourceProject,
          registryHash: authorization.registry_hash,
        }),
      );
      expect(nextHash).toMatch(/^[a-f0-9]{64}$/);
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
});
