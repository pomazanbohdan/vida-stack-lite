import { expect, test } from 'bun:test';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parse, stringify } from 'yaml';
import type { AgentRuntimeConfig } from '../src/config/runtime-config.ts';
import { captureConsumerCleanInitializationV2 } from '../bin/consumer-clean-initialization-capture.ts';
import { makeFreshRepository } from './helpers/project-upgrade-fixture.ts';

type DeepMutable<T> = T extends readonly [unknown, ...unknown[]]
  ? { -readonly [Key in keyof T]: DeepMutable<T[Key]> }
  : T extends readonly (infer Item)[]
    ? DeepMutable<Item>[]
    : T extends object
      ? { -readonly [Key in keyof T]: DeepMutable<T[Key]> }
      : T;

const pendingPaths = [
  '.agent/consumer-clean-initialization.pending.v1.json',
  '.agent/runtime-initialization.pending.v1.json',
  '.agent/clean-initialization-history',
] as const;

function expectNoInitializationEffects(root: string): void {
  for (const relative of pendingPaths) expect(existsSync(path.join(root, ...relative.split('/')))).toBe(false);
}

test('captures approved file observations and protected project paths without effects', async () => {
  const root = await makeFreshRepository('clean-init-capture-');
  let passed = false;
  try {
    mkdirSync(path.join(root, '.agent/work'), { recursive: true });
    mkdirSync(path.join(root, '.vida'), { recursive: true });
    writeFileSync(path.join(root, '.agent/work/evidence.txt'), 'work evidence\n');
    writeFileSync(path.join(root, '.vida/state.txt'), 'vida state\n');
    const configPath = path.join(root, 'agent-runtime.config.v1.yaml');
    const config = parse(readFileSync(configPath, 'utf8')) as DeepMutable<AgentRuntimeConfig>;
    config.paths.defaults.project_root = '.';
    const products = [
      {
        id: 'agent',
        root: 'packages/agent',
        prefix: 'AGENT',
        selectors: ['packages/agent/src/**', 'packages/agent/bin/**', 'packages/agent/tests/**'],
      },
      {
        id: 'codex',
        root: 'packages/codex',
        prefix: 'CODEX',
        selectors: ['packages/codex/package.json'],
      },
      {
        id: 'powers',
        root: 'packages/powers',
        prefix: 'POWERS',
        selectors: ['packages/powers/skills/**', 'packages/powers/tests/**'],
      },
    ] as const;
    const templateProject = config.projects[0];
    if (templateProject === undefined) throw new Error('fixture project is missing');
    config.projects = products.map((product) => {
      const project = structuredClone(templateProject);
      project.project_id = product.id;
      project.title = product.id;
      project.prefix = product.prefix;
      project.project_root = product.root;
      project.code_selectors = [...product.selectors];
      project.documents.root = `${product.root}/docs`;
      project.documents.index = `${product.root}/AGENT.sidecar.md`;
      project.documents.requirements.root = `${product.root}/docs/requirements`;
      project.documents.requirements.areas = {};
      project.documents.research = `${product.root}/docs/research`;
      project.documents.decisions = `${product.root}/docs/decisions`;
      project.work_items.storage_root = `${product.root}/backlogs`;
      project.delivery_group = product.id;
      if (product.id === 'agent') project.path_overrides = { tests_root: 'packages/agent/custom-tests' };
      return project;
    });
    config.integrations.providers = products.map((product) => ({
      id: `local-${product.id}`,
      provider: 'local',
      project_id: product.id,
      tenant_id: 'local',
      namespace: product.id,
    }));
    config.teams['default-development']!.allowed_projects = products.map((product) => product.id);
    writeFileSync(configPath, stringify(config));
    const managed = [
      'agent-runtime.config.v1.yaml',
      'AGENT.sidecar.md',
      'AGENTS.md',
      'docs/agent-instructions/documentation-policy.v1.json',
      '.agent/work/evidence.txt',
      '.vida/state.txt',
    ];
    const before = new Map(
      managed.map((relative) => [relative, readFileSync(path.join(root, ...relative.split('/')))] as const),
    );
    const plan = captureConsumerCleanInitializationV2({
      projectRoot: root,
      repository: 'lifecycle-fixture',
      projectMappings: products.map((product) => `${product.id}=${product.root}`),
    });
    expect(plan.schema).toBe('ConsumerCleanInitializationOperation/v2');
    expect(plan.phase).toBe('intent');
    expect(plan.prepared).toBeNull();
    expect(plan.initialization).toBe('not-started');
    expect(plan.inventory.map((entry) => entry.path)).toEqual(['agent-runtime.config.v1.yaml']);
    expect(plan.moves.map((move) => move.source)).toEqual(['agent-runtime.config.v1.yaml']);
    expect(plan.moves[0]).toMatchObject({
      source: 'agent-runtime.config.v1.yaml',
      target: `${plan.archive_root}/agent-runtime.config.v1.yaml`,
      state: 'not-started',
    });
    expect(plan.containers.length).toBeGreaterThan(0);
    expect(plan.containers.every((container) => container.state === 'not-started' && container.identity === null)).toBe(
      true,
    );
    for (const product of products) {
      expect(plan.protected_paths).toContain(product.root);
      expect(plan.protected_paths).toContain(`${product.root}/docs`);
      expect(plan.protected_paths).toContain(`${product.root}/backlogs`);
    }
    expect(plan.protected_paths).toContain('packages/agent/custom-tests');
    expect(plan.protected_paths).toContain('packages/codex/package.json');
    expect(plan.protected_paths).toContain('packages/powers/skills');
    expect(plan.protected_paths).toContain('.agent/work');
    expect(plan.protected_paths).toContain('.vida');
    expect(plan.protected_paths).not.toContain('.');
    for (const [relative, bytes] of before)
      expect(readFileSync(path.join(root, ...relative.split('/'))).equals(bytes)).toBe(true);
    expectNoInitializationEffects(root);
    passed = true;
  } finally {
    if (passed) rmSync(root, { recursive: true, force: true });
    else console.error('Retained failed clean-init capture fixture: ' + root);
  }
});

