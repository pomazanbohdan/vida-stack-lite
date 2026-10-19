import { assertPublishedFixtureChildren, assertPublishedFixtureProcess } from './published-coverage-inputs.js';
import {
  historicalInventoryChildId,
  historicalReferenceJUnit,
  parseHistoricalReference,
  type PublishedBaselineReference,
} from './published-baseline-reference.js';
import coverageApi from 'istanbul-lib-coverage';
import { validateIstanbulFileCoverage as validateFileCoverage } from './coverage-counters.js';
import {
  decodeCoverageShardInvocations,
  decodeCoverageShardPlan,
  decodeCoverageShardProcessEvidence,
  validateCoverageShardOutputLayout,
  mergeCoverageShardCounters,
  validateCoverageShardEvidence,
  type CoverageShardInvocation,
  type CoverageShardProcessEvidence,
  type CoverageShardRunBinding,
  type CoverageShardTerminalEvidence,
} from './coverage-shard-evidence.js';
import type { CoverageShardPlan } from './coverage-shard-plan.js';
import {
  assertCoverageConsumerBinding,
  coverageImageTestContext,
  coverageImageConsumerEnvironment,
  assertCoverageImageTestContext,
} from './coverage-consumer-binding.ts';
import { lstatSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parsePublishedFixtureIdentity } from './published-coverage-inputs.js';
import {
  canonicalJson,
  canonicalTestSelection,
  capturedModuleAbsolutePath,
  capturedModuleInputs,
  coverageInputs,
  instrumentSource,
  isExternalModulePath,
  qualityInputProjections,
  readBunPin,
  readQualityInputs,
  sha256,
  testSelectionFingerprint,
  type FocusedDiagnosticSelection,
  type FinalQualityProjectionInputs,
} from './bun-coverage-evidence.ts';
import {
  maxInstrumentedArtifactBytes,
  maxInstrumentedArtifactsBytes,
  parseInstrumentedSourceDigests,
  readInstrumentedArtifact,
} from './coverage-instrumented-sources.ts';

type CoverageSummaryData = import('istanbul-lib-coverage').CoverageSummaryData;
type FileCoverageData = import('istanbul-lib-instrument').FileCoverageData;
type Digest = {
  path: string;
  sha256: string;
};
type ProcessReceipt = {
  file: string;
  pid: number;
  shard_id: string;
  sha256: string;
};
type RunManifest = {
  schema: string;
  run_id: string;
  bun_version: string;
  runtime_executable_sha256: string;
  snapshot_directory: string;
  source_fingerprint: string;
  test_fingerprint: string;
  test_selection: import('./bun-coverage-evidence.ts').CoverageInputs['test_selection'];
  tool_fingerprint: string;
  sources: Digest[];
  tests: string[];
  test_inputs: Digest[];
  tool_inputs: Digest[];
  module_inputs: Digest[];
  execution_scope: unknown;
  active_argv: unknown;
  source_maps: Record<string, FileCoverageData>;
  instrumented_sources?: unknown;
  coverage_plan?: CoverageShardPlan;
  assignment_plan_sha256?: string;
  shard_invocations?: import('./coverage-shard-evidence.js').CoverageShardInvocation[];
  shard_temporary_root?: unknown;
};
type CoverageReportCommon = {
  published_reference?: PublishedBaselineReference;
  run_id: string;
  manifest_path: string;
  manifest_sha256: string;
  runtime_executable_sha256: string;
  sources: Digest[];
  tests: string[];
  test_selection: import('./bun-coverage-evidence.ts').CoverageInputs['test_selection'];
  test_inputs: Digest[];
  tool_inputs: Digest[];
  module_inputs: Digest[];
  execution_scope: unknown;
  active_argv: unknown;
  source_maps: Record<string, FileCoverageData>;
  source_fingerprint: string;
  test_fingerprint: string;
  tool_fingerprint: string;
  shards: Array<{
    shard_id: string;
    status: number | null;
    signal: string | null;
    error: string | null;
    unknown: boolean;
  }>;
  processes: ProcessReceipt[];
};
type CoverageReport =
  | (CoverageReportCommon & { schema: 'VidaBunCoverageReport/v1'; coverage: Record<string, FileCoverageData> })
  | (Omit<CoverageReportCommon, 'published_reference' | 'test_selection'> & {
      schema: 'VidaBunCoverageReport/v2';
      published_reference?: never;
      test_selection: Omit<CoverageReportCommon['test_selection'], 'mode'> & { mode: 'full-current-test-set' };
    })
  | (Omit<CoverageReportCommon, 'published_reference'> & {
      schema: 'VidaBunFocusedCoverageDiagnostic/v1';
      published_reference?: never;
      qualification_scope: 'focused-diagnostic';
      full_qualification: false;
      frozen_budget_qualification: 'pending';
      function_coverage_kind: 'function-entry-binary';
      metrics: unknown[];
      coverage: Record<string, FileCoverageData>;
    });

type SelectionMode = 'current' | 'published-baseline-bun-native';
type CoverageOptions = { requireFullCoverage?: boolean; reportBytes?: Uint8Array; testSelectionMode?: SelectionMode };
type CoverageInputs = import('./bun-coverage-evidence.ts').CoverageInputs;
type FinalProjections = FinalQualityProjectionInputs;
type InputProjections = Awaited<ReturnType<typeof qualityInputProjections>>;
type DecodedReport = Record<string, unknown> & {
  schema: 'VidaBunCoverageReport/v1' | 'VidaBunCoverageReport/v2' | 'VidaBunFocusedCoverageDiagnostic/v1';
  run_id: string;
  runtime_executable_sha256: string;
  sources: unknown[];
  tests: unknown[];
  test_inputs: unknown[];
  tool_inputs: unknown[];
  shards: unknown[];
  processes: unknown[];
  coverage?: Record<string, unknown>;
};
type DecodedManifest = Record<string, unknown> &
  Pick<RunManifest, 'schema' | 'run_id' | 'snapshot_directory' | 'runtime_executable_sha256'> & {
    sources: unknown[];
    source_maps: object;
  };
type CoverageRun = Awaited<ReturnType<typeof readCoverageRun>>;
type CoverageResult = {
  report: CoverageReport;
  report_sha256: string;
  manifest: RunManifest;
  inputs: CoverageInputs;
  maintained_sources: Digest[];
  tests: string[];
  processes: number;
  totals: CoverageSummaryData;
  files: Record<string, CoverageSummaryData>;
  /** Validator-owned canonical maps from the one checked process/shard merge. */
  coverage: Record<string, FileCoverageData>;
  /** Transient Source-generated maps; never substitute report-owned maps. */
  canonical_source_maps: Record<string, FileCoverageData>;
};
type CoverageResultWithInputs = CoverageResult & { input_projections: InputProjections };

