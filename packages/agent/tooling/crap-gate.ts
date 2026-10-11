import { spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import coverageApi from 'istanbul-lib-coverage';
import { maintainedSourceInventory, selectMaintainedSourcePaths } from './maintained-source-inventory.js';
import { canonicalTestSelection, sha256 } from './bun-coverage-evidence.mjs';
import { functionInventory } from './function-inventory.js';
import { validateCoverageReport } from './bun-coverage-report-validator.js';
import { baselineFunctionEvidenceForSource, exactFullCoverage, validateCoverageLocations } from './coverage-math.js';

type FunctionRow = import('./function-inventory.js').FunctionRow;
type BaselineFunctionBudget = {
  identity: string;
  current_identity: string;
  baseline_complexity: number;
  baseline_coverage: number;
  max_complexity: number;
  baseline_crap: number;
  max_crap: number;
  rationale: string;
};
type BaselineEvidenceRow = { identity: string; complexity: number; coverage: number; crap: number };
type CoverageReport = {
  schema: string;
  run_id: string;
  manifest_path: string;
  source_fingerprint: string;
  test_fingerprint: string;
  tests: string[];
  test_selection: import('./bun-coverage-evidence.mjs').CoverageInputs['test_selection'];
  test_inputs: Array<{ path: string; sha256: string }>;
  coverage: Record<string, import('istanbul-lib-instrument').FileCoverageData>;
};
type NewFunctionBudget = { identity: string; max_complexity: number; max_crap: number; rationale: string };
type RemovalDisposition = { identity: string; rationale: string };
type CheckedPlan = {
  baselineCoverageReportRef: string;
  baselineCoverageReportSha256: string;
  baselineFunctions: Map<string, BaselineFunctionBudget>;
  baselineByCurrent: Map<string, BaselineFunctionBudget>;
  publishedFunctions: Map<string, FunctionRow>;
  newFunctions: Map<string, NewFunctionBudget>;
  removed: Map<string, RemovalDisposition>;
  newSources: Map<string, string>;
  removedSources: Map<string, string>;
};
type CoverageSummaryData = import('istanbul-lib-coverage').CoverageSummaryData;

const root = path.resolve(
  process.env.VIDA_BUN_COVERAGE_ROOT ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..'),
);
const { createCoverageMap } = coverageApi;
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const repoRootResult = spawnSync('git', ['rev-parse', '--show-toplevel'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 5000,
    maxBuffer: 32 * 1024 * 1024,
    windowsHide: true,
  });
  if (repoRootResult.status !== 0 || repoRootResult.signal || repoRootResult.error)
    throw new Error('CRAP budget gate cannot identify the Source repository root.');
  const repoRoot = path.resolve(repoRootResult.stdout.trim());
  const baselineRef = 'b549951';
  const planPath = path.resolve(
    process.env.VIDA_CRAP_BUDGET_PLAN ??
      path.join(repoRoot, '.agent/work/core-runtime-reactivation/crap-budgets.v1.json'),
  );
  const coveragePath = path.resolve(
    process.env.VIDA_BUN_COVERAGE_REPORT ?? path.join(root, 'coverage/bun-unified/coverage-final.json'),
  );
  const reportPath = path.join(root, 'coverage', 'bun-unified', 'crap-budget-report.json');

  function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
  const maintainedSources = maintainedSourceInventory(root).mutationSources;
  if (process.argv[2] === '--inventory') {
    const requested = process.argv.slice(3);
    if (new Set(requested).size !== requested.length || requested.some((file) => !maintainedSources.includes(file)))
      throw new Error('Function inventory requires unique maintained source paths.');
    const selected = requested.length ? requested : maintainedSources;
    const functions = (
      await Promise.all(
        selected.map(async (file) =>
          functionInventory(
            new TextDecoder('utf-8', { fatal: true }).decode(await readFile(path.join(root, file))),
            file,
          ),
        ),
      )
    ).flat();
    process.stdout.write(
      JSON.stringify({
        schema: 'MaintainedFunctionInventory/v1',
        mode: 'static-inventory-only',
        qualification: 'not-performed',
        sources: selected,
        functions,
      }) + '\n',
    );
    process.exit(0);
  }
  if (process.argv.length > 2) throw new Error('Unsupported CRAP budget gate arguments.');

  // One invocation, one immutable published commit; never retain live package state.
  const baselineTextByPath = new Map<string, string | null>();
  let baselineSourcePaths: string[] | undefined;

  function requirePlanRecord(value: unknown): asserts value is Record<string, unknown> {
    if (!isRecord(value) || value.schema !== 'VidaCrapBudgetPlan/v1' || value.baseline_ref !== baselineRef)
      throw new Error('CRAP budget plan schema or published baseline ref is invalid.');
  }

  function evidencePathForPlan(value: Record<string, unknown>): string {
    if (
      typeof value.baseline_coverage_report_ref !== 'string' ||
      value.baseline_coverage_report_ref.trim().length < 8 ||
      typeof value.baseline_coverage_report_sha256 !== 'string' ||
      !/^[0-9a-f]{64}$/u.test(value.baseline_coverage_report_sha256)
    )
      throw new Error('CRAP budget plan has no bound baseline coverage evidence.');
    const evidencePath = path.resolve(repoRoot, value.baseline_coverage_report_ref);
    const relativePath = path.relative(repoRoot, evidencePath).replaceAll('\\', '/');
    if (!relativePath || relativePath.startsWith('../') || path.isAbsolute(relativePath))
      throw new Error('Baseline coverage evidence must remain inside the Source repository.');
    return evidencePath;
  }

  function requirePlanArrays(value: Record<string, unknown>) {
    if (
      !Array.isArray(value.baseline_functions) ||
      !Array.isArray(value.new_functions) ||
      !Array.isArray(value.removed_functions) ||
      !Array.isArray(value.new_sources) ||
      !Array.isArray(value.removed_sources)
    )
      throw new Error('CRAP budget plan requires reviewed baseline and exact source/function addition/removal arrays.');
  }

  function isPositiveSafeInteger(value: unknown): value is number {
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1;
  }

  function isCoverageFraction(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
  }

  function isFiniteMetric(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function checkedEvidenceFunction(value: unknown): BaselineEvidenceRow {
    if (
      !isRecord(value) ||
      typeof value.identity !== 'string' ||
      !isPositiveSafeInteger(value.complexity) ||
      !isCoverageFraction(value.coverage) ||
      !isFiniteMetric(value.crap)
    )
      throw new Error('Baseline function evidence is malformed.');
    const formula = value.complexity ** 2 * (1 - value.coverage) ** 3 + value.complexity;
    if (Math.abs(value.crap - formula) > 1e-9)
      throw new Error('Baseline function CRAP differs from its coverage formula.');
    return value as BaselineEvidenceRow;
  }

  function checkedEvidenceFunctions(value: unknown): Map<string, BaselineEvidenceRow> {
    if (!Array.isArray(value)) throw new Error('Baseline coverage evidence functions are missing.');

    const functions: Map<string, BaselineEvidenceRow> = new Map();
    for (const raw of value) {
      const entry = checkedEvidenceFunction(raw);
      if (functions.has(entry.identity)) throw new Error('Baseline function evidence is duplicated.');
      functions.set(entry.identity, entry);
    }
    return functions;
  }

  function requireSameCoverageInput(label: string, actual: unknown, expected: unknown) {
    if (JSON.stringify(actual) !== JSON.stringify(expected))
      throw new Error(`Published baseline ${label} differs from its bound inputs.`);
  }

  function publishedFileDigests(files: readonly string[], label: string) {
    return files.map((file) => {
      const source = baselineSource(file);
      if (source === null) throw new Error(`Published baseline ${label} is unavailable: ${file}`);
      return { path: file, sha256: sha256(Buffer.from(source, 'utf8')) };
    });
  }

  function publishedTestPaths(): string[] {
    return gitText(['ls-tree', '-r', '--name-only', baselineRef, '--', 'packages/agent/tests'])
      .split(/\r?\n/u)
      .filter(Boolean)
      .map((full) => full.slice('packages/agent/'.length));
  }

  function verifyPublishedTestSelection(
    report: Record<string, unknown>,
    inputs: Awaited<ReturnType<typeof validateCoverageReport>>['inputs'],
  ) {
    const selectedTests = inputs.test_selection.tests;
    requireSameCoverageInput('test selection', inputs.tests, selectedTests);
    if (canonicalTestSelection(report.test_selection) !== canonicalTestSelection(inputs.test_selection))
      throw new Error('Published baseline test selection metadata differs from its bound inputs.');
  }

  function isCurrentQualityTool(
    file: string,
    selection: import('./bun-coverage-evidence.mjs').CoverageInputs['test_selection'],
  ): boolean {
    const published = selection.published_contract_inputs?.some((entry) => entry.path === file) ?? false;
    return file.startsWith('tooling/') && !published;
  }

  async function verifyPublishedCoverageInputs(
    report: Record<string, unknown>,
    packageRoot: string,
    inputs: Awaited<ReturnType<typeof validateCoverageReport>>['inputs'],
  ) {
    const sources = baselineSources();
    const sourceDigests = publishedFileDigests(sources, 'source');
    const tests = publishedTestPaths();
    const testDigests = publishedFileDigests(tests, 'test input');
    requireSameCoverageInput('source bytes', inputs.sources, sourceDigests);
    requireSameCoverageInput('test bytes', inputs.test_inputs, testDigests);
    verifyPublishedTestSelection(report, inputs);
    for (const entry of inputs.tool_inputs) {
      if (isCurrentQualityTool(entry.path, inputs.test_selection)) {
        const current = await readFile(path.join(root, entry.path));
        if (sha256(current) !== entry.sha256)
          throw new Error(`Published baseline used different quality tooling: ${entry.path}`);
      } else {
        const source = baselineSource(entry.path);
        if (source === null || sha256(Buffer.from(source, 'utf8')) !== entry.sha256)
          throw new Error(`Published baseline tool input differs from the selected commit: ${entry.path}`);
      }
    }
    for (const key of [
      'sources',
      'tests',
      'test_inputs',
      'tool_inputs',
      'source_fingerprint',
      'test_fingerprint',
      'tool_fingerprint',
    ] as const)
      requireSameCoverageInput(`coverage report ${key}`, report[key], inputs[key]);
    return sources;
  }

  async function readBaselineCoverageReport(value: unknown): Promise<{
    report: Record<string, unknown>;
    packageRoot: string;
    inputs: Awaited<ReturnType<typeof validateCoverageReport>>['inputs'];
  }> {
    requirePlanRecord(value);
    const evidencePath = evidencePathForPlan(value);
    const normalized = evidencePath.replaceAll('\\', '/');
    const suffix = '/coverage/bun-unified/coverage-final.json';
    if (!normalized.endsWith(suffix)) throw new Error('Published baseline evidence is not a Bun coverage report.');
    const packageRoot = path.resolve(normalized.slice(0, -suffix.length));
    if (path.basename(packageRoot) !== 'agent' || path.basename(path.dirname(packageRoot)) !== 'packages')
      throw new Error('Published baseline evidence must come from an isolated agent package root.');
    const bytes = await readFile(evidencePath);
    if (sha256(bytes) !== value.baseline_coverage_report_sha256)
      throw new Error('Baseline coverage evidence fingerprint differs from the frozen plan.');
    const validation = await validateCoverageReport(evidencePath, packageRoot, {
      requireFullCoverage: false,
      testSelectionMode: 'published-baseline-bun-native',
      reportBytes: bytes,
    });
    return { report: validation.report, packageRoot, inputs: validation.inputs };
  }

  function baselineFunctionEvidence(report: Record<string, unknown>, packageRoot: string, sources: string[]) {
    const functions: BaselineEvidenceRow[] = [];
    const publishedFunctions = new Map<string, FunctionRow>();
    const coverageFiles = isRecord(report.coverage) ? report.coverage : {};
    for (const file of sources) {
      const source = baselineSource(file);
      if (source === null) throw new Error(`Published baseline source is unavailable: ${file}`);
      const rows = functionInventory(source, file);
      for (const row of rows) {
        if (publishedFunctions.has(row.identity))
          throw new Error(`Duplicate published function identity: ${row.identity}`);
        publishedFunctions.set(row.identity, row);
      }
      const coverage = coverageFiles[path.resolve(packageRoot, file)];
      functions.push(...baselineFunctionEvidenceForSource(file, rows, coverage));
    }
    return { functions, publishedFunctions };
  }

  async function readBaselineEvidence(value: unknown) {
    const { report, packageRoot, inputs } = await readBaselineCoverageReport(value);
    const sources = await verifyPublishedCoverageInputs(report, packageRoot, inputs);
    const snapshot = baselineFunctionEvidence(report, packageRoot, sources);
    return { evidence: checkedEvidenceFunctions(snapshot.functions), publishedFunctions: snapshot.publishedFunctions };
  }

  function invalidBaselineMeasurements(raw: Record<string, unknown>): boolean {
    return (
      !isPositiveSafeInteger(raw.baseline_complexity) ||
      !isCoverageFraction(raw.baseline_coverage) ||
      !isFiniteMetric(raw.baseline_crap) ||
      raw.baseline_crap < 1
    );
  }

  function invalidBaselineCeilings(raw: Record<string, unknown>): boolean {
    return (
      !isPositiveSafeInteger(raw.max_complexity) ||
      !isPositiveSafeInteger(raw.max_crap) ||
      typeof raw.baseline_complexity !== 'number' ||
      typeof raw.baseline_crap !== 'number' ||
      raw.max_complexity > raw.baseline_complexity ||
      raw.max_crap > raw.baseline_crap
    );
  }

  function hasFunctionCorrespondence(
    raw: unknown,
  ): raw is Record<string, unknown> & { identity: string; current_identity: string } {
    return isRecord(raw) && typeof raw.identity === 'string' && typeof raw.current_identity === 'string';
  }

  function checkedBaselineBudget(raw: unknown): BaselineFunctionBudget {
    if (!hasFunctionCorrespondence(raw)) throw new Error('Baseline-to-current function correspondence is missing.');
    if (invalidBaselineMeasurements(raw)) throw new Error('Baseline function evidence is malformed.');
    if (invalidBaselineCeilings(raw)) throw new Error('Baseline function ceilings exceed frozen evidence.');
    if (typeof raw.rationale !== 'string' || raw.rationale.trim().length < 8)
      throw new Error('Baseline function rationale is missing.');
    const complexity = raw.baseline_complexity as number;
    const coverage = raw.baseline_coverage as number;
    const crap = raw.baseline_crap as number;
    const formula = complexity ** 2 * (1 - coverage) ** 3 + complexity;
    if (Math.abs(crap - formula) > 1e-9)
      throw new Error('Baseline CRAP does not match its frozen complexity and coverage evidence.');
    return raw as BaselineFunctionBudget;
  }

  function checkedBaselineFunctions(values: unknown): Map<string, BaselineFunctionBudget> {
    if (!Array.isArray(values)) throw new Error('Frozen baseline functions are missing.');

    const functions: Map<string, BaselineFunctionBudget> = new Map();
    for (const raw of values) {
      const entry = checkedBaselineBudget(raw);
      if (functions.has(entry.identity)) throw new Error('Frozen baseline function is duplicated.');
      functions.set(entry.identity, entry);
    }
    return functions;
  }

  function requireExactBaseline(
    budgets: Map<string, BaselineFunctionBudget>,
    evidence: Map<string, BaselineEvidenceRow>,
    removed: Map<string, RemovalDisposition>,
  ) {
    const budgetIds = [...budgets.keys()].sort();
    const removedIds = [...removed.keys()].sort();
    const evidenceIds = [...evidence.keys()].sort();
    const partitionIds = [...budgetIds, ...removedIds].sort();
    if (JSON.stringify(partitionIds) !== JSON.stringify(evidenceIds))
      throw new Error('Frozen budgets and explicit removals do not partition the exact baseline coverage inventory.');
    for (const [identity, budget] of budgets) {
      const row = evidence.get(identity);
      if (!row) throw new Error(`Baseline coverage evidence is missing a function: ${identity}`);
      if (
        row.complexity !== budget.baseline_complexity ||
        row.coverage !== budget.baseline_coverage ||
        Math.abs(row.crap - budget.baseline_crap) > 1e-9
      )
        throw new Error(`Frozen baseline values differ from actual coverage evidence: ${identity}`);
    }
  }

  function checkedNewFunction(raw: unknown): NewFunctionBudget {
    if (!isRecord(raw) || typeof raw.identity !== 'string')
      throw new Error('New function budget identity is malformed.');
    if (
      !isPositiveSafeInteger(raw.max_complexity) ||
      !isPositiveSafeInteger(raw.max_crap) ||
      raw.max_complexity > 10 ||
      raw.max_crap > 10
    )
      throw new Error('New function budget is missing or exceeds the authorized ceiling of 10.');
    if (typeof raw.rationale !== 'string' || raw.rationale.trim().length < 8)
      throw new Error('New function budget rationale is missing.');
    return raw as NewFunctionBudget;
  }

  function checkedNewFunctions(values: unknown): Map<string, NewFunctionBudget> {
    if (!Array.isArray(values)) throw new Error('New function budgets are missing.');

    const functions: Map<string, NewFunctionBudget> = new Map();
    for (const raw of values) {
      const entry = checkedNewFunction(raw);
      if (functions.has(entry.identity)) throw new Error('New function budget is duplicated.');
      functions.set(entry.identity, entry);
    }
    return functions;
  }

  function checkedRemoval(raw: unknown): RemovalDisposition {
    if (
      !isRecord(raw) ||
      typeof raw.identity !== 'string' ||
      typeof raw.rationale !== 'string' ||
      raw.rationale.trim().length < 8
    )
      throw new Error('Removed function disposition is missing or lacks rationale.');
    return raw as RemovalDisposition;
  }

  function checkedRemovals(values: unknown): Map<string, RemovalDisposition> {
    if (!Array.isArray(values)) throw new Error('Removed function dispositions are missing.');

    const removals: Map<string, RemovalDisposition> = new Map();
    for (const raw of values) {
      const entry = checkedRemoval(raw);
      if (removals.has(entry.identity)) throw new Error('Removed function disposition is duplicated.');
      removals.set(entry.identity, entry);
    }
    return removals;
  }

  function checkedSourceEntries(values: unknown, label: string): Map<string, string> {
    if (!Array.isArray(values)) throw new Error(`Invalid ${label} source dispositions.`);

    const entries: Map<string, string> = new Map();
    for (const raw of values) {
      if (!isRecord(raw) || typeof raw.path !== 'string' || typeof raw.rationale !== 'string')
        throw new Error(`Invalid ${label} source disposition.`);
      if (entries.has(raw.path) || raw.rationale.trim().length < 8)
        throw new Error(`Invalid ${label} source disposition.`);
      entries.set(raw.path, raw.rationale);
    }
    return entries;
  }

  function baselineCurrentCorrespondence(
    baselineFunctions: Map<string, BaselineFunctionBudget>,
  ): Map<string, BaselineFunctionBudget> {
    const baselineByCurrent: Map<string, BaselineFunctionBudget> = new Map();
    for (const entry of baselineFunctions.values()) {
      if (baselineByCurrent.has(entry.current_identity))
        throw new Error(`Current function is mapped to multiple published functions: ${entry.current_identity}`);
      baselineByCurrent.set(entry.current_identity, entry);
    }
    return baselineByCurrent;
  }

  async function checkedPlan(value: unknown): Promise<CheckedPlan> {
    requirePlanRecord(value);
    requirePlanArrays(value);
    const { evidence, publishedFunctions } = await readBaselineEvidence(value);
    const baselineFunctions = checkedBaselineFunctions(value.baseline_functions);
    const removed = checkedRemovals(value.removed_functions);
    requireExactBaseline(baselineFunctions, evidence, removed);
    const baselineByCurrent = baselineCurrentCorrespondence(baselineFunctions);
    return {
      baselineCoverageReportRef: value.baseline_coverage_report_ref as string,
      baselineCoverageReportSha256: value.baseline_coverage_report_sha256 as string,
      baselineFunctions,
      baselineByCurrent,
      publishedFunctions,
      newFunctions: checkedNewFunctions(value.new_functions),
      removed,
      newSources: checkedSourceEntries(value.new_sources, 'new'),
      removedSources: checkedSourceEntries(value.removed_sources, 'removed'),
    };
  }

  function gitText(args: string[]) {
    const result = spawnSync('git', args, {
      cwd: repoRoot,
      timeout: 5000,
      maxBuffer: 32 * 1024 * 1024,
      windowsHide: true,
    });
    if (result.error || result.signal || result.status === null || result.status !== 0)
      throw new Error(`Published Source query failed: git ${args.join(' ')}`);
    return new TextDecoder('utf-8', { fatal: true }).decode(result.stdout);
  }

  function baselineSources(): string[] {
    if (baselineSourcePaths) return baselineSourcePaths;
    const manifest = JSON.parse(gitText(['show', `${baselineRef}:packages/agent/package.json`])) as unknown;
    if (!isRecord(manifest) || !Array.isArray(manifest.files))
      throw new Error('Published package source inventory is invalid.');
    const patterns = manifest.files.filter((file) => typeof file === 'string' && /^(?:!?)(?:src|bin)\//u.test(file));
    const files = gitText([
      'ls-tree',
      '-r',
      '--name-only',
      baselineRef,
      '--',
      'packages/agent/src',
      'packages/agent/bin',
    ])
      .split(/\r?\n/u)
      .filter(Boolean)
      .map((full) => full.slice('packages/agent/'.length))
      .filter((file) => /^src\/.+\.ts$|^bin\/.+\.mjs$/u.test(file));
    baselineSourcePaths = selectMaintainedSourcePaths(files, patterns as string[]);
    return baselineSourcePaths;
  }

  function baselineSource(file: string) {
    if (baselineTextByPath.has(file)) return baselineTextByPath.get(file) ?? null;
    const result = spawnSync('git', ['show', `${baselineRef}:packages/agent/${file}`], {
      cwd: repoRoot,
      timeout: 5000,
      maxBuffer: 32 * 1024 * 1024,
      windowsHide: true,
    });
    if (result.error || result.signal || result.status === null)
      throw new Error(`Published Source read is UNKNOWN: ${file}`);
    if (result.status !== 0) {
      if (
        /does not exist in/u.test(String(result.stderr)) ||
        /exists on disk, but not in/u.test(String(result.stderr))
      ) {
        baselineTextByPath.set(file, null);
        return null;
      }
      throw new Error(`Published Source lookup failed for ${file}: ${String(result.stderr)}`);
    }
    const source = new TextDecoder('utf-8', { fatal: true }).decode(result.stdout);
    baselineTextByPath.set(file, source);
    return source;
  }

  const baselineCheck = spawnSync('git', ['rev-parse', '--verify', `${baselineRef}^{commit}`], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 5000,
    maxBuffer: 32 * 1024 * 1024,
    windowsHide: true,
  });
  if (baselineCheck.status !== 0 || baselineCheck.signal || baselineCheck.error)
    throw new Error('Published CRAP baseline commit is unavailable.');
  const currentCoverage = await validateCoverageReport(coveragePath, root);
  const planBytes = await readFile(planPath);
  const planValue: unknown = JSON.parse(planBytes.toString('utf8'));
  const plan = await checkedPlan(planValue);
  const planDigest = sha256(planBytes);
  const report = currentCoverage.report as CoverageReport;
  const coverage = createCoverageMap(report.coverage);
  const inventory = maintainedSourceInventory(root);
  if (
    !isRecord(inventory) ||
    !Array.isArray(inventory.mutationSources) ||
    !inventory.mutationSources.every((file) => typeof file === 'string')
  )
    throw new Error('Maintained source inventory is invalid.');
  const sources = inventory.mutationSources as string[];
  const baseSources = baselineSources();
  const currentSourceSet = new Set(sources);
  const baselineSourceSet = new Set(baseSources);
  const addedSources = [...currentSourceSet]
    .filter((file) => !baselineSourceSet.has(file))
    .sort((left, right) => left.localeCompare(right));
  const missingSources = [...baselineSourceSet]
    .filter((file) => !currentSourceSet.has(file))
    .sort((left, right) => left.localeCompare(right));
  if (
    JSON.stringify(addedSources) !== JSON.stringify([...plan.newSources.keys()].sort()) ||
    JSON.stringify(missingSources) !== JSON.stringify([...plan.removedSources.keys()].sort())
  )
    throw new Error('Maintained source additions/removals do not match the reviewed budget plan.');

  const publishedFunctions = plan.publishedFunctions;

  const currentFunctions: Map<string, FunctionRow> = new Map();
  for (const file of sources) {
    const currentBytes = currentCoverage.inputs.input_bytes[file];
    if (!currentBytes) throw new Error(`Current source snapshot is missing: ${file}`);
    const source = new TextDecoder('utf-8', { fatal: true }).decode(currentBytes);
    const current = functionInventory(source, file);
    const absolute = path.resolve(root, file);
    const fc = coverage.fileCoverageFor(absolute);
    const generated = currentCoverage.canonical_source_maps[absolute];
    if (!generated) throw new Error(`Canonical Source coverage map is missing: ${file}`);
    validateCoverageLocations(file, source, fc, generated.branchMap);
    if (
      Object.keys(fc.fnMap).length !== current.length ||
      JSON.stringify(fc.fnMap) !== JSON.stringify(generated.fnMap) ||
      JSON.stringify(Object.keys(fc.f).sort()) !== JSON.stringify(Object.keys(fc.fnMap).sort())
    )
      throw new Error(`Function coverage mapping/cardinality mismatch: ${file}`);
    const summary = fc.toSummary().toJSON();
    for (const metric of ['functions', 'lines', 'statements', 'branches'] as Array<keyof CoverageSummaryData>)
      exactFullCoverage(summary, metric, file);
    for (const [id, counter] of Object.entries(fc.f))
      if (!Number.isSafeInteger(counter) || counter < 1)
        throw new Error(`Function counter is uncovered or invalid: ${file}.${id}`);
    for (const row of current) {
      if (currentFunctions.has(row.identity)) throw new Error(`Duplicate current function identity: ${row.identity}`);
      currentFunctions.set(row.identity, row);
    }
  }

  const baselineIds = new Set(publishedFunctions.keys());
  const currentIds = new Set(currentFunctions.keys());
  const retainedBaselineIds = new Set(plan.baselineFunctions.keys());
  const retainedCurrentIds = new Set(plan.baselineByCurrent.keys());
  for (const [baselineIdentity, budget] of plan.baselineFunctions) {
    if (!baselineIds.has(baselineIdentity))
      throw new Error(`Function correspondence names a missing published function: ${baselineIdentity}`);
    if (!currentIds.has(budget.current_identity))
      throw new Error(`Function correspondence names a missing current function: ${budget.current_identity}`);
  }
  const newIds = [...currentIds]
    .filter((identity) => !retainedCurrentIds.has(identity))
    .sort((left, right) => left.localeCompare(right));
  const removedIds = [...baselineIds]
    .filter((identity) => !retainedBaselineIds.has(identity))
    .sort((left, right) => left.localeCompare(right));
  const plannedNew = [...plan.newFunctions.keys()].sort();
  const plannedRemoved = [...plan.removed.keys()].sort();
  if (JSON.stringify(newIds) !== JSON.stringify(plannedNew))
    throw new Error('New AST functions do not exactly match reviewed budget-plan identities.');
  if (JSON.stringify(removedIds) !== JSON.stringify(plannedRemoved))
    throw new Error('Missing AST functions do not exactly match reviewed removal dispositions.');
  if (plan.baselineByCurrent.size !== plan.baselineFunctions.size)
    throw new Error('Retained baseline-current function correspondence is not one-to-one.');

  const rows = [];
  for (const [identity, current] of currentFunctions) {
    const budget = plan.baselineByCurrent.get(identity);
    const baseline = budget ? publishedFunctions.get(budget.identity) : undefined;
    if (baseline && budget) {
      if (!budget || budget.baseline_complexity !== baseline.complexity)
        throw new Error(`Existing function has no matching frozen baseline budget: ${budget.identity}`);
      const crap = current.complexity;
      if (current.complexity > budget.max_complexity || crap > budget.max_crap)
        throw new Error(
          `Existing function exceeds its frozen complexity/CRAP budget: ${budget.identity} -> ${identity}`,
        );
      rows.push({
        identity: budget.identity,
        current_identity: identity,
        file: current.file,
        start_offset: current.start,
        end_offset: current.end,
        complexity: current.complexity,
        coverage: 1,
        crap,
        baseline_complexity: budget.baseline_complexity,
        baseline_coverage: budget.baseline_coverage,
        baseline_crap: budget.baseline_crap,
        maximum_complexity: budget.max_complexity,
        maximum_crap: budget.max_crap,
        rationale: budget.rationale,
      });
    } else {
      const budget = plan.newFunctions.get(identity);
      if (!budget) throw new Error(`New function has no frozen task-plan budget: ${identity}`);
      const crap = current.complexity;
      if (current.complexity > budget.max_complexity || crap > budget.max_crap)
        throw new Error(`New function exceeds its frozen complexity/CRAP budget: ${identity}`);
      rows.push({
        identity,
        file: current.file,
        start_offset: current.start,
        end_offset: current.end,
        complexity: current.complexity,
        coverage: 1,
        crap,
        baseline_complexity: null,
        baseline_crap_at_full_coverage: null,
        maximum_complexity: budget.max_complexity,
        maximum_crap: budget.max_crap,
        rationale: budget.rationale,
      });
    }
  }
  for (const [identity, disposition] of plan.removed) {
    const removedFunction = publishedFunctions.get(identity);
    if (!removedFunction || plan.baselineFunctions.has(identity))
      throw new Error(`Removed-function disposition does not match the AST diff: ${identity}`);
    rows.push({
      identity,
      file: removedFunction.file,
      status: 'removed',
      rationale: disposition.rationale,
    });
  }
  const result = {
    schema: 'VidaCrapBudgetReport/v1',
    status: 'pass',
    baseline_ref: baselineRef,
    budget_plan_sha256: planDigest,
    source_fingerprint: report.source_fingerprint,
    coverage_run_id: report.run_id,
    baseline_coverage_report_ref: plan.baselineCoverageReportRef,
    baseline_coverage_report_sha256: plan.baselineCoverageReportSha256,
    selector_receipt: {
      tests: report.tests,
      test_selection: report.test_selection,
      test_inputs: report.test_inputs,
      test_fingerprint: report.test_fingerprint,
    },
    formula: 'CC^2 * (1 - function_coverage)^3 + CC',
    existing_policy:
      'exact reviewed per-function baseline-to-current correspondence and frozen complexity/CRAP ceilings',
    new_function_policy: 'exact task-plan identity; complexity and CRAP ceilings <= 10',
    new_sources: [...plan.newSources].map(([path, rationale]) => ({ path, rationale })),
    removed_sources: [...plan.removedSources].map(([path, rationale]) => ({ path, rationale })),
    functions: rows,
  };
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, JSON.stringify(result, null, 2) + '\n');
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}
