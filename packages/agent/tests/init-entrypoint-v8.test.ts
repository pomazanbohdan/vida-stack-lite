import { expect, spyOn, test } from 'bun:test';
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
import { expectReturned, expectRejection } from './helpers/expect-rejection.ts';
import { loadRuntimeConfig } from '../src/config/runtime-config.js';
import * as safeRepositoryAccess from '../src/config/safe-repository-access.js';

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

test.each([true, false])(
  'callable initializer help bypasses parsing and initialization with Bun runtime %j',
  async (bunRuntime) => {
    let initialized = false;
    const cli = cliHarness({
      bunRuntime,
      delegate: () => {
        throw new Error('Help must not delegate to another runtime.');
      },
      initialize: () => {
        initialized = true;
        throw new Error('Help must not initialize a project.');
      },
    });
    await cli.run(['--help']);
    expect(initialized).toBe(false);
    expect(cli.exit.exitCode).toBeUndefined();
    expect(cli.messages.err).toEqual([]);
    expect(cli.messages.out).toHaveLength(1);
    const help: unknown = JSON.parse(cli.messages.out[0]!);
    expect(help).toMatchObject({
      schema: 'VidaAgentCommandResult/v1',
      status: 'help',
      command: 'init',
      syntax:
        'vida-agent init --project-root ABSOLUTE_PATH --repository SLUG --project ID=RELATIVE_ROOT [--project ID=RELATIVE_ROOT] [--reconcile-existing]',
    });
  },
);

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

