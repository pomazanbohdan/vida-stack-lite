import { expect, test } from 'bun:test';
import path from 'node:path';
import {
  historicalReferenceJUnit,
  historicalInventoryChildId,
  parseHistoricalReference,
} from '../tooling/published-baseline-reference.js';
import type { PublishedFixtureIdentity } from '../tooling/published-coverage-inputs.js';

// Synthetic decoder units only. These strings/child records are never accepted
// producer provenance, historical coverage, frozen budgets, or mutation Killed.
const fixtureRoot = path.resolve('/tmp/synthetic-published-reference/published-fixture');
const selected = [
  'tests/bun/host-state.test.mjs',
  'tests/bun/lifecycle-state.test.mjs',
  'tests/bun/persistent-session-handoff.test.mjs',
  'tests/bun-coverage.test.mjs',
];
const failureName = 'mutation inventory assigns every maintained source, including production CLIs, to a partition';
const skipName = 'Bun native coverage finalizes a durable report after the exact four-file command';

function xmlFixture(nested = false): string {
  const suites = selected
    .map((file, suiteIndex) => {
      const special = suiteIndex === 3;
      const absolute = path.join(fixtureRoot, file);
      const cases = Array.from({ length: 72 }, (_, index) => {
        const name = special && index === 0 ? failureName : special && index === 1 ? skipName : `synthetic ${index}`;
        const child =
          special && index === 0
            ? '<failure type="AssertionError" message="Expected values to be strictly equal:&#10;&#10;1 !== 0&#10;">AssertionError</failure>'
            : special && index === 1
              ? '<skipped />'
              : '';
        return `<testcase name="${name}" file="${absolute}" line="${index + 1}" assertions="0">${child}</testcase>`;
      }).join('');
      const content =
        nested && !special
          ? `<testsuite name="owned describe" file="${absolute}" tests="72" assertions="0" failures="0" skipped="0">${cases}</testsuite>`
          : cases;
      return `<testsuite file="${absolute}" tests="72" assertions="0" failures="${Number(special)}" skipped="${Number(special)}">${content}</testsuite>`;
    })
    .join('');
  return `<testsuites name="bun test" tests="288" assertions="0" failures="1" skipped="1">${suites}</testsuites>`;
}

test('historical JUnit decoder keeps the exact checkpoint failure separate from measurement', () => {
  expect(historicalReferenceJUnit(Buffer.from(xmlFixture()), fixtureRoot, selected)).toEqual({
    tests: 288,
    passed: 286,
    failed: 1,
    skipped: 1,
  });
});

test('historical JUnit decoder rejects missing, duplicate and foreign selected suites', () => {
  const xml = xmlFixture();
  for (const changed of [
    xml.replaceAll(path.join(fixtureRoot, selected[0]!), path.join(fixtureRoot, selected[1]!)),
    xml.replaceAll(path.join(fixtureRoot, selected[0]!), path.join(fixtureRoot, 'tests/foreign.test.mjs')),
    xml.replace(/<testsuite file="[^" ]*host-state[^]*?<\/testsuite>/u, ''),
  ])
    expect(() => historicalReferenceJUnit(Buffer.from(changed), fixtureRoot, selected)).toThrow();
  expect(() => historicalReferenceJUnit(Buffer.from(xml), fixtureRoot, [...selected, selected[0]!])).toThrow();
});

test('historical JUnit decoder reconciles every case and counter and rejects other failure causes', () => {
  const xml = xmlFixture();
  for (const changed of [
    xml.replace('tests="288"', 'tests="287"'),
    xml.replace('tests="72"', 'tests="71"'),
    xml.replace('name="synthetic 2"', 'name="synthetic 3"'),
    xml.replace(failureName, 'different failure'),
    xml.replace(skipName, 'different skip'),
    xml.replace('type="AssertionError"', 'type="Error"'),
    xml.replace('1 !== 0', '2 !== 0'),
    xml.replace('<skipped />', '<error type="Error">hook failure</error>'),
    xml.replace('<skipped />', '<skipped /><failure type="AssertionError" />'),
    xml.replace('</failure>', '</failure><failure type="AssertionError" />'),
    xml.replace('assertions="0"', 'assertions="1"'),
    xml.replace('<testsuite file=', '<properties><failure /></properties><testsuite file='),
    xml.replace('<testcase name=', '<properties><skipped /></properties><testcase name='),
    xml.replace('<testcase', '<unexpected'),
    xml.slice(0, -1),
    '<!DOCTYPE testsuites [<!ENTITY payload "unsafe">]>' + xml,
    '',
  ])
    expect(() => historicalReferenceJUnit(Buffer.from(changed), fixtureRoot, selected)).toThrow();
});

