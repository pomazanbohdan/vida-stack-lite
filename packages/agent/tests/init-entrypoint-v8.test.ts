import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { initializeProject, main } from '../bin/init.ts';
import { initializeProjectFromBundle } from '../bin/init-core.ts';
import { createInitializationBundle } from './helpers/init-bundle.js';
import { loadRuntimeConfig } from '../src/config/runtime-config.js';

type InitMainOptions = NonNullable<Parameters<typeof main>[0]>;
type InitializationRequest = Parameters<typeof initializeProject>[0];
type InitMessages = { out: string[]; err: string[] };

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const integrationNames = ['AGENTS.md', 'AGENT.sidecar.md', 'agent-runtime.config.v1.yaml', 'docs', '.agent'] as const;

function cliHarness(options: Omit<InitMainOptions, 'args' | 'io' | 'exit'> = {}) {
  const messages: InitMessages = { out: [], err: [] };
  const exit: { exitCode: number | undefined } = { exitCode: undefined };
  return {
    messages,
    exit,
    run: (args: string[], overrides: Omit<InitMainOptions, 'args' | 'io' | 'exit'> = {}) =>
      main({
        isMain: true,
        bunRuntime: true,
        args,
        io: {
          log: (message: string) => messages.out.push(message),
          error: (message: unknown) => messages.err.push(String(message)),
        },
        exit,
        ...options,
        ...overrides,
      }),
  };
}

function retainedCleanup(projectRoot: string, completed: boolean): void {
  if (completed) rmSync(projectRoot, { recursive: true, force: true });
  else process.stderr.write(`Retained failed init fixture: ${projectRoot}\n`);
}

const validRequest = (projectRoot: string, projectMappings = ['alpha=.']): InitializationRequest => ({
  projectRoot,
  repository: 'safe-repository',
  projectMappings,
});

test('init CLI passes parsed values to the fixed-root initializer and prints its receipt', async () => {
  const calls: InitializationRequest[] = [];
  const cli = cliHarness({
    initialize: async (values) => {
      calls.push(values);
      return { status: 'initialized' };
    },
  });
  await cli.run([
    '--project-root',
    'C:/workspace',
    '--repository',
    'sample-repository',
    '--project',
    'alpha=.',
    '--project',
    'beta=child',
  ]);
  expect(calls).toEqual([
    { projectRoot: 'C:/workspace', repository: 'sample-repository', projectMappings: ['alpha=.', 'beta=child'] },
  ]);
  expect(cli.messages).toEqual({ out: ['{"status":"initialized"}'], err: [] });
  expect(cli.exit.exitCode).toBeUndefined();
});

test.each([
  ['no arguments', []],
  ['missing required root', ['--repository', 'sample']],
  ['missing required repository', ['--project-root', 'C:/workspace']],
  ['unknown switch', ['--project-root', 'C:/workspace', '--repository', 'sample', '--unknown', 'value']],
  ['missing value', ['--project-root', 'C:/workspace', '--repository']],
  ['duplicate root', ['--project-root', 'C:/workspace', '--project-root', 'C:/other', '--repository', 'sample']],
  ['duplicate repository', ['--project-root', 'C:/workspace', '--repository', 'sample', '--repository', 'other']],
  ['empty root', ['--project-root', '', '--repository', 'sample']],
  ['empty repository', ['--project-root', 'C:/workspace', '--repository', '']],
  ['empty project mapping', ['--project-root', 'C:/workspace', '--repository', 'sample', '--project', '']],
  ['prototype key', ['--project-root', 'C:/workspace', '--repository', 'sample', '__proto__', 'value']],
  [
    'duplicate reconcile flag',
    ['--project-root', 'C:/workspace', '--repository', 'sample', '--reconcile-existing', '--reconcile-existing'],
  ],
] as const)('init CLI rejects %s before invoking the initializer', async (_name, args) => {
  let invoked = false;
  const cli = cliHarness({
    initialize: async () => {
      invoked = true;
    },
  });
  await cli.run([...args]);
  expect(invoked).toBe(false);
  expect(cli.messages.out).toEqual([]);
  expect(cli.messages.err).toHaveLength(1);
  expect(cli.messages.err[0]).toMatch(/^Usage: vida-agent init/);
  expect(cli.exit.exitCode).toBe(1);
});

