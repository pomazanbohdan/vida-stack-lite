import { expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  contourAttempts,
  contourAttemptMaximum,
  mergeContourProgress,
  nativeMutationAttempt,
  renderContourProgress,
  selectContourCampaign,
} from '../tooling/contour-progress.ts';
import type { NativeMutationProjection } from '../tooling/contour-progress.ts';
import {
  recordContourReport,
  runContourProgress,
  runContourProgressWithNative,
} from '../tooling/contour-progress-cli.ts';
import { mutationPartitions } from '../tooling/mutation-partitions.ts';
import { expectAsyncReturned, expectRejection } from './helpers/expect-rejection.ts';

const activeCount = mutationPartitions().filter((row) => row.environment !== 'static').length;
const oneOfActive = '**1/' + activeCount + '**';
const zeroOfActive = '**0/' + activeCount + '**';

// Projection-only fixture subjects; these are not production coverage or confirmed mutation evidence.
const digest = (file: string, hash = 'a') => ({ path: file, sha256: hash.repeat(64) });
const receipt = {
  artifact: '/retained/report.json',
  commit: 'fixture-commit',
  recorded_at: '2026-10-15T00:00:00.000Z',
};
const empty = { schema: 'VidaContourProgress/v1', attempts: [] };
const nativeArtifact = (file: string, hash = 'e') => ({ file, bytes: 1, sha256: hash.repeat(64) });
function nativeProjectionFixture() {
  const c = coverage();
  const partition = mutationPartitions().find((row) => row.name === 'main-runtime-timing')!;
  const source = digest('src/runtime-timing.ts');
  const testRows = partition.tests!.map((file) => digest(file));
  const toolRows = [digest('bun.lock')];
  const binding = {
    run_id: 'native-run-1',
    partition: partition.name,
    input_fingerprint: 'a'.repeat(64),
    source_fingerprint: 'b'.repeat(64),
    test_fingerprint: 'c'.repeat(64),
    tool_fingerprint: 'd'.repeat(64),
    partition_sources: [source],
  };
  const read: NativeMutationProjection = {
    report: {
      binding,
      tests: partition.tests!,
      schema: 'CandidateNativeMutationReport/v1',
      producer_kind: 'native-instrumenter-batches/v1',
      qualification_scope: 'partition',
      full_qualification: false,
      status: 'pilot-pass',
      required_effective_score: 1,
      non_killed: [],
      unknown_mutants: [],
      killed: 2,
      mutants: 2,
      effective_score: 1,
      native_partition_proof: nativeArtifact('proof.json'),
    },
    proof: {
      schema: 'NativeMutationPartitionProof/v1',
      binding: structuredClone(binding),
      qualification_scope: 'partition',
      full_qualification: false,
      mutants: ['1', '2'].map((local_id) => ({
        identity: 'fixture#mutant-' + local_id,
        local_id,
        outcome: 'assertion-confirmed-killed' as const,
        runner_receipt: nativeArtifact('runner-' + local_id + '.json'),
        launcher_receipt: nativeArtifact('launcher-' + local_id + '.json'),
      })),
      universe_sha256: 'f'.repeat(64),
    },
    validation_context: nativeArtifact('context.json', 'a'),
    descriptor: { test_inputs: testRows, tool_inputs: toolRows, partition_source_inputs: [source] },
    context: { source_inputs: [source, digest('src/runtime-config.ts')] },
  };
  c.run_id = 'native-coverage-1';
  c.test_selection.contour = partition.name;
  c.test_selection.tests = partition.tests!;
  c.test_inputs = testRows;
  c.tool_inputs = toolRows;
  c.sources = [source];
  c.module_inputs = [source, digest('src/runtime-config.ts')];
  c.metrics[0]!.file = source.path;
  return { c, read, partition };
}

test('synthetic reader projection forms an exact local native pair and replays immutably', async () => {
  const { c, read } = nativeProjectionFixture();
  const attempt = nativeMutationAttempt(read, { ...receipt, artifact: '/retained/native-report.json' });
  expect(attempt).toMatchObject({
    lane: 'native-mutation',
    producer_schema: 'CandidateNativeMutationReport/v1',
    status: 'pilot-pass',
    accepted: true,
    killed: 2,
    mutants: 2,
    native_provenance: { universe_sha256: 'f'.repeat(64) },
  });
  const coverageAttempt = contourAttempts(c, receipt)[0]!;
  const crap = frozenCrap(c);
  crap.contour = 'main-runtime-timing';
  crap.original_sources = [digest('src/runtime-timing.ts')];
  const snapshot = mergeContourProgress(empty, [coverageAttempt, attempt, ...contourAttempts(crap, receipt)]);
  expect(mergeContourProgress(snapshot, [attempt])).toEqual(snapshot);
  expect(renderContourProgress(snapshot)).toContain(
    '2/2 (pilot-pass; reader-validated native assertion-confirmed partition proof; local only)',
  );
  expect(renderContourProgress(snapshot)).toContain(
    'Historical complete coverage + assertion-confirmed mutation pair closures: **1/' + activeCount + '**',
  );
  expect(renderContourProgress(snapshot)).toContain(
    'Separate same-coverage-run local triples with scoped frozen CRAP: **1/' + activeCount + '**.',
  );
  const foreignReceipt = { ...receipt, commit: 'other-commit' };
  const hostCoverage = coverage();
  const mixed = mergeContourProgress(snapshot, [
    ...contourAttempts(hostCoverage, foreignReceipt),
    ...contourAttempts(retiredCoverage(), receipt),
    ...contourAttempts(mutation(), foreignReceipt),
    ...contourAttempts(frozenCrap(hostCoverage), foreignReceipt),
  ]);
  const currentUnclosed = selectContourCampaign(mixed, 'unclosed', receipt.commit).map((row) => row.name);
  expect(currentUnclosed).not.toContain('main-runtime-timing');
  expect(currentUnclosed).toContain('main-host');
  const foreignUnclosed = selectContourCampaign(mixed, 'unclosed', foreignReceipt.commit).map((row) => row.name);
  expect(foreignUnclosed).toContain('main-runtime-timing');
  expect(foreignUnclosed).not.toContain('main-host');
  expect(selectContourCampaign(mixed, 'all', receipt.commit)).toHaveLength(activeCount);
  const mixedReport = renderContourProgress(mixed);
  expect(mixedReport).toContain('main-contracts (retired)');
  expect(mixedReport).toContain(
    'Separate same-coverage-run local triples with scoped frozen CRAP: **2/' + activeCount + '**.',
  );
  for (const foreignLane of ['coverage', 'mutation'] as const) {
    const splitCommit = mergeContourProgress(empty, [
      ...contourAttempts(hostCoverage, foreignLane === 'coverage' ? foreignReceipt : receipt),
      ...contourAttempts(mutation(), foreignLane === 'mutation' ? foreignReceipt : receipt),
      ...contourAttempts(frozenCrap(hostCoverage), receipt),
    ]);
    for (const commit of [receipt.commit, foreignReceipt.commit])
      expect(selectContourCampaign(splitCommit, 'unclosed', commit).map((row) => row.name)).toContain('main-host');
  }
  const sameRunStryker = {
    ...attempt,
    lane: 'mutation' as const,
    producer_schema: 'CandidateMutationReport/v4',
  };
  delete sameRunStryker.native_provenance;
  const split = mergeContourProgress(snapshot, [sameRunStryker]);
  expect(split.attempts.filter((row) => row.contour === attempt.contour && row.run_id === attempt.run_id)).toHaveLength(
    2,
  );
  for (const change of ['binding', 'proof', 'context', 'universe', 'closure'] as const) {
    const changed = structuredClone(attempt);
    if (change === 'binding') changed.native_provenance!.binding_fingerprints.input_fingerprint = '0'.repeat(64);
    if (change === 'proof') changed.native_provenance!.proof_artifact.sha256 = '0'.repeat(64);
    if (change === 'context') changed.native_provenance!.context_artifact.sha256 = '0'.repeat(64);
    if (change === 'universe') changed.native_provenance!.universe_sha256 = '0'.repeat(64);
    if (change === 'closure') changed.closure[0]!.sha256 = '0'.repeat(64);
    await expectRejection(
      Promise.resolve().then(() => mergeContourProgress(snapshot, [changed])),
      /Conflicting contour run/,
    );
  }
  const splitBinding = structuredClone(read);
  Object.assign(splitBinding.proof.binding, { input_fingerprint: '0'.repeat(64) });
  expect(() => nativeMutationAttempt(splitBinding, { ...receipt, artifact: '/retained/native-report.json' })).toThrow(
    'Native mutation projection does not preserve the reader-validated partition pilot contract.',
  );
  const changedStatus = structuredClone(read);
  Object.assign(changedStatus.report, { status: 'unknown' });
  expect(() => nativeMutationAttempt(changedStatus, { ...receipt, artifact: '/retained/native-report.json' })).toThrow(
    'Native mutation projection does not preserve the reader-validated partition pilot contract.',
  );
});

