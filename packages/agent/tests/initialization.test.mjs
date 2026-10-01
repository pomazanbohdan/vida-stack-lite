import { afterAll, afterEach, beforeAll, expect, test } from 'bun:test';
import { cp, mkdir, mkdtemp, readFile, readdir, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { parseRuntimeConfigYaml } from '../src/config/runtime-config.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPaths = ['AGENTS.md', 'AGENT.sidecar.md', 'agent-runtime.config.v1.yaml', 'docs', '.agent', '.tmp'];
const v8CoverageMode = process.env.AGENT_RUNTIME_V8_COVERAGE === '1';
const v8CoverageTest = v8CoverageMode ? test.skip : test;
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
let root;
let bundle;
let originalTemplate;
let externalConfig;

async function run(args, env = {}, cwd = root, executable = 'bun') {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd,
      env: { ...process.env, ...env },
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (exitCode) => resolve({ exitCode, stdout, stderr }));
  });
}
function init(extra = [], env = {}) {
  return run(
    [
      path.join(bundle, 'bin/init.mjs'),
      '--project-root',
      root,
      '--repository',
      'different-repository',
      '--project',
      'different-project',
      ...extra,
    ],
    env,
  );
}

beforeAll(async () => {
  if (v8CoverageMode) return;
  root = await mkdtemp(path.join(tmpdir(), 'portable-runtime-init-'));
  bundle = path.join(root, 'tools', 'agents');
  await mkdir(bundle, { recursive: true });
  for (const entry of [
    'src',
    'dist',
    'bin',
    'schemas',
    'instructions',
    'templates',
    'tooling',
    'package.json',
    'TESTING.md',
    'bun.lock',
    '.bun-version',
  ]) {
    await cp(path.join(source, entry), path.join(bundle, entry), {
      recursive: true,
      dereference: false,
    });
  }
  for (const entry of ['package.json', 'bun.lock', '.bun-version']) {
    expect(await readFile(path.join(bundle, entry))).toEqual(await readFile(path.join(source, entry)));
  }
  await symlink(path.join(source, 'node_modules'), path.join(bundle, 'node_modules'), 'junction');
  expect(await realpath(path.join(bundle, 'node_modules'))).toBe(await realpath(path.join(source, 'node_modules')));
  originalTemplate = await readFile(path.join(bundle, 'templates/agent-runtime.config.template.v1.yaml'), 'utf8');
  externalConfig = path.join(bundle, 'external-agent-runtime.config.v1.yaml');
  await writeFile(
    externalConfig,
    originalTemplate
      .replaceAll('{{REPOSITORY}}', 'ignored-repository')
      .replaceAll('{{PROJECT}}', 'ignored-project')
      .replaceAll('{{BUNDLE}}', 'ignored-runtime'),
  );
}, 180_000);

afterEach(async () => {
  if (v8CoverageMode) return;
  for (const entry of outputPaths) await rm(path.join(root, entry), { recursive: true, force: true });
  await rm(path.join(root, 'packages'), { recursive: true, force: true });
  await writeFile(path.join(bundle, 'templates/agent-runtime.config.template.v1.yaml'), originalTemplate);
});
afterAll(async () => {
  if (v8CoverageMode) return;
  if (root) await rm(root, { recursive: true, force: true });
}, 180_000);

