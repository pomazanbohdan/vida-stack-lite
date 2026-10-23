import assert from 'node:assert/strict';
import { test, expect, spyOn } from 'bun:test';
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  symlinkSync,
  unlinkSync,
  linkSync,
  rmSync,
  realpathSync,
  existsSync,
  readdirSync,
  lstatSync,
} from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import {
  prepareDevelopmentController,
  inspectDevelopmentController,
  verifyDevelopmentController,
  executeDevelopmentController,
  developmentControllerChildDiagnostic,
  developmentControllerBinding,
  main,
} from '../bin/development-controller.ts';
import { readPortableLock } from '../bin/install.ts';
import { completeOwnedCleanup } from '../tooling/owned-cleanup-completion.ts';
import { configuredTestRepositoryRoot } from './configured-context.ts';
import * as controllerObservation from '../bin/development-controller-observation.ts';
import * as controllerFilesystem from 'node:fs';
import * as controllerInstall from '../bin/install.ts';
import { initializeProject } from '../bin/init.ts';

const packageRoot = path.resolve(import.meta.dirname, '..');
const sourceRoot = process.env.VIDA_CONTROLLER_TEST_TARGET ?? configuredTestRepositoryRoot();

function cleanupOwnedFixture(scratch: string): void {
  const tempRoot = realpathSync(tmpdir());
  const resolved = realpathSync(scratch);
  const relative = path.relative(tempRoot, resolved);
  if (resolved !== scratch || !relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Fixture cleanup requires the exact physical owned temporary path');
  }
  rmSync(resolved, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
}

async function withRestoredControllerMetadata(file: string, operation: () => Promise<void>): Promise<void> {
  const before = readFileSync(file);
  let failure: { readonly error: unknown } | undefined;
  try {
    await operation();
  } catch (error) {
    failure = { error };
    throw error;
  } finally {
    completeOwnedCleanup(
      [
        () => {
          writeFileSync(file, before);
          assert.deepEqual(readFileSync(file), before);
        },
      ],
      failure,
    );
  }
}

test('controller failure diagnostics preserve bounded sanitized terminal fields without claiming no effects', () => {
  const diagnostic = developmentControllerChildDiagnostic(
    {
      status: null,
      signal: 'SIGTERM',
      stdout: `Bearer private-value\n${'x'.repeat(5000)}`,
      stderr: 'token=private-value',
      error: new Error('password=private-value'),
    },
    120001.4,
  );
  expect(diagnostic.signal).toBe('SIGTERM');
  expect(diagnostic.status).toBeNull();
  expect(diagnostic.elapsed_ms).toBe(120001);
  expect(diagnostic.stdout.truncated).toBe(true);
  expect(diagnostic.stdout.text.length).toBe(4096);
  expect(JSON.stringify(diagnostic)).not.toContain('private-value');
  expect(diagnostic.outcome).toBe('child_failure_effects_unknown');
});

test('controller failure diagnostics decode buffers and byte views before redaction', () => {
  const stdout = Buffer.from(`Bearer private-value\n${'x'.repeat(5000)}`);
  const stderr = Buffer.from('packet refused: token=private-value\n\u041f\u043e\u043c\u0438\u043b\u043a\u0430');
  const prefix = Buffer.from('outside-view-prefix');
  const suffix = Buffer.from('outside-view-suffix');
  const backing = new Uint8Array(prefix.length + stderr.length + suffix.length);
  backing.set(prefix);
  backing.set(stderr, prefix.length);
  backing.set(suffix, prefix.length + stderr.length);
  for (const streams of [
    { stdout, stderr },
    { stdout: new Uint8Array(stdout), stderr: backing.subarray(prefix.length, prefix.length + stderr.length) },
  ]) {
    const diagnostic = developmentControllerChildDiagnostic({ status: 1, signal: null, ...streams }, 12);
    expect(diagnostic.status).toBe(1);
    expect(diagnostic.stderr.text).toBe('packet refused: token=[redacted]\n\u041f\u043e\u043c\u0438\u043b\u043a\u0430');
    expect(diagnostic.stdout.text.startsWith('Bearer [redacted]\n')).toBe(true);
    expect(diagnostic.stdout.text.length).toBe(4096);
    expect(diagnostic.stdout.truncated).toBe(true);
    expect(diagnostic.stderr.truncated).toBe(false);
    expect(JSON.stringify(diagnostic)).not.toContain('private-value');
    expect(JSON.stringify(diagnostic)).not.toContain('outside-view-');
    expect(diagnostic.outcome).toBe('child_failure_effects_unknown');
  }
  const empty = developmentControllerChildDiagnostic(
    { status: 1, signal: null, stdout: Buffer.alloc(0), stderr: new Uint8Array(0) },
    0,
  );
  expect(empty.stdout).toEqual({ text: '', truncated: false });
  expect(empty.stderr).toEqual({ text: '', truncated: false });
});

test('controller diagnostics normalize absent and scalar failures without exposing credentials', () => {
  for (const [value, rendered] of [
    [null, ''],
    [false, 'false'],
    [42, '42'],
    [{}, ''],
  ] as const) {
    const diagnostic = developmentControllerChildDiagnostic(
      { status: 1, signal: null, stdout: null, stderr: null, error: { message: value } },
      -1.4,
    );
    expect(diagnostic.elapsed_ms).toBe(0);
    expect(diagnostic.error).toEqual({ text: '', truncated: false });
    const scalar = developmentControllerChildDiagnostic(
      { status: 1, signal: null, stdout: null, stderr: null, error: value },
      0,
    );
    expect(scalar.error).toEqual(value ? { text: rendered, truncated: false } : null);
  }
  const credential = developmentControllerChildDiagnostic(
    { status: 1, signal: null, stdout: null, stderr: null, error: 'https://user:private-value@example.test/refused' },
    0,
  );
  expect(credential.error).toEqual({ text: 'https://[redacted]@example.test/refused', truncated: false });
});

test('controller CLI rejects malformed options and absent commands before creating a controller', async () => {
  const cases: readonly (readonly [readonly string[], RegExp])[] = [
    [[], /development-controller prepare/],
    [['inspect'], /Required controller option/],
    [['inspect', '--controller-root'], /Invalid controller option/],
    [['inspect', '--controller-root', ''], /Invalid controller option/],
    [['inspect', '--controller-root', '/unused', '--controller-root', '/other'], /Invalid controller option/],
    [['prepare', '--controller-root', '/unused'], /Required controller option/],
    [['inspect', '--controller-root', '/unused', '--', 'scope'], /Unexpected controller arguments/],
    [['exec', '--controller-root', '/unused', '--'], /Controlled command is missing/],
    [['exec', '--controller-root', '/unused', '--', 'vida-agent'], /Controlled command is missing/],
  ];
  const output: string[] = [];
  const stdout = spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
    output.push(String(chunk));
    return true;
  });
  try {
    for (const [args, error] of cases) await assert.rejects(main([...args]), error);
    expect(output).toEqual([]);
  } finally {
    stdout.mockRestore();
  }
});

