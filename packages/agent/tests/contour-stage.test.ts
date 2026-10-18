import { expect, test } from 'bun:test';
import {
  contourStageOutput,
  contourStagePublicationAdmitted,
  contourStageReportArguments,
  contourStageDiagnostic,
} from '../tooling/contour-stage.ts';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { MutationProcessResult } from '../tooling/mutation-evidence.ts';

function terminal(): MutationProcessResult {
  return {
    exitCode: 0,
    signal: null,
    spawnError: null,
    timedOut: false,
    processCustody: {
      pid: 1,
      scope: 'owned-process-group',
      terminationObserved: true,
      processGroupTerminationObserved: true,
      unrefCalled: false,
      attempts: [],
    },
    output_capture: {
      complete: true,
      stdout: { bytes: 0, retained_bytes: 0, sha256: 'a'.repeat(64), truncated: false },
      stderr: { bytes: 0, retained_bytes: 0, sha256: 'b'.repeat(64), truncated: false },
    },
  };
}

test('one terminal structured location routes through the existing report owner', () => {
  expect(
    contourStageReportArguments(
      'coverage',
      'diagnostic log\n' +
        JSON.stringify({
          schema: 'VidaBunFocusedCoverageDiagnosticLocation/v1',
          report: '/retained/coverage.json',
        }),
    ),
  ).toEqual(['--coverage-run', '/retained/coverage.json']);
  expect(
    contourStageReportArguments(
      'frozen-crap',
      JSON.stringify({
        schema: 'VidaScopedCrapBudgetReport/v3',
        status: 'scoped-proof-pass',
        report: '/retained/frozen.json',
      }),
      '/retained/coverage.json',
    ),
  ).toEqual(['--coverage-run', '/retained/coverage.json', '--report', '/retained/frozen.json']);
  expect(
    contourStageReportArguments(
      'mutation',
      JSON.stringify({
        schema: 'CandidateNativeMutationReportLocation/v1',
        directory: '/retained/native',
        report: 'native-partition-report.json',
      }),
    ),
  ).toEqual(['--native-report', '/retained/native/native-partition-report.json']);
});

test('data-only applicability has a distinct paired stage and cannot route as numeric frozen CRAP', () => {
  const line = JSON.stringify({
    schema: 'VidaScopedCrapApplicabilityNA/v1',
    status: 'reviewed-not-applicable',
    report: '/synthetic-unit/applicability.json',
  });
  expect(contourStageReportArguments('crap-applicability', line, '/synthetic-unit/coverage.json')).toEqual([
    '--coverage-run',
    '/synthetic-unit/coverage.json',
    '--report',
    '/synthetic-unit/applicability.json',
  ]);
  expect(() => contourStageReportArguments('frozen-crap', line, '/synthetic-unit/coverage.json')).toThrow();
  expect(() => contourStageReportArguments('crap-applicability', line)).toThrow();
  expect(() =>
    contourStageReportArguments(
      'crap-applicability',
      JSON.stringify({
        schema: 'VidaScopedCrapBudgetReport/v3',
        status: 'scoped-proof-pass',
        report: '/synthetic-unit/frozen.json',
      }),
      '/synthetic-unit/coverage.json',
    ),
  ).toThrow();
});

test('canonical output cannot write through direct or nested symlinks into the measured checkout', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'contour-output-alias-'));
  const repository = path.join(root, 'measured');
  const output = path.join(root, 'canonical');
  mkdirSync(path.join(repository, 'nested'), { recursive: true });
  mkdirSync(output);
  const alias = path.join(root, 'alias');
  symlinkSync(repository, alias, 'dir');
  let passed = false;
  try {
    expect(contourStageOutput(repository, output)).toBe(output);
    for (const denied of [repository, path.join(repository, 'nested'), alias, path.join(alias, 'nested'), 'relative'])
      expect(() => contourStageOutput(repository, denied)).toThrow();
    passed = true;
  } finally {
    if (passed) rmSync(root, { recursive: true });
  }
});

test('frozen publication cannot omit the paired coverage input or accept a foreign schema marker', () => {
  const stdout = JSON.stringify({
    schema: 'VidaScopedCrapBudgetReport/v3',
    status: 'scoped-proof-pass',
    report: '/retained/frozen.json',
  });
  expect(() => contourStageReportArguments('frozen-crap', stdout)).toThrow('input coverage');
  expect(() => contourStageReportArguments('frozen-crap', stdout, 'relative')).toThrow('input coverage');
  expect(() =>
    contourStageReportArguments(
      'frozen-crap',
      JSON.stringify({ schema: 'foreign', status: 'scoped-proof-pass', report: '/retained/frozen.json' }),
      '/retained/coverage.json',
    ),
  ).toThrow();
});