v8CoverageTest(
  'copied bundle with reused locked dependencies initializes explicit identity and records raw template hashes',
  async () => {
    const result = await init([], { AGENT_RUNTIME_CONFIG: externalConfig });
    expect(result.stderr).toBe('');
    expect(result.exitCode, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout).status).toBe('initialized');
    const configBytes = await readFile(path.join(root, 'agent-runtime.config.v1.yaml'));
    const config = parseRuntimeConfigYaml(configBytes.toString());
    expect(config.config_id).toBe('different-repository');
    expect(config.repository.repository_id).toBe('different-repository');
    expect(config.projects.map((project) => project.project_id)).toEqual(['different-project']);
    expect(config.integrations.providers).toEqual([
      expect.objectContaining({
        project_id: 'different-project',
        provider: 'local',
        tenant_id: 'local',
      }),
    ]);
    expect(config.runtime.bundle).toBe('tools/agents');
    expect(config.runtime.instruction_root).toBe('tools/agents/instructions');
    const agents = await readFile(path.join(root, 'AGENTS.md'), 'utf8');
    expect(agents).toContain('vida-agent instructions --path development-lifecycle');
    expect(agents).toContain('vida-agent instructions --path NAME');
    expect(agents).not.toContain('tools/agents/instructions/');
    expect(agents.replace(/\s+/g, ' ')).toContain('after the sidecar and before planning or mutation');
    expect(agents.replace(/\s+/g, ' ')).toContain('steps without losing required quality');
    expect(agents).not.toContain('{{BUNDLE}}');
    const receipt = JSON.parse(await readFile(path.join(root, '.agent/runtime-initialization.v1.json'), 'utf8'));
    expect(receipt.schema).toBe('RuntimeInitialization/v1');
    expect(receipt.workspace_id).toBe(deriveWorkspaceId(config.repository.repository_id, root));
    for (const entry of receipt.templates) {
      expect(entry.template_sha256).toBe(hash(await readFile(path.join(bundle, entry.template))));
      expect(entry.output_sha256).toBe(hash(await readFile(path.join(root, entry.output))));
    }
    const repeated = await init();
    expect(JSON.parse(repeated.stdout).status).toBe('existing');
    expect(await readFile(path.join(root, 'agent-runtime.config.v1.yaml'))).toEqual(configBytes);
    expect(await readFile(path.join(root, 'AGENTS.md'), 'utf8')).toBe(agents);
  },
  30_000,
);

v8CoverageTest(
  'explicit reconciliation adopts only complete matching existing integration files',
  async () => {
    const initialized = await init();
    expect(initialized.exitCode, initialized.stderr).toBe(0);
    const receipt = path.join(root, '.agent/runtime-initialization.v1.json');
    await rm(receipt);
    const sidecar = path.join(root, 'AGENT.sidecar.md');
    const preservedSidecar = Buffer.concat([await readFile(sidecar), Buffer.from('\nProject-owned note.\n')]);
    await writeFile(sidecar, preservedSidecar);
    const originalConfig = await readFile(path.join(root, 'agent-runtime.config.v1.yaml'));
    const partial = await run([
      path.join(bundle, 'bin/init.mjs'),
      '--project-root',
      root,
      '--repository',
      'different-repository',
      '--project',
      'foreign=other',
      '--reconcile-existing',
    ]);
    expect(partial.exitCode).toBe(1);
    expect(partial.stderr).toContain('Existing configuration does not match');
    expect(await readdir(path.join(root, '.agent'))).not.toContain('runtime-initialization.v1.json');
    await rm(sidecar);
    const missing = await init(['--reconcile-existing']);
    expect(missing.exitCode).toBe(1);
    expect(missing.stderr).toContain('requires all existing project integration files');
    await writeFile(sidecar, preservedSidecar);
    const adopted = await init(['--reconcile-existing']);
    expect(adopted.exitCode, adopted.stderr).toBe(0);
    expect(JSON.parse(adopted.stdout).status).toBe('reconciled_existing');
    const body = JSON.parse(await readFile(receipt, 'utf8'));
    expect(body.provenance).toBe('adopted_existing');
    expect(body.workspace_binding_status).toBe('pending');
    expect(body.templates[1].output_sha256).toBe(hash(preservedSidecar));
    expect(await readFile(sidecar)).toEqual(preservedSidecar);
    expect(await readFile(path.join(root, 'agent-runtime.config.v1.yaml'))).toEqual(originalConfig);
    const repeat = await init(['--reconcile-existing']);
    expect(repeat.exitCode, repeat.stderr).toBe(0);
    expect(JSON.parse(repeat.stdout).status).toBe('existing');
    expect(JSON.parse(await readFile(receipt, 'utf8'))).toEqual(body);
  },
  30_000,
);

