import Ajv2020 from 'ajv/dist/2020.js';
import type { ValidateFunction } from 'ajv';
import initializationSchema from '../../schemas/runtime-initialization.v1.schema.json' with { type: 'json' };
import { freezeJsonValue } from '../contracts/public-ingress.js';
import { runtimePackageAccess, snapshotRuntimeConfig } from './runtime-config.js';
import type { SafeRepositoryAccess } from './safe-repository-access.js';
import { RUNTIME_INITIALIZATION_PATH } from './project-paths.js';

export interface RuntimeInitializationReceipt {
  readonly schema: 'RuntimeInitialization/v1';
  readonly version: 1;
  readonly provenance?: 'generated' | 'adopted_existing';
  readonly repository_id: string;
  readonly project_ids: readonly string[];
  readonly integrations_digest: string;
  readonly workspace_id: string;
  readonly workspace_binding_status: 'pending' | 'bound';
  readonly bundle: string;
  readonly config_digest: string;
  readonly schema_sha256: string;
  readonly templates: readonly {
    readonly template: string;
    readonly template_sha256: string;
    readonly output: string;
    readonly output_sha256: string;
  }[];
  readonly created_at: string;
}

type AjvConstructor = new (options: Record<string, unknown>) => {
  compile<T>(schema: object): ValidateFunction<T>;
};
const Constructor = Ajv2020 as unknown as AjvConstructor;
let receiptValidator: ValidateFunction<RuntimeInitializationReceipt> | undefined;
let checkedSchemaText: string | undefined;

/** A selected bundle cannot bind a different contract to the current-format validator. */
function assertRuntimeInitializationSchema(rawSchema: string): void {
  if (rawSchema === checkedSchemaText) return;
  const schema: unknown = JSON.parse(rawSchema);
  if (!Bun.deepEquals(schema, initializationSchema, true))
    throw new Error('Initialization schema is not supported by this runtime; use the matching bundle upgrade.');
  checkedSchemaText = rawSchema;
}

/** Current-format data validation only; it does not bind or authorize a workspace. */
export function validateRuntimeInitializationReceipt(value: unknown, rawSchema: string): RuntimeInitializationReceipt {
  assertRuntimeInitializationSchema(rawSchema);
  const receipt = snapshotRuntimeConfig(value);
  receiptValidator ??= new Constructor({ strict: true, allErrors: false, ownProperties: true }).compile(
    initializationSchema,
  );
  if (!receiptValidator(receipt)) throw new Error('Initialization receipt does not satisfy current v1 schema.');
  if (receipt.schema_sha256 !== new Bun.CryptoHasher('sha256').update(rawSchema).digest('hex'))
    throw new Error('Initialization receipt schema digest is stale.');
  return freezeJsonValue(receipt);
}

/** Read through the same containment boundary as configuration and retain exact CAS bytes. */
export function readRuntimeInitializationReceipt(access: SafeRepositoryAccess): {
  readonly receipt: RuntimeInitializationReceipt;
  readonly bytes: Buffer;
} {
  const bytes = access.readBytes(RUNTIME_INITIALIZATION_PATH, 'runtime initialization receipt');
  const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  const value: unknown = JSON.parse(text);
  const schema = runtimePackageAccess().readText(
    'schemas/runtime-initialization.v1.schema.json',
    'initialization schema',
  );
  return { receipt: validateRuntimeInitializationReceipt(value, schema), bytes };
}