test('init CLI forwards the explicit reconcile flag with repeated project mappings', async () => {
  const calls: InitializationRequest[] = [];
  const cli = cliHarness({
    initialize: (request) => {
      calls.push(request);
      return { status: 'initialized' };
    },
  });
  await cli.run([
    '--reconcile-existing',
    '--project-root',
    'C:/workspace',
    '--project',
    'alpha=.',
    '--repository',
    'sample',
    '--project',
    'beta=child',
  ]);
  expect(calls).toEqual([
    {
      projectRoot: 'C:/workspace',
      repository: 'sample',
      projectMappings: ['alpha=.', 'beta=child'],
      reconcileExisting: true,
    },
  ]);
  expect(cli.messages).toEqual({ out: ['{"status":"initialized"}'], err: [] });
  expect(cli.exit.exitCode).toBeUndefined();
});

test('init CLI rejects an omitted project mapping before creating integration state', async () => {
  const projectRoot = mkdtempSync(path.join(tmpdir(), 'vida-init-missing-project-'));
  let completed = false;
  try {
    const cli = cliHarness();
    await cli.run(['--project-root', projectRoot, '--repository', 'safe-repository']);
    expect(cli.exit.exitCode).toBe(1);
    expect(cli.messages).toEqual({ out: [], err: ['Projects must be a non-empty explicit project mapping set'] });
    expect(readdirSync(projectRoot)).toEqual([]);
    completed = true;
  } finally {
    retainedCleanup(projectRoot, completed);
  }
});

test('public init help works without project configuration', () => {
  const result = spawnSync(process.execPath, [path.join(packageRoot, 'bin/vida-agent.ts'), 'init', '--help'], {
    encoding: 'utf8',
    windowsHide: true,
    timeout: 5_000,
    maxBuffer: 128 * 1024,
  });
  expect(result.error).toBeUndefined();
  expect(result.signal).toBeNull();
  expect(result.status).toBe(0);
  expect(result.stderr).toBe('');
  const help: unknown = JSON.parse(result.stdout);
  expect(help).toMatchObject({ schema: 'VidaAgentCommandResult/v1', status: 'help', command: 'init' });
});

test('init CLI reports initializer failure without printing a success receipt', async () => {
  const cli = cliHarness({
    initialize: async () => {
      throw new Error('initialization failed');
    },
  });
  await cli.run(['--project-root', 'C:/workspace', '--repository', 'sample', '--project', 'alpha=.']);
  expect(cli.messages).toEqual({ out: [], err: ['initialization failed'] });
  expect(cli.exit.exitCode).toBe(1);
});

test('Node CLI delegates the same arguments to pinned Bun and preserves its exit status', async () => {
  const calls: string[][] = [];
  const cli = cliHarness();
  const args = ['--project-root', 'C:/workspace'];
  await cli.run(args, {
    bunRuntime: false,
    delegate: (forwarded) => {
      calls.push(forwarded);
      return 7;
    },
  });
  expect(calls).toEqual([[fileURLToPath(new URL('../bin/init.ts', import.meta.url)), ...args]]);
  expect(cli.exit.exitCode).toBe(7);
  expect(cli.messages).toEqual({ out: [], err: [] });
});

test('public initializer rejects a relative project root before initialization', async () => {
  const failure: unknown = await initializeProject({
    projectRoot: 'relative',
    repository: 'candidate',
    projectMappings: ['candidate'],
  }).then(
    () => undefined,
    (reason: unknown) => reason,
  );
  expect(failure).toBeInstanceOf(Error);
  expect(failure).toHaveProperty('message', 'Initialization requires an explicit canonical absolute project root');
});

test('Node CLI reports delegator errors and a non-main import performs no work', async () => {
  const cli = cliHarness();
  const error = Object.assign(new Error('Bun unavailable'), { exitCode: 9 });
  await cli.run([], {
    bunRuntime: false,
    delegate: () => {
      throw error;
    },
  });
  expect(cli.messages.err).toEqual(['Bun unavailable']);
  expect(cli.exit.exitCode).toBe(9);
  const idle = cliHarness({
    isMain: false,
    initialize: () => {
      throw new Error('should not run');
    },
  });
  await idle.run([]);
  expect(idle.messages).toEqual({ out: [], err: [] });
  expect(idle.exit.exitCode).toBeUndefined();
});

test('init preserves explicit nested project roots and their distinct identities', async () => {
  const projectRoot = mkdtempSync(path.join(tmpdir(), 'vida-init-v8-'));
  let completed = false;
  try {
    mkdirSync(path.join(projectRoot, 'child'));
    expect(readdirSync(projectRoot)).toEqual(['child']);
    const receipt = await initializeProjectFromBundle(
      validRequest(projectRoot, ['alpha=.', 'beta=child']),
      createInitializationBundle(packageRoot, projectRoot),
    );
    expect(receipt.status).toBe('initialized');
    expect(
      loadRuntimeConfig(projectRoot).projects.map(({ project_id, project_root }) => ({ project_id, project_root })),
    ).toEqual([
      { project_id: 'alpha', project_root: '.' },
      { project_id: 'beta', project_root: 'child' },
    ]);
    completed = true;
  } finally {
    retainedCleanup(projectRoot, completed);
  }
});

