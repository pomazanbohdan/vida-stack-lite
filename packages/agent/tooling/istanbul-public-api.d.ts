// Public API shapes used from istanbul-lib-instrument@6.0.3 and
// istanbul-lib-coverage@3.2.2. These packages publish no declarations.
declare module 'istanbul-lib-instrument' {
  export interface InstrumenterOptions {
    compact?: boolean;
    coverageVariable?: string;
    esModules?: boolean;
    parserPlugins?: string[];
    preserveComments?: boolean;
  }
  export interface FileCoverageData {
    path: string;
    statementMap: Record<string, unknown>;
    fnMap: Record<string, unknown>;
    branchMap: Record<string, unknown>;
    s: Record<string, number>;
    f: Record<string, number>;
    b: Record<string, number[]>;
  }
  export interface Instrumenter {
    instrumentSync(source: string, filename: string): string;
    lastFileCoverage(): FileCoverageData;
  }
  export function createInstrumenter(options?: InstrumenterOptions): Instrumenter;
  /** Documented Babel adaptor exported by istanbul-lib-instrument@6.0.3. */
  export function programVisitor(
    types: typeof import('@babel/core').types,
    filename: string,
    options?: { coverageVariable?: string },
  ): {
    enter(path: import('@babel/core').NodePath<import('@babel/core').types.Program>): void;
    exit(
      path: import('@babel/core').NodePath<import('@babel/core').types.Program>,
    ): { fileCoverage: FileCoverageData; sourceMappingURL?: string } | undefined;
  };
}

declare module 'istanbul-lib-coverage' {
  import type { FileCoverageData } from 'istanbul-lib-instrument';
  export interface CoverageMetricSummary {
    total: number;
    covered: number;
    skipped: number;
    pct: number;
  }
  export interface CoverageSummaryData {
    functions: CoverageMetricSummary;
    lines: CoverageMetricSummary;
    statements: CoverageMetricSummary;
    branches: CoverageMetricSummary;
  }
  export interface CoverageFile extends FileCoverageData {
    toSummary(): { toJSON(): CoverageSummaryData };
  }
  export interface CoverageMap {
    files(): string[];
    fileCoverageFor(file: string): CoverageFile;
    merge(data: unknown): void;
    toJSON(): Record<string, FileCoverageData>;
    getCoverageSummary(): { toJSON(): CoverageSummaryData };
  }
  export function createCoverageMap(data?: Record<string, FileCoverageData>): CoverageMap;
  const publicApi: { createCoverageMap: typeof createCoverageMap };
  export default publicApi;
}
