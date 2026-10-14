import assert from 'node:assert/strict';
import { test } from 'bun:test';
import { errorMessage, isRecord, prettyJSON, sha256 } from '../src/contracts/forward-controller-values.js';

test('sha256 hashes UTF-8 strings and raw byte arrays', () => {
  assert.equal(sha256('café 🌱'), 'ef245b5b504b94982e0a48f6f38390132f01fc74bb5230055adeb9d6e026986f');
  assert.equal(
    sha256(new Uint8Array([0, 255, 1, 128])),
    'edc81f7e4ee358fb91e94bd9bd74079c3dcba36f40f2c8a36e7ae0567afecc8f',
  );
});

test('prettyJSON preserves ordinary JSON formatting and serialization outcomes', () => {
  assert.equal(
    prettyJSON({ text: 'é', nested: [1, true] }).toString(),
    '{\n  "text": "é",\n  "nested": [\n    1,\n    true\n  ]\n}\n',
  );
  assert.equal(prettyJSON(undefined).toString(), 'undefined\n');
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
    assert.equal(isRecord(value), true);
  for (const value of [null, undefined, [], 'record', 1, true]) assert.equal(isRecord(value), false);
});

test('errorMessage preserves Error.message and String conversion for other values', () => {
  const error = new Error('exact message');
  assert.equal(errorMessage(error), error.message);
  assert.equal(errorMessage({ toString: () => 'custom value' }), 'custom value');
  assert.equal(errorMessage(Symbol('value')), 'Symbol(value)');
});
