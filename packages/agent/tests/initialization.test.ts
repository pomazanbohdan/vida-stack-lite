import { afterAll, afterEach, beforeAll, expect, spyOn, test } from 'bun:test';
import { cp, mkdir, mkdtemp, readFile, readdir, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { boundedSpawnSync, executionBudget, commandOutcomeUnknown, requireTerminalCommand } from '../bin/bun.ts';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { parseRuntimeConfigYaml } from '../src/config/runtime-config.ts';
import * as safeRepositoryAccess from '../src/config/safe-repository-access.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.ts';
import {
  validateRuntimeInitializationReceipt,
  type RuntimeInitializationReceipt,
} from '../src/config/initialization-record.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { initializeProjectFromBundle } from '../bin/init-core.ts';
import { expectAsyncReturned, expectRejection, rejectionReason } from './helpers/expect-rejection.ts';
import { completeOwnedCleanup } from '../tooling/owned-cleanup-completion.ts';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPaths = [
  'AGENTS.md',
  'AGENT.sidecar.md',
  'agent-runtime.config.v1.yaml',
  'docs',
  '.agent',
  '.vida',
  '.tmp',
] as const;

const compareNames = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);

const firstPathSegment = (value: string): string => {
  const segment = value.split('/')[0];
  if (segment === undefined) throw new Error(`Expected a path segment in ${value}.`);
  return segment;
};
const v8CoverageMode = process.env.AGENT_RUNTIME_V8_COVERAGE === '1';
const baseTest = v8CoverageMode ? test.skip : test;
const phaseBudget = executionBudget(undefined, 30_000);
type ExecutionBudget = ReturnType<typeof executionBudget>;
type CommandResult = ReturnType<typeof boundedSpawnSync>;
type TerminalRunResult = CommandResult & {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
};

let initializationOutcomeUnknown = false;
function v8CoverageTest(name: string, execute: (budget: ExecutionBudget) => Promise<void>, timeout = 5_000): void {
  baseTest(
    name,
    () => {
      if (initializationOutcomeUnknown) throw Error('Prior initializer child outcome prevents fixture reuse.');
      return execute(phaseBudget.child(timeout, 250));
    },
    timeout,
  );
}
const hash = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');
let root = '';
let bundle = '';
let originalTemplate = '';
let externalConfig = '';

type JsonRecord = Record<string, unknown>;

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function jsonRecord(value: unknown, label: string): JsonRecord {
  if (!isJsonRecord(value)) throw new Error(`${label} must be a JSON object.`);
  return value;
}

function parseJsonRecord(text: string, label: string): JsonRecord {
  const value: unknown = JSON.parse(text);
  return jsonRecord(value, label);
}

function stringField(record: JsonRecord, field: string, label: string): string {
  const value = record[field];
  if (typeof value !== 'string') throw new Error(`${label}.${field} must be a string.`);
  return value;
}

function arrayField(record: JsonRecord, field: string, label: string): unknown[] {
  const value = record[field];
  if (!Array.isArray(value)) throw new Error(`${label}.${field} must be an array.`);
  return value;
}

function outputStatus(text: string, label: string): string {
  return stringField(parseJsonRecord(text, label), 'status', label);
}

function assertStringArray(value: unknown, label: string): asserts value is string[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  for (const entry of value) if (typeof entry !== 'string') throw new Error(`${label} must contain only strings.`);
}

async function readInitializationReceipt(file: string): Promise<RuntimeInitializationReceipt> {
  const value: unknown = JSON.parse(await readFile(file, 'utf8'));
  const schema = await readFile(path.join(bundle, 'schemas/runtime-initialization.v1.schema.json'), 'utf8');
  return validateRuntimeInitializationReceipt(value, schema);
}

