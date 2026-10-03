import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
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
import {
  boundedSpawnSync,
  checkManifest,
  executionBudget,
  commandOutcomeUnknown,
  requireTerminalCommand,
  findNpmCli,
  pinnedEnvironment,
  readPin,
  runPinnedBun,
  syncPin,
} from '../bin/bun.mjs';

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

test('npm-resolved version mismatch, malformed probe and install failure fail closed', () => {
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
          env: { PATH: path.join(root, 'no-PATH-bun') },
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

test('matching PATH Bun avoids npm resolution and preserves arguments and status', () => {
  const { root, pin } = fixture();
  const directory = path.join(root, 'PATH Bun with spaces');
  mkdirSync(directory);
  const executable = path.join(directory, process.platform === 'win32' ? 'bun.exe' : 'bun');
  writeFileSync(executable, 'fixture executable identity');
  const calls = [];
  const args = ['run', 'test', '--', 'argument with spaces', '$(not a shell)'];
  assert.equal(
    runPinnedBun(args, {
      root,
      env: { PATH: directory, PATHEXT: '.exe' },
      node: path.join(root, 'missing-node'),
      spawn(command, argv, options) {
        calls.push({ command, argv, options });
        return calls.length === 1 ? success(pin) : { status: 17, signal: null };
      },
    }),
    17,
  );
  assert.equal(calls.length, 2);
  assert.equal(calls[0].command, executable);
  assert.deepEqual(calls[0].argv, ['--version']);
  assert.equal(calls[1].command, executable);
  assert.deepEqual(calls[1].argv, args);
  assert.ok(calls.every((call) => !call.options.shell));
});

test('wrong-version PATH Bun falls back to npm exact pin and npm mismatch remains fatal', () => {
  const { root, pin } = fixture();
  const directory = path.join(root, 'wrong-global');
  mkdirSync(directory);
  const global = path.join(directory, process.platform === 'win32' ? 'bun.exe' : 'bun');
  writeFileSync(global, 'fixture global binary');
  const pinned = path.join(root, 'npm-pinned-bun');
  for (const npmVersion of [pin, '99.0.0']) {
    const calls = [];
    const run = () =>
      runPinnedBun(['test'], {
        root,
        env: { PATH: directory, PATHEXT: '.exe' },
        node: '/fixture-node',
        npmCli: '/npm-cli.js',
        spawn(command, argv, options) {
          calls.push({ command, argv, options });
          return [success('99.0.0'), success(pinned), success(npmVersion), { status: 0, signal: null }][
            calls.length - 1
          ];
        },
      });
    if (npmVersion === pin) assert.equal(run(), 0);
    else assert.throws(run, /requires/);
    assert.equal(calls[0].command, global);
    assert.equal(calls[1].command, '/fixture-node');
    assert.ok(calls[1].argv.includes(`bun@${pin}`));
    assert.equal(calls[2].command, pinned);
    assert.equal(calls.length, npmVersion === pin ? 4 : 3, 'never run command with an npm version mismatch');
  }
});

test('manifest mismatch fails before matching PATH Bun can be probed', () => {
  const { root, pin } = fixture();
  const directory = path.join(root, 'PATH Bun');
  mkdirSync(directory);
  writeFileSync(path.join(directory, process.platform === 'win32' ? 'bun.exe' : 'bun'), 'fixture binary');
  const manifest = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  manifest.engines.bun = '99.0.0';
  writeFileSync(path.join(root, 'package.json'), JSON.stringify(manifest));
  assert.throws(
    () =>
      runPinnedBun([], {
        root,
        env: { PATH: directory, PATHEXT: '.exe' },
        spawn: () => assert.fail('pin metadata must fail before spawn'),
      }),
    /manifest mirrors differ/,
  );
  assert.notEqual(manifest.engines.bun, pin);
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
    /Pinned Bun command failed \(SIGKILL\)\. Timed out after \d+ ms; process-tree cleanup was attempted\./,
  );
  assert.deepEqual(cleaned, [31337]);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].command, executable);
  assert.deepEqual(calls[0].argv, ['--version']);
  assert.ok(calls[1].options.timeout > 0 && calls[1].options.timeout <= 123);
  assert.equal(calls[1].options.detached, process.platform !== 'win32');
});

