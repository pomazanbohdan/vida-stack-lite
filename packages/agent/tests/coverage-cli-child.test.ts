import { expect, test } from 'bun:test';
import assert from 'node:assert/strict';
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  constants as fsConstants,
  closeSync,
  copyFileSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openRootFileSync, readFileDescriptorBoundedSync } from '@openclaw/fs-safe/advanced';
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
  preparedCliInputRoles,
  type CliCoverageContext,
} from '../tooling/coverage-cli-child.ts';
import { createPreparedReadCapture } from '../tooling/coverage-cli-prepared-inputs.ts';
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

function seedPreparedFixture(fixtureRoot: string, workId: string): void {
  const fixtureInputs = new Map([
    ['agent-runtime.config.v1.yaml', 'inert protocol config'],
    ['.agent/runtime-initialization.v1.json', '{}'],
    [
      '.agent/work/' + workId + '/intake.json',
      JSON.stringify({ scope_path: 'scope.json', acceptance_path: 'acceptance.json' }),
    ],
    ['scope.json', JSON.stringify({ implementation_paths: ['selected.txt'] })],
    ['acceptance.json', '{}'],
    ['selected.txt', 'inert selected bytes'],
  ]);
  for (const [relative, bytes] of fixtureInputs) {
    const file = path.join(fixtureRoot, relative);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, bytes);
  }
}

