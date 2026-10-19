import assert from 'node:assert/strict';
import { spawn, spawnSync, type SpawnSyncOptions } from 'node:child_process';
import {
  linkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import * as fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, spyOn, test } from 'bun:test';
import { expectReturned } from './helpers/expect-rejection.ts';
import {
  boundedSpawnSync,
  checkManifest,
  executionBudget,
  commandOutcomeUnknown,
  requireTerminalCommand,
  findNpmCli,
  pinnedEnvironment,
  readPin,
  resolvePinnedBun,
  runPinnedBun,
  standaloneEnvironment,
  standaloneRuntime,
  syncPin,
} from '../bin/bun.ts';
import { coverageReviewEnvironmentSha256, coverageEnvironmentSha256 } from '../tooling/bun-coverage-evidence.ts';

interface CommandResult {
  status: number | null;
  signal?: NodeJS.Signals | null;
  stdout?: string | Buffer | null;
  stderr?: string | Buffer | null;
  pid?: number;
  error?: NodeJS.ErrnoException;
}

interface LauncherSpawnOptions extends SpawnSyncOptions {
  detached?: boolean;
}

interface LauncherCall {
  command: string;
  argv: readonly string[];
  options: LauncherSpawnOptions;
}

interface PackageManifest {
  name: string;
  packageManager: string;
  engines: { bun: string; node?: string };
  scripts: Record<string, string>;
}

function invokeRuntimeArguments(target: (...args: never[]) => unknown, args: readonly unknown[]): unknown {
  return Reflect.apply(target, undefined, args);
}

function systemError(code: string, message = code): NodeJS.ErrnoException {
  return Object.assign(new Error(message), { code });
}

const temporaryRoots = new Set<string>();
afterEach(() => {
  for (const root of temporaryRoots) rmSync(root, { recursive: true, force: true });
  temporaryRoots.clear();
});

function fixture(): { root: string; pin: string } {
  const root = mkdtempSync(path.join(os.tmpdir(), 'runtime-bun-pin-'));
  temporaryRoots.add(root);
  const pin = expectReturned(() => readPin());
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

function success(stdout = ''): CommandResult {
  return { status: 0, signal: null, stdout };
}

function assertVersionProbe(call: LauncherCall | undefined, root: string, env: NodeJS.ProcessEnv): void {
  assert.ok(call);
  assert.deepEqual(call.argv, ['--version']);
  assert.equal(call.options.cwd, root);
  assert.equal(call.options.encoding, 'utf8');
  assert.equal(call.options.windowsHide, true);
  const timeout = call.options.timeout;
  assert.ok(Number.isSafeInteger(timeout) && timeout! > 0 && timeout! <= 30_000);
  for (const [key, value] of Object.entries(env)) assert.equal(call.options.env?.[key], value);
}

test('one pin owns the checked package metadata', () => {
  const pin = expectReturned(() => readPin());
  assert.match(pin, /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
  assert.equal(Bun.version, pin, 'toolchain tests must run under the selected pinned Bun');
  assert.doesNotThrow(() => checkManifest(path.resolve(import.meta.dirname, '..'), pin));
});

test('direct CLI entrypoint handles idempotent pin sync and an expired launch deadline', () => {
  const root = path.resolve(import.meta.dirname, '..');
  const entry = path.join(root, 'bin/bun.ts');
  const manifest = path.join(root, 'package.json');
  const before = readFileSync(manifest, 'utf8');
  assert.doesNotThrow(() => checkManifest(root, readPin(root)));

  const sync = spawnSync(process.execPath, [entry, '--sync-pin'], {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
    timeout: 5_000,
  });
  assert.equal(sync.error, undefined);
  assert.equal(sync.signal, null);
  assert.equal(sync.status, 0, sync.stderr);
  assert.equal(sync.stdout.trim(), 'Bun manifest mirrors already current.');
  assert.equal(readFileSync(manifest, 'utf8'), before, 'the idempotent CLI branch must preserve Source bytes');

  const expired = spawnSync(process.execPath, [entry, '--version'], {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
    timeout: 5_000,
    env: { ...process.env, VIDA_PINNED_COMMAND_DEADLINE_MS: String(Date.now() - 1_000) },
  });
  assert.equal(expired.error, undefined);
  assert.equal(expired.signal, null);
  assert.equal(expired.status, 1);
  assert.match(expired.stderr, /Execution budget exhausted before child launch/);
  assert.equal(expired.stdout, '');
  assert.equal(readFileSync(manifest, 'utf8'), before, 'the rejected CLI launch must preserve Source bytes');
});

test('embedded runtime markers select one package root and strip loader options before wrapper dispatch', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'runtime-bun-embedded-'));
  temporaryRoots.add(root);
  const pin = expectReturned(() => readPin());
  writeFileSync(path.join(root, '.bun-version'), `${pin}\n`);
  writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({ name: 'vida-agent', packageManager: `bun@${pin}`, engines: { bun: pin } }),
  );
  const env: NodeJS.ProcessEnv = {
    PATH: 'caller-path',
    NODE_OPTIONS: '--require caller-loader',
    bUn_OpTiOnS: '--preload caller-loader',
    BUN_BE_BUN: '1',
    VIDA_STANDALONE_ROOT: root,
    VIDA_STANDALONE_EXECUTABLE: process.execPath,
    FIXTURE_VALUE: 'retained',
  };
  const before = { ...env };
  const selected = expectReturned(() => standaloneRuntime(env));
  assert.deepEqual(selected, { root, executable: realpathSync(process.execPath) });

  const childCalls: LauncherCall[] = [];
  const exit = expectReturned(() =>
    runPinnedBun(['--version'], {
      env,
      spawn(command, argv, options) {
        childCalls.push({ command, argv, options });
        return { status: 23, signal: null };
      },
    }),
  );

  assert.equal(exit, 23);
  assert.equal(childCalls.length, 1, 'embedded dispatch must not probe PATH, Node, npm, or another runtime');
  const child = childCalls[0];
  assert.ok(child);
  assert.equal(child.command, realpathSync(process.execPath));
  assert.deepEqual(child.argv, [
    '--no-env-file',
    '--no-install',
    '--config=' + path.join(root, 'bunfig.toml'),
    '--version',
  ]);
  assert.equal(child.options.env?.NODE_OPTIONS, undefined);
  assert.equal(child.options.env?.bUn_OpTiOnS, undefined);
  assert.equal(child.options.env?.BUN_BE_BUN, '1');
  assert.equal(child.options.env?.FIXTURE_VALUE, 'retained');
  assert.deepEqual(env, before, 'loader removal must not mutate the caller environment');
  const clean = expectReturned(() => standaloneEnvironment(env));
  assert.equal(clean.NODE_OPTIONS, undefined);
  assert.equal(clean.bUn_OpTiOnS, undefined);
  assert.equal(clean.BUN_BE_BUN, '1');
  assert.equal(clean.FIXTURE_VALUE, 'retained');
});

