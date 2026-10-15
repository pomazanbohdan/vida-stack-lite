import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { open, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { parse } from '@babel/parser';
import { typescriptSyntaxPlugins } from './babel-syntax.js';
import { XMLParser, XMLValidator } from 'fast-xml-parser';

export type MutationBodyEvent =
  | {
      schema: 'MutationBodyEvent/v1';
      test_file: string;
      kind: 'body';
      body_id: number;
      assertion_cause: boolean;
      assertion_source: 'bun-expect' | 'node-assert' | null;
    }
  | { schema: 'MutationBodyEvent/v1'; test_file: string; kind: 'hook'; hook: string; error_observed: true };
export type MutationJUnitCase = { test_file: string; name: string; outcome: 'passed' | 'skipped' | 'failed' | 'error' };
type CaseObserver = (testcase: MutationJUnitCase) => void;
export type MutationEvidenceReceipt = Record<string, unknown> & {
  junit_file: string;
  junit_sha256: string;
  junit_bytes: number;
  exit_code: number;
  stdout_capture: CapturedOutput;
  stderr_capture: CapturedOutput;
};
export type ObservedExit = { observed: true; exitCode: number } | { observed: false };
export type TimedOutChild = Pick<Bun.Subprocess, 'pid' | 'exited' | 'signalCode' | 'kill' | 'unref'>;
export type OutputChild = Pick<Bun.ReadableSubprocess, 'stdout' | 'stderr'> & TimedOutChild;
export type OutputReader = {
  read: () => Promise<{ done: true; value?: Uint8Array | undefined } | { done: false; value: Uint8Array }>;
  cancel: () => Promise<void>;
  releaseLock: () => void;
};
export type CapturedOutput = { bytes: number; sha256: string; retained_bytes: number; truncated: boolean };
export type ProcessCustody = {
  pid: number | null;
  scope: 'child' | 'owned-process-group';
  terminationObserved: boolean;
  processGroupTerminationObserved: boolean | null;
  unrefCalled: boolean;
  unrefError?: string | null;
  attempts: { signal: NodeJS.Signals; target: 'child' | 'process-group'; outcome: string; error?: string }[];
};
export type MutationProcessResult = {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  spawnError: string | null;
  timedOut: boolean;
  processCustody: ProcessCustody | null;
  output_capture?: { complete: true; stdout: CapturedOutput; stderr: CapturedOutput } | { complete: false };
};

const parser = new XMLParser({
  ignoreAttributes: false,
  isArray: (name) => name === 'testcase' || name === 'testsuite',
  parseAttributeValue: false,
  processEntities: false,
});

function evidenceRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function entries(value: unknown): unknown[] {
  return value === undefined ? [] : Array.isArray(value) ? value : [value];
}

function emptyTotals(): {
  tests: number;
  assertions: number;
  failures: number;
  errors: number;
  skipped: number;
  assertionFailures: number;
  hookFailures: number;
} {
  return { tests: 0, assertions: 0, failures: 0, errors: 0, skipped: 0, assertionFailures: 0, hookFailures: 0 };
}

function assertTestcaseBinding(testcase: Record<string, unknown>, suiteFile: string) {
  if (typeof testcase['@_name'] !== 'string' || testcase['@_name'].length === 0 || testcase['@_file'] !== suiteFile)
    throw new Error('JUnit testcase name or source binding is invalid.');
}

function countAssertionFailures(failures: unknown[]) {
  let count = 0;
  for (const failure of failures) {
    if (!evidenceRecord(failure) || failure['@_type'] !== 'AssertionError')
      throw new Error('JUnit failure is not proven to be a Bun assertion failure.');
    count += 1;
  }
  return count;
}

function failureHasBodyProof(
  testcase: Record<string, unknown>,
  suiteFile: string,
  failures: unknown[],
  assertionFailures: number,
  assertionCount: number,
  bodyEvents: MutationBodyEvent[],
): boolean {
  if (failures.length !== 1 || assertionFailures !== 1 || typeof testcase['@_name'] !== 'string') return false;
  const match = /^\[mutation-body:(\d+)\] /u.exec(testcase['@_name']);
  if (!match) return false;
  const matches = bodyEvents.filter(
    (event) => event.kind === 'body' && event.test_file === suiteFile && event.body_id === Number(match[1]),
  );
  if (matches.length !== 1 || matches[0]?.kind !== 'body' || !matches[0].assertion_cause) return false;
  return assertionCount > 0 || matches[0].assertion_source === 'node-assert';
}

function countTestcase(
  testcase: Record<string, unknown>,
  suiteFile: string,
  hookFiles: Set<string>,
  bodyEvents: MutationBodyEvent[],
  observe?: CaseObserver,
) {
  assertTestcaseBinding(testcase, suiteFile);
  const assertionText = testcase['@_assertions'];
  if (typeof assertionText !== 'string' || !/^\d+$/u.test(assertionText))
    throw new Error('JUnit testcase assertion count is missing or invalid.');
  const failures = entries(testcase.failure);
  const errors = entries(testcase.error);
  const skipped = entries(testcase.skipped);
  if (failures.length + errors.length + skipped.length > 1) throw new Error('JUnit testcase has conflicting outcomes.');
  const assertionFailures = countAssertionFailures(failures);
  const bodyProven = failureHasBodyProof(
    testcase,
    suiteFile,
    failures,
    assertionFailures,
    Number(assertionText),
    bodyEvents,
  );
  const hookFailed =
    (failures.length > 0 && hookFiles.has(suiteFile)) ||
    bodyEvents.some((event) => event.kind === 'hook' && event.test_file === suiteFile);
  observe?.({
    test_file: suiteFile,
    name: String(testcase['@_name']),
    outcome: skipped.length ? 'skipped' : errors.length ? 'error' : failures.length ? 'failed' : 'passed',
  });
  return {
    tests: 1,
    assertions: Number(assertionText),
    failures: failures.length,
    errors: errors.length,
    skipped: skipped.length,
    assertionFailures: bodyProven ? 1 : 0,
    hookFailures: hookFailed ? 1 : 0,
  };
}

function addTotals(
  totals: {
    tests: number;
    assertions: number;
    failures: number;
    errors: number;
    skipped: number;
    assertionFailures: number;
    hookFailures: number;
  },
  extra: typeof totals,
) {
  totals.tests += extra.tests;
  totals.assertions += extra.assertions;
  totals.failures += extra.failures;
  totals.errors += extra.errors;
  totals.skipped += extra.skipped;
  totals.assertionFailures += extra.assertionFailures;
  totals.hookFailures += extra.hookFailures;
}

function countTestcases(
  cases: unknown,
  suiteFile: string,
  hookFiles: Set<string>,
  bodyEvents: MutationBodyEvent[],
  observe?: CaseObserver,
) {
  const totals = emptyTotals();
  for (const testcase of entries(cases)) {
    if (!evidenceRecord(testcase)) throw new Error('JUnit testcase is not an object.');
    addTotals(totals, countTestcase(testcase, suiteFile, hookFiles, bodyEvents, observe));
  }
  return totals;
}

function countNestedSuites(
  suites: unknown,
  suiteFile: string,
  hookFiles: Set<string>,
  bodyEvents: MutationBodyEvent[],
  observe?: CaseObserver,
) {
  const totals = emptyTotals();
  for (const nested of entries(suites)) {
    if (!evidenceRecord(nested)) throw new Error('Nested JUnit suite is malformed.');
    addTotals(totals, countSuite(nested, suiteFile, hookFiles, bodyEvents, observe));
  }
  return totals;
}

function countSuite(
  suite: Record<string, unknown>,
  suiteFile: string,
  hookFiles: Set<string>,
  bodyEvents: MutationBodyEvent[],
  observe?: CaseObserver,
): {
  tests: number;
  assertions: number;
  failures: number;
  errors: number;
  skipped: number;
  assertionFailures: number;
  hookFailures: number;
} {
  if (suite['@_file'] !== suiteFile) throw new Error('JUnit nested suite is not bound to its selected source file.');
  const totals = countTestcases(suite.testcase, suiteFile, hookFiles, bodyEvents, observe);
  addTotals(totals, countNestedSuites(suite.testsuite, suiteFile, hookFiles, bodyEvents, observe));
  assertCounters(suite, totals);
  return totals;
}

function assertCounters(
  value: Record<string, unknown>,
  totals: { tests: number; failures: number; errors: number; skipped: number },
) {
  for (const [name, expected] of Object.entries(totals)) {
    if (name === 'assertionFailures' || name === 'hookFailures') continue;
    const raw = value[`@_${name}`];
    if (raw === undefined && name === 'errors') continue;
    if (typeof raw !== 'string' || !/^\d+$/u.test(raw) || Number(raw) !== expected)
      throw new Error(`JUnit ${name} counter does not match its testcases.`);
  }
}

function suiteRoots(document: Record<string, unknown>): {
  root: Record<string, unknown>;
  suites: Record<string, unknown>[];
} {
  if (!evidenceRecord(document)) throw new Error('JUnit root is malformed.');
  const direct = entries(document.testsuite);
  const roots = entries(document.testsuites);
  if (direct.length + roots.length !== 1) throw new Error('JUnit must contain one suite root.');
  let root: Record<string, unknown>;
  let suites: Record<string, unknown>[];
  if (direct.length === 1 && evidenceRecord(direct[0])) {
    root = direct[0];
    suites = [root];
  } else if (roots.length === 1 && evidenceRecord(roots[0])) {
    root = roots[0];
    const values = entries(root.testsuite);
    if (values.some((value) => !evidenceRecord(value))) throw new Error('JUnit child suite is malformed.');
    suites = values as Record<string, unknown>[];
  } else throw new Error('JUnit suite root is malformed.');
  if (!suites.length) throw new Error('JUnit report contains no test suites.');
  return { root, suites };
}

function assertSelectedTestFiles(suites: Record<string, unknown>[], expectedTests: string[]) {
  const expected = new Set(expectedTests.map((file) => file.replaceAll('\\', '/').replace(/^\.\//u, '')));
  const actual = suites.map((suite) => {
    if (!evidenceRecord(suite) || typeof suite['@_file'] !== 'string')
      throw new Error('JUnit test suite has no source file binding.');
    return suite['@_file'].replaceAll('\\', '/').replace(/^\.\//u, '');
  });
  if (
    expected.size !== expectedTests.length ||
    actual.length !== expected.size ||
    new Set(actual).size !== actual.length ||
    actual.some((file) => !expected.has(file))
  )
    throw new Error('JUnit suite files do not match the selected test files.');
}

function countTopLevelSuites(
  suites: Record<string, unknown>[],
  hookFiles: Set<string>,
  bodyEvents: MutationBodyEvent[],
  observe?: CaseObserver,
) {
  const totals = emptyTotals();
  for (const suite of suites) {
    const suiteFile = (suite['@_file'] as string).replaceAll('\\', '/');
    addTotals(totals, countSuite(suite, suiteFile, hookFiles, bodyEvents, observe));
  }
  return totals;
}

function outcomeFromJUnitTotals(
  totals: {
    tests: number;
    assertions: number;
    failures: number;
    errors: number;
    skipped: number;
    assertionFailures: number;
    hookFailures: number;
  },
  bodyEvents: MutationBodyEvent[],
) {
  if (totals.tests === 0) throw new Error('JUnit report contains no test cases.');
  if (totals.hookFailures > 0 || bodyEvents.some((event) => event.kind === 'hook')) return 'unproven';
  if (totals.errors > 0) return 'unproven';
  const bodyEventCount = bodyEvents.filter((event) => event.kind === 'body').length;
  if (totals.failures > 0) return failureOutcome(totals, bodyEventCount);
  if (bodyEventCount > 0) return 'unproven';
  if (totals.errors === 0 && totals.tests > totals.skipped) return 'passed';
  return 'unproven';
}

function failureOutcome(totals: { failures: number; assertionFailures: number }, bodyEventCount: number) {
  return totals.failures === totals.assertionFailures && bodyEventCount === totals.failures ? 'killed' : 'unproven';
}

function junitOutcomeFromDocument(
  document: Record<string, unknown>,
  expectedTests: string[],
  unattributedHookFiles: string[] = [],
  bodyEvents: MutationBodyEvent[] = [],
  observe?: CaseObserver,
): { tests: number; assertions: number; failures: number; errors: number; skipped: number; outcome: string } {
  const { root, suites } = suiteRoots(document);
  assertSelectedTestFiles(suites, expectedTests);
  const totals = countTopLevelSuites(suites, new Set(unattributedHookFiles), bodyEvents, observe);
  if (root !== suites[0] || root['@_name'] === 'bun test') assertCounters(root, totals);
  return { ...totals, outcome: outcomeFromJUnitTotals(totals, bodyEvents) };
}

function bodyEventHeader(value: unknown, allowed: Set<string>): value is Record<string, unknown> {
  return (
    evidenceRecord(value) &&
    value.schema === 'MutationBodyEvent/v1' &&
    typeof value.test_file === 'string' &&
    allowed.has(value.test_file)
  );
}

function bodyAssertionEvent(value: Record<string, unknown>): value is Extract<MutationBodyEvent, { kind: 'body' }> {
  const keys = Object.keys(value).sort();
  return (
    keys.join(',') === 'assertion_cause,assertion_source,body_id,kind,schema,test_file' &&
    value.kind === 'body' &&
    Number.isSafeInteger(value.body_id) &&
    Number(value.body_id) > 0 &&
    typeof value.assertion_cause === 'boolean' &&
    (value.assertion_source === 'bun-expect' ||
      value.assertion_source === 'node-assert' ||
      value.assertion_source === null)
  );
}

function bodyHookEvent(value: Record<string, unknown>): value is Extract<MutationBodyEvent, { kind: 'hook' }> {
  const keys = Object.keys(value).sort();
  return (
    value.kind === 'hook' &&
    keys.join(',') === 'error_observed,hook,kind,schema,test_file' &&
    ['beforeAll', 'beforeEach', 'afterAll', 'afterEach'].includes(String(value.hook)) &&
    value.error_observed === true
  );
}

function parseBodyEventLine(line: string, allowed: Set<string>, ids: Set<string>): MutationBodyEvent {
  if (!line) throw new Error('Mutation body receipt has an empty event line.');
  const value = JSON.parse(line) as unknown;
  if (!bodyEventHeader(value, allowed)) throw new Error('Mutation body receipt has an invalid test binding.');
  if (value.kind === 'body') {
    if (!bodyAssertionEvent(value)) throw new Error('Mutation body receipt has an invalid body event.');
    const event = value;
    const id = `${event.test_file}:${event.body_id}`;
    if (ids.has(id)) throw new Error('Mutation body receipt repeats a body ID.');
    ids.add(id);
    return event;
  }
  if (!bodyHookEvent(value)) throw new Error('Mutation body receipt has an invalid hook event.');
  return value;
}

export function parseMutationBodyEvents(bytes: Uint8Array, expectedTests: string[]): MutationBodyEvent[] {
  if (bytes.byteLength > 4 * 1024 * 1024) throw new Error('Mutation body receipts exceeded their size bound.');
  const source = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  if (!source) return [];
  const allowed = new Set(expectedTests.map((file) => file.replaceAll('\\', '/').replace(/^\.\//u, '')));
  const lines = source.split('\n');
  if (lines.at(-1) === '') lines.pop();
  const ids: Set<string> = new Set();
  return lines.map((line) => parseBodyEventLine(line, allowed, ids));
}

export function junitOutcome(
  xml: string,
  expectedTests: string[],
  unattributedHookFiles: string[] = [],
  bodyEvents: MutationBodyEvent[] = [],
  observe?: CaseObserver,
) {
  if (XMLValidator.validate(xml) !== true) throw new Error('JUnit XML is malformed.');
  const document = parser.parse(xml) as unknown;
  if (!evidenceRecord(document)) throw new Error('JUnit root is malformed.');
  return junitOutcomeFromDocument(document, expectedTests, unattributedHookFiles, bodyEvents, observe);
}

function declarationModuleSpecifier(current: unknown): string | null {
  if (!evidenceRecord(current)) return null;
  const sourceNode = current.source;
  const declarations = ['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration'];
  if (!evidenceRecord(sourceNode) || !declarations.includes(String(current.type))) return null;
  return typeof sourceNode.value === 'string' ? sourceNode.value : null;
}

function callModuleSpecifier(current: unknown): string | null {
  if (!evidenceRecord(current) || current.type !== 'CallExpression') return null;
  const callee = current.callee;
  const args = current.arguments;
  if (!evidenceRecord(callee) || !Array.isArray(args)) return null;
  if (callee.type !== 'Import' && !(callee.type === 'Identifier' && callee.name === 'require')) return null;
  return evidenceRecord(args[0]) && typeof args[0].value === 'string' ? args[0].value : null;
}

function nodeModuleSpecifiers(current: Record<string, unknown>): string[] {
  return [declarationModuleSpecifier(current), callModuleSpecifier(current)].filter((specifier) => specifier !== null);
}

function unknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function collectModuleSpecifiers(tree: unknown): string[] {
  const pending = [tree];
  const specifiers = [];
  while (pending.length) {
    const current = pending.pop();
    if (!evidenceRecord(current)) continue;
    specifiers.push(...nodeModuleSpecifiers(current));
    for (const value of Object.values(current)) {
      if (unknownArray(value)) {
        for (const child of value) pending.push(child);
      } else if (evidenceRecord(value) && typeof value.type === 'string') pending.push(value);
    }
  }
  return specifiers;
}

function moduleSpecifiers(source: string, file: string): string[] {
  if (file.endsWith('.json')) {
    JSON.parse(source);
    return [];
  }
  const tree = parse(source, { sourceType: 'unambiguous', plugins: typescriptSyntaxPlugins(file) }) as unknown;
  return collectModuleSpecifiers(tree);
}

function resolveTestImport(importer: string, specifier: string, files: Set<string>): string | null {
  if (!specifier.startsWith('.')) return null;
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(importer), specifier));
  const candidates = [base, ...['.mjs', '.js', '.cjs', '.mts', '.ts', '.tsx', '.jsx'].map((ext) => base + ext)];
  for (const extension of ['.mjs', '.js', '.cjs', '.mts', '.ts', '.tsx', '.jsx'])
    candidates.push(path.posix.join(base, 'index' + extension));
  return candidates.find((file) => files.has(file)) ?? null;
}

export function testFilesWithLifecycleHooks(testFiles: string[], testInputs: Record<string, Buffer>): string[] {
  const inputFiles = new Set(Object.keys(testInputs).map((file) => file.replaceAll('\\', '/')));
  return testFiles.filter((testFile) => {
    const pending = [testFile];
    const visited = new Set();
    while (pending.length) {
      const file = pending.pop();
      if (!file || visited.has(file)) continue;
      visited.add(file);
      const bytes = testInputs[file];
      if (!bytes) return true;
      const source = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      let specifiers;
      try {
        specifiers = moduleSpecifiers(source, file);
      } catch {
        return true;
      }
      if (
        !file.startsWith('tests/') &&
        !file.endsWith('.json') &&
        /\b(?:beforeAll|beforeEach|afterAll|afterEach)\b/u.test(source)
      )
        return true;
      for (const specifier of specifiers) {
        const imported = resolveTestImport(file, specifier, inputFiles);
        if (imported) pending.push(imported);
      }
    }
    return false;
  });
}

export function confirmedRunnerOutcome(exitCode: number | null, outcome: string) {
  if (exitCode === 0 && outcome === 'passed') return 'passed';
  if (exitCode === 1 && outcome === 'killed') return 'killed';
  return 'unknown';
}

/** Canonical evidence identity contains only execution inputs, never ambient secrets. */

const canonicalEvidenceJson = (value: unknown) => JSON.stringify(value);

const evidenceSha256 = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');

export const mutationToolInputs = [
  'stryker.config.ts',
  'tooling/mutation-gate.ts',
  'tooling/mutation-partitions.ts',
  'tooling/mutation-map.ts',
  'tooling/mutation-map-reporter.ts',
  'tooling/mutation-command-runner.ts',
  'tooling/mutation-evidence.ts',
  'tooling/mutation-assertion-context.ts',
  'tooling/mutation-test-adapter.ts',
  'tooling/mutation-test-preload.ts',
  'bin/bun.ts',
];

export function executionIdentityDigest(identity: Record<string, unknown>) {
  return evidenceSha256(canonicalEvidenceJson(identity));
}

function matchesExecutionIdentity(actual: unknown, expected: Record<string, unknown>, sandboxRoot: string) {
  if (!evidenceRecord(actual) || typeof actual.cwd !== 'string' || actual.package_root !== actual.cwd) return false;
  const cwd = path.resolve(actual.cwd);
  const sandbox = path.resolve(sandboxRoot);
  const relative = path.relative(sandbox, cwd);
  if (relative.split(path.sep).length !== 1 || !path.basename(relative).startsWith('sandbox-')) return false;
  const actualIdentity = { ...actual };
  delete actualIdentity.cwd;
  delete actualIdentity.package_root;
  const expectedIdentity = { ...expected };
  delete expectedIdentity.cwd;
  delete expectedIdentity.package_root;
  return canonicalEvidenceJson(actualIdentity) === canonicalEvidenceJson(expectedIdentity);
}

export function mutationReceiptMatches(
  value: unknown,
  expected: {
    runId: string;
    partition: string;
    mutantId: string | null;
    tests: string[];
    bodyEventsFile: string;
    inputs: { source_fingerprint: string; test_fingerprint: string; tool_fingerprint: string };
    fingerprint: string;
    junitFile: string;
    stdoutFile: string;
    stderrFile: string;
    command: string[];
    sandboxRoot: string;
    executionIdentity: Record<string, unknown>;
    testContext?: { root: string; inputs: { path: string; sha256: string }[] } | null;
  },
): value is MutationEvidenceReceipt {
  if (!evidenceRecord(value) || !evidenceRecord(value.execution_identity)) return false;
  return [
    value.schema === 'MutationRunnerReceipt/v3',
    value.run_id === expected.runId,
    value.partition === expected.partition,
    value.active_mutant_id === expected.mutantId,
    Array.isArray(value.test_files) &&
      canonicalEvidenceJson(value.test_files) === canonicalEvidenceJson(expected.tests),
    value.input_fingerprint === expected.fingerprint,
    value.source_fingerprint === expected.inputs.source_fingerprint,
    value.test_fingerprint === expected.inputs.test_fingerprint,
    value.tool_fingerprint === expected.inputs.tool_fingerprint,
    executionIdentityDigest(value.execution_identity) === value.execution_identity_digest,
    value.execution_identity_after_digest === value.execution_identity_digest,
    matchesExecutionIdentity(value.execution_identity, expected.executionIdentity, expected.sandboxRoot),
    canonicalEvidenceJson(value.test_context ?? null) === canonicalEvidenceJson(expected.testContext ?? null),
    value.junit_file === expected.junitFile,
    value.body_events_file === expected.bodyEventsFile,
    typeof value.body_events_sha256 === 'string' && /^[0-9a-f]{64}$/u.test(value.body_events_sha256),
    Number.isSafeInteger(value.body_events_bytes) &&
      Number(value.body_events_bytes) >= 0 &&
      Number(value.body_events_bytes) <= 4 * 1024 * 1024,
    value.stdout_file === expected.stdoutFile,
    value.stderr_file === expected.stderrFile,
    validCapturedOutput(value.stdout_capture),
    validCapturedOutput(value.stderr_capture),
    canonicalEvidenceJson(value.command) === canonicalEvidenceJson(recordedMutationCommand(expected.command)),
    value.spawn_error === null,
    value.timed_out === false,
    value.signal === null,
    Number.isSafeInteger(value.exit_code),
    validObservedProcessCustody(value.process_custody),
    typeof value.junit_sha256 === 'string' && /^[0-9a-f]{64}$/u.test(value.junit_sha256),
    Number.isSafeInteger(value.junit_bytes) && Number(value.junit_bytes) > 0,
  ].every(Boolean);
}

function validCapturedOutput(value: unknown): boolean {
  return (
    evidenceRecord(value) &&
    Number.isSafeInteger(value.bytes) &&
    Number(value.bytes) >= 0 &&
    Number.isSafeInteger(value.retained_bytes) &&
    value.retained_bytes === value.bytes &&
    value.truncated === false &&
    typeof value.sha256 === 'string' &&
    /^[0-9a-f]{64}$/u.test(value.sha256)
  );
}

function validObservedProcessCustody(value: unknown): boolean {
  return (
    evidenceRecord(value) &&
    Number.isSafeInteger(value.pid) &&
    Number(value.pid) > 0 &&
    value.terminationObserved === true &&
    value.unrefCalled === false &&
    Array.isArray(value.attempts) &&
    value.attempts.length === 0
  );
}

export function buildMutationTestCommand(executable: string, tests: string[], junitFile: string): string[] {
  return [
    executable,
    'test',
    ...tests,
    '--timeout',
    '5000',
    '--preload=./tooling/mutation-test-preload.ts',
    '--reporter=junit',
    `--reporter-outfile=${junitFile}`,
  ];
}

export function recordedMutationCommand(command: string[]): string[] {
  const reporterArgument = command.at(-1);
  if (typeof reporterArgument !== 'string' || !reporterArgument.startsWith('--reporter-outfile='))
    throw new Error('Mutation command has no JUnit output argument.');
  return [
    ...command.slice(0, -1),
    `--reporter-outfile=<${reporterArgument.slice('--reporter-outfile='.length).split(/[\\/]/u).at(-1)}>`,
  ];
}

function childErrorCode(error: unknown): string {
  return error !== null && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
    ? error.code
    : 'runner-error';
}

async function observeExit(exited: Promise<number>, durationMs: number): Promise<ObservedExit> {
  let timer;
  try {
    const childExit: Promise<ObservedExit> = exited.then((exitCode) => ({ observed: true, exitCode }));

    const timeout: Promise<ObservedExit> = new Promise((resolve) => {
      timer = setTimeout(() => resolve({ observed: false }), durationMs);
    });
    return await Promise.race([childExit, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function waitForOwnedProcessGroup(pid: number | null, durationMs: number): Promise<boolean> {
  if (pid === null || process.platform === 'win32') return false;
  const deadline = Date.now() + durationMs;
  while (true) {
    try {
      process.kill(-pid, 0);
    } catch (error) {
      return childErrorCode(error) === 'ESRCH';
    }
    const remaining = deadline - Date.now();
    if (remaining <= 0) return false;
    await new Promise((resolve) => setTimeout(resolve, Math.min(100, remaining)));
  }
}

function processCustodyScope(ownedProcessGroup: boolean): 'child' | 'owned-process-group' {
  return ownedProcessGroup && process.platform !== 'win32' ? 'owned-process-group' : 'child';
}

function assertObservableChildExit(child: TimedOutChild) {
  if (typeof child.exited?.then !== 'function') throw new Error('Timed-out child has no observable exit promise.');
}

function sendTimeoutSignal(
  child: TimedOutChild,
  signal: NodeJS.Signals,
  ownedProcessGroup: boolean,
): ProcessCustody['attempts'][number] {
  const pid = Number.isSafeInteger(child.pid) ? child.pid : null;

  const target: 'child' | 'process-group' =
    ownedProcessGroup && process.platform !== 'win32' && pid !== null ? 'process-group' : 'child';
  try {
    if (target === 'process-group') process.kill(-(pid as number), signal);
    else child.kill(signal);
    return { signal, target, outcome: 'sent' };
  } catch (error) {
    return { signal, target, outcome: 'failed', error: childErrorCode(error) };
  }
}

async function signalAndObserveTimeout(
  child: TimedOutChild,
  signal: NodeJS.Signals,
  waitMs: number,
  ownedProcessGroup: boolean,
): Promise<{ observed: ObservedExit; processGroupGone: boolean; attempt: ProcessCustody['attempts'][number] }> {
  const pid = Number.isSafeInteger(child.pid) ? child.pid : null;
  const target = ownedProcessGroup && process.platform !== 'win32' && pid !== null ? 'process-group' : 'child';
  const attempt = sendTimeoutSignal(child, signal, ownedProcessGroup);
  const processGroupGone = target === 'process-group' ? await waitForOwnedProcessGroup(pid, waitMs) : false;
  const observed = await observeExit(child.exited, target === 'process-group' ? 0 : waitMs);
  return { observed, processGroupGone, attempt };
}

async function escalateTimedOutChild(
  child: TimedOutChild,
  terminationGraceMs: number,
  forceWaitMs: number,
  ownedProcessGroup: boolean,
): Promise<{ observed: ObservedExit; processGroupGone: boolean; attempts: ProcessCustody['attempts'] }> {
  const attempts = [];
  let observed = await observeExit(child.exited, 0);
  let processGroupGone = false;
  const groupCleanup = ownedProcessGroup && process.platform !== 'win32';
  for (const [signal, waitMs] of [
    ['SIGTERM', terminationGraceMs],
    ['SIGKILL', forceWaitMs],
  ] as [NodeJS.Signals, number][]) {
    if (observed.observed && !groupCleanup) break;
    const result = await signalAndObserveTimeout(child, signal, waitMs, ownedProcessGroup);
    attempts.push(result.attempt);
    observed = result.observed;
    processGroupGone = result.processGroupGone;
    if (processGroupGone) break;
  }
  return { observed, processGroupGone, attempts };
}

function observedTimedOutResult(
  child: TimedOutChild,
  pid: number | null,
  scope: 'child' | 'owned-process-group',
  settled: Awaited<ReturnType<typeof escalateTimedOutChild>>,
): MutationProcessResult {
  return {
    exitCode: settled.observed.observed ? settled.observed.exitCode : null,
    signal: child.signalCode ?? null,
    spawnError: null,
    timedOut: true,
    processCustody: {
      pid,
      scope,
      terminationObserved: settled.observed.observed,
      processGroupTerminationObserved: scope === 'owned-process-group' ? settled.processGroupGone : null,
      unrefCalled: false,
      attempts: settled.attempts,
    },
  };
}

function unobservedTimedOutResult(
  child: TimedOutChild,
  pid: number | null,
  scope: 'child' | 'owned-process-group',
  settled: Awaited<ReturnType<typeof escalateTimedOutChild>>,
): MutationProcessResult {
  let unrefCalled = false;
  let unrefError = null;
  try {
    child.unref();
    unrefCalled = true;
  } catch (error) {
    unrefError = childErrorCode(error);
  }
  return {
    exitCode: null,
    signal: null,
    spawnError: scope === 'owned-process-group' ? 'process-group-termination-unobserved' : 'termination-unobserved',
    timedOut: true,
    processCustody: {
      pid,
      scope,
      terminationObserved: settled.observed.observed,
      processGroupTerminationObserved: scope === 'owned-process-group' ? false : null,
      unrefCalled,
      unrefError,
      attempts: settled.attempts,
    },
  };
}

async function makeTimedOutChildResult(
  child: TimedOutChild,
  settled: Awaited<ReturnType<typeof escalateTimedOutChild>>,
  ownedProcessGroup: boolean,
): Promise<MutationProcessResult> {
  const pid = Number.isSafeInteger(child.pid) ? child.pid : null;
  const scope = processCustodyScope(ownedProcessGroup);
  if (settled.processGroupGone || (settled.observed.observed && scope === 'child'))
    return observedTimedOutResult(child, pid, scope, settled);
  return unobservedTimedOutResult(child, pid, scope, settled);
}

export async function settleTimedOutChild(
  child: TimedOutChild,
  terminationGraceMs: number,
  forceWaitMs: number,
  ownedProcessGroup: boolean = false,
): Promise<MutationProcessResult> {
  assertObservableChildExit(child);
  const settled = await escalateTimedOutChild(child, terminationGraceMs, forceWaitMs, ownedProcessGroup);
  return makeTimedOutChildResult(child, settled, ownedProcessGroup);
}

function captureMutationOutput(
  stream: ReadableStream<Uint8Array>,
  file: string,
  limit: number = 4 * 1024 * 1024,
): { cancel: () => Promise<void>; result: Promise<CapturedOutput> } {
  const reader = stream.getReader();
  return { cancel: () => reader.cancel(), result: consumeOutput(reader, file, limit) };
}

async function consumeOutput(reader: OutputReader, file: string, limit: number): Promise<CapturedOutput> {
  const handle = file ? await open(file, 'wx', 0o600) : null;
  const hash = createHash('sha256');
  let bytes = 0;
  let retained = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      hash.update(value);
      const length = Math.min(value.byteLength, Math.max(0, limit - retained));
      if (length && handle) await handle.writeFile(value.subarray(0, length));
      retained += length;
    }
  } finally {
    reader.releaseLock();
    if (handle) {
      await handle.sync();
      await handle.close();
    }
  }
  return { bytes, sha256: hash.digest('hex'), retained_bytes: retained, truncated: retained !== bytes };
}

export async function executeMutationCommand(
  command: string[],
  cwd: string,
  timeoutMs: number,
  limits: {
    terminationGraceMs?: number;
    forceWaitMs?: number;
    stdoutFile?: string;
    stderrFile?: string;
    outputByteLimit?: number;
    env?: NodeJS.ProcessEnv;
    ownedProcessGroup?: boolean;
  } = {},
): Promise<MutationProcessResult> {
  if (!command.length || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1)
    return { exitCode: null, signal: null, spawnError: 'invalid-command', timedOut: false, processCustody: null };
  let child;
  try {
    child = spawnMutationChild(command, cwd, limits);
  } catch (error) {
    return { exitCode: null, signal: null, spawnError: childErrorCode(error), timedOut: false, processCustody: null };
  }
  return observeMutationProcess(child, timeoutMs, limits);
}

function spawnMutationChild(
  command: string[],
  cwd: string,
  limits: { env?: NodeJS.ProcessEnv; ownedProcessGroup?: boolean },
): OutputChild {
  return Bun.spawn({
    cmd: command,
    cwd,
    env: limits.env ?? process.env,
    stdout: 'pipe',
    stderr: 'pipe',
    detached: limits.ownedProcessGroup ?? false,
  });
}

async function observeMutationProcess(
  child: OutputChild,
  timeoutMs: number,
  limits: {
    terminationGraceMs?: number;
    forceWaitMs?: number;
    stdoutFile?: string;
    stderrFile?: string;
    outputByteLimit?: number;
    env?: NodeJS.ProcessEnv;
    ownedProcessGroup?: boolean;
  },
): Promise<MutationProcessResult> {
  const ownedProcessGroup = limits.ownedProcessGroup === true;
  const outputLimit = limits.outputByteLimit ?? 4 * 1024 * 1024;
  const stdout = captureMutationOutput(child.stdout, limits.stdoutFile ?? '', outputLimit);
  const stderr = captureMutationOutput(child.stderr, limits.stderrFile ?? '', outputLimit);
  const outputResults = Promise.all([stdout.result, stderr.result]);
  const initial = await observeExit(child.exited, timeoutMs);
  let result;
  if (initial.observed) {
    const processGroupTerminationObserved = ownedProcessGroup ? await waitForOwnedProcessGroup(child.pid, 0) : null;
    result = {
      exitCode: initial.exitCode,
      signal: child.signalCode,
      spawnError: ownedProcessGroup && !processGroupTerminationObserved ? 'process-group-termination-unobserved' : null,
      timedOut: false,
      processCustody: {
        pid: child.pid,
        scope: processCustodyScope(ownedProcessGroup),
        terminationObserved: true,
        processGroupTerminationObserved,
        unrefCalled: false,
        attempts: [],
      },
    };
  } else {
    result = await settleTimedOutChild(
      child,
      limits.terminationGraceMs ?? 1_000,
      limits.forceWaitMs ?? 1_000,
      ownedProcessGroup,
    );
  }

  let outputTimer: ReturnType<typeof setTimeout> | undefined;
  const outputDeadline: Promise<{ complete: false }> = new Promise((resolve) => {
    outputTimer = setTimeout(() => resolve({ complete: false }), 500);
  });
  const settled = await Promise.race([
    outputResults.then(([out, err]) => ({ complete: true, stdout: out, stderr: err })),
    outputDeadline,
  ]).finally(() => clearTimeout(outputTimer));
  if (!settled.complete) {
    stdout.cancel().catch(() => {});
    stderr.cancel().catch(() => {});
    return {
      ...result,
      spawnError: result.spawnError ?? 'output-capture-incomplete',
      output_capture: { complete: false },
    };
  }
  return { ...result, output_capture: settled };
}

async function hashExecutable(
  handle: import('node:fs/promises').FileHandle,
  expected: import('node:fs').BigIntStats,
): Promise<string> {
  const hash = createHash('sha256');
  const buffer = Buffer.alloc(64 * 1024);
  let position = 0;
  while (position < Number(expected.size)) {
    const { bytesRead } = await handle.read(
      buffer,
      0,
      Math.min(buffer.length, Number(expected.size) - position),
      position,
    );
    if (!bytesRead) throw new Error('Pinned Bun executable ended while hashing.');
    hash.update(buffer.subarray(0, bytesRead));
    position += bytesRead;
  }
  return hash.digest('hex');
}

export async function collectExecutionIdentity(input: {
  executable: string;
  cwd: string;
  packageRoot: string;
  sandboxRoot: string;
  command: string[];
  tests: string[];
  sourceFingerprint: string;
  testFingerprint: string;
  toolFingerprint: string;
  bunVersion: string;
  platform: string;
  arch: string;
}) {
  const executablePath = await realpath(input.executable);
  const beforeInfo = await stat(executablePath, { bigint: true });
  if (!beforeInfo.isFile()) throw new Error('Pinned Bun executable is not a regular file.');
  const handle = await open(executablePath, constants.O_RDONLY | constants.O_NONBLOCK);
  const executableInfo = await handle.stat({ bigint: true });
  if (executableInfo.dev !== beforeInfo.dev || executableInfo.ino !== beforeInfo.ino || !executableInfo.isFile()) {
    await handle.close();
    throw new Error('Pinned Bun executable changed while opening.');
  }
  let executableSha256;
  try {
    executableSha256 = await hashExecutable(handle, executableInfo);
  } finally {
    await handle.close();
  }
  const currentInfo = await stat(executablePath, { bigint: true });
  if (
    currentInfo.dev !== executableInfo.dev ||
    currentInfo.ino !== executableInfo.ino ||
    currentInfo.size !== executableInfo.size ||
    currentInfo.mtimeNs !== executableInfo.mtimeNs ||
    currentInfo.ctimeNs !== executableInfo.ctimeNs
  )
    throw new Error('Pinned Bun executable changed while hashing.');
  return {
    schema: 'MutationExecutionIdentity/v2',
    bun_executable: executablePath,
    bun_executable_sha256: executableSha256,
    bun_executable_file: {
      device: executableInfo.dev.toString(),
      inode: executableInfo.ino.toString(),
      size: executableInfo.size.toString(),
      modified_ns: executableInfo.mtimeNs.toString(),
      changed_ns: executableInfo.ctimeNs.toString(),
    },
    bun_version: input.bunVersion,
    platform: input.platform,
    arch: input.arch,
    cwd: path.resolve(input.cwd),
    package_root: path.resolve(input.packageRoot),
    sandbox_root: path.resolve(input.sandboxRoot),
    command: input.command,
    test_files: input.tests,
    source_fingerprint: input.sourceFingerprint,
    test_fingerprint: input.testFingerprint,
    tool_fingerprint: input.toolFingerprint,
  };
}

/** Parent projection only; the byte observation needs fresh full hashes at both validation boundaries. */
export function executionIdentityForInvocation(
  observation: Awaited<ReturnType<typeof collectExecutionIdentity>>,
  command: readonly string[],
  tests: readonly string[],
) {
  return {
    ...observation,
    bun_executable_file: { ...observation.bun_executable_file },
    command: [...command],
    test_files: [...tests],
  };
}