v8CoverageTest(
  'fresh local initialization exposes the current Mastra session prepare packet',
  async () => {
    const initialized = await init([], { AGENT_RUNTIME_CONFIG: externalConfig });
    expect(initialized.exitCode, initialized.stderr).toBe(0);
    const config = parseRuntimeConfigYaml(await readFile(path.join(root, 'agent-runtime.config.v1.yaml'), 'utf8'));
    const runArgs = [
      path.join(bundle, 'bin/run.mjs'),
      '--project-root',
      root,
      '--repository',
      config.repository.repository_id,
      '--project',
      config.projects[0].project_id,
      '--work-path',
      'tools/agents',
      '--work-id',
      'work-17',
      '--attempt',
      '2',
      '--scope-digest',
      'a'.repeat(64),
      '--team',
      'default-development',
      '--kind',
      'research',
      '--intent',
      'information_research',
      '--workflow',
      'information_research_light',
    ];
    const result = await run(runArgs);
    expect(result.exitCode, result.stderr).toBe(0);
    const prepared = JSON.parse(result.stdout);
    expect(prepared).toMatchObject({
      schema: 'VidaAgentRunResult/v1',
      status: 'prepared',
      execution_status: 'suspended',
      initialization_status: 'pending',
      resume_status: 'ready',
      state_version: { revision: 1 },
    });
    expect(prepared.next_actions.length).toBeGreaterThan(0);
    const actionIds = prepared.next_actions.map((item) => item.request.action_id);
    const resumed = await run(runArgs);
    expect(resumed.exitCode, resumed.stderr).toBe(0);
    const resumedPacket = JSON.parse(resumed.stdout);
    expect(resumedPacket.resume_status).toBe('ready');
    expect(resumedPacket.state_version).toEqual(prepared.state_version);
    expect(resumedPacket.next_actions.map((item) => item.request.action_id)).toEqual(actionIds);
  },
  60_000,
);

v8CoverageTest(
  'published initializer launched by Node delegates to the pinned Bun runtime',
  async () => {
    const result = await run(
      [
        path.join(bundle, 'bin/init.mjs'),
        '--project-root',
        root,
        '--repository',
        'node-repository',
        '--project',
        'node-project',
      ],
      {},
      root,
      'node',
    );
    expect(result.exitCode, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout).status).toBe('initialized');
    const config = parseRuntimeConfigYaml(await readFile(path.join(root, 'agent-runtime.config.v1.yaml'), 'utf8'));
    expect(config.runtime.bundle).toBe('tools/agents');
    expect(config.projects[0].project_id).toBe('node-project');
  },
  60_000,
);

v8CoverageTest(
  'each pre-existing integration file or receipt makes the entire invocation read-only',
  async () => {
    for (const existing of [
      'AGENTS.md',
      'AGENT.sidecar.md',
      'agent-runtime.config.v1.yaml',
      'docs/agent-instructions/documentation-policy.v1.json',
      '.agent/runtime-initialization.v1.json',
    ]) {
      await mkdir(path.dirname(path.join(root, existing)), { recursive: true });
      await writeFile(path.join(root, existing), 'owner bytes');
      const result = await init();
      expect(result.exitCode).toBe(1);
      expect(JSON.parse(result.stderr).existing).toEqual([existing]);
      expect(await readFile(path.join(root, existing), 'utf8')).toBe('owner bytes');
      expect((await readdir(root)).sort()).toEqual([existing.split('/')[0], 'tools'].sort());
      await rm(path.join(root, existing.split('/')[0]), {
        recursive: true,
        force: true,
      });
    }
  },
  30_000,
);

