import { expect, test } from 'bun:test';
import {
  contourStageOutput,
  contourStagePublicationAdmitted,
  contourStageReportArguments,
  contourStageDiagnostic,
  contourStagePublicationFailure,
  retainContourStageResourceRefusal,
  classifyTrustedCoverageSelectionCandidate,
} from '../tooling/contour-stage.ts';
import { existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { contourAttempts, mergeContourProgress, contourStageInputOutcome } from '../tooling/contour-progress.ts';
import { runContourProgressWithNative } from '../tooling/contour-progress-cli.ts';
import { executeMutationCommand, type MutationProcessResult } from '../tooling/mutation-evidence.ts';
import { expectRejection, rejectionReason } from './helpers/expect-rejection.ts';
import { CampaignResourceError } from '../tooling/contour-campaign.ts';

test('trusted coverage candidate binds the declared contour and refuses altered inputs', () => {
  const classify = classifyTrustedCoverageSelectionCandidate;
  const selection = {
    mode: 'focused-diagnostic',
    contour: 'bun-cli-run',
    sources: ['bin/run.ts'],
    tests: ['tests/run-entrypoint.test.ts', 'tests/bun-cache-routing.test.ts'],
  };
  const request = {
    lane: 'coverage',
    selection,
    command: ['tooling/contour-campaign.ts', '--coverage-child', 'bun-cli-run'],
    image_manifest_sha256: 'a'.repeat(64),
    source_fingerprint: 'b'.repeat(64),
    test_fingerprint: 'c'.repeat(64),
    tool_fingerprint: 'd'.repeat(64),
  };
  expect(classify(request)).toEqual({
    kind: 'candidate',
    qualified: false,
    binding: {
      image_manifest_sha256: request.image_manifest_sha256,
      source_fingerprint: request.source_fingerprint,
      test_fingerprint: request.test_fingerprint,
      tool_fingerprint: request.tool_fingerprint,
    },
  });
  for (const invalid of [
    { ...request, lane: 'mutation' },
    { ...request, override: '--unreviewed' },
    { ...request, command: [...request.command, '--override'] },
    { ...request, selection: { ...selection, tests: [selection.tests[0]] } },
    { ...request, selection: { ...selection, sources: ['bin/init.ts'] } },
    { ...request, selection: { ...selection, tests: [...selection.tests, selection.tests[0]] } },
    { ...request, selection: { ...selection, injected_override: true } },
    { ...request, selection: { ...selection, mode: 'published-baseline-bun-native' } },
    { ...request, image_manifest_sha256: 'invalid' },
    { ...request, test_fingerprint: '' },
  ])
    expect(classify(invalid)).toMatchObject({ kind: 'refused', qualified: false });
});

test.each(['canonical', 'explicit'])(
  'stage rejects an invalid %s snapshot before opening an execution image',
  async (mode) => {
    const root = mkdtempSync(path.join(tmpdir(), 'contour-snapshot-preflight-'));
    const output = path.join(root, 'published');
    mkdirSync(output);
    const bytes = JSON.stringify({ schema: 'VidaContourProgress/v1', attempts: 'invalid' });
    const snapshot = mode === 'canonical' ? path.join(output, 'CONTOUR-STATUS.json') : path.join(root, 'prior.json');
    writeFileSync(snapshot, bytes);
    let passed = false;
    try {
      const result = await executeMutationCommand(
        [
          process.execPath,
          'tooling/contour-stage.ts',
          '--contour',
          'bun-session-handoff-v2',
          '--lane',
          'coverage',
          '--output',
          output,
          '--image-manifest',
          path.join(root, 'missing-image.json'),
          '--image-sha256',
          'a'.repeat(64),
          ...(mode === 'explicit' ? ['--snapshot', snapshot] : []),
        ],
        path.resolve(import.meta.dir, '..'),
        5_000,
        {
          ownedProcessGroup: true,
          stdoutFile: path.join(root, 'stdout.log'),
          stderrFile: path.join(root, 'stderr.log'),
        },
      );
      expect(result.exitCode).toBe(1);
      expect(result.timedOut).toBe(false);
      expect(result.signal).toBeNull();
      expect(result.spawnError).toBeNull();
      expect(result.output_capture?.complete).toBe(true);
      expect(result.processCustody?.processGroupTerminationObserved).toBe(true);
      const stderr = readFileSync(path.join(root, 'stderr.log'), 'utf8');
      expect(stderr).toContain('Invalid contour snapshot');
      expect(stderr).not.toContain('missing-image.json');
      expect(readFileSync(path.join(root, 'stdout.log'), 'utf8')).not.toContain('VidaContourStageLocation');
      expect(readFileSync(snapshot, 'utf8')).toBe(bytes);
      passed = true;
    } finally {
      if (passed) rmSync(root, { recursive: true });
      else console.error('Retained contour snapshot preflight fixture: ' + root);
    }
  },
);

test('image outcomes separate captured inputs from legacy live Git claims', () => {
  const image = {
    schema: 'VidaQualityExecutionImage/v1',
    source_commit: 'a'.repeat(40),
    manifest_sha256: 'b'.repeat(64),
  };
  const value = {
    schema: 'VidaContourStageOutcome/v2',
    source_commit: image.source_commit,
    execution_image: image,
    image_inputs_unchanged: true,
  };
  expect(contourStageInputOutcome(value)).toBe(true);
  expect(contourStageInputOutcome({ ...value, image_inputs_unchanged: false })).toBe(true);
  expect(contourStageInputOutcome({ ...value, commit_unchanged: true })).toBe(false);
  expect(contourStageInputOutcome({ ...value, clean_inputs: true })).toBe(false);
  expect(contourStageInputOutcome({ ...value, source_commit: 'different' })).toBe(false);
  expect(contourStageInputOutcome({ ...value, execution_image: { ...image, manifest_sha256: 'invalid' } })).toBe(false);
  expect(contourStageInputOutcome({ ...value, schema: 'VidaContourStageOutcome/v1' })).toBe(false);
});

function prelaunchFixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'contour-prelaunch-refusal-'));
  const stage = path.join(root, 'contour-stage-refusal_1');
  const output = path.join(root, 'published');
  mkdirSync(stage);
  const request = {
    commit: 'a'.repeat(40),
    boot: 'observed-boot',
    contour: 'main-host',
    lane: 'mutation' as const,
    output,
    timeout_ms: 930000,
    args: ['tooling/mutation-batch-pilot.ts', '--contour', 'main-host'],
  };
  const refusal = {
    schema: 'VidaContourStagePrelaunchResourceRefusal/v1',
    run_id: path.basename(stage),
    directory: stage,
    source_commit: request.commit,
    boot: request.boot,
    contour: request.contour,
    lane: request.lane,
    phase: 'prelaunch',
    launched: false,
    status: 'resource-refused',
    error: 'Campaign requires at least 2 GiB free.',
    resource_path: stage,
    available_bytes: '2104078336',
    minimum_free_bytes: '2147483648',
  };
  const file = path.join(stage, 'prelaunch-resource-refusal.json');
  writeFileSync(path.join(stage, 'request.json'), JSON.stringify(request));
  return { root, stage, output, request, refusal, file };
}

