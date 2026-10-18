import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { closeSync, fstatSync } from 'node:fs';
import type { Dirent } from 'node:fs';
import path from 'node:path';
import { openRootFileSync, readFileDescriptorBoundedSync } from '@openclaw/fs-safe/advanced';
import type { instrumentSource as instrumentCapturedSource } from './source-instrumentation.ts';
import {
  expectedJavascriptFiles,
  maintainedSourceInventory,
  selectMaintainedSourcePaths,
} from './maintained-source-inventory.ts';
import type { PublishedFixtureIdentity } from './published-coverage-inputs.js';
import { classifyMaintainedSourcePath } from './ts-only-source-gate.ts';
import {
  assertPublishedCoverageInputs,
  parsePublishedGitBatch,
  publishedFixtureIdentity,
} from './published-coverage-inputs.ts';

export type InputDigest = { path: string; sha256: string };
export type FocusedDiagnosticSelection = {
  mode: 'focused-diagnostic';
  contour: string;
  sources: readonly string[];
  tests: readonly string[];
};
type QualityInputSelectionMode = 'current' | 'published-baseline-bun-native' | FocusedDiagnosticSelection;
type TestSelection = {
  baseline_ref?: string;
  package_script?: string;
  native_runner?: string;
  tests: string[];
  published_contract_inputs?: InputDigest[];
  published_fixture?: PublishedFixtureIdentity;
  published_execution?: {
    argv: string[];
    published_argv: string[];
    env_file: string;
    env: Record<string, string>;
    config: string;
    randomize: boolean;
    seed: number;
    env_expansion: boolean;
    telemetry: boolean;
    published_preload: string;
    active_preload: string;
    instrumentation_note: string;
    counter_trust_scope: string;
  };
} & (
  | { mode: 'full-current-test-set' | 'published-baseline-bun-native'; contour?: never; sources?: never }
  | { mode: 'focused-diagnostic'; contour: string; sources: string[] }
);
export type CoverageInputs = {
  sources: InputDigest[];
  source_fingerprint: string;
  tests: string[];
  test_selection: TestSelection;
  test_inputs: InputDigest[];
  test_fingerprint: string;
  tool_inputs: InputDigest[];
  tool_fingerprint: string;
  module_inputs: InputDigest[];
  input_bytes: Record<string, Buffer>;
};
type PublishedContract = {
  bytes: Map<string, Buffer>;
  sources: string[];
  testInputs: string[];
  tests: string[];
  fixture: PublishedFixtureIdentity;
  env: Record<string, string>;
  argv: string[];
  publishedArgv: string[];
};
export type FinalQualityProjectionInputs = {
  coverage: readonly string[];
  mutation: readonly string[];
  guard: readonly string[];
};
type QualityInputCapture = {
  sources: InputDigest[];
  testInputs: InputDigest[];
  testInputsAll: string[];
  testSelection: TestSelection;
  contractInputs: string[];
  inputBytes: Map<string, Buffer>;
  inputDigests: Map<string, InputDigest>;
  runtimeToolPaths: string[];
  sdkBuilderToolPaths?: string[];
  sdkFormationSourcePaths?: string[];
  executionImageToolPaths?: string[];
  publishedContract?: PublishedContract;
};
export type SdkFormationQualityInputCapture = {
  readonly selectedInputs: ReadonlyMap<string, Buffer>;
  readonly inputDigests: ReadonlyMap<string, string>;
};
const sdkFormationQualityInputs = new WeakMap<CoverageInputs, SdkFormationQualityInputCapture>();
const sdkFormationCaptureInputs = new WeakMap<QualityInputCapture, SdkFormationQualityInputCapture>();
const maxInputFileBytes = 4 * 1024 * 1024;
const maxInputBytes = 128 * 1024 * 1024;
const maxInputPaths = 20000;
let walkedPathCount = 0;
function enforceWalkBounds(directory: string, depth: number, entries: Dirent[]): void {
  walkedPathCount += entries.length;
  if (depth > 64 || walkedPathCount > maxInputPaths || entries.length > maxInputPaths)
    throw new Error(`Coverage input tree limit exceeded: ${directory}`);
}

export const coverageToolInputs: string[] = [
  '.bun-version',
  'bun.lock',
  'bunfig.toml',
  'package.json',
  'tooling/bun-coverage-evidence.ts',
  'tooling/coverage-instrumented-sources.ts',
  'tooling/source-instrumentation.ts',
  'tooling/coverage-gate.ts',
  'tooling/bun-coverage-preload.ts',
  'tooling/captured-json-module.ts',
  'tooling/captured-module-contents.ts',
  'tooling/bun-coverage-report-validator.ts',
  'tooling/crap-gate.ts',
  'tooling/mutation-partitions.ts',
  'tooling/coverage-math.ts',
  'tooling/coverage-counters.ts',
  'tooling/coverage-shard-plan.ts',
  'tooling/coverage-shard-eligibility.ts',
  'tooling/coverage-consumer-binding.ts',
  'tooling/coverage-shard-evidence.ts',
  'tooling/coverage-run-lock.ts',
  'tooling/owned-cleanup-completion.ts',
  'tooling/published-coverage-inputs.ts',
  'tooling/published-baseline-reference.ts',
  'tooling/fixture-child-observation.ts',
  'tooling/function-inventory.ts',
  'tooling/istanbul-public-api.d.ts',
  'tooling/maintained-source-inventory.ts',
  'tooling/run-bun-coverage.ts',
  'tooling/coverage-run-outcome.ts',
  'tooling/sdk-artifact-capture.ts',
  // Some legacy service tests select this adapter through a computed import,
  // so static runtime-import traversal cannot discover it before execution.
  'bin/local-release-artifacts.ts',
];

const executionImageConfigInputs = [
  'tsconfig.json',
  'tsconfig.checked-js.json',
  'bin/tsconfig.json',
  'tooling/quality-current.ts',
  'tooling/ts-only-source-gate.ts',
  'bin/bun.ts',
] as const;

export const sha256 = (bytes: string | Uint8Array): string => createHash('sha256').update(bytes).digest('hex');
export const canonicalJson = (value: unknown): string | undefined => JSON.stringify(value);
export function testSelectionFingerprint(
  selection: Pick<TestSelection, 'mode' | 'tests'>,
  files: readonly InputDigest[],
): string {
  const json = canonicalJson({ selection, files });
  if (json === undefined) throw new Error('Coverage test identity is not serializable.');
  return sha256(json);
}
/** Match Bun test's documented NODE_ENV default while binding every other string environment value exactly. */
export function coverageEnvironmentSha256(environment: NodeJS.ProcessEnv): string {
  const values = Object.fromEntries(
    Object.entries(environment).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  );
  if (values.NODE_ENV === undefined) values.NODE_ENV = 'test';
  if (values.TZ === undefined) values.TZ = 'Etc/UTC';
  const selected = Object.fromEntries(Object.entries(values).sort(([left], [right]) => left.localeCompare(right)));
  return sha256(canonicalJson(selected) ?? '');
}

/** Review-base clock policy only; exact child receipts keep coverageEnvironmentSha256. */
export function coverageReviewEnvironmentSha256(environment: NodeJS.ProcessEnv, wrappedInvocation = false): string {
  if (!wrappedInvocation) return coverageEnvironmentSha256(environment);
  const raw = environment.VIDA_COVERAGE_REVIEW_CLOCK_POLICY;
  const exact = () => coverageEnvironmentSha256(environment);
  if (typeof raw !== 'string' || raw.length > 4096) return exact();
  let policy: unknown;
  try {
    policy = JSON.parse(raw);
  } catch {
    return exact();
  }
  if (typeof policy !== 'object' || policy === null || Array.isArray(policy)) return exact();
  const keys = [
    'ancestor_duration_ms',
    'ancestor_expiry_ms',
    'budget_ms',
    'deadline_ms',
    'issued_at_ms',
    'maximum_ms',
    'original_duration_ms',
    'original_expiry_ms',
    'report_reserve_ms',
  ];
  if (Object.keys(policy).sort().join(',') !== keys.join(',')) return exact();
  const read = (key: string): unknown => Reflect.get(policy, key);
  const decimal = (value: unknown): value is string =>
    typeof value === 'string' && /^\d+$/u.test(value) && Number.isSafeInteger(Number(value));
  const ceilingKeys = ['ancestor_duration_ms', 'ancestor_expiry_ms', 'original_duration_ms', 'original_expiry_ms'];
  if (ceilingKeys.some((key) => read(key) !== null && !decimal(read(key)))) return exact();
  const maximum = read('maximum_ms'),
    issuedAt = read('issued_at_ms');
  if (
    typeof maximum !== 'number' ||
    !Number.isSafeInteger(maximum) ||
    maximum <= 0 ||
    maximum > 300000 ||
    read('report_reserve_ms') !== 30000 ||
    typeof issuedAt !== 'number' ||
    !Number.isSafeInteger(issuedAt) ||
    issuedAt < 0
  )
    return exact();
  const budgetText = read('budget_ms'),
    deadlineText = read('deadline_ms');
  if (
    !decimal(budgetText) ||
    !decimal(deadlineText) ||
    environment.VIDA_PINNED_COMMAND_BUDGET_MS !== budgetText ||
    environment.VIDA_PINNED_COMMAND_DEADLINE_MS !== deadlineText
  )
    return exact();
  const budget = Number(budgetText),
    deadline = Number(deadlineText);
  if (budget <= 0 || budget > maximum || deadline <= issuedAt || deadline - issuedAt > budget) return exact();
  for (const key of ceilingKeys) {
    const value = read(key);
    if (value !== null && (key.endsWith('duration_ms') ? budget : deadline) > Number(value)) return exact();
  }
  return coverageEnvironmentSha256({
    ...environment,
    VIDA_PINNED_COMMAND_BUDGET_MS: undefined,
    VIDA_PINNED_COMMAND_DEADLINE_MS: undefined,
    VIDA_COVERAGE_REVIEW_CLOCK_POLICY: JSON.stringify({
      maximum_ms: maximum,
      report_reserve_ms: 30000,
      ...Object.fromEntries(ceilingKeys.map((key) => [key, read(key)])),
    }),
  });
}
export const repositoryToolingInputPrefix = '_repository/tooling/agent';
const repositoryCompilerInputPrefix = '_repository/compiler';

