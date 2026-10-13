import Ajv2020 from 'ajv/dist/2020.js';
import schema from '../../schemas/acceptance-manifest.v1.schema.json' with { type: 'json' };

const Constructor = Ajv2020 as unknown as new (options: object) => {
  compile(schema: object): (value: unknown) => boolean;
};
const capturedSchema = structuredClone(schema);
let compiled: ((value: unknown) => boolean) | undefined;

/** Structural predicate only; consumers retain identity, ownership and authority checks. */
export function validateAcceptanceManifestSchema(value: unknown): boolean {
  return (compiled ??= new Constructor({ strict: true, allErrors: true }).compile(capturedSchema))(value);
}