v8CoverageTest(
  'interrupted exclusive creation preserves partial output and refuses implicit resume',
  async () => {
    const safeAccessUrl = pathToFileURL(path.join(bundle, 'src/config/safe-repository-access.ts')).href;
    const initializerUrl = pathToFileURL(path.join(bundle, 'bin/init.mjs')).href;
    const script = `
    import { mock } from 'bun:test';
    const actual = await import(${JSON.stringify(safeAccessUrl)});
    const requireRealAccess = actual.requireSafeRepositoryAccess;
    mock.module(${JSON.stringify(safeAccessUrl)}, () => ({
      ...actual,
      requireSafeRepositoryAccess(projectRoot) {
        const access = requireRealAccess(projectRoot);
        return {
          ...access,
          prepareExclusiveCreation: async () => {
            const creator = await access.prepareExclusiveCreation();
            let writes = 0;
            return {
              ...creator,
              writeExclusive: async (...args) => {
                if (++writes === 3) throw new Error('injected exclusive creation failure');
                return creator.writeExclusive(...args);
              },
            };
          },
        };
      },
    }));
    const { initializeProject } = await import(${JSON.stringify(initializerUrl)});
    try {
      await initializeProject({
        projectRoot: ${JSON.stringify(root)},
        repository: 'different-repository',
        projectMappings: ['different-project'],
      });
      throw new Error('expected exclusive creation failure');
    } catch (error) {
      if (error.message !== 'injected exclusive creation failure') throw error;
    }
  `;
    const failed = await run(['-e', script]);
    expect(failed.exitCode, failed.stderr).toBe(0);
    const firstBytes = await readFile(path.join(root, 'AGENTS.md'));
    const template = await readFile(path.join(bundle, 'templates/AGENTS.template.md'), 'utf8');
    expect(firstBytes.toString()).toBe(template.replaceAll('{{BUNDLE}}', 'tools/agents'));
    expect((await readdir(root)).sort()).toEqual(['.agent', 'AGENTS.md', 'tools']);
    const repeated = await init();
    expect(repeated.exitCode, repeated.stderr).toBe(1);
    expect(JSON.parse(repeated.stderr)).toMatchObject({
      status: 'partial_not_ready',
      existing: ['AGENTS.md'],
    });
    expect(await readFile(path.join(root, 'AGENTS.md'))).toEqual(firstBytes);
    expect((await readdir(root)).sort()).toEqual(['.agent', 'AGENTS.md', 'tools']);
  },
  30_000,
);

v8CoverageTest(
  'malformed template and invalid generated configuration fail before output',
  async () => {
    for (const content of [
      originalTemplate + '\nunknown: true\n',
      originalTemplate.replace('{{REPOSITORY}}', '{{UNKNOWN}}'),
      originalTemplate.replace('sidecar: AGENT.sidecar.md', 'sidecar: missing.md'),
    ]) {
      await writeFile(path.join(bundle, 'templates/agent-runtime.config.template.v1.yaml'), content);
      const result = await init();
      expect(result.exitCode).toBe(1);
      expect(await readdir(root)).toEqual(['tools']);
    }
  },
  30_000,
);

v8CoverageTest(
  'configured instructions must exist in the copied bundle before initialization writes',
  async () => {
    const instruction = path.join(bundle, 'instructions/development-lifecycle.md');
    const content = await readFile(instruction);
    await rm(instruction);
    try {
      const result = await init();
      expect(result.exitCode).toBe(1);
    } finally {
      await writeFile(instruction, content);
    }
    expect(await readdir(root)).toEqual(['tools']);
  },
  30_000,
);

v8CoverageTest('absent root configuration fails even with the template installed', async () => {
  const module = new URL('file:///' + path.join(bundle, 'src/config/runtime-config.ts').replaceAll('\\', '/')).href;
  const result = await run([
    '-e',
    `const {loadRuntimeConfig}=await import(${JSON.stringify(module)});loadRuntimeConfig(${JSON.stringify(root)});`,
  ]);
  expect(result.exitCode).toBe(1);
  expect(await readdir(root)).toEqual(['tools']);
});

