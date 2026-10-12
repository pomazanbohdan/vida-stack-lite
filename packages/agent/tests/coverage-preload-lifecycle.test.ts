import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  capturedModuleInputs,
  coverageToolInputs,
  instrumentSource,
  sha256,
} from '../tooling/bun-coverage-evidence.ts';

const packageRoot = fileURLToPath(new URL('../', import.meta.url));
const capturedTools = new Map(coverageToolInputs.map((file) => [file, readFileSync(path.join(packageRoot, file))]));

// Real captured preload, small generated subjects. This is lifecycle evidence,
// not a full production coverage report or an admitted published baseline.
for (const outcome of [
  'pass',
  'assertion-failure',
  'report-write-failure',
  'query-import',
  'uncaptured-query',
] as const) {
  test(`captured preload finalizes after all file hooks: ${outcome}`, () => {
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
                  : `test('file ${index}', () => { expect(hit()).toBe(${outcome === 'assertion-failure' && index === 1 ? 2 : 1}); });\n`),
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
        '--parallel=1',
        '--no-isolate',
        '--preload',
        path.join(snapshot, 'tooling/bun-coverage-preload.ts'),
        ...tests.map((file) => './' + file),
      ];
      const manifest = {
        schema: 'VidaBunCoverageRun/v1',
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
        source_maps: {
          [path.join(root, 'src/fixture.ts')]: instrumentSource(path.join(root, 'src/fixture.ts'), source).fileCoverage,
          [path.join(root, 'src/other.ts')]: instrumentSource(path.join(root, 'src/other.ts'), otherSource)
            .fileCoverage,
        },
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
      expect(result.stderr).toContain(`Ran ${outcome === 'report-write-failure' ? 3 : 2} tests across 2 files.`);
      if (outcome === 'report-write-failure') {
        expect(result.stderr).toContain('Bun coverage child report failed:');
        expect(readFileSync(reports, 'utf8')).toBe('owned obstruction');
      } else if (outcome === 'uncaptured-query') {
        expect(result.stderr).toContain('Uncaptured query-bearing module input requested by test execution:');
        expect(result.stderr).toContain('src/unbound.ts?fresh=');
        expect(readFileSync(path.join(root, 'src/unbound.ts'), 'utf8')).toBe('export const unbound = true;\n');
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
  });
}
