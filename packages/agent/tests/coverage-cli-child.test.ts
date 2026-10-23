import { expect, test } from 'bun:test';
import assert from 'node:assert/strict';
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  copyFileSync,
  linkSync,
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
  coverageToolInputs,
  instrumentSource,
  sha256,
} from '../tooling/bun-coverage-evidence.ts';
import {
  cliCoverageChildMaps,
  cliCoverageEnvironmentSha256,
  createCliCoverageObserver,
  focusedControllerCliCoverage,
  type CliCoverageContext,
} from '../tooling/coverage-cli-child.ts';
import { mergeCoverageShardCounters } from '../tooling/coverage-shard-evidence.ts';

const packageRoot = fileURLToPath(new URL('../', import.meta.url));
const capturedTools = new Map(coverageToolInputs.map((file) => [file, readFileSync(path.join(packageRoot, file))]));
const executableHash = sha256(readFileSync(process.execPath));
const sourceFile = 'bin/development-controller.ts';
const testFile = 'tests/development-controller.test.ts';

function record(value: unknown): Record<string, unknown> {
  assert.ok(typeof value === 'object' && value !== null && !Array.isArray(value));
  return value as Record<string, unknown>;
}

test('CLI environment binding preserves absent variables and ignores only non-string entries', () => {
  expect(cliCoverageEnvironmentSha256({})).not.toBe(cliCoverageEnvironmentSha256({ NODE_ENV: 'test' }));
  expect(cliCoverageEnvironmentSha256({})).not.toBe(cliCoverageEnvironmentSha256({ TZ: 'Etc/UTC' }));
  expect(cliCoverageEnvironmentSha256({ A: '1', B: '2' })).toBe(cliCoverageEnvironmentSha256({ B: '2', A: '1' }));
  expect(cliCoverageEnvironmentSha256({ A: undefined })).toBe(cliCoverageEnvironmentSha256({}));
});

