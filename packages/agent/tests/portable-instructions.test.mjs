import { afterAll, beforeAll, expect, test } from 'bun:test';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { boundedSpawnSync, executionBudget } from '../bin/bun.mjs';

const bundleRoot = path.resolve(import.meta.dirname, '..');
const required = [
  'development-lifecycle',
  'agent-allocation',
  'request-clarification',
  'adaptive-reporting',
  'requirement-routing',
  'knowledge-graph',
];
const roots = [];
const fixtures = new Map();
const phaseBudget = executionBudget(undefined, 30_000);
afterAll(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

beforeAll(() => {
  const started = performance.now();
  for (const bundleName of ['npm-package', 'vida agent-\u0454']) {
    const root = mkdtempSync(path.join(os.tmpdir(), 'vida agent-\u0454-'));
    roots.push(root);
    const consumer = path.join(root, 'consumer');
    const bundle = path.join(root, bundleName);
    mkdirSync(consumer);
    mkdirSync(path.join(bundle, 'bin'), { recursive: true });
    cpSync(path.join(bundleRoot, 'instructions'), path.join(bundle, 'instructions'), { recursive: true });
    cpSync(path.join(bundleRoot, 'bin/vida-agent.mjs'), path.join(bundle, 'bin/vida-agent.mjs'));
    cpSync(path.join(bundleRoot, 'bin/bun.mjs'), path.join(bundle, 'bin/bun.mjs'));
    cpSync(path.join(bundleRoot, 'bin/cli-metadata.mjs'), path.join(bundle, 'bin/cli-metadata.mjs'));
    cpSync(path.join(bundleRoot, 'package.json'), path.join(bundle, 'package.json'));
    const agents = readFileSync(path.join(bundleRoot, 'templates/AGENTS.template.md'), 'utf8').replaceAll(
      '{{BUNDLE}}',
      'vida-agent',
    );
    writeFileSync(path.join(consumer, 'AGENTS.md'), agents);
    fixtures.set(bundleName, { consumer, bundle, agents });
  }
  phaseBudget.remaining();
  process.stderr.write(
    JSON.stringify({ stage: 'relocation fixture preparation', elapsed_ms: performance.now() - started }) + '\n',
  );
}, 5_000);

for (const bundleName of ['npm-package', 'vida agent-\u0454']) {
  test(`portable AGENTS template remains portable after relocation: ${bundleName}`, () => {
    const { consumer, bundle, agents } = fixtures.get(bundleName);
    expect(agents).not.toContain('{{BUNDLE}}');
    expect(agents).toContain('vida-agent instructions --path development-lifecycle');
    expect(agents).toContain('vida-agent instructions --path NAME');
    for (const name of required) expect(agents).toContain(name);
    expect(existsSync(path.join(consumer, 'vida-agent'))).toBe(false);
    expect(agents).not.toContain(bundle);
    expect(agents).not.toMatch(/C:[/\\]|creatio-sample|agent-runtime\/instructions/);
    expect(agents).toContain('`repository_id`');
    expect(agents).toContain('`project_ids`');
    expect(agents).toContain('Provider,\ntenant and namespace IDs are integration metadata only');
    expect(agents).not.toContain('New tenant/project work uses protocol v4');
    expect(agents).not.toContain('add tenant/project\ncontour keys');
  });
  for (const name of required)
    test(`portable AGENTS discovers package instruction after relocation: ${bundleName}/${name}`, () => {
      const { consumer, bundle } = fixtures.get(bundleName);
      const result = boundedSpawnSync(
        spawnSync,
        process.execPath,
        [path.join(bundle, 'bin/vida-agent.mjs'), 'instructions', '--path', name],
        {
          cwd: consumer,
          encoding: 'utf8',
          windowsHide: true,
          timeout: 5_000,
          budget: phaseBudget.child(5_000, 250),
          diagnostics: true,
        },
        `relocated instruction ${bundleName}/${name}`,
      );
      expect(result.status, result.stderr).toBe(0);
      const instruction = JSON.parse(result.stdout);
      expect(instruction.schema).toBe('VidaAgentInstruction/v1');
      expect(instruction.package).toBe('vida-agent');
      expect(instruction.path).toBe(path.join(bundle, 'instructions', `${name}.md`));
      const content = readFileSync(instruction.path, 'utf8');
      expect(content.trim().length).toBeGreaterThan(0);
      expect(content).not.toMatch(
        /\b(?:crmbx|3mob|creatio-sample|agentsustem)\b|C:[/\\]|\/(?:Users|home)\/|agent-runtime\//i,
      );
    });
}

test('relocated sidecar keeps project context outside a Unicode bundle', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'vida project-\u0454-'));
  roots.push(root);
  const bundleName = 'vida agent-\u0454';
  const repository = 'portable-repository';
  const projects = 'project-one, project-two';
  mkdirSync(path.join(root, bundleName));
  const template = readFileSync(path.join(bundleRoot, 'templates', 'AGENT.sidecar.template.md'), 'utf8');
  const rendered = template
    .replaceAll('{{REPOSITORY}}', repository)
    .replaceAll('{{PROJECTS}}', projects)
    .replaceAll('{{BUNDLE}}', bundleName);
  const sidecar = path.join(root, 'AGENT.sidecar.md');
  writeFileSync(sidecar, rendered);
  expect(readFileSync(sidecar, 'utf8')).toBe(rendered);
  expect(rendered).toContain(`Repository: ${repository}`);
  expect(rendered).toContain(`Selected projects: ${projects}`);
  expect(rendered).toContain(`Runtime bundle: ${bundleName}`);
  expect(rendered).toContain('This project-owned sidecar is the source map');
  expect(rendered).toContain('Framework documentation and agent instructions stay inside the runtime bundle.');
  expect(rendered).toContain('Project documents and operational state stay outside it.');
  expect(rendered).not.toMatch(/\{\{(?:REPOSITORY|PROJECTS|BUNDLE)\}\}|creatio-sample|agent-runtime-new/);
});