test('controller inspection preserves the missing-root cause without disclosing the path', async () => {
  const scratch = mkdtempSync(path.join(tmpdir(), 'vida-controller-missing-'));
  let completed = false;
  try {
    const missing = path.join(scratch, 'missing');
    await assert.rejects(inspectDevelopmentController({ controllerRoot: missing }), (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal(error.message, 'Development controller root is unavailable.');
      assert.ok(error.cause instanceof Error);
      assert.equal(Reflect.get(error.cause, 'code'), 'ENOENT');
      return true;
    });
    const linked = path.join(scratch, 'dangling');
    symlinkSync(missing, linked, process.platform === 'win32' ? 'junction' : 'dir');
    await assert.rejects(inspectDevelopmentController({ controllerRoot: linked }), /root is unavailable/);
    completed = true;
  } finally {
    if (completed) cleanupOwnedFixture(scratch);
    else console.error(`Retained failed or uncertain controller fixture: ${scratch}`);
  }
});

test('controller construction rejects real private copy corruption before installing dependencies', async () => {
  const scratch = mkdtempSync(path.join(tmpdir(), 'vida-controller-copy-fault-'));
  const controllerRoot = path.join(scratch, 'controller');
  const nativeCopy = controllerFilesystem.copyFileSync;
  const copiedInputs: { file: string; bytes: Buffer }[] = [];
  let completed = false;
  try {
    const copy = spyOn(controllerFilesystem, 'copyFileSync').mockImplementation((source, destination, mode) => {
      nativeCopy(source, destination, mode);
      if (
        copiedInputs.length === 0 &&
        typeof source === 'string' &&
        typeof destination === 'string' &&
        destination.startsWith(path.join(controllerRoot, 'package') + path.sep)
      ) {
        copiedInputs.push({ file: source, bytes: readFileSync(source) });
        writeFileSync(destination, Buffer.concat([readFileSync(destination), Buffer.from('\nprivate copy fault\n')]));
      }
    });
    try {
      await assert.rejects(
        prepareDevelopmentController({ target: sourceRoot, controllerRoot }),
        /Executing package changed during construction/,
      );
    } finally {
      copy.mockRestore();
    }
    expect(copiedInputs).toHaveLength(1);
    const [copied] = copiedInputs;
    assert.ok(copied);
    assert.deepEqual(readFileSync(copied.file), copied.bytes);
    expect(existsSync(path.join(controllerRoot, 'controller.json'))).toBe(false);
    expect(existsSync(path.join(controllerRoot, 'observations'))).toBe(false);
    completed = true;
  } finally {
    if (completed) cleanupOwnedFixture(scratch);
    else console.error(`Retained failed or uncertain copy fault fixture: ${scratch}`);
  }
});

