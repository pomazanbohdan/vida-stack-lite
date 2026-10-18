import assert from 'node:assert/strict';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, mock, test } from 'bun:test';
import { readPin } from '../bin/bun.ts';
import {
  invokeNestedObservedControllerChild,
  invokeObservedControllerChild,
} from '../bin/development-controller-observation.ts';
import { prepareDevelopmentController } from '../bin/development-controller.ts';

type ChildInvocation = Parameters<typeof invokeObservedControllerChild>[0];
type ObservedChildResult = ReturnType<typeof invokeObservedControllerChild>;

interface RunChildOptions {
  readonly executable?: string | undefined;
  readonly args?: string[] | undefined;
  readonly cwd?: string | undefined;
  readonly env?: NodeJS.ProcessEnv | undefined;
  readonly timeout?: number | undefined;
  readonly maxBuffer?: number | undefined;
  readonly nestedChildren?: readonly string[] | undefined;
}

type JsonRecord = Record<string, unknown>;

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const packageRoot = path.resolve(import.meta.dirname, '..');
const repositoryRoot = path.resolve(packageRoot, '../..');
const fixtureParent = path.join(
  repositoryRoot,
  '.tmp/core-windows-resume-20261002/native15-observation-verification-20261006/fixtures',
);
const roles = ['qualifier-repair-inspect', 'qualifier-repair-plan', 'qualifier-repair-apply'];
const roots: string[] = [];
const preserve = new Set<string>();

mkdirSync(fixtureParent, { recursive: true });

function fixtureRoot(): string {
  const root = mkdtempSync(path.join(fixtureParent, 'controller-'));
  roots.push(root);
  return root;
}

function script(root: string, name: string, source: string): string {
  const directory = path.join(root, 'child-scripts');
  mkdirSync(directory, { recursive: true });
  const file = path.join(directory, name);
  writeFileSync(file, source, 'utf8');
  return file;
}

function runChild(controllerRoot: string, file: string, options: RunChildOptions = {}): ObservedChildResult {
  const request: ChildInvocation & { readonly controllerRoot: string } = {
    controllerRoot,
    executable: options.executable ?? process.execPath,
    args: options.args ?? [file],
    cwd: options.cwd ?? packageRoot,
    env: { ...process.env, ...options.env },
    ...(options.timeout === undefined ? {} : { timeout: options.timeout }),
    ...(options.maxBuffer === undefined ? {} : { maxBuffer: options.maxBuffer }),
    ...(options.nestedChildren === undefined ? {} : { nestedChildren: options.nestedChildren }),
  };
  return invokeObservedControllerChild(request);
}

function asRecord(value: unknown, description: string): JsonRecord {
  if (!isJsonRecord(value)) {
    throw new TypeError(`${description} must be an object`);
  }
  return value;
}

function asString(value: unknown, description: string): string {
  if (typeof value !== 'string') throw new TypeError(`${description} must be a string`);
  return value;
}

function asNumber(value: unknown, description: string): number {
  if (typeof value !== 'number') throw new TypeError(`${description} must be a number`);
  return value;
}

function jsonText(value: unknown): string {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new TypeError('value cannot be represented as JSON');
  return serialized;
}

function nestedFile(files: ReadonlyMap<string, string>, role: string): string {
  const file = files.get(role);
  if (file === undefined) throw new Error(`missing child script for ${role}`);
  return file;
}

function capturedText(value: ObservedChildResult['stdout']): string {
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) return Buffer.from(value).toString('utf8');
  if (typeof value === 'string') return value;
  throw new TypeError('child output is unavailable');
}

function latestRun(controllerRoot: string): string {
  const observations = path.join(controllerRoot, 'observations');
  const ids = readdirSync(observations).filter((name) => name !== 'active');
  assert.equal(ids.length, 1);
  const runId = asString(ids[0], 'observation run id');
  return path.join(observations, runId);
}

function receipt(controllerRoot: string, relative = 'controller-child.json'): JsonRecord {
  const value: unknown = JSON.parse(readFileSync(path.join(latestRun(controllerRoot), relative), 'utf8'));
  return asRecord(value, 'controller observation receipt');
}

function restartAttempt(controllerRoot: string, marker: string): void {
  const file = script(
    controllerRoot,
    `restart-${path.basename(marker)}.mjs`,
    `import { invokeObservedControllerChild } from ${jsonText(new URL('../bin/development-controller-observation.ts', import.meta.url).href)};\n` +
      `try { invokeObservedControllerChild({ controllerRoot: process.env.TEST_CONTROLLER_ROOT, executable: process.execPath, args: [process.env.TEST_MARKER_CHILD], cwd: process.cwd(), env: process.env }); process.stdout.write('launched'); } catch { process.stdout.write('blocked'); }\n`,
  );
  const attempt = spawnSync(process.execPath, [file], {
    cwd: packageRoot,
    env: { ...process.env, TEST_CONTROLLER_ROOT: controllerRoot, TEST_MARKER_CHILD: marker },
    encoding: 'utf8',
    windowsHide: true,
    timeout: 10_000,
  });
  assert.equal(attempt.error, undefined);
  assert.equal(attempt.signal, null);
  assert.equal(attempt.status, 0, attempt.stderr);
  assert.equal(attempt.stdout, 'blocked');
  assert.equal(existsSync(marker), false);
}

