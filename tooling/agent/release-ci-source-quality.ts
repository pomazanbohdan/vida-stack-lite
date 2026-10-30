import { existsSync, lstatSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { releaseDigest, releaseJSON, releasePath } from '../../packages/agent/bin/local-release-artifacts.ts';
import { runFreshFullQuality } from '../../packages/agent/tooling/git-quality-hooks.ts';
import { sourceQualityContext, exclusive } from './native-ci-delivery.ts';

/** Source development assurance precedes formation and has no candidate/archive receipt. */
export async function collectCISourceQuality(): Promise<void> {
  if (
    process.platform !== 'linux' ||
    process.arch !== 'x64' ||
    process.env.GITHUB_JOB !== 'full-source-quality' ||
    process.env.CI_PUBLICATION !== 'true'
  )
    throw new Error('Source quality requires the native Linux publication job.');
  const before = sourceQualityContext();
  if (before.request.target !== 'bun-linux-x64') throw new Error('Source quality requires the Linux request.');
  const intent = 'source-quality/intent.json';
  if (existsSync(releasePath(before.root, intent, true)))
    throw new Error('Source quality intent retained; inspect UNKNOWN before reissue.');
  const binding = {
    schema: 'VidaCISourceQuality/v1',
    request_id: before.request.request_id,
    operation_id: before.request.operation_id,
    version: before.request.version,
    target: before.request.target,
    run_id: before.run_id,
    run_attempt: before.run_attempt,
    source_binding: before.request.source_binding,
    source_commit: before.source_commit,
    job: process.env.GITHUB_JOB,
  };
  exclusive(before.root, intent, { ...binding, status: 'issued' });
  const evidenceDirectory = path.join(before.root, 'source-quality');
  const output = process.env.GITHUB_OUTPUT;
  if (!output || /[\r\n]/u.test(evidenceDirectory)) throw new Error('Source quality output path unavailable.');
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
  const summary = await runFreshFullQuality({
    packageRoot: before.packageRoot,
    bunExecutable: process.execPath,
    assertStableInputs,
  });
  assertStableInputs();
  for (const [name, expected] of [
    ['crap-budget-report.json', summary.crap_report_sha256],
    ['coverage-final.json', summary.coverage_report_sha256],
  ]) {
    if (!name || !expected) throw new Error('Source quality report binding unavailable.');
    const file = releasePath(before.packageRoot, 'coverage/bun-unified/' + name);
    const stat = lstatSync(file);
    if (!stat.isFile() || stat.nlink !== 1 || stat.size < 1 || stat.size > 128 * 1024 * 1024)
      throw new Error('Source quality report is unsafe or oversized.');
    const bytes = readFileSync(file);
    if (releaseDigest(bytes) !== expected) throw new Error('Source quality report changed after validation.');
    exclusive(before.root, 'source-quality/' + name, bytes);
  }
  assertStableInputs();
  exclusive(before.root, 'source-quality/result.json', {
    ...binding,
    status: 'passed',
    completed_at: new Date().toISOString(),
    quality: summary,
  });
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