test('controller construction rejects inconsistent lock observations without writing Source', async () => {
  const scratch = mkdtempSync(path.join(tmpdir(), 'vida-controller-lock-fault-'));
  const controllerRoot = path.join(scratch, 'controller');
  const nativeLock = controllerInstall.readPortableLock;
  const originalLock = nativeLock(packageRoot);
  const sourceReads: Buffer[] = [];
  let completed = false;
  try {
    const lock = spyOn(controllerInstall, 'readPortableLock').mockImplementation((root) => {
      const bytes = nativeLock(root);
      if (root === packageRoot) {
        sourceReads.push(bytes);
        if (sourceReads.length === 2) return Buffer.concat([bytes, Buffer.from('\n')]);
      }
      return bytes;
    });
    try {
      await assert.rejects(
        prepareDevelopmentController({ target: sourceRoot, controllerRoot }),
        /Executing package lock changed during construction/,
      );
    } finally {
      lock.mockRestore();
    }
    expect(sourceReads).toHaveLength(2);
    for (const bytes of sourceReads) expect(bytes).toEqual(originalLock);
    expect(readPortableLock(packageRoot)).toEqual(originalLock);
    expect(existsSync(path.join(controllerRoot, 'controller.json'))).toBe(false);
    expect(existsSync(path.join(controllerRoot, 'observations'))).toBe(false);
    completed = true;
  } finally {
    if (completed) cleanupOwnedFixture(scratch);
    else console.error(`Retained failed or uncertain lock observation fixture: ${scratch}`);
  }
});

