import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  closeSync,
  existsSync,
  openSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { executionBudget } from '../bin/bun.ts';
import {
  capturedModuleInputs,
  coverageEnvironmentSha256,
  coverageToolInputs,
  instrumentSource,
  sha256,
} from '../tooling/bun-coverage-evidence.ts';
import {
  decodeCoverageShardInvocations,
  decodeCoverageShardPlan,
  decodeCoverageShardProcessEvidence,
  mergeCoverageShardCounters,
  validateCoverageShardEvidence,
  type CoverageShardProcessEvidence,
  type CoverageShardTerminalEvidence,
} from '../tooling/coverage-shard-evidence.ts';
import { planCoverageShards } from '../tooling/coverage-shard-plan.ts';
import { coverageAssignmentPlanSha256, coverageOutputPathsSha256 } from '../tooling/coverage-shard-evidence.ts';
import { superviseCoverageProducers } from '../tooling/run-bun-coverage.ts';

const packageRoot = fileURLToPath(new URL('../', import.meta.url));
const capturedTools = new Map(coverageToolInputs.map((file) => [file, readFileSync(path.join(packageRoot, file))]));

// Real captured preload, small generated subjects. This is lifecycle evidence,
// not a full production coverage report or an admitted published baseline.
for (const outcome of [
  'pass',
  'assertion-failure',
  'bail-assertion-failure',
  'report-write-failure',
  'query-import',
  'uncaptured-query',
] as const) {
  test(
    outcome === 'bail-assertion-failure'
      ? 'captured preload bailout does not claim complete hook finalization'
      : `captured preload finalizes after all file hooks: ${outcome}`,
    () => {
      const root = mkdtempSync(path.join(os.tmpdir(), 'coverage-preload-lifecycle-'));
      let passed = false;
      try {
        const runId = randomUUID();
        const snapshotRelative = `coverage/bun-unified/runs/${runId}/snapshot`;
        const snapshot = path.join(root, snapshotRelative);
        const reports = path.join(root, 'processes');
        const source = 'export function hit() { return 1; }\nexport const identity = {};\n';
        const inputs = new Map(capturedTools);
        inputs.set('src/fixture.ts', Buffer.from(source));
        const otherSource = 'export function hit() { return 2; }\nexport const identity = {};\n';
        inputs.set('src/other.ts', Buffer.from(otherSource));
        const tests = ['tests/first.test.ts', 'tests/last.test.ts'];
        for (const [index, file] of tests.entries()) {
          inputs.set(
            file,
            Buffer.from(
              "import { test, expect, afterAll } from 'bun:test';\n" +
                "import { hit } from '../src/fixture.ts';\n" +
                'afterAll(() => { hit(); });\n' +
                (outcome === 'query-import'
                  ? `test('file ${index}', async () => { const first = await import('../src/fixture.ts?fresh=${index}-a/../other.ts'); const second = await import('../src/fixture.ts?fresh=${index}-b'); expect(first.identity).not.toBe(second.identity); expect(first.hit()).toBe(1); });\n`
                  : outcome === 'uncaptured-query'
                    ? `test('file ${index}', async () => { await import('../src/unbound.ts?fresh=${index}/../other.ts'); });\n`
                    : `test('file ${index}', () => { expect(hit()).toBe(${(outcome === 'assertion-failure' && index === 1) || (outcome === 'bail-assertion-failure' && index === 0) ? 2 : 1}); });\n`),
            ),
          );
        }
        for (const [file, bytes] of inputs) {
          for (const directory of [root, snapshot]) {
            const target = path.join(directory, file);
            mkdirSync(path.dirname(target), { recursive: true });
            writeFileSync(target, bytes);
          }
        }
        // Isolated CLI configuration; production preload is passed explicitly.
        writeFileSync(path.join(root, 'bunfig.toml'), '[test]\n');
        if (outcome === 'uncaptured-query')
          writeFileSync(path.join(root, 'src/unbound.ts'), 'export const unbound = true;\n');
        symlinkSync(path.join(packageRoot, 'node_modules'), path.join(root, 'node_modules'), 'dir');
        if (outcome === 'report-write-failure') writeFileSync(reports, 'owned obstruction');
        const digests = (files: readonly string[]) =>
          files.map((file) => {
            const bytes = inputs.get(file);
            if (!bytes) throw new Error('Missing owned lifecycle input: ' + file);
            return { path: file, sha256: sha256(bytes) };
          });
        const sources = digests(['src/fixture.ts', 'src/other.ts']);
        const testInputs = digests(tests);
        const toolInputs = digests(coverageToolInputs);
        const manifestPath = path.join(root, 'manifest.json');
        const argv = [
          'test',
          ...(outcome === 'bail-assertion-failure' ? ['--bail=1'] : []),
          '--parallel=1',
          '--no-isolate',
          '--preload',
          path.join(snapshot, 'tooling/bun-coverage-preload.ts'),
          ...tests.map((file) => './' + file),
        ];
        const instrumentedSources = [
          { path: 'src/fixture.ts', source },
          { path: 'src/other.ts', source: otherSource },
        ].map(({ path: sourcePath, source: sourceText }) => {
          const instrumented = instrumentSource(path.join(root, sourcePath), sourceText);
          const artifactPath = `__coverage_instrumented__/${sourcePath}`;
          const artifactBytes = Buffer.from(instrumented.code);
          const target = path.join(snapshot, artifactPath);
          mkdirSync(path.dirname(target), { recursive: true });
          writeFileSync(target, artifactBytes);
          return {
            row: {
              path: sourcePath,
              source_sha256: sha256(Buffer.from(sourceText)),
              artifact_path: artifactPath,
              artifact_sha256: sha256(artifactBytes),
            },
            fileCoverage: instrumented.fileCoverage,
          };
        });
        const manifest = {
          schema: 'VidaBunCoverageRun/v2',
          run_id: runId,
          snapshot_directory: snapshotRelative,
          source_fingerprint: sha256(JSON.stringify(sources)),
          test_fingerprint: sha256(JSON.stringify(testInputs)),
          tool_fingerprint: sha256(JSON.stringify(toolInputs)),
          runtime_executable_sha256: sha256(readFileSync(process.execPath)),
          sources,
          tests,
          test_inputs: testInputs,
          tool_inputs: toolInputs,
          module_inputs: capturedModuleInputs({ sources, test_inputs: testInputs, tool_inputs: toolInputs }),
          test_selection: { mode: 'full-current-test-set', tests },
          active_argv: argv,
          execution_scope: { qualification: 'isolated-lifecycle-owner-only' },
          instrumented_sources: instrumentedSources.map(({ row }) => row),
          source_maps: Object.fromEntries(
            instrumentedSources.map(({ row, fileCoverage }) => [path.join(root, row.path), fileCoverage]),
          ),
        };
        writeFileSync(manifestPath, JSON.stringify(manifest));
        if (outcome === 'query-import')
          writeFileSync(
            path.join(root, 'src/fixture.ts'),
            'export function hit() { return 99; }\nexport const identity = {};\n',
          );
        const result = spawnSync(process.execPath, argv, {
          cwd: root,
          encoding: 'utf8',
          timeout: 20_000,
          maxBuffer: 1024 * 1024,
          env: {
            ...process.env,
            BUN_OPTIONS: '',
            VIDA_BUN_COVERAGE_ROOT: root,
            VIDA_BUN_COVERAGE_MANIFEST: manifestPath,
            VIDA_BUN_COVERAGE_REPORT_DIRECTORY: reports,
            VIDA_BUN_COVERAGE_SNAPSHOT_DIRECTORY: snapshot,
            VIDA_BUN_COVERAGE_RUN_ID: runId,
            VIDA_BUN_COVERAGE_SOURCE_FINGERPRINT: manifest.source_fingerprint,
            VIDA_BUN_COVERAGE_TEST_FINGERPRINT: manifest.test_fingerprint,
            VIDA_BUN_COVERAGE_TOOL_FINGERPRINT: manifest.tool_fingerprint,
            VIDA_BUN_COVERAGE_TEST_SELECTION_MODE: manifest.test_selection.mode,
            VIDA_BUN_COVERAGE_ACTIVE_ARGV: JSON.stringify(argv),
            VIDA_BUN_COVERAGE_SHARD_ID: 'bun-test',
          },
        });
        writeFileSync(path.join(root, 'child.stdout.log'), result.stdout ?? '');
        writeFileSync(path.join(root, 'child.stderr.log'), result.stderr ?? '');
        expect(result.error).toBeUndefined();
        expect(result.signal).toBeNull();
        expect(result.status, result.stderr).toBe(outcome === 'pass' || outcome === 'query-import' ? 0 : 1);
        if (outcome === 'bail-assertion-failure') expect(result.stderr).toContain('Bailed out after 1 failure');
        else expect(result.stderr).toContain(`Ran ${outcome === 'report-write-failure' ? 3 : 2} tests across 2 files.`);
        if (outcome === 'report-write-failure') {
          expect(result.stderr).toContain('Bun coverage child report failed:');
          expect(readFileSync(reports, 'utf8')).toBe('owned obstruction');
        } else if (outcome === 'uncaptured-query') {
          expect(result.stderr).toContain('Uncaptured query-bearing module input requested by test execution:');
          expect(result.stderr).toContain('src/unbound.ts?fresh=');
          expect(readFileSync(path.join(root, 'src/unbound.ts'), 'utf8')).toBe('export const unbound = true;\n');
        } else if (outcome === 'bail-assertion-failure') {
          expect(existsSync(reports)).toBe(false);
        } else {
          const files = readdirSync(reports);
          expect(files).toHaveLength(1);
          const receipt: unknown = JSON.parse(readFileSync(path.join(reports, files[0]!), 'utf8'));
          expect(receipt).toMatchObject({ schema: 'VidaBunCoverageProcess/v1', run_id: runId, shard_id: 'bun-test' });
          expect(receipt).toHaveProperty(['coverage', path.join(root, 'src/fixture.ts'), 'f', '0'], 4);
          expect(receipt).toHaveProperty('loaded_inputs', expect.arrayContaining([sources[0]]));
          for (const file of tests)
            expect(receipt).toHaveProperty('loaded_inputs', expect.arrayContaining([digests([file])[0]]));
        }
        passed = true;
      } finally {
        if (passed) rmSync(root, { recursive: true, force: true });
        else console.error('Preserved failed preload lifecycle fixture at ' + root);
      }
    },
  );
}

