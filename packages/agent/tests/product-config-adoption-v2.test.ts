import { expect, test } from 'bun:test';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, realpathSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { stringify } from 'yaml';
import { initializationObservationContext, initializeProjectFromBundle } from '../bin/init-core.ts';
import { captureConsumerConfiguration } from '../bin/init-configuration.ts';
import {
  productModelForRuntimeConfig,
  parseRuntimeConfigYaml,
  loadRuntimeConfig,
} from '../src/config/runtime-config.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import { productModelSchema } from '../src/config/product-model.ts';
import { createHash } from 'node:crypto';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import {
  validateConsumerConfigurationOperation,
  resumeConsumerConfiguration,
} from '../bin/consumer-configuration-operation.ts';

function fixture() {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'vida-product-operation-')));
  mkdirSync(path.join(root, 'one'));
  mkdirSync(path.join(root, 'docs/agent-instructions'), { recursive: true });
  const legacy = { projectRoot: root, repository: 'example', projectMappings: ['one=one'] };
  const ctx = initializationObservationContext(legacy);
  writeFileSync(path.join(root, 'AGENTS.md'), 'Consumer fixture policy\n');
  writeFileSync(path.join(root, 'AGENT.sidecar.md'), 'Consumer fixture source map\n');
  writeFileSync(path.join(root, 'agent-runtime.config.v1.yaml'), stringify(ctx.defaultConfig()));
  writeFileSync(
    path.join(root, 'docs/agent-instructions/documentation-policy.v1.json'),
    new TextDecoder()
      .decode(ctx.readPackageBytes('templates/documentation-policy.template.v1.json'))
      .replaceAll('{{REPOSITORY}}', 'example')
      .replaceAll('{{CREATED_AT}}', '2026-11-08T00:00:00.000Z'),
  );
  const model = productModelSchema.parse({
    schema: 'ProductModel/v1',
    version: 1,
    repository: { repository_id: 'example', prefix: 'EXAMPLE' },
    projects: [
      {
        project_id: 'codex',
        title: 'Codex product',
        prefix: 'CODEX',
        project_root: 'one',
        code_selectors: ['one/**/*.ts'],
        documents: {
          root: 'one/docs',
          index: 'one/docs/index.md',
          requirements: {
            root: 'one/docs/requirements',
            areas: {
              core: {
                business: 'one/docs/requirements/business.md',
                system: 'one/docs/requirements/system.md',
                acceptance: 'one/docs/requirements/acceptance.md',
                test_cases: 'one/docs/requirements/tests.md',
              },
            },
          },
          research: 'one/docs/research',
          decisions: 'one/docs/decisions',
        },
        work_items: { storage_root: 'one/work', enabled_types: ['TASK'], hierarchy: { mode: 'any' } },
      },
    ],
  });
  return {
    root,
    model,
    request: {
      schema: 'ConsumerConfigurationRequest/v2' as const,
      version: 2 as const,
      projectRoot: root,
      repository: 'example',
      productModel: model,
      legacyProjectIdMap: { one: 'codex' },
    },
  };
}

test('full product model and explicit identity map are bound into the v2 plan', () => {
  const { root, model, request } = fixture();
  console.info('Retained product operation fixture: ' + root);
  const captured = captureConsumerConfiguration(request);
  expect(captured.plan.schema).toBe('ConsumerConfigurationPlan/v2');
  if (captured.plan.schema !== 'ConsumerConfigurationPlan/v2') throw new Error('Expected full-model plan');
  expect(captured.plan.request.product_model).toEqual(model);
  expect(captured.plan.request.legacy_project_id_map).toEqual({ one: 'codex' });
  expect(productModelForRuntimeConfig(parseRuntimeConfigYaml(captured.targetConfig))).toEqual(model);
  expect(existsSync(path.join(root, '.agent/runtime-initialization.pending.v1.json'))).toBe(false);
});

test('every full-model field and identity mapping changes the plan binding', () => {
  const { root, request } = fixture();
  console.info('Retained product binding fixture: ' + root);
  const before = readFileSync(path.join(root, 'agent-runtime.config.v1.yaml'));
  const initial = captureConsumerConfiguration(request);
  const changed = structuredClone(request);
  changed.productModel.projects[0]!.documents.decisions = 'one/docs/other-decisions';
  expect(captureConsumerConfiguration(changed).plan.binding).not.toBe(initial.plan.binding);
  expect(() => captureConsumerConfiguration({ ...request, legacyProjectIdMap: {} })).toThrow(/mapping|renaming/);
  expect(readFileSync(path.join(root, 'agent-runtime.config.v1.yaml'))).toEqual(before);
  expect(existsSync(path.join(root, '.agent'))).toBe(false);
});

