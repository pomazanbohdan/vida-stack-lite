import { expect, test, spyOn } from 'bun:test';
import { spawnSync } from 'node:child_process';
import * as childProcess from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import manifest from '../package.json' with { type: 'json' };
import { cliMetadataResult } from '../bin/cli-metadata.ts';
import { inspectScope, main as scopeMain } from '../bin/scope.ts';
import { main as publicCliMain } from '../bin/vida-agent.ts';
import {
  freezeCliDeclaration,
  cliCommandSet,
  cliCommandNames,
  cliCommandContracts,
} from '../bin/cli-command-contracts.ts';
import * as runtimeConfig from '../src/config/runtime-config.ts';
import { runOptionDetails, runScalarOptionFields, runRepeatedOptions } from '../bin/run-cli-options.ts';
import { captureRuntimeInputClosure, readQualityInputs } from '../tooling/bun-coverage-evidence.ts';
import { expectRejection } from './helpers/expect-rejection.js';

test('public CLI main preserves local exit state for metadata and returns bounded instruction failures', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const stdoutSpy = spyOn(process.stdout, 'write');
  try {
    stdoutSpy.mockImplementation((chunk) => {
      stdout.push(String(chunk));
      return true;
    });
    const stderrSpy = spyOn(process.stderr, 'write');
    try {
      stderrSpy.mockImplementation((chunk) => {
        stderr.push(String(chunk));
        return true;
      });
      const exit: Partial<Pick<NodeJS.Process, 'exitCode'>> = {};
      publicCliMain({ args: ['--help'], exit });
      expect(exit.exitCode).toBeUndefined();
      expect(JSON.parse(stdout.join(''))).toMatchObject({ schema: 'VidaAgentCommandResult/v1', status: 'help' });
      expect(stderr).toEqual([]);
      for (const name of ['development-lifecycle', 'development-lifecycle.md']) {
        stdout.length = 0;
        publicCliMain({ args: ['instructions', '--path', name], exit });
        expect(JSON.parse(stdout.join(''))).toEqual({
          schema: 'VidaAgentInstruction/v1',
          package: manifest.name,
          version: manifest.version,
          path: fileURLToPath(new URL('../instructions/development-lifecycle.md', import.meta.url)),
        });
        expect(exit.exitCode).toBeUndefined();
      }
      for (const args of [
        [],
        ['foreign-command'],
        ['instructions'],
        ['instructions', '--foreign', 'development-lifecycle'],
        ['instructions', '--path', '../escape'],
        ['instructions', '--path', ''],
      ]) {
        stdout.length = 0;
        stderr.length = 0;
        const denied: Partial<Pick<NodeJS.Process, 'exitCode'>> = {};
        publicCliMain({ args, exit: denied });
        expect(denied.exitCode).toBe(1);
        expect(stdout).toEqual([]);
        expect(JSON.parse(stderr.join(''))).toMatchObject({ schema: 'VidaAgentCommandResult/v1', status: 'blocked' });
      }
    } finally {
      stderrSpy.mockRestore();
    }
  } finally {
    stdoutSpy.mockRestore();
  }
});

test('canonical native public help preserves its terminal result and complete help contract', () => {
  const root = path.resolve(import.meta.dirname, '..');
  const child = spawnSync(
    process.execPath,
    [
      '--no-env-file',
      '--no-install',
      '--config=' + path.join(root, 'bunfig.toml'),
      path.join(root, 'bin/vida-agent.ts'),
      '--help',
    ],
    { encoding: 'utf8', windowsHide: true, timeout: 4000 },
  );
  expect(child.error).toBeUndefined();
  expect(child.signal).toBeNull();
  expect(child.status).toBe(0);
  expect(child.stderr).toBe('');
  expect(JSON.parse(child.stdout)).toEqual(cliMetadataResult(['--help'], manifest));
});

