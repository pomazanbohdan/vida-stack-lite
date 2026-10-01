import { expect, test } from 'vitest';
import { createHash } from 'node:crypto';
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
import { initializeProject, main } from '../bin/init.mjs';
import { initializeProjectFromBundle } from '../bin/init-core.mjs';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function cliHarness(options = {}) {
  const messages = { out: [], err: [] };
  const exit = {};
  return {
    messages,
    exit,
    run: (args, overrides = {}) =>
      main({
        isMain: true,
        bunRuntime: true,
        args,
        io: {
          log: (message) => messages.out.push(message),
          error: (message) => messages.err.push(message),
        },
        exit,
        ...options,
        ...overrides,
      }),
  };
}

test('init CLI passes parsed values to the fixed-root initializer and prints its receipt', async () => {
  const calls = [];
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
    {
      projectRoot: 'C:/workspace',
      repository: 'sample-repository',
      projectMappings: ['alpha=.', 'beta=child'],
    },
  ]);
  expect(cli.messages).toEqual({ out: ['{"status":"initialized"}'], err: [] });
  expect(cli.exit.exitCode).toBeUndefined();
});

test.each([
  ['unknown switch', ['--unknown', 'value']],
  ['missing value', ['--repository']],
  ['duplicate root', ['--project-root', 'one', '--project-root', 'two']],
])('init CLI rejects %s before invoking the initializer', async (_name, args) => {
  let invoked = false;
  const cli = cliHarness({
    initialize: async () => {
      invoked = true;
    },
  });
  await cli.run(args);
  expect(invoked).toBe(false);
  expect(cli.messages.out).toEqual([]);
  expect(cli.messages.err).toHaveLength(1);
  expect(cli.messages.err[0]).toMatch(/^Usage: init\.mjs/);
  expect(cli.exit.exitCode).toBe(1);
});

test('init CLI reports initializer failure without printing a success receipt', async () => {
  const cli = cliHarness({
    initialize: async () => {
      throw new Error('initialization failed');
    },
  });
  await cli.run(['--project-root', 'C:/workspace']);
  expect(cli.messages).toEqual({ out: [], err: ['initialization failed'] });
  expect(cli.exit.exitCode).toBe(1);
});