test('raw native reports remain rejected by the ordinary --report CLI route', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'contour-native-raw-report-'));
  try {
    const file = path.join(root, 'native-report.json');
    writeFileSync(file, JSON.stringify({ schema: 'CandidateNativeMutationReport/v1' }));
    expect(() => runContourProgress(['--report', file, '--output', path.join(root, 'out')], root)).toThrow(
      'Native mutation reports require the validated --native-report route.',
    );
  } finally {
    rmSync(root, { recursive: true });
  }
});

test('native report CLI routes the candidate through the bounded proof reader and rejects an invalid envelope', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'contour-native-reader-route-'));
  try {
    const file = path.join(root, 'candidate.json');
    writeFileSync(
      file,
      JSON.stringify({ schema: 'CandidateNativeMutationReport/v1', binding: { partition: 'main-host' } }),
    );
    await expectRejection(
      runContourProgressWithNative(['--native-report', file, '--output', path.join(root, 'out')], root),
      /Candidate report is not an exact native partition pilot report/,
    );
  } finally {
    rmSync(root, { recursive: true });
  }
});

test('native CLI adapter uses the synchronous publisher last-value semantics for singleton metadata', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'contour-native-cli-options-'));
  try {
    const report = path.join(root, 'coverage.json');
    const output = path.join(root, 'out');
    writeFileSync(report, JSON.stringify(coverage()));
    const later = '2026-10-15T02:00:00.000Z';
    await expectAsyncReturned(() =>
      runContourProgressWithNative(
        [
          '--report',
          report,
          '--commit',
          'earlier',
          '--at',
          receipt.recorded_at,
          '--commit',
          'later',
          '--at',
          later,
          '--output',
          output,
        ],
        root,
      ),
    );
    const snapshot = mergeContourProgress(
      JSON.parse(readFileSync(path.join(output, 'CONTOUR-STATUS.json'), 'utf8')) as unknown,
      [],
    );
    expect(snapshot.attempts[0]).toMatchObject({ commit: 'later', recorded_at: later });
  } finally {
    rmSync(root, { recursive: true });
  }
});
function coverage() {
  return {
    schema: 'VidaBunFocusedCoverageDiagnostic/v1',
    qualification_scope: 'focused-diagnostic',
    full_qualification: false,
    function_coverage_kind: 'function-entry-binary',
    run_id: 'coverage-1',
    module_inputs: [digest('src/config/host-capability.ts'), digest('src/contracts/envelopes.ts')],
    test_selection: { contour: 'main-host', tests: ['tests/host-capability-boundary.test.ts'] },
    sources: [digest('src/config/host-capability.ts')],
    test_inputs: [digest('tests/host-capability-boundary.test.ts')],
    tool_inputs: [digest('bun.lock')],
    tool_fingerprint: 'b'.repeat(64),
    shards: [{ status: 0, signal: null, error: null, unknown: false }],
    metrics: [
      {
        file: 'src/config/host-capability.ts',
        coverage: Object.fromEntries(
          ['functions', 'lines', 'statements', 'branches'].map((name) => [name, { covered: 1, total: 1 }]),
        ),
        functions: [{ identity: 'fixture#function', complexity: 2, coverage: 1, crap: 2 }],
      },
    ],
  };
}

test.each(['PASS', 'FAIL', 'UNKNOWN', 'BLOCKED'])(
  'coverage-run imports the bound pair and preserves actual %s operation status',
  (status) => {
    const root = mkdtempSync(path.join(tmpdir(), 'contour-run-pair-'));
    let passed = false;
    try {
      const report = {
        ...coverage(),
        source_fingerprint: 'c'.repeat(64),
        test_fingerprint: 'd'.repeat(64),
      };
      const file = path.join(root, 'coverage.json');
      mkdirSync(path.join(root, 'operation-outcomes'));
      writeFileSync(file, JSON.stringify(report));
      writeFileSync(
        path.join(root, 'operation-outcomes', report.run_id + '.json'),
        JSON.stringify({
          schema: 'VidaBunCoverageOperationOutcome/v1',
          run_id: report.run_id,
          status,
          selection: { contour: report.test_selection.contour, fingerprint: report.test_fingerprint },
          input_fingerprints: {
            source: report.source_fingerprint,
            tests: report.test_fingerprint,
            tools: report.tool_fingerprint,
          },
        }),
      );
      const output = path.join(root, 'published');
      const args = ['--coverage-run', file, '--output', output, '--commit', receipt.commit];
      runContourProgress(args, root);
      const bytes = readFileSync(path.join(output, 'CONTOUR-STATUS.json'), 'utf8');
      const snapshot = mergeContourProgress(JSON.parse(bytes) as unknown, []);
      expect(snapshot.attempts).toHaveLength(2);
      expect(snapshot.attempts.find((row) => row.lane === 'coverage-outcome')).toMatchObject({
        status,
        accepted: false,
      });
      expect(snapshot.attempts.find((row) => row.lane === 'coverage')).toMatchObject({
        coverage: { functions: { covered: 1, total: 1 } },
        commit: receipt.commit,
      });
      runContourProgress(args, root);
      expect(readFileSync(path.join(output, 'CONTOUR-STATUS.json'), 'utf8')).toBe(bytes);
      passed = true;
    } finally {
      if (passed) rmSync(root, { recursive: true });
    }
  },
);

test.each(['missing', 'schema', 'run', 'contour', 'source', 'tests', 'tools', 'selection', 'unsafe'])(
  'coverage-run rejects %s binding before publication',
  (kind) => {
    const root = mkdtempSync(path.join(tmpdir(), 'contour-run-denial-'));
    let passed = false;
    try {
      const report = {
        ...coverage(),
        source_fingerprint: 'c'.repeat(64),
        test_fingerprint: 'd'.repeat(64),
      };
      const outcome = {
        schema: 'VidaBunCoverageOperationOutcome/v1',
        run_id: report.run_id,
        status: 'BLOCKED',
        selection: { contour: report.test_selection.contour, fingerprint: report.test_fingerprint },
        input_fingerprints: {
          source: report.source_fingerprint,
          tests: report.test_fingerprint,
          tools: report.tool_fingerprint,
        },
      };
      if (kind === 'schema') outcome.schema = 'foreign';
      if (kind === 'run') outcome.run_id = 'foreign';
      if (kind === 'contour') outcome.selection.contour = 'main-core';
      if (kind === 'source' || kind === 'tests' || kind === 'tools') outcome.input_fingerprints[kind] = 'e'.repeat(64);
      if (kind === 'selection') outcome.selection.fingerprint = 'e'.repeat(64);
      if (kind === 'unsafe') report.run_id = '../foreign';
      const file = path.join(root, 'coverage.json');
      mkdirSync(path.join(root, 'operation-outcomes'));
      writeFileSync(file, JSON.stringify(report));
      if (kind !== 'missing')
        writeFileSync(path.join(root, 'operation-outcomes/coverage-1.json'), JSON.stringify(outcome));
      const output = path.join(root, 'published');
      runContourProgress(['--output', output], root);
      const before = readFileSync(path.join(output, 'CONTOUR-STATUS.json'), 'utf8');
      const markdownBefore = readFileSync(path.join(output, 'CONTOUR-STATUS.md'), 'utf8');
      expect(() => runContourProgress(['--coverage-run', file, '--output', output], root)).toThrow();
      expect(readFileSync(path.join(output, 'CONTOUR-STATUS.json'), 'utf8')).toBe(before);
      expect(readFileSync(path.join(output, 'CONTOUR-STATUS.md'), 'utf8')).toBe(markdownBefore);
      passed = true;
    } finally {
      if (passed) rmSync(root, { recursive: true });
    }
  },
);
function mutation() {
  return {
    source_inputs: [digest('src/config/host-capability.ts'), digest('src/contracts/envelopes.ts')],
    schema: 'CandidateMutationPilotReport/v2',
    run_id: 'mutation-1',
    selected_partitions: ['main-host'],
    test_inputs: [digest('tests/host-capability-boundary.test.ts'), digest('tests/other.test.ts')],
    tool_inputs: [digest('bun.lock')],
    tool_fingerprint: 'c'.repeat(64),
    partition_source_bindings: [
      {
        partition: 'main-host',
        tests: ['tests/host-capability-boundary.test.ts'],
        source_inputs: [digest('src/config/host-capability.ts')],
      },
    ],
    partition_statuses: { 'main-host': { Killed: 3 } },
    effective_score: 1,
    status: 'pilot-pass',
    provenance_errors: [],
    source_mismatches: [],
    baseline_errors: [],
    unknown_mutants: [],
    report_errors: [],
    empty_partitions: [],
    missing_partition_sources: [],
    extra_partition_sources: [],
    missing_package_sources: [],
    missing_sources: [],
    extra_sources: [],
    non_killed: [],
    runner_processes: [
      {
        partition: 'main-host',
        observed_exit_code: 0,
        signal: null,
        timed_out: false,
        spawn_error: null,
        output_complete: true,
        process_custody: { terminationObserved: true, processGroupTerminationObserved: true },
      },
    ],
  };
}
function unknownMutation() {
  return {
    ...mutation(),
    status: 'unknown',
    effective_score: 719 / 744,
    partition_statuses: { 'main-host': { Killed: 722, Survived: 22 } },
    killed: 719,
    mutants: 744,
    unknown_mutants: ['778', '791', '803'].map((mutant_id) => ({ partition: 'main-host', mutant_id })),
  };
}

