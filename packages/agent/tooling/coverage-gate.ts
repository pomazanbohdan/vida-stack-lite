import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validateCoverageReport } from './bun-coverage-report-validator.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const reportPath = path.resolve(process.argv[2] ?? path.join(root, 'coverage', 'bun-unified', 'coverage-final.json'));
  try {
    const result = await validateCoverageReport(reportPath, root);
    process.stdout.write(
      JSON.stringify(
        {
          schema: 'CandidateCoverageReport/v3',
          status: 'pass',
          run_id: result.report.run_id,
          maintained_sources: result.maintained_sources,
          tests: result.tests,
          processes: result.processes,
          totals: result.totals,
          files: result.files,
        },
        null,
        2,
      ) + '\n',
    );
  } catch (error) {
    process.stdout.write(
      JSON.stringify(
        {
          schema: 'CandidateCoverageReport/v3',
          status: 'fail',
          reason: error instanceof Error ? error.message : String(error),
        },
        null,
        2,
      ) + '\n',
    );
    process.exitCode = 1;
  }
}