const { createCoverageMap } = coverageApi;
const metricNames = ['functions', 'lines', 'statements', 'branches'] as const;
const v2ReportKeys = [
  'schema',
  'run_id',
  'manifest_path',
  'manifest_sha256',
  'runtime_executable_sha256',
  'sources',
  'tests',
  'test_selection',
  'test_inputs',
  'tool_inputs',
  'module_inputs',
  'execution_scope',
  'active_argv',
  'source_maps',
  'source_fingerprint',
  'test_fingerprint',
  'tool_fingerprint',
  'shards',
  'processes',
]
  .sort()
  .join(',');

function checkedSelectionMode(options: CoverageOptions): SelectionMode {
  const mode = options.testSelectionMode ?? 'current';
  if (mode !== 'current' && mode !== 'published-baseline-bun-native')
    throw new Error('Unsupported coverage report test selection mode.');
  return mode;
}

function sameCoverageInput(key: string, actual: unknown, expected: unknown) {
  if (key === 'test_selection') return sameTestSelection(actual, expected);
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function sameTestSelection(actual: unknown, expected: unknown) {
  return canonicalTestSelection(actual) === canonicalTestSelection(expected);
}

function requireSameTestSelection(actual: unknown, expected: unknown) {
  if (!sameTestSelection(actual, expected)) throw new Error('Coverage process belongs to another test selection.');
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`Invalid record: ${label}`);
  return value as Record<string, unknown>;
}

function requireFull(
  metric: keyof CoverageSummaryData,
  value: CoverageSummaryData[keyof CoverageSummaryData],
  file: string,
) {
  if (
    !Number.isSafeInteger(value.total) ||
    !Number.isSafeInteger(value.covered) ||
    value.total < 0 ||
    value.covered < 0 ||
    value.covered > value.total ||
    (metric !== 'branches' && value.total < 1) ||
    value.covered !== value.total ||
    value.pct !== 100
  )
    throw new Error(`Coverage is not exact 100%: ${file}.${String(metric)}`);
}
function isRunManifest(value: unknown): value is DecodedManifest {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const manifest = value as Record<string, unknown>;
  return (
    (manifest.schema === 'VidaBunCoverageRun/v1' ||
      manifest.schema === 'VidaBunCoverageRun/v2' ||
      manifest.schema === 'VidaBunCoverageRun/v3') &&
    typeof manifest.run_id === 'string' &&
    typeof manifest.snapshot_directory === 'string' &&
    Array.isArray(manifest.sources) &&
    typeof manifest.source_maps === 'object' &&
    manifest.source_maps !== null &&
    typeof manifest.runtime_executable_sha256 === 'string'
  );
}

function readCoverageReport(reportPath: string, reportBytes?: Uint8Array, allowFocused = false) {
  const bytes = reportBytes ?? readFileSync(reportPath);
  const report = record(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)), 'coverage report');
  const focused = report.schema === 'VidaBunFocusedCoverageDiagnostic/v1';
  if (allowFocused && !focused) throw new Error('Expected the focused diagnostic schema.');
  if (
    (report.schema !== 'VidaBunCoverageReport/v1' &&
      report.schema !== 'VidaBunCoverageReport/v2' &&
      (!focused || !allowFocused)) ||
    typeof report.run_id !== 'string' ||
    !/^[0-9a-f-]{36}$/u.test(report.run_id) ||
    typeof report.runtime_executable_sha256 !== 'string'
  )
    throw new Error('Coverage report schema or run identity is invalid.');
  for (const key of ['sources', 'tests', 'test_inputs', 'tool_inputs', 'shards', 'processes'])
    if (!Array.isArray(report[key])) throw new Error(`Coverage report ${key} are missing.`);
  let coverage: Record<string, unknown> | undefined;
  if (report.schema === 'VidaBunCoverageReport/v1' || focused) {
    coverage = record(report.coverage, 'coverage report counters');
  } else {
    if (Object.hasOwn(report, 'coverage')) throw new Error('Aggregate counters are forbidden in coverage report v2.');
    if (Object.hasOwn(report, 'published_reference'))
      throw new Error('Historical reference admission is forbidden in coverage report v2.');
    if (Object.keys(report).sort().join(',') !== v2ReportKeys)
      throw new Error('Coverage report v2 contains unknown or missing fields.');
  }
  return { report: report as DecodedReport, coverage, reportSha256: sha256(bytes) };
}

function coverageRunPath(report: Pick<DecodedReport, 'schema' | 'run_id'>, ...parts: string[]): string {
  const output = report.schema === 'VidaBunFocusedCoverageDiagnostic/v1' ? 'diagnostics/runs' : 'runs';
  return path.posix.join('coverage/bun-unified', output, report.run_id, ...parts);
}

function readCoverageManifest(root: string, report: DecodedReport) {
  const expectedManifestPath = coverageRunPath(report, 'manifest.json');
  if (report.manifest_path !== expectedManifestPath) throw new Error('Coverage manifest path is not canonical.');
  const manifestPath = path.join(root, ...expectedManifestPath.split('/'));
  const manifestBytes = readFileSync(manifestPath);
  if (sha256(manifestBytes) !== report.manifest_sha256) throw new Error('Coverage manifest fingerprint mismatch.');
  const manifestValue: unknown = JSON.parse(manifestBytes.toString('utf8'));
  if (!isRunManifest(manifestValue) || manifestValue.run_id !== report.run_id)
    throw new Error('Coverage manifest identity mismatch.');
  return manifestValue;
}

async function assertHistoricalRuntimeArtifact(
  root: string,
  report: Record<string, unknown>,
  manifest: Record<string, unknown>,
  historicalRuntimeExecutablePath: string,
): Promise<string> {
  const absolutePath = path.resolve(historicalRuntimeExecutablePath);
  const runtimeStat = lstatSync(absolutePath);
  if (!runtimeStat.isFile() || runtimeStat.isSymbolicLink())
    throw new Error('Historical runtime artifact must be an owned regular file, not a symlink.');
  const runtimeExecutableSha256 = sha256(readFileSync(absolutePath));
  const historicalPin = await readBunPin(root);
  if (
    manifest.bun_version !== historicalPin ||
    typeof manifest.runtime_executable_sha256 !== 'string' ||
    !/^[0-9a-f]{64}$/u.test(manifest.runtime_executable_sha256) ||
    manifest.runtime_executable_sha256 !== runtimeExecutableSha256 ||
    report.runtime_executable_sha256 !== runtimeExecutableSha256
  )
    throw new Error('Historical coverage report is not bound to its retained package-pinned Bun runtime.');
  return runtimeExecutableSha256;
}

