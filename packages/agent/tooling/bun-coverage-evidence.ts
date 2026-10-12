import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { closeSync, fstatSync } from 'node:fs';
import type { Dirent } from 'node:fs';
import path from 'node:path';
import { openRootFileSync, readFileDescriptorBoundedSync } from '@openclaw/fs-safe/advanced';
import { instrumentSource as instrumentCapturedSource } from './source-instrumentation.ts';
import { maintainedSourceInventory, selectMaintainedSourcePaths } from './maintained-source-inventory.ts';
import type { PublishedFixtureIdentity } from './published-coverage-inputs.js';
import {
  assertPublishedCoverageInputs,
  parsePublishedGitBatch,
  publishedFixtureIdentity,
} from './published-coverage-inputs.ts';

export type InputDigest = { path: string; sha256: string };
type TestSelection = {
  mode: 'full-current-test-set' | 'published-baseline-bun-native';
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
};
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
  publishedContract?: PublishedContract;
};
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
  'tooling/source-instrumentation.ts',
  'tooling/coverage-gate.ts',
  'tooling/bun-coverage-preload.ts',
  'tooling/captured-json-module.ts',
  'tooling/captured-module-contents.ts',
  'tooling/bun-coverage-report-validator.ts',
  'tooling/crap-gate.ts',
  'tooling/coverage-math.ts',
  'tooling/coverage-counters.ts',
  'tooling/coverage-run-lock.ts',
  'tooling/published-coverage-inputs.ts',
  'tooling/published-baseline-reference.ts',
  'tooling/fixture-child-observation.ts',
  'tooling/function-inventory.ts',
  'tooling/istanbul-public-api.d.ts',
  'tooling/maintained-source-inventory.ts',
  'tooling/run-bun-coverage.ts',
];

export const sha256 = (bytes: string | Uint8Array): string => createHash('sha256').update(bytes).digest('hex');
export const canonicalJson = (value: unknown): string | undefined => JSON.stringify(value);
export const repositoryToolingInputPrefix = '_repository/tooling/agent';

export function repositoryRootForPackage(packageRoot: string): string | null {
  const packageBase = path.resolve(packageRoot);
  if (path.basename(packageBase) !== 'agent' || path.basename(path.dirname(packageBase)) !== 'packages') return null;
  return path.resolve(packageBase, '../..');
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
  const repositoryToolingPrefix = `tooling${path.sep}agent${path.sep}`;
  if (repositoryRelative.startsWith(repositoryToolingPrefix) && !path.isAbsolute(repositoryRelative))
    return `${repositoryToolingInputPrefix}/${repositoryRelative.slice(repositoryToolingPrefix.length).split(path.sep).join('/')}`;
  return null;
}

export function capturedModuleAbsolutePath(packageRoot: string, logicalPath: string): string {
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
    (logicalPath.startsWith('_repository/') && !logicalPath.startsWith(`${repositoryToolingInputPrefix}/`))
  )
    throw new Error(`Captured module path is outside admitted roots: ${logicalPath}`);
  const packageBase = path.resolve(packageRoot);
  const repositoryPrefix = `${repositoryToolingInputPrefix}/`;
  if (logicalPath.startsWith(repositoryPrefix) && !repositoryRootForPackage(packageBase))
    throw new Error(`Captured module path is outside admitted roots: ${logicalPath}`);
  const absolute = logicalPath.startsWith(repositoryPrefix)
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

