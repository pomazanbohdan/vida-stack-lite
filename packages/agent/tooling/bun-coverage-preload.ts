import { randomUUID, createHash } from 'node:crypto';
import { afterAll } from 'bun:test';
import { fileURLToPath } from 'node:url';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parsePublishedFixtureIdentity } from './published-coverage-inputs.js';
import {
  capturedModuleAbsolutePath,
  capturedModuleInputs,
  canonicalCapturedModulePath,
  instrumentSource,
  repositoryRootForPackage,
} from './bun-coverage-evidence.ts';

type FileCoverageData = import('istanbul-lib-instrument').FileCoverageData;
type SourceDigest = { path: string; sha256: string };
type RunManifest = {
  schema: string;
  run_id: string;
  snapshot_directory: string;
  source_fingerprint: string;
  test_fingerprint: string;
  test_selection: import('./bun-coverage-evidence.ts').CoverageInputs['test_selection'];
  tests: string[];
  tool_fingerprint: string;
  runtime_executable_sha256: string;
  module_inputs: SourceDigest[];
  active_argv: string[];
  test_inputs: SourceDigest[];
  tool_inputs: SourceDigest[];
  execution_scope: Record<string, unknown>;
  sources: SourceDigest[];
  source_maps: Record<string, FileCoverageData>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const root = path.resolve(process.env.VIDA_BUN_COVERAGE_ROOT ?? process.cwd());
const repositoryRoot = repositoryRootForPackage(root);
const preloadPath = fileURLToPath(import.meta.url);
const digest = (bytes: string | Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const manifestPath = process.env.VIDA_BUN_COVERAGE_MANIFEST;
const reportDirectory = process.env.VIDA_BUN_COVERAGE_REPORT_DIRECTORY;
const snapshotDirectory = process.env.VIDA_BUN_COVERAGE_SNAPSHOT_DIRECTORY;
if (!manifestPath || !reportDirectory || !snapshotDirectory)
  throw new Error('Bun coverage preload requires a run manifest, snapshot and report directory.');
const manifestValue: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'));
if (!isRecord(manifestValue)) throw new Error('Bun coverage manifest must be an object.');
const manifest = manifestValue as RunManifest;
if (
  typeof manifest.snapshot_directory !== 'string' ||
  path.resolve(snapshotDirectory) !== path.resolve(root, ...manifest.snapshot_directory.split('/'))
)
  throw new Error('Bun coverage snapshot path differs from the run manifest.');
if (
  manifest.schema !== 'VidaBunCoverageRun/v1' ||
  manifest.run_id !== process.env.VIDA_BUN_COVERAGE_RUN_ID ||
  manifest.source_fingerprint !== process.env.VIDA_BUN_COVERAGE_SOURCE_FINGERPRINT ||
  manifest.test_fingerprint !== process.env.VIDA_BUN_COVERAGE_TEST_FINGERPRINT ||
  !isRecord(manifest.test_selection) ||
  manifest.test_selection.mode !== process.env.VIDA_BUN_COVERAGE_TEST_SELECTION_MODE ||
  JSON.stringify(manifest.test_selection.tests) !== JSON.stringify(manifest.tests) ||
  manifest.tool_fingerprint !== process.env.VIDA_BUN_COVERAGE_TOOL_FINGERPRINT ||
  !/^[0-9a-f]{64}$/u.test(manifest.runtime_executable_sha256) ||
  manifest.runtime_executable_sha256 !== digest(readFileSync(process.execPath)) ||
  JSON.stringify(manifest.active_argv) !== process.env.VIDA_BUN_COVERAGE_ACTIVE_ARGV
)
  throw new Error('Bun coverage preload received stale or mismatched run identity.');
if (!Array.isArray(manifest.sources) || manifest.sources.length === 0 || !Array.isArray(manifest.module_inputs))
  throw new Error('Bun coverage source manifest is empty.');
const declaredModuleRoots = ['src', 'bin', 'tests', 'tooling'];
const expected = new Map(
  manifest.sources.map((entry) => {
    if (!isRecord(entry) || typeof entry.path !== 'string' || typeof entry.sha256 !== 'string')
      throw new Error('Bun coverage source identity is invalid.');
    return [path.resolve(root, entry.path), entry.sha256];
  }),
);
if (expected.size !== manifest.sources.length) throw new Error('Bun coverage source manifest contains duplicates.');
const snapshotRoot = path.resolve(snapshotDirectory);
const fixture =
  manifest.test_selection.mode === 'published-baseline-bun-native'
    ? parsePublishedFixtureIdentity(manifest.test_selection.published_fixture)
    : undefined;
if (!fixture && manifest.test_selection.published_fixture !== undefined)
  throw new Error('Current coverage cannot adopt a published fixture root.');
const fixtureRoot = fixture ? path.join(snapshotRoot, fixture.directory) : undefined;
const fixtureModules = new Map(fixture?.inputs.map((entry) => [entry.path, entry.sha256]) ?? []);
const loadedFixtureInputs = new Map<string, string>();
function snapshotBytes(relative: string, expected: string) {
  const absolute = path.join(snapshotRoot, ...relative.split('/'));
  const bytes = readFileSync(absolute);
  if (digest(bytes) !== expected) throw new Error('Private snapshot bytes differ from manifest: ' + relative);
  return bytes;
}

const toolDigests = new Map(manifest.tool_inputs.map((entry) => [entry.path, entry.sha256]));
const preloadDigest = toolDigests.get('tooling/bun-coverage-preload.ts');
if (!preloadDigest || path.resolve(preloadPath) !== path.join(snapshotRoot, 'tooling', 'bun-coverage-preload.ts'))
  throw new Error('Coverage preload was not loaded from its private snapshot path.');
snapshotBytes('tooling/bun-coverage-preload.ts', preloadDigest);
const bootstrapInputs = [
  'tooling/bun-coverage-preload.ts',
  'tooling/bun-coverage-evidence.ts',
  'tooling/source-instrumentation.ts',
  'tooling/captured-json-module.ts',
  'tooling/captured-module-contents.ts',
  'tooling/maintained-source-inventory.ts',
  'tooling/published-coverage-inputs.ts',
  'tooling/fixture-child-observation.ts',
].map((file) => {
  const expectedHash = toolDigests.get(file);
  if (!expectedHash) throw new Error('Coverage bootstrap dependency is absent from tooling custody: ' + file);
  snapshotBytes(file, expectedHash);
  return { path: file, sha256: expectedHash };
});
// Fixture children are subjects; observe direct APIs without granting counters
// or replacing any published command/input/environment.
const fixtureObserver = fixture
  ? (await import('./fixture-child-observation.js')).createFixtureChildObserver(await import('node:child_process'), {
      runId: manifest.run_id,
      parentPid: process.pid,
      fixtureFingerprint: digest(JSON.stringify(fixture)),
      maxOutputBytes: 32 * 1024 * 1024,
    })
  : undefined;
if (fixtureObserver) {
  const actual = await import('node:child_process');
  const { mock } = await import('bun:test');
  await mock.module('node:child_process', () => ({
    ...actual,
    ...fixtureObserver.apis,
    default: { ...actual.default, ...fixtureObserver.apis },
  }));
}
// Import the JSON adapter only after its captured bootstrap bytes have been verified.
const { capturedJsonModule } = await import('./captured-json-module.js');
const { capturedModuleContents } = await import('./captured-module-contents.js');
const moduleInputs = new Map(
  manifest.module_inputs.map((entry) => {
    if (!isRecord(entry) || typeof entry.path !== 'string' || typeof entry.sha256 !== 'string')
      throw new Error('Captured module input identity is invalid.');
    return [capturedModuleAbsolutePath(root, entry.path), { path: entry.path, sha256: entry.sha256 }];
  }),
);
if (moduleInputs.size !== manifest.module_inputs.length)
  throw new Error('Captured module inputs contain duplicate paths.');
const expectedInputDigests = new Map(
  [...manifest.sources, ...manifest.test_inputs, ...manifest.tool_inputs].map((entry) => [entry.path, entry.sha256]),
);
const expectedModules = capturedModuleInputs({
  sources: manifest.sources,
  test_inputs: manifest.test_inputs,
  tool_inputs: manifest.tool_inputs,
});
if (JSON.stringify(expectedModules) !== JSON.stringify(manifest.module_inputs))
  throw new Error('Captured module input closure differs from manifest inputs.');
for (const entry of manifest.test_selection.tests) {
  const expectedHash = expectedInputDigests.get(entry);
  if (!expectedHash || moduleInputs.get(path.resolve(root, entry))?.sha256 !== expectedHash)
    throw new Error('Selected test is absent from the captured module closure: ' + entry);
}
const globalRecord = globalThis as unknown as Record<string, unknown>;
const coverage = (globalRecord['__vidaAgentCoverage__'] ??= {}) as Record<string, FileCoverageData>;
const sourceMaps = manifest.source_maps;
if (
  !sourceMaps ||
  typeof sourceMaps !== 'object' ||
  Array.isArray(sourceMaps) ||
  JSON.stringify(Object.keys(sourceMaps).sort()) !== JSON.stringify([...expected.keys()].sort())
)
  throw new Error('Coverage manifest source-map cardinality differs.');
for (const [file, fileCoverage] of Object.entries(sourceMaps)) coverage[file] = fileCoverage;
const loadedFiles = new Set<string>();
const externalModules = new Map<string, string>();
const loadedInputs = new Map(bootstrapInputs.map((entry) => [entry.path, entry.sha256]));

function moduleLoader(file: string): Bun.Loader {
  const extension = path.extname(file);
  const loaders = new Map<string, Bun.Loader>([
    ['.ts', 'ts'],
    ['.tsx', 'tsx'],
    ['.jsx', 'jsx'],
    ['.json', 'json'],
    ['.txt', 'text'],
    ['.js', 'js'],
    ['.mjs', 'js'],
    ['.cjs', 'js'],
    ['.mts', 'ts'],
    ['.cts', 'ts'],
    ['.yaml', 'yaml'],
    ['.yml', 'yaml'],
    ['.toml', 'toml'],
    ['.xml', 'xml'],
    ['.wasm', 'wasm'],
    ['.node', 'napi'],
    ['.svg', 'file'],
    ['.png', 'file'],
    ['.jpg', 'file'],
    ['.jpeg', 'file'],
    ['.webp', 'file'],
    ['.md', 'text'],
    ['.csv', 'text'],
  ]);
  const loader = loaders.get(extension);
  if (!loader) throw new Error('Unsupported captured local module type: ' + file);
  return loader;
}

function loadFixtureModule(file: string, relative: string) {
  const hash = fixtureModules.get(relative);
  if (!fixture || !hash) throw new Error('Uncaptured published fixture module: ' + file);
  const bytes = snapshotBytes(fixture.directory + '/' + relative, hash);
  loadedFixtureInputs.set(relative, hash);
  // Counter keys remain the canonical published source identities, independent of physical roots.
  const sourceFile = path.resolve(root, relative);
  const sourceHash = expected.get(sourceFile);
  if (sourceHash) {
    if (sourceHash !== hash) throw new Error('Published fixture source differs from measured bytes: ' + relative);
    const { code } = instrumentSource(sourceFile, new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    loadedFiles.add(sourceFile);
    loadedInputs.set(relative, hash);
    return { contents: code, loader: moduleLoader(file), resolveDir: path.dirname(file) };
  }
  // Legacy logical input names are retained only where their byte binding is identical.
  if (expectedInputDigests.get(relative) === hash) loadedInputs.set(relative, hash);
  if (path.extname(file) === '.json') return capturedJsonModule(bytes);
  const loader = moduleLoader(file);
  return { contents: capturedModuleContents(bytes, loader), loader, resolveDir: path.dirname(file) };
}

function loadSnapshotModule(file: string) {
  if (fixtureRoot && file.startsWith(fixtureRoot + path.sep))
    return loadFixtureModule(file, path.relative(fixtureRoot, file).replaceAll('\\', '/'));
  const relative = path.relative(root, file).replaceAll('\\', '/');
  const sourceHash = expected.get(file);
  if (sourceHash) {
    const bytes = snapshotBytes(relative, sourceHash);
    const { code } = instrumentSource(file, new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    loadedFiles.add(file);
    loadedInputs.set(relative, sourceHash);
    return { contents: code, loader: moduleLoader(file), resolveDir: path.dirname(file) };
  }
  const captured = moduleInputs.get(file);
  if (captured) {
    const bytes = snapshotBytes(captured.path, captured.sha256);
    loadedInputs.set(captured.path, captured.sha256);
    if (path.extname(file) === '.json') return capturedJsonModule(bytes);
    const loader = moduleLoader(file);
    return { contents: capturedModuleContents(bytes, loader), loader, resolveDir: path.dirname(file) };
  }
  const repositoryLogicalPath = canonicalCapturedModulePath(root, file);
  const relativeToRepository = repositoryRoot ? path.relative(repositoryRoot, file) : '..';
  const isRepositoryPath =
    repositoryRoot !== null &&
    relativeToRepository !== '..' &&
    !relativeToRepository.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relativeToRepository);
  const isOutsidePackage = relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative);
  if (isOutsidePackage && isRepositoryPath && !repositoryLogicalPath?.startsWith('_repository/tooling/agent/'))
    throw new Error('Uncaptured repository module requested by test execution: ' + file);
  if (repositoryLogicalPath?.startsWith('_repository/tooling/agent/'))
    throw new Error('Uncaptured repository tooling module requested by test execution: ' + repositoryLogicalPath);
  const admitted = declaredModuleRoots.some((directory) => relative.startsWith(directory + '/'));
  if (admitted) throw new Error('Uncaptured declared module input requested by test execution: ' + file);
  const bytes = readFileSync(file);
  const hash = digest(bytes);
  const previous = externalModules.get(relative);
  if (previous && previous !== hash)
    throw new Error('Generated local module changed during test execution: ' + relative);
  externalModules.set(relative, hash);
  if (path.extname(file) === '.json') return capturedJsonModule(bytes);
  const loader = moduleLoader(file);
  return { contents: capturedModuleContents(bytes, loader), loader, resolveDir: path.dirname(file) };
}

const separatorPattern = String.raw`[/\\]`;
const escapedRoot = root.replace(/[|\\{}()[\]^$+?.*]/gu, '\\$&');
const packageModuleFilter = new RegExp(
  `^${escapedRoot}${separatorPattern}(?!.*${separatorPattern}node_modules${separatorPattern}).+`,
  'u',
);
const repositoryModuleFilter = repositoryRoot
  ? new RegExp(
      `^${repositoryRoot.replace(/[|\\{}()[\]^$+?.*]/gu, '\\$&')}${separatorPattern}(?!.*${separatorPattern}node_modules${separatorPattern}).+`,
      'u',
    )
  : packageModuleFilter;
Bun.plugin({
  name: 'vida-agent-unified-istanbul-snapshot',
  setup(build) {
    build.onLoad({ filter: repositoryModuleFilter }, (args) => loadSnapshotModule(path.resolve(args.path)));
  },
});

function loadedInputReceipt(): SourceDigest[] {
  return [...loadedInputs]
    .map(([file, sha256]) => ({ path: file, sha256 }))
    .sort((left, right) => left.path.localeCompare(right.path));
}
function requireSelectedTestsLoaded() {
  for (const test of manifest.tests)
    if (!loadedInputs.has(test)) throw new Error('Selected test was not loaded from the private snapshot: ' + test);
}

let finalized = false;
// Bun test skips process exit listeners; a preload hook runs after all files.
afterAll(() => {
  if (finalized) return;
  finalized = true;
  try {
    mkdirSync(reportDirectory, { recursive: true });
    const shardId = process.env.VIDA_BUN_COVERAGE_SHARD_ID;
    if (!shardId) throw new Error('Coverage child has no shard identity.');
    const fileName = `${manifest.run_id}.${shardId}.${process.pid}.${randomUUID()}.json`;
    const target = path.join(reportDirectory, fileName);
    const temporary = target + '.tmp';
    requireSelectedTestsLoaded();
    const report = {
      schema: 'VidaBunCoverageProcess/v1',
      run_id: manifest.run_id,
      shard_id: shardId,
      pid: process.pid,
      source_fingerprint: manifest.source_fingerprint,
      test_fingerprint: manifest.test_fingerprint,
      test_selection: manifest.test_selection,
      tool_fingerprint: manifest.tool_fingerprint,
      module_inputs: manifest.module_inputs,
      loaded_inputs: loadedInputReceipt(),
      ...(fixture
        ? {
            published_fixture: fixture,
            fixture_children: fixtureObserver?.finish(),
            loaded_fixture_inputs: [...loadedFixtureInputs]
              .map(([file, sha256]) => ({ root_id: 'published_fixture', path: file, sha256 }))
              .sort((left, right) => left.path.localeCompare(right.path)),
          }
        : {}),
      external_module_inputs: [...externalModules]
        .map(([file, sha256]) => ({ path: file, sha256, classification: 'live-generated-local-module' }))
        .sort((left, right) => left.path.localeCompare(right.path)),
      preload_input: { path: 'tooling/bun-coverage-preload.ts', sha256: preloadDigest },
      active_argv: manifest.active_argv,
      execution_scope: manifest.execution_scope,
      runtime_executable_sha256: manifest.runtime_executable_sha256,
      sources: manifest.sources,
      coverage: Object.fromEntries([...loadedFiles].sort().map((file) => [file, coverage[file]])),
    };
    writeFileSync(temporary, JSON.stringify(report) + '\n', { flag: 'wx', mode: 0o600 });
    renameSync(temporary, target);
  } catch (error) {
    process.stderr.write('Bun coverage child report failed: ' + String(error) + '\n');
    throw error;
  }
});
