import { expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalJsonDigest, isPlainRecord } from '../src/contracts/public-ingress.js';
import { projectInitializationIdentityDigest } from '../src/config/project-activation.js';
import type { ProjectInitializationReceipt } from '../src/config/project-initialization-record.js';
import { projectConfigurationInputDigest } from '../src/config/project-configuration.js';
import {
  PROJECT_CONFIGURATION_PATHS,
  PROJECT_WORKSPACE_DATABASE_PATH,
  projectConfigurationRebindPath,
} from '../src/config/project-paths.js';
import { loadRuntimeConfig, type AgentRuntimeConfig } from '../src/config/runtime-config.js';
import { requireSafeRepositoryAccess, type SafeRepositoryAccess } from '../src/config/safe-repository-access.js';
import {
  assertCurrentProjectConfigurationBinding,
  type ProjectConfigurationInputTexts,
} from '../src/config/project-configuration-rebind.js';

interface ProjectInputSet {
  schema: 'ProjectConfigurationInputSet/v1';
  input_digest: string;
  config_digest: string;
  project: { path: string; text: string; sha256: string };
  agents: { path: string; text: string; sha256: string };
  flows: { path: string; text: string; sha256: string };
}

interface RebindPlan {
  configuration_format: 'project-split-v2';
  baseline_inputs: ProjectInputSet;
  target_inputs: ProjectInputSet;
  operation_id: string;
  repository_root: string;
  repository_id: string;
  project_ids: string[];
  workspace_id: string;
  baseline_yaml: string;
  target_yaml: string;
  baseline_receipt: string;
  old_config_digest: string;
  target_config_digest: string;
  actor: string;
  instruction_ref: string;
  created_at: string;
  initialization_schema_digest: string;
  selector_digest: string;
  bundle_digest: string;
  state_digest: string;
  token: string;
}

interface RebindOperation {
  schema: 'ConfigRebindOperation/v1';
  revision: number;
  phase: 'planned' | 'fenced' | 'applied' | 'abandoned_no_effect';
  maintenance_released: boolean;
  plan_digest: string;
  plan: RebindPlan;
}

interface Fixture {
  root: string;
  access: SafeRepositoryAccess;
  config: AgentRuntimeConfig;
  inputs: ProjectConfigurationInputTexts;
  inputDigest: string;
  receipt: ProjectInitializationReceipt;
  operation: RebindOperation;
}

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const config = loadRuntimeConfig(repositoryRoot);
const operationId = 'fixture-rebind';
const workspaceId = 'a'.repeat(64);

function sha256(value: string): string {
  return new Bun.CryptoHasher('sha256').update(value).digest('hex');
}

function inputs(prefix: string): ProjectConfigurationInputTexts {
  return {
    project: `project: ${prefix}\n`,
    agents: `agents: ${prefix}\n`,
    flows: `flows: ${prefix}\n`,
  };
}

function inputSet(texts: ProjectConfigurationInputTexts, configDigest: string): ProjectInputSet {
  return {
    schema: 'ProjectConfigurationInputSet/v1',
    input_digest: projectConfigurationInputDigest(texts),
    config_digest: configDigest,
    project: {
      path: PROJECT_CONFIGURATION_PATHS.project,
      text: texts.project,
      sha256: sha256(texts.project),
    },
    agents: {
      path: PROJECT_CONFIGURATION_PATHS.agents,
      text: texts.agents,
      sha256: sha256(texts.agents),
    },
    flows: {
      path: PROJECT_CONFIGURATION_PATHS.flows,
      text: texts.flows,
      sha256: sha256(texts.flows),
    },
  };
}

function receipt(
  configDigest: string,
  inputDigest: string,
  currentConfigDigest: string,
  currentInputDigest: string,
  configurationRebindId: string | null,
): ProjectInitializationReceipt {
  return {
    schema: 'RuntimeInitialization/v2',
    version: 2,
    provenance: 'project-upgrade',
    repository_id: config.repository.repository_id,
    project_ids: config.projects.map((project) => project.project_id).sort(),
    workspace_id: workspaceId,
    workspace_binding_status: 'bound',
    bundle: config.runtime.bundle,
    bundle_digest: sha256('bundle'),
    config_digest: configDigest,
    input_digest: inputDigest,
    current_config_digest: currentConfigDigest,
    current_input_digest: currentInputDigest,
    configuration_rebind_id: configurationRebindId,
    operation_id: 'fixture-upgrade',
    database_path: PROJECT_WORKSPACE_DATABASE_PATH,
    configuration_inputs: {
      project: PROJECT_CONFIGURATION_PATHS.project,
      agents: PROJECT_CONFIGURATION_PATHS.agents,
      flows: PROJECT_CONFIGURATION_PATHS.flows,
    },
    prepared_artifacts: Array.from({ length: 8 }, (_, index) => ({
      path: `runtime/artifact-${index}.json`,
      sha256: sha256(`artifact-${index}`),
    })),
    created_at: '2026-10-10T00:00:00.000Z',
  };
}

function resign(operation: RebindOperation): void {
  operation.plan_digest = canonicalJsonDigest(operation.plan);
}

