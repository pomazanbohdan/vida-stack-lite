import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { open, readdir, readFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';
import { instrumentSource as instrumentCapturedSource } from './source-instrumentation.ts';
import { maintainedSourceInventory, selectMaintainedSourcePaths } from './maintained-source-inventory.ts';
import {
  assertPublishedCoverageInputs,
  parsePublishedGitBatch,
  publishedFixtureIdentity,
} from './published-coverage-inputs.ts';

/** @typedef {{path: string, sha256: string}} InputDigest */
const maxInputFileBytes = 4 * 1024 * 1024;
const maxInputBytes = 128 * 1024 * 1024;
const maxInputPaths = 20000;
let walkedPathCount = 0;
/** @param {string} directory @param {number} depth @param {import('node:fs').Dirent[]} entries */
function enforceWalkBounds(directory, depth, entries) {
  walkedPathCount += entries.length;
  if (depth > 64 || walkedPathCount > maxInputPaths || entries.length > maxInputPaths)
    throw new Error(`Coverage input tree limit exceeded: ${directory}`);
}
/** @typedef {{mode: 'full-current-test-set' | 'published-baseline-bun-native', baseline_ref?: string, package_script?: string, native_runner?: string, tests: string[], published_contract_inputs?: InputDigest[], published_fixture?: import('./published-coverage-inputs.ts').PublishedFixtureIdentity, published_execution?: {argv: string[], published_argv: string[], env_file: string, env: Record<string, string>, config: string, randomize: boolean, seed: number, env_expansion: boolean, telemetry: boolean, published_preload: string, active_preload: string, instrumentation_note: string, counter_trust_scope: string}}} TestSelection */
/** @typedef {{sources: InputDigest[], source_fingerprint: string, tests: string[], test_selection: TestSelection, test_inputs: InputDigest[], test_fingerprint: string, tool_inputs: InputDigest[], tool_fingerprint: string, module_inputs: InputDigest[], input_bytes: Record<string, Buffer>}} CoverageInputs */
/** @typedef {{functions: MetricSummary, lines: MetricSummary, statements: MetricSummary, branches: MetricSummary}} CoverageSummary */
/** @typedef {{total: number, covered: number, skipped: number, pct: number}} MetricSummary */
/** @typedef {{path: string, statementMap: Record<string, unknown>, fnMap: Record<string, unknown>, branchMap: Record<string, unknown>, s: Record<string, number>, f: Record<string, number>, b: Record<string, number[]>}} InstrumentedFile */

export const coverageToolInputs = [
  '.bun-version',
  'bun.lock',
  'bunfig.toml',
  'package.json',
  'tooling/bun-coverage-evidence.mjs',
  'tooling/bun-coverage-evidence.d.mts',
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

/** @param {string | Uint8Array} bytes */
export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
/** @param {unknown} value */
export const canonicalJson = (value) => JSON.stringify(value);
/** @param {unknown} value @returns {boolean} */
export function isExternalModulePath(value) {
  if (typeof value !== 'string' || value.length === 0) return false;
  if (path.posix.isAbsolute(value) || path.win32.isAbsolute(value) || /[\\\0]/u.test(value)) return false;
  const parts = value.split('/');
  if (parts.some((part) => part.length === 0 || part === '.' || part === '..')) return false;
  return !['src', 'bin', 'tests', 'tooling'].includes(parts[0] ?? '');
}

/** @param {unknown} value @returns {string | null} */
export function canonicalTestSelection(value) {
  /** @param {unknown} item @returns {unknown} */
  function sortKeys(item) {
    if (Array.isArray(item)) return item.map(sortKeys);
    if (typeof item !== 'object' || item === null) return item;
    return Object.fromEntries(
      Object.entries(item)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, sortKeys(child)]),
    );
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  return JSON.stringify(sortKeys(value));
}
/** @param {string} root @returns {Promise<string>} */
export const readBunPin = async (root) => (await readFile(path.join(root, '.bun-version'), 'utf8')).trim();

const baselineRef = 'b549951';
const baselineCommit = 'b5499511e64b2165a8c97ae3d2b455b25b1ac5b6';

/** @typedef {{bytes: Map<string, Buffer>, sources: string[], testInputs: string[], tests: string[], fixture: import('./published-coverage-inputs.ts').PublishedFixtureIdentity, env: Record<string, string>, argv: string[], publishedArgv: string[]}} PublishedContract */
/** @type {Map<string, PublishedContract>} */
const publishedContracts = new Map();
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

/** @param {string} root @param {string[]} args @param {{input?: string, maxBuffer?: number}} [options] */
function publishedGit(root, args, options = {}) {
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

/** @param {Buffer} bytes @returns {Record<string, unknown>} */
function publishedManifest(bytes) {
  const value = /** @type {unknown} */ (JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)));
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error('Published baseline package manifest is malformed.');
  const command = /** @type {{scripts?: Record<string, unknown>}} */ (value).scripts?.['test:coverage:pinned'];
  if (typeof command !== 'string' || !/(?:^|&&)\s*bun tooling\/run-bun-native-coverage\.mjs(?:\s|$)/u.test(command))
    throw new Error('Published baseline coverage command does not declare the Bun native runner.');
  return /** @type {Record<string, unknown>} */ (value);
}

