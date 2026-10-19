import type { FileCoverageData } from 'istanbul-lib-instrument';
import path from 'node:path';
import { lstatSync } from 'node:fs';
import coverageApi from 'istanbul-lib-coverage';
import { validateIstanbulFileCoverage } from './coverage-counters.ts';
import { canonicalJson, sha256 } from './bun-coverage-evidence.ts';
import type { InputDigest } from './bun-coverage-evidence.ts';
import type { CoverageShardPlan } from './coverage-shard-plan.ts';

export type CoverageShardRunBinding = {
  schema: 'VidaBunCoverageRun/v3';
  run_id: string;
  source_fingerprint: string;
  test_fingerprint: string;
  tool_fingerprint: string;
  runtime_executable_sha256: string;
  assignment_plan_sha256: string;
  tests: string[];
  selected_test_inputs: InputDigest[];
  shard_invocations: CoverageShardInvocation[];
  snapshot_directory: string;
};

export type CoverageShardInvocation = {
  shard_id: string;
  argv: string[];
  cwd: string;
  environment_sha256: string;
  output_paths: {
    coverage_directory: string;
    junit_file: string;
    log_file: string;
    receipt_directory: string;
    temp_directory: string;
  };
};

/** One canonical output layout, shared by launch preparation and report admission. */
export function coverageShardOutputPaths(
  root: string,
  runId: string,
  shardId: string,
  temporaryRoot?: string,
  selectionMode: 'full-current-test-set' | 'focused-diagnostic' = 'full-current-test-set',
): CoverageShardInvocation['output_paths'] {
  const runDirectory = path.join(
    root,
    'coverage',
    'bun-unified',
    ...(selectionMode === 'focused-diagnostic' ? ['diagnostics'] : []),
    'runs',
    runId,
  );
  const shardRoot = path.join(runDirectory, 'shards', shardId);
  return {
    coverage_directory: path.join(shardRoot, 'coverage'),
    junit_file: path.join(shardRoot, 'suite.junit.xml'),
    log_file: path.join(shardRoot, 'child.log'),
    receipt_directory: path.join(runDirectory, 'processes', shardId),
    temp_directory: temporaryRoot
      ? path.join(temporaryRoot, 'vida-coverage-' + runId, shardId, 'tmp')
      : path.join(shardRoot, 'tmp'),
  };
}

type CoverageShardAssignment = CoverageShardPlan['waves'][number]['assignments'][number];

function parsedStringList(value: unknown): string[] | undefined {
  const items = unknownArray(value);
  if (!items) return undefined;
  const result: string[] = [];
  for (const item of items) {
    if (typeof item !== 'string') return undefined;
    result.push(item);
  }
  return result;
}

export function decodeCoverageShardPlan(value: unknown): CoverageShardPlan | undefined {
  const candidate = record(value);
  const waveRows = unknownArray(candidate?.waves);
  if (
    !candidate ||
    Object.keys(candidate).sort().join(',') !== 'concurrency,schema,waves' ||
    candidate.schema !== 'VidaCoverageShardPlan/v1' ||
    candidate.concurrency !== 2 ||
    !waveRows
  )
    return undefined;
  const waves: CoverageShardPlan['waves'][number][] = [];
  for (const waveValue of waveRows) {
    const wave = record(waveValue);
    const assignmentRows = unknownArray(wave?.assignments);
    if (
      !wave ||
      Object.keys(wave).sort().join(',') !== 'assignments,exclusive' ||
      typeof wave.exclusive !== 'boolean' ||
      !assignmentRows
    )
      return undefined;
    const assignments: CoverageShardAssignment[] = [];
    for (const assignmentValue of assignmentRows) {
      const assignment = record(assignmentValue);
      const tests = parsedStringList(assignment?.tests);
      const sharedResources = parsedStringList(assignment?.shared_resources);
      if (
        !assignment ||
        Object.keys(assignment).sort().join(',') !== 'selection_sha256,shard_id,shared_resources,tests' ||
        typeof assignment.shard_id !== 'string' ||
        typeof assignment.selection_sha256 !== 'string' ||
        !tests ||
        !sharedResources
      )
        return undefined;
      assignments.push({
        shard_id: assignment.shard_id,
        tests,
        selection_sha256: assignment.selection_sha256,
        shared_resources: sharedResources,
      });
    }
    waves.push({ exclusive: wave.exclusive, assignments });
  }
  return { schema: 'VidaCoverageShardPlan/v1', concurrency: 2, waves };
}