test('nested commands get one leading pinned directory even without PATH', () => {
  const executable = path.resolve('cache', 'bun');
  assert.equal(pinnedEnvironment(executable, {}).PATH, `${path.dirname(executable)}${path.delimiter}`);
});

test('nested child allowances spend one deadline and fail before an exhausted launch', () => {
  const parent = executionBudget(5_000, 100);
  const child = parent.child(20_000, 100);
  let options;
  boundedSpawnSync(
    (command, args, actual) => {
      options = actual;
      return { status: 0 };
    },
    'fixture',
    [],
    { budget: child, timeout: 20_000 },
    'budget fixture',
  );
  assert.ok(options.timeout > 0 && options.timeout <= 4_800);
  assert.equal(options.env.VIDA_PINNED_COMMAND_BUDGET_MS, String(options.timeout));
  assert.equal(Object.hasOwn(options, 'budget'), false);
  const spent = executionBudget(5_000, 0, performance.now() - 1);
  assert.throws(
    () =>
      boundedSpawnSync(() => assert.fail('expired budget spawned'), 'fixture', [], { budget: spent }, 'spent fixture'),
    /budget exhausted/,
  );
  assert.throws(() => parent.remaining(NaN), /positive integer/);
  assert.throws(() => executionBudget(0), /bounded integer/);
});

test('unlimited phase and launcher preserve finite children without synthesizing a command deadline', () => {
  const { root, pin } = fixture();
  const moduleUrl = new URL('../bin/bun.mjs', import.meta.url).href;
  const program = `import assert from 'node:assert/strict';
    const { executionBudget, boundedSpawnSync, runPinnedBun } = await import(${JSON.stringify(moduleUrl)});
    const phase = executionBudget();
    assert.equal(phase.deadline, Infinity);
    for (const timeout of [undefined, Infinity]) {
      const result = boundedSpawnSync((command, args, options) => {
        assert.equal(Object.hasOwn(options, 'timeout'), false);
        assert.equal(options.env.VIDA_PINNED_COMMAND_BUDGET_MS, undefined);
        assert.equal(options.env.VIDA_PINNED_COMMAND_DEADLINE_MS, undefined);
        return { status: 0 };
      }, 'fixture', [], { env: {}, timeout, budget: phase }, 'unlimited');
      assert.equal(result.status, 0);
      let calls = 0;
      assert.equal(runPinnedBun([], { root: ${JSON.stringify(root)}, executable: process.execPath,
        env: {}, timeoutMs: timeout, spawn(command, args, options) {
          calls++;
          if (calls === 1) return { status: 0, stdout: ${JSON.stringify(pin)} };
          assert.equal(Object.hasOwn(options, 'timeout'), false);
          assert.equal(options.env.VIDA_PINNED_COMMAND_BUDGET_MS, undefined);
          assert.equal(options.env.VIDA_PINNED_COMMAND_DEADLINE_MS, undefined);
          return { status: 17 };
        } }), 17);
      assert.equal(calls, 2);
    }
    boundedSpawnSync((command, args, options) => {
      assert.ok(options.timeout > 0 && options.timeout <= 5000);
      assert.equal(options.env.VIDA_PINNED_COMMAND_BUDGET_MS, String(options.timeout));
      return { status: 0 };
    }, 'fixture', [], { env: {}, budget: phase.child(5000, 100) }, 'finite child');
    console.log('unlimited-with-finite-children');`;
  const result = spawnSync(process.execPath, ['-e', program], {
    encoding: 'utf8',
    windowsHide: true,
    timeout: 5000,
    env: { ...process.env, VIDA_PINNED_COMMAND_BUDGET_MS: undefined, VIDA_PINNED_COMMAND_DEADLINE_MS: undefined },
  });
  assert.equal(commandOutcomeUnknown(result), false, result.stderr);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'unlimited-with-finite-children');
});

test('malformed optional command durations reject before any spawn or version probe', () => {
  const { root } = fixture();
  for (const duration of [null, NaN, -1, -Infinity, 0, 1.5]) {
    const spawn = () => assert.fail('malformed duration launched a child');
    assert.throws(() => executionBudget(duration), /bounded integer/);
    assert.throws(() => boundedSpawnSync(spawn, 'fixture', [], { timeout: duration }, 'invalid'), /positive integer/);
    assert.throws(
      () => runPinnedBun([], { root, executable: process.execPath, timeoutMs: duration, spawn }),
      /bounded integer/,
    );
  }
});

