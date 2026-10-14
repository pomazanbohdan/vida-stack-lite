import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import manifest from '../package.json' with { type: 'json' };
import { cliMetadataResult } from '../bin/cli-metadata.ts';
import { inspectScope } from '../bin/scope.ts';
import { freezeCliDeclaration, cliCommandSet, cliCommandNames } from '../bin/cli-command-contracts.ts';
import { runOptionDetails, runScalarOptionFields, runRepeatedOptions } from '../bin/run-cli-options.ts';
import { expectRejection } from './helpers/expect-rejection.js';

test('malformed scope argv reports actual public help syntax before configuration access', async () => {
  const help = cliMetadataResult(['scope', '--help'], manifest);
  if (!help || typeof help !== 'object' || !('syntax' in help) || typeof help.syntax !== 'string')
    throw new Error('scope help is unavailable');
  const malformed: readonly (readonly string[])[] = [
    ['--project-root', '/never-read', '--repository', 'example', '--unknown', 'value'],
    ['--project-root', '/never-read', '--repository'],
    ['--project-root', '/never-read'],
    ['--project-root', '/never-read', '--repository', 'example'],
    ['--project-root', '/never-read', '--repository', 'example', '--project', 'agent'],
  ];
  for (const args of malformed) await expectRejection(inspectScope(args), help.syntax);
});

test('duplicate scope paths reject before configuration access', async () => {
  const prefix = ['--project-root', '/never-read', '--repository', 'example', '--project', 'agent'];
  for (const paths of [
    ['--path', 'src/a.ts', '--path', 'src/a.ts'],
    ['--path', 'src/a.ts', '--repository-path', 'src/a.ts'],
  ])
    await expectRejection(inspectScope([...prefix, ...paths]), 'duplicate scope path');
});

test('public scope dispatch reaches the native TypeScript command', () => {
  const result = spawnSync(
    process.execPath,
    [
      '--no-env-file',
      '--no-install',
      fileURLToPath(new URL('../bin/vida-agent.ts', import.meta.url)),
      'scope',
      '--project-root',
      '/never-read',
      '--repository',
      'example',
      '--project',
      'agent',
      '--path',
      'src/a.ts',
      '--repository-path',
      'src/a.ts',
    ],
    { encoding: 'utf8', windowsHide: true },
  );
  expect(result.error).toBeUndefined();
  expect(result.signal).toBeNull();
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('"message":"duplicate scope path"');
  const error: unknown = JSON.parse(result.stderr);
  expect(error).toMatchObject({
    schema: 'VidaAgentCommandResult/v1',
    status: 'blocked',
    code: 'GAP-VIDA-SCOPE-001',
    message: 'duplicate scope path',
  });
});

test.each([
  ['reconcile-artifacts', 'invalid arguments'],
  ['documentation-clear', 'documentation CLEAR arguments invalid'],
])('public %s dispatch reaches its command argument guard', (command, message) => {
  const runtimePath = mkdtempSync(path.join(tmpdir(), 'vida-dispatch-runtime-'));
  try {
    symlinkSync(process.execPath, path.join(runtimePath, process.platform === 'win32' ? 'bun.exe' : 'bun'));
    const result = spawnSync(
      process.execPath,
      [
        '--no-env-file',
        '--no-install',
        fileURLToPath(new URL('../bin/vida-agent.ts', import.meta.url)),
        command,
        '--foreign-option',
        'invalid',
      ],
      {
        encoding: 'utf8',
        windowsHide: true,
        timeout: 15_000,
        env: { ...process.env, PATH: runtimePath + path.delimiter + (process.env.PATH ?? '') },
      },
    );
    expect(result.error).toBeUndefined();
    expect(result.signal).toBeNull();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(message);
  } finally {
    rmSync(runtimePath, { recursive: true, force: true });
  }
});

