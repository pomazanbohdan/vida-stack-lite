import path from 'node:path';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import type { PublishedFixtureIdentity } from './published-coverage-inputs.js';

const historicalTests = [
  'tests/bun/host-state.test.mjs',
  'tests/bun/lifecycle-state.test.mjs',
  'tests/bun/persistent-session-handoff.test.mjs',
  'tests/bun-coverage.test.mjs',
];
const inventoryFile = 'tooling/mutation-gate.mjs';
const failedFile = 'tests/bun-coverage.test.mjs';
const failureName = 'mutation inventory assigns every maintained source, including production CLIs, to a partition';
const skipName = 'Bun native coverage finalizes a durable report after the exact four-file command';
const failureMessage = 'Expected values to be strictly equal:&#10;&#10;1 !== 0&#10;';
// Exact UTF8 stdout independently observed from the immutable published subject.
// This is a historical predicate, never a current mutation result.
const inventoryOutputSha256 = '96eb4bf4b21263b198d39225d59d46e6ce1b750dfdb797f73b50ac6d1c92b476';
const emptySha256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const parser = new XMLParser({
  ignoreAttributes: false,
  parseAttributeValue: false,
  parseTagValue: false,
  processEntities: false,
  maxNestedTags: 16,
  isArray: (name) => ['testsuite', 'testcase', 'failure', 'error', 'skipped'].includes(name),
});

export type PublishedBaselineReference = {
  schema: 'PublishedBaselineReference/v1';
  kind: 'measurement_admitted';
  suite_passed: false;
  quality_passed: false;
  failure_id: 'b549951/mutation-inventory-gap-37';
  junit: { path: string; sha256: string; bytes: number };
  inventory: { process_file: string; pid: number; child_id: number };
};

/** Exact metadata shape; all underlying bytes and process custody remain independently required. */
export function parseHistoricalReference(value: unknown, runId: string): PublishedBaselineReference {
  const reference = record(value, 'metadata');
  const junit = record(reference.junit, 'JUnit binding');
  const inventory = record(reference.inventory, 'inventory binding');
  if (
    Object.keys(reference).sort().join(',') !== 'failure_id,inventory,junit,kind,quality_passed,schema,suite_passed' ||
    reference.schema !== 'PublishedBaselineReference/v1' ||
    reference.kind !== 'measurement_admitted' ||
    reference.suite_passed !== false ||
    reference.quality_passed !== false ||
    reference.failure_id !== 'b549951/mutation-inventory-gap-37' ||
    Object.keys(junit).sort().join(',') !== 'bytes,path,sha256' ||
    junit.path !== path.posix.join('coverage/bun-unified/runs', runId, 'processes/suite.junit.xml') ||
    typeof junit.sha256 !== 'string' ||
    !/^[0-9a-f]{64}$/u.test(junit.sha256) ||
    !Number.isSafeInteger(junit.bytes) ||
    Number(junit.bytes) < 1 ||
    Number(junit.bytes) > 4 * 1024 * 1024 ||
    Object.keys(inventory).sort().join(',') !== 'child_id,pid,process_file' ||
    typeof inventory.process_file !== 'string' ||
    !new RegExp('^' + runId + '\\.bun-test\\.\\d+\\.[0-9a-f-]{36}\\.json$', 'u').test(inventory.process_file) ||
    !Number.isSafeInteger(inventory.pid) ||
    Number(inventory.pid) < 1 ||
    !Number.isSafeInteger(inventory.child_id) ||
    Number(inventory.child_id) < 1
  )
    throw new Error('Historical reference metadata is invalid.');
  return reference as PublishedBaselineReference;
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`Historical reference ${label} is not a record.`);
  return value as Record<string, unknown>;
}

function rows(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value) || !value.length) throw new Error(`Historical reference ${label} are missing.`);
  return value;
}

function children(value: Record<string, unknown>, allowed: readonly string[]): void {
  if (Object.keys(value).some((key) => !key.startsWith('@_') && !allowed.includes(key)))
    throw new Error('Historical JUnit contains unexpected elements.');
}