test('qualified development controller preserves Source identity and accepts a scoped new target bin through unchanged current code', async () => {
  await import('../src/config/runtime-config.ts');
  const scratch = mkdtempSync(path.join(tmpdir(), 'vida-controller-'));
  let completed = false;
  try {
    const installFaultRoot = path.join(scratch, 'install-lock-fault');
    const sourceLock = readPortableLock(packageRoot);
    const nativeInstall = controllerObservation.invokeObservedControllerChild;
    const installs: ReturnType<typeof nativeInstall>[] = [];
    const installCommands: string[][] = [];
    const originalDiagnostics = process.env.VIDA_CONTROLLER_DIAGNOSTICS;
    process.env.VIDA_CONTROLLER_DIAGNOSTICS = 'false';
    const install = spyOn(controllerObservation, 'invokeObservedControllerChild').mockImplementation((input) => {
      const result = nativeInstall(input);
      installs.push(result);
      installCommands.push([...input.args]);
      if (
        input.controllerRoot === installFaultRoot &&
        result.status === 0 &&
        result.signal === null &&
        result.error === undefined &&
        result.observation_complete
      ) {
        const lock = path.join(installFaultRoot, 'package/bun.lock');
        writeFileSync(lock, Buffer.concat([readFileSync(lock), Buffer.from('\n')]));
      }
      return result;
    });
    try {
      await assert.rejects(
        prepareDevelopmentController({ target: sourceRoot, controllerRoot: installFaultRoot }),
        /Frozen controller lock changed during installation/,
      );
    } finally {
      install.mockRestore();
      if (originalDiagnostics === undefined) delete process.env.VIDA_CONTROLLER_DIAGNOSTICS;
      else process.env.VIDA_CONTROLLER_DIAGNOSTICS = originalDiagnostics;
    }
    expect(installs).toHaveLength(1);
    expect(installs[0]).toMatchObject({ status: 0, signal: null, observation_complete: true });
    expect(installCommands).toHaveLength(1);
    const [installArguments] = installCommands;
    assert.ok(installArguments);
    for (const flag of ['install', '--frozen-lockfile', '--ignore-scripts', '--production'])
      expect(installArguments.includes(flag)).toBe(true);
    expect(readPortableLock(packageRoot)).toEqual(sourceLock);
    expect(existsSync(path.join(installFaultRoot, 'controller.json'))).toBe(false);
    const installObservations = path.join(installFaultRoot, 'observations');
    const installRuns = readdirSync(installObservations);
    expect(installRuns).toHaveLength(1);
    const [installRun] = installRuns;
    assert.ok(installRun);
    expect(
      JSON.parse(readFileSync(path.join(installObservations, installRun, 'controller-child.json'), 'utf8')),
    ).toMatchObject({ exit_code: 0, signal: null, timed_out: false, capture_status: 'complete' });
    expect(
      JSON.parse(readFileSync(path.join(installObservations, installRun, 'parent-complete.json'), 'utf8')),
    ).toMatchObject({ status: 'complete', controller_child: 'complete' });
    const controllerRoot = path.join(scratch, 'controller');
    const prepareOutput: string[] = [];
    const prepareStdout = spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      prepareOutput.push(String(chunk));
      return true;
    });
    const diagnostics = process.env.VIDA_CONTROLLER_DIAGNOSTICS;
    process.env.VIDA_CONTROLLER_DIAGNOSTICS = 'true';
    try {
      await main(['prepare', '--target', sourceRoot, '--controller-root', controllerRoot]);
    } finally {
      prepareStdout.mockRestore();
      if (diagnostics === undefined) delete process.env.VIDA_CONTROLLER_DIAGNOSTICS;
      else process.env.VIDA_CONTROLLER_DIAGNOSTICS = diagnostics;
    }
    const prepared = await inspectDevelopmentController({ controllerRoot });
    expect(JSON.parse(prepareOutput.join(''))).toMatchObject({
      schema: 'VidaDevelopmentController/v1',
      status: 'prepared',
      next_action: 'verify',
      controller_root: controllerRoot,
      target: sourceRoot,
    });
    expect(prepared.status).toBe('prepared');
    expect(readFileSync(path.join(prepared.package_root, 'bun.lock')).equals(readPortableLock(packageRoot))).toBe(true);
    expect(prepared.identity.bundle).toBe('packages/agent');
    const original = prepared;
    const stateFile = path.join(controllerRoot, 'controller.json');
    const malformed: readonly unknown[] = [
      null,
      [],
      { ...original, schema: 'other' },
      { ...original, status: 'other' },
      ...['controller_root', 'entrypoint', 'target', 'package_root', 'engine', 'engine_sha256'].map((field) => ({
        ...original,
        [field]: null,
      })),
      { ...original, elapsed_ms: null },
      { ...original, qualification: null },
      ...['schema', 'status', 'package_binding', 'fixture_root', 'checks'].map((field) => ({
        ...original,
        qualification: {
          schema: 'DevelopmentControllerQualification/v1',
          status: 'pass',
          package_binding: original.package_binding.digest,
          fixture_root: '/unused',
          checks: [],
          [field]: null,
        },
      })),
      { ...original, invocation: null },
      { ...original, invocation: { executable: null, args: [] } },
      { ...original, invocation: { executable: original.engine, args: [null] } },
      { ...original, identity: null },
      ...['repository_id', 'project_ids', 'bundle'].map((field) => ({
        ...original,
        identity: { ...original.identity, [field]: null },
      })),
      { ...original, identity: { ...original.identity, project_ids: [null] } },
      ...[
        null,
        [],
        { files: [] },
        { ...original.package_binding, files: [null] },
        ...['path', 'bytes', 'sha256'].map((field) => ({
          ...original.package_binding,
          files: [{ path: 'fixture', bytes: 0, sha256: 'fixture', [field]: null }],
        })),
        { ...original.package_binding, files: [{ path: 'fixture', bytes: -1, sha256: 'fixture' }] },
        { ...original.package_binding, files: [{ path: 'fixture', bytes: 0.5, sha256: 'fixture' }] },
        { ...original.package_binding, links: [null] },
        { ...original.package_binding, links: [{ path: null, target: 'fixture' }] },
        { ...original.package_binding, links: [{ path: 'fixture', target: null }] },
        { ...original.package_binding, digest: 'wrong' },
        { ...original.package_binding, runtime_paths: null },
        { ...original.package_binding, runtime_paths: [null] },
      ].map((package_binding) => ({ ...original, package_binding })),
    ];
    await withRestoredControllerMetadata(stateFile, async () => {
      for (const value of malformed) {
        writeFileSync(stateFile, JSON.stringify(value));
        await assert.rejects(inspectDevelopmentController({ controllerRoot }), /metadata is malformed/);
      }
      for (const value of [
        { ...original, unexpected: true },
        { ...original, controller_root: scratch },
        { ...original, entrypoint: '/unused' },
        { ...original, invocation: { ...original.invocation, args: [] } },
        { ...original, package_root: scratch },
        { ...original, engine: '/unused' },
      ]) {
        writeFileSync(stateFile, JSON.stringify(value));
        await assert.rejects(inspectDevelopmentController({ controllerRoot }), /operational metadata differs/);
      }
    });
    await Promise.resolve(
      expect(
        executeDevelopmentController({ controllerRoot, command: 'run', args: ['--project-root', sourceRoot] }),
      ).rejects.toThrow('qualified'),
    );
    const preparedBytes = readFileSync(stateFile);
    const observationRoot = path.join(controllerRoot, 'observations');
    const preparedRuns = readdirSync(observationRoot).sort();
    const preparedObservationPaths = readdirSync(observationRoot, { recursive: true }).map(String).sort();
    assert.ok(preparedObservationPaths.length <= 64, 'bounded private observation fixture');
    const preparedObservationBytes = new Map(
      preparedObservationPaths.flatMap((relative) => {
        const file = path.join(observationRoot, relative);
        return lstatSync(file).isFile() ? [[relative, readFileSync(file)] as const] : [];
      }),
    );
    const foreignFixture = path.join(scratch, 'foreign-qualification');
    const wrongPrefix = path.join(controllerRoot, 'unqualified-fixture');
    for (const root of [foreignFixture, wrongPrefix]) {
      mkdirSync(root);
      writeFileSync(path.join(root, 'retained.txt'), 'qualification ownership sentinel\n');
    }
    const qualificationInput = {
      schema: 'DevelopmentControllerQualification/v1',
      status: 'pass',
      package_binding: prepared.package_binding.digest,
      checks: [],
      fixture_root: foreignFixture,
    };
    const childCases: readonly {
      result: ReturnType<typeof controllerObservation.invokeObservedControllerChild>;
      error: RegExp | typeof SyntaxError;
    }[] = [
      {
        result: {
          status: null,
          signal: 'SIGKILL',
          stdout: null,
          stderr: 'token=private-value',
          error: new Error('child stopped'),
          observation_complete: false,
        },
        error: /child_failure_effects_unknown/,
      },
      {
        result: { status: 2, signal: null, stdout: null, stderr: 'refused', observation_complete: true },
        error: /Development controller child failed/,
      },
      {
        result: { status: 0, signal: null, stdout: '{}', stderr: null, observation_complete: false },
        error: /observation is incomplete/,
      },
      {
        result: { status: 0, signal: null, stdout: null, stderr: null, observation_complete: true },
        error: SyntaxError,
      },
      {
        result: { status: 0, signal: null, stdout: '{}', stderr: null, observation_complete: true },
        error: /qualification metadata is malformed/,
      },
      {
        result: {
          status: 0,
          signal: null,
          stdout: new Uint8Array(Buffer.from(JSON.stringify({ ...qualificationInput, status: 'failed' }))),
          stderr: null,
          observation_complete: true,
        },
        error: /qualification did not establish/,
      },
      ...[foreignFixture, wrongPrefix].map((fixture_root) => ({
        result: {
          status: 0,
          signal: null,
          stdout: JSON.stringify({ ...qualificationInput, fixture_root }),
          stderr: null,
          observation_complete: true,
        },
        error: /fixture ownership differs/,
      })),
    ];
    const envKeys = ['NODE_OPTIONS', 'VIDA_CONTROLLER_OBSERVATION_FAULT_FIXTURE', 'VIDA_CONTROLLER_TEST_FORWARD'];
    const savedEnvironment = envKeys.map((key) => [key, process.env[key]] as const);
    process.env.NODE_OPTIONS = '--no-warnings';
    process.env.VIDA_CONTROLLER_OBSERVATION_FAULT_FIXTURE = 'must-be-stripped';
    process.env.VIDA_CONTROLLER_TEST_FORWARD = 'retained';
    try {
      for (const { result, error } of childCases) {
        let calls = 0;
        let observedEnvironment: NodeJS.ProcessEnv | undefined;
        const child = spyOn(controllerObservation, 'invokeObservedControllerChild').mockImplementation((input) => {
          calls += 1;
          observedEnvironment = input.env;
          return result;
        });
        try {
          await assert.rejects(verifyDevelopmentController({ controllerRoot }), error);
          expect(calls).toBe(1);
          assert.ok(observedEnvironment);
          expect(observedEnvironment.NODE_OPTIONS).toBeUndefined();
          expect(observedEnvironment.VIDA_CONTROLLER_OBSERVATION_FAULT_FIXTURE).toBeUndefined();
          expect(observedEnvironment.VIDA_CONTROLLER_TEST_FORWARD).toBe('retained');
          expect(readFileSync(stateFile)).toEqual(preparedBytes);
          expect(readdirSync(observationRoot).sort()).toEqual(preparedRuns);
          expect(readdirSync(observationRoot, { recursive: true }).map(String).sort()).toEqual(
            preparedObservationPaths,
          );
          for (const [relative, bytes] of preparedObservationBytes)
            expect(readFileSync(path.join(observationRoot, relative))).toEqual(bytes);
          for (const root of [foreignFixture, wrongPrefix])
            expect(readFileSync(path.join(root, 'retained.txt'), 'utf8')).toBe('qualification ownership sentinel\n');
        } finally {
          child.mockRestore();
        }
      }
    } finally {
      for (const [key, value] of savedEnvironment) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
    const output: string[] = [];
    let verifyOutput = '';
    let inspectOutput = '';
    const stdout = spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      output.push(String(chunk));
      return true;
    });
    try {
      await assert.rejects(main(['unknown']), /development-controller prepare/);
      assert.equal(output.length, 0);
      await assert.rejects(
        main(['inspect', '--controller-root', controllerRoot, '--unknown', 'value']),
        /Invalid controller option/,
      );
      assert.equal(output.length, 0);
      await assert.rejects(
        main(['inspect', '--controller-root', controllerRoot, '--target', sourceRoot]),
        /not supported for this mode/,
      );
      assert.equal(output.length, 0);
      await assert.rejects(main(['exec', '--controller-root', controllerRoot]), /separator missing/);
      assert.equal(output.length, 0);
      await main(['verify', '--controller-root', controllerRoot]);
      verifyOutput = output.splice(0).join('');
      await main(['inspect', '--controller-root', controllerRoot]);
      inspectOutput = output.join('');
    } finally {
      stdout.mockRestore();
    }
    const verifyValue: unknown = JSON.parse(verifyOutput);
    const inspectValue: unknown = JSON.parse(inspectOutput);
    if (
      typeof verifyValue !== 'object' ||
      verifyValue === null ||
      Array.isArray(verifyValue) ||
      typeof inspectValue !== 'object' ||
      inspectValue === null ||
      Array.isArray(inspectValue)
    )
      throw new TypeError('Controller CLI output must be a record.');
    const verifyResult = verifyValue as Record<string, unknown>;
    const inspectResult = inspectValue as Record<string, unknown>;
    expect(verifyResult.schema).toBe('VidaDevelopmentController/v1');
    expect(verifyResult.status).toBe('ready');
    expect(verifyResult.next_action).toBe('exec');
    expect(inspectResult.schema).toBe('VidaDevelopmentController/v1');
    expect(inspectResult.status).toBe('ready');
    expect(inspectResult.next_action).toBe('exec');
    const ready = await inspectDevelopmentController({ controllerRoot });
    assert.ok(ready, 'controller inspection returned a result');
    expect(ready.status).toBe('ready');
    if (ready.qualification === undefined) throw new Error('ready controller is missing its qualification');
    expect(ready.qualification.schema).toBe('DevelopmentControllerQualification/v1');
    expect(ready.qualification.checks).toContain('actual-source-report');
    expect(developmentControllerBinding(ready.package_root)).toBe(ready.package_binding.digest);
    expect(existsSync(ready.qualification.fixture_root)).toBe(false);
    const observations = path.join(controllerRoot, 'observations');
    const observationRuns = readdirSync(observations).sort();
    expect(observationRuns).toHaveLength(2);
    await withRestoredControllerMetadata(stateFile, async () => {
      for (const qualification of [
        undefined,
        { ...ready.qualification, status: 'failed' },
        { ...ready.qualification, package_binding: '0'.repeat(64) },
      ]) {
        writeFileSync(stateFile, JSON.stringify({ ...ready, qualification }));
        await assert.rejects(inspectDevelopmentController({ controllerRoot }), /qualification/);
        await assert.rejects(
          executeDevelopmentController({ controllerRoot, command: 'scope', args: ['--project-root', sourceRoot] }),
          /qualification/,
        );
        expect(readdirSync(observations).sort()).toEqual(observationRuns);
      }
      writeFileSync(
        stateFile,
        JSON.stringify({
          ...ready,
          identity: { ...ready.identity, repository_id: ready.identity.repository_id + '-foreign' },
        }),
      );
      await assert.rejects(inspectDevelopmentController({ controllerRoot }), /target identity differs/);
      await assert.rejects(
        executeDevelopmentController({ controllerRoot, command: 'scope', args: ['--project-root', sourceRoot] }),
        /target identity differs/,
      );
      expect(readdirSync(observations).sort()).toEqual(observationRuns);
    });
    for (const run of observationRuns) {
      const root = path.join(observations, run);
      expect(JSON.parse(readFileSync(path.join(root, 'controller-child.json'), 'utf8'))).toMatchObject({
        exit_code: 0,
        signal: null,
        timed_out: false,
        capture_status: 'complete',
      });
      expect(JSON.parse(readFileSync(path.join(root, 'parent-complete.json'), 'utf8'))).toMatchObject({
        status: 'complete',
        controller_child: 'complete',
      });
    }
    const qualificationRun = observationRuns.find((run) =>
      existsSync(path.join(observations, run, 'nested/qualifier-repair-inspect.json')),
    );
    assert.ok(qualificationRun, 'qualification retained its declared nested child observations');
    for (const role of ['qualifier-repair-inspect', 'qualifier-repair-plan', 'qualifier-repair-apply']) {
      expect(
        JSON.parse(readFileSync(path.join(observations, qualificationRun, 'nested', role + '.json'), 'utf8')),
      ).toMatchObject({ role, exit_code: 0, signal: null, timed_out: false, capture_status: 'complete' });
    }
    for (const input of [
      { command: 'unsupported', args: ['--project-root', sourceRoot] },
      { command: 'scope' },
      { command: 'scope', args: ['--project-root'] },
      { command: 'scope', args: ['--project-root', sourceRoot, '--project-root', sourceRoot] },
    ]) {
      await assert.rejects(
        executeDevelopmentController({ controllerRoot, ...input }),
        input.command === 'unsupported' ? /supported target command/ : /exact original target/,
      );
      expect(readdirSync(observations).sort()).toEqual(observationRuns);
    }
    const qualification: unknown = ready.qualification;
    if (typeof qualification !== 'object' || qualification === null || !('runtime_acceptance' in qualification)) {
      throw new TypeError('controller qualification is missing runtime acceptance status');
    }
    expect(qualification.runtime_acceptance).toBe(false);
    console.log(
      JSON.stringify({
        operation: 'controller-prepare-verify',
        prepare_ms: prepared.elapsed_ms,
        verify_ms: ready.elapsed_ms,
      }),
    );
    const execStarted = performance.now();
    const execOutput: string[] = [];
    const execStdout = spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      execOutput.push(String(chunk));
      return true;
    });
    try {
      await main([
        'exec',
        '--controller-root',
        controllerRoot,
        '--',
        'scope',
        '--project-root',
        sourceRoot,
        '--repository',
        prepared.identity.repository_id,
        '--project',
        'agent',
        '--path',
        'packages/agent/bin/development-controller.ts',
      ]);
    } finally {
      execStdout.mockRestore();
    }
    expect(JSON.parse(execOutput.join(''))).toMatchObject({
      schema: 'ScopedSourceSnapshot/v1',
      entries: [
        {
          path: 'packages/agent/bin/development-controller.ts',
          exists: existsSync(path.join(sourceRoot, 'packages/agent/bin/development-controller.ts')),
        },
      ],
    });
    const invoked = spawnSync(
      ready.engine,
      [
        ...ready.invocation.args,
        'exec',
        '--controller-root',
        controllerRoot,
        '--',
        'vida-agent',
        'scope',
        '--project-root',
        sourceRoot,
        '--repository',
        prepared.identity.repository_id,
        '--project',
        'agent',
        '--path',
        'packages/agent/bin/development-controller.ts',
      ],
      { encoding: 'utf8', windowsHide: true },
    );
    expect(invoked.status, invoked.stderr).toBe(0);
    const invokedOutput: unknown = JSON.parse(invoked.stdout);
    if (
      typeof invokedOutput !== 'object' ||
      invokedOutput === null ||
      Array.isArray(invokedOutput) ||
      !('schema' in invokedOutput)
    ) {
      throw new TypeError('controller scope output must be a schema-bearing object');
    }
    expect(invokedOutput.schema).toBe('ScopedSourceSnapshot/v1');
    expect(invokedOutput).toMatchObject({
      entries: [
        {
          path: 'packages/agent/bin/development-controller.ts',
          exists: existsSync(path.join(sourceRoot, 'packages/agent/bin/development-controller.ts')),
        },
      ],
    });
    console.log(JSON.stringify({ operation: 'warm-controller-exec', elapsed_ms: performance.now() - execStarted }));
    await Promise.resolve(
      expect(
        executeDevelopmentController({ controllerRoot, command: 'scope', args: ['--project-root', scratch] }),
      ).rejects.toThrow('exact original target'),
    );
    const file = path.join(ready.package_root, 'bin/scope.ts');
    const before = readFileSync(file);
    writeFileSync(file, Buffer.concat([before, Buffer.from('\n// altered controller\n')]));
    await Promise.resolve(expect(inspectDevelopmentController({ controllerRoot })).rejects.toThrow('drift'));
    writeFileSync(file, before);
    const manifestFile = path.join(ready.package_root, 'package.json');
    const manifest = readFileSync(manifestFile);
    const manifestValue: unknown = JSON.parse(manifest.toString());
    if (typeof manifestValue !== 'object' || manifestValue === null || Array.isArray(manifestValue)) {
      throw new TypeError('controller manifest must be an object');
    }
    writeFileSync(manifestFile, JSON.stringify({ ...manifestValue, name: 'wrong-package' }));
    await Promise.resolve(
      expect(inspectDevelopmentController({ controllerRoot })).rejects.toThrow('current vida-agent candidate'),
    );
    writeFileSync(manifestFile, manifest);
    const packageLock = path.join(ready.package_root, 'bun.lock');
    await withRestoredControllerMetadata(packageLock, async () => {
      const lock = readPortableLock(ready.package_root);
      assert.deepEqual(readFileSync(path.join(ready.package_root, 'dist/portable/bun.lock')), lock);
      unlinkSync(packageLock);
      expect(readPortableLock(ready.package_root)).toEqual(lock);
      await assert.rejects(inspectDevelopmentController({ controllerRoot }), /drift/);
    });
    await withRestoredControllerMetadata(manifestFile, async () => {
      for (const value of [null, [], { name: 42 }, { version: 42 }]) {
        writeFileSync(manifestFile, JSON.stringify(value));
        await assert.rejects(inspectDevelopmentController({ controllerRoot }), /package manifest is malformed/);
      }
    });
    const outsideDependency = path.join(ready.package_root, 'node_modules/controller-outside-link');
    symlinkSync(foreignFixture, outsideDependency, process.platform === 'win32' ? 'junction' : 'dir');
    let linkFailure: { error: unknown } | undefined;
    try {
      await assert.rejects(inspectDevelopmentController({ controllerRoot }), /dependency link escapes/);
      expect(readFileSync(path.join(foreignFixture, 'retained.txt'), 'utf8')).toBe(
        'qualification ownership sentinel\n',
      );
    } catch (error) {
      linkFailure = { error };
      throw error;
    } finally {
      completeOwnedCleanup(
        [
          () => {
            unlinkSync(outsideDependency);
          },
        ],
        linkFailure,
      );
    }
    if (process.platform !== 'win32') {
      const socketFile = path.join(ready.package_root, 'bin/io.sock');
      const listener = Bun.listen({ unix: socketFile, socket: { data() {} } });
      let socketFailure: { error: unknown } | undefined;
      try {
        await assert.rejects(inspectDevelopmentController({ controllerRoot }), /unsupported filesystem entry/);
      } catch (error) {
        socketFailure = { error };
        throw error;
      } finally {
        completeOwnedCleanup(
          [
            () => {
              listener.stop(true);
            },
            () => {
              if (existsSync(socketFile)) unlinkSync(socketFile);
            },
          ],
          socketFailure,
        );
      }
    }
    const pinFile = path.join(ready.package_root, '.bun-version');
    const pin = readFileSync(pinFile);
    writeFileSync(pinFile, '1.4.1\n');
    await Promise.resolve(expect(inspectDevelopmentController({ controllerRoot })).rejects.toThrow('Bun pin differs'));
    writeFileSync(pinFile, pin);
    const dependency = ready.package_binding.files.find(
      (file) => file.path.startsWith('node_modules/') && file.path.endsWith('package.json'),
    );
    expect(dependency).toBeDefined();
    if (dependency === undefined) throw new Error('qualified package is missing its dependency manifest');
    const depFile = path.join(ready.package_root, dependency.path);
    const dep = readFileSync(depFile);
    writeFileSync(depFile, '{}');
    await Promise.resolve(expect(inspectDevelopmentController({ controllerRoot })).rejects.toThrow('drift'));
    writeFileSync(depFile, dep);
    expect((await inspectDevelopmentController({ controllerRoot })).package_binding.digest).toBe(
      ready.package_binding.digest,
    );
    completed = true;
  } finally {
    if (completed && process.env.VIDA_CONTROLLER_DIAGNOSTICS !== 'true') cleanupOwnedFixture(scratch);
    else if (completed) console.error(`Retained diagnostic controller fixture: ${scratch}`);
    else console.error(`Retained failed or uncertain controller fixture: ${scratch}`);
  }
}, 180000);