test('prelaunch resource refusal projects without fabricated terminal custody', async () => {
  const { root, stage, output, request, refusal, file } = prelaunchFixture();
  writeFileSync(file, JSON.stringify(refusal));
  let passed = false;
  try {
    await runContourProgressWithNative(['--output', output, '--commit', request.commit, '--stage-outcome', file], root);
    const snapshot = mergeContourProgress(
      JSON.parse(readFileSync(path.join(output, 'CONTOUR-STATUS.json'), 'utf8')),
      [],
    );
    expect(snapshot.attempts).toHaveLength(1);
    expect(snapshot.attempts[0]).toMatchObject({
      lane: 'stage-outcome',
      status: 'mutation/prelaunch-resource-refused',
      accepted: false,
      producer_schema: refusal.schema,
      coverage: null,
      max_cc: null,
      max_entry_crap: null,
      killed: null,
      mutants: null,
      sources: [],
      tests: [],
      tools: [],
      closure: [],
      selected_tests: [],
      selection_complete: false,
    });
    expect(readFileSync(path.join(output, 'CONTOUR-STATUS.md'), 'utf8')).toContain(
      'mutation/prelaunch-resource-refused',
    );
    for (const promotion of [
      { accepted: true },
      { confirmed_killed: 1 },
      { killed: 1, mutants: 1 },
      { selection_complete: true },
      { status: 'mutation/completed/unknown-or-partial' },
      { producer_schema: 'VidaContourStagePublicationError/v1' },
      { lane: 'mutation' },
    ])
      expect(() =>
        mergeContourProgress({ schema: snapshot.schema, attempts: [{ ...snapshot.attempts[0], ...promotion }] }, []),
      ).toThrow();
    for (const patch of [
      { source_commit: 'b'.repeat(40) },
      { run_id: 'contour-stage-foreign' },
      { directory: root },
      { boot: 'other-boot' },
      { contour: 'bun-governance-and-public-contracts' },
      { lane: 'coverage' },
      { resource_path: 'relative' },
    ]) {
      writeFileSync(file, JSON.stringify({ ...refusal, ...patch }));
      await expectRejection(
        runContourProgressWithNative(['--output', output, '--commit', request.commit, '--stage-outcome', file], root),
        /retained request/u,
      );
    }
    writeFileSync(file, JSON.stringify(refusal));
    for (const terminalFile of ['launch.json', 'execution.json']) {
      writeFileSync(path.join(stage, terminalFile), '{}');
      await expectRejection(
        runContourProgressWithNative(['--output', output, '--commit', request.commit, '--stage-outcome', file], root),
        /includes a launch/u,
      );
      rmSync(path.join(stage, terminalFile));
    }
    passed = true;
  } finally {
    if (passed) rmSync(root, { recursive: true });
    else console.error(`Retained failed prelaunch refusal fixture: ${root}`);
  }
});