test('unknown mutation projects confirmed counts without admitting raw kills or closing the contour', () => {
  const attempt = contourAttempts(unknownMutation(), receipt)[0]!;
  expect(attempt).toMatchObject({ accepted: false, killed: 722, confirmed_killed: 719, mutants: 744 });
  const document = renderContourProgress(mergeContourProgress(empty, [attempt]));
  expect(document).toContain('719/744 (unknown; assertion-confirmed count; raw runner Killed 722; unqualified)');
  expect(document).toContain(zeroOfActive);
  expect(document).not.toContain('local triple recorded');
});

test('same-run confirmed counts enrich legacy rows in either order and reject contradictions', () => {
  const confirmed = contourAttempts(unknownMutation(), receipt)[0]!;
  const legacy = { ...confirmed };
  delete legacy.confirmed_killed;
  for (const attempts of [
    [legacy, confirmed],
    [confirmed, legacy],
  ]) {
    const first = mergeContourProgress(empty, [attempts[0]!]);
    const enriched = mergeContourProgress(first, [attempts[1]!]);
    expect(enriched.attempts[0]).toMatchObject({ accepted: false, killed: 722, confirmed_killed: 719, mutants: 744 });
    expect(() => mergeContourProgress(enriched, [{ ...confirmed, confirmed_killed: 718 }])).toThrow(
      'Conflicting confirmed mutation count',
    );
  }
  expect(() => mergeContourProgress(empty, [{ ...confirmed, accepted: true }])).toThrow(
    'Accepted mutation count differs from raw runner count',
  );
  expect(() => mergeContourProgress(empty, [{ ...confirmed, confirmed_killed: 723 }])).toThrow(
    'Invalid confirmed mutation count',
  );
  expect(() =>
    mergeContourProgress(empty, [{ ...contourAttempts(coverage(), receipt)[0]!, confirmed_killed: 0 }]),
  ).toThrow('Invalid confirmed mutation count');
});

test('single-partition producer counters cannot contradict its raw denominator or accepted result', () => {
  for (const counters of [
    { killed: 4, mutants: 3 },
    { killed: -1, mutants: 3 },
    { killed: 2, mutants: 4 },
  ]) {
    expect(() => contourAttempts({ ...mutation(), ...counters }, receipt)).toThrow(
      'Mutation producer counts differ from the sole partition',
    );
  }
  expect(() => contourAttempts({ ...mutation(), killed: 2, mutants: 3 }, receipt)).toThrow(
    'Accepted mutation count differs from raw runner count',
  );
});

test('multi-partition producer totals are never copied onto individual contours', () => {
  const original = mutation();
  const report = {
    ...unknownMutation(),
    selected_partitions: ['main-host', 'main-runtime-timing'],
    partition_statuses: { 'main-host': { Killed: 722, Survived: 22 }, 'main-runtime-timing': { Killed: 1 } },
    killed: 720,
    mutants: 745,
    partition_source_bindings: [
      ...original.partition_source_bindings,
      { partition: 'main-runtime-timing', source_inputs: [] },
    ],
    runner_processes: [],
  };
  const attempts = contourAttempts(report, receipt);
  expect(attempts).toHaveLength(2);
  expect(attempts[0]).toMatchObject({ contour: 'main-host', killed: 722, mutants: 744 });
  expect(attempts[1]).toMatchObject({ contour: 'main-runtime-timing', killed: 1, mutants: 1 });
  for (const attempt of attempts) expect(attempt.confirmed_killed).toBeUndefined();
});

function frozenCrap(c = coverage()) {
  return {
    schema: 'VidaScopedCrapBudgetReport/v1',
    status: 'scoped-proof-pass',
    contour: 'main-host',
    qualification_scope: 'declared-contour-original-source-lower-bound',
    full_qualification: false,
    historical_measurement_admitted: false,
    historical_coverage_runtime_artifacts: 'not-consumed/not-admitted',
    baseline_ref: 'b549951',
    baseline_commit: 'e'.repeat(40),
    budget_commit: 'f'.repeat(40),
    budget_file: '.agent/work/crap.json',
    budget_sha256: 'd'.repeat(64),
    original_sources: [digest('src/config/host-capability.ts')],
    run_id: c.run_id,
    coverage_run_id: c.run_id,
    coverage_report: '/retained/coverage.json',
    coverage_report_sha256: 'a'.repeat(64),
    manifest_sha256: 'b'.repeat(64),
    sources: structuredClone(c.sources),
    test_inputs: structuredClone(c.test_inputs),
    tool_inputs: structuredClone(c.tool_inputs),
    module_inputs: structuredClone(c.module_inputs),
    test_selection: {
      ...structuredClone(c.test_selection),
      mode: 'focused-diagnostic',
      sources: c.sources.map((row) => row.path),
    },
    functions: [
      {
        identity: 'original#function',
        current_identity: 'current#function',
        original_source_complexity: 2,
        maximum_complexity: 2,
        maximum_crap: 2,
        conservative_crap_ceiling: 2,
        complexity: 2,
        coverage: 1,
        crap: 2,
        rationale: 'Scoped owner proof row.',
      },
    ],
    limits: 'Local proof only.',
  };
}
function coverageWithTwoFunctions() {
  const c = coverage();
  c.metrics[0]!.coverage.functions = { covered: 2, total: 2 };
  c.metrics[0]!.functions.push({ identity: 'fixture#second', complexity: 2, coverage: 1, crap: 2 });
  return c;
}

test('data-only coverage retains observed counters without inventing function complexity or closure', () => {
  const c = coverage();
  const source = 'src/config/fs-safe-attestation.ts';
  const selected = 'tests/fs-safe-attestation.test.ts';
  c.test_selection = { contour: 'bun-fs-safe-attestation', tests: [selected] };
  c.sources = [digest(source)];
  c.module_inputs = [digest(source)];
  c.test_inputs = [digest(selected)];
  c.metrics[0]!.file = source;
  c.metrics[0]!.functions = [];
  c.metrics[0]!.coverage.functions = { covered: 0, total: 0 };
  c.metrics[0]!.coverage.branches = { covered: 0, total: 0 };
  c.metrics[0]!.coverage.lines = { covered: 4, total: 4 };
  c.metrics[0]!.coverage.statements = { covered: 4, total: 4 };
  const attempts = contourAttempts(c, receipt);
  const snapshot = mergeContourProgress(empty, attempts);
  expect(snapshot.attempts).toHaveLength(1);
  const observed = snapshot.attempts[0]!;
  expect(observed.accepted).toBe(true);
  expect(observed.coverage?.functions).toEqual({ covered: 0, total: 0 });
  expect(observed.max_cc).toBeNull();
  expect(observed.max_entry_crap).toBeNull();
  expect(contourAttemptMaximum(observed)).toBe(false);
  const document = renderContourProgress(snapshot);
  expect(document).toContain('0/0 · 4/4 · 4/4 · 0/0');
  expect(document).toContain('N/A: no callable functions (coverage inventory)');
  expect(document).toContain(zeroOfActive);
  expect(() => mergeContourProgress(empty, [{ ...observed, max_cc: 1, max_entry_crap: 1 }])).toThrow();
  c.metrics[0]!.coverage.functions = { covered: 1, total: 1 };
  expect(() => contourAttempts(c, receipt)).toThrow('Coverage function inventory differs.');
});