async function validateRuntimeBinding(
  root: string,
  report: DecodedReport,
  manifest: DecodedManifest,
  historicalRuntimeExecutablePath?: string,
) {
  if (historicalRuntimeExecutablePath !== undefined)
    return assertHistoricalRuntimeArtifact(root, report, manifest, historicalRuntimeExecutablePath);
  const runtimeExecutableSha256 = sha256(readFileSync(process.execPath));
  if (
    manifest.bun_version !== (await readBunPin(root)) ||
    process.versions.bun !== manifest.bun_version ||
    !/^[0-9a-f]{64}$/u.test(manifest.runtime_executable_sha256) ||
    manifest.runtime_executable_sha256 !== runtimeExecutableSha256 ||
    report.runtime_executable_sha256 !== runtimeExecutableSha256
  )
    throw new Error('Coverage report was not collected by the package-pinned Bun runtime.');
  return runtimeExecutableSha256;
}

async function readCoverageRun(
  reportPath: string,
  root: string,
  reportBytes?: Uint8Array,
  historicalRuntimeExecutablePath?: string,
  allowFocused = false,
) {
  const { report, coverage, reportSha256 } = readCoverageReport(reportPath, reportBytes, allowFocused);
  const manifest = readCoverageManifest(root, report);
  const runtimeExecutableSha256 = await validateRuntimeBinding(root, report, manifest, historicalRuntimeExecutablePath);
  return { report, coverage, reportSha256, manifest, runtimeExecutableSha256 };
}

async function captureRunInputs(
  root: string,
  report: DecodedReport,
  manifest: DecodedManifest,
  selectionMode: SelectionMode | FocusedDiagnosticSelection,
) {
  const current = await coverageInputs(root, selectionMode);
  verifyInputBindings(report, manifest, current);
  verifySnapshotFiles(root, report, manifest, current);
  return current;
}

async function historicalSnapshotInputs(
  root: string,
  report: DecodedReport,
  manifest: DecodedManifest,
): Promise<CoverageInputs> {
  // A historical consumer must use the producer's frozen input closure. Calling
  // qualityInputs here would rediscover files with today's inventory code and
  // fail when the archived producer's tooling implementation is absent.
  const readDigests = (value: unknown, label: string): Digest[] => {
    if (!Array.isArray(value)) throw new Error(`Historical coverage ${label} are missing.`);
    const seen = new Set<string>();
    return value.map((item) => {
      const entry = record(item, `historical ${label} entry`);
      const file = entry.path;
      const digest = entry.sha256;
      if (typeof file !== 'string' || typeof digest !== 'string' || !/^[0-9a-f]{64}$/u.test(digest) || seen.has(file))
        throw new Error(`Historical coverage ${label} entry is invalid.`);
      seen.add(file);
      return { path: file, sha256: digest };
    });
  };
  const sources = readDigests(manifest.sources, 'sources');
  const testInputs = readDigests(manifest.test_inputs, 'test inputs');
  const toolInputs = readDigests(manifest.tool_inputs, 'tool inputs');
  const tests = manifest.tests;
  const rawSelection = manifest.test_selection;
  if (canonicalTestSelection(rawSelection) === null) throw new Error('Historical coverage test selection is invalid.');
  const selection = record(rawSelection, 'test selection');
  if (
    !Array.isArray(tests) ||
    !tests.every((entry) => typeof entry === 'string') ||
    selection.mode !== 'published-baseline-bun-native' ||
    !Array.isArray(selection.tests) ||
    !selection.tests.every((entry) => typeof entry === 'string') ||
    JSON.stringify(selection.tests) !== JSON.stringify(tests)
  )
    throw new Error('Historical coverage test selection is invalid.');
  const parsedFixture =
    selection.published_fixture === undefined ? undefined : parsePublishedFixtureIdentity(selection.published_fixture);
  const parsedContractInputs =
    selection.published_contract_inputs === undefined
      ? undefined
      : readDigests(selection.published_contract_inputs, 'published contract inputs');
  const parsedSelection = {
    ...selection,
    mode: 'published-baseline-bun-native' as const,
    tests: selection.tests,
    ...(parsedFixture ? { published_fixture: parsedFixture } : {}),
    ...(parsedContractInputs ? { published_contract_inputs: parsedContractInputs } : {}),
  };
  const sourceJson = canonicalJson(sources);
  const toolJson = canonicalJson(toolInputs);
  if (
    sourceJson === undefined ||
    toolJson === undefined ||
    manifest.source_fingerprint !== sha256(sourceJson) ||
    manifest.test_fingerprint !== testSelectionFingerprint(parsedSelection, testInputs) ||
    manifest.tool_fingerprint !== sha256(toolJson)
  )
    throw new Error('Historical coverage input fingerprints are invalid.');
  const expectedModules = capturedModuleInputs({ sources, test_inputs: testInputs, tool_inputs: toolInputs });

  const snapshotRelative = coverageRunPath(report, 'snapshot');
  if (manifest.snapshot_directory !== snapshotRelative) throw new Error('Coverage snapshot path is not canonical.');
  const snapshotDigests = new Map<string, string>();
  for (const entry of [...sources, ...testInputs, ...toolInputs]) {
    const prior = snapshotDigests.get(entry.path);
    if (prior !== undefined && prior !== entry.sha256)
      throw new Error(`Historical coverage input digest conflicts across categories: ${entry.path}`);
    snapshotDigests.set(entry.path, entry.sha256);
  }
  for (const entry of parsedFixture?.inputs ?? []) {
    const file = `${parsedFixture?.directory}/${entry.path}`;
    const prior = snapshotDigests.get(file);
    if (prior !== undefined && prior !== entry.sha256)
      throw new Error(`Historical fixture input digest conflicts with measurement inputs: ${file}`);
    snapshotDigests.set(file, entry.sha256);
  }
  for (const entry of parsedContractInputs ?? []) {
    const bound = [...sources, ...testInputs, ...toolInputs].find((input) => input.path === entry.path);
    if (!bound || bound.sha256 !== entry.sha256)
      throw new Error(`Historical published contract input is not bound by the tool closure: ${entry.path}`);
  }
  const snapshotRoot = path.join(root, ...snapshotRelative.split('/'));
  const snapshotBytes = await readQualityInputs(snapshotRoot, [...snapshotDigests.keys()], 'snapshot');
  const inputBytes: Record<string, Buffer> = {};
  for (const [file, digest] of snapshotDigests) {
    const bytes = snapshotBytes.get(file);
    if (!bytes) throw new Error(`Coverage input is missing from its snapshot: ${file}`);
    if (sha256(bytes) !== digest) throw new Error(`Coverage input differs from its snapshot: ${file}`);
    inputBytes[file] = bytes;
  }
  return {
    sources,
    source_fingerprint: manifest.source_fingerprint as string,
    tests: tests as string[],
    test_selection: parsedSelection as CoverageInputs['test_selection'],
    test_inputs: testInputs,
    test_fingerprint: manifest.test_fingerprint as string,
    tool_inputs: toolInputs,
    tool_fingerprint: manifest.tool_fingerprint as string,
    module_inputs: expectedModules,
    input_bytes: inputBytes,
  };
}