test('shared CLI declaration freezes nested aliases and preserves supported scalar values', () => {
  const child = { name: 'scope' };
  const declaration = { children: [child], alias: child, absent: null };
  expect(freezeCliDeclaration(declaration)).toBe(declaration);
  expect(Object.isFrozen(declaration)).toBe(true);
  expect(Object.isFrozen(declaration.children)).toBe(true);
  expect(() => {
    child.name = 'foreign';
  }).toThrow();
  expect(declaration.children[0]?.name).toBe('scope');
  expect(declaration.alias).toBe(child);
  for (const scalar of [undefined, null, false, 0, 'scope']) expect(freezeCliDeclaration(scalar)).toBe(scalar);
  expect(cliCommandSet.has('scope')).toBe(true);
  expect(cliCommandSet.has('help')).toBe(false);
  expect(cliCommandSet.has('foreign')).toBe(false);
  expect(Object.isFrozen(cliCommandNames)).toBe(true);
});

test('public help rejects surplus selectors instead of silently accepting them', () => {
  const malformed = [
    ['scope', '--help', 'extra'],
    ['instructions', '--help', 'extra'],
    ['run', '--help', 'task-source', 'extra'],
    ['development-controller', '--help', 'inspect', 'extra'],
    ['reconcile-artifacts', '--help', 'project-upgrade', 'inspect', 'extra'],
  ];
  for (const args of malformed) expect(() => cliMetadataResult(args, manifest)).toThrow();
  expect(() => cliMetadataResult(['run', '--help', 'inspect', 'extra'], manifest)).toThrow(
    'run help accepts no surplus selectors',
  );
  expect(() => cliMetadataResult(['run', '--help', 'unsupported'], manifest)).toThrow('unsupported run help mode');
  expect(() =>
    cliMetadataResult(['reconcile-artifacts', '--help', 'runtime-code', 'inspect', 'basis', 'extra'], manifest),
  ).toThrow('help accepts at most three nested selectors');
  for (const protoName of ['toString', 'constructor', '__proto__']) {
    expect(() => cliMetadataResult(['reconcile-artifacts', '--help', protoName, 'inspect', 'basis'], manifest)).toThrow(
      'reconcile-artifacts help accepts no surplus selectors',
    );
  }
});

test('native run option details retain unique contracts and isolate each returned help image', () => {
  const first = runOptionDetails();
  expect(first.map((option) => option.name)).toEqual([...Object.keys(runScalarOptionFields), ...runRepeatedOptions]);
  expect(new Set(first.map((option) => option.name)).size).toBe(first.length);
  expect(first.find((option) => option.name === '--attempt')).toMatchObject({
    arity: 1,
    type: 'positive safe integer',
    required: true,
  });
  expect(first.find((option) => option.name === '--inspect')).toMatchObject({
    type: 'literal true',
    default: 'not supplied',
  });
  expect(first.find((option) => option.name === '--project')).toMatchObject({ repeatable: true });
  const task = first.find((option) => option.name === '--task-source-operation');
  expect(task).toMatchObject({
    type: 'enum',
    values: ['prepare', 'inspect', 'issue', 'report', 'recover'],
    requiredFor: 'task-source mode',
  });
  if (!task || !('values' in task) || !Array.isArray(task.values)) throw new Error('task-source enum missing');
  const values: readonly unknown[] = task.values;
  expect(() => Object.defineProperty(values, '0', { value: 'foreign' })).toThrow();
  const attempt = first.find((option) => option.name === '--attempt');
  if (!attempt) throw new Error('attempt option missing');
  attempt.name = '--foreign';
  expect(runOptionDetails().find((option) => option.name === '--attempt')).toMatchObject({ required: true });
  expect(runOptionDetails().some((option) => option.name === '--foreign')).toBe(false);
});

