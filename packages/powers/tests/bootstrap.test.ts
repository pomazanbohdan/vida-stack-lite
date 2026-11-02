import { expect, test } from 'bun:test';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { composeBootstrap, listBootstrap } from '../skills/vida-bootstrap/scripts/bootstrap.ts';

const root = path.resolve(import.meta.dir, '../skills/vida-bootstrap');

test('all configured roles compose exactly their base and family', () => {
  const list = listBootstrap(root);
  expect(list.roleFamilies).toEqual({
    'code-researcher': 'research', 'diagnostics-researcher': 'research',
    'documentation-researcher': 'research', 'platform-researcher': 'research',
    'requirements-researcher': 'research', 'security-data-researcher': 'research',
    'research-synthesizer': 'synthesis', 'source-planner': 'prewrite',
    'security-prewriter': 'prewrite', 'developer-orchestrator': 'implementation',
    'correctness-validator': 'validation', 'regression-validator': 'validation',
    'requirements-validator': 'validation', 'security-data-validator': 'validation',
    tester: 'testing', 'delivery-agent': 'delivery',
  });
  expect(list.entries).toHaveLength(9);
  for (const [roleName, family] of Object.entries(list.roleFamilies)) {
    expect(composeBootstrap(root, { role: 'agent', roleName }).tags)
      .toEqual(['bootstrap-agent', `bootstrap-agent-${family}`]);
  }
});

test('base-only, family tags, text and digest are consistent', () => {
  expect(composeBootstrap(root, { role: 'agent' }).tags).toEqual(['bootstrap-agent']);
  expect(composeBootstrap(root, { tags: ['bootstrap-agent'] }).kind).toBe('base');
  for (const family of ['research', 'synthesis', 'prewrite', 'implementation', 'validation', 'testing', 'delivery']) {
    const result = composeBootstrap(root, { tags: [`bootstrap-agent-${family}`] });
    expect(result.tags).toEqual(['bootstrap-agent', `bootstrap-agent-${family}`]);
    expect(result.digest).toBe(createHash('sha256').update(result.text).digest('hex'));
    expect(result.textBytes).toBe(Buffer.byteLength(result.text));
  }
});

test('CLI works from foreign cwd and rejects invalid selectors without stdout', () => {
  const cli = path.join(root, 'scripts/bootstrap.ts');
  const run = (...args: string[]) => spawnSync(process.execPath, [cli, ...args], { cwd: os.tmpdir(), encoding: 'utf8', timeout: 5000 });
  const direct = run();
  expect(direct.status).toBe(0);
  expect(direct.stdout).toContain('# Orchestrator bootstrap');
  const json = run('--role', 'agent', '--role-name', 'tester', '--json');
  expect(json.status).toBe(0);
  const parsed = JSON.parse(json.stdout);
  expect(parsed.digest).toBe(createHash('sha256').update(parsed.text).digest('hex'));
  for (const args of [
    ['--role', 'agent', '--role-name', 'missing'],
    ['--role', 'orchestrator', '--kind', 'testing'],
    ['--role', 'agent', '--role-name', 'tester', '--kind', 'research'],
    ['--tag', 'bootstrap-agent-testing', '--tag', 'bootstrap-orchestrator'],
    ['--tag', 'unknown'], ['--kind', 'testing'], ['--list', '--role', 'agent'],
  ]) {
    const result = run(...args);
    expect(result.status, args.join(' ')).toBe(1);
    expect(result.stdout).toBe('');
  }
});

test('self-contained source rejects malformed registry and traversal', () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'vp-bootstrap-'));
  try {
    cpSync(path.join(root, 'references'), path.join(directory, 'references'), { recursive: true });
    const registryPath = path.join(directory, 'bootstrap.registry.json');
    const original = readFileSync(path.join(root, 'bootstrap.registry.json'), 'utf8');
    writeFileSync(registryPath, original);
    expect(composeBootstrap(directory, { role: 'agent', roleName: 'tester' }).kind).toBe('testing');
    const registry = JSON.parse(original);
    const schema = JSON.parse(readFileSync(path.join(root, 'schemas/bootstrap-registry.v1.schema.json'), 'utf8'));
    const pattern = new RegExp(schema.properties.entries.items.properties.path.pattern);
    expect(registry.entries.every((entry: { path: string }) => pattern.test(entry.path))).toBe(true);
    registry.schema = 'invalid';
    writeFileSync(registryPath, JSON.stringify(registry));
    expect(() => composeBootstrap(directory, { role: 'orchestrator' })).toThrow('unsupported registry schema');
    registry.schema = 'VidaBootstrapRegistry/v1';
    registry.entries[0].path = 'references/../escape.md';
    writeFileSync(registryPath, JSON.stringify(registry));
    expect(() => composeBootstrap(directory, { role: 'orchestrator' })).toThrow('path is invalid');
    registry.entries[0].path = 'references/bootstrap-orchestrator.md';
    registry.entries[0].tag = 'bootstrap-wrong';
    writeFileSync(registryPath, JSON.stringify(registry));
    expect(() => composeBootstrap(directory, { role: 'orchestrator' })).toThrow('path does not match tag');
    registry.entries[0].tag = 'bootstrap-orchestrator';
    writeFileSync(registryPath, JSON.stringify(registry));
    cpSync(path.join(root, 'scripts'), path.join(directory, 'scripts'), { recursive: true });
    const result = spawnSync(process.execPath, [path.join(directory, 'scripts/bootstrap.ts'), '--tag', 'bootstrap-agent-testing'], { cwd: os.tmpdir(), encoding: 'utf8', timeout: 5000 });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('# Testing agent delta');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('rejects a symlinked references directory', () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'vp-bootstrap-link-'));
  try {
    cpSync(path.join(root, 'bootstrap.registry.json'), path.join(directory, 'bootstrap.registry.json'));
    symlinkSync(path.join(root, 'references'), path.join(directory, 'references'), process.platform === 'win32' ? 'junction' : 'dir');
    expect(() => composeBootstrap(directory, { role: 'orchestrator' })).toThrow('not a regular directory');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