function frozenCrapV2(c = coverage()) {
  const previous = frozenCrap(c);
  const originalPath = 'src/config/legacy-host-capability.ts';
  return {
    ...previous,
    schema: 'VidaScopedCrapBudgetReport/v2',
    qualification_scope: 'declared-contour-reviewed-function-budgets',
    original_sources: [digest(originalPath, 'd')],
    source_mappings: [
      {
        original_path: originalPath,
        current_path: 'src/config/host-capability.ts',
        rationale: 'Reviewed source move for this projection fixture.',
      },
    ],
    functions: [
      {
        kind: 'retained',
        identity: `${originalPath}#retained`,
        current_identity: 'src/config/host-capability.ts#retained',
        original_source_complexity: 4,
        maximum_complexity: 4,
        maximum_crap: 4,
        complexity: 3,
        coverage: 1,
        crap: 3,
        rationale: 'Retained function within its reviewed budget.',
      },
      {
        kind: 'new',
        identity: 'src/config/host-capability.ts#new-function',
        current_identity: 'src/config/host-capability.ts#new-function',
        maximum_complexity: 2,
        maximum_crap: 3,
        complexity: 2,
        coverage: 1,
        crap: 2,
        rationale: 'New function has an explicit reviewed budget.',
      },
      {
        kind: 'removed',
        identity: `${originalPath}#removed-function`,
        file: originalPath,
        rationale: 'Removed function has no current measurement.',
      },
    ],
  };
}
function frozenCrapV3() {
  const base = frozenCrapV2();
  const partition = mutationPartitions().find((row) => row.name === 'main-config')!;
  const originals = ['src/config/runtime-config.ts', 'src/config/legacy-project-context.ts'];
  const currents = ['src/config/runtime-config.ts', 'src/config/project-context.ts'];
  const kept = (identity: string, current_identity: string, originalComplexity: number) => ({
    kind: 'retained',
    identity,
    current_identity,
    original_source_complexity: originalComplexity,
    maximum_complexity: originalComplexity,
    maximum_crap: originalComplexity,
    complexity: 1,
    coverage: 1,
    crap: 1,
    rationale: 'Explicit reviewed implementation responsibility.',
  });
  const functions: Record<string, unknown>[] = [
    kept('src/config/runtime-config.ts#old-runtime', 'src/config/runtime-config.ts#runtime', 2),
    kept('src/config/runtime-config.ts#old-project', 'src/config/project-context.ts#project', 4),
    kept('src/config/legacy-project-context.ts#old-other', 'src/config/project-context.ts#other', 6),
  ];
  const identityReuses: Record<string, unknown>[] = [];
  const newSourcePaths: string[] = [],
    removedSourcePaths: string[] = [];
  return {
    ...base,
    schema: 'VidaScopedCrapBudgetReport/v3',
    contour: partition.name,
    source_mapping_kind: 'reviewed-pairs',
    identity_reuses: identityReuses,
    new_source_paths: newSourcePaths,
    removed_source_paths: removedSourcePaths,
    original_sources: originals.map((file) => digest(file, 'd')),
    sources: currents.map((file) => digest(file)),
    module_inputs: currents.map((file) => digest(file)),
    test_inputs: partition.tests!.map((file) => digest(file)),
    test_selection: {
      ...base.test_selection,
      contour: partition.name,
      sources: currents,
      tests: [...partition.tests!],
    },
    source_mappings: [
      { original_path: originals[0]!, current_path: currents[0]!, rationale: 'Reviewed retained runtime module.' },
      {
        original_path: originals[0]!,
        current_path: currents[1]!,
        rationale: 'Reviewed project implementation extraction.',
      },
      {
        original_path: originals[1]!,
        current_path: currents[1]!,
        rationale: 'Reviewed merge of other project responsibility.',
      },
    ],
    functions,
  };
}

function frozenCrapV3WithAdapter() {
  const report = frozenCrapV3();
  report.functions.push({
    kind: 'new',
    identity: 'src/config/runtime-config.ts#old-project',
    current_identity: 'src/config/runtime-config.ts#old-project',
    maximum_complexity: 1,
    maximum_crap: 1,
    complexity: 1,
    coverage: 1,
    crap: 1,
    rationale: 'Independently capped new adapter with the old name.',
  });
  report.identity_reuses.push({
    original_identity: 'src/config/runtime-config.ts#old-project',
    successor_identity: 'src/config/project-context.ts#project',
    rationale: 'Implementation moved; the old name belongs to a new thin adapter.',
  });
  return report;
}

test('v3 projects reviewed source splits and merges and preserves its snapshot schema', () => {
  const [attempt] = contourAttempts(frozenCrapV3(), receipt);
  expect(attempt).toMatchObject({
    producer_schema: 'VidaScopedCrapBudgetReport/v3',
    accepted: true,
    function_count: 3,
  });
  const snapshot = mergeContourProgress(empty, [attempt!]);
  expect(mergeContourProgress(snapshot, []).attempts).toHaveLength(1);
  const legacy: Record<string, unknown> = { ...frozenCrapV3(), schema: 'VidaScopedCrapBudgetReport/v2' };
  delete legacy.source_mapping_kind;
  delete legacy.identity_reuses;
  delete legacy.new_source_paths;
  delete legacy.removed_source_paths;
  expect(() => contourAttempts(legacy, receipt)).toThrow('one-to-one');
});

test.each([
  'duplicate-edge',
  'foreign-edge',
  'missing-pair',
  'cap-transfer',
  'duplicate-function',
  'missing-kind',
  'missing-reuses',
  'extra-field',
] as const)('v3 rejects %s proof claims', (kind) => {
  const report = frozenCrapV3();
  const malformed: Record<string, unknown> = report;
  if (kind === 'duplicate-edge') report.source_mappings.push({ ...report.source_mappings[0]! });
  if (kind === 'foreign-edge')
    report.source_mappings.push({
      original_path: 'src/foreign.ts',
      current_path: 'src/config/runtime-config.ts',
      rationale: 'Foreign source endpoint.',
    });
  if (kind === 'missing-pair') report.source_mappings.splice(1, 1);
  if (kind === 'cap-transfer') report.functions[2]!.maximum_complexity = 4;
  if (kind === 'duplicate-function') report.functions.push({ ...report.functions[0]! });
  if (kind === 'missing-kind') delete malformed.source_mapping_kind;
  if (kind === 'missing-reuses') delete malformed.identity_reuses;
  if (kind === 'extra-field') malformed.unreviewed_claim = true;
  expect(() => contourAttempts(malformed, receipt)).toThrow();
});

test('v3 admits a reviewed implementation successor and independently capped reused adapter name', () => {
  expect(contourAttempts(frozenCrapV3WithAdapter(), receipt)[0]).toMatchObject({
    accepted: true,
    function_count: 4,
    producer_schema: 'VidaScopedCrapBudgetReport/v3',
  });
});

test('v3 requires explicit Source addition/removal paths even when every function has a disposition', () => {
  const report = frozenCrapV3();
  report.source_mappings = [report.source_mappings[0]!];
  report.functions = [
    report.functions[0]!,
    {
      kind: 'removed',
      identity: 'src/config/runtime-config.ts#old-project',
      file: 'src/config/runtime-config.ts',
      rationale: 'Reviewed removal of the original project role.',
    },
    {
      kind: 'removed',
      identity: 'src/config/legacy-project-context.ts#old-other',
      file: 'src/config/legacy-project-context.ts',
      rationale: 'Reviewed retirement of the original module.',
    },
    {
      kind: 'new',
      identity: 'src/config/project-context.ts#new-project',
      current_identity: 'src/config/project-context.ts#new-project',
      maximum_complexity: 1,
      maximum_crap: 1,
      complexity: 1,
      coverage: 1,
      crap: 1,
      rationale: 'Independent new implementation with its own cap.',
    },
  ];
  expect(() => contourAttempts(report, receipt)).toThrow('Source paths');
  report.new_source_paths = ['src/config/project-context.ts'];
  report.removed_source_paths = ['src/config/legacy-project-context.ts'];
  expect(contourAttempts(report, receipt)[0]).toMatchObject({ accepted: true, function_count: 2 });
});

test.each([
  'missing-new',
  'missing-removed',
  'mapped-new',
  'mapped-removed',
  'duplicate-inventory',
  'downgrade',
] as const)('v3 rejects %s source disposition', (kind) => {
  const report = frozenCrapV3();
  const malformed: Record<string, unknown> = report;
  if (kind === 'missing-new') delete malformed.new_source_paths;
  if (kind === 'missing-removed') delete malformed.removed_source_paths;
  if (kind === 'mapped-new') report.new_source_paths.push('src/config/project-context.ts');
  if (kind === 'mapped-removed') report.removed_source_paths.push('src/config/runtime-config.ts');
  if (kind === 'duplicate-inventory') report.sources.push({ ...report.sources[0]! });
  if (kind === 'downgrade') malformed.schema = 'VidaScopedCrapBudgetReport/v2';
  expect(() => contourAttempts(malformed, receipt)).toThrow();
});