test.each([1, 2] as const)(
  'captured preload accepts one exact current v3 assignment with %i assigned file(s)',
  (fileCount) => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'coverage-preload-v3-lifecycle-'));
    let passed = false;
    try {
      const runId = randomUUID();
      const snapshotRelative = `coverage/bun-unified/runs/${runId}/snapshot`;
      const snapshot = path.join(root, snapshotRelative);
      const testFiles = Array.from(
        { length: fileCount },
        (_, index) => `tests/${index + 1 === 1 ? 'one' : 'two'}.test.ts`,
      );
      const inputs = new Map(capturedTools);
      inputs.set('src/fixture.ts', Buffer.from('export function hit() { return 1; }\n'));
      for (const [index, testFile] of testFiles.entries())
        inputs.set(
          testFile,
          Buffer.from(
            `import { test, expect, afterAll } from 'bun:test';\nimport { hit } from '../src/fixture.ts';\n` +
              `test('v3 assigned test ${index + 1}', () => expect(1).toBe(1));\nafterAll(() => hit());\n`,
          ),
        );
      for (const [file, bytes] of inputs) {
        for (const directory of [root, snapshot]) {
          const target = path.join(directory, file);
          mkdirSync(path.dirname(target), { recursive: true });
          writeFileSync(target, bytes);
        }
      }
      writeFileSync(path.join(root, 'bunfig.toml'), '[test]\n');
      symlinkSync(path.join(packageRoot, 'node_modules'), path.join(root, 'node_modules'), 'dir');
      const digestRows = (files: readonly string[]) =>
        files.map((file) => {
          const bytes = inputs.get(file);
          if (!bytes) throw new Error('Missing versioned preload input: ' + file);
          return { path: file, sha256: sha256(bytes) };
        });
      const sources = digestRows(['src/fixture.ts']);
      const testInputs = digestRows(testFiles);
      const toolInputs = digestRows(coverageToolInputs);
      const runtimeHash = sha256(readFileSync(process.execPath));
      const selection = { mode: 'full-current-test-set', tests: testFiles };
      const reviewScope = 'a'.repeat(64);
      const sharedResource = `lifecycle:${'b'.repeat(64)}`;
      const reviews = testInputs.map((entry) => ({
        test_file: entry.path,
        test_sha256: entry.sha256,
        review_scope_sha256: reviewScope,
        shared_resources: [sharedResource],
        exclusive_run: false,
        reviewer_ref: 'synthetic-lifecycle-control',
      }));
      const assignmentPlan = planCoverageShards(testInputs, reviews, 2, reviewScope);
      const assignment = assignmentPlan.waves[0]!.assignments[0]!;
      expect(assignment.tests).toEqual(testFiles);
      const shardId = assignment.shard_id;
      const outputRoot = path.join(root, 'coverage', 'bun-unified', 'runs', runId);
      const outputPaths = {
        coverage_directory: path.join(outputRoot, 'shards', shardId, 'coverage'),
        junit_file: path.join(outputRoot, 'shards', shardId, 'suite.junit.xml'),
        log_file: path.join(outputRoot, 'shards', shardId, 'child.log'),
        receipt_directory: path.join(outputRoot, 'processes', shardId),
        temp_directory: path.join(outputRoot, 'shards', shardId, 'tmp'),
      };
      const argv = [
        'test',
        '--timeout',
        '5000',
        '--parallel=1',
        '--no-isolate',
        '--config=' + path.join(snapshot, 'bunfig.toml'),
        '--preload',
        path.join(snapshot, 'tooling/bun-coverage-preload.ts'),
        ...testFiles.map((file) => './' + file),
      ];
      const manifestPath = path.join(root, 'manifest.json');
      const baseEnvironment: NodeJS.ProcessEnv = {
        ...process.env,
        BUN_OPTIONS: '',
        VIDA_BUN_COVERAGE_ROOT: root,
        VIDA_BUN_COVERAGE_MANIFEST: manifestPath,
        VIDA_BUN_COVERAGE_REPORT_DIRECTORY: outputPaths.receipt_directory,
        VIDA_BUN_COVERAGE_SNAPSHOT_DIRECTORY: snapshot,
        VIDA_BUN_COVERAGE_RUN_ID: runId,
        VIDA_BUN_COVERAGE_SOURCE_FINGERPRINT: sha256(JSON.stringify(sources)),
        VIDA_BUN_COVERAGE_TEST_FINGERPRINT: sha256(JSON.stringify(testInputs)),
        VIDA_BUN_COVERAGE_TOOL_FINGERPRINT: sha256(JSON.stringify(toolInputs)),
        VIDA_BUN_COVERAGE_TEST_SELECTION_MODE: selection.mode,
        VIDA_BUN_COVERAGE_ACTIVE_ARGV: JSON.stringify(argv),
        VIDA_BUN_COVERAGE_SHARD_ID: shardId,
        VIDA_BUN_COVERAGE_ASSIGNED_TESTS: JSON.stringify(assignment.tests),
        VIDA_BUN_COVERAGE_SHARD_SELECTION_SHA256: assignment.selection_sha256,
        VIDA_BUN_COVERAGE_OUTPUT_COVERAGE_DIRECTORY: outputPaths.coverage_directory,
        VIDA_BUN_COVERAGE_JUNIT_FILE: outputPaths.junit_file,
        VIDA_BUN_COVERAGE_LOG_FILE: outputPaths.log_file,
        VIDA_BUN_COVERAGE_TEMP_DIRECTORY: outputPaths.temp_directory,
        BUN_TEST_WORKER_ID: '1',
        JEST_WORKER_ID: '1',
        AGENT_RUNTIME_NATIVE_COVERAGE_MAIN: '1',
      };
      delete baseEnvironment.BUN_OPTIONS;
      const environmentDigest = coverageEnvironmentSha256(baseEnvironment);
      const shardInvocations = [
        {
          shard_id: shardId,
          argv,
          cwd: root,
          environment_sha256: environmentDigest,
          output_paths: outputPaths,
        },
      ];
      const instrumented = instrumentSource(path.join(root, 'src/fixture.ts'), 'export function hit() { return 1; }\n');
      const artifactBytes = Buffer.from(instrumented.code);
      const artifactPath = '__coverage_instrumented__/src/fixture.ts';
      mkdirSync(path.dirname(path.join(snapshot, artifactPath)), { recursive: true });
      writeFileSync(path.join(snapshot, artifactPath), artifactBytes);
      const manifest = {
        schema: 'VidaBunCoverageRun/v3',
        run_id: runId,
        snapshot_directory: snapshotRelative,
        source_fingerprint: sha256(JSON.stringify(sources)),
        test_fingerprint: sha256(JSON.stringify(testInputs)),
        tool_fingerprint: sha256(JSON.stringify(toolInputs)),
        runtime_executable_sha256: runtimeHash,
        sources,
        tests: selection.tests,
        test_inputs: testInputs,
        tool_inputs: toolInputs,
        module_inputs: capturedModuleInputs({ sources, test_inputs: testInputs, tool_inputs: toolInputs }),
        test_selection: selection,
        active_argv: [],
        execution_scope: { qualification: 'isolated-v3-preload-lifecycle-only' },
        instrumented_sources: [
          {
            path: 'src/fixture.ts',
            source_sha256: sources[0]!.sha256,
            artifact_path: artifactPath,
            artifact_sha256: sha256(artifactBytes),
          },
        ],
        source_maps: { [path.join(root, 'src/fixture.ts')]: instrumented.fileCoverage },
        coverage_plan: assignmentPlan,
        assignment_plan_sha256: coverageAssignmentPlanSha256(assignmentPlan, shardInvocations),
        shard_invocations: shardInvocations,
      };
      writeFileSync(manifestPath, JSON.stringify(manifest));
      const result = spawnSync(process.execPath, argv, {
        cwd: root,
        encoding: 'utf8',
        timeout: 20_000,
        maxBuffer: 1024 * 1024,
        env: baseEnvironment,
      });
      expect(result.error).toBeUndefined();
      expect(result.signal).toBeNull();
      expect(result.status, result.stderr).toBe(0);
      expect(result.stderr).toContain(
        fileCount === 1 ? 'Ran 1 test across 1 file.' : `Ran ${fileCount} tests across ${fileCount} files.`,
      );
      const receiptFiles = readdirSync(outputPaths.receipt_directory);
      expect(receiptFiles).toHaveLength(1);
      const receipt: unknown = JSON.parse(
        readFileSync(path.join(outputPaths.receipt_directory, receiptFiles[0]!), 'utf8'),
      );
      expect(receipt).toMatchObject({
        schema: 'VidaBunCoverageProcess/v2',
        run_id: runId,
        shard_id: shardId,
        assigned_tests: testFiles,
        assignment_plan_sha256: manifest.assignment_plan_sha256,
        shard_selection_sha256: assignment.selection_sha256,
        active_argv: argv,
        cwd: root,
        environment_sha256: environmentDigest,
        output_paths_sha256: coverageOutputPathsSha256(outputPaths),
      });
      expect(receipt).toHaveProperty(['coverage', path.join(root, 'src/fixture.ts'), 'f', '0'], fileCount);
      passed = true;
    } finally {
      if (passed) rmSync(root, { recursive: true, force: true });
      else console.error('Preserved failed v3 preload lifecycle fixture at ' + root);
    }
  },
  20_000,
);