function compilerRepositoryPath(relative: string): boolean {
  if (relative === 'package.json') return true;
  return (
    !relative.startsWith('packages/agent/') &&
    !relative.startsWith('tooling/agent/') &&
    classifyMaintainedSourcePath(relative) === 'typescript'
  );
}

function compilerRepositoryRelativePath(logical: string): string | null {
  const prefix = repositoryCompilerInputPrefix + '/';
  if (!logical.startsWith(prefix)) return null;
  const relative = logical.slice(prefix.length);
  return compilerRepositoryPath(relative) ? relative : null;
}
// Computed module loads are invisible to Bun's static import scanner. Keep
// their test-owned entrypoints explicit, then let the shared bounded closure
// capture each entrypoint's literal transitive imports and freshness inputs.
const computedModuleEntryPointsByTest: Readonly<Record<string, readonly string[]>> = Object.freeze({
  'tests/envelopes-boundary.test.ts': ['src/contracts/envelopes.ts'],
  'tests/fs-safe-attestation.test.ts': ['src/config/fs-safe-attestation.ts'],
  'tests/host-capability-boundary.test.ts': ['src/config/host-capability.ts'],
  'tests/project-upgrade-existing-storage.test.ts': ['src/config/project-upgrade-existing-storage.ts'],
  'tests/runtime-facade-boundary.test.ts': ['src/lifecycle/runtime-facade.ts'],
  'tests/bun/service-operation-launch-capability.test.ts': [`${repositoryToolingInputPrefix}/release-local.ts`],
});
export const repositoryTestContextInputPrefix = '_repository/test-context';
export const repositoryTestContextFiles: readonly string[] = Object.freeze([
  'agent-runtime.config.v1.yaml',
  'AGENTS.md',
  'AGENT.sidecar.md',
  'docs/agent-instructions/documentation-policy.v1.json',
]);
const repositoryTestContextPaths = new Map(
  repositoryTestContextFiles.map((file) => [`${repositoryTestContextInputPrefix}/${file}`, file]),
);

export function repositoryTestContextRelativePath(logicalPath: string): string | null {
  return repositoryTestContextPaths.get(logicalPath) ?? null;
}

export function repositoryRootForPackage(packageRoot: string): string | null {
  const packageBase = path.resolve(packageRoot);
  if (path.basename(packageBase) !== 'agent' || path.basename(path.dirname(packageBase)) !== 'packages') return null;
  return path.resolve(packageBase, '../..');
}

async function repositoryToolingInputPaths(packageRoot: string): Promise<string[]> {
  const repositoryRoot = repositoryRootForPackage(packageRoot);
  if (!repositoryRoot) return [];
  const repositoryEntries = await readdir(repositoryRoot, { withFileTypes: true });
  const toolingEntry = repositoryEntries.find((entry) => entry.name === 'tooling');
  if (!toolingEntry) return [];
  if (toolingEntry.isSymbolicLink())
    throw new Error(`Quality input symlink is not supported: ${path.join(repositoryRoot, toolingEntry.name)}`);
  if (!toolingEntry.isDirectory()) return [];
  const toolingRoot = path.join(repositoryRoot, 'tooling');
  const toolingEntries = await readdir(toolingRoot, { withFileTypes: true });
  const agentEntry = toolingEntries.find((entry) => entry.name === 'agent');
  if (!agentEntry) return [];
  if (agentEntry.isSymbolicLink())
    throw new Error(`Quality input symlink is not supported: ${path.join(toolingRoot, agentEntry.name)}`);
  if (!agentEntry.isDirectory()) return [];
  const repositoryPrefix = 'tooling/agent/';
  const paths = await walkFiles(repositoryRoot, path.join(repositoryRoot, 'tooling', 'agent'));
  return paths.map((file) => `${repositoryToolingInputPrefix}/${file.slice(repositoryPrefix.length)}`);
}

export function canonicalCapturedModulePath(packageRoot: string, absolutePath: string): string | null {
  const packageBase = path.resolve(packageRoot);
  const target = path.resolve(absolutePath);
  const packageRelative = path.relative(packageBase, target);
  if (packageRelative.split(path.sep)[0] === '_repository') return null;
  if (
    packageRelative !== '' &&
    packageRelative !== '..' &&
    !packageRelative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(packageRelative)
  )
    return packageRelative.split(path.sep).join('/');
  const repositoryBase = repositoryRootForPackage(packageBase);
  if (!repositoryBase) return null;
  const repositoryRelative = path.relative(repositoryBase, target);
  const contextPath = repositoryRelative.split(path.sep).join('/');
  if (repositoryTestContextFiles.includes(contextPath)) return `${repositoryTestContextInputPrefix}/${contextPath}`;
  const repositoryToolingPrefix = `tooling${path.sep}agent${path.sep}`;
  if (repositoryRelative.startsWith(repositoryToolingPrefix) && !path.isAbsolute(repositoryRelative))
    return `${repositoryToolingInputPrefix}/${repositoryRelative.slice(repositoryToolingPrefix.length).split(path.sep).join('/')}`;
  if (compilerRepositoryPath(contextPath)) return `${repositoryCompilerInputPrefix}/${contextPath}`;
  return null;
}

function requireCapturedInputPath(logicalPath: string): void {
  if (
    typeof logicalPath !== 'string' ||
    logicalPath.length === 0 ||
    logicalPath.includes('\\') ||
    logicalPath.includes('\0') ||
    path.posix.isAbsolute(logicalPath) ||
    path.win32.parse(logicalPath).root !== '' ||
    logicalPath.split('/').some((part) => part === '' || part === '.' || part === '..')
  )
    throw new Error(`Captured module path is malformed: ${String(logicalPath)}`);
  if (
    logicalPath === '_repository' ||
    (logicalPath.startsWith('_repository/') &&
      !logicalPath.startsWith(`${repositoryToolingInputPrefix}/`) &&
      compilerRepositoryRelativePath(logicalPath) === null &&
      repositoryTestContextRelativePath(logicalPath) === null)
  )
    throw new Error(`Captured module path is outside admitted roots: ${logicalPath}`);
}

export function capturedModuleAbsolutePath(packageRoot: string, logicalPath: string): string {
  requireCapturedInputPath(logicalPath);
  const packageBase = path.resolve(packageRoot);
  const repositoryPrefix = `${repositoryToolingInputPrefix}/`;
  const contextPath = repositoryTestContextRelativePath(logicalPath);
  const compilerPath = compilerRepositoryRelativePath(logicalPath);
  if (logicalPath.startsWith('_repository/') && !repositoryRootForPackage(packageBase))
    throw new Error(`Captured module path is outside admitted roots: ${logicalPath}`);
  const absolute =
    contextPath !== null || compilerPath !== null
      ? path.resolve(packageBase, '../..', contextPath ?? compilerPath!)
      : logicalPath.startsWith(repositoryPrefix)
        ? path.resolve(packageBase, '../..', 'tooling/agent', logicalPath.slice(repositoryPrefix.length))
        : path.resolve(packageBase, ...logicalPath.split('/'));
  if (canonicalCapturedModulePath(packageBase, absolute) !== logicalPath)
    throw new Error(`Captured module path is outside admitted roots: ${logicalPath}`);
  return absolute;
}

/** Preserve exact captured filenames; a Bun query alias may select only captured bytes. */
export function capturedModuleRequestPath(request: string, capturedPaths: ReadonlySet<string>): string {
  if (capturedPaths.has(request)) return request;
  for (let query = request.lastIndexOf('?'); query >= 0; query = request.lastIndexOf('?', query - 1)) {
    const file = request.slice(0, query);
    if (capturedPaths.has(file)) return file;
    if (query === 0) break;
  }
  return request;
}

export function isExternalModulePath(value: unknown): boolean {
  if (typeof value !== 'string' || value.length === 0) return false;
  if (path.posix.isAbsolute(value) || path.win32.isAbsolute(value) || /[\\\0]/u.test(value)) return false;
  const parts = value.split('/');
  if (parts.some((part) => part.length === 0 || part === '.' || part === '..')) return false;
  return !['src', 'bin', 'tests', 'tooling'].includes(parts[0] ?? '');
}

export function canonicalTestSelection(value: unknown): string | null {
  function sortKeys(item: unknown): unknown {
    if (Array.isArray(item)) return item.map(sortKeys);
    if (typeof item !== 'object' || item === null) return item;
    return Object.fromEntries(
      Object.entries(item)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, sortKeys(child)]),
    );
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  return JSON.stringify(sortKeys(value)) ?? null;
}
export const readBunPin = async (root: string): Promise<string> =>
  (await readFile(path.join(root, '.bun-version'), 'utf8')).trim();