function assertDirectHelpMetadataClosure(command: string, entry: string, extra: readonly string[] = []): void {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-reconcile-help-closure-'));
  const files = [
    entry,
    ...extra,
    'cli-metadata.ts',
    'cli-command-contracts.ts',
    'run-cli-options.ts',
    'reconcile-cli-contracts.ts',
  ];
  mkdirSync(path.join(root, 'bin'));
  let passed = false;
  try {
    for (const file of files)
      copyFileSync(fileURLToPath(new URL('../bin/' + file, import.meta.url)), path.join(root, 'bin', file));
    const child = spawnSync(
      process.execPath,
      ['--no-env-file', '--no-install', path.join(root, 'bin', entry), '--help'],
      { cwd: root, encoding: 'utf8', timeout: 2000, env: { PATH: process.env.PATH ?? '' } },
    );
    if (child.error || child.status !== 0)
      console.error(
        JSON.stringify({
          status: child.status,
          signal: child.signal,
          error: child.error?.message,
          stderr: child.stderr,
        }),
      );
    expect(child.error).toBeUndefined();
    expect(child.signal).toBeNull();
    expect(child.status).toBe(0);
    expect(child.stderr).toBe('');
    expect(JSON.parse(child.stdout)).toEqual(cliMetadataResult([command, '--help'], manifest));
    expect(readdirSync(root)).toEqual(['bin']);
    expect(readdirSync(path.join(root, 'bin')).sort()).toEqual([...files].sort());
    passed = true;
  } finally {
    if (passed) rmSync(root, { recursive: true, force: true });
    else console.error(`reconcile help fixture retained at ${root}`);
  }
}

test('direct reconcile help requires only its metadata closure', () => {
  assertDirectHelpMetadataClosure('reconcile-artifacts', 'reconcile-artifacts.ts');
});
test('direct run help requires only its metadata closure', () => {
  assertDirectHelpMetadataClosure('run', 'run.ts', ['bun.ts', 'cli-error-properties.ts']);
});

