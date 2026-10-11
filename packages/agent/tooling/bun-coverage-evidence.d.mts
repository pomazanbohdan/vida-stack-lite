export type InputDigest = {
  path: string;
  sha256: string;
};
export type TestSelection = {
  mode: 'full-current-test-set' | 'published-baseline-bun-native';
  baseline_ref?: string;
  package_script?: string;
  native_runner?: string;
  tests: string[];
  published_contract_inputs?: InputDigest[];
  published_fixture?: import('./published-coverage-inputs.js').PublishedFixtureIdentity;
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
export type CoverageSummary = {
  functions: MetricSummary;
  lines: MetricSummary;
  statements: MetricSummary;
  branches: MetricSummary;
};
export type MetricSummary = {
  total: number;
  covered: number;
  skipped: number;
  pct: number;
};
export type InstrumentedFile = {
  path: string;
  statementMap: Record<string, unknown>;
  fnMap: Record<string, unknown>;
  branchMap: Record<string, unknown>;
  s: Record<string, number>;
  f: Record<string, number>;
  b: Record<string, number[]>;
};
/** @typedef {{mode: 'full-current-test-set' | 'published-baseline-bun-native', baseline_ref?: string, package_script?: string, native_runner?: string, tests: string[], published_contract_inputs?: InputDigest[], published_execution?: {argv: string[], published_argv: string[], env_file: string, env: Record<string, string>, config: string, randomize: boolean, seed: number, env_expansion: boolean, telemetry: boolean, published_preload: string, active_preload: string, instrumentation_note: string, counter_trust_scope: string}}} TestSelection */
/** @typedef {{sources: InputDigest[], source_fingerprint: string, tests: string[], test_selection: TestSelection, test_inputs: InputDigest[], test_fingerprint: string, tool_inputs: InputDigest[], tool_fingerprint: string, module_inputs: InputDigest[], input_bytes: Record<string, Buffer>}} CoverageInputs */
/** @typedef {{functions: MetricSummary, lines: MetricSummary, statements: MetricSummary, branches: MetricSummary}} CoverageSummary */
/** @typedef {{total: number, covered: number, skipped: number, pct: number}} MetricSummary */
/** @typedef {{path: string, statementMap: Record<string, unknown>, fnMap: Record<string, unknown>, branchMap: Record<string, unknown>, s: Record<string, number>, f: Record<string, number>, b: Record<string, number[]>}} InstrumentedFile */
export declare const coverageToolInputs: string[];
/** @param {string | Uint8Array} bytes */
export declare const sha256: (bytes: string | Uint8Array) => string;
/** @param {unknown} value */
export declare const canonicalJson: (value: unknown) => string;
/** @param {unknown} value @returns {boolean} */
export declare function isExternalModulePath(value: unknown): boolean;
/** @param {unknown} value @returns {string | null} */
export declare function canonicalTestSelection(value: unknown): string | null;
/** @param {string} root @returns {Promise<string>} */
export declare const readBunPin: (root: string) => Promise<string>;
export type PublishedContract = {
  bytes: Map<string, Buffer>;
  sources: string[];
  testInputs: string[];
  tests: string[];
  fixture: import('./published-coverage-inputs.js').PublishedFixtureIdentity;
  env: Record<string, string>;
  argv: string[];
  publishedArgv: string[];
};
/** @param {string} file @param {string} source */
export declare function instrumentSource(
  file: string,
  source: string,
): {
  code: string;
  fileCoverage: InstrumentedFile;
};
export type FinalQualityProjectionInputs = {
  coverage: readonly string[];
  mutation: readonly string[];
  guard: readonly string[];
};
export type QualityInputCapture = {
  sources: InputDigest[];
  testInputs: InputDigest[];
  testInputsAll: string[];
  testSelection: TestSelection;
  contractInputs: string[];
  inputBytes: Map<string, Buffer>;
  publishedContract?: PublishedContract;
};
/** One snapshot projected into the exact existing coverage, mutation and aggregate tool identities. */
/** @param {string} root @param {unknown} projections @returns {Promise<{coverage: CoverageInputs, mutation: CoverageInputs, guard: CoverageInputs}>} */
export declare function qualityInputProjections(
  root: string,
  projections: unknown,
): Promise<{
  coverage: CoverageInputs;
  mutation: CoverageInputs;
  guard: CoverageInputs;
}>;
/** One immutable input owner for coverage and mutation qualification. */
/** @param {string} root @param {readonly string[]} [additionalToolInputs] @param {'current' | 'published-baseline-bun-native'} [selectionMode] @returns {Promise<CoverageInputs>} */
export declare function qualityInputs(
  root: string,
  additionalToolInputs?: readonly string[],
  selectionMode?: 'current' | 'published-baseline-bun-native',
): Promise<CoverageInputs>;
/** @param {string} root @param {'current' | 'published-baseline-bun-native'} [selectionMode] @returns {Promise<CoverageInputs>} */
export declare const coverageInputs: (
  root: string,
  selectionMode?: 'current' | 'published-baseline-bun-native',
) => Promise<CoverageInputs>;
/** @param {CoverageInputs} inputs */
/** @param {Pick<CoverageInputs, 'sources' | 'test_inputs' | 'tool_inputs'>} inputs */
export declare function capturedModuleInputs(
  inputs: Pick<CoverageInputs, 'sources' | 'test_inputs' | 'tool_inputs'>,
): InputDigest[];
/** @param {CoverageInputs} inputs */
export declare function qualityFingerprint(inputs: CoverageInputs): string;