const internalEnvironmentKeys = [
  'VIDA_CONTROLLER_OBSERVATION_ROOT',
  'VIDA_CONTROLLER_OBSERVATION_RUN_ID',
  'VIDA_CONTROLLER_OBSERVATION_TOKEN',
  'VIDA_CONTROLLER_OBSERVATION_RUN_ROOT',
] as const;

function installInternalEnvironment(values: Readonly<Record<string, string>>): () => void {
  const previous = new Map(internalEnvironmentKeys.map((key) => [key, process.env[key]]));
  for (const key of internalEnvironmentKeys) delete process.env[key];
  Object.assign(process.env, values);
  return () => {
    for (const key of internalEnvironmentKeys) {
      const value = previous.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
}

function contextVariables(
  observations: string,
  runId: string,
  token: string,
  runRoot: string,
): Readonly<Record<string, string>> {
  return {
    VIDA_CONTROLLER_OBSERVATION_ROOT: observations,
    VIDA_CONTROLLER_OBSERVATION_RUN_ID: runId,
    VIDA_CONTROLLER_OBSERVATION_TOKEN: token,
    VIDA_CONTROLLER_OBSERVATION_RUN_ROOT: runRoot,
  };
}

function invokeNestedWithMarker(marker: string): void {
  invokeNestedObservedControllerChild({
    role: roles[0]!,
    executable: process.execPath,
    args: [marker],
    cwd: packageRoot,
  });
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    if (!preserve.has(root)) rmSync(root, { recursive: true, force: true });
  }
  preserve.clear();
});

const runtimeConfigUrl = pathToFileURL(path.join(packageRoot, 'src/config/runtime-config.ts')).href;
const originalRuntimeConfig = { ...(await import('../src/config/runtime-config.ts')) };

for (const mode of ['invalid-api', 'foreign-bundle', 'loader-error', 'loader-undefined'] as const)
  test(`controller module guard preserves failure-before-construction for ${mode}`, async () => {
    const scratch = mkdtempSync(path.join(tmpdir(), 'vida-controller-module-'));
    roots.push(scratch);
    preserve.add(scratch);
    const controllerRoot = path.join(scratch, 'controller');
    const calls: string[] = [];
    const bodyError = new Error('runtime config loader failed');
    const loadRuntimeConfig =
      mode === 'invalid-api'
        ? 42
        : (root: string) => {
            calls.push(root);
            if (mode === 'loader-error') throw bodyError;
            if (mode === 'loader-undefined') throw undefined;
            return { runtime: { bundle: 'foreign' } };
          };
    let completed = false;
    try {
      await mock.module(runtimeConfigUrl, () => ({ ...originalRuntimeConfig, loadRuntimeConfig }));
      const expected =
        mode === 'invalid-api'
          ? 'Development controller runtime config API is invalid.'
          : 'Development controller is restricted to the Source logical packages/agent bundle.';
      await assert.rejects(
        () => prepareDevelopmentController({ target: repositoryRoot, controllerRoot }),
        (error) => {
          if (mode === 'loader-error') return error === bodyError;
          if (mode === 'loader-undefined') return error === undefined;
          assert.ok(error instanceof Error);
          assert.equal(error.message, expected);
          return true;
        },
      );
      assert.deepEqual(calls, mode === 'invalid-api' ? [] : [repositoryRoot]);
      assert.equal(existsSync(controllerRoot), false);
      completed = true;
    } finally {
      await mock.module(runtimeConfigUrl, () => originalRuntimeConfig);
      const restored: unknown = await import(runtimeConfigUrl);
      assert.ok(isJsonRecord(restored));
      assert.equal(restored.loadRuntimeConfig, originalRuntimeConfig.loadRuntimeConfig);
      if (completed) preserve.delete(scratch);
    }
  });

function privatePackage(controllerRoot: string): { readonly root: string; readonly observer: string } {
  const root = path.join(controllerRoot, 'private-package');
  mkdirSync(path.join(root, 'bin'), { recursive: true });
  const observer = path.join(root, 'bin/development-controller-observation.ts');
  copyFileSync(path.join(packageRoot, 'bin/development-controller-observation.ts'), observer);
  copyFileSync(path.join(packageRoot, '.bun-version'), path.join(root, '.bun-version'));
  return { root, observer };
}

