import assert from 'node:assert/strict';
import { test } from 'bun:test';
import { instrumentSource } from '../tooling/bun-coverage-evidence.mjs';
import { exactFullCoverage } from '../tooling/coverage-math.ts';
import { validateIstanbulFileCoverage } from '../tooling/coverage-counters.ts';

const file = '/tmp/coverage-counters-fixture.ts';
const source = `export function choose(flag: boolean): string {
  if (flag) return 'yes';
  return 'no';
}
`;
const expected = instrumentSource(file, source).fileCoverage;

function freshCoverage() {
  return structuredClone(expected);
}

function firstKey(map: Record<string, unknown>, label: string): string {
  const key = Object.keys(map)[0];
  assert.ok(key, `fixture must contain a ${label}`);
  return key;
}

test('Istanbul validator accepts complete maps and structurally valid one-sided branch counters', () => {
  const complete = freshCoverage();
  const branchId = firstKey(complete.branchMap, 'branch');
  const branch = complete.branchMap[branchId];
  assert.ok(typeof branch === 'object' && branch !== null && 'locations' in branch);
  assert.equal((branch as { locations: unknown[] }).locations.length, 2);
  complete.b[branchId] = [1, 1];
  assert.doesNotThrow(() => validateIstanbulFileCoverage(file, complete, expected));

  const oneSided = freshCoverage();
  oneSided.b[branchId] = [1, 0];
  assert.doesNotThrow(() => validateIstanbulFileCoverage(file, oneSided, expected));
  const branchCounters = oneSided.b[branchId];
  assert.ok(branchCounters);
  const covered = branchCounters.filter((count) => count > 0).length;
  assert.throws(
    () =>
      exactFullCoverage(
        {
          branches: {
            total: branchCounters.length,
            covered,
            pct: (covered / branchCounters.length) * 100,
          },
        },
        'branches',
        file,
      ),
    /Coverage is not exact 100%/u,
  );
});

test('Istanbul validator rejects wrong file identity and changed source maps', () => {
  const wrongPath = freshCoverage();
  wrongPath.path = `${file}.other`;
  assert.throws(() => validateIstanbulFileCoverage(file, wrongPath, expected));

  const changedMap = freshCoverage();
  const statementId = firstKey(changedMap.statementMap, 'statement');
  delete changedMap.statementMap[statementId];
  assert.throws(() => validateIstanbulFileCoverage(file, changedMap, expected));
});

test('Istanbul validator requires exact map and counter key sets', () => {
  const statementId = firstKey(expected.statementMap, 'statement');
  const missing = freshCoverage();
  delete missing.s[statementId];
  assert.throws(() => validateIstanbulFileCoverage(file, missing, expected));

  const extra = freshCoverage();
  extra.s.extra = 1;
  assert.throws(() => validateIstanbulFileCoverage(file, extra, expected));

  const branchId = firstKey(expected.branchMap, 'branch');
  const missingBranch = freshCoverage();
  delete missingBranch.b[branchId];
  assert.throws(() => validateIstanbulFileCoverage(file, missingBranch, expected));

  const extraBranch = freshCoverage();
  extraBranch.b.extra = [0, 0];
  assert.throws(() => validateIstanbulFileCoverage(file, extraBranch, expected));
});

test('Istanbul validator rejects branch counter arrays with the wrong arm cardinality', () => {
  const coverage = freshCoverage();
  const branchId = firstKey(coverage.branchMap, 'branch');
  coverage.b[branchId] = [1];
  assert.throws(() => validateIstanbulFileCoverage(file, coverage, expected));

  const nonArray = freshCoverage();
  (nonArray.b as Record<string, unknown>)[branchId] = null;
  assert.throws(() => validateIstanbulFileCoverage(file, nonArray, expected));
});

test('Istanbul validator rejects malformed statement counters without coercion', () => {
  const statementId = firstKey(expected.statementMap, 'statement');
  const malformed: unknown[] = ['1', 0.5, -1, Number.MAX_SAFE_INTEGER + 1, [1], null];
  for (const value of malformed) {
    const coverage = freshCoverage();
    (coverage.s as Record<string, unknown>)[statementId] = value;
    assert.throws(() => validateIstanbulFileCoverage(file, coverage, expected));
  }
});

test('Istanbul validator rejects malformed, sparse branch arm counters', () => {
  const branchId = firstKey(expected.branchMap, 'branch');
  const malformed: unknown[] = ['1', 0.5, -1, Number.MAX_SAFE_INTEGER + 1, [1], null];
  for (const value of malformed) {
    const coverage = freshCoverage();
    (coverage.b as Record<string, unknown>)[branchId] = [value, 0];
    assert.throws(() => validateIstanbulFileCoverage(file, coverage, expected));
  }

  const sparse = freshCoverage();
  const arms = [1, 0];
  assert.equal(Reflect.deleteProperty(arms, '0'), true);
  sparse.b[branchId] = arms;
  assert.throws(() => validateIstanbulFileCoverage(file, sparse, expected));
});