test.each([
  ['repository slug', { repository: 'Uppercase' }, 'Repository must be a lowercase slug'],
  ['traversal root', { projectMappings: ['alpha=../outside'] }, 'Project root must be a non-empty safe'],
  ['absolute root', { projectMappings: ['alpha=/outside'] }, 'Project root must be a non-empty safe'],
  ['Windows separator', { projectMappings: ['alpha=child\\outside'] }, 'Project root must be a non-empty safe'],
  ['duplicate project id', { projectMappings: ['alpha=one', 'alpha=two'] }, 'Project ids must be unique'],
  [
    'implicit multi-project root',
    { projectMappings: ['alpha', 'beta=child'] },
    'Multi-project initialization requires',
  ],
] as const)('original initializer rejects %s without creating state', async (_label, override, message) => {
  const projectRoot = mkdtempSync(path.join(tmpdir(), 'vida-init-boundary-'));
  let completed = false;
  try {
    const bundleRoot = createInitializationBundle(packageRoot, projectRoot);
    const request = { ...validRequest(projectRoot), ...override };
    await Promise.resolve(expect(initializeProjectFromBundle(request, bundleRoot)).rejects.toThrow(message));
    expect(readdirSync(projectRoot)).toEqual(['vida-agent']);
    completed = true;
  } finally {
    retainedCleanup(projectRoot, completed);
  }
});

test('original initializer rejects an untrusted template before publishing integration files', async () => {
  const projectRoot = mkdtempSync(path.join(tmpdir(), 'vida-init-template-'));
  let completed = false;
  try {
    const bundleRoot = createInitializationBundle(packageRoot, projectRoot);
    writeFileSync(path.join(bundleRoot, 'templates', 'AGENTS.template.md'), '{{UNTRUSTED}}');
    await Promise.resolve(
      expect(initializeProjectFromBundle(validRequest(projectRoot), bundleRoot)).rejects.toThrow(
        'Unknown template parameter: UNTRUSTED',
      ),
    );
    expect(readdirSync(projectRoot)).toEqual(['vida-agent']);
    expect(integrationNames.some((entry) => existsSync(path.join(projectRoot, entry)))).toBe(false);
    completed = true;
  } finally {
    retainedCleanup(projectRoot, completed);
  }
});

test.each([{ name: 'foreign-bundle' }, { name: 1 }, {}, null])(
  'initializer rejects a mismatched package identity before publishing authority: %j',
  async (manifest) => {
    const projectRoot = mkdtempSync(path.join(tmpdir(), 'vida-init-package-identity-'));
    let completed = false;
    try {
      const bundleRoot = createInitializationBundle(packageRoot, projectRoot);
      writeFileSync(path.join(bundleRoot, 'package.json'), JSON.stringify(manifest));
      await Promise.resolve(
        expect(initializeProjectFromBundle(validRequest(projectRoot), bundleRoot)).rejects.toThrow(
          'Runtime package identity differs',
        ),
      );
      expect(integrationNames.some((entry) => existsSync(path.join(projectRoot, entry)))).toBe(false);
      completed = true;
    } finally {
      retainedCleanup(projectRoot, completed);
    }
  },
);

test('bundle initializer writes a receipt and preserves project-owned files on repeat', async () => {
  const projectRoot = mkdtempSync(path.join(tmpdir(), 'vida-init-original-'));
  let completed = false;
  try {
    const bundleRoot = createInitializationBundle(packageRoot, projectRoot);
    const options = validRequest(projectRoot, ['original-project=.']);
    await Promise.resolve(
      expect(initializeProjectFromBundle(options, bundleRoot)).resolves.toMatchObject({ status: 'initialized' }),
    );
    const policy = path.join(projectRoot, 'AGENTS.md');
    const sidecar = path.join(projectRoot, 'AGENT.sidecar.md');
    const yaml = path.join(projectRoot, 'agent-runtime.config.v1.yaml');
    const receipt = path.join(projectRoot, '.agent', 'runtime-initialization.v1.json');
    expect([policy, sidecar, yaml, receipt].every(existsSync)).toBe(true);
    expect(JSON.parse(readFileSync(receipt, 'utf8'))).toMatchObject({
      repository_id: 'safe-repository',
      project_ids: ['original-project'],
      bundle: 'vida-agent',
    });
    const ownedSidecar = readFileSync(sidecar, 'utf8').replace(
      'Business requirements: not yet supplied by the project owner.',
      'Business requirements: docs/requirements.md.',
    );
    expect(ownedSidecar).toContain('Business requirements: docs/requirements.md.');
    writeFileSync(sidecar, ownedSidecar);
    const yamlBytes = readFileSync(yaml);
    const policyBytes = readFileSync(policy);
    const receiptBytes = readFileSync(receipt);
    await Promise.resolve(
      expect(initializeProjectFromBundle(options, bundleRoot)).resolves.toMatchObject({
        status: 'existing',
        existing: [
          'AGENTS.md',
          'AGENT.sidecar.md',
          'agent-runtime.config.v1.yaml',
          'docs/agent-instructions/documentation-policy.v1.json',
          '.agent/runtime-initialization.v1.json',
        ],
      }),
    );
    expect(readFileSync(sidecar, 'utf8')).toBe(ownedSidecar);
    expect(readFileSync(yaml)).toEqual(yamlBytes);
    expect(readFileSync(policy)).toEqual(policyBytes);
    expect(readFileSync(receipt)).toEqual(receiptBytes);
    completed = true;
  } finally {
    retainedCleanup(projectRoot, completed);
  }
});