test('public command, nested route and compatibility help complete without project effects', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-cli-informational-help-'));
  const entry = fileURLToPath(new URL('../bin/vida-agent.ts', import.meta.url));
  let complete = true;
  let children = 0;
  const record = (value: unknown): Record<string, unknown> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('help object is malformed');
    return value as Record<string, unknown>;
  };
  const strings = (value: unknown): string[] => {
    if (!Array.isArray(value) || !value.every((item: unknown) => typeof item === 'string'))
      throw new Error('help selector list is malformed');
    return value as string[];
  };
  const help = (args: string[], executable = entry, metadataArgs = args): Record<string, unknown> => {
    const started = performance.now();
    const child = spawnSync(process.execPath, ['--no-env-file', '--no-install', executable, ...args], {
      cwd: root,
      encoding: 'utf8',
      timeout: 2000,
      env: { PATH: process.env.PATH ?? '' },
    });
    complete &&= !child.error && child.signal === null && Number.isInteger(child.status);
    if (child.error || child.signal || child.status !== 0)
      console.error(
        JSON.stringify({
          executable,
          args,
          elapsed_ms: performance.now() - started,
          status: child.status,
          signal: child.signal,
          error: child.error?.message,
          stderr: child.stderr,
        }),
      );
    expect(child.error).toBeUndefined();
    expect(child.signal).toBeNull();
    expect(child.status).toBe(0);
    expect(child.stderr).toBe('');
    expect(performance.now() - started).toBeLessThan(2000);
    const result = record(JSON.parse(child.stdout));
    expect(result).toEqual(record(cliMetadataResult(metadataArgs, manifest)));
    expect(result).toMatchObject({ schema: 'VidaAgentCommandResult/v1', status: 'help' });
    expect(readdirSync(root)).toEqual([]);
    children++;
    return result;
  };
  const withoutAlias = (value: Record<string, unknown>): Record<string, unknown> => {
    const result = { ...value };
    delete result.alias;
    return result;
  };
  try {
    const rootHelp = help(['--help']);
    expect(help(['help'])).toEqual(rootHelp);
    expect(help(['help', '--help'])).toEqual(rootHelp);
    const commands = strings(rootHelp.commands);
    expect(commands).toEqual([...cliCommandNames]);
    const commandHelp = new Map<string, Record<string, unknown>>();
    const nestedCases = new Map<string, string[][]>();
    for (const command of commands.filter((name) => name !== 'help')) {
      const result = help([command, '--help']);
      expect(result.command).toBe(command);
      commandHelp.set(command, result);
      const nested: string[][] = [];
      if (command === 'run' || command === 'development-controller') {
        for (const mode of strings(result.modes)) {
          const args = [command, '--help', mode];
          const selected = help(args);
          expect(selected.command).toBe(command);
          if (mode === 'task-source' || command === 'development-controller') expect(selected.mode).toBe(mode);
          else expect(selected.selector).toBe(mode);
          nested.push(args);
        }
      }
      if (command === 'reconcile-artifacts') {
        if (!Array.isArray(result.kinds) || result.kinds.length === 0) throw new Error('reconcile help has no kinds');
        const seen = new Set<string>();
        for (const rawKind of result.kinds) {
          const kind = record(rawKind);
          if (typeof kind.kind !== 'string' || !Array.isArray(kind.routes) || kind.routes.length === 0)
            throw new Error('reconcile kind has no public routes');
          expect(help([command, '--help', kind.kind]).kind).toBe(kind.kind);
          for (const rawRoute of kind.routes) {
            const route = record(rawRoute);
            if (typeof route.mode !== 'string' || (route.basis !== undefined && typeof route.basis !== 'string'))
              throw new Error('reconcile route selectors are malformed');
            const args = [command, '--help', kind.kind, route.mode, ...(route.basis ? [route.basis] : [])];
            const key = JSON.stringify(args);
            expect(seen.has(key)).toBe(false);
            seen.add(key);
            const selected = help(args);
            expect(selected.kind).toBe(kind.kind);
            expect(selected.mode).toBe(route.mode);
            expect(selected.basis).toBe(route.basis);
            for (const field of ['options', 'required', 'optional', 'conflicts', 'conditionalGroups'])
              if (route[field] !== undefined) expect(selected[field]).toEqual(route[field]);
            nested.push(args);
          }
        }
      }
      nestedCases.set(command, nested);
    }
    if (!Array.isArray(rootHelp.aliases)) throw new Error('root help has no compatibility aliases');
    const aliases = rootHelp.aliases.map(record).filter((alias) => alias.primary === false);
    expect(aliases.length).toBe(Object.keys(manifest.bin).length - 1);
    for (const alias of aliases) {
      if (typeof alias.name !== 'string' || typeof alias.command !== 'string') throw new Error('malformed alias');
      const canonical = commandHelp.get(alias.command);
      if (!canonical) throw new Error('alias has no canonical command');
      const aliased = help([alias.name, '--help']);
      expect(aliased.alias).toBe(alias.name);
      expect(withoutAlias(aliased)).toEqual(canonical);
      const target = manifest.bin[alias.name as keyof typeof manifest.bin];
      if (!target) throw new Error('alias has no package executable');
      expect(
        help(['--help'], fileURLToPath(new URL('../' + target, import.meta.url)), [alias.command, '--help']),
      ).toEqual(canonical);
      const firstNested = nestedCases.get(alias.command)?.[0];
      if (firstNested) {
        const nested = help([alias.name, ...firstNested.slice(1)]);
        expect(withoutAlias(nested)).toEqual(record(cliMetadataResult(firstNested, manifest)));
      }
    }
    expect(children).toBeGreaterThan(commands.length + aliases.length);
    console.error(
      JSON.stringify({
        schema: 'CliHelpMatrixEvidence/v1',
        children,
        commands: commandHelp.size,
        aliases: aliases.length,
        nestedRoutes: [...nestedCases.values()].reduce((sum, cases) => sum + cases.length, 0),
        aliasNestedPolicy: 'one representative per alias; canonical nested routes exhaustive',
      }),
    );
  } finally {
    if (complete) rmSync(root, { recursive: true, force: true });
    else console.error('Retained CLI help fixture with unresolved child custody:', root);
  }
}, 15_000);