test('custom child environment cannot erase an inherited finite or expired host deadline', () => {
  const moduleUrl = new URL('../bin/bun.mjs', import.meta.url).href;
  for (const spent of [false, true]) {
    const program = `import assert from 'node:assert/strict';
      const { boundedSpawnSync } = await import(${JSON.stringify(moduleUrl)});
      const launch = () => boundedSpawnSync((command, args, options) => {
        assert.equal(${spent}, false, 'expired host deadline launched');
        assert.ok(options.timeout > 0 && options.timeout <= 5000);
        assert.equal(options.env.VIDA_PINNED_COMMAND_BUDGET_MS, String(options.timeout));
        assert.ok(Number(options.env.VIDA_PINNED_COMMAND_DEADLINE_MS) <= Number(process.env.VIDA_PINNED_COMMAND_DEADLINE_MS));
        return { status: 0 };
      }, 'fixture', [], { env: {}, timeout: Infinity }, 'custom environment');
      if (${spent}) assert.throws(launch, /budget exhausted/); else assert.equal(launch().status, 0);
      console.log('host-deadline-preserved');`;
    const result = spawnSync(process.execPath, ['-e', program], {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 5000,
      env: {
        ...process.env,
        VIDA_PINNED_COMMAND_BUDGET_MS: '5000',
        VIDA_PINNED_COMMAND_DEADLINE_MS: String(Date.now() + (spent ? -1 : 5000)),
      },
    });
    assert.equal(commandOutcomeUnknown(result), false, result.stderr);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), 'host-deadline-preserved');
  }
});

test('timeout cleanup preserves successful, failed and unknown command observations', () => {
  const observations = [
    [{ status: 0 }, 'command_succeeded'],
    [{ status: 1 }, 'failed'],
    [{ status: null, error: { code: 'ETIMEDOUT' } }, 'failed'],
    [undefined, 'unknown'],
  ];
  for (const [observation, expected] of observations) {
    const result = boundedSpawnSync(
      () => ({ status: null, pid: 31337, error: { code: 'ETIMEDOUT' } }),
      'fixture',
      [],
      { budget: executionBudget(1_000, 100), timeout: 100 },
      'cleanup fixture',
      (pid, remaining) => {
        assert.equal(pid, 31337);
        assert.ok(remaining > 0 && remaining <= 1_000);
        return observation;
      },
    );
    assert.equal(result.timedOut, true);
    assert.equal(result.cleanupAttempted, true);
    assert.equal(result.cleanupOutcome, expected);
    assert.notEqual(result.status, 0);
  }
  const thrown = boundedSpawnSync(
    () => ({ status: null, pid: 31337, error: { code: 'ETIMEDOUT' } }),
    'fixture',
    [],
    { timeout: 100 },
    'cleanup throw fixture',
    () => {
      throw Object.assign(new Error('denied'), { code: 'EACCES' });
    },
  );
  assert.equal(thrown.cleanupAttempted, true);
  assert.equal(thrown.cleanupOutcome, 'failed');
  assert.equal(thrown.cleanupErrorCode, 'EACCES');
});

test('cleanup keeps the report half of a case reserve and skips a spent allowance', () => {
  const reserved = executionBudget(5_000, 1_000);
  assert.ok(reserved.cleanupTimeout() > 0 && reserved.cleanupTimeout() <= 500);
  boundedSpawnSync(
    () => ({ status: null, pid: 31337, error: { code: 'ETIMEDOUT' } }),
    'fixture',
    [],
    { budget: reserved, timeout: 10 },
    'short child cleanup fixture',
    (pid, allowance) => {
      assert.equal(pid, 31337);
      assert.ok(allowance > 0 && allowance <= 500);
      return { status: 0 };
    },
  );
  const unpartitioned = executionBudget(1_000, 0).cleanupTimeout();
  assert.ok(unpartitioned > 0 && unpartitioned <= 1_000);
  const budget = executionBudget(150, 100);
  const result = boundedSpawnSync(
    () => {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 110);
      return { status: 0, pid: 31337, error: { code: 'ETIMEDOUT' } };
    },
    'fixture',
    [],
    { budget, timeout: 10 },
    'spent cleanup fixture',
    () => assert.fail('spent cleanup consumed the report reserve'),
  );
  assert.equal(result.cleanupTimeoutMs, 0);
  assert.equal(result.cleanupAttempted, false);
  assert.equal(result.cleanupOutcome, 'unknown');
  assert.ok(result.childElapsedMs >= 100);
  assert.ok(result.elapsedMs >= result.childElapsedMs);
  assert.equal(commandOutcomeUnknown(result), true);
  assert.throws(() => requireTerminalCommand(result, 'spent cleanup fixture'), /uncertain command outcome/);
});