test('development controller rejects an active selector and an overlapping or linked target before construction', async () => {
  const scratch = mkdtempSync(path.join(tmpdir(), 'vida-controller-deny-'));
  let completed = false;
  try {
    mkdirSync(path.join(scratch, '.agent'));
    writeFileSync(path.join(scratch, '.agent/active-runtime-selector.v1.json'), '{}');
    await Promise.resolve(
      expect(
        prepareDevelopmentController({ target: scratch, controllerRoot: path.join(scratch, 'controller') }),
      ).rejects.toThrow('active-selector'),
    );
    const alias = path.join(scratch, 'source-alias');
    symlinkSync(sourceRoot, alias, process.platform === 'win32' ? 'junction' : 'dir');
    await Promise.resolve(
      expect(
        prepareDevelopmentController({ target: alias, controllerRoot: path.join(scratch, 'controller') }),
      ).rejects.toThrow('physical'),
    );
    await Promise.resolve(
      expect(
        prepareDevelopmentController({
          target: sourceRoot,
          controllerRoot: path.join(sourceRoot, `.controller-overlap-denial-${process.pid}`),
        }),
      ).rejects.toThrow('outside'),
    );
    completed = true;
  } finally {
    if (completed) cleanupOwnedFixture(scratch);
    else console.error(`Retained failed or uncertain controller fixture: ${scratch}`);
  }
});

