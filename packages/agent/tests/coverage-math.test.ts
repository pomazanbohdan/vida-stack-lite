import assert from 'node:assert/strict';
import { test } from 'bun:test';
import { instrumentSource } from '../tooling/bun-coverage-evidence.ts';
import {
  exactFullCoverage,
  validateCoverageLocations,
  type CoverageFileLocationsLike,
} from '../tooling/coverage-math.ts';

test('exact full coverage preserves the zero-branch denominator rule', () => {
  assert.doesNotThrow(() =>
    exactFullCoverage({ branches: { total: 0, covered: 0, pct: 100 } }, 'branches', 'src/a.ts'),
  );
  assert.throws(
    () => exactFullCoverage({ branches: { total: 0, covered: 0, pct: 0 } }, 'branches', 'src/a.ts'),
    /Coverage is not exact 100% for src\/a\.ts\.branches\./u,
  );
  assert.throws(
    () => exactFullCoverage({ statements: { total: 0, covered: 0, pct: 100 } }, 'statements', 'src/a.ts'),
    /Coverage is not exact 100% for src\/a\.ts\.statements\./u,
  );
  assert.doesNotThrow(() =>
    exactFullCoverage({ branches: { total: 2, covered: 2, pct: 100 } }, 'branches', 'src/a.ts'),
  );
});

test('exact full coverage rejects incomplete and unsafe metric denominators', () => {
  const invalid = [
    { total: -1, covered: -1, pct: 100 },
    { total: 2, covered: 1, pct: 50 },
    { total: 2, covered: 2, pct: 99.999 },
    { total: Number.MAX_SAFE_INTEGER + 1, covered: Number.MAX_SAFE_INTEGER + 1, pct: 100 },
    { total: 1.5, covered: 1.5, pct: 100 },
  ];
  for (const metric of invalid)
    assert.throws(() => exactFullCoverage({ branches: metric }, 'branches', 'src/a.ts'), /exact 100%/u);
});

test('coverage locations accept valid line-end positions and empty branch maps', () => {
  const coverage: CoverageFileLocationsLike = {
    statementMap: { 0: { start: { line: 1, column: 3 }, end: { line: 1, column: 3 } } },
    fnMap: { 0: { loc: { start: { line: 1, column: 0 } }, decl: { start: { line: 1, column: 1 } } } },
    branchMap: { 0: { loc: { start: { line: 1, column: 2 } }, locations: [] } },
  };
  assert.doesNotThrow(() => validateCoverageLocations('src/a.ts', 'abc', coverage));
});

test('coverage locations preserve legacy required-start and coordinate bounds', () => {
  const source = 'function f() {}\n';
  const locations = [
    {},
    { end: { line: 1, column: 1 } },
    { start: { line: 1, column: 0.5 } },
    { start: { line: 1, column: -1 } },
    { start: { line: 0, column: 1 } },
    { start: { line: 1.5, column: 1 } },
    { start: { line: 1, column: 40 } },
    { start: { line: 3, column: 0 } },
  ];
  for (const location of locations) {
    const coverage: CoverageFileLocationsLike = { statementMap: { 0: location }, fnMap: {}, branchMap: {} };
    assert.throws(() => validateCoverageLocations('src/fixture.ts', source, coverage));
  }
});

test('coverage positions require both coordinates and finite safe integer values', () => {
  const invalidPositions = [
    { line: 1 },
    { line: 1, column: Number.NaN },
    { line: 1, column: Number.POSITIVE_INFINITY },
    { line: 1, column: Number.MAX_SAFE_INTEGER + 1 },
    { line: Number.NaN, column: 0 },
    { line: Number.POSITIVE_INFINITY, column: 0 },
  ];
  for (const start of invalidPositions) {
    const coverage: CoverageFileLocationsLike = {
      statementMap: { 0: { start } },
      fnMap: {},
      branchMap: {},
    };
    assert.throws(
      () => validateCoverageLocations('src/fixture.ts', 'function f() {}', coverage),
      /Invalid source position: src\/fixture\.ts\.statementMap\.0\.start/u,
    );
  }
});

test('branch-level and per-arm locations are both checked', () => {
  const missingLocations: CoverageFileLocationsLike = {
    statementMap: {},
    fnMap: {},
    branchMap: { 0: { loc: { start: { line: 1, column: 0 } } } },
  };
  assert.throws(() => validateCoverageLocations('src/a.ts', 'x', missingLocations), /Branch locations are missing/u);

  const invalidArm: CoverageFileLocationsLike = {
    statementMap: {},
    fnMap: {},
    branchMap: { 0: { loc: { start: { line: 1, column: 0 } }, locations: [{ start: { line: 2, column: 0 } }] } },
  };
  assert.throws(
    () => validateCoverageLocations('src/a.ts', 'x', invalidArm),
    /Source position is outside its line: src\/a\.ts\.branchMap\.0\.locations\.0\.start/u,
  );
});

test('implicit if arm is accepted only with its exact Source-bound canonical branch map', () => {
  const file = 'src/implicit-else.ts';
  const source = 'export function compute(flag: boolean): number { if (flag) return 1; return 2; }\n';
  const canonical = instrumentSource(file, source).fileCoverage;
  const decoded = JSON.parse(JSON.stringify(canonical)) as typeof canonical;
  assert.throws(() => validateCoverageLocations(file, source, decoded), /Invalid source position/u);
  assert.doesNotThrow(() => validateCoverageLocations(file, source, decoded, canonical.branchMap));
  const forged = structuredClone(decoded);
  forged.branchMap['0'] = {
    type: 'if',
    locations: [
      { start: {}, end: {} },
      { start: {}, end: {} },
    ],
  };
  assert.throws(
    () => validateCoverageLocations(file, source, forged, canonical.branchMap),
    /Branch coverage map differs/u,
  );
  const explicit = instrumentSource(file, source.replace('return 1;', 'return 1; else')).fileCoverage;
  assert.throws(
    () => validateCoverageLocations(file, source, decoded, explicit.branchMap),
    /Branch coverage map differs/u,
  );
  const missingStatement = structuredClone(decoded);
  missingStatement.statementMap['0'] = { start: {}, end: {} };
  assert.throws(
    () => validateCoverageLocations(file, source, missingStatement, canonical.branchMap),
    /Invalid source position/u,
  );
  exactFullCoverage({ branches: { total: 2, covered: 2, pct: 100 } }, 'branches', file);
  assert.throws(
    () => exactFullCoverage({ branches: { total: 2, covered: 1, pct: 50 } }, 'branches', file),
    /exact 100%/u,
  );
});
