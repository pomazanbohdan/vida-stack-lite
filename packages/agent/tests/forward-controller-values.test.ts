import assert from 'node:assert/strict';
import { test } from 'bun:test';
import { errorMessage, isRecord, prettyJSON, sha256 } from '../src/contracts/forward-controller-values.js';
import { expectReturned } from './helpers/expect-rejection.ts';

test('sha256 hashes UTF-8 strings and raw byte arrays', () => {
  assert.equal(
    expectReturned(() => sha256('café 🌱')),
    'ef245b5b504b94982e0a48f6f38390132f01fc74bb5230055adeb9d6e026986f',
  );
  assert.equal(
    expectReturned(() => sha256(new Uint8Array([0, 255, 1, 128]))),
    'edc81f7e4ee358fb91e94bd9bd74079c3dcba36f40f2c8a36e7ae0567afecc8f',
  );
});

test('sha256 hashes only the visible bytes of a typed-array view', () => {
  const backing = new Uint8Array([9, 0, 255, 1, 128, 9]);
  assert.equal(
    expectReturned(() => sha256(backing.subarray(1, 5))),
    'edc81f7e4ee358fb91e94bd9bd74079c3dcba36f40f2c8a36e7ae0567afecc8f',
  );
});

test('prettyJSON preserves ordinary JSON formatting and serialization outcomes', () => {
  assert.equal(
    expectReturned(() => prettyJSON({ text: 'é', nested: [1, true] })).toString(),
    '{\n  "text": "é",\n  "nested": [\n    1,\n    true\n  ]\n}\n',
  );
  assert.equal(expectReturned(() => prettyJSON(undefined)).toString(), 'undefined\n');
  const serializationError = new Error('serialization failed');
  assert.throws(
    () =>
      prettyJSON({
        toJSON: () => {
          throw serializationError;
        },
      }),
    (error) => error === serializationError,
  );
});

test('isRecord retains the generic non-null non-array object predicate', () => {
  for (const value of [{}, Object.create(null), new Date(), new Uint8Array([1]), new (class {})()])
    assert.equal(
      expectReturned(() => isRecord(value)),
      true,
    );
  for (const value of [null, undefined, [], 'record', 1, true])
    assert.equal(
      expectReturned(() => isRecord(value)),
      false,
    );
});

test('errorMessage preserves Error.message and String conversion for other values', () => {
  const emptyError = new Error();
  assert.equal(Object.getOwnPropertyDescriptor(emptyError, 'message'), undefined);
  assert.equal(
    expectReturned(() => errorMessage(emptyError)),
    '',
  );
  const error = new Error('exact message');
  assert.equal(
    expectReturned(() => errorMessage(error)),
    error.message,
  );
  assert.equal(
    expectReturned(() => errorMessage({ toString: () => 'custom value' })),
    'custom value',
  );
  assert.equal(
    expectReturned(() => errorMessage(Symbol('value'))),
    'Symbol(value)',
  );
});

test('errorMessage returns a stable fallback when reflection or coercion fails', () => {
  const fallback = '[unprintable thrown value]';

  assert.equal(
    expectReturned(() => errorMessage(Object.create(null))),
    fallback,
  );

  let getterCalls = 0;
  const getterError = new Error();
  Object.defineProperty(getterError, 'message', {
    configurable: true,
    get() {
      getterCalls += 1;
      throw new Error('message getter ran');
    },
  });
  assert.equal(
    expectReturned(() => errorMessage(getterError)),
    fallback,
  );
  assert.equal(getterCalls, 0);

  const nonStringMessage = new Error();
  Object.defineProperty(nonStringMessage, 'message', { configurable: true, value: 42 });
  assert.equal(
    expectReturned(() => errorMessage(nonStringMessage)),
    fallback,
  );

  let descriptorCalls = 0;
  const descriptorError = new Proxy(new Error('hidden'), {
    getOwnPropertyDescriptor(target, property) {
      if (property === 'message') {
        descriptorCalls += 1;
        throw new Error('descriptor trap failed');
      }
      return Reflect.getOwnPropertyDescriptor(target, property);
    },
  });
  assert.equal(
    expectReturned(() => errorMessage(descriptorError)),
    fallback,
  );
  assert.equal(descriptorCalls, 1);

  const revocable = Proxy.revocable(new Error('revoked'), {});
  revocable.revoke();
  assert.equal(
    expectReturned(() => errorMessage(revocable.proxy)),
    fallback,
  );

  let coercionCalls = 0;
  const throwingCoercion = {
    toString() {
      coercionCalls += 1;
      throw new Error('coercion failed');
    },
  };
  assert.equal(
    expectReturned(() => errorMessage(throwingCoercion)),
    fallback,
  );
  assert.equal(coercionCalls, 1);
});
