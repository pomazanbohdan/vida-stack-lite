import assert from 'node:assert/strict';
import { spyOn, test } from 'bun:test';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { randomUUID } from 'node:crypto';

const formatterSchemaIds = new Set([
  'https://vida-agent.invalid/schemas/authorization-request.v1.schema.json',
  'https://vida-agent.invalid/schemas/governed-write-intent.v1.schema.json',
  'https://vida-agent.invalid/schemas/governed-write.v1.schema.json',
]);

test('public ingress retains diagnostic fallbacks after a real Ajv rejection', async () => {
  const original: unknown = Reflect.get(Ajv2020.prototype, 'compile');
  if (typeof original !== 'function') throw new Error('Ajv compile method is unavailable');
  const originalCompile = original as Ajv2020['compile'];
  const compiledSchemaIds = new Set<string>();
  const rejectedSchemaIds = new Set<string>();
  const compileSpy = spyOn(Ajv2020.prototype, 'compile');
  compileSpy.mockImplementation(
    new Proxy(originalCompile, {
      apply(target, receiver, args) {
        const schema: unknown = args[0];
        const compiled: unknown = Reflect.apply(target, receiver, args);
        if (
          typeof schema !== 'object' ||
          schema === null ||
          !('$id' in schema) ||
          typeof schema.$id !== 'string' ||
          !formatterSchemaIds.has(schema.$id)
        )
          return compiled;
        const schemaId = schema.$id;
        compiledSchemaIds.add(schemaId);
        if (typeof compiled !== 'function') throw new Error('Ajv did not return a validator');
        let rejected = false;
        return new Proxy(compiled, {
          apply(validator, validatorReceiver, validatorArgs) {
            const valid: unknown = Reflect.apply(validator, validatorReceiver, validatorArgs);
            if (typeof valid !== 'boolean') throw new Error('Expected synchronous schema validation');
            rejected = valid === false;
            if (rejected) {
              const errors: unknown = Reflect.get(validator, 'errors');
              if (!Array.isArray(errors) || errors.length === 0)
                throw new Error('Real schema rejection had no diagnostics');
              rejectedSchemaIds.add(schemaId);
            }
            return valid;
          },
          get(validator, key, validatorReceiver) {
            // Dependency-fault data, not a claimed valid ErrorObject: instancePath
            // is required by Ajv; message is optional. Keep real errors untouched.
            if (key === 'errors' && rejected) return [{ keyword: 'fault', schemaPath: '#', params: {} }];
            const value: unknown = Reflect.get(validator, key, validatorReceiver);
            return value;
          },
        });
      },
    }),
  );
  let faultIngress: typeof import('../src/contracts/public-ingress.ts') | undefined;
  try {
    faultIngress = (await import(
      String(`../src/contracts/public-ingress.ts?diagnostic-fault=${randomUUID()}`)
    )) as typeof import('../src/contracts/public-ingress.ts');
  } finally {
    compileSpy.mockRestore();
  }
  const restoredCompile: unknown = Reflect.get(Ajv2020.prototype, 'compile');
  assert.equal(restoredCompile, originalCompile);
  assert.deepEqual(compiledSchemaIds, formatterSchemaIds);
  assert.ok(faultIngress);
  const ingress = faultIngress;
  assert.throws(() => ingress.validateAuthorizationRequest({}), {
    message: 'authorization request rejected: / invalid',
  });
  assert.throws(() => ingress.validateGovernedWriteIntent({}), {
    message: 'governed write intent rejected: / invalid',
  });
  assert.deepEqual(rejectedSchemaIds, new Set([...formatterSchemaIds].slice(0, 2)));

  const normalIngress = (await import(
    String(`../src/contracts/public-ingress.ts?normal-diagnostic=${randomUUID()}`)
  )) as typeof import('../src/contracts/public-ingress.ts');
  assert.throws(
    () => normalIngress.validateAuthorizationRequest({}),
    (error: unknown) =>
      error instanceof Error &&
      error.message.startsWith('authorization request rejected:') &&
      error.message.includes("must have required property 'principal'"),
  );
  const ordinaryValidator = new Ajv2020({ allErrors: true }).compile({ type: 'object', required: ['probe'] });
  assert.equal(ordinaryValidator({}), false);
  assert.equal(typeof ordinaryValidator.errors?.[0]?.instancePath, 'string');
  assert.equal(typeof ordinaryValidator.errors?.[0]?.message, 'string');
});
