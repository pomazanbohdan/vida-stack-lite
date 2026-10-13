import Ajv2020 from 'ajv/dist/2020.js';
import type { ValidateFunction } from 'ajv';
import type { WorkState } from '../host-state.ts';
import workSchema from '../../schemas/work-state.v1.schema.json' with { type: 'json' };

const Constructor = Ajv2020 as unknown as new (options: object) => {
  compile<T>(schema: object): ValidateFunction<T>;
};
const capturedSchema = structuredClone(workSchema);
let compiled: ValidateFunction<WorkState> | undefined;

/** Shared schema predicate; callers retain their binding, CAS and authority checks. */
export function validateWorkState(value: unknown): value is WorkState {
  return (compiled ??= new Constructor({ allErrors: true }).compile<WorkState>(capturedSchema))(value);
}