test('captures launch runtime context before a child removes its private package pin', () => {
  const controllerRoot = fixtureRoot();
  const fixture = privatePackage(controllerRoot);
  const stdout = Buffer.from([0x00, 0x70, 0xff, 0x0a]);
  const stderr = Buffer.from([0x65, 0x00, 0xc3, 0x28]);
  const pin = path.join(fixture.root, '.bun-version');
  const child = script(
    controllerRoot,
    'remove-private-pin.mjs',
    `import { unlinkSync } from 'node:fs';\n` +
      `unlinkSync(${jsonText(pin)});\n` +
      `process.stdout.write(Buffer.from(${jsonText([...stdout])}));\n` +
      `process.stderr.write(Buffer.from(${jsonText([...stderr])}));\n` +
      `process.exitCode = 23;\n`,
  );
  const driver = path.join(fixture.root, 'invoke.mjs');
  writeFileSync(
    driver,
    `import { invokeObservedControllerChild } from ${jsonText(pathToFileURL(fixture.observer).href)};\n` +
      `const result = invokeObservedControllerChild({ controllerRoot: process.env.TEST_CONTROLLER_ROOT, executable: process.execPath, args: [process.env.TEST_CHILD], cwd: process.cwd(), env: process.env });\n` +
      `process.stdout.write(JSON.stringify({ status: result.status, observation_complete: result.observation_complete }));\n`,
    'utf8',
  );
  const attempt = spawnSync(process.execPath, [driver], {
    cwd: packageRoot,
    env: { ...process.env, TEST_CONTROLLER_ROOT: controllerRoot, TEST_CHILD: child },
    encoding: 'utf8',
    windowsHide: true,
    timeout: 10_000,
  });

  // The parent driver completes and the fixture pin is gone, proving deletion
  // happened after the observer had already launched the child.
  if (attempt.status !== 0) preserve.add(controllerRoot);
  assert.equal(attempt.error, undefined);
  assert.equal(attempt.signal, null);
  assert.equal(attempt.status, 0, attempt.stderr);
  assert.deepEqual(JSON.parse(attempt.stdout), { status: 23, observation_complete: true });
  assert.equal(existsSync(pin), false);

  const stored = receipt(controllerRoot);
  assert.equal(stored.capture_status, 'complete');
  assert.equal(stored.exit_code, 23);
  assert.equal(
    asRecord(stored.runtime, 'runtime context').pinned_bun_version,
    readFileSync(path.join(packageRoot, '.bun-version'), 'utf8').trim(),
  );
  assert.deepEqual(Buffer.from(asString(stored.stdout_base64, 'stdout base64'), 'base64'), stdout);
  assert.deepEqual(Buffer.from(asString(stored.stderr_base64, 'stderr base64'), 'base64'), stderr);
  assert.equal(existsSync(path.join(controllerRoot, 'observations/active/reservation.json')), false);
});

test('retains exact raw streams and command context outside a cleaned qualification fixture', () => {
  const controllerRoot = fixtureRoot();
  const stdout = Buffer.from([0x00, 0x41, 0xff, 0x0a]);
  const stderr = Buffer.from([0x42, 0x00, 0xc3, 0x28]);
  const file = script(
    controllerRoot,
    'success.mjs',
    `process.stdout.write(Buffer.from(${jsonText([...stdout])})); process.stderr.write(Buffer.from(${jsonText([...stderr])}));\n`,
  );
  const fixture = path.join(controllerRoot, 'qualification-fixture');
  mkdirSync(fixture);
  const result = runChild(controllerRoot, file);
  assert.equal(result.status, 0);
  assert.equal(result.observation_complete, true);
  rmSync(fixture, { recursive: true });
  const stored = receipt(controllerRoot);
  assert.equal(stored.role, 'controller-child');
  assert.equal(stored.capture_status, 'complete');
  assert.equal(stored.executable, process.execPath);
  assert.deepEqual(stored.args, [file]);
  assert.equal(stored.parent_cwd, packageRoot);
  assert.equal(stored.child_cwd, packageRoot);
  const runtime = asRecord(stored.runtime, 'runtime context');
  assert.equal(runtime.pinned_bun_version, readPin(packageRoot));
  assert.deepEqual(Buffer.from(asString(stored.stdout_base64, 'stdout base64'), 'base64'), stdout);
  assert.deepEqual(Buffer.from(asString(stored.stderr_base64, 'stderr base64'), 'base64'), stderr);
  assert.equal(existsSync(path.join(latestRun(controllerRoot), 'parent-complete.json')), true);
});

test('retains stdout-only, stderr-only and combined terminal nonzero results', () => {
  for (const [name, writes] of [
    ['stdout', "process.stdout.write('only-out');"],
    ['stderr', "process.stderr.write('only-err');"],
    ['combined', "process.stdout.write('out'); process.stderr.write('err');"],
  ]) {
    const controllerRoot = fixtureRoot();
    const file = script(controllerRoot, `${name}.mjs`, `${writes} process.exitCode = 17;\n`);
    const result = runChild(controllerRoot, file);
    assert.equal(result.status, 17);
    assert.equal(result.observation_complete, true);
    assert.equal(receipt(controllerRoot).capture_status, 'complete');
  }
});