test('prelaunch resource schema rejects successful capacity, process claims and noncanonical bytes', () => {
  const { root, request, refusal, file } = prelaunchFixture();
  const receipt = { artifact: file, commit: request.commit, recorded_at: new Date().toISOString() };
  let passed = false;
  try {
    for (const available_bytes of [null, '0', '2147483647'])
      expect(contourAttempts({ ...refusal, available_bytes }, receipt)[0]?.accepted).toBe(false);
    for (const patch of [
      { launched: true },
      { phase: 'execution' },
      { status: 'PASS' },
      { available_bytes: '2147483648' },
      { available_bytes: '-1' },
      { available_bytes: '01' },
      { available_bytes: '1.5' },
      { available_bytes: 1 },
      { available_bytes: undefined },
      { minimum_free_bytes: '1' },
      { minimum_free_bytes: undefined },
      { pid: 123 },
      { result: {} },
      { group_closed: true },
      { capture_complete: true },
      { contour: 'foreign-contour' },
      { source_commit: 'b'.repeat(40) },
    ])
      expect(() => contourAttempts({ ...refusal, ...patch }, receipt)).toThrow();
    passed = true;
  } finally {
    if (passed) rmSync(root, { recursive: true });
    else console.error(`Retained failed prelaunch schema fixture: ${root}`);
  }
});