test('embedded runtime rejects partial or mismatched selectors before spawning', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'runtime-bun-embedded-invalid-'));
  temporaryRoots.add(root);
  const pin = expectReturned(() => readPin());
  writeFileSync(path.join(root, '.bun-version'), `${pin}\n`);
  writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({ name: 'vida-agent', packageManager: `bun@${pin}`, engines: { bun: pin } }),
  );
  const differentExecutable = path.join(root, 'other-bun');
  writeFileSync(differentExecutable, 'different executable identity');
  const valid: NodeJS.ProcessEnv = {
    BUN_BE_BUN: '1',
    VIDA_STANDALONE_ROOT: root,
    VIDA_STANDALONE_EXECUTABLE: process.execPath,
  };
  const invalid: Array<[string, NodeJS.ProcessEnv]> = [
    ['missing runtime flag', { ...valid, BUN_BE_BUN: '0' }],
    ['noncanonical root', { ...valid, VIDA_STANDALONE_ROOT: root + path.sep + '..' + path.sep + path.basename(root) }],
    ['different executable', { ...valid, VIDA_STANDALONE_EXECUTABLE: differentExecutable }],
    ['partial markers', { BUN_BE_BUN: '1', VIDA_STANDALONE_ROOT: root }],
  ];
  for (const [label, env] of invalid) {
    assert.throws(
      () =>
        runPinnedBun([], {
          env,
          spawn: () => assert.fail(`${label} must fail before a child launch`),
        }),
      /Embedded runtime markers do not match/,
      label,
    );
  }
  writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({ name: 'another-package', packageManager: `bun@${pin}`, engines: { bun: pin } }),
  );
  assert.throws(
    () =>
      runPinnedBun([], {
        env: valid,
        spawn: () => assert.fail('foreign embedded package identity must fail before a child launch'),
      }),
    /Embedded package identity differs/,
  );
  writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({ name: 'vida-agent', packageManager: `bun@${pin}`, engines: { bun: pin } }),
  );

  const otherRoot = mkdtempSync(path.join(os.tmpdir(), 'runtime-bun-other-root-'));
  temporaryRoots.add(otherRoot);
  assert.throws(() => resolvePinnedBun({ env: valid, root: otherRoot }), /Embedded runtime package root differs/);
  assert.throws(
    () => resolvePinnedBun({ env: valid, executable: differentExecutable }),
    /Embedded runtime executable differs/,
  );

  writeFileSync(path.join(root, '.bun-version'), '99.0.0\n');
  writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({ name: 'vida-agent', packageManager: 'bun@99.0.0', engines: { bun: '99.0.0' } }),
  );
  assert.throws(() => standaloneRuntime(valid), /Embedded runtime pin differs/);
});

