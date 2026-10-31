import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  readReleaseBytes,
  releaseDigest,
  releaseJSON,
  releasePath,
} from '../../packages/agent/bin/local-release-artifacts.ts';
import { runReleaseSourceAssurance } from '../../packages/agent/tooling/git-quality-hooks.ts';
import { sourceQualityContext, exclusive } from './native-ci-delivery.ts';

/** Source development assurance precedes formation and has no candidate/archive receipt. */
export async function collectCISourceQuality(): Promise<void> {
  if (
    process.platform !== 'linux' ||
    process.arch !== 'x64' ||
    process.env.GITHUB_JOB !== 'release-assurance' ||
    process.env.CI_PUBLICATION !== 'true'
  )
    throw new Error('Source quality requires the native Linux publication job.');
  const before = sourceQualityContext();
  if (before.request.target !== 'bun-linux-x64') throw new Error('Source quality requires the Linux request.');
  const intent = 'source-quality/intent.json';
  if (existsSync(releasePath(before.root, intent, true)))
    throw new Error('Source quality intent retained; inspect UNKNOWN before reissue.');
  const binding = {
    schema: 'VidaCIPublicationAssurance/v1',
    request_id: before.request.request_id,
    operation_id: before.request.operation_id,
    version: before.request.version,
    target: before.request.target,
    run_id: before.run_id,
    run_attempt: before.run_attempt,
    source_binding: before.request.source_binding,
    source_commit: before.source_commit,
    workflow: process.env.GITHUB_WORKFLOW_REF,
    job: process.env.GITHUB_JOB,
  };
  exclusive(before.root, intent, { ...binding, status: 'issued' });
  const evidenceDirectory = path.join(before.root, 'source-quality');
  const output = process.env.GITHUB_OUTPUT;
  if (!output || /[\r\n\0]/u.test(output) || /[\r\n\0]/u.test(evidenceDirectory))
    throw new Error('Source quality output path unavailable.');
  writeFileSync(output, `evidence_directory=${evidenceDirectory}\n`, { flag: 'a' });
  const assertStableInputs = (): void => {
    const current = sourceQualityContext();
    if (
      current.root !== before.root ||
      current.source !== before.source ||
      current.checkout !== before.checkout ||
      current.packageRoot !== before.packageRoot ||
      current.source_commit !== before.source_commit ||
      current.run_id !== before.run_id ||
      current.run_attempt !== before.run_attempt ||
      releaseJSON(current.request) !== releaseJSON(before.request)
    )
      throw new Error('Source quality context changed during collection.');
  };
  assertStableInputs();
  const summary = await runReleaseSourceAssurance({
    packageRoot: before.packageRoot,
    bunExecutable: process.execPath,
    assertStableInputs,
  });
  assertStableInputs();
  const reports: Array<[string, string]> = [
    [summary.junit.path, summary.junit.sha256],
    ...summary.executions.flatMap((execution): Array<[string, string]> => [
      [execution.result_path, execution.result_sha256],
      [execution.stdout_path, execution.stdout_sha256],
      [execution.stderr_path, execution.stderr_sha256],
    ]),
  ];
  const runnerDirectory = path.dirname(summary.junit.path);
  const relativeDirectory = path.relative(before.packageRoot, runnerDirectory).split(path.sep).join('/');
  if (
    !relativeDirectory.startsWith('.tmp/release-source-assurance-') ||
    releasePath(before.packageRoot, relativeDirectory) !== runnerDirectory ||
    /[\r\n\0]/u.test(runnerDirectory) ||
    new Set(reports.map(([file]) => file)).size !== reports.length
  )
    throw new Error('Source quality report directory is unsafe.');
  for (const [file, expected] of reports) {
    if (
      !file ||
      !expected ||
      path.dirname(file) !== runnerDirectory ||
      releasePath(before.packageRoot, relativeDirectory + '/' + path.basename(file)) !== file
    )
      throw new Error('Source quality report binding unavailable.');
    const bytes = readReleaseBytes(before.packageRoot, relativeDirectory + '/' + path.basename(file), 32 * 1024 * 1024);
    if (releaseDigest(bytes) !== expected) throw new Error('Source quality report changed after validation.');
  }
  assertStableInputs();
  exclusive(before.root, 'source-quality/result.json', {
    ...binding,
    status: 'passed',
    completed_at: new Date().toISOString(),
    scope: 'selected-static-tests-only',
    numerics: 'not-assessed',
    runtime_acceptance: 'not-established',
    assurance: summary,
  });
  writeFileSync(output, `runner_report_directory=${runnerDirectory}\n`, { flag: 'a' });
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    if (process.argv.length !== 2) throw new Error('Source quality accepts no arguments.');
    await collectCISourceQuality();
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    console.error(
      JSON.stringify({
        status: 'blocked',
        code: 'GAP-VIDA-CI-SOURCE-QUALITY-001',
        message:
          /^(?:Source quality|GAP-VIDA-CI-DELIVERY-001|Fresh coverage|Full quality|Coverage|CRAP|Malformed)/u.test(
            message,
          )
            ? message
            : 'Source quality failed; inspect retained assurance evidence.',
        custody: 'retain intent, reports and test-effect evidence; no automatic reissue',
      }),
    );
    process.exitCode = 1;
  }
}
