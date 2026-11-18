import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'bun:test';
import { parse, stringify } from 'yaml';
import { isPlainRecord } from '../src/contracts/public-ingress.js';
import {
  applyProductModelToRuntimeConfig,
  parseRuntimeConfigYaml,
  productModelForRuntimeConfig,
  validateRuntimeConfig,
} from '../src/config/runtime-config.js';
import { parseProjectConfiguration, splitRuntimeConfig } from '../src/config/project-configuration.js';
import { productModelSchema } from '../src/config/product-model.js';
import { consumerCleanInitializationProtectedPaths } from '../bin/consumer-clean-initialization-capture.ts';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const repositoryRoot = join(packageRoot, '..', '..');

function inputs() {
  const template = parseRuntimeConfigYaml(readFileSync(join(repositoryRoot, 'agent-runtime.config.v1.yaml'), 'utf8'));
  const proposed: unknown = parse(
    readFileSync(join(packageRoot, 'docs/decisions/configuration/project-config.proposed.yaml'), 'utf8'),
  );
  if (!isPlainRecord(proposed)) throw new Error('Product model proposal must be a mapping');
  const model = productModelSchema.parse({
    schema: 'ProductModel/v1',
    version: 1,
    repository: proposed.repository,
    projects: proposed.projects,
  });
  return { template, model };
}

describe('AgentRuntimeConfig/v1 product model', () => {
  it('protects every declared product path during clean initialization capture', () => {
    const { template, model } = inputs();
    const config = applyProductModelToRuntimeConfig(template, model);
    const protectedPaths = consumerCleanInitializationProtectedPaths(config);
    for (const project of model.projects) {
      for (const value of [
        project.project_root,
        project.documents.root,
        project.documents.index,
        project.documents.requirements.root,
        project.documents.research,
        project.documents.decisions,
        project.work_items.storage_root,
        ...Object.values(project.documents.requirements.areas).flatMap((area) => Object.values(area)),
      ])
        expect(protectedPaths).toContain(value);
    }
  });

  it('keeps the public v1 value serializable after parsing and revalidation', () => {
    const { template, model } = inputs();
    const emitted = applyProductModelToRuntimeConfig(template, model);
    const parsed = parseRuntimeConfigYaml(stringify(emitted));
    expect(parsed.schema).toBe('AgentRuntimeConfig/v1');
    expect(parsed).toEqual(emitted);
    const serialized: unknown = JSON.parse(JSON.stringify(parsed));
    const restored = validateRuntimeConfig(serialized);
    expect(restored).toEqual(emitted);
    expect(productModelForRuntimeConfig(restored)).toEqual(model);
  });

  it('requires a complete explicit project map when template ids differ and preserves provider metadata', () => {
    const { template, model } = inputs();
    const renameProjectReference = (projectId: string): string => (projectId === 'codex' ? 'plugin' : projectId);
    const renamedTemplate = {
      ...template,
      integrations: {
        providers: template.integrations.providers.map((provider) =>
          provider.project_id === 'codex' ? { ...provider, project_id: 'plugin' } : provider,
        ),
      },
      projects: template.projects.map((project) =>
        project.project_id === 'codex' ? { ...project, project_id: 'plugin' } : project,
      ),
      teams: Object.fromEntries(
        Object.entries(template.teams).map(([id, team]) => [
          id,
          { ...team, allowed_projects: team.allowed_projects.map(renameProjectReference) },
        ]),
      ),
      workflow_bindings: template.workflow_bindings.map((binding) => ({
        ...binding,
        projects: binding.projects.map(renameProjectReference),
      })),
    };
    expect(() => applyProductModelToRuntimeConfig(renamedTemplate, model)).toThrow(
      /complete explicit legacy project mapping/,
    );
    expect(() =>
      applyProductModelToRuntimeConfig(renamedTemplate, model, {
        legacy_project_id_map: { plugin: 'codex', absent: 'codex' },
      }),
    ).toThrow(/unknown project/);
    const config = applyProductModelToRuntimeConfig(renamedTemplate, model, {
      legacy_project_id_map: { plugin: 'codex' },
    });
    expect(config.schema).toBe('AgentRuntimeConfig/v1');
    expect(config.repository.prefix).toBe(model.repository.prefix);
    expect(config.integrations.providers.map(({ project_id }) => project_id).sort()).toEqual([
      'agent',
      'codex',
      'powers',
    ]);
    const pluginProvider = template.integrations.providers.find(({ project_id }) => project_id === 'codex');
    if (pluginProvider === undefined) throw new Error('Template codex provider is missing');
    expect(config.integrations.providers.find(({ project_id }) => project_id === 'codex')).toEqual({
      ...pluginProvider,
      project_id: 'codex',
    });
    const expectedProjects = model.projects.map((project) => {
      const legacyId = project.project_id === 'codex' ? 'plugin' : project.project_id;
      const previous = renamedTemplate.projects.find(({ project_id }) => project_id === legacyId);
      if (previous === undefined) throw new Error('Template project is missing: ' + legacyId);
      return {
        ...project,
        delivery_group: previous.delivery_group,
        ...(previous.path_overrides === undefined ? {} : { path_overrides: previous.path_overrides }),
      };
    });
    expect(config.projects).toEqual(expectedProjects);
  });

  it('applies the model without a map when template and model project ids already match', () => {
    const { template, model } = inputs();
    const config = applyProductModelToRuntimeConfig(template, model);
    expect(config.projects.map(({ project_id }) => project_id).sort()).toEqual(['agent', 'codex', 'powers']);
    expect(productModelForRuntimeConfig(config)).toEqual(model);
  });

  it('round-trips through strict v1 validation while retaining the complete model binding', () => {
    const { template, model } = inputs();
    const emitted = applyProductModelToRuntimeConfig(template, model);
    const parsed = parseRuntimeConfigYaml(stringify(emitted));
    expect(productModelForRuntimeConfig(parsed)).toEqual(model);
    expect(
      validateRuntimeConfig(emitted)
        .projects.map(({ project_id }) => project_id)
        .sort(),
    ).toEqual(['agent', 'codex', 'powers']);
  });

  it('rederives the full model after a serializable configuration clone', () => {
    const { template, model } = inputs();
    const emitted = applyProductModelToRuntimeConfig(template, model);
    const reloaded = JSON.parse(JSON.stringify(emitted)) as typeof emitted;
    expect(productModelForRuntimeConfig(reloaded)).toEqual(model);
  });

  it('splits and recomposes strict v1 project components without changing the product model', () => {
    const { template, model } = inputs();
    const emitted = applyProductModelToRuntimeConfig(template, model);
    const components = splitRuntimeConfig(emitted);
    expect(components.project.schema).toBe('VidaProjectConfig/v1');
    const composed = parseProjectConfiguration({
      project: stringify(components.project),
      agents: stringify(components.agents),
      flows: stringify(components.flows),
    });
    expect(productModelForRuntimeConfig(composed.config)).toEqual(model);
  });

  it('rejects malformed project fields and unknown versions', () => {
    const { template, model } = inputs();
    const emitted = applyProductModelToRuntimeConfig(template, model);
    expect(() => validateRuntimeConfig({ ...emitted, version: 2 })).toThrow();
    expect(() =>
      validateRuntimeConfig({
        ...emitted,
        projects: emitted.projects.map((project, index) => (index === 0 ? { ...project, extra: true } : project)),
      }),
    ).toThrow();
  });
});
