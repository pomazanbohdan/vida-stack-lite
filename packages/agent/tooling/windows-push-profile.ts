import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
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

function assertSuccessfulOwnedCompletion(result: MutationProcessResult, phase: string): void {
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
    custody.native_job?.schema !== 'VidaWindowsJobObservation/v1' ||
    custody.native_job.assigned_before_resume !== true ||
    custody.native_job?.active_processes !== 0 ||
    (custody.native_job.total_processes ?? 0) < 1 ||
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