test('Node CLI delegates the same arguments to pinned Bun and preserves its exit status', async () => {
  const calls = [];
  const cli = cliHarness();
  const args = ['--project-root', 'C:/workspace'];
  await cli.run(args, {
    bunRuntime: false,
    delegate: (forwarded) => {
      calls.push(forwarded);
      return 7;
    },
  });
  expect(calls).toEqual([[fileURLToPath(new URL('../bin/init.mjs', import.meta.url)), ...args]]);
  expect(cli.exit.exitCode).toBe(7);
  expect(cli.messages).toEqual({ out: [], err: [] });
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

test('init rejects overlapping project roots before publishing repository authority', async () => {
  const projectRoot = mkdtempSync(path.join(tmpdir(), 'vida-init-v8-'));
  try {
    expect(readdirSync(projectRoot)).toEqual([]);
    await expect(
      initializeProject({
        projectRoot,
        repository: 'mutation-repository',
        projectMappings: ['alpha=.', 'beta=child'],
      }),
    ).rejects.toThrow('Project roots must not overlap');
    expect(readdirSync(projectRoot)).toEqual([]);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
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
])('original initializer rejects %s without creating state', async (_label, override, message) => {
  const projectRoot = mkdtempSync(path.join(tmpdir(), 'vida-init-boundary-'));
  const bundleRoot = path.join(projectRoot, 'vida-agent');
  try {
    mkdirSync(bundleRoot);
    await expect(
      initializeProjectFromBundle(
        {
          projectRoot,
          repository: 'safe-repository',
          projectMappings: ['alpha=.'],
          ...override,
        },
        bundleRoot,
      ),
    ).rejects.toThrow(message);
    expect(readdirSync(projectRoot)).toEqual(['vida-agent']);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('original initializer rejects an untrusted template before publishing integration files', async () => {
  const projectRoot = mkdtempSync(path.join(tmpdir(), 'vida-init-template-'));
  const bundleRoot = path.join(projectRoot, 'vida-agent');
  try {
    mkdirSync(path.join(bundleRoot, 'templates'), { recursive: true });
    cpSync(path.join(packageRoot, 'package.json'), path.join(bundleRoot, 'package.json'));
    for (const name of ['AGENTS.template.md', 'AGENT.sidecar.template.md', 'agent-runtime.config.template.v1.yaml']) {
      cpSync(path.join(packageRoot, 'templates', name), path.join(bundleRoot, 'templates', name));
    }
    writeFileSync(path.join(bundleRoot, 'templates', 'AGENTS.template.md'), '{{UNTRUSTED}}');
    await expect(
      initializeProjectFromBundle(
        { projectRoot, repository: 'safe-repository', projectMappings: ['alpha=.'] },
        bundleRoot,
      ),
    ).rejects.toThrow('Unknown template parameter: UNTRUSTED');
    expect(readdirSync(projectRoot)).toEqual(['vida-agent']);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('original initializer creates a receipt and preserves project-owned files on repeat', async () => {
  const projectRoot = mkdtempSync(path.join(tmpdir(), 'vida-init-original-'));
  const bundleRoot = path.join(projectRoot, 'vida-agent');
  try {
    mkdirSync(bundleRoot);
    for (const entry of ['templates', 'instructions', 'schemas', 'TESTING.md', 'package.json'])
      cpSync(path.join(packageRoot, entry), path.join(bundleRoot, entry), { recursive: true, dereference: false });
    const options = {
      projectRoot,
      repository: 'original-repository',
      projectMappings: ['original-project=.'],
    };
    // The fixed-root entrypoint uses its executing package, including an npm-owned package outside the consumer.
    // A caller's bundleRoot override must never supply template authority.
    writeFileSync(path.join(bundleRoot, 'templates/AGENTS.template.md'), '{{UNTRUSTED}}');
    expect(await initializeProject({ ...options, bundleRoot })).toMatchObject({ status: 'initialized' });
    const policy = path.join(projectRoot, 'AGENTS.md');
    const sidecar = path.join(projectRoot, 'AGENT.sidecar.md');
    const yaml = path.join(projectRoot, 'agent-runtime.config.v1.yaml');
    const receipt = path.join(projectRoot, '.agent', 'runtime-initialization.v1.json');
    expect([policy, sidecar, yaml, receipt].every(existsSync)).toBe(true);
    expect(JSON.parse(readFileSync(receipt, 'utf8'))).toMatchObject({
      repository_id: 'original-repository',
      project_ids: ['original-project'],
      bundle: 'vida-agent',
    });
    expect(JSON.parse(readFileSync(receipt, 'utf8')).templates[0].template_sha256).toBe(
      createHash('sha256')
        .update(readFileSync(path.join(packageRoot, 'templates/AGENTS.template.md')))
        .digest('hex'),
    );
    const ownedSidecar = readFileSync(sidecar, 'utf8').replace(
      'Business requirements: not yet supplied by the project owner.',
      'Business requirements: docs/requirements.md.',
    );
    expect(ownedSidecar).toContain('Business requirements: docs/requirements.md.');
    writeFileSync(sidecar, ownedSidecar);
    const yamlBytes = readFileSync(yaml);
    const policyBytes = readFileSync(policy);
    const receiptBytes = readFileSync(receipt);
    expect(await initializeProjectFromBundle(options, bundleRoot)).toMatchObject({
      status: 'existing',
      existing: expect.arrayContaining(['AGENT.sidecar.md', 'agent-runtime.config.v1.yaml']),
    });
    expect(readFileSync(sidecar, 'utf8')).toBe(ownedSidecar);
    expect(readFileSync(yaml)).toEqual(yamlBytes);
    expect(readFileSync(policy)).toEqual(policyBytes);
    expect(readFileSync(receipt)).toEqual(receiptBytes);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('init preserves project-owned integration values on a repeated run', async () => {
  const projectRoot = mkdtempSync(path.join(tmpdir(), 'vida-init-existing-'));
  const bundle = path.join(projectRoot, 'vida-agent');
  const dependencies = path.join(bundle, 'node_modules');
  try {
    mkdirSync(bundle);
    for (const entry of [
      'src',
      'dist',
      'bin',
      'schemas',
      'instructions',
      'templates',
      'tooling',
      'package.json',
      'README.md',
      'TESTING.md',
      'bun.lock',
      '.bun-version',
    ])
      cpSync(path.join(packageRoot, entry), path.join(bundle, entry), { recursive: true, dereference: false });
    symlinkSync(
      path.join(packageRoot, 'node_modules'),
      dependencies,
      process.platform === 'win32' ? 'junction' : 'dir',
    );
    const { initializeProject: initializeCopy } = await import(
      pathToFileURL(path.join(bundle, 'bin', 'init.mjs')).href
    );
    const options = {
      projectRoot,
      repository: 'outside-repository',
      projectMappings: ['outside-project=.'],
    };
    expect(await initializeCopy(options)).toMatchObject({ status: 'initialized' });
    const sidecar = path.join(projectRoot, 'AGENT.sidecar.md');
    const yaml = path.join(projectRoot, 'agent-runtime.config.v1.yaml');
    const policy = path.join(projectRoot, 'AGENTS.md');
    const receipt = path.join(projectRoot, '.agent', 'runtime-initialization.v1.json');
    expect(readFileSync(sidecar, 'utf8')).toContain('Repository: outside-repository');
    expect(readFileSync(sidecar, 'utf8')).toContain('Selected projects: outside-project');
    expect(readFileSync(yaml, 'utf8')).toContain('repository_id: outside-repository');
    expect(readFileSync(yaml, 'utf8')).toContain('project_id: outside-project');
    expect(JSON.parse(readFileSync(receipt, 'utf8'))).toMatchObject({ repository_id: 'outside-repository' });
    const ownedSidecar = readFileSync(sidecar, 'utf8').replace(
      'Business requirements: not yet supplied by the project owner.',
      'Business requirements: docs/requirements.md.',
    );
    const ownedYaml = readFileSync(yaml, 'utf8').replace(
      'namespace: outside-project',
      'namespace: project-owned-namespace',
    );
    expect(ownedSidecar).toContain('Business requirements: docs/requirements.md.');
    expect(ownedYaml).toContain('namespace: project-owned-namespace');
    writeFileSync(sidecar, ownedSidecar);
    writeFileSync(yaml, ownedYaml);
    const policyBytes = readFileSync(policy);
    const receiptBytes = readFileSync(receipt);
    expect(await initializeCopy(options)).toMatchObject({
      status: 'existing',
      existing: expect.arrayContaining(['AGENT.sidecar.md', 'agent-runtime.config.v1.yaml']),
    });
    expect(readFileSync(sidecar, 'utf8')).toBe(ownedSidecar);
    expect(readFileSync(yaml, 'utf8')).toBe(ownedYaml);
    expect(readFileSync(policy)).toEqual(policyBytes);
    expect(readFileSync(receipt)).toEqual(receiptBytes);
  } finally {
    if (existsSync(dependencies)) unlinkSync(dependencies);
    rmSync(projectRoot, { recursive: true, force: true });
  }
});
