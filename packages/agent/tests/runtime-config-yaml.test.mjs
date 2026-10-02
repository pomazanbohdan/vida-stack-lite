import { spawnSync } from 'node:child_process';
import { findNpmCli } from '../bin/bun.mjs';
import { afterAll, describe, expect, test } from 'bun:test';
import { cp, lstat, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { stringify as stringifyYaml } from 'yaml';
import {
  buildDevelopmentTaskPacket,
  canonicalJsonDigest,
  buildFailureArtifact,
  compileDevelopmentWorkflow,
  createConfiguredMastra,
  retryDevelopmentTaskPacket,
  sanitizeDiagnostic,
  loadRuntimeConfig,
  resolveAgentRoleProfile,
  resolveProviderWorkItemKind,
  runtimeConfigDigest,
  selectWorkflow,
  validateDevelopmentStagePacket,
  validateRuntimeConfig,
} from '../dist/src/index.js';
import {
  buildDeliveryReceipt as buildDeliveryReceiptSource,
  buildDevelopmentTaskPacket as buildDevelopmentTaskPacketSource,
  buildImplementationResult as buildImplementationResultSource,
  buildTesterInstruction as buildTesterInstructionSource,
  createDeliveryEvidenceAuthority,
  prepareDeliveryInstruction as prepareDeliveryInstructionSource,
  validateDeliveryReceipt as validateDeliveryReceiptSource,
  validateImplementationResult as validateImplementationResultSource,
} from '../src/orchestration/mastra-boundary.ts';
import {
  assertLoadedRuntimeConfig,
  loadRuntimeConfig as loadRuntimeConfigSource,
  validateRuntimeConfig as validateRuntimeConfigSource,
  validateRuntimeConfigRepairTargetBytes,
  parseRuntimeConfigYaml,
  requireConfiguredOperation,
  selectWorkflow as selectWorkflowSource,
} from '../src/config/runtime-config.ts';
import { createRuntimeKernelHost } from '../src/runtime-kernel.ts';
import { runBoundedSubprocess, subprocessFailure } from './helpers/bounded-subprocess.mjs';
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temporaryRoots = [];
const configuredRoot = process.env.AGENT_RUNTIME_TEST_REPOSITORY_ROOT || undefined;
const templateText = (await readFile(path.join(packageRoot, 'templates/agent-runtime.config.template.v1.yaml'), 'utf8'))
  .replaceAll('{{REPOSITORY}}', 'creatio-sample')
  .replaceAll('{{PROJECT}}', '3mob')
  .replaceAll('{{BUNDLE}}', 'vida-agent');
const fixtureBundle = configuredRoot
  ? parseRuntimeConfigYaml(await readFile(path.join(configuredRoot, 'agent-runtime.config.v1.yaml'), 'utf8')).runtime
      .bundle
  : 'vida-agent';
const authorityText = configuredRoot
  ? await readFile(path.join(configuredRoot, 'agent-runtime.config.v1.yaml'), 'utf8')
  : portableRuntimeConfigText(templateText);
// TEST SETUP: the template is fixture data, never a runtime configuration fallback.
const repositoryRoot = configuredRoot ?? (await fixtureRoot(authorityText));
if (!configuredRoot) {
  for (const file of [
    'docs/agent-instructions/documentation-policy.v1.json',
    'docs/tenants/crmbx/internal/projects/3mob/documentation-policy.v1.json',
    'docs/tenants/crmbx/wiki/Projects/3Mob/Operations.md',
    'docs/tenants/crmbx/wiki/Projects/3Mob/Requirements/Topics.md',
  ]) {
    await mkdir(path.dirname(path.join(repositoryRoot, file)), { recursive: true });
    await writeFile(path.join(repositoryRoot, file), file.endsWith('.json') ? '{}\n' : 'TEST SETUP fixture\n');
  }
}
const obsoletePackSurface =
  /runtime-compat|candidate-v2|(?:^|[\\/])(?:legacy|compatibility|upgraders?|backfill|fallback)(?:[\\/]|\.)|\b(?:create|load|open|migrate|upgrade|restore|backfill)(?:Legacy|Compatibility|Upgrader|Backfill|Fallback)[A-Z]\w*\b|\bexport\s+(?:declare\s+)?(?:class|function|const|type|interface)\s+(?:Legacy|Compatibility|Upgrader|Backfill|Fallback)[A-Z]\w*\b/i;

test('package surface guard rejects obsolete APIs while allowing current compatibility docs', () => {
  expect(
    obsoletePackSurface.test('Single-project compatibility entrypoint implemented through the exact-set factory.'),
  ).toBe(false);
  for (const obsolete of [
    'export declare function loadLegacyHostState(): void;',
    'import { repair } from "./runtime-compat.js";',
    'export * from "./candidate-v2.js";',
    'import { recover } from "./legacy/recovery.js";',
    'export declare class LegacyStateAdapter {}',
  ])
    expect(obsoletePackSurface.test(obsolete)).toBe(true);
});

test('compiled package surface contains no retired API or module path', async () => {
  for (const root of ['dist', 'schemas']) {
    for (const entry of await readdir(path.join(packageRoot, root), { recursive: true })) {
      const relative = `${root}/${String(entry).replaceAll('\\', '/')}`;
      if (!/\.(?:js|d\.ts|json)$/i.test(relative)) continue;
      const text = await readFile(path.join(packageRoot, root, String(entry)), 'utf8');
      expect(text, relative).not.toMatch(obsoletePackSurface);
    }
  }
});

async function runProcess({ cmd, cwd, env, timeoutMs = 300_000 }) {
  const [command, ...args] = cmd;
  return runBoundedSubprocess(command, args, { cwd, env, timeoutMs });
}

function sha256Bytes(value) {
  return createHash('sha256').update(value).digest('hex');
}
function replaceRuntimeDirectory(value, from, to) {
  if (typeof value === 'string') return value.replaceAll(from, to);
  if (Array.isArray(value)) return value.map((item) => replaceRuntimeDirectory(item, from, to));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, replaceRuntimeDirectory(item, from, to)]),
    );
  }
  return value;
}
function portableRuntimeConfigText(yaml) {
  const sourceConfig = parseRuntimeConfigYaml(yaml);
  const config = replaceRuntimeDirectory(sourceConfig, fixtureBundle, 'vida-agent');
  config.config_id = 'creatio-sample';
  config.repository.repository_id = 'creatio-sample';
  config.repository.title = 'creatio-sample repository';
  config.paths.processing_scope = 'whole_repository';
  config.projects[0].task_prefix = 'CRMBX-3MOB';
  if (!configuredRoot) config.projects[0].project_root = 'project/3mob';
  if (!config.projects.some((project) => project.project_id === 'refactoring')) {
    const project = structuredClone(config.projects[0]);
    project.project_id = 'refactoring';
    project.title = 'Refactoring fixture';
    project.project_root = 'project/refactoring';
    project.wiki_root = 'docs/agent-instructions';
    project.wiki_path = 'docs/agent-instructions/index.md';
    project.wiki_output_root = '.planning/agent-flow/wiki-output/refactoring';
    project.internal_root = 'docs/agent-instructions';
    project.ledger_root = '.agent/coordination';
    project.task_prefix = 'REFACTORING';
    project.code_selectors = ['project/refactoring/**'];
    project.delivery_group = 'refactoring';
    if (project.path_overrides) project.path_overrides.project_root = project.project_root;
    config.projects.push(project);
  }
  if (!config.integrations.providers.some((provider) => provider.project_id === 'refactoring')) {
    config.integrations.providers.push({
      id: 'internal-refactoring',
      provider: 'internal',
      project_id: 'refactoring',
      tenant_id: 'fixture',
      namespace: 'refactoring',
    });
  }
  for (const team of Object.values(config.teams)) {
    team.allowed_projects = team.allowed_projects.map((project) =>
      project === sourceConfig.repository.repository_id ? config.repository.repository_id : project,
    );
    if (Array.isArray(team.allowed_projects) && !team.allowed_projects.includes('refactoring'))
      team.allowed_projects.push('refactoring');
  }
  const registry = config.research_decision.registry;
  const registryWithoutDigest = Object.fromEntries(Object.entries(registry).filter(([key]) => key !== 'digest'));
  registry.digest = canonicalJsonDigest(registryWithoutDigest);
  return stringifyYaml(config, { lineWidth: 0 });
}
async function digestRegularTree(root, relativeRoot, include = () => true) {
  const entries = (await readdir(path.join(root, relativeRoot), { recursive: true })).map(String).sort();
  const hash = createHash('sha256');
  for (const entry of entries) {
    const relative = entry.replaceAll('\\', '/');
    if (!include(relative)) continue;
    const absolute = path.join(root, relativeRoot, entry);
    const stats = await lstat(absolute);
    if (stats.isSymbolicLink()) throw new Error('artifact tree contains a symbolic link: ' + relative);
    if (stats.isDirectory()) continue;
    if (!stats.isFile()) throw new Error('artifact tree contains an unsupported entry: ' + relative);
    const bytes = await readFile(absolute);
    hash.update(`${relative}\0${bytes.byteLength}\0`);
    hash.update(bytes);
    hash.update('\n');
  }
  return hash.digest('hex');
}
async function fixtureRoot(yaml = authorityText) {
  const root = await mkdtemp(path.join(tmpdir(), 'runtime-yaml-v1-'));
  temporaryRoots.push(root);
  await Promise.all([
    mkdir(path.join(root, '.git'), { recursive: true }),
    mkdir(path.join(root, fixtureBundle), { recursive: true }),
  ]);
  await mkdir(path.join(root, 'docs/creatio'), { recursive: true });
  await Promise.all([
    writeFile(path.join(root, 'AGENTS.md'), 'fixture policy\n'),
    writeFile(path.join(root, 'AGENT.sidecar.md'), 'fixture sidecar\n'),
    writeFile(path.join(root, 'docs/creatio/map.md'), 'fixture map\n'),
    mkdir(path.join(root, fixtureBundle, 'instructions'), { recursive: true }),
    writeFile(path.join(root, fixtureBundle, 'TESTING.md'), 'fixture testing\n'),
    writeFile(path.join(root, 'agent-runtime.config.v1.yaml'), yaml),
  ]);
  return root;
}

async function configuredOperationVariant(id, field, value) {
  const document = structuredClone(parseRuntimeConfigYaml(authorityText));
  if (field === 'missing')
    document.operations.registry = document.operations.registry.filter((entry) => entry.id !== id);
  else document.operations.registry.find((entry) => entry.id === id)[field] = value;
  return loadRuntimeConfigSource(await fixtureRoot(stringifyYaml(document, { lineWidth: 0 })));
}

async function expectYamlFailure(transform, pattern) {
  const root = await fixtureRoot(transform(authorityText));
  expect(() => loadRuntimeConfig(root)).toThrow(pattern);
}

afterAll(async () => {
  await Promise.all(temporaryRoots.map((root) => rm(root, { recursive: true, force: true })));
}, 300_000);