v8CoverageTest(
  'installed public run rejects an incomplete prepared selector without creating cutoff or work state',
  async () => {
    const ordinaryBundle = bundle;
    const installedBundle = path.join(root, 'vida-agent');
    const ordinaryConfig = await readFile(externalConfig, 'utf8');
    try {
      await mkdir(installedBundle);
      for (const entry of [
        'src',
        'dist',
        'bin',
        'schemas',
        'instructions',
        'templates',
        'tooling',
        'package.json',
        'TESTING.md',
        'bun.lock',
        '.bun-version',
      ])
        await cp(path.join(source, entry), path.join(installedBundle, entry), { recursive: true });
      await symlink(path.join(ordinaryBundle, 'node_modules'), path.join(installedBundle, 'node_modules'), 'junction');
      expect(await realpath(path.join(installedBundle, 'node_modules'))).toBe(
        await realpath(path.join(ordinaryBundle, 'node_modules')),
      );
      bundle = installedBundle;
      await writeFile(externalConfig, ordinaryConfig.replaceAll('tools/agents', 'vida-agent'));
      const initialized = await init([], { AGENT_RUNTIME_CONFIG: externalConfig });
      expect(initialized.exitCode, initialized.stderr).toBe(0);
      const config = parseRuntimeConfigYaml(await readFile(path.join(root, 'agent-runtime.config.v1.yaml'), 'utf8'));
      const generation = 'cutover-test';
      const selector = {
        schema: 'ActiveRuntimeSelector/v1',
        generation,
        runtime: 'vida-agent',
        bundle_root: 'vida-agent',
        config_path: 'agent-runtime.config.v1.yaml',
        archive_manifest_sha256: 'a'.repeat(64),
        plan_sha256: 'b'.repeat(64),
        payload_manifest_sha256: 'c'.repeat(64),
        state_policy: 'clean_start_no_ticket_transfer',
      };
      const journalRoot = path.join(root, '.agent/cutover', generation);
      await mkdir(journalRoot, { recursive: true });
      const selectorPath = path.join(root, '.agent/active-runtime-selector.v1.json');
      const record = (value) => `${JSON.stringify(value, null, 2)}\n`;
      const runArgs = [
        path.join(installedBundle, 'bin/run.mjs'),
        '--project-root',
        root,
        '--repository',
        config.repository.repository_id,
        '--project',
        config.projects[0].project_id,
        '--work-path',
        'vida-agent',
        '--work-id',
        'cutover-work',
        '--attempt',
        '1',
        '--scope-digest',
        'd'.repeat(64),
        '--team',
        'default-development',
        '--kind',
        'research',
        '--intent',
        'information_research',
        '--workflow',
        'information_research_light',
      ];
      await writeFile(
        path.join(journalRoot, 'prepared-install.json'),
        record({ schema: 'VidaPreparedInstallJournal/v1' }),
      );
      const interrupted = await run(runArgs);
      expect(interrupted.exitCode).toBe(1);
      expect(JSON.parse(interrupted.stderr).code).toBe('GAP-VIDA-RUN-SELECTOR-001');
      await writeFile(selectorPath, record(selector));
      const incomplete = await run(runArgs);
      expect(incomplete.exitCode).toBe(1);
      expect(JSON.parse(incomplete.stderr).status).toBe('blocked');
      expect(await readFile(selectorPath, 'utf8')).toBe(record(selector));
      expect(JSON.parse(incomplete.stderr).code).toBe('GAP-VIDA-RUN-SELECTOR-001');
      await expect(readFile(path.join(journalRoot, 'cutoff-witness.json'))).rejects.toMatchObject({ code: 'ENOENT' });
      await expect(readFile(path.join(root, '.agent/work/session-handoff.v1.sqlite'))).rejects.toMatchObject({
        code: 'ENOENT',
      });
    } finally {
      bundle = ordinaryBundle;
      await writeFile(externalConfig, ordinaryConfig);
      await rm(installedBundle, { recursive: true, force: true });
    }
  },
  180_000,
);

v8CoverageTest(
  'unsupported native write capability, tenant input and malformed identity produce no outputs',
  async () => {
    const disabled = await init([], { FS_SAFE_NATIVE_MODE: 'off' });
    expect(disabled.exitCode).toBe(1);
    const invalid = await run([
      path.join(bundle, 'bin/init.mjs'),
      '--project-root',
      root,
      '--tenant',
      'forbidden',
      '--project',
      'valid-project',
    ]);
    expect(invalid.exitCode).toBe(1);
    expect(await readdir(root)).toEqual(['tools']);
  },
  30_000,
);

v8CoverageTest('reparse receipt ancestors fail without writing any root integration file', async () => {
  const outside = await mkdtemp(path.join(tmpdir(), 'portable-init-outside-'));
  try {
    await symlink(outside, path.join(root, '.agent'), process.platform === 'win32' ? 'junction' : 'dir');
    const result = await init();
    expect(result.exitCode).toBe(1);
    expect((await readdir(root)).sort()).toEqual(['.agent', 'tools']);
    expect(await readdir(outside)).toEqual([]);
  } finally {
    await rm(path.join(root, '.agent'), { force: true, recursive: true });
    await rm(outside, { force: true, recursive: true });
  }
});

v8CoverageTest('maximum-length repository and project identities remain valid', async () => {
  const result = await run([
    path.join(bundle, 'bin/init.mjs'),
    '--project-root',
    root,
    '--repository',
    'r'.repeat(64),
    '--project',
    'p'.repeat(50),
  ]);
  expect(result.exitCode, result.stderr).toBe(0);
  expect(JSON.parse(result.stdout).status).toBe('initialized');
});

