import { expect, test } from 'bun:test';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parse, stringify } from 'yaml';
import { captureConsumerCleanInitializationV2 } from '../bin/consumer-clean-initialization-capture.ts';
import { makeFreshRepository } from './helpers/project-upgrade-fixture.ts';

test('captures approved file observations and protected project paths without effects', async () => {
  const root = await makeFreshRepository('clean-init-capture-');
  let passed = false;
  try {
    const packageRoot = 'packages/agent';
    const directories = [
      `${packageRoot}/src`,
      `${packageRoot}/docs/agent-instructions`,
      `${packageRoot}/docs/requirements`,
      `${packageRoot}/tests`,
      `${packageRoot}/.planning/agent-flow/wiki-output`,
      `${packageRoot}/backlogs`,
    ];
    for (const directory of directories) mkdirSync(path.join(root, directory), { recursive: true });
    copyFileSync(path.join(root, 'AGENT.sidecar.md'), path.join(root, packageRoot, 'AGENT.sidecar.md'));
    copyFileSync(
      path.join(root, 'docs/agent-instructions/documentation-policy.v1.json'),
      path.join(root, packageRoot, 'docs/agent-instructions/documentation-policy.v1.json'),
    );
    const configPath = path.join(root, 'agent-runtime.config.v1.yaml');
    const config = parse(readFileSync(configPath, 'utf8')) as {
      repository: { code_selectors: string[] };
      paths: { defaults: Record<string, string> };
      projects: Array<Record<string, unknown> & { code_selectors: string[] }>;
    };
    config.repository.code_selectors = [`${packageRoot}/src/**`];
    config.paths.defaults.project_root = packageRoot;
    config.paths.defaults.code_root = `${packageRoot}/src`;
    config.paths.defaults.documentation_root = `${packageRoot}/docs`;
    config.paths.defaults.wiki_root = `${packageRoot}/docs`;
    config.paths.defaults.wiki_path = `${packageRoot}/AGENT.sidecar.md`;
    config.paths.defaults.wiki_output_root = `${packageRoot}/.planning/agent-flow/wiki-output`;
    config.paths.defaults.documentation_policy_path = `${packageRoot}/docs/agent-instructions/documentation-policy.v1.json`;
    config.paths.defaults.documentation_map_path = `${packageRoot}/AGENT.sidecar.md`;
    config.paths.defaults.documentation_index_path = `${packageRoot}/AGENT.sidecar.md`;
    config.paths.defaults.documentation_changelog_root = `${packageRoot}/docs`;
    config.paths.defaults.documentation_evidence_root = '.agent/work';
    config.paths.defaults.internal_root = `${packageRoot}/docs`;
    config.paths.defaults.internal_requirements_root = `${packageRoot}/docs/requirements`;
    config.paths.defaults.tests_root = `${packageRoot}/tests`;
    config.paths.defaults.derived_output_root = `${packageRoot}/.planning/agent-flow`;
    config.paths.defaults.ledger_root = `${packageRoot}/backlogs`;
    Object.assign(config.projects[0]!, {
      project_root: packageRoot,
      wiki_root: `${packageRoot}/docs`,
      wiki_path: `${packageRoot}/AGENT.sidecar.md`,
      wiki_output_root: `${packageRoot}/.planning/agent-flow/wiki-output`,
      internal_root: `${packageRoot}/docs`,
      ledger_root: `${packageRoot}/backlogs`,
      code_selectors: [`${packageRoot}/src/**`],
    });
    writeFileSync(configPath, stringify(config));
    const before = readFileSync(configPath);
    const preservedBefore = readFileSync(path.join(root, 'AGENT.sidecar.md'));
    const plan = captureConsumerCleanInitializationV2({
      projectRoot: root,
      repository: 'lifecycle-fixture',
      projectMappings: [`fixture=${packageRoot}`],
    });
    expect(plan.schema).toBe('ConsumerCleanInitializationOperation/v2');
    expect(plan.inventory.map((entry) => entry.path)).toContain('agent-runtime.config.v1.yaml');
    expect(plan.preserved.map((entry) => entry.path)).toEqual([
      'AGENT.sidecar.md',
      'AGENTS.md',
      'docs/agent-instructions/documentation-policy.v1.json',
    ]);
    expect(plan.protected_paths).toContain(`${packageRoot}/docs`);
    expect(plan.protected_paths).toContain('.agent/work');
    expect(plan.moves[0]).toMatchObject({
      source: 'agent-runtime.config.v1.yaml',
      state: 'not-started',
    });
    expect(readFileSync(configPath).equals(before)).toBe(true);
    expect(readFileSync(path.join(root, 'AGENT.sidecar.md')).equals(preservedBefore)).toBe(true);
    expect(readFileSync(path.join(root, 'AGENTS.md')).length).toBeGreaterThan(0);
    expect(
      readFileSync(path.join(root, 'docs/agent-instructions/documentation-policy.v1.json')).length,
    ).toBeGreaterThan(0);
    expect(plan.operation_id).toMatch(/^[0-9a-f-]{36}$/u);
    passed = true;
  } finally {
    if (passed) rmSync(root, { recursive: true, force: true });
    else console.error('Retained failed clean-init capture fixture: ' + root);
  }
});

test('refuses a root-wide project mapping without changing managed inputs', async () => {
  const root = await makeFreshRepository('clean-init-capture-root-');
  let passed = false;
  try {
    const config = readFileSync(path.join(root, 'agent-runtime.config.v1.yaml'));
    const sidecar = readFileSync(path.join(root, 'AGENT.sidecar.md'));
    expect(() =>
      captureConsumerCleanInitializationV2({
        projectRoot: root,
        repository: 'lifecycle-fixture',
        projectMappings: ['fixture=.'],
      }),
    ).toThrow();
    expect(readFileSync(path.join(root, 'agent-runtime.config.v1.yaml')).equals(config)).toBe(true);
    expect(readFileSync(path.join(root, 'AGENT.sidecar.md')).equals(sidecar)).toBe(true);
    expect(existsSync(path.join(root, '.agent/consumer-clean-initialization.pending.v1.json'))).toBe(false);
    passed = true;
  } finally {
    if (passed) rmSync(root, { recursive: true, force: true });
    else console.error('Retained failed root-wide clean-init fixture: ' + root);
  }
});
