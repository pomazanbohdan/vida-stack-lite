import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { expect, test } from 'bun:test';

const here = path.dirname(fileURLToPath(import.meta.url));
const parsedSchema = /** @type {unknown} */ (
  JSON.parse(readFileSync(path.resolve(here, '../schemas/config-rebind-operation.v1.schema.json'), 'utf8'))
);
if (parsedSchema === null || typeof parsedSchema !== 'object' || Array.isArray(parsedSchema))
  throw new Error('Configuration rebind schema must be a JSON object.');
const AjvConstructor =
  /** @type {new (options: Record<string, unknown>) => {compile(schema: object): (value: unknown) => boolean}} */ (
    /** @type {unknown} */ (Ajv2020)
  );
const validateOperation = new AjvConstructor({ strict: true, allErrors: false }).compile(parsedSchema);
const hash = 'a'.repeat(64);

function inputSet() {
  return {
    schema: 'ProjectConfigurationInputSet/v1',
    input_digest: hash,
    config_digest: hash,
    project: { path: '.vida/project.yaml', text: 'project: {}\n', sha256: hash },
    agents: { path: '.vida/agents.yaml', text: 'agents: []\n', sha256: hash },
    flows: { path: '.vida/flows.yaml', text: 'flows: []\n', sha256: hash },
  };
}

/**
 * @param {Record<string, unknown>} [planOverrides]
 * @param {Record<string, unknown>} [operationOverrides]
 * @returns {Record<string, unknown> & { plan: Record<string, unknown> }}
 */
function operation(planOverrides = {}, operationOverrides = {}) {
  const plan = /** @type {Record<string, unknown>} */ ({
    operation_id: 'rebind-1',
    actor: 'test actor',
    instruction_ref: 'test instruction',
    created_at: '2026-10-10T00:00:00.000Z',
    repository_root: '/repo',
    repository_id: 'vida-repo',
    project_ids: ['agent'],
    workspace_id: hash,
    baseline_yaml: 'baseline: true\n',
    target_yaml: 'target: true\n',
    baseline_receipt: '{}',
    old_config_digest: hash,
    target_config_digest: hash,
    initialization_schema_digest: hash,
    selector_digest: hash,
    bundle_digest: hash,
    state_digest: hash,
    token: '123e4567-e89b-42d3-a456-426614174000',
    ...planOverrides,
  });
  return {
    schema: 'ConfigRebindOperation/v1',
    revision: 1,
    phase: 'applied',
    maintenance_released: true,
    plan_digest: hash,
    plan,
    ...operationOverrides,
  };
}

function projectSplitOperation(planOverrides = {}) {
  return operation({
    baseline_yaml: '',
    target_yaml: '',
    configuration_format: 'project-split-v2',
    baseline_inputs: inputSet(),
    target_inputs: inputSet(),
    ...planOverrides,
  });
}

test('strictly compiled schema accepts the legacy and project-split-v2 plan images', () => {
  expect(validateOperation(operation())).toBe(true);
  expect(validateOperation(projectSplitOperation())).toBe(true);
});

test('schema rejects mixed, incomplete, unknown, empty, malformed-digest, and out-of-bounds images', () => {
  expect(validateOperation(projectSplitOperation({ baseline_yaml: 'legacy bytes' }))).toBe(false);
  expect(validateOperation(projectSplitOperation({ target_yaml: 'legacy bytes' }))).toBe(false);
  expect(
    validateOperation(
      operation({
        configuration_format: 'project-split-v2',
        baseline_inputs: inputSet(),
        target_inputs: inputSet(),
      }),
    ),
  ).toBe(false);

  const missingTargetInputs = projectSplitOperation();
  delete missingTargetInputs.plan.target_inputs;
  expect(validateOperation(missingTargetInputs)).toBe(false);
  const missingBaselineInputs = projectSplitOperation();
  delete missingBaselineInputs.plan.baseline_inputs;
  expect(validateOperation(missingBaselineInputs)).toBe(false);
  expect(validateOperation(operation({ baseline_inputs: inputSet() }))).toBe(false);
  expect(validateOperation(operation({ target_inputs: inputSet() }))).toBe(false);

  expect(validateOperation(projectSplitOperation({ configuration_format: 'project-split-v3' }))).toBe(false);
  expect(validateOperation(operation({ baseline_yaml: '' }))).toBe(false);
  expect(validateOperation(operation({}, { plan_digest: 'not-a-sha256-digest' }))).toBe(false);
  expect(validateOperation(projectSplitOperation({ target_inputs: { ...inputSet(), input_digest: 'bad' } }))).toBe(
    false,
  );
  expect(
    validateOperation(
      projectSplitOperation({
        baseline_inputs: {
          ...inputSet(),
          project: { path: '.vida/project.yaml', text: 'project: {}\n', sha256: 'bad' },
        },
      }),
    ),
  ).toBe(false);
  expect(validateOperation(operation({ project_ids: [] }))).toBe(false);
  expect(validateOperation(operation({ revision: 0 }))).toBe(false);
  expect(validateOperation(operation({ baseline_yaml: 'x'.repeat(4_194_305) }))).toBe(false);
});

test('runtime-config and the package root import with strict project rebind validation enabled', async () => {
  await import('../src/config/runtime-config.ts');
  await import('../src/index.ts');
});
