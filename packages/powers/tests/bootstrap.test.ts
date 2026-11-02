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
  const defaultResult = composeBootstrap(root, {});
  expect(defaultResult.role).toBe('orchestrator');
  expect(defaultResult.complete).toBe(true);
  expect(defaultResult.defaulted).toBe(true);
  expect(defaultResult.requiresRoleOrFamily).toBe(false);

  const explicitOrchestrator = composeBootstrap(root, { role: 'orchestrator' });
  expect(explicitOrchestrator.complete).toBe(true);
  expect(explicitOrchestrator.defaulted).toBe(false);
  expect(explicitOrchestrator.requiresRoleOrFamily).toBe(false);

  const baseOnly = composeBootstrap(root, { role: 'agent' });
  expect(baseOnly.tags).toEqual(['bootstrap-agent']);
  expect(baseOnly.complete).toBe(false);
  expect(baseOnly.defaulted).toBe(false);
  expect(baseOnly.requiresRoleOrFamily).toBe(true);
  try {
    composeBootstrap(root, { role: 'agent', requireComplete: true });
    throw new Error('expected incomplete bootstrap to fail');
  } catch (error) {
    expect((error as { code?: string }).code).toBe('BOOTSTRAP_ASSIGNMENT_INCOMPLETE');
  }
  expect(composeBootstrap(root, { role: 'agent', roleName: 'tester', requireComplete: true }).complete).toBe(true);
  expect(composeBootstrap(root, { role: 'orchestrator', requireComplete: true }).complete).toBe(true);

  expect(composeBootstrap(root, { tags: ['bootstrap-agent'] }).kind).toBe('base');
  for (const family of ['research', 'synthesis', 'prewrite', 'implementation', 'validation', 'testing', 'delivery']) {
    const result = composeBootstrap(root, { tags: [`bootstrap-agent-${family}`] });
    expect(result.tags).toEqual(['bootstrap-agent', `bootstrap-agent-${family}`]);
    expect(result.complete).toBe(true);
    expect(result.requiresRoleOrFamily).toBe(false);
    expect(result.digest).toBe(createHash('sha256').update(result.text).digest('hex'));
    expect(result.textBytes).toBe(Buffer.byteLength(result.text));
  }

  const completeAgent = composeBootstrap(root, { role: 'agent', roleName: 'tester' });
  expect(completeAgent.complete).toBe(true);
  expect(completeAgent.requiresRoleOrFamily).toBe(false);
});

test('role texts assign wait/join to the orchestrator and blocked needs_input to agents', () => {
  const orchestrator = readFileSync(path.join(root, 'references/bootstrap-orchestrator.md'), 'utf8');
  const agent = readFileSync(path.join(root, 'references/bootstrap-agent.md'), 'utf8');
  expect(orchestrator).toContain('A turn may pause only through a host-provided wait/completion mechanism.');
  expect(orchestrator).toContain('Never silently pause, poll task status, sleep, or busy-wait.');
  expect(agent).toContain('The orchestrator owns the delegation decision, host wait/completion, join and');
  expect(agent).toContain('`status: blocked` with reason `needs_input`');
  expect(agent).toContain('silently pause or wait');
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
  expect(parsed.role).toBe('agent');
  expect(parsed.complete).toBe(true);
  expect(parsed.defaulted).toBe(false);
  expect(parsed.requiresRoleOrFamily).toBe(false);

  const defaultJson = JSON.parse(run('--json').stdout);
  expect(defaultJson.role).toBe('orchestrator');
  expect(defaultJson.complete).toBe(true);
  expect(defaultJson.defaulted).toBe(true);
  expect(defaultJson.requiresRoleOrFamily).toBe(false);

  const baseJson = JSON.parse(run('--role', 'agent', '--json').stdout);
  expect(baseJson.role).toBe('agent');
  expect(baseJson.complete).toBe(false);
  expect(baseJson.defaulted).toBe(false);
  expect(baseJson.requiresRoleOrFamily).toBe(true);

  const explicitOrchestratorJson = JSON.parse(run('--role', 'orchestrator', '--json').stdout);
  expect(explicitOrchestratorJson.complete).toBe(true);
  expect(explicitOrchestratorJson.defaulted).toBe(false);
  expect(explicitOrchestratorJson.requiresRoleOrFamily).toBe(false);

  const incomplete = run('--role', 'agent', '--require-complete', '--json');
  expect(incomplete.status).toBe(1);
  expect(incomplete.stdout).toBe('');
  expect(incomplete.stderr).toContain('BOOTSTRAP_ASSIGNMENT_INCOMPLETE');
  const complete = run('--role', 'agent', '--role-name', 'tester', '--require-complete', '--json');
  expect(complete.status).toBe(0);
  expect(JSON.parse(complete.stdout).complete).toBe(true);

  for (const args of [
    ['--list', '--require-complete'],
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