function persist(root: string, operation: RebindOperation): void {
  const relativePath = projectConfigurationRebindPath(operationId);
  const absolutePath = path.join(root, relativePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, JSON.stringify(operation));
}

function fixture(): Fixture {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-project-config-rebind-'));
  const access = requireSafeRepositoryAccess(root);
  const baselineTexts = inputs('baseline');
  const targetTexts = inputs('target');
  const targetConfigDigest = canonicalJsonDigest(config);
  const baselineInputSet = inputSet(baselineTexts, targetConfigDigest);
  const targetInputSet = inputSet(targetTexts, targetConfigDigest);
  const baselineReceipt = receipt(
    baselineInputSet.config_digest,
    baselineInputSet.input_digest,
    baselineInputSet.config_digest,
    baselineInputSet.input_digest,
    null,
  );
  const targetReceipt: ProjectInitializationReceipt = {
    ...baselineReceipt,
    current_config_digest: targetInputSet.config_digest,
    current_input_digest: targetInputSet.input_digest,
    configuration_rebind_id: operationId,
  };
  const plan: RebindPlan = {
    configuration_format: 'project-split-v2',
    baseline_inputs: baselineInputSet,
    target_inputs: targetInputSet,
    operation_id: operationId,
    repository_root: root,
    repository_id: config.repository.repository_id,
    project_ids: [...targetReceipt.project_ids],
    workspace_id: workspaceId,
    baseline_yaml: '',
    target_yaml: '',
    baseline_receipt: JSON.stringify(baselineReceipt),
    old_config_digest: baselineInputSet.config_digest,
    target_config_digest: targetInputSet.config_digest,
    actor: 'focused test fixture',
    instruction_ref: 'project configuration rebind contract',
    created_at: '2026-10-10T00:00:00.000Z',
    initialization_schema_digest: sha256('initialization schema'),
    selector_digest: sha256('selector'),
    bundle_digest: sha256('bundle'),
    state_digest: sha256('state'),
    token: '123e4567-e89b-42d3-a456-426614174000',
  };
  const operation: RebindOperation = {
    schema: 'ConfigRebindOperation/v1',
    revision: 2,
    phase: 'applied',
    maintenance_released: true,
    plan_digest: '',
    plan,
  };
  resign(operation);
  persist(root, operation);
  return {
    root,
    access,
    config,
    inputs: targetTexts,
    inputDigest: targetInputSet.input_digest,
    receipt: targetReceipt,
    operation,
  };
}

test('initial activation accepts matching current config and exact input digests', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-project-config-initial-binding-'));
  try {
    const access = requireSafeRepositoryAccess(root);
    const currentInputs = inputs('initial');
    const inputDigest = projectConfigurationInputDigest(currentInputs);
    const configDigest = canonicalJsonDigest(config);
    const currentReceipt = receipt(configDigest, inputDigest, configDigest, inputDigest, null);
    expect(() =>
      assertCurrentProjectConfigurationBinding(access, config, inputDigest, currentReceipt, currentInputs),
    ).not.toThrow();
  } catch (error) {
    console.error(`Retained initial project configuration fixture at ${root}`);
    throw error;
  }
  rmSync(root, { recursive: true, force: true });
});

test('completed project split rebind accepts exact operation, target inputs, and receipt beforeimage', () => {
  const value = fixture();
  let passed = false;
  try {
    expect(value.receipt.configuration_rebind_id).toBe(operationId);
    const baselineReceipt: unknown = JSON.parse(value.operation.plan.baseline_receipt);
    if (!isPlainRecord(baselineReceipt)) throw new Error('Expected a receipt beforeimage object');
    expect(projectInitializationIdentityDigest(baselineReceipt as unknown as ProjectInitializationReceipt)).toBe(
      projectInitializationIdentityDigest({
        ...value.receipt,
        current_config_digest: value.operation.plan.baseline_inputs.config_digest,
        current_input_digest: value.operation.plan.baseline_inputs.input_digest,
        configuration_rebind_id: null,
      }),
    );
    expect(() =>
      assertCurrentProjectConfigurationBinding(
        value.access,
        value.config,
        value.inputDigest,
        value.receipt,
        value.inputs,
      ),
    ).not.toThrow();
    passed = true;
  } finally {
    if (passed) rmSync(value.root, { recursive: true, force: true });
    else console.error(`Retained project configuration rebind fixture at ${value.root}`);
  }
});

test('completed rebind rejects a plan whose operation identity differs from its receipt pointer', () => {
  const value = fixture();
  let passed = false;
  try {
    value.operation.plan.operation_id = 'different-operation';
    resign(value.operation);
    persist(value.root, value.operation);
    expect(() =>
      assertCurrentProjectConfigurationBinding(
        value.access,
        value.config,
        value.inputDigest,
        value.receipt,
        value.inputs,
      ),
    ).toThrow('operation identity differs');
    passed = true;
  } finally {
    if (passed) rmSync(value.root, { recursive: true, force: true });
    else console.error(`Retained project configuration rebind fixture at ${value.root}`);
  }
});

