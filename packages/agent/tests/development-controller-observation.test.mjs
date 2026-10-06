import assert from 'node:assert/strict';
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
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { afterEach, test } from 'bun:test';
import { invokeObservedControllerChild } from '../bin/development-controller-observation.mjs';

const packageRoot = path.resolve(import.meta.dirname, '..');
const repositoryRoot = path.resolve(packageRoot, '../..');
const fixtureParent = path.join(
  repositoryRoot,
  '.tmp/core-windows-resume-20261002/native15-observation-verification-20261006/fixtures',
);
const roles = ['qualifier-repair-inspect', 'qualifier-repair-plan', 'qualifier-repair-apply'];
const roots = [];
const preserve = new Set();

mkdirSync(fixtureParent, { recursive: true });

function fixtureRoot() {
  const root = mkdtempSync(path.join(fixtureParent, 'controller-'));
  roots.push(root);
  return root;
}

function script(root, name, source) {
  const directory = path.join(root, 'child-scripts');
  mkdirSync(directory, { recursive: true });
  const file = path.join(directory, name);
  writeFileSync(file, source, 'utf8');
  return file;
}

function runChild(controllerRoot, file, options = {}) {
  return invokeObservedControllerChild({
    controllerRoot,
    executable: options.executable ?? process.execPath,
    args: options.args ?? [file],
    cwd: options.cwd ?? packageRoot,
    env: { ...process.env, ...options.env },
    ...(options.timeout === undefined ? {} : { timeout: options.timeout }),
    ...(options.maxBuffer === undefined ? {} : { maxBuffer: options.maxBuffer }),
    ...(options.nestedChildren === undefined ? {} : { nestedChildren: options.nestedChildren }),
  });
}

function latestRun(controllerRoot) {
  const observations = path.join(controllerRoot, 'observations');
  const ids = readdirSync(observations).filter((name) => name !== 'active');
  assert.equal(ids.length, 1);
  return path.join(observations, ids[0]);
}

function receipt(controllerRoot, relative = 'controller-child.json') {
  return JSON.parse(readFileSync(path.join(latestRun(controllerRoot), relative), 'utf8'));
}

function restartAttempt(controllerRoot, marker) {
  const file = script(
    controllerRoot,
    `restart-${path.basename(marker)}.mjs`,
    `import { invokeObservedControllerChild } from ${JSON.stringify(new URL('../bin/development-controller-observation.mjs', import.meta.url).href)};\n` +
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
  for (const root of roots.splice(0)) if (!preserve.has(root)) rmSync(root, { recursive: true, force: true });
  preserve.clear();
});

test('retains exact raw streams and command context outside a cleaned qualification fixture', () => {
  const controllerRoot = fixtureRoot();
  const stdout = Buffer.from([0x00, 0x41, 0xff, 0x0a]),
    stderr = Buffer.from([0x42, 0x00, 0xc3, 0x28]);
  const file = script(
    controllerRoot,
    'success.mjs',
    `process.stdout.write(Buffer.from(${JSON.stringify([...stdout])})); process.stderr.write(Buffer.from(${JSON.stringify([...stderr])}));\n`,
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
  assert.equal(stored.runtime.pinned_bun_version, '1.4.2');
  assert.deepEqual(Buffer.from(stored.stdout_base64, 'base64'), stdout);
  assert.deepEqual(Buffer.from(stored.stderr_base64, 'base64'), stderr);
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
  assert.equal(stored.spawn_error.code, 'ENOENT');
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
  assert.ok(stored.stdout_bytes > 0);
  assert.ok(stored.stdout_bytes < 512 * 1024);
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
    `import { writeFileSync } from 'node:fs'; writeFileSync(${JSON.stringify(started)}, 'started'); setInterval(() => {}, 1000);\n`,
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
    `import { writeFileSync } from 'node:fs'; writeFileSync(${JSON.stringify(collisionMarker)}, 'ran');\n`,
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
    `import { writeFileSync } from 'node:fs'; writeFileSync(${JSON.stringify(linkedMarker)}, 'ran');\n`,
  );
  assert.throws(() => runChild(linkedRoot, linkedChild), /observation|linked/i);
  assert.equal(existsSync(linkedMarker), false);
});