test('retains a spawn error and keeps its reservation UNKNOWN', () => {
  const controllerRoot = fixtureRoot();
  preserve.add(controllerRoot);
  const missing = path.join(controllerRoot, 'missing-executable.exe');
  const result = runChild(controllerRoot, missing, { executable: missing, args: [] });
  assert.ok(result.error);
  assert.equal(result.observation_complete, false);
  const stored = receipt(controllerRoot);
  assert.equal(stored.capture_status, 'UNKNOWN');
  const spawnError = asRecord(stored.spawn_error, 'spawn error');
  assert.equal(spawnError.name, 'Error');
  assert.match(asString(spawnError.message, 'spawn error message'), /ENOENT/);
  assert.equal(spawnError.code, 'ENOENT');
  assert.equal(spawnError.path, missing);
  assert.equal(existsSync(path.join(controllerRoot, 'observations/active/reservation.json')), true);
});

test('keeps partial bytes on the pinned Node-compatible buffer-limit outcome and denies fresh-process reissue', () => {
  const controllerRoot = fixtureRoot();
  preserve.add(controllerRoot);
  const marker = path.join(controllerRoot, 'second-child-ran');
  const file = script(controllerRoot, 'too-much-output.mjs', 'process.stdout.write(Buffer.alloc(512 * 1024, 0x78));\n');
  const result = runChild(controllerRoot, file, { maxBuffer: 16 * 1024 });
  assert.ok(result.error);
  assert.equal(result.observation_complete, false);
  const stored = receipt(controllerRoot);
  assert.equal(stored.capture_status, 'UNKNOWN');
  const stdoutBytes = asNumber(stored.stdout_bytes, 'captured stdout byte count');
  assert.ok(stdoutBytes > 0);
  assert.ok(stdoutBytes < 512 * 1024);
  restartAttempt(controllerRoot, marker);
});

test('retains a timed out child as UNKNOWN and denies launch after a parent process restart', () => {
  const controllerRoot = fixtureRoot();
  preserve.add(controllerRoot);
  const marker = path.join(controllerRoot, 'second-child-ran');
  const started = path.join(controllerRoot, 'first-child-started');
  const file = script(
    controllerRoot,
    'timed-child.mjs',
    `import { writeFileSync } from 'node:fs'; writeFileSync(${jsonText(started)}, 'started'); setInterval(() => {}, 1000);\n`,
  );
  const result = runChild(controllerRoot, file, { timeout: 200 });
  assert.ok(result.error || result.signal || result.status !== 0);
  assert.equal(result.observation_complete, false);
  assert.equal(receipt(controllerRoot).capture_status, 'UNKNOWN');
  assert.equal(existsSync(started), true);
  restartAttempt(controllerRoot, marker);
});

test('rejects an existing compound reservation and a linked observation root before launch', () => {
  const collisionRoot = fixtureRoot();
  const collisionMarker = path.join(collisionRoot, 'must-not-run');
  const markerChild = script(
    collisionRoot,
    'mark.mjs',
    `import { writeFileSync } from 'node:fs'; writeFileSync(${jsonText(collisionMarker)}, 'ran');\n`,
  );
  mkdirSync(path.join(collisionRoot, 'observations/active'), { recursive: true });
  assert.throws(() => runChild(collisionRoot, markerChild), /observation/i);
  assert.equal(existsSync(collisionMarker), false);

  const linkedRoot = fixtureRoot();
  const outside = path.join(linkedRoot, 'outside');
  mkdirSync(outside);
  symlinkSync(outside, path.join(linkedRoot, 'observations'), process.platform === 'win32' ? 'junction' : 'dir');
  const linkedMarker = path.join(linkedRoot, 'must-not-run');
  const linkedChild = script(
    linkedRoot,
    'linked-mark.mjs',
    `import { writeFileSync } from 'node:fs'; writeFileSync(${jsonText(linkedMarker)}, 'ran');\n`,
  );
  assert.throws(() => runChild(linkedRoot, linkedChild), /observation|linked/i);
  assert.equal(existsSync(linkedMarker), false);
});