test('copied public initializer preserves project-owned integration values on a repeated run', async () => {
  const projectRoot = mkdtempSync(path.join(tmpdir(), 'vida-init-existing-'));
  const bundle = createInitializationBundle(packageRoot, projectRoot, [
    'src',
    'schemas',
    'instructions',
    'templates',
    'tooling',
    'package.json',
    'README.md',
    'TESTING.md',
    'bun.lock',
    '.bun-version',
  ]);
  const dependencies = path.join(bundle, 'node_modules');
  let completed = false;
  try {
    cpSync(path.join(packageRoot, 'bin'), path.join(bundle, 'bin'), { recursive: true, dereference: false });
    symlinkSync(
      path.join(packageRoot, 'node_modules'),
      dependencies,
      process.platform === 'win32' ? 'junction' : 'dir',
    );
    const copiedModule: unknown = await import(pathToFileURL(path.join(bundle, 'bin', 'init.mjs')).href);
    if (
      copiedModule === null ||
      typeof copiedModule !== 'object' ||
      !('initializeProject' in copiedModule) ||
      typeof copiedModule.initializeProject !== 'function'
    )
      throw new Error('Copied public initializer export is missing');
    const initializeCopy = copiedModule.initializeProject as typeof initializeProject;
    const options = validRequest(projectRoot, ['outside-project=.']);
    await Promise.resolve(expect(initializeCopy(options)).resolves.toMatchObject({ status: 'initialized' }));
    const sidecar = path.join(projectRoot, 'AGENT.sidecar.md');
    const yaml = path.join(projectRoot, 'agent-runtime.config.v1.yaml');
    const policy = path.join(projectRoot, 'AGENTS.md');
    const receipt = path.join(projectRoot, '.agent', 'runtime-initialization.v1.json');
    expect(readFileSync(sidecar, 'utf8')).toContain('Repository: safe-repository');
    expect(readFileSync(sidecar, 'utf8')).toContain('Selected projects: outside-project');
    expect(readFileSync(yaml, 'utf8')).toContain('repository_id: safe-repository');
    expect(readFileSync(yaml, 'utf8')).toContain('project_id: outside-project');
    expect(JSON.parse(readFileSync(receipt, 'utf8'))).toMatchObject({ repository_id: 'safe-repository' });
    const ownedSidecar = readFileSync(sidecar, 'utf8').replace(
      'Business requirements: not yet supplied by the project owner.',
      'Business requirements: docs/requirements.md.',
    );
    const ownedYaml = readFileSync(yaml, 'utf8').replace(
      'namespace: outside-project',
      'namespace: project-owned-namespace',
    );
    writeFileSync(sidecar, ownedSidecar);
    writeFileSync(yaml, ownedYaml);
    const policyBytes = readFileSync(policy);
    const receiptBytes = readFileSync(receipt);
    await Promise.resolve(
      expect(initializeCopy(options)).resolves.toMatchObject({
        status: 'existing',
        existing: [
          'AGENTS.md',
          'AGENT.sidecar.md',
          'agent-runtime.config.v1.yaml',
          'docs/agent-instructions/documentation-policy.v1.json',
          '.agent/runtime-initialization.v1.json',
        ],
      }),
    );
    expect(readFileSync(sidecar, 'utf8')).toBe(ownedSidecar);
    expect(readFileSync(yaml, 'utf8')).toBe(ownedYaml);
    expect(readFileSync(policy)).toEqual(policyBytes);
    expect(readFileSync(receipt)).toEqual(receiptBytes);
    completed = true;
  } finally {
    if (completed && existsSync(dependencies)) unlinkSync(dependencies);
    retainedCleanup(projectRoot, completed);
  }
});
