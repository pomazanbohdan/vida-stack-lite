import { describe, expect, test } from 'bun:test';
import { planCoverageShards } from '../tooling/coverage-shard-plan.ts';
import { coverageEnvironmentSha256 } from '../tooling/bun-coverage-evidence.ts';
import {
  coverageAssignmentPlanSha256,
  coverageOutputPathsSha256,
  mergeCoverageShardCounters,
  validateCoverageShardEvidence,
  type CoverageShardInvocation,
  type CoverageShardProcessEvidence,
  type CoverageShardRunBinding,
  type CoverageShardTerminalEvidence,
} from '../tooling/coverage-shard-evidence.ts';

const source = 'src/kept.ts';
const secondSource = 'src/sparse.ts';
const selectedInputs = [
  { path: 'tests/a.test.ts', sha256: 'a'.repeat(64) },
  { path: 'tests/b.test.ts', sha256: 'b'.repeat(64) },
];
const runId = '11111111-1111-4111-8111-111111111111';
const plan = planCoverageShards(selectedInputs, [], 2, 'c'.repeat(64));
const assignments = plan.waves.flatMap((wave) => wave.assignments);

function invocationsFor(shardPlan: typeof plan): CoverageShardInvocation[] {
  return shardPlan.waves.flatMap((wave) =>
    wave.assignments.map((assignment) => ({
      shard_id: assignment.shard_id,
      argv: [
        'test',
        '--parallel=1',
        '--no-isolate',
        '--timeout',
        '5000',
        ...assignment.tests.map((file) => `./${file}`),
      ],
      cwd: '/synthetic/package',
      environment_sha256: '3'.repeat(64),
      output_paths: {
        coverage_directory: `/synthetic/runs/${runId}/shards/${assignment.shard_id}/coverage`,
        junit_file: `/synthetic/runs/${runId}/shards/${assignment.shard_id}/suite.junit.xml`,
        log_file: `/synthetic/runs/${runId}/shards/${assignment.shard_id}/child.log`,
        receipt_directory: `/synthetic/runs/${runId}/processes/${assignment.shard_id}`,
        temp_directory: `/synthetic/runs/${runId}/shards/${assignment.shard_id}/tmp`,
      },
    })),
  );
}

const invocations = invocationsFor(plan);
const snapshotDirectory = `/synthetic/runs/${runId}/snapshot`;
const run: CoverageShardRunBinding = {
  schema: 'VidaBunCoverageRun/v3',
  run_id: runId,
  source_fingerprint: 'd'.repeat(64),
  test_fingerprint: 'e'.repeat(64),
  tool_fingerprint: 'f'.repeat(64),
  runtime_executable_sha256: '1'.repeat(64),
  assignment_plan_sha256: coverageAssignmentPlanSha256(plan, invocations),
  tests: selectedInputs.map(({ path: file }) => file),
  selected_test_inputs: selectedInputs,
  shard_invocations: invocations,
  snapshot_directory: snapshotDirectory,
};

function processFor(index: number): CoverageShardProcessEvidence {
  const assignment = assignments[index]!;
  const invocation = invocations[index]!;
  return {
    schema: 'VidaBunCoverageProcess/v2',
    run_id: runId,
    shard_id: assignment.shard_id,
    pid: 100 + index,
    source_fingerprint: run.source_fingerprint,
    test_fingerprint: run.test_fingerprint,
    tool_fingerprint: run.tool_fingerprint,
    runtime_executable_sha256: run.runtime_executable_sha256,
    assignment_plan_sha256: run.assignment_plan_sha256,
    assigned_tests: [...assignment.tests],
    shard_selection_sha256: assignment.selection_sha256,
    active_argv: [...invocation.argv],
    cwd: invocation.cwd,
    environment_sha256: invocation.environment_sha256,
    output_paths_sha256: coverageOutputPathsSha256(invocation.output_paths),
    coverage: {},
  };
}

function terminalFor(child: CoverageShardProcessEvidence): CoverageShardTerminalEvidence {
  return {
    run_id: child.run_id,
    shard_id: child.shard_id,
    pid: child.pid,
    status: 0,
    signal: null,
    error: null,
    unknown: false,
  };
}

function completeEvidence() {
  const processes = assignments.map((_assignment, index) => processFor(index));
  return { processes, terminals: processes.map(terminalFor) };
}

function rebindEvidence(changedRun: CoverageShardRunBinding, changedInvocations: CoverageShardInvocation[]) {
  const all = completeEvidence();
  for (let index = 0; index < all.processes.length; index++) {
    const child = all.processes[index]!;
    const invocation = changedInvocations[index]!;
    child.assignment_plan_sha256 = changedRun.assignment_plan_sha256;
    child.output_paths_sha256 = coverageOutputPathsSha256(invocation.output_paths);
    child.active_argv = [...invocation.argv];
    child.cwd = invocation.cwd;
    child.environment_sha256 = invocation.environment_sha256;
  }
  return all;
}