export function decodeCoverageShardInvocations(value: unknown): CoverageShardInvocation[] | undefined {
  const rows = unknownArray(value);
  if (!rows) return undefined;
  const invocations: CoverageShardInvocation[] = [];
  for (const rowValue of rows) {
    const row = record(rowValue);
    const paths = record(row?.output_paths);
    const argv = parsedStringList(row?.argv);
    if (
      paths &&
      Object.keys(paths).sort().join(',') !== 'coverage_directory,junit_file,log_file,receipt_directory,temp_directory'
    )
      failClaim('Coverage shard output path roles are malformed.');
    if (
      !row ||
      Object.keys(row).sort().join(',') !== 'argv,cwd,environment_sha256,output_paths,shard_id' ||
      typeof row.shard_id !== 'string' ||
      typeof row.cwd !== 'string' ||
      typeof row.environment_sha256 !== 'string' ||
      !argv ||
      !paths ||
      Object.keys(paths).sort().join(',') !==
        'coverage_directory,junit_file,log_file,receipt_directory,temp_directory' ||
      typeof paths.coverage_directory !== 'string' ||
      typeof paths.junit_file !== 'string' ||
      typeof paths.log_file !== 'string' ||
      typeof paths.receipt_directory !== 'string' ||
      typeof paths.temp_directory !== 'string'
    )
      return undefined;
    invocations.push({
      shard_id: row.shard_id,
      argv,
      cwd: row.cwd,
      environment_sha256: row.environment_sha256,
      output_paths: {
        coverage_directory: paths.coverage_directory,
        junit_file: paths.junit_file,
        log_file: paths.log_file,
        receipt_directory: paths.receipt_directory,
        temp_directory: paths.temp_directory,
      },
    });
  }
  return invocations;
}

export function coverageOutputPathsSha256(paths: CoverageShardInvocation['output_paths']): string {
  const serialized = canonicalJson(paths);
  if (serialized === undefined) throw new Error('Coverage shard output path record cannot be serialized.');
  return sha256(serialized);
}

export function coverageAssignmentPlanSha256(
  plan: CoverageShardPlan,
  invocations: readonly CoverageShardInvocation[],
): string {
  const serialized = canonicalJson({ plan, shard_invocations: invocations });
  if (serialized === undefined) throw new Error('Coverage shard execution plan cannot be serialized.');
  return sha256(serialized);
}

function pathOverlaps(left: string, right: string): boolean {
  const leftToRight = path.relative(left, right);
  const rightToLeft = path.relative(right, left);
  return (
    leftToRight === '' ||
    rightToLeft === '' ||
    (!leftToRight.startsWith(`..${path.sep}`) && !path.isAbsolute(leftToRight)) ||
    (!rightToLeft.startsWith(`..${path.sep}`) && !path.isAbsolute(rightToLeft))
  );
}