test('initializer entrypoint help works without project configuration or file mutation', () => {
  const projectRoot = mkdtempSync(path.join(tmpdir(), 'vida-init-entrypoint-help-'));
  let completed = false;
  try {
    const result = expectReturned(() =>
      spawnSync(process.execPath, [path.join(packageRoot, 'bin/init.ts'), '--help'], {
        cwd: projectRoot,
        encoding: 'utf8',
        windowsHide: true,
        timeout: 5_000,
        maxBuffer: 128 * 1024,
      }),
    );
    expect(result.error).toBeUndefined();
    expect(result.signal).toBeNull();
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    const help: unknown = JSON.parse(result.stdout);
    expect(help).toMatchObject({
      schema: 'VidaAgentCommandResult/v1',
      status: 'help',
      command: 'init',
      syntax:
        'vida-agent init --project-root ABSOLUTE_PATH --repository SLUG --project ID=RELATIVE_ROOT [--project ID=RELATIVE_ROOT] [--reconcile-existing]',
    });
    expect(readdirSync(projectRoot)).toEqual([]);
    completed = true;
  } finally {
    retainedCleanup(projectRoot, completed);
  }
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

test('public initializer reads executing-package resources through the maintained package reader', async () => {
  const projectRoot = mkdtempSync(path.join(tmpdir(), 'vida-init-package-reader-'));
  let completed = false;
  const verifiedTargets: string[] = [];
  const stableTargets: string[] = [];
  const rawTargets: string[] = [];
  let hasVerifiedReader = false;
  let hasStableReader = false;
  const originalRequire = safeRepositoryAccess.requireSafeRepositoryAccess;
  const accessSpy = spyOn(safeRepositoryAccess, 'requireSafeRepositoryAccess').mockImplementation((root) => {
    const nativeAccess = originalRequire(root);
    if (path.resolve(root) !== packageRoot) return nativeAccess;
    const nativeVerifiedRead = nativeAccess.readVerifiedCaptureBytes;
    const nativeStableRead = nativeAccess.readStableBytes;
    hasVerifiedReader = typeof nativeVerifiedRead === 'function';
    hasStableReader = typeof nativeStableRead === 'function';
    const wrapped = {
      ...nativeAccess,
      readBytes(target: string, label: string): Buffer {
        rawTargets.push(target);
        return nativeAccess.readBytes.call(nativeAccess, target, label);
      },
      readText(target: string, label: string): string {
        rawTargets.push(target);
        return nativeAccess.readText.call(nativeAccess, target, label);
      },
      ...(nativeStableRead
        ? {
            readStableBytes(target: string, label: string): Buffer | null {
              expect(this === wrapped).toBe(true);
              stableTargets.push(target);
              return nativeStableRead.call(nativeAccess, target, label);
            },
          }
        : {}),
      ...(nativeVerifiedRead
        ? {
            readVerifiedCaptureBytes(target: string, label: string, maxBytes?: number): Buffer {
              expect(this === wrapped).toBe(true);
              verifiedTargets.push(target);
              return nativeVerifiedRead.call(nativeAccess, target, label, maxBytes);
            },
          }
        : {}),
    };
    return wrapped;
  });
  try {
    const receipt = await initializeProject(validRequest(projectRoot));
    expect(receipt.status).toBe('initialized');
    expect(existsSync(path.join(projectRoot, 'AGENTS.md'))).toBe(true);
    expect(existsSync(path.join(projectRoot, '.agent', 'runtime-initialization.v1.json'))).toBe(true);
    const resourceTargets = new Set([...verifiedTargets, ...stableTargets, ...rawTargets]);
    const preferredTargets = hasVerifiedReader ? verifiedTargets : hasStableReader ? stableTargets : rawTargets;
    for (const target of [
      'package.json',
      'templates/AGENTS.template.md',
      'templates/AGENT.sidecar.template.md',
      'templates/agent-runtime.config.template.v1.yaml',
      'templates/documentation-policy.template.v1.json',
      'schemas/documentation-policy.v1.schema.json',
      'schemas/runtime-initialization.v1.schema.json',
      'instructions/development-lifecycle.md',
    ]) {
      expect(resourceTargets.has(target), `missing package resource read: ${target}`).toBe(true);
      expect(preferredTargets.includes(target), `resource bypassed the preferred package reader: ${target}`).toBe(true);
    }
    if (hasVerifiedReader || hasStableReader) expect(rawTargets).toEqual([]);
    completed = true;
  } finally {
    accessSpy.mockRestore();
    retainedCleanup(projectRoot, completed);
  }
});

test('public initializer does not fall back or publish when a verified package read fails', async () => {
  const projectRoot = mkdtempSync(path.join(tmpdir(), 'vida-init-package-reader-failure-'));
  let completed = false;
  const failure = new Error('fixture verified package read failure');
  const verifiedTargets: string[] = [];
  const rawTargets: string[] = [];
  const originalRequire = safeRepositoryAccess.requireSafeRepositoryAccess;
  const accessSpy = spyOn(safeRepositoryAccess, 'requireSafeRepositoryAccess').mockImplementation((root) => {
    const nativeAccess = originalRequire(root);
    if (path.resolve(root) !== packageRoot) return nativeAccess;
    const nativeVerifiedRead = nativeAccess.readVerifiedCaptureBytes;
    const nativeStableRead = nativeAccess.readStableBytes;
    const wrapped = {
      ...nativeAccess,
      readBytes(target: string, label: string): Buffer {
        rawTargets.push(target);
        return nativeAccess.readBytes.call(nativeAccess, target, label);
      },
      readText(target: string, label: string): string {
        rawTargets.push(target);
        return nativeAccess.readText.call(nativeAccess, target, label);
      },
      readVerifiedCaptureBytes(target: string, label: string, maxBytes?: number): Buffer {
        expect(this === wrapped).toBe(true);
        verifiedTargets.push(target);
        if (target === 'templates/AGENTS.template.md') throw failure;
        if (nativeVerifiedRead) return nativeVerifiedRead.call(nativeAccess, target, label, maxBytes);
        if (nativeStableRead) {
          const stable = nativeStableRead.call(nativeAccess, target, label);
          if (stable === null) throw new Error('required runtime package resource is absent');
          return stable;
        }
        return wrapped.readBytes(target, label);
      },
    };
    return wrapped;
  });
  try {
    await Promise.resolve(expect(initializeProject(validRequest(projectRoot))).rejects.toBe(failure));
    expect(verifiedTargets).toContain('templates/AGENTS.template.md');
    expect(rawTargets).not.toContain('templates/AGENTS.template.md');
    expect(
      [
        'AGENTS.md',
        'AGENT.sidecar.md',
        'agent-runtime.config.v1.yaml',
        'docs/agent-instructions/documentation-policy.v1.json',
        '.agent/runtime-initialization.pending.v1.json',
        '.agent/runtime-initialization.v1.json',
      ].some((target) => existsSync(path.join(projectRoot, target))),
    ).toBe(false);
    completed = true;
  } finally {
    accessSpy.mockRestore();
    retainedCleanup(projectRoot, completed);
  }
});

test.each([
  ['numeric', 9, 9],
  ['absent', undefined, 1],
  ['nonnumeric', '9', 1],
] as const)('Node CLI reports delegator errors with %s exit code', async (_label, exitCode, expectedCode) => {
  const cli = cliHarness();
  const error = Object.assign(new Error('Bun unavailable'), exitCode === undefined ? {} : { exitCode });
  await cli.run([], {
    bunRuntime: false,
    delegate: () => {
      throw error;
    },
  });
  expect(cli.messages).toEqual({ out: [], err: ['Bun unavailable'] });
  expect(cli.exit.exitCode).toBe(expectedCode);
});

test('a non-main initializer import performs no work', async () => {
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

test('initializer rejects a missing configured marker before publishing integration state', async () => {
  const projectRoot = mkdtempSync(path.join(tmpdir(), 'vida-init-missing-marker-'));
  let completed = false;
  try {
    const bundleRoot = createInitializationBundle(packageRoot, projectRoot);
    const templateFile = path.join(bundleRoot, 'templates/agent-runtime.config.template.v1.yaml');
    const template = readFileSync(templateFile, 'utf8');
    const expected = '    - agent-runtime.config.v1.yaml';
    expect(template.split(expected)).toHaveLength(2);
    writeFileSync(templateFile, template.replace(expected, expected + '\n    - OWNER.marker'));
    await expectRejection(
      initializeProjectFromBundle(validRequest(projectRoot), bundleRoot),
      'Missing configured root marker',
    );
    expect(readdirSync(projectRoot)).toEqual(['vida-agent']);
    expect(integrationNames.some((entry) => existsSync(path.join(projectRoot, entry)))).toBe(false);
    expect(existsSync(path.join(projectRoot, 'OWNER.marker'))).toBe(false);
    completed = true;
  } finally {
    retainedCleanup(projectRoot, completed);
  }
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
    const copiedModule: unknown = await import(pathToFileURL(path.join(bundle, 'bin', 'init.ts')).href);
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
