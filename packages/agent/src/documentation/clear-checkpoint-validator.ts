import Ajv2020 from 'ajv/dist/2020.js';
import type { ValidateFunction } from 'ajv';
import schema from '../../schemas/documentation-clear-checkpoint.v1.schema.json' with { type: 'json' };

const Constructor = Ajv2020 as unknown as new (options: object) => {
  compile<T>(schema: object): ValidateFunction<T>;
};
const capturedSchema = structuredClone(schema);
let compiled: ValidateFunction<Record<string, unknown>> | undefined;

/** Callers separately require the expected digest, phase, status and ownership. */
export function validateDocumentationClearCheckpointSchema(value: unknown): value is Record<string, unknown> {
  return (compiled ??= new Constructor({ strict: true, allErrors: true }).compile<Record<string, unknown>>(
    capturedSchema,
  ))(value);
}