function validatedCoverageSummary(
  root: string,
  run: CoverageRun,
  current: CoverageInputs,
  requireFullCoverage: boolean,
) {
  const { maps: sourceMaps, code } = expectedSourceInstrumentation(root, current);
  validateInstrumentedArtifacts(root, run, current, code);
  if (
    JSON.stringify(run.manifest.source_maps) !== JSON.stringify(sourceMaps) ||
    JSON.stringify(run.report.source_maps) !== JSON.stringify(sourceMaps)
  )
    throw new Error('Coverage initialization maps do not match pinned Istanbul output.');
  const merged = mergeProcessCoverage(root, run.report, run.manifest, current, sourceMaps, run.runtimeExecutableSha256);
  const summary = merged.getCoverageSummary().toJSON();
  const perFile: Record<string, CoverageSummaryData> = {};
  for (const source of current.sources)
    perFile[source.path] = merged.fileCoverageFor(path.resolve(root, source.path)).toSummary().toJSON();
  if (requireFullCoverage) requireCompleteCoverage(current, summary, perFile);
  return { summary, perFile, sourceMaps, coverage: merged.toJSON() };
}

function requireCompleteCoverage(
  current: CoverageInputs,
  summary: CoverageSummaryData,
  perFile: Record<string, CoverageSummaryData>,
) {
  for (const source of current.sources) {
    const fileSummary = perFile[source.path];
    if (!fileSummary) throw new Error(`Coverage summary is missing: ${source.path}`);
    for (const metric of metricNames) requireFull(metric, fileSummary[metric], source.path);
  }
  for (const metric of metricNames) requireFull(metric, summary[metric], 'total');
}

function verifyInputBindings(report: DecodedReport, manifest: DecodedManifest, current: CoverageInputs) {
  for (const key of [
    'sources',
    'source_fingerprint',
    'tests',
    'test_selection',
    'test_inputs',
    'test_fingerprint',
    'tool_inputs',
    'tool_fingerprint',
    'module_inputs',
  ] as const) {
    const expected = current[key];
    if (!sameCoverageInput(key, manifest[key], expected) || !sameCoverageInput(key, report[key], expected))
      throw new Error(`Coverage input changed since collection: ${key}`);
  }
  if (
    JSON.stringify(report.execution_scope) !== JSON.stringify(manifest.execution_scope) ||
    JSON.stringify(report.active_argv) !== JSON.stringify(manifest.active_argv)
  )
    throw new Error('Coverage snapshot execution metadata differs from its manifest.');
}

function verifySnapshotFiles(root: string, report: DecodedReport, manifest: DecodedManifest, current: CoverageInputs) {
  const snapshotRelative = coverageRunPath(report, 'snapshot');
  if (manifest.snapshot_directory !== snapshotRelative) throw new Error('Coverage snapshot path is not canonical.');
  const snapshotDirectory = path.join(root, ...snapshotRelative.split('/'));
  assertCoverageSnapshotBytes(snapshotDirectory, current.input_bytes);
}

/** Compare the already captured bytes; no new inventory or hash pass. */
export function assertCoverageSnapshotBytes(
  snapshotDirectory: string,
  inputBytes: Readonly<Record<string, Uint8Array>>,
): void {
  for (const [file, bytes] of Object.entries(inputBytes)) {
    const snapshotBytes = readFileSync(path.join(snapshotDirectory, ...file.split('/')));
    if (!Buffer.from(bytes).equals(snapshotBytes)) throw new Error(`Coverage input differs from its snapshot: ${file}`);
  }
}

function expectedSourceInstrumentation(root: string, current: CoverageInputs) {
  const maps: Record<string, FileCoverageData> = {};
  const code: Record<string, Buffer> = {};
  for (const source of current.sources) {
    const absolute = path.resolve(root, source.path);
    const bytes = current.input_bytes[source.path];
    if (!bytes) throw new Error(`Coverage source bytes are missing: ${source.path}`);
    const content = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    const transformed = instrumentSource(absolute, content);
    maps[absolute] = transformed.fileCoverage;
    code[source.path] = Buffer.from(transformed.code, 'utf8');
  }
  return { maps, code };
}

function validateInstrumentedArtifacts(
  root: string,
  run: CoverageRun,
  current: CoverageInputs,
  canonicalCode: Record<string, Buffer>,
) {
  if (run.manifest.schema === 'VidaBunCoverageRun/v1') {
    if (run.manifest.instrumented_sources !== undefined)
      throw new Error('Coverage instrumented-source metadata requires a v2 manifest.');
    return;
  }
  const captured = new Set(
    [...current.sources, ...current.test_inputs, ...current.tool_inputs].map((entry) => entry.path),
  );
  const rows = parseInstrumentedSourceDigests(run.manifest.instrumented_sources, current.sources, captured);
  const snapshotRoot = path.join(root, ...run.manifest.snapshot_directory.split('/'));
  let total = 0;
  for (const row of rows) {
    const actual = readInstrumentedArtifact(snapshotRoot, row);
    total += actual.length;
    if (actual.length > maxInstrumentedArtifactBytes || total > maxInstrumentedArtifactsBytes)
      throw new Error('Coverage instrumented artifacts exceed configured byte limits.');
    if (sha256(actual) !== row.artifact_sha256)
      throw new Error('Coverage instrumented artifact digest differs: ' + row.path);
    const expected = canonicalCode[row.path];
    if (expected === undefined || !actual.equals(expected))
      throw new Error('Coverage instrumented artifact differs from canonical instrumentation: ' + row.path);
  }
}

