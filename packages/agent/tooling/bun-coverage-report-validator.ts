import { assertPublishedFixtureChildren, assertPublishedFixtureProcess } from './published-coverage-inputs.js';
import {
  historicalInventoryChildId,
  historicalReferenceJUnit,
  parseHistoricalReference,
  type PublishedBaselineReference,
} from './published-baseline-reference.js';
import coverageApi from 'istanbul-lib-coverage';
import { validateIstanbulFileCoverage as validateFileCoverage } from './coverage-counters.js';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  canonicalTestSelection,
  capturedModuleAbsolutePath,
  coverageInputs,
  instrumentSource,
  isExternalModulePath,
  qualityInputProjections,
  readBunPin,
  sha256,
  type FinalQualityProjectionInputs,
} from './bun-coverage-evidence.ts';

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
};
type CoverageReport = {
  published_reference?: PublishedBaselineReference;
  schema: string;
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
  coverage: Record<string, FileCoverageData>;
};

type SelectionMode = 'current' | 'published-baseline-bun-native';
type CoverageOptions = { requireFullCoverage?: boolean; reportBytes?: Uint8Array; testSelectionMode?: SelectionMode };
type CoverageInputs = import('./bun-coverage-evidence.ts').CoverageInputs;
type FinalProjections = FinalQualityProjectionInputs;
type InputProjections = Awaited<ReturnType<typeof qualityInputProjections>>;
type DecodedReport = Record<string, unknown> &
  Pick<CoverageReport, 'schema' | 'run_id' | 'runtime_executable_sha256'> & {
    sources: unknown[];
    tests: unknown[];
    test_inputs: unknown[];
    tool_inputs: unknown[];
    shards: unknown[];
    processes: unknown[];
    coverage: Record<string, unknown>;
  };
type DecodedManifest = Record<string, unknown> &
  Pick<RunManifest, 'schema' | 'run_id' | 'snapshot_directory' | 'runtime_executable_sha256'> & {
    sources: unknown[];
    source_maps: object;
  };
type CoverageRun = Awaited<ReturnType<typeof readCoverageRun>>;
type CoverageResult = {
  report: CoverageReport;
  manifest: RunManifest;
  inputs: CoverageInputs;
  maintained_sources: Digest[];
  tests: string[];
  processes: number;
  totals: CoverageSummaryData;
  files: Record<string, CoverageSummaryData>;
  /** Transient Source-generated maps; never substitute report-owned maps. */
  canonical_source_maps: Record<string, FileCoverageData>;
};
type CoverageResultWithInputs = CoverageResult & { input_projections: InputProjections };

const { createCoverageMap } = coverageApi;
const metricNames = ['functions', 'lines', 'statements', 'branches'] as const;

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
    manifest.schema === 'VidaBunCoverageRun/v1' &&
    typeof manifest.run_id === 'string' &&
    typeof manifest.snapshot_directory === 'string' &&
    Array.isArray(manifest.sources) &&
    typeof manifest.source_maps === 'object' &&
    manifest.source_maps !== null &&
    typeof manifest.runtime_executable_sha256 === 'string'
  );
}

function readCoverageReport(reportPath: string, reportBytes?: Uint8Array) {
  const bytes = reportBytes ?? readFileSync(reportPath);
  const report = record(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)), 'coverage report');
  if (
    report.schema !== 'VidaBunCoverageReport/v1' ||
    typeof report.run_id !== 'string' ||
    !/^[0-9a-f-]{36}$/u.test(report.run_id) ||
    typeof report.runtime_executable_sha256 !== 'string'
  )
    throw new Error('Coverage report schema or run identity is invalid.');
  for (const key of ['sources', 'tests', 'test_inputs', 'tool_inputs', 'shards', 'processes'])
    if (!Array.isArray(report[key])) throw new Error(`Coverage report ${key} are missing.`);
  const coverage = record(report.coverage, 'coverage report counters');
  return { report: report as DecodedReport, coverage };
}

function readCoverageManifest(root: string, report: DecodedReport) {
  const expectedManifestPath = path.posix.join('coverage/bun-unified/runs', report.run_id, 'manifest.json');
  if (report.manifest_path !== expectedManifestPath) throw new Error('Coverage manifest path is not canonical.');
  const manifestPath = path.join(root, ...expectedManifestPath.split('/'));
  const manifestBytes = readFileSync(manifestPath);
  if (sha256(manifestBytes) !== report.manifest_sha256) throw new Error('Coverage manifest fingerprint mismatch.');
  const manifestValue: unknown = JSON.parse(manifestBytes.toString('utf8'));
  if (!isRunManifest(manifestValue) || manifestValue.run_id !== report.run_id)
    throw new Error('Coverage manifest identity mismatch.');
  return manifestValue;
}