test('strips caller supplied observation context before launching a controller child', () => {
  const controllerRoot = fixtureRoot();
  preserve.add(controllerRoot);
  const marker = path.join(controllerRoot, 'caller-context-child-ran');
  const child = script(
    controllerRoot,
    'caller-context.mjs',
    `import { invokeNestedObservedControllerChild } from ${jsonText(new URL('../bin/development-controller-observation.ts', import.meta.url).href)};\n` +
      `const keys = ${jsonText(internalEnvironmentKeys)};\n` +
      `let nestedBlocked = false; try { invokeNestedObservedControllerChild({ role: ${jsonText(roles[0]!)}, executable: process.execPath, args: [${jsonText(marker)}], cwd: process.cwd() }); } catch (error) { nestedBlocked = error instanceof Error && /lacks its active compound context/.test(error.message); }\n` +
      `process.stdout.write(JSON.stringify({ leaked: keys.filter((key) => process.env[key] !== undefined), nestedBlocked }));\n`,
  );
  const result = runChild(controllerRoot, child, {
    env: {
      VIDA_CONTROLLER_OBSERVATION_ROOT: controllerRoot,
      VIDA_CONTROLLER_OBSERVATION_RUN_ID: 'caller-run',
      VIDA_CONTROLLER_OBSERVATION_TOKEN: 'caller-token',
      VIDA_CONTROLLER_OBSERVATION_RUN_ROOT: path.join(controllerRoot, 'caller-run'),
    },
  });

  assert.equal(result.status, 0, capturedText(result.stderr));
  assert.equal(result.observation_complete, true);
  assert.deepEqual(JSON.parse(capturedText(result.stdout)), { leaked: [], nestedBlocked: true });
  assert.equal(existsSync(marker), false);
  preserve.delete(controllerRoot);
});

test('refuses nested launches without every controller-owned command-context value', () => {
  const controllerRoot = fixtureRoot();
  preserve.add(controllerRoot);
  const marker = path.join(controllerRoot, 'must-not-run');
  const markerChild = script(
    controllerRoot,
    'untrusted-nested-context.mjs',
    `import { writeFileSync } from 'node:fs'; writeFileSync(${jsonText(marker)}, 'ran');\n`,
  );
  const observations = path.join(controllerRoot, 'observations');
  const runId = 'untrusted-run';
  const runRoot = path.join(observations, runId);
  const completeContext = contextVariables(observations, runId, 'untrusted-token', runRoot);

  for (const missingKey of internalEnvironmentKeys) {
    const incompleteContext: Record<string, string> = { ...completeContext };
    delete incompleteContext[missingKey];
    const restore = installInternalEnvironment(incompleteContext);
    try {
      assert.throws(() => invokeNestedWithMarker(markerChild), /lacks its active compound context/);
      assert.equal(existsSync(marker), false, `${missingKey} must be required before child launch`);
    } finally {
      restore();
    }
  }

  mkdirSync(path.join(controllerRoot, 'not-observations', runId), { recursive: true });
  const nonCanonicalRoot = path.join(controllerRoot, 'not-observations');
  const restore = installInternalEnvironment(
    contextVariables(nonCanonicalRoot, runId, 'untrusted-token', path.join(nonCanonicalRoot, runId)),
  );
  try {
    assert.throws(() => invokeNestedWithMarker(markerChild), /nested observation location differs/);
    assert.equal(existsSync(marker), false);
  } finally {
    restore();
  }

  const canonicalObservations = path.join(controllerRoot, 'observations');
  mkdirSync(path.join(canonicalObservations, 'different-run'), { recursive: true });
  const restoreWrongRunId = installInternalEnvironment(
    contextVariables(
      canonicalObservations,
      runId,
      'untrusted-token',
      path.join(canonicalObservations, 'different-run'),
    ),
  );
  try {
    assert.throws(() => invokeNestedWithMarker(markerChild), /nested observation location differs/);
    assert.equal(existsSync(marker), false);
  } finally {
    restoreWrongRunId();
  }

  const restoreWrongParent = installInternalEnvironment(
    contextVariables(canonicalObservations, runId, 'untrusted-token', path.join(controllerRoot, 'elsewhere')),
  );
  try {
    assert.throws(() => invokeNestedWithMarker(markerChild), /nested observation location differs/);
    assert.equal(existsSync(marker), false);
  } finally {
    restoreWrongParent();
  }
  preserve.delete(controllerRoot);
});

