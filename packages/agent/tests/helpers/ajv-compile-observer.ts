import { spyOn } from 'bun:test';
import { Ajv2020 } from 'ajv/dist/2020.js';

/** Observes real compiles without changing their receiver, arguments or result. */
export function observeAjvCompiles(select: (schema: unknown) => boolean) {
  const schemas: unknown[] = [];
  const original: unknown = Reflect.get(Ajv2020.prototype, 'compile');
  if (typeof original !== 'function') throw Error('Ajv compile method is unavailable');
  const originalCompile = original as Ajv2020['compile'];
  const spy = spyOn(Ajv2020.prototype, 'compile');
  spy.mockImplementation(
    new Proxy(originalCompile, {
      apply(target, receiver, args) {
        const schema: unknown = args[0];
        if (select(schema)) schemas.push(schema);
        const compiled: unknown = Reflect.apply(target, receiver, args);
        if (typeof compiled !== 'function') throw Error('Ajv did not return a validator');
        return compiled;
      },
    }),
  );
  return { schemas: schemas as readonly unknown[], restore: () => spy.mockRestore() };
}

export function observeWorkStateSchemaCompiles() {
  return observeAjvCompiles((schema) => {
    if (typeof schema !== 'object' || schema === null || !('properties' in schema)) return false;
    const properties = schema.properties;
    if (typeof properties !== 'object' || properties === null || !('schema' in properties)) return false;
    const tag = properties.schema;
    return typeof tag === 'object' && tag !== null && 'const' in tag && tag.const === 'WorkState/v1';
  });
}