function counter(value: Record<string, unknown>, key: string): number {
  const raw = value[`@_${key}`];
  if (key === 'errors' && raw === undefined) return 0; // Pinned Bun omits a zero errors attribute.
  if (typeof raw !== 'string' || !/^\d+$/u.test(raw) || !Number.isSafeInteger(Number(raw)))
    throw new Error(`Historical JUnit ${key} counter is missing or invalid.`);
  return Number(raw);
}

type Totals = { tests: number; assertions: number; failures: number; skipped: number };
function reconcile(value: Record<string, unknown>, totals: Totals): void {
  for (const key of ['tests', 'assertions', 'failures', 'skipped'] as const)
    if (counter(value, key) !== totals[key]) throw new Error(`Historical JUnit ${key} counter differs.`);
  if (counter(value, 'errors') !== 0) throw new Error('Historical JUnit reports an error.');
}

function selectedFile(raw: unknown, fixtureRoot: string, selected: readonly string[]): string {
  if (typeof raw !== 'string') throw new Error('Historical JUnit file binding is missing.');
  const file = selected.find((file) => raw === file || raw === path.join(fixtureRoot, file));
  if (!file) throw new Error('Historical JUnit file is outside the exact selection.');
  return file;
}

function caseOutcome(
  testcase: Record<string, unknown>,
  file: string,
  topLevel: boolean,
): { failures: number; skipped: number } {
  children(testcase, ['failure', 'skipped']);
  if (typeof testcase['@_name'] !== 'string' || !testcase['@_name'])
    throw new Error('Historical JUnit testcase identity is missing.');
  const failureRows = testcase.failure === undefined ? [] : rows(testcase.failure, 'failures');
  const skipRows = testcase.skipped === undefined ? [] : rows(testcase.skipped, 'skips');
  if (failureRows.length + skipRows.length > 1) throw new Error('Historical JUnit testcase has conflicting outcomes.');
  if (failureRows.length) {
    const failure = record(failureRows[0], 'failure');
    children(failure, ['#text']);
    if (
      !topLevel ||
      file !== failedFile ||
      testcase['@_name'] !== failureName ||
      failure['@_type'] !== 'AssertionError' ||
      failure['@_message'] !== failureMessage
    )
      throw new Error('Historical JUnit failure is not the exact checkpoint inventory assertion.');
  }
  if (skipRows.length && (!topLevel || file !== failedFile || testcase['@_name'] !== skipName || skipRows[0] !== ''))
    throw new Error('Historical JUnit skip is not the fixed published probe.');
  return { failures: failureRows.length, skipped: skipRows.length };
}

function suiteTotals(
  suite: Record<string, unknown>,
  file: string,
  fixtureRoot: string,
  selected: readonly string[],
  ancestry: readonly string[],
  identities: Set<string>,
): Totals {
  children(suite, ['testcase', 'testsuite']);
  if (selectedFile(suite['@_file'], fixtureRoot, selected) !== file)
    throw new Error('Historical JUnit nested suite belongs to another file.');
  const totals: Totals = { tests: 0, assertions: 0, failures: 0, skipped: 0 };
  const cases = suite.testcase === undefined ? [] : rows(suite.testcase, 'testcases');
  for (const rawCase of cases) {
    const testcase = record(rawCase, 'testcase');
    if (selectedFile(testcase['@_file'], fixtureRoot, selected) !== file)
      throw new Error('Historical JUnit testcase belongs to another suite.');
    const outcome = caseOutcome(testcase, file, ancestry.length === 0);
    const identity = JSON.stringify([...ancestry, testcase['@_name']]);
    if (identities.has(identity)) throw new Error('Historical JUnit duplicates a named testcase.');
    identities.add(identity);
    totals.tests += 1;
    totals.assertions += counter(testcase, 'assertions');
    totals.failures += outcome.failures;
    totals.skipped += outcome.skipped;
  }
  const nested = suite.testsuite === undefined ? [] : rows(suite.testsuite, 'nested suites');
  const names = new Set<string>();
  for (const raw of nested) {
    const child = record(raw, 'nested suite');
    const name = child['@_name'];
    if (typeof name !== 'string' || !name || names.has(name))
      throw new Error('Historical JUnit nested suite identity is missing or duplicated.');
    names.add(name);
    const childTotals = suiteTotals(child, file, fixtureRoot, selected, [...ancestry, name], identities);
    for (const key of ['tests', 'assertions', 'failures', 'skipped'] as const) totals[key] += childTotals[key];
  }
  reconcile(suite, totals);
  return totals;
}

