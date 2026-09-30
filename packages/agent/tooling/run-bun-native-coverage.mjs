import { createHash, randomUUID } from 'node:crypto';
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bunCoverageSources } from './maintained-source-inventory.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = path.resolve(process.env.BUN_NATIVE_COVERAGE_OUTPUT_ROOT ?? root);
const directory = path.join(outputRoot, 'coverage', 'bun-native');
const canonical = path.join(directory, 'coverage-final.json');
const staging = path.join(directory, `.coverage-final-${process.pid}.staging.json`);
const lock = path.join(directory, 'coverage-run.lock');
const digest = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
const nativeTests = [
  'tests/bun/host-state.test.mjs',
  'tests/bun/lifecycle-state.test.mjs',
  'tests/bun/persistent-session-handoff.test.mjs',
  'tests/bun-coverage.test.mjs',
];
if (process.argv[2] === '--list-tests') {
  process.stdout.write(JSON.stringify(nativeTests) + '\n');
  process.exit(0);
}
mkdirSync(directory, { recursive: true });
let descriptor;
try {
  descriptor = openSync(lock, 'wx');
  writeFileSync(descriptor, `${JSON.stringify({ schema: 'BunNativeCoverageLock/v1', run_id: randomUUID() })}\n`);
  closeSync(descriptor);
} catch (error) {
  if (descriptor !== undefined) closeSync(descriptor);
  if (error?.code === 'EEXIST') {
    process.stderr.write('Bun native coverage run is already locked; recovery requires explicit lock removal.\n');
    process.exit(1);
  }
  throw error;
}
try {
  rmSync(canonical, { force: true });
  rmSync(staging, { force: true });
  const result = spawnSync(
    'bun',
    [
      '--env-file=tooling/bun-native-coverage.env',
      'test',
      '--parallel=1',
      '--no-isolate',
      '--preload',
      './tooling/bun-native-coverage-preload.mjs',
      '--config=tooling/bun-coverage.toml',
      ...nativeTests,
    ],
    {
      cwd: root,
      env: { ...process.env, BUN_NATIVE_COVERAGE_OUTPUT_ROOT: outputRoot, BUN_NATIVE_COVERAGE_STAGING_PATH: staging },
      encoding: 'utf8',
      windowsHide: true,
    },
  );
  process.stdout.write(result.stdout ?? '');
  process.stderr.write(result.stderr ?? '');
  if (result.status !== 0 || !existsSync(staging)) {
    rmSync(staging, { force: true });
    throw new Error('Bun native coverage test run did not produce a staging report.');
  }
  try {
    const report = JSON.parse(readFileSync(staging, 'utf8'));
    const expected = bunCoverageSources.map((file) => ({ path: file, sha256: digest(path.join(root, file)) }));
    if (
      report.schema !== 'BunNativeCoverageReport/v1' ||
      JSON.stringify(report.sources) !== JSON.stringify(expected) ||
      JSON.stringify(Object.keys(report.coverage ?? {}).sort()) !==
        JSON.stringify(expected.map(({ path: file }) => path.join(root, file)).sort())
    )
      throw new Error('Bun native staging report does not match the maintained source set.');
    const start = path.join(root, 'node_modules', '.cache', 'vida-agent', 'coverage-source-start.v1.json');
    const runId = existsSync(start) ? JSON.parse(readFileSync(start, 'utf8')).run_id : null;
    report.run_id = runId ?? randomUUID();
    writeFileSync(staging, JSON.stringify(report) + '\n');
    renameSync(staging, canonical);
  } catch (error) {
    rmSync(staging, { force: true });
    process.stderr.write(`Bun native coverage finalization failed: ${error.message}\n`);
    process.exitCode = 1;
  }
} finally {
  unlinkSync(lock);
}