test('completed rebind rejects repository identity drift even when the plan is rehashed', () => {
  const value = fixture();
  let passed = false;
  try {
    value.operation.plan.repository_id = 'foreign-repository';
    resign(value.operation);
    persist(value.root, value.operation);
    expect(() =>
      assertCurrentProjectConfigurationBinding(
        value.access,
        value.config,
        value.inputDigest,
        value.receipt,
        value.inputs,
      ),
    ).toThrow('repository differs');
    passed = true;
  } finally {
    if (passed) rmSync(value.root, { recursive: true, force: true });
    else console.error(`Retained project configuration rebind fixture at ${value.root}`);
  }
});

test('completed rebind rejects target input bytes that no longer match their frozen hash', () => {
  const value = fixture();
  let passed = false;
  try {
    value.operation.plan.target_inputs.project.text += '# changed\n';
    resign(value.operation);
    persist(value.root, value.operation);
    expect(() =>
      assertCurrentProjectConfigurationBinding(
        value.access,
        value.config,
        value.inputDigest,
        value.receipt,
        value.inputs,
      ),
    ).toThrow('input bytes differ');
    passed = true;
  } finally {
    if (passed) rmSync(value.root, { recursive: true, force: true });
    else console.error(`Retained project configuration rebind fixture at ${value.root}`);
  }
});

test('completed rebind rejects a target input digest that does not bind its fixed text set', () => {
  const value = fixture();
  let passed = false;
  try {
    value.operation.plan.target_inputs.input_digest = sha256('different input set');
    resign(value.operation);
    persist(value.root, value.operation);
    expect(() =>
      assertCurrentProjectConfigurationBinding(
        value.access,
        value.config,
        value.inputDigest,
        value.receipt,
        value.inputs,
      ),
    ).toThrow('Project configuration rebind input digest differs');
    passed = true;
  } finally {
    if (passed) rmSync(value.root, { recursive: true, force: true });
    else console.error(`Retained project configuration rebind fixture at ${value.root}`);
  }
});

test('completed rebind rejects current input text that differs from the frozen target set', () => {
  const value = fixture();
  let passed = false;
  try {
    const changedInputs = { ...value.inputs, flows: `${value.inputs.flows}# changed\n` };
    expect(() =>
      assertCurrentProjectConfigurationBinding(
        value.access,
        value.config,
        value.inputDigest,
        value.receipt,
        changedInputs,
      ),
    ).toThrow('Project text inputs differ from rebind target');
    passed = true;
  } finally {
    if (passed) rmSync(value.root, { recursive: true, force: true });
    else console.error(`Retained project configuration rebind fixture at ${value.root}`);
  }
});

test('completed rebind requires the applied phase', () => {
  const value = fixture();
  let passed = false;
  try {
    value.operation.phase = 'fenced';
    persist(value.root, value.operation);
    expect(() =>
      assertCurrentProjectConfigurationBinding(
        value.access,
        value.config,
        value.inputDigest,
        value.receipt,
        value.inputs,
      ),
    ).toThrow('not applied');
    passed = true;
  } finally {
    if (passed) rmSync(value.root, { recursive: true, force: true });
    else console.error(`Retained project configuration rebind fixture at ${value.root}`);
  }
});

test('completed rebind requires maintenance to be released', () => {
  const value = fixture();
  let passed = false;
  try {
    value.operation.maintenance_released = false;
    persist(value.root, value.operation);
    expect(() =>
      assertCurrentProjectConfigurationBinding(
        value.access,
        value.config,
        value.inputDigest,
        value.receipt,
        value.inputs,
      ),
    ).toThrow('maintenance is not released');
    passed = true;
  } finally {
    if (passed) rmSync(value.root, { recursive: true, force: true });
    else console.error(`Retained project configuration rebind fixture at ${value.root}`);
  }
});

test('completed rebind rejects a receipt beforeimage whose operation pointer did not advance', () => {
  const value = fixture();
  let passed = false;
  try {
    const beforeReceipt: unknown = JSON.parse(value.operation.plan.baseline_receipt);
    if (beforeReceipt === null || typeof beforeReceipt !== 'object' || Array.isArray(beforeReceipt))
      throw new Error('Expected a receipt beforeimage object');
    const before = beforeReceipt as Record<string, unknown>;
    before.configuration_rebind_id = operationId;
    value.operation.plan.baseline_receipt = JSON.stringify(before);
    resign(value.operation);
    persist(value.root, value.operation);
    expect(() =>
      assertCurrentProjectConfigurationBinding(
        value.access,
        value.config,
        value.inputDigest,
        value.receipt,
        value.inputs,
      ),
    ).toThrow('operation pointer did not advance');
    passed = true;
  } finally {
    if (passed) rmSync(value.root, { recursive: true, force: true });
    else console.error(`Retained project configuration rebind fixture at ${value.root}`);
  }
});

test('the rebind operation stays under its fixed repository work path', () => {
  expect(projectConfigurationRebindPath(operationId)).toBe(
    '.vida/work/configuration-rebind/fixture-rebind/runtime-config-rebind-operation.v1.json',
  );
});
