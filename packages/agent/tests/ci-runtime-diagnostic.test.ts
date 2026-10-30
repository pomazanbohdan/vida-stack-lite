import { expect, test } from 'bun:test';
import { validateRuntimeDiagnosticJUnit } from '../../../tooling/agent/ci-runtime-diagnostic.ts';

const selectedName = 'binds admission to the released journal and released maintenance proof';
type Case = { name: string; state?: 'skipped' | 'failure' | 'error' };
function report(cases: Case[], file = 'tests/run-entrypoint.test.ts'): string {
  const skipped = cases.filter((entry) => entry.state === 'skipped').length;
  const failures = cases.filter((entry) => entry.state === 'failure').length;
  const errors = cases.filter((entry) => entry.state === 'error').length;
  return (
    `<testsuite file="${file}" tests="${cases.length}" assertions="0" failures="${failures}" errors="${errors}" skipped="${skipped}">` +
    cases
      .map(
        (entry) =>
          `<testcase file="${file}" name="${entry.name}" assertions="0">${entry.state ? `<${entry.state}/>` : ''}</testcase>`,
      )
      .join('') +
    '</testsuite>'
  );
}

test('runtime diagnostic admits one selected execution while retaining filtered skip inventory', () => {
  const result = validateRuntimeDiagnosticJUnit(
    report([{ name: selectedName }, { name: 'filtered', state: 'skipped' }]),
  );
  expect(result).toMatchObject({ tests: 2, skipped: 1, failures: 0, errors: 0, outcome: 'passed' });
});

for (const [label, cases] of [
  ['selected skipped with unrelated pass', [{ name: selectedName, state: 'skipped' }, { name: 'unrelated' }]],
  ['additional execution', [{ name: selectedName }, { name: 'unrelated' }]],
  ['duplicate selected', [{ name: selectedName }, { name: selectedName, state: 'skipped' }]],
  ['selected skipped only', [{ name: selectedName, state: 'skipped' }]],
  ['missing selected', [{ name: 'unrelated' }]],
  ['selected error', [{ name: selectedName, state: 'error' }]],
] satisfies [string, Case[]][]) {
  test(`runtime diagnostic rejects ${label}`, () => {
    expect(() => validateRuntimeDiagnosticJUnit(report(cases))).toThrow();
  });
}

test('runtime diagnostic retains exact JUnit file and counter attribution', () => {
  expect(() => validateRuntimeDiagnosticJUnit(report([{ name: selectedName }], 'foreign.test.ts'))).toThrow();
  expect(() =>
    validateRuntimeDiagnosticJUnit(report([{ name: selectedName }]).replace('tests="1"', 'tests="2"')),
  ).toThrow();
  expect(() => validateRuntimeDiagnosticJUnit('<not-xml')).toThrow();
});