test('synthetic two-shard pilot joins supervised Bun terminals to real v2 receipts and one sparse merge', async () => {
  const budget = executionBudget(20_000, 1_000);
  const root = mkdtempSync(path.join(os.tmpdir(), 'untrusted-two-shard-coverage-pilot-'));
  let passed = false;
  let bodyFailed = false;
  let bodyError: unknown;
  let descriptorCloseErrors: unknown[] = [];
  const ownedLogFds: Array<{ fd: number; closeAttempted: boolean }> = [];
  const closeOwnedLogFds = (): unknown[] => {
    const errors: unknown[] = [];
    for (const owned of ownedLogFds) {
      if (owned.closeAttempted) continue;
      owned.closeAttempted = true;
      try {
        closeSync(owned.fd);
      } catch (error) {
        errors.push(error);
      }
    }
    return errors;
  };
  try {
    const runId = randomUUID();
    const snapshotRelative = `coverage/bun-unified/runs/${runId}/snapshot`;
    const snapshot = path.join(root, snapshotRelative);
    const runDirectory = path.join(root, 'coverage', 'bun-unified', 'runs', runId);
    const markerDirectory = path.join(root, 'pilot-markers');
    mkdirSync(markerDirectory, { recursive: true });

    const sharedSource = 'export function hit() { return 1; }\n';
    const seededSource = 'export function neverLoaded() { return 2; }\n';
    const testFiles = ['tests/pilot-a.test.ts', 'tests/pilot-b.test.ts'];
    const inputs = new Map(capturedTools);
    inputs.set('src/shared.ts', Buffer.from(sharedSource));
    inputs.set('src/seeded.ts', Buffer.from(seededSource));
    for (const [index, testFile] of testFiles.entries()) {
      const shardId = `shard-${String(index + 1).padStart(4, '0')}`;
      const calls = index === 0 ? 'expect(hit()).toBe(1);' : 'expect(hit()).toBe(1); expect(hit()).toBe(1);';
      inputs.set(
        testFile,
        Buffer.from(
          "import { test, expect } from 'bun:test';\n" +
            "import { existsSync, writeFileSync } from 'node:fs';\n" +
            "import path from 'node:path';\n" +
            "import { hit } from '../src/shared.ts';\n" +
            'const markers = process.env.VIDA_COVERAGE_PILOT_MARKERS!;\n' +
            `const shard = ${JSON.stringify(shardId)};\n` +
            "const marker = (name: string) => path.join(markers, shard + '-' + name);\n" +
            'const waitFor = async (file: string) => { while (!existsSync(file)) await new Promise((resolve) => setTimeout(resolve, 10)); };\n' +
            "test('pilot body waits at a shared barrier', async () => {\n" +
            "  writeFileSync(marker('ready'), String(process.pid));\n" +
            "  await waitFor(path.join(markers, 'go'));\n" +
            "  writeFileSync(marker('running'), String(process.pid));\n" +
            "  await waitFor(path.join(markers, 'release'));\n" +
            `  process.stdout.write(${JSON.stringify(`PILOT-${shardId}-stdout-marker`)} + '\\n');\n` +
            `  process.stderr.write(${JSON.stringify(`PILOT-${shardId}-stderr-marker`)} + '\\n');\n` +
            `  ${calls}\n` +
            '});\n',
        ),
      );
    }

    for (const [file, bytes] of inputs) {
      for (const directory of [root, snapshot]) {
        const target = path.join(directory, file);
        mkdirSync(path.dirname(target), { recursive: true });
        writeFileSync(target, bytes);
      }
    }
    writeFileSync(path.join(root, 'bunfig.toml'), '[test]\n');
    symlinkSync(path.join(packageRoot, 'node_modules'), path.join(root, 'node_modules'), 'dir');

    const digestRows = (files: readonly string[]) =>
      files.map((file) => {
        const bytes = inputs.get(file);
        if (!bytes) throw new Error('Pilot capture omitted input bytes: ' + file);
        return { path: file, sha256: sha256(bytes) };
      });
    const sources = digestRows(['src/shared.ts', 'src/seeded.ts']);
    const testInputs = digestRows(testFiles);
    const toolInputs = digestRows(coverageToolInputs);
    const selection = { mode: 'full-current-test-set', tests: testFiles };
    const runtimeHash = sha256(readFileSync(process.execPath));
    const reviewScope = 'c'.repeat(64);
    const reviews = testInputs.map((entry) => ({
      test_file: entry.path,
      test_sha256: entry.sha256,
      review_scope_sha256: reviewScope,
      shared_resources: [],
      exclusive_run: false,
      reviewer_ref: 'synthetic-two-shard-lifecycle-pilot',
    }));
    const planned = planCoverageShards(testInputs, reviews, 2, reviewScope);
    expect(planned.waves).toHaveLength(1);
    expect(planned.waves[0]?.assignments).toHaveLength(2);
    const plan = decodeCoverageShardPlan(planned);
    expect(plan).toBeDefined();
    if (!plan) throw new Error('Pilot planner output did not decode.');
    const assignments = plan.waves[0]!.assignments;
    expect(assignments.flatMap(({ tests }) => tests).sort()).toEqual([...testFiles].sort());

    const sourceRows = [
      { path: 'src/shared.ts', source: sharedSource },
      { path: 'src/seeded.ts', source: seededSource },
    ].map(({ path: sourcePath, source }) => {
      const instrumented = instrumentSource(path.join(root, sourcePath), source);
      const artifactPath = `__coverage_instrumented__/${sourcePath}`;
      const artifactBytes = Buffer.from(instrumented.code);
      const target = path.join(snapshot, artifactPath);
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, artifactBytes);
      return {
        row: {
          path: sourcePath,
          source_sha256: sources.find(({ path: file }) => file === sourcePath)!.sha256,
          artifact_path: artifactPath,
          artifact_sha256: sha256(artifactBytes),
        },
        fileCoverage: instrumented.fileCoverage,
      };
    });
    const expectedMaps = Object.fromEntries(
      sourceRows.map(({ row, fileCoverage }) => [path.join(root, row.path), fileCoverage]),
    );
    const invocations = assignments.map((assignment) => {
      const shardRoot = path.join(runDirectory, 'shards', assignment.shard_id);
      const outputPaths = {
        coverage_directory: path.join(shardRoot, 'coverage'),
        junit_file: path.join(shardRoot, 'suite.junit.xml'),
        log_file: path.join(shardRoot, 'child.log'),
        receipt_directory: path.join(runDirectory, 'processes', assignment.shard_id),
        temp_directory: path.join(shardRoot, 'tmp'),
      };
      mkdirSync(outputPaths.temp_directory, { recursive: true });
      const logFd = openSync(outputPaths.log_file, 'wx', 0o600);
      ownedLogFds.push({ fd: logFd, closeAttempted: false });
      const argv = [
        'test',
        '--timeout',
        '5000',
        '--parallel=1',
        '--no-isolate',
        `--config=${path.join(snapshot, 'bunfig.toml')}`,
        '--preload',
        path.join(snapshot, 'tooling/bun-coverage-preload.ts'),
        '--reporter=junit',
        `--reporter-outfile=${outputPaths.junit_file}`,
        ...assignment.tests.map((file) => './' + file),
      ];
      const environment: NodeJS.ProcessEnv = {
        ...process.env,
        BUN_OPTIONS: '',
        TMPDIR: outputPaths.temp_directory,
        VIDA_BUN_COVERAGE_ROOT: root,
        VIDA_BUN_COVERAGE_MANIFEST: path.join(root, 'manifest.json'),
        VIDA_BUN_COVERAGE_REPORT_DIRECTORY: outputPaths.receipt_directory,
        VIDA_BUN_COVERAGE_SNAPSHOT_DIRECTORY: snapshot,
        VIDA_BUN_COVERAGE_RUN_ID: runId,
        VIDA_BUN_COVERAGE_SOURCE_FINGERPRINT: sha256(JSON.stringify(sources)),
        VIDA_BUN_COVERAGE_TEST_FINGERPRINT: sha256(JSON.stringify(testInputs)),
        VIDA_BUN_COVERAGE_TOOL_FINGERPRINT: sha256(JSON.stringify(toolInputs)),
        VIDA_BUN_COVERAGE_TEST_SELECTION_MODE: selection.mode,
        VIDA_BUN_COVERAGE_ACTIVE_ARGV: JSON.stringify(argv),
        VIDA_BUN_COVERAGE_SHARD_ID: assignment.shard_id,
        VIDA_BUN_COVERAGE_ASSIGNED_TESTS: JSON.stringify(assignment.tests),
        VIDA_BUN_COVERAGE_SHARD_SELECTION_SHA256: assignment.selection_sha256,
        VIDA_BUN_COVERAGE_OUTPUT_COVERAGE_DIRECTORY: outputPaths.coverage_directory,
        VIDA_BUN_COVERAGE_JUNIT_FILE: outputPaths.junit_file,
        VIDA_BUN_COVERAGE_LOG_FILE: outputPaths.log_file,
        VIDA_BUN_COVERAGE_TEMP_DIRECTORY: outputPaths.temp_directory,
        VIDA_COVERAGE_PILOT_MARKERS: markerDirectory,
        BUN_TEST_WORKER_ID: '1',
        JEST_WORKER_ID: '1',
        AGENT_RUNTIME_NATIVE_COVERAGE_MAIN: '1',
      };
      delete environment.BUN_OPTIONS;
      return {
        assignment,
        argv,
        outputPaths,
        logFd,
        environment,
        invocation: {
          shard_id: assignment.shard_id,
          argv,
          cwd: root,
          environment_sha256: coverageEnvironmentSha256(environment),
          output_paths: outputPaths,
        },
      };
    });
    const decodedInvocations = decodeCoverageShardInvocations(invocations.map(({ invocation }) => invocation));
    expect(decodedInvocations).toBeDefined();
    if (!decodedInvocations) throw new Error('Pilot invocation bindings did not decode.');
    const allOutputPaths = decodedInvocations.flatMap(({ output_paths }) => Object.values(output_paths));
    expect(new Set(allOutputPaths).size).toBe(allOutputPaths.length);

    const assignmentPlanSha256 = coverageAssignmentPlanSha256(plan, decodedInvocations);
    const manifest = {
      schema: 'VidaBunCoverageRun/v3',
      run_id: runId,
      snapshot_directory: snapshotRelative,
      source_fingerprint: sha256(JSON.stringify(sources)),
      test_fingerprint: sha256(JSON.stringify(testInputs)),
      tool_fingerprint: sha256(JSON.stringify(toolInputs)),
      runtime_executable_sha256: runtimeHash,
      sources,
      tests: testFiles,
      test_inputs: testInputs,
      tool_inputs: toolInputs,
      module_inputs: capturedModuleInputs({ sources, test_inputs: testInputs, tool_inputs: toolInputs }),
      test_selection: selection,
      active_argv: [],
      execution_scope: { qualification: 'untrusted-two-shard-native-lifecycle-pilot' },
      instrumented_sources: sourceRows.map(({ row }) => row),
      source_maps: expectedMaps,
      coverage_plan: plan,
      assignment_plan_sha256: assignmentPlanSha256,
      shard_invocations: decodedInvocations,
    };
    writeFileSync(path.join(root, 'manifest.json'), JSON.stringify(manifest));

    const groupPromise = superviseCoverageProducers(
      invocations.map(({ assignment, argv, environment, logFd }) => ({
        shard_id: assignment.shard_id,
        args: argv,
        cwd: root,
        env: environment,
        maximum_duration_ms: 15_000,
        log_fd: logFd,
      })),
      budget,
    );
    const waitForMarkers = async (suffix: string) => {
      const targets = assignments.map(({ shard_id }) => path.join(markerDirectory, `${shard_id}-${suffix}`));
      while (!targets.every(existsSync)) {
        await new Promise((resolve) => setTimeout(resolve, Math.min(20, budget.remaining())));
      }
      return targets.map((target) => readFileSync(target, 'utf8'));
    };
    let coordinationError: unknown;
    let readyPids: string[] = [];
    let runningPids: string[] = [];
    try {
      readyPids = await waitForMarkers('ready');
      writeFileSync(path.join(markerDirectory, 'go'), 'go');
      runningPids = await waitForMarkers('running');
    } catch (error) {
      coordinationError = error;
    } finally {
      // Release both real test bodies even when readiness fails, then account
      // every attempted producer before reporting or retaining this fixture.
      writeFileSync(path.join(markerDirectory, 'go'), 'go');
      writeFileSync(path.join(markerDirectory, 'release'), 'release');
    }
    const group = await groupPromise;
    const closeErrors = closeOwnedLogFds();
    if (closeErrors.length)
      throw new AggregateError(closeErrors, 'Pilot parent-owned log descriptors failed to close.');
    if (coordinationError) throw coordinationError;
    expect(new Set(readyPids).size).toBe(2);
    expect(new Set(runningPids).size).toBe(2);
    expect(group.outcomes).toHaveLength(2);
    expect<Set<number | null>>(new Set(readyPids.map(Number))).toEqual(
      new Set(group.outcomes.map(({ producer_pid }) => producer_pid)),
    );
    expect<Set<number | null>>(new Set(runningPids.map(Number))).toEqual(
      new Set(group.outcomes.map(({ producer_pid }) => producer_pid)),
    );
    expect(
      group.outcomes.every(
        ({ status, signal, error, unknown, producerTerminalKnown, directProducerAccounted }) =>
          status === 0 &&
          signal === null &&
          error === null &&
          !unknown &&
          producerTerminalKnown &&
          directProducerAccounted,
      ),
    ).toBe(true);
    expect(group.reservationSafeToRelease).toBe(true);
    expect(group.resourceSafeToAdvance).toBe(false);
    expect(group.outcomes.every(({ resourceSafeToAdvance }) => !resourceSafeToAdvance)).toBe(true);

    const runBinding = {
      schema: 'VidaBunCoverageRun/v3' as const,
      run_id: runId,
      source_fingerprint: manifest.source_fingerprint,
      test_fingerprint: manifest.test_fingerprint,
      tool_fingerprint: manifest.tool_fingerprint,
      runtime_executable_sha256: runtimeHash,
      assignment_plan_sha256: assignmentPlanSha256,
      tests: testFiles,
      selected_test_inputs: testInputs,
      shard_invocations: decodedInvocations,
      snapshot_directory: snapshot,
    };
    const processEvidence: CoverageShardProcessEvidence[] = [];
    const terminals: CoverageShardTerminalEvidence[] = [];
    for (const outcome of group.outcomes) {
      const invocation = invocations.find(({ assignment }) => assignment.shard_id === outcome.shard_id)!;
      const receiptFiles = readdirSync(invocation.outputPaths.receipt_directory);
      expect(receiptFiles).toHaveLength(1);
      const receipt: unknown = JSON.parse(
        readFileSync(path.join(invocation.outputPaths.receipt_directory, receiptFiles[0]!), 'utf8'),
      );
      const evidence = decodeCoverageShardProcessEvidence(receipt);
      expect(evidence).toBeDefined();
      if (!evidence) throw new Error('Pilot process receipt failed the v2 decoder.');
      expect<number | null>(evidence.pid).toBe(outcome.producer_pid);
      expect(evidence.shard_id).toBe(outcome.shard_id);
      processEvidence.push(evidence);
      terminals.push({
        run_id: runId,
        shard_id: outcome.shard_id,
        pid: outcome.producer_pid!,
        status: outcome.status,
        signal: outcome.signal,
        error: outcome.error,
        unknown: outcome.unknown,
      });
      expect(existsSync(invocation.outputPaths.junit_file)).toBe(true);
      expect(existsSync(invocation.outputPaths.temp_directory)).toBe(true);
      expect(existsSync(invocation.outputPaths.log_file)).toBe(true);
      const childLog = readFileSync(invocation.outputPaths.log_file, 'utf8');
      expect(childLog).toContain(`PILOT-${outcome.shard_id}-stdout-marker`);
      expect(childLog).toContain(`PILOT-${outcome.shard_id}-stderr-marker`);
      for (const sibling of group.outcomes.filter(({ shard_id }) => shard_id !== outcome.shard_id)) {
        expect(childLog).not.toContain(`PILOT-${sibling.shard_id}-stdout-marker`);
        expect(childLog).not.toContain(`PILOT-${sibling.shard_id}-stderr-marker`);
      }
    }
    expect(
      processEvidence
        .map(({ assigned_tests }) => assigned_tests)
        .flat()
        .sort(),
    ).toEqual([...testFiles].sort());
    expect(processEvidence[0]!.pid).not.toBe(processEvidence[1]!.pid);
    validateCoverageShardEvidence({ run: runBinding, plan, processes: processEvidence, terminals });

    const omitted = processEvidence.slice(0, 1);
    expect(() =>
      validateCoverageShardEvidence({ run: runBinding, plan, processes: omitted, terminals: terminals.slice(0, 1) }),
    ).toThrow(/missing|receipt|shard/u);
    const siblingClaim = structuredClone(processEvidence);
    siblingClaim[0]!.assigned_tests = [...siblingClaim[1]!.assigned_tests];
    expect(() => validateCoverageShardEvidence({ run: runBinding, plan, processes: siblingClaim, terminals })).toThrow(
      /assigned test|assignment/u,
    );

    const merged = mergeCoverageShardCounters(
      expectedMaps,
      processEvidence.map(({ coverage }) => coverage),
    );
    const sharedPath = path.join(root, 'src/shared.ts');
    const seededPath = path.join(root, 'src/seeded.ts');
    expect(merged[sharedPath]?.f['0']).toBe(3);
    expect(merged[seededPath]?.f['0']).toBe(0);
    expect(Object.keys(merged).sort()).toEqual(Object.keys(expectedMaps).sort());
    passed = true;
  } catch (error) {
    bodyFailed = true;
    bodyError = error;
  } finally {
    descriptorCloseErrors = closeOwnedLogFds();
  }
  if (descriptorCloseErrors.length > 0) {
    const cause = bodyFailed ? [bodyError, ...descriptorCloseErrors] : descriptorCloseErrors;
    console.error('Preserved untrusted two-shard pilot fixture after log descriptor close failure at ' + root);
    throw new AggregateError(cause, 'Pilot log descriptor cleanup failed.');
  }
  if (bodyFailed) throw bodyError;
  if (!passed) throw new Error('Untrusted two-shard pilot ended without completing its assertions.');
  try {
    budget.remaining();
  } catch (error) {
    console.error('Preserved untrusted two-shard pilot fixture after budget exhaustion at ' + root);
    throw error;
  }
  try {
    rmSync(root, { recursive: true, force: true });
  } catch (error) {
    console.error('Preserved untrusted two-shard pilot fixture after cleanup failure at ' + root);
    throw error;
  }
}, 25_000);