test('an uncertain timed-out PATH probe cannot start an npm resolution retry', () => {
  const { root } = fixture();
  const directory = path.join(root, 'PATH Bun');
  mkdirSync(directory);
  writeFileSync(path.join(directory, process.platform === 'win32' ? 'bun.exe' : 'bun'), 'fixture');
  let calls = 0;
  assert.throws(
    () =>
      runPinnedBun([], {
        root,
        env: { PATH: directory, PATHEXT: '.exe' },
        cleanup: () => ({ status: 1 }),
        spawn: () => {
          calls++;
          return { pid: 31337, status: null, error: { code: 'ETIMEDOUT' } };
        },
      }),
    /Cleanup outcome: failed/,
  );
  assert.equal(calls, 1);
});

test('forwarded duration cannot reset an expired earlier shell stage', () => {
  const moduleUrl = new URL('../bin/bun.mjs', import.meta.url).href;
  const program = `const { boundedSpawnSync, executionBudget } = await import(${JSON.stringify(moduleUrl)});
    try { boundedSpawnSync(() => { throw new Error('unexpected child effect'); }, 'fixture', [],
      { budget: executionBudget(5000) }, 'forwarded stage'); process.exit(1); }
    catch (error) { if (!error.message.includes('budget exhausted')) throw error; console.log('spent'); }`;
  const result = spawnSync(process.execPath, ['-e', program], {
    encoding: 'utf8',
    windowsHide: true,
    timeout: 5_000,
    env: {
      ...process.env,
      VIDA_PINNED_COMMAND_BUDGET_MS: '5000',
      VIDA_PINNED_COMMAND_DEADLINE_MS: String(Date.now() - 1),
    },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'spent');
  let launched = false;
  assert.throws(
    () =>
      boundedSpawnSync(
        () => {
          launched = true;
        },
        'fixture',
        [],
        {
          env: { VIDA_PINNED_COMMAND_BUDGET_MS: 'not-a-duration' },
        },
        'malformed stage',
      ),
    /Invalid inherited/,
  );
  assert.equal(launched, false);
});

test('npm native executable alias supplies bun to nested shells without selecting another binary', () => {
  const { root } = fixture();
  const binaryDirectory = path.join(root, 'node_modules/bun/bin');
  const commandDirectory = path.join(root, 'node_modules/.bin');
  mkdirSync(binaryDirectory, { recursive: true });
  const executable = path.join(binaryDirectory, 'bun.exe');
  const command = path.join(commandDirectory, process.platform === 'win32' ? 'bun.exe' : 'bun');
  writeFileSync(executable, 'verified executable fixture');
  if (process.platform === 'win32') {
    symlinkSync(binaryDirectory, commandDirectory, 'junction');
  } else {
    mkdirSync(commandDirectory);
    symlinkSync(executable, command);
  }
  assert.equal(
    pinnedEnvironment(executable, { PATH: 'other-tools' }, root).PATH,
    `${commandDirectory}${path.delimiter}other-tools`,
  );

  if (process.platform === 'win32') {
    rmSync(commandDirectory, { recursive: true });
    const differentDirectory = path.join(root, 'other-package/bin');
    mkdirSync(differentDirectory, { recursive: true });
    writeFileSync(path.join(differentDirectory, 'bun.exe'), 'different executable');
    symlinkSync(differentDirectory, commandDirectory, 'junction');
  } else {
    rmSync(command);
    const different = path.join(binaryDirectory, 'different.exe');
    writeFileSync(different, 'different executable');
    symlinkSync(different, command);
  }
  assert.equal(
    pinnedEnvironment(executable, { PATH: 'other-tools' }, root).PATH,
    `${binaryDirectory}${path.delimiter}other-tools`,
  );
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
    assert.equal(
      manifest.scripts[task],
      task === 'test'
        ? 'node bin/bun.mjs run test:pinned && node bin/bun.mjs run test:repair:pinned && node bin/bun.mjs run test:host-state:pinned && node bin/bun.mjs run test:package-boundary:pinned && node bin/bun.mjs run test:run-entrypoint:pinned'
        : `node bin/bun.mjs run ${task}:pinned`,
    );
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

test('actual uncertain child output is rejected before parsing while completed failure remains a protocol result', () => {
  const budget = executionBudget(10_000, 1_000);
  const script = "process.stdout.write('{partial'); Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0);";
  const timedOut = boundedSpawnSync(
    spawnSync,
    process.execPath,
    ['-e', script],
    {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 1_000,
      budget,
    },
    'actual incomplete child',
  );
  assert.equal(timedOut.timedOut, true);
  assert.equal(commandOutcomeUnknown(timedOut), true);
  assert.match(timedOut.stdout, /partial/);
  assert.throws(
    () => JSON.parse(requireTerminalCommand(timedOut, 'actual incomplete child').stdout),
    /uncertain command outcome.*timed_out.*true/,
  );
  const signaled = boundedSpawnSync(
    spawnSync,
    process.execPath,
    ['-e', "process.kill(process.pid,'SIGTERM')"],
    {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 2_000,
      budget,
    },
    'actual signaled child',
  );
  if (signaled.signal) {
    assert.equal(commandOutcomeUnknown(signaled), true);
    assert.throws(() => requireTerminalCommand(signaled, 'actual signaled child'), /uncertain command outcome/);
  } else {
    // Windows may expose emulated SIGTERM as an integer exit, not a signal.
    // Do not invent a signal observation from that completed nonzero status.
    assert.equal(process.platform, 'win32');
    assert.notEqual(signaled.status, 0);
    assert.equal(commandOutcomeUnknown(signaled), false);
  }
  assert.throws(
    () => requireTerminalCommand({ status: 0, signal: 'SIGTERM' }, 'observed signal contract'),
    /uncertain command outcome/,
  );
  const missing = boundedSpawnSync(
    spawnSync,
    'vida-nonexistent-command-for-terminal-proof',
    [],
    {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 2_000,
      budget,
    },
    'actual spawn error',
  );
  assert.equal(missing.error.code, 'ENOENT');
  assert.equal(commandOutcomeUnknown(missing), true);
  assert.throws(() => requireTerminalCommand(missing, 'actual spawn error'), /ENOENT/);
  const completed = boundedSpawnSync(
    spawnSync,
    process.execPath,
    ['-e', "process.stderr.write(JSON.stringify({status:'expected_denial'}));process.exit(1)"],
    {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 2_000,
      budget,
    },
    'actual completed denial',
  );
  assert.equal(commandOutcomeUnknown(completed), false);
  assert.equal(requireTerminalCommand(completed, 'actual completed denial').status, 1);
  assert.deepEqual(JSON.parse(completed.stderr), { status: 'expected_denial' });
  assert.equal(commandOutcomeUnknown({ status: null }), true);
}, 10_000);

test('ordinary pinned phases preserve the complete disjoint test inventory and one build', () => {
  const { scripts } = JSON.parse(readFileSync(path.resolve(import.meta.dirname, '../package.json'), 'utf8'));
  const phases = [
    'test:pinned',
    'test:repair:pinned',
    'test:host-state:pinned',
    'test:package-boundary:pinned',
    'test:run-entrypoint:pinned',
  ];
  const expected = [
    'tests/admitted-development-packet.test.mjs',
    'tests/admitted-synthesis-projection.test.mjs',
    'tests/bun-cache-routing.test.mjs',
    'tests/bun/host-state.test.mjs',
    'tests/bun/lifecycle-state.test.mjs',
    'tests/bun/persistent-session-handoff.test.mjs',
    'tests/bun/runtime-initialization.test.mjs',
    'tests/cedar-validation.test.mjs',
    'tests/completed-readonly-capture.test.mjs',
    'tests/documentation-policy-transition.test.mjs',
    'tests/forward-candidate-admission.test.mjs',
    'tests/forward-candidate-authority.test.mjs',
    'tests/initialization.test.mjs',
    'tests/install.test.mjs',
    'tests/interrupted-source-retirement.test.mjs',
    'tests/observed-research-result.test.mjs',
    'tests/observed-testing.test.mjs',
    'tests/package-boundary.test.mjs',
    'tests/paused-replacement-entrypoint.test.mjs',
    'tests/portable-instructions.test.mjs',
    'tests/property.test.mjs',
    'tests/read-only-dispatch-repair.test.mjs',
    'tests/reconcile-readonly-dispatch.test.mjs',
    'tests/repair-cli-behavior.test.mjs',
    'tests/research-source-catalog.test.mjs',
    'tests/run-entrypoint.test.mjs',
    'tests/runtime-config-rebind.test.mjs',
    'tests/runtime-config-repair-boundary.test.mjs',
    'tests/runtime-config-yaml.test.mjs',
    'tests/runtime-timing-output.test.mjs',
    'tests/session-handoff.test.mjs',
    'tests/smoke.test.mjs',
  ];
  const actual = phases.flatMap((phase) =>
    [...scripts[phase].matchAll(/tests\/[\w/-]+\.test\.mjs/g)].map(([file]) => file),
  );
  assert.equal(
    scripts['test:package-boundary:pinned'].split(' --test-name-pattern ')[1],
    scripts['test:pinned'].split(' --test-name-pattern ')[1],
  );
  assert.equal(new Set(actual).size, actual.length, 'ordinary phases must not duplicate tests');
  assert.deepEqual(actual.sort(), expected);
  assert.equal(
    phases.reduce((count, phase) => count + [...scripts[phase].matchAll(/run build:pinned/g)].length, 0),
    1,
  );
  assert.equal(scripts.test, phases.map((phase) => 'node bin/bun.mjs run ' + phase).join(' && '));
  assert.ok(scripts['ci:candidate:pinned'].includes(phases.map((phase) => 'bun run ' + phase).join(' && ')));
});

test('candidate qualification reuses one Source build and preserves every remaining phase and archive exception', () => {
  const { scripts } = JSON.parse(readFileSync(path.resolve(import.meta.dirname, '../package.json'), 'utf8'));
  const dependencies = (task) => [...scripts[task].matchAll(/\bbun run ([\w:-]+)/g)].map(([, name]) => name);
  function buildCount(task, parents = []) {
    assert.equal(parents.includes(task), false, 'candidate script graph must be acyclic');
    assert.equal(typeof scripts[task], 'string', 'candidate dependency must exist: ' + task);
    return (
      (task === 'build:pinned' ? 1 : 0) +
      dependencies(task).reduce((count, child) => count + buildCount(child, [...parents, task]), 0)
    );
  }
  assert.equal(buildCount('ci:candidate:pinned'), 1, 'candidate must build Source once');
  assert.deepEqual(dependencies('ci:candidate:pinned'), [
    'test:toolchain:pinned',
    'preflight:pinned',
    'typecheck:pinned',
    'test:pinned',
    'test:repair:pinned',
    'test:host-state:pinned',
    'test:package-boundary:pinned',
    'test:run-entrypoint:pinned',
    'test:pack:built:pinned',
    'test:fuzz:built:pinned',
    'test:zombies:built:pinned',
    'test:deep:built:pinned',
    'quality:static:pinned',
    'test:coverage:built:pinned',
    'coverage:gate:pinned',
    'crap:pinned',
    'format:check:pinned',
  ]);
  for (const task of ['fuzz', 'zombies', 'deep', 'coverage']) {
    const standalone = scripts[`test:${task}:pinned`];
    assert.ok(standalone.startsWith('bun run build:pinned && '));
    assert.equal(scripts[`test:${task}:built:pinned`], standalone.slice('bun run build:pinned && '.length));
  }
  const archiveCase = 'package archive is the complete portable vida-agent bundle with a clean production surface';
  assert.equal(
    scripts['test:pack:built:pinned'],
    `bun test tests/runtime-config-yaml.test.mjs --test-name-pattern "^${archiveCase}$"`,
  );
  assert.ok(scripts['test:pinned'].includes(`^(?!${archiveCase}$)`), 'archive case stays separate from main tests');
  assert.ok(scripts['test:pack:pinned'].startsWith('bun run build:pinned && '), 'standalone pack retains its build');
  assert.equal(scripts['ci:candidate:pinned'].includes('test:mutation'), false);
});
