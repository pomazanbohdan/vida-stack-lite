import { z } from 'zod';
import { canonicalJson, canonicalJsonDigest, freezeJsonValue, isPlainRecord } from '../contracts/public-ingress.js';
import type { ProjectUpgradeOperation } from './project-upgrade.js';
import {
  PROJECT_CONFIGURATION_PATHS,
  PROJECT_INITIALIZATION_PATH,
  PROJECT_WORKSPACE_DATABASE_PATH,
} from './project-paths.js';
import {
  validateProjectInitializationReceipt,
  type ProjectInitializationReceipt,
} from './project-initialization-record.js';

const hash = z.string().regex(/^[a-f0-9]{64}$/u);
const activationSchema = z.strictObject({
  schema: z.literal('VidaProjectActivation/v1'),
  revision: z.literal(1),
  operation_id: z.string().regex(/^[a-z0-9][a-z0-9._-]{0,79}$/u),
  workspace_id: hash,
  plan_digest: hash,
  bundle_digest: hash,
  input_digest: hash,
  config_digest: hash,
  receipt_identity_digest: hash,
  initialization_path: z.literal(PROJECT_INITIALIZATION_PATH),
  database_path: z.literal(PROJECT_WORKSPACE_DATABASE_PATH),
  maintenance_generation: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  configuration_inputs: z.strictObject({
    project: z.literal(PROJECT_CONFIGURATION_PATHS.project),
    agents: z.literal(PROJECT_CONFIGURATION_PATHS.agents),
    flows: z.literal(PROJECT_CONFIGURATION_PATHS.flows),
  }),
  outputs_digest: hash,
});
export type ProjectActivation = z.infer<typeof activationSchema>;
export interface ProjectActivationOutput {
  readonly path: string;
  readonly after: string;
  readonly sha256: string;
}

/** Host may bind pending to bound; every immutable initialization field remains covered. */
export function projectInitializationIdentityDigest(value: ProjectInitializationReceipt): string {
  const {
    workspace_binding_status: _bindingStatus,
    current_config_digest: _currentConfigDigest,
    current_input_digest: _currentInputDigest,
    configuration_rebind_id: _configurationRebindId,
    ...identity
  } = validateProjectInitializationReceipt(value);
  return canonicalJsonDigest(identity);
}

/** Activation is data. It does not grant a fence, admitted work, execution or Runtime acceptance. */
export function validateProjectActivation(value: unknown): ProjectActivation {
  const snapshot: unknown = JSON.parse(canonicalJson(value));
  return freezeJsonValue(activationSchema.parse(snapshot));
}

/** Ordinary readers require the owner's terminal retirement record, including after a lost move acknowledgement. */
export function assertCompletedProjectActivationHistory(
  historyBytes: string,
  activationBytes: string,
  activation: ProjectActivation,
  repositoryRoot: string,
): readonly ProjectActivationOutput[] {
  const history: unknown = JSON.parse(historyBytes);
  if (!isPlainRecord(history)) throw new Error('Project upgrade history is invalid.');
  const plan = assertHistoryPlan(history.plan, activation, repositoryRoot);
  if (
    history.schema !== 'VidaProjectUpgradeOperation/v1' ||
    history.phase !== 'completed' ||
    history.plan_digest !== activation.plan_digest ||
    history.activation !== activationBytes ||
    !Number.isSafeInteger(history.revision) ||
    typeof history.revision !== 'number' ||
    history.revision < 1
  )
    throw new Error('Project activation retirement is incomplete or belongs to another operation.');
  const outputs = historyOutputs(plan.files, activation);
  assertHistoryInitialization(outputs, activation);
  return outputs;
}

function assertHistoryPlan(
  value: unknown,
  activation: ProjectActivation,
  repositoryRoot: string,
): Record<string, unknown> {
  if (!isPlainRecord(value)) throw new Error('Project upgrade history plan is invalid.');
  if (
    value.schema !== 'VidaProjectUpgradePlan/v1' ||
    value.operation_id !== activation.operation_id ||
    value.repository_root !== repositoryRoot ||
    value.workspace_id !== activation.workspace_id ||
    value.bundle_digest !== activation.bundle_digest ||
    value.input_digest !== activation.input_digest ||
    canonicalJsonDigest(value) !== activation.plan_digest
  )
    throw new Error('Project activation history plan identity differs.');
  return value;
}

function historyOutputs(value: unknown, activation: ProjectActivation): readonly ProjectActivationOutput[] {
  if (!Array.isArray(value) || value.length < 1) throw new Error('Project activation output history is invalid.');
  const outputs = value.map((entry): ProjectActivationOutput => {
    if (!isPlainRecord(entry) || typeof entry.path !== 'string' || typeof entry.after !== 'string')
      throw new Error('Project activation output history is invalid.');
    return {
      path: entry.path,
      after: entry.after,
      sha256: new Bun.CryptoHasher('sha256').update(entry.after).digest('hex'),
    };
  });
  if (
    new Set(outputs.map((entry) => entry.path)).size !== outputs.length ||
    canonicalJsonDigest(outputs.map(({ path, sha256 }) => ({ path, sha256 }))) !== activation.outputs_digest
  )
    throw new Error('Project activation output history differs from its digest.');
  return outputs;
}

function assertHistoryInitialization(outputs: readonly ProjectActivationOutput[], activation: ProjectActivation): void {
  const entries = outputs.filter((entry) => entry.path === PROJECT_INITIALIZATION_PATH);
  if (entries.length !== 1) throw new Error('Project activation initialization history is missing or duplicated.');
  const receipt = validateProjectInitializationReceipt(JSON.parse(entries[0]!.after) as unknown);
  if (
    receipt.operation_id !== activation.operation_id ||
    receipt.bundle_digest !== activation.bundle_digest ||
    receipt.input_digest !== activation.input_digest ||
    receipt.config_digest !== activation.config_digest ||
    projectInitializationIdentityDigest(receipt) !== activation.receipt_identity_digest
  )
    throw new Error('Project activation does not match its initialization history.');
}

/** Deterministic afterimage for a fully prepared same-operation closure. The caller owns authorization. */
export function prepareProjectUpgradeActivation(
  operation: ProjectUpgradeOperation,
  maintenanceGeneration: number,
): string {
  const file = operation.plan.files.find((entry) => entry.path === PROJECT_INITIALIZATION_PATH);
  if (file === undefined) throw new Error('Upgrade initialization output is missing.');
  const value: unknown = JSON.parse(file.after);
  const receipt = validateProjectInitializationReceipt(value);
  const activation = validateProjectActivation({
    schema: 'VidaProjectActivation/v1',
    revision: 1,
    operation_id: operation.plan.operation_id,
    workspace_id: operation.plan.workspace_id,
    plan_digest: operation.plan_digest,
    bundle_digest: operation.plan.bundle_digest,
    input_digest: operation.plan.input_digest,
    config_digest: receipt.config_digest,
    receipt_identity_digest: projectInitializationIdentityDigest(receipt),
    initialization_path: PROJECT_INITIALIZATION_PATH,
    database_path: PROJECT_WORKSPACE_DATABASE_PATH,
    maintenance_generation: maintenanceGeneration,
    configuration_inputs: PROJECT_CONFIGURATION_PATHS,
    outputs_digest: canonicalJsonDigest(
      operation.plan.files.map((entry) => ({
        path: entry.path,
        sha256: new Bun.CryptoHasher('sha256').update(entry.after).digest('hex'),
      })),
    ),
  });
  return JSON.stringify(activation, null, 2) + '\n';
}
