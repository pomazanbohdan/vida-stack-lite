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
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, test } from 'bun:test';
import { invokeObservedControllerChild } from '../bin/development-controller-observation.ts';

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

afterEach(() => {
  for (const root of roots.splice(0)) {
    if (!preserve.has(root)) rmSync(root, { recursive: true, force: true });
  }
  preserve.clear();
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
  assert.equal(runtime.pinned_bun_version, '1.4.2');
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
  assert.equal(spawnError.code, 'ENOENT');
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
  assert.throws(() =>
    runChild(controllerRoot, parent, {
      nestedChildren: roles,
      env: { TEST_NESTED_FILES: roles.map((role) => nestedFile(nestedFiles, role)).join('|') },
    }),
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