test('CLI observer preserves terminal and capture failures before refusing absent receipts', () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'coverage-cli-failures-'));
  let passed = false;
  try {
    const sourceDigest = { path: sourceFile, sha256: '0'.repeat(64) };
    const manifest = {
      schema: 'VidaBunCoverageRun/v2',
      run_id: randomUUID(),
      sources: [sourceDigest],
      tests: [testFile],
      test_selection: {
        mode: 'focused-diagnostic',
        contour: 'bun-development-controller',
        sources: [sourceFile],
        tests: [testFile],
      },
      source_fingerprint: '1'.repeat(64),
      test_fingerprint: '2'.repeat(64),
      tool_fingerprint: '3'.repeat(64),
      runtime_executable_sha256: executableHash,
      module_inputs: [sourceDigest],
      tool_inputs: [{ path: 'tooling/bun-coverage-preload.ts', sha256: '4'.repeat(64) }],
    };
    const context: CliCoverageContext = {
      root: path.resolve(packageRoot),
      snapshot: path.join(directory, 'snapshot'),
      directory,
      manifest,
      manifest_sha256: sha256(JSON.stringify(manifest)),
    };
    const args = [
      '--no-env-file',
      '--no-install',
      '--config=' + path.join(packageRoot, 'bunfig.toml'),
      path.join(packageRoot, sourceFile),
      'inspect',
    ];
    const options = { encoding: 'utf8', windowsHide: true, timeout: 4000 };
    for (const mode of ['timeout', 'signal', 'null-capture', 'throw', 'missing-receipt', 'native-invalid-utf8']) {
      const evidence = path.join(directory, mode);
      mkdirSync(evidence);
      const child: SpawnSyncReturns<Buffer> = {
        pid: 123,
        status: mode === 'timeout' || mode === 'signal' ? null : 1,
        signal: mode === 'signal' ? 'SIGTERM' : null,
        output: [null, Buffer.alloc(0), Buffer.alloc(0)],
        stdout: Buffer.alloc(0),
        stderr: Buffer.alloc(0),
        ...(mode === 'timeout' ? { error: new Error('synthetic timeout') } : {}),
      };
      if (mode === 'null-capture') Reflect.set(child, 'stdout', null);
      const actual = {
        spawnSync: ((...call: unknown[]) => {
          expect(call[1]).toEqual([
            '--preload',
            path.join(context.snapshot, 'tooling/bun-coverage-preload.ts'),
            ...args,
          ]);
          const launchOptions = record(call[2]);
          expect(launchOptions.timeout).toBe(options.timeout);
          expect(launchOptions.encoding).toBe('buffer');
          expect(launchOptions).not.toHaveProperty('shell');
          if (mode === 'throw') throw new Error('synthetic launch failure');
          if (mode === 'native-invalid-utf8')
            return spawnSync(
              process.execPath,
              [
                '--no-env-file',
                '--no-install',
                '-e',
                'process.stdout.write(Buffer.from([255])); process.exitCode = 1;',
              ],
              { encoding: 'buffer', timeout: 1000, maxBuffer: 1024 * 1024 },
            );
          return child;
        }) as typeof spawnSync,
      };
      const observer = createCliCoverageObserver({ ...context, directory: evidence }, actual);
      expect(() => observer.spawnSync(process.execPath, args, options)).toThrow();
      expect(() => observer.finish()).toThrow();
      const ids = readdirSync(path.join(evidence, 'cli'));
      expect(ids).toHaveLength(1);
      const proofDirectory = path.join(evidence, 'cli', ids[0]!);
      const terminal = record(JSON.parse(readFileSync(path.join(proofDirectory, 'terminal.json'), 'utf8')));
      expect(terminal).toMatchObject({
        schema: 'VidaBunCoverageCliTerminal/v1',
        parent_pid: process.pid,
        complete: mode === 'missing-receipt' || mode === 'native-invalid-utf8',
        capture_available: mode !== 'throw' && mode !== 'null-capture',
      });
      if (mode !== 'throw') {
        expect(readFileSync(path.join(proofDirectory, 'stdout.log'))).toEqual(
          mode === 'native-invalid-utf8' ? Buffer.from([255]) : Buffer.alloc(0),
        );
        expect(readFileSync(path.join(proofDirectory, 'stderr.log'), 'utf8')).toBe('');
        expect(terminal.exit_code).toBe(mode === 'native-invalid-utf8' ? 1 : child.status);
        expect(terminal.signal).toBe(child.signal);
        expect(terminal.error_observed).toBe(mode === 'timeout');
      }
    }
    let delegated = 0;
    const unchanged: SpawnSyncReturns<string> = {
      pid: 123,
      status: 0,
      signal: null,
      output: [null, 'unchanged', ''],
      stdout: 'unchanged',
      stderr: '',
    };
    const observer = createCliCoverageObserver(context, {
      spawnSync: ((...call: unknown[]) => {
        expect(call).toEqual([process.execPath, ['--version'], options]);
        delegated++;
        return unchanged;
      }) as typeof spawnSync,
    });
    expect(observer.spawnSync(process.execPath, ['--version'], options)).toBe(unchanged);
    expect(delegated).toBe(1);
    for (const extra of [{ env: {} }, { cwd: '/' }, { timeout: 5000 }, { shell: true }, { stdio: 'inherit' }])
      expect(() =>
        createCliCoverageObserver(context, { spawnSync }).spawnSync(process.execPath, args, { ...options, ...extra }),
      ).toThrow();
    passed = true;
  } finally {
    if (passed) rmSync(directory, { recursive: true, force: true });
    else console.error('Preserved failed CLI observer controls at ' + directory);
  }
});