const baselineRef = 'b549951';
const baselineCommit = 'b5499511e64b2165a8c97ae3d2b455b25b1ac5b6';

const publishedContracts = new Map<string, PublishedContract>();
const baselineContractPaths = [
  'package.json',
  'tooling/run-bun-native-coverage.mjs',
  'tooling/bun-native-coverage.env',
  'tooling/bun-coverage.toml',
  'tooling/bun-native-coverage-preload.mjs',
];
// Exact subjects/data referenced by the frozen tests and their selected tool branches.
const baselineFixtureToolPaths = [
  ...baselineContractPaths,
  '.bun-version',
  'bun.lock',
  'stryker.config.mjs',
  'vitest.config.mjs',
  'README.md',
  'TESTING.md',
  'tooling/maintained-source-inventory.mjs',
  'tooling/coverage-gate.mjs',
  'tooling/crap-gate.mjs',
  'tooling/mutation-gate.mjs',
  'tooling/v8-coverage.env',
];

function publishedGit(root: string, args: string[], options: { input?: string; maxBuffer?: number } = {}): Buffer {
  const result = spawnSync('git', args, {
    // Tree paths are repository-relative; Git otherwise prefixes package cwd
    // to every pathspec and silently returns an empty successful ls-tree.
    cwd: path.resolve(root, '../..'),
    // Default binary output also accepts UTF8 batch stdin in pinned Bun. Its
    // 'buffer' output alias is incorrectly reused as an input encoding there.
    timeout: 5000,
    maxBuffer: options.maxBuffer ?? 32 * 1024 * 1024,
    input: options.input,
    windowsHide: true,
  });
  if (result.error || result.signal || result.status !== 0)
    throw new Error(`Published baseline query is UNKNOWN: git ${args.join(' ')}`);
  return result.stdout;
}

function publishedManifest(bytes: Buffer): Record<string, unknown> {
  const value: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error('Published baseline package manifest is malformed.');
  const scripts =
    'scripts' in value && typeof value.scripts === 'object' && value.scripts !== null && !Array.isArray(value.scripts)
      ? value.scripts
      : undefined;
  const command = scripts && 'test:coverage:pinned' in scripts ? scripts['test:coverage:pinned'] : undefined;
  if (typeof command !== 'string' || !/(?:^|&&)\s*bun tooling\/run-bun-native-coverage\.mjs(?:\s|$)/u.test(command))
    throw new Error('Published baseline coverage command does not declare the Bun native runner.');
  return Object.fromEntries(Object.entries(value));
}

function publishedTestPaths(runner: string): string[] {
  const block = runner.match(/const nativeTests\s*=\s*\[([\s\S]*?)\];/u)?.[1];
  if (block === undefined) throw new Error('Published baseline Bun native test list is missing.');
  for (const option of [
    '--env-file=tooling/bun-native-coverage.env',
    '--parallel=1',
    '--no-isolate',
    './tooling/bun-native-coverage-preload.mjs',
    '--config=tooling/bun-coverage.toml',
  ])
    if (!runner.includes(option)) throw new Error(`Published baseline runner omits ${option}.`);
  const remainder = block.replace(/'[^'\r\n]*'/gu, '').replace(/[\s,]/gu, '');
  const tests = [...block.matchAll(/'([^'\r\n]*)'/gu)].map((match) => match[1] ?? '');
  if (
    remainder ||
    !tests.length ||
    new Set(tests).size !== tests.length ||
    tests.some(
      (file) =>
        !/^tests\/(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]+\.(?:test|spec)\.(?:js|mjs|cjs|jsx|ts|mts|cts|tsx)$/u.test(file),
    )
  )
    throw new Error('Published baseline Bun native test list is malformed.');
  return tests;
}

function requiredPublishedBytes(bytes: Map<string, Buffer>, file: string): Buffer {
  const value = bytes.get(file);
  if (!value) throw new Error(`Published baseline bytes are missing: ${file}`);
  return value;
}

function validatePublishedExecution(bytes: Map<string, Buffer>): void {
  const envText = new TextDecoder('utf-8', { fatal: true }).decode(bytes.get('tooling/bun-native-coverage.env'));
  const configText = new TextDecoder('utf-8', { fatal: true }).decode(bytes.get('tooling/bun-coverage.toml'));
  const expected = [
    'telemetry = false',
    'env = false',
    '',
    '[test]',
    'root = "./tests"',
    'randomize = true',
    'seed = 20260817',
    'coverage = true',
    'coverageReporter = ["text", "lcov"]',
    'coverageDir = "./coverage/bun"',
    'coverageThreshold = { lines = 0.0, functions = 0.0, statements = 0.0 }',
    'coverageSkipTestFiles = true',
    '',
  ].join('\n');
  if (!/^AGENT_RUNTIME_NATIVE_COVERAGE_MAIN=1\r?\n?$/u.test(envText) || configText !== expected)
    throw new Error('Published Bun env/config contract is unsupported.');
}

