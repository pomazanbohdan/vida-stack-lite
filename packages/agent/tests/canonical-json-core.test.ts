import { createHash } from 'node:crypto';
import { describe, expect, test } from 'bun:test';
import {
  MAX_CANONICAL_BYTES,
  MAX_CANONICAL_DEPTH,
  MAX_CANONICAL_NODES,
  assertCanonicalJsonValue,
  canonicalJson,
  canonicalJsonAtDepth,
  canonicalJsonComponents,
  canonicalJsonDigest,
  optionalCanonicalJsonDigest,
  canonicalJsonWithNodeLimit,
  isCanonicalJsonNumber,
  isPlainRecord,
} from '../src/contracts/canonical-json-core.ts';

function expectCanonicalFailure(operation: () => unknown): void {
  expect(operation).toThrow();
}

describe('canonical JSON core contract', () => {
  test('canonicalizes accepted JSON values and hashes the exact wire bytes', () => {
    const value = { z: [true, null, 'é'], a: { second: 2, first: 1 } };
    const encoded = '{"a":{"first":1,"second":2},"z":[true,null,"é"]}';
    expect(canonicalJson(value)).toBe(encoded);
    expect(canonicalJsonDigest(value)).toBe(createHash('sha256').update(encoded).digest('hex'));
    expect(canonicalJson({ a: 1, b: 2 })).toBe(canonicalJson({ b: 2, a: 1 }));
    expectCanonicalFailure(() => canonicalJson(-0));
    expect(canonicalJsonAtDepth({ item: 1 }, 8)).toBe('{"item":1}');
  });

  test('accepts safe canonical numbers and rejects negative zero, unsafe integers, and non-finite values', () => {
    for (const value of [0, 1, -1, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER, 0.25]) {
      expect(isCanonicalJsonNumber(value)).toBe(true);
      expect(() => assertCanonicalJsonValue(value)).not.toThrow();
    }
    for (const value of [-0, Number.MAX_SAFE_INTEGER + 1, Number.MIN_SAFE_INTEGER - 1, NaN, Infinity, -Infinity]) {
      expect(isCanonicalJsonNumber(value)).toBe(false);
      expectCanonicalFailure(() => canonicalJson(value));
    }
    for (const value of [undefined, 1n, Symbol('value'), () => 1]) expectCanonicalFailure(() => canonicalJson(value));
  });

  test('maps absent optional values to null and hashes present canonical values', () => {
    for (const absent of [null, undefined, false, 0, -0, 0n, NaN, '']) {
      expect(optionalCanonicalJsonDigest(absent)).toBeNull();
    }
    expect(optionalCanonicalJsonDigest({ b: 2, a: 1 })).toBe(
      createHash('sha256').update('{"a":1,"b":2}').digest('hex'),
    );
    expect(optionalCanonicalJsonDigest([])).toBe(createHash('sha256').update('[]').digest('hex'));
    expect(optionalCanonicalJsonDigest(true)).toBe(createHash('sha256').update('true').digest('hex'));
    for (const invalid of [Infinity, 1n, Symbol('value'), new Date(0)]) {
      expectCanonicalFailure(() => optionalCanonicalJsonDigest(invalid));
    }
    let getterCalls = 0;
    const accessor = {};
    Object.defineProperty(accessor, 'value', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 1;
      },
    });
    expectCanonicalFailure(() => optionalCanonicalJsonDigest(accessor));
    expect(getterCalls).toBe(0);
  });

  test('accepts plain and null-prototype records only', () => {
    expect(isPlainRecord({})).toBe(true);
    expect(isPlainRecord(Object.assign(Object.create(null), { a: 1 }))).toBe(true);
    expect(isPlainRecord(null)).toBe(false);
    expect(isPlainRecord([])).toBe(false);
    expect(isPlainRecord(Object.create({ inherited: true }))).toBe(false);
    expectCanonicalFailure(() => canonicalJson(Object.create({ inherited: true })));
    expectCanonicalFailure(() => canonicalJson(new Date(0)));
  });

  test('rejects accessors, hidden properties, symbols, and unsafe toJSON hooks without invoking them', () => {
    let getterCalls = 0;
    let toJSONCalls = 0;
    const accessor = {};
    Object.defineProperty(accessor, 'value', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 1;
      },
    });
    expectCanonicalFailure(() => canonicalJson(accessor));
    const hidden = {};
    Object.defineProperty(hidden, 'value', { enumerable: false, value: 1 });
    expectCanonicalFailure(() => canonicalJson(hidden));
    const setterOnly = {};
    Object.defineProperty(setterOnly, 'value', {
      enumerable: true,
      set() {
        getterCalls += 1;
      },
    });
    expectCanonicalFailure(() => canonicalJson(setterOnly));
    const symbolKey = { [Symbol('private')]: 1 };
    expectCanonicalFailure(() => canonicalJson(symbolKey));
    const hookedAccessor = {};
    Object.defineProperty(hookedAccessor, 'toJSON', {
      get() {
        toJSONCalls += 1;
        return () => ({});
      },
    });
    expectCanonicalFailure(() => canonicalJson(hookedAccessor));
    const method = {
      toJSON() {
        toJSONCalls += 1;
        return {};
      },
    };
    expectCanonicalFailure(() => canonicalJson(method));
    const hookedArray = [1];
    Object.defineProperty(hookedArray, 'toJSON', {
      value() {
        toJSONCalls += 1;
        return [];
      },
    });
    expectCanonicalFailure(() => canonicalJson(hookedArray));
    const hookedComponentArray = [1];
    Object.defineProperty(hookedComponentArray, 'toJSON', {
      value() {
        toJSONCalls += 1;
        return [];
      },
    });
    expectCanonicalFailure(() => canonicalJsonComponents(hookedComponentArray, 0, () => '1'));
    const arrayAccessor: unknown[] = [];
    Object.defineProperty(arrayAccessor, '0', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 1;
      },
    });
    expectCanonicalFailure(() => canonicalJson(arrayAccessor));
    expect(getterCalls).toBe(0);
    expect(toJSONCalls).toBe(0);
  });

  test('rejects sparse arrays, extra array properties, and custom array prototypes', () => {
    const sparse: unknown[] = [];
    sparse.length = 1;
    expectCanonicalFailure(() => canonicalJson(sparse));
    const extra = [1];
    Object.defineProperty(extra, 'label', { enumerable: true, value: 'x' });
    expectCanonicalFailure(() => canonicalJson(extra));
    const customPrototype = [1];
    Object.setPrototypeOf(customPrototype, { custom: true });
    expectCanonicalFailure(() => canonicalJson(customPrototype));
    const symbolArray = [1];
    Object.defineProperty(symbolArray, Symbol('extra'), { enumerable: true, value: 2 });
    expectCanonicalFailure(() => canonicalJson(symbolArray));
    expect(canonicalJson([1, 2])).toBe('[1,2]');
  });

  test('rejects cyclic arrays and records while allowing shared acyclic children', () => {
    const cyclicArray: unknown[] = [];
    cyclicArray.push(cyclicArray);
    const cyclicRecord: Record<string, unknown> = {};
    cyclicRecord.self = cyclicRecord;
    expectCanonicalFailure(() => canonicalJson(cyclicArray));
    expectCanonicalFailure(() => canonicalJson(cyclicRecord));
    const shared = { value: 1 };
    expect(canonicalJson([shared, shared])).toBe('[{"value":1},{"value":1}]');
  });

  test('enforces safe root depths, depth limits, node limits, and byte bounds', () => {
    expect(canonicalJsonAtDepth(null, 0)).toBe('null');
    expect(canonicalJsonAtDepth(null, MAX_CANONICAL_DEPTH)).toBe('null');
    for (const depth of [-1, MAX_CANONICAL_DEPTH + 1, 0.5, Number.MAX_SAFE_INTEGER + 1]) {
      expectCanonicalFailure(() => canonicalJsonAtDepth(null, depth));
    }
    expect(canonicalJsonWithNodeLimit([1], 0, 2)).toBe('[1]');
    expectCanonicalFailure(() => canonicalJsonWithNodeLimit([1], 0, 1));
    expectCanonicalFailure(() => canonicalJsonWithNodeLimit(null, 0, 0));
    expectCanonicalFailure(() => canonicalJsonWithNodeLimit(null, 0, 1.5));
    expect(MAX_CANONICAL_NODES).toBe(10_000);
    expect(MAX_CANONICAL_BYTES).toBe(8_388_608);
    expect(() => assertCanonicalJsonValue('é')).not.toThrow();
    expect(() => assertCanonicalJsonValue('x'.repeat(MAX_CANONICAL_BYTES))).not.toThrow();
    expectCanonicalFailure(() => assertCanonicalJsonValue('x'.repeat(MAX_CANONICAL_BYTES + 1)));
    expectCanonicalFailure(() => assertCanonicalJsonValue({ ['k'.repeat(MAX_CANONICAL_BYTES + 1)]: null }));
    const tooDeep = { child: { child: null } };
    expectCanonicalFailure(() => canonicalJsonAtDepth(tooDeep, MAX_CANONICAL_DEPTH - 1));
    expect(canonicalJson(Array.from({ length: MAX_CANONICAL_NODES - 1 }, () => null)).length).toBeGreaterThan(0);
    expectCanonicalFailure(() => canonicalJson(Array.from({ length: MAX_CANONICAL_NODES }, () => null)));
  });

  test('composes sorted object and dense array envelopes with exact byte limits', () => {
    const encode = (child: unknown, depth: number, key: string): string => {
      expect(depth).toBe(4);
      expect(typeof key).toBe('string');
      return canonicalJson(child);
    };
    expect(canonicalJsonComponents({ z: 2, a: 1 }, 3, encode)).toBe('{"a":1,"z":2}');
    expect(canonicalJsonComponents([1, 2], 3, encode)).toBe('[1,2]');
    expect(canonicalJsonComponents({}, 0, () => '')).toBe('{}');
    expect(canonicalJson({})).toBe('{}');
    expectCanonicalFailure(() => canonicalJsonComponents(Object.create({ inherited: true }), 0, () => '1'));
    expect(canonicalJsonComponents([], 0, () => '')).toBe('[]');
    expect(canonicalJsonComponents({ x: 1 }, 0, () => '1', 7)).toBe('{"x":1}');
    expectCanonicalFailure(() => canonicalJsonComponents({ x: 1 }, 0, () => '1', 6));
    expectCanonicalFailure(() => canonicalJsonComponents([1, 2], 0, () => '1', 1));
    expectCanonicalFailure(() => canonicalJsonComponents('x', 0, () => 'x'));
    expectCanonicalFailure(() => canonicalJsonComponents({ [Symbol('s')]: 1 }, 0, () => '1'));
    expectCanonicalFailure(() =>
      canonicalJsonComponents(
        {
          get x() {
            throw new Error('getter ran');
          },
        },
        0,
        () => '1',
      ),
    );
    const componentWithCustomPrototype = [1];
    Object.setPrototypeOf(componentWithCustomPrototype, {});
    expectCanonicalFailure(() => canonicalJsonComponents(componentWithCustomPrototype, 0, () => '1'));
    const sparse: unknown[] = [];
    sparse.length = 1;
    expectCanonicalFailure(() => canonicalJsonComponents(sparse, 0, () => '1'));
    const hooked = {
      toJSON() {
        throw new Error('toJSON ran');
      },
    };
    expectCanonicalFailure(() => canonicalJsonComponents(hooked, 0, () => '1'));
  });

  test('preserves independent per-ingress node limits when composing large components', () => {
    const component = Array.from({ length: 5_000 }, () => null);
    const encoded = canonicalJsonComponents({ left: component, right: component }, 0, (child) => canonicalJson(child));
    expect(encoded.startsWith('{"left":[')).toBe(true);
    expect(encoded.endsWith(']}')).toBe(true);
    expect(canonicalJsonWithNodeLimit(component, 0, 5_001).length).toBeGreaterThan(5_000);
    expectCanonicalFailure(() => canonicalJsonWithNodeLimit(component, 0, 5_000));
  });
});
