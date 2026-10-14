import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, test } from 'bun:test';
import { install } from '../bin/install.ts';
import { readPin } from '../bin/bun.ts';

const temporaryRoots = new Set<string>();
afterEach(() => {
  for (const root of temporaryRoots) rmSync(root, { recursive: true, force: true });
  temporaryRoots.clear();
});

function fixture(): { root: string; pin: string } {
  const root = mkdtempSync(path.join(os.tmpdir(), 'install-bun-toolchain-'));
  temporaryRoots.add(root);
  const pin = readPin();
  mkdirSync(path.join(root, 'bin'));
  writeFileSync(path.join(root, '.bun-version'), `${pin}\n`);
  writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({ packageManager: `bun@${pin}`, engines: { bun: pin }, dependencies: {} }),
  );
  writeFileSync(path.join(root, 'bun.lock'), '{}\n');
  writeFileSync(path.join(root, 'bunfig.toml'), '');
  for (const file of ['bin/bun.ts', 'bin/init.ts', 'bin/install.ts']) writeFileSync(path.join(root, file), '');
  return { root, pin };
}

test('default Bun installer check qualifies the absolute pinned host without Node or npm metadata', () => {
  const { root, pin } = fixture();
  const result = install(['--check'], {
    root,
    env: { PATH: '' },
    runBun: () => assert.fail('check must not resolve or initialize dependencies'),
  });
  assert.equal(process.versions.bun, pin);
  assert.equal(result.bun, pin);
  assert.equal(result.bun_pin, pin);
  assert.equal(result.runtime, 'bun');
  assert.equal(result.dependencies, 'not_checked');
  assert.equal(result.bun_executable, process.execPath);
  assert.equal(path.isAbsolute(String(result.bun_executable)), true);
});

test('default Bun installer resolves a declared local dependency with its pinned executable and no Node PATH', () => {
  const { root } = fixture();
  const manifestFile = path.join(root, 'package.json');
  const manifest = JSON.parse(readFileSync(manifestFile, 'utf8')) as { dependencies: Record<string, string> };
  manifest.dependencies = { 'fixture-dependency': '1.0.0' };
  writeFileSync(manifestFile, JSON.stringify(manifest));
  const dependency = path.join(root, 'node_modules/fixture-dependency');
  mkdirSync(dependency, { recursive: true });
  writeFileSync(
    path.join(dependency, 'package.json'),
    JSON.stringify({ name: 'fixture-dependency', version: '1.0.0', exports: './index.ts' }),
  );
  writeFileSync(path.join(dependency, 'index.ts'), 'export const fixture = true;\n');
  const result = install([], { root, env: { PATH: '' } });
  assert.equal(result.status, 'bun_dependencies_valid');
  assert.equal(result.initialization, 'not_requested');
});

test('missing declared dependency fails without installation or initialization effects', () => {
  const { root } = fixture();
  const manifestFile = path.join(root, 'package.json');
  const manifest = JSON.parse(readFileSync(manifestFile, 'utf8')) as { dependencies: Record<string, string> };
  manifest.dependencies = { 'vida-nonexistent-fixture-dependency': '1.0.0' };
  writeFileSync(manifestFile, JSON.stringify(manifest));
  const before = readdirSync(root).sort();
  const lock = readFileSync(path.join(root, 'bun.lock'));
  assert.throws(() => install([], { root, env: { PATH: '' } }), /Bun dependency entrypoint check|Pinned Bun/u);
  assert.deepEqual(readdirSync(root).sort(), before);
  assert.deepEqual(readFileSync(path.join(root, 'bun.lock')), lock);
  assert.equal(existsSync(path.join(root, 'node_modules')), false);
});

