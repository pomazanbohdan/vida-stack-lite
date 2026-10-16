import { expect, test } from 'bun:test';
import { confirmedRunnerOutcome, junitOutcome } from '../tooling/mutation-evidence.js';

const bodyEvent = {
  schema: 'MutationBodyEvent/v1',
  test_file: 'tests/one.test.mjs',
  kind: 'body',
  body_id: 1,
  assertion_cause: true,
  assertion_source: 'bun-expect',
} as const;

function junitReport(
  testcases: string,
  { tests, assertions, failures, errors = 0 }: { tests: number; assertions: number; failures: number; errors?: number },
) {
  const errorCounter = errors ? ` errors="${errors}"` : '';
  return `<testsuites name="bun test" tests="${tests}" assertions="${assertions}" failures="${failures}" skipped="0"${errorCounter}><testsuite name="tests/one.test.mjs" file="tests/one.test.mjs" tests="${tests}" assertions="${assertions}" failures="${failures}" skipped="0"${errorCounter}>${testcases}</testsuite></testsuites>`;
}

const assertionFailure =
  '<testcase name="[mutation-body:1] assertion detects changed behavior" classname="" file="tests/one.test.mjs" assertions="1"><failure type="AssertionError">expected 2</failure></testcase>';
const runtimeError =
  '<testcase name="another case fails during setup" classname="" file="tests/one.test.mjs" assertions="0"><error type="Error">module initialization failed</error></testcase>';

test('confirms a body assertion as the sole failed outcome', () => {
  const result = junitOutcome(
    junitReport(assertionFailure, { tests: 1, assertions: 1, failures: 1 }),
    ['tests/one.test.mjs'],
    [],
    [bodyEvent],
  );

  expect(result.outcome).toBe('killed');
  expect(confirmedRunnerOutcome(1, result.outcome)).toBe('killed');
});

test.each([
  'Received value must be a string: undefined',
  'Expected value must be a string or regular expression: 42',
  'Expected: 2; Received: 1',
])('a generic JUnit Error stays unproven despite a body marker and positive assertion count: %s', (message) => {
  const failure =
    '<testcase name="[mutation-body:1] generic matcher error" classname="" file="tests/one.test.mjs" assertions="3"><failure type="Error">' +
    message +
    '</failure></testcase>';
  expect(() =>
    junitOutcome(
      junitReport(failure, { tests: 1, assertions: 3, failures: 1 }),
      ['tests/one.test.mjs'],
      [],
      [bodyEvent],
    ),
  ).toThrow('JUnit failure is not proven to be a Bun assertion failure.');
});

test('does not confirm a body assertion when a separate testcase has a runtime error', () => {
  const result = junitOutcome(
    junitReport(assertionFailure + runtimeError, {
      tests: 2,
      assertions: 1,
      failures: 1,
      errors: 1,
    }),
    ['tests/one.test.mjs'],
    [],
    [bodyEvent],
  );

  expect(result).toMatchObject({ tests: 2, assertions: 1, failures: 1, errors: 1 });
  expect(result.outcome).toBe('unproven');
  expect(confirmedRunnerOutcome(1, result.outcome)).toBe('unknown');
});

test('keeps a runtime error without a mutation assertion unproven', () => {
  const result = junitOutcome(junitReport(runtimeError, { tests: 1, assertions: 0, failures: 0, errors: 1 }), [
    'tests/one.test.mjs',
  ]);

  expect(result.outcome).toBe('unproven');
  expect(confirmedRunnerOutcome(1, result.outcome)).toBe('unknown');
});