test('resource refusal owner retains and projects the original error before rejecting', async () => {
  const { root, stage, output, request, file } = prelaunchFixture();
  const error = new CampaignResourceError(stage, null);
  let passed = false;
  try {
    expect(await rejectionReason(retainContourStageResourceRefusal(error, stage, request, root))).toBe(error);
    const retained: unknown = JSON.parse(readFileSync(file, 'utf8'));
    expect(retained).toMatchObject({
      available_bytes: null,
      resource_path: stage,
      error: String(error),
      launched: false,
    });
    expect(existsSync(path.join(stage, 'launch.json'))).toBe(false);
    expect(existsSync(path.join(stage, 'execution.json'))).toBe(false);
    const snapshot = mergeContourProgress(
      JSON.parse(readFileSync(path.join(output, 'CONTOUR-STATUS.json'), 'utf8')),
      [],
    );
    expect(snapshot.attempts[0]).toMatchObject({ status: 'mutation/prelaunch-resource-refused', accepted: false });
    passed = true;
  } finally {
    if (passed) rmSync(root, { recursive: true });
    else console.error(`Retained failed prelaunch owner fixture: ${root}`);
  }
});

test('resource refusal keeps primary errors when receipt or projection fails', async () => {
  const { root, stage, output, request, file } = prelaunchFixture();
  const error = new CampaignResourceError(path.join(stage, 'scratch-observation'), '0');
  let passed = false;
  try {
    const unrelated = new Error('Unrelated configuration failure');
    expect(await rejectionReason(retainContourStageResourceRefusal(unrelated, stage, request, root))).toBe(unrelated);
    expect(existsSync(file)).toBe(false);
    writeFileSync(output, 'blocked projection');
    try {
      await retainContourStageResourceRefusal(error, stage, request, root);
      expect.unreachable('Projection must fail');
    } catch (failure) {
      expect(failure).toBeInstanceOf(AggregateError);
      if (!(failure instanceof AggregateError)) throw failure;
      expect(failure.cause).toBe(error);
      expect(failure.errors[0]).toBe(error);
      expect(failure.errors).toHaveLength(2);
    }
    expect(JSON.parse(readFileSync(file, 'utf8'))).toMatchObject({
      resource_path: error.observedPath,
      available_bytes: '0',
    });
    const original = readFileSync(file, 'utf8');
    try {
      await retainContourStageResourceRefusal(error, stage, request, root);
      expect.unreachable('Exclusive receipt creation must fail');
    } catch (failure) {
      expect(failure).toBeInstanceOf(AggregateError);
      if (!(failure instanceof AggregateError)) throw failure;
      expect(failure.errors[0]).toBe(error);
      expect(failure.errors[1]).toHaveProperty('code', 'EEXIST');
    }
    expect(readFileSync(file, 'utf8')).toBe(original);
    passed = true;
  } finally {
    if (passed) rmSync(root, { recursive: true });
    else console.error(`Retained failed prelaunch error fixture: ${root}`);
  }
});

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

test('failed process attribution retains publication errors and native observations', () => {
  const publicationError = new Error('Stage must produce exactly one attributable report location.');
  const stderrFile = '/retained/stage/stderr.log';
  const failed = { ...terminal(), exitCode: 1 };
  const attributed = contourStagePublicationFailure(failed, stderrFile, publicationError);
  expect(attributed).toBeInstanceOf(Error);
  if (!(attributed instanceof Error)) throw new Error('Expected an attributed Error.');
  expect(attributed.message).toContain('Campaign process failed');
  expect(attributed.message).toContain('exit_code=1');
  expect(attributed.message).toContain('signal=null');
  expect(attributed.message).toContain('timed_out=false');
  expect(attributed.message).toContain('spawn_error=null');
  expect(attributed.message).toContain(stderrFile);
  expect(attributed.message).toContain(publicationError.message);
  expect(attributed.cause).toBe(publicationError);

  const completedError = new Error('Completed producer report failure.');
  expect(contourStagePublicationFailure(terminal(), stderrFile, completedError)).toBe(completedError);
  expect(contourStagePublicationFailure(terminal(), stderrFile, 'completed report failure')).toBe(
    'completed report failure',
  );

  const unknown = { ...failed, processCustody: null, timedOut: true, signal: 'SIGKILL' as const };
  const unknownAttributed = contourStagePublicationFailure(unknown, stderrFile, publicationError);
  expect(unknownAttributed).toBeInstanceOf(Error);
  if (!(unknownAttributed instanceof Error)) throw new Error('Expected an attributed Error.');
  expect(unknownAttributed.message).toContain('Campaign process unknown');
  expect(unknownAttributed.message).toContain('exit_code=1');
  expect(unknownAttributed.message).toContain('signal="SIGKILL"');
  expect(unknownAttributed.message).toContain('timed_out=true');
  expect(unknownAttributed.cause).toBe(publicationError);

  const hostileError = {
    toString() {
      throw new Error('Publication error formatting failed.');
    },
  };
  expect(() => contourStagePublicationFailure(failed, stderrFile, hostileError)).toThrow(
    'Publication error formatting failed.',
  );
});

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
        schema: 'VidaScopedCrapBudgetReport/v4',
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

