#!/usr/bin/env node
import {
  existsSync,
  lstatSync,
  realpathSync,
  readFileSync,
  readdirSync,
  mkdirSync,
  copyFileSync,
  writeFileSync,
  renameSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolvePinnedBun, runPinnedBun, readPin, checkManifest } from './bun.mjs';
import { readPortableLock } from './install.mjs';
import { assertRuntimePackageExports, runtimeExecutableInventory } from '../tooling/maintained-source-inventory.mjs';

const executingRoot = realpathSync(path.resolve(import.meta.dirname, '..'));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const entryArguments = (root) => [
  '--no-env-file',
  '--no-install',
  '--config=' + path.join(root, 'bunfig.toml'),
  path.join(root, 'bin/development-controller.mjs'),
];
const record = (value) => JSON.stringify(value) + '\n';
function stageMarker(stage,event,started) {
  if(process.env.VIDA_CONTROLLER_DIAGNOSTICS==='true') process.stderr.write(record({schema:'DevelopmentControllerStage/v1',stage,event,elapsed_ms:Date.now()-started}));
}

const commands = new Set(['run', 'scope', 'init', 'documentation-clear', 'reconcile-artifacts']);
function canonicalDirectory(value) {
  if (!path.isAbsolute(value ?? '') || path.resolve(value) !== value || realpathSync(value) !== value)
    throw new Error('Controller paths must be canonical absolute physical directories.');
  let current = value;
  for (;;) {
    const info = lstatSync(current);
    if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('Controller path contains a linked directory.');
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return value;
}
function contained(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative));
}
function targetRoot(value) {
  canonicalDirectory(value);
  if (existsSync(path.join(value, '.agent/active-runtime-selector.v1.json')))
    throw new Error('Development controller rejects an active-selector target.');
  return value;
}
function packageIdentity(root) {
  const manifest = JSON.parse(readFileSync(path.join(root, 'package.json')));
  const candidate = JSON.parse(readFileSync(path.join(executingRoot, 'package.json')));
  if (
    candidate.name !== 'vida-agent' ||
    !/^\d+\.\d+\.\d+$/.test(candidate.version) ||
    manifest.name !== candidate.name ||
    manifest.version !== candidate.version
  )
    throw new Error('Development controller requires the actual current vida-agent candidate package.');
  checkManifest(root, readPin(root));
  if (readPin(root) !== '1.4.2') throw new Error('Development controller Bun pin differs.');
  assertRuntimePackageExports(root);
  return manifest;
}
function cleanEnvironment() {
  const env = { ...process.env };
  for (const key of Object.keys(env))
    if (
      ['NODE_OPTIONS', 'BUN_OPTIONS', 'VIDA_STANDALONE_ROOT', 'VIDA_STANDALONE_EXECUTABLE', 'BUN_BE_BUN'].includes(
        key.toUpperCase(),
      )
    )
      delete env[key];
  return env;
}
/** Bounded failure evidence; never include child arguments or environment. */
export function developmentControllerChildDiagnostic(result, elapsedMs) {
  const sanitize = (value) => {
    const raw = String(value ?? '');
    const clean = raw
      .replace(/(Bearer\s+)[^\s"']+/gi, '$1[redacted]')
      .replace(/((?:password|secret|token|api[_-]?key)\s*[=:]\s*["']?)[^\s,"'\r\n]+/gi, '$1[redacted]')
      .replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/gi, '$1[redacted]@');
    return { text: clean.slice(0, 4096), truncated: clean.length > 4096 };
  };
  return {
    status: result.status ?? null,
    signal: result.signal ?? null,
    elapsed_ms: Math.max(0, Math.round(elapsedMs)),
    stdout: sanitize(result.stdout),
    stderr: sanitize(result.stderr),
    error: result.error ? sanitize(result.error.message) : null,
    outcome: 'child_failure_effects_unknown',
  };
}
function invoke(executable, root, args, cwd = root, additionalEnv = {}) {
  const started = performance.now();
  const result = spawnSync(
    executable,
    ['--no-env-file', '--no-install', '--config=' + path.join(root, 'bunfig.toml'), ...args],
    { cwd, env: { ...cleanEnvironment(), ...additionalEnv }, encoding: 'utf8', windowsHide: true, timeout: 120000, maxBuffer: 8 * 1024 * 1024 },
  );
  if (result.error || result.status !== 0)
    throw new Error('Development controller child failed: ' + record(developmentControllerChildDiagnostic(result, performance.now() - started)).trim());
  return result.stdout;
}
function fileEntries(root, relative, result = [], links = []) {
  const absolute = path.join(root, relative),
    info = lstatSync(absolute);
  if (info.isSymbolicLink()) {
    const actual = realpathSync(absolute);
    if (!contained(root, actual)) throw new Error('Controller dependency link escapes its package.');
    links.push({
      path: relative.replaceAll(path.sep, '/'),
      target: path.relative(root, actual).replaceAll(path.sep, '/'),
    });
    return result;
  }
  if (info.isDirectory())
    for (const item of readdirSync(absolute).sort()) fileEntries(root, path.join(relative, item), result, links);
  else if (info.isFile()) {
    if (relative.startsWith('node_modules' + path.sep) && /(?:\.map|\.d\.(?:ts|mts|cts))$/.test(relative))
      return result;
    const bytes = readFileSync(absolute);
    result.push({ path: relative.replaceAll(path.sep, '/'), bytes: bytes.length, sha256: hash(bytes) });
  } else throw new Error('Controller has an unsupported filesystem entry.');
  return result;
}
function snapshot(root) {
  packageIdentity(root);
  readPortableLock(root);
  const roots = [
    'bin',
    'src',
    'dist',
    'schemas',
    'instructions',
    'templates',
    'tooling',
    'node_modules',
    'package.json',
    ...(existsSync(path.join(root, 'bun.lock')) ? ['bun.lock'] : []),
    '.bun-version',
    'bunfig.toml',
    'TESTING.md',
  ];
  const links = [],
    files = roots.flatMap((relative) => fileEntries(root, relative, [], links));
  return { files, links, digest: hash(record({ files, links })), runtime_paths: runtimeExecutableInventory(root) };
}
async function targetIdentity(root, packageRoot = executingRoot) {
  const { loadRuntimeConfig } = await import(
    pathToFileURL(path.join(packageRoot, 'src/config/runtime-config.ts')).href
  );
  const config = loadRuntimeConfig(root);
  if (config.runtime.bundle !== 'packages/agent')
    throw new Error('Development controller is restricted to the Source logical packages/agent bundle.');
  return {
    repository_id: config.repository.repository_id,
    project_ids: config.projects.map((p) => p.project_id).sort(),
    bundle: config.runtime.bundle,
  };
}
function save(file, value) {
  const pending = file + '.' + randomUUID() + '.pending';
  writeFileSync(pending, record(value), { flag: 'wx' });
  renameSync(pending, file);
}
export async function prepareDevelopmentController({ target, controllerRoot }) {
  targetRoot(target);
  canonicalDirectory(path.dirname(controllerRoot));
  if (
    !path.isAbsolute(controllerRoot) ||
    path.resolve(controllerRoot) !== controllerRoot ||
    contained(target, controllerRoot) ||
    contained(controllerRoot, target) ||
    existsSync(controllerRoot)
  )
    throw new Error('Controller destination must be new and outside the editable target.');
  packageIdentity(executingRoot);
  const lockBytes = readPortableLock(executingRoot);
  const identity = await targetIdentity(target),
    executable = resolvePinnedBun({ root: executingRoot }),
    started = Date.now();
  mkdirSync(controllerRoot);
  const root = path.join(controllerRoot, 'package');
  mkdirSync(root);
  const roots = [
    'bin',
    'src',
    'dist',
    'schemas',
    'instructions',
    'templates',
    'tooling',
    'package.json',
    ...(existsSync(path.join(executingRoot, 'bun.lock')) ? ['bun.lock'] : []),
    '.bun-version',
    'bunfig.toml',
    'TESTING.md',
  ];
  const files = roots.flatMap((relative) => fileEntries(executingRoot, relative));
  for (const file of files) {
    const destination = path.join(root, file.path);
    mkdirSync(path.dirname(destination), { recursive: true });
    copyFileSync(path.join(executingRoot, file.path), destination);
    if (
      hash(readFileSync(destination)) !== file.sha256 ||
      hash(readFileSync(path.join(executingRoot, file.path))) !== file.sha256
    )
      throw new Error('Executing package changed during construction.');
  }
  if (!readPortableLock(executingRoot).equals(lockBytes))
    throw new Error('Executing package lock changed during construction.');
  writeFileSync(path.join(root, 'bun.lock'), lockBytes);
  const engine = path.join(controllerRoot, process.platform === 'win32' ? 'bun.exe' : 'bun');
  copyFileSync(executable, engine);
  const installStarted=Date.now();stageMarker('install','start',installStarted);
  invoke(engine, root, ['install', '--frozen-lockfile', '--ignore-scripts', '--production', '--backend=copy']);
  stageMarker('install','end',installStarted);
  if (!readPortableLock(root).equals(lockBytes)) throw new Error('Frozen controller lock changed during installation.');
  const snapshotStarted=Date.now();stageMarker('snapshot','start',snapshotStarted);
  const packageBinding=snapshot(root);stageMarker('snapshot','end',snapshotStarted);
  const state = {
    schema: 'VidaDevelopmentController/v1',
    controller_root: controllerRoot,
    entrypoint: path.join(root, 'bin/development-controller.mjs'),
    invocation: { executable: engine, args: entryArguments(root) },
    status: 'prepared',
    target,
    identity,
    package_root: root,
    engine,
    engine_sha256: hash(readFileSync(engine)),
    package_binding: packageBinding,
    elapsed_ms: Date.now() - started,
  };
  save(path.join(controllerRoot, 'controller.json'), state);
  return state;
}
export async function inspectDevelopmentController({ controllerRoot }) {
  try {
    canonicalDirectory(controllerRoot);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    throw new Error('Development controller root is unavailable.', { cause: error });
  }
  const state = JSON.parse(readFileSync(path.join(controllerRoot, 'controller.json')));
  const keys = [
    'schema',
    'controller_root',
    'entrypoint',
    'invocation',
    'status',
    'target',
    'identity',
    'package_root',
    'engine',
    'engine_sha256',
    'package_binding',
    'elapsed_ms',
    'qualification',
  ];
  if (
    Object.keys(state).some((key) => !keys.includes(key)) ||
    state.schema !== 'VidaDevelopmentController/v1' ||
    state.controller_root !== controllerRoot ||
    state.entrypoint !== path.join(controllerRoot, 'package/bin/development-controller.mjs') ||
    record(state.invocation) !== record({ executable: state.engine, args: entryArguments(state.package_root) }) ||
    !['prepared', 'ready'].includes(state.status) ||
    state.package_root !== path.join(controllerRoot, 'package') ||
    state.engine !== path.join(controllerRoot, process.platform === 'win32' ? 'bun.exe' : 'bun')
  )
    throw new Error('Controller operational metadata differs.');
  targetRoot(state.target);
  canonicalDirectory(state.package_root);
  if (
    contained(state.target, controllerRoot) ||
    contained(controllerRoot, state.target) ||
    hash(readFileSync(state.engine)) !== state.engine_sha256 ||
    snapshot(state.package_root).digest !== state.package_binding.digest
  )
    throw new Error('Controller integrity drifted.');
  if (record(await targetIdentity(state.target)) !== record(state.identity))
    throw new Error('Controller target identity differs.');
  return state;
}
export async function verifyDevelopmentController({ controllerRoot }) {
  const started = Date.now(),
    state = await inspectDevelopmentController({ controllerRoot });
  const output = invoke(
    state.engine,
    state.package_root,
    [path.join(state.package_root, 'tooling/development-controller-qualification.mjs')],
    controllerRoot,
    { VIDA_CONTROLLER_QUALIFICATION_TARGET: state.target, VIDA_CONTROLLER_QUALIFICATION_BINDING: state.package_binding.digest },
  );
  const qualification = JSON.parse(output.trim().split(/\r?\n/).at(-1));
  if (
    qualification.schema !== 'DevelopmentControllerQualification/v1' ||
    qualification.status !== 'pass' ||
    qualification.package_binding !== state.package_binding.digest
  )
    throw new Error('Controller qualification did not establish the current package.');
  await inspectDevelopmentController({ controllerRoot });
  if (
    typeof qualification.fixture_root !== 'string' ||
    path.dirname(qualification.fixture_root) !== controllerRoot ||
    !path.basename(qualification.fixture_root).startsWith('qualification-')
  )
    throw new Error('Qualification fixture ownership differs.');
  const { rm } = await import('node:fs/promises');
  await rm(qualification.fixture_root, { recursive: true, force: true });
  const ready = { ...state, status: 'ready', qualification, elapsed_ms: Date.now() - started };
  save(path.join(controllerRoot, 'controller.json'), ready);
  return ready;
}
export async function executeDevelopmentController({ controllerRoot, command, args = [] }) {
  const state = await inspectDevelopmentController({ controllerRoot });
  if (
    state.status !== 'ready' ||
    state.qualification?.package_binding !== state.package_binding.digest ||
    !commands.has(command)
  )
    throw new Error('A qualified controller and supported target command are required.');
  const roots = args.flatMap((value, index) => (value === '--project-root' ? [args[index + 1]] : []));
  if (roots.length !== 1 || roots[0] !== state.target)
    throw new Error('Controlled execution requires the exact original target.');
  return invoke(
    state.engine,
    state.package_root,
    [path.join(state.package_root, 'bin', command + '.mjs'), ...args],
    state.target,
  );
}
export function developmentControllerBinding(root) {
  return snapshot(root).digest;
}
async function main(args) {
  if (!['prepare', 'inspect', 'verify', 'exec'].includes(args[0]))
    throw new Error(
      'development-controller prepare --target ABS --controller-root NEW_ABS | inspect|verify --controller-root ABS | exec --controller-root ABS -- COMMAND --project-root EXACT_TARGET ...',
    );
  const action = args.shift(),
    options = {};
  while (args.length && args[0] !== '--') {
    const key = args.shift(),
      value = args.shift();
    if (!['--target', '--controller-root'].includes(key) || !value || Object.hasOwn(options, key))
      throw new Error('Invalid controller option.');
    options[key] = value;
  }
  const input = { target: options['--target'], controllerRoot: options['--controller-root'] };
  if (action === 'exec') {
    if (args.shift() !== '--') throw new Error('Controlled command separator missing.');
    if (args[0] === 'vida-agent') args.shift();
    process.stdout.write(await executeDevelopmentController({ ...input, command: args.shift(), args }));
    return;
  }
  if (args.length) throw new Error('Unexpected controller arguments.');
  const result = await {
    prepare: prepareDevelopmentController,
    inspect: inspectDevelopmentController,
    verify: verifyDevelopmentController,
  }[action](input);
  process.stdout.write(record({schema:result.schema,status:result.status,controller_root:result.controller_root,target:result.target,next_action:result.status==='prepared'?'verify':'exec',qualification:result.qualification?{status:result.qualification.status,checks:result.qualification.checks}:undefined}));
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  if (typeof Bun === 'undefined')
    process.exitCode = runPinnedBun([fileURLToPath(import.meta.url), ...process.argv.slice(2)]);
  else
    main(process.argv.slice(2)).catch((error) => {
      process.stderr.write(
        record({ status: 'blocked', code: 'GAP-DEVELOPMENT-CONTROLLER-001', message: error.message }),
      );
      process.exitCode = 1;
    });
}
