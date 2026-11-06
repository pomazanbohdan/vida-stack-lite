import { describe, expect, spyOn, test } from 'bun:test';
import path from 'node:path';
import os from 'node:os';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { composeBootstrap, listBootstrap, main, resolveEntryFile, sortEntries } from '../skills/vida-bootstrap/scripts/bootstrap.ts';
import type { BootstrapEntry } from '../skills/vida-bootstrap/scripts/bootstrap.ts';

const root = path.resolve(import.meta.dir, '../skills/vida-bootstrap');
const registryText = readFileSync(path.join(root, 'bootstrap.registry.json'), 'utf8');

function withRegistry(mutate: (registry: any) => void, run: (directory: string) => void): void {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'vp-bootstrap-cov-'));
  try {
    cpSync(path.join(root, 'references'), path.join(directory, 'references'), { recursive: true });
    const registry = JSON.parse(registryText);
    mutate(registry);
    writeFileSync(path.join(directory, 'bootstrap.registry.json'), JSON.stringify(registry));
    run(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function expectRegistryError(directory: string, message: string): void {
  try {
    composeBootstrap(directory, { role: 'orchestrator' });
    throw new Error('expected a registry failure');
  } catch (error) {
    expect((error as Error).message).toContain(message);
  }
}

describe('bootstrap registry validation', () => {
  const cases: Array<[string, (registry: any) => void, string]> = [
    ['unexpected registry key', (registry) => { registry.extra = true; }, 'unexpected keys'],
    ['invalid revision', (registry) => { registry.revision = 0; }, 'integer in range'],
    ['role_families not an object', (registry) => { registry.role_families = []; }, 'role_families must be an object'],
    ['invalid role name', (registry) => { registry.role_families['Bad Role'] = 'research'; }, 'invalid role name'],
    ['invalid family', (registry) => { registry.role_families.tester = 'bogus'; }, 'invalid family'],
    ['empty role families', (registry) => { registry.role_families = {}; }, 'role_families is empty'],
    ['entries not an array', (registry) => { registry.entries = {}; }, 'entries must be an array'],
    ['empty tag', (registry) => { registry.entries[0].tag = ''; }, 'must be a non-empty string'],
    ['invalid tag', (registry) => { registry.entries[0].tag = 'bad'; }, 'tag is invalid'],
    ['invalid role', (registry) => { registry.entries[0].role = 'other'; }, 'role is invalid'],
    ['invalid kind', (registry) => { registry.entries[0].kind = 'other'; }, 'kind is invalid'],
    ['duplicate role and kind', (registry) => {
      registry.entries[1].role = registry.entries[0].role;
      registry.entries[1].kind = registry.entries[0].kind;
    }, 'duplicate role/kind'],
    ['invalid requires', (registry) => { registry.entries[0].requires = [1]; }, 'requires is invalid'],
    ['duplicate requires', (registry) => { registry.entries[0].requires = ['bootstrap-agent', 'bootstrap-agent']; }, 'requires has duplicates'],
    ['unsupported entry version', (registry) => { registry.entries[0].version = 2; }, 'version is unsupported'],
    ['tag does not match role and kind', (registry) => {
      registry.entries[0].tag = 'bootstrap-agent-unknown';
      registry.entries[0].path = 'references/bootstrap-agent-unknown.md';
    }, 'invalid tag for'],
    ['unknown requirement', (registry) => {
      const entry = registry.entries.find((item: any) => item.kind === 'research');
      entry.requires = ['bootstrap-missing'];
    }, 'requires unknown'],
    ['orchestrator with a dependency', (registry) => { registry.entries[0].requires = ['bootstrap-agent']; }, 'orchestrator must have one dependency-free base'],
    ['agent base with a dependency', (registry) => {
      const entry = registry.entries.find((item: any) => item.tag === 'bootstrap-agent');
      entry.requires = ['bootstrap-orchestrator'];
    }, 'agent base must not require'],
    ['agent delta without a dependency', (registry) => {
      const entry = registry.entries.find((item: any) => item.kind === 'research');
      entry.requires = [];
    }, 'must require exactly the agent base'],
    ['agent delta with the wrong dependency', (registry) => {
      const entry = registry.entries.find((item: any) => item.kind === 'research');
      entry.requires = ['bootstrap-orchestrator'];
    }, 'must require bootstrap-agent'],
    ['missing a base', (registry) => {
      registry.entries = registry.entries.filter((item: any) => item.tag !== 'bootstrap-orchestrator');
    }, 'exactly the two role bases'],
    ['missing a family delta', (registry) => {
      registry.entries = registry.entries.filter((item: any) => item.kind !== 'testing');
    }, 'family testing must have exactly one delta'],
    ['session class as a role', (registry) => { registry.role_families.agent = 'research'; }, 'session class'],
  ];

  for (const [name, mutate, message] of cases) {
    test(name, () => {
      withRegistry(mutate, (directory) => expectRegistryError(directory, message));
    });
  }

  test('rejects a non-file reference and a directory reference', () => {
    withRegistry(() => undefined, (directory) => {
      const reference = path.join(directory, 'references/bootstrap-orchestrator.md');
      rmSync(reference);
      mkdirSync(reference);
      expect(() => composeBootstrap(directory, { role: 'orchestrator' })).toThrow('not a regular package file');
    });
  });

  test('rejects an entry path that escapes references', () => {
    const entry: BootstrapEntry = {
      tag: 'bootstrap-escape', role: 'agent', kind: 'base', title: 'Escape',
      path: 'references/../escape.md', order: 1, requires: [], version: 1,
    };
    expect(() => resolveEntryFile(root, entry)).toThrow('escapes its directory');
  });

  test('sorts equal-order entries by tag', () => {
    const entry = (tag: string): BootstrapEntry => ({
      tag, role: 'agent', kind: 'research', title: tag,
      path: `references/${tag}.md`, order: 1, requires: ['bootstrap-agent'], version: 1,
    });
    expect(sortEntries([entry('bootstrap-b'), entry('bootstrap-a')]).map((item) => item.tag)).toEqual(['bootstrap-a', 'bootstrap-b']);
  });
});

describe('bootstrap selection and CLI', () => {
  test('rejects invalid selector combinations', () => {
    const cases: Array<[string, () => unknown]> = [
      ['tags with kind', () => composeBootstrap(root, { tags: ['bootstrap-agent'], kind: 'testing' })],
      ['role with tags', () => composeBootstrap(root, { role: 'agent', tags: ['bootstrap-agent-testing'] })],
      ['orchestrator with kind', () => composeBootstrap(root, { role: 'orchestrator', kind: 'testing' })],
      ['unknown role name', () => composeBootstrap(root, { role: 'agent', roleName: 'missing' })],
      ['kind and role-name disagree', () => composeBootstrap(root, { role: 'agent', roleName: 'tester', kind: 'research' })],
      ['unknown tag', () => composeBootstrap(root, { tags: ['unknown'] })],
      ['two deltas', () => composeBootstrap(root, { tags: ['bootstrap-agent-testing', 'bootstrap-agent-research'] })],
    ];
    for (const [name, call] of cases) {
      try {
        call();
        throw new Error(`${name} did not fail`);
      } catch (error) {
        expect((error as { code?: string }).code).toBe('BOOTSTRAP_SELECTION_INVALID');
      }
    }
  });

  test('main lists, composes and reports parse errors', () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const out = spyOn(process.stdout, 'write').mockImplementation((text) => { stdout.push(String(text)); return true; });
    const err = spyOn(process.stderr, 'write').mockImplementation((text) => { stderr.push(String(text)); return true; });
    try {
      expect(main(['--list'], root)).toBe(0);
      expect(JSON.parse(stdout[0]!).schema).toBe('VidaBootstrapList/v1');
      stdout.length = 0;
      expect(main(['--json'], root)).toBe(0);
      expect(JSON.parse(stdout[0]!).role).toBe('orchestrator');
      stdout.length = 0;
      expect(main([], root)).toBe(0);
      expect(stdout[0]).toContain('# Orchestrator bootstrap');

      const invalid = [
        ['--role'],
        ['--role', 'other'],
        ['--role', 'agent', '--role', 'agent'],
        ['--kind'],
        ['--kind', 'bogus'],
        ['--kind', 'testing'],
        ['--kind', 'testing', '--kind', 'research'],
        ['--kind', 'testing', '--tag', 'x'],
        ['--tag', 'x', '--kind', 'testing'],
        ['--role-name'],
        ['--role-name', 'x', '--role-name', 'y'],
        ['--tag', 'x', '--role-name', 'y'],
        ['--role', 'agent', '--tag', 'x'],
        ['--list', '--list'],
        ['--json', '--json'],
        ['--require-complete', '--require-complete'],
        ['--bogus'],
        ['--list', '--require-complete'],
        ['--list', '--role', 'agent'],
      ];
      for (const args of invalid) {
        stdout.length = 0;
        stderr.length = 0;
        expect(main(args, root)).toBe(1);
        expect(JSON.parse(stderr[0]!).code).toBe('BOOTSTRAP_ARGUMENT_INVALID');
      }

      stdout.length = 0;
      stderr.length = 0;
      expect(main(['--role', 'agent', '--require-complete'], root)).toBe(1);
      expect(JSON.parse(stderr[0]!).code).toBe('BOOTSTRAP_ASSIGNMENT_INCOMPLETE');
    } finally {
      out.mockRestore();
      err.mockRestore();
    }
  });

  test('lists entries in order and exposes the package root default', () => {
    const list = listBootstrap(root);
    expect(list.entries.map((entry) => entry.tag)).toContain('bootstrap-orchestrator');
    const stdout = spyOn(process.stdout, 'write').mockImplementation(() => true);
    try {
      expect(main(['--list'])).toBe(0);
    } finally {
      stdout.mockRestore();
    }
  });
});
