import { expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { contourAttempts, mergeContourProgress, renderContourProgress } from '../tooling/contour-progress.ts';
import { recordContourReport, runContourProgress } from '../tooling/contour-progress-cli.ts';
import { mutationPartitions } from '../tooling/mutation-partitions.ts';

// Projection-only fixture subjects; these are not production coverage or confirmed mutation evidence.
const digest = (file: string, hash = 'a') => ({ path: file, sha256: hash.repeat(64) });
const receipt = {
  artifact: '/retained/report.json',
  commit: 'fixture-commit',
  recorded_at: '2026-10-15T00:00:00.000Z',
};
const empty = { schema: 'VidaContourProgress/v1', attempts: [] };
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

test('compatible complete observations record a local maximum without claiming frozen or freshness acceptance', () => {
  const snapshot = projected();
  const report = renderContourProgress(snapshot);
  expect(report).toContain('**1/44**');
  expect(report).toContain('1/1 · 1/1 · 1/1 · 1/1');
  expect(report).toContain('2 / 2');
  expect(report).toContain('3/3 (pilot-pass; assertion-confirmed)');
  expect(report).toContain('Current freshness: unverified');
  expect(report).toContain('qualification: pending');
  expect(snapshot.attempts.map((row) => row.tool_fingerprint)).toEqual(['b'.repeat(64), 'c'.repeat(64)]);
});

test('coverage and mutation pair remains recorded when the scoped frozen CRAP receipt is absent', () => {
  const report = renderContourProgress(projected());
  expect(report).toContain('Historical complete coverage + assertion-confirmed mutation pair closures: **1/44**');
  expect(report).toContain('Separate same-coverage-run local triples with scoped frozen CRAP: **0/44**');
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
    expect(report).toContain('Historical complete coverage + assertion-confirmed mutation pair closures: **1/44**');
    expect(report).toContain('Separate same-coverage-run local triples with scoped frozen CRAP: **0/44**');
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
  expect(report).toContain('Historical complete coverage + assertion-confirmed mutation pair closures: **1/44**');
  expect(report).toContain('Separate same-coverage-run local triples with scoped frozen CRAP: **1/44**');
  expect(report).toContain(
    'Historical complete local coverage + mutation + frozen CRAP closure: `coverage-1` + `mutation-1` + `coverage-1`.',
  );
  expect(report).toContain('Current freshness: unverified');
  expect(report).toContain('qualification: pending');
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
  expect(report).toContain('Separate same-coverage-run local triples with scoped frozen CRAP: **1/44**');
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
    expect(renderContourProgress(projected(coverage(), m))).toContain('**0/44**');
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
    expect(report).toContain('**1/44**');
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
  expect(report).toContain('**0/44**');
});

test('captured tests outside the declared executed selection do not establish contour completion', () => {
  const c = coverage();
  c.test_inputs.push(digest('tests/other.test.ts'));
  c.test_selection.tests = ['tests/other.test.ts'];
  expect(renderContourProgress(projected(c))).toContain('**0/44**');
});

test('a dependency may be classified as a focused tool and campaign Source with the same captured bytes', () => {
  const c = coverage();
  c.tool_inputs.push(digest('src/contracts/envelopes.ts'));
  expect(renderContourProgress(projected(c))).toContain('**1/44**');
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
  expect(renderContourProgress(snapshot)).toContain('**1/44**');
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
    expect(document).toContain('**1/44**');
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
    expect(readFileSync(document, 'utf8')).toContain('**1/44**');
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
    expect(readFileSync(path.join(output, 'CONTOUR-STATUS.md'), 'utf8')).toContain('**0/44**');
    runContourProgress(['--output', output, '--report', report, '--selection', selection], root);
    expect(readFileSync(path.join(output, 'CONTOUR-STATUS.md'), 'utf8')).toContain('**1/44**');
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
    recordContourReport(root, coverage(), '/retained/coverage.json');
    const output = path.join(root, 'published');
    runContourProgress(['--output', output], root);
    const json = path.join(output, 'CONTOUR-STATUS.json');
    const markdown = path.join(output, 'CONTOUR-STATUS.md');
    const before = readFileSync(json, 'utf8');
    const parsed: unknown = JSON.parse(before);
    expect(renderContourProgress(mergeContourProgress(parsed, []))).toBe(readFileSync(markdown, 'utf8'));
    expect(readFileSync(markdown, 'utf8')).toContain('**1/44**');
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