v8CoverageTest(
  'explicit multi-project initialization uses unique non-overlapping roots and records the selected set',
  async () => {
    await mkdir(path.join(root, 'packages', 'alpha'), { recursive: true });
    await mkdir(path.join(root, 'packages', 'beta'), { recursive: true });
    const result = await run([
      path.join(bundle, 'bin/init.mjs'),
      '--project-root',
      root,
      '--repository',
      'multi-repository',
      '--project',
      'alpha=packages/alpha',
      '--project',
      'beta=packages/beta',
    ]);
    expect(result.exitCode, result.stderr).toBe(0);
    const config = parseRuntimeConfigYaml(await readFile(path.join(root, 'agent-runtime.config.v1.yaml'), 'utf8'));
    expect(config.repository.repository_id).toBe('multi-repository');
    expect(config.projects.map((project) => project.project_id)).toEqual(['alpha', 'beta']);
    expect(config.projects.map((project) => project.project_root)).toEqual(['packages/alpha', 'packages/beta']);
    expect(config.integrations.providers.map((provider) => provider.project_id)).toEqual(['alpha', 'beta']);
    const sidecar = await readFile(path.join(root, 'AGENT.sidecar.md'), 'utf8');
    expect(sidecar).toContain('Repository: multi-repository');
    expect(sidecar).toContain('Selected projects: alpha, beta');
  },
  30_000,
);

v8CoverageTest(
  'multi-project initialization rejects bare, equal, and overlapping project roots before writing integration files',
  async () => {
    const cases = [
      ['--project', 'alpha', '--project', 'beta=packages/beta'],
      ['--project', 'alpha=packages/shared', '--project', 'beta=packages/shared'],
      ['--project', 'alpha=packages', '--project', 'beta=packages/beta'],
    ];
    for (const args of cases) {
      const result = await run([
        path.join(bundle, 'bin/init.mjs'),
        '--project-root',
        root,
        '--repository',
        'multi-repository',
        ...args,
      ]);
      expect(result.exitCode).toBe(1);
      expect(await readdir(root)).toEqual(['tools']);
    }
  },
  30_000,
);

v8CoverageTest(
  'multi-project initialization emits no YAML references and gives each generated value independent nested data',
  async () => {
    await mkdir(path.join(root, 'packages', 'alpha'), { recursive: true });
    await mkdir(path.join(root, 'packages', 'beta'), { recursive: true });
    const result = await run([
      path.join(bundle, 'bin/init.mjs'),
      '--project-root',
      root,
      '--repository',
      'independent-repository',
      '--project',
      'alpha=packages/alpha',
      '--project',
      'beta=packages/beta',
    ]);
    expect(result.exitCode, result.stderr).toBe(0);
    const bytes = await readFile(path.join(root, 'agent-runtime.config.v1.yaml'), 'utf8');
    expect(bytes).not.toMatch(/(^|\n)\s*(?:[^#\n]*:\s*)?[&*][A-Za-z0-9_-]+(?:\s|$)/m);
    expect(() => parseRuntimeConfigYaml(bytes)).not.toThrow();
    const config = parseYaml(bytes);
    const [alpha, beta] = config.projects;
    const [alphaProvider, betaProvider] = config.integrations.providers;
    if (!alpha || !beta || !alphaProvider || !betaProvider)
      throw new Error('Expected two generated projects and providers');
    alpha.code_selectors.push('alpha-only/**');
    alphaProvider.namespace = 'alpha-only';
    expect(beta.code_selectors).not.toContain('alpha-only/**');
    expect(betaProvider.namespace).toBe('beta');
    const firstTeam = Object.values(config.teams)[0];
    if (!firstTeam) throw new Error('Expected a generated team');
    firstTeam.allowed_projects.push('team-only');
    expect(config.projects[0]?.code_selectors).not.toContain('team-only');
    const repeated = await init();
    expect(JSON.parse(repeated.stdout).status).toBe('existing');
    expect(await readFile(path.join(root, 'agent-runtime.config.v1.yaml'), 'utf8')).toBe(bytes);
  },
  30_000,
);
