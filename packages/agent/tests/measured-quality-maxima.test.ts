import { expect, test } from 'bun:test';
import { measuredMaxima, pushedHead, validateFreshQualityReports } from '../tooling/git-quality-hooks.js';

const inventory = new Map([['src/subject.ts:0:20', 2]]);
function report() {
  return {
    schema: 'VidaCrapBudgetReport/v1',
    formula: 'CC^2 * (1 - function_coverage)^3 + CC',
    status: 'pass',
    coverage_run_id: 'fixture-run',
    selector_receipt: { scope: 'controlled numeric validator fixture only' },
    functions: [
      {
        file: 'src/subject.ts',
        start_offset: 0,
        end_offset: 20,
        identity: 'src/subject.ts#fn:subject#0',
        complexity: 2,
        coverage: 1,
        crap: 2,
        maximum_complexity: 2,
        maximum_crap: 2,
      },
    ],
  };
}

test('accepts finite frozen ceilings exactly at the measured function boundary', () => {
  expect(measuredMaxima(report(), 0, inventory)).toEqual({ maximum_complexity: 2, maximum_crap: 2 });
});

function freshReports(coverageRunId = 'fixture-run') {
  const crap = report();
  const coverage = { schema: 'VidaBunCoverageReport/v2', run_id: coverageRunId };
  return {
    crapReportBytes: Buffer.from(JSON.stringify(crap)),
    coverageReportBytes: Buffer.from(JSON.stringify(coverage)),
    collectionStatus: 0,
    inventory,
  };
}

test('joins fresh coverage and CRAP reports by exact run id and hashes validated bytes', () => {
  const input = freshReports();
  const summary = validateFreshQualityReports(input);
  expect(summary).toMatchObject({
    schema: 'VidaSourceQualitySummary/v1',
    coverage_run_id: 'fixture-run',
    maximum_crap: 2,
    maximum_complexity: 2,
  });
  expect(summary.crap_report_sha256).toHaveLength(64);
  expect(summary.coverage_report_sha256).toHaveLength(64);
  const changed = validateFreshQualityReports({
    ...input,
    crapReportBytes: Buffer.concat([input.crapReportBytes, Buffer.from('\n')]),
    coverageReportBytes: Buffer.concat([input.coverageReportBytes, Buffer.from('\n')]),
  });
  expect(changed.crap_report_sha256).not.toBe(summary.crap_report_sha256);
  expect(changed.coverage_report_sha256).not.toBe(summary.coverage_report_sha256);
});

test('rejects a stale coverage report from another run', () => {
  expect(() => validateFreshQualityReports(freshReports('stale-run'))).toThrow(/share one qualified run/);
});

test('rejects a fresh CRAP report with an incomplete function inventory', () => {
  expect(() =>
    validateFreshQualityReports({ ...freshReports(), inventory: new Map([['src/other.ts:0:20', 2]]) }),
  ).toThrow(/incomplete/);
});

test('rejects failed full coverage collection', () => {
  expect(() => validateFreshQualityReports({ ...freshReports(), collectionStatus: 1 })).toThrow(/collection failed/);
});

for (const field of ['maximum_complexity', 'maximum_crap'] as const) {
  for (const value of [NaN, Infinity, -Infinity]) {
    test('rejects non-finite frozen ceiling ' + field + '=' + value, () => {
      const input = report();
      input.functions[0]![field] = value;
      expect(() => measuredMaxima(input, 0, inventory)).toThrow(/Malformed/);
    });
  }
}

test('retains denial of failed collection, missing functions and uncovered behavior', () => {
  expect(() => measuredMaxima(report(), 1, inventory)).toThrow(/Technical/);
  expect(() => measuredMaxima(report(), 0, new Map([...inventory, ['src/subject.ts:21:30', 1]]))).toThrow(/incomplete/);
  const input = report();
  input.functions[0]!.coverage = 0;
  expect(() => measuredMaxima(input, 0, inventory)).toThrow(/Malformed/);
});

test('pre-push counts current HEAD refs and ignores deletion for both object formats', () => {
  for (const length of [40, 64]) {
    const head = 'a'.repeat(length);
    const zero = '0'.repeat(length);
    const row = 'refs/heads/main ' + head + ' refs/heads/main ' + zero;
    const deletion = '(delete) ' + zero + ' refs/heads/old ' + head;
    expect(pushedHead(row + '\r\n' + row + '\n' + deletion + '\n', head)).toBe(2);
  }
  expect(pushedHead('', 'a'.repeat(40))).toBe(0);
});

test('pre-push rejects malformed ref rows and any non-current live local object', () => {
  const head = 'a'.repeat(40);
  const zero = '0'.repeat(40);
  for (const row of ['one two three', 'one two three four five', 'ref bad remote ' + zero]) {
    expect(() => pushedHead(row, head)).toThrow(/Malformed pre-push ref row/);
  }
  expect(() => pushedHead('ref ' + 'b'.repeat(40) + ' remote ' + zero, head)).toThrow(/current HEAD/);
});