describe('one strict YAML authority', () => {
  test('validates exact repair target bytes without granting runtime config authority', () => {
    const source = loadRuntimeConfigSource(repositoryRoot);
    const target = validateRuntimeConfigRepairTargetBytes(Buffer.from(authorityText, 'utf8'), repositoryRoot);
    expect(runtimeConfigDigest(target)).toBe(runtimeConfigDigest(source));
    expect(target).not.toBe(source);
    expect(() => assertLoadedRuntimeConfig(target, repositoryRoot)).toThrow(/must come from loadRuntimeConfig/);
    const withBom = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(authorityText, 'utf8')]);
    expect(runtimeConfigDigest(validateRuntimeConfigRepairTargetBytes(withBom, repositoryRoot))).toBe(
      runtimeConfigDigest(source),
    );
    expect(() => validateRuntimeConfigRepairTargetBytes(Uint8Array.of(0xc3, 0x28), repositoryRoot)).toThrow();
    expect(() => validateRuntimeConfigRepairTargetBytes(Buffer.alloc(4 * 1024 * 1024 + 1), repositoryRoot)).toThrow(
      /too large/,
    );
    expect(() => validateRuntimeConfigRepairTargetBytes(Buffer.from(authorityText), '.')).toThrow(/absolute/);
    expect(() =>
      validateRuntimeConfigRepairTargetBytes(
        Buffer.from(authorityText.replace('AgentRuntimeConfig/v1', 'AgentRuntimeConfig/v2'), 'utf8'),
        repositoryRoot,
      ),
    ).toThrow();
  });

  test('current v1 permits a relocated bundle with coherent contained roots', () => {
    const config = structuredClone(loadRuntimeConfigSource(repositoryRoot));
    config.runtime = {
      bundle: 'tools/agents',
      schema_root: 'tools/agents/schemas',
      instruction_root: 'tools/agents/instructions',
      tooling_root: 'tools/agents/tooling',
    };
    config.verification.differential.oracle.module = 'verification/reference.cjs';
    expect(validateRuntimeConfigSource(config).runtime.bundle).toBe('tools/agents');
    for (const invalid of ['tools/agents-other/instructions', '../instructions', 'tools/agents/../outside']) {
      expect(() =>
        validateRuntimeConfigSource({
          ...config,
          runtime: { ...config.runtime, instruction_root: invalid },
        }),
      ).toThrow();
    }
    expect(() =>
      validateRuntimeConfigSource({
        ...config,
        runtime: { ...config.runtime, schema_root: 'elsewhere/schemas' },
      }),
    ).toThrow(/GAP-RTNEW-ISOLATION/);
    config.verification.differential.oracle.module = '../outside.cjs';
    expect(() => validateRuntimeConfigSource(config)).toThrow();
  });

  test('loads, freezes, caches, and digests the fixed authority', () => {
    const config = loadRuntimeConfig(repositoryRoot);
    expect(config.schema).toBe('AgentRuntimeConfig/v1');
    expect(config.version).toBe(1);
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.workflows.bug_fix.stages)).toBe(true);
    expect(loadRuntimeConfig(repositoryRoot)).toBe(config);
    expect(runtimeConfigDigest(config)).toMatch(/^[a-f0-9]{64}$/);
    expect(resolveAgentRoleProfile(repositoryRoot, 'researcher')).toBe(config.agents.profiles.researcher);
  });

  test('reloads changed root YAML bytes before returning an authorized config', async () => {
    const root = await fixtureRoot();
    const first = loadRuntimeConfigSource(root);
    const changed = authorityText.replace(
      /^config_revision: (\d+)$/m,
      (_, revision) => `config_revision: ${Number(revision) + 1}`,
    );
    expect(changed).not.toBe(authorityText);
    await writeFile(path.join(root, 'agent-runtime.config.v1.yaml'), changed);
    const next = loadRuntimeConfigSource(root);
    expect(next).not.toBe(first);
    expect(next.config_revision).toBe(first.config_revision + 1);
    expect(runtimeConfigDigest(next)).not.toBe(runtimeConfigDigest(first));
    expect(loadRuntimeConfigSource(root)).toBe(next);
    expect(() => assertLoadedRuntimeConfig(next, root)).not.toThrow();
  });

  test('ignores environment, caller CWD, and alternate-file selectors', async () => {
    const originalCwd = process.cwd;
    const prior = process.env.AGENT_RUNTIME_CONFIG;
    const outside = await mkdtemp(path.join(tmpdir(), 'runtime-cwd-'));
    temporaryRoots.push(outside);
    process.env.AGENT_RUNTIME_CONFIG = path.join(outside, 'malicious.yaml');
    process.cwd = () => outside;
    try {
      expect(loadRuntimeConfig(repositoryRoot).config_id).toBe('creatio-sample');
      expect(() => loadRuntimeConfig('.')).toThrow(/absolute/);
    } finally {
      process.cwd = originalCwd;
      if (prior === undefined) delete process.env.AGENT_RUNTIME_CONFIG;
      else process.env.AGENT_RUNTIME_CONFIG = prior;
    }
  });

  test('rejects duplicate keys, aliases, anchors, merge keys, and custom tags', async () => {
    await expectYamlFailure((yaml) => yaml + '\nschema: AgentRuntimeConfig/v1\n', /duplicate|Map keys/i);
    await expectYamlFailure(
      (yaml) => yaml.replace('schema: AgentRuntimeConfig/v1', 'schema: &identity AgentRuntimeConfig/v1'),
      /anchors/i,
    );
    await expectYamlFailure(
      (yaml) => yaml.replace('schema: AgentRuntimeConfig/v1', 'schema: *identity'),
      /alias|Unresolved alias/i,
    );
    await expectYamlFailure(
      (yaml) => yaml.replace('schema: AgentRuntimeConfig/v1', 'schema: !runtime AgentRuntimeConfig/v1'),
      /tags|tag/i,
    );
    await expectYamlFailure((yaml) => yaml + '\n<<: { forbidden: true }\n', /merge|unknown|additional/i);
  });

  test('rejects unknown fields, malformed scalars, unsafe paths, and literal credentials', async () => {
    await expectYamlFailure((yaml) => yaml + '\nunknown_setting: true\n', /additional properties|validation failed/i);
    for (const [needle, replacement] of [
      ['  checkpoint_name: resume.json', '  derived_root: .planning/agent-flow\n  checkpoint_name: resume.json'],
      ['  processing_scope: whole_repository', '  processing_scope: whole_repository\n  shared_path_keys: []'],
      ['    task_prefix: CRMBX-3MOB', '    task_prefix: CRMBX-3MOB\n    dashboard_port: 6422'],
      ['      mutation_scope: repository_source', '      mutation_scope: repository_source\n      ponytail: full'],
      [
        'observability:\n',
        'observability:\n  schema: AgentTracePolicy/v1\n  capture_payloads: false\n  trace_fields: []\n',
      ],
    ]) {
      await expectYamlFailure((yaml) => yaml.replace(needle, replacement), /additional properties|validation failed/i);
    }
    await expectYamlFailure((yaml) => {
      const config = structuredClone(parseRuntimeConfigYaml(yaml));
      config.work_items.types.epic = { level: 0, child_kinds: [] };
      return stringifyYaml(config, { lineWidth: 0 });
    }, /additional properties|validation failed/i);
    await expectYamlFailure(
      (yaml) => yaml.replace(/config_revision: \d+/, 'config_revision: wrong'),
      /integer|validation failed/i,
    );
    await expectYamlFailure(
      (yaml) => yaml.replace('sidecar: AGENT.sidecar.md', 'sidecar: ../AGENT.sidecar.md'),
      /repository-relative|unsafe path/i,
    );
    await expectYamlFailure(
      (yaml) => yaml.replace(/(\r?\n)    schema_text:/, '$1    actions: []$1    schema_text:'),
      /additional properties|validation failed/i,
    );
    await expectYamlFailure(
      (yaml) => yaml.replace(/(\r?\n)    sandbox:/, '$1      require_result: true$1    sandbox:'),
      /additional properties|validation failed/i,
    );
    await expectYamlFailure(
      (yaml) =>
        yaml.replace(
          /(\r?\n)    hitl:/,
          '$1    memory:$1      store_id: candidate-storage$1      provider: libsql$1    hitl:',
        ),
      /additional properties|validation failed/i,
    );
    await expectYamlFailure(
      (yaml) => yaml.replace(/(\r?\n)governance:/, '$1secrets:$1  references: []$1governance:'),
      /additional properties|validation failed/i,
    );
    await expectYamlFailure(
      (yaml) => yaml.replace('description: Configured develop role.', 'description: token=PLAINTEXT'),
      /opaque secret|literal|credential/i,
    );
    await expectYamlFailure(
      (yaml) => yaml.replace('description: Configured develop role.', 'description: Bearer AbCdEfGh'),
      /opaque secret|literal|credential/i,
    );
    await expectYamlFailure(
      (yaml) => yaml.replace('https://', 'https://user:password@'),
      /opaque secret|literal|credential/i,
    );
  });

  test('removed component settings are absent and not needed by any consumer', async () => {
    const removed = [
      'config/agent-profiles.v1.json',
      'config/authorization/cedar-policy.v1.cedar',
      'config/authorization/cedar-schema.v1.json',
      'config/governance/edictum-policy.v1.json',
      'config/integrations/edictum-workflow.v1.yml',
      'config/orchestration/mastra-policy.v1.json',
      'config/platform-knowledge.sources.json',
      'config/runtime-operations.v1.json',
    ];
    for (const removedPath of removed) {
      await expect(readFile(path.join(packageRoot, removedPath))).rejects.toMatchObject({ code: 'ENOENT' });
    }
    expect(loadRuntimeConfig(repositoryRoot).authorization.cedar.policy).toContain('permit');
  });
});