test('explicit synchronization preserves other settings and is idempotent', () => {
  const { root } = fixture();
  const file = path.join(root, 'package.json');
  writeFileSync(path.join(root, '.bun-version'), '9.8.7\n');
  const changedPin = expectReturned(() => readPin(root));
  assert.throws(() => checkManifest(root, changedPin), {
    message: 'Bun manifest mirrors differ from .bun-version; run bun bin/bun.ts --sync-pin from packages/agent.',
  });
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

test('sync rejects a non-regular package manifest before creating replacement state', () => {
  const { root } = fixture();
  const file = path.join(root, 'package.json');
  rmSync(file);
  mkdirSync(file);

  assert.throws(() => syncPin(root), { message: 'Bun manifest must be a regular file.' });
  assert.deepEqual(readdirSync(root).sort(), ['.bun-version', 'package.json']);
  assert.deepEqual(readdirSync(file), [], 'the rejected manifest directory remains untouched');
});

test('sync closes its staged descriptor and removes the stage when fsync fails', () => {
  const { root } = fixture();
  const manifestPath = path.join(root, 'package.json');
  const originalManifest = readFileSync(manifestPath, 'utf8');
  writeFileSync(path.join(root, '.bun-version'), '9.8.7\n');
  const failure = new Error('injected fsync failure');
  let descriptor: number | undefined;
  const sync = spyOn(fs, 'fsyncSync').mockImplementation((openedDescriptor) => {
    descriptor = openedDescriptor;
    assert.equal(fs.fstatSync(openedDescriptor).isFile(), true, 'the real staged descriptor is open');
    const stagedName = readdirSync(root).find((name) => name.startsWith('.bun-pin-'));
    assert.ok(stagedName, 'the staged manifest exists while its descriptor is open');
    const stagedPath = path.join(root, stagedName);
    assert.equal(
      (JSON.parse(readFileSync(stagedPath, 'utf8')) as PackageManifest).packageManager,
      'bun@9.8.7',
      'the real staged bytes contain the intended pin before fsync fails',
    );
    throw failure;
  });

  try {
    assert.throws(
      () => syncPin(root),
      (error) => error === failure,
    );
  } finally {
    sync.mockRestore();
  }

  assert.equal(readFileSync(manifestPath, 'utf8'), originalManifest, 'the published manifest remains unchanged');
  assert.deepEqual(readdirSync(root).sort(), ['.bun-version', 'package.json'], 'the stage was removed');
  const closedDescriptor = descriptor;
  assert.ok(closedDescriptor !== undefined, 'syncPin acquired the real stage descriptor');
  assert.throws(() => fs.fstatSync(closedDescriptor), { code: 'EBADF' }, 'finally closed the staged descriptor');
});

test('sync rejects a changed manifest identity after staging and removes the stage', () => {
  const { root } = fixture();
  const manifestPath = path.join(root, 'package.json');
  const originalManifest = readFileSync(manifestPath, 'utf8');
  writeFileSync(path.join(root, '.bun-version'), '9.8.7\n');
  const originalLstat = fs.lstatSync;
  let manifestStats = 0;
  const stat = spyOn(fs, 'lstatSync').mockImplementation(((...args: Parameters<typeof fs.lstatSync>) => {
    const observed = originalLstat(...args);
    if (observed === undefined) return observed;
    if (String(args[0]) !== manifestPath || ++manifestStats !== 2) return observed;

    const stagedName = readdirSync(root).find((name) => name.startsWith('.bun-pin-'));
    assert.ok(stagedName, 'the real staged file exists at final identity revalidation');
    assert.equal(
      (JSON.parse(readFileSync(path.join(root, stagedName), 'utf8')) as PackageManifest).packageManager,
      'bun@9.8.7',
    );
    const changedIdentity = Object.create(observed) as typeof observed;
    const changedInode = typeof observed.ino === 'bigint' ? observed.ino + 1n : observed.ino + 1;
    Reflect.set(changedIdentity, 'ino', changedInode);
    return changedIdentity;
  }) as typeof fs.lstatSync);

  try {
    assert.throws(() => syncPin(root), {
      message: 'Bun pin or manifest changed during synchronization; retry against the current files.',
    });
  } finally {
    stat.mockRestore();
  }

  assert.equal(manifestStats, 2, 'the changed identity was injected only at final revalidation');
  assert.equal(readFileSync(manifestPath, 'utf8'), originalManifest, 'syncPin did not replace the manifest');
  assert.deepEqual(readdirSync(root).sort(), ['.bun-version', 'package.json'], 'the staged file was removed');
});

test('sync rejects a symlink manifest without changing its target', () => {
  if (process.platform !== 'linux') return;
  const { root, pin } = fixture();
  const manifest = path.join(root, 'package.json');
  const target = path.join(root, 'retained-manifest.json');
  const original = readFileSync(manifest, 'utf8');
  writeFileSync(target, original);
  rmSync(manifest);
  symlinkSync(target, manifest, 'file');

  assert.throws(() => syncPin(root), /Bun manifest must be a regular file/);
  assert.equal(readPin(root), pin);
  assert.equal(readFileSync(target, 'utf8'), original);
  assert.deepEqual(readdirSync(root).sort(), ['.bun-version', 'package.json', 'retained-manifest.json']);
});

test('Linux sync rejects a package root reached through a real directory symlink', () => {
  if (process.platform !== 'linux') return;
  const { root, pin } = fixture();
  let passed = false;
  try {
    const realParent = path.join(root, 'real-parent');
    const packageRoot = path.join(realParent, 'package-root');
    mkdirSync(packageRoot, { recursive: true });
    writeFileSync(path.join(packageRoot, '.bun-version'), `${pin}\n`);
    const manifest = {
      name: 'fixture',
      packageManager: 'bun@0.0.0',
      engines: { bun: '0.0.0' },
    };
    const manifestPath = path.join(packageRoot, 'package.json');
    const originalManifest = JSON.stringify(manifest);
    writeFileSync(manifestPath, originalManifest);
    const aliasParent = path.join(root, 'linked-parent');
    symlinkSync(realParent, aliasParent, 'dir');

    assert.throws(() => syncPin(path.join(aliasParent, 'package-root')), {
      message: 'Bun manifest root contains a symbolic link.',
    });
    assert.equal(readFileSync(manifestPath, 'utf8'), originalManifest);
    assert.deepEqual(readdirSync(packageRoot).sort(), ['.bun-version', 'package.json']);
    passed = true;
  } finally {
    if (!passed) {
      temporaryRoots.delete(root);
      console.error('Retained failed symlinked Bun manifest root fixture: ' + root);
    }
  }
});

test('invalid pins fail before package resolution', () => {
  const { root, pin } = fixture();
  assert.equal(
    expectReturned(() => readPin(root)),
    pin,
  );
  assert.doesNotThrow(() => checkManifest(root, pin), 'negative pin cases start from a valid mirrored package');
  for (const pin of ['latest', '^1.0.0', '1.0.0; echo unsafe', '1.0.0\n2.0.0']) {
    writeFileSync(path.join(root, '.bun-version'), pin);
    assert.equal(readFileSync(path.join(root, '.bun-version'), 'utf8'), pin, 'malformed pin mutation must take effect');
    assert.throws(() => runPinnedBun([], { root, spawn: () => assert.fail('must not spawn') }), /exact stable/);
  }
});

test('verified absolute Bun replaces a conflicting global PATH and preserves arguments and status', () => {
  const { root, pin } = fixture();
  const executable = path.join(root, 'pinned binary', process.platform === 'win32' ? 'bun.exe' : 'bun');
  const calls: LauncherCall[] = [];
  const pathKey = process.platform === 'win32' ? 'Path' : 'PATH';
  const env = { [pathKey]: path.join(root, 'wrong-global'), OTHER: 'preserved' };
  const args = ['run', 'test', '--', 'argument with spaces', '$(not a shell)'];
  const inheritedBudget = executionBudget();
  const inheritedAllowance = Number.isFinite(inheritedBudget.deadline)
    ? Math.floor(inheritedBudget.deadline - performance.now())
    : Infinity;
  const status = runPinnedBun(args, {
    root,
    cwd: root,
    env,
    node: '/node',
    npmCli: '/npm-cli.js',
    spawn(command, argv, options) {
      calls.push({ command, argv, options });
      const result = [success(executable), success(pin), { status: 17, signal: null }][calls.length - 1];
      if (!result) throw new Error('Launcher fixture received an unexpected extra call.');
      return result;
    },
  });
  assert.equal(status, 17);
  assert.equal(calls[0]!.command, '/node');
  assert.ok(calls[0]!.argv.includes(`bun@${pin}`));
  assert.equal(calls[1]!.command, executable);
  assertVersionProbe(calls[1], root, env);
  assert.equal(calls[2]!.command, executable);
  assert.deepEqual(calls[2]!.argv, args);
  assert.equal(calls[2]!.options.env?.[pathKey], `${path.dirname(executable)}${path.delimiter}${env[pathKey]}`);
  assert.equal(calls[2]!.options.env?.OTHER, 'preserved');
  assert.equal(calls[2]!.options.env?.[pathKey === 'PATH' ? 'Path' : 'PATH'], undefined);
  assert.equal(calls[2]!.options.cwd, root);
  const timeout = calls[2]!.options.timeout;
  if (Number.isFinite(inheritedAllowance)) {
    assert.ok(Number.isSafeInteger(timeout) && timeout! > 0 && timeout! <= inheritedAllowance);
    assert.equal(calls[2]!.options.env?.VIDA_PINNED_COMMAND_BUDGET_MS, String(timeout));
    const deadline = Number(calls[2]!.options.env?.VIDA_PINNED_COMMAND_DEADLINE_MS);
    assert.ok(Number.isSafeInteger(deadline));
    assert.ok(deadline <= Date.now() + timeout!);
    if (process.env.VIDA_PINNED_COMMAND_DEADLINE_MS !== undefined)
      assert.ok(deadline <= Number(process.env.VIDA_PINNED_COMMAND_DEADLINE_MS));
  } else {
    assert.equal(timeout, undefined);
    assert.equal(calls[2]!.options.env?.VIDA_PINNED_COMMAND_BUDGET_MS, undefined);
    assert.equal(calls[2]!.options.env?.VIDA_PINNED_COMMAND_DEADLINE_MS, undefined);
  }
  assert.ok(calls.every((call) => !call.options.shell));
});

test('npm-resolved version mismatch, malformed probe and install failure fail closed', () => {
  const { root } = fixture();
  const executable = path.join(root, 'collision-bun');
  const failures: Array<[CommandResult[], RegExp]> = [
    [[success(executable), success('0.0.0')], /requires/],
    [[success('relative-bun')], /absolute/],
    [[success(`${executable}\nextra-output`)], /absolute/],
    [[{ status: 23, signal: null }], /resolution/],
    [[{ status: null, error: new Error('timeout') }], /resolution/],
  ];
  for (const [responses, message] of failures) {
    let index = 0;
    assert.throws(
      () =>
        runPinnedBun(['test'], {
          root,
          env: { PATH: path.join(root, 'no-PATH-bun') },
          node: '/fixture-node',
          npmCli: '/npm-cli.js',
          spawn: () => {
            assert.ok(index < responses.length, 'must not run command after failure');
            const response = responses[index++];
            assert.ok(response);
            return response;
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
  const calls: LauncherCall[] = [];
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
  assert.equal(calls[0]!.command, executable);
  assertVersionProbe(calls[0], root, { PATH: directory, PATHEXT: '.exe' });
  assert.equal(calls[1]!.command, executable);
  assert.deepEqual(calls[1]!.argv, args);
  assert.ok(calls.every((call) => !call.options.shell));
});

test('default Bun host qualifies its actual executable before PATH and rejects a wrong pin', () => {
  const { root, pin } = fixture();
  assert.equal(process.versions.bun, pin);
  const calls: LauncherCall[] = [];
  assert.equal(
    runPinnedBun(['--version'], {
      root,
      env: { PATH: '' },
    }),
    0,
  );

  assert.throws(
    () =>
      runPinnedBun(['run', 'tool'], {
        root,
        env: { PATH: '' },
        spawn(command, argv, options) {
          calls.push({ command, argv, options });
          return success('0.0.0');
        },
      }),
    /requires/,
  );
  assert.deepEqual(
    calls.map(({ command, argv }) => [command, argv]),
    [[process.execPath, ['--version']]],
  );
  assertVersionProbe(calls[0], root, { PATH: '' });
});

test('Windows PATH resolution filters PATHEXT to supported executable suffixes', () => {
  const { root, pin } = fixture();
  const directory = path.join(root, 'windows-path');
  const missing = path.join(root, 'missing-windows-path');
  mkdirSync(directory);
  mkdirSync(path.join(directory, 'bun.COM'));
  writeFileSync(path.join(root, 'bun.COM'), 'empty-path decoy');
  writeFileSync(path.join(directory, 'bun.CMD'), 'unsupported shell command');
  const executable = path.join(directory, 'bun.EXE');
  writeFileSync(executable, 'fixture Windows Bun');
  const pathValue = `${missing}${path.delimiter}${path.delimiter}"${directory}"`;

  const platform = Object.getOwnPropertyDescriptor(process, 'platform');
  assert.ok(platform?.configurable, 'the platform override must be restorable');
  Object.defineProperty(process, 'platform', { ...platform, value: 'win32' });
  try {
    const calls: LauncherCall[] = [];
    const resolved = resolvePinnedBun({
      root,
      env: { Path: pathValue, PATHEXT: '.cmd;.COM;.EXE' },
      node: '/fixture-node',
      spawn(command, argv, options) {
        calls.push({ command, argv, options });
        return success(pin);
      },
    });

    assert.equal(resolved, realpathSync(executable));
    assert.equal(calls.length, 1, 'a matching PATHEXT executable should avoid npm resolution');
    assertVersionProbe(calls[0], root, { Path: pathValue, PATHEXT: '.cmd;.COM;.EXE' });

    const defaultExtensionCalls: LauncherCall[] = [];
    assert.equal(
      resolvePinnedBun({
        root,
        env: { Path: pathValue },
        node: '/fixture-node',
        spawn(command, argv, options) {
          defaultExtensionCalls.push({ command, argv, options });
          return success(pin);
        },
      }),
      realpathSync(executable),
    );
    assert.equal(defaultExtensionCalls.length, 1, 'the default PATHEXT should find the packaged executable');
    assertVersionProbe(defaultExtensionCalls[0], root, { Path: pathValue });

    const fallbackCalls: LauncherCall[] = [];
    assert.equal(
      resolvePinnedBun({
        root,
        env: {},
        node: '/fixture-node',
        npmCli: '/fixture-npm-cli.js',
        spawn(command, argv, options) {
          fallbackCalls.push({ command, argv, options });
          return fallbackCalls.length === 1 ? success('/fixture/resolved-bun') : success(pin);
        },
      }),
      '/fixture/resolved-bun',
    );
    assert.equal(fallbackCalls.length, 2, 'a missing PATH should use npm and verify its exact Bun version');
    assert.equal(fallbackCalls[0]!.command, '/fixture-node');
    assert.equal(fallbackCalls[0]!.argv[0], '/fixture-npm-cli.js');
    assertVersionProbe(fallbackCalls[1], root, {});
  } finally {
    Object.defineProperty(process, 'platform', platform);
  }
});

test.each([
  { label: 'zero', status: 0 },
  { label: 'positive', status: 17 },
  { label: 'negative', status: -1 },
  { label: 'unsafe integer', status: 2 ** 54 },
  { label: 'missing', status: null },
  { label: 'fractional', status: 1.5 },
  { label: 'NaN', status: NaN },
  { label: 'infinite', status: Infinity },
])('pinned command preserves integer statuses and rejects malformed terminal status %j', ({ status }) => {
  const { root, pin } = fixture();
  let calls = 0;
  const invoke = () =>
    runPinnedBun([], {
      root,
      executable: process.execPath,
      env: {},
      spawn() {
        calls++;
        return calls === 1 ? success(pin) : { status };
      },
    });
  if (Number.isInteger(status)) assert.equal(invoke(), status);
  else assert.throws(invoke, /Pinned Bun command failed/);
  assert.equal(calls, 2);
});

test('wrong-version PATH Bun falls back to npm exact pin and npm mismatch remains fatal', () => {
  const { root, pin } = fixture();
  const directory = path.join(root, 'wrong-global');
  mkdirSync(directory);
  const global = path.join(directory, process.platform === 'win32' ? 'bun.exe' : 'bun');
  writeFileSync(global, 'fixture global binary');
  const pinned = path.join(root, 'npm-pinned-bun');
  for (const npmVersion of [pin, '99.0.0']) {
    const calls: LauncherCall[] = [];
    const run = () =>
      runPinnedBun(['test'], {
        root,
        env: { PATH: directory, PATHEXT: '.exe' },
        node: '/fixture-node',
        npmCli: '/npm-cli.js',
        spawn(command, argv, options) {
          calls.push({ command, argv, options });
          const result = [success('99.0.0'), success(pinned), success(npmVersion), { status: 0, signal: null }][
            calls.length - 1
          ];
          if (!result) throw new Error('Launcher fixture received an unexpected extra call.');
          return result;
        },
      });
    if (npmVersion === pin) assert.equal(run(), 0);
    else assert.throws(run, /requires/);
    assert.equal(calls[0]!.command, global);
    assert.equal(calls[1]!.command, '/fixture-node');
    assert.ok(calls[1]!.argv.includes(`bun@${pin}`));
    assert.equal(calls[2]!.command, pinned);
    assert.equal(calls.length, npmVersion === pin ? 4 : 3, 'never run command with an npm version mismatch');
  }
});

test('absolute coverage entry aliases retain the bounded launcher profile', () => {
  const { root, pin } = fixture();
  const calls: LauncherCall[] = [];
  const entry = path.resolve(root, 'tooling/run-bun-coverage.ts');
  runPinnedBun([entry], {
    root,
    cwd: root,
    executable: path.join(root, 'coverage-bun'),
    spawn(command, argv, options) {
      calls.push({ command, argv, options });
      return calls.length === 1 ? success(pin) : success('');
    },
  });
  const launch = calls[1];
  assert.ok(launch);
  assert.ok(typeof launch.options.timeout === 'number' && launch.options.timeout <= 300_000);
});

test('manifest mismatch fails before matching PATH Bun can be probed', () => {
  const { root, pin } = fixture();
  const directory = path.join(root, 'PATH Bun');
  mkdirSync(directory);
  writeFileSync(path.join(directory, process.platform === 'win32' ? 'bun.exe' : 'bun'), 'fixture binary');
  const manifest = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')) as PackageManifest;
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
  const calls: LauncherCall[] = [];
  const cleaned: number[] = [];
  assert.throws(
    () =>
      runPinnedBun(['test', 'tests/smoke.test.ts'], {
        root,
        executable,
        timeoutMs: 123,
        cleanup(pid) {
          cleaned.push(pid);
        },
        spawn(command, argv, options) {
          calls.push({ command, argv, options });
          if (calls.length === 1) return success(pin);
          return { status: null, signal: 'SIGKILL', error: systemError('ETIMEDOUT'), pid: 31337 };
        },
      }),
    /Pinned Bun command failed \(SIGKILL\)\. Timed out after \d+ ms; process-tree cleanup was attempted\./,
  );
  assert.deepEqual(cleaned, [31337]);
  assert.equal(calls.length, 2);
  assert.equal(calls[0]!.command, executable);
  assert.deepEqual(calls[0]!.argv, ['--version']);
  const timeout = calls[1]!.options.timeout;
  assert.ok(typeof timeout === 'number' && timeout > 0 && timeout <= 123);
  assert.equal(calls[1]!.options.detached, process.platform !== 'win32');
});

test('successful timeout cleanup does not swallow the primary payload timeout', () => {
  const { root, pin } = fixture();
  const timeoutError = systemError('ETIMEDOUT', 'payload exceeded its allowance');
  let cleanupCalls = 0;
  let calls = 0;
  let thrown: unknown;
  try {
    runPinnedBun(['test', 'tests/smoke.test.ts'], {
      root,
      executable: '/fixture/pinned-bun',
      timeoutMs: 123,
      cleanup() {
        cleanupCalls++;
        return { status: 0 };
      },
      spawn() {
        calls++;
        return calls === 1 ? success(pin) : { status: null, signal: 'SIGKILL', error: timeoutError, pid: 31337 };
      },
    });
  } catch (error: unknown) {
    thrown = error;
  }
  assert.equal(calls, 2, 'the version probe must finish before the payload timeout');
  assert.ok(thrown instanceof Error, 'the caller must surface the primary payload failure after cleanup');
  assert.match(
    thrown.message,
    /Timed out after \d+ ms; process-tree cleanup was attempted\. Cleanup outcome: command_succeeded\./,
  );
  assert.equal((thrown as Error & { cause?: unknown }).cause, timeoutError);
  assert.equal((thrown as Error & { timedOut?: boolean }).timedOut, true);
  assert.equal(cleanupCalls, 1, 'the cleanup observation must complete before the caller rethrows the primary error');
});

test('pinned command preserves the payload spawn error as its cause', () => {
  const { root, pin } = fixture();
  const payloadError = systemError('ENOENT', 'payload executable disappeared');
  let calls = 0;
  let thrown: unknown;
  try {
    runPinnedBun(['test', 'tests/smoke.test.ts'], {
      root,
      executable: '/fixture/pinned-bun',
      env: {},
      spawn() {
        calls++;
        return calls === 1 ? success(pin) : { status: null, signal: null, error: payloadError };
      },
    });
  } catch (error: unknown) {
    thrown = error;
  }
  assert.equal(calls, 2, 'the version probe succeeds before the payload launch fails');
  assert.ok(thrown instanceof Error);
  assert.equal(thrown.message, 'Pinned Bun command failed.');
  assert.equal((thrown as Error & { exitCode?: number }).exitCode, 1);
  assert.equal((thrown as Error & { cause?: unknown }).cause, payloadError);
  assert.equal((thrown as Error & { cause: NodeJS.ErrnoException }).cause.code, 'ENOENT');
});

test.each([
  { entry: 'tooling/run-bun-coverage.ts', baseline: false },
  { entry: './tooling/run-bun-coverage.ts', baseline: false },
  { entry: '../../tooling/agent/run-coverage.ts', baseline: false },
  { entry: './../../tooling/agent/run-coverage.ts', baseline: false },
  { entry: 'tooling/run-bun-coverage.ts', baseline: true },
  { entry: './tooling/run-bun-coverage.ts', baseline: true },
  { entry: '../../tooling/agent/run-coverage.ts', baseline: true },
  { entry: './../../tooling/agent/run-coverage.ts', baseline: true },
])('coverage iteration defaults to one propagated five-minute launcher deadline: %j', ({ entry, baseline }) => {
  const { root, pin } = fixture();
  const executable = path.join(root, 'coverage-bun');
  const calls: LauncherCall[] = [];
  const started = Date.now();
  const args = baseline ? [entry, '--published-baseline=b549951'] : [entry];
  const status = runPinnedBun(args, {
    root,
    cwd: root,
    executable,
    spawn(command, argv, options) {
      calls.push({ command, argv, options });
      return calls.length === 1 ? success(pin) : success('');
    },
  });
  assert.equal(status, 0);
  assert.equal(calls.length, 2);
  assert.equal(calls[1]?.argv.includes('--wrapper-review-clocks'), !baseline);
  for (const call of calls) {
    const timeout = call.options.timeout;
    const environment = call.options.env;
    assert.ok(typeof timeout === 'number' && timeout > 0 && timeout <= 300_000);
    const childBudget = Number(environment?.VIDA_PINNED_COMMAND_BUDGET_MS);
    const childDeadline = Number(environment?.VIDA_PINNED_COMMAND_DEADLINE_MS);
    assert.equal(childBudget, timeout);
    assert.ok(childDeadline > started && childDeadline <= started + 300_050);
  }
});

test.each([
  { args: ['tooling/run-bun-coverage.ts', '--published-baseline=other'] },
  { args: ['tooling/run-bun-coverage.ts', '--published-baseline=b549951', '--extra'] },
  { args: ['../../tooling/agent/run-coverage.ts', '--extra'] },
  { args: ['other.ts', 'tooling/run-bun-coverage.ts'] },
  { args: ['tooling/run-bun-coverage.ts/near-match'] },
])('coverage-like arguments retain ordinary launcher policy: %j', ({ args }) => {
  const { root, pin } = fixture();
  const calls: LauncherCall[] = [];
  runPinnedBun(args, {
    root,
    cwd: root,
    executable: path.join(root, 'coverage-bun'),
    timeoutMs: 400_000,
    spawn(command, argv, options) {
      calls.push({ command, argv, options });
      return calls.length === 1 ? success(pin) : success('');
    },
  });
  assert.equal(calls.length, 2);
  const command = calls[1];
  assert.ok(command);
  assert.deepEqual(command.argv, args);
  assert.ok(typeof command.options.timeout === 'number' && command.options.timeout > 300_000);
  assert.equal(command.options.env?.VIDA_COVERAGE_REVIEW_CLOCK_POLICY, undefined);
});

test.each(['tooling/run-bun-coverage.ts', '../../tooling/agent/run-coverage.ts'])(
  'current coverage wrapper replaces ambient review clocks and preserves caller ceilings in semantic policy: %s',
  (entry) => {
    const { root, pin } = fixture();
    const calls: LauncherCall[] = [];
    const callerExpiry = String(Date.now() + 300000);
    runPinnedBun([entry], {
      root,
      cwd: root,
      executable: path.join(root, 'coverage-bun'),
      env: {
        VIDA_COVERAGE_REVIEW_CLOCK_POLICY: 'ambient-forged-claim',
        VIDA_PINNED_COMMAND_BUDGET_MS: '240000',
        VIDA_PINNED_COMMAND_DEADLINE_MS: callerExpiry,
      },
      spawn(command, argv, options) {
        calls.push({ command, argv, options });
        return calls.length === 1 ? success(pin) : success('');
      },
    });
    assert.equal(calls.length, 2);
    assert.equal(calls[0]?.options.env?.VIDA_COVERAGE_REVIEW_CLOCK_POLICY, undefined);
    const environment = calls[1]?.options.env;
    assert.ok(environment);
    const raw = environment.VIDA_COVERAGE_REVIEW_CLOCK_POLICY;
    assert.ok(typeof raw === 'string');
    const policy: unknown = JSON.parse(raw);
    assert.ok(typeof policy === 'object' && policy !== null && !Array.isArray(policy));
    assert.equal(Reflect.get(policy, 'original_duration_ms'), '240000');
    assert.equal(Reflect.get(policy, 'original_expiry_ms'), callerExpiry);
    assert.equal(Reflect.get(policy, 'budget_ms'), environment.VIDA_PINNED_COMMAND_BUDGET_MS);
    assert.equal(Reflect.get(policy, 'deadline_ms'), environment.VIDA_PINNED_COMMAND_DEADLINE_MS);
    assert.ok(Number(environment.VIDA_PINNED_COMMAND_BUDGET_MS) <= 240000);
    assert.ok(Number(environment.VIDA_PINNED_COMMAND_DEADLINE_MS) <= Number(callerExpiry));
    assert.ok(calls[1]?.argv.includes('--wrapper-review-clocks'));
    assert.notEqual(coverageReviewEnvironmentSha256(environment, true), coverageEnvironmentSha256(environment));
    assert.equal(coverageReviewEnvironmentSha256(environment), coverageEnvironmentSha256(environment));
  },
);

test('native wrapper issuance opts into review clocks while a direct ambient claim keeps exact hashing', () => {
  const { root } = fixture();
  let passed = false;
  try {
    const entry = path.join(root, 'tooling/run-bun-coverage.ts');
    const output = path.join(root, 'clock-observation.json');
    const owner = pathToFileURL(path.resolve(import.meta.dirname, '../tooling/bun-coverage-evidence.ts')).href;
    mkdirSync(path.dirname(entry), { recursive: true });
    writeFileSync(
      entry,
      `import {writeFileSync} from 'node:fs';
import {coverageReviewEnvironmentSha256,coverageEnvironmentSha256} from ${JSON.stringify(owner)};
const argv=process.argv.slice(2);
writeFileSync(${JSON.stringify(output)},JSON.stringify({argv,
  policy:process.env.VIDA_COVERAGE_REVIEW_CLOCK_POLICY,
  budget:process.env.VIDA_PINNED_COMMAND_BUDGET_MS,deadline:process.env.VIDA_PINNED_COMMAND_DEADLINE_MS,
  exact:coverageEnvironmentSha256(process.env),
  review:coverageReviewEnvironmentSha256(process.env,argv.length===1&&argv[0]==='--wrapper-review-clocks')}));\n`,
    );
    assert.equal(
      runPinnedBun(['tooling/run-bun-coverage.ts'], {
        root,
        cwd: root,
        executable: process.execPath,
        timeoutMs: 2000,
      }),
      0,
    );
    const observation: unknown = JSON.parse(readFileSync(output, 'utf8'));
    assert.ok(typeof observation === 'object' && observation !== null && !Array.isArray(observation));
    assert.deepEqual(Reflect.get(observation, 'argv'), ['--wrapper-review-clocks']);
    assert.notEqual(Reflect.get(observation, 'review'), Reflect.get(observation, 'exact'));
    const nativePolicy: unknown = Reflect.get(observation, 'policy');
    const nativeBudget: unknown = Reflect.get(observation, 'budget');
    const nativeDeadline: unknown = Reflect.get(observation, 'deadline');
    assert.ok(
      typeof nativePolicy === 'string' && typeof nativeBudget === 'string' && typeof nativeDeadline === 'string',
    );
    const direct = spawnSync(process.execPath, [entry], {
      cwd: root,
      encoding: 'utf8',
      timeout: 2000,
      env: {
        ...process.env,
        VIDA_COVERAGE_REVIEW_CLOCK_POLICY: nativePolicy,
        VIDA_PINNED_COMMAND_BUDGET_MS: nativeBudget,
        VIDA_PINNED_COMMAND_DEADLINE_MS: nativeDeadline,
      },
    });
    assert.equal(direct.error, undefined);
    assert.equal(direct.signal, null);
    assert.equal(direct.status, 0);
    const directObservation: unknown = JSON.parse(readFileSync(output, 'utf8'));
    assert.ok(typeof directObservation === 'object' && directObservation !== null && !Array.isArray(directObservation));
    assert.deepEqual(Reflect.get(directObservation, 'argv'), []);
    assert.equal(Reflect.get(directObservation, 'policy'), Reflect.get(observation, 'policy'));
    assert.equal(Reflect.get(directObservation, 'review'), Reflect.get(directObservation, 'exact'));
    passed = true;
  } finally {
    if (!passed) {
      temporaryRoots.delete(root);
      console.error('Retained failed native wrapper clock fixture: ' + root);
    }
  }
});

test('malformed caller timeout is rejected before resolution even with a supplied budget', () => {
  const { root, pin } = fixture();
  assert.equal(
    expectReturned(() => readPin(root)),
    pin,
  );
  assert.doesNotThrow(() => checkManifest(root, pin), 'negative timeout case starts from a valid pinned package');
  let calls = 0;
  assert.throws(
    () =>
      runPinnedBun([], {
        root,
        executable: path.join(root, 'resolved-bun'),
        timeoutMs: Number.NaN,
        budget: executionBudget(10_000, 0),
        spawn() {
          calls += 1;
          return success(pin);
        },
      }),
    { message: 'Execution budget and reserve must be bounded integer durations.' },
  );
  assert.equal(calls, 0);
});

test('coverage iteration cannot raise a stricter explicit caller timeout', () => {
  const { root, pin } = fixture();
  const executable = path.join(root, 'coverage-bun');
  const calls: LauncherCall[] = [];
  runPinnedBun(['tooling/run-bun-coverage.ts', '--published-baseline=b549951'], {
    root,
    executable,
    timeoutMs: 123,
    spawn(command, argv, options) {
      calls.push({ command, argv, options });
      return calls.length === 1 ? success(pin) : success('');
    },
  });
  assert.equal(calls.length, 2);
  const command = calls[1];
  assert.ok(command);
  const timeout = command.options.timeout;
  assert.ok(typeof timeout === 'number' && timeout > 0 && timeout <= 123);
  assert.equal(command.options.env?.VIDA_PINNED_COMMAND_BUDGET_MS, String(timeout));
});

test('spent caller budget prevents coverage version probes and command spawns', () => {
  const { root } = fixture();
  let calls = 0;
  assert.throws(
    () =>
      runPinnedBun(['tooling/run-bun-coverage.ts'], {
        root,
        executable: path.join(root, 'coverage-bun'),
        budget: executionBudget(1_000, 0, performance.now() - 1),
        spawn() {
          calls += 1;
          return success('unexpected');
        },
      }),
    /Execution budget exhausted before child launch/u,
  );
  assert.equal(calls, 0);
});

test('nested commands get one leading pinned directory even without PATH', () => {
  const executable = path.resolve('cache', 'bun');
  const environment = expectReturned(() => pinnedEnvironment(executable, {}));
  assert.equal(environment.PATH, `${path.dirname(executable)}${path.delimiter}`);
});

test('nested child allowances spend one deadline and fail before an exhausted launch', () => {
  const parent = executionBudget(5_000, 100);
  const child = parent.child(20_000, 100);
  let options: LauncherSpawnOptions | undefined;
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
  assert.ok(options);
  assert.ok(typeof options.timeout === 'number' && options.timeout > 0 && options.timeout <= 4_800);
  assert.ok(options.env);
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
  const moduleUrl = new URL('../bin/bun.ts', import.meta.url).href;
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
    assert.throws(() => invokeRuntimeArguments(executionBudget, [duration]), /bounded integer/);
    assert.throws(
      () => invokeRuntimeArguments(boundedSpawnSync, [spawn, 'fixture', [], { timeout: duration }, 'invalid']),
      /positive integer/,
    );
    assert.throws(
      () =>
        invokeRuntimeArguments(runPinnedBun, [[], { root, executable: process.execPath, timeoutMs: duration, spawn }]),
      /bounded integer/,
    );
  }
});

test('an expired inherited deadline rejects before invoking the child launcher', () => {
  let launched = false;
  assert.throws(
    () =>
      boundedSpawnSync(
        () => {
          launched = true;
          return { status: 0 };
        },
        'fixture',
        [],
        { env: { VIDA_PINNED_COMMAND_DEADLINE_MS: String(Date.now() - 1_000) } },
        'expired inherited deadline',
      ),
    /Execution budget exhausted before child launch/,
  );
  assert.equal(launched, false);
});

test('custom child environment cannot erase an inherited finite or expired host deadline', () => {
  const moduleUrl = new URL('../bin/bun.ts', import.meta.url).href;
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
  const observations: Array<[CommandResult | undefined, string]> = [
    [{ status: 0 }, 'command_succeeded'],
    [{ status: 1 }, 'failed'],
    [{ status: null, error: systemError('ETIMEDOUT') }, 'failed'],
    [undefined, 'unknown'],
  ];
  for (const [observation, expected] of observations) {
    const result = boundedSpawnSync(
      () => ({ status: null, pid: 31337, error: systemError('ETIMEDOUT') }),
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
    () => ({ status: null, pid: 31337, error: systemError('ETIMEDOUT') }),
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

  const missingPid = boundedSpawnSync(
    () => ({ status: null, error: systemError('ETIMEDOUT') }),
    'fixture',
    [],
    { env: {} },
    'timeout without a PID',
  );
  assert.equal(missingPid.timedOut, true);
  assert.equal(missingPid.cleanupAttempted, false);
  assert.equal(missingPid.cleanupOutcome, 'unknown');
  assert.equal(commandOutcomeUnknown(missingPid), true);
});

test('default POSIX timeout cleanup signals its ready detached fixture but remains unobserved', async () => {
  if (process.platform !== 'linux') return;
  const child = spawn(process.execPath, ['-e', "process.stdout.write('ready\\n'); setInterval(() => {}, 1000);"], {
    detached: true,
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  assert.ok(child.pid);
  assert.ok(child.stdout);
  const pid = child.pid;
  const exit = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve) => {
    child.once('exit', (code, signal) => resolve({ code, signal }));
  });
  const ready = new Promise<string>((resolve, reject) => {
    child.stdout!.once('data', (chunk: Buffer | string) => resolve(Buffer.isBuffer(chunk) ? chunk.toString() : chunk));
    child.once('error', reject);
    child.once('exit', (code, signal) => reject(new Error(`fixture exited before readiness: ${code}/${signal}`)));
  });

  try {
    assert.equal(await ready, 'ready\n');
    const result = boundedSpawnSync(
      () => ({ status: null, pid, error: systemError('ETIMEDOUT') }),
      'fixture',
      [],
      { env: {}, timeout: 100 },
      'default POSIX cleanup',
    );
    assert.equal(result.cleanupAttempted, true);
    assert.equal(result.cleanupOutcome, 'unknown', 'a sent SIGKILL is not terminal cleanup evidence');
    assert.equal(commandOutcomeUnknown(result), true);
    assert.deepEqual(await exit, { code: null, signal: 'SIGKILL' });
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      try {
        process.kill(-pid, 'SIGKILL');
      } catch {
        /* The fixture may have exited while the failure path was running. */
      }
      await exit;
    }
  }
}, 5_000);

test('default Windows timeout cleanup retains taskkill spawn failure without targeting a process', () => {
  if (process.platform !== 'linux') return;
  const { root } = fixture();
  const emptyPath = path.join(root, 'empty-command-path');
  mkdirSync(emptyPath);
  const platform = Object.getOwnPropertyDescriptor(process, 'platform');
  assert.ok(platform?.configurable);
  const previousPath = process.env.PATH;
  Object.defineProperty(process, 'platform', { ...platform, value: 'win32' });
  process.env.PATH = emptyPath;
  try {
    const result = boundedSpawnSync(
      () => ({ status: null, pid: 2_147_483_647, error: systemError('ETIMEDOUT') }),
      'fixture',
      [],
      { env: {}, timeout: 100 },
      'default Windows cleanup',
    );
    assert.equal(result.cleanupAttempted, true);
    assert.equal(result.cleanupOutcome, 'failed');
    assert.equal(result.cleanupErrorCode, 'ENOENT');
    assert.equal(commandOutcomeUnknown(result), true);
  } finally {
    if (previousPath === undefined) delete process.env.PATH;
    else process.env.PATH = previousPath;
    Object.defineProperty(process, 'platform', platform);
  }
});

test('cleanup keeps the report half of a case reserve and skips a spent allowance', () => {
  const reserved = executionBudget(5_000, 1_000);
  assert.ok(reserved.cleanupTimeout() > 0 && reserved.cleanupTimeout() <= 500);
  boundedSpawnSync(
    () => ({ status: null, pid: 31337, error: systemError('ETIMEDOUT') }),
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
      return { status: 0, pid: 31337, error: systemError('ETIMEDOUT') };
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
  const childElapsedMs = result.childElapsedMs;
  assert.ok(typeof childElapsedMs === 'number' && childElapsedMs >= 100);
  const elapsedMs = result.elapsedMs;
  assert.ok(typeof elapsedMs === 'number' && elapsedMs >= childElapsedMs);
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
          return { pid: 31337, status: null, error: systemError('ETIMEDOUT') };
        },
      }),
    /Cleanup outcome: failed/,
  );
  assert.equal(calls, 1);
});

test('forwarded duration cannot reset an expired earlier shell stage', () => {
  const moduleUrl = new URL('../bin/bun.ts', import.meta.url).href;
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
          return { status: 0 };
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
  const selectedCommandEnvironment = expectReturned(() => pinnedEnvironment(executable, { PATH: 'other-tools' }, root));
  assert.equal(selectedCommandEnvironment.PATH, `${commandDirectory}${path.delimiter}other-tools`);

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
  const fallbackCommandEnvironment = expectReturned(() => pinnedEnvironment(executable, { PATH: 'other-tools' }, root));
  assert.equal(fallbackCommandEnvironment.PATH, `${binaryDirectory}${path.delimiter}other-tools`);
});

test('Windows does not retain competing case variants of PATH', () => {
  if (process.platform !== 'win32') return;
  const executable = path.resolve('cache', 'bun.exe');
  const env = expectReturned(() => pinnedEnvironment(executable, { PATH: 'first', Path: 'second', path: 'third' }));
  assert.deepEqual(
    Object.keys(env).filter((key) => key.toLowerCase() === 'path'),
    ['PATH'],
  );
  assert.equal(env.PATH, `${path.dirname(executable)}${path.delimiter}first`);
});

test('Linux lowercase path remains caller data while pinnedEnvironment adds PATH', () => {
  if (process.platform !== 'linux') return;
  const executable = path.resolve('cache', 'bun');
  const env = expectReturned(() => pinnedEnvironment(executable, { path: 'caller-path' }));
  assert.equal(env.path, 'caller-path');
  assert.equal(env.PATH, `${path.dirname(executable)}${path.delimiter}`);
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
  assert.equal((JSON.parse(readFileSync(file, 'utf8')) as PackageManifest).engines?.bun, '9.8.7');
  assert.equal(
    readdirSync(root).some((name) => name.startsWith('.bun-pin-')),
    false,
  );
});

test('every public developer script enters the pinned bootstrap without recursion', () => {
  const manifest = JSON.parse(
    readFileSync(path.resolve(import.meta.dirname, '../package.json'), 'utf8'),
  ) as PackageManifest;
  const publicTasks = Object.keys(manifest.scripts).filter(
    (name) => !name.endsWith(':pinned') && name !== 'toolchain:sync',
  );
  for (const task of publicTasks) {
    const script = manifest.scripts[`${task}:pinned`];
    assert.ok(script, `pinned ${task} script must exist`);
    assert.equal(
      manifest.scripts[task],
      task === 'test'
        ? 'bun bin/bun.ts run test:pinned && bun bin/bun.ts run test:repair:pinned && bun bin/bun.ts run test:host-state:pinned && bun bin/bun.ts run test:run-entrypoint:pinned'
        : task === 'test:coverage'
          ? 'bun bin/bun.ts ../../tooling/agent/run-coverage.ts'
          : `bun bin/bun.ts run ${task}:pinned`,
    );
    assert.equal(script.includes(`run ${task} `), false);
    for (const [, bunHost, dependency] of script.matchAll(/\bbun run (--bun )?([\w:-]+)/g)) {
      assert.ok(dependency, 'nested pinned command must include a task name');
      if (bunHost) {
        const binaryOwners: Record<string, string> = { oxfmt: 'oxfmt', stryker: '@stryker-mutator/core' };
        const owner = binaryOwners[dependency];
        assert.ok(owner, `Bun-hosted binary ${dependency} must have a declared owner`);
        assert.equal(manifest.scripts[dependency], undefined, 'a binary leaf must not hide an unpinned script');
        const installed: unknown = JSON.parse(
          readFileSync(path.resolve(import.meta.dirname, '../node_modules', owner, 'package.json'), 'utf8'),
        );
        assert.ok(installed && typeof installed === 'object' && 'name' in installed && installed.name === owner);
        assert.ok('bin' in installed && installed.bin && typeof installed.bin === 'object');
        assert.ok(dependency in installed.bin);
        assert.equal(typeof Reflect.get(installed.bin, dependency), 'string');
        continue;
      }
      assert.ok(dependency.endsWith(':pinned'), `nested ${dependency} must retain pinned execution`);
      assert.ok(manifest.scripts[dependency], `nested ${dependency} must exist`);
    }
  }
});

test('public test phases assign each literal test file to one phase', () => {
  const manifest = JSON.parse(
    readFileSync(path.resolve(import.meta.dirname, '../package.json'), 'utf8'),
  ) as PackageManifest;
  const aggregate = manifest.scripts.test;
  assert.ok(aggregate, 'public test aggregate must exist');
  const phaseNames = [...aggregate.matchAll(/run ([\w:-]+:pinned)/g)].map((match) => {
    const phase = match[1];
    assert.ok(phase, 'public test phase reference must include its name');
    return phase;
  });
  assert.deepEqual(phaseNames, [
    'test:pinned',
    'test:repair:pinned',
    'test:host-state:pinned',
    'test:run-entrypoint:pinned',
  ]);

  const phaseMemberships = phaseNames.map((phase) => {
    const script = manifest.scripts[phase];
    assert.ok(script, `public test phase ${phase} must exist`);
    const files = [...script.matchAll(/tests\/(\S+\.(?:test|spec)\.(?:ts|mts|cts|tsx))(?=\s|$)/gu)].map((match) => {
      const file = match[1];
      assert.ok(file, `public test phase ${phase} must contain complete test paths`);
      return `tests/${file}`;
    });
    return { phase, files };
  });
  const memberships = phaseMemberships.flatMap(({ phase, files }) => files.map((file) => ({ phase, file })));
  assert.equal(
    new Set(memberships.map(({ file }) => file)).size,
    memberships.length,
    'a literal test file must belong to only one public test phase',
  );

  const phaseFiles = (phase: string): string[] =>
    phaseMemberships.find((membership) => membership.phase === phase)?.files ?? [];
  for (const file of [
    'tests/completed-source-report-recovery-cli.test.ts',
    'tests/completed-readonly-capture.test.ts',
  ]) {
    assert.equal(phaseFiles('test:repair:pinned').filter((candidate) => candidate === file).length, 1);
  }
  for (const file of [
    'tests/documentation-policy.test.ts',
    'tests/public-cli-fixture-timing.test.ts',
    'tests/documentation-clear-custody.test.ts',
  ]) {
    assert.equal(phaseFiles('test:pinned').filter((candidate) => candidate === file).length, 1);
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
  else
    writeFileSync(
      target,
      expectReturned(() => readPin()),
    );
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
  assert.ok(typeof timedOut.stdout === 'string');
  assert.match(timedOut.stdout, /partial/);
  assert.throws(() => {
    const terminal = requireTerminalCommand(timedOut, 'actual incomplete child');
    assert.ok(terminal);
    assert.ok(typeof terminal.stdout === 'string');
    JSON.parse(terminal.stdout);
  }, /uncertain command outcome.*timed_out.*true/);
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
  assert.ok(missing.error);
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
  const completedTerminal = requireTerminalCommand(completed, 'actual completed denial');
  assert.ok(completedTerminal, 'completed child must have a terminal observation before its output is read');
  assert.equal(completedTerminal.error, undefined);
  assert.equal(completedTerminal.signal, null);
  assert.equal(completedTerminal.status, 1);
  assert.equal(completedTerminal.stdout, '');
  assert.equal(completedTerminal.stderr, JSON.stringify({ status: 'expected_denial' }));
  assert.deepEqual(JSON.parse(completedTerminal.stderr), { status: 'expected_denial' });
  assert.equal(commandOutcomeUnknown({ status: null }), true);
}, 10_000);

test('terminal command classification preserves nullable results, status boundaries and getter order', () => {
  const emptyDiagnostic = {
    status: null,
    signal: null,
    error_code: null,
    timed_out: false,
    timeout_ms: null,
    cleanup_outcome: null,
    cleanup_status: null,
    cleanup_error_code: null,
  };
  for (const value of [null, undefined]) {
    assert.equal(commandOutcomeUnknown(value), true);
    assert.throws(() => requireTerminalCommand(value, 'nullable result'), {
      message: 'nullable result: uncertain command outcome ' + JSON.stringify(emptyDiagnostic),
    });
  }
  for (const status of [null, -1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    const value = { status };
    assert.equal(commandOutcomeUnknown(value), true);
    assert.throws(() => requireTerminalCommand(value, 'invalid status'), /uncertain command outcome/);
  }
  for (const status of [0, 1, Number.MAX_SAFE_INTEGER]) {
    const value = { status };
    assert.equal(commandOutcomeUnknown(value), false);
    assert.equal(requireTerminalCommand(value, 'completed result'), value);
  }
  const reads: string[] = [];
  const value = {
    get timedOut() {
      reads.push('timedOut');
      return false;
    },
    get error() {
      reads.push('error');
      return undefined;
    },
    get signal() {
      reads.push('signal');
      return null;
    },
    get status() {
      reads.push('status');
      return 0;
    },
  };
  assert.equal(invokeRuntimeArguments(requireTerminalCommand, [value, 'getter result']), value);
  assert.deepEqual(reads, ['timedOut', 'error', 'signal', 'status']);
  const failure = new Error('status getter failed');
  const throwing = {
    get status(): number {
      throw failure;
    },
  };
  assert.throws(
    () => requireTerminalCommand(throwing, 'throwing result'),
    (error) => error === failure,
  );
});

test('non-object manifest is rejected before runtime selection or spawn', () => {
  const { root } = fixture();
  let passed = false;
  try {
    writeFileSync(path.join(root, 'package.json'), '[]');
    assert.throws(
      () =>
        runPinnedBun([], {
          root,
          env: {},
          spawn: () => assert.fail('non-object manifest must fail before a child launch'),
        }),
      { message: 'Bun manifest must contain JSON objects.' },
    );
    passed = true;
  } finally {
    if (!passed) {
      temporaryRoots.delete(root);
      console.error('Retained failed non-object Bun manifest fixture: ' + root);
    }
  }
});

test('malformed JSON manifest is rejected before runtime selection or spawn', () => {
  const { root } = fixture();
  let passed = false;
  try {
    writeFileSync(path.join(root, 'package.json'), '{"packageManager":');
    assert.throws(
      () =>
        runPinnedBun([], {
          root,
          env: {},
          spawn: () => assert.fail('malformed package metadata must fail before a child launch'),
        }),
      SyntaxError,
    );
    passed = true;
  } finally {
    if (!passed) {
      temporaryRoots.delete(root);
      console.error('Retained failed malformed Bun manifest fixture: ' + root);
    }
  }
});

test('embedded runtime rejects a linked package root', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'runtime-bun-embedded-link-'));
  temporaryRoots.add(root);
  let passed = false;
  try {
    const pin = expectReturned(() => readPin());
    writeFileSync(path.join(root, '.bun-version'), `${pin}\n`);
    writeFileSync(
      path.join(root, 'package.json'),
      JSON.stringify({ name: 'vida-agent', packageManager: `bun@${pin}`, engines: { bun: pin } }),
    );
    const alias = path.join(root, 'package-root-link');
    symlinkSync(root, alias, process.platform === 'win32' ? 'junction' : 'dir');
    assert.throws(
      () =>
        standaloneRuntime({
          BUN_BE_BUN: '1',
          VIDA_STANDALONE_ROOT: alias,
          VIDA_STANDALONE_EXECUTABLE: process.execPath,
        }),
      { message: 'Embedded package root must be a non-link directory.' },
    );
    passed = true;
  } finally {
    if (!passed) {
      temporaryRoots.delete(root);
      console.error('Retained failed linked embedded-root fixture: ' + root);
    }
  }
});

test('bounded child diagnostics report the exact stage and terminal status', () => {
  let captured = '';
  const capture = spyOn(process.stderr, 'write').mockImplementation((chunk) => {
    const text = typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString();
    assert.ok(Buffer.byteLength(captured) + Buffer.byteLength(text) <= 4096, 'stderr capture is bounded');
    captured += text;
    return true;
  });
  try {
    const result = boundedSpawnSync(
      () => ({ status: 0, signal: null }),
      'fixture',
      [],
      { env: {}, diagnostics: true },
      'diagnostic fixture',
    );
    assert.equal(result.status, 0);
    assert.equal(result.signal, null);
    assert.equal(captured.endsWith('\n'), true);
    const lines = captured.trimEnd().split('\n');
    assert.equal(lines.length, 1);
    const diagnostic: unknown = JSON.parse(lines[0]!);
    assert.ok(typeof diagnostic === 'object' && diagnostic !== null && !Array.isArray(diagnostic));
    assert.equal(Reflect.get(diagnostic, 'stage'), 'diagnostic fixture');
    assert.equal(Reflect.get(diagnostic, 'status'), 0);
    assert.equal(typeof Reflect.get(diagnostic, 'elapsed_ms'), 'number');
    assert.equal(typeof Reflect.get(diagnostic, 'child_elapsed_ms'), 'number');
  } finally {
    capture.mockRestore();
  }
});