test('refuses an explicit repository-root project without changing managed inputs', async () => {
  const root = await makeFreshRepository('clean-init-capture-root-');
  let passed = false;
  try {
    const configPath = path.join(root, 'agent-runtime.config.v1.yaml');
    const config = readFileSync(configPath);
    const sidecar = readFileSync(path.join(root, 'AGENT.sidecar.md'));
    expect(() =>
      captureConsumerCleanInitializationV2({
        projectRoot: root,
        repository: 'lifecycle-fixture',
        projectMappings: ['fixture=.'],
      }),
    ).toThrow(/protected archive source or target/u);
    expect(readFileSync(configPath).equals(config)).toBe(true);
    expect(readFileSync(path.join(root, 'AGENT.sidecar.md')).equals(sidecar)).toBe(true);
    expectNoInitializationEffects(root);
    passed = true;
  } finally {
    if (passed) rmSync(root, { recursive: true, force: true });
    else console.error('Retained failed root-wide clean-init fixture: ' + root);
  }
});

test('refuses a non-dot protected default overlap without changing managed inputs', async () => {
  const root = await makeFreshRepository('clean-init-capture-default-overlap-');
  let passed = false;
  try {
    mkdirSync(path.join(root, 'packages/fixture'), { recursive: true });
    const configPath = path.join(root, 'agent-runtime.config.v1.yaml');
    const config = parse(readFileSync(configPath, 'utf8')) as DeepMutable<AgentRuntimeConfig>;
    const project = config.projects[0];
    if (project === undefined) throw new Error('fixture project is missing');
    project.project_root = 'packages/fixture';
    config.paths.defaults.project_root = '.agent';
    writeFileSync(configPath, stringify(config));
    const before = readFileSync(configPath);
    const sidecar = readFileSync(path.join(root, 'AGENT.sidecar.md'));
    expect(() =>
      captureConsumerCleanInitializationV2({
        projectRoot: root,
        repository: 'lifecycle-fixture',
        projectMappings: ['fixture=packages/fixture'],
      }),
    ).toThrow(/protected archive source or target/u);
    expect(readFileSync(configPath).equals(before)).toBe(true);
    expect(readFileSync(path.join(root, 'AGENT.sidecar.md')).equals(sidecar)).toBe(true);
    expectNoInitializationEffects(root);
    passed = true;
  } finally {
    if (passed) rmSync(root, { recursive: true, force: true });
    else console.error('Retained failed default-overlap clean-init fixture: ' + root);
  }
});