describe('profiles, work items, teams, and workflow graphs', () => {
  const config = loadRuntimeConfig(repositoryRoot);
  const sourceConfig = loadRuntimeConfigSource(repositoryRoot);

  test('uses Luna xhigh fast for every research profile', () => {
    for (const id of ['researcher', 'web-researcher', 'codebase-mapper']) {
      expect(config.agents.profiles[id]).toMatchObject({
        model: 'gpt-6-luna',
        reasoning: 'xhigh',
        execution_mode: 'fast',
        mutation_scope: 'none',
      });
    }
  });
  test('uses Luna max default for the stage-4 blind architect', () => {
    expect(config.agents.profiles.architect).toMatchObject({
      model: 'gpt-6-luna',
      reasoning: 'max',
      execution_mode: 'standard',
      mutation_scope: 'none',
      tools_policy: 'read_only',
      egress_policy: 'official_docs',
    });
  });

  test('normalizes universal Azure, Jira, and internal work item kinds', () => {
    expect(resolveProviderWorkItemKind(config, 'azure', 'Product Backlog Item')).toBe('pbi');
    expect(resolveProviderWorkItemKind(config, 'azure', 'Bug')).toBe('bug');
    expect(resolveProviderWorkItemKind(config, 'jira', 'Story')).toBe('story');
    expect(resolveProviderWorkItemKind(config, 'jira', 'Epic')).toBe('epic');
    expect(resolveProviderWorkItemKind(config, 'internal', 'Research')).toBe('research');
    expect(() => resolveProviderWorkItemKind(config, 'jira', 'Unknown')).toThrow(/not registered/);
  });

  test('selects each intent deterministically', () => {
    const cases = [
      ['research', 'information_research', 'information_research_light'],
      ['bug', 'bug_fix', 'bug_fix'],
      ['feature', 'implementation_new', 'implementation_new'],
      ['story', 'implementation_change', 'implementation_change'],
      ['task', 'task_execution', 'task_execution'],
    ];
    for (const [kind, intent, expected] of cases) {
      const selection = selectWorkflow(config, {
        team: 'default-development',
        kind,
        intent,
        project: '3mob',
        risk_flags: [],
        labels: [],
      });
      expect(selection.workflow_id).toBe(expected);
    }
  });
  test.each([
    ['missing', null],
    ['tool', 'runtime.write'],
    ['governance_stage', 'source-write'],
    ['evidence_class', 'Runtime'],
    ['profile', 'researcher'],
  ])('direct workflow selection rejects incompatible %s operation declaration', async (field, value) => {
    const current = await configuredOperationVariant('selectWorkflow', field, value);
    expect(() =>
      selectWorkflowSource(current, {
        team: 'default-development',
        kind: 'bug',
        intent: 'bug_fix',
        project: '3mob',
        risk_flags: [],
        labels: [],
      }),
    ).toThrow(/configured operation.*unavailable: selectWorkflow/);
  });
  test('operation lookup rejects forged configuration and selects the requested registry entry', () => {
    const forged = parseRuntimeConfigYaml(authorityText);
    expect(() =>
      requireConfiguredOperation(forged, 'selectWorkflow', 'runtime.read', 'read-evidence', 'Decision'),
    ).toThrow(/must come from loadRuntimeConfig/);
    expect(
      requireConfiguredOperation(sourceConfig, 'selectWorkflow', 'runtime.read', 'read-evidence', 'Decision').id,
    ).toBe('selectWorkflow');
  });
  test('direct packet construction rejects a forged configuration before reading packet fields', () => {
    const forged = parseRuntimeConfigYaml(authorityText);
    expect(() => buildDevelopmentTaskPacketSource(forged, null)).toThrow(/must come from loadRuntimeConfig/);
  });
  test('configuration rejects operation IDs without an executable consumer', () => {
    const document = structuredClone(parseRuntimeConfigYaml(authorityText));
    document.operations.registry.push({
      ...document.operations.registry[0],
      id: 'unimplementedOperation',
    });
    expect(() => validateRuntimeConfigSource(document)).toThrow(
      'operation unimplementedOperation has no runtime consumer',
    );
  });
  test('keeps approval admission in Mastra HITL and rejects a second Edictum required-for list', () => {
    expect(config.governance.edictum.approval).toEqual({ clock_skew_ms: 60000, max_age_ms: 300000 });
    expect(config.orchestration.mastra.hitl.approval_required_for).toEqual(['source.write', 'delivery.execute']);
    const document = structuredClone(parseRuntimeConfigYaml(authorityText));
    document.governance.edictum.approval.required_for = ['runtime.write'];
    expect(() => validateRuntimeConfigSource(document)).toThrow(/additional properties|validation failed/i);
  });
  test.each([
    ['missing', 'unregistered', 'runtime.read', 'read-evidence', 'Decision'],
    ['tool', 'selectWorkflow', 'runtime.write', 'read-evidence', 'Decision'],
    ['stage', 'selectWorkflow', 'runtime.read', 'source-write', 'Decision'],
    ['evidence', 'selectWorkflow', 'runtime.read', 'read-evidence', 'Runtime'],
  ])('operation lookup rejects %s mismatch', (_kind, id, tool, stage, evidence) => {
    expect(() => requireConfiguredOperation(sourceConfig, id, tool, stage, evidence)).toThrow(
      'configured operation is unavailable: ' + id,
    );
  });
  test('enforces project and work item kind allowlists before workflow selection', () => {
    const base = {
      team: 'default-development',
      kind: 'bug',
      intent: 'bug_fix',
      project: '3mob',
      risk_flags: [],
      labels: [],
    };
    expect(() => selectWorkflow(config, { ...base, project: 'unregistered-project' })).toThrow(
      /project is not allowed/,
    );
    const forged = JSON.parse(JSON.stringify(config));
    forged.workflow_bindings.unshift({
      id: 'forged-binding',
      priority: 0,
      team: 'default-development',
      work_item_kinds: ['bug'],
      intents: ['bug_fix'],
      projects: ['*'],
      risks: ['*'],
      labels: [],
      workflow: 'bug_fix',
    });
    expect(() => selectWorkflow(forged, { ...base })).toThrow(/loadRuntimeConfig/);
  });

  test.each([
    ['team', 'shadow-development'],
    ['work_item_kinds', ['feature']],
    ['intents', ['implementation_change']],
    ['projects', ['refactoring']],
    ['risks', ['security']],
    ['labels', ['urgent']],
  ])('workflow selection skips a higher-priority binding with mismatched %s', async (field, value) => {
    const document = structuredClone(parseRuntimeConfigYaml(authorityText));
    document.teams['shadow-development'] = structuredClone(document.teams['default-development']);
    document.workflow_bindings.push({
      ...structuredClone(document.workflow_bindings.find((binding) => binding.id === 'bug-default')),
      id: 'shadow-bug',
      priority: 5,
      [field]: value,
    });
    const current = loadRuntimeConfigSource(await fixtureRoot(stringifyYaml(document, { lineWidth: 0 })));
    expect(
      selectWorkflowSource(current, {
        team: 'default-development',
        kind: 'bug',
        intent: 'bug_fix',
        project: '3mob',
        risk_flags: [],
        labels: [],
      }).binding_id,
    ).toBe('bug-default');
  });

  test('workflow selection sorts matching bindings by configured priority', async () => {
    const document = structuredClone(parseRuntimeConfigYaml(authorityText));
    document.workflow_bindings.push({
      ...structuredClone(document.workflow_bindings.find((binding) => binding.id === 'bug-default')),
      id: 'priority-bug',
      priority: 5,
    });
    const current = loadRuntimeConfigSource(await fixtureRoot(stringifyYaml(document, { lineWidth: 0 })));
    expect(
      selectWorkflowSource(current, {
        team: 'default-development',
        kind: 'bug',
        intent: 'bug_fix',
        project: '3mob',
        risk_flags: [],
        labels: [],
      }).binding_id,
    ).toBe('priority-bug');
  });
  test('workflow selection rejects malformed input and an unavailable team', () => {
    const selection = {
      team: 'default-development',
      kind: 'bug',
      intent: 'bug_fix',
      project: '3mob',
      risk_flags: [],
      labels: [],
    };
    expect(() => selectWorkflowSource(sourceConfig, { ...selection, kind: 'unknown' })).toThrow(
      'workflow selection work item kind is invalid',
    );
    expect(() => selectWorkflowSource(sourceConfig, { ...selection, team: 'missing-team' })).toThrow(
      'workflow selection team is unavailable',
    );
  });
  test('workflow selection distinguishes explicit risk and complete label matching', async () => {
    const document = structuredClone(parseRuntimeConfigYaml(authorityText));
    const bugBinding = document.workflow_bindings.find((binding) => binding.id === 'bug-default');
    document.workflow_bindings.push({
      ...structuredClone(bugBinding),
      id: 'security-bug',
      priority: 5,
      risks: ['security'],
    });
    document.workflow_bindings.push({
      ...structuredClone(bugBinding),
      id: 'labeled-bug',
      priority: 6,
      labels: ['urgent', 'high'],
    });
    const current = loadRuntimeConfigSource(await fixtureRoot(stringifyYaml(document, { lineWidth: 0 })));
    const selection = {
      team: 'default-development',
      kind: 'bug',
      intent: 'bug_fix',
      project: '3mob',
      risk_flags: [],
      labels: [],
    };
    expect(selectWorkflowSource(current, selection).binding_id).toBe('bug-default');
    expect(selectWorkflowSource(current, { ...selection, risk_flags: ['security'] }).binding_id).toBe('security-bug');
    expect(selectWorkflowSource(current, { ...selection, labels: ['urgent'] }).binding_id).toBe('bug-default');
    expect(selectWorkflowSource(current, { ...selection, labels: ['urgent', 'high'] }).binding_id).toBe('labeled-bug');
  });

  test('configures role-specific instructions and conditional research contours', () => {
    expect(Object.keys(config.agents.role_instructions).sort()).toEqual(
      Object.keys(config.teams['default-development'].roles).sort(),
    );
    expect(config.agents.role_instructions['developer-orchestrator'].rules.join(' ')).toMatch(/immutable packet/i);
    expect(config.agents.role_instructions.tester.rules.join(' ')).toMatch(/verification commands/i);
    expect(config.agents.role_instructions['delivery-agent'].rules.join(' ')).toMatch(/required receipts/i);
    const normal = compileDevelopmentWorkflow(config, 'default-development', 'bug_fix');
    const elevated = compileDevelopmentWorkflow(config, 'default-development', 'bug_fix', ['security']);
    expect(normal.waves[0][0].assignments.map((item) => item.role)).not.toContain('security-data-researcher');
    expect(elevated.waves[0][0].assignments.map((item) => item.role)).toContain('security-data-researcher');
  });

  test('keeps research light and source mutation developer-only', () => {
    const research = config.workflows.information_research_light;
    expect(research.assurance_profile).toBe('research_light');
    expect(research.stages.every((stage) => ['research', 'synthesize'].includes(stage.kind))).toBe(true);
    for (const [workflowId, workflow] of Object.entries(config.workflows)) {
      const developers = workflow.stages.filter((stage) => stage.kind === 'develop');
      if (workflow.assurance_profile === 'research_light') expect(developers).toHaveLength(0);
      else {
        expect(developers).toHaveLength(1);
        expect(developers[0].assignments).toEqual([{ role: 'developer-orchestrator', profile: 'executor' }]);
      }
      for (const stage of workflow.stages) {
        for (const assignment of stage.assignments) {
          const profile = config.agents.profiles[assignment.profile];
          if (stage.kind === 'develop' && assignment.role === 'developer-orchestrator')
            expect(profile.mutation_scope).toBe('repository_source');
          else expect(profile.mutation_scope).toBe('none');
        }
      }
      expect(workflow.max_attempts).toBeGreaterThan(0);
      expect(workflow.edges.every(([from, to]) => from !== to)).toBe(true);
      expect(compileDevelopmentWorkflow(config, 'default-development', workflowId).waves.length).toBeGreaterThan(0);
    }
  });

  test('orders validation, testing, and delivery after development', () => {
    for (const workflowId of ['implementation_new', 'implementation_change', 'bug_fix', 'task_execution']) {
      const compiled = compileDevelopmentWorkflow(config, 'default-development', workflowId);
      const positions = new Map(
        compiled.waves.flatMap((wave, waveIndex) => wave.map((stage) => [stage.kind, waveIndex])),
      );
      expect(positions.get('test')).toBeGreaterThan(positions.get('develop'));
      expect(positions.get('validate')).toBeGreaterThan(positions.get('develop'));
      expect(positions.get('deliver')).toBeGreaterThan(positions.get('test'));
      expect(positions.get('deliver')).toBeGreaterThan(positions.get('validate'));
    }
  });

  test('rejects unsupported standalone barrier stages while preserving DAG join barriers', () => {
    const changed = JSON.parse(JSON.stringify(config));
    changed.workflows.information_research_light.stages[0].mode = 'barrier';
    expect(() => validateRuntimeConfig(changed)).toThrow(
      /mode.*allowed values|must be equal to one of the allowed values/i,
    );
    const compiled = compileDevelopmentWorkflow(config, 'default-development', 'information_research_light');
    expect(compiled.waves.flat().some((stage) => stage.mode === 'parallel')).toBe(true);
  });

  test('rejects source-write capability on a validator', () => {
    const changed = JSON.parse(JSON.stringify(config));
    changed.agents.profiles['reviewer-correctness'].mutation_scope = 'repository_source';
    expect(() => validateRuntimeConfig(changed)).toThrow(/mutation scope|outside developer/i);
  });
  test('rejects source-write tools on read-only policies', () => {
    for (const sourceWriteTool of ['runtime.write', 'source.write']) {
      const changed = JSON.parse(JSON.stringify(config));
      const policyId = changed.agents.profiles['reviewer-correctness'].tools_policy;
      changed.agents.tool_policies[policyId].allowed_tools.push(sourceWriteTool);
      expect(() => validateRuntimeConfig(changed)).toThrow(/source-write tools/i);
    }
  });
  test('requires repository references to be regular files', () => {
    const changed = JSON.parse(JSON.stringify(config));
    changed.repository.sidecar = '.git';
    expect(() => validateRuntimeConfig(changed, repositoryRoot)).toThrow(
      /required reference|regular file|directory|unsafe/i,
    );
  });

  test('rejects duplicate or incomplete current-v1 integration bindings', () => {
    for (const [field, message] of [
      ['id', /integration provider id is duplicated/],
      ['project_id', /integration provider project is duplicated/],
      ['namespace', /integration provider namespace is duplicated/],
    ]) {
      const changed = JSON.parse(JSON.stringify(config));
      changed.integrations.providers[1][field] = changed.integrations.providers[0][field];
      expect(() => validateRuntimeConfigSource(changed)).toThrow(message);
    }
    const missing = JSON.parse(JSON.stringify(config));
    missing.integrations.providers = missing.integrations.providers.slice(0, -1);
    expect(() => validateRuntimeConfigSource(missing)).toThrow(
      /project integration binding is not configured|cover each configured project exactly once/,
    );
  });

  test('rejects equal or nested monorepo project roots', () => {
    for (const root of [config.projects[0].project_root, 'project']) {
      const changed = JSON.parse(JSON.stringify(config));
      changed.projects[1].project_root = root;
      expect(() => validateRuntimeConfigSource(changed)).toThrow(
        /project roots (contains duplicates|must not overlap)/,
      );
    }
  });

  test('compiles Mastra from the selected graph and enforces role tools', async () => {
    const result = createConfiguredMastra(repositoryRoot, {
      team_id: 'default-development',
      work_item: {
        kind: 'bug',
        intent: 'bug_fix',
        project: '3mob',
        risk_flags: [],
        labels: [],
      },
    });
    expect(result.agentId).toBe('workflow-dispatcher');
    expect(result.workflowId).toBe('bug_fix');
    expect(result.profileId).toBe('codebase-mapper');
    expect(result.model).toBe('gpt-6-luna');
    expect(result.compiled.waves.flat().find((stage) => stage.id === 'validate_parallel')?.mode).toBe('parallel');
    expect(await result.hooks.beforeToolCall({ toolName: 'source.write' })).toEqual({
      proceed: false,
      output: 'Mastra tool denied by configured role policy',
    });
    expect(await result.hooks.beforeToolCall({ toolName: 'source.read' })).toBeUndefined();
    const research = createConfiguredMastra(repositoryRoot, {
      work_item: {
        kind: 'research',
        intent: 'information_research',
        project: '3mob',
        risk_flags: [],
        labels: [],
      },
    });
    expect(research.profileId).toBe('web-researcher');
    expect(
      await research.hooks.beforeToolCall({ toolName: 'web.search', input: { url: 'https://github.com/openai' } }),
    ).toBeUndefined();
    expect(
      await research.hooks.beforeToolCall({
        toolName: 'web.search',
        input: { url: 'https://evil.example/exfiltrate' },
      }),
    ).toEqual({
      proceed: false,
      output: 'Mastra tool denied by configured role policy',
    });
    expect(
      await research.hooks.beforeToolCall({ toolName: 'web.search', input: { url: 'http://github.com/openai' } }),
    ).toEqual({
      proceed: false,
      output: 'Mastra tool denied by configured role policy',
    });
    expect(
      await research.hooks.beforeToolCall({
        toolName: 'web.search',
        input: { request: { destination: 'https://evil.example/nested-exfiltrate' } },
      }),
    ).toEqual({
      proceed: false,
      output: 'Mastra tool denied by configured role policy',
    });
    expect(await research.hooks.beforeToolCall({ toolName: 'web.search', input: { query: 'openai' } })).toEqual({
      proceed: false,
      output: 'Mastra tool denied by configured role policy',
    });
    expect(() => createConfiguredMastra(repositoryRoot, { profile_id: 'executor' })).toThrow(/request field/);
  });
});