const fixture: PublishedFixtureIdentity = {
  schema: 'PublishedCoverageFixture/v1',
  commit: 'b5499511e64b2165a8c97ae3d2b455b25b1ac5b6',
  directory: 'published-fixture',
  inputs: [{ path: 'tooling/mutation-gate.mjs', mode: '100644', blob_oid: 'a'.repeat(40), sha256: 'b'.repeat(64) }],
};
function subjectReceipt() {
  return {
    fixture_children: {
      children: [
        {
          id: 1,
          argv: ['tooling/mutation-gate.mjs', '--inventory'],
          cwd: fixtureRoot,
          entrypoint: {
            kind: 'file',
            path: path.join(fixtureRoot, 'tooling/mutation-gate.mjs'),
            value_sha256: 'b'.repeat(64),
          },
          terminal_observed: true,
          inputs_stable: true,
          error_observed: false,
          exit_code: 1,
          signal: null,
          stdout: {
            available: true,
            truncated: false,
            representation: 'returned-text-utf8',
            bytes: 10544,
            sha256: '96eb4bf4b21263b198d39225d59d46e6ce1b750dfdb797f73b50ac6d1c92b476',
          },
          stderr: {
            available: true,
            truncated: false,
            representation: 'returned-text-utf8',
            bytes: 0,
            sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          },
        },
      ],
    },
  };
}
test('historical inventory predicate binds the exact observed old stdout and known denial', () => {
  expect(historicalInventoryChildId(subjectReceipt(), fixture, fixtureRoot)).toBe(1);
  for (const patch of [
    { exit_code: 0 },
    { terminal_observed: false },
    { inputs_stable: false },
    { error_observed: true },
    { signal: 'SIGTERM' },
    { cwd: path.dirname(fixtureRoot) },
    { argv: ['tooling/mutation-gate.mjs'] },
    { stdout: { ...subjectReceipt().fixture_children.children[0]!.stdout, sha256: 'c'.repeat(64) } },
    { stderr: { ...subjectReceipt().fixture_children.children[0]!.stderr, bytes: 1 } },
    { entrypoint: { ...subjectReceipt().fixture_children.children[0]!.entrypoint, value_sha256: 'c'.repeat(64) } },
  ]) {
    const value = subjectReceipt();
    Object.assign(value.fixture_children.children[0]!, patch);
    expect(() => historicalInventoryChildId(value, fixture, fixtureRoot)).toThrow();
  }
  const duplicate = subjectReceipt();
  duplicate.fixture_children.children.push({ ...duplicate.fixture_children.children[0]!, id: 2 });
  expect(() => historicalInventoryChildId(duplicate, fixture, fixtureRoot)).toThrow();
});

test('historical metadata cannot promote suite or quality failure and binds canonical run artifacts', () => {
  const runId = '01234567-89ab-4def-89ab-0123456789ab';
  const value = {
    schema: 'PublishedBaselineReference/v1' as const,
    kind: 'measurement_admitted' as const,
    suite_passed: false as const,
    quality_passed: false as const,
    failure_id: 'b549951/mutation-inventory-gap-37' as const,
    junit: { path: `coverage/bun-unified/runs/${runId}/processes/suite.junit.xml`, sha256: 'a'.repeat(64), bytes: 10 },
    inventory: {
      process_file: `${runId}.bun-test.123.01234567-89ab-4def-89ab-0123456789ab.json`,
      pid: 123,
      child_id: 1,
    },
  };
  expect(parseHistoricalReference(value, runId)).toEqual(value);
  for (const patch of [
    { suite_passed: true },
    { quality_passed: true },
    { kind: 'passed' },
    { failure_id: 'other' },
    { extra: true },
  ])
    expect(() => parseHistoricalReference({ ...value, ...patch }, runId)).toThrow();
  for (const patch of [
    { path: '../suite.junit.xml' },
    { sha256: 'bad' },
    { bytes: 0 },
    { bytes: 4194305 },
    { extra: true },
  ])
    expect(() => parseHistoricalReference({ ...value, junit: { ...value.junit, ...patch } }, runId)).toThrow();
  for (const patch of [{ process_file: 'other.json' }, { pid: 0 }, { child_id: 0 }, { extra: true }])
    expect(() => parseHistoricalReference({ ...value, inventory: { ...value.inventory, ...patch } }, runId)).toThrow();
});

test('historical JUnit walks nested Bun describe suites and denies malformed or foreign nested evidence', () => {
  const xml = xmlFixture(true);
  expect(historicalReferenceJUnit(Buffer.from(xml), fixtureRoot, selected)).toEqual({
    tests: 288,
    passed: 286,
    failed: 1,
    skipped: 1,
  });
  for (const changed of [
    xml
      .replace('name="owned describe"', 'name="owned describe" extra="inert"')
      .replace(
        'tests="72" assertions="0" failures="0" skipped="0">',
        'tests="71" assertions="0" failures="0" skipped="0">',
      ),
    xml.replace('name="owned describe"', 'name=""'),
    xml.replace(
      'name="owned describe" file="' + path.join(fixtureRoot, selected[0]!) + '"',
      'name="owned describe" file="tests/foreign.test.mjs"',
    ),
    xml.replace('<testsuite name="owned describe"', '<unexpected name="owned describe"'),
  ])
    expect(() => historicalReferenceJUnit(Buffer.from(changed), fixtureRoot, selected)).toThrow();
});