function expectUnsafeArgvRejected(mutate: (argv: string[]) => void): void {
  const changedInvocations = structuredClone(invocations);
  mutate(changedInvocations[0]!.argv);
  const changedRun = {
    ...run,
    shard_invocations: changedInvocations,
    assignment_plan_sha256: coverageAssignmentPlanSha256(plan, changedInvocations),
  };
  const all = rebindEvidence(changedRun, changedInvocations);
  expect(() => validateCoverageShardEvidence({ run: changedRun, plan, ...all })).toThrow(
    /Bun test argv|serial-test argument|parallel|isolation|timeout|explicit paths|unapproved test-selection|sealed path binding|duplicates/u,
  );
}

function sourceMap(file: string, hits = 0) {
  const location = { start: { line: 1, column: 0 }, end: { line: 1, column: 1 } };
  return {
    path: file,
    statementMap: { '0': location },
    fnMap: { '0': { name: 'fixture', decl: location, loc: location, line: 1 } },
    branchMap: { '0': { type: 'if', locations: [location, location], line: 1 } },
    s: { '0': hits },
    f: { '0': hits },
    b: { '0': [hits, hits] },
  };
}

describe('versioned coverage shard evidence (structural synthetic controls only)', () => {
  test('normalizes missing Bun test environment defaults to their explicit values', () => {
    expect(coverageEnvironmentSha256({ PATH: '/synthetic/bin' })).toBe(
      coverageEnvironmentSha256({ NODE_ENV: 'test', PATH: '/synthetic/bin', TZ: 'Etc/UTC' }),
    );
  });

  test('keeps nondefault environment changes bound', () => {
    expect(coverageEnvironmentSha256({ PATH: '/synthetic/bin' })).not.toBe(
      coverageEnvironmentSha256({ PATH: '/synthetic/other-bin' }),
    );
  });
  test('joins one exact assignment, process receipt identity and terminal outcome per shard', () => {
    expect(() => validateCoverageShardEvidence({ run, plan, ...completeEvidence() })).not.toThrow();
  });

  test('rejects sibling, omitted and duplicate test claims while retaining valid sibling receipts', () => {
    for (const assignedTests of [['tests/b.test.ts'], [], ['tests/a.test.ts', 'tests/a.test.ts']]) {
      const all = completeEvidence();
      all.processes[0]!.assigned_tests = assignedTests;
      expect(() => validateCoverageShardEvidence({ run, plan, ...all })).toThrow(
        /Process assigned test claim contains duplicates|Coverage process assigned test claim differs/u,
      );
    }
  });

  test('rejects stale run, Source, test, tool, runtime and assignment-plan bindings', () => {
    for (const [key, value] of [
      ['run_id', '33333333-3333-4333-8333-333333333333'],
      ['source_fingerprint', '4'.repeat(64)],
      ['test_fingerprint', '5'.repeat(64)],
      ['tool_fingerprint', '6'.repeat(64)],
      ['runtime_executable_sha256', '7'.repeat(64)],
    ] as const) {
      const all = completeEvidence();
      Reflect.set(all.processes[0]!, key, value);
      all.terminals[0] = terminalFor(all.processes[0]!);
      expect(() => validateCoverageShardEvidence({ run, plan, ...all })).toThrow(/another run or input set/u);
    }
    const stalePlan = completeEvidence();
    stalePlan.processes[0]!.assignment_plan_sha256 = '8'.repeat(64);
    expect(() => validateCoverageShardEvidence({ run, plan, ...stalePlan })).toThrow(
      /assignment plan digest is stale/u,
    );
  });

  test('binds the complete global selection and shard digest to captured test rows', () => {
    const incompletePlan = planCoverageShards(selectedInputs.slice(0, 1), [], 2, 'c'.repeat(64));
    const incompleteInvocations = invocationsFor(incompletePlan);
    const incompleteRun = {
      ...run,
      assignment_plan_sha256: coverageAssignmentPlanSha256(incompletePlan, incompleteInvocations),
      shard_invocations: incompleteInvocations,
    };
    const first = processFor(0);
    expect(() =>
      validateCoverageShardEvidence({
        run: incompleteRun,
        plan: incompletePlan,
        processes: [first],
        terminals: [terminalFor(first)],
      }),
    ).toThrow(/assignment union|global selection/u);

    const missingCapturedRow = { ...run, selected_test_inputs: selectedInputs.slice(0, 1) };
    expect(() => validateCoverageShardEvidence({ run: missingCapturedRow, plan, ...completeEvidence() })).toThrow(
      /captured test|selection|input digest/u,
    );

    const staleSelection = completeEvidence();
    staleSelection.processes[0]!.shard_selection_sha256 = '9'.repeat(64);
    expect(() => validateCoverageShardEvidence({ run, plan, ...staleSelection })).toThrow(/selection digest|stale/u);
  });

  test('rejects duplicate producer PIDs and a missing process receipt', () => {
    const duplicatePid = completeEvidence();
    duplicatePid.processes[1]!.pid = duplicatePid.processes[0]!.pid;
    duplicatePid.terminals[1] = terminalFor(duplicatePid.processes[1]!);
    expect(() => validateCoverageShardEvidence({ run, plan, ...duplicatePid })).toThrow(/PID|process/u);

    const missingReceipt = completeEvidence();
    expect(() =>
      validateCoverageShardEvidence({
        run,
        plan,
        processes: [missingReceipt.processes[1]!],
        terminals: [missingReceipt.terminals[1]!],
      }),
    ).toThrow(/missing|receipt/u);
  });

  test('binds each shard argv, cwd and environment digest', () => {
    for (const mutate of [
      (child: CoverageShardProcessEvidence) => (child.active_argv = ['test', 'tests/foreign.test.ts']),
      (child: CoverageShardProcessEvidence) => (child.cwd = '/synthetic/other-package'),
      (child: CoverageShardProcessEvidence) => (child.environment_sha256 = 'a'.repeat(64)),
    ]) {
      const all = completeEvidence();
      mutate(all.processes[0]!);
      expect(() => validateCoverageShardEvidence({ run, plan, ...all })).toThrow(/argv|cwd|environment/u);
    }
  });

  test('rejects conflicting Bun test parallelism', () => {
    expectUnsafeArgvRejected((argv) => argv.splice(argv.indexOf('--parallel=1'), 1, '--parallel=2'));
  });

  test('requires Bun test isolation to be disabled', () => {
    expectUnsafeArgvRejected((argv) => argv.splice(argv.indexOf('--no-isolate'), 1));
  });

  test('requires explicit relative test paths in Bun test argv', () => {
    expectUnsafeArgvRejected((argv) => (argv[argv.length - 1] = argv[argv.length - 1]!.replace(/^\.\//u, '')));
  });

  test('rejects Bun test concurrent mode', () => {
    expectUnsafeArgvRejected((argv) => argv.push('--concurrent'));
  });

  test.each([
    ['Bun test name filter', (argv: string[]) => argv.push('--name=fixture')],
    ['Bun test name-pattern filter', (argv: string[]) => argv.push('--test-name-pattern=fixture')],
    ['Bun test short name filter', (argv: string[]) => argv.push('-t', 'fixture')],
    ['unknown Bun test selection modifier', (argv: string[]) => argv.push('--randomize')],
    ['Bun test bailout option', (argv: string[]) => argv.push('--bail=1')],
    ['Bun test bailout value option', (argv: string[]) => argv.push('--bail', '1')],
    ['bare timeout value', (argv: string[]) => argv.push('5000')],
    [
      'duplicate config path',
      (argv: string[]) =>
        argv.push(`--config=${snapshotDirectory}/bunfig.toml`, `--config=${snapshotDirectory}/bunfig.toml`),
    ],
    ['foreign config path', (argv: string[]) => argv.push('--config=/synthetic/foreign/bunfig.toml')],
    [
      'duplicate preload path',
      (argv: string[]) =>
        argv.push(
          '--preload',
          `${snapshotDirectory}/tooling/bun-coverage-preload.ts`,
          '--preload',
          `${snapshotDirectory}/tooling/bun-coverage-preload.ts`,
        ),
    ],
    ['foreign preload path', (argv: string[]) => argv.push('--preload', '/synthetic/foreign/bun-coverage-preload.ts')],
    ['duplicate junit reporter', (argv: string[]) => argv.push('--reporter=junit', '--reporter=junit')],
    [
      'duplicate junit output path',
      (argv: string[]) =>
        argv.push(
          `--reporter-outfile=${invocations[0]!.output_paths.junit_file}`,
          `--reporter-outfile=${invocations[0]!.output_paths.junit_file}`,
        ),
    ],
    ['foreign junit output path', (argv: string[]) => argv.push('--reporter-outfile=/synthetic/foreign/report.xml')],
  ])('rejects %s', (_label, mutate) => {
    expectUnsafeArgvRejected(mutate);
  });

  test('rejects colliding shard outputs and paths inside the immutable snapshot', () => {
    const collisionInvocations = structuredClone(invocations);
    collisionInvocations[1]!.output_paths.log_file = collisionInvocations[0]!.output_paths.log_file;
    const collisionRun = {
      ...run,
      shard_invocations: collisionInvocations,
      assignment_plan_sha256: coverageAssignmentPlanSha256(plan, collisionInvocations),
    };
    expect(() => validateCoverageShardEvidence({ run: collisionRun, plan, ...completeEvidence() })).toThrow(
      /overlap|collide|alias/u,
    );

    const snapshotInvocations = structuredClone(invocations);
    snapshotInvocations[0]!.output_paths.temp_directory = snapshotDirectory;
    const snapshotRun = {
      ...run,
      shard_invocations: snapshotInvocations,
      assignment_plan_sha256: coverageAssignmentPlanSha256(plan, snapshotInvocations),
    };
    expect(() => validateCoverageShardEvidence({ run: snapshotRun, plan, ...completeEvidence() })).toThrow(
      /immutable snapshot/u,
    );
  });

  test('rejects overlapping output roles within one shard while preserving its other valid receipts', () => {
    const changedInvocations = structuredClone(invocations);
    const first = changedInvocations[0]!;
    first.output_paths.junit_file = `${first.output_paths.coverage_directory}/suite.junit.xml`;
    const changedRun = {
      ...run,
      shard_invocations: changedInvocations,
      assignment_plan_sha256: coverageAssignmentPlanSha256(plan, changedInvocations),
    };
    const all = rebindEvidence(changedRun, changedInvocations);
    expect(() => validateCoverageShardEvidence({ run: changedRun, plan, ...all })).toThrow(/overlap|alias|disjoint/u);
  });

  test('requires the exact five output role names', () => {
    const changedInvocations = structuredClone(invocations);
    const outputPaths = changedInvocations[0]!.output_paths as Record<string, string>;
    const coverageDirectory = outputPaths.coverage_directory!;
    delete outputPaths.coverage_directory;
    outputPaths.unrecognized_output = coverageDirectory;
    const changedRun = {
      ...run,
      shard_invocations: changedInvocations,
      assignment_plan_sha256: coverageAssignmentPlanSha256(plan, changedInvocations),
    };
    const all = rebindEvidence(changedRun, changedInvocations);
    expect(() => validateCoverageShardEvidence({ run: changedRun, plan, ...all })).toThrow(/output path|role/u);
  });

  test('rejects shard IDs that are unsafe path components', () => {
    const unsafePlan = structuredClone(plan);
    const assignment = unsafePlan.waves[0]!.assignments[0]!;
    const originalShardId = assignment.shard_id;
    assignment.shard_id = '../unsafe';
    const unsafeInvocations = structuredClone(invocations);
    const invocation = unsafeInvocations.find(({ shard_id }) => shard_id === originalShardId)!;
    invocation.shard_id = '../unsafe';
    const unsafeRun = {
      ...run,
      shard_invocations: unsafeInvocations,
      assignment_plan_sha256: coverageAssignmentPlanSha256(unsafePlan, unsafeInvocations),
    };
    const rebound = rebindEvidence(unsafeRun, unsafeInvocations);
    const reboundChild = rebound.processes.find(({ shard_id }) => shard_id === originalShardId)!;
    const reboundTerminal = rebound.terminals.find(({ shard_id }) => shard_id === originalShardId)!;
    reboundChild.shard_id = '../unsafe';
    reboundTerminal.shard_id = '../unsafe';
    expect(() => validateCoverageShardEvidence({ run: unsafeRun, plan: unsafePlan, ...rebound })).toThrow(
      /shard ID|shard identifier|path component/u,
    );
  });

  test('merges sparse canonical Istanbul maps and rejects foreign keys, bad counters and overflow', () => {
    const expected = { [source]: sourceMap(source), [secondSource]: sourceMap(secondSource) };
    const merged = mergeCoverageShardCounters(expected, [
      { [source]: sourceMap(source, 2) },
      { [secondSource]: sourceMap(secondSource, 3) },
      { [source]: sourceMap(source, 4) },
    ]);
    expect(merged).toEqual({
      [source]: sourceMap(source, 6),
      [secondSource]: sourceMap(secondSource, 3),
    });
    expect(() => mergeCoverageShardCounters(expected, [{ 'src/foreign.ts': sourceMap('src/foreign.ts', 1) }])).toThrow(
      /outside maintained inventory/u,
    );
    expect(() => mergeCoverageShardCounters(expected, [{ [source]: sourceMap(source, -1) }])).toThrow(
      /Invalid counter/u,
    );
    expect(() =>
      mergeCoverageShardCounters(expected, [
        { [source]: sourceMap(source, Number.MAX_SAFE_INTEGER) },
        { [source]: sourceMap(source, 1) },
      ]),
    ).toThrow(/Invalid counter/u);
    const altered = sourceMap(source, 1);
    altered.statementMap['0']!.end.line = 2;
    expect(() => mergeCoverageShardCounters(expected, [{ [source]: altered }])).toThrow(/source map changed/u);
  });
});
