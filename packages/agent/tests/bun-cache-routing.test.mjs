import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'bun:test';

// TEST SETUP ONLY: preserve fixture/cache outputs. No install, Runtime acceptance,
// native action or measured speed improvement is asserted by these regressions.
const bundle = path.resolve(import.meta.dirname, '..');
const source = path.resolve(process.env.VIDA_CACHE_ROUTING_SOURCE_ROOT ?? bundle);
const baseline = path.resolve(process.env.VIDA_CACHE_ROUTING_BASELINE_ROOT ?? bundle);
const dependencies = path.resolve(process.env.VIDA_CACHE_ROUTING_DEPENDENCY_ROOT ?? baseline);
const scratch = path.resolve(
  process.env.VIDA_CACHE_ROUTING_FIXTURE_ROOT ??
    path.join(path.dirname(realpathSync(baseline)), '.tmp/vida-bun-cache-routing-fixtures'),
);
const scratchWithinBaseline = path.relative(realpathSync(baseline), scratch);
assert.ok(
  scratchWithinBaseline !== '' &&
    (path.isAbsolute(scratchWithinBaseline) ||
      scratchWithinBaseline === '..' ||
      scratchWithinBaseline.startsWith('..' + path.sep)),
  'cache test scratch must be outside the copied baseline bundle',
);
mkdirSync(scratch, { recursive: true });
const { pinnedEnvironment, readPin, runPinnedBun } = await import(pathToFileURL(path.join(source, 'bin/bun.mjs')).href);
const pin = readPin(baseline);
assert.equal(Bun.version, pin, 'test must use the exact selected Bun');

function pinFixture(name) {
  const parent = mkdtempSync(path.join(scratch, name + '-'));
  const root = path.join(parent, 'vida-agent');
  mkdirSync(root);
  writeFileSync(path.join(root, '.bun-version'), pin + '\n');
  writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({ packageManager: `bun@${pin}`, engines: { bun: pin } }),
  );
  return root;
}

function expectedCache(root) {
  const canonical = realpathSync(root);
  return path.join(path.dirname(canonical), '.tmp', 'vida-bun-cache', path.basename(canonical), pin);
}

test('copied bundles have distinct stable cache namespaces and preserve warm contents', () => {
  const first = pinFixture('first'),
    second = pinFixture('second');
  const firstEnv = pinnedEnvironment(process.execPath, { PATH: 'fixture-path' }, first);
  const secondEnv = pinnedEnvironment(process.execPath, { PATH: 'fixture-path' }, second);
  assert.equal(firstEnv.BUN_RUNTIME_TRANSPILER_CACHE_PATH, expectedCache(first));
  assert.equal(secondEnv.BUN_RUNTIME_TRANSPILER_CACHE_PATH, expectedCache(second));
  assert.notEqual(firstEnv.BUN_RUNTIME_TRANSPILER_CACHE_PATH, secondEnv.BUN_RUNTIME_TRANSPILER_CACHE_PATH);
  mkdirSync(firstEnv.BUN_RUNTIME_TRANSPILER_CACHE_PATH, { recursive: true });
  const sentinel = path.join(firstEnv.BUN_RUNTIME_TRANSPILER_CACHE_PATH, 'warm-sentinel');
  writeFileSync(sentinel, 'retained warm fixture bytes');
  const warm = pinnedEnvironment(process.execPath, firstEnv, first);
  assert.equal(warm.BUN_RUNTIME_TRANSPILER_CACHE_PATH, firstEnv.BUN_RUNTIME_TRANSPILER_CACHE_PATH);
  assert.equal(readFileSync(sentinel, 'utf8'), 'retained warm fixture bytes');
});

test('inherited derived cache follows the actual copy while custom and disabled caches remain explicit', () => {
  const first = pinFixture('inherited'),
    second = pinFixture('actual-copy');
  const inherited = pinnedEnvironment(process.execPath, {}, first);
  assert.equal(
    pinnedEnvironment(process.execPath, inherited, second).BUN_RUNTIME_TRANSPILER_CACHE_PATH,
    expectedCache(second),
  );
  const custom = path.join(scratch, 'caller-selected-cache');
  for (const selected of [custom, '0']) {
    const input = { BUN_RUNTIME_TRANSPILER_CACHE_PATH: selected, FIXTURE_VALUE: 'retained' };
    const actual = pinnedEnvironment(process.execPath, input, second);
    assert.equal(actual.BUN_RUNTIME_TRANSPILER_CACHE_PATH, selected);
    assert.equal(actual.FIXTURE_VALUE, input.FIXTURE_VALUE);
    assert.deepEqual(input, { BUN_RUNTIME_TRANSPILER_CACHE_PATH: selected, FIXTURE_VALUE: 'retained' });
  }
});