export function instrumentSource(file: string, source: string): ReturnType<typeof instrumentCapturedSource> {
  return instrumentCapturedSource(file, source);
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

function readBoundedInput(absolute: string, boundaryRoot: string, label: string, allowMissing: boolean): Buffer | null {
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

function qualityToolInputPaths(
  additionalToolInputs: readonly string[],
  contractInputs: readonly string[],
  mode: 'current' | 'published-baseline-bun-native',
): string[] {
  const baselineInputs = mode === 'published-baseline-bun-native' ? baselineContractPaths : [];
  return [...new Set([...coverageToolInputs, ...additionalToolInputs, ...contractInputs, ...baselineInputs])].sort();
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

export async function readQualityInputs(root: string, files: readonly string[]): Promise<Map<string, Buffer>> {
  if (!Array.isArray(files) || files.length > maxInputPaths) throw new Error('Coverage input path limit exceeded.');
  // Validate the complete finite selection before opening any path. Sorting and
  // deduplication make a repeated selection share one retained byte capture.
  const declared: readonly unknown[] = files;
  const selected = [...new Set(declared)]
    .map((file) => {
      if (typeof file !== 'string') throw new Error('Captured module path must be a string.');
      return {
        file,
        absolute: capturedModuleAbsolutePath(root, file),
        boundary: capturedModuleBoundaryRoot(root, file),
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
  return logicalPath.startsWith(`${repositoryToolingInputPrefix}/`) ? path.resolve(packageRoot, '../..') : packageRoot;
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
      const firstPathPart = resolved.split('/')[0] ?? '';
      if (
        !sources.has(resolved) &&
        !tests.has(resolved) &&
        !(resourceRoots.includes(firstPathPart) && inputBytes.has(resolved))
      )
        runtimeTools.add(resolved);
      if (importScanSource(resolved)) queued.push(resolved);
    }
  }
  return [...runtimeTools].sort();
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
  selectionMode: 'current' | 'published-baseline-bun-native',
): Promise<QualityInputCapture> {
  walkedPathCount = 0;
  const inventory = maintainedSourceInventory(root);
  const sources = inventory.mutationSources;
  if (!sources.length || sources.some((file) => !/^src\/.+\.ts$|^bin\/.+\.(?:mjs|ts)$/u.test(file)))
    throw new Error('Maintained coverage inventory is empty or contains an unsupported source path.');
  const testInputsAll = await walkFiles(root, path.join(root, 'tests'));
  const supportedTest = /\.(?:test|spec)\.(?:js|mjs|cjs|jsx|ts|mts|cts|tsx)$/u;
  const testLike = /\.(?:test|spec)\./u;
  const unsupported = testInputsAll.filter((file) => testLike.test(file) && !supportedTest.test(file));
  if (unsupported.length) throw new Error(`Unsupported Bun test extension: ${unsupported.join(', ')}`);
  const testSelection = selectTestSelection(root, testInputsAll, supportedTest, selectionMode);
  const contractInputs = (
    await Promise.all(
      ['schemas', 'templates', 'instructions'].map((directory) => walkFiles(root, path.join(root, directory))),
    )
  ).flat();
  const tools = qualityToolInputPaths(additionalToolInputs, contractInputs, selectionMode);
  const allInputs = [...new Set([...sources, ...testInputsAll, ...tools])].sort();
  const inputBytes = await readQualityInputs(root, allInputs);
  if (selectionMode === 'published-baseline-bun-native')
    verifyPublishedBaselineInputs(root, inputBytes, sources, testInputsAll);
  const runtimeToolPaths =
    selectionMode === 'current'
      ? await captureRuntimeInputClosure(root, testSelection.tests, sources, testInputsAll, inputBytes)
      : [];
  const digestPaths = [...new Set([...sources, ...testInputsAll, ...tools, ...runtimeToolPaths])];
  const inputDigests = new Map(
    digestPaths.map((file) => {
      const bytes = inputBytes.get(file);
      if (!bytes) throw new Error(`Coverage input snapshot is missing: ${file}`);
      return [file, { path: file, sha256: sha256(bytes) }];
    }),
  );
  const sourceInputs = qualityInputDigests(sources, inputBytes, inputDigests);
  const testInputs = qualityInputDigests(testInputsAll, inputBytes, inputDigests);
  return {
    sources: sourceInputs,
    testInputs,
    testInputsAll,
    testSelection,
    contractInputs,
    inputBytes,
    inputDigests,
    runtimeToolPaths,
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

function projectQualityInputCapture(
  capture: QualityInputCapture,
  additionalToolInputs: readonly string[],
  selectionMode: 'current' | 'published-baseline-bun-native',
): CoverageInputs {
  const tools = [
    ...new Set([
      ...qualityToolInputPaths(additionalToolInputs, capture.contractInputs, selectionMode),
      ...capture.runtimeToolPaths,
    ]),
  ].sort();
  const sourceJson = canonicalJson(capture.sources);
  if (sourceJson === undefined) throw new Error('Coverage source identity is not serializable.');
  const sourceFingerprint = sha256(sourceJson);
  const testJson = canonicalJson({ selection: capture.testSelection, files: capture.testInputs });
  if (testJson === undefined) throw new Error('Coverage test identity is not serializable.');
  const testFingerprint = sha256(testJson);
  const toolInputs = qualityInputDigests(tools, capture.inputBytes, capture.inputDigests);
  const toolJson = canonicalJson(toolInputs);
  if (toolJson === undefined) throw new Error('Coverage tool identity is not serializable.');
  const projectedPaths = [
    ...new Set([...capture.sources.map((entry) => entry.path), ...capture.testInputsAll, ...tools]),
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
  return {
    sources: capture.sources,
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
    coverage: freezeQualityProjection(projectQualityInputCapture(capture, checked.coverage, 'current')),
    mutation: freezeQualityProjection(projectQualityInputCapture(capture, checked.mutation, 'current')),
    guard: freezeQualityProjection(projectQualityInputCapture(capture, checked.guard, 'current')),
  });
}

export async function qualityInputs(
  root: string,
  additionalToolInputs: readonly string[] = [],
  selectionMode: 'current' | 'published-baseline-bun-native' = 'current',
): Promise<CoverageInputs> {
  const capture = await captureQualityInputBase(root, additionalToolInputs, selectionMode);
  return projectQualityInputCapture(capture, additionalToolInputs, selectionMode);
}

export const coverageInputs = (
  root: string,
  selectionMode: 'current' | 'published-baseline-bun-native' = 'current',
): Promise<CoverageInputs> => qualityInputs(root, [], selectionMode);

export function capturedModuleInputs(
  inputs: Pick<CoverageInputs, 'sources' | 'test_inputs' | 'tool_inputs'>,
): InputDigest[] {
  const executable = /\.(?:js|mjs|cjs|jsx|ts|mts|cts|tsx|json|txt|yaml|yml|toml|md|svg|png|jpe?g|webp|wasm|xml|csv)$/u;
  return [...inputs.sources, ...inputs.test_inputs, ...inputs.tool_inputs]
    .filter((entry) => executable.test(entry.path) && !/\.d\.(?:mts|cts|ts)$/u.test(entry.path))
    .sort((left, right) => left.path.localeCompare(right.path));
}

export function qualityFingerprint(inputs: CoverageInputs): string {
  const fingerprintJson = canonicalJson({
    sources: inputs.source_fingerprint,
    tests: inputs.test_fingerprint,
    tooling: inputs.tool_fingerprint,
  });
  if (fingerprintJson === undefined) throw new Error('Quality fingerprint is not serializable.');
  return sha256(fingerprintJson);
}