describe('final v1 artifact contracts', () => {
  const config = loadRuntimeConfig(repositoryRoot);
  const sourceConfig = loadRuntimeConfigSource(repositoryRoot);
  const contracts = config.artifact_contracts;

  function packetInput(overrides = {}) {
    const workflowId = overrides.workflow_id ?? 'bug_fix';
    const riskFlags = overrides.risk_flags ?? [];
    const workItem = {
      kind:
        workflowId === 'bug_fix'
          ? 'bug'
          : workflowId === 'task_execution'
            ? 'task'
            : workflowId === 'implementation_change'
              ? 'story'
              : 'feature',
      intent: workflowId,
      project: '3mob',
      risk_flags: [...riskFlags],
      labels: [],
    };
    return {
      packet_id: 'packet-default',
      work_item_id: 'work-default',
      team_id: 'default-development',
      workflow_id: workflowId,
      work_item: workItem,
      attempt: 1,
      risk_flags: riskFlags,
      objective: 'Complete the configured work.',
      acceptance: ['The focused acceptance passes.'],
      in_scope: ['agent-runtime.config.v1.yaml'],
      out_of_scope: [],
      owned_paths: [
        'agent-runtime.config.v1.yaml',
        'agent-runtime-new/src/orchestration/mastra-boundary.ts',
        'agent-runtime-new/TESTING.md',
      ],
      affected_symbols: [],
      skill_refs: ['skill://gsd-fast'],
      documentation_refs: ['agent-runtime-new/TESTING.md#Artifact contract tests'],
      code_evidence_refs: ['agent-runtime.config.v1.yaml'],
      research_artifact_refs: workflowId === 'task_execution' ? [] : ['artifact://research/research/' + 'a'.repeat(64)],
      diagnostics: [],
      failed_approaches: [],
      prohibited_patterns: [],
      implementation_constraints: ['Modify only owned paths.'],
      security_constraints: [],
      expected_tests: ['bun test tests/runtime-config-yaml.test.mjs'],
      delivery_conditions: ['All configured gates pass.'],
      source_revision: 'git:test',
      lease_expires_at: new Date(Date.now() + 60_000).toISOString(),
      ...overrides,
    };
  }
  test.each([
    ['missing', null],
    ['tool', 'runtime.write'],
    ['governance_stage', 'source-write'],
    ['evidence_class', 'Runtime'],
    ['profile', 'executor'],
  ])('packet builder rejects incompatible %s operation declaration', async (field, value) => {
    const current = await configuredOperationVariant('buildDevelopmentTaskPacket', field, value);
    expect(() => buildDevelopmentTaskPacketSource(current, packetInput())).toThrow(
      /configured operation.*unavailable: buildDevelopmentTaskPacket/,
    );
  });
  test('packet builder accepts another configured read-only profile', async () => {
    const current = await configuredOperationVariant('buildDevelopmentTaskPacket', 'profile', 'web-researcher');
    expect(buildDevelopmentTaskPacketSource(current, packetInput()).schema).toBe('DevelopmentTaskPacket/v1');
  });
  test('packet builder rejects a non-read-only tool policy even with no mutation scope', async () => {
    const current = await configuredOperationVariant('buildDevelopmentTaskPacket', 'profile', 'reviewer-correctness');
    expect(() => buildDevelopmentTaskPacketSource(current, packetInput())).toThrow(
      'configured operation profile is unavailable: buildDevelopmentTaskPacket',
    );
  });
  test('packet builder rejects an unavailable team and malformed lists after registry validation', () => {
    expect(() => buildDevelopmentTaskPacketSource(sourceConfig, packetInput({ team_id: 'missing-team' }))).toThrow(
      /packet team is unavailable/,
    );
    expect(() => buildDevelopmentTaskPacketSource(sourceConfig, packetInput({ acceptance: [''] }))).toThrow(
      /packet acceptance/,
    );
  });
  test('binds packet workflow, work item selection, and risk flags', () => {
    expect(() =>
      buildDevelopmentTaskPacket(
        config,
        packetInput({
          work_item: { kind: 'feature', intent: 'implementation_new', project: '3mob', risk_flags: [], labels: [] },
        }),
      ),
    ).toThrow(/not bound/);
    expect(() =>
      buildDevelopmentTaskPacket(
        config,
        packetInput({
          work_item: { kind: 'bug', intent: 'bug_fix', project: '3mob', risk_flags: ['security'], labels: [] },
        }),
      ),
    ).toThrow(/risk flags are not bound/);
  });

  test('rejects sensitive packet text and unsafe owned paths', () => {
    expect(() => buildDevelopmentTaskPacket(config, packetInput({ out_of_scope: ['token:abc'] }))).toThrow(
      /sensitive material/,
    );
    expect(() => buildDevelopmentTaskPacket(config, packetInput({ out_of_scope: ['"password":"TOPSECRET"'] }))).toThrow(
      /sensitive material/,
    );
    expect(() =>
      buildDevelopmentTaskPacket(config, packetInput({ implementation_constraints: ['api_key=abc'] })),
    ).toThrow(/sensitive material/);
    for (const sensitive of [
      'x-amz-signature=abc123',
      'https://example.test/callback?access_token=abc123',
      'oauth_code=abc123',
      'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.signature123',
    ]) {
      expect(() => buildDevelopmentTaskPacket(config, packetInput({ out_of_scope: [sensitive] }))).toThrow(
        /sensitive material/,
      );
    }
    for (const ownedPath of [
      '../outside',
      'CON',
      'notes.',
      'drive:file',
      'wild*card',
      '.git/config',
      '.GIT/hooks/pre-commit',
      'CONIN$',
      'CONOUT$',
      'CLOCK$',
      'COM¹',
      'LPT³',
    ]) {
      expect(() => buildDevelopmentTaskPacket(config, packetInput({ owned_paths: [ownedPath] }))).toThrow(
        /repository-relative/,
      );
    }
  });

  test('requires digest-bound research artifact references', () => {
    expect(() =>
      buildDevelopmentTaskPacket(config, packetInput({ research_artifact_refs: ['ResearchResult/v1#research'] })),
    ).toThrow(/digest-bound/);
    expect(
      buildDevelopmentTaskPacket(
        config,
        packetInput({ research_artifact_refs: ['artifact://research/research/' + 'a'.repeat(64)] }),
      ).research_artifact_refs,
    ).toHaveLength(1);
    for (const id of ['Research', 'research~draft']) {
      expect(() =>
        buildDevelopmentTaskPacket(
          config,
          packetInput({ research_artifact_refs: ['artifact://research/' + id + '/' + 'a'.repeat(64)] }),
        ),
      ).toThrow(/digest-bound/);
    }
  });

  test('root and template bind research roles and stages to complete executable schemas', async () => {
    const template = parseRuntimeConfigYaml(
      (await readFile(path.join(packageRoot, 'templates/agent-runtime.config.template.v1.yaml'), 'utf8'))
        .replaceAll('{{BUNDLE}}', 'runtime')
        .replaceAll('{{REPOSITORY}}', 'example-repository')
        .replaceAll('{{PROJECT}}', 'example-project'),
    );
    for (const current of [config, template]) {
      for (const [id, name] of [
        ['ResearchResult/v1', 'research-result'],
        ['ResearchSynthesis/v1', 'research-synthesis'],
      ]) {
        const schema = JSON.parse(await readFile(path.join(packageRoot, 'schemas', name + '.v1.schema.json'), 'utf8'));
        expect([...current.artifact_contracts[id].required_fields].sort((a, b) => a.localeCompare(b))).toEqual(
          [...schema.required].sort((a, b) => a.localeCompare(b)),
        );
        const drifted = structuredClone(current);
        drifted.artifact_contracts[id].required_fields.pop();
        expect(() => validateRuntimeConfig(drifted)).toThrow(/implemented boundary/);
      }
      expect(current.artifact_contracts['ResearchArtifact/v1']).toBeUndefined();
      expect(current.artifact_contracts['ResearchBundle/v1']).toBeUndefined();
      for (const workflow of Object.values(current.workflows)) {
        for (const stage of workflow.stages) {
          if (stage.kind === 'research') expect(stage.produces).toEqual(['ResearchResult/v1']);
          if (stage.consumes.includes('ResearchResult/v1')) expect(stage.produces).toContain('ResearchSynthesis/v1');
        }
      }
      for (const retired of ['ResearchArtifact/v1', 'ResearchBundle/v1']) {
        const invalid = structuredClone(current);
        invalid.artifact_contracts[retired] = { schema: retired, required_fields: ['schema'] };
        expect(() => validateRuntimeConfig(invalid)).toThrow(/no executable boundary/);
      }
    }
  });
  test('contains only final v1 identities', () => {
    expect(Object.keys(contracts).every((id) => id.endsWith('/v1'))).toBe(true);
    expect(Object.entries(contracts).every(([id, contract]) => id === contract.schema)).toBe(true);
  });

  test('developer packet carries research, failures, tests, ownership, and delivery conditions', () => {
    const fields = new Set(contracts['DevelopmentTaskPacket/v1'].required_fields);
    for (const field of [
      'acceptance',
      'risk_flags',
      'owned_paths',
      'skill_refs',
      'documentation_refs',
      'code_evidence_refs',
      'research_artifact_refs',
      'diagnostics',
      'failed_approaches',
      'prohibited_patterns',
      'expected_tests',
      'delivery_conditions',
      'source_revision',
      'lease_expires_at',
    ])
      expect(fields.has(field)).toBe(true);
  });

  test('defines validator, tester, failure, and delivery handoffs', () => {
    for (const id of [
      'FailureArtifact/v1',
      'ValidationReceipt/v1',
      'TesterInstruction/v1',
      'TestReceipt/v1',
      'DeliveryInstruction/v1',
      'DeliveryReceipt/v1',
    ])
      expect(contracts[id]).toBeDefined();
  });

  test('issues immutable sanitized packets and prevents repeated failed approaches', () => {
    const config = loadRuntimeConfig(repositoryRoot);
    const packet = buildDevelopmentTaskPacket(
      config,
      packetInput({
        packet_id: 'packet-1',
        work_item_id: 'bug-42',
        objective: 'Fix the configured failure.',
        acceptance: ['The failure no longer occurs.'],
        in_scope: ['Shared root cause.'],
        out_of_scope: ['Unrelated refactors.'],
        owned_paths: ['agent-runtime-new/src/orchestration/mastra-boundary.ts'],
        affected_symbols: ['buildDevelopmentTaskPacket'],
        skill_refs: ['skill://gsd-debug'],
        code_evidence_refs: ['agent-runtime-new/src/orchestration/mastra-boundary.ts#buildDevelopmentTaskPacket'],
        diagnostics: [
          {
            error_class: 'AUTH_FAILURE',
            log_ref: 'artifact://sanitized-log',
            message:
              'token=supersecret password="top secret" Bearer hidden private_key=private-secret cookie=cookie-secret api_key=api-secret x-amz-signature=aws-packet-secret https://example.test/callback?access_token=query-packet-secret eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.packet-signature',
          },
        ],
        prohibited_patterns: ['Do not bypass authorization.'],
        security_constraints: ['Do not expose credentials.'],
        source_revision: 'git:abc123+dirty-test',
      }),
    );
    expect(Object.isFrozen(packet)).toBe(true);
    expect(Object.isFrozen(packet.diagnostics)).toBe(true);
    for (const secret of [
      'supersecret',
      'top secret',
      'hidden',
      'private-secret',
      'cookie-secret',
      'api-secret',
      'aws-packet-secret',
      'query-packet-secret',
      'packet-signature',
    ]) {
      expect(packet.diagnostics[0].message).not.toContain(secret);
    }
    const sanitizedDiagnostic = sanitizeDiagnostic(
      config,
      [
        'x-amz-signature=aws-signature-secret https://example.test/callback?access_token=query-secret',
        'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.signature-secret',
        '-----BEGIN PRIVATE KEY-----\nprivate-key-secret\n-----END PRIVATE KEY-----',
      ].join('\n'),
    );
    for (const secret of ['aws-signature-secret', 'query-secret', 'signature-secret', 'private-key-secret']) {
      expect(sanitizedDiagnostic).not.toContain(secret);
    }
    const nestedDiagnostic = sanitizeDiagnostic(
      config,
      JSON.stringify({
        outer: { client_secret: 'nested-secret', deeper: { authorization: 'nested-token' } },
        safe: 'visible',
      }),
    );
    expect(JSON.parse(nestedDiagnostic)).toEqual({
      outer: { client_secret: '[REDACTED]', deeper: { authorization: '[REDACTED]' } },
      safe: 'visible',
    });
    expect(nestedDiagnostic).not.toContain('nested-secret');
    expect(nestedDiagnostic).not.toContain('nested-token');
    const encodedNestedDiagnostic = sanitizeDiagnostic(
      config,
      JSON.stringify({
        outer: JSON.stringify({ token: 'encoded-nested-token', password: 'encoded-password' }),
        safe: 'visible',
      }),
    );
    expect(JSON.parse(encodedNestedDiagnostic)).toEqual({
      outer: JSON.stringify({ token: '[REDACTED]', password: '[REDACTED]' }),
      safe: 'visible',
    });
    expect(encodedNestedDiagnostic).not.toContain('encoded-nested-token');
    expect(encodedNestedDiagnostic).not.toContain('encoded-password');
    const logInjected = sanitizeDiagnostic(config, 'first-line\r\n\u001b[31msecond-line');
    expect(logInjected).not.toMatch(/\p{Cc}/u);
    expect(sanitizeDiagnostic(config, logInjected)).toBe(logInjected);
    const unsanitizedPacket = {
      ...packet,
      diagnostics: [{ ...packet.diagnostics[0], message: 'private_key=raw-secret' }],
    };
    delete unsanitizedPacket.digest;
    const forgedPacket = { ...unsanitizedPacket, digest: canonicalJsonDigest(unsanitizedPacket) };
    expect(() => validateDevelopmentStagePacket(config, forgedPacket, 'develop_fix')).toThrow(/not sanitized/);
    expect(() =>
      buildDevelopmentTaskPacket(
        config,
        packetInput({ diagnostics: [{ error_class: 'AUTH_FAILURE', log_ref: 'token=raw-secret', message: 'safe' }] }),
      ),
    ).toThrow(/artifact reference/);
    const failure = buildFailureArtifact(config, {
      failure_id: 'failure-1',
      packet_id: packet.packet_id,
      stage_id: 'develop_fix',
      agent_role: 'developer-orchestrator',
      attempt: packet.attempt,
      error_class: 'TEST_FAILURE',
      log_refs: ['artifact://sanitized-failure'],
      broken_acceptance: ['The failure no longer occurs.'],
      failed_approach_fingerprint: 'b'.repeat(64),
      retryable: true,
      next_route: 'synthesize_task',
      message: 'password=hunter2 secret: swordfish client_secret=oauth-value authorization=Bearer auth-value',
    });
    for (const secret of ['hunter2', 'swordfish', 'oauth-value', 'auth-value']) {
      expect(failure.sanitized_message).not.toContain(secret);
    }
    expect(() =>
      retryDevelopmentTaskPacket(
        config,
        packet,
        { ...failure, sanitized_message: 'private_key=raw-secret' },
        'packet-raw-failure',
        new Date(Date.now() + 120_000).toISOString(),
      ),
    ).toThrow(/not sanitized/);
    expect(() =>
      buildFailureArtifact(config, {
        ...failure,
        failure_id: 'bad-log',
        log_refs: ['local://password=raw'],
        message: 'safe',
      }),
    ).toThrow(/sensitive material|artifact reference/);
    const retry = retryDevelopmentTaskPacket(
      config,
      packet,
      failure,
      'packet-2',
      new Date(Date.now() + 120_000).toISOString(),
    );
    expect(retry.packet_id).toBe('packet-2');
    expect(retry.attempt).toBe(2);
    expect(retry.failed_approaches).toContain('b'.repeat(64));
    expect(() =>
      retryDevelopmentTaskPacket(
        config,
        packet,
        { ...failure, stage_id: 'not-a-stage' },
        'packet-stage-mismatch',
        new Date(Date.now() + 120_000).toISOString(),
      ),
    ).toThrow(/failure stage/);
    expect(() =>
      retryDevelopmentTaskPacket(
        config,
        packet,
        { ...failure, agent_role: 'tester' },
        'packet-role-mismatch',
        new Date(Date.now() + 120_000).toISOString(),
      ),
    ).toThrow(/failed stage/);
    const gatedFailure = buildFailureArtifact(config, {
      ...failure,
      failure_id: 'failure-gated-role',
      stage_id: 'validate_parallel',
      agent_role: 'security-data-validator',
      next_route: 'develop_change',
      message: 'safe gated-role failure',
    });
    expect(() =>
      retryDevelopmentTaskPacket(
        config,
        packet,
        gatedFailure,
        'packet-gated-role',
        new Date(Date.now() + 120_000).toISOString(),
      ),
    ).toThrow(/active failed stage/);
    expect(() =>
      retryDevelopmentTaskPacket(
        config,
        packet,
        { ...failure, next_route: 'not-a-stage' },
        'packet-route-mismatch',
        new Date(Date.now() + 120_000).toISOString(),
      ),
    ).toThrow(/previous workflow/);
    expect(() =>
      retryDevelopmentTaskPacket(
        config,
        packet,
        { ...failure, next_route: 'prepare_delivery' },
        'packet-route-bypass',
        new Date(Date.now() + 120_000).toISOString(),
      ),
    ).toThrow(/valid recovery route/);
    expect(() =>
      retryDevelopmentTaskPacket(
        config,
        { ...packet, acceptance: ['Tampered acceptance.'] },
        failure,
        'packet-tampered',
        new Date(Date.now() + 120_000).toISOString(),
      ),
    ).toThrow(/packet binding/);
    const repeated = buildFailureArtifact(config, {
      ...failure,
      failure_id: 'failure-2',
      packet_id: retry.packet_id,
      attempt: retry.attempt,
      message: failure.sanitized_message,
    });
    expect(() =>
      retryDevelopmentTaskPacket(config, retry, repeated, 'packet-3', new Date(Date.now() + 180_000).toISOString()),
    ).toThrow(/already attempted/);
  });

  test('task execution packet does not invent a research artifact', () => {
    const config = loadRuntimeConfig(repositoryRoot);
    const packet = buildDevelopmentTaskPacket(
      config,
      packetInput({
        packet_id: 'packet-task-1',
        work_item_id: 'task-7',
        workflow_id: 'task_execution',
        objective: 'Execute the bounded task.',
        acceptance: ['The requested setting is enabled.'],
        in_scope: ['settings.json'],
        owned_paths: ['settings.json'],
        documentation_refs: ['agent-runtime-new/TESTING.md#Artifact contract tests'],
        code_evidence_refs: ['agent-runtime.config.v1.yaml#task_execution'],
        expected_tests: ['bun test settings.test.mjs'],
        source_revision: 'isolated:task-7',
      }),
    );
    expect(packet.research_artifact_refs).toEqual([]);
    expect(packet.workflow_id).toBe('task_execution');
  });

  test('binds every develop stage to its immutable task packet before dispatch', async () => {
    const config = loadRuntimeConfig(repositoryRoot);
    for (const [index, lease] of ['not-a-time', '2026-02-30T00:00:00Z', '2023-02-29T00:00:00Z'].entries()) {
      expect(() =>
        buildDevelopmentTaskPacket(
          config,
          packetInput({ packet_id: 'packet-malformed-lease-' + index, lease_expires_at: lease }),
        ),
      ).toThrow(/lease|timestamp/i);
    }
    for (const workflowId of ['implementation_new', 'implementation_change', 'bug_fix', 'task_execution']) {
      const packet = buildDevelopmentTaskPacket(
        config,
        packetInput({ packet_id: 'packet-' + workflowId, workflow_id: workflowId }),
      );
      const develop = config.workflows[workflowId].stages.find((stage) => stage.kind === 'develop');
      expect(develop).toBeDefined();
      expect(validateDevelopmentStagePacket(config, packet, develop.id)).toBe(packet);
      expect(() => validateDevelopmentStagePacket(config, { ...packet, unexpected: true }, develop.id)).toThrow(
        /packet fields/,
      );
      expect(() => validateDevelopmentStagePacket(config, { ...packet, attempt: 2 }, develop.id)).toThrow(
        /packet binding/,
      );
    }
    const expiringPacket = buildDevelopmentTaskPacket(
      config,
      packetInput({
        packet_id: 'packet-expiring-lease',
        workflow_id: 'implementation_new',
        lease_expires_at: new Date(Date.now() + 20).toISOString(),
      }),
    );
    const expiringDevelop = config.workflows.implementation_new.stages.find((stage) => stage.kind === 'develop');
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(() => validateDevelopmentStagePacket(config, expiringPacket, expiringDevelop.id)).toThrow(/ownership lease/);
  });

  test('delivery fails closed until configured validators and tester artifacts pass', () => {
    const loadRuntimeConfig = loadRuntimeConfigSource;
    const config = loadRuntimeConfig(repositoryRoot);
    const buildDeliveryReceipt = buildDeliveryReceiptSource;
    const buildDevelopmentTaskPacket = buildDevelopmentTaskPacketSource;
    const buildImplementationResult = buildImplementationResultSource;
    const buildTesterInstruction = buildTesterInstructionSource;
    const prepareDeliveryInstruction = prepareDeliveryInstructionSource;
    const validateDeliveryReceipt = validateDeliveryReceiptSource;
    const validateImplementationResult = validateImplementationResultSource;
    const fingerprint = 'c'.repeat(64);
    const evidenceAuthority = createDeliveryEvidenceAuthority(
      createRuntimeKernelHost({
        repositoryRoot,
        repositoryId: config.repository.repository_id,
        projectIds: [config.projects[0].project_id],
        integrationsDigest: canonicalJsonDigest(config.integrations),
        resolveIdentity: () => null,
        verifyApproval: () => null,
        runtimeRevision: () => ({ sourceRevision: 'test-source', currentRevision: 1 }),
        casWriter: () => undefined,
      }),
    );
    const packetId = 'packet-delivery';
    const packet = buildDevelopmentTaskPacket(config, packetInput({ packet_id: packetId, risk_flags: [] }));
    const implementationResult = buildImplementationResult(packet, {
      result_id: 'implementation-result-1',
      packet_id: packetId,
      source_revision: packet.source_revision,
      implementation_fingerprint: fingerprint,
      changed_paths: ['agent-runtime.config.v1.yaml', 'agent-runtime-new/src/orchestration/mastra-boundary.ts'],
      test_refs: ['bun test tests/runtime-config-yaml.test.mjs'],
    });
    const testerInstruction = buildTesterInstruction(packet, 'test-instruction-1', fingerprint);
    const validators = ['correctness-validator', 'requirements-validator', 'security-data-validator'].map(
      (role, index) =>
        evidenceAuthority.issueValidationReceipt({
          receipt_id: 'validation-' + index,
          packet_id: packetId,
          packet_digest: packet.digest,
          implementation_fingerprint: fingerprint,
          validator_role: role,
          verdict: 'pass',
          findings: [],
          evidence_refs: ['artifact://validation-' + index],
        }),
    );
    const testReceipt = evidenceAuthority.issueTestReceipt({
      receipt_id: 'test-receipt-1',
      instruction_id: testerInstruction.instruction_id,
      packet_id: packetId,
      packet_digest: packet.digest,
      implementation_fingerprint: fingerprint,
      status: 'pass',
      evidence_refs: ['artifact://test-output'],
    });
    const input = {
      implementation_result: implementationResult,
      instruction_id: 'delivery-1',
      packet_id: packetId,
      packet_digest: packet.digest,
      implementation_fingerprint: fingerprint,
      created: ['agent-runtime.config.v1.yaml'],
      modified: ['agent-runtime-new/src/orchestration/mastra-boundary.ts'],
      deploy: ['agent-runtime.config.v1.yaml'],
      do_not_deploy: ['agent-runtime-new/TESTING.md'],
      destination: 'repository-root',
      order: ['agent-runtime.config.v1.yaml'],
      post_deployment_checks: ['Load AgentRuntimeConfig/v1.'],
    };
    const issueValidation = (receipt, overrides = {}) => {
      const { schema: _schema, ...receiptInput } = receipt;
      return evidenceAuthority.issueValidationReceipt({ ...receiptInput, ...overrides });
    };
    const issueTest = (receipt, overrides = {}) => {
      const { schema: _schema, ...receiptInput } = receipt;
      return evidenceAuthority.issueTestReceipt({ ...receiptInput, ...overrides });
    };
    expect(() =>
      prepareDeliveryInstruction(
        config,
        packet,
        input,
        validators.slice(0, 1),
        testerInstruction,
        testReceipt,
        evidenceAuthority,
      ),
    ).toThrow(/validator gate/);
    expect(() =>
      prepareDeliveryInstruction(
        config,
        packet,
        input,
        validators.slice(0, 2),
        testerInstruction,
        issueTest(testReceipt, { status: 'fail' }),
        evidenceAuthority,
      ),
    ).toThrow(/test gate/);
    expect(() =>
      prepareDeliveryInstruction(
        config,
        packet,
        input,
        validators.slice(0, 2),
        testerInstruction,
        issueTest(testReceipt, { instruction_id: 'test-instruction-other' }),
        evidenceAuthority,
      ),
    ).toThrow(/test receipt instruction binding/);
    expect(() =>
      prepareDeliveryInstruction(
        config,
        packet,
        input,
        validators.slice(0, 2).map((receipt) => issueValidation(receipt, { evidence_refs: [] })),
        testerInstruction,
        testReceipt,
        evidenceAuthority,
      ),
    ).toThrow(/evidence/);
    expect(() =>
      prepareDeliveryInstruction(
        config,
        packet,
        input,
        validators.slice(0, 2),
        testerInstruction,
        issueTest(testReceipt, { evidence_refs: [] }),
        evidenceAuthority,
      ),
    ).toThrow(/evidence/);
    expect(() =>
      prepareDeliveryInstruction(
        config,
        packet,
        input,
        validators.map((receipt) => ({ ...receipt })),
        testerInstruction,
        testReceipt,
        evidenceAuthority,
      ),
    ).toThrow(/issuer/);
    expect(() =>
      prepareDeliveryInstruction(
        config,
        packet,
        { ...input, do_not_deploy: ['agent-runtime.config.v1.yaml'] },
        validators,
        testerInstruction,
        testReceipt,
        evidenceAuthority,
      ),
    ).toThrow(/contradictory/);
    expect(() =>
      prepareDeliveryInstruction(
        config,
        packet,
        { ...input, created: ['agent-runtime.config.v1.yaml'], modified: ['agent-runtime.config.v1.yaml'] },
        validators,
        testerInstruction,
        testReceipt,
        evidenceAuthority,
      ),
    ).toThrow(/created and modified/);
    expect(() =>
      prepareDeliveryInstruction(
        config,
        packet,
        { ...input, destination: '../../outside' },
        validators,
        testerInstruction,
        testReceipt,
        evidenceAuthority,
      ),
    ).toThrow(/destination/);
    expect(() =>
      prepareDeliveryInstruction(
        config,
        packet,
        {
          ...input,
          created: ['agent-runtime-new/TESTING.md'],
          modified: ['agent-runtime.config.v1.yaml', 'agent-runtime-new/src/orchestration/mastra-boundary.ts'],
          deploy: ['agent-runtime-new/TESTING.md'],
          do_not_deploy: [],
          order: ['agent-runtime-new/TESTING.md'],
        },
        validators,
        testerInstruction,
        testReceipt,
        evidenceAuthority,
      ),
    ).toThrow(/not covered/);
    const instruction = prepareDeliveryInstruction(
      config,
      packet,
      input,
      validators.slice(0, 2),
      testerInstruction,
      testReceipt,
      evidenceAuthority,
    );
    expect(instruction.schema).toBe('DeliveryInstruction/v1');
    expect(Object.isFrozen(instruction)).toBe(true);
    expect(instruction.digest).toMatch(/^[a-f0-9]{64}$/);
    expect(() => validateImplementationResult(packet, { ...implementationResult, digest: '0'.repeat(64) })).toThrow(
      /digest/,
    );
    const deliveryReceipt = buildDeliveryReceipt(config, instruction, {
      receipt_id: 'delivery-receipt-1',
      status: 'approved',
      evidence_refs: ['artifact://delivery-result'],
    });
    expect(deliveryReceipt.instruction_digest).toBe(instruction.digest);
    expect(deliveryReceipt.implementation_fingerprint).toBe(fingerprint);
    expect(Object.isFrozen(deliveryReceipt)).toBe(true);
    expect(() =>
      validateDeliveryReceipt(config, { ...deliveryReceipt, instruction_digest: '0'.repeat(64) }, instruction),
    ).toThrow(/instruction binding/);
    const securePacketId = 'packet-delivery-security';
    const securePacket = buildDevelopmentTaskPacket(
      config,
      packetInput({ packet_id: securePacketId, risk_flags: ['security'] }),
    );
    const secureImplementationResult = buildImplementationResult(securePacket, {
      result_id: 'implementation-result-security',
      packet_id: securePacketId,
      source_revision: securePacket.source_revision,
      implementation_fingerprint: fingerprint,
      changed_paths: ['agent-runtime.config.v1.yaml', 'agent-runtime-new/src/orchestration/mastra-boundary.ts'],
      test_refs: ['bun test tests/runtime-config-yaml.test.mjs'],
    });
    const secureInput = {
      ...input,
      packet_id: securePacketId,
      packet_digest: securePacket.digest,
      implementation_result: secureImplementationResult,
    };
    const secureTesterInstruction = buildTesterInstruction(securePacket, 'test-instruction-security', fingerprint);
    const secureReceipts = validators.map((receipt) =>
      issueValidation(receipt, { packet_id: securePacketId, packet_digest: securePacket.digest }),
    );
    const secureTestReceipt = issueTest(testReceipt, {
      instruction_id: secureTesterInstruction.instruction_id,
      packet_id: securePacketId,
      packet_digest: securePacket.digest,
    });
    expect(() =>
      prepareDeliveryInstruction(
        config,
        securePacket,
        secureInput,
        secureReceipts.slice(0, 2),
        secureTesterInstruction,
        secureTestReceipt,
        evidenceAuthority,
      ),
    ).toThrow(/security-data-validator/);
    expect(
      prepareDeliveryInstruction(
        config,
        securePacket,
        secureInput,
        secureReceipts,
        secureTesterInstruction,
        secureTestReceipt,
        evidenceAuthority,
      ).schema,
    ).toBe('DeliveryInstruction/v1');
  });
});