test('pinned launcher checks version then forwards one payload with unchanged argv cwd and exit', () => {
  const root = pinFixture('launcher'),
    calls = [];
  const argv = ['fixture-entry.mjs', '--value', 'space and unicode: є', '--literal', '--not-a-flag'];
  const env = { PATH: 'fixture-path', FIXTURE_VALUE: 'retained' };
  const exit = runPinnedBun(argv, {
    root,
    cwd: scratch,
    executable: process.execPath,
    env,
    spawn(command, args, options) {
      calls.push({ command, args, options });
      return { status: calls.length === 1 ? 0 : 23, signal: null, stdout: calls.length === 1 ? pin : '' };
    },
  });
  assert.equal(exit, 23);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].args, ['--version']);
  assert.equal(calls[0].command, process.execPath);
  assert.equal(calls[1].command, process.execPath);
  assert.deepEqual(calls[1].args, argv);
  assert.equal(calls[1].options.cwd, scratch);
  assert.deepEqual(calls[1].options.env, pinnedEnvironment(process.execPath, env, root));
  assert.equal(calls[1].options.shell, undefined);
});

let copied;
function realCopy() {
  if (copied) return copied;
  const parent = mkdtempSync(path.join(scratch, 'real-copy-'));
  const root = path.join(parent, 'vida-agent');
  cpSync(baseline, root, {
    recursive: true,
    filter(file) {
      const parts = path.relative(baseline, file).split(path.sep);
      return !parts.some((part) => ['node_modules', '.tmp', '.cache', 'coverage'].includes(part));
    },
  });
  // Read only the two frozen source-owner files into this disposable test copy.
  for (const name of ['bun.mjs', 'run.mjs'])
    writeFileSync(path.join(root, 'bin', name), readFileSync(path.join(source, 'bin', name)));
  symlinkSync(
    path.join(dependencies, 'node_modules'),
    path.join(parent, 'node_modules'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  copied = { parent, root };
  return copied;
}

function cleanEnv() {
  const env = { ...process.env, TEMP: scratch, TMP: scratch };
  delete env.BUN_RUNTIME_TRANSPILER_CACHE_PATH;
  return env;
}

test('actual direct Bun entrypoint terminates with strict public JSON when required arguments are invalid', () => {
  const { root, parent } = realCopy();
  const result = spawnSync(process.execPath, [path.join(root, 'bin/run.mjs'), '--invalid-fixture-argument'], {
    cwd: parent,
    env: cleanEnv(),
    encoding: 'utf8',
    windowsHide: true,
    timeout: 30000,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.signal, null);
  assert.equal(result.status, 1);
  assert.equal(result.stdout.trim(), '');
  const failure = JSON.parse(result.stderr.trim());
  assert.equal(failure.schema, 'VidaAgentRunResult/v1');
  assert.equal(failure.status, 'blocked');
  assert.equal(typeof failure.code, 'string');
  assert.equal(typeof failure.message, 'string');
  // Terminal output proves the direct route returns; exact child count is not asserted.
}, 45000);

test('imported run entrypoint leaves cache selection and execution untouched', () => {
  const { root, parent } = realCopy();
  const moduleUrl = pathToFileURL(path.join(root, 'bin/run.mjs')).href;
  const program = `const prior=process.env.BUN_RUNTIME_TRANSPILER_CACHE_PATH;
const {main,run}=await import(${JSON.stringify(moduleUrl)});
if(process.env.BUN_RUNTIME_TRANSPILER_CACHE_PATH!==prior) throw Error('import changed cache env');
let executed=false;
await main({isMain:false,execute:async()=>{executed=true;throw Error('unexpected execution');}});
if(executed||process.exitCode) throw Error('library import entered main execution');
console.log(JSON.stringify({status:'pass',run_export:typeof run==='function',cache_unchanged:true}));`;
  const result = spawnSync(process.execPath, ['-e', program], {
    cwd: parent,
    env: cleanEnv(),
    encoding: 'utf8',
    windowsHide: true,
    timeout: 30000,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0);
  assert.equal(result.stderr.trim(), '');
  assert.deepEqual(JSON.parse(result.stdout.trim()), { status: 'pass', run_export: true, cache_unchanged: true });
}, 45000);