test('v3 identity reuse is independent of new/retained/removed row ordering', () => {
  const report = frozenCrapV3WithAdapter();
  const removed = {
    kind: 'removed',
    identity: 'src/config/runtime-config.ts#discarded',
    file: 'src/config/runtime-config.ts',
    rationale: 'Reviewed removal does not transfer a ceiling.',
  };
  report.functions = [report.functions[3]!, removed, ...report.functions.slice(0, 3)];
  expect(contourAttempts(report, receipt)[0]).toMatchObject({ accepted: true, function_count: 4 });
  const overlap = frozenCrapV3WithAdapter();
  overlap.functions.push({
    kind: 'removed',
    identity: 'src/config/runtime-config.ts#old-project',
    file: 'src/config/runtime-config.ts',
    rationale: 'The retained original cannot also be removed.',
  });
  expect(() => contourAttempts(overlap, receipt)).toThrow();
});

test('retired governance observations survive the split without closing the new active contour', () => {
  const prior = coverage();
  const old = mutationPartitions({ includeRetired: true }).find((row) => row.name === 'main-governance')!;
  const source = 'src/governance/edictum-boundary.ts';
  prior.test_selection = { contour: old.name, tests: [...old.tests!] };
  prior.sources = [digest(source)];
  prior.module_inputs = [digest(source)];
  prior.test_inputs = old.tests!.map((file) => digest(file));
  prior.metrics[0]!.file = source;
  const attempts = contourAttempts(prior, receipt);
  const snapshot = mergeContourProgress(empty, attempts);
  expect(snapshot.attempts[0]?.accepted).toBe(true);
  const rendered = renderContourProgress(snapshot);
  expect(rendered).toContain('main-governance (retired)');
  expect(rendered).toContain('| main-governance-validation | unknown');
  expect(rendered).toContain(zeroOfActive);
  expect(() =>
    mergeContourProgress(empty, [
      {
        ...attempts[0]!,
        sources: [digest(source), digest('src/governance/workflow-approval-consumption-contract.ts')],
      },
    ]),
  ).toThrow('Contour Source selection differs');
  const owners = mutationPartitions().filter((row) =>
    row.sources?.includes('src/governance/workflow-approval-consumption-contract.ts'),
  );
  expect(owners.map((row) => row.name)).toEqual(['main-governance-validation']);
});

test.each([
  'missing',
  'duplicate',
  'foreign',
  'same-identity',
  'wrong-successor',
  'no-adapter',
  'uncapped-adapter',
  'extra-field',
] as const)('v3 rejects %s adapter identity reuse', (kind) => {
  const report = frozenCrapV3WithAdapter();
  if (kind === 'missing') report.identity_reuses = [];
  if (kind === 'duplicate') report.identity_reuses.push({ ...report.identity_reuses[0]! });
  if (kind === 'foreign') report.identity_reuses[0]!.original_identity = 'src/foreign.ts#caller';
  if (kind === 'same-identity')
    report.identity_reuses[0]!.successor_identity = report.identity_reuses[0]!.original_identity;
  if (kind === 'wrong-successor') report.identity_reuses[0]!.successor_identity = 'src/config/project-context.ts#other';
  if (kind === 'no-adapter') report.functions.pop();
  if (kind === 'uncapped-adapter') report.functions[3]!.maximum_complexity = 11;
  if (kind === 'extra-field') report.identity_reuses[0]!.unreviewed_claim = true;
  expect(() => contourAttempts(report, receipt)).toThrow();
});

function projected(c = coverage(), m = mutation()) {
  return mergeContourProgress(empty, [...contourAttempts(c, receipt), ...contourAttempts(m, receipt)]);
}

test('zero evidence keeps canonical static and executable contours visible as unknown', () => {
  const report = renderContourProgress(mergeContourProgress(empty, []));
  const partitions = mutationPartitions();
  for (const partition of partitions) expect(report).toContain('| ' + partition.name + ' |');
  expect(report).toContain('**0/' + partitions.filter((row) => row.environment !== 'static').length + '**');
  expect(report).toContain('N/A: static exports');
  expect(report).toContain('exact coverage qualification');
});

test('contract and fuzz scenarios are selected by their source owners', () => {
  const active = mutationPartitions();
  const config = active.find((row) => row.name === 'main-config');
  const publicIngress = active.find((row) => row.name === 'main-public-ingress');
  const envelopes = active.find((row) => row.name === 'main-envelopes');
  const cedar = active.find((row) => row.name === 'main-cedar');
  const governance = active.find((row) => row.name === 'bun-governance-and-public-contracts');
  const hostState = active.find((row) => row.name === 'bun-host-state');
  expect(config?.tests).toContain('tests/fuzz-config.test.ts');
  expect(publicIngress).toMatchObject({
    sources: ['src/contracts/public-ingress.ts'],
    tests: [
      'tests/public-ingress-boundary.test.ts',
      'tests/fuzz-public-ingress.test.ts',
      'tests/public-ingress-error-fallback.test.ts',
    ],
  });
  expect(envelopes).toMatchObject({
    sources: ['src/contracts/envelopes.ts'],
    tests: ['tests/envelopes-boundary.test.ts', 'tests/fuzz-envelopes.test.ts', 'tests/zombies.test.ts'],
  });
  expect(cedar?.tests).toContain('tests/fuzz-authorization.test.ts');
  expect(governance?.tests).toContain('tests/fuzz-public-ingress.test.ts');
  expect(governance?.tests).toContain('tests/fuzz-envelopes.test.ts');
  expect(hostState).toMatchObject({
    sources: ['src/host-state.ts', 'src/trusted-host.ts', 'src/contracts/work-state-schema.ts'],
    tests: ['tests/bun/host-state.test.ts', 'tests/stopped-source-capture.test.ts'],
  });
  expect(active.flatMap((row) => row.tests ?? [])).not.toContain('tests/fuzz.test.ts');
  expect(active.some((row) => row.name === 'main-contracts')).toBe(false);
  expect(mutationPartitions({ includeRetired: true }).find((row) => row.name === 'main-contracts')).toMatchObject({
    environment: 'retired',
    sources: ['src/contracts/public-ingress.ts', 'src/contracts/envelopes.ts'],
    tests: [
      'tests/public-ingress-boundary.test.ts',
      'tests/envelopes-boundary.test.ts',
      'tests/fuzz.test.ts',
      'tests/zombies.test.ts',
    ],
  });
  const owners = active.flatMap((row) => (row.sources ?? []).map((source) => [source, row.name] as const));
  expect(
    owners
      .filter(([source]) => ['src/contracts/public-ingress.ts', 'src/contracts/envelopes.ts'].includes(source))
      .sort(([left], [right]) => left.localeCompare(right)),
  ).toEqual([
    ['src/contracts/envelopes.ts', 'main-envelopes'],
    ['src/contracts/public-ingress.ts', 'main-public-ingress'],
  ]);
});

function retiredCoverage() {
  const c = coverage();
  const sources = [digest('src/contracts/public-ingress.ts'), digest('src/contracts/envelopes.ts')];
  const tests = [
    'tests/public-ingress-boundary.test.ts',
    'tests/envelopes-boundary.test.ts',
    // Historical report fixture: preserve the recorded v1 test path as old evidence.
    'tests/fuzz.test.ts',
    'tests/zombies.test.ts',
  ];
  return {
    ...c,
    sources,
    module_inputs: sources,
    test_selection: { contour: 'main-contracts', tests },
    test_inputs: tests.map((file) => digest(file)),
    metrics: sources.map(({ path: file }) => ({
      ...structuredClone(c.metrics[0]!),
      file,
      functions: [{ identity: file + '#fixture', complexity: 2, coverage: 1, crap: 2 }],
    })),
  };
}

test('retired coverage retains its owner status and is idempotent historical evidence', () => {
  const original = contourAttempts(retiredCoverage(), receipt);
  expect(original).toHaveLength(1);
  expect(original[0]).toMatchObject({ contour: 'main-contracts', status: 'focused-diagnostic', accepted: true });
  const before = structuredClone(original);
  const snapshot = mergeContourProgress(empty, original);
  const replay = mergeContourProgress(snapshot, contourAttempts(retiredCoverage(), receipt));
  expect(replay).toEqual(snapshot);
  expect(replay.attempts).toEqual(before);
  const report = renderContourProgress(replay);
  expect(report).toContain('main-contracts (retired)');
  expect(report).toContain('focused-diagnostic; owner accepted locally');
  expect(report).toContain('Child results never synthesize a parent result');
  expect(report).toContain(zeroOfActive);
  const conflict = structuredClone(before);
  conflict[0]!.status = 'changed';
  expect(() => mergeContourProgress(snapshot, conflict)).toThrow(/Conflicting/);
});

