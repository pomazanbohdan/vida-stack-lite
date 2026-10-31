import { mkdir, mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { executionBudget } from '../bin/bun.ts';
import { executeMutationCommand, junitOutcome, type MutationProcessResult } from './mutation-evidence.ts';

const selectedTests = [
  'tests/windows-owned-process.test.ts',
  'tests/version-policy.test.ts',
  'tests/release-ci-producer.test.ts',
  'tests/release-github-publication.test.ts',
  'tests/measured-quality-maxima.test.ts',
];

type CaseCounts = { passed: number; skipped: number; failed: number; error: number };

export type WindowsPushProfileSummary = {
  schema: 'VidaWindowsPushProfile/v1';
  platform: 'win32-x64';
  selected_files: number;
  passed_files: number;
  passed_cases: number;
  skipped_cases: number;
  failed_cases: number;
  error_cases: number;
  junit_file: string;
  evidence_scope: 'selected Windows push-profile tests only';
};

export function validateWindowsPushProfileJUnit(xml: string): CaseCounts {
  const countsByFile = new Map<string, CaseCounts>();
  const outcome = junitOutcome(xml, selectedTests, [], [], (testcase) => {
    const counts = countsByFile.get(testcase.test_file) ?? { passed: 0, skipped: 0, failed: 0, error: 0 };
    counts[testcase.outcome === 'passed' ? 'passed' : testcase.outcome === 'skipped' ? 'skipped' : testcase.outcome] +=
      1;
    countsByFile.set(testcase.test_file, counts);
  });
  if (outcome.outcome !== 'passed')
    throw new Error(`Selected Windows push-profile tests did not pass: ${outcome.outcome}`);
  if (
    countsByFile.size !== selectedTests.length ||
    selectedTests.some((file) => (countsByFile.get(file)?.passed ?? 0) === 0)
  )
    throw new Error('Every selected Windows push-profile file must contain at least one passed test.');
  const total = [...countsByFile.values()].reduce(
    (sum, counts) => ({
      passed: sum.passed + counts.passed,
      skipped: sum.skipped + counts.skipped,
      failed: sum.failed + counts.failed,
      error: sum.error + counts.error,
    }),
    { passed: 0, skipped: 0, failed: 0, error: 0 },
  );
  if (total.error > 0 || total.failed > 0)
    throw new Error('Selected Windows push-profile JUnit contains errors or failures.');
  return total;
}

function assertSuccessfulOwnedCompletion(result: MutationProcessResult, phase: string, windows = true): void {
  const custody = result.processCustody;
  if (
    result.exitCode !== 0 ||
    result.signal !== null ||
    result.spawnError !== null ||
    result.timedOut ||
    !custody ||
    custody.scope !== 'owned-process-group' ||
    !custody.terminationObserved ||
    custody.processGroupTerminationObserved !== true ||
    (windows &&
      (custody.native_job?.schema !== 'VidaWindowsJobObservation/v1' ||
        custody.native_job.assigned_before_resume !== true ||
        custody.native_job?.active_processes !== 0 ||
        (custody.native_job.total_processes ?? 0) < 1)) ||
    result.output_capture?.complete !== true ||
    result.output_capture.stdout.truncated ||
    result.output_capture.stderr.truncated
  )
    throw new Error(`${phase} failed or lacks complete owned-process completion evidence.`);
}

export async function runWindowsPushProfile(input: {
  packageRoot: string;
  bunExecutable: string;
  environment: NodeJS.ProcessEnv;
  assertStableInputs: () => void;
}): Promise<WindowsPushProfileSummary> {
  if (process.platform !== 'win32' || process.arch !== 'x64')
    throw new Error('Windows push profile requires native win32 x64.');
  if (!path.isAbsolute(input.packageRoot) || !input.bunExecutable.trim())
    throw new Error('Windows push profile requires an absolute package root and Bun executable.');
  input.assertStableInputs();

  const scratchParent = path.join(input.packageRoot, '.tmp');
  await mkdir(scratchParent, { recursive: true });
  const outputRoot = await mkdtemp(path.join(scratchParent, `windows-push-${randomUUID()}-`));
  const budget = executionBudget(300_000, 30_000);
  const runPhase = async (name: string, args: string[]) => {
    input.assertStableInputs();
    const result = await executeMutationCommand([input.bunExecutable, ...args], input.packageRoot, budget.remaining(), {
      ownedProcessGroup: true,
      env: input.environment,
      stdoutFile: path.join(outputRoot, `${name}.stdout.bin`),
      stderrFile: path.join(outputRoot, `${name}.stderr.bin`),
      outputByteLimit: 32 * 1024 * 1024,
      terminationGraceMs: 5_000,
      forceWaitMs: budget.cleanupTimeout(),
    });
    await writeFile(path.join(outputRoot, `${name}.result.json`), JSON.stringify(result, null, 2) + '\n', {
      flag: 'wx',
    });
    assertSuccessfulOwnedCompletion(result, name);
    input.assertStableInputs();
  };

  await runPhase('static', ['bin/bun.ts', 'run', 'quality:static:pinned']);
  const junitFile = path.join(outputRoot, 'windows-push-profile.junit.xml');
  await runPhase('tests', [
    'test',
    '--timeout',
    '5000',
    '--preload',
    path.join(input.packageRoot, 'tooling/no-link-test-preload.ts'),
    '--reporter=junit',
    `--reporter-outfile=${junitFile}`,
    ...selectedTests,
  ]);
  const counts = validateWindowsPushProfileJUnit(await readFile(junitFile, 'utf8'));
  input.assertStableInputs();

  return {
    schema: 'VidaWindowsPushProfile/v1',
    platform: 'win32-x64',
    selected_files: selectedTests.length,
    passed_files: selectedTests.length,
    passed_cases: counts.passed,
    skipped_cases: counts.skipped,
    failed_cases: counts.failed,
    error_cases: counts.error,
    junit_file: junitFile,
    evidence_scope: 'selected Windows push-profile tests only',
  };
}

const assuranceExtraTests = [
  'tests/portable-instructions.test.ts',
  'tests/mutation-async-assertion.test.ts',
  'tests/bun/runtime-initialization.test.ts',
];
const assuranceHash = (value: string | Uint8Array): string => createHash('sha256').update(value).digest('hex');

export function releaseSourceProfileHash(platform: 'win32-x64' | 'linux-x64', files: string[]): string {
  const staticArgs = ['bin/bun.ts', 'run', 'quality:static:pinned'];
  const testArgs = [
    'test',
    '--timeout',
    '5000',
    ...(platform === 'win32-x64' ? ['--preload', 'tooling/no-link-test-preload.ts'] : []),
    '--reporter=junit',
    '--reporter-outfile=<owned-junit>',
    ...files,
  ];
  return assuranceHash(
    JSON.stringify({
      profile_id: 'release-source-assurance/v1',
      platform,
      commands: [
        ['<bun>', ...staticArgs],
        ['<bun>', ...testArgs],
      ],
      files,
    }),
  );
}

export function validateReleaseSourceJUnit(
  xml: string,
  files: string[],
): { totals: CaseCounts; files: Array<{ file: string; counts: CaseCounts }> } {
  const counts = new Map<string, CaseCounts>();
  const outcome = junitOutcome(xml, files, [], [], (testcase) => {
    const row = counts.get(testcase.test_file) ?? { passed: 0, skipped: 0, failed: 0, error: 0 };
    row[testcase.outcome] += 1;
    counts.set(testcase.test_file, row);
  });
  if (
    !files.length ||
    outcome.outcome !== 'passed' ||
    outcome.failures !== 0 ||
    outcome.errors !== 0 ||
    counts.size !== files.length ||
    files.some((file) => !counts.get(file)?.passed)
  )
    throw new Error('Release source assurance JUnit is incomplete or unsuccessful.');
  return {
    totals: {
      passed: outcome.tests - outcome.skipped - outcome.failures - outcome.errors,
      skipped: outcome.skipped,
      failed: outcome.failures,
      error: outcome.errors,
    },
    files: files.map((file) => ({ file, counts: counts.get(file)! })),
  };
}

export type ReleaseSourceAssuranceSummary = {
  schema: 'VidaReleaseSourceAssurance/v1';
  profile_id: 'release-source-assurance/v1';
  profile_sha256: string;
  profile_inputs_sha256: string;
  platform: 'win32-x64' | 'linux-x64';
  scope: 'selected-static-tests-only';
  static_result: 'passed';
  totals: CaseCounts;
  files: Array<{ file: string; counts: CaseCounts }>;
  junit: { path: string; sha256: string };
  executions: Array<{
    phase: string;
    result_path: string;
    result_sha256: string;
    stdout_path: string;
    stdout_sha256: string;
    stderr_path: string;
    stderr_sha256: string;
  }>;
};

export async function runReleaseSourceAssurance(input: {
  packageRoot: string;
  bunExecutable: string;
  assertStableInputs: () => void;
}): Promise<ReleaseSourceAssuranceSummary> {
  if (process.arch !== 'x64' || (process.platform !== 'win32' && process.platform !== 'linux'))
    throw new Error('Release source assurance requires native win32-x64 or linux-x64.');
  if (!path.isAbsolute(input.packageRoot) || !path.isAbsolute(input.bunExecutable))
    throw new Error('Release source assurance requires absolute package and Bun paths.');
  const platform = process.platform === 'win32' ? 'win32-x64' : 'linux-x64';
  const files = [
    ...selectedTests.filter((file) => platform === 'win32-x64' || file !== 'tests/windows-owned-process.test.ts'),
    ...assuranceExtraTests,
    platform === 'win32-x64' ? 'tests/release-source-assurance.test.ts' : 'tests/linux-release-install.test.ts',
  ];
  input.assertStableInputs();
  const { releaseAssuranceEnvironment } = await import('./git-quality-hooks.ts');
  const env = releaseAssuranceEnvironment(input.packageRoot, input.bunExecutable);
  input.assertStableInputs();
  const inputs = async () =>
    Promise.all(files.map(async (file) => [file, assuranceHash(await readFile(path.join(input.packageRoot, file)))]));
  const inputHashes = await inputs();
  const inputsHash = assuranceHash(JSON.stringify(inputHashes));
  const staticArgs = ['bin/bun.ts', 'run', 'quality:static:pinned'];
  const testArgs = [
    'test',
    '--timeout',
    '5000',
    ...(platform === 'win32-x64' ? ['--preload', path.join(input.packageRoot, 'tooling/no-link-test-preload.ts')] : []),
    '--reporter=junit',
    '--reporter-outfile=<owned-junit>',
    ...files,
  ];
  const profileId = 'release-source-assurance/v1' as const;
  const profileHash = releaseSourceProfileHash(platform, files);
  input.assertStableInputs();
  const scratch = path.join(input.packageRoot, '.tmp');
  await mkdir(scratch, { recursive: true });
  input.assertStableInputs();
  const root = await mkdtemp(path.join(scratch, `release-source-assurance-${randomUUID()}-`));
  input.assertStableInputs();
  await writeFile(
    path.join(root, 'intent.json'),
    JSON.stringify({
      profile_id: profileId,
      profile_sha256: profileHash,
      profile_inputs_sha256: inputsHash,
      files,
      input_hashes: inputHashes,
    }) + '\n',
    { flag: 'wx' },
  );
  const budget = executionBudget(300_000, 30_000);
  const executions: ReleaseSourceAssuranceSummary['executions'] = [];
  const runPhase = async (phase: string, args: string[]) => {
    input.assertStableInputs();
    if (assuranceHash(JSON.stringify(await inputs())) !== inputsHash) throw new Error('Selected test inputs changed.');
    const stdout = path.join(root, `${phase}.stdout.bin`),
      stderr = path.join(root, `${phase}.stderr.bin`);
    input.assertStableInputs();
    const result = await executeMutationCommand([input.bunExecutable, ...args], input.packageRoot, budget.remaining(), {
      ownedProcessGroup: true,
      env,
      stdoutFile: stdout,
      stderrFile: stderr,
      outputByteLimit: 32 * 1024 * 1024,
      terminationGraceMs: 5_000,
      forceWaitMs: budget.cleanupTimeout(),
    });
    input.assertStableInputs();
    const resultPath = path.join(root, `${phase}.result.json`);
    const resultBytes =
      JSON.stringify({ ...result, invocation: [input.bunExecutable, ...args], cwd: input.packageRoot }, null, 2) + '\n';
    await writeFile(resultPath, resultBytes, { flag: 'wx' });
    assertSuccessfulOwnedCompletion(result, phase, platform === 'win32-x64');
    input.assertStableInputs();
    if (assuranceHash(JSON.stringify(await inputs())) !== inputsHash) throw new Error('Selected test inputs changed.');
    executions.push({
      phase,
      result_path: resultPath,
      result_sha256: assuranceHash(resultBytes),
      stdout_path: stdout,
      stdout_sha256: assuranceHash(await readFile(stdout)),
      stderr_path: stderr,
      stderr_sha256: assuranceHash(await readFile(stderr)),
    });
  };
  await runPhase('static', staticArgs);
  const junitPath = path.join(root, 'release-source-assurance.junit.xml');
  input.assertStableInputs();
  await writeFile(junitPath, '', { flag: 'wx' });
  await runPhase(
    'tests',
    testArgs.map((arg) => (arg === '--reporter-outfile=<owned-junit>' ? `--reporter-outfile=${junitPath}` : arg)),
  );
  if ((await stat(junitPath)).size > 32 * 1024 * 1024) throw new Error('JUnit exceeds the output size bound.');
  const xmlBytes = await readFile(junitPath);
  if (xmlBytes.length > 32 * 1024 * 1024) throw new Error('JUnit exceeds the output size bound.');
  const validated = validateReleaseSourceJUnit(xmlBytes.toString('utf8'), files);
  input.assertStableInputs();
  if (assuranceHash(JSON.stringify(await inputs())) !== inputsHash) throw new Error('Selected test inputs changed.');
  return {
    schema: 'VidaReleaseSourceAssurance/v1',
    profile_id: profileId,
    profile_sha256: profileHash,
    profile_inputs_sha256: inputsHash,
    platform,
    scope: 'selected-static-tests-only',
    static_result: 'passed',
    ...validated,
    junit: { path: junitPath, sha256: assuranceHash(xmlBytes) },
    executions,
  };
}