test('focused CLI counters require native child custody and preserve canonical counter validation', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'coverage-cli-child-'));
  let passed = false;
  try {
    const runId = randomUUID();
    const snapshotRelative = `coverage/bun-unified/runs/${runId}/snapshot`;
    const snapshot = path.join(root, snapshotRelative);
    const directory = path.join(root, 'processes');
    const sourceText = [
      'export function hit() { return 7; }',
      'if (import.meta.main) {',
      '  try { throw new Error("Required controller option is missing."); }',
      '  catch (error) {',
      '    console.error(JSON.stringify({status:"blocked",code:"GAP-DEVELOPMENT-CONTROLLER-001",message:error.message}));',
      '    process.exitCode = 1;',
      '  }',
      '}',
    ].join('\n');
    const inputs = new Map(capturedTools);
    inputs.set(sourceFile, Buffer.from(sourceText));
    inputs.set(
      testFile,
      Buffer.from(
        [
          'import { expect, test } from "bun:test";',
          'import { spawnSync } from "node:child_process";',
          'import { hit } from "../bin/development-controller.ts";',
          'test("native denial", () => {',
          '  expect(hit()).toBe(7);',
          `  const child = spawnSync(process.execPath, ${JSON.stringify([
            '--no-env-file',
            '--no-install',
            '--config=' + path.join(root, 'bunfig.toml'),
            path.join(root, sourceFile),
            'inspect',
          ])}, {encoding:"utf8",windowsHide:true,timeout:4000});`,
          '  expect(child.error).toBeUndefined(); expect(child.signal).toBeNull(); expect(child.status).toBe(1);',
          '  expect(child.stdout).toBe("");',
          '  expect(JSON.parse(child.stderr)).toEqual({status:"blocked",code:"GAP-DEVELOPMENT-CONTROLLER-001",message:"Required controller option is missing."});',
          '});',
        ].join('\n'),
      ),
    );
    for (const [file, bytes] of inputs) {
      for (const base of [root, snapshot]) {
        const target = path.join(base, file);
        mkdirSync(path.dirname(target), { recursive: true });
        writeFileSync(target, bytes);
      }
    }
    writeFileSync(path.join(root, 'bunfig.toml'), '[test]\n');
    symlinkSync(path.join(packageRoot, 'node_modules'), path.join(root, 'node_modules'), 'dir');
    const digests = (files: readonly string[]) =>
      files.map((file) => {
        const bytes = inputs.get(file);
        assert.ok(bytes);
        return { path: file, sha256: sha256(bytes) };
      });
    const sources = digests([sourceFile]);
    const tests = [testFile];
    const testInputs = digests(tests);
    const toolInputs = digests(coverageToolInputs);
    const instrumented = instrumentSource(path.join(root, sourceFile), sourceText);
    const artifactPath = '__coverage_instrumented__/' + sourceFile;
    mkdirSync(path.dirname(path.join(snapshot, artifactPath)), { recursive: true });
    writeFileSync(path.join(snapshot, artifactPath), instrumented.code);
    const sourceMaps = { [path.join(root, sourceFile)]: instrumented.fileCoverage };
    const argv = [
      'test',
      '--parallel=1',
      '--no-isolate',
      '--preload',
      path.join(snapshot, 'tooling/bun-coverage-preload.ts'),
      './' + testFile,
    ];
    const manifest = {
      schema: 'VidaBunCoverageRun/v2',
      run_id: runId,
      snapshot_directory: snapshotRelative,
      source_fingerprint: sha256(JSON.stringify(sources)),
      test_fingerprint: sha256(JSON.stringify(testInputs)),
      tool_fingerprint: sha256(JSON.stringify(toolInputs)),
      runtime_executable_sha256: executableHash,
      sources,
      tests,
      test_inputs: testInputs,
      tool_inputs: toolInputs,
      module_inputs: capturedModuleInputs({ sources, test_inputs: testInputs, tool_inputs: toolInputs }),
      test_selection: {
        mode: 'focused-diagnostic',
        contour: 'bun-development-controller',
        sources: [sourceFile],
        tests,
      },
      active_argv: argv,
      execution_scope: { qualification: 'isolated-cli-protocol-only' },
      instrumented_sources: [
        {
          path: sourceFile,
          source_sha256: sources[0]!.sha256,
          artifact_path: artifactPath,
          artifact_sha256: sha256(instrumented.code),
        },
      ],
      source_maps: sourceMaps,
    };
    const manifestBytes = Buffer.from(JSON.stringify(manifest));
    const manifestPath = path.join(root, 'manifest.json');
    writeFileSync(manifestPath, manifestBytes);
    const result = spawnSync(process.execPath, argv, {
      cwd: root,
      encoding: 'utf8',
      timeout: 4000,
      maxBuffer: 1024 * 1024,
      env: {
        ...process.env,
        BUN_OPTIONS: '',
        VIDA_BUN_COVERAGE_ROOT: root,
        VIDA_BUN_COVERAGE_MANIFEST: manifestPath,
        VIDA_BUN_COVERAGE_REPORT_DIRECTORY: directory,
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
    expect(result.status, result.stderr).toBe(0);
    expect(result.stderr).toContain('Ran 1 test across 1 file.');
    const reportFiles = readdirSync(directory).filter((file) => file.endsWith('.json'));
    expect(reportFiles).toHaveLength(1);
    const report = record(JSON.parse(readFileSync(path.join(directory, reportFiles[0]!), 'utf8')));
    expect(report.pid).toBe(result.pid);
    expect(report.loaded_inputs).toContainEqual(testInputs[0]);
    const context: CliCoverageContext = { root, snapshot, directory, manifest, manifest_sha256: sha256(manifestBytes) };
    const expectedInputs = new Map(manifest.module_inputs.map((row) => [row.path, row.sha256]));
    const validateLoaded = (rows: unknown[]) => {
      const loaded = new Set<string>();
      for (const value of rows) {
        const row = record(value);
        assert.equal(typeof row.path, 'string');
        assert.equal(row.sha256, expectedInputs.get(String(row.path)));
        assert.ok(!loaded.has(String(row.path)));
        loaded.add(String(row.path));
      }
      return loaded;
    };
    const admit = (ctx: CliCoverageContext, raw: unknown, exitCode = 0) =>
      cliCoverageChildMaps(ctx, raw, result.pid, exitCode, validateLoaded);
    const maps = admit(context, report.cli_children);
    expect(maps).toHaveLength(1);
    const merged = mergeCoverageShardCounters(sourceMaps, [record(report.coverage), ...maps]);
    const parent = record(record(report.coverage)[path.join(root, sourceFile)]);
    const parentStatements = record(parent.s);
    const mergedStatements = merged[path.join(root, sourceFile)]!.s;
    expect(Object.entries(parentStatements).some(([key, count]) => count === 0 && mergedStatements[key]! > 0)).toBe(
      true,
    );
    const child = record((report.cli_children as unknown[])[0]);
    const childReceipt = record(
      JSON.parse(readFileSync(path.join(directory, String(record(child.receipt).path)), 'utf8')),
    );
    expect(childReceipt.loaded_inputs).not.toContainEqual(testInputs[0]);
    expect(childReceipt).not.toHaveProperty('assigned_tests');
    expect(() => admit(context, report.cli_children, 1)).toThrow();
    expect(() => admit(context, undefined)).toThrow();
    expect(() => admit(context, [])).toThrow();
    expect(() => admit(context, [child, child])).toThrow();
    for (const [key, value] of Object.entries({
      parent_pid: result.pid + 1,
      pid: result.pid,
      exit_code: 0,
      signal: 'SIGTERM',
      error_observed: true,
      complete: false,
      id: '../escape',
    })) {
      expect(() => admit(context, [{ ...child, [key]: value }]), key).toThrow();
    }
    for (const selection of [
      { ...manifest, schema: 'VidaBunCoverageRun/v3' },
      { ...manifest, test_selection: { ...manifest.test_selection, mode: 'full-current-test-set' } },
      { ...manifest, test_selection: { ...manifest.test_selection, contour: 'foreign' } },
      { ...manifest, test_selection: { ...manifest.test_selection, sources: [] } },
      { ...manifest, tests: [] },
    ]) {
      const unselected = { ...context, manifest: selection };
      expect(focusedControllerCliCoverage(selection)).toBe(false);
      expect(admit(unselected, undefined)).toEqual([]);
      expect(() => admit(unselected, report.cli_children)).toThrow();
    }
    const proofFiles = ['launch.json', 'receipt.json', 'terminal.json', 'stdout.log', 'stderr.log'];
    const negative = (
      label: string,
      mutate: (ctx: CliCoverageContext, row: Record<string, unknown>) => void,
      checkCounters = false,
    ) => {
      const negativeDirectory = path.join(root, 'negative', label);
      const copyContext = { ...context, directory: negativeDirectory };
      const row = structuredClone(child);
      const targetDirectory = path.join(negativeDirectory, 'cli', String(row.id));
      mkdirSync(targetDirectory, { recursive: true });
      for (const file of proofFiles)
        copyFileSync(path.join(directory, 'cli', String(row.id), file), path.join(targetDirectory, file));
      mutate(copyContext, row);
      expect(() => {
        const children = admit(copyContext, [row]);
        if (checkCounters) mergeCoverageShardCounters(sourceMaps, children);
      }, label).toThrow();
    };
    const rewrite = (
      ctx: CliCoverageContext,
      row: Record<string, unknown>,
      key: string,
      change: (proof: Record<string, unknown>) => void,
    ) => {
      const ref = record(row[key]);
      const file = path.join(ctx.directory, String(ref.path));
      const proof = record(JSON.parse(readFileSync(file, 'utf8')));
      change(proof);
      const bytes = Buffer.from(JSON.stringify(proof));
      writeFileSync(file, bytes);
      ref.sha256 = sha256(bytes);
    };
    for (const [key, value] of Object.entries({
      run_id: randomUUID(),
      parent_pid: result.pid + 1,
      pid: result.pid,
      exit_code: 0,
      manifest_sha256: '0'.repeat(64),
      runtime_executable_sha256: '0'.repeat(64),
      source_fingerprint: '0'.repeat(64),
      test_fingerprint: '0'.repeat(64),
      tool_fingerprint: '0'.repeat(64),
      module_inputs: [],
      environment_sha256: '0'.repeat(64),
      argv: [],
      exec_argv: [],
      external_module_inputs: [{}],
      loaded_inputs: [],
      coverage: {},
    }))
      negative('receipt-' + key, (ctx, row) =>
        rewrite(ctx, row, 'receipt', (proof) => {
          proof[key] = value;
        }),
      );
    for (const [key, value] of Object.entries({
      original_argv: [],
      effective_argv: [],
      cwd: '/',
      entry: {},
      preload: {},
      manifest_sha256: '0'.repeat(64),
    }))
      negative('launch-' + key, (ctx, row) =>
        rewrite(ctx, row, 'launch', (proof) => {
          proof[key] = value;
        }),
      );
    negative('capture-unavailable', (ctx, row) =>
      rewrite(ctx, row, 'terminal', (proof) => {
        proof.capture_available = false;
      }),
    );
    for (const counter of ['missing', 'negative', 'unsafe'])
      negative(
        'counter-' + counter,
        (ctx, row) =>
          rewrite(ctx, row, 'receipt', (proof) => {
            const file = record(record(proof.coverage)[path.join(root, sourceFile)]);
            const statements = record(file.s);
            const key = Object.keys(statements)[0]!;
            if (counter === 'missing') delete statements[key];
            else statements[key] = counter === 'negative' ? -1 : Number.MAX_SAFE_INTEGER + 1;
          }),
        true,
      );
    negative('missing-output', (ctx, row) => rmSync(path.join(ctx.directory, String(record(row.stderr).path))));
    negative('changed-output', (ctx, row) =>
      writeFileSync(path.join(ctx.directory, String(record(row.stderr).path)), '{}'),
    );
    for (const kind of ['symlink', 'hardlink'])
      negative(kind, (ctx, row) => {
        const target = path.join(ctx.directory, String(record(row.receipt).path));
        rmSync(target);
        const original = path.join(directory, String(record(child.receipt).path));
        if (kind === 'symlink') symlinkSync(original, target);
        else linkSync(original, target);
      });
    negative('oversized', (ctx, row) =>
      writeFileSync(path.join(ctx.directory, String(record(row.receipt).path)), Buffer.alloc(4 * 1024 * 1024 + 1)),
    );
    passed = true;
  } finally {
    if (passed) rmSync(root, { recursive: true, force: true });
    else console.error('Preserved failed CLI coverage protocol fixture at ' + root);
  }
});