/** @param {string} runner @returns {string[]} */
function publishedTestPaths(runner) {
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

/** @param {Map<string, Buffer>} bytes @param {string} file */
function requiredPublishedBytes(bytes, file) {
  const value = bytes.get(file);
  if (!value) throw new Error(`Published baseline bytes are missing: ${file}`);
  return value;
}

/** @param {Map<string, Buffer>} bytes */
function validatePublishedExecution(bytes) {
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

/** @param {string} root */
function capturePublishedBaselineContract(root) {
  const cached = publishedContracts.get(root);
  if (cached) return cached;
  const head = publishedGit(root, ['rev-parse', 'HEAD']).toString('utf8').trim();
  const resolved = publishedGit(root, [`rev-parse`, `${baselineRef}^{commit}`])
    .toString('utf8')
    .trim();
  if (head !== baselineCommit || resolved !== baselineCommit)
    throw new Error('Published baseline Bun selection requires an isolated b549951 checkout.');
  /** @type {Map<string, Buffer>} */
  const bytes = new Map(
    baselineContractPaths.map((file) => [file, publishedGit(root, ['show', `${baselineRef}:packages/agent/${file}`])]),
  );
  const manifest = publishedManifest(requiredPublishedBytes(bytes, 'package.json'));
  if (!Array.isArray(manifest.files) || !manifest.files.every((file) => typeof file === 'string'))
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
  /** @type {Map<string, {mode: string, id: string}>} */
  const entries = new Map();
  for (const record of tree.split('\0').filter(Boolean)) {
    const match = /^([0-7]{6}) blob ([0-9a-f]{40})\tpackages\/agent\/([^\r\n]+)$/u.exec(record);
    const [, mode, id, file] = match ?? [];
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
  const objectIds = new Set();
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

/** @param {string} root @returns {TestSelection} */
function publishedBaselineSelection(root) {
  const contract = capturePublishedBaselineContract(root);
  const fixtureDigests = new Map(contract.fixture.inputs.map((entry) => [entry.path, entry.sha256]));
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

/** @param {string} file @param {string} source */
export function instrumentSource(file, source) {
  return instrumentCapturedSource(file, source);
}

/** @param {string} root @param {string} directory @returns {Promise<string[]>} */
async function walkFiles(root, directory, depth = 0) {
  const entries = await readdir(directory, { withFileTypes: true });
  enforceWalkBounds(directory, depth, entries);
  /** @type {Promise<string[]>[]} */
  const nested = entries.map(async (entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Quality input symlink is not supported: ${absolute}`);
    if (entry.isDirectory()) return walkFiles(root, absolute, depth + 1);
    if (!entry.isFile()) return [];
    return [path.relative(root, absolute).replaceAll('\\', '/')];
  });
  return (await Promise.all(nested)).flat().sort();
}

/** @param {string} absolute @returns {Promise<Buffer>} */
async function readBoundedInput(absolute) {
  const noFollow = fsConstants.O_NOFOLLOW ?? 0;
  const handle = await open(absolute, fsConstants.O_RDONLY | noFollow);
  try {
    const before = await handle.stat();
    if (!before.isFile() || before.size > maxInputFileBytes)
      throw new Error(`Coverage input file limit exceeded: ${absolute}`);
    /** @type {Buffer[]} */
    const chunks = [];
    let total = 0;
    while (total <= maxInputFileBytes) {
      const buffer = Buffer.allocUnsafe(Math.min(64 * 1024, maxInputFileBytes + 1 - total));
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, null);
      if (bytesRead === 0) break;
      total += bytesRead;
      if (total > maxInputFileBytes) throw new Error(`Coverage input grew beyond its byte limit: ${absolute}`);
      chunks.push(buffer.subarray(0, bytesRead));
    }
    const after = await handle.stat();
    if (total !== before.size || after.size !== before.size || after.mtimeMs !== before.mtimeMs)
      throw new Error(`Coverage input changed during bounded read: ${absolute}`);
    return Buffer.concat(chunks, total);
  } finally {
    await handle.close();
  }
}

/** @param {string} root @param {string[]} testInputsAll @param {RegExp} supportedTest @param {'current' | 'published-baseline-bun-native'} mode @returns {TestSelection} */
function selectTestSelection(root, testInputsAll, supportedTest, mode) {
  /** @type {TestSelection} */
  let selection;
  if (mode === 'current')
    selection = { mode: 'full-current-test-set', tests: testInputsAll.filter((file) => supportedTest.test(file)) };
  else if (mode === 'published-baseline-bun-native') selection = publishedBaselineSelection(root);
  else throw new Error('Unsupported Bun coverage test selection mode.');
  if (!selection.tests.length) throw new Error('Bun Test coverage selection is empty.');
  return selection;
}

/** @param {readonly string[]} additionalToolInputs @param {readonly string[]} contractInputs @param {'current' | 'published-baseline-bun-native'} mode */
function qualityToolInputPaths(additionalToolInputs, contractInputs, mode) {
  const baselineInputs = mode === 'published-baseline-bun-native' ? baselineContractPaths : [];
  return [...new Set([...coverageToolInputs, ...additionalToolInputs, ...contractInputs, ...baselineInputs])].sort();
}

/** @param {string} root @param {Map<string, Buffer>} inputBytes @param {readonly string[]} sources @param {readonly string[]} tests */
function verifyPublishedBaselineInputs(root, inputBytes, sources, tests) {
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

/** @param {string} root @param {string[]} files @returns {Promise<Map<string, Buffer>>} */
async function readQualityInputs(root, files) {
  if (files.length > maxInputPaths) throw new Error('Coverage input path limit exceeded.');
  /** @type {Map<string, Buffer>} */
  const result = new Map();
  let total = 0;
  for (const file of files) {
    const bytes = await readBoundedInput(path.join(root, file));
    total += bytes.byteLength;
    if (total > maxInputBytes) throw new Error('Coverage input aggregate byte limit exceeded.');
    result.set(file, bytes);
  }
  return result;
}

/** @typedef {{coverage: readonly string[], mutation: readonly string[], guard: readonly string[]}} FinalQualityProjectionInputs */
/** @typedef {{sources: InputDigest[], testInputs: InputDigest[], testInputsAll: string[], testSelection: TestSelection, contractInputs: string[], inputBytes: Map<string, Buffer>, publishedContract?: PublishedContract}} QualityInputCapture */

/** @param {unknown} value @returns {value is string} */
function isSafeProjectionPath(value) {
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

/** @param {unknown} value @returns {FinalQualityProjectionInputs} */
function checkedFinalQualityProjectionInputs(value) {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error('Final quality projections must be a named object.');
  const record = /** @type {Record<string, unknown>} */ (value);
  const names = Object.keys(record).sort();
  if (names.join(',') !== 'coverage,guard,mutation')
    throw new Error('Final quality projections must include exactly coverage, mutation and guard.');
  /** @type {Record<string, readonly string[]>} */
  const checked = {};
  for (const name of names) {
    const paths = record[name];
    if (!Array.isArray(paths) || !paths.every(isSafeProjectionPath))
      throw new Error(`Final quality projection paths are malformed: ${name}`);
    checked[name] = Object.freeze([...paths]);
  }
  return /** @type {FinalQualityProjectionInputs} */ (Object.freeze(checked));
}

/** @param {string} root @param {readonly string[]} additionalToolInputs @param {'current' | 'published-baseline-bun-native'} selectionMode @returns {Promise<QualityInputCapture>} */
async function captureQualityInputBase(root, additionalToolInputs, selectionMode) {
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
  const sourceInputs = qualityInputDigests(sources, inputBytes);
  const testInputs = qualityInputDigests(testInputsAll, inputBytes);
  for (const entry of testSelection.tests) {
    const bytes = inputBytes.get(entry);
    if (!bytes) throw new Error(`Coverage input snapshot is missing: ${entry}`);
    const source = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (/(?:from\s*|import\s*\(|require\s*\()\s*['"]vitest['"]\s*\)?/u.test(source))
      throw new Error(`Bun Test qualification cannot include a Vitest-owned test before migration: ${entry}`);
  }
  return {
    sources: sourceInputs,
    testInputs,
    testInputsAll,
    testSelection,
    contractInputs,
    inputBytes,
    ...(selectionMode === 'published-baseline-bun-native'
      ? { publishedContract: capturePublishedBaselineContract(root) }
      : {}),
  };
}

/** @param {readonly string[]} files @param {Map<string, Buffer>} inputBytes @returns {InputDigest[]} */
function qualityInputDigests(files, inputBytes) {
  return files.map((file) => {
    const bytes = inputBytes.get(file);
    if (!bytes) throw new Error(`Coverage input snapshot is missing: ${file}`);
    return { path: file, sha256: sha256(bytes) };
  });
}

/** @param {QualityInputCapture} capture @param {readonly string[]} additionalToolInputs @param {'current' | 'published-baseline-bun-native'} selectionMode @returns {CoverageInputs} */
function projectQualityInputCapture(capture, additionalToolInputs, selectionMode) {
  const tools = qualityToolInputPaths(additionalToolInputs, capture.contractInputs, selectionMode);
  const sourceFingerprint = sha256(canonicalJson(capture.sources));
  const testFingerprint = sha256(canonicalJson({ selection: capture.testSelection, files: capture.testInputs }));
  const toolInputs = qualityInputDigests(tools, capture.inputBytes);
  const projectedPaths = [
    ...new Set([...capture.sources.map((entry) => entry.path), ...capture.testInputsAll, ...tools]),
  ].sort();
  const inputBytes = Object.fromEntries(
    projectedPaths.map((file) => {
      const bytes = capture.inputBytes.get(file);
      if (!bytes) throw new Error(`Coverage input snapshot is missing: ${file}`);
      return [file, bytes];
    }),
  );
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
    tool_fingerprint: sha256(canonicalJson(toolInputs)),
    module_inputs: capturedModuleInputs({
      sources: capture.sources,
      test_inputs: capture.testInputs,
      tool_inputs: toolInputs,
    }),
    input_bytes: inputBytes,
  };
}

/** @param {CoverageInputs} inputs @returns {CoverageInputs} */
function freezeQualityProjection(inputs) {
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

/** One snapshot projected into the exact existing coverage, mutation and aggregate tool identities. */
/** @param {string} root @param {unknown} projections @returns {Promise<{coverage: CoverageInputs, mutation: CoverageInputs, guard: CoverageInputs}>} */
export async function qualityInputProjections(root, projections) {
  const checked = checkedFinalQualityProjectionInputs(projections);
  const unionAdditionalTools = [...new Set([...checked.coverage, ...checked.mutation, ...checked.guard])].sort();
  const capture = await captureQualityInputBase(root, unionAdditionalTools, 'current');
  return Object.freeze({
    coverage: freezeQualityProjection(projectQualityInputCapture(capture, checked.coverage, 'current')),
    mutation: freezeQualityProjection(projectQualityInputCapture(capture, checked.mutation, 'current')),
    guard: freezeQualityProjection(projectQualityInputCapture(capture, checked.guard, 'current')),
  });
}

/** One immutable input owner for coverage and mutation qualification. */
/** @param {string} root @param {readonly string[]} [additionalToolInputs] @param {'current' | 'published-baseline-bun-native'} [selectionMode] @returns {Promise<CoverageInputs>} */
export async function qualityInputs(root, additionalToolInputs = [], selectionMode = 'current') {
  const capture = await captureQualityInputBase(root, additionalToolInputs, selectionMode);
  return projectQualityInputCapture(capture, additionalToolInputs, selectionMode);
}

/** @param {string} root @param {'current' | 'published-baseline-bun-native'} [selectionMode] @returns {Promise<CoverageInputs>} */
export const coverageInputs = (root, selectionMode = 'current') => qualityInputs(root, [], selectionMode);

/** @param {CoverageInputs} inputs */
/** @param {Pick<CoverageInputs, 'sources' | 'test_inputs' | 'tool_inputs'>} inputs */
export function capturedModuleInputs(inputs) {
  const executable = /\.(?:js|mjs|cjs|jsx|ts|mts|cts|tsx|json|txt|yaml|yml|toml|md|svg|png|jpe?g|webp|wasm|xml|csv)$/u;
  return [...inputs.sources, ...inputs.test_inputs, ...inputs.tool_inputs]
    .filter((entry) => executable.test(entry.path) && !/\.d\.(?:mts|cts|ts)$/u.test(entry.path))
    .sort((left, right) => left.path.localeCompare(right.path));
}

/** @param {CoverageInputs} inputs */
export function qualityFingerprint(inputs) {
  return sha256(
    canonicalJson({
      sources: inputs.source_fingerprint,
      tests: inputs.test_fingerprint,
      tooling: inputs.tool_fingerprint,
    }),
  );
}