test('a retired complete pair and frozen proof never close either active child', () => {
  const c = retiredCoverage();
  const m = mutation();
  m.source_inputs = structuredClone(c.sources);
  m.selected_partitions = ['main-contracts'];
  m.test_inputs = structuredClone(c.test_inputs);
  m.partition_source_bindings = [
    {
      partition: 'main-contracts',
      tests: [...c.test_selection.tests],
      source_inputs: structuredClone(c.sources),
    },
  ];
  const legacy = {
    ...m,
    partition_statuses: { 'main-contracts': { Killed: 3 } },
    runner_processes: m.runner_processes.map((row) => ({ ...row, partition: 'main-contracts' })),
  };
  const frozen = frozenCrap(c);
  const crap = {
    ...frozen,
    contour: 'main-contracts',
    original_sources: structuredClone(c.sources),
    functions: [
      ...frozen.functions,
      { ...frozen.functions[0]!, identity: 'original#second', current_identity: 'current#second' },
    ],
  };
  const observations = [
    ...contourAttempts(c, receipt),
    ...contourAttempts(legacy, receipt),
    ...contourAttempts(crap, receipt),
  ];
  expect(observations.every((row) => row.accepted)).toBe(true);
  const snapshot = mergeContourProgress(empty, observations);
  expect(mergeContourProgress(snapshot, observations)).toEqual(snapshot);
  const report = renderContourProgress(snapshot);
  expect(report).toContain(zeroOfActive);
  expect(report).toContain('scoped-proof-pass; owner accepted locally');
  expect(report).toContain('pilot-pass; owner accepted locally');
  expect(report).not.toContain('local triple recorded');
  const unknown = { ...legacy, run_id: 'mutation-unknown', status: 'unknown', effective_score: 0 };
  const failed = contourAttempts(unknown, receipt);
  expect(failed[0]).toMatchObject({ status: 'unknown', accepted: false });
  const after = mergeContourProgress(snapshot, failed);
  expect(after.attempts.slice(0, observations.length)).toEqual(snapshot.attempts);
  expect(renderContourProgress(after)).toContain('3/3 (unknown; raw runner Killed; unqualified)');
});

test('compatible complete observations record a local maximum without claiming frozen or freshness acceptance', () => {
  const snapshot = projected();
  const report = renderContourProgress(snapshot);
  expect(report).toContain(oneOfActive);
  expect(report).toContain('1/1 · 1/1 · 1/1 · 1/1');
  expect(report).toContain('2 / 2');
  expect(report).toContain('3/3 (pilot-pass; assertion-confirmed)');
  expect(report).toContain('Current freshness: unverified');
  expect(report).toContain('qualification: pending');
  expect(snapshot.attempts.map((row) => row.tool_fingerprint)).toEqual(['b'.repeat(64), 'c'.repeat(64)]);
});

test('coverage and mutation pair remains recorded when the scoped frozen CRAP receipt is absent', () => {
  const report = renderContourProgress(projected());
  expect(report).toContain('Historical contours with exact F/L/S/B coverage: **1/' + activeCount + '**.');
  expect(report).toContain(
    'Historical same-coverage-run coverage + scoped frozen CRAP pairs: **0/' + activeCount + '**.',
  );
  expect(report).toContain(
    'Historical complete coverage + assertion-confirmed mutation pair closures: **1/' + activeCount + '**',
  );
  expect(report).toContain(
    'Separate same-coverage-run local triples with scoped frozen CRAP: **0/' + activeCount + '**',
  );
});

test.each(['coverage-run', 'source', 'test', 'tool', 'closure', 'functions'] as const)(
  'scoped frozen CRAP with mismatched %s cannot complete a local triple',
  (kind) => {
    const c = coverage();
    const crap = frozenCrap(c);
    if (kind === 'coverage-run') {
      crap.run_id = 'coverage-other';
      crap.coverage_run_id = 'coverage-other';
    }
    if (kind === 'source') {
      crap.sources[0]!.sha256 = 'd'.repeat(64);
      for (const input of crap.module_inputs) if (input.path === crap.sources[0]!.path) input.sha256 = 'd'.repeat(64);
    }
    if (kind === 'test') crap.test_inputs[0]!.sha256 = 'd'.repeat(64);
    if (kind === 'tool') crap.tool_inputs[0]!.sha256 = 'd'.repeat(64);
    if (kind === 'closure') crap.module_inputs.push(digest('src/extra-dependency.ts', 'd'));
    if (kind === 'functions')
      crap.functions.push({ ...crap.functions[0]!, identity: 'original#extra', current_identity: 'current#extra' });
    const snapshot = mergeContourProgress(empty, [
      ...contourAttempts(c, receipt),
      ...contourAttempts(mutation(), receipt),
      ...contourAttempts(crap, receipt),
    ]);
    const report = renderContourProgress(snapshot);
    expect(report).toContain(
      'Historical complete coverage + assertion-confirmed mutation pair closures: **1/' + activeCount + '**',
    );
    expect(report).toContain(
      'Separate same-coverage-run local triples with scoped frozen CRAP: **0/' + activeCount + '**',
    );
    expect(report).toContain(
      'Historical same-coverage-run coverage + scoped frozen CRAP pairs: **0/' + activeCount + '**.',
    );
  },
);

test('compatible exact coverage, scoped frozen CRAP and assertion-confirmed mutation form a separate local triple', () => {
  const c = coverage();
  const snapshot = mergeContourProgress(empty, [
    ...contourAttempts(c, receipt),
    ...contourAttempts(mutation(), receipt),
    ...contourAttempts(frozenCrap(c), receipt),
  ]);
  const report = renderContourProgress(snapshot);
  expect(selectContourCampaign(snapshot, 'all', receipt.commit)).toHaveLength(activeCount);
  expect(selectContourCampaign(snapshot, 'unclosed', receipt.commit).map((row) => row.name)).not.toContain('main-host');
  expect(selectContourCampaign(snapshot, 'unclosed', 'a-new-source-commit')).toHaveLength(activeCount);
  expect(
    selectContourCampaign(snapshot, 'all', receipt.commit).some((row) =>
      ['static', 'retired'].includes(row.environment ?? ''),
    ),
  ).toBe(false);
  expect(report).toContain(
    'Historical complete coverage + assertion-confirmed mutation pair closures: **1/' + activeCount + '**',
  );
  expect(report).toContain(
    'Separate same-coverage-run local triples with scoped frozen CRAP: **1/' + activeCount + '**',
  );
  expect(report).toContain('Historical contours with exact F/L/S/B coverage: **1/' + activeCount + '**.');
  expect(report).toContain(
    'Historical same-coverage-run coverage + scoped frozen CRAP pairs: **1/' + activeCount + '**.',
  );
  expect(report).toContain(
    'Historical complete local coverage + mutation + frozen CRAP closure: `coverage-1` + `mutation-1` + `coverage-1`.',
  );
  expect(report).toContain('Current freshness: unverified');
  expect(report).toContain('qualification: pending');
});

test('coverage and same-run frozen proof are visible while mutation remains open', () => {
  const c = coverage();
  const snapshot = mergeContourProgress(empty, [
    ...contourAttempts(c, receipt),
    ...contourAttempts(frozenCrap(c), receipt),
  ]);
  const report = renderContourProgress(snapshot);
  expect(report).toContain('Historical contours with exact F/L/S/B coverage: **1/' + activeCount + '**.');
  expect(report).toContain(
    'Historical same-coverage-run coverage + scoped frozen CRAP pairs: **1/' + activeCount + '**.',
  );
  expect(report).toContain(
    'Separate same-coverage-run local triples with scoped frozen CRAP: **0/' + activeCount + '**',
  );
});

test('v2 projects retained and new measurements while excluding removed roles from current maxima', () => {
  const c = coverageWithTwoFunctions();
  const crap = frozenCrapV2(c);
  const [attempt] = contourAttempts(crap, receipt);
  expect(attempt).toBeDefined();
  if (!attempt) throw new Error('v2 CRAP projection missing');
  expect(attempt.producer_schema).toBe('VidaScopedCrapBudgetReport/v2');
  expect(attempt.lane).toBe('frozen-crap');
  expect(attempt.function_count).toBe(2);
  expect(attempt.max_cc).toBe(3);
  expect(attempt.max_entry_crap).toBe(3);
  expect(attempt.accepted).toBe(true);
  const snapshot = mergeContourProgress(empty, [
    ...contourAttempts(c, receipt),
    ...contourAttempts(mutation(), receipt),
    ...contourAttempts(crap, receipt),
  ]);
  const report = renderContourProgress(snapshot);
  expect(report).toContain(
    'Separate same-coverage-run local triples with scoped frozen CRAP: **1/' + activeCount + '**',
  );
  expect(report).toContain('Current freshness: unverified');
  expect(report).toContain('qualification: pending');
});

