import { expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parse, stringify } from 'yaml';
import { initializationObservationContext } from '../bin/init-core.ts';
import { captureConsumerConfiguration, planConsumerConfiguration } from '../bin/init-configuration.ts';
import { applyConsumerConfiguration, resumeConsumerConfiguration } from '../bin/consumer-configuration-operation.ts';
import { configureArguments, requestFromPlan } from '../bin/configure.ts';
import { canonicalJsonDigest, isPlainRecord } from '../src/contracts/public-ingress.ts';
import { productModelSchema } from '../src/config/product-model.ts';
import { loadRuntimeConfig, parseRuntimeConfigYaml, runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { openConfiguredMastraSessionLedger } from '../src/orchestration/persistent-session-handoff.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { fixtureInitializationTemplates } from './helpers/runtime-initialization-fixture.ts';

const packageRoot = path.resolve(import.meta.dirname, '..');
const preserved = ['AGENTS.md', 'AGENT.sidecar.md', 'docs/agent-instructions/documentation-policy.v1.json'];

async function adoptionFixture() {
  const parent = await realpath(tmpdir());
  const root = await realpath(await mkdtemp(path.join(parent, 'vida-host-adoption-')));
  console.info('Host adoption fixture: ' + root);
  for (const name of ['agent', 'codex', 'powers']) await mkdir(path.join(root, 'packages', name), { recursive: true });
  const config = initializationObservationContext({
    projectRoot: root,
    repository: 'vida-agent',
    projectMappings: ['agent=packages/agent', 'plugin=packages/codex', 'powers=packages/powers'],
  }).defaultConfig();
  await mkdir(path.join(root, '.agent'));
  await mkdir(path.join(root, 'docs/agent-instructions'), { recursive: true });
  for (const file of preserved)
    await writeFile(path.join(root, file), await readFile(path.resolve(packageRoot, '../..', file)));
  await writeFile(path.join(root, 'agent-runtime.config.v1.yaml'), stringify(config));
  const receipt = {
    schema: 'RuntimeInitialization/v1',
    version: 1,
    provenance: 'generated',
    repository_id: config.repository.repository_id,
    project_ids: config.projects.map((project) => project.project_id).sort(),
    integrations_digest: canonicalJsonDigest(config.integrations),
    workspace_id: deriveWorkspaceId(config.repository.repository_id, root),
    workspace_binding_status: 'pending',
    bundle: config.runtime.bundle,
    config_digest: runtimeConfigDigest(config),
    schema_sha256: createHash('sha256')
      .update(await readFile(path.join(packageRoot, 'schemas/runtime-initialization.v1.schema.json')))
      .digest('hex'),
    templates: fixtureInitializationTemplates(root, packageRoot),
    created_at: new Date().toISOString(),
  };
  await writeFile(path.join(root, '.agent/runtime-initialization.v1.json'), JSON.stringify(receipt) + '\n');
  const ledger = openConfiguredMastraSessionLedger(root);
  ledger.close();
  const proposal: unknown = parse(
    await readFile(path.join(packageRoot, 'docs/decisions/configuration/project-config.proposed.yaml'), 'utf8'),
  );
  if (!isPlainRecord(proposal)) throw new Error('Fixture model must be a mapping');
  const model = productModelSchema.parse({
    schema: 'ProductModel/v1',
    version: 1,
    repository: proposal.repository,
    projects: proposal.projects,
  });
  for (const name of preserved.slice(0, 2)) {
    const file = path.join(root, name);
    await writeFile(file, (await readFile(file, 'utf8')) + '\n<!-- preserved owner edit -->\n');
  }
  return {
    parent,
    root,
    request: {
      schema: 'ConsumerConfigurationRequest/v3' as const,
      version: 3 as const,
      adoption: 'host_present_pending_receipt' as const,
      projectRoot: root,
      repository: 'vida-agent',
      productModel: model,
      legacyProjectIdMap: { plugin: 'codex' },
    },
  };
}

test('explicit Host-present plan preserves current outputs and binds the full model without effects', async () => {
  const fixture = await adoptionFixture();
  let completed = false;
  try {
    const before = await Promise.all(preserved.map((file) => readFile(path.join(fixture.root, file))));
    const config = loadRuntimeConfig(fixture.root);
    const legacy = { ...fixture.request, schema: 'ConsumerConfigurationRequest/v2' as const, version: 2 as const };
    const { adoption: _adoption, ...v2 } = legacy;
    expect(() => planConsumerConfiguration(v2)).toThrow();
    const captured = captureConsumerConfiguration(fixture.request);
    expect(captured.plan.schema).toBe('ConsumerConfigurationPlan/v3');
    expect(planConsumerConfiguration(fixture.request)).toEqual(captured.plan);
    expect(requestFromPlan(captured.plan, fixture.root).request).toEqual(fixture.request);
    const target = parseRuntimeConfigYaml(captured.targetConfig);
    expect(target.schema).toBe('AgentRuntimeConfig/v2');
    expect(target.projects.map((project) => project.project_id)).toEqual(['agent', 'codex', 'powers']);
    expect(target.integrations.providers).toEqual(
      config.integrations.providers.map((provider) => ({
        ...provider,
        project_id: provider.project_id === 'plugin' ? 'codex' : provider.project_id,
      })),
    );
    expect(await Promise.all(preserved.map((file) => readFile(path.join(fixture.root, file))))).toEqual(before);
    expect(await Bun.file(path.join(fixture.root, '.agent/runtime-initialization.pending.v1.json')).exists()).toBe(
      false,
    );
    completed = true;
  } finally {
    if (completed) {
      expect(path.dirname(fixture.root)).toBe(fixture.parent);
      expect(path.basename(fixture.root).startsWith('vida-host-adoption-')).toBe(true);
      await rm(fixture.root, { recursive: true, force: true });
    } else console.info('Retained Host adoption fixture: ' + fixture.root);
  }
});

test('Host-present CLI mode is explicit and cannot be mixed with legacy mappings', () => {
  expect(configureArguments(['plan', '--product-model', 'setup.yaml', '--adopt-host-present', 'true'])).toMatchObject({
    mode: 'plan',
    adoptHostPresent: true,
  });
  expect(() =>
    configureArguments(['plan', '--product-model', 'setup.yaml', '--adopt-host-present', 'false']),
  ).toThrow();
  expect(() =>
    configureArguments(['plan', '--repository', 'example', '--project', 'agent=.', '--adopt-host-present', 'true']),
  ).toThrow();
});

test('Host-present apply closes native maintenance and archived resume preserves exact afterimages', async () => {
  const fixture = await adoptionFixture();
  let completed = false;
  try {
    const before = await Promise.all(preserved.map((file) => readFile(path.join(fixture.root, file))));
    const plan = planConsumerConfiguration(fixture.request);
    expect(await applyConsumerConfiguration(fixture.request, plan.binding, plan.operation_id)).toEqual({
      operation_id: plan.operation_id,
      status: 'completed',
    });
    expect(loadRuntimeConfig(fixture.root).schema).toBe('AgentRuntimeConfig/v2');
    const receipt: unknown = JSON.parse(
      await readFile(path.join(fixture.root, '.agent/runtime-initialization.v1.json'), 'utf8'),
    );
    if (!isPlainRecord(receipt)) throw new Error('Fixture receipt must be a mapping');
    expect(receipt.provenance).toBe('adopted_existing');
    const archive = path.join(fixture.root, `.agent/consumer-configuration-operation.${plan.operation_id}.v3.json`);
    const archiveBytes = await readFile(archive),
      configBytes = await readFile(path.join(fixture.root, 'agent-runtime.config.v1.yaml'));
    expect(await resumeConsumerConfiguration(fixture.request, plan.operation_id)).toEqual({
      operation_id: plan.operation_id,
      status: 'completed',
    });
    expect(await readFile(archive)).toEqual(archiveBytes);
    expect(await readFile(path.join(fixture.root, 'agent-runtime.config.v1.yaml'))).toEqual(configBytes);
    expect(await Promise.all(preserved.map((file) => readFile(path.join(fixture.root, file))))).toEqual(before);
    completed = true;
  } finally {
    if (completed) {
      expect(path.dirname(fixture.root)).toBe(fixture.parent);
      expect(path.basename(fixture.root).startsWith('vida-host-adoption-')).toBe(true);
      await rm(fixture.root, { recursive: true, force: true });
    } else console.info('Retained Host adoption fixture: ' + fixture.root);
  }
});