function validateInvocationOutputs(invocations: readonly CoverageShardInvocation[], snapshotDirectory: string): void {
  const all: Array<{ shard: string; absolute: string }> = [];
  const physicalOwners = new Map<string, string>();
  for (const invocation of invocations) {
    if (typeof invocation.output_paths !== 'object' || invocation.output_paths === null)
      failClaim('Coverage shard output paths are missing.');
    const expectedRoles = ['coverage_directory', 'junit_file', 'log_file', 'receipt_directory', 'temp_directory'];
    const paths = Object.entries(invocation.output_paths);
    if (
      JSON.stringify(paths.map(([role]) => role).sort()) !== JSON.stringify(expectedRoles) ||
      paths.some(([, value]) => typeof value !== 'string')
    )
      failClaim('Coverage shard output path set is malformed.');
    const absolute = paths.map(([role, value]) => {
      if (!path.isAbsolute(value) || path.resolve(value) !== value)
        return failClaim('Coverage shard output path is not canonical and absolute.');
      if (pathOverlaps(value, snapshotDirectory))
        failClaim('Coverage shard output path overlaps the immutable snapshot.');
      let current = path.parse(value).root;
      const segments = value.slice(current.length).split(path.sep).filter(Boolean);
      for (let index = 0; index < segments.length; index++) {
        current = path.join(current, segments[index]!);
        let stat;
        try {
          stat = lstatSync(current);
        } catch (error) {
          if (typeof error !== 'object' || error === null || !('code' in error) || error.code !== 'ENOENT') throw error;
          break;
        }
        if (stat.isSymbolicLink()) failClaim('Coverage shard output path traverses a symbolic link.');
        if (index < segments.length - 1 && !stat.isDirectory())
          failClaim('Coverage shard output path has a non-directory parent.');
        if (index === segments.length - 1) {
          const identity = `${stat.dev}:${stat.ino}`;
          const prior = physicalOwners.get(identity);
          if (prior && prior !== `${invocation.shard_id}:${role}`)
            failClaim('Coverage shard output paths alias a physical file or directory.');
          physicalOwners.set(identity, `${invocation.shard_id}:${role}`);
        }
      }
      return { role, absolute: value };
    });
    all.push(...absolute.map(({ absolute: value }) => ({ shard: invocation.shard_id, absolute: value })));
  }
  for (let index = 0; index < all.length; index++) {
    const current = all[index]!;
    for (let other = index + 1; other < all.length; other++) {
      const next = all[other]!;
      if (pathOverlaps(current.absolute, next.absolute))
        failClaim('Coverage shard output paths alias or overlap within or across assignments.');
    }
  }
}

export type CoverageShardProcessEvidence = {
  schema: 'VidaBunCoverageProcess/v2';
  run_id: string;
  shard_id: string;
  pid: number;
  source_fingerprint: string;
  test_fingerprint: string;
  tool_fingerprint: string;
  runtime_executable_sha256: string;
  assignment_plan_sha256: string;
  assigned_tests: string[];
  shard_selection_sha256: string;
  active_argv: string[];
  cwd: string;
  environment_sha256: string;
  output_paths_sha256: string;
  coverage: Record<string, unknown>;
};

export function decodeCoverageShardProcessEvidence(value: unknown): CoverageShardProcessEvidence | undefined {
  const row = record(value);
  const assignedTests = parsedStringList(row?.assigned_tests);
  const activeArgv = parsedStringList(row?.active_argv);
  const coverage = record(row?.coverage);
  if (
    !row ||
    row.schema !== 'VidaBunCoverageProcess/v2' ||
    typeof row.run_id !== 'string' ||
    typeof row.shard_id !== 'string' ||
    typeof row.pid !== 'number' ||
    !Number.isSafeInteger(row.pid) ||
    typeof row.source_fingerprint !== 'string' ||
    typeof row.test_fingerprint !== 'string' ||
    typeof row.tool_fingerprint !== 'string' ||
    typeof row.runtime_executable_sha256 !== 'string' ||
    typeof row.assignment_plan_sha256 !== 'string' ||
    !assignedTests ||
    typeof row.shard_selection_sha256 !== 'string' ||
    !activeArgv ||
    typeof row.cwd !== 'string' ||
    typeof row.environment_sha256 !== 'string' ||
    typeof row.output_paths_sha256 !== 'string' ||
    !coverage
  )
    return undefined;
  return {
    schema: 'VidaBunCoverageProcess/v2',
    run_id: row.run_id,
    shard_id: row.shard_id,
    pid: row.pid,
    source_fingerprint: row.source_fingerprint,
    test_fingerprint: row.test_fingerprint,
    tool_fingerprint: row.tool_fingerprint,
    runtime_executable_sha256: row.runtime_executable_sha256,
    assignment_plan_sha256: row.assignment_plan_sha256,
    assigned_tests: assignedTests,
    shard_selection_sha256: row.shard_selection_sha256,
    active_argv: activeArgv,
    cwd: row.cwd,
    environment_sha256: row.environment_sha256,
    output_paths_sha256: row.output_paths_sha256,
    coverage,
  };
}

