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
  focusedCliCoverage,
  focusedControllerCliCoverage,
  type CliCoverageContext,
} from '../tooling/coverage-cli-child.ts';
import { mergeCoverageShardCounters } from '../tooling/coverage-shard-evidence.ts';
import { cliCommandContracts } from '../bin/cli-command-contracts.ts';
import { runOptionDetails } from '../bin/run-cli-options.ts';

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

test.each(['controller', 'public', 'toolchain', 'run'] as const)(
  'focused %s CLI counters require native custody and canonical counter validation',
  (variant) => {
    const entry =
      variant === 'controller'
        ? sourceFile
        : variant === 'toolchain'
          ? 'bin/bun.ts'
          : variant === 'run'
            ? 'bin/run.ts'
            : 'bin/vida-agent.ts';
    const selectedSources = variant === 'public' ? ['bin/repair-work-state.ts', 'bin/scope.ts', entry] : [entry];
    const selectedTests =
      variant === 'controller'
        ? [testFile]
        : variant === 'toolchain'
          ? ['tests/bun-toolchain.test.ts', 'tests/bun-cache-routing.test.ts']
          : variant === 'run'
            ? ['tests/run-entrypoint.test.ts', 'tests/bun-cache-routing.test.ts']
            : [
                'tests/scope-help-parity.test.ts',
                'tests/scoped-source-snapshot.test.ts',
                'tests/run-entrypoint.test.ts',
                'tests/automatic-work-absorption.test.ts',
                'tests/admitted-runtime-canonical-intake.test.ts',
              ];
    const expectedExit = variant === 'controller' ? 1 : 0;
    const argument = variant === 'controller' ? 'inspect' : variant === 'toolchain' ? '--version' : '--help';
    const expectedOutput =
      variant === 'controller'
        ? {
            status: 'blocked',
            code: 'GAP-DEVELOPMENT-CONTROLLER-001',
            message: 'Required controller option is missing.',
          }
        : variant === 'toolchain'
          ? Bun.version
          : variant === 'run'
            ? {
                schema: 'VidaAgentCommandResult/v1',
                status: 'help',
                command: 'run',
                syntax: cliCommandContracts.run.syntax,
                options: runOptionDetails(),
              }
            : { schema: 'VidaAgentCommandResult/v1', status: 'help', commands: ['help'] };
    const subjects = [
      { entry, args: [argument], exit: expectedExit, output: expectedOutput },
      ...(variant === 'toolchain'
        ? [
            {
              entry,
              args: ['tooling/run-bun-coverage.ts'],
              exit: 1,
              output: 'Execution budget exhausted before child launch.\n',
            },
          ]
        : []),
      ...(variant !== 'public'
        ? []
        : [
            {
              entry: 'bin/scope.ts',
              args: [],
              exit: 1,
              output: {
                schema: 'VidaAgentCommandResult/v1',
                status: 'blocked',
                code: 'GAP-VIDA-SCOPE-001',
                message: cliCommandContracts.scope.syntax,
              },
            },
            {
              entry: 'bin/repair-work-state.ts',
              args: [],
              exit: 1,
              output: {
                status: 'blocked',
                message: 'vida work-state repair: kind, mode or absolute project root missing',
              },
            },
          ]),
    ];
    const root = mkdtempSync(path.join(os.tmpdir(), 'coverage-cli-child-'));
    let passed = false;
    try {
      const runId = randomUUID();
      const snapshotRelative = `coverage/bun-unified/runs/${runId}/snapshot`;
      const snapshot = path.join(root, snapshotRelative);
      const directory = path.join(root, 'processes');
      const sourceText =
        variant === 'controller'
          ? [
              'export function hit() { return 7; }',
              'if (import.meta.main) {',
              '  try { throw new Error("Required controller option is missing."); }',
              '  catch (error) {',
              '    console.error(JSON.stringify({status:"blocked",code:"GAP-DEVELOPMENT-CONTROLLER-001",message:error.message}));',
              '    process.exitCode = 1;',
              '  }',
              '}',
            ].join('\n')
          : variant === 'toolchain'
            ? [
                'export function hit() { return 7; }',
                'if (import.meta.main) {',
                '  if (process.argv[2] === "tooling/run-bun-coverage.ts") {',
                '    if (process.env.VIDA_PINNED_COMMAND_BUDGET_MS !== "4000" || process.env.VIDA_PINNED_COMMAND_DEADLINE_MS !== "1") throw new Error("Wrong clock witness startup environment");',
                '    console.error("Execution budget exhausted before child launch."); process.exitCode = 1;',
                '  } else console.log(Bun.version);',
                '}',
              ].join('\n')
            : variant === 'run'
              ? 'import { help } from "./cli-metadata.ts";\nexport function hit() { return 7; }\nif (import.meta.main) console.log(JSON.stringify(help()));\n'
              : 'export function hit() { return 7; }\nif (import.meta.main) console.log(' +
                JSON.stringify(JSON.stringify(expectedOutput)) +
                ');\n';
      const inputs = new Map(capturedTools);
      if (variant === 'run')
        inputs.set(
          'bin/cli-metadata.ts',
          Buffer.from(
            [
              'import { runOptionDetails } from "./run-cli-options.ts";',
              'import { cliCommandContracts } from "./cli-command-contracts.ts";',
              'export function help() { return {schema:"VidaAgentCommandResult/v1",status:"help",command:"run",syntax:cliCommandContracts.run.syntax,options:runOptionDetails()}; }',
            ].join('\n'),
          ),
        );
      if (variant === 'run') inputs.set('bin/workspace-database-cli.ts', Buffer.from('export const inert = true;\n'));
      for (const selected of selectedSources) {
        const subject = subjects.find((row) => row.entry === selected);
        assert.ok(subject);
        inputs.set(
          selected,
          Buffer.from(
            selected === entry
              ? sourceText
              : 'export function hit() { return 7; }\nif (import.meta.main) { console.error(' +
                  JSON.stringify(JSON.stringify(subject.output)) +
                  '); process.exitCode = 1; }\n',
          ),
        );
      }
      for (const selected of selectedTests.slice(1))
        inputs.set(
          selected,
          Buffer.from(
            'import {test,expect} from "bun:test"; test("assigned inert file",()=>expect(true).toBe(true));\n',
          ),
        );
      inputs.set(
        selectedTests[0]!,
        Buffer.from(
          [
            'import { expect, test } from "bun:test";',
            'import { spawnSync } from "node:child_process";',
            `import { hit } from "../${entry}";`,
            'test("native denial", () => {',
            '  expect(hit()).toBe(7);',
            ...subjects.flatMap((subject, index) => [
              `  const child${index} = spawnSync(process.execPath, ${JSON.stringify([
                '--no-env-file',
                '--no-install',
                '--config=' + path.join(root, 'bunfig.toml'),
                path.join(root, subject.entry),
                ...subject.args,
              ])}, {encoding:"utf8",windowsHide:true,timeout:4000${variant === 'toolchain' && subject.exit === 1 ? ',env:{...process.env,VIDA_PINNED_COMMAND_BUDGET_MS:"4000",VIDA_PINNED_COMMAND_DEADLINE_MS:"1"}' : ''}});`,
              `  expect(child${index}.error).toBeUndefined(); expect(child${index}.signal).toBeNull(); expect(child${index}.status).toBe(${subject.exit});`,
              `  expect(child${index}.${subject.exit === 1 ? 'stdout' : 'stderr'}).toBe("");`,
              variant === 'toolchain'
                ? `  expect(child${index}.${subject.exit === 0 ? 'stdout' : 'stderr'}).toBe(${JSON.stringify(subject.exit === 0 ? Bun.version + '\n' : subject.output)});`
                : `  expect(JSON.parse(child${index}.${subject.exit === 1 ? 'stderr' : 'stdout'})).toEqual(${JSON.stringify(subject.output)});`,
            ]),
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
      const sources = digests(selectedSources);
      const tests = selectedTests;
      const testInputs = digests(tests);
      const toolInputs = digests([
        ...coverageToolInputs,
        ...(variant === 'run' ? ['bin/cli-metadata.ts', 'bin/workspace-database-cli.ts'] : []),
      ]);
      const instrumentedSources = sources.map((source) => {
        const bytes = inputs.get(source.path)!;
        const instrumented = instrumentSource(path.join(root, source.path), bytes.toString('utf8'));
        const artifactPath = '__coverage_instrumented__/' + source.path;
        mkdirSync(path.dirname(path.join(snapshot, artifactPath)), { recursive: true });
        writeFileSync(path.join(snapshot, artifactPath), instrumented.code);
        return {
          row: {
            path: source.path,
            source_sha256: source.sha256,
            artifact_path: artifactPath,
            artifact_sha256: sha256(instrumented.code),
          },
          fileCoverage: instrumented.fileCoverage,
        };
      });
      const sourceMaps = Object.fromEntries(
        instrumentedSources.map(({ row, fileCoverage }) => [path.join(root, row.path), fileCoverage]),
      );
      const argv = [
        'test',
        '--parallel=1',
        '--no-isolate',
        '--preload',
        path.join(snapshot, 'tooling/bun-coverage-preload.ts'),
        ...tests.map((file) => './' + file),
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
          contour:
            variant === 'controller'
              ? 'bun-development-controller'
              : variant === 'toolchain'
                ? 'bun-cli-toolchain'
                : variant === 'run'
                  ? 'bun-cli-run'
                  : 'bun-cli-public-entrypoints',
          sources: selectedSources,
          tests,
        },
        active_argv: argv,
        execution_scope: { qualification: 'isolated-cli-protocol-only' },
        instrumented_sources: instrumentedSources.map(({ row }) => row),
        source_maps: sourceMaps,
      };
      const manifestBytes = Buffer.from(JSON.stringify(manifest));
      expect(focusedCliCoverage(manifest)).toBe(true);
      expect(focusedControllerCliCoverage(manifest)).toBe(variant === 'controller');
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
      expect(result.stderr).toContain(
        variant === 'controller'
          ? 'Ran 1 test across 1 file.'
          : variant === 'toolchain' || variant === 'run'
            ? 'Ran 2 tests across 2 files.'
            : 'Ran 5 tests across 5 files.',
      );
      const reportFiles = readdirSync(directory).filter((file) => file.endsWith('.json'));
      expect(reportFiles).toHaveLength(1);
      const report = record(JSON.parse(readFileSync(path.join(directory, reportFiles[0]!), 'utf8')));
      expect(report.pid).toBe(result.pid);
      for (const testInput of testInputs) expect(report.loaded_inputs).toContainEqual(testInput);
      const context: CliCoverageContext = {
        root,
        snapshot,
        directory,
        manifest,
        manifest_sha256: sha256(manifestBytes),
      };
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
      expect(maps).toHaveLength(subjects.length);
      const merged = mergeCoverageShardCounters(sourceMaps, [record(report.coverage), ...maps]);
      const parent = record(record(report.coverage)[path.join(root, entry)]);
      const parentStatements = record(parent.s);
      const mergedStatements = merged[path.join(root, entry)]!.s;
      expect(Object.entries(parentStatements).some(([key, count]) => count === 0 && mergedStatements[key]! > 0)).toBe(
        true,
      );
      assert.ok(Array.isArray(report.cli_children));
      const children = report.cli_children.map(record);
      const child = children[0]!;
      const siblings = children.slice(1);
      const childReceipt = record(
        JSON.parse(readFileSync(path.join(directory, String(record(child.receipt).path)), 'utf8')),
      );
      expect(childReceipt.loaded_inputs).not.toContainEqual(testInputs[0]);
      expect(childReceipt).not.toHaveProperty('assigned_tests');
      expect(() => admit(context, report.cli_children, 1)).toThrow();
      expect(() => admit(context, undefined)).toThrow();
      expect(() => admit(context, [])).toThrow();
      expect(() => admit(context, [child, child])).toThrow();
      if (subjects.length > 1) {
        for (const length of variant === 'public' ? [1, 2, 4] : [1, 3])
          expect(() =>
            admit(
              context,
              Array.from({ length }, (_, index) => children[index % children.length]),
            ),
          ).toThrow();
        if (variant === 'public')
          expect(() => admit(context, [child, child, children[2]])).toThrow('Duplicate focused CLI');
      }
      for (const [key, value] of Object.entries({
        parent_pid: result.pid + 1,
        pid: result.pid,
        exit_code: expectedExit === 1 ? 0 : 1,
        signal: 'SIGTERM',
        error_observed: true,
        complete: false,
        id: '../escape',
      })) {
        expect(() => admit(context, [{ ...child, [key]: value }, ...siblings]), key).toThrow();
      }
      for (const selection of [
        { ...manifest, schema: 'VidaBunCoverageRun/v3' },
        { ...manifest, test_selection: { ...manifest.test_selection, mode: 'full-current-test-set' } },
        { ...manifest, test_selection: { ...manifest.test_selection, contour: 'foreign' } },
        { ...manifest, test_selection: { ...manifest.test_selection, sources: [] } },
        { ...manifest, tests: [] },
      ]) {
        const unselected = { ...context, manifest: selection };
        expect(focusedCliCoverage(selection)).toBe(false);
        expect(focusedControllerCliCoverage(selection)).toBe(false);
        expect(admit(unselected, undefined)).toEqual([]);
        expect(() => admit(unselected, report.cli_children)).toThrow();
      }
      const proofFiles = ['launch.json', 'receipt.json', 'terminal.json', 'stdout.log', 'stderr.log'];
      const negative = (
        label: string,
        mutate: (ctx: CliCoverageContext, row: Record<string, unknown>) => void,
        checkCounters = false,
        subjectIndex = 0,
        expectedError?: string,
      ) => {
        const negativeDirectory = path.join(root, 'negative', label);
        const copyContext = { ...context, directory: negativeDirectory };
        const row = structuredClone(children[subjectIndex]!);
        for (const original of children) {
          const targetDirectory = path.join(negativeDirectory, 'cli', String(original.id));
          mkdirSync(targetDirectory, { recursive: true });
          for (const file of proofFiles)
            copyFileSync(path.join(directory, 'cli', String(original.id), file), path.join(targetDirectory, file));
        }
        mutate(copyContext, row);
        expect(() => {
          const maps = admit(
            copyContext,
            children.map((original, index) => (index === subjectIndex ? row : original)),
          );
          if (checkCounters) mergeCoverageShardCounters(sourceMaps, maps);
        }, label).toThrow(expectedError);
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
        exit_code: expectedExit === 1 ? 0 : 1,
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
        environment_sha256: '0'.repeat(64),
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
              const file = record(record(proof.coverage)[path.join(root, entry)]);
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
      if (variant === 'run') {
        for (const [key, value] of Object.entries({
          command: 'scope',
          syntax: 'foreign',
          options: [],
          status: 'blocked',
          schema: 'foreign',
        }))
          negative('run-help-' + key, (ctx, row) => {
            const reference = record(row.stdout);
            const file = path.join(ctx.directory, String(reference.path));
            const output = record(JSON.parse(readFileSync(file, 'utf8')));
            output[key] = value;
            const bytes = Buffer.from(JSON.stringify(output));
            writeFileSync(file, bytes);
            row.stdout = { ...reference, sha256: sha256(bytes), bytes: bytes.length };
            rewrite(ctx, row, 'terminal', (proof) => {
              proof.stdout = row.stdout;
            });
          });
        negative(
          'run-metadata-unloaded',
          (ctx, row) =>
            rewrite(ctx, row, 'receipt', (proof) => {
              assert.ok(Array.isArray(proof.loaded_inputs));
              proof.loaded_inputs = proof.loaded_inputs.filter((input) => record(input).path !== 'bin/cli-metadata.ts');
            }),
          false,
          0,
          'Run help metadata module was not loaded: bin/cli-metadata.ts',
        );
        negative(
          'run-operation-loaded',
          (ctx, row) =>
            rewrite(ctx, row, 'receipt', (proof) => {
              assert.ok(Array.isArray(proof.loaded_inputs));
              const operation = manifest.module_inputs.find((input) => input.path === 'bin/workspace-database-cli.ts');
              assert.ok(operation);
              const loadedInputs: unknown[] = proof.loaded_inputs;
              proof.loaded_inputs = [...loadedInputs, operation];
            }),
          false,
          0,
          'Run help loaded operation-only runtime modules.',
        );
      }
      if (variant === 'toolchain') {
        negative(
          'duplicate-clock-profile',
          (ctx, row) => {
            const clock = children[1]!;
            const clockLaunch = record(
              JSON.parse(readFileSync(path.join(ctx.directory, String(record(clock.launch).path)), 'utf8')),
            );
            const clockReceipt = record(
              JSON.parse(readFileSync(path.join(ctx.directory, String(record(clock.receipt).path)), 'utf8')),
            );
            row.exit_code = 1;
            rewrite(ctx, row, 'launch', (proof) => {
              for (const key of ['original_argv', 'effective_argv', 'environment_sha256'])
                proof[key] = clockLaunch[key];
            });
            rewrite(ctx, row, 'receipt', (proof) => {
              proof.exit_code = 1;
              for (const key of ['argv', 'exec_argv', 'environment_sha256']) proof[key] = clockReceipt[key];
            });
            for (const [key, bytes] of [
              ['stdout', Buffer.alloc(0)],
              ['stderr', Buffer.from('Execution budget exhausted before child launch.\n')],
            ] as const) {
              const ref = record(row[key]);
              writeFileSync(path.join(ctx.directory, String(ref.path)), bytes);
              ref.sha256 = sha256(bytes);
              ref.bytes = bytes.length;
            }
            rewrite(ctx, row, 'terminal', (proof) => {
              proof.exit_code = 1;
              proof.stdout = row.stdout;
              proof.stderr = row.stderr;
            });
          },
          false,
          0,
          'Duplicate focused CLI subject.',
        );
        negative('noncanonical-version-line', (ctx, row) => {
          const ref = record(row.stdout);
          const bytes = Buffer.from(Bun.version + '\nextra\n');
          writeFileSync(path.join(ctx.directory, String(ref.path)), bytes);
          ref.sha256 = sha256(bytes);
          ref.bytes = bytes.length;
          rewrite(ctx, row, 'terminal', (proof) => {
            proof.stdout = ref;
          });
        });
        negative(
          'noncanonical-clock-denial',
          (ctx, row) => {
            const ref = record(row.stderr);
            const bytes = Buffer.from('Wrong rejection.\n');
            writeFileSync(path.join(ctx.directory, String(ref.path)), bytes);
            ref.sha256 = sha256(bytes);
            ref.bytes = bytes.length;
            rewrite(ctx, row, 'terminal', (proof) => {
              proof.stderr = ref;
            });
          },
          false,
          1,
        );
        const clockArguments = [
          '--no-env-file',
          '--no-install',
          '--config=' + path.join(root, 'bunfig.toml'),
          path.join(root, entry),
          'tooling/run-bun-coverage.ts',
        ];
        for (const deadline of [undefined, '2']) {
          const observer = createCliCoverageObserver(context, {
            spawnSync: () => assert.fail('Wrong environment launched'),
          });
          expect(() =>
            observer.spawnSync(process.execPath, clockArguments, {
              encoding: 'utf8',
              windowsHide: true,
              timeout: 4000,
              env: { ...process.env, VIDA_PINNED_COMMAND_BUDGET_MS: '4000', VIDA_PINNED_COMMAND_DEADLINE_MS: deadline },
            }),
          ).toThrow('exact scenario environment');
        }
        const withoutPin = {
          ...context,
          manifest: { ...manifest, tool_inputs: manifest.tool_inputs.filter((item) => item.path !== '.bun-version') },
        };
        expect(() => admit(withoutPin, report.cli_children)).toThrow('Captured Bun pin is missing.');
      }
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
  },
);