test.each([
  ['missing formation', false, false],
  ['file formation', true, false],
  ['missing reuse', false, true],
  ['file reuse', true, true],
] as const)('stage rejects %s output before accessing SDK or image inputs', async (_name, fileOutput, reuse) => {
  const root = mkdtempSync(path.join(tmpdir(), 'contour-output-preflight-'));
  const output = path.join(root, 'invalid-output');
  const manifest = path.join(root, 'must-not-read-image.json');
  if (fileOutput) writeFileSync(output, 'not a directory\n');
  let passed = false;
  try {
    const result = await executeMutationCommand(
      [
        process.execPath,
        'tooling/contour-stage.ts',
        '--contour',
        'bun-host-state',
        '--lane',
        'coverage',
        '--output',
        output,
        ...(reuse ? ['--image-manifest', manifest, '--image-sha256', 'a'.repeat(64)] : []),
      ],
      path.resolve(import.meta.dir, '..'),
      3000,
      {
        env: { ...process.env },
        stdoutFile: path.join(root, 'stdout.log'),
        stderrFile: path.join(root, 'stderr.log'),
        outputByteLimit: 64 * 1024,
      },
    );
    expect(result).toMatchObject({ exitCode: 1, signal: null, spawnError: null, timedOut: false });
    expect(result.output_capture?.complete).toBe(true);
    expect(result.processCustody?.terminationObserved).toBe(true);
    const stderr = readFileSync(path.join(root, 'stderr.log'), 'utf8');
    expect(stderr).toContain(fileOutput ? 'Canonical output must be an existing directory.' : output);
    expect(stderr).not.toContain(manifest);
    expect(readFileSync(path.join(root, 'stdout.log'), 'utf8')).toBe('');
    if (fileOutput) expect(readFileSync(output, 'utf8')).toBe('not a directory\n');
    else expect(existsSync(output)).toBe(false);
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
  const stderrFile = path.join(stage, 'stderr.log');
  writeFileSync(stderrFile, 'native producer failure\n');
  const publicationCause = new Error('report publication failed');
  const attributedError = contourStagePublicationFailure(result, stderrFile, publicationCause);
  expect(attributedError).toBeInstanceOf(Error);
  if (!(attributedError instanceof Error)) throw new Error('Expected an attributed Error.');
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
    error: attributedError.message,
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
    const retainedFailure: unknown = JSON.parse(readFileSync(path.join(stage, 'publication-error.json'), 'utf8'));
    expect(retainedFailure).toEqual(failure);
    expect(failure.error).toContain('Campaign process failed');
    expect(failure.error).toContain('exit_code=1');
    expect(failure.error).toContain(stderrFile);
    expect(failure.error).toContain(publicationCause.message);
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
    for (const promotion of [
      { accepted: true },
      { confirmed_killed: 2 },
      { mutants: 5 },
      { selection_complete: true },
      { lane: 'mutation' },
    ])
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