test('controller inspection rejects a physical file and preserves nonmissing path errors', async () => {
  const scratch = mkdtempSync(path.join(tmpdir(), 'vida-controller-file-'));
  let completed = false;
  try {
    const file = path.join(scratch, 'file');
    writeFileSync(file, 'not a controller directory\n');
    await assert.rejects(inspectDevelopmentController({ controllerRoot: file }), /linked directory/);
    expect(readFileSync(file, 'utf8')).toBe('not a controller directory\n');
    await assert.rejects(
      inspectDevelopmentController({ controllerRoot: './relative-controller' }),
      /physical directories/,
    );
    completed = true;
  } finally {
    if (completed) cleanupOwnedFixture(scratch);
    else console.error(`Retained failed or uncertain controller fixture: ${scratch}`);
  }
});

test('controller rejects a native initialized portable bundle before construction', async () => {
  const scratch = mkdtempSync(path.join(tmpdir(), 'vida-controller-portable-'));
  let completed = false;
  try {
    const target = path.join(scratch, 'target');
    mkdirSync(target);
    const initialized = await initializeProject({
      projectRoot: target,
      repository: 'controller-portable-fixture',
      projectMappings: ['agent=.'],
    });
    expect(initialized.status).toBe('initialized');
    const controllerRoot = path.join(scratch, 'controller');
    await assert.rejects(
      prepareDevelopmentController({ target, controllerRoot }),
      /restricted to the Source logical packages\/agent bundle/,
    );
    expect(existsSync(controllerRoot)).toBe(false);
    completed = true;
  } finally {
    if (completed) cleanupOwnedFixture(scratch);
    else console.error(`Retained failed or uncertain controller fixture: ${scratch}`);
  }
});