function verifyLoadedInputs(
  root: string,
  child: Record<string, unknown>,
  current: CoverageInputs,
  manifest: DecodedManifest,
  report: DecodedReport,
) {
  const actualModulePaths = new Set<string>();
  for (const entry of current.module_inputs) {
    const absolute = capturedModuleAbsolutePath(root, entry.path);
    if (actualModulePaths.has(absolute)) throw new Error('Captured module paths alias the same runtime file.');
    actualModulePaths.add(absolute);
  }
  const sourcePaths = Object.keys(record(child.coverage, 'process coverage counters')).map((file) =>
    path.relative(root, path.resolve(file)).replaceAll('\\', '/'),
  );
  assertPublishedFixtureProcess(current.test_selection.published_fixture, child, [...current.tests, ...sourcePaths]);
  assertPublishedFixtureChildren(
    current.test_selection.published_fixture,
    child,
    current.test_selection.published_fixture
      ? path.join(root, manifest.snapshot_directory, current.test_selection.published_fixture.directory)
      : undefined,
  );
  verifyLoadedIdentity(child, current, manifest, report);
  verifyExternalModules(child.external_module_inputs);
  const expected = new Map(
    [...current.sources, ...current.test_inputs, ...current.tool_inputs].map((entry) => [entry.path, entry.sha256]),
  );
  const observed = loadedInputPaths(child.loaded_inputs, expected);
  for (const source of sourcePaths)
    if (!observed.has(source)) throw new Error('Coverage process counters include an unloaded Source: ' + source);
  const requiredTests =
    manifest.schema === 'VidaBunCoverageRun/v3'
      ? stringArray(child.assigned_tests, 'coverage process assigned tests')
      : current.tests;
  for (const test of requiredTests)
    if (!observed.has(test)) throw new Error('Selected test did not execute from captured bytes: ' + test);
  if (manifest.schema === 'VidaBunCoverageRun/v3') assertNoSiblingTestLoads(observed, current.tests, requiredTests);
  let evidenceProvider = 'tooling/bun-coverage-evidence.ts';
  if (current.test_selection.mode === 'published-baseline-bun-native') {
    const providers = current.tool_inputs.filter(
      (entry) => entry.path === evidenceProvider || entry.path === 'tooling/bun-coverage-evidence.mjs',
    );
    if (providers.length !== 1) throw new Error('Coverage bootstrap role is missing or ambiguous: coverage evidence');
    evidenceProvider = providers[0]!.path;
  }
  for (const required of [
    'tooling/bun-coverage-preload.ts',
    evidenceProvider,
    ...(manifest.schema !== 'VidaBunCoverageRun/v1' ? ['tooling/coverage-instrumented-sources.ts'] : []),
    'tooling/source-instrumentation.ts',
    'tooling/maintained-source-inventory.ts',
    ...(manifest.schema === 'VidaBunCoverageRun/v3'
      ? ['tooling/coverage-shard-evidence.ts', 'tooling/coverage-counters.ts']
      : []),
  ])
    if (!observed.has(required)) throw new Error('Snapshot bootstrap dependency was not attested: ' + required);
}

function stringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string'))
    throw new Error(`Coverage ${label} are malformed.`);
  return value as string[];
}

function verifyLoadedIdentity(
  child: Record<string, unknown>,
  current: CoverageInputs,
  manifest: DecodedManifest,
  report: DecodedReport,
) {
  let shardInvocation: CoverageShardInvocation | undefined;
  if (manifest.schema === 'VidaBunCoverageRun/v3') {
    const invocations = decodeCoverageShardInvocations(manifest.shard_invocations);
    if (!invocations || typeof child.shard_id !== 'string')
      throw new Error('Versioned coverage process invocation binding is malformed.');
    shardInvocation = invocations.find((entry) => entry.shard_id === child.shard_id);
    if (!shardInvocation) throw new Error('Versioned coverage process has no shard invocation binding.');
  }
  const expectedArgv = shardInvocation?.argv ?? manifest.active_argv;
  if (
    JSON.stringify(child.module_inputs) !== JSON.stringify(current.module_inputs) ||
    JSON.stringify(child.execution_scope) !== JSON.stringify(manifest.execution_scope) ||
    JSON.stringify(child.active_argv) !== JSON.stringify(expectedArgv) ||
    (manifest.schema === 'VidaBunCoverageRun/v3' &&
      (child.cwd !== shardInvocation?.cwd || child.environment_sha256 !== shardInvocation?.environment_sha256)) ||
    JSON.stringify(child.module_inputs) !== JSON.stringify(report.module_inputs)
  )
    throw new Error('Coverage process snapshot metadata differs from the captured run.');
  const preload = current.tool_inputs.find((entry) => entry.path === 'tooling/bun-coverage-preload.ts');
  if (
    JSON.stringify(child.preload_input) !==
    JSON.stringify({ path: 'tooling/bun-coverage-preload.ts', sha256: preload?.sha256 })
  )
    throw new Error('Coverage process preload bytes differ from captured tooling.');
}

function verifyExternalModules(values: unknown) {
  if (!Array.isArray(values)) throw new Error('Coverage process external-module receipt is missing.');
  const seen = new Set<string>();
  for (const value of values) {
    const entry = record(value, 'external local module');
    if (
      typeof entry.path !== 'string' ||
      typeof entry.sha256 !== 'string' ||
      !/^[0-9a-f]{64}$/u.test(entry.sha256) ||
      entry.classification !== 'live-generated-local-module' ||
      seen.has(entry.path) ||
      !isExternalModulePath(entry.path)
    )
      throw new Error('Coverage process external-module classification is invalid.');
    seen.add(entry.path);
  }
}

function loadedInputPaths(values: unknown, expected: Map<string, string>) {
  if (!Array.isArray(values)) throw new Error('Coverage process loaded-input receipt is missing.');
  const observed = new Set<string>();
  for (const value of values) {
    const entry = record(value, 'loaded snapshot input');
    if (
      typeof entry.path !== 'string' ||
      typeof entry.sha256 !== 'string' ||
      observed.has(entry.path) ||
      expected.get(entry.path) !== entry.sha256
    )
      throw new Error('Coverage process loaded an unbound local input.');
    observed.add(entry.path);
  }
  return observed;
}

function assertNoSiblingTestLoads(loaded: Set<string>, selected: readonly string[], assigned: readonly string[]) {
  const assignedSet = new Set(assigned);
  for (const test of selected)
    if (!assignedSet.has(test) && loaded.has(test))
      throw new Error('Coverage shard loaded a sibling test outside its assignment: ' + test);
}