export type CoverageShardTerminalEvidence = {
  run_id: string;
  shard_id: string;
  pid: number;
  status: number | null;
  signal: string | null;
  error: string | null;
  unknown: boolean;
};

function failClaim(message: string): never {
  throw new Error(message);
}

function unknownArray(value: unknown): readonly unknown[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value as unknown[];
}

function record(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function stringList(value: unknown, label: string): string[] {
  const items = unknownArray(value);
  if (!items) return failClaim(`Invalid ${label}.`);
  const result: string[] = [];
  for (const item of items) {
    if (typeof item !== 'string') return failClaim(`Invalid ${label}.`);
    result.push(item);
  }
  return result;
}

function validShardId(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(value);
}

function digestRows(value: unknown): InputDigest[] {
  const entries = unknownArray(value);
  if (!entries) return failClaim('Captured selected test inputs are missing.');
  const rows: InputDigest[] = [];
  const seen = new Set<string>();
  for (const raw of entries) {
    const item = record(raw);
    if (
      !item ||
      Object.keys(item).sort().join(',') !== 'path,sha256' ||
      typeof item.path !== 'string' ||
      typeof item.sha256 !== 'string' ||
      !/^[0-9a-f]{64}$/u.test(item.sha256) ||
      seen.has(item.path)
    )
      return failClaim('Captured selected test input digest is malformed or duplicated.');
    seen.add(item.path);
    rows.push({ path: item.path, sha256: item.sha256 });
  }
  return rows;
}

function sortedUnique(values: readonly string[], message: string): string[] {
  if (new Set(values).size !== values.length) return failClaim(message);
  return [...values].sort();
}

function assertArgvSelection(
  argv: readonly string[],
  selected: readonly string[],
  assigned: readonly string[],
  invocation: CoverageShardInvocation,
  snapshotDirectory: string,
): void {
  const parallelFlags = argv.filter((argument) => argument === '--parallel' || argument.startsWith('--parallel='));
  const timeoutFlags = argv.filter((argument) => argument === '--timeout' || argument.startsWith('--timeout='));
  const isolationFlags = argv.filter((argument) => argument === '--isolate' || argument === '--no-isolate');
  if (
    argv[0] !== 'test' ||
    parallelFlags.length !== 1 ||
    parallelFlags[0] !== '--parallel=1' ||
    argv.filter((argument) => argument === '--concurrent' || argument.startsWith('--concurrent=')).length > 0 ||
    isolationFlags.length !== 1 ||
    isolationFlags[0] !== '--no-isolate' ||
    timeoutFlags.length !== 1 ||
    timeoutFlags[0] !== '--timeout' ||
    argv[argv.indexOf('--timeout') + 1] !== '5000'
  )
    failClaim('Coverage shard argv must use the sealed serial-test argument guards.');
  const selectedSet = new Set(selected);
  const testArgument =
    /^(?:\.\/)?tests\/(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]+\.(?:test|spec)\.(?:js|mjs|cjs|jsx|ts|mts|cts|tsx)$/u;
  const allowedOptions = new Set(['--parallel=1', '--no-isolate', '--timeout']);
  const optionalSeen = new Set<string>();
  const snapshotConfig = path.join(snapshotDirectory, 'bunfig.toml');
  const snapshotPreload = path.join(snapshotDirectory, 'tooling', 'bun-coverage-preload.ts');
  const optionlessTestArguments = argv.slice(1);
  for (let index = 0; index < optionlessTestArguments.length; index++) {
    const argument = optionlessTestArguments[index]!;
    if (testArgument.test(argument)) continue;
    if (allowedOptions.has(argument)) {
      if (argument === '--timeout') index++;
      continue;
    }
    const isConfig = argument.startsWith('--config=');
    const isPreload = argument === '--preload';
    const isReporter = argument === '--reporter=junit';
    const isReporterOutput = argument.startsWith('--reporter-outfile=');
    if (isConfig || isPreload || isReporter || isReporterOutput) {
      const optionName = isConfig ? 'config' : isPreload ? 'preload' : isReporter ? 'reporter' : 'reporter-outfile';
      if (optionalSeen.has(optionName)) failClaim(`Coverage shard argv duplicates the ${optionName} option.`);
      optionalSeen.add(optionName);
      const optionValue = isConfig
        ? argument.slice('--config='.length)
        : isPreload
          ? optionlessTestArguments[index + 1]
          : isReporterOutput
            ? argument.slice('--reporter-outfile='.length)
            : undefined;
      const expectedValue = isConfig
        ? snapshotConfig
        : isPreload
          ? snapshotPreload
          : isReporterOutput
            ? invocation.output_paths.junit_file
            : undefined;
      if (expectedValue !== undefined && optionValue !== expectedValue)
        failClaim(`Coverage shard argv ${optionName} differs from its sealed path binding.`);
      if (isPreload) {
        if (optionValue === undefined) failClaim('Coverage shard argv preload path is missing.');
        index++;
      }
      continue;
    }
    failClaim('Coverage shard argv contains an unapproved test-selection modifier or option.');
  }
  for (const argument of argv)
    if (testArgument.test(argument) && !selectedSet.has(argument.replace(/^\.\//u, '')))
      failClaim('Coverage shard argv contains an unselected sibling test.');
  const argvTests = argv
    .filter((argument) => testArgument.test(argument))
    .map((argument) => argument.replace(/^\.\//u, ''));
  if (argv.filter((argument) => testArgument.test(argument)).some((argument) => !argument.startsWith('./')))
    failClaim('Coverage shard argv must use explicit paths for every assigned test.');
  if (
    JSON.stringify(sortedUnique(argvTests, 'Shard argv contains a duplicate selected test.')) !==
    JSON.stringify(sortedUnique(assigned, 'Shard assignment contains a duplicate test.'))
  )
    failClaim('Coverage shard argv does not name its exact assigned tests.');
}

type CoverageShardPlanBinding = {
  assignments: Map<string, CoverageShardPlan['waves'][number]['assignments'][number]>;
  invocations: Map<string, CoverageShardInvocation>;
};

/** Shared manifest/plan validation used by the preload and report consumer. */
function validateCoverageShardPlanBinding(
  run: CoverageShardRunBinding,
  plan: CoverageShardPlan,
): CoverageShardPlanBinding {
  if (
    run.schema !== 'VidaBunCoverageRun/v3' ||
    typeof run.run_id !== 'string' ||
    !/^[0-9a-f-]{36}$/u.test(run.run_id) ||
    !/^[0-9a-f]{64}$/u.test(run.source_fingerprint) ||
    !/^[0-9a-f]{64}$/u.test(run.test_fingerprint) ||
    !/^[0-9a-f]{64}$/u.test(run.tool_fingerprint) ||
    !/^[0-9a-f]{64}$/u.test(run.runtime_executable_sha256) ||
    typeof run.snapshot_directory !== 'string' ||
    !path.isAbsolute(run.snapshot_directory) ||
    !unknownArray(run.tests)
  )
    failClaim('Versioned coverage run identity or global input binding is invalid.');
  const globalTests = stringList(run.tests, 'global selected tests');
  const testInputs = digestRows(run.selected_test_inputs);
  const normalizedPlan = decodeCoverageShardPlan(plan);
  const invocationRows = decodeCoverageShardInvocations(run.shard_invocations);
  if (!normalizedPlan || !invocationRows) failClaim('Coverage assignment plan or invocation structure is malformed.');
  const sortedGlobalTests = sortedUnique(globalTests, 'Global selected test list contains duplicates.');
  const sortedInputPaths = sortedUnique(
    testInputs.map(({ path: file }) => file),
    'Captured selected test inputs contain duplicates.',
  );
  if (JSON.stringify(sortedGlobalTests) !== JSON.stringify(sortedInputPaths))
    failClaim('Captured test input digests do not cover the complete global selection.');
  if (coverageAssignmentPlanSha256(normalizedPlan, invocationRows) !== run.assignment_plan_sha256)
    failClaim('Coverage assignment plan binding digest or schema is stale.');

  const inputByPath = new Map(testInputs.map((row) => [row.path, row]));
  const allAssignments = normalizedPlan.waves.flatMap((wave) => {
    if (
      wave.assignments.length === 0 ||
      (wave.exclusive && wave.assignments.length !== 1) ||
      (!wave.exclusive && wave.assignments.length > 2)
    )
      failClaim('Coverage shard wave is malformed.');
    return wave.assignments;
  });
  const assignedTests: string[] = [];
  const assignments = new Map<string, CoverageShardAssignment>();
  for (const assignment of allAssignments) {
    if (
      !assignment ||
      typeof assignment.shard_id !== 'string' ||
      assignments.has(assignment.shard_id) ||
      assignment.tests.length === 0 ||
      !/^[0-9a-f]{64}$/u.test(assignment.selection_sha256)
    )
      failClaim('Coverage assignment is malformed or duplicated.');
    if (!validShardId(assignment.shard_id)) failClaim('Coverage shard ID is not a safe path component.');
    const claimed = stringList(assignment.tests, 'assigned test claim');
    if (new Set(claimed).size !== claimed.length) failClaim('Coverage assignment contains a duplicate test claim.');
    const selectedRows = claimed.map((file) => {
      const row = inputByPath.get(file);
      if (!row) return failClaim('Coverage assignment claims a sibling or foreign test.');
      return { path: row.path, sha256: row.sha256 };
    });
    if (sha256(canonicalJson(selectedRows) ?? '') !== assignment.selection_sha256)
      failClaim('Coverage shard selection digest differs from captured test inputs.');
    const resources = stringList(assignment.shared_resources, 'assignment shared resources');
    if (
      JSON.stringify(resources) !== JSON.stringify(sortedUnique(resources, 'Assignment resources contain duplicates.'))
    )
      failClaim('Coverage assignment resources are duplicated or noncanonical.');
    assignedTests.push(...claimed);
    assignments.set(assignment.shard_id, assignment);
  }
  for (const wave of normalizedPlan.waves) {
    if (wave.exclusive) continue;
    const resources = new Set<string>();
    for (const assignment of wave.assignments) {
      for (const resource of assignment.shared_resources) {
        if (resources.has(resource)) failClaim('Coverage shard wave overlaps a shared resource.');
        resources.add(resource);
      }
    }
  }
  if (
    JSON.stringify(sortedUnique(assignedTests, 'Coverage assignments duplicate a selected test.')) !==
    JSON.stringify(sortedGlobalTests)
  )
    failClaim('Coverage assignment union differs from the complete global selection.');

  const invocations = new Map<string, CoverageShardInvocation>();
  for (const invocation of invocationRows) {
    if (
      !assignments.has(invocation.shard_id) ||
      invocations.has(invocation.shard_id) ||
      invocation.argv.length === 0 ||
      typeof invocation.cwd !== 'string' ||
      invocation.cwd.length === 0 ||
      !/^[0-9a-f]{64}$/u.test(invocation.environment_sha256)
    )
      failClaim('Coverage shard argv, cwd or environment binding is malformed.');
    invocations.set(invocation.shard_id, invocation);
  }
  if (invocations.size !== assignments.size)
    failClaim('Coverage shard invocation bindings do not cover every assignment.');
  validateInvocationOutputs(invocationRows, path.resolve(run.snapshot_directory));
  for (const [shardId, assignment] of assignments) {
    const invocation = invocations.get(shardId);
    if (!invocation) failClaim('Coverage shard invocation binding is missing.');
    assertArgvSelection(
      invocation.argv,
      globalTests,
      assignment.tests,
      invocation,
      path.resolve(run.snapshot_directory),
    );
  }
  return { assignments, invocations };
}

/** Reuse the manifest/plan guards before any launch or output creation. */
export function validateCoverageShardLaunchBinding(
  run: CoverageShardRunBinding,
  plan: CoverageShardPlan,
  root: string,
  temporaryRoot: string,
): void {
  validateCoverageShardPlanBinding(run, plan);
  validateCoverageShardOutputLayout(run, root, temporaryRoot);
}

/** Enforce the same canonical output ownership at launch and report admission. */
export function validateCoverageShardOutputLayout(
  run: CoverageShardRunBinding,
  root: string,
  temporaryRoot?: string,
): void {
  if (
    temporaryRoot !== undefined &&
    (!path.isAbsolute(temporaryRoot) ||
      path.resolve(temporaryRoot) !== temporaryRoot ||
      run.shard_invocations.some(({ output_paths }) => pathOverlaps(output_paths.temp_directory, root)))
  )
    failClaim('Coverage shard temporary root must be canonical and outside the editable package.');
  for (const invocation of run.shard_invocations) {
    const focusedSnapshot = path.join(root, 'coverage', 'bun-unified', 'diagnostics', 'runs', run.run_id, 'snapshot');
    const selectionMode = run.snapshot_directory === focusedSnapshot ? 'focused-diagnostic' : 'full-current-test-set';
    if (
      invocation.cwd !== root ||
      JSON.stringify(invocation.output_paths) !==
        JSON.stringify(coverageShardOutputPaths(root, run.run_id, invocation.shard_id, temporaryRoot, selectionMode))
    )
      failClaim('Coverage shard launch paths differ from their canonical run layout.');
    for (const required of temporaryRoot === undefined
      ? []
      : ['--preload', '--reporter=junit', '--config=', '--reporter-outfile='])
      if (!invocation.argv.some((arg) => (required.endsWith('=') ? arg.startsWith(required) : arg === required)))
        failClaim('Coverage shard launch omits a required runner option.');
  }
}

/** Validate one preload's assigned selection using only captured run rows. */
export function validateCoverageShardPreloadAssignment(input: {
  run: CoverageShardRunBinding;
  plan: CoverageShardPlan;
  shard_id: string;
  assigned_tests: readonly string[];
  shard_selection_sha256: string;
}): void {
  const { run, plan, shard_id, assigned_tests, shard_selection_sha256 } = input;
  const planBinding = validateCoverageShardPlanBinding(run, plan);
  const assignment = planBinding.assignments.get(shard_id);
  if (!assignment) failClaim('Coverage preload shard is absent from its run plan.');
  const claimed = stringList(assigned_tests, 'preload assigned tests');
  if (
    JSON.stringify(sortedUnique(claimed, 'Preload assigned tests contain duplicates.')) !==
    JSON.stringify(sortedUnique(assignment.tests, 'Plan assignment contains duplicates.'))
  )
    failClaim('Coverage preload test selection differs from its plan assignment.');
  if (assignment.selection_sha256 !== shard_selection_sha256)
    failClaim('Coverage preload shard selection digest is stale.');
}

/** Validate v3 global bindings and exact v2 per-shard claims before any merge. */
export function validateCoverageShardEvidence(input: {
  run: CoverageShardRunBinding;
  plan: CoverageShardPlan;
  processes: readonly CoverageShardProcessEvidence[];
  terminals: readonly CoverageShardTerminalEvidence[];
}): void {
  const { run, plan, processes, terminals } = input;
  if (
    run.schema !== 'VidaBunCoverageRun/v3' ||
    typeof run.run_id !== 'string' ||
    !/^[0-9a-f-]{36}$/u.test(run.run_id) ||
    !/^[0-9a-f]{64}$/u.test(run.source_fingerprint) ||
    !/^[0-9a-f]{64}$/u.test(run.test_fingerprint) ||
    !/^[0-9a-f]{64}$/u.test(run.tool_fingerprint) ||
    !/^[0-9a-f]{64}$/u.test(run.runtime_executable_sha256)
  )
    failClaim('Versioned coverage run identity or global input binding is invalid.');
  const planBinding = validateCoverageShardPlanBinding(run, plan);
  const { assignments: assignmentByShard, invocations: invocationByShard } = planBinding;

  if (processes.length !== assignmentByShard.size || terminals.length !== assignmentByShard.size)
    failClaim('Coverage shard process or terminal receipt is missing or duplicated.');
  const processByShard = new Map<string, CoverageShardProcessEvidence>();
  const pids = new Set<number>();
  for (const process of processes) {
    const assignment = assignmentByShard.get(process.shard_id);
    const invocation = invocationByShard.get(process.shard_id);
    if (!assignment || processByShard.has(process.shard_id))
      failClaim('Coverage shard process receipt is foreign or duplicated.');
    if (
      process.schema !== 'VidaBunCoverageProcess/v2' ||
      process.run_id !== run.run_id ||
      process.source_fingerprint !== run.source_fingerprint ||
      process.test_fingerprint !== run.test_fingerprint ||
      process.tool_fingerprint !== run.tool_fingerprint ||
      process.runtime_executable_sha256 !== run.runtime_executable_sha256
    )
      failClaim('Coverage process belongs to another run or input set.');
    if (process.assignment_plan_sha256 !== run.assignment_plan_sha256)
      failClaim('Coverage process assignment plan digest is stale.');
    if (!invocation) failClaim('Coverage process has no shard invocation binding.');
    if (JSON.stringify(process.active_argv) !== JSON.stringify(invocation.argv))
      failClaim('Coverage process argv differs from the sealed shard invocation.');
    if (process.cwd !== invocation.cwd) failClaim('Coverage process cwd differs from the sealed shard invocation.');
    if (process.environment_sha256 !== invocation.environment_sha256)
      failClaim('Coverage process environment digest differs from the sealed shard invocation.');
    if (process.output_paths_sha256 !== coverageOutputPathsSha256(invocation.output_paths))
      failClaim('Coverage process output path digest differs from the sealed shard invocation.');
    if (!Number.isSafeInteger(process.pid) || process.pid < 1 || pids.has(process.pid))
      failClaim('Coverage process PID is invalid or duplicated.');
    const claimedTests = sortedUnique(
      stringList(process.assigned_tests, 'process assigned tests'),
      'Process assigned test claim contains duplicates.',
    );
    if (
      JSON.stringify(claimedTests) !==
      JSON.stringify(sortedUnique(assignment.tests, 'Assignment tests have duplicates.'))
    )
      failClaim('Coverage process assigned test claim differs from its shard selection.');
    if (process.shard_selection_sha256 !== assignment.selection_sha256)
      failClaim('Coverage process shard selection digest is stale.');
    pids.add(process.pid);
    processByShard.set(process.shard_id, process);
  }
  const terminalByShard = new Map<string, CoverageShardTerminalEvidence>();
  for (const terminal of terminals) {
    const process = processByShard.get(terminal.shard_id);
    if (
      !process ||
      terminalByShard.has(terminal.shard_id) ||
      terminal.run_id !== run.run_id ||
      terminal.pid !== process.pid ||
      terminal.status !== 0 ||
      terminal.signal !== null ||
      terminal.error !== null ||
      terminal.unknown !== false
    )
      failClaim('Coverage shard terminal receipt is missing, stale or nonterminal.');
    terminalByShard.set(terminal.shard_id, terminal);
  }
}

/** Seed immutable canonical zero maps, merge sparse shard maps, and validate the final sums. */
export function mergeCoverageShardCounters(
  expectedSourceMaps: Readonly<Record<string, FileCoverageData>>,
  maps: readonly Record<string, unknown>[],
): Record<string, FileCoverageData> {
  const expectedPaths = Object.keys(expectedSourceMaps).sort();
  if (expectedPaths.length === 0 || new Set(expectedPaths).size !== expectedPaths.length)
    failClaim('Canonical coverage Source map domain is empty or duplicated.');
  const merged = coverageApi.createCoverageMap(structuredClone(expectedSourceMaps));
  for (const shardCoverage of maps) {
    for (const [file, rawCoverage] of Object.entries(shardCoverage)) {
      if (!Object.hasOwn(expectedSourceMaps, file))
        failClaim(`Coverage process source is outside maintained inventory: ${file}`);
      validateIstanbulFileCoverage(file, rawCoverage, expectedSourceMaps[file]);
    }
    merged.merge(shardCoverage as Record<string, FileCoverageData>);
  }
  const result = Object.fromEntries(merged.files().map((file) => [file, merged.fileCoverageFor(file).toJSON()]));
  if (JSON.stringify(Object.keys(result).sort()) !== JSON.stringify(expectedPaths))
    failClaim('Merged coverage source domain differs from the canonical Source maps.');
  for (const [file, coverage] of Object.entries(result))
    validateIstanbulFileCoverage(file, coverage, expectedSourceMaps[file]);
  return result;
}