test('canonical native scope and repair refusals preserve their exact terminal contracts', () => {
  const root = path.resolve(import.meta.dirname, '..');
  for (const [entry, expected] of [
    [
      'scope.ts',
      {
        schema: 'VidaAgentCommandResult/v1',
        status: 'blocked',
        code: 'GAP-VIDA-SCOPE-001',
        message: cliCommandContracts.scope.syntax,
      },
    ],
    [
      'repair-work-state.ts',
      { status: 'blocked', message: 'vida work-state repair: kind, mode or absolute project root missing' },
    ],
  ] as const) {
    const child = spawnSync(
      process.execPath,
      ['--no-env-file', '--no-install', '--config=' + path.join(root, 'bunfig.toml'), path.join(root, 'bin', entry)],
      { encoding: 'utf8', windowsHide: true, timeout: 4000 },
    );
    expect(child.error).toBeUndefined();
    expect(child.signal).toBeNull();
    expect(child.status).toBe(1);
    expect(child.stdout).toBe('');
    expect(JSON.parse(child.stderr)).toEqual(expected);
  }
});

test('callable scope preserves non-Error dependency refusals without changing process exit state', async () => {
  const errors: string[] = [];
  const stderr = spyOn(process.stderr, 'write');
  try {
    stderr.mockImplementation((chunk) => {
      errors.push(String(chunk));
      return true;
    });
    const config = spyOn(runtimeConfig, 'loadRuntimeConfig');
    try {
      config.mockImplementation(() => {
        throw 'scope dependency refusal';
      });
      const exit: Partial<Pick<NodeJS.Process, 'exitCode'>> = {};
      await scopeMain({
        args: [
          '--project-root',
          path.resolve(import.meta.dirname, '..'),
          '--repository',
          'fixture',
          '--project',
          'agent',
          '--path',
          'fixture.txt',
        ],
        exit,
      });
      expect(exit.exitCode).toBe(1);
      expect(JSON.parse(errors.join(''))).toEqual({
        schema: 'VidaAgentCommandResult/v1',
        status: 'blocked',
        code: 'GAP-VIDA-SCOPE-001',
        message: 'scope dependency refusal',
      });
      expect(config).toHaveBeenCalledTimes(1);
    } finally {
      config.mockRestore();
    }
  } finally {
    stderr.mockRestore();
  }
});

