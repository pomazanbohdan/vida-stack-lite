import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  existsSync,
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
import {
  capturedModuleInputs,
  coverageEnvironmentSha256,
  coverageToolInputs,
  instrumentSource,
  sha256,
} from '../tooling/bun-coverage-evidence.ts';
import { planCoverageShards } from '../tooling/coverage-shard-plan.ts';
import { coverageAssignmentPlanSha256, coverageOutputPathsSha256 } from '../tooling/coverage-shard-evidence.ts';

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