test('controller CLI emits its blocked envelope before constructing a controller', () => {
  const scratch = mkdtempSync(path.join(tmpdir(), 'vida-controller-cli-error-'));
  let completed = false;
  try {
    const child = spawnSync(
      process.execPath,
      [
        '--no-env-file',
        '--no-install',
        '--config=' + path.join(packageRoot, 'bunfig.toml'),
        path.join(packageRoot, 'bin/development-controller.ts'),
        'inspect',
      ],
      { encoding: 'utf8', windowsHide: true, timeout: 4000 },
    );
    writeFileSync(path.join(scratch, 'stdout.log'), child.stdout ?? '');
    writeFileSync(path.join(scratch, 'stderr.log'), child.stderr ?? '');
    expect(child.error).toBeUndefined();
    expect(child.signal).toBeNull();
    expect(child.status).toBe(1);
    expect(child.stdout).toBe('');
    expect(JSON.parse(child.stderr)).toEqual({
      status: 'blocked',
      code: 'GAP-DEVELOPMENT-CONTROLLER-001',
      message: 'Required controller option is missing.',
    });
    completed = true;
  } finally {
    if (completed) cleanupOwnedFixture(scratch);
    else console.error(`Retained failed or uncertain controller fixture: ${scratch}`);
  }
});

test('controller portable lock reader binds only declared regular Source or SDK resources', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-controller-lock-'));
  try {
    mkdirSync(path.join(root, 'dist/portable'), { recursive: true });
    const source = path.join(root, 'bun.lock');
    const portable = path.join(root, 'dist/portable/bun.lock');
    const bytes = Buffer.from('TEST SETUP portable lock bytes');
    writeFileSync(portable, bytes);
    expect(readPortableLock(root)).toEqual(bytes);
    writeFileSync(source, 'TEST SETUP selected Source bytes');
    expect(readPortableLock(root)).toEqual(readFileSync(source));
    unlinkSync(source);
    const owner = path.join(root, 'owner');
    writeFileSync(owner, bytes);
    linkSync(owner, source);
    expect(() => readPortableLock(root)).toThrow('regular unlinked');
    expect(readFileSync(owner)).toEqual(bytes);
    unlinkSync(source);
    unlinkSync(portable);
    expect(() => readPortableLock(root)).toThrow('missing its lockfile');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
