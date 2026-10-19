import Ajv2020 from 'ajv/dist/2020.js';
import type { ValidateFunction } from 'ajv';
import operationSchema from '../../schemas/config-rebind-operation.v1.schema.json' with { type: 'json' };
import { canonicalJsonDigest, isPlainRecord } from '../contracts/public-ingress.js';
import type { AgentRuntimeConfig } from './runtime-config.js';
import { projectConfigurationInputDigest } from './project-configuration.js';
import { projectConfigurationRebindPath } from './project-paths.js';
import type { ProjectInitializationReceipt } from './project-initialization-record.js';
import type { SafeRepositoryAccess, SafeRepositoryObservation } from './safe-repository-access.js';
import { projectInitializationIdentityDigest } from './project-activation.js';

const AjvConstructor = Ajv2020 as unknown as new (options: Record<string, unknown>) => {
  compile<T>(schema: object): ValidateFunction<T>;
};
export type ProjectConfigurationInputTexts = Readonly<{ project: string; agents: string; flows: string }>;
interface ProjectConfigurationInputSet {
  readonly schema: 'ProjectConfigurationInputSet/v1';
  readonly input_digest: string;
  readonly config_digest: string;
  readonly project: { readonly path: string; readonly text: string; readonly sha256: string };
  readonly agents: { readonly path: string; readonly text: string; readonly sha256: string };
  readonly flows: { readonly path: string; readonly text: string; readonly sha256: string };
}
interface ConfigRebindOperation {
  readonly schema: 'ConfigRebindOperation/v1';
  readonly revision: number;
  readonly phase: string;
  readonly maintenance_released: boolean;
  readonly plan_digest: string;
  readonly plan: {
    readonly configuration_format: 'project-split-v2';
    readonly baseline_inputs: ProjectConfigurationInputSet;
    readonly target_inputs: ProjectConfigurationInputSet;
    readonly operation_id: string;
    readonly repository_root: string;
    readonly repository_id: string;
    readonly project_ids: readonly string[];
    readonly workspace_id: string;
    readonly baseline_yaml: string;
    readonly target_yaml: string;
    readonly baseline_receipt: string;
    readonly old_config_digest: string;
    readonly target_config_digest: string;
  };
}

const validateOperation = new AjvConstructor({ strict: true, allErrors: false }).compile<ConfigRebindOperation>(
  operationSchema,
);