test('partial mutation counters and foreign or ambiguous locations never become report arguments', () => {
  for (const value of [
    { schema: 'MutationBatchPilotSummary/v2', totals: { killed: 606, survived: 4, unattempted: 70 } },
    {
      schema: 'CandidateNativeMutationReportLocation/v1',
      directory: 'relative',
      report: 'native-partition-report.json',
    },
    { schema: 'CandidateNativeMutationReportLocation/v1', directory: '/retained', report: '../foreign.json' },
  ])
    expect(() => contourStageReportArguments('mutation', JSON.stringify(value))).toThrow();
  const location = JSON.stringify({
    schema: 'VidaBunFocusedCoverageDiagnosticLocation/v1',
    report: '/retained/coverage.json',
  });
  expect(() => contourStageReportArguments('coverage', location + '\n' + location)).toThrow('exactly one');
  expect(() =>
    contourStageReportArguments(
      'coverage',
      JSON.stringify({
        schema: 'VidaBunFocusedCoverageDiagnosticLocation/v1',
        report: 'relative.json',
      }),
    ),
  ).toThrow('absolute');
  expect(() => contourStageReportArguments('coverage', '{broken')).toThrow();
});

test('terminal mutation diagnostics expose incomplete counters without granting report authority', () => {
  const totals = { generated: 7, attempted: 5, killed: 3, survived: 1, unknown: 1, unattempted: 2 };
  const summary = { schema: 'MutationBatchPilotSummary/v2', binding: { run_id: 'retained-run' }, totals };
  const stdout = 'ordinary diagnostic\n' + JSON.stringify(summary);
  expect(contourStageDiagnostic(stdout)).toEqual({
    mutation: { qualification: 'diagnostic-only', run_id: 'retained-run', totals },
  });
  expect(() => contourStageReportArguments('mutation', stdout)).toThrow('exactly one');
  expect(contourStageDiagnostic(JSON.stringify({ schema: 'MutationBatchPilotProgress/v1', totals }))).toEqual({});
  expect(() => contourStageDiagnostic(stdout + '\n' + JSON.stringify(summary))).toThrow('Ambiguous');
  for (const replacement of [
    undefined,
    { ...totals, killed: -1 },
    { ...totals, killed: 1.5 },
    { ...totals, generated: 8 },
    { ...totals, attempted: 6 },
  ])
    expect(() => contourStageDiagnostic(JSON.stringify({ ...summary, totals: replacement }))).toThrow();
  expect(() => contourStageDiagnostic(JSON.stringify({ ...summary, binding: {} }))).toThrow();
  expect(() => contourStageDiagnostic('{broken')).toThrow();
  const allKilled = JSON.stringify({
    ...summary,
    totals: { generated: 7, attempted: 7, killed: 7, survived: 0, unknown: 0, unattempted: 0 },
  });
  expect(contourStageDiagnostic(allKilled)).toHaveProperty('mutation.qualification', 'diagnostic-only');
  expect(() => contourStageReportArguments('mutation', allKilled)).toThrow('exactly one');
});

test('observed failed or timed-out coverage may preserve its paired outcome without admitting native mutation', () => {
  expect(contourStagePublicationAdmitted(terminal(), 'mutation')).toBe(true);
  expect(contourStagePublicationAdmitted(terminal(), 'crap-applicability')).toBe(true);
  for (const patch of [{ exitCode: 1 }, { timedOut: true }, { signal: 'SIGKILL' as const }, { spawnError: 'failed' }]) {
    const result = { ...terminal(), ...patch };
    expect(contourStagePublicationAdmitted(result, 'coverage')).toBe(true);
    expect(contourStagePublicationAdmitted(result, 'mutation')).toBe(false);
    expect(contourStagePublicationAdmitted(result, 'crap-applicability')).toBe(false);
  }
});

test('missing descendant closure or incomplete capture fences every publication lane', () => {
  const missingGroup = terminal();
  missingGroup.processCustody!.processGroupTerminationObserved = false;
  const missingChild = terminal();
  missingChild.processCustody!.terminationObserved = false;
  const truncated = terminal();
  if (truncated.output_capture?.complete) truncated.output_capture.stderr.truncated = true;
  const missingCapture = terminal();
  delete missingCapture.output_capture;
  for (const result of [
    missingGroup,
    missingChild,
    truncated,
    { ...terminal(), processCustody: null },
    missingCapture,
    { ...terminal(), output_capture: { complete: false as const } },
  ]) {
    expect(contourStagePublicationAdmitted(result, 'coverage')).toBe(false);
    expect(contourStagePublicationAdmitted(result, 'frozen-crap')).toBe(false);
    expect(contourStagePublicationAdmitted(result, 'crap-applicability')).toBe(false);
    expect(contourStagePublicationAdmitted(result, 'mutation')).toBe(false);
  }
});