test('v2 accepts a pure original Source removal with no function row for that file', () => {
  const crap = frozenCrapV2();
  crap.original_sources.push(digest('src/config/retired-empty.ts', 'e'));
  const [attempt] = contourAttempts(crap, receipt);
  expect(attempt?.accepted).toBe(true);
  expect(attempt?.function_count).toBe(2);
});

test('v2 accepts a pure current Source addition with no original Source mapping', () => {
  const crap = frozenCrapV2();
  crap.original_sources = [];
  crap.source_mappings = [];
  crap.functions = [
    {
      kind: 'new',
      identity: 'src/config/host-capability.ts#new-function',
      current_identity: 'src/config/host-capability.ts#new-function',
      maximum_complexity: 2,
      maximum_crap: 3,
      complexity: 2,
      coverage: 1,
      crap: 2,
      rationale: 'New source has a bounded reviewed function.',
    },
  ];
  const [attempt] = contourAttempts(crap, receipt);
  expect(attempt?.accepted).toBe(true);
  expect(attempt?.function_count).toBe(1);
});

test.each([
  'new-original-field',
  'removed-current-field',
  'budget-bound',
  'non-integer-complexity',
  'non-integer-original-complexity',
  'non-integer-budget',
  'nonpositive-crap-budget',
  'nonfinite-crap',
  'crap-budget-bound',
  'retained-crap-mismatch',
  'new-crap-mismatch',
  'new-cap-too-high',
  'new-crap-cap-too-high',
  'new-cap-noninteger',
  'incomplete-coverage',
  'source-map',
  'source-overlap',
  'function-overlap',
  'shared-identity-reset',
  'short-rationale',
] as const)('v2 rejects %s', (kind) => {
  const crap = frozenCrapV2(coverageWithTwoFunctions());
  if (kind === 'new-original-field') Object.assign(crap.functions[1]!, { original_source_complexity: 1 });
  if (kind === 'removed-current-field') Object.assign(crap.functions[2]!, { complexity: 1 });
  if (kind === 'budget-bound') Object.assign(crap.functions[0]!, { maximum_complexity: 2 });
  if (kind === 'non-integer-complexity') Object.assign(crap.functions[0]!, { complexity: 2.5 });
  if (kind === 'non-integer-original-complexity')
    Object.assign(crap.functions[0]!, { original_source_complexity: 4.5 });
  if (kind === 'non-integer-budget') Object.assign(crap.functions[0]!, { maximum_complexity: 2.5 });
  if (kind === 'nonpositive-crap-budget') Object.assign(crap.functions[0]!, { maximum_crap: 0 });
  if (kind === 'nonfinite-crap') Object.assign(crap.functions[0]!, { crap: Number.POSITIVE_INFINITY });
  if (kind === 'crap-budget-bound') Object.assign(crap.functions[0]!, { maximum_crap: 2 });
  if (kind === 'retained-crap-mismatch') Object.assign(crap.functions[0]!, { crap: 2 });
  if (kind === 'new-crap-mismatch') Object.assign(crap.functions[1]!, { crap: 1 });
  if (kind === 'new-cap-too-high') Object.assign(crap.functions[1]!, { maximum_complexity: 11 });
  if (kind === 'new-crap-cap-too-high') Object.assign(crap.functions[1]!, { maximum_crap: 11 });
  if (kind === 'new-cap-noninteger') Object.assign(crap.functions[1]!, { maximum_crap: 2.5 });
  if (kind === 'incomplete-coverage') Object.assign(crap.functions[1]!, { coverage: 0.5 });
  if (kind === 'source-map') crap.source_mappings[0]!.current_path = 'src/other.ts';
  if (kind === 'source-overlap') crap.source_mappings.push({ ...crap.source_mappings[0]! });
  if (kind === 'function-overlap') {
    const retainedCurrent = String((crap.functions[0]! as Record<string, unknown>).current_identity);
    Object.assign(crap.functions[1]!, { identity: retainedCurrent, current_identity: retainedCurrent });
  }
  if (kind === 'shared-identity-reset') {
    const file = 'src/config/host-capability.ts';
    crap.original_sources.push(digest(file, 'e'));
    crap.functions.push({
      kind: 'removed',
      identity: `${file}#new-function`,
      file,
      rationale: 'A shared identity must not reset its retained ceiling.',
    });
  }
  if (kind === 'short-rationale') Object.assign(crap.functions[1]!, { rationale: 'short' });
  expect(() => contourAttempts(crap, receipt)).toThrow();
});

test.each(['malformed', 'global-claim', 'selection-mode'] as const)(
  'scoped CRAP %s metadata is rejected instead of becoming frozen evidence',
  (kind) => {
    const crap = frozenCrap();
    if (kind === 'malformed') crap.full_qualification = true;
    else if (kind === 'selection-mode') crap.test_selection.mode = 'full-current-test-set';
    else Object.assign(crap, { global_qualification_accepted: true });
    expect(() => contourAttempts(crap, receipt)).toThrow();
  },
);

test.each(['source', 'test', 'tool', 'missing-test', 'missing-tool', 'dependency'] as const)(
  'incompatible %s closure cannot assemble a synthetic maximum',
  (kind) => {
    const m = mutation();
    if (kind === 'source') {
      m.partition_source_bindings[0]!.source_inputs[0]!.sha256 = 'd'.repeat(64);
      m.source_inputs[0]!.sha256 = 'd'.repeat(64);
    }
    if (kind === 'dependency') m.source_inputs[1]!.sha256 = 'd'.repeat(64);
    if (kind === 'test') m.test_inputs[0]!.sha256 = 'd'.repeat(64);
    if (kind === 'tool') m.tool_inputs[0]!.sha256 = 'd'.repeat(64);
    if (kind === 'missing-test') {
      m.test_inputs = [];
      m.partition_source_bindings[0]!.tests = [];
    }
    if (kind === 'missing-tool') m.tool_inputs = [];
    expect(renderContourProgress(projected(coverage(), m))).toContain(zeroOfActive);
  },
);

test.each(['timeout', 'signal', 'output', 'custody', 'runtime', 'survivor', 'provenance'] as const)(
  'later %s does not erase a historical maximum or count as a confirmed kill',
  (kind) => {
    const before = projected();
    const m = mutation();
    m.run_id = 'mutation-2';
    const process = m.runner_processes[0]!;
    if (kind === 'timeout') process.timed_out = true;
    if (kind === 'signal') Object.assign(process, { signal: 'SIGKILL' });
    if (kind === 'output') process.output_complete = false;
    if (kind === 'custody') process.process_custody.processGroupTerminationObserved = false;
    if (kind === 'runtime') process.observed_exit_code = 1;
    if (kind === 'survivor')
      Object.assign(m, {
        status: 'fail',
        effective_score: 0.5,
        partition_statuses: { 'main-host': { Killed: 2, Survived: 1 } },
      });
    if (kind === 'provenance') Object.assign(m, { provenance_errors: ['unconfirmed assertion'] });
    const after = mergeContourProgress(
      before,
      contourAttempts(m, { ...receipt, recorded_at: '2026-10-15T01:00:00.000Z' }),
    );
    expect(after.attempts.at(-1)!.accepted).toBe(false);
    const report = renderContourProgress(after);
    expect(report).toContain(oneOfActive);
    expect(report).toContain('unqualified');
    expect(report).toContain('mutation-1');
    expect(report).toContain('mutation-2');
  },
);

test('partial coverage retains its denominator and cannot supply missing branches from another Source', () => {
  const c = coverage();
  c.metrics[0]!.coverage.branches = { covered: 0, total: 1 };
  const report = renderContourProgress(projected(c));
  expect(report).toContain('1/1 · 1/1 · 1/1 · 0/1');
  expect(report).toContain(zeroOfActive);
});

test('captured tests outside the declared executed selection do not establish contour completion', () => {
  const c = coverage();
  c.test_inputs.push(digest('tests/other.test.ts'));
  c.test_selection.tests = ['tests/other.test.ts'];
  expect(renderContourProgress(projected(c))).toContain(zeroOfActive);
});

test('a dependency may be classified as a focused tool and campaign Source with the same captured bytes', () => {
  const c = coverage();
  c.tool_inputs.push(digest('src/contracts/envelopes.ts'));
  expect(renderContourProgress(projected(c))).toContain(oneOfActive);
});

test('UNKNOWN with no executed mutants or process receipt retains historical completion and an unknown denominator', () => {
  const report = mutation();
  Object.assign(report, {
    run_id: 'mutation-not-launched',
    status: 'unknown',
    effective_score: null,
    runner_processes: [],
    partition_statuses: {},
    partition_source_bindings: [{ partition: 'main-host', source_inputs: [] }],
  });
  const snapshot = mergeContourProgress(
    projected(),
    contourAttempts(report, { ...receipt, recorded_at: '2026-10-15T02:00:00.000Z' }),
  );
  expect(snapshot.attempts.at(-1)!.mutants).toBeNull();
  expect(renderContourProgress(snapshot)).toContain('unknown (unknown)');
  expect(renderContourProgress(snapshot)).toContain(oneOfActive);
});

