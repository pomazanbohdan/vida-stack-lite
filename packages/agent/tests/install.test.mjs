import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  cpSync,
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
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, test } from 'bun:test';
import { install } from '../bin/install.mjs';
import { resolvePinnedBun, runPinnedBun } from '../bin/bun.mjs';

const source = path.resolve(import.meta.dirname, '..');
const v8CoverageTest = process.env.AGENT_RUNTIME_V8_COVERAGE === '1' ? test.skip : test;
const node = spawnSync('node', ['-p', 'process.execPath'], {
  encoding: 'utf8',
  windowsHide: true,
}).stdout.trim();
const roots = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
}, 180_000);
function fixture() {
  const project = mkdtempSync(path.join(os.tmpdir(), 'runtime-install-'));
  roots.push(project);
  const root = path.join(project, 'tools', 'runtime');
  mkdirSync(path.join(root, 'bin'), { recursive: true });
  for (const entry of [
    'package.json',
    '.bun-version',
    'bun.lock',
    'bin/bun.mjs',
    'bin/init-core.mjs',
    'bin/init.mjs',
    'bin/install.mjs',
  ])
    cpSync(path.join(source, entry), path.join(root, entry));
  const manifestPath = path.join(root, 'package.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  writeFileSync(manifestPath, JSON.stringify({ ...manifest, dependencies: { 'fixture-dependency': '1.0.0' } }));
  const dependencyRoot = path.join(root, 'node_modules/fixture-dependency');
  mkdirSync(dependencyRoot, { recursive: true });
  writeFileSync(
    path.join(dependencyRoot, 'package.json'),
    JSON.stringify({ name: 'fixture-dependency', version: '1.0.0', main: 'index.js' }),
  );
  writeFileSync(path.join(dependencyRoot, 'index.js'), 'module.exports = {};\n');
  return { root, project };
}
function options(root, overrides = {}) {
  return {
    root,
    node,
    nodeVersion: JSON.parse(readFileSync(path.join(root, 'package.json'))).engines.node,
    spawn: () => ({ status: 0, stdout: '11.17.0\n' }),
    runBun: () => assert.fail('Unexpected Bun resolution'),
    ...overrides,
  };
}
function initArgs(project) {
  return ['--project-root', project, '--repository', 'fixture-repository', '--project', 'fixture-project'];
}
function declarations(root) {
  return ['package.json', 'bun.lock', '.bun-version'].map((p) => readFileSync(path.join(root, p)).toString('base64'));
}

test('local check probes the same Node-adjacent npm and never resolves Bun or installs', () => {
  const { root, project } = fixture();
  const before = declarations(root);
  const result = install(
    ['--check'],
    options(root, {
      spawn: (executable, args, config) => {
        assert.equal(executable, node);
        assert.equal(path.basename(args[0]), 'npm-cli.js');
        assert.deepEqual(args.slice(1), ['--version']);
        assert.equal(config.cwd, root);
        return { status: 0, stdout: '11.17.0' };
      },
    }),
  );
  assert.equal(result.status, 'prerequisites_valid');
  assert.equal(result.bun_resolution, 'not_checked');
  assert.equal(result.dependencies, 'not_checked');
  assert.deepEqual(declarations(root), before);
  assert.deepEqual(readdirSync(project), ['tools']);
  assert.equal(existsSync(path.join(root, 'node_modules/fixture-dependency/index.js')), true);
});

test('bad prerequisites and required inputs stop before Bun', () => {
  const { root } = fixture();
  assert.throws(() => install([], options(root, { nodeVersion: '0.0.0' })), /Node version/);
  for (const probe of [
    { status: 0, stdout: '12.0.0' },
    { status: 0, stdout: '11.0.0-preview' },
    { status: 7 },
    { status: null, signal: 'SIGTERM' },
    { error: new Error('missing') },
  ]) {
    assert.throws(() => install([], options(root, { spawn: () => probe })), /npm/);
  }
  const manifestFile = path.join(root, 'package.json');
  const original = readFileSync(manifestFile);
  for (const engines of [
    { node: '24.x', npm: '11.x' },
    { node: '24.19.0', npm: '*' },
    { node: '24.19.0', npm: '11.x', bun: '1.4.1' },
  ]) {
    writeFileSync(manifestFile, JSON.stringify({ ...JSON.parse(original), engines }));
    assert.throws(() => install([], options(root)), /Node version|engines.npm|mirrors/);
  }
  writeFileSync(manifestFile, original);
  writeFileSync(path.join(root, '.bun-version'), 'latest');
  assert.throws(() => install([], options(root)), /exact stable/);
  cpSync(path.join(source, '.bun-version'), path.join(root, '.bun-version'));
  for (const missing of ['bun.lock', 'bin/bun.mjs', 'bin/init.mjs']) {
    const target = path.join(root, missing);
    const bytes = readFileSync(target);
    rmSync(target);
    assert.throws(() => install([], options(root)), /ENOENT|missing its lockfile/);
    writeFileSync(target, bytes);
  }
});

test('packed bundle reads the exact embedded lockfile without modifying npm-owned package inputs', () => {
  const { root } = fixture();
  const expected = readFileSync(path.join(root, 'bun.lock'));
  const embedded = path.join(root, 'dist', 'portable', 'bun.lock');
  mkdirSync(path.dirname(embedded), { recursive: true });
  writeFileSync(embedded, expected);
  rmSync(path.join(root, 'bun.lock'));
  const result = install(['--check'], options(root));
  assert.equal(result.status, 'prerequisites_valid');
  assert.equal(existsSync(path.join(root, 'bun.lock')), false);
  assert.deepEqual(readFileSync(embedded), expected);
});

test('packed lockfile rejects linked ancestor directories without materializing bytes', () => {
  for (const linkedDirectory of ['dist', path.join('dist', 'portable')]) {
    const { root, project } = fixture();
    const outside = path.join(project, 'outside');
    const lockfileParent = linkedDirectory === 'dist' ? path.join(outside, 'portable') : outside;
    mkdirSync(lockfileParent, { recursive: true });
    writeFileSync(path.join(lockfileParent, 'bun.lock'), readFileSync(path.join(root, 'bun.lock')));
    rmSync(path.join(root, 'bun.lock'));
    if (linkedDirectory !== 'dist') mkdirSync(path.join(root, 'dist'));
    symlinkSync(outside, path.join(root, linkedDirectory), process.platform === 'win32' ? 'junction' : 'dir');
    assert.throws(() => install(['--check'], options(root)), /non-link/);
    assert.equal(existsSync(path.join(root, 'bun.lock')), false);
  }
});

test('invalid initialization and CLI syntax fail before subprocesses', () => {
  const { root, project } = fixture();
  const invalid = [
    ['--check', '--check'],
    ['--unknown'],
    ['--tenant', 'aa'],
    ['--check', ...initArgs(project)],
    ['--project-root', 'relative', '--repository', 'aa', '--project', 'bb'],
    initArgs(project).map((x) => (x === 'fixture-repository' ? 'INVALID' : x)),
    [...initArgs(project), '--tenant', 'aa'],
  ];
  for (const args of invalid)
    assert.throws(
      () =>
        install(
          args,
          options(root, {
            spawn: () => assert.fail('must validate arguments first'),
          }),
        ),
      /Usage|arguments|absolute|slug|inside/,
    );
});

test('npm-owned dependencies are validated without install, then explicit init uses package cwd', () => {
  const { root, project } = fixture();
  const calls = [];
  const runBun = (args, config) => {
    calls.push(args);
    assert.equal(config.cwd, root);
    assert.equal(config.root, root);
    assert.equal(path.basename(config.npmCli), 'npm-cli.js');
    return 0;
  };
  assert.equal(install([], options(root, { runBun })).initialization, 'not_requested');
  assert.deepEqual(calls.splice(0), []);
  assert.equal(install(initArgs(project), options(root, { runBun })).initialization, 'delegated_successfully');
  assert.deepEqual(calls, [[path.join(root, 'bin/init.mjs'), ...initArgs(project)]]);
});

test('failed or interrupted initialization propagates without package installation', () => {
  const { root, project } = fixture();
  for (const fail of [
    () => 19,
    () => {
      throw new Error('interrupted');
    },
  ]) {
    let count = 0;
    assert.throws(
      () =>
        install(
          initArgs(project),
          options(root, {
            runBun: () => {
              count++;
              return fail();
            },
          }),
        ),
      /failed|interrupted/,
    );
    assert.equal(count, 1);
  }
  let count = 0;
  assert.throws(
    () => install(initArgs(project), options(root, { runBun: () => (++count, 23) })),
    (error) => error.exitCode === 23,
  );
  assert.equal(count, 1);
  assert.deepEqual(readdirSync(project), ['tools']);
});

test('input mutation is detected even on failed install and prevents initialization', () => {
  const { root, project } = fixture();
  for (const relative of ['bun.lock', 'bin/install.mjs']) {
    const target = path.join(root, relative);
    const original = readFileSync(target);
    let calls = 0;
    assert.throws(
      () =>
        install(
          initArgs(project),
          options(root, {
            runBun: () => {
              calls++;
              writeFileSync(target, 'changed');
              return relative === 'bun.lock' ? 2 : 0;
            },
          }),
        ),
      /inputs changed/,
    );
    assert.equal(calls, 1);
    writeFileSync(target, original);
  }
  assert.equal(existsSync(path.join(project, 'AGENTS.md')), false);
});

test('linked package directory is rejected and absent npm-owned dependencies prevent initialization', () => {
  const { root, project } = fixture();
  const link = path.join(project, 'linked');
  symlinkSync(root, link, process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => install(['--check'], options(link)), /non-link/);
  rmSync(path.join(root, 'node_modules'), { recursive: true });
  assert.throws(() => install(initArgs(project), options(root)), /Cannot find module|MODULE_NOT_FOUND/);
  assert.equal(existsSync(path.join(project, 'AGENTS.md')), false);
});

v8CoverageTest(
  'npm-owned package initializes from unrelated cwd and preserves existing project integration',
  () => {
    const { root, project } = fixture();
    for (const entry of ['src', 'dist', 'tooling', 'schemas', 'templates', 'instructions', 'TESTING.md'])
      cpSync(path.join(source, entry), path.join(root, entry), {
        recursive: true,
        dereference: false,
      });
    cpSync(path.join(source, 'package.json'), path.join(root, 'package.json'));
    rmSync(path.join(root, 'node_modules'), { recursive: true });
    symlinkSync(
      path.join(source, 'node_modules'),
      path.join(root, 'node_modules'),
      process.platform === 'win32' ? 'junction' : 'dir',
    );
    const before = declarations(root);
    const cli = path.join(root, 'bin/install.mjs');
    const run = (args) =>
      spawnSync('node', [cli, ...args], {
        cwd: os.tmpdir(),
        encoding: 'utf8',
        windowsHide: true,
        timeout: 240_000,
      });
    const check = run(['--check']);
    assert.equal(check.status, 0, check.stderr);
    assert.equal(JSON.parse(check.stdout).dependencies, 'not_checked');
    assert.equal(existsSync(path.join(root, 'node_modules/ajv')), true);
    const sidecar = path.join(project, 'AGENT.sidecar.md');
    writeFileSync(sidecar, 'Existing project owner context\n');
    const bunExecutable = resolvePinnedBun({ root, node });
    const installOptions = {
      root,
      node,
      nodeVersion: JSON.parse(readFileSync(path.join(root, 'package.json'))).engines.node,
      bunExecutable,
    };
    assert.throws(() => install(initArgs(project), installOptions), /Project initialization failed/);
    assert.equal(readFileSync(sidecar, 'utf8'), 'Existing project owner context\n');
    for (const absent of [
      'AGENTS.md',
      'agent-runtime.config.v1.yaml',
      'docs/agent-instructions/documentation-policy.v1.json',
      '.agent/runtime-initialization.v1.json',
    ]) {
      assert.equal(existsSync(path.join(project, absent)), false);
    }
    rmSync(sidecar);
    const initializeOnly = () =>
      runPinnedBun([path.join(root, 'bin/init.mjs'), ...initArgs(project)], {
        root,
        cwd: root,
        executable: bunExecutable,
      });
    assert.equal(initializeOnly(), 0);
    assert.equal(existsSync(path.join(root, 'node_modules/ajv')), true);
    const outputs = [
      'AGENTS.md',
      'AGENT.sidecar.md',
      'agent-runtime.config.v1.yaml',
      'docs/agent-instructions/documentation-policy.v1.json',
      '.agent/runtime-initialization.v1.json',
    ];
    const bytes = outputs.map((p) => readFileSync(path.join(project, p)).toString('base64'));
    assert.equal(initializeOnly(), 0);
    assert.deepEqual(
      outputs.map((p) => readFileSync(path.join(project, p)).toString('base64')),
      bytes,
    );
    assert.deepEqual(declarations(root), before);
  },
  300_000,
);
