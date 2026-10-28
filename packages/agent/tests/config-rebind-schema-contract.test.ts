import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { expect, test } from 'bun:test';

const here = path.dirname(fileURLToPath(import.meta.url));
const parsedSchema: unknown = JSON.parse(
  readFileSync(path.resolve(here, '../schemas/config-rebind-operation.v1.schema.json'), 'utf8'),
);
if (parsedSchema === null || typeof parsedSchema !== 'object' || Array.isArray(parsedSchema))
  throw new Error('Configuration rebind schema must be a JSON object.');
const validateOperation = new Ajv2020({ strict: true, allErrors: false }).compile(parsedSchema);
const parsedSourceCorrectionSchema: unknown = JSON.parse(
  readFileSync(path.resolve(here, '../schemas/runtime-config-source-correction-repair.v1.schema.json'), 'utf8'),
);
if (
  parsedSourceCorrectionSchema === null ||
  typeof parsedSourceCorrectionSchema !== 'object' ||
  Array.isArray(parsedSourceCorrectionSchema)
)
  throw new Error('Source correction schema must be a JSON object.');
const validateSourceCorrection = new Ajv2020({ strict: true, allErrors: false }).compile(parsedSourceCorrectionSchema);
if (
  !('$defs' in parsedSourceCorrectionSchema) ||
  parsedSourceCorrectionSchema.$defs === null ||
  typeof parsedSourceCorrectionSchema.$defs !== 'object' ||
  Array.isArray(parsedSourceCorrectionSchema.$defs)
)
  throw new Error('Source correction definitions must be a JSON object.');
const validateSourceCorrectionCiResult = new Ajv2020({ strict: true, allErrors: false }).compile({
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $defs: parsedSourceCorrectionSchema.$defs,
  $ref: '#/$defs/ciResult',
});
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

function operation(
  planOverrides: Record<string, unknown> = {},
  operationOverrides: Record<string, unknown> = {},
): Record<string, unknown> & { plan: Record<string, unknown> } {
  const plan: Record<string, unknown> = {
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
  };
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

function projectSplitOperation(planOverrides: Record<string, unknown> = {}) {
  return operation({
    baseline_yaml: '',
    target_yaml: '',
    configuration_format: 'project-split-v2',
    baseline_inputs: inputSet(),
    target_inputs: inputSet(),
    ...planOverrides,
  });
}

function ciResult(schema: 'VidaCIDeliveryResult/v1' | 'VidaCIDeliveryResult/v2', version = '1.4.3') {
  return {
    schema,
    request_id: 'request-1',
    operation_id: 'build-1',
    version,
    repository_id: 'vida-repo',
    project_ids: ['agent'],
    target: 'bun-linux-x64',
    source_binding: hash,
    archive_sha256: hash,
    manifest_sha256: hash,
    payload_id: hash,
    asset: { file: 'vida-agent', bytes: 1, sha256: hash },
    issuer: 'github-actions',
    run_id: '1',
    run_attempt: 1,
    checks: [{ id: 'native-build', status: 'passed' }],
  } as Record<string, unknown>;
}

function dependencyCache(version: string): Record<string, unknown> {
  return {
    id: 1,
    key: `vida-bun-install-v1-linux-bun-${version}-${hash}`,
    ref: 'refs/heads/main',
    version: 'bun 1.4.3',
    size_in_bytes: 1,
    restore: 'miss',
    matched_key: null,
    save: 'confirmed',
    save_action: 'success',
  };
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

test('source correction CI result keeps v1 cache-free and requires a valid cache for v2', () => {
  expect(validateSourceCorrectionCiResult(ciResult('VidaCIDeliveryResult/v1'))).toBe(true);
  expect(
    validateSourceCorrectionCiResult({
      ...ciResult('VidaCIDeliveryResult/v1'),
      dependency_cache: dependencyCache('1.4.3'),
    }),
  ).toBe(false);

  for (const version of ['1.4.2', '1.4.3']) {
    expect(
      validateSourceCorrectionCiResult({
        ...ciResult('VidaCIDeliveryResult/v2', version),
        dependency_cache: dependencyCache(version),
      }),
    ).toBe(true);
  }

  const currentCache = dependencyCache('1.4.3');
  currentCache.key = `vida-bun-install-v1-Windows-X64-release2-bun-1.4.3-${hash}`;
  expect(
    validateSourceCorrectionCiResult({
      ...ciResult('VidaCIDeliveryResult/v2'),
      dependency_cache: currentCache,
    }),
  ).toBe(true);

  expect(validateSourceCorrectionCiResult(ciResult('VidaCIDeliveryResult/v2'))).toBe(false);
  for (const version of ['latest', '1.4.3-beta.1', '01.4.3', '1.04.3']) {
    expect(
      validateSourceCorrectionCiResult({
        ...ciResult('VidaCIDeliveryResult/v2'),
        dependency_cache: dependencyCache(version),
      }),
    ).toBe(false);
  }
  const cacheHit = dependencyCache('1.4.3');
  cacheHit.restore = 'hit';
  cacheHit.matched_key = `vida-bun-install-v1-linux-bun-1.4.2-${hash}`;
  cacheHit.save_action = 'skipped';
  expect(
    validateSourceCorrectionCiResult({
      ...ciResult('VidaCIDeliveryResult/v2'),
      dependency_cache: cacheHit,
    }),
  ).toBe(true);
  const invalidMatchedKey = { ...cacheHit, matched_key: `vida-bun-install-v1-linux-bun-01.4.2-${hash}` };
  expect(
    validateSourceCorrectionCiResult({
      ...ciResult('VidaCIDeliveryResult/v2'),
      dependency_cache: invalidMatchedKey,
    }),
  ).toBe(false);
  expect(
    validateSourceCorrectionCiResult({
      ...ciResult('VidaCIDeliveryResult/v2'),
      dependency_cache: { ...dependencyCache('1.4.3'), unknown: true },
    }),
  ).toBe(false);
  expect(validateSourceCorrectionCiResult({ ...ciResult('VidaCIDeliveryResult/v2'), unknown: true })).toBe(false);
});

test('the complete source correction schema compiles under Ajv strict mode', () => {
  expect(validateSourceCorrection({})).toBe(false);
});