/** Decode measurements only; synthetic calls do not establish producer provenance. */
export function historicalReferenceJUnit(bytes: Uint8Array, fixtureRoot: string, selected: readonly string[]) {
  if (
    !bytes.byteLength ||
    bytes.byteLength > 4 * 1024 * 1024 ||
    selected.length !== 4 ||
    new Set(selected).size !== 4 ||
    selected.some((file) => !historicalTests.includes(file))
  )
    throw new Error('Historical JUnit size or selection is invalid.');
  const xml = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  if (/<!\s*(?:DOCTYPE|ENTITY)\b/iu.test(xml) || XMLValidator.validate(xml) !== true)
    throw new Error('Historical JUnit XML is malformed or declares entities.');
  const decoded: unknown = parser.parse(xml);
  const document = record(decoded, 'XML document');
  children(document, ['?xml', 'testsuites']);
  const root = record(document.testsuites, 'JUnit root');
  children(root, ['testsuite']);
  if (root['@_name'] !== 'bun test') throw new Error('Historical JUnit root is not pinned Bun output.');
  const suites = rows(root.testsuite, 'test suites');
  const seenFiles = new Set<string>();
  const all: Totals = { tests: 0, assertions: 0, failures: 0, skipped: 0 };
  for (const rawSuite of suites) {
    const suite = record(rawSuite, 'suite');
    const file = selectedFile(suite['@_file'], fixtureRoot, selected);
    if (seenFiles.has(file)) throw new Error('Historical JUnit duplicates a selected suite.');
    seenFiles.add(file);
    const totals = suiteTotals(suite, file, fixtureRoot, selected, [], new Set());
    for (const key of ['tests', 'assertions', 'failures', 'skipped'] as const) all[key] += totals[key];
  }
  reconcile(root, all);
  if (seenFiles.size !== selected.length || all.tests !== 288 || all.failures !== 1 || all.skipped !== 1)
    throw new Error('Historical JUnit does not contain the full fixed checkpoint outcome.');
  return {
    tests: all.tests,
    passed: all.tests - all.failures - all.skipped,
    failed: all.failures,
    skipped: all.skipped,
  };
}

function exactOutput(value: unknown, bytes: number, sha256: string): boolean {
  const output = record(value, 'child output');
  return (
    output.available === true &&
    output.truncated === false &&
    output.representation === 'returned-text-utf8' &&
    output.bytes === bytes &&
    output.sha256 === sha256
  );
}

/** Additional semantic predicate AFTER common parent/child custody validation. */
export function historicalInventoryChildId(
  receipt: unknown,
  fixture: PublishedFixtureIdentity,
  fixtureRoot: string,
): number {
  const parent = record(receipt, 'parent receipt');
  const proof = record(parent.fixture_children, 'child proof');
  const observed = rows(proof.children, 'observed children');
  const subject = fixture.inputs.find((input) => input.path === inventoryFile);
  if (!subject) throw new Error('Historical inventory subject is absent from fixture custody.');
  const matching = observed
    .map((value) => record(value, 'child'))
    .filter((child) => JSON.stringify(child.argv) === JSON.stringify([inventoryFile, '--inventory']));
  if (matching.length !== 1) throw new Error('Historical inventory invocation is missing or duplicated.');
  const child = matching[0]!;
  const entry = record(child.entrypoint, 'entrypoint');
  if (
    fixture.commit !== 'b5499511e64b2165a8c97ae3d2b455b25b1ac5b6' ||
    child.cwd !== fixtureRoot ||
    entry.kind !== 'file' ||
    entry.path !== path.join(fixtureRoot, inventoryFile) ||
    entry.value_sha256 !== subject.sha256 ||
    child.terminal_observed !== true ||
    child.inputs_stable !== true ||
    child.error_observed !== false ||
    child.exit_code !== 1 ||
    child.signal !== null ||
    !Number.isSafeInteger(child.id) ||
    Number(child.id) < 1 ||
    !exactOutput(child.stdout, 10544, inventoryOutputSha256) ||
    !exactOutput(child.stderr, 0, emptySha256)
  )
    throw new Error('Historical inventory denial does not match the exact known checkpoint evidence.');
  return Number(child.id);
}