async function validateRuntimeBinding(root: string, report: DecodedReport, manifest: DecodedManifest) {
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

async function readCoverageRun(reportPath: string, root: string, reportBytes?: Uint8Array) {
  const { report, coverage } = readCoverageReport(reportPath, reportBytes);
  const manifest = readCoverageManifest(root, report);
  const runtimeExecutableSha256 = await validateRuntimeBinding(root, report, manifest);
  return { report, coverage, manifest, runtimeExecutableSha256 };
}

async function captureRunInputs(
  root: string,
  report: DecodedReport,
  manifest: DecodedManifest,
  selectionMode: SelectionMode,
) {
  const current = await coverageInputs(root, selectionMode);
  verifyInputBindings(report, manifest, current);
  verifySnapshotFiles(root, report, manifest, current);
  return current;
}

function validatedCoverageSummary(
  root: string,
  run: CoverageRun,
  current: CoverageInputs,
  requireFullCoverage: boolean,
) {
  const sourceMaps = expectedSourceMaps(root, current);
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
  return { summary, perFile, sourceMaps };
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
  const snapshotRelative = path.posix.join('coverage/bun-unified/runs', report.run_id, 'snapshot');
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

function expectedSourceMaps(root: string, current: CoverageInputs) {
  const maps: Record<string, FileCoverageData> = {};
  for (const source of current.sources) {
    const absolute = path.resolve(root, source.path);
    const bytes = current.input_bytes[source.path];
    if (!bytes) throw new Error(`Coverage source bytes are missing: ${source.path}`);
    const content = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    maps[absolute] = instrumentSource(absolute, content).fileCoverage;
  }
  return maps;
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
  for (const test of current.tests)
    if (!observed.has(test)) throw new Error('Selected test did not execute from captured bytes: ' + test);
  for (const required of [
    'tooling/bun-coverage-preload.ts',
    'tooling/bun-coverage-evidence.ts',
    'tooling/source-instrumentation.ts',
    'tooling/maintained-source-inventory.ts',
  ])
    if (!observed.has(required)) throw new Error('Snapshot bootstrap dependency was not attested: ' + required);
}

function verifyLoadedIdentity(
  child: Record<string, unknown>,
  current: CoverageInputs,
  manifest: DecodedManifest,
  report: DecodedReport,
) {
  if (
    JSON.stringify(child.module_inputs) !== JSON.stringify(current.module_inputs) ||
    JSON.stringify(child.execution_scope) !== JSON.stringify(manifest.execution_scope) ||
    JSON.stringify(child.active_argv) !== JSON.stringify(manifest.active_argv) ||
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
    value.shard_id === 'bun-test'
  );
}

function readProcessReceipt(
  root: string,
  report: DecodedReport,
  value: unknown,
  receiptNames: Set<string>,
  receiptPids: Set<number>,
) {
  const raw = record(value, 'process receipt');
  if (!hasReceiptFields(raw)) throw new Error('Coverage process receipt identity is invalid.');
  if (
    receiptNames.has(raw.file) ||
    !new RegExp('^' + report.run_id + '\\.bun-test\\.\\d+\\.[0-9a-f-]{36}\\.json$', 'u').test(raw.file)
  )
    throw new Error('Coverage process receipt filename is invalid or duplicated.');
  if (receiptPids.has(raw.pid)) throw new Error('Duplicate coverage process identity.');
  const receipt: ProcessReceipt = raw;
  receiptNames.add(receipt.file);
  receiptPids.add(receipt.pid);
  const processPath = path.join(root, 'coverage', 'bun-unified', 'runs', report.run_id, 'processes', receipt.file);
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
  if (report.published_reference === undefined) return undefined;
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
  finalProjections: FinalProjections,
): Promise<CoverageResultWithInputs>;
async function validateCoverageReportInternal(
  reportPath: string,
  root: string,
  options: CoverageOptions,
  finalProjections?: FinalProjections,
) {
  const selectionMode = checkedSelectionMode(options);
  if (finalProjections && selectionMode !== 'current')
    throw new Error('Final quality input projections require the current test selection.');
  const run = await readCoverageRun(reportPath, root, options.reportBytes);
  const inputProjections = finalProjections ? await qualityInputProjections(root, finalProjections) : undefined;
  const current = inputProjections?.coverage ?? (await captureRunInputs(root, run.report, run.manifest, selectionMode));
  if (inputProjections) {
    verifyInputBindings(run.report, run.manifest, current);
    verifySnapshotFiles(root, run.report, run.manifest, current);
  }
  const { summary, perFile, sourceMaps } = validatedCoverageSummary(
    root,
    run,
    current,
    options.requireFullCoverage ?? true,
  );
  const result = {
    // Full provenance, snapshot, map and counter validation precedes these trusted views.
    report: run.report as CoverageReport,
    manifest: run.manifest as RunManifest,
    inputs: current,
    maintained_sources: current.sources,
    tests: run.report.tests as string[],
    processes: run.report.processes.length,
    totals: summary,
    files: perFile,
    canonical_source_maps: sourceMaps,
  };
  return inputProjections ? { ...result, input_projections: inputProjections } : result;
}

export async function validateCoverageReport(reportPath: string, root: string, options: CoverageOptions = {}) {
  return validateCoverageReportInternal(reportPath, root, options);
}

export async function validateCurrentCoverageReportWithInputs(
  reportPath: string,
  root: string,
  projections: FinalProjections,
) {
  return validateCoverageReportInternal(reportPath, root, {}, projections);
}