test('public CLI resolves each validated embedded context and rejects unsafe package data', () => {
  const packageRoot = path.resolve(import.meta.dirname, '..');
  const dataRoot = mkdtempSync(path.join(realpathSync(tmpdir()), 'public-cli-data-'));
  const variables = ['BUN_BE_BUN', 'VIDA_STANDALONE_ROOT', 'VIDA_STANDALONE_EXECUTABLE'] as const;
  const before = variables.map((key) => process.env[key]);
  const output: string[] = [];
  const errors: string[] = [];
  let completed = false;
  try {
    writeFileSync(path.join(dataRoot, '.bun-version'), manifest.engines.bun + '\n');
    writeFileSync(path.join(dataRoot, 'package.json'), JSON.stringify(manifest));
    mkdirSync(path.join(dataRoot, 'instructions/directory.md'), { recursive: true });
    writeFileSync(path.join(dataRoot, 'outside.md'), 'regular external instruction target');
    symlinkSync(path.join(dataRoot, 'outside.md'), path.join(dataRoot, 'instructions/linked.md'), 'file');
    const stdout = spyOn(process.stdout, 'write');
    try {
      stdout.mockImplementation((chunk) => {
        output.push(String(chunk));
        return true;
      });
      const stderr = spyOn(process.stderr, 'write');
      try {
        stderr.mockImplementation((chunk) => {
          errors.push(String(chunk));
          return true;
        });
        process.env.BUN_BE_BUN = '1';
        process.env.VIDA_STANDALONE_EXECUTABLE = process.execPath;
        process.env.VIDA_STANDALONE_ROOT = packageRoot;
        publicCliMain({ args: ['--help'], exit: {} });
        expect(JSON.parse(output.join(''))).toEqual(cliMetadataResult(['--help'], manifest));
        const exit: Partial<Pick<NodeJS.Process, 'exitCode'>> = {};
        publicCliMain({ args: ['scope', '--project-root', 'relative'], exit });
        expect(exit.exitCode).toBe(1);
        process.env.VIDA_STANDALONE_ROOT = dataRoot;
        output.length = 0;
        publicCliMain({ args: ['--help'], exit: {} });
        expect(JSON.parse(output.join(''))).toEqual(cliMetadataResult(['--help'], manifest));
        for (const name of ['directory', 'linked']) {
          output.length = 0;
          errors.length = 0;
          const rejected: Partial<Pick<NodeJS.Process, 'exitCode'>> = {};
          publicCliMain({ args: ['instructions', '--path', name], exit: rejected });
          expect(rejected.exitCode).toBe(1);
          expect(output).toEqual([]);
          expect(JSON.parse(errors.join(''))).toMatchObject({
            status: 'blocked',
            message: 'instruction must be a package-owned regular file',
          });
        }
        for (const bin of [null, [], 'invalid-bin']) {
          writeFileSync(path.join(dataRoot, 'package.json'), JSON.stringify({ ...manifest, bin }));
          expect(() => publicCliMain({ args: ['--help'], exit: {} })).toThrow('CLI package manifest is invalid');
        }
      } finally {
        stderr.mockRestore();
      }
    } finally {
      stdout.mockRestore();
    }
    completed = true;
  } finally {
    for (const [index, key] of variables.entries()) {
      const value = before[index];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    if (completed) rmSync(dataRoot, { recursive: true, force: true });
    else console.error('Retained failed embedded CLI data fixture at ' + dataRoot);
  }
});

test('public CLI forwarding normalizes absolute roots and preserves native refusal and adapter errors', () => {
  const root = path.resolve(import.meta.dirname, '..');
  const originalArgs = ['scope', '--project-root', path.join(root, '..') + '/agent/../missing-public-project'];
  const before = [...originalArgs];
  const originalSpawn = childProcess.spawnSync;
  const failure = new Error('native adapter refused');
  let fault: 'error' | 'signal' | undefined;
  const calls = spyOn(childProcess, 'spawnSync');
  const forwarded = () => calls.mock.calls.filter((call) => Array.isArray(call[1]) && call[1][0] !== '--version');
  try {
    calls.mockImplementation(((...call: unknown[]) => {
      if (Array.isArray(call[1]) && call[1][0] === path.join(root, 'bin/scope.ts') && fault !== undefined)
        return {
          pid: 0,
          status: null,
          signal: fault === 'signal' ? 'SIGTERM' : null,
          ...(fault === 'error' ? { error: failure } : {}),
          output: [null, null, null],
          stdout: Buffer.alloc(0),
          stderr: Buffer.alloc(0),
        };
      return Reflect.apply(originalSpawn, childProcess, call) as ReturnType<typeof spawnSync>;
    }) as typeof spawnSync);
    const exit: Partial<Pick<NodeJS.Process, 'exitCode'>> = {};
    publicCliMain({ args: originalArgs, exit });
    expect(exit.exitCode).toBe(1);
    expect(originalArgs).toEqual(before);
    const first = forwarded()[0];
    expect(first?.[0]).toBe(process.execPath);
    expect(first?.[1]).toEqual([path.join(root, 'bin/scope.ts'), '--project-root', path.resolve(before[2]!)]);
    expect(first?.[2]?.cwd).toBe(process.cwd());
    expect(first?.[2]?.env === process.env).toBe(true);
    expect(first?.[2]?.stdio).toBe('inherit');
    expect(first?.[2]?.windowsHide).toBe(true);
    publicCliMain({ args: ['reconcile-artifacts'], exit });
    expect(exit.exitCode).toBe(1);
    expect(forwarded()[1]?.[1]).toEqual([path.join(root, 'bin/bun.ts'), path.join(root, 'bin/reconcile-artifacts.ts')]);
    publicCliMain({ args: ['scope', '--project-root', 'relative'], exit });
    expect(exit.exitCode).toBe(1);
    expect(forwarded()[2]?.[1]).toEqual([path.join(root, 'bin/scope.ts'), '--project-root', 'relative']);
    const errors: string[] = [];
    const stderr = spyOn(process.stderr, 'write');
    try {
      stderr.mockImplementation((chunk) => {
        errors.push(String(chunk));
        return true;
      });
      fault = 'error';
      publicCliMain({ args: ['scope'], exit });
      expect(exit.exitCode).toBe(1);
      expect(JSON.parse(errors.join(''))).toEqual({
        schema: 'VidaAgentCommandResult/v1',
        status: 'blocked',
        code: 'GAP-VIDA-CLI-001',
        message: failure.message,
      });
      fault = 'signal';
      publicCliMain({ args: ['scope'], exit });
      expect(exit.exitCode).toBe(1);
      expect(forwarded()).toHaveLength(5);
    } finally {
      stderr.mockRestore();
    }
  } finally {
    calls.mockRestore();
  }
});

test('materialized CLI import still dispatches instructions when its module is not the direct entry', () => {
  const root = path.resolve(import.meta.dirname, '..');
  const child = spawnSync(
    process.execPath,
    [
      '--no-env-file',
      '--no-install',
      '--config=' + path.join(root, 'bunfig.toml'),
      '-e',
      'process.argv=[process.execPath,"private-import-control","instructions","--path","development-lifecycle"]; await import(' +
        JSON.stringify(pathToFileURL(path.join(root, 'bin/vida-agent.ts')).href) +
        ');',
    ],
    {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 4000,
      env: {
        ...process.env,
        BUN_BE_BUN: '1',
        VIDA_STANDALONE_ROOT: root,
        VIDA_STANDALONE_EXECUTABLE: process.execPath,
      },
    },
  );
  expect(child.error).toBeUndefined();
  expect(child.signal).toBeNull();
  expect(child.status).toBe(0);
  expect(child.stderr).toBe('');
  expect(JSON.parse(child.stdout)).toEqual({
    schema: 'VidaAgentInstruction/v1',
    package: manifest.name,
    version: manifest.version,
    path: path.join(root, 'instructions/development-lifecycle.md'),
  });
});

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
    ['--project-root', '', '--repository', 'example', '--project', 'agent', '--path', 'src/a.ts'],
  ];
  for (const args of malformed) await expectRejection(inspectScope(args), help.syntax);
  const sparse = new Array<string>(2);
  sparse[1] = 'unpaired-value';
  await expectRejection(inspectScope(sparse), help.syntax);
  await expectRejection(
    inspectScope([
      '--project-root',
      '/never-read',
      '--project-root',
      '/never-read',
      '--repository',
      'example',
      '--project',
      'agent',
      '--path',
      'src/a.ts',
    ]),
    'duplicate scope option',
  );
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