test('prepared input capture binds complete readFileSync bytes and rejects unsupported encodings', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'vida-prepared-read-capture-'));
  const intake = path.join(root, '.agent/work/prepared/intake.json');
  const inputFiles = new Map([
    [path.join(root, 'agent-runtime.config.v1.yaml'), 'inert protocol config'],
    [path.join(root, '.agent/runtime-initialization.v1.json'), '{}'],
    [intake, JSON.stringify({ scope_path: 'scope.json', acceptance_path: 'acceptance.json' })],
    [path.join(root, 'scope.json'), JSON.stringify({ implementation_paths: ['selected.txt'] })],
    [path.join(root, 'acceptance.json'), '{}'],
    [path.join(root, 'selected.txt'), 'inert selected bytes'],
  ]);
  try {
    for (const [file, bytes] of inputFiles) {
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, bytes);
    }
    const expected = inputFiles.get(intake)!;
    for (const method of ['path', 'descriptor'] as const) {
      const capture = createPreparedReadCapture(root, intake, [], undefined, ['intake'], preparedCliInputRoles);
      let actual: unknown;
      if (method === 'path') {
        actual = capture.apis.readFileSync(intake, 'utf8');
      } else {
        const fd = capture.apis.openSync(intake, 'r');
        actual = capture.apis.readFileSync(fd);
        capture.apis.closeSync(fd);
      }
      const bytes = method === 'path' ? Buffer.from(String(actual), 'utf8') : (actual as Buffer);
      assert.deepEqual(bytes, Buffer.from(expected));
      const evidence = capture.finish();
      assert.equal(evidence.complete, true, JSON.stringify(evidence.issues));
      assert.deepEqual(evidence.issues, []);
      assert.equal(evidence.streams.length, 1);
      assert.equal(evidence.streams[0]!.read_method, 'readFileSync');
      assert.equal(evidence.operations.length, 1);
      assert.equal(evidence.operations[0]!.read_method, 'readFileSync');
      assert.equal(evidence.operations[0]!.eof, true);
    }

    const rootFileCapture = createPreparedReadCapture(
      root,
      intake,
      [],
      undefined,
      ['runtime-config'],
      preparedCliInputRoles,
    );
    const runtimeConfig = path.join(root, 'agent-runtime.config.v1.yaml');
    const opened = openRootFileSync({
      absolutePath: runtimeConfig,
      rootPath: root,
      boundaryLabel: 'prepared input test',
      maxBytes: 1024,
    });
    assert.equal(opened.ok, true);
    if (!opened.ok) throw new Error('Root-bounded prepared input open failed.');
    rootFileCapture.observeRootFileOpen(opened.path, opened.fd);
    const rootFileBytes = rootFileCapture.wrapBoundedDescriptorRead(readFileDescriptorBoundedSync)(opened.fd, 1024);
    rootFileCapture.apis.closeSync(opened.fd);
    assert.equal(rootFileBytes.toString(), inputFiles.get(runtimeConfig));
    const rootFileEvidence = rootFileCapture.finish();
    assert.equal(rootFileEvidence.complete, true, JSON.stringify(rootFileEvidence.issues));
    assert.equal(rootFileEvidence.streams[0]!.read_method, 'readFileDescriptorBoundedSync');
    assert.equal(rootFileEvidence.operations[0]!.bytes_read, rootFileBytes.length);
    assert.equal(rootFileEvidence.operations[0]!.eof, false);
    assert.equal(rootFileEvidence.operations[0]!.complete_result, true);

    if (process.platform === 'linux') {
      const parentFd = openSync(root, fsConstants.O_RDONLY | fsConstants.O_DIRECTORY);
      const descriptorCapture = createPreparedReadCapture(
        root,
        intake,
        [],
        undefined,
        ['runtime-config'],
        preparedCliInputRoles,
      );
      const descriptorPath = `/proc/self/fd/${parentFd}/agent-runtime.config.v1.yaml`;
      const descriptorFd = descriptorCapture.apis.openSync(
        descriptorPath,
        fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
      );
      const descriptorBuffer = Buffer.alloc(Buffer.byteLength(inputFiles.get(runtimeConfig)!));
      const descriptorBytes = descriptorCapture.apis.readSync(
        descriptorFd,
        descriptorBuffer,
        0,
        descriptorBuffer.length,
        null,
      );
      assert.equal(descriptorCapture.apis.readSync(descriptorFd, Buffer.alloc(1), 0, 1, null), 0);
      descriptorCapture.apis.closeSync(descriptorFd);
      closeSync(parentFd);
      assert.equal(descriptorBytes, descriptorBuffer.length);
      assert.equal(descriptorBuffer.toString(), inputFiles.get(runtimeConfig));
      const descriptorEvidence = descriptorCapture.finish();
      assert.equal(descriptorEvidence.complete, true, JSON.stringify(descriptorEvidence.issues));
      assert.equal(descriptorEvidence.streams[0]!.path, runtimeConfig);
      assert.equal(descriptorEvidence.operations.length, 2);
      assert.equal(descriptorEvidence.operations[1]!.eof, true);
    }

    const transient = path.join(root, 'unprepared-transient.txt');
    writeFileSync(transient, 'not a prepared input');
    const unrelatedCapture = createPreparedReadCapture(root, intake, [], undefined, [], []);
    const transientFd = unrelatedCapture.apis.openSync(transient, 'r');
    unlinkSync(transient);
    unrelatedCapture.observeRootFileOpen(transient, transientFd);
    unrelatedCapture.apis.closeSync(transientFd);
    assert.deepEqual(unrelatedCapture.finish().issues, []);

    const acceptance = path.join(root, 'acceptance.json');
    writeFileSync(acceptance, Buffer.from([0xff]));
    const byteCapture = createPreparedReadCapture(
      root,
      intake,
      [{ path: acceptance, role: 'acceptance' }],
      undefined,
      ['acceptance'],
      preparedCliInputRoles,
    );
    assert.equal(byteCapture.apis.readFileSync(acceptance, 'utf8'), '\ufffd');
    const byteEvidence = byteCapture.finish();
    assert.equal(byteEvidence.complete, true, JSON.stringify(byteEvidence.issues));
    assert.deepEqual(Buffer.from(String(byteEvidence.payloads[0]!.bytes), 'base64'), Buffer.from([0xff]));

    const unsupportedCapture = createPreparedReadCapture(
      root,
      intake,
      [],
      undefined,
      ['intake'],
      preparedCliInputRoles,
    );
    unsupportedCapture.apis.readFileSync(intake, 'latin1');
    const unsupportedEvidence = unsupportedCapture.finish();
    assert.equal(unsupportedEvidence.complete, false);
    assert.ok(unsupportedEvidence.issues.includes('Prepared readFileSync options are unsupported.'));

    const failedCapture = createPreparedReadCapture(root, intake, [], () => false, ['intake'], preparedCliInputRoles);
    const failedResult = failedCapture.apis.readFileSync(intake, 'utf8');
    assert.equal(typeof failedResult, 'string');
    assert.equal(failedResult, expected);
    assert.equal(failedCapture.finish().complete, false);

    const alias = path.join(root, 'intake-alias.json');
    symlinkSync(intake, alias);
    const aliasCapture = createPreparedReadCapture(root, intake, [], undefined, ['intake'], preparedCliInputRoles);
    assert.deepEqual(aliasCapture.apis.readFileSync(alias), Buffer.from(expected));
    const aliasEvidence = aliasCapture.finish();
    assert.equal(aliasEvidence.complete, false);
    assert.ok(aliasEvidence.issues.includes('Prepared readFileSync path is not canonical.'));

    const aliasOpenCapture = createPreparedReadCapture(root, intake, [], undefined, ['intake'], preparedCliInputRoles);
    const aliasFd = aliasOpenCapture.apis.openSync(alias, 'r');
    assert.deepEqual(aliasOpenCapture.apis.readFileSync(aliasFd), Buffer.from(expected));
    aliasOpenCapture.apis.closeSync(aliasFd);
    const aliasOpenEvidence = aliasOpenCapture.finish();
    assert.equal(aliasOpenEvidence.complete, false);
    assert.ok(aliasOpenEvidence.issues.includes('Prepared input open path is not canonical.'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

function preparedCliArguments(fixtureRoot: string, workId: string): string[] {
  return [
    path.join(packageRoot, 'bin/run.ts'),
    '--project-root',
    fixtureRoot,
    '--repository',
    'fixture-repository',
    '--project',
    'fixture-project',
    '--work-path',
    'agent-runtime-new',
    '--work-id',
    workId,
    '--attempt',
    '1',
    '--scope-digest',
    'a'.repeat(64),
    '--team',
    'default-development',
    '--kind',
    'research',
    '--intent',
    'information_research',
    '--workflow',
    'information_research_light',
    '--intake',
    path.join(fixtureRoot, '.agent', 'work', workId, 'intake.json'),
  ];
}

function preparedCliOptions(timeout: number): {
  cwd: string;
  encoding: 'utf8';
  windowsHide: true;
  timeout: number;
  killSignal: 'SIGKILL';
  detached: true;
  env: NodeJS.ProcessEnv;
} {
  return {
    cwd: path.resolve(packageRoot),
    encoding: 'utf8',
    windowsHide: true,
    timeout,
    killSignal: 'SIGKILL',
    detached: true,
    env: {
      ...process.env,
      BUN_OPTIONS: '',
      VIDA_PINNED_COMMAND_BUDGET_MS: String(timeout),
      VIDA_PINNED_COMMAND_DEADLINE_MS: String(Date.now() + timeout),
    },
  };
}

function preparedObserverContext(directory: string): CliCoverageContext {
  const source = { path: 'bin/run.ts', sha256: '0'.repeat(64) };
  const manifest = {
    schema: 'VidaBunCoverageRun/v2',
    run_id: randomUUID(),
    sources: [source],
    tests: ['tests/run-entrypoint.test.ts', 'tests/bun-cache-routing.test.ts'],
    test_selection: {
      mode: 'focused-diagnostic',
      contour: 'bun-cli-run',
      sources: ['bin/run.ts'],
      tests: ['tests/run-entrypoint.test.ts', 'tests/bun-cache-routing.test.ts'],
    },
    source_fingerprint: '1'.repeat(64),
    test_fingerprint: '2'.repeat(64),
    tool_fingerprint: '3'.repeat(64),
    runtime_executable_sha256: executableHash,
    module_inputs: [source],
    tool_inputs: ['tooling/bun-coverage-preload.ts'].map((file) => ({
      path: file,
      sha256: sha256(capturedTools.get(file)!),
    })),
  };
  return {
    root: path.resolve(packageRoot),
    snapshot: directory,
    directory,
    manifest,
    manifest_sha256: sha256(JSON.stringify(manifest)),
  };
}

test('CLI environment binding preserves absent variables and ignores only non-string entries', () => {
  expect(cliCoverageEnvironmentSha256({})).not.toBe(cliCoverageEnvironmentSha256({ NODE_ENV: 'test' }));
  expect(cliCoverageEnvironmentSha256({})).not.toBe(cliCoverageEnvironmentSha256({ TZ: 'Etc/UTC' }));
  expect(cliCoverageEnvironmentSha256({ A: '1', B: '2' })).toBe(cliCoverageEnvironmentSha256({ B: '2', A: '1' }));
  expect(cliCoverageEnvironmentSha256({ A: undefined })).toBe(cliCoverageEnvironmentSha256({}));
});

test('prepared run CLI arming is collector-owned, one-shot and required at finish', () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'coverage-cli-prepared-arm-'));
  let passed = false;
  try {
    const runSource = { path: 'bin/run.ts', sha256: '0'.repeat(64) };
    const manifest = {
      schema: 'VidaBunCoverageRun/v2',
      run_id: randomUUID(),
      sources: [runSource],
      tests: ['tests/run-entrypoint.test.ts', 'tests/bun-cache-routing.test.ts'],
      test_selection: {
        mode: 'focused-diagnostic',
        contour: 'bun-cli-run',
        sources: ['bin/run.ts'],
        tests: ['tests/run-entrypoint.test.ts', 'tests/bun-cache-routing.test.ts'],
      },
      source_fingerprint: '1'.repeat(64),
      test_fingerprint: '2'.repeat(64),
      tool_fingerprint: '3'.repeat(64),
      runtime_executable_sha256: executableHash,
      module_inputs: [runSource],
      tool_inputs: ['tooling/bun-coverage-preload.ts'].map((file) => ({
        path: file,
        sha256: sha256(capturedTools.get(file)!),
      })),
    };
    const context: CliCoverageContext = {
      root: path.resolve(packageRoot),
      snapshot: directory,
      directory,
      manifest,
      manifest_sha256: sha256(JSON.stringify(manifest)),
    };
    let forwarded = 0;
    const observer = createCliCoverageObserver(context, {
      spawnSync: ((): SpawnSyncReturns<string | Buffer> => {
        forwarded++;
        return {
          pid: 123,
          status: 0,
          signal: null,
          stdout: Buffer.alloc(0),
          stderr: Buffer.alloc(0),
          output: [null, Buffer.alloc(0), Buffer.alloc(0)],
        };
      }) as typeof spawnSync,
    });
    const workId = 'mutation-run-' + randomUUID();
    const preparedArgs = [
      path.join(packageRoot, 'bin/run.ts'),
      '--project-root',
      path.join(directory, 'fixture'),
      '--repository',
      'fixture-repository',
      '--project',
      'fixture-project',
      '--work-path',
      'agent-runtime-new',
      '--work-id',
      workId,
      '--attempt',
      '1',
      '--scope-digest',
      'a'.repeat(64),
      '--team',
      'default-development',
      '--kind',
      'research',
      '--intent',
      'information_research',
      '--workflow',
      'information_research_light',
      '--intake',
      path.join(directory, 'fixture', '.agent', 'work', workId, 'intake.json'),
    ];
    expect(
      observer.spawnSync(process.execPath, preparedArgs, { encoding: 'utf8', windowsHide: true, timeout: 4000 }).status,
    ).toBe(0);
    expect(forwarded).toBe(1);
    observer.armPrepared();
    expect(() => observer.armPrepared()).toThrow('already armed or active');
    expect(() =>
      observer.spawnSync(process.execPath, ['--version'], { encoding: 'utf8', windowsHide: true, timeout: 4000 }),
    ).toThrow('foreign command or argv');
    expect(() => observer.finish()).toThrow('not all observed');
    const missing = createCliCoverageObserver(context, { spawnSync });
    expect(() => missing.finish()).toThrow('not all observed');
    passed = true;
  } finally {
    if (passed) rmSync(directory, { recursive: true, force: true });
    else console.error('Preserved failed prepared CLI arming controls at ' + directory);
  }
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

test.skipIf(process.platform === 'win32')(
  'prepared CLI input snapshot failures retain the native result before propagation',
  () => {
    const directory = mkdtempSync(path.join(os.tmpdir(), 'coverage-cli-prepared-snapshot-'));
    let passed = false;
    const nativeKill = Object.getOwnPropertyDescriptor(process, 'kill');
    assert.ok(nativeKill);
    try {
      const beforeDirectory = path.join(directory, 'before');
      mkdirSync(beforeDirectory);
      const beforeContext = preparedObserverContext(beforeDirectory);
      const missingRoot = path.join(directory, 'missing-root');
      const missingArgs = preparedCliArguments(missingRoot, 'mutation-run-' + randomUUID());
      let beforeDelegated = 0;
      const beforeObserver = createCliCoverageObserver(beforeContext, {
        spawnSync: (() => {
          beforeDelegated++;
          return assert.fail('Missing prepared inputs must fail before native dispatch.');
        }) as typeof spawnSync,
      });
      beforeObserver.armPrepared();
      expect(() => beforeObserver.spawnSync(process.execPath, missingArgs, preparedCliOptions(4000))).toThrow(
        'Prepared CLI input snapshot failed before dispatch.',
      );
      expect(beforeDelegated).toBe(0);
      expect(beforeObserver.preparedNativeResult()).toBeUndefined();
      expect(readdirSync(beforeDirectory)).toEqual([]);

      const afterDirectory = path.join(directory, 'after');
      mkdirSync(afterDirectory);
      const afterContext = preparedObserverContext(afterDirectory);
      const fixtureRoot = path.join(directory, 'fixture');
      const workId = 'mutation-run-' + randomUUID();
      seedPreparedFixture(fixtureRoot, workId);
      const nativeResult: SpawnSyncReturns<Buffer<ArrayBuffer>> = {
        pid: 123,
        status: 0,
        signal: null,
        output: [null, Buffer.from('prepared stdout'), Buffer.from('prepared stderr')],
        stdout: Buffer.from('prepared stdout'),
        stderr: Buffer.from('prepared stderr'),
      };
      const afterObserver = createCliCoverageObserver(afterContext, {
        spawnSync: ((): SpawnSyncReturns<string | Buffer> => {
          rmSync(path.join(fixtureRoot, 'selected.txt'));
          return nativeResult;
        }) as typeof spawnSync,
      });
      afterObserver.armPrepared();
      Reflect.set(process, 'kill', (pid: number, signal?: number | NodeJS.Signals) => {
        expect(pid).toBe(-nativeResult.pid);
        expect(signal).toBe(0);
        const error = new Error('Synthetic process group is gone.');
        Reflect.set(error, 'code', 'ESRCH');
        throw error;
      });
      expect(() =>
        afterObserver.spawnSync(process.execPath, preparedCliArguments(fixtureRoot, workId), preparedCliOptions(4000)),
      ).toThrow('Prepared CLI input snapshot failed after native call.');
      expect(afterObserver.preparedNativeResult()).toBe(nativeResult);
      expect(afterObserver.preparedProcessGroupState()).toBe('gone');
      const ids = readdirSync(path.join(afterDirectory, 'cli'));
      expect(ids).toHaveLength(1);
      const proofDirectory = path.join(afterDirectory, 'cli', ids[0]!);
      const terminal = record(JSON.parse(readFileSync(path.join(proofDirectory, 'terminal.json'), 'utf8')));
      expect(terminal.prepared_input_error).toBe('Prepared CLI input snapshot failed after native call.');
      expect(terminal.capture_available).toBe(true);
      expect(readFileSync(path.join(proofDirectory, 'stdout.log'))).toEqual(nativeResult.stdout);
      expect(readFileSync(path.join(proofDirectory, 'stderr.log'))).toEqual(nativeResult.stderr);
      passed = true;
    } finally {
      Object.defineProperty(process, 'kill', nativeKill);
      if (passed) rmSync(directory, { recursive: true, force: true });
      else console.error('Preserved failed prepared CLI snapshot controls at ' + directory);
    }
  },
);

for (const variant of ['controller', 'public', 'toolchain', 'run'] as const) {
  test.skipIf(variant === 'run' && process.platform === 'win32')(
    `focused ${variant} CLI counters require native custody and canonical counter validation`,
    () => {
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
      const subjects: { entry: string; args: string[]; exit: number; output: unknown }[] = [
        { entry, args: [argument], exit: expectedExit, output: expectedOutput },
        ...(variant === 'run'
          ? [
              { entry, args: [], exit: 0, output: { schema: 'VidaAgentRunResult/v1', status: 'prepared' } },
              { entry, args: [], exit: 0, output: { schema: 'VidaAgentRunResult/v1', status: 'wave_issued' } },
            ]
          : []),
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
        const fixtureRoot = path.join(root, 'prepared-fixture');
        const workId = 'mutation-run-' + runId;
        let runFixture: Record<string, unknown> | undefined;
        if (variant === 'run') {
          const prepared = subjects[1];
          const issue = subjects[2];
          assert.ok(prepared);
          assert.ok(issue);
          const workspaceId = sha256(Buffer.from('workspace-' + runId));
          const actionId = 'action-' + runId;
          const issueId = 'issue-' + actionId;
          const priorActionId = 'prior-action-' + runId;
          const priorIssueId = 'prior-issue-' + priorActionId;
          const scopeBytes = JSON.stringify({ implementation_paths: ['selected.txt'] });
          const acceptanceBytes = '{}';
          const scopePath = path.join(fixtureRoot, 'scope.json');
          const acceptancePath = path.join(fixtureRoot, 'acceptance.json');
          const request = { action_id: actionId, stage_id: 'research', assignment_index: 0 };
          const priorRequest = { action_id: priorActionId, stage_id: 'research', assignment_index: 1 };
          const initialJournal = {
            schema: 'MastraSessionLedger/v1',
            workspace_id: workspaceId,
            work_id: workId,
            attempt: 1,
            run_id: 'fixture-run-' + runId,
            step_id: 'fixture-step',
            items: [
              { request: priorRequest, issue_id: priorIssueId, observation: null },
              { request, issue_id: null, observation: null },
            ],
          };
          const initialJournalPayload = JSON.stringify(initialJournal);
          const initialJournalDigest = sha256(Buffer.from(initialJournalPayload));
          const finalJournal = {
            ...initialJournal,
            items: initialJournal.items.map((item) => ({ ...item, issue_id: item.issue_id ?? issueId })),
          };
          const finalJournalDigest = sha256(Buffer.from(JSON.stringify(finalJournal)));
          const preparedOutput = {
            schema: 'VidaAgentRunResult/v1',
            status: 'prepared',
            state_version: { revision: 1, digest: initialJournalDigest },
            next_actions: [{ request }],
            issued_actions: [],
          };
          prepared.output = preparedOutput;
          issue.output = {
            schema: 'VidaAgentRunResult/v1',
            status: 'wave_issued',
            state_version: { revision: 2, digest: finalJournalDigest },
            next_actions: [],
            issued_actions: [
              { request: priorRequest, issue_id: priorIssueId },
              { request, issue_id: issueId },
            ],
          };
          runFixture = {
            workspaceId,
            actionId,
            issueId,
            scopePath,
            acceptancePath,
            scopeBytes,
            acceptanceBytes,
            request,
            initialJournal,
            initialJournalPayload,
            initialJournalDigest,
            finalJournal,
            finalJournalDigest,
            preparedOutput,
            scopeSha256: sha256(Buffer.from(scopeBytes)),
            acceptanceSha256: sha256(Buffer.from(acceptanceBytes)),
            issuedOutput: issue.output,
          };
          prepared.args = [
            '--project-root',
            fixtureRoot,
            '--repository',
            'fixture-repository',
            '--project',
            'fixture-project',
            '--work-path',
            'agent-runtime-new',
            '--work-id',
            workId,
            '--attempt',
            '1',
            '--scope-digest',
            'a'.repeat(64),
            '--team',
            'default-development',
            '--kind',
            'research',
            '--intent',
            'information_research',
            '--workflow',
            'information_research_light',
            '--intake',
            path.join(fixtureRoot, '.agent', 'work', workId, 'intake.json'),
          ];
          issue.args = [
            ...prepared.args.slice(0, 22),
            '--expected-revision',
            '1',
            '--expected-digest',
            initialJournalDigest,
            '--issue-wave',
            'true',
          ];
          seedPreparedFixture(fixtureRoot, workId);
        }
        const snapshotRelative = `coverage/bun-unified/runs/${runId}/snapshot`;
        const snapshot = path.join(root, snapshotRelative);
        const directory = path.join(root, 'processes');
        const hostModuleSource = [
          'import { Database } from "bun:sqlite";',
          'import { lstatSync } from "node:fs";',
          'import path from "node:path";',
          'export function openHostStateDatabase(root, relative) {',
          '  const file=path.resolve(root,relative); const db=new Database(file);',
          '  db.query("PRAGMA database_list").all();',
          '  lstatSync(file,{bigint:true}); lstatSync(file,{bigint:true});',
          '  return db;',
          '}',
        ].join('\n');
        const rawModuleSource = [
          'import { lstatSync } from "node:fs";',
          'export function workspaceDatabaseFileIdentity(database) {',
          '  const main=database.query("PRAGMA database_list").all().find((row)=>row.name==="main");',
          '  if (!main || typeof main.file!=="string") return null;',
          '  const stat=lstatSync(main.file,{bigint:true}); return {dev:String(stat.dev),ino:String(stat.ino)};',
          '}',
        ].join('\n');
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
                ? [
                    'import { help } from "./cli-metadata.ts";',
                    'import { openSync, readSync, closeSync, readFileSync } from "node:fs";',
                    'import { Database } from "bun:sqlite";',
                    'import { createHash } from "node:crypto";',
                    'import path from "node:path";',
                    `const fixture=${JSON.stringify(runFixture ?? {})};`,
                    'export function hit() { return 7; }',
                    'function read(file) { if(file.endsWith("selected.txt")) { const fd=openSync(file,"r"); const chunks=[]; const buffer=Buffer.alloc(65536); try { while(true) { const n=readSync(fd,buffer,0,buffer.length,null); if(!n)break; chunks.push(Buffer.from(buffer.subarray(0,n))); } return Buffer.concat(chunks); } finally { closeSync(fd); } } return readFileSync(file); }',
                    'function digest(value) { return createHash("sha256").update(value).digest("hex"); }',
                    'function seedDatabase(root) {',
                    '  const db=new Database(path.join(root,".agent/host-state.sqlite"));',
                    '  db.exec("CREATE TABLE agent_host_state (workspace_id TEXT, kind TEXT, id TEXT, revision INTEGER, payload TEXT, digest TEXT, raw_payload_bytes BLOB)");',
                    '  db.exec("CREATE TABLE agent_host_mastra_session_ledger (workspace_id TEXT, work_id TEXT, attempt INTEGER, revision INTEGER, payload TEXT, digest TEXT, raw_payload_bytes BLOB)");',
                    '  const putState=db.prepare("INSERT INTO agent_host_state VALUES (?,?,?,?,?,?,?)");',
                    '  const putJournal=db.prepare("INSERT INTO agent_host_mastra_session_ledger VALUES (?,?,?,?,?,?,?)");',
                    '  const work={schema:"WorkState/v1",workspace_id:fixture.workspaceId,revision:1,binding:{lifecycle_work_id:fixture.initialJournal.work_id,scope_contract_digest:"a".repeat(64)},contracts:{scope:{path:fixture.scopePath,sha256:fixture.scopeSha256},acceptance:{path:fixture.acceptancePath,sha256:fixture.acceptanceSha256}},lease:{ticket_id:"ticket-"+fixture.actionId,thread_id:"thread-"+fixture.actionId,generation:1},execution:{run_id:fixture.initialJournal.run_id}};',
                    '  const claimId="claim-"+fixture.actionId; const secondClaimId="claim-secondary-"+fixture.actionId;',
                    '  const ledger={schema:"CoordinationLedger/v1",workspace_id:fixture.workspaceId,revision:1,tickets:[{ticket_id:work.lease.ticket_id,work_id:fixture.initialJournal.work_id,thread_id:work.lease.thread_id,generation:1,status:"active",claim_ids:[claimId,secondClaimId]}],claims:[{claim_id:claimId,ticket_id:work.lease.ticket_id,work_id:fixture.initialJournal.work_id,thread_id:work.lease.thread_id,generation:1,status:"active"},{claim_id:secondClaimId,ticket_id:work.lease.ticket_id,work_id:fixture.initialJournal.work_id,thread_id:work.lease.thread_id,generation:1,status:"active"}]};',
                    '  for (const [kind,id,value] of [["work",fixture.initialJournal.work_id,work],["ledger","shared",ledger]]) { const payload=JSON.stringify(value); putState.run(fixture.workspaceId,kind,id,1,payload,digest(payload),Buffer.from(payload)); }',
                    '  putJournal.run(fixture.workspaceId,fixture.initialJournal.work_id,1,1,fixture.initialJournalPayload,fixture.initialJournalDigest,Buffer.from(fixture.initialJournalPayload));',
                    '  db.close();',
                    '}',
                    'async function hostRead(root,workId) {',
                    '  const { openHostStateDatabase }=await import("../src/host-state.ts");',
                    '  const db=openHostStateDatabase(root,".agent/host-state.sqlite");',
                    '  const work=db.query("SELECT workspace_id,kind,id,revision,payload,digest,raw_payload_bytes FROM agent_host_state WHERE workspace_id = ? AND kind = ? AND id = ?").get(fixture.workspaceId,"work",workId);',
                    '  const ledger=db.query("SELECT workspace_id,kind,id,revision,payload,digest,raw_payload_bytes FROM agent_host_state WHERE workspace_id = ? AND kind = ? AND id = ?").get(fixture.workspaceId,"ledger","shared");',
                    '  const journal=db.query("SELECT workspace_id,work_id,attempt,revision,payload,digest,raw_payload_bytes FROM agent_host_mastra_session_ledger WHERE workspace_id = ? AND work_id = ? AND attempt = ?").get(fixture.workspaceId,workId,1);',
                    '  const other=openHostStateDatabase(root,".agent/host-state.sqlite"); other.close();',
                    '  const changed=db.query("UPDATE agent_host_mastra_session_ledger SET revision=?,payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=? AND revision=? AND digest=?").run(2,JSON.stringify(fixture.finalJournal),fixture.finalJournalDigest,fixture.workspaceId,workId,1,1,fixture.initialJournalDigest);',
                    '  db.close(); return {work,ledger,journal,changed};',
                    '}',
                    'if (import.meta.main) {',
                    '  if (process.argv.includes("--issue-wave")) {',
                    '    await import("./workspace-database-cli.ts"); await import("../src/orchestration/local-work-admission.ts");',
                    '    const root=process.argv[process.argv.indexOf("--project-root")+1]; const workId=process.argv[process.argv.indexOf("--work-id")+1];',
                    '    read(path.join(root,"agent-runtime.config.v1.yaml")); read(path.join(root,".agent/runtime-initialization.v1.json"));',
                    '    const intake=JSON.parse(read(path.join(root,".agent/work",workId,"intake.json")).toString()); read(path.join(root,"selected.txt"));',
                    '    const state=await hostRead(root,workId); if(state.changed.changes!==1) throw new Error("Synthetic journal compare-and-swap failed");',
                    '    console.log(JSON.stringify(fixture.issuedOutput));',
                    '  } else if (!process.argv.includes("--intake")) console.log(JSON.stringify(help()));',
                    '  else {',
                    '    await import("./workspace-database-cli.ts"); await import("../src/orchestration/local-work-admission.ts");',
                    '    const root=process.argv[process.argv.indexOf("--project-root")+1];',
                    '    seedDatabase(root);',
                    '    const config=path.join(root,"agent-runtime.config.v1.yaml");',
                    '    for(let i=0;i<7;i++)closeSync(openSync(config,"r"));',
                    '    read(config); read(path.join(root,".agent/runtime-initialization.v1.json"));',
                    '    const intake=JSON.parse(read(process.argv[process.argv.indexOf("--intake")+1]).toString());',
                    '    const scope=JSON.parse(read(path.join(root,intake.scope_path)).toString());',
                    '    read(path.join(root,intake.acceptance_path)); read(path.join(root,scope.implementation_paths[0]));',
                    '    console.log(JSON.stringify(fixture.preparedOutput));',
                    '  }',
                    '}',
                  ].join('\n')
                : 'export function hit() { return 7; }\nif (import.meta.main) console.log(' +
                  JSON.stringify(JSON.stringify(expectedOutput)) +
                  ');\n';
        const inputs = new Map(capturedTools);
        if (variant === 'run') {
          assert.ok(runFixture);
          inputs.set('src/host-state.ts', Buffer.from(hostModuleSource));
          inputs.set('src/config/workspace-database-raw.ts', Buffer.from(rawModuleSource));
        }
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
        if (variant === 'run') {
          inputs.set('bin/workspace-database-cli.ts', Buffer.from('export const inert = true;\n'));
          inputs.set('src/orchestration/local-work-admission.ts', Buffer.from('export const inert = true;\n'));
        }
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
                ...(variant === 'run' && index === 1
                  ? ['  spawnSync.armPrepared();']
                  : variant === 'run' && index === 2
                    ? ['  spawnSync.armIssue();']
                    : []),
                `  const child${index} = spawnSync(process.execPath, ${JSON.stringify([
                  ...(variant === 'run' && (index === 1 || index === 2)
                    ? []
                    : ['--no-env-file', '--no-install', '--config=' + path.join(root, 'bunfig.toml')]),
                  path.join(root, subject.entry),
                  ...subject.args,
                ])}, {encoding:"utf8",windowsHide:true,timeout:4000${variant === 'run' && (index === 1 || index === 2) ? ',cwd:' + JSON.stringify(root) + ',killSignal:"SIGKILL",detached:true,env:{...process.env,VIDA_PINNED_COMMAND_BUDGET_MS:"4000",VIDA_PINNED_COMMAND_DEADLINE_MS:String(Date.now()+4000)}' : variant === 'toolchain' && subject.exit === 1 ? ',env:{...process.env,VIDA_PINNED_COMMAND_BUDGET_MS:"4000",VIDA_PINNED_COMMAND_DEADLINE_MS:"1"}' : ''}});`,
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
          ...(variant === 'run'
            ? [
                'bin/cli-metadata.ts',
                'bin/workspace-database-cli.ts',
                'src/orchestration/local-work-admission.ts',
                'src/host-state.ts',
                'src/config/workspace-database-raw.ts',
              ]
            : []),
        ]);
        const moduleInputs = capturedModuleInputs({ sources, test_inputs: testInputs, tool_inputs: toolInputs });
        if (variant === 'run') {
          assert.ok(moduleInputs.some((input) => input.path === 'src/host-state.ts'));
          assert.ok(moduleInputs.some((input) => input.path === 'src/config/workspace-database-raw.ts'));
        }
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
          module_inputs: moduleInputs,
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
          for (const length of variant === 'public' || variant === 'run' ? [1, 2, 4] : [1, 3])
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
        if (variant === 'run') {
          const preparedChild = children.find((row) => row.subject_role === 'run-admission-prepared');
          const issueChildIndex = children.findIndex((row) => row.subject_role === 'run-issue-wave');
          assert.ok(preparedChild);
          assert.ok(issueChildIndex >= 0);
          const preparedReceipt = record(
            JSON.parse(readFileSync(path.join(directory, String(record(preparedChild.receipt).path)), 'utf8')),
          );
          const evidence = record(preparedReceipt.consumed_inputs);
          const streams = evidence.streams as Record<string, unknown>[];
          const operations = evidence.operations as Record<string, unknown>[];
          expect(streams).toHaveLength(6);
          expect(operations).toHaveLength(7);
          expect(preparedReceipt.pinned_budget_ms).toBe('4000');
          expect(preparedReceipt.pinned_deadline_ms).toBe(
            record(JSON.parse(readFileSync(path.join(directory, String(record(preparedChild.launch).path)), 'utf8')))
              .deadline_ms,
          );
          for (const stream of streams) {
            const streamOperations = operations.filter((operation) => operation.stream_id === stream.id);
            if (stream.read_method === 'readFileSync' || stream.read_method === 'readFileDescriptorBoundedSync') {
              expect(streamOperations).toHaveLength(1);
              expect(streamOperations[0]!.read_method).toBe(stream.read_method);
              expect(streamOperations[0]!.bytes_read).toBe(stream.bytes);
              if (stream.read_method === 'readFileSync') expect(streamOperations[0]!.eof).toBe(true);
              else {
                expect(streamOperations[0]!.eof).toBe(false);
                expect(streamOperations[0]!.complete_result).toBe(true);
              }
            } else {
              expect(stream.read_method).toBe('readSync');
              expect(streamOperations.filter((operation) => Number(operation.bytes_read) > 0)).toHaveLength(1);
              expect(
                streamOperations.filter((operation) => Number(operation.bytes_read) === 0 && operation.eof === true),
              ).toHaveLength(1);
            }
          }
          const runtimeConfigStream = streams.find((stream) => stream.role === 'runtime-config');
          assert.ok(runtimeConfigStream);
          expect(operations.filter((operation) => operation.stream_id === runtimeConfigStream.id)).toHaveLength(1);
          expect(
            operations.every(
              (operation) =>
                operation.requested_position === null || operation.requested_position === operation.file_position,
            ),
          ).toBe(true);
          const operationPayloads = evidence.payloads as Record<string, unknown>[];
          expect(operationPayloads).toHaveLength(6);
          const unread = evidence.opens_without_observed_reads as Record<string, unknown>[];
          expect(unread).toHaveLength(7);
          expect(unread.every((row) => row.closed === true)).toBe(true);
          const unreadIds = new Set(unread.map((row) => row.id));
          expect(operations.some((row) => unreadIds.has(row.stream_id))).toBe(false);

          negative(
            'issue-delete-returning-is-not-a-work-read',
            (ctx, row) =>
              rewrite(ctx, row, 'receipt', (proof) => {
                const operations = record(proof.consumed_sql).operations as Record<string, unknown>[];
                const workRead = operations.find((operation) => {
                  const bindings = operation.arguments;
                  return (
                    operation.method === 'Statement.get' &&
                    Array.isArray(bindings) &&
                    bindings[1] === 'work' &&
                    /\bfrom agent_host_state\b/iu.test(String(operation.sql))
                  );
                });
                assert.ok(workRead);
                workRead.sql =
                  'DELETE FROM agent_host_state WHERE workspace_id = ? AND kind = ? AND id = ? RETURNING workspace_id,kind,id,revision,payload,digest,raw_payload_bytes';
              }),
            false,
            issueChildIndex,
            'no exact Work read row observed',
          );
          negative(
            'issue-duplicate-ledger-claim-cannot-hide-a-missing-claim',
            (ctx, row) =>
              rewrite(ctx, row, 'receipt', (proof) => {
                const sql = record(proof.consumed_sql);
                const operations = sql.operations as Record<string, unknown>[];
                const ledgerRead = operations.find((operation) => {
                  const bindings = operation.arguments;
                  return (
                    operation.method === 'Statement.get' &&
                    Array.isArray(bindings) &&
                    bindings[1] === 'ledger' &&
                    /\bfrom agent_host_state\b/iu.test(String(operation.sql))
                  );
                });
                assert.ok(ledgerRead);
                const ledgerRow = record(ledgerRead.result);
                const ledgerPayload = record(JSON.parse(String(ledgerRow.payload)));
                const claims = ledgerPayload.claims as Record<string, unknown>[];
                assert.equal(claims.length, 2);
                const first = record(claims[0]);
                const second = record(claims[1]);
                assert.notEqual(first.claim_id, second.claim_id);
                ledgerPayload.claims = [first, { ...first }];

                const bytes = Buffer.from(JSON.stringify(ledgerPayload));
                const payloads = sql.payloads as Record<string, unknown>[];
                const payloadId = payloads.length + 1;
                payloads.push({ payload_id: payloadId, byte_length: bytes.length, base64: bytes.toString('base64') });
                ledgerRow.payload = bytes.toString('utf8');
                ledgerRow.digest = sha256(bytes);
                ledgerRow.raw_payload_bytes = { type: 'blob', ref: payloadId, byte_length: bytes.length };
              }),
            false,
            issueChildIndex,
            'current ticket claim does not join exactly one active ledger row',
          );
          negative(
            'issue-work-read-from-unwitnessed-same-file-connection',
            (ctx, row) =>
              rewrite(ctx, row, 'receipt', (proof) => {
                const sql = record(proof.consumed_sql);
                const connections = sql.connections as Record<string, unknown>[];
                const operations = sql.operations as Record<string, unknown>[];
                const witnessed = record(connections[0]);
                const foreignId = 'unwitnessed-same-file-connection';
                connections.push({ connection_id: foreignId, file_identity: witnessed.file_identity });
                for (const operation of operations)
                  if (operation.method === 'Statement.get' && /\bfrom agent_host_state\b/iu.test(String(operation.sql)))
                    operation.connection_id = foreignId;
              }),
            false,
            issueChildIndex,
            'no exact Work read row observed',
          );
          negative(
            'issue-journal-cas-on-different-host-connection',
            (ctx, row) =>
              rewrite(ctx, row, 'receipt', (proof) => {
                const sql = record(proof.consumed_sql);
                const host = sql.host_opens as Record<string, unknown>[];
                const operations = sql.operations as Record<string, unknown>[];
                const cas = operations.find(
                  (operation) =>
                    operation.method === 'Statement.run' &&
                    String(operation.sql).startsWith('UPDATE agent_host_mastra_session_ledger'),
                );
                assert.ok(cas);
                cas.connection_id = host[1]!.connection_id;
              }),
            false,
            issueChildIndex,
            'Journal CAS changed connection from its initial Host Journal read',
          );
          negative(
            'issue-output-must-match-new-journal-issue',
            (ctx, row) => {
              const stdout = record(row.stdout);
              const outputPath = path.join(ctx.directory, String(stdout.path));
              const output = record(JSON.parse(readFileSync(outputPath, 'utf8')));
              const issued = output.issued_actions as Record<string, unknown>[];
              const newest = issued.at(-1);
              assert.ok(newest);
              newest.issue_id = 'unrelated-prior-issue';
              const bytes = Buffer.from(JSON.stringify(output));
              writeFileSync(outputPath, bytes);
              stdout.sha256 = sha256(bytes);
              stdout.bytes = bytes.length;
              rewrite(ctx, row, 'terminal', (proof) => {
                proof.stdout = row.stdout;
              });
            },
            false,
            issueChildIndex,
            'CLI issue differs from final Journal payload',
          );

          negative(
            'run-prepared-read-position-discontinuous',
            (ctx, row) =>
              rewrite(ctx, row, 'receipt', (proof) => {
                const receiptEvidence = record(proof.consumed_inputs);
                const reads = receiptEvidence.operations as Record<string, unknown>[];
                reads.find((operation) => Number(operation.bytes_read) > 0)!.file_position = 1;
              }),
            false,
            1,
            'Prepared CLI read position is discontinuous.',
          );
          negative(
            'run-prepared-read-requested-position',
            (ctx, row) =>
              rewrite(ctx, row, 'receipt', (proof) => {
                const reads = record(proof.consumed_inputs).operations as Record<string, unknown>[];
                reads[0]!.requested_position = Number(reads[0]!.file_position) + 1;
              }),
            false,
            1,
            'Prepared CLI requested read position is inconsistent.',
          );
          negative(
            'run-prepared-read-byte-count',
            (ctx, row) =>
              rewrite(ctx, row, 'receipt', (proof) => {
                const receiptEvidence = record(proof.consumed_inputs);
                const reads = receiptEvidence.operations as Record<string, unknown>[];
                const operation = reads.find((candidate) => Number(candidate.bytes_read) > 0)!;
                operation.bytes_read = Number(operation.bytes_read) - 1;
              }),
            false,
            1,
            'Prepared CLI read byte count differs from its payload.',
          );
          negative(
            'run-prepared-read-payload-path',
            (ctx, row) =>
              rewrite(ctx, row, 'receipt', (proof) => {
                const receiptEvidence = record(proof.consumed_inputs);
                const payloads = receiptEvidence.payloads as Record<string, unknown>[];
                const reads = receiptEvidence.operations as Record<string, unknown>[];
                const operation = reads.find((candidate) => Number(candidate.bytes_read) > 0)!;
                operation.payload_id = payloads.find((payload) => payload.id !== operation.payload_id)!.id;
              }),
            false,
            1,
            'Prepared CLI read payload differs from its input path.',
          );
          negative(
            'run-prepared-wrong-in-root-role-path',
            (ctx, row) => {
              const wrongPath = path.join(fixtureRoot, 'selected.txt');
              rewrite(ctx, row, 'terminal', (proof) => {
                for (const key of ['parent_inputs_before', 'parent_inputs_after']) {
                  const parentInputs = proof[key] as Record<string, unknown>[];
                  const runtimeConfig = parentInputs.find((input) => input.role === 'runtime-config');
                  assert.ok(runtimeConfig);
                  runtimeConfig.path = wrongPath;
                  runtimeConfig.realpath = wrongPath;
                }
              });
              rewrite(ctx, row, 'receipt', (proof) => {
                const receiptEvidence = record(proof.consumed_inputs);
                for (const stream of receiptEvidence.streams as Record<string, unknown>[])
                  if (stream.role === 'runtime-config') stream.path = wrongPath;
                for (const payload of receiptEvidence.payloads as Record<string, unknown>[])
                  if (payload.path === path.join(fixtureRoot, 'agent-runtime.config.v1.yaml')) payload.path = wrongPath;
                for (const operation of receiptEvidence.operations as Record<string, unknown>[])
                  if (operation.role === 'runtime-config') operation.path = wrongPath;
              });
            },
            false,
            1,
            'Prepared CLI runtime-config path differs from its fixed role.',
          );
          negative(
            'run-prepared-read-missing-scope-role',
            (ctx, row) =>
              rewrite(ctx, row, 'receipt', (proof) => {
                const receiptEvidence = record(proof.consumed_inputs);
                const allStreams = receiptEvidence.streams as Record<string, unknown>[];
                const removedPayloadIds = new Set(
                  allStreams
                    .filter((stream) => stream.role === 'scope')
                    .flatMap((stream) => stream.payload_ids as string[]),
                );
                receiptEvidence.streams = allStreams.filter((stream) => stream.role !== 'scope');
                const allOperations = receiptEvidence.operations as Record<string, unknown>[];
                const operations = allOperations.filter((operation) => operation.role !== 'scope');
                operations.forEach((operation, index) => {
                  operation.sequence = index + 1;
                });
                receiptEvidence.operations = operations;
                const payloads = receiptEvidence.payloads as Record<string, unknown>[];
                const keptPayloads = payloads.filter((payload) => !removedPayloadIds.has(String(payload.id)));
                receiptEvidence.payloads = keptPayloads;
                const limits = record(receiptEvidence.limits);
                limits.operations = operations.length;
                limits.unique_bytes = keptPayloads.reduce(
                  (total, payload) => total + Buffer.from(String(payload.bytes), 'base64').length,
                  0,
                );
              }),
            false,
            1,
            'Prepared CLI consumed input role is missing.',
          );
          for (const state of ['present', 'unknown', 'missing'] as const)
            negative(
              'run-prepared-group-' + state,
              (ctx, row) => {
                if (state === 'missing') delete row.process_group_state;
                else row.process_group_state = state;
                rewrite(ctx, row, 'terminal', (proof) => {
                  if (state === 'missing') delete proof.process_group_state;
                  else proof.process_group_state = state;
                });
              },
              false,
              1,
              'Prepared CLI owned process group is not gone.',
            );
          negative(
            'run-prepared-clock-receipt-mismatch',
            (ctx, row) =>
              rewrite(ctx, row, 'launch', (proof) => {
                const nativeOptions = record(proof.native_options);
                nativeOptions.timeout = 5000;
                proof.budget_ms = '5000';
                proof.deadline_ms = String(Number(proof.deadline_ms) + 1000);
              }),
            false,
            1,
            'Prepared CLI budget differs from native child observation.',
          );
          negative(
            'run-prepared-deadline-receipt-mismatch',
            (ctx, row) =>
              rewrite(ctx, row, 'launch', (proof) => {
                proof.deadline_ms = String(Number(proof.deadline_ms) + 1000);
              }),
            false,
            1,
            'Prepared CLI deadline differs from native child observation.',
          );
          negative(
            'run-prepared-clock-limit',
            (ctx, row) =>
              rewrite(ctx, row, 'launch', (proof) => {
                const nativeOptions = record(proof.native_options);
                nativeOptions.timeout = 60_001;
                proof.budget_ms = '60001';
                proof.deadline_ms = String(Number(proof.deadline_ms) + 56_001);
              }),
            false,
            1,
            'Prepared CLI timeout exceeds its bounded native contract.',
          );
          negative(
            'run-prepared-distinct-id-duplicate-subject',
            (ctx, row) => {
              const duplicate = structuredClone(child);
              const id = randomUUID();
              const targetDirectory = path.join(ctx.directory, 'cli', id);
              mkdirSync(targetDirectory, { recursive: true });
              const sourceLaunchPath = path.join(ctx.directory, String(record(child.launch).path));
              const launch = record(JSON.parse(readFileSync(sourceLaunchPath, 'utf8')));
              launch.id = id;
              const bytes = Buffer.from(JSON.stringify(launch));
              const launchPath = path.join(targetDirectory, 'launch.json');
              writeFileSync(launchPath, bytes);
              duplicate.id = id;
              duplicate.launch = { path: 'cli/' + id + '/launch.json', sha256: sha256(bytes) };
              Object.assign(row, duplicate);
            },
            false,
            1,
            'Duplicate focused CLI subject.',
          );
        }
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
            'run-prepared-parent-input-drift',
            (ctx, row) =>
              rewrite(ctx, row, 'terminal', (proof) => {
                const inputs = proof.parent_inputs_after as Record<string, unknown>[];
                inputs[0] = { ...inputs[0], sha256: '0'.repeat(64) };
              }),
            false,
            1,
          );
          negative(
            'run-prepared-role-foreign-argv',
            (ctx, row) =>
              rewrite(ctx, row, 'launch', (proof) => {
                proof.original_argv = ['--help'];
              }),
            false,
            1,
          );
          negative(
            'run-metadata-unloaded',
            (ctx, row) =>
              rewrite(ctx, row, 'receipt', (proof) => {
                assert.ok(Array.isArray(proof.loaded_inputs));
                proof.loaded_inputs = proof.loaded_inputs.filter(
                  (input) => record(input).path !== 'bin/cli-metadata.ts',
                );
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
                const operation = manifest.module_inputs.find(
                  (input) => input.path === 'bin/workspace-database-cli.ts',
                );
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
              row.subject_role = clock.subject_role;
              rewrite(ctx, row, 'launch', (proof) => {
                for (const key of ['subject_role', 'original_argv', 'effective_argv', 'environment_sha256'])
                  proof[key] = clockLaunch[key];
              });
              rewrite(ctx, row, 'receipt', (proof) => {
                proof.exit_code = 1;
                proof.subject_role = clock.subject_role;
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
                proof.subject_role = clock.subject_role;
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
                env: {
                  ...process.env,
                  VIDA_PINNED_COMMAND_BUDGET_MS: '4000',
                  VIDA_PINNED_COMMAND_DEADLINE_MS: deadline,
                },
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
}
