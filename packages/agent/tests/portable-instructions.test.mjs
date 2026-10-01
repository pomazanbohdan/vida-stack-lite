import { afterEach, expect, test } from 'bun:test';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

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
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

test('public package command reports its version and supported commands and rejects invalid discovery', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'vida-public-cli-'));
  roots.push(root);
  const bundle = path.join(root, 'package');
  mkdirSync(path.join(bundle, 'bin'), { recursive: true });
  cpSync(path.join(bundleRoot, 'bin/vida-agent.mjs'), path.join(bundle, 'bin/vida-agent.mjs'));
  cpSync(path.join(bundleRoot, 'package.json'), path.join(bundle, 'package.json'));
  const invoke = (...args) =>
    spawnSync(process.execPath, [path.join(bundle, 'bin/vida-agent.mjs'), ...args], {
      cwd: root,
      encoding: 'utf8',
      windowsHide: true,
    });
  const version = invoke('version');
  expect(version.status, version.stderr).toBe(0);
  expect(JSON.parse(version.stdout)).toEqual({
    schema: 'VidaAgentPackage/v1',
    name: 'vida-agent',
    version: JSON.parse(readFileSync(path.join(bundle, 'package.json'), 'utf8')).version,
  });
  for (const command of ['help', '--help']) {
    const result = invoke(command);
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      schema: 'VidaAgentCommandResult/v1',
      status: 'help',
      commands: [
        'run',
        'init',
        'install',
        'reconcile-artifacts',
        'documentation-clear',
        'scope',
        'instructions',
        'version',
      ],
    });
  }
  for (const args of [
    [],
    ['unknown'],
    ['version', 'extra'],
    ['help', 'extra'],
    ['instructions'],
    ['instructions', '--path', '../package.json'],
    ['instructions', '--path', 'missing'],
  ]) {
    const result = invoke(...args);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(JSON.parse(result.stderr)).toMatchObject({
      schema: 'VidaAgentCommandResult/v1',
      status: 'blocked',
      code: 'GAP-VIDA-CLI-001',
    });
  }
  expect(existsSync(path.join(root, '.agent'))).toBe(false);
});

for (const bundleName of ['npm-package', 'vida agent-\u0454']) {
  test(`portable AGENTS discovers package instructions after relocation: ${bundleName}`, () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'vida agent-\u0454-'));
    roots.push(root);
    const consumer = path.join(root, 'consumer');
    const bundle = path.join(root, bundleName);
    mkdirSync(consumer);
    mkdirSync(path.join(bundle, 'bin'), { recursive: true });
    cpSync(path.join(bundleRoot, 'instructions'), path.join(bundle, 'instructions'), { recursive: true });
    cpSync(path.join(bundleRoot, 'bin/vida-agent.mjs'), path.join(bundle, 'bin/vida-agent.mjs'));
    cpSync(path.join(bundleRoot, 'package.json'), path.join(bundle, 'package.json'));
    const agents = readFileSync(path.join(bundleRoot, 'templates/AGENTS.template.md'), 'utf8').replaceAll(
      '{{BUNDLE}}',
      'vida-agent',
    );
    writeFileSync(path.join(consumer, 'AGENTS.md'), agents);
    expect(agents).not.toContain('{{BUNDLE}}');
    expect(agents).toContain('vida-agent instructions --path development-lifecycle');
    expect(agents).toContain('vida-agent instructions --path NAME');
    for (const name of required) {
      expect(agents).toContain(name);
      const result = spawnSync(
        process.execPath,
        [path.join(bundle, 'bin/vida-agent.mjs'), 'instructions', '--path', name],
        {
          cwd: consumer,
          encoding: 'utf8',
          windowsHide: true,
        },
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
    }
    expect(existsSync(path.join(consumer, 'vida-agent'))).toBe(false);
    expect(agents).not.toContain(bundle);
    expect(agents).not.toMatch(/C:[/\\]|creatio-sample|agent-runtime\/instructions/);
    expect(agents).toContain('`repository_id`');
    expect(agents).toContain('`project_ids`');
    expect(agents).toContain('Provider,\ntenant and namespace IDs are integration metadata only');
    expect(agents).not.toContain('New tenant/project work uses protocol v4');
    expect(agents).not.toContain('add tenant/project\ncontour keys');
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
