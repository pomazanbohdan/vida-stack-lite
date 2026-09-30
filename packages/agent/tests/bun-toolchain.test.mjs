import assert from 'node:assert/strict';
import {
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
import { afterEach, test } from 'bun:test';
import { checkManifest, findNpmCli, pinnedEnvironment, readPin, runPinnedBun, syncPin } from '../bin/bun.mjs';

const temporaryRoots = new Set();
afterEach(() => {
  for (const root of temporaryRoots) rmSync(root, { recursive: true, force: true });
  temporaryRoots.clear();
});

function fixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'runtime-bun-pin-'));
  temporaryRoots.add(root);
  const pin = readPin();
  writeFileSync(path.join(root, '.bun-version'), `${pin}\n`);
  writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({
      name: 'fixture',
      packageManager: `bun@${pin}`,
      engines: { bun: pin, node: '24.x' },
      scripts: { test: 'unchanged' },
    }),
  );
  return { root, pin };
}

function success(stdout = '') {
  return { status: 0, signal: null, stdout };
}

test('one pin owns the checked package metadata', () => {
  assert.doesNotThrow(() => checkManifest(path.resolve(import.meta.dirname, '..'), readPin()));
});

test('explicit synchronization preserves other settings and is idempotent', () => {
  const { root } = fixture();
  const file = path.join(root, 'package.json');
  writeFileSync(path.join(root, '.bun-version'), '9.8.7\n');
  assert.throws(() => checkManifest(root, readPin(root)), /--sync-pin/);
  assert.equal(syncPin(root), true);
  const bytes = readFileSync(file, 'utf8');
  assert.deepEqual(JSON.parse(bytes), {
    name: 'fixture',
    packageManager: 'bun@9.8.7',
    engines: { bun: '9.8.7', node: '24.x' },
    scripts: { test: 'unchanged' },
  });
  assert.equal(syncPin(root), false);
  assert.equal(readFileSync(file, 'utf8'), bytes);
});

test('invalid pins fail before package resolution', () => {
  const { root } = fixture();
  for (const pin of ['latest', '^1.0.0', '1.0.0; echo unsafe', '1.0.0\n2.0.0']) {
    writeFileSync(path.join(root, '.bun-version'), pin);
    assert.throws(() => runPinnedBun([], { root, spawn: () => assert.fail('must not spawn') }), /exact stable/);
  }
});

test('verified absolute Bun replaces a conflicting global PATH and preserves arguments and status', () => {
  const { root, pin } = fixture();
  const executable = path.join(root, 'pinned binary', process.platform === 'win32' ? 'bun.exe' : 'bun');
  const calls = [];
  const pathKey = process.platform === 'win32' ? 'Path' : 'PATH';
  const env = { [pathKey]: path.join(root, 'wrong-global'), OTHER: 'preserved' };
  const args = ['run', 'test', '--', 'argument with spaces', '$(not a shell)'];
  const status = runPinnedBun(args, {
    root,
    cwd: root,
    env,
    node: '/node',
    npmCli: '/npm-cli.js',
    spawn(command, argv, options) {
      calls.push({ command, argv, options });
      return [success(executable), success(pin), { status: 17, signal: null }][calls.length - 1];
    },
  });
  assert.equal(status, 17);
  assert.equal(calls[0].command, '/node');
  assert.ok(calls[0].argv.includes(`bun@${pin}`));
  assert.equal(calls[1].command, executable);
  assert.equal(calls[2].command, executable);
  assert.deepEqual(calls[2].argv, args);
  assert.equal(calls[2].options.env[pathKey], `${path.dirname(executable)}${path.delimiter}${env[pathKey]}`);
  assert.equal(calls[2].options.env.OTHER, 'preserved');
  assert.equal(calls[2].options.env[pathKey === 'PATH' ? 'Path' : 'PATH'], undefined);
  assert.equal(calls[2].options.cwd, root);
  assert.ok(calls.every((call) => !call.options.shell));
});

test('local/global executable collision, malformed probe and install failure fail closed', () => {
  const { root } = fixture();
  const executable = path.join(root, 'collision-bun');
  for (const [responses, message] of [
    [[success(executable), success('0.0.0')], /requires/],
    [[success('relative-bun')], /absolute/],
    [[success(`${executable}\nextra-output`)], /absolute/],
    [[{ status: 23, signal: null }], /resolution/],
    [[{ status: null, error: new Error('timeout') }], /resolution/],
  ]) {
    let index = 0;
    assert.throws(
      () =>
        runPinnedBun(['test'], {
          root,
          npmCli: '/npm-cli.js',
          spawn: () => {
            assert.ok(index < responses.length, 'must not run command after failure');
            return responses[index++];
          },
        }),
      message,
    );
  }
});