async function assertDirectHelpMetadataClosure(command: string, entry: string): Promise<void> {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-reconcile-help-closure-'));
  let passed = false;
  try {
    const packageRoot = path.resolve(import.meta.dirname, '..');
    const entryPath = `bin/${entry}`;
    const inputBytes = await readQualityInputs(packageRoot, [entryPath]);
    await captureRuntimeInputClosure(packageRoot, [entryPath], [], [], inputBytes);
    const files = [...inputBytes.keys()].sort();
    for (const file of files) mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    for (const file of files) writeFileSync(path.join(root, file), inputBytes.get(file)!);
    const child = spawnSync(process.execPath, ['--no-env-file', '--no-install', path.join(root, entryPath), '--help'], {
      cwd: root,
      encoding: 'utf8',
      timeout: 2000,
      env: { PATH: process.env.PATH ?? '' },
    });
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
    expect(readdirSync(root).sort()).toEqual([...new Set(files.map((file) => file.split('/', 1).join('')))].sort());
    passed = true;
  } finally {
    if (passed) rmSync(root, { recursive: true, force: true });
    else console.error(`reconcile help fixture retained at ${root}`);
  }
}

test('direct reconcile help requires only its metadata closure', async () => {
  await assertDirectHelpMetadataClosure('reconcile-artifacts', 'reconcile-artifacts.ts');
});
test('direct run help requires only its metadata closure', async () => {
  await assertDirectHelpMetadataClosure('run', 'run.ts');
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