for (const initialize of [false, true])
  test(`Bun installer preserves runner options and initialization order (init=${initialize})`, () => {
    const { root, pin } = fixture();
    const events: string[] = [];
    const env = { PATH: '' };
    const spawn: NonNullable<NonNullable<Parameters<typeof install>[1]>['spawn']> = () =>
      assert.fail('injected runner owns dispatch');
    const args = initialize ? ['--project-root', root, '--repository', 'fixture', '--project', 'app=.'] : [];
    const runBun: NonNullable<Parameters<typeof install>[1]>['runBun'] = (argv, options) => {
      events.push(argv.includes('--eval') ? 'dependencies' : 'initialization');
      assert.deepEqual(options, { root, cwd: root, executable: process.execPath, timeoutMs: 1234, spawn, env });
      if (argv.includes('--eval')) {
        assert.deepEqual(argv.slice(0, 3), [
          '--no-env-file',
          '--no-install',
          `--config=${path.join(root, 'bunfig.toml')}`,
        ]);
        assert.equal(argv.at(-1), '[]');
      } else assert.deepEqual(argv, [path.join(root, 'bin/init.ts'), ...args]);
      return 0;
    };
    const result = install(args, {
      root,
      get bunExecutable() {
        events.push('executable');
        return process.execPath;
      },
      get runBun() {
        events.push('runner');
        return runBun;
      },
      get bunTimeoutMs() {
        events.push('timeout');
        return 1234;
      },
      get env() {
        events.push('env');
        return env;
      },
      get spawn() {
        events.push('spawn');
        return spawn;
      },
    });
    assert.deepEqual(events, [
      'executable',
      'runner',
      'timeout',
      'spawn',
      'spawn',
      'env',
      'env',
      'dependencies',
      ...(initialize ? ['initialization'] : []),
    ]);
    assert.deepEqual(result, {
      status: 'bun_dependencies_valid',
      bun_pin: pin,
      initialization: initialize ? 'delegated_successfully' : 'not_requested',
      runtime_activation: 'not_performed',
    });
  });

test('Bun check returns before reading runner options or dispatching a process', () => {
  const { root } = fixture();
  const fail = (): never => assert.fail('check must not read runner options');
  const result = install(['--check'], {
    root,
    get runBun() {
      return fail();
    },
    get bunTimeoutMs() {
      return fail();
    },
    get spawn() {
      return fail();
    },
    get env() {
      return fail();
    },
  });
  assert.equal(result.status, 'prerequisites_valid');
});

test.each([
  'dependency-failure',
  'dependency-drift',
  'initialization-failure',
  'initialization-throw',
  'initialization-drift',
  'initialization-throw-and-drift',
] as const)('Bun installer retains causal guards for %s', (fault) => {
  const { root } = fixture();
  const argv = ['--project-root', root, '--repository', 'fixture', '--project', 'app=.'];
  const events: string[] = [];
  const bodyError = new Error('initializer body failed');
  const runBun: NonNullable<Parameters<typeof install>[1]>['runBun'] = (args) => {
    const dependency = args.includes('--eval');
    events.push(dependency ? 'dependencies' : 'initialization');
    if ((dependency && fault === 'dependency-drift') || (!dependency && fault.endsWith('drift')))
      writeFileSync(path.join(root, 'bun.lock'), 'foreign change\n');
    if (!dependency && fault.includes('throw')) throw bodyError;
    return (dependency && fault === 'dependency-failure') || (!dependency && fault === 'initialization-failure')
      ? 7
      : 0;
  };
  const expected = fault.includes('drift')
    ? /Installer inputs changed/
    : fault === 'dependency-failure'
      ? /Bun dependency entrypoint check failed/
      : /Project initialization failed/;
  if (fault === 'initialization-throw')
    assert.throws(
      () => install(argv, { root, runBun }),
      (error) => error === bodyError,
    );
  else if (fault === 'dependency-failure' || fault === 'initialization-failure')
    assert.throws(
      () => install(argv, { root, runBun }),
      (error) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, expected);
        assert.ok('exitCode' in error);
        assert.equal(error.exitCode, 7);
        return true;
      },
    );
  else assert.throws(() => install(argv, { root, runBun }), expected);
  assert.deepEqual(events, fault.startsWith('dependency-') ? ['dependencies'] : ['dependencies', 'initialization']);
});