test('binds nested launch context to a well-formed current reservation before child launch', () => {
  const cases: Array<{
    readonly name: string;
    readonly mutate: (reservation: Record<string, unknown>) => void;
    readonly message: RegExp;
  }> = [
    {
      name: 'schema',
      mutate: (value) => (value.schema = 'DevelopmentControllerObservationReservation/v0'),
      message: /reservation identity differs/,
    },
    { name: 'status', mutate: (value) => (value.status = 'complete'), message: /reservation identity differs/ },
    { name: 'run id type', mutate: (value) => (value.run_id = 17), message: /reservation identity differs/ },
    { name: 'token type', mutate: (value) => (value.token = null), message: /reservation identity differs/ },
    { name: 'root type', mutate: (value) => (value.observations_root = []), message: /reservation identity differs/ },
    {
      name: 'nested role type',
      mutate: (value) => (value.expected_nested = [17]),
      message: /reservation identity differs/,
    },
    { name: 'created time type', mutate: (value) => (value.created_at = 17), message: /reservation identity differs/ },
    {
      name: 'run id binding',
      mutate: (value) => (value.run_id = 'another-run'),
      message: /reservation identity differs/,
    },
    {
      name: 'token binding',
      mutate: (value) => (value.token = 'another-token'),
      message: /reservation identity differs/,
    },
    {
      name: 'observation root binding',
      mutate: (value) => (value.observations_root = '/another/observations'),
      message: /reservation identity differs/,
    },
    {
      name: 'incomplete nested declaration',
      mutate: (value) => (value.expected_nested = []),
      message: /nested reservation is incomplete/,
    },
  ];
  const controllerRoot = fixtureRoot();
  preserve.add(controllerRoot);
  const observations = path.join(controllerRoot, 'observations');
  const runId = 'bound-run';
  const runRoot = path.join(observations, runId);
  const active = path.join(observations, 'active');
  const marker = path.join(controllerRoot, 'reservation-child-must-not-run');
  const markerChild = script(
    controllerRoot,
    'reservation-child.mjs',
    `import { writeFileSync } from 'node:fs'; writeFileSync(${jsonText(marker)}, 'ran');\n`,
  );
  mkdirSync(path.join(runRoot, 'nested'), { recursive: true });
  mkdirSync(active);
  const token = 'current-token';
  const restore = installInternalEnvironment(contextVariables(observations, runId, token, runRoot));
  try {
    for (const scenario of cases) {
      const reservation: Record<string, unknown> = {
        schema: 'DevelopmentControllerObservationReservation/v1',
        status: 'active',
        run_id: runId,
        token,
        observations_root: observations,
        expected_nested: roles,
        created_at: '2026-10-18T00:00:00.000Z',
      };
      scenario.mutate(reservation);
      writeFileSync(path.join(active, 'reservation.json'), `${JSON.stringify(reservation)}\n`);
      assert.throws(() => invokeNestedWithMarker(markerChild), scenario.message, scenario.name);
      assert.equal(existsSync(marker), false, `${scenario.name} must fail before child launch`);
    }
  } finally {
    restore();
  }
  preserve.delete(controllerRoot);
});

test('rejects a linked active reservation before issuing the nested child', () => {
  const controllerRoot = fixtureRoot();
  preserve.add(controllerRoot);
  const observations = path.join(controllerRoot, 'observations');
  const runId = 'linked-reservation-run';
  const runRoot = path.join(observations, runId);
  const active = path.join(observations, 'active');
  const token = 'current-token';
  const marker = path.join(controllerRoot, 'linked-reservation-child-ran');
  const markerChild = script(
    controllerRoot,
    'linked-reservation.mjs',
    `import { writeFileSync } from 'node:fs'; writeFileSync(${jsonText(marker)}, 'ran');\n`,
  );
  mkdirSync(path.join(runRoot, 'nested'), { recursive: true });
  mkdirSync(active);
  const externalReservation = path.join(controllerRoot, 'external-reservation.json');
  writeFileSync(
    externalReservation,
    `${JSON.stringify({
      schema: 'DevelopmentControllerObservationReservation/v1',
      status: 'active',
      run_id: runId,
      token,
      observations_root: observations,
      expected_nested: roles,
      created_at: '2026-10-18T00:00:00.000Z',
    })}\n`,
  );
  symlinkSync(externalReservation, path.join(active, 'reservation.json'), 'file');
  const restore = installInternalEnvironment(contextVariables(observations, runId, token, runRoot));
  try {
    assert.throws(() => invokeNestedWithMarker(markerChild), /active reservation is not a regular file/);
    assert.equal(existsSync(marker), false);
  } finally {
    restore();
  }
  preserve.delete(controllerRoot);
});

test('rejects invalid public nested-child declarations before creating observations', () => {
  const cases: Array<{ readonly name: string; readonly nestedChildren: readonly unknown[] }> = [
    { name: 'non-string role', nestedChildren: [17] },
    { name: 'undeclared role', nestedChildren: ['undeclared-role'] },
    { name: 'duplicate role', nestedChildren: [roles[0]!, roles[0]!] },
    { name: 'incomplete declaration', nestedChildren: [roles[0]!] },
  ];

  for (const scenario of cases) {
    const controllerRoot = fixtureRoot();
    preserve.add(controllerRoot);
    const child = script(controllerRoot, `${scenario.name.replaceAll(' ', '-')}.mjs`, "process.stdout.write('ran');\n");
    assert.throws(
      () =>
        invokeObservedControllerChild({
          controllerRoot,
          executable: process.execPath,
          args: [child],
          cwd: packageRoot,
          env: process.env,
          nestedChildren: scenario.nestedChildren,
        }),
      /nested child declaration/,
      scenario.name,
    );
    assert.equal(
      existsSync(path.join(controllerRoot, 'observations')),
      false,
      `${scenario.name} creates no reservation`,
    );
    preserve.delete(controllerRoot);
  }
});

