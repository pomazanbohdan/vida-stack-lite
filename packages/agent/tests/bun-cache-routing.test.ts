import assert from 'node:assert/strict';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { test } from 'bun:test';
import { expectReturned } from './helpers/expect-rejection.ts';

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
type BunCacheApi = Pick<typeof import('../bin/bun.ts'), 'pinnedEnvironment' | 'readPin' | 'runPinnedBun'>;

function isBunCacheApi(value: unknown): value is BunCacheApi {
  return (
    typeof value === 'object' &&
    value !== null &&
    'pinnedEnvironment' in value &&
    typeof value.pinnedEnvironment === 'function' &&
    'readPin' in value &&
    typeof value.readPin === 'function' &&
    'runPinnedBun' in value &&
    typeof value.runPinnedBun === 'function'
  );
}

const importedBunCacheApi: unknown = await import(pathToFileURL(path.join(source, 'bin/bun.ts')).href);
if (!isBunCacheApi(importedBunCacheApi))
  throw new TypeError('selected Bun module does not expose the pinned cache API');
const { pinnedEnvironment, readPin, runPinnedBun } = importedBunCacheApi;
const pin = readFileSync(path.join(baseline, '.bun-version'), 'utf8').trim();
assert.equal(Bun.version, pin, 'test must use the exact selected Bun');

type PinnedInvocationOptions = Parameters<NonNullable<NonNullable<Parameters<typeof runPinnedBun>[1]>['spawn']>>[2];

interface PinnedInvocation {
  command: string;
  args: readonly string[];
  options: PinnedInvocationOptions;
}

interface CopiedBundle {
  parent: string;
  root: string;
}

interface RunFailureProjection {
  schema: unknown;
  status: unknown;
  code: unknown;
  message: unknown;
}

interface RunHelpProjection {
  schema: unknown;
  status: unknown;
  command: unknown;
}

function isRunHelp(value: unknown): value is RunHelpProjection {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    'schema' in value &&
    'status' in value &&
    'command' in value
  );
}

function isRunFailureProjection(value: unknown): value is RunFailureProjection {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    'schema' in value &&
    'status' in value &&
    'code' in value &&
    'message' in value
  );
}