test('correlates only the declared qualification children and denies independent or duplicate launches', () => {
  const controllerRoot = fixtureRoot();
  const marker = path.join(controllerRoot, 'forbidden-child-ran');
  const helperUrl = new URL('../bin/development-controller-observation.mjs', import.meta.url).href;
  const nestedFiles = Object.fromEntries(
    roles.map((role) => [
      role,
      script(controllerRoot, `${role}.mjs`, `process.stdout.write(${JSON.stringify(role)});\n`),
    ]),
  );
  const forbidden = script(
    controllerRoot,
    'forbidden.mjs',
    `import { writeFileSync } from 'node:fs'; writeFileSync(${JSON.stringify(marker)}, 'ran');\n`,
  );
  const parent = script(
    controllerRoot,
    'compound-parent.mjs',
    `import path from 'node:path';\n` +
      `import { invokeNestedObservedControllerChild, invokeObservedControllerChild } from ${JSON.stringify(helperUrl)};\n` +
      `let independent = false; try { invokeObservedControllerChild({ controllerRoot: path.dirname(process.env.VIDA_CONTROLLER_OBSERVATION_ROOT), executable: process.execPath, args: [${JSON.stringify(forbidden)}], cwd: process.cwd(), env: process.env }); } catch { independent = true; }\n` +
      `for (const role of ${JSON.stringify(roles)}) { const result = invokeNestedObservedControllerChild({ role, executable: process.execPath, args: [process.env.TEST_NESTED_FILES.split('|')[${JSON.stringify(roles)}.indexOf(role)]], cwd: process.cwd(), timeout: 30000 }); if (result.status !== 0) process.exit(21); }\n` +
      `let duplicate = false; try { invokeNestedObservedControllerChild({ role: ${JSON.stringify(roles[0])}, executable: process.execPath, args: [${JSON.stringify(forbidden)}], cwd: process.cwd(), timeout: 30000 }); } catch { duplicate = true; }\n` +
      `if (!independent || !duplicate) process.exit(22); process.stdout.write('independent=blocked;duplicate=blocked');\n`,
  );
  const result = runChild(controllerRoot, parent, {
    nestedChildren: roles,
    env: { TEST_NESTED_FILES: roles.map((role) => nestedFiles[role]).join('|') },
  });
  assert.equal(result.status, 0, result.stderr?.toString('utf8'));
  assert.equal(result.observation_complete, true);
  assert.equal(result.stdout.toString('utf8'), 'independent=blocked;duplicate=blocked');
  assert.equal(existsSync(marker), false);
  for (const role of roles) assert.equal(receipt(controllerRoot, `nested/${role}.json`).capture_status, 'complete');
});

test('retains UNKNOWN when final compound receipt persistence fails after child completion', () => {
  const controllerRoot = fixtureRoot();
  preserve.add(controllerRoot);
  const helperUrl = new URL('../bin/development-controller-observation.mjs', import.meta.url).href;
  const nestedFiles = Object.fromEntries(
    roles.map((role) => [
      role,
      script(controllerRoot, `${role}.mjs`, `process.stdout.write(${JSON.stringify(role)});\n`),
    ]),
  );
  const parent = script(
    controllerRoot,
    'persistence-failure-parent.mjs',
    `import fs from 'node:fs'; import path from 'node:path';\n` +
      `import { invokeNestedObservedControllerChild } from ${JSON.stringify(helperUrl)};\n` +
      `for (const role of ${JSON.stringify(roles)}) { const result = invokeNestedObservedControllerChild({ role, executable: process.execPath, args: [process.env.TEST_NESTED_FILES.split('|')[${JSON.stringify(roles)}.indexOf(role)]], cwd: process.cwd(), timeout: 30000 }); if (result.status !== 0) process.exit(21); }\n` +
      `fs.mkdirSync(path.join(process.env.VIDA_CONTROLLER_OBSERVATION_RUN_ROOT, 'parent-complete.json'));\n`,
  );
  assert.throws(() =>
    runChild(controllerRoot, parent, {
      nestedChildren: roles,
      env: { TEST_NESTED_FILES: roles.map((role) => nestedFiles[role]).join('|') },
    }),
  );
  const runRoot = latestRun(controllerRoot);
  assert.equal(receipt(controllerRoot).capture_status, 'complete');
  for (const role of roles) assert.equal(receipt(controllerRoot, `nested/${role}.json`).capture_status, 'complete');
  assert.equal(existsSync(path.join(runRoot, 'parent-complete.json')), true);
  assert.equal(existsSync(path.join(controllerRoot, 'observations/active/reservation.json')), true);
  restartAttempt(controllerRoot, path.join(controllerRoot, 'second-child-ran'));
});