test('runs a declared nested child through the public in-process API with its active reservation', () => {
  const controllerRoot = fixtureRoot();
  preserve.add(controllerRoot);
  const observations = path.join(controllerRoot, 'observations');
  const runId = 'valid-nested-run';
  const runRoot = path.join(observations, runId);
  const active = path.join(observations, 'active');
  const token = 'valid-nested-token';
  const role = asString(roles[0], 'nested role');
  const marker = path.join(controllerRoot, 'valid-nested-child-ran');
  const markerChild = script(
    controllerRoot,
    'valid-nested-child.mjs',
    `import { writeFileSync } from 'node:fs'; writeFileSync(${jsonText(marker)}, 'ran'); process.stdout.write('nested-ok');\n`,
  );
  mkdirSync(path.join(runRoot, 'nested'), { recursive: true });
  mkdirSync(active);
  writeFileSync(
    path.join(active, 'reservation.json'),
    `${JSON.stringify({
      schema: 'DevelopmentControllerObservationReservation/v1',
      status: 'active',
      run_id: runId,
      token,
      observations_root: observations,
      expected_nested: roles,
      created_at: '2026-10-18T00:00:00.000Z',
    })}\n`,
  );

  const restore = installInternalEnvironment(contextVariables(observations, runId, token, runRoot));
  try {
    const result = invokeNestedObservedControllerChild({
      role,
      executable: process.execPath,
      args: [markerChild],
      cwd: packageRoot,
      timeout: 1000,
    });
    assert.equal(result.status, 0);
    assert.equal(capturedText(result.stdout), 'nested-ok');
    assert.equal(existsSync(marker), true);
    const nested = receipt(controllerRoot, `nested/${role}.json`);
    assert.equal(nested.capture_status, 'complete');
    assert.equal(nested.role, role);
    assert.equal(nested.parent_id, runId);
    assert.equal(existsSync(path.join(runRoot, 'nested', `${role}.pending.json`)), false);
    assert.equal(existsSync(path.join(active, 'reservation.json')), true);
  } finally {
    restore();
  }
  preserve.delete(controllerRoot);
});

test('correlates only the declared qualification children and denies independent or duplicate launches', () => {
  const controllerRoot = fixtureRoot();
  const marker = path.join(controllerRoot, 'forbidden-child-ran');
  const helperUrl = new URL('../bin/development-controller-observation.ts', import.meta.url).href;
  const nestedFiles = new Map<string, string>();
  for (const role of roles) {
    nestedFiles.set(role, script(controllerRoot, `${role}.mjs`, `process.stdout.write(${jsonText(role)});\n`));
  }
  const forbidden = script(
    controllerRoot,
    'forbidden.mjs',
    `import { writeFileSync } from 'node:fs'; writeFileSync(${jsonText(marker)}, 'ran');\n`,
  );
  const firstRole = asString(roles[0], 'first nested role');
  const parent = script(
    controllerRoot,
    'compound-parent.mjs',
    `import path from 'node:path';\n` +
      `import { invokeNestedObservedControllerChild, invokeObservedControllerChild } from ${jsonText(helperUrl)};\n` +
      `let independent = false; try { invokeObservedControllerChild({ controllerRoot: path.dirname(process.env.VIDA_CONTROLLER_OBSERVATION_ROOT), executable: process.execPath, args: [${jsonText(forbidden)}], cwd: process.cwd(), env: process.env }); } catch { independent = true; }\n` +
      `for (const role of ${jsonText(roles)}) { const result = invokeNestedObservedControllerChild({ role, executable: process.execPath, args: [process.env.TEST_NESTED_FILES.split('|')[${jsonText(roles)}.indexOf(role)]], cwd: process.cwd(), timeout: 30000 }); if (result.status !== 0) process.exit(21); }\n` +
      `let duplicate = false; try { invokeNestedObservedControllerChild({ role: ${jsonText(firstRole)}, executable: process.execPath, args: [${jsonText(forbidden)}], cwd: process.cwd(), timeout: 30000 }); } catch { duplicate = true; }\n` +
      `if (!independent || !duplicate) process.exit(22); process.stdout.write('independent=blocked;duplicate=blocked');\n`,
  );
  const result = runChild(controllerRoot, parent, {
    nestedChildren: roles,
    env: { TEST_NESTED_FILES: roles.map((role) => nestedFile(nestedFiles, role)).join('|') },
  });
  assert.equal(result.status, 0, capturedText(result.stderr));
  assert.equal(result.observation_complete, true);
  assert.equal(capturedText(result.stdout), 'independent=blocked;duplicate=blocked');
  assert.equal(existsSync(marker), false);
  for (const role of roles) {
    assert.equal(receipt(controllerRoot, `nested/${role}.json`).capture_status, 'complete');
  }
});

