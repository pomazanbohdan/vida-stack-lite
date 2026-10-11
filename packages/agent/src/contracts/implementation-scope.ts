import Ajv2020 from 'ajv/dist/2020.js';
import type { ValidateFunction } from 'ajv';
import scopeSchema from '../../schemas/implementation-scope.v1.schema.json' with { type: 'json' };

const Ajv = Ajv2020 as unknown as new (options: { strict: boolean; allErrors: boolean }) => {
  compile(schema: object): ValidateFunction<unknown>;
};

/** Compile caller-selected schema bytes without replacing them with the bundled definition. */
export function compileImplementationScopeValidator(schema: object): ValidateFunction<unknown> {
  return new Ajv({ strict: true, allErrors: true }).compile(schema);
}

/** One shared validator for the immutable bundled implementation-scope contract. */
export const validateImplementationScope = compileImplementationScopeValidator(scopeSchema);