function processCoverage(
  root: string,
  child: Record<string, unknown>,
  report: DecodedReport,
  receipt: ProcessReceipt,
  current: CoverageInputs,
  runtimeExecutableSha256: string,
  manifest: DecodedManifest,
) {
  const identities = [
    ['schema', 'VidaBunCoverageProcess/v1'],
    ['run_id', report.run_id],
    ['shard_id', 'bun-test'],
    ['source_fingerprint', current.source_fingerprint],
    ['test_fingerprint', current.test_fingerprint],
    ['tool_fingerprint', current.tool_fingerprint],
    ['runtime_executable_sha256', runtimeExecutableSha256],
  ] as const;
  for (const [key, expected] of identities)
    if (child[key] !== expected) throw new Error('Coverage process belongs to another run or input set.');
  requireSameTestSelection(child.test_selection, current.test_selection);
  verifyLoadedInputs(root, child, current, manifest, report);
  if (
    typeof child.pid !== 'number' ||
    !Number.isSafeInteger(child.pid) ||
    child.pid < 1 ||
    child.pid !== receipt.pid ||
    JSON.stringify(child.sources) !== JSON.stringify(current.sources)
  )
    throw new Error('Coverage process identity is invalid.');
  return record(child.coverage, 'process coverage counters');
}

function requireCleanShard(report: DecodedReport, historical: boolean) {
  if (report.shards.length !== 1) throw new Error('Coverage shard receipt is missing or duplicated.');
  const shard = report.shards[0];
  const checkedShard = record(shard, 'coverage shard receipt');
  const fields: Array<[string, unknown]> = Object.entries({
    shard_id: 'bun-test',
    status: historical ? 1 : 0,
    signal: null,
    error: null,
    unknown: false,
  });
  for (const [key, expected] of fields)
    if (checkedShard[key] !== expected)
      throw new Error('The Bun Test shard did not finish with a clean terminal result.');
}

function hasReceiptFields(value: Record<string, unknown>): value is Record<string, unknown> & ProcessReceipt {
  return (
    typeof value.file === 'string' &&
    typeof value.pid === 'number' &&
    Number.isSafeInteger(value.pid) &&
    value.pid > 0 &&
    typeof value.sha256 === 'string' &&
    /^[0-9a-f]{64}$/u.test(value.sha256) &&
    typeof value.shard_id === 'string' &&
    /^[A-Za-z0-9_-]+$/u.test(value.shard_id)
  );
}

function readProcessReceipt(
  root: string,
  report: DecodedReport,
  value: unknown,
  receiptNames: Set<string>,
  receiptPids: Set<number>,
  versioned = false,
) {
  const raw = record(value, 'process receipt');
  if (!hasReceiptFields(raw)) throw new Error('Coverage process receipt identity is invalid.');
  const expectedFilename = versioned
    ? new RegExp(`^${raw.shard_id}/${report.run_id}\\.${raw.shard_id}\\.${raw.pid}\\.[0-9a-f-]{36}\\.json$`, 'u')
    : new RegExp('^' + report.run_id + '\\.bun-test\\.\\d+\\.[0-9a-f-]{36}\\.json$', 'u');
  if (
    receiptNames.has(raw.file) ||
    !expectedFilename.test(raw.file) ||
    (!versioned && path.basename(raw.file) !== raw.file) ||
    (versioned && (raw.file.includes('\\') || path.posix.normalize(raw.file) !== raw.file))
  )
    throw new Error('Coverage process receipt filename is invalid or duplicated.');
  if (receiptPids.has(raw.pid)) throw new Error('Duplicate coverage process identity.');
  const receipt: ProcessReceipt = raw;
  receiptNames.add(receipt.file);
  receiptPids.add(receipt.pid);
  const processPath = path.join(root, coverageRunPath(report, 'processes', receipt.file));
  const processBytes = readFileSync(processPath);
  if (sha256(processBytes) !== receipt.sha256) throw new Error('Coverage process receipt fingerprint mismatch.');
  const child = record(JSON.parse(processBytes.toString('utf8')), `${receipt.file} report`);
  return { receipt, child };
}

function mergeChildCoverage(
  merged: import('istanbul-lib-coverage').CoverageMap,
  coverage: Record<string, unknown>,
  expectedPaths: string[],
  expectedSourceMaps: Record<string, FileCoverageData>,
) {
  const observedPaths = [];
  for (const file of Object.keys(coverage)) observedPaths.push(path.resolve(file));
  observedPaths.sort();
  for (const absolute of observedPaths) {
    const expected = expectedSourceMaps[absolute];
    if (!expected || !expectedPaths.includes(absolute))
      throw new Error(`Coverage process source is outside maintained inventory: ${absolute}`);
    validateFileCoverage(absolute, coverage[absolute], expected);
  }
  merged.merge(coverage);
}

function validateHistoricalReference(
  root: string,
  report: DecodedReport,
  manifest: DecodedManifest,
  current: CoverageInputs,
) {
  if (report.published_reference === undefined) {
    if (current.test_selection.mode === 'published-baseline-bun-native')
      throw new Error('Historical baseline report has no typed measurement admission.');
    return undefined;
  }
  const fixture = current.test_selection.published_fixture;
  if (current.test_selection.mode !== 'published-baseline-bun-native' || !fixture)
    throw new Error('Current coverage cannot adopt historical reference admission.');
  const historical = parseHistoricalReference(report.published_reference, report.run_id);
  const bytes = readFileSync(path.join(root, ...historical.junit.path.split('/')));
  if (bytes.length !== historical.junit.bytes || sha256(bytes) !== historical.junit.sha256)
    throw new Error('Historical reference JUnit fingerprint differs.');
  const reporter = '--reporter-outfile=' + path.join(root, ...historical.junit.path.split('/'));
  if (
    !Array.isArray(manifest.active_argv) ||
    manifest.active_argv.filter((arg) => arg === '--reporter=junit').length !== 1 ||
    manifest.active_argv.filter((arg) => arg === reporter).length !== 1
  )
    throw new Error('Historical reference reporter invocation differs.');
  historicalReferenceJUnit(bytes, path.join(root, manifest.snapshot_directory, fixture.directory), current.tests);
  return historical;
}