function pinFixture(name: string): string {
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

function expectedCache(root: string): string {
  const canonical = realpathSync(root);
  return path.join(path.dirname(canonical), '.tmp', 'vida-bun-cache', path.basename(canonical), pin);
}

test('copied bundles have distinct stable cache namespaces and preserve warm contents', () => {
  assert.equal(
    expectReturned(() => readPin(baseline)),
    pin,
  );
  const first = pinFixture('first'),
    second = pinFixture('second');
  const firstEnv = expectReturned(() => pinnedEnvironment(process.execPath, { PATH: 'fixture-path' }, first));
  const secondEnv = expectReturned(() => pinnedEnvironment(process.execPath, { PATH: 'fixture-path' }, second));
  assert.equal(firstEnv.BUN_RUNTIME_TRANSPILER_CACHE_PATH, expectedCache(first));
  assert.equal(secondEnv.BUN_RUNTIME_TRANSPILER_CACHE_PATH, expectedCache(second));
  assert.notEqual(firstEnv.BUN_RUNTIME_TRANSPILER_CACHE_PATH, secondEnv.BUN_RUNTIME_TRANSPILER_CACHE_PATH);
  mkdirSync(firstEnv.BUN_RUNTIME_TRANSPILER_CACHE_PATH, { recursive: true });
  const sentinel = path.join(firstEnv.BUN_RUNTIME_TRANSPILER_CACHE_PATH, 'warm-sentinel');
  writeFileSync(sentinel, 'retained warm fixture bytes');
  const warm = expectReturned(() => pinnedEnvironment(process.execPath, firstEnv, first));
  assert.equal(warm.BUN_RUNTIME_TRANSPILER_CACHE_PATH, firstEnv.BUN_RUNTIME_TRANSPILER_CACHE_PATH);
  assert.equal(readFileSync(sentinel, 'utf8'), 'retained warm fixture bytes');
});

test('private installed-package cache namespaces do not collide when path components flatten alike', () => {
  const parent = mkdtempSync(path.join(scratch, 'private-cache-collision-'));
  const first = path.join(parent, 'node_modules', '@a', 'b-c');
  const second = path.join(parent, 'node_modules', '@a-b', 'c');
  for (const root of [first, second]) {
    mkdirSync(root, { recursive: true });
    writeFileSync(path.join(root, '.bun-version'), pin + '\n');
    writeFileSync(
      path.join(root, 'package.json'),
      JSON.stringify({ packageManager: `bun@${pin}`, engines: { bun: pin } }),
    );
  }
  const firstCache = expectReturned(() =>
    pinnedEnvironment(process.execPath, {}, first),
  ).BUN_RUNTIME_TRANSPILER_CACHE_PATH;
  const secondCache = expectReturned(() =>
    pinnedEnvironment(process.execPath, {}, second),
  ).BUN_RUNTIME_TRANSPILER_CACHE_PATH;
  assert.ok(firstCache && secondCache);
  assert.equal(
    expectReturned(() => pinnedEnvironment(process.execPath, {}, first)).BUN_RUNTIME_TRANSPILER_CACHE_PATH,
    firstCache,
  );
  assert.equal(
    expectReturned(() => pinnedEnvironment(process.execPath, {}, second)).BUN_RUNTIME_TRANSPILER_CACHE_PATH,
    secondCache,
  );
  assert.notEqual(firstCache, secondCache);
  const privateRoot = path.join(homedir(), '.tmp', 'vida-bun-cache');
  for (const cache of [firstCache, secondCache]) {
    const relative = path.relative(privateRoot, cache);
    assert.ok(relative !== '' && relative !== '..' && !relative.startsWith('..' + path.sep));
  }
});

test('inherited derived cache follows the actual copy while custom and disabled caches remain explicit', () => {
  const first = pinFixture('inherited'),
    second = pinFixture('actual-copy');
  const inherited = expectReturned(() => pinnedEnvironment(process.execPath, {}, first));
  assert.equal(
    expectReturned(() => pinnedEnvironment(process.execPath, inherited, second)).BUN_RUNTIME_TRANSPILER_CACHE_PATH,
    expectedCache(second),
  );
  const custom = path.join(scratch, 'caller-selected-cache');
  for (const selected of [custom, '0']) {
    const input = { BUN_RUNTIME_TRANSPILER_CACHE_PATH: selected, FIXTURE_VALUE: 'retained' };
    const actual = expectReturned(() => pinnedEnvironment(process.execPath, input, second));
    assert.equal(actual.BUN_RUNTIME_TRANSPILER_CACHE_PATH, selected);
    assert.equal(actual.FIXTURE_VALUE, input.FIXTURE_VALUE);
    assert.deepEqual(input, { BUN_RUNTIME_TRANSPILER_CACHE_PATH: selected, FIXTURE_VALUE: 'retained' });
  }
});

test('pinned launcher checks version then forwards one payload with unchanged argv cwd and exit', () => {
  const root = pinFixture('launcher'),
    calls: PinnedInvocation[] = [];
  const argv = ['fixture-entry.mjs', '--value', 'space and unicode: є', '--literal', '--not-a-flag'];
  const env = {
    PATH: 'fixture-path',
    FIXTURE_VALUE: 'retained',
    VIDA_COVERAGE_REVIEW_CLOCK_POLICY: 'forged caller clock claim',
  };
  const exit = expectReturned(() =>
    runPinnedBun(argv, {
      root,
      cwd: scratch,
      executable: process.execPath,
      env,
      spawn(command: string, args: readonly string[], options: PinnedInvocationOptions) {
        calls.push({ command, args, options });
        return { status: calls.length === 1 ? 0 : 23, signal: null, stdout: calls.length === 1 ? pin : '' };
      },
    }),
  );
  assert.equal(exit, 23);
  assert.equal(calls.length, 2);
  const versionCall = calls[0];
  const payloadCall = calls[1];
  assert.ok(versionCall);
  assert.ok(payloadCall);
  assert.deepEqual(versionCall.args, ['--version']);
  assert.equal(versionCall.command, process.execPath);
  assert.equal(payloadCall.command, process.execPath);
  assert.deepEqual(payloadCall.args, argv);
  assert.equal(payloadCall.options.cwd, scratch);
  assert.ok(payloadCall.options.env);
  const {
    VIDA_PINNED_COMMAND_BUDGET_MS: duration,
    VIDA_PINNED_COMMAND_DEADLINE_MS: expiry,
    VIDA_PIPELINE_DIAGNOSTICS: diagnostics,
    VIDA_COVERAGE_REVIEW_CLOCK_POLICY: reviewPolicy,
    ...forwardedEnvironment
  } = payloadCall.options.env;
  const expectedEnvironment = expectReturned(() => pinnedEnvironment(process.execPath, env, root));
  delete expectedEnvironment.VIDA_COVERAGE_REVIEW_CLOCK_POLICY;
  assert.equal(reviewPolicy, undefined);
  assert.deepEqual(forwardedEnvironment, expectedEnvironment);
  if (duration === undefined) {
    assert.equal(expiry, undefined);
    assert.equal(Object.hasOwn(payloadCall.options, 'timeout'), false);
  } else {
    assert.ok(Number.isSafeInteger(Number(duration)) && Number(duration) > 0);
    assert.equal(Number(duration), payloadCall.options.timeout);
    assert.ok(Number.isSafeInteger(Number(expiry)) && Number(expiry) > 0);
  }
  if (expiry !== undefined && process.env.VIDA_PINNED_COMMAND_DEADLINE_MS !== undefined)
    assert.ok(Number(expiry) <= Number(process.env.VIDA_PINNED_COMMAND_DEADLINE_MS));
  assert.equal(diagnostics, undefined);
  assert.equal(payloadCall.options.shell, undefined);
});

let copied: CopiedBundle | undefined;
function realCopy(): CopiedBundle {
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
  for (const name of ['bun.ts', 'run.ts'])
    writeFileSync(path.join(root, 'bin', name), readFileSync(path.join(source, 'bin', name)));
  symlinkSync(
    path.join(dependencies, 'node_modules'),
    path.join(parent, 'node_modules'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  copied = { parent, root };
  return copied;
}

function cleanEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, TEMP: scratch, TMP: scratch };
  delete env.BUN_RUNTIME_TRANSPILER_CACHE_PATH;
  return env;
}

test('actual direct Bun entrypoint terminates with strict public JSON when required arguments are invalid', () => {
  const { root, parent } = realCopy();
  const result = spawnSync(process.execPath, [path.join(root, 'bin/run.ts'), '--invalid-fixture-argument'], {
    cwd: parent,
    env: cleanEnv(),
    encoding: 'utf8',
    windowsHide: true,
    timeout: 30000,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.signal, null);
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.ok(typeof result.stderr === 'string');
  assert.ok(result.stderr.endsWith('\n'), 'completed CLI failure must include its full newline-terminated output');
  const failure: unknown = JSON.parse(result.stderr.slice(0, -1));
  if (!isRunFailureProjection(failure))
    throw new TypeError('direct Bun failure output must contain the asserted JSON fields');
  assert.equal(failure.schema, 'VidaAgentRunResult/v1');
  assert.equal(failure.status, 'blocked');
  assert.equal(failure.code, 'GAP-VIDA-RUN-CLI-001');
  assert.equal(typeof failure.message, 'string');
  // Terminal output proves the direct route returns; exact child count is not asserted.
}, 45000);

test('actual direct run help completes from its metadata-only closure', () => {
  const { root, parent } = realCopy();
  const result = spawnSync(process.execPath, [path.join(root, 'bin/run.ts'), '--help'], {
    cwd: parent,
    env: cleanEnv(),
    encoding: 'utf8',
    windowsHide: true,
    timeout: 4000,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.signal, null);
  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  assert.ok(typeof result.stdout === 'string');
  assert.ok(result.stdout.endsWith('\n'), 'completed help must include its full newline-terminated output');
  const help: unknown = JSON.parse(result.stdout.slice(0, -1));
  assert.ok(isRunHelp(help), 'run help must be a typed public metadata record');
  assert.equal(help.schema, 'VidaAgentCommandResult/v1');
  assert.equal(help.status, 'help');
  assert.equal(help.command, 'run');
  assert.equal(existsSync(path.join(parent, '.agent')), false);
  assert.equal(existsSync(path.join(parent, '.vida')), false);
});

test('actual Bun wrapper routes embedded markers to the selected root and cache namespace', () => {
  const { root, parent } = realCopy();
  const program = `console.log(JSON.stringify({
  runtime: process.versions.bun,
  root: process.env.VIDA_STANDALONE_ROOT,
  executable: process.env.VIDA_STANDALONE_EXECUTABLE,
  cache: process.env.BUN_RUNTIME_TRANSPILER_CACHE_PATH
}));`;
  const result = spawnSync(process.execPath, [path.join(root, 'bin/bun.ts'), '-e', program], {
    cwd: parent,
    env: {
      ...cleanEnv(),
      BUN_BE_BUN: '1',
      VIDA_STANDALONE_ROOT: root,
      VIDA_STANDALONE_EXECUTABLE: process.execPath,
    },
    encoding: 'utf8',
    windowsHide: true,
    timeout: 4000,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.signal, null);
  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  assert.ok(typeof result.stdout === 'string');
  assert.ok(result.stdout.endsWith('\n'), 'embedded child must complete its JSON output line');
  const child: unknown = JSON.parse(result.stdout.slice(0, -1));
  assert.ok(typeof child === 'object' && child !== null && !Array.isArray(child));
  assert.equal(Reflect.get(child, 'runtime'), pin);
  assert.equal(Reflect.get(child, 'root'), root);
  assert.equal(Reflect.get(child, 'executable'), process.execPath);
  assert.equal(Reflect.get(child, 'cache'), expectedCache(root));
});

test('imported run entrypoint leaves cache selection and execution untouched', () => {
  const { root, parent } = realCopy();
  const moduleUrl = pathToFileURL(path.join(root, 'bin/run.ts')).href;
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
  assert.equal(result.signal, null);
  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  assert.ok(typeof result.stdout === 'string');
  assert.ok(result.stdout.endsWith('\n'), 'successful child must complete its single JSON output line');
  const payload: unknown = JSON.parse(result.stdout.slice(0, -1));
  assert.deepEqual(payload, { status: 'pass', run_export: true, cache_unchanged: true });
}, 45000);