test('explicit product paths resolve through the existing context instead of legacy path aliases', () => {
  const { root, model, request } = fixture();
  console.info('Retained product path profile fixture: ' + root);
  const prior = loadRuntimeConfig(root);
  if (prior.schema !== 'AgentRuntimeConfig/v1') throw new Error('Expected the legacy path fixture');
  writeFileSync(
    path.join(root, 'agent-runtime.config.v1.yaml'),
    stringify({
      ...prior,
      projects: prior.projects.map((project) => ({
        ...project,
        path_overrides: {
          ...project.path_overrides,
          wiki_root: 'one/stale-docs',
          wiki_path: 'one/stale-index.md',
          internal_root: 'one/stale-requirements',
          ledger_root: 'one/stale-work',
        },
      })),
    }),
  );
  const capture = captureConsumerConfiguration(request);
  writeFileSync(path.join(root, 'agent-runtime.config.v1.yaml'), capture.targetConfig);
  const config = loadRuntimeConfig(root);
  const context = loadProjectSetContext(root, config, 'example', ['codex']);
  const paths = context.project_bindings[0]!.path_profile.paths;
  expect(paths.project_root).toBe(model.projects[0]!.project_root);
  expect(paths.wiki_root).toBe(model.projects[0]!.documents.root);
  expect(paths.wiki_path).toBe(model.projects[0]!.documents.index);
  expect(paths.internal_root).toBe(model.projects[0]!.documents.requirements.root);
  expect(paths.ledger_root).toBe(model.projects[0]!.work_items.storage_root);
});

test('v2 request refuses mixed, malformed and ambiguous input before target observation', () => {
  const { root, request } = fixture();
  console.info('Retained product refusal fixture: ' + root);
  expect(() =>
    captureConsumerConfiguration({
      ...request,
      projectRoot: path.join(root, 'absent'),
      productModel: { ...request.productModel, extra: true },
    } as typeof request),
  ).toThrow();
  expect(() => captureConsumerConfiguration({ ...request, projectMappings: ['one=one'] } as typeof request)).toThrow();
  expect(() => captureConsumerConfiguration({ ...request, legacyProjectIdMap: { unknown: 'codex' } })).toThrow();
  expect(() => captureConsumerConfiguration({ ...request, repository: 'foreign' })).toThrow(/repository/);
  expect(existsSync(path.join(root, '.agent'))).toBe(false);
});

test('initialization rejects a product model inconsistent with explicit mappings before target access', async () => {
  const { root, model } = fixture();
  console.info('Retained product initialization refusal fixture: ' + root);
  await Promise.resolve(
    expect(
      initializeProjectFromBundle(
        {
          projectRoot: path.join(root, 'absent'),
          repository: 'example',
          projectMappings: ['other=one'],
          productModel: model,
        },
        path.resolve('C:/project/vida-agent/packages/agent'),
      ),
    ).rejects.toThrow(/model differs/),
  );
  expect(existsSync(path.join(root, 'absent'))).toBe(false);
  expect(existsSync(path.join(root, '.agent'))).toBe(false);
});

function pendingFixture() {
  const input = fixture();
  const capture = captureConsumerConfiguration(input.request);
  const encoded = (bytes: Uint8Array) => ({
    base64: Buffer.from(bytes).toString('base64'),
    sha256: createHash('sha256').update(bytes).digest('hex'),
  });
  const record = {
    schema: 'ConsumerConfigurationOperation/v2',
    version: 2,
    operation_id: capture.plan.operation_id,
    root: input.root,
    root_identity: requireSafeRepositoryAccess(input.root).directoryIdentity('.', 'configuration root'),
    workspace_id: deriveWorkspaceId(input.request.repository, input.root),
    request: input.request,
    binding: capture.plan.binding,
    before: capture.before.map(encoded),
    target: encoded(Buffer.from(capture.targetConfig)),
    receipt: null,
    progress: 'intent',
  };
  mkdirSync(path.join(input.root, '.agent'));
  writeFileSync(path.join(input.root, '.agent/runtime-initialization.pending.v1.json'), JSON.stringify(record) + '\n');
  return { ...input, capture, record };
}

test('v2 pending codec rejects mixed versions and preserves the complete frozen request', () => {
  const { root, request, record } = pendingFixture();
  console.info('Retained product journal fixture: ' + root);
  expect(validateConsumerConfigurationOperation(record).request).toEqual(request);
  expect(() => validateConsumerConfigurationOperation({ ...record, version: 1 })).toThrow();
  expect(() =>
    validateConsumerConfigurationOperation({ ...record, request: { ...request, productModel: {} } }),
  ).toThrow();
  expect(() =>
    validateConsumerConfigurationOperation({ ...record, target: { ...record.target, sha256: '0'.repeat(64) } }),
  ).toThrow();
});

test('v2 recovery fences a changed explicit model and foreign target bytes', async () => {
  const { root, request, capture } = pendingFixture();
  console.info('Retained product recovery fixture: ' + root);
  const pending = path.join(root, '.agent/runtime-initialization.pending.v1.json');
  const before = readFileSync(pending);
  const changed = structuredClone(request);
  changed.productModel.repository.prefix = 'OTHER';
  await Promise.resolve(
    expect(resumeConsumerConfiguration(changed, capture.plan.operation_id)).rejects.toThrow(/identity/),
  );
  writeFileSync(path.join(root, 'agent-runtime.config.v1.yaml'), 'foreign target bytes');
  await Promise.resolve(expect(resumeConsumerConfiguration(request, capture.plan.operation_id)).rejects.toThrow());
  expect(readFileSync(pending)).toEqual(before);
  expect(readFileSync(path.join(root, 'agent-runtime.config.v1.yaml'), 'utf8')).toBe('foreign target bytes');
});