test('reuses a supplied pinned executable, still verifies its version, and cleans up on command timeout', () => {
  const { root, pin } = fixture();
  const executable = path.join(root, 'resolved-bun');
  const calls = [];
  const cleaned = [];
  assert.throws(
    () =>
      runPinnedBun(['install', '--frozen-lockfile'], {
        root,
        executable,
        timeoutMs: 123,
        cleanup(pid) {
          cleaned.push(pid);
        },
        spawn(command, argv, options) {
          calls.push({ command, argv, options });
          if (calls.length === 1) return success(pin);
          return { status: null, signal: 'SIGKILL', error: { code: 'ETIMEDOUT' }, pid: 31337 };
        },
      }),
    /Pinned Bun command failed \(SIGKILL\)\. Timed out after 123 ms; process-tree cleanup was attempted\./,
  );
  assert.deepEqual(cleaned, [31337]);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].command, executable);
  assert.deepEqual(calls[0].argv, ['--version']);
  assert.equal(calls[1].options.timeout, 123);
  assert.equal(calls[1].options.detached, process.platform !== 'win32');
});

test('nested commands get one leading pinned directory even without PATH', () => {
  const executable = path.resolve('cache', 'bun');
  assert.equal(pinnedEnvironment(executable, {}).PATH, `${path.dirname(executable)}${path.delimiter}`);
});

test('Windows does not retain competing case variants of PATH', () => {
  if (process.platform !== 'win32') return;
  const executable = path.resolve('cache', 'bun.exe');
  const env = pinnedEnvironment(executable, { PATH: 'first', Path: 'second', path: 'third' });
  assert.deepEqual(
    Object.keys(env).filter((key) => key.toLowerCase() === 'path'),
    ['PATH'],
  );
  assert.equal(env.PATH, `${path.dirname(executable)}${path.delimiter}first`);
});

test('npm is resolved beside Node and ignores an injected npm_execpath', () => {
  const { root } = fixture();
  const node = path.join(root, 'node.exe');
  writeFileSync(node, 'fixture executable identity');
  const injected = path.join(root, 'npm-cli.js');
  writeFileSync(injected, 'throw new Error("must never execute");');
  const prior = process.env.npm_execpath;
  process.env.npm_execpath = injected;
  try {
    assert.throws(() => findNpmCli(node), /npm installed/);
    const standard = path.join(root, 'node_modules/npm/bin/npm-cli.js');
    mkdirSync(path.dirname(standard), { recursive: true });
    writeFileSync(standard, 'fixture standard npm');
    assert.equal(findNpmCli(node), standard);
  } finally {
    if (prior === undefined) delete process.env.npm_execpath;
    else process.env.npm_execpath = prior;
  }
});

test('sync replaces a hardlinked manifest without modifying the other file or leaving temporary files', () => {
  const { root } = fixture();
  const file = path.join(root, 'package.json');
  const alias = path.join(root, 'outside-manifest.json');
  linkSync(file, alias);
  const original = readFileSync(alias, 'utf8');
  writeFileSync(path.join(root, '.bun-version'), '9.8.7');
  assert.equal(syncPin(root), true);
  assert.equal(readFileSync(alias, 'utf8'), original);
  assert.equal(JSON.parse(readFileSync(file, 'utf8')).engines.bun, '9.8.7');
  assert.equal(
    readdirSync(root).some((name) => name.startsWith('.bun-pin-')),
    false,
  );
});

test('every public developer script enters the pinned bootstrap without recursion', () => {
  const manifest = JSON.parse(readFileSync(path.resolve(import.meta.dirname, '../package.json'), 'utf8'));
  const publicTasks = Object.keys(manifest.scripts).filter(
    (name) => !name.endsWith(':pinned') && name !== 'toolchain:sync',
  );
  for (const task of publicTasks) {
    assert.equal(manifest.scripts[task], `node bin/bun.mjs run ${task}:pinned`);
    assert.ok(manifest.scripts[`${task}:pinned`]);
    assert.equal(manifest.scripts[`${task}:pinned`].includes(`run ${task} `), false);
    for (const [, dependency] of manifest.scripts[`${task}:pinned`].matchAll(/\bbun run ([\w:-]+)/g)) {
      assert.ok(dependency.endsWith(':pinned'), `nested ${dependency} must retain pinned execution`);
      assert.ok(manifest.scripts[dependency], `nested ${dependency} must exist`);
    }
  }
});

test('non-regular pin fails before package resolution, including Windows junctions', () => {
  const { root } = fixture();
  const file = path.join(root, '.bun-version');
  rmSync(file);
  mkdirSync(file);
  assert.throws(() => runPinnedBun([], { root, spawn: () => assert.fail('must not spawn') }), /regular non-link/);
  rmSync(file, { recursive: true });
  const target = path.join(root, 'pin-target');
  if (process.platform === 'win32') mkdirSync(target);
  else writeFileSync(target, readPin());
  symlinkSync(target, file, process.platform === 'win32' ? 'junction' : 'file');
  assert.throws(() => runPinnedBun([], { root, spawn: () => assert.fail('must not spawn') }), /regular non-link/);
  assert.throws(() => syncPin(root), /regular non-link/);
});