function mergeProcessCoverage(
  root: string,
  report: DecodedReport,
  manifest: DecodedManifest,
  current: CoverageInputs,
  expectedSourceMaps: Record<string, FileCoverageData>,
  runtimeExecutableSha256: string,
) {
  const historical = validateHistoricalReference(root, report, manifest, current);
  if (manifest.schema === 'VidaBunCoverageRun/v3') {
    const currentSelection =
      current.test_selection.mode === 'full-current-test-set' || current.test_selection.mode === 'focused-diagnostic';
    if (report.schema === 'VidaBunCoverageReport/v2' && !currentSelection)
      throw new Error('Coverage report v2 is current-selection only.');
    if (!currentSelection) throw new Error('Versioned coverage shard evidence is current-selection only.');
    if (historical) throw new Error('Historical coverage cannot use versioned shard evidence.');
    const plan = decodeCoverageShardPlan(manifest.coverage_plan);
    const invocations = decodeCoverageShardInvocations(manifest.shard_invocations);
    if (!plan || typeof manifest.assignment_plan_sha256 !== 'string' || !invocations)
      throw new Error('Versioned coverage manifest has no assignment plan or invocation bindings.');
    const selectedTestSet = new Set(current.tests);
    const selectedTestInputs = current.test_inputs.filter(({ path: file }) => selectedTestSet.has(file));
    const binding: CoverageShardRunBinding = {
      schema: 'VidaBunCoverageRun/v3',
      run_id: report.run_id,
      source_fingerprint: current.source_fingerprint,
      test_fingerprint: current.test_fingerprint,
      tool_fingerprint: current.tool_fingerprint,
      runtime_executable_sha256: runtimeExecutableSha256,
      assignment_plan_sha256: manifest.assignment_plan_sha256,
      tests: current.tests,
      selected_test_inputs: selectedTestInputs,
      shard_invocations: invocations,
      snapshot_directory: path.resolve(root, ...manifest.snapshot_directory.split('/')),
    };
    if (manifest.shard_temporary_root !== undefined && typeof manifest.shard_temporary_root !== 'string')
      throw new Error('Coverage shard temporary root is malformed.');
    validateCoverageShardOutputLayout(binding, root, manifest.shard_temporary_root);
    const processes: CoverageShardProcessEvidence[] = [];
    const terminals: CoverageShardTerminalEvidence[] = [];
    const receiptNames = new Set<string>();
    const receiptPids = new Set<number>();
    for (const rawReceipt of report.processes) {
      const { receipt, child } = readProcessReceipt(root, report, rawReceipt, receiptNames, receiptPids, true);
      requireSameTestSelection(child.test_selection, current.test_selection);
      if (JSON.stringify(child.sources) !== JSON.stringify(current.sources))
        throw new Error('Coverage process source inventory differs from the captured source inventory.');
      verifyLoadedInputs(root, child, current, manifest, report);
      const processEvidence = decodeCoverageShardProcessEvidence(child);
      if (!processEvidence) throw new Error('Versioned coverage process receipt fields are malformed.');
      if (processEvidence.pid !== receipt.pid || processEvidence.shard_id !== receipt.shard_id)
        throw new Error('Coverage process receipt does not join its shard and PID.');
      processes.push(processEvidence);
    }
    for (const value of report.shards) {
      const terminal = record(value, 'coverage shard terminal receipt');
      if (
        typeof terminal.run_id !== 'string' ||
        typeof terminal.shard_id !== 'string' ||
        typeof terminal.pid !== 'number' ||
        !Number.isSafeInteger(terminal.pid) ||
        (typeof terminal.status !== 'number' && terminal.status !== null) ||
        (typeof terminal.signal !== 'string' && terminal.signal !== null) ||
        (typeof terminal.error !== 'string' && terminal.error !== null) ||
        typeof terminal.unknown !== 'boolean'
      )
        throw new Error('Coverage shard terminal receipt is malformed.');
      terminals.push({
        run_id: terminal.run_id,
        shard_id: terminal.shard_id,
        pid: terminal.pid,
        status: terminal.status,
        signal: terminal.signal,
        error: terminal.error,
        unknown: terminal.unknown,
      });
    }
    validateCoverageShardEvidence({ run: binding, plan, processes, terminals });
    const sparseMaps = processes.map((entry) => record(entry.coverage, `coverage shard ${entry.shard_id} counters`));
    const mergedMaps = mergeCoverageShardCounters(expectedSourceMaps, sparseMaps);
    if (report.schema === 'VidaBunCoverageReport/v1' && JSON.stringify(mergedMaps) !== JSON.stringify(report.coverage))
      throw new Error('Final counters do not equal the checked global shard merge.');
    return createCoverageMap(mergedMaps);
  }
  if (report.schema === 'VidaBunCoverageReport/v2')
    throw new Error('Coverage report v2 requires a versioned current manifest.');
  requireCleanShard(report, historical !== undefined);
  if (!report.processes.length) throw new Error('Coverage process receipts are missing.');

  const expectedPaths = [];
  for (const entry of current.sources) expectedPaths.push(path.resolve(root, entry.path));
  expectedPaths.sort();
  const merged = createCoverageMap(structuredClone(expectedSourceMaps));
  const receiptNames = new Set<string>();
  const receiptPids = new Set<number>();
  let historicalObserved = false;
  for (const rawReceipt of report.processes) {
    const { receipt, child } = readProcessReceipt(root, report, rawReceipt, receiptNames, receiptPids);
    const childCoverage = processCoverage(root, child, report, receipt, current, runtimeExecutableSha256, manifest);
    if (historical) {
      const fixture = current.test_selection.published_fixture;
      if (
        !fixture ||
        historicalObserved ||
        receipt.file !== historical.inventory.process_file ||
        receipt.pid !== historical.inventory.pid ||
        historicalInventoryChildId(child, fixture, path.join(root, manifest.snapshot_directory, fixture.directory)) !==
          historical.inventory.child_id
      )
        throw new Error('Historical reference inventory process binding differs.');
      historicalObserved = true;
    }
    mergeChildCoverage(merged, childCoverage, expectedPaths, expectedSourceMaps);
  }
  if (historical && !historicalObserved) throw new Error('Historical reference inventory process is missing.');
  const mergedPaths = [];
  for (const file of merged.files()) mergedPaths.push(path.resolve(file));
  mergedPaths.sort();
  if (JSON.stringify(mergedPaths) !== JSON.stringify(expectedPaths))
    throw new Error('Merged coverage source cardinality differs.');
  if (JSON.stringify(merged.toJSON()) !== JSON.stringify(report.coverage))
    throw new Error('Final counters do not equal merged process counters.');
  return merged;
}

