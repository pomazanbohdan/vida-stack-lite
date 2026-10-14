import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { runBunCoverage } from '../../packages/agent/tooling/run-bun-coverage.ts';
import { ensureSdkCoverageInputs } from './sdk-coverage-readiness.ts';

async function runCoverage(): Promise<void> {
  await runBunCoverage({
    prepareSdkInputs: (input: { root: string; remainingMs: () => number }) =>
      ensureSdkCoverageInputs({
        ...input,
        archivePath: process.env.VIDA_SDK_TEST_INPUT_ARCHIVE,
      }),
  });
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  if (process.argv.slice(2).includes('--published-baseline=b549951')) await runBunCoverage();
  else await runCoverage();
}