function capturePublishedBaselineContract(root: string): PublishedContract {
  const cached = publishedContracts.get(root);
  if (cached) return cached;
  const head = publishedGit(root, ['rev-parse', 'HEAD']).toString('utf8').trim();
  const resolved = publishedGit(root, [`rev-parse`, `${baselineRef}^{commit}`])
    .toString('utf8')
    .trim();
  if (head !== baselineCommit || resolved !== baselineCommit)
    throw new Error('Published baseline Bun selection requires an isolated b549951 checkout.');
  const bytes = new Map<string, Buffer>(
    baselineContractPaths.map((file): [string, Buffer] => [
      file,
      publishedGit(root, ['show', `${baselineRef}:packages/agent/${file}`]),
    ]),
  );
  const manifest = publishedManifest(requiredPublishedBytes(bytes, 'package.json'));
  if (!Array.isArray(manifest.files) || !manifest.files.every((file): file is string => typeof file === 'string'))
    throw new Error('Published package source inventory is invalid.');
  const tests = publishedTestPaths(
    new TextDecoder('utf-8', { fatal: true }).decode(
      requiredPublishedBytes(bytes, 'tooling/run-bun-native-coverage.mjs'),
    ),
  );
  const tree = new TextDecoder('utf-8', { fatal: true }).decode(
    publishedGit(root, [
      'ls-tree',
      '-r',
      '-z',
      baselineRef,
      '--',
      'packages/agent/src',
      'packages/agent/bin',
      'packages/agent/tests',
      'packages/agent/tooling',
      'packages/agent/schemas',
      'packages/agent/templates',
      'packages/agent/instructions',
      'packages/agent/docs',
      'packages/agent/README.md',
      'packages/agent/TESTING.md',
      'packages/agent/package.json',
      'packages/agent/.bun-version',
      'packages/agent/bun.lock',
      'packages/agent/stryker.config.mjs',
      'packages/agent/vitest.config.mjs',
    ]),
  );
  const entries = new Map<string, { mode: string; id: string }>();
  for (const record of tree.split('\0').filter(Boolean)) {
    const match = /^([0-7]{6}) blob ([0-9a-f]{40})\tpackages\/agent\/([^\r\n]+)$/u.exec(record);
    const mode = match?.[1];
    const id = match?.[2];
    const file = match?.[3];
    if (!mode || !id || !file || !isSafeProjectionPath(file) || entries.has(file))
      throw new Error('Published baseline input tree is malformed.');
    entries.set(file, { mode, id });
  }
  if (entries.size > maxInputPaths) throw new Error('Published baseline input path limit exceeded.');
  const sources = selectMaintainedSourcePaths(
    [...entries.keys()].filter((file) => /^src\/.+\.ts$|^bin\/.+\.mjs$/u.test(file)),
    manifest.files,
  );
  const testInputs = [...entries.keys()].filter((file) => file.startsWith('tests/')).sort();
  const resources = [...entries.keys()].filter((file) => /^(?:schemas|templates|instructions|docs)\//u.test(file));
  const inputs = [...new Set([...sources, ...testInputs, ...tests, ...baselineFixtureToolPaths, ...resources])].sort();
  const objectIds = new Set<string>();
  for (const file of inputs) {
    const entry = entries.get(file);
    if (!entry || !['100644', '100755'].includes(entry.mode))
      throw new Error(`Published baseline input is not a regular blob: ${file}`);
    if (!bytes.has(file)) objectIds.add(entry.id);
  }
  const ids = [...objectIds];
  const blobs = parsePublishedGitBatch(
    publishedGit(root, ['cat-file', '--batch'], {
      input: ids.map((id) => id + '\n').join(''),
      maxBuffer: maxInputBytes + maxInputPaths * 80,
    }),
    ids,
    maxInputFileBytes,
    maxInputBytes,
  );
  for (const file of inputs) {
    if (bytes.has(file)) continue;
    const entry = entries.get(file);
    const value = entry && blobs.get(entry.id);
    if (!value) throw new Error(`Published baseline blob is missing: ${file}`);
    bytes.set(file, value);
  }
  if (
    [...bytes.values()].some((value) => value.byteLength > maxInputFileBytes) ||
    [...bytes.values()].reduce((total, value) => total + value.byteLength, 0) > maxInputBytes
  )
    throw new Error('Published fixture bytes exceed their input limits.');
  const fixture = publishedFixtureIdentity(inputs, entries, bytes);
  validatePublishedExecution(bytes);
  const argv = [
    '--env-file=tooling/bun-native-coverage.env',
    'test',
    '--parallel=1',
    '--no-isolate',
    '--config=tooling/bun-coverage.toml',
    ...tests,
  ];
  const publishedArgv = [
    '--env-file=tooling/bun-native-coverage.env',
    'test',
    '--parallel=1',
    '--no-isolate',
    '--preload',
    './tooling/bun-native-coverage-preload.mjs',
    '--config=tooling/bun-coverage.toml',
    ...tests,
  ];
  const contract = {
    bytes,
    sources,
    testInputs,
    tests,
    fixture,
    env: { AGENT_RUNTIME_NATIVE_COVERAGE_MAIN: '1' },
    argv,
    publishedArgv,
  };
  publishedContracts.set(root, contract);
  return contract;
}

function publishedBaselineSelection(root: string): TestSelection {
  const contract = capturePublishedBaselineContract(root);
  const fixtureDigests = new Map<string, string>(
    contract.fixture.inputs.map((entry): [string, string] => [entry.path, entry.sha256]),
  );
  const published_contract_inputs = [...baselineContractPaths, ...contract.tests]
    .map((file) => {
      const digest = fixtureDigests.get(file);
      if (!digest) throw new Error('Published contract is absent from fixture custody: ' + file);
      return { path: file, sha256: digest };
    })
    .sort((left, right) => left.path.localeCompare(right.path));
  return {
    mode: 'published-baseline-bun-native',
    baseline_ref: baselineRef,
    package_script: 'test:coverage:pinned',
    native_runner: 'tooling/run-bun-native-coverage.mjs',
    tests: contract.tests,
    published_contract_inputs,
    published_fixture: contract.fixture,
    published_execution: {
      argv: contract.argv,
      published_argv: contract.publishedArgv,
      env_file: 'tooling/bun-native-coverage.env',
      env: contract.env,
      config: 'tooling/bun-coverage.toml',
      randomize: true,
      seed: 20260817,
      env_expansion: false,
      telemetry: false,
      published_preload: 'tooling/bun-native-coverage-preload.mjs',
      active_preload: 'tooling/bun-coverage-preload.ts',
      instrumentation_note:
        'Current Istanbul instrumentation replaces the published native preload. Published fixture tools execute only as frozen test subjects from a disjoint sealed tree, never as measurement/admission authority.',
      counter_trust_scope:
        'Selected source, test, and tooling bytes are fingerprinted trusted measurement inputs; live Istanbul counters are not authenticated against adversarial in-process test code.',
    },
  };
}

export function instrumentSource(
  ...args: Parameters<typeof instrumentCapturedSource>
): ReturnType<typeof instrumentCapturedSource> {
  // Mutation workers validate captured inputs without instrumenting Source. Keep
  // the synchronous instrumentation owner lazy, with a literal captured edge.
  const implementation = require('./source-instrumentation.ts') as typeof import('./source-instrumentation.ts');
  return implementation.instrumentSource(...args);
}

async function walkFiles(root: string, directory: string, depth = 0): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  enforceWalkBounds(directory, depth, entries);
  const nested = entries.map(async (entry): Promise<string[]> => {
    const absolute = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Quality input symlink is not supported: ${absolute}`);
    if (entry.isDirectory()) return walkFiles(root, absolute, depth + 1);
    if (!entry.isFile()) return [];
    return [path.relative(root, absolute).replaceAll('\\', '/')];
  });
  return (await Promise.all(nested)).flat().sort();
}

export function readBoundedInput(
  absolute: string,
  boundaryRoot: string,
  label: string,
  allowMissing: boolean,
): Buffer | null {
  const opened = openRootFileSync({
    absolutePath: absolute,
    rootPath: boundaryRoot,
    boundaryLabel: label,
    maxBytes: maxInputFileBytes,
    rejectHardlinks: true,
    rejectSymlinks: true,
    allowedType: 'file',
  });
  if (!opened.ok) {
    const code = (opened.error as NodeJS.ErrnoException | undefined)?.code;
    if (allowMissing && opened.reason === 'path' && (code === 'ENOENT' || code === 'ENOTDIR')) return null;
    throw new Error(`Coverage input rejected (${opened.reason}): ${absolute}`, { cause: opened.error });
  }
  const failures: unknown[] = [];
  let result: Buffer | undefined;
  try {
    const before = fstatSync(opened.fd, { bigint: true });
    if (!before.isFile() || before.nlink !== 1n || before.size > BigInt(maxInputFileBytes))
      throw new Error(`${label} file limit exceeded: ${absolute}`);
    result = readFileDescriptorBoundedSync(opened.fd, maxInputFileBytes);
    const after = fstatSync(opened.fd, { bigint: true });
    if (
      !after.isFile() ||
      after.dev !== before.dev ||
      after.ino !== before.ino ||
      after.nlink !== before.nlink ||
      after.size !== before.size ||
      after.mtimeNs !== before.mtimeNs ||
      after.ctimeNs !== before.ctimeNs ||
      result.length !== Number(before.size)
    )
      throw new Error(`${label} changed during bounded read: ${absolute}`);
  } catch (error) {
    failures.push(error);
  }
  try {
    closeSync(opened.fd);
  } catch (error) {
    failures.push(error);
  }
  if (failures.length === 1) throw failures[0];
  if (failures.length > 1) throw new AggregateError(failures, `${label} read and close failed: ${absolute}`);
  return result!;
}

function selectTestSelection(
  root: string,
  testInputsAll: string[],
  supportedTest: RegExp,
  mode: 'current' | 'published-baseline-bun-native',
): TestSelection {
  let selection: TestSelection;
  if (mode === 'current')
    selection = { mode: 'full-current-test-set', tests: testInputsAll.filter((file) => supportedTest.test(file)) };
  else if (mode === 'published-baseline-bun-native') selection = publishedBaselineSelection(root);
  else throw new Error('Unsupported Bun coverage test selection mode.');
  if (!selection.tests.length) throw new Error('Bun Test coverage selection is empty.');
  return selection;
}

function checkedFocusedDiagnosticSelection(
  selection: FocusedDiagnosticSelection,
  sources: readonly string[],
  supportedTests: readonly string[],
): TestSelection {
  if (typeof selection.contour !== 'string' || !selection.contour.trim())
    throw new Error('Focused diagnostic contour must be non-empty.');
  for (const [label, paths, inventoryName, inventory] of [
    ['source', selection.sources, 'maintained source inventory', sources],
    ['test', selection.tests, 'supported test inventory', supportedTests],
  ] as const) {
    if (!Array.isArray(paths) || paths.length === 0)
      throw new Error(`Focused diagnostic ${label} selection must be non-empty.`);
    if (!paths.every(isSafeProjectionPath))
      throw new Error(`Focused diagnostic ${label} selection contains an unsafe path.`);
    if (new Set(paths).size !== paths.length)
      throw new Error(`Focused diagnostic ${label} selection contains a duplicate path.`);
    const admitted = new Set(inventory);
    const foreign = paths.filter((file) => !admitted.has(file));
    if (foreign.length)
      throw new Error(`Focused diagnostic ${label} path is outside the ${inventoryName}: ${foreign.join(', ')}`);
  }
  return {
    mode: 'focused-diagnostic',
    contour: selection.contour,
    sources: [...selection.sources],
    tests: [...selection.tests],
  };
}

function qualityToolInputPaths(
  additionalToolInputs: readonly string[],
  contractInputs: readonly string[],
  mode: 'current' | 'published-baseline-bun-native',
): string[] {
  const baselineInputs = mode === 'published-baseline-bun-native' ? baselineContractPaths : [];
  return [...new Set([...coverageToolInputs, ...additionalToolInputs, ...contractInputs, ...baselineInputs])].sort();
}

export const sdkArtifactTestPath = 'tests/sdk-package-compatibility.test.ts';

/** Shared capture/review inventory; membership comes from selection and the maintained SDK owner. */
export function sdkFormationToolInputPaths(
  selectionMode: 'current' | 'published-baseline-bun-native',
  selection: TestSelection,
): string[] {
  if (selectionMode !== 'current' || !selection.tests.includes(sdkArtifactTestPath)) return [];
  return [
    'tooling/build-package.ts',
    'tsconfig.json',
    'dist/sdk-formation.json',
    ...expectedJavascriptFiles.map((file) => `dist/src/${file}`),
  ];
}

/** Incremental review membership only; execution still captures and verifies its full closure. */
export type CoverageReviewGitChange =
  | { status: 'A' | 'M' | 'D'; path: string }
  | { status: 'R'; old_path: string; path: string };
export type CoverageReviewInventory = Pick<
  CoverageInputs,
  'sources' | 'test_inputs' | 'tool_inputs' | 'test_selection'
>;
export type CoverageReviewInputPathResult = CoverageReviewInventory & {
  added_sources: string[];
  added_tests: string[];
  added_tools: string[];
  selected_tests: string[];
  refresh_paths: string[];
  removed_paths: string[];
  renamed_paths: { old_path: string; new_path: string }[];
};

function changedCapturedInputPaths(anchor: CoverageReviewInventory, current: CoverageReviewInventory): string[] {
  const anchorDigests = new Map(
    [...anchor.sources, ...anchor.test_inputs, ...anchor.tool_inputs].map(({ path: file, sha256: digest }) => [
      file,
      digest,
    ]),
  );
  return [...current.sources, ...current.test_inputs, ...current.tool_inputs]
    .filter((entry) => anchorDigests.has(entry.path) && anchorDigests.get(entry.path) !== entry.sha256)
    .map((entry) => entry.path);
}

export function coverageReviewInputPaths(
  anchor: CoverageReviewInventory,
  changes: readonly CoverageReviewGitChange[],
  current: CoverageReviewInventory,
): CoverageReviewInputPathResult {
  if (anchor.test_selection.mode !== 'full-current-test-set')
    throw new Error('Incremental review discovery requires a current test selection.');
  if (current.test_selection.mode !== 'full-current-test-set')
    throw new Error('Incremental review discovery requires a current test selection.');
  const anchorSources = new Set(anchor.sources.map((row) => row.path));
  const anchorTests = new Set(anchor.test_inputs.map((row) => row.path));
  const anchorTools = new Set(anchor.tool_inputs.map((row) => row.path));
  const currentSources = new Set(current.sources.map((row) => row.path));
  const currentTests = new Set(current.test_inputs.map((row) => row.path));
  const currentTools = new Set(current.tool_inputs.map((row) => row.path));
  const anchorPaths = new Set([...anchorSources, ...anchorTests, ...anchorTools]);
  const currentPaths = new Set([...currentSources, ...currentTests, ...currentTools]);
  const added_sources = [...currentSources].filter((file) => !anchorSources.has(file)).sort();
  const added_tests = [...currentTests].filter((file) => !anchorTests.has(file)).sort();
  const added_tools = [...currentTools].filter((file) => !anchorTools.has(file)).sort();
  const removed_paths = [...anchorPaths].filter((file) => !currentPaths.has(file)).sort();
  const changedPaths = new Set<string>();
  const renamed_paths = changes
    .filter((change): change is Extract<CoverageReviewGitChange, { status: 'R' }> => change.status === 'R')
    .map(({ old_path, path: new_path }) => ({ old_path, new_path }))
    .sort((left, right) =>
      left.old_path === right.old_path
        ? left.new_path.localeCompare(right.new_path)
        : left.old_path.localeCompare(right.old_path),
    );
  for (const change of changes) {
    if (change.status !== 'D') changedPaths.add(change.path);
  }
  const refresh_paths = [
    ...new Set([
      ...added_sources,
      ...added_tests,
      ...added_tools,
      ...changedPaths,
      ...changedCapturedInputPaths(anchor, current),
    ]),
  ]
    .filter((file) => currentPaths.has(file))
    .sort();
  return {
    sources: [...current.sources],
    test_inputs: [...current.test_inputs],
    tool_inputs: [...current.tool_inputs],
    test_selection: { ...current.test_selection, tests: [...current.test_selection.tests] },
    added_sources,
    added_tests,
    added_tools,
    selected_tests: [...current.test_selection.tests],
    refresh_paths,
    removed_paths,
    renamed_paths,
  };
}

function verifyPublishedBaselineInputs(
  root: string,
  inputBytes: Map<string, Buffer>,
  sources: readonly string[],
  tests: readonly string[],
): void {
  const contract = capturePublishedBaselineContract(root);
  assertPublishedCoverageInputs(
    { sources: contract.sources, tests: contract.testInputs },
    { sources, tests },
    contract.bytes,
    inputBytes,
  );
  for (const file of baselineContractPaths) {
    const published = requiredPublishedBytes(contract.bytes, file);
    const actual = inputBytes.get(file);
    if (!actual || !actual.equals(published))
      throw new Error(`Published baseline input bytes differ from ${baselineRef}: ${file}`);
  }
}

export async function readQualityInputs(
  root: string,
  files: readonly string[],
  location: 'live' | 'snapshot' = 'live',
): Promise<Map<string, Buffer>> {
  if (!Array.isArray(files) || files.length > maxInputPaths) throw new Error('Coverage input path limit exceeded.');
  // Validate the complete finite selection before opening any path. Sorting and
  // deduplication make a repeated selection share one retained byte capture.
  const declared: readonly unknown[] = files;
  const selected = [...new Set(declared)]
    .map((file) => {
      if (typeof file !== 'string') throw new Error('Captured module path must be a string.');
      requireCapturedInputPath(file);
      return {
        file,
        absolute:
          location === 'snapshot' ? path.resolve(root, ...file.split('/')) : capturedModuleAbsolutePath(root, file),
        boundary: location === 'snapshot' ? root : capturedModuleBoundaryRoot(root, file),
      };
    })
    .sort((left, right) => left.file.localeCompare(right.file));
  const result = new Map<string, Buffer>();
  let total = 0;
  for (const { file, absolute, boundary } of selected) {
    const bytes = readBoundedInput(absolute, boundary, 'Coverage input', false);
    if (!bytes) throw new Error(`Coverage input is missing: ${file}`);
    total += bytes.byteLength;
    if (total > maxInputBytes) throw new Error('Coverage input aggregate byte limit exceeded.');
    result.set(file, bytes);
  }
  return result;
}

function capturedModuleBoundaryRoot(packageRoot: string, logicalPath: string): string {
  return logicalPath.startsWith('_repository/') ? path.resolve(packageRoot, '../..') : packageRoot;
}

const runtimeSourceExtension = /\.(?:[cm]?js|jsx|[cm]?ts|tsx)$/u;
const importResolutionExtensions = [
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.txt',
  '.yaml',
  '.yml',
  '.toml',
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.wasm',
  '.xml',
  '.csv',
  '.md',
];
const declaredRuntimeRoots = ['src', 'bin', 'tests', 'tooling'];
const resourceRoots = ['schemas', 'templates', 'instructions'];

function importScanLoader(file: string): 'ts' | 'tsx' | 'js' | 'jsx' {
  const extension = path.extname(file);
  return extension === '.tsx' ? 'tsx' : extension === '.jsx' ? 'jsx' : /^(?:\.[mc]?ts)$/u.test(extension) ? 'ts' : 'js';
}

function importScanSource(file: string): boolean {
  return runtimeSourceExtension.test(file);
}

function importCandidates(packageRoot: string, importer: string, specifier: string): string[] {
  if (!specifier || /[\\\0]/u.test(specifier) || path.posix.isAbsolute(specifier) || path.win32.isAbsolute(specifier))
    throw new Error(`Unsupported local runtime import from ${importer}: ${specifier}`);
  const importerPath = capturedModuleAbsolutePath(packageRoot, importer);
  const resolvedAbsolute = path.resolve(path.dirname(importerPath), specifier);
  const resolved = canonicalCapturedModulePath(packageRoot, resolvedAbsolute);
  if (!resolved) throw new Error(`Local runtime import is outside admitted package roots: ${importer} -> ${specifier}`);
  const root = resolved.split('/')[0] ?? '';
  const packageMetadata = resolved === 'package.json';
  const packageDeveloperConfig = !resolved.includes('/') && /^[^/]+\.config\.ts$/u.test(resolved);
  if (
    !resolved.startsWith(`${repositoryToolingInputPrefix}/`) &&
    ![...declaredRuntimeRoots, ...resourceRoots].includes(root) &&
    !packageMetadata &&
    !packageDeveloperConfig
  )
    throw new Error(`Local runtime import is outside admitted package roots: ${importer} -> ${specifier}`);
  const extension = path.posix.extname(resolved);
  const candidates = new Set<string>(extension ? [resolved] : []);
  const sourceAliases: Record<string, string[]> = {
    '.js': ['.ts', '.tsx', '.mts', '.cts'],
    '.jsx': ['.tsx', '.ts'],
    '.mjs': ['.mts', '.ts'],
    '.cjs': ['.cts', '.ts'],
  };
  for (const replacement of sourceAliases[extension] ?? [])
    candidates.add(resolved.slice(0, -extension.length) + replacement);
  if (!extension) {
    for (const suffix of importResolutionExtensions) candidates.add(resolved + suffix);
    for (const suffix of importResolutionExtensions) candidates.add(path.posix.join(resolved, 'index' + suffix));
  }
  return [...candidates];
}

function readDiscoveredRuntimeInput(packageRoot: string, logicalPath: string): Buffer | null {
  return readBoundedInput(
    capturedModuleAbsolutePath(packageRoot, logicalPath),
    capturedModuleBoundaryRoot(packageRoot, logicalPath),
    'Coverage runtime module',
    true,
  );
}

export async function captureRuntimeInputClosure(
  root: string,
  entrypoints: readonly string[],
  sourcePaths: readonly string[],
  testPaths: readonly string[],
  inputBytes: Map<string, Buffer>,
  observeResolvedEdge?: (importer: string, resolved: string) => void,
): Promise<string[]> {
  const scanners = new Map<Bun.Loader, Bun.Transpiler>();
  const sources = new Set(sourcePaths);
  const tests = new Set(testPaths);
  const visited = new Set<string>();
  const queued = [...entrypoints];
  const runtimeTools = new Set<string>();
  let capturedBytes = [...inputBytes.values()].reduce((total, bytes) => total + bytes.byteLength, 0);
  while (queued.length) {
    const importer = queued.pop();
    if (!importer || visited.has(importer)) continue;
    visited.add(importer);
    const bytes = inputBytes.get(importer);
    if (!bytes) throw new Error(`Coverage input snapshot is missing: ${importer}`);
    const firstPathPart = importer.split('/')[0] ?? '';
    if (
      !sources.has(importer) &&
      !tests.has(importer) &&
      !(resourceRoots.includes(firstPathPart) && inputBytes.has(importer))
    )
      runtimeTools.add(importer);
    if (!importScanSource(importer)) continue;
    const loader = importScanLoader(importer);
    let scanner = scanners.get(loader);
    if (!scanner) {
      scanner = new Bun.Transpiler({ loader, target: 'bun' });
      scanners.set(loader, scanner);
    }
    const source = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    // Bun's import scanner does not accept ECMAScript's location-sensitive hashbang comment.
    // Hide only a hashbang at byte-decoded offset zero, leaving its line terminator and all
    // captured bytes intact for every other inventory and fingerprint consumer.
    const scanSource = source.startsWith('#!') ? source.replace(/^#![^\r\n\u2028\u2029]*/u, '') : source;
    let requests: ReturnType<Bun.Transpiler['scanImports']>;
    try {
      requests = scanner.scanImports(scanSource);
    } catch (cause) {
      throw new Error(`Unable to scan captured runtime imports from ${importer}.`, { cause });
    }
    if (requests.some((request) => request.path === 'vitest'))
      throw new Error(`Bun Test qualification cannot include a Vitest-owned test before migration: ${importer}`);
    for (const request of requests) {
      const specifier = request.path;
      if (!specifier.startsWith('.')) {
        if (
          specifier.startsWith('/') ||
          path.win32.isAbsolute(specifier) ||
          [...declaredRuntimeRoots, ...resourceRoots].some((directory) => specifier.startsWith(directory + '/'))
        )
          throw new Error(`Unsupported package-local runtime import from ${importer}: ${specifier}`);
        continue;
      }
      let resolved: string | undefined;
      for (const candidate of importCandidates(root, importer, specifier)) {
        if (inputBytes.has(candidate)) {
          resolved = candidate;
          break;
        }
        if (candidate === 'package.json') continue;
        const discovered = readDiscoveredRuntimeInput(root, candidate);
        if (discovered) {
          capturedBytes += discovered.byteLength;
          if (capturedBytes > maxInputBytes) throw new Error('Coverage input aggregate byte limit exceeded.');
          if (inputBytes.size + 1 > maxInputPaths) throw new Error('Coverage input path limit exceeded.');
          inputBytes.set(candidate, discovered);
          resolved = candidate;
          break;
        }
      }
      if (!resolved) throw new Error(`Unresolved package-local runtime import: ${importer} -> ${specifier}`);
      observeResolvedEdge?.(importer, resolved);
      queued.push(resolved);
    }
  }
  return [...new Set([...runtimeTools, ...captureConfiguredTestContextInputs(root, visited, inputBytes)])].sort();
}

function captureConfiguredTestContextInputs(
  root: string,
  visited: ReadonlySet<string>,
  inputBytes: Map<string, Buffer>,
): string[] {
  const paths = visited.has('tests/configured-context.ts')
    ? repositoryTestContextFiles.map((file) => `${repositoryTestContextInputPrefix}/${file}`)
    : [];
  // This helper reads package data through fs rather than a module import.
  // Bind it once for all importing tests, without adding it to unrelated scopes.
  if (visited.has('tests/helpers/documentation-policy-fixture.ts')) paths.push('TESTING.md');
  for (const file of paths) {
    if (inputBytes.has(file)) continue;
    const bytes = readDiscoveredRuntimeInput(root, file);
    if (!bytes) throw new Error(`Configured test context input is missing: ${file}`);
    inputBytes.set(file, bytes);
  }
  // The shared final projection enforces the combined path/byte ceilings before
  // any captured image is returned; each added file also uses the bounded reader.
  return paths;
}

function reachableSdkBuilderToolPaths(
  entrypoint: string,
  edges: ReadonlyMap<string, ReadonlySet<string>>,
  sourcePaths: readonly string[],
  testPaths: readonly string[],
  schemaPaths: readonly string[],
): string[] {
  const sources = new Set(sourcePaths);
  const tests = new Set(testPaths);
  const schemas = new Set(schemaPaths);
  const selectedBase = new Set(['package.json', 'bun.lock', '.bun-version', 'bunfig.toml', 'tsconfig.json']);
  const visited = new Set<string>();
  const pending = [entrypoint];
  while (pending.length) {
    const current = pending.pop();
    if (!current || visited.has(current)) continue;
    visited.add(current);
    for (const resolved of edges.get(current) ?? []) pending.push(resolved);
  }
  return [...visited]
    .filter(
      (file) =>
        file !== entrypoint &&
        !sources.has(file) &&
        !tests.has(file) &&
        !schemas.has(file) &&
        !selectedBase.has(file) &&
        !resourceRoots.some((directory) => file.startsWith(`${directory}/`)),
    )
    .sort();
}

// Types above keep the three projections bound to one captured input snapshot.

function isSafeProjectionPath(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    !value.includes('\\') &&
    !value.includes('\0') &&
    !path.posix.isAbsolute(value) &&
    path.win32.parse(value).root === '' &&
    !value.split('/').some((part) => part === '' || part === '.' || part === '..')
  );
}

function checkedFinalQualityProjectionInputs(value: unknown): FinalQualityProjectionInputs {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error('Final quality projections must be a named object.');
  const names = Object.keys(value).sort();
  if (names.join(',') !== 'coverage,guard,mutation')
    throw new Error('Final quality projections must include exactly coverage, mutation and guard.');
  let coverage: readonly string[] = [];
  let mutation: readonly string[] = [];
  let guard: readonly string[] = [];
  for (const name of names) {
    let paths: unknown;
    if (name === 'coverage' && 'coverage' in value) paths = value.coverage;
    else if (name === 'mutation' && 'mutation' in value) paths = value.mutation;
    else if ('guard' in value) paths = value.guard;
    if (!Array.isArray(paths)) throw new Error(`Final quality projection paths are malformed: ${name}`);
    const pathValues: readonly unknown[] = paths;
    if (!pathValues.every(isSafeProjectionPath))
      throw new Error(`Final quality projection paths are malformed: ${name}`);
    const checked = [...pathValues];
    if (name === 'coverage') coverage = Object.freeze(checked);
    else if (name === 'mutation') mutation = Object.freeze(checked);
    else guard = Object.freeze(checked);
  }
  return Object.freeze({ coverage, mutation, guard });
}

async function captureQualityInputBase(
  root: string,
  additionalToolInputs: readonly string[],
  selection: QualityInputSelectionMode,
  runtimeToolEntrypoints: readonly string[] = [],
  executionImage = false,
  semanticToolInputs: readonly string[] = [],
): Promise<QualityInputCapture> {
  const focused = typeof selection === 'string' ? undefined : selection;
  const selectionMode = typeof selection === 'string' ? selection : 'current';
  walkedPathCount = 0;
  const inventory = maintainedSourceInventory(root);
  const maintainedSources = inventory.mutationSources;
  if (!maintainedSources.length || maintainedSources.some((file) => !/^src\/.+\.ts$|^bin\/.+\.(?:mjs|ts)$/u.test(file)))
    throw new Error('Maintained coverage inventory is empty or contains an unsupported source path.');
  const testInputsAll = await walkFiles(root, path.join(root, 'tests'));
  const supportedTest = /\.(?:test|spec)\.(?:js|mjs|cjs|jsx|ts|mts|cts|tsx)$/u;
  const testLike = /\.(?:test|spec)\./u;
  const unsupported = testInputsAll.filter((file) => testLike.test(file) && !supportedTest.test(file));
  if (unsupported.length) throw new Error(`Unsupported Bun test extension: ${unsupported.join(', ')}`);
  const supportedTests = testInputsAll.filter((file) => supportedTest.test(file));
  const testSelection = focused
    ? checkedFocusedDiagnosticSelection(focused, maintainedSources, supportedTests)
    : selectTestSelection(root, testInputsAll, supportedTest, selectionMode);
  const sources = testSelection.mode === 'focused-diagnostic' ? testSelection.sources : maintainedSources;
  const sdkFormationSourcePaths =
    focused && testSelection.tests.includes(sdkArtifactTestPath)
      ? maintainedSources.filter((file) => file.startsWith('src/'))
      : undefined;
  const capturedTestPaths = focused ? testSelection.tests : testInputsAll;
  const contractInputs = (
    await Promise.all(
      ['schemas', 'templates', 'instructions'].map((directory) => walkFiles(root, path.join(root, directory))),
    )
  ).flat();
  const repositoryToolInputs = selectionMode === 'current' ? await repositoryToolingInputPaths(root) : [];
  const sdkFormationTools = sdkFormationToolInputPaths(selectionMode, testSelection);
  const tools = qualityToolInputPaths(
    [
      ...additionalToolInputs,
      ...sdkFormationTools,
      ...repositoryToolInputs,
      ...(executionImage ? [...maintainedSources, ...executionImageConfigInputs, ...semanticToolInputs] : []),
    ],
    contractInputs,
    selectionMode,
  );
  const runtimeEntrypoints = [...testSelection.tests, ...runtimeToolEntrypoints];
  for (const testPath of selectionMode === 'current' ? testSelection.tests : [])
    runtimeEntrypoints.push(...(computedModuleEntryPointsByTest[testPath] ?? []));
  const allInputs = [
    ...new Set([...sources, ...(sdkFormationSourcePaths ?? []), ...capturedTestPaths, ...runtimeEntrypoints, ...tools]),
  ].sort();
  const inputBytes = await readQualityInputs(root, allInputs);
  if (selectionMode === 'published-baseline-bun-native')
    verifyPublishedBaselineInputs(root, inputBytes, sources, testInputsAll);
  const sdkBuilderEntrypoint =
    selectionMode === 'current' &&
    inputBytes.has('tooling/build-package.ts') &&
    (!executionImage || testSelection.tests.includes(sdkArtifactTestPath))
      ? 'tooling/build-package.ts'
      : undefined;
  const sdkBuilderEdges = new Map<string, Set<string>>();
  const runtimeTestPaths = focused ? testSelection.tests : testInputsAll;
  if (sdkBuilderEntrypoint) runtimeEntrypoints.push(sdkBuilderEntrypoint);
  const runtimeToolPaths =
    selectionMode === 'current'
      ? await captureRuntimeInputClosure(
          root,
          runtimeEntrypoints,
          sources,
          runtimeTestPaths,
          inputBytes,
          sdkBuilderEntrypoint
            ? (importer, resolved) => {
                const children = sdkBuilderEdges.get(importer) ?? new Set<string>();
                children.add(resolved);
                sdkBuilderEdges.set(importer, children);
              }
            : undefined,
        )
      : [];
  const sdkBuilderToolPaths = sdkBuilderEntrypoint
    ? reachableSdkBuilderToolPaths(
        sdkBuilderEntrypoint,
        sdkBuilderEdges,
        sdkFormationSourcePaths ?? sources.filter((file) => file.startsWith('src/')),
        [],
        contractInputs.filter((file) => file.startsWith('schemas/')),
      )
    : undefined;
  const capturedTestInputs = focused
    ? [...new Set([...capturedTestPaths, ...runtimeToolPaths.filter((file) => file.startsWith('tests/'))])].sort()
    : capturedTestPaths;
  const capturedRuntimeTools = focused
    ? runtimeToolPaths.filter((file) => !file.startsWith('tests/'))
    : runtimeToolPaths;
  const digestPaths = [
    ...new Set([
      ...sources,
      ...(sdkFormationSourcePaths ?? []),
      ...capturedTestInputs,
      ...tools,
      ...capturedRuntimeTools,
    ]),
  ];
  const inputDigests = new Map(
    digestPaths.map((file) => {
      const bytes = inputBytes.get(file);
      if (!bytes) throw new Error(`Coverage input snapshot is missing: ${file}`);
      return [file, { path: file, sha256: sha256(bytes) }];
    }),
  );
  const sourceInputs = qualityInputDigests(sources, inputBytes, inputDigests);
  const testInputs = qualityInputDigests(capturedTestInputs, inputBytes, inputDigests);
  return {
    sources: sourceInputs,
    testInputs,
    testInputsAll,
    testSelection,
    contractInputs,
    inputBytes,
    inputDigests,
    runtimeToolPaths: [...new Set([...capturedRuntimeTools, ...repositoryToolInputs])].sort(),
    ...(sdkBuilderToolPaths ? { sdkBuilderToolPaths } : {}),
    ...(sdkFormationSourcePaths ? { sdkFormationSourcePaths } : {}),
    ...(executionImage
      ? { executionImageToolPaths: [...maintainedSources, ...executionImageConfigInputs, ...semanticToolInputs] }
      : {}),
    ...(selectionMode === 'published-baseline-bun-native'
      ? { publishedContract: capturePublishedBaselineContract(root) }
      : {}),
  };
}

function qualityInputDigests(
  files: readonly string[],
  inputBytes: Map<string, Buffer>,
  knownDigests?: Map<string, InputDigest>,
): InputDigest[] {
  return files.map((file) => {
    const known = knownDigests?.get(file);
    if (known) return known;
    const bytes = inputBytes.get(file);
    if (!bytes) throw new Error(`Coverage input snapshot is missing: ${file}`);
    return { path: file, sha256: sha256(bytes) };
  });
}

async function projectQualityInputCapture(
  capture: QualityInputCapture,
  additionalToolInputs: readonly string[],
  selectionMode: 'current' | 'published-baseline-bun-native',
): Promise<CoverageInputs> {
  const tools = [
    ...new Set([
      ...qualityToolInputPaths(additionalToolInputs, capture.contractInputs, selectionMode),
      ...capture.runtimeToolPaths,
      ...(capture.executionImageToolPaths ?? []),
      ...sdkFormationToolInputPaths(selectionMode, capture.testSelection),
      ...(capture.sdkFormationSourcePaths ?? []).filter(
        (file) => !capture.sources.some((entry) => entry.path === file),
      ),
    ]),
  ].sort();
  const sources = capture.sources;
  const sourceJson = canonicalJson(sources);
  if (sourceJson === undefined) throw new Error('Coverage source identity is not serializable.');
  const sourceFingerprint = sha256(sourceJson);
  const testFingerprint = testSelectionFingerprint(capture.testSelection, capture.testInputs);
  const toolInputs = qualityInputDigests(tools, capture.inputBytes, capture.inputDigests);
  const toolJson = canonicalJson(toolInputs);
  if (toolJson === undefined) throw new Error('Coverage tool identity is not serializable.');
  const projectedPaths = [
    ...new Set([...sources.map((entry) => entry.path), ...capture.testInputs.map((entry) => entry.path), ...tools]),
  ].sort();
  const inputBytes: Record<string, Buffer> = {};
  for (const file of projectedPaths) {
    const bytes = capture.inputBytes.get(file);
    if (!bytes) throw new Error(`Coverage input snapshot is missing: ${file}`);
    inputBytes[file] = bytes;
  }
  if (selectionMode === 'published-baseline-bun-native') {
    const fixture = capture.testSelection.published_fixture;
    if (!fixture) throw new Error('Published fixture identity is missing.');
    // The contract cache supplies original Git blobs; current tools never overwrite them.
    const contract = capture.publishedContract;
    if (!contract) throw new Error('Published fixture bytes are missing.');
    for (const entry of fixture.inputs)
      inputBytes[fixture.directory + '/' + entry.path] = requiredPublishedBytes(contract.bytes, entry.path);
  }
  if (
    Object.keys(inputBytes).length > maxInputPaths ||
    Object.values(inputBytes).reduce((total, value) => total + value.byteLength, 0) > maxInputBytes
  )
    throw new Error('Combined fixture/measurement snapshot exceeds its input limits.');
  const projected: CoverageInputs = {
    sources,
    source_fingerprint: sourceFingerprint,
    tests: capture.testSelection.tests,
    test_selection: capture.testSelection,
    test_inputs: capture.testInputs,
    test_fingerprint: testFingerprint,
    tool_inputs: toolInputs,
    tool_fingerprint: sha256(toolJson),
    module_inputs: capturedModuleInputs({
      sources: capture.sources,
      test_inputs: capture.testInputs,
      tool_inputs: toolInputs,
    }),
    input_bytes: inputBytes,
  };
  if (selectionMode === 'current' && capture.sdkBuilderToolPaths) {
    sdkFormationQualityInputs.set(projected, await sdkFormationInputsForCapture(capture));
  }
  return projected;
}

async function sdkFormationInputsForCapture(capture: QualityInputCapture): Promise<SdkFormationQualityInputCapture> {
  const retained = sdkFormationCaptureInputs.get(capture);
  if (retained) return retained;
  const { projectSdkFormationInputBytes } = await import('./build-package.ts');
  const selectedInputs = projectSdkFormationInputBytes({
    inputBytes: capture.inputBytes,
    sourcePaths:
      capture.sdkFormationSourcePaths ??
      capture.sources.map((entry) => entry.path).filter((file) => file.startsWith('src/')),
    schemaPaths: capture.contractInputs.filter((file) => file.startsWith('schemas/')),
    buildToolPaths: capture.sdkBuilderToolPaths ?? [],
  });
  const inputDigests = new Map<string, string>();
  for (const file of selectedInputs.keys()) {
    const digest = capture.inputDigests.get(file)?.sha256;
    if (!digest) throw new Error(`SDK formation capture is missing the selected input digest: ${file}`);
    inputDigests.set(file, digest);
  }
  const snapshot = Object.freeze({
    selectedInputs: new Map([...selectedInputs].map(([file, bytes]) => [file, Buffer.from(bytes)] as const)),
    inputDigests,
  });
  sdkFormationCaptureInputs.set(capture, snapshot);
  return snapshot;
}

/** Return the SDK projection tied to this exact current quality capture. */
export function sdkFormationInputsFromQualityCapture(inputs: CoverageInputs): SdkFormationQualityInputCapture {
  const captured = sdkFormationQualityInputs.get(inputs);
  if (!captured) throw new Error('SDK formation inputs are unavailable for this quality capture.');
  for (const [file, snapshot] of captured.selectedInputs) {
    const exposed = inputs.input_bytes[file];
    if (!Buffer.isBuffer(exposed) || !exposed.equals(snapshot))
      throw new Error(`SDK formation quality capture bytes changed: ${file}`);
  }
  return Object.freeze({
    selectedInputs: new Map([...captured.selectedInputs].map(([file, bytes]) => [file, Buffer.from(bytes)])),
    inputDigests: new Map(captured.inputDigests),
  });
}

/** Return the exact SDK formation path and digest rows for an image manifest. */
export function sdkFormationInputDigestsFromQualityCapture(inputs: CoverageInputs): readonly InputDigest[] | null {
  const requiresSdkFormation =
    (inputs.test_selection.mode === 'full-current-test-set' || inputs.test_selection.mode === 'focused-diagnostic') &&
    inputs.tests.includes(sdkArtifactTestPath);
  if (!requiresSdkFormation) return null;
  const snapshot = sdkFormationInputsFromQualityCapture(inputs);
  return Object.freeze(
    [...snapshot.inputDigests]
      .map(([file, digest]) => Object.freeze({ path: file, sha256: digest }))
      .sort((left, right) => left.path.localeCompare(right.path)),
  );
}

/** Restore SDK ownership from image bytes and require the existing formation receipt to match exactly. */
function checkedSdkImageRow(row: unknown): InputDigest {
  if (typeof row !== 'object' || row === null || Array.isArray(row))
    throw new Error('SDK formation input rows are malformed.');
  if (!('path' in row) || !('sha256' in row)) throw new Error('SDK formation input rows are malformed.');
  if (
    typeof row.path !== 'string' ||
    !isSafeProjectionPath(row.path) ||
    typeof row.sha256 !== 'string' ||
    !/^[a-f0-9]{64}$/u.test(row.sha256)
  )
    throw new Error('SDK formation input rows are malformed.');
  return { path: row.path, sha256: row.sha256 };
}

function sdkImageSnapshot(inputs: CoverageInputs, rows: readonly InputDigest[]): SdkFormationQualityInputCapture {
  const selectedInputs = new Map<string, Buffer>();
  const inputDigests = new Map<string, string>();
  for (const value of rows as readonly unknown[]) {
    const row = checkedSdkImageRow(value);
    if (inputDigests.has(row.path)) throw new Error(`SDK formation input row is duplicated: ${row.path}`);
    const bytes = inputs.input_bytes[row.path];
    if (!Buffer.isBuffer(bytes)) throw new Error(`SDK formation image input is missing: ${row.path}`);
    if (sha256(bytes) !== row.sha256) throw new Error(`SDK formation image input digest changed: ${row.path}`);
    selectedInputs.set(row.path, Buffer.from(bytes));
    inputDigests.set(row.path, row.sha256);
  }
  return Object.freeze({ selectedInputs, inputDigests });
}

export async function restoreSdkFormationInputsFromQualityCapture(
  root: string,
  inputs: CoverageInputs,
  rows: readonly InputDigest[] | null,
): Promise<void> {
  const requiresSdkFormation =
    (inputs.test_selection.mode === 'full-current-test-set' || inputs.test_selection.mode === 'focused-diagnostic') &&
    inputs.tests.includes(sdkArtifactTestPath);
  if (!requiresSdkFormation) {
    if (rows !== null) throw new Error('SDK formation rows are not permitted for a non-SDK test selection.');
    sdkFormationQualityInputs.delete(inputs);
    return;
  }
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('SDK formation input rows are incomplete.');
  const snapshot = sdkImageSnapshot(inputs, rows);
  sdkFormationQualityInputs.set(inputs, snapshot);
  try {
    const artifactPaths = ['dist/sdk-formation.json', ...expectedJavascriptFiles.map((file) => `dist/src/${file}`)];
    const artifacts = new Map<string, Buffer>();
    for (const file of artifactPaths) {
      const bytes = inputs.input_bytes[file];
      if (!Buffer.isBuffer(bytes)) throw new Error(`Captured SDK formation artifact is missing: ${file}`);
      artifacts.set(file, bytes);
    }
    const { captureSelectedSdkJavascriptOutputsFromCapturedBytes } = await import('./sdk-artifact-capture.ts');
    captureSelectedSdkJavascriptOutputsFromCapturedBytes(
      root,
      sdkFormationInputsFromQualityCapture(inputs).selectedInputs,
      artifacts,
    );
  } catch (error) {
    sdkFormationQualityInputs.delete(inputs);
    throw error;
  }
}

function freezeQualityProjection(inputs: CoverageInputs): CoverageInputs {
  for (const entries of [inputs.sources, inputs.test_inputs, inputs.tool_inputs, inputs.module_inputs]) {
    for (const entry of entries) Object.freeze(entry);
    Object.freeze(entries);
  }
  Object.freeze(inputs.tests);
  Object.freeze(inputs.test_selection.tests);
  Object.freeze(inputs.test_selection);
  Object.freeze(inputs.input_bytes);
  return Object.freeze(inputs);
}

export async function qualityInputProjections(
  root: string,
  projections: unknown,
): Promise<{ coverage: CoverageInputs; mutation: CoverageInputs; guard: CoverageInputs }> {
  const checked = checkedFinalQualityProjectionInputs(projections);
  const unionAdditionalTools = [...new Set([...checked.coverage, ...checked.mutation, ...checked.guard])].sort();
  const capture = await captureQualityInputBase(root, unionAdditionalTools, 'current');
  return Object.freeze({
    coverage: freezeQualityProjection(await projectQualityInputCapture(capture, checked.coverage, 'current')),
    mutation: freezeQualityProjection(await projectQualityInputCapture(capture, checked.mutation, 'current')),
    guard: freezeQualityProjection(await projectQualityInputCapture(capture, checked.guard, 'current')),
  });
}

export async function qualityInputs(
  root: string,
  additionalToolInputs: readonly string[] = [],
  selectionMode: QualityInputSelectionMode = 'current',
): Promise<CoverageInputs> {
  const image =
    process.env.VIDA_QUALITY_IMAGE_MANIFEST === undefined && process.env.VIDA_QUALITY_IMAGE_SHA256 === undefined
      ? null
      : await (await import('./quality-execution-image.ts')).loadQualityExecutionImageInputs(root);
  if (image) return checkedImageProjection(image, additionalToolInputs, selectionMode);
  const capture = await captureQualityInputBase(
    root,
    additionalToolInputs,
    selectionMode,
    additionalToolInputs.filter(importScanSource),
  );
  return projectQualityInputCapture(
    capture,
    additionalToolInputs,
    typeof selectionMode === 'string' ? selectionMode : 'current',
  );
}

function checkedImageProjection(
  inputs: CoverageInputs,
  tools: readonly string[],
  selection: QualityInputSelectionMode,
): CoverageInputs {
  const declared = inputs.test_selection;
  if (typeof selection === 'string' || declared.mode !== 'focused-diagnostic')
    throw new Error('Focused execution image cannot establish full or historical input coverage.');
  if (
    selection.contour !== declared.contour ||
    JSON.stringify([...selection.sources].sort()) !== JSON.stringify([...declared.sources].sort()) ||
    JSON.stringify([...selection.tests].sort()) !== JSON.stringify([...declared.tests].sort())
  )
    throw new Error('Requested selection differs from the execution image.');
  if (tools.some((file) => !Object.hasOwn(inputs.input_bytes, file)))
    throw new Error('Execution image does not contain a requested tool input.');
  return inputs;
}

/** Capture focused numeric inputs together with the maintained execution image. */
export async function executionImageQualityInputs(
  root: string,
  additionalToolInputs: readonly string[],
  selection: FocusedDiagnosticSelection,
  semanticToolInputs: readonly string[] = [],
): Promise<CoverageInputs> {
  const capture = await captureQualityInputBase(
    root,
    additionalToolInputs,
    selection,
    additionalToolInputs.filter(importScanSource),
    true,
    semanticToolInputs,
  );
  return projectQualityInputCapture(capture, additionalToolInputs, 'current');
}

export const coverageInputs = (
  root: string,
  selectionMode: QualityInputSelectionMode = 'current',
): Promise<CoverageInputs> => qualityInputs(root, [], selectionMode);

export function capturedModuleInputs(
  inputs: Pick<CoverageInputs, 'sources' | 'test_inputs' | 'tool_inputs'>,
): InputDigest[] {
  const executable = /\.(?:js|mjs|cjs|jsx|ts|mts|cts|tsx|json|txt|yaml|yml|toml|md|svg|png|jpe?g|webp|wasm|xml|csv)$/u;
  const modules = new Map<string, InputDigest>();
  for (const entry of [...inputs.sources, ...inputs.test_inputs, ...inputs.tool_inputs]) {
    if (!executable.test(entry.path) || /\.d\.(?:mts|cts|ts)$/u.test(entry.path)) continue;
    const previous = modules.get(entry.path);
    if (previous && previous.sha256 !== entry.sha256)
      throw new Error('Captured module input digest conflicts across categories: ' + entry.path);
    modules.set(entry.path, entry);
  }
  return [...modules.values()].sort((left, right) => left.path.localeCompare(right.path));
}

export function qualityFingerprint(
  inputs: Pick<CoverageInputs, 'source_fingerprint' | 'test_fingerprint' | 'tool_fingerprint'>,
  perTestCapture?: 'diagnostic-v2',
): string {
  const fingerprintPayload = {
    sources: inputs.source_fingerprint,
    tests: inputs.test_fingerprint,
    tooling: inputs.tool_fingerprint,
    ...(perTestCapture === undefined ? {} : { per_test_capture: perTestCapture }),
  };
  const fingerprintJson = canonicalJson(fingerprintPayload);
  if (fingerprintJson === undefined) throw new Error('Quality fingerprint is not serializable.');
  return sha256(fingerprintJson);
}