async function run(
  budget: ExecutionBudget,
  args: readonly string[],
  env: NodeJS.ProcessEnv = {},
  cwd: string = root,
  executable = process.execPath,
): Promise<TerminalRunResult> {
  if (initializationOutcomeUnknown) throw Error('Prior initializer child outcome prevents fixture reuse.');
  const entrypoint = args[0];
  if (entrypoint === undefined) throw new Error('Initializer child requires an entrypoint.');
  const label = `initializer ${path.basename(entrypoint)}/${executable}`;
  const result = boundedSpawnSync(
    spawnSync,
    executable,
    args,
    {
      cwd,
      env: { ...process.env, ...env },
      windowsHide: true,
      encoding: 'utf8',
      timeout: 300_000,
      budget,
      diagnostics: true,
    },
    label,
  );
  if (commandOutcomeUnknown(result)) initializationOutcomeUnknown = true;
  requireTerminalCommand(result, label);
  if (typeof result.status !== 'number') throw new Error(`${label}: terminal status is unavailable.`);
  if (typeof result.stdout !== 'string' || typeof result.stderr !== 'string')
    throw new Error(`${label}: UTF-8 child output is unavailable.`);
  return { ...result, stdout: result.stdout, stderr: result.stderr, exitCode: result.status };
}
async function init(
  budget: ExecutionBudget,
  extra: readonly string[] = [],
  env: NodeJS.ProcessEnv = {},
): Promise<TerminalRunResult> {
  return run(
    budget,
    [
      path.join(bundle, 'bin/init.ts'),
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
  if (v8CoverageMode || initializationOutcomeUnknown) return;
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
  if (v8CoverageMode || initializationOutcomeUnknown) return;
  for (const entry of outputPaths) await rm(path.join(root, entry), { recursive: true, force: true });
  await rm(path.join(root, 'packages'), { recursive: true, force: true });
  await writeFile(path.join(bundle, 'templates/agent-runtime.config.template.v1.yaml'), originalTemplate);
});
afterAll(async () => {
  if (v8CoverageMode || initializationOutcomeUnknown) return;
  if (root) await rm(root, { recursive: true, force: true });
}, 180_000);

v8CoverageTest(
  'copied bundle with reused locked dependencies initializes explicit identity and records raw template hashes',
  async (budget) => {
    const result = await init(budget, [], { AGENT_RUNTIME_CONFIG: externalConfig });
    expect(result.stderr).toBe('');
    expect(result.exitCode, result.stderr).toBe(0);
    expect(
      stringField(parseJsonRecord(result.stdout, 'initialization output'), 'status', 'initialization output'),
    ).toBe('initialized');
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
    const agentTemplate = await readFile(path.join(bundle, 'templates/AGENTS.template.md'), 'utf8');
    expect(agents).toBe(agentTemplate.replaceAll('{{BUNDLE}}', config.runtime.bundle));
    expect(agents).not.toContain('{{BUNDLE}}');
    const receipt = await readInitializationReceipt(path.join(root, '.agent/runtime-initialization.v1.json'));
    expect(receipt.schema).toBe('RuntimeInitialization/v1');
    expect(receipt.workspace_id).toBe(deriveWorkspaceId(config.repository.repository_id, root));
    for (const entry of receipt.templates) {
      expect(entry.template_sha256).toBe(hash(await readFile(path.join(bundle, entry.template))));
      expect(entry.output_sha256).toBe(hash(await readFile(path.join(root, entry.output))));
    }
    const repeated = await init(budget);
    expect(
      stringField(parseJsonRecord(repeated.stdout, 'repeat initialization output'), 'status', 'repeat output'),
    ).toBe('existing');
    expect(await readFile(path.join(root, 'agent-runtime.config.v1.yaml'))).toEqual(configBytes);
    expect(await readFile(path.join(root, 'AGENTS.md'), 'utf8')).toBe(agents);
  },
  30_000,
);

test('direct initialization validates existing bindings and resumes the same pending receipt with and without its canonical receipt', async () => {
  const projectRoot = await mkdtemp(path.join(tmpdir(), 'portable-runtime-init-core-'));
  const request = {
    projectRoot,
    repository: 'different-repository',
    projectMappings: ['second-project=nested', 'different-project=.'],
  } as const;
  let completed = false;
  try {
    await mkdir(path.join(projectRoot, 'nested'));
    const initialized = await expectAsyncReturned(() => initializeProjectFromBundle(request, source));
    expect(initialized.status).toBe('initialized');
    const existing = await expectAsyncReturned(() =>
      initializeProjectFromBundle({ ...request, reconcileExisting: true }, source),
    );
    expect(existing).toMatchObject({
      status: 'existing',
      receipt: '.agent/runtime-initialization.v1.json',
    });
    const integrationOutputs = [
      'AGENTS.md',
      'AGENT.sidecar.md',
      'agent-runtime.config.v1.yaml',
      'docs/agent-instructions/documentation-policy.v1.json',
    ] as const;
    const beforeDeniedReconciliation = await Promise.all(
      integrationOutputs.map(async (output) => [output, await readFile(path.join(projectRoot, output))] as const),
    );
    await expectRejection(
      initializeProjectFromBundle({ ...request, repository: 'foreign-repository', reconcileExisting: true }, source),
      'Existing configuration does not match',
    );
    for (const [output, before] of beforeDeniedReconciliation) {
      expect(await readFile(path.join(projectRoot, output))).toEqual(before);
    }
    const receiptPath = path.join(projectRoot, '.agent/runtime-initialization.v1.json');
    const pendingPath = path.join(projectRoot, '.agent/runtime-initialization.pending.v1.json');
    const archiveDirectory = path.join(projectRoot, '.agent/initialization-provenance');
    const [archiveName] = await readdir(archiveDirectory);
    if (!archiveName) throw new Error('Initialization did not archive its pending intent.');
    const archivePath = path.join(archiveDirectory, archiveName);
    const archivedIntent = await readFile(archivePath);
    const canonicalReceipt = await readFile(receiptPath);

    await writeFile(pendingPath, archivedIntent);
    await rm(archivePath);
    const withReceipt = await expectAsyncReturned(() =>
      initializeProjectFromBundle({ ...request, reconcileExisting: true }, source),
    );
    expect(withReceipt.status).toBe('resumed_initialization');
    expect(await readFile(receiptPath)).toEqual(canonicalReceipt);

    await writeFile(pendingPath, archivedIntent);
    await rm(archivePath);
    await rm(receiptPath);
    const withoutReceipt = await expectAsyncReturned(() =>
      initializeProjectFromBundle({ ...request, reconcileExisting: true }, source),
    );
    expect(withoutReceipt.status).toBe('resumed_initialization');
    const receiptValue: unknown = JSON.parse(await readFile(receiptPath, 'utf8'));
    const rawSchema = await readFile(path.join(source, 'schemas/runtime-initialization.v1.schema.json'), 'utf8');
    expect(validateRuntimeInitializationReceipt(receiptValue, rawSchema)).toMatchObject({
      provenance: 'generated',
      workspace_binding_status: 'pending',
    });
    expect(await rejectionReason(readFile(pendingPath))).toMatchObject({ code: 'ENOENT' });

    await rm(receiptPath);
    const sidecarPath = path.join(projectRoot, 'AGENT.sidecar.md');
    const ownerSidecar = Buffer.concat([await readFile(sidecarPath), Buffer.from('\nProject-owned note.\n')]);
    await writeFile(sidecarPath, ownerSidecar);
    const adopted = await expectAsyncReturned(() =>
      initializeProjectFromBundle({ ...request, reconcileExisting: true }, source),
    );
    expect(adopted.status).toBe('reconciled_existing');
    expect(await readFile(sidecarPath)).toEqual(ownerSidecar);
    const adoptedValue: unknown = JSON.parse(await readFile(receiptPath, 'utf8'));
    expect(validateRuntimeInitializationReceipt(adoptedValue, rawSchema)).toMatchObject({
      provenance: 'adopted_existing',
    });
    completed = true;
  } finally {
    if (completed) await rm(projectRoot, { recursive: true, force: true });
    else console.error(`Retained failed init-core fixture: ${projectRoot}`);
  }
});

test('repeated initialization accepts the complete configured multi-project set', async () => {
  const projectRoot = await mkdtemp(path.join(tmpdir(), 'portable-runtime-init-multi-existing-'));
  const request = {
    projectRoot,
    repository: 'different-repository',
    projectMappings: ['beta=nested', 'alpha=.'],
  } as const;
  let completed = false;
  try {
    await mkdir(path.join(projectRoot, 'nested'));
    const initialized = await expectAsyncReturned(() => initializeProjectFromBundle(request, source));
    expect(initialized.status).toBe('initialized');
    const configBytes = await readFile(path.join(projectRoot, 'agent-runtime.config.v1.yaml'));
    const existing = await expectAsyncReturned(() => initializeProjectFromBundle(request, source));
    expect(existing).toMatchObject({
      status: 'existing',
      existing: [
        'AGENTS.md',
        'AGENT.sidecar.md',
        'agent-runtime.config.v1.yaml',
        'docs/agent-instructions/documentation-policy.v1.json',
        '.agent/runtime-initialization.v1.json',
      ],
      next_action: 'Use explicit reconciliation for any partial or existing initialization.',
    });
    expect(await readFile(path.join(projectRoot, 'agent-runtime.config.v1.yaml'))).toEqual(configBytes);
    const config = parseRuntimeConfigYaml(configBytes.toString());
    expect(config.projects.map(({ project_id, project_root }) => ({ project_id, project_root }))).toEqual([
      { project_id: 'alpha', project_root: '.' },
      { project_id: 'beta', project_root: 'nested' },
    ]);
    const protectedPaths = [
      'AGENT.sidecar.md',
      'agent-runtime.config.v1.yaml',
      'docs/agent-instructions/documentation-policy.v1.json',
      '.agent/runtime-initialization.v1.json',
    ];
    const protectedBytes = await Promise.all(protectedPaths.map((file) => readFile(path.join(projectRoot, file))));
    await rm(path.join(projectRoot, 'AGENTS.md'));
    const failure = await rejectionReason(initializeProjectFromBundle(request, source));
    if (!(failure instanceof Error)) throw new Error('Partial initialization must return a structured failure.');
    expect(parseJsonRecord(failure.message, 'partial initialization')).toEqual({
      status: 'partial_not_ready',
      ready: false,
      existing: protectedPaths,
      missing: ['AGENTS.md'],
      next_action: 'Complete the project-owned integration files, then use explicit reconciliation.',
    });
    expect(requireSafeRepositoryAccess(projectRoot).fileExists('AGENTS.md', 'denied initialization')).toBe(false);
    for (const [index, file] of protectedPaths.entries()) {
      expect(await readFile(path.join(projectRoot, file))).toEqual(protectedBytes[index]!);
    }
    completed = true;
  } finally {
    if (completed) await rm(projectRoot, { recursive: true, force: true });
    else console.error(`Retained failed init-core fixture: ${projectRoot}`);
  }
});

v8CoverageTest(
  'explicit reconciliation adopts only complete matching existing integration files',
  async (budget) => {
    const initialized = await init(budget);
    expect(initialized.exitCode, initialized.stderr).toBe(0);
    const receipt = path.join(root, '.agent/runtime-initialization.v1.json');
    await rm(receipt);
    const sidecar = path.join(root, 'AGENT.sidecar.md');
    const preservedSidecar = Buffer.concat([await readFile(sidecar), Buffer.from('\nProject-owned note.\n')]);
    await writeFile(sidecar, preservedSidecar);
    const originalConfig = await readFile(path.join(root, 'agent-runtime.config.v1.yaml'));
    const partial = await run(budget, [
      path.join(bundle, 'bin/init.ts'),
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
    const missing = await init(budget, ['--reconcile-existing']);
    expect(missing.exitCode).toBe(1);
    expect(missing.stderr).toContain('requires all existing project integration files');
    await writeFile(sidecar, preservedSidecar);
    const adopted = await init(budget, ['--reconcile-existing']);
    expect(adopted.exitCode, adopted.stderr).toBe(0);
    expect(stringField(parseJsonRecord(adopted.stdout, 'adoption output'), 'status', 'adoption output')).toBe(
      'reconciled_existing',
    );
    const body = await readInitializationReceipt(receipt);
    expect(body.provenance).toBe('adopted_existing');
    expect(body.workspace_binding_status).toBe('pending');
    const sidecarTemplate = body.templates[1];
    if (sidecarTemplate === undefined) throw new Error('Adoption receipt has no sidecar template entry.');
    expect(sidecarTemplate.output_sha256).toBe(hash(preservedSidecar));
    expect(await readFile(sidecar)).toEqual(preservedSidecar);
    expect(await readFile(path.join(root, 'agent-runtime.config.v1.yaml'))).toEqual(originalConfig);
    const repeat = await init(budget, ['--reconcile-existing']);
    expect(repeat.exitCode, repeat.stderr).toBe(0);
    expect(stringField(parseJsonRecord(repeat.stdout, 'repeat adoption output'), 'status', 'repeat output')).toBe(
      'existing',
    );
    expect(await readInitializationReceipt(receipt)).toEqual(body);
  },
  30_000,
);

v8CoverageTest(
  'fresh local initialization exposes the current Mastra session prepare packet',
  async (budget) => {
    const initialized = await init(budget, [], { AGENT_RUNTIME_CONFIG: externalConfig });
    expect(initialized.exitCode, initialized.stderr).toBe(0);
    const config = parseRuntimeConfigYaml(await readFile(path.join(root, 'agent-runtime.config.v1.yaml'), 'utf8'));
    const firstProject = config.projects[0];
    if (!firstProject) throw new Error('Initialized configuration has no project.');
    const workId = 'work-17';
    const nativeSessionHandle = 'initialization-test-session';
    const scopeDigest = snapshotDeclaredSources(requireSafeRepositoryAccess(root), ['AGENTS.md']).digest;
    await mkdir(path.join(root, '.agent/work', workId), { recursive: true });
    const scope = {
      schema: 'ImplementationScope/v1',
      scope_id: 'scope-' + workId,
      work_id: workId,
      source_revision: scopeDigest,
      ac_ids: ['AC-INITIALIZATION-PREPARE'],
      allowed_paths: ['AGENTS.md'],
      implementation_paths: ['AGENTS.md'],
      documentation_paths: [],
      changed_symbols: [],
      non_goals: ['Source mutation'],
      acceptance_trace: ['AC-INITIALIZATION-PREPARE'],
      behavior_trace: ['Prepare a Mastra session packet for admitted local work.'],
      test_trace: ['fresh local initialization exposes the current Mastra session prepare packet'],
      diagnostic_trace: ['Verify prepared and resumed packet identity.'],
      attribution: { thread_id: nativeSessionHandle, pointer: 'test:initialization/' + workId },
      owner: 'initialization test fixture',
      created_at: new Date().toISOString(),
    };
    const scopePath = `.agent/work/${workId}/scope.json`;
    const acceptancePath = `.agent/work/${workId}/acceptance.json`;
    const intakePath = `.agent/work/${workId}/intake.json`;
    await writeFile(path.join(root, scopePath), JSON.stringify(scope));
    await writeFile(
      path.join(root, acceptancePath),
      JSON.stringify({
        schema: 'AcceptanceManifest/v1',
        id: 'acceptance-' + workId,
        version: 1,
        ac_ids: scope.ac_ids,
        source: 'AGENTS.md',
        scope: scope.scope_id,
        source_revision: scopeDigest,
        contracts: [
          {
            id: 'AC-INITIALIZATION-PREPARE',
            definition: 'Prepare and resume one admitted local Mastra session.',
            sr: 'SR-INITIALIZATION-PREPARE',
            evidence: ['prepared and resumed packet identity'],
          },
        ],
      }),
    );
    await writeFile(
      path.join(root, intakePath),
      JSON.stringify({
        schema: 'VidaLocalSessionIntake/v1',
        native_session_handle: nativeSessionHandle,
        work_item: {
          schema: 'WorkItem/v1',
          id: workId,
          provider: 'local',
          provider_type: 'Research',
          canonical_kind: 'research',
          intent: 'information_research',
          project_id: firstProject.project_id,
          title: 'Initialization Mastra packet fixture',
          description: 'Exercise first preparation and same-attempt resume.',
          labels: [],
          risk_flags: [],
        },
        scope_path: scopePath,
        acceptance_path: acceptancePath,
        runtime_code_paths: ['tools/agents/bin/run.ts'],
        route: 'R2',
        risk: 'low',
        change_kind: 'feature',
      }),
    );
    const runArgs = [
      path.join(bundle, 'bin/run.ts'),
      '--project-root',
      root,
      '--repository',
      config.repository.repository_id,
      '--project',
      firstProject.project_id,
      '--work-path',
      'tools/agents',
      '--work-id',
      workId,
      '--attempt',
      '1',
      '--scope-digest',
      scopeDigest,
      '--scope-path',
      'AGENTS.md',
      '--intake',
      path.join(root, intakePath),
      '--team',
      'default-development',
      '--kind',
      'research',
      '--intent',
      'information_research',
      '--workflow',
      'information_research_light',
    ];
    const result = await run(budget, runArgs);
    expect(result.exitCode, result.stderr).toBe(0);
    const prepared = parseJsonRecord(result.stdout, 'prepared run output');
    expect(prepared).toMatchObject({
      schema: 'VidaAgentRunResult/v1',
      status: 'prepared',
      execution_status: 'suspended',
      initialization_status: 'pending',
      resume_status: 'ready',
      state_version: { revision: 1 },
    });
    const nextActions = arrayField(prepared, 'next_actions', 'prepared run output');
    expect(nextActions.length).toBeGreaterThan(0);
    const actionIds = nextActions.map((item, index) => {
      const action = jsonRecord(item, `prepared run output.next_actions[${index}]`);
      const request = jsonRecord(action.request, `prepared run output.next_actions[${index}].request`);
      return stringField(request, 'action_id', `prepared run output.next_actions[${index}].request`);
    });
    const resumed = await run(budget, runArgs);
    expect(resumed.exitCode, resumed.stderr).toBe(0);
    const resumedPacket = parseJsonRecord(resumed.stdout, 'resumed run output');
    expect(stringField(resumedPacket, 'resume_status', 'resumed run output')).toBe('ready');
    expect(resumedPacket.state_version).toEqual(prepared.state_version);
    const resumedActions = arrayField(resumedPacket, 'next_actions', 'resumed run output');
    const resumedActionIds = resumedActions.map((item, index) => {
      const action = jsonRecord(item, `resumed run output.next_actions[${index}]`);
      const request = jsonRecord(action.request, `resumed run output.next_actions[${index}].request`);
      return stringField(request, 'action_id', `resumed run output.next_actions[${index}].request`);
    });
    expect(resumedActionIds).toEqual(actionIds);
  },
  60_000,
);

v8CoverageTest(
  'published initializer launched through the pinned Bun launcher initializes explicit identity',
  async (budget) => {
    const result = await run(
      budget,
      [
        path.join(bundle, 'bin/bun.ts'),
        path.join(bundle, 'bin/init.ts'),
        '--project-root',
        root,
        '--repository',
        'delegated-repository',
        '--project',
        'delegated-project',
      ],
      {},
      root,
    );
    expect(result.exitCode, result.stderr).toBe(0);
    expect(outputStatus(result.stdout, 'delegated initializer output')).toBe('initialized');
    const config = parseRuntimeConfigYaml(await readFile(path.join(root, 'agent-runtime.config.v1.yaml'), 'utf8'));
    expect(config.runtime.bundle).toBe('tools/agents');
    expect(config.repository.repository_id).toBe('delegated-repository');
    const firstProject = config.projects[0];
    if (!firstProject) throw new Error('Initialized configuration has no project.');
    expect(firstProject.project_id).toBe('delegated-project');
  },
  60_000,
);

v8CoverageTest(
  'each pre-existing integration file or receipt makes the entire invocation read-only',
  async (budget) => {
    for (const existing of [
      'AGENTS.md',
      'AGENT.sidecar.md',
      'agent-runtime.config.v1.yaml',
      'docs/agent-instructions/documentation-policy.v1.json',
      '.agent/runtime-initialization.v1.json',
    ]) {
      await mkdir(path.dirname(path.join(root, existing)), { recursive: true });
      await writeFile(path.join(root, existing), 'owner bytes');
      const result = await init(budget);
      expect(result.exitCode).toBe(1);
      expect(
        arrayField(parseJsonRecord(result.stderr, 'initialization error'), 'existing', 'initialization error'),
      ).toEqual([existing]);
      expect(await readFile(path.join(root, existing), 'utf8')).toBe('owner bytes');
      expect((await readdir(root)).sort(compareNames)).toEqual(
        [firstPathSegment(existing), 'tools'].sort(compareNames),
      );
      await rm(path.join(root, firstPathSegment(existing)), {
        recursive: true,
        force: true,
      });
    }
  },
  30_000,
);

v8CoverageTest(
  'interrupted exclusive creation preserves partial output and refuses implicit resume',
  async (budget) => {
    const safeAccessUrl = pathToFileURL(path.join(bundle, 'src/config/safe-repository-access.ts')).href;
    const initializerUrl = pathToFileURL(path.join(bundle, 'bin/init.ts')).href;
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
    const failed = await run(budget, ['-e', script]);
    expect(failed.exitCode, failed.stderr).toBe(0);
    const firstBytes = await readFile(path.join(root, 'AGENTS.md'));
    const template = await readFile(path.join(bundle, 'templates/AGENTS.template.md'), 'utf8');
    expect(firstBytes.toString()).toBe(template.replaceAll('{{BUNDLE}}', 'tools/agents'));
    expect((await readdir(root)).sort(compareNames)).toEqual(['.agent', 'AGENTS.md', 'tools']);
    const repeated = await init(budget);
    expect(repeated.exitCode, repeated.stderr).toBe(1);
    expect(parseJsonRecord(repeated.stderr, 'partial initialization error')).toMatchObject({
      status: 'partial_not_ready',
      existing: ['AGENTS.md'],
    });
    expect(await readFile(path.join(root, 'AGENTS.md'))).toEqual(firstBytes);
    expect((await readdir(root)).sort(compareNames)).toEqual(['.agent', 'AGENTS.md', 'tools']);
  },
  30_000,
);

test('pending initialization intent changed at the final resume guard prevents canonical receipt publication', async () => {
  const projectRoot = await mkdtemp(path.join(tmpdir(), 'portable-runtime-init-pending-cas-'));
  let completed = false;
  try {
    const request = {
      projectRoot,
      repository: 'different-repository',
      projectMappings: ['different-project'],
    } as const;
    const initialized = await expectAsyncReturned(() => initializeProjectFromBundle(request, source));
    expect(initialized.status).toBe('initialized');
    const receiptPath = path.join(projectRoot, '.agent/runtime-initialization.v1.json');
    const pendingPath = path.join(projectRoot, '.agent/runtime-initialization.pending.v1.json');
    const archiveDirectory = path.join(projectRoot, '.agent/initialization-provenance');
    const [archiveName] = await readdir(archiveDirectory);
    if (!archiveName) throw new Error('Initialization did not archive its pending intent.');
    const archivePath = path.join(archiveDirectory, archiveName);
    const pendingIntent = await readFile(archivePath);
    await rm(archivePath);
    await writeFile(pendingPath, pendingIntent);
    await rm(receiptPath);

    const ownerOutputs = [
      'AGENTS.md',
      'AGENT.sidecar.md',
      'agent-runtime.config.v1.yaml',
      'docs/agent-instructions/documentation-policy.v1.json',
    ] as const;
    const ownerBytes = await Promise.all(
      ownerOutputs.map(async (output) => ({ output, bytes: await readFile(path.join(projectRoot, output)) })),
    );
    const originalRequire = safeRepositoryAccess.requireSafeRepositoryAccess;
    const accessSpy = spyOn(safeRepositoryAccess, 'requireSafeRepositoryAccess').mockImplementation((accessRoot) => {
      const nativeAccess = originalRequire(accessRoot);
      if (path.resolve(accessRoot) !== path.resolve(projectRoot)) return nativeAccess;
      return {
        ...nativeAccess,
        prepareExclusiveCreation: async () => {
          const creator = await nativeAccess.prepareExclusiveCreation();
          await writeFile(pendingPath, Buffer.concat([await readFile(pendingPath), Buffer.from('\n')]));
          return creator;
        },
      };
    });
    let failure: { error: unknown } | undefined;
    try {
      await expectRejection(
        initializeProjectFromBundle({ ...request, reconcileExisting: true }, source),
        'Pending initialization intent changed during resume',
      );
      expect(await readFile(pendingPath)).toEqual(Buffer.concat([pendingIntent, Buffer.from('\n')]));
      expect(await rejectionReason(readFile(receiptPath))).toMatchObject({ code: 'ENOENT' });
      for (const { output, bytes } of ownerBytes) {
        expect(await readFile(path.join(projectRoot, output))).toEqual(bytes);
      }
      completed = true;
    } catch (error) {
      failure = { error };
      throw error;
    } finally {
      completeOwnedCleanup(
        [
          () => {
            accessSpy.mockRestore();
            return undefined;
          },
        ],
        failure,
      );
    }
  } finally {
    if (completed) await rm(projectRoot, { recursive: true, force: true });
    else console.error(`Retained failed pending CAS fixture: ${projectRoot}`);
  }
});

v8CoverageTest(
  'malformed template and invalid generated configuration fail before output',
  async (budget) => {
    for (const content of [
      originalTemplate + '\nunknown: true\n',
      originalTemplate.replace('{{REPOSITORY}}', '{{UNKNOWN}}'),
      originalTemplate.replace('sidecar: AGENT.sidecar.md', 'sidecar: missing.md'),
    ]) {
      await writeFile(path.join(bundle, 'templates/agent-runtime.config.template.v1.yaml'), content);
      const result = await init(budget);
      expect(result.exitCode).toBe(1);
      expect(await readdir(root)).toEqual(['tools']);
    }
  },
  30_000,
);

v8CoverageTest(
  'configured instructions must exist in the copied bundle before initialization writes',
  async (budget) => {
    const instruction = path.join(bundle, 'instructions/development-lifecycle.md');
    const content = await readFile(instruction);
    await rm(instruction);
    try {
      const result = await init(budget);
      expect(result.exitCode).toBe(1);
    } finally {
      if (!initializationOutcomeUnknown) await writeFile(instruction, content);
    }
    expect(await readdir(root)).toEqual(['tools']);
  },
  30_000,
);

v8CoverageTest('absent root configuration fails even with the template installed', async (budget) => {
  const module = new URL('file:///' + path.join(bundle, 'src/config/runtime-config.ts').replaceAll('\\', '/')).href;
  const result = await run(budget, [
    '-e',
    `const {loadRuntimeConfig}=await import(${JSON.stringify(module)});loadRuntimeConfig(${JSON.stringify(root)});`,
  ]);
  expect(result.exitCode).toBe(1);
  expect(await readdir(root)).toEqual(['tools']);
});

v8CoverageTest(
  'installed public run rejects an incomplete prepared selector without creating cutoff or work state',
  async (budget) => {
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
      const initialized = await init(budget, [], { AGENT_RUNTIME_CONFIG: externalConfig });
      expect(initialized.exitCode, initialized.stderr).toBe(0);
      const config = parseRuntimeConfigYaml(await readFile(path.join(root, 'agent-runtime.config.v1.yaml'), 'utf8'));
      const firstProject = config.projects[0];
      if (!firstProject) throw new Error('Initialized configuration has no project.');
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
      const record = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;
      const runArgs = [
        path.join(installedBundle, 'bin/run.ts'),
        '--project-root',
        root,
        '--repository',
        config.repository.repository_id,
        '--project',
        firstProject.project_id,
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
      const interrupted = await run(budget, runArgs);
      expect(interrupted.exitCode).toBe(1);
      expect(stringField(parseJsonRecord(interrupted.stderr, 'selector error'), 'code', 'selector error')).toBe(
        'GAP-VIDA-RUN-SELECTOR-001',
      );
      await writeFile(selectorPath, record(selector));
      const incomplete = await run(budget, runArgs);
      expect(incomplete.exitCode).toBe(1);
      expect(outputStatus(incomplete.stderr, 'incomplete selector error')).toBe('blocked');
      expect(await readFile(selectorPath, 'utf8')).toBe(record(selector));
      expect(
        stringField(parseJsonRecord(incomplete.stderr, 'incomplete selector error'), 'code', 'selector error'),
      ).toBe('GAP-VIDA-RUN-SELECTOR-001');
      await Promise.resolve(
        expect(readFile(path.join(journalRoot, 'cutoff-witness.json'))).rejects.toMatchObject({ code: 'ENOENT' }),
      );
      await Promise.resolve(
        expect(readFile(path.join(root, '.agent/work/session-handoff.v1.sqlite'))).rejects.toMatchObject({
          code: 'ENOENT',
        }),
      );
    } finally {
      bundle = ordinaryBundle;
      if (!initializationOutcomeUnknown) {
        await writeFile(externalConfig, ordinaryConfig);
        await rm(installedBundle, { recursive: true, force: true });
      }
    }
  },
  180_000,
);

v8CoverageTest(
  'unsupported native write capability, tenant input and malformed identity produce no outputs',
  async (budget) => {
    const disabled = await init(budget, [], { FS_SAFE_NATIVE_MODE: 'off' });
    expect(disabled.exitCode).toBe(1);
    const invalid = await run(budget, [
      path.join(bundle, 'bin/init.ts'),
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

v8CoverageTest('reparse receipt ancestors fail without writing any root integration file', async (budget) => {
  const outside = await mkdtemp(path.join(tmpdir(), 'portable-init-outside-'));
  try {
    await symlink(outside, path.join(root, '.agent'), process.platform === 'win32' ? 'junction' : 'dir');
    const result = await init(budget);
    expect(result.exitCode).toBe(1);
    expect((await readdir(root)).sort(compareNames)).toEqual(['.agent', 'tools']);
    expect(await readdir(outside)).toEqual([]);
  } finally {
    if (!initializationOutcomeUnknown) {
      await rm(path.join(root, '.agent'), { force: true, recursive: true });
      await rm(outside, { force: true, recursive: true });
    }
  }
});

v8CoverageTest('maximum-length repository and project identities remain valid', async (budget) => {
  const result = await run(budget, [
    path.join(bundle, 'bin/init.ts'),
    '--project-root',
    root,
    '--repository',
    'r'.repeat(64),
    '--project',
    'p'.repeat(50),
  ]);
  expect(result.exitCode, result.stderr).toBe(0);
  expect(outputStatus(result.stdout, 'initialization output')).toBe('initialized');
});

v8CoverageTest(
  'explicit multi-project initialization uses unique non-overlapping roots and records the selected set',
  async (budget) => {
    await mkdir(path.join(root, 'packages', 'alpha'), { recursive: true });
    await mkdir(path.join(root, 'packages', 'beta'), { recursive: true });
    const result = await run(budget, [
      path.join(bundle, 'bin/init.ts'),
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
  'multi-project initialization still requires explicit roots and unique project ids',
  async (budget) => {
    const cases = [
      ['--project', 'alpha', '--project', 'beta=packages/beta'],
      ['--project', 'alpha=packages/alpha', '--project', 'alpha=packages/beta'],
    ];
    for (const args of cases) {
      const result = await run(budget, [
        path.join(bundle, 'bin/init.ts'),
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
  'multi-project initialization allows equal roots with distinct project identities',
  async (budget) => {
    await mkdir(path.join(root, 'packages', 'shared'), { recursive: true });
    const result = await run(budget, [
      path.join(bundle, 'bin/init.ts'),
      '--project-root',
      root,
      '--repository',
      'equal-roots-repository',
      '--project',
      'alpha=packages/shared',
      '--project',
      'beta=packages/shared',
    ]);
    expect(result.exitCode, result.stderr).toBe(0);
    const config = parseRuntimeConfigYaml(await readFile(path.join(root, 'agent-runtime.config.v1.yaml'), 'utf8'));
    expect(config.projects.map((project) => project.project_id)).toEqual(['alpha', 'beta']);
    expect(config.projects.map((project) => project.project_root)).toEqual(['packages/shared', 'packages/shared']);
  },
  30_000,
);

v8CoverageTest(
  'multi-project initialization allows a nested project root',
  async (budget) => {
    await mkdir(path.join(root, 'packages', 'child'), { recursive: true });
    const result = await run(budget, [
      path.join(bundle, 'bin/init.ts'),
      '--project-root',
      root,
      '--repository',
      'nested-roots-repository',
      '--project',
      'parent=packages',
      '--project',
      'child=packages/child',
    ]);
    expect(result.exitCode, result.stderr).toBe(0);
    const config = parseRuntimeConfigYaml(await readFile(path.join(root, 'agent-runtime.config.v1.yaml'), 'utf8'));
    expect(config.projects.map((project) => project.project_id)).toEqual(['child', 'parent']);
    const parent = config.projects.find((project) => project.project_id === 'parent');
    const child = config.projects.find((project) => project.project_id === 'child');
    if (!parent || !child) throw new Error('Expected both nested project identities.');
    expect(parent.project_root).toBe('packages');
    expect(child.project_root).toBe('packages/child');
  },
  30_000,
);

v8CoverageTest(
  'multi-project initialization emits no YAML references and gives each generated value independent nested data',
  async (budget) => {
    await mkdir(path.join(root, 'packages', 'alpha'), { recursive: true });
    await mkdir(path.join(root, 'packages', 'beta'), { recursive: true });
    const result = await run(budget, [
      path.join(bundle, 'bin/init.ts'),
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
    const rawConfig: unknown = parseYaml(bytes);
    const config = jsonRecord(rawConfig, 'generated configuration');
    const projects = arrayField(config, 'projects', 'generated configuration');
    const alphaValue = projects[0];
    const betaValue = projects[1];
    if (alphaValue === undefined || betaValue === undefined)
      throw new Error('Expected two generated projects and providers');
    const alpha = jsonRecord(alphaValue, 'generated configuration.projects[0]');
    const beta = jsonRecord(betaValue, 'generated configuration.projects[1]');
    const integrations = jsonRecord(config.integrations, 'generated configuration.integrations');
    const providers = arrayField(integrations, 'providers', 'generated configuration.integrations');
    const alphaProviderValue = providers[0];
    const betaProviderValue = providers[1];
    if (alphaProviderValue === undefined || betaProviderValue === undefined)
      throw new Error('Expected two generated projects and providers');
    const alphaProvider = jsonRecord(alphaProviderValue, 'generated configuration.integrations.providers[0]');
    const betaProvider = jsonRecord(betaProviderValue, 'generated configuration.integrations.providers[1]');
    const alphaCodeSelectors = alpha.code_selectors;
    const betaCodeSelectors = beta.code_selectors;
    assertStringArray(alphaCodeSelectors, 'generated configuration.projects[0].code_selectors');
    assertStringArray(betaCodeSelectors, 'generated configuration.projects[1].code_selectors');
    alphaCodeSelectors.push('alpha-only/**');
    alphaProvider.namespace = 'alpha-only';
    expect(betaCodeSelectors).not.toContain('alpha-only/**');
    expect(stringField(betaProvider, 'namespace', 'generated configuration.integrations.providers[1]')).toBe('beta');
    const teams = jsonRecord(config.teams, 'generated configuration.teams');
    const firstTeamValue = Object.values(teams)[0];
    if (firstTeamValue === undefined) throw new Error('Expected a generated team');
    const firstTeam = jsonRecord(firstTeamValue, 'generated configuration.teams entry');
    const allowedProjects = firstTeam.allowed_projects;
    assertStringArray(allowedProjects, 'generated configuration.teams entry.allowed_projects');
    allowedProjects.push('team-only');
    const firstProject = projects[0];
    if (firstProject === undefined) throw new Error('Expected the first generated project.');
    const firstProjectRecord = jsonRecord(firstProject, 'generated configuration.projects[0]');
    const firstProjectSelectors = firstProjectRecord.code_selectors;
    assertStringArray(firstProjectSelectors, 'generated configuration.projects[0].code_selectors');
    expect(firstProjectSelectors).not.toContain('team-only');
    const repeated = await init(budget);
    expect(outputStatus(repeated.stdout, 'repeat initialization output')).toBe('existing');
    expect(await readFile(path.join(root, 'agent-runtime.config.v1.yaml'), 'utf8')).toBe(bytes);
  },
  30_000,
);