function assertProjectRebind(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function projectInputTexts(value: ProjectConfigurationInputSet): ProjectConfigurationInputTexts {
  return { project: value.project.text, agents: value.agents.text, flows: value.flows.text };
}

function validateInputSet(value: ProjectConfigurationInputSet): void {
  const expected = { project: '.vida/project.yaml', agents: '.vida/agents.yaml', flows: '.vida/flows.yaml' } as const;
  for (const key of Object.keys(expected) as (keyof typeof expected)[]) {
    const item = value[key];
    if (item.path !== expected[key] || new Bun.CryptoHasher('sha256').update(item.text).digest('hex') !== item.sha256)
      throw new Error('Project configuration rebind input bytes differ from their frozen binding.');
  }
  if (projectConfigurationInputDigest(projectInputTexts(value)) !== value.input_digest)
    throw new Error('Project configuration rebind input digest differs.');
}

function readOperation(
  access: SafeRepositoryAccess | SafeRepositoryObservation,
  config: AgentRuntimeConfig,
  operationId: string,
): ConfigRebindOperation {
  const value: unknown = JSON.parse(
    access.readText(projectConfigurationRebindPath(operationId), 'completed project configuration rebind'),
  );
  assertProjectRebind(validateOperation(value), 'Project configuration rebind operation is invalid.');
  const operation = value as ConfigRebindOperation;
  assertProjectRebind(operation.schema === 'ConfigRebindOperation/v1', 'Project configuration rebind schema differs.');
  assertProjectRebind(operation.phase === 'applied', 'Project configuration rebind is not applied.');
  assertProjectRebind(operation.maintenance_released, 'Project configuration rebind maintenance is not released.');
  assertProjectRebind(
    operation.plan.operation_id === operationId,
    'Project configuration rebind operation identity differs.',
  );
  assertProjectRebind(
    operation.plan.repository_root === access.repository_root,
    'Project configuration rebind root differs.',
  );
  assertProjectRebind(
    operation.plan.repository_id === config.repository.repository_id,
    'Project configuration rebind repository differs.',
  );
  assertProjectRebind(
    operation.plan.workspace_id === valueWorkspaceId(operation.plan.workspace_id),
    'Project configuration rebind workspace is malformed.',
  );
  assertProjectRebind(
    operation.plan.configuration_format === 'project-split-v2',
    'Project configuration rebind format differs.',
  );
  assertProjectRebind(
    canonicalJsonDigest(operation.plan) === operation.plan_digest,
    'Project configuration rebind plan digest differs.',
  );
  return operation;
}

function valueWorkspaceId(value: string): string {
  return /^[a-f0-9]{64}$/u.test(value) ? value : '';
}

/** Require either the initial activation image or the exact completed current-v1 config rebind. */
export function assertCurrentProjectConfigurationBinding(
  access: SafeRepositoryAccess | SafeRepositoryObservation,
  config: AgentRuntimeConfig,
  inputDigest: string,
  receipt: ProjectInitializationReceipt,
  inputs: ProjectConfigurationInputTexts,
): void {
  if (receipt.configuration_rebind_id === null) {
    assertProjectRebind(
      receipt.current_config_digest === receipt.config_digest,
      'Activated project configuration digest differs.',
    );
    assertProjectRebind(
      receipt.current_input_digest === receipt.input_digest,
      'Activated project inputs digest differs.',
    );
    assertProjectRebind(inputDigest === receipt.input_digest, 'Activated project input bytes differ.');
    assertProjectRebind(
      canonicalJsonDigest(config) === receipt.config_digest,
      'Activated project config bytes differ.',
    );
    return;
  }
  const operation = readOperation(access, config, receipt.configuration_rebind_id);
  const baseline = operation.plan.baseline_inputs;
  const target = operation.plan.target_inputs;
  validateInputSet(baseline);
  validateInputSet(target);
  const beforeReceipt: unknown = JSON.parse(operation.plan.baseline_receipt);
  assertProjectRebind(isPlainRecord(beforeReceipt), 'Project rebind receipt beforeimage is invalid.');
  const before = beforeReceipt as unknown as ProjectInitializationReceipt;
  assertProjectRebind(
    operation.plan.old_config_digest === baseline.config_digest,
    'Project rebind baseline config differs.',
  );
  assertProjectRebind(
    operation.plan.target_config_digest === target.config_digest,
    'Project rebind target config differs.',
  );
  assertProjectRebind(
    receipt.current_config_digest === target.config_digest,
    'Project receipt current config differs.',
  );
  assertProjectRebind(receipt.current_input_digest === target.input_digest, 'Project receipt current inputs differ.');
  assertProjectRebind(inputDigest === target.input_digest, 'Project input bytes differ from rebind target.');
  assertProjectRebind(
    canonicalJsonDigest(config) === target.config_digest,
    'Project config differs from rebind target.',
  );
  assertProjectRebind(
    canonicalJsonDigest(inputs) === canonicalJsonDigest(projectInputTexts(target)),
    'Project text inputs differ from rebind target.',
  );
  assertProjectRebind(
    operation.plan.workspace_id === receipt.workspace_id,
    'Project rebind workspace differs from receipt.',
  );
  assertProjectRebind(
    operation.plan.repository_id === receipt.repository_id,
    'Project rebind repository differs from receipt.',
  );
  assertProjectRebind(
    canonicalJsonDigest(operation.plan.project_ids) === canonicalJsonDigest(receipt.project_ids),
    'Project rebind project set differs from receipt.',
  );
  assertProjectRebind(
    before.current_config_digest === baseline.config_digest,
    'Project rebind receipt beforeimage config differs.',
  );
  assertProjectRebind(
    before.current_input_digest === baseline.input_digest,
    'Project rebind receipt beforeimage inputs differ.',
  );
  assertProjectRebind(
    projectInitializationIdentityDigest(before) === projectInitializationIdentityDigest(receipt),
    'Project rebind immutable receipt identity differs.',
  );
  assertProjectRebind(
    before.configuration_rebind_id !== receipt.configuration_rebind_id,
    'Project rebind receipt operation pointer did not advance.',
  );
}
