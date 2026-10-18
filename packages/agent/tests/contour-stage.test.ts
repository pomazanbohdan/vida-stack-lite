import { expect, test } from 'bun:test';
import {
  contourStageOutput,
  contourStagePublicationAdmitted,
  contourStageReportArguments,
  contourStageDiagnostic,
} from '../tooling/contour-stage.ts';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { contourAttempts, mergeContourProgress } from '../tooling/contour-progress.ts';
import { runContourProgressWithNative } from '../tooling/contour-progress-cli.ts';
import type { MutationProcessResult } from '../tooling/mutation-evidence.ts';
import { expectRejection } from './helpers/expect-rejection.ts';

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
  expect(contourStagePublicationAdmitted(terminal(), 'frozen-crap')).toBe(true);
  expect(contourStagePublicationAdmitted(terminal(), 'mutation')).toBe(true);
  expect(contourStagePublicationAdmitted(terminal(), 'crap-applicability')).toBe(true);
  for (const patch of [{ exitCode: 1 }, { timedOut: true }, { signal: 'SIGKILL' as const }, { spawnError: 'failed' }]) {
    const result = { ...terminal(), ...patch };
    expect(contourStagePublicationAdmitted(result, 'coverage')).toBe(true);
    expect(contourStagePublicationAdmitted(result, 'frozen-crap')).toBe(false);
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

test('failed-stage outcome import binds retained custody and cannot promote diagnostic counters', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'contour-stage-outcome-'));
  const stage = path.join(root, 'contour-stage-fixture_1');
  const output = path.join(root, 'published');
  mkdirSync(stage);
  const result = { ...terminal(), exitCode: 1 };
  const launch = {
    commit: 'fixture-commit',
    boot: 'boot-id',
    contour: 'main-host',
    lane: 'mutation',
    output,
    timeout_ms: 10,
  };
  const execution = {
    ...launch,
    result,
    elapsed_ms: 5,
    boot_after: 'boot-id',
    commit_after: 'fixture-commit',
    tracked_status_after: '',
  };
  const diagnostic = {
    schema: 'VidaContourStageOutcome/v1',
    directory: stage,
    contour: 'main-host',
    lane: 'mutation',
    process: 'failed',
    elapsed_ms: 5,
    exit_code: 1,
    signal: null,
    timed_out: false,
    spawn_error: null,
    capture_complete: true,
    group_closed: true,
    boot_unchanged: true,
    commit_unchanged: true,
    clean_inputs: true,
    mutation: {
      qualification: 'diagnostic-only',
      run_id: 'raw-run',
      totals: { generated: 5, attempted: 4, killed: 2, survived: 1, unknown: 1, unattempted: 1 },
    },
    publication: 'unknown-or-partial',
    error: 'report publication failed',
  };
  const failure = {
    schema: 'VidaContourStagePublicationError/v1',
    run_id: path.basename(stage),
    error: diagnostic.error,
    status: 'unknown-or-partial',
    source_commit: 'fixture-commit',
    diagnostic,
  };
  writeFileSync(path.join(stage, 'launch.json'), JSON.stringify(launch));
  writeFileSync(path.join(stage, 'execution.json'), JSON.stringify(execution));
  writeFileSync(path.join(stage, 'publication-error.json'), JSON.stringify(failure));
  let passed = false;
  try {
    await runContourProgressWithNative(
      ['--output', output, '--commit', 'fixture-commit', '--stage-outcome', path.join(stage, 'publication-error.json')],
      root,
    );
    const snapshotBytes: unknown = JSON.parse(readFileSync(path.join(output, 'CONTOUR-STATUS.json'), 'utf8'));
    const snapshot = mergeContourProgress(snapshotBytes, []);
    expect(snapshot.attempts).toHaveLength(1);
    expect(snapshot.attempts[0]).toMatchObject({
      lane: 'stage-outcome',
      run_id: path.basename(stage),
      status: 'mutation/failed/unknown-or-partial',
      accepted: false,
      artifact: path.join(stage, 'publication-error.json'),
      sources: [],
      tests: [],
      tools: [],
      closure: [],
      coverage: null,
      max_cc: null,
      max_entry_crap: null,
      killed: null,
      mutants: null,
    });
    expect(readFileSync(path.join(output, 'CONTOUR-STATUS.md'), 'utf8')).toContain(
      'mutation/failed/unknown-or-partial',
    );
    for (const promotion of [{ accepted: true }, { confirmed_killed: 2 }, { mutants: 5 }, { selection_complete: true }])
      expect(() =>
        mergeContourProgress({ schema: snapshot.schema, attempts: [{ ...snapshot.attempts[0], ...promotion }] }, []),
      ).toThrow();
    const legacyOutput = path.join(root, 'legacy-published');
    writeFileSync(
      path.join(stage, 'publication-error.json'),
      JSON.stringify({
        error: failure.error,
        status: failure.status,
        source_commit: failure.source_commit,
        diagnostic,
      }),
    );
    await runContourProgressWithNative(
      [
        '--output',
        legacyOutput,
        '--commit',
        'fixture-commit',
        '--stage-outcome',
        path.join(stage, 'publication-error.json'),
      ],
      root,
    );
    expect(readFileSync(path.join(legacyOutput, 'CONTOUR-STATUS.md'), 'utf8')).toContain(
      'mutation/failed/unknown-or-partial',
    );
    expect(() =>
      contourAttempts(
        { ...failure, status: 'PASS', diagnostic: { ...diagnostic, publication: 'PASS' } },
        {
          artifact: path.join(stage, 'publication-error.json'),
          commit: 'fixture-commit',
          recorded_at: new Date().toISOString(),
        },
      ),
    ).toThrow();
    const mismatch = { ...diagnostic, contour: 'other-contour' };
    writeFileSync(path.join(stage, 'publication-error.json'), JSON.stringify({ ...failure, diagnostic: mismatch }));
    await expectRejection(
      runContourProgressWithNative(
        [
          '--output',
          output,
          '--commit',
          'fixture-commit',
          '--stage-outcome',
          path.join(stage, 'publication-error.json'),
        ],
        root,
      ),
      /scope or terminal custody/u,
    );
    const variants: { name: string; result: MutationProcessResult; process: string }[] = [
      {
        name: 'spawn-without-capture',
        result: { exitCode: null, signal: null, spawnError: 'ENOENT', timedOut: false, processCustody: null },
        process: 'unknown',
      },
      { name: 'timeout', result: { ...result, exitCode: null, signal: 'SIGKILL', timedOut: true }, process: 'timeout' },
      { name: 'sigkill', result: { ...result, exitCode: null, signal: 'SIGKILL' }, process: 'failed' },
      { name: 'partial-capture', result: { ...result, output_capture: { complete: false } }, process: 'failed' },
    ];
    for (const variant of variants) {
      const partial = {
        ...diagnostic,
        process: variant.process,
        exit_code: variant.result.exitCode,
        signal: variant.result.signal,
        timed_out: variant.result.timedOut,
        spawn_error: variant.result.spawnError,
        capture_complete: variant.result.output_capture?.complete === true,
        group_closed: variant.result.processCustody?.processGroupTerminationObserved === true,
      };
      writeFileSync(path.join(stage, 'execution.json'), JSON.stringify({ ...execution, result: variant.result }));
      writeFileSync(path.join(stage, 'publication-error.json'), JSON.stringify({ ...failure, diagnostic: partial }));
      const variantOutput = path.join(root, variant.name);
      await runContourProgressWithNative(
        [
          '--output',
          variantOutput,
          '--commit',
          'fixture-commit',
          '--stage-outcome',
          path.join(stage, 'publication-error.json'),
        ],
        root,
      );
      const raw: unknown = JSON.parse(readFileSync(path.join(variantOutput, 'CONTOUR-STATUS.json'), 'utf8'));
      const observed = mergeContourProgress(raw, []).attempts[0];
      expect(observed).toMatchObject({
        status: `mutation/${variant.process}/unknown-or-partial`,
        accepted: false,
        coverage: null,
        killed: null,
        mutants: null,
      });
    }
    passed = true;
  } finally {
    if (passed) rmSync(root, { recursive: true, force: true });
    else console.error(`Retained failed stage projection fixture: ${root}`);
  }
});
