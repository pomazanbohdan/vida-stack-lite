import { z } from 'zod';
import { canonicalJson, freezeJsonValue } from '../contracts/public-ingress.js';
import {
  PROJECT_CONFIGURATION_PATHS,
  PROJECT_WORKSPACE_DATABASE_PATH,
  PROJECT_INITIALIZATION_PATH,
} from './project-paths.js';
import type { SafeRepositoryAccess } from './safe-repository-access.js';

const hash = z.string().regex(/^[a-f0-9]{64}$/u);
const slug = z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/u);
const artifactPath = z
  .string()
  .min(1)
  .refine(
    (value) =>
      !value.includes('\\') &&
      !value.startsWith('/') &&
      value.split('/').every((part) => part !== '' && part !== '.' && part !== '..'),
  );
const projectInitializationSchema = z.strictObject({
  schema: z.literal('RuntimeInitialization/v2'),
  version: z.literal(2),
  provenance: z.literal('project-upgrade'),
  repository_id: slug,
  project_ids: z.array(slug).min(1).max(128),
  workspace_id: hash,
  workspace_binding_status: z.enum(['pending', 'bound']),
  bundle: z.string().min(1),
  bundle_digest: hash,
  config_digest: hash,
  input_digest: hash,
  current_config_digest: hash,
  current_input_digest: hash,
  configuration_rebind_id: z
    .string()
    .regex(/^[a-z0-9][a-z0-9._-]{0,79}$/u)
    .nullable(),
  operation_id: z.string().regex(/^[a-z0-9][a-z0-9._-]{0,79}$/u),
  database_path: z.literal(PROJECT_WORKSPACE_DATABASE_PATH),
  configuration_inputs: z.strictObject({
    project: z.literal(PROJECT_CONFIGURATION_PATHS.project),
    agents: z.literal(PROJECT_CONFIGURATION_PATHS.agents),
    flows: z.literal(PROJECT_CONFIGURATION_PATHS.flows),
  }),
  prepared_artifacts: z
    .array(z.strictObject({ path: artifactPath, sha256: hash }))
    .min(8)
    .max(256),
  created_at: z.iso.datetime({ precision: 3 }),
});
export type ProjectInitializationReceipt = z.infer<typeof projectInitializationSchema>;

/** Current project-format data only. Host binding and release are separate trusted transitions. */
export function validateProjectInitializationReceipt(value: unknown): ProjectInitializationReceipt {
  const snapshot: unknown = JSON.parse(canonicalJson(value));
  const receipt = projectInitializationSchema.parse(snapshot);
  if (!receipt.project_ids.every((id, index) => index === 0 || receipt.project_ids[index - 1]! < id))
    throw new Error('Initialization project identities must be sorted and unique.');
  if (new Set(receipt.prepared_artifacts.map((entry) => entry.path)).size !== receipt.prepared_artifacts.length)
    throw new Error('Initialization artifact identities must be unique.');
  return freezeJsonValue(receipt);
}

/** Fixed-format existing-only read, retaining exact bytes for the Host's binding CAS. */
export function readProjectInitializationReceipt(access: SafeRepositoryAccess): {
  readonly receipt: ProjectInitializationReceipt;
  readonly bytes: Buffer;
} {
  const bytes = access.readBytes(PROJECT_INITIALIZATION_PATH, 'project initialization receipt');
  const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  if (!Buffer.from(text, 'utf8').equals(bytes)) throw new Error('Project initialization UTF-8 differs.');
  const value: unknown = JSON.parse(text);
  return { receipt: validateProjectInitializationReceipt(value), bytes };
}