function validateCoverageReportInternal(
  reportPath: string,
  root: string,
  options: CoverageOptions,
): Promise<CoverageResult>;
function validateCoverageReportInternal(
  reportPath: string,
  root: string,
  options: CoverageOptions,
  finalProjections: undefined,
  historicalRuntimeExecutablePath: undefined,
  focusedSelection: FocusedDiagnosticSelection,
): Promise<CoverageResult>;
function validateCoverageReportInternal(
  reportPath: string,
  root: string,
  options: CoverageOptions,
  finalProjections: FinalProjections,
): Promise<CoverageResultWithInputs>;
function validateCoverageReportInternal(
  reportPath: string,
  root: string,
  options: CoverageOptions,
  finalProjections: undefined,
  historicalRuntimeExecutablePath: string,
): Promise<CoverageResult>;
async function validateCoverageReportInternal(
  reportPath: string,
  root: string,
  options: CoverageOptions,
  finalProjections?: FinalProjections,
  historicalRuntimeExecutablePath?: string,
  focusedSelection?: FocusedDiagnosticSelection,
) {
  const selectionMode = checkedSelectionMode(options);
  if (focusedSelection) {
    if (selectionMode !== 'current' || finalProjections || historicalRuntimeExecutablePath)
      throw new Error('Focused diagnostic validation cannot use historical or projected input modes.');
  }
  if (finalProjections && selectionMode !== 'current')
    throw new Error('Final quality input projections require the current test selection.');
  const run = await readCoverageRun(
    reportPath,
    root,
    options.reportBytes,
    historicalRuntimeExecutablePath,
    focusedSelection !== undefined,
  );
  if (focusedSelection) validateFocusedReportQualifiers(run.report, focusedSelection);
  else if (run.report.schema === 'VidaBunFocusedCoverageDiagnostic/v1')
    throw new Error('Focused diagnostic reports require the focused coverage validator.');
  const inputProjections = finalProjections ? await qualityInputProjections(root, finalProjections) : undefined;
  const current =
    inputProjections?.coverage ??
    (historicalRuntimeExecutablePath
      ? await historicalSnapshotInputs(root, run.report, run.manifest)
      : await captureRunInputs(root, run.report, run.manifest, focusedSelection ?? selectionMode));
  if (inputProjections) {
    verifyInputBindings(run.report, run.manifest, current);
    verifySnapshotFiles(root, run.report, run.manifest, current);
  } else if (historicalRuntimeExecutablePath) {
    // Historical closure reconstruction binds original declared inputs while
    // preserving the common report/manifest input agreement guard.
    verifyInputBindings(run.report, run.manifest, current);
  }
  if (selectionMode === 'current') {
    const scope = record(run.manifest.execution_scope, 'execution scope');
    const requiresConsumer = current.test_inputs.some((entry) => entry.path === 'tests/configured-context.ts');
    if (requiresConsumer || Object.hasOwn(scope, 'consumer_configuration')) {
      const imageContext = coverageImageTestContext(
        root,
        run.report.run_id,
        focusedSelection !== undefined,
        current,
        process.env,
      );
      await assertCoverageImageTestContext(imageContext, current);
      await assertCoverageConsumerBinding(
        scope.consumer_configuration,
        root,
        coverageImageConsumerEnvironment(imageContext, process.env),
      );
    }
  }
  const { summary, perFile, sourceMaps, coverage } = validatedCoverageSummary(
    root,
    run,
    current,
    options.requireFullCoverage ?? true,
  );
  const result = {
    // Full provenance, snapshot, map and counter validation precedes these trusted views.
    report: run.report as CoverageReport,
    report_sha256: run.reportSha256,
    manifest: run.manifest as RunManifest,
    inputs: current,
    maintained_sources: current.sources,
    tests: run.report.tests as string[],
    processes: run.report.processes.length,
    totals: summary,
    files: perFile,
    coverage,
    canonical_source_maps: sourceMaps,
  };
  return inputProjections ? { ...result, input_projections: inputProjections } : result;
}

export async function validateCoverageReport(reportPath: string, root: string, options: CoverageOptions = {}) {
  return validateCoverageReportInternal(reportPath, root, options);
}

function validateFocusedReportQualifiers(report: DecodedReport, selection: FocusedDiagnosticSelection): void {
  if (report.schema !== 'VidaBunFocusedCoverageDiagnostic/v1')
    throw new Error('Expected the focused diagnostic schema.');
  if (
    report.qualification_scope !== 'focused-diagnostic' ||
    report.full_qualification !== false ||
    report.frozen_budget_qualification !== 'pending' ||
    report.function_coverage_kind !== 'function-entry-binary' ||
    !Array.isArray(report.metrics)
  )
    throw new Error('Focused diagnostic qualification metadata is invalid.');
  if (Object.hasOwn(report, 'published_reference'))
    throw new Error('Focused diagnostic cannot admit historical coverage.');
  if (selection.mode !== 'focused-diagnostic') throw new Error('Focused diagnostic selection mode is invalid.');
}

/** Validate a focused diagnostic using the full current-input and receipt chain, without global admission. */
export async function validateFocusedCoverageReport(
  reportPath: string,
  root: string,
  selection: FocusedDiagnosticSelection,
) {
  return validateCoverageReportInternal(reportPath, root, {}, undefined, undefined, selection);
}

/** Full provenance/map/counter validation without numeric admission; applicability stays with its reviewed owner. */
export async function validateFocusedCoverageCounters(
  reportPath: string,
  root: string,
  selection: FocusedDiagnosticSelection,
) {
  const validated = await validateCoverageReportInternal(
    reportPath,
    root,
    { requireFullCoverage: false },
    undefined,
    undefined,
    selection,
  );
  return { ...validated, numeric_coverage_admission: false as const };
}

/** Consume an already admitted historical measurement while current tools remain the admission authority. */
export async function validateHistoricalBaselineCoverageReport(
  reportPath: string,
  historicalPackageRoot: string,
  historicalRuntimeExecutablePath: string,
  options: CoverageOptions = {},
) {
  if (options.testSelectionMode !== undefined && options.testSelectionMode !== 'published-baseline-bun-native')
    throw new Error('Historical baseline consumer cannot use the current test selection.');
  return validateCoverageReportInternal(
    reportPath,
    historicalPackageRoot,
    { ...options, testSelectionMode: 'published-baseline-bun-native' },
    undefined,
    historicalRuntimeExecutablePath,
  );
}

export async function validateCurrentCoverageReportWithInputs(
  reportPath: string,
  root: string,
  projections: FinalProjections,
) {
  return validateCoverageReportInternal(reportPath, root, {}, projections);
}