test.each(['FAIL', 'UNKNOWN', 'BLOCKED'])(
  'parent %s has no metrics and cannot overwrite a numeric observation',
  (status) => {
    const attempt = contourAttempts(
      { schema: 'VidaBunCoverageOperationOutcome/v1', run_id: 'parent-1', selection: { contour: 'main-host' }, status },
      { ...receipt, recorded_at: '2026-10-15T03:00:00.000Z' },
    );
    const snapshot = mergeContourProgress(projected(), attempt);
    expect(snapshot.attempts.at(-1)!.coverage).toBeNull();
    expect(snapshot.attempts.at(-1)!.accepted).toBe(false);
    const document = renderContourProgress(snapshot);
    expect(document).toContain(oneOfActive);
    expect(document).toContain('1/1 · 1/1 · 1/1 · 1/1');
    expect(document).toContain('| ' + status + ' | local maximum recorded');
  },
);

test('merge is deterministic, idempotent and rejects changed results for an existing run', () => {
  const snapshot = projected();
  expect(mergeContourProgress(snapshot, snapshot.attempts)).toEqual(snapshot);
  expect(mergeContourProgress(empty, [...snapshot.attempts].reverse())).toEqual(snapshot);
  const changed = structuredClone(snapshot.attempts[0]!);
  changed.max_cc = 99;
  expect(() => mergeContourProgress(snapshot, [changed])).toThrow('Conflicting contour run');
  const missingCommit = { ...snapshot.attempts[0]!, commit: 'not-captured' };
  const imported = mergeContourProgress(empty, [missingCommit]);
  expect(mergeContourProgress(imported, [snapshot.attempts[0]!]).attempts[0]!.commit).toBe('fixture-commit');
  expect(mergeContourProgress(snapshot, [missingCommit])).toEqual(snapshot);
  expect(() => mergeContourProgress(snapshot, [{ ...snapshot.attempts[0]!, commit: 'other' }])).toThrow(
    'Conflicting contour commit',
  );
});

test('publication interruption after JSON commit is repaired by regenerating Markdown from the snapshot', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'contour-publication-'));
  try {
    recordContourReport(root, coverage(), '/retained/coverage.json');
    recordContourReport(root, mutation(), '/retained/mutation.json');
    const output = path.join(root, 'published');
    const document = path.join(output, 'CONTOUR-STATUS.md');
    mkdirSync(document, { recursive: true });
    expect(() => runContourProgress(['--output', output], root)).toThrow();
    const committed = readFileSync(path.join(output, 'CONTOUR-STATUS.json'), 'utf8');
    rmSync(document, { recursive: true });
    runContourProgress(['--output', output], root);
    expect(readFileSync(path.join(output, 'CONTOUR-STATUS.json'), 'utf8')).toBe(committed);
    expect(readFileSync(document, 'utf8')).toContain(oneOfActive);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('legacy mutation summary needs its captured descriptor and rejects a foreign descriptor without losing the snapshot', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'contour-selection-'));
  try {
    const raw = mutation();
    const binding = raw.partition_source_bindings[0]!;
    const legacy = {
      ...raw,
      input_fingerprint: 'e'.repeat(64),
      test_fingerprint: 'f'.repeat(64),
      partition_source_bindings: [
        { partition: binding.partition, source_inputs: binding.source_inputs, source_fingerprint: 'd'.repeat(64) },
      ],
    };
    const descriptor = {
      schema: 'MutationInputDescriptor/v3',
      partition: binding.partition,
      tests: binding.tests,
      input_fingerprint: legacy.input_fingerprint,
      test_fingerprint: legacy.test_fingerprint,
      tool_fingerprint: legacy.tool_fingerprint,
      partition_source_fingerprint: 'd'.repeat(64),
      partition_source_inputs: binding.source_inputs,
      test_inputs: legacy.test_inputs,
      tool_inputs: legacy.tool_inputs,
    };
    const report = path.join(root, 'report.json'),
      selection = path.join(root, 'selection.json');
    writeFileSync(report, JSON.stringify(legacy));
    writeFileSync(selection, JSON.stringify(descriptor));
    recordContourReport(root, coverage(), '/retained/coverage.json');
    const output = path.join(root, 'published');
    runContourProgress(['--output', output, '--report', report], root);
    expect(readFileSync(path.join(output, 'CONTOUR-STATUS.md'), 'utf8')).toContain(zeroOfActive);
    runContourProgress(['--output', output, '--report', report, '--selection', selection], root);
    expect(readFileSync(path.join(output, 'CONTOUR-STATUS.md'), 'utf8')).toContain(oneOfActive);
    const before = readFileSync(path.join(output, 'CONTOUR-STATUS.json'), 'utf8');
    writeFileSync(selection, JSON.stringify({ ...descriptor, input_fingerprint: '0'.repeat(64) }));
    expect(() => runContourProgress(['--output', output, '--report', report, '--selection', selection], root)).toThrow(
      'selection differs',
    );
    expect(readFileSync(path.join(output, 'CONTOUR-STATUS.json'), 'utf8')).toBe(before);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test.each(['schema', 'static', 'foreign', 'duplicate', 'inventory', 'counter', 'date', 'digest'] as const)(
  'rejects malformed %s without replacing previous observations',
  (kind) => {
    const c = coverage();
    if (kind === 'schema') c.schema = 'foreign';
    if (kind === 'static') c.test_selection.contour = 'main-exports';
    if (kind === 'foreign') c.sources[0]!.path = '../foreign.ts';
    if (kind === 'duplicate') c.test_inputs.push(c.test_inputs[0]!);
    if (kind === 'inventory') c.metrics[0]!.functions = [];
    if (kind === 'counter') c.metrics[0]!.coverage.lines = { covered: 2, total: 1 };
    if (kind === 'digest') c.sources[0]!.sha256 = 'bad';
    expect(() =>
      mergeContourProgress(
        empty,
        contourAttempts(c, { ...receipt, recorded_at: kind === 'date' ? 'bad' : receipt.recorded_at }),
      ),
    ).toThrow();
  },
);

test('file adapter merges independent producer outputs, exports a durable snapshot and preserves it after input failure', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'contour-progress-'));
  try {
    recordContourReport(root, coverage(), '/retained/coverage.json');
    recordContourReport(root, mutation(), '/retained/mutation.json');
    const observation = path.join(
      root,
      'coverage/bun-unified/contours/observations',
      [coverage().test_selection.contour, 'coverage', coverage().run_id].join('.') + '.json',
    );
    const observationBefore = statSync(observation);
    const observationBytes = readFileSync(observation, 'utf8');
    recordContourReport(root, coverage(), '/retained/coverage.json');
    expect(statSync(observation).ino).toBe(observationBefore.ino);
    expect(readFileSync(observation, 'utf8')).toBe(observationBytes);
    const conflicting = coverage();
    conflicting.metrics[0]!.coverage.lines = { covered: 0, total: 1 };
    expect(() => recordContourReport(root, conflicting, '/retained/changed.json')).toThrow('Conflicting contour run');
    expect(readFileSync(observation, 'utf8')).toBe(observationBytes);
    expect(statSync(observation).ino).toBe(observationBefore.ino);
    const output = path.join(root, 'published');
    runContourProgress(['--output', output], root);
    const json = path.join(output, 'CONTOUR-STATUS.json');
    const markdown = path.join(output, 'CONTOUR-STATUS.md');
    const before = readFileSync(json, 'utf8');
    const parsed: unknown = JSON.parse(before);
    expect(renderContourProgress(mergeContourProgress(parsed, []))).toBe(readFileSync(markdown, 'utf8'));
    expect(readFileSync(markdown, 'utf8')).toContain(oneOfActive);
    runContourProgress(['--output', output], root);
    expect(readFileSync(json, 'utf8')).toBe(before);
    const bad = path.join(root, 'bad.json');
    writeFileSync(bad, '{}');
    expect(() => runContourProgress(['--output', output, '--report', bad], root)).toThrow();
    expect(readFileSync(json, 'utf8')).toBe(before);
    expect(() => runContourProgress(['--unknown', 'value'], root)).toThrow('Unknown contour option');
    expect(() => runContourProgress(['--report'], root)).toThrow('Expected');
    expect(() => runContourProgress(['--output', output, '--snapshot', path.join(root, 'missing.json')], root)).toThrow(
      'Missing explicit contour snapshot',
    );
    expect(readFileSync(json, 'utf8')).toBe(before);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