test('marks a missing declared nested receipt UNKNOWN and retains the active reservation', () => {
  const controllerRoot = fixtureRoot();
  preserve.add(controllerRoot);
  const helperUrl = new URL('../bin/development-controller-observation.ts', import.meta.url).href;
  const nestedFiles = new Map<string, string>();
  for (const role of roles) {
    nestedFiles.set(role, script(controllerRoot, `${role}.mjs`, `process.stdout.write(${jsonText(role)});\n`));
  }
  const omittedRole = asString(roles[2], 'omitted nested role');
  const parent = script(
    controllerRoot,
    'missing-nested-receipt-parent.mjs',
    `import { invokeNestedObservedControllerChild } from ${jsonText(helperUrl)};\n` +
      `for (const role of ${jsonText(roles.slice(0, 2))}) { const file = process.env.TEST_NESTED_FILES.split('|')[${jsonText(roles)}.indexOf(role)]; const result = invokeNestedObservedControllerChild({ role, executable: process.execPath, args: [file], cwd: process.cwd(), timeout: 500 }); if (result.status !== 0) process.exit(21); }\n` +
      `process.stdout.write('parent-finished');\n`,
  );
  const result = runChild(controllerRoot, parent, {
    nestedChildren: roles,
    timeout: 1000,
    env: { TEST_NESTED_FILES: roles.map((role) => nestedFile(nestedFiles, role)).join('|') },
  });

  assert.equal(result.status, 0, capturedText(result.stderr));
  assert.equal(result.observation_complete, false);
  assert.equal(capturedText(result.stdout), 'parent-finished');
  assert.equal(receipt(controllerRoot).capture_status, 'complete');
  assert.equal(receipt(controllerRoot, `nested/${roles[0]}.json`).capture_status, 'complete');
  assert.equal(receipt(controllerRoot, `nested/${roles[1]}.json`).capture_status, 'complete');
  assert.equal(existsSync(path.join(latestRun(controllerRoot), 'nested', `${omittedRole}.json`)), false);
  const parentUnknown = receipt(controllerRoot, 'parent-unknown.json');
  assert.equal(parentUnknown.schema, 'DevelopmentControllerObservationCompletion/v1');
  assert.equal(parentUnknown.run_id, path.basename(latestRun(controllerRoot)));
  assert.equal(parentUnknown.status, 'UNKNOWN');
  assert.equal(parentUnknown.controller_child, 'complete');
  assert.match(asString(parentUnknown.observed_at, 'UNKNOWN observation time'), /^\d{4}-\d\d-\d\dT/);
  assert.deepEqual(parentUnknown.nested, [
    { role: 'qualifier-repair-apply', capture_status: 'UNKNOWN' },
    { role: 'qualifier-repair-inspect', capture_status: 'complete' },
    { role: 'qualifier-repair-plan', capture_status: 'complete' },
  ]);
  assert.equal(existsSync(path.join(controllerRoot, 'observations/active/reservation.json')), true);
});

test('retains UNKNOWN when final compound receipt persistence fails after child completion', () => {
  const controllerRoot = fixtureRoot();
  preserve.add(controllerRoot);
  const helperUrl = new URL('../bin/development-controller-observation.ts', import.meta.url).href;
  const nestedFiles = new Map<string, string>();
  for (const role of roles) {
    nestedFiles.set(role, script(controllerRoot, `${role}.mjs`, `process.stdout.write(${jsonText(role)});\n`));
  }
  const parent = script(
    controllerRoot,
    'persistence-failure-parent.mjs',
    `import fs from 'node:fs'; import path from 'node:path';\n` +
      `import { invokeNestedObservedControllerChild } from ${jsonText(helperUrl)};\n` +
      `for (const role of ${jsonText(roles)}) { const result = invokeNestedObservedControllerChild({ role, executable: process.execPath, args: [process.env.TEST_NESTED_FILES.split('|')[${jsonText(roles)}.indexOf(role)]], cwd: process.cwd(), timeout: 30000 }); if (result.status !== 0) process.exit(21); }\n` +
      `fs.mkdirSync(path.join(process.env.VIDA_CONTROLLER_OBSERVATION_RUN_ROOT, 'parent-complete.json'));\n`,
  );
  assert.throws(
    () =>
      runChild(controllerRoot, parent, {
        nestedChildren: roles,
        env: { TEST_NESTED_FILES: roles.map((role) => nestedFile(nestedFiles, role)).join('|') },
      }),
    (error: unknown) =>
      isJsonRecord(error) && error.path === path.join(latestRun(controllerRoot), 'parent-complete.json'),
  );
  const runRoot = latestRun(controllerRoot);
  assert.equal(receipt(controllerRoot).capture_status, 'complete');
  for (const role of roles) {
    assert.equal(receipt(controllerRoot, `nested/${role}.json`).capture_status, 'complete');
  }
  assert.equal(existsSync(path.join(runRoot, 'parent-complete.json')), true);
  assert.equal(existsSync(path.join(controllerRoot, 'observations/active/reservation.json')), true);
  restartAttempt(controllerRoot, path.join(controllerRoot, 'second-child-ran'));
});
