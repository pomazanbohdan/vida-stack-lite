export type CoverageMetric = 'functions' | 'lines' | 'statements' | 'branches';

interface CoverageMetricData {
  readonly total: number;
  readonly covered: number;
  readonly pct: number;
}

export type CoverageSummaryLike = Readonly<Partial<Record<CoverageMetric, CoverageMetricData>>>;

interface CoveragePosition {
  readonly line: number;
  readonly column: number;
}

interface CoverageFunctionLike {
  readonly loc?: unknown;
  readonly decl?: unknown;
}

interface CoverageBranchLike {
  readonly loc?: unknown;
  readonly locations?: unknown;
}

export interface CoverageFileLocationsLike {
  readonly statementMap: Readonly<Record<string, unknown>>;
  readonly fnMap: Readonly<Record<string, unknown>>;
  readonly branchMap: Readonly<Record<string, unknown>>;
}

export interface BaselineCoverageFunction {
  readonly identity: string;
  readonly file: string;
  readonly line: number;
  readonly column: number;
  readonly bodyLine: number;
  readonly bodyColumn: number;
  readonly bodyEndLine: number;
  readonly bodyEndColumn: number;
  readonly complexity: number;
}

export interface BaselineFunctionEvidence {
  readonly identity: string;
  readonly complexity: number;
  readonly coverage: number;
  readonly crap: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Join the exact Babel body geometry to Istanbul once, preserving every inventory row. */
export function baselineFunctionEvidenceForSource(
  file: string,
  rows: readonly BaselineCoverageFunction[],
  coverage: unknown,
): BaselineFunctionEvidence[] {
  if (!isRecord(coverage) || !isRecord(coverage.fnMap) || !isRecord(coverage.f))
    throw new Error(`Published baseline function coverage is missing: ${file}`);
  const entries = Object.entries(coverage.fnMap);
  if (entries.length !== rows.length) throw new Error(`Published baseline function inventory is incomplete: ${file}`);
  const idsByBody = new Map<string, string[]>();
  for (const [id, raw] of entries) {
    if (!isRecord(raw) || !isRecord(raw.loc) || !isRecord(raw.loc.start) || !isRecord(raw.loc.end)) continue;
    const { start, end } = raw.loc;
    if (
      typeof start.line !== 'number' ||
      !Number.isSafeInteger(start.line) ||
      start.line < 1 ||
      typeof start.column !== 'number' ||
      !Number.isSafeInteger(start.column) ||
      start.column < 0 ||
      typeof end.line !== 'number' ||
      !Number.isSafeInteger(end.line) ||
      end.line < 1 ||
      typeof end.column !== 'number' ||
      !Number.isSafeInteger(end.column) ||
      end.column < 0
    )
      continue;
    const key = [start.line, start.column, end.line, end.column].join(':');
    const ids = idsByBody.get(key);
    if (ids) ids.push(id);
    else idsByBody.set(key, [id]);
  }
  const mapped = new Set<string>();
  const functions: BaselineFunctionEvidence[] = [];
  for (const row of rows) {
    const key = [row.bodyLine, row.bodyColumn, row.bodyEndLine, row.bodyEndColumn].join(':');
    const matches = idsByBody.get(key) ?? [];
    if (matches.length !== 1) throw new Error(`Published baseline function mapping is ambiguous: ${row.identity}`);
    const id = matches[0];
    if (id === undefined) throw new Error(`Published baseline function mapping is missing: ${row.identity}`);
    if (mapped.has(id)) throw new Error(`Published baseline function mapping is ambiguous: ${row.identity}`);
    mapped.add(id);
    const counter = coverage.f[id];
    if (!Object.hasOwn(coverage.f, id) || typeof counter !== 'number' || !Number.isSafeInteger(counter) || counter < 0)
      throw new Error(`Published baseline function counter is invalid: ${row.identity}`);
    const fraction = counter > 0 ? 1 : 0;
    const crap = row.complexity ** 2 * (1 - fraction) ** 3 + row.complexity;
    functions.push({ identity: row.identity, complexity: row.complexity, coverage: fraction, crap });
  }
  return functions;
}

/** Preserve the CRAP gate's exact full-coverage rule, including its branch denominator exception. */
export function exactFullCoverage(
  summary: CoverageSummaryLike | null | undefined,
  metric: CoverageMetric,
  file: string,
): void {
  const value = summary?.[metric];
  if (
    !value ||
    !Number.isSafeInteger(value.total) ||
    value.total < 0 ||
    !Number.isSafeInteger(value.covered) ||
    (metric !== 'branches' && value.total < 1) ||
    value.covered !== value.total ||
    value.pct !== 100
  )
    throw new Error(`Coverage is not exact 100% for ${file}.${metric}.`);
}

function checkedPosition(value: unknown, lines: readonly string[], label: string): CoveragePosition {
  if (
    !isRecord(value) ||
    typeof value.line !== 'number' ||
    !Number.isSafeInteger(value.line) ||
    value.line < 1 ||
    typeof value.column !== 'number' ||
    !Number.isSafeInteger(value.column) ||
    value.column < 0
  )
    throw new Error(`Invalid source position: ${label}`);
  const sourceLine = lines[value.line - 1];
  if (sourceLine === undefined || value.column > sourceLine.length)
    throw new Error(`Source position is outside its line: ${label}`);
  return { line: value.line, column: value.column };
}

function checkedLocation(value: unknown, lines: readonly string[], label: string): void {
  if (!isRecord(value) || value.start === undefined) throw new Error(`Coverage location requires a start: ${label}`);
  checkedPosition(value.start, lines, `${label}.start`);
  if (value.end !== undefined) checkedPosition(value.end, lines, `${label}.end`);
}

/** Validate every Istanbul source location used by the CRAP gate's coverage denominator. */
export function validateCoverageLocations(
  file: string,
  source: string,
  fileCoverage: CoverageFileLocationsLike,
  canonicalBranchMap?: Readonly<Record<string, unknown>>,
): void {
  if (canonicalBranchMap && JSON.stringify(fileCoverage.branchMap) !== JSON.stringify(canonicalBranchMap))
    throw new Error(`Branch coverage map differs from exact Source instrumentation: ${file}`);
  const lines = source.split(/\r?\n/u);
  for (const [id, location] of Object.entries(fileCoverage.statementMap))
    checkedLocation(location, lines, `${file}.statementMap.${id}`);
  for (const [id, rawFunction] of Object.entries(fileCoverage.fnMap)) {
    if (!isRecord(rawFunction)) throw new Error(`Invalid function map: ${file}.fnMap.${id}`);
    const fn: CoverageFunctionLike = rawFunction;
    if (fn.loc !== undefined) checkedLocation(fn.loc, lines, `${file}.fnMap.${id}.loc`);
    if (fn.decl !== undefined) checkedLocation(fn.decl, lines, `${file}.fnMap.${id}.decl`);
  }
  for (const [id, rawBranch] of Object.entries(fileCoverage.branchMap)) {
    if (!isRecord(rawBranch)) throw new Error(`Invalid branch map: ${file}.branchMap.${id}`);
    const branch: CoverageBranchLike = rawBranch;
    if (branch.loc !== undefined) checkedLocation(branch.loc, lines, `${file}.branchMap.${id}.loc`);
    if (!Array.isArray(branch.locations)) throw new Error(`Branch locations are missing: ${file}.branchMap.${id}`);
    const locations = branch.locations;
    locations.forEach((location, index) => {
      // Istanbul emits this empty false-arm sentinel for an if without else.
      // It is allowed only after the complete map matches exact Source output.
      if (
        canonicalBranchMap &&
        rawBranch.type === 'if' &&
        index === 1 &&
        locations.length === 2 &&
        JSON.stringify(location) === '{"start":{},"end":{}}'
      )
        return;
      checkedLocation(location, lines, `${file}.branchMap.${id}.locations.${index}`);
    });
  }
}