const runningUnderVitest =
  process.env.VITEST === 'true' || process.argv.some((argument) => argument.includes('vitest'));
test.skipIf(runningUnderVitest && process.env.AGENT_RUNTIME_SKIP_PACKAGE_TEST === '1')(
  'package archive is the complete portable vida-agent bundle with a clean production surface',
  async () => {
    const archiveRoot = await mkdtemp(path.join(tmpdir(), 'runtime-pack-v1-'));
    temporaryRoots.push(archiveRoot);
    const isolatedRepositoryRoot = path.join(archiveRoot, 'repository');
    const isolatedPackageRoot = path.join(isolatedRepositoryRoot, 'vida-agent');
    await mkdir(isolatedRepositoryRoot, { recursive: true });
    await mkdir(path.join(isolatedRepositoryRoot, 'docs/creatio'), { recursive: true });
    await mkdir(path.join(isolatedRepositoryRoot, 'docs/agent-instructions'), { recursive: true });
    await writeFile(path.join(isolatedRepositoryRoot, 'docs/agent-instructions/index.md'), 'fixture instructions\n');
    await Promise.all([
      mkdir(path.join(isolatedRepositoryRoot, '.git')),
      mkdir(path.join(isolatedRepositoryRoot, 'project/refactoring'), { recursive: true }),
      cp(path.join(repositoryRoot, 'AGENTS.md'), path.join(isolatedRepositoryRoot, 'AGENTS.md')),
      cp(path.join(repositoryRoot, 'AGENT.sidecar.md'), path.join(isolatedRepositoryRoot, 'AGENT.sidecar.md')),
      cp(
        path.join(repositoryRoot, 'docs/agent-instructions/documentation-policy.v1.json'),
        path.join(isolatedRepositoryRoot, 'docs/agent-instructions/documentation-policy.v1.json'),
      ),
      mkdir(path.join(isolatedRepositoryRoot, 'docs/tenants/crmbx/internal/projects/3mob'), { recursive: true }).then(
        () =>
          cp(
            path.join(repositoryRoot, 'docs/tenants/crmbx/internal/projects/3mob/documentation-policy.v1.json'),
            path.join(isolatedRepositoryRoot, 'docs/tenants/crmbx/internal/projects/3mob/documentation-policy.v1.json'),
          ),
      ),
      writeFile(
        path.join(isolatedRepositoryRoot, 'docs/documentation-policy.v1.json'),
        `${JSON.stringify(
          {
            $schema: 'https://creatio-sample.invalid/schemas/documentation-policy.v1.schema.json',
            schema: 'DocumentationPolicy/v1',
            policy_id: 'portable-package-fixture',
            project_id: 'portable-fixture',
            source_path: 'docs/documentation-policy.v1.json',
            owner: 'runtime-test-fixture',
            required: false,
            canonical_roots: ['docs'],
            map_paths: ['docs/creatio/map.md'],
            excluded_roots: [],
            changelog_required: false,
            changelog_path: null,
            relations: ['documents'],
            updated_at: '2026-09-25T00:00:00.000Z',
          },
          null,
          2,
        )}\n`,
      ),
      writeFile(path.join(isolatedRepositoryRoot, 'docs/creatio/map.md'), 'fixture map\n'),
    ]);
    for (const relative of [
      'docs/tenants/crmbx/wiki/Projects/3Mob/Operations.md',
      'docs/tenants/crmbx/wiki/Projects/3Mob/Requirements/Topics.md',
    ]) {
      const target = path.join(isolatedRepositoryRoot, relative);
      await mkdir(path.dirname(target), { recursive: true });
      await cp(path.join(repositoryRoot, relative), target);
    }
    await cp(packageRoot, isolatedPackageRoot, {
      recursive: true,
      filter(source) {
        const relative = path.relative(packageRoot, source).replaceAll('\\', '/');
        return !['node_modules', 'dist', 'coverage'].includes(relative.split('/')[0]);
      },
    });
    const portableAuthorityText = portableRuntimeConfigText(authorityText);
    await writeFile(path.join(isolatedRepositoryRoot, 'agent-runtime.config.v1.yaml'), portableAuthorityText);
    const isolatedConfig = loadRuntimeConfig(isolatedRepositoryRoot);
    expect(path.relative(isolatedRepositoryRoot, isolatedPackageRoot)).toBe(isolatedConfig.runtime.bundle);
    await expect(readFile(path.join(isolatedRepositoryRoot, 'agent-runtime', 'AGENTS.md'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
    const hostileEnvironment = {
      ...process.env,
      AGENT_RUNTIME_TEST_REPOSITORY_ROOT: path.join(archiveRoot, 'hostile-repository'),
    };
    const isolatedEnvironment = { ...hostileEnvironment };
    delete isolatedEnvironment.AGENT_RUNTIME_TEST_REPOSITORY_ROOT;
    expect(isolatedEnvironment.AGENT_RUNTIME_TEST_REPOSITORY_ROOT).toBeUndefined();
    const isolatedTestEnvironment = {
      ...isolatedEnvironment,
      AGENT_RUNTIME_TEST_REPOSITORY_ROOT: isolatedRepositoryRoot,
    };
    expect(isolatedTestEnvironment.AGENT_RUNTIME_TEST_REPOSITORY_ROOT).toBe(isolatedRepositoryRoot);
    const readIsolatedFingerprint = async (label) => {
      const fingerprintResult = await runProcess({
        cmd: ['bun', 'tooling/fingerprint.mjs'],
        cwd: isolatedPackageRoot,
        stdout: 'pipe',
        stderr: 'pipe',
      });
      expect(fingerprintResult.exitCode, subprocessFailure(label, fingerprintResult)).toBe(0);
      const fingerprint = JSON.parse(fingerprintResult.stdout.toString());
      expect(fingerprint.schema).toBe('CandidateFingerprint/v1');
      expect(fingerprint.algorithm).toContain('ScopeIntegrity.capture');
      expect(fingerprint.files.length).toBeGreaterThan(0);
      expect(fingerprint.files.every((entry) => Number.isInteger(entry.mode) && Number.isInteger(entry.bytes))).toBe(
        true,
      );
      expect(fingerprint.fingerprint).toMatch(/^[a-f0-9]{64}$/);
      return fingerprint.fingerprint;
    };
    const isolatedInstall = await runProcess({
      cmd: ['bun', 'install', '--frozen-lockfile', '--ignore-scripts'],
      cwd: isolatedPackageRoot,
      stdout: 'pipe',
      stderr: 'pipe',
      env: isolatedEnvironment,
    });
    expect(isolatedInstall.exitCode, subprocessFailure('isolated frozen install', isolatedInstall)).toBe(0);
    const generatedArchivePath = path.join(isolatedPackageRoot, 'stale.TGZ');
    await writeFile(generatedArchivePath, 'generated archive must not enter a source fingerprint\n');
    const archiveFingerprintResult = await runProcess({
      cmd: ['bun', 'tooling/fingerprint.mjs'],
      cwd: isolatedPackageRoot,
      stdout: 'pipe',
      stderr: 'pipe',
      env: isolatedEnvironment,
    });
    expect(archiveFingerprintResult.exitCode).not.toBe(0);
    expect(archiveFingerprintResult.stderr.toString()).toContain('fingerprint refuses generated package archive');
    await rm(generatedArchivePath, { force: true });
    let isolatedDistDigestBefore;
    const isolatedFingerprintBefore = await readIsolatedFingerprint('isolated fingerprint before package tests');
    const nestedExcludedDirectoryProbe = path.join(isolatedPackageRoot, 'src', 'dist', 'fingerprint-scope-probe.txt');
    await mkdir(path.dirname(nestedExcludedDirectoryProbe), { recursive: true });
    await writeFile(nestedExcludedDirectoryProbe, 'nested source must remain fingerprinted\n');
    expect(await readIsolatedFingerprint('nested excluded-directory probe')).not.toBe(isolatedFingerprintBefore);
    await rm(nestedExcludedDirectoryProbe, { force: true });
    expect(await readIsolatedFingerprint('nested excluded-directory probe cleanup')).toBe(isolatedFingerprintBefore);
    for (const [label, cmd] of [
      ['isolated build', ['bun', 'run', 'build']],
      [
        'isolated tests',
        [
          'bun',
          'test',
          'tests/runtime-config-yaml.test.mjs',
          'tests/runtime-config-repair-boundary.test.mjs',
          'tests/smoke.test.mjs',
          'tests/property.test.mjs',
          'tests/research-decision.test.mjs',
          'tests/bun/host-state.test.mjs',
          '--test-name-pattern',
          '^(?!package archive).*$',
        ],
      ],
    ]) {
      const result = await runProcess({
        cmd,
        cwd: isolatedPackageRoot,
        stdout: 'pipe',
        stderr: 'pipe',
        env: label === 'isolated tests' ? isolatedTestEnvironment : isolatedEnvironment,
      });
      expect(result.exitCode, subprocessFailure(label, result)).toBe(0);
      if (label === 'isolated build') {
        isolatedDistDigestBefore = await digestRegularTree(isolatedPackageRoot, 'dist');
      }
    }
    expect(isolatedDistDigestBefore).toMatch(/^[a-f0-9]{64}$/);
    const isolatedDistDigestAfterTests = await digestRegularTree(isolatedPackageRoot, 'dist');
    expect(isolatedDistDigestAfterTests).toBe(isolatedDistDigestBefore);
    const isolatedFingerprintAfter = await readIsolatedFingerprint('isolated fingerprint after package tests');
    expect(isolatedFingerprintAfter).toBe(isolatedFingerprintBefore);
    const node = spawnSync('node', ['-p', 'process.execPath'], { encoding: 'utf8', windowsHide: true }).stdout.trim();
    const processResult = await runProcess({
      cmd: [node, findNpmCli(node), 'pack', '--ignore-scripts', '--pack-destination', archiveRoot],
      cwd: isolatedPackageRoot,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    expect(processResult.exitCode, subprocessFailure('package archive', processResult)).toBe(0);
    const archiveName = (await readdir(archiveRoot)).find((name) => name.endsWith('.tgz'));
    expect(archiveName).toBeDefined();
    const archivePath = path.join(archiveRoot, archiveName);
    const archiveDigestBefore = sha256Bytes(await readFile(archivePath));
    expect(archiveDigestBefore).toMatch(/^[a-f0-9]{64}$/);
    const extractRoot = path.join(archiveRoot, 'extract');
    await mkdir(extractRoot, { recursive: true });
    const extract = await runProcess({
      cmd: ['tar', '-xzf', path.join(archiveRoot, archiveName), '-C', extractRoot],
      stdout: 'pipe',
      stderr: 'pipe',
    });
    expect(extract.exitCode, subprocessFailure('package extraction', extract)).toBe(0);
    const archiveDigestAfter = sha256Bytes(await readFile(archivePath));
    expect(archiveDigestAfter).toBe(archiveDigestBefore);
    const packedRoot = path.join(extractRoot, 'package');
    const packedManifest = JSON.parse(await readFile(path.join(packedRoot, 'package.json'), 'utf8'));
    expect(packedManifest).toEqual(JSON.parse(await readFile(path.join(isolatedPackageRoot, 'package.json'), 'utf8')));
    const packagePatterns = packedManifest.files.map((entry) => new Bun.Glob(entry));
    const isDeclaredPackageFile = (entry) =>
      entry === 'package.json' || packagePatterns.some((pattern) => pattern.match(entry));
    for (const directory of [
      'bin',
      'dist',
      'docs',
      'instructions',
      'schemas',
      'src',
      'templates',
      'tests',
      'tooling',
    ]) {
      const packagePatterns = packedManifest.files
        .filter((entry) => entry.startsWith(`${directory}/`) || entry.startsWith(`!${directory}/`))
        .map((entry) => {
          const excluded = entry.startsWith('!');
          return {
            excluded,
            pattern: new Bun.Glob(entry.slice(directory.length + (excluded ? 2 : 1))),
          };
        });
      const isDeclaredTreeFile = (entry) =>
        packagePatterns.some(({ excluded, pattern }) => !excluded && pattern.match(entry)) &&
        !packagePatterns.some(({ excluded, pattern }) => excluded && pattern.match(entry));
      expect(await digestRegularTree(packedRoot, directory), directory).toBe(
        await digestRegularTree(isolatedPackageRoot, directory, isDeclaredTreeFile),
      );
    }
    const packedFiles = [];
    for (const file of await readdir(packedRoot, { recursive: true })) {
      const relative = String(file).replaceAll('\\', '/');
      const stats = await lstat(path.join(packedRoot, relative));
      expect(stats.isSymbolicLink(), relative).toBe(false);
      if (stats.isDirectory()) continue;
      expect(stats.isFile(), relative).toBe(true);
      packedFiles.push(relative);
      expect(isDeclaredPackageFile(relative), relative).toBe(true);
    }
    for (const entry of Object.values(packedManifest.bin))
      expect(packedFiles, entry).toContain(entry.replace(/^\.\//, ''));
    for (const entry of Object.values(packedManifest.exports).flatMap((value) => Object.values(value)))
      expect(packedFiles, entry).toContain(entry.replace(/^\.\//, ''));
    expect(Object.keys(packedManifest.exports)).toEqual(['.', './trusted-host']);
    expect(packedManifest.exports['./trusted-host']).toEqual({
      types: './dist/src/trusted-host.d.ts',
      'agent-runtime-host': './dist/src/trusted-host.js',
    });
    expect(packedManifest.differential).toBeUndefined();
    for (const required of [
      '.bun-version',
      'dist/portable/bun.lock',
      'bunfig.toml',
      'package.json',
      'README.md',
      'TESTING.md',
      'bin/init.mjs',
      'bin/install.mjs',
      'dist/src/index.js',
      'dist/src/runtime.js',
      'dist/src/trusted-host.js',
      'dist/schemas/persistent-session-handoff-state.v1.schema.json',
      'docs/installation.md',
      'instructions/development-lifecycle.md',
      'instructions/agent-allocation.md',
      'instructions/request-clarification.md',
      'instructions/adaptive-reporting.md',
      'instructions/requirement-routing.md',
      'instructions/knowledge-graph.md',
      'schemas/agent-runtime-config.v1.schema.json',
      'schemas/persistent-session-handoff-state.v1.schema.json',
      'src/index.ts',
      'src/orchestration/persistent-session-handoff.ts',
      'src/orchestration/session-handoff.ts',
      'bin/reconcile-artifacts.mjs',
      'bin/forward-review-proof.mjs',
      'bin/reconcile-readonly-dispatch.mjs',
      'bin/read-only-dispatch-repair.mjs',
      'bin/runtime-code-rebind.mjs',
      'bin/repair-research-records.mjs',
      'templates/AGENTS.template.md',
      'templates/AGENT.sidecar.template.md',
      'templates/agent-runtime.config.template.v1.yaml',
      'tests/runtime-config-yaml.test.mjs',
      'tests/bun/persistent-session-handoff.test.mjs',
      'tooling/build-package.mjs',
    ])
      expect(packedFiles, required).toContain(required);
    for (const repositoryOnly of ['src/reconciliation/current-v1-engine.ts', 'src/reconciliation/manifest.ts'])
      expect(packedFiles, repositoryOnly).not.toContain(repositoryOnly);
    const packedAgentTemplate = await readFile(path.join(packedRoot, 'templates/AGENTS.template.md'), 'utf8');
    expect(packedAgentTemplate).toContain('vida-agent instructions --path NAME');
    const declaredInstructions = packedAgentTemplate.match(/where NAME is ([\s\S]*?); read the returned file/);
    expect(declaredInstructions).not.toBeNull();
    const instructionReferences = new Set(declaredInstructions[1].split(/[,\s]+/).filter((name) => name !== 'or'));
    for (const name of [
      'development-lifecycle',
      'agent-allocation',
      'request-clarification',
      'adaptive-reporting',
      'requirement-routing',
      'knowledge-graph',
    ]) {
      const relative = `instructions/${name}.md`;
      expect(instructionReferences.has(name)).toBe(true);
      expect((await readFile(path.join(packedRoot, relative), 'utf8')).trim().length).toBeGreaterThan(0);
    }
    for (const file of packedFiles.filter((name) => /^(?:docs|instructions|templates)\//.test(name))) {
      const content = await readFile(path.join(packedRoot, file), 'utf8');
      expect(content, file).not.toMatch(
        /\b(?:crmbx|3mob|creatio-sample|agentsustem)\b|C:[/\\]|\/(?:Users|home)\/|agent-runtime\//i,
      );
    }
    for (const file of packedFiles.filter((name) => /^(?:schemas|dist\/schemas)\//.test(name))) {
      const content = await readFile(path.join(packedRoot, file), 'utf8');
      expect(content, file).not.toContain('creatio-sample.invalid');
    }
    expect(packedFiles.some((file) => file.startsWith('node_modules/'))).toBe(false);
    const retiredArchivePaths = [
      'schemas/reconciliation-manifest.v1.schema.json',
      'dist/schemas/reconciliation-manifest.v1.schema.json',
      'schemas/reconciliation-historical-disposition.v1.schema.json',
      'dist/schemas/reconciliation-historical-disposition.v1.schema.json',
      'tests/bun/reconciliation-planner.test.mjs',
      'tests/bun/coordination-ledger-converter.test.mjs',
      'tests/bun/historical-disposition.test.mjs',
      'dist/src/runtime-kernel.js',
      'dist/src/governance/edictum-boundary.js',
    ];
    for (const retiredPath of retiredArchivePaths) expect(packedFiles, retiredPath).not.toContain(retiredPath);
    const packedSchema = await readFile(path.join(packedRoot, 'schemas/agent-runtime-config.v1.schema.json'));
    const packedDistSchema = await readFile(path.join(packedRoot, 'dist/schemas/agent-runtime-config.v1.schema.json'));
    expect(packedSchema).toEqual(packedDistSchema);
    for (const schema of ['work-state', 'coordination-ledger', 'runtime-config-repair-inspection']) {
      expect(await readFile(path.join(packedRoot, `dist/schemas/${schema}.v1.schema.json`))).toEqual(
        await readFile(path.join(isolatedPackageRoot, `schemas/${schema}.v1.schema.json`)),
      );
    }
    expect(await readFile(path.join(packedRoot, 'dist/schemas/runtime-initialization.v1.schema.json'))).toEqual(
      await readFile(path.join(isolatedPackageRoot, 'schemas/runtime-initialization.v1.schema.json')),
    );
    expect(sha256Bytes(packedSchema)).toBe(
      sha256Bytes(await readFile(path.join(isolatedPackageRoot, 'schemas/agent-runtime-config.v1.schema.json'))),
    );
    expect(packedFiles.filter((file) => /(?:^|\/)legacy\//i.test(file))).toEqual([]);
    expect(
      packedFiles.some((file) => /config\/(?:agent-profiles|authorization|governance|orchestration)/i.test(file)),
    ).toBe(false);
    const shippedTestIssuerPattern =
      /\b(?:createTestRuntimeKernelHost|createTestWorkflowHostCapability|createTestOperationReservationStore|createTestGovernanceGuard|createCompositionRootGovernanceGuard|issueTestTrustedPathProfileOverride|createTestTrustedHostLauncherCapability|createRuntimeKernelHostProofForCompositionRoot|createWorkflowHostAuthenticationProofForCompositionRoot)\b/;
    const packedReadme = await readFile(path.join(packedRoot, 'README.md'), 'utf8');
    // README is a consumer-facing package artifact; verify its package-scope claims separately from code scans.
    expect(packedReadme).toContain('The `vida-agent/` bundle contains runtime source and output');
    expect(packedReadme).toContain('Source and passing tests provide Code/Static evidence;');
    expect(packedReadme).not.toMatch(shippedTestIssuerPattern);
    expect(packedReadme).not.toMatch(/\b(?:password|passphrase|api[_-]?key|client[_-]?secret|private[_-]?key)\s*[:=]/i);
    for (const file of packedFiles.filter((name) => /^dist\/.*(?:\.js|\.d\.ts)$/i.test(name))) {
      const text = await readFile(path.join(packedRoot, file), 'utf8');
      expect(text, file).not.toMatch(shippedTestIssuerPattern);
    }
    for (const file of packedFiles.filter((name) => /^(?:dist|schemas)\/.*(?:\.js|\.d\.ts|\.json)$/i.test(name))) {
      if (file === 'package.json' || file === 'README.md') continue;
      const text = await readFile(path.join(packedRoot, file), 'utf8');
      expect(text, file).not.toMatch(obsoletePackSurface);
    }
    const packedLockfile = await readFile(path.join(packedRoot, 'dist/portable/bun.lock'));
    expect(packedFiles).toContain('bun.lock');
    expect(await readFile(path.join(packedRoot, 'bun.lock'))).toEqual(packedLockfile);
    const install = await runProcess({
      cmd: ['bun', 'install', '--frozen-lockfile', '--production', '--ignore-scripts'],
      cwd: packedRoot,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    expect(install.exitCode, subprocessFailure('packed production install', install)).toBe(0);
    expect(await readFile(path.join(packedRoot, 'bun.lock'))).toEqual(packedLockfile);
    const packedExports = await runProcess({
      cmd: [
        'bun',
        '--input-type=module',
        '-e',
        `const root = await import('vida-agent');
if (typeof root.createRuntimeKernelHost !== 'function' || typeof root.createFileWorkflowHostCapability !== 'function') process.exit(15);
if ('createTestWorkflowHostCapability' in root || 'createRuntimeKernelHostProofForCompositionRoot' in root || 'RuntimeKernelHostBindings' in root) process.exit(16);
if ('createLegacyRuntimeCompat' in root || 'invokeLegacyRuntimeExport' in root) process.exit(11);
if ('HostStateStore' in root || 'HostStateError' in root) process.exit(24);
for (const specifier of ['vida-agent/trusted-host', 'vida-agent/host-state', 'vida-agent/dist/src/host-state.js', 'vida-agent/runtime-kernel', 'vida-agent/governance/edictum-boundary', 'vida-agent/dist/src/runtime-kernel.js', 'vida-agent/dist/src/runtime.js']) { try { await import(specifier); process.exit(17); } catch {} }
try { await import('vida-agent/legacy'); process.exit(12); }
catch (error) { if (error?.code !== 'ERR_MODULE_NOT_FOUND') throw error; }`,
      ],
      cwd: packedRoot,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    expect(packedExports.exitCode, subprocessFailure('packed public exports', packedExports)).toBe(0);
    const nodeExportDenial = await runProcess({
      cmd: [
        'node',
        '--input-type=module',
        '-e',
        `
let denied = false;
try { await import('vida-agent/legacy'); }
catch (error) { if (error?.code !== 'ERR_PACKAGE_PATH_NOT_EXPORTED') throw error; denied = true; }
if (!denied) process.exit(12);`,
      ],
      cwd: packedRoot,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    expect(nodeExportDenial.exitCode, subprocessFailure('node export denial', nodeExportDenial)).toBe(0);
    const trustedHostEnvironment = {
      ...isolatedEnvironment,
      TRUSTED_REPOSITORY_ROOT: isolatedRepositoryRoot,
      TRUSTED_CONFIG_REVISION: String(isolatedConfig.config_revision),
      TRUSTED_TENANT_ID: 'crmbx',
      TRUSTED_PROJECT_ID: '3mob',
      TRUSTED_STATE_PATH: path.join(archiveRoot, 'packed-host-state.sqlite'),
    };
    const expectedPublicExports = new Bun.Transpiler({ loader: 'ts' }).scan(
      await readFile(path.join(isolatedPackageRoot, 'src/index.ts'), 'utf8'),
    ).exports;
    const trustedHostExports = await runProcess({
      cmd: [
        'bun',
        '--conditions=agent-runtime-host',
        '--input-type=module',
        '-e',
        `const trusted = await import('vida-agent/trusted-host');
if (Object.keys(trusted).sort().join(',') !== 'HostStateError,HostStateStore,createTrustedHostComposition,inspectHostWorkspaceDatabase,openHostStateDatabase,runConsumerMigrationState,withHostStateExclusiveTransaction') process.exit(18);
if ('createTestTrustedHostLauncherCapability' in trusted || 'TrustedHostCompositionInput' in trusted) process.exit(19);
const authentication = { schema: 'TrustedHostAuthentication/v1', repositoryRoot: process.env.TRUSTED_REPOSITORY_ROOT, tenantId: process.env.TRUSTED_TENANT_ID, projectId: process.env.TRUSTED_PROJECT_ID, principal: 'principal-1', configRevision: Number(process.env.TRUSTED_CONFIG_REVISION), permittedOperations: ['runtime.read'] };
const services = { resolveIdentity: () => null, verifyApproval: () => null, runtimeRevision: () => ({ sourceRevision: 'source-1', currentRevision: 1 }), casWriter: () => ({ applied: true }) };
try { await trusted.createTrustedHostComposition({ authentication, services }); process.exit(20); } catch (error) { if (!/launcher capability is required/.test(error?.message ?? '')) process.exit(21); }
try { await trusted.createTrustedHostComposition(Object.freeze({ authentication, services })); process.exit(22); } catch (error) { if (!/launcher capability is required/.test(error?.message ?? '')) process.exit(23); }
const { Database } = await import('bun:sqlite');
const assert = (await import('node:assert/strict')).default;
const root = await import('vida-agent');
const runtime = await import('./dist/src/runtime.js');
const expectedPublicExports = ${JSON.stringify(expectedPublicExports)};
assert.deepEqual(Object.keys(root).sort(), expectedPublicExports.sort());
assert.deepEqual(Object.keys(runtime).sort(), [...expectedPublicExports, ...Object.keys(trusted)].sort());
for (const [name, value] of [...Object.entries(root), ...Object.entries(trusted)]) assert.equal(runtime[name], value, name);
for (const name of ['issueHostGovernanceCapability', 'createTestTrustedHostLauncherCapability', 'createRuntimeKernelHostProofForCompositionRoot', 'createWorkflowHostAuthenticationProofForCompositionRoot']) assert.equal(name in runtime, false, name);
const workspace = 'a'.repeat(64);
const identity = {
  repository_id: 'portable-repository',
  project_ids: ['portable-project'],
  integrations_digest: 'e'.repeat(64),
  work_id: 'portable-work',
};
const binding = {
  repository_id: identity.repository_id, project_ids: identity.project_ids,
  integrations_digest: identity.integrations_digest,
  team_id: 'team', workflow_id: 'bug_fix', provider_work_item_id: 'external-work',
  lifecycle_work_id: identity.work_id, work_item_digest: 'b'.repeat(64),
  work_source_revision: 'source', scope_id: 'scope', scope_contract_digest: 'c'.repeat(64),
  acceptance_manifest_digest: 'd'.repeat(64), ac_ids: ['AC-1'],
  implementation_paths: ['src/task.ts'], allowed_resources: ['file:src/task.ts'],
  config_digest: 'e'.repeat(64), runtime_source_revision: 'runtime',
  schema_digest: 'f'.repeat(64), runtime_code_digest: '0'.repeat(64),
};
const ticket = {
  schema: 'CoordinationTicket/v1', ...identity, ticket_id: 'ticket', thread_id: 'thread',
  source_revision: binding.work_source_revision, generation: 1, sequence: 1,
  contour_keys: [], exclusive_resources: ['file:src/task.ts'], status: 'active', claim_ids: ['claim'],
  expires_at: new Date(Date.now() + 3600000).toISOString(), created_at: '2026-09-18T00:00:00.000Z',
  active_resources: ['file:src/task.ts'], blocked_resources: [],
};
const claim = {
  schema: 'WorkstreamClaim/v1', claim_id: 'claim', ticket_id: ticket.ticket_id,
  work_id: identity.work_id, thread_id: ticket.thread_id, generation: ticket.generation,
  resources: ['file:src/task.ts'], lease_expires_at: ticket.expires_at, status: 'active',
  created_at: ticket.created_at, renewed_at: ticket.created_at,
};
const input = {
  expectedWork: null, expectedLedger: null,
  nextWork: {
    schema: 'WorkState/v1', workspace_id: workspace, revision: 1, binding,
    contracts: {
      scope: { schema: 'ImplementationScope/v1', path: '.agent/scope.json', sha256: binding.scope_contract_digest },
      acceptance: { schema: 'AcceptanceManifest/v1', path: '.agent/acceptance.json', sha256: binding.acceptance_manifest_digest },
      decisions: [],
    },
    lease: { ticket_id: ticket.ticket_id, thread_id: ticket.thread_id, generation: ticket.generation },
    execution: { run_id: 'run', input_digest: '1'.repeat(64), phase: 'implementation', status: 'active', assignment_attempts: [] },
    lifecycle: {
      schema: 'LifecycleState/v1', revision: 1, phase: 'INTAKE', source_revision: binding.work_source_revision,
      next_action: 'Trace the accepted work request.', route: 'R3', risk: 'high', change_kind: 'migration',
      config_binding: { config_digest: binding.config_digest, schema_digest: binding.schema_digest, runtime_code_digest: binding.runtime_code_digest },
      scope: { scope_id: binding.scope_id, allowed_paths: ['src/task.ts'], fingerprint_paths: ['src/task.ts'], implementation_paths: ['src/task.ts'], documentation_paths: [] },
      seal: null,
      assurance: { epoch: 'epoch-1', review_generation: 0, correction_count: 0, review_failure_count: 0, delivery_cycle_id: null },
      references: [],
    },
    artifacts: [],
  },
  nextLedger: {
    schema: 'CoordinationLedger/v1', workspace_id: workspace, revision: 1,
    open_generation: 1, next_sequence: 2, tickets: [ticket], claims: [claim],
    notices: [], dispositions: [], contours: [], batches: [], rebinds: [], operations: [], retirements: [],
  },
};
const database = new Database(process.env.TRUSTED_STATE_PATH, { create: true, strict: true });
let saved;
try {
  database.exec('PRAGMA journal_mode=WAL');
  const store = new trusted.HostStateStore(database, workspace);
  saved = store.compareAndSwapHostState(input);
  assert.equal(saved.workVersion.revision, 1);
  assert.equal(saved.ledgerVersion.revision, 1);
} finally { database.close(); }
const reopened = new Database(process.env.TRUSTED_STATE_PATH, { strict: true });
try {
  const store = new trusted.HostStateStore(reopened, workspace);
  assert.deepEqual(store.readHostStateSnapshot(identity), saved);
  assert.throws(() => store.compareAndSwapHostState(input), trusted.HostStateError);
  assert.deepEqual(store.readHostStateSnapshot(identity), saved);
} finally { reopened.close(); }`,
      ],
      cwd: packedRoot,
      stdout: 'pipe',
      stderr: 'pipe',
      env: trustedHostEnvironment,
    });
    expect(trustedHostExports.exitCode, subprocessFailure('packed trusted-host exports', trustedHostExports)).toBe(0);
    const packedDistDigest = await digestRegularTree(packedRoot, 'dist');
    const declaredDistPatterns = packedManifest.files
      .filter((entry) => entry.startsWith('dist/'))
      .map((entry) => new Bun.Glob(entry.slice('dist/'.length)));
    expect(packedDistDigest).toBe(
      await digestRegularTree(isolatedPackageRoot, 'dist', (entry) =>
        declaredDistPatterns.some((pattern) => pattern.match(entry)),
      ),
    );
    const packedConfiguration = await runProcess({
      cmd: [
        'bun',
        '--input-type=module',
        '-e',
        `
const runtime = await import(${JSON.stringify(pathToFileURL(path.join(packedRoot, 'dist/src/index.js')).href)});
const config = runtime.loadRuntimeConfig(${JSON.stringify(isolatedRepositoryRoot)});
console.log(JSON.stringify({ schema: config.schema, workflow_id: runtime.selectWorkflow(config, {
  team: 'default-development', kind: 'research', intent: 'information_research', project: '3mob', risk_flags: [], labels: [],
}).workflow_id }));`,
      ],
      cwd: packedRoot,
      env: isolatedEnvironment,
    });
    expect(packedConfiguration.exitCode, subprocessFailure('packed configuration graph', packedConfiguration)).toBe(0);
    const packedConfigurationResult = JSON.parse(packedConfiguration.stdout.toString());
    expect(packedConfigurationResult.schema).toBe('AgentRuntimeConfig/v1');
    expect(packedConfigurationResult.workflow_id).toBe('information_research_light');
    const freshProjectRoot = path.join(archiveRoot, 'fresh-project');
    const freshBundleRoot = path.join(freshProjectRoot, 'node_modules', 'vida-agent');
    await mkdir(path.join(freshProjectRoot, '.git'), { recursive: true });
    const npmInstall = await runProcess({
      cmd: [
        node,
        findNpmCli(node),
        'install',
        '--prefix',
        freshProjectRoot,
        '--ignore-scripts',
        '--no-audit',
        '--no-fund',
        archivePath,
      ],
      cwd: archiveRoot,
      env: isolatedEnvironment,
    });
    expect(npmInstall.exitCode, subprocessFailure('fresh npm archive acquisition', npmInstall)).toBe(0);
    await expect(readFile(path.join(freshProjectRoot, 'bun.lock'))).rejects.toMatchObject({ code: 'ENOENT' });
    expect(await readFile(path.join(freshBundleRoot, 'bun.lock'))).toEqual(packedLockfile);
    expect(await readFile(path.join(freshBundleRoot, 'dist/portable/bun.lock'))).toEqual(packedLockfile);
    const freshInstall = await runProcess({
      cmd: [
        'node',
        path.join(freshBundleRoot, 'bin/install.mjs'),
        '--project-root',
        freshProjectRoot,
        '--repository',
        'portable-repository',
        '--project',
        'portable-project',
      ],
      cwd: archiveRoot,
      stdout: 'pipe',
      stderr: 'pipe',
      env: isolatedEnvironment,
    });
    expect(freshInstall.exitCode, subprocessFailure('fresh npm-owned initialization', freshInstall)).toBe(0);
    expect(freshInstall.stdout.toString()).toContain('"initialization":"delegated_successfully"');
    for (const repairModule of [
      'bin/reconcile-artifacts.mjs',
      'bin/reconcile-readonly-dispatch.mjs',
      'bin/read-only-dispatch-repair.mjs',
      'bin/runtime-code-rebind.mjs',
      'bin/repair-research-records.mjs',
    ])
      expect((await readFile(path.join(freshBundleRoot, repairModule))).byteLength).toBeGreaterThan(0);
    await expect(readFile(path.join(freshProjectRoot, 'bun.lock'))).rejects.toMatchObject({ code: 'ENOENT' });
    expect(await readFile(path.join(freshBundleRoot, 'bun.lock'))).toEqual(packedLockfile);
    expect(await readFile(path.join(freshBundleRoot, 'dist/portable/bun.lock'))).toEqual(packedLockfile);
    const initialization = JSON.parse(
      await readFile(path.join(freshProjectRoot, '.agent/runtime-initialization.v1.json'), 'utf8'),
    );
    expect(initialization.schema).toBe('RuntimeInitialization/v1');
    for (const entry of initialization.templates)
      expect(sha256Bytes(await readFile(path.join(freshProjectRoot, entry.output)))).toBe(entry.output_sha256);
    const freshActivation = await runProcess({
      cmd: [
        'bun',
        '--input-type=module',
        '-e',
        `
import assert from 'node:assert/strict';
const runtime = await import(${JSON.stringify(pathToFileURL(path.join(freshBundleRoot, 'dist/src/index.js')).href)});
for (const internal of ['applyArtifactReconciliation', 'inspectArtifactReconciliation', 'planArtifactReconciliation'])
  assert.equal(runtime[internal], undefined, internal);
const config = runtime.loadRuntimeConfig(${JSON.stringify(freshProjectRoot)});
assert.equal(config.runtime.bundle, ${JSON.stringify(path.relative(freshProjectRoot, freshBundleRoot).split(path.sep).join('/'))});
assert.equal(config.projects[0].project_id, 'portable-project');
const graph = runtime.createConfiguredMastra(${JSON.stringify(freshProjectRoot)}, {
  work_item: { kind: 'research', intent: 'information_research', project: 'portable-project', risk_flags: [], labels: [] },
});
assert.equal(graph.workflowId, 'information_research_light');
await assert.rejects(graph.dispatch('forged-work-item'), /opaque host capability/);
console.log(JSON.stringify({ schema: 'FreshNpmActivationTest/v1', assertions: 7 }));`,
      ],
      cwd: freshProjectRoot,
      env: isolatedEnvironment,
    });
    expect(freshActivation.exitCode, subprocessFailure('fresh npm package graph', freshActivation)).toBe(0);
    expect(JSON.parse(freshActivation.stdout.toString())).toEqual({
      schema: 'FreshNpmActivationTest/v1',
      assertions: 7,
    });
  },
  420_000,
);
