#!/usr/bin/env node
import { developmentControllerContract } from './cli-command-contracts.ts';
import { cliCommandEntrypoint } from './cli-metadata.ts';
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
import { resolvePinnedBun, runPinnedBun, readPin, checkManifest } from './bun.mjs';
import { invokeObservedControllerChild } from './development-controller-observation.mjs';
import { readPortableLock } from './install.mjs';
import { assertRuntimePackageExports, runtimeExecutableInventory } from '../tooling/maintained-source-inventory.ts';

/** @typedef {{ readonly path: string; readonly bytes: number; readonly sha256: string }} FileEntry */
/** @typedef {{ readonly path: string; readonly target: string }} LinkEntry */
/** @typedef {{ readonly files: FileEntry[]; readonly links: LinkEntry[]; readonly digest: string; readonly runtime_paths: readonly string[] }} PackageBinding */
/** @typedef {{ readonly status: number | null; readonly signal: NodeJS.Signals | null; readonly stdout: Buffer | Uint8Array | string | null; readonly stderr: Buffer | Uint8Array | string | null; readonly error?: unknown; readonly observation_complete?: boolean }} ChildResult */
/** @typedef {{ readonly schema: 'DevelopmentControllerQualification/v1'; readonly status: string; readonly package_binding: string; readonly checks: readonly unknown[]; readonly fixture_root: string }} Qualification */
/** @typedef {{ readonly schema: 'VidaDevelopmentController/v1'; readonly controller_root: string; readonly entrypoint: string; readonly invocation: { readonly executable: string; readonly args: string[] }; readonly status: 'prepared' | 'ready'; readonly target: string; readonly identity: { readonly repository_id: string; readonly project_ids: string[]; readonly bundle: string }; readonly package_root: string; readonly engine: string; readonly engine_sha256: string; readonly package_binding: PackageBinding; readonly elapsed_ms: number; readonly qualification?: Qualification }} ControllerState */
/** @typedef {{ readonly target?: string; readonly controllerRoot: string }} ControllerInput */
/** @typedef {{ readonly controllerRoot: string; readonly command: string; readonly args?: string[] }} ExecuteInput */
/** @typedef {{ readonly required: string[]; readonly options: string[] }} ModeContract */
/** @typedef {'prepare' | 'inspect' | 'verify' | 'exec'} ControllerAction */
/** @typedef {{ readonly name?: unknown; readonly version?: unknown }} PackageManifest */
/** @typedef {typeof import('../src/config/runtime-config.ts')} RuntimeConfigModule */

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** @param {unknown} value @returns {value is FileEntry} */
function isFileEntry(value) {
  return (
    isRecord(value) &&
    typeof value.path === 'string' &&
    typeof value.bytes === 'number' &&
    Number.isSafeInteger(value.bytes) &&
    value.bytes >= 0 &&
    typeof value.sha256 === 'string'
  );
}

/** @param {unknown} value @returns {value is LinkEntry} */
function isLinkEntry(value) {
  return isRecord(value) && typeof value.path === 'string' && typeof value.target === 'string';
}

/** @param {unknown} value @returns {value is PackageBinding} */
function isPackageBinding(value) {
  return (
    isRecord(value) &&
    Array.isArray(value.files) &&
    value.files.every(isFileEntry) &&
    Array.isArray(value.links) &&
    value.links.every(isLinkEntry) &&
    typeof value.digest === 'string' &&
    /^[a-f0-9]{64}$/.test(value.digest) &&
    Array.isArray(value.runtime_paths) &&
    value.runtime_paths.every((entry) => typeof entry === 'string')
  );
}

/** @param {unknown} value @returns {value is Qualification} */
function isQualification(value) {
  return (
    isRecord(value) &&
    value.schema === 'DevelopmentControllerQualification/v1' &&
    typeof value.status === 'string' &&
    typeof value.package_binding === 'string' &&
    typeof value.fixture_root === 'string' &&
    Array.isArray(value.checks)
  );
}

/** @param {unknown} value */
function isControllerInvocation(value) {
  return (
    isRecord(value) &&
    typeof value.executable === 'string' &&
    Array.isArray(value.args) &&
    value.args.every((arg) => typeof arg === 'string')
  );
}

/** @param {unknown} value */
function isControllerIdentity(value) {
  return (
    isRecord(value) &&
    typeof value.repository_id === 'string' &&
    Array.isArray(value.project_ids) &&
    value.project_ids.every((id) => typeof id === 'string') &&
    typeof value.bundle === 'string'
  );
}

/** @param {Record<string, unknown>} value */
function hasControllerStateFields(value) {
  return hasControllerOperationalFields(value) && hasControllerRuntimeFields(value);
}

/** @param {Record<string, unknown>} value */
function hasControllerOperationalFields(value) {
  return (
    value.schema === 'VidaDevelopmentController/v1' &&
    typeof value.controller_root === 'string' &&
    typeof value.entrypoint === 'string' &&
    (value.status === 'prepared' || value.status === 'ready') &&
    typeof value.target === 'string'
  );
}

/** @param {Record<string, unknown>} value */
function hasControllerRuntimeFields(value) {
  return (
    typeof value.package_root === 'string' &&
    typeof value.engine === 'string' &&
    typeof value.engine_sha256 === 'string' &&
    isPackageBinding(value.package_binding) &&
    typeof value.elapsed_ms === 'number' &&
    Number.isFinite(value.elapsed_ms) &&
    (value.qualification === undefined || isQualification(value.qualification))
  );
}

/** @param {unknown} value @returns {value is ControllerState} */
function isControllerState(value) {
  return (
    isRecord(value) &&
    hasControllerStateFields(value) &&
    isControllerInvocation(value.invocation) &&
    isControllerIdentity(value.identity)
  );
}

/** @param {unknown} value @param {unknown} candidate */
function packageIdentityMatches(value, candidate) {
  return (
    isPackageManifest(value) &&
    isPackageManifest(candidate) &&
    value.name === 'vida-agent' &&
    typeof value.version === 'string' &&
    /^\d+\.\d+\.\d+$/.test(value.version) &&
    candidate.name === value.name &&
    candidate.version === value.version
  );
}

/** @param {unknown} value @returns {value is ControllerAction} */
function isControllerAction(value) {
  return value === 'prepare' || value === 'inspect' || value === 'verify' || value === 'exec';
}

/** @param {Record<string, string>} options @param {string} key */
function requiredOption(options, key) {
  const value = options[key];
  if (!value) throw new Error('Required controller option is missing.');
  return value;
}

/** @param {unknown} value @returns {value is PackageManifest} */
function isPackageManifest(value) {
  return (
    isRecord(value) &&
    (value.name === undefined || typeof value.name === 'string') &&
    (value.version === undefined || typeof value.version === 'string')
  );
}

/** @param {string} file @returns {ControllerState} */
function readControllerState(file) {
  /** @type {unknown} */
  const raw = JSON.parse(readFileSync(file, 'utf8'));
  if (!isControllerState(raw)) throw new Error('Controller operational metadata is malformed.');
  return raw;
}

/** @param {unknown} error */
function isMissingPathError(error) {
  return isRecord(error) && error.code === 'ENOENT';
}

/** @param {string} output @returns {Qualification} */
function readQualification(output) {
  /** @type {unknown} */
  const value = JSON.parse(output.trim().split(/\r?\n/).at(-1) ?? '');
  if (!isQualification(value)) throw new Error('Controller qualification metadata is malformed.');
  return value;
}

/** @param {Qualification} qualification @param {ControllerState} state */
function requireMatchingQualification(qualification, state) {
  if (
    qualification.schema !== 'DevelopmentControllerQualification/v1' ||
    qualification.status !== 'pass' ||
    qualification.package_binding !== state.package_binding.digest
  )
    throw new Error('Controller qualification did not establish the current package.');
}

/** @param {unknown} value @returns {string} */
function errorMessage(value) {
  return value instanceof Error ? value.message : typeof value === 'string' ? value : 'Unknown failure';
}

const executingRoot = realpathSync(path.resolve(import.meta.dirname, '..'));
/** @param {Uint8Array} bytes */
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
/** @param {string} root */
const entryArguments = (root) => [
  '--no-env-file',
  '--no-install',
  '--config=' + path.join(root, 'bunfig.toml'),
  path.join(root, 'bin/development-controller.mjs'),
];
/** @param {unknown} value */
const record = (value) => JSON.stringify(value) + '\n';
/** @param {string} stage @param {string} event @param {number} started */
function stageMarker(stage, event, started) {
  if (process.env.VIDA_CONTROLLER_DIAGNOSTICS === 'true')
    process.stderr.write(
      record({ schema: 'DevelopmentControllerStage/v1', stage, event, elapsed_ms: Date.now() - started }),
    );
}

const commands = new Set(developmentControllerContract.targetCommands);
const qualificationChildren = Object.freeze([
  'qualifier-repair-inspect',
  'qualifier-repair-plan',
  'qualifier-repair-apply',
]);
/** @param {string} value @returns {string} */
function canonicalDirectory(value) {
  if (!path.isAbsolute(value) || path.resolve(value) !== value || realpathSync(value) !== value)
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
/** @param {string} parent @param {string} child */
function contained(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative));
}
/** @param {string} value */
function targetRoot(value) {
  canonicalDirectory(value);
  if (existsSync(path.join(value, '.agent/active-runtime-selector.v1.json')))
    throw new Error('Development controller rejects an active-selector target.');
  return value;
}
/** @param {string} root */
function packageIdentity(root) {
  /** @type {unknown} */
  const manifestValue = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  /** @type {unknown} */
  const candidateValue = JSON.parse(readFileSync(path.join(executingRoot, 'package.json'), 'utf8'));
  if (!isPackageManifest(manifestValue) || !isPackageManifest(candidateValue))
    throw new Error('Development controller package manifest is malformed.');
  const manifest = manifestValue,
    candidate = candidateValue;
  if (!packageIdentityMatches(candidate, manifest))
    throw new Error('Development controller requires the actual current vida-agent candidate package.');
  checkManifest(root, readPin(root));
  if (readPin(root) !== '1.4.2') throw new Error('Development controller Bun pin differs.');
  assertRuntimePackageExports(root);
  return manifest;
}
/** @returns {NodeJS.ProcessEnv} */
function cleanEnvironment() {
  const env = { ...process.env };
  for (const key of Object.keys(env))
    if (
      ['NODE_OPTIONS', 'BUN_OPTIONS', 'VIDA_STANDALONE_ROOT', 'VIDA_STANDALONE_EXECUTABLE', 'BUN_BE_BUN'].includes(
        key.toUpperCase(),
      ) ||
      key.toUpperCase().startsWith('VIDA_CONTROLLER_OBSERVATION_')
    )
      delete env[key];
  return env;
}
/** Bounded failure evidence; never include child arguments or environment. */
/** @param {ChildResult} result @param {number} elapsedMs */
export function developmentControllerChildDiagnostic(result, elapsedMs) {
  /** @param {unknown} value */
  const sanitize = (value) => {
    const raw = renderDiagnosticValue(value);
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
    error: childErrorDiagnostic(result.error, sanitize),
    outcome: 'child_failure_effects_unknown',
  };
}
/** @param {unknown} error @param {(value: unknown) => {text: string; truncated: boolean}} sanitize */
function childErrorDiagnostic(error, sanitize) {
  if (!error) return null;
  return sanitize(isRecord(error) && typeof error.message === 'string' ? error.message : error);
}
/** @param {unknown} value */
function renderDiagnosticValue(value) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}
/** @param {Buffer | Uint8Array | string | null} value */
function capturedOutputText(value) {
  if (Buffer.isBuffer(value)) return value.toString('utf8');
  if (typeof value === 'string') return value;
  return value ? Buffer.from(value).toString('utf8') : '';
}
/** @param {{ readonly executable: string; readonly packageRoot: string; readonly args: string[]; readonly controllerRoot: string; readonly cwd?: string; readonly additionalEnv?: NodeJS.ProcessEnv; readonly nestedChildren?: readonly string[] }} input */
function invoke({
  executable,
  packageRoot,
  args,
  controllerRoot,
  cwd = packageRoot,
  additionalEnv = {},
  nestedChildren = [],
}) {
  const started = performance.now();
  /** @type {ChildResult} */
  const result = invokeObservedControllerChild({
    controllerRoot,
    executable,
    args: ['--no-env-file', '--no-install', '--config=' + path.join(packageRoot, 'bunfig.toml'), ...args],
    cwd,
    env: { ...cleanEnvironment(), ...additionalEnv },
    timeout: 120000,
    maxBuffer: 8 * 1024 * 1024,
    nestedChildren,
  });
  if (result.error || result.status !== 0)
    throw new Error(
      'Development controller child failed: ' +
        record(developmentControllerChildDiagnostic(result, performance.now() - started)).trim(),
    );
  if (!result.observation_complete) throw new Error('Development controller child observation is incomplete.');
  return capturedOutputText(result.stdout);
}
/** @param {string} root @param {string} relative @param {FileEntry[]} [result] @param {LinkEntry[]} [links] @returns {FileEntry[]} */
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
/** @param {string} root @returns {PackageBinding} */
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
  /** @type {LinkEntry[]} */
  const links = [],
    files = roots.flatMap((relative) => fileEntries(root, relative, [], links));
  return {
    files,
    links,
    digest: hash(Buffer.from(record({ files, links }))),
    runtime_paths: runtimeExecutableInventory(root),
  };
}
/** @param {string} root */
async function targetIdentity(root) {
  const runtimeConfig = /** @type {RuntimeConfigModule} */ (
    await import(pathToFileURL(path.join(executingRoot, 'src/config/runtime-config.ts')).href)
  );
  const config = runtimeConfig.loadRuntimeConfig(root);
  if (config.runtime.bundle !== 'packages/agent')
    throw new Error('Development controller is restricted to the Source logical packages/agent bundle.');
  return {
    repository_id: config.repository.repository_id,
    project_ids: config.projects.map((p) => p.project_id).sort(),
    bundle: config.runtime.bundle,
  };
}
/** @param {string} file @param {unknown} value */
function save(file, value) {
  const pending = file + '.' + randomUUID() + '.pending';
  writeFileSync(pending, record(value), { flag: 'wx' });
  renameSync(pending, file);
}
/** @param {{ readonly target: string; readonly controllerRoot: string }} input */
/** @param {{ readonly target: string; readonly controllerRoot: string }} input @returns {Promise<ControllerState>} */
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
  const installStarted = Date.now();
  stageMarker('install', 'start', installStarted);
  invoke({
    executable: engine,
    packageRoot: root,
    args: ['install', '--frozen-lockfile', '--ignore-scripts', '--production', '--backend=copyfile'],
    controllerRoot,
  });
  stageMarker('install', 'end', installStarted);
  if (!readPortableLock(root).equals(lockBytes)) throw new Error('Frozen controller lock changed during installation.');
  const snapshotStarted = Date.now();
  stageMarker('snapshot', 'start', snapshotStarted);
  const packageBinding = snapshot(root);
  stageMarker('snapshot', 'end', snapshotStarted);
  /** @type {ControllerState} */
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
/** @param {{ readonly controllerRoot: string }} input @returns {Promise<ControllerState>} */
export async function inspectDevelopmentController({ controllerRoot }) {
  try {
    canonicalDirectory(controllerRoot);
  } catch (error) {
    if (!isMissingPathError(error)) throw error;
    throw new Error('Development controller root is unavailable.', { cause: error });
  }
  const state = readControllerState(path.join(controllerRoot, 'controller.json'));
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
/** @param {{ readonly controllerRoot: string }} input */
/** @param {{ readonly controllerRoot: string }} input @returns {Promise<ControllerState>} */
export async function verifyDevelopmentController({ controllerRoot }) {
  const started = Date.now(),
    state = await inspectDevelopmentController({ controllerRoot });
  const output = invoke({
    executable: state.engine,
    packageRoot: state.package_root,
    args: [path.join(state.package_root, 'tooling/development-controller-qualification.mjs')],
    controllerRoot,
    cwd: controllerRoot,
    additionalEnv: {
      VIDA_CONTROLLER_QUALIFICATION_TARGET: state.target,
      VIDA_CONTROLLER_QUALIFICATION_BINDING: state.package_binding.digest,
    },
    nestedChildren: qualificationChildren,
  });
  const qualification = readQualification(output);
  requireMatchingQualification(qualification, state);
  await inspectDevelopmentController({ controllerRoot });
  if (
    typeof qualification.fixture_root !== 'string' ||
    path.dirname(qualification.fixture_root) !== controllerRoot ||
    !path.basename(qualification.fixture_root).startsWith('qualification-')
  )
    throw new Error('Qualification fixture ownership differs.');
  const { rm } = await import('node:fs/promises');
  await rm(qualification.fixture_root, { recursive: true, force: true });
  /** @type {ControllerState} */
  const ready = { ...state, status: 'ready', qualification, elapsed_ms: Date.now() - started };
  save(path.join(controllerRoot, 'controller.json'), ready);
  return ready;
}
/** @param {ExecuteInput} input */
export async function executeDevelopmentController({ controllerRoot, command, args = [] }) {
  const state = await inspectDevelopmentController({ controllerRoot });
  if (
    state.status !== 'ready' ||
    state.qualification?.package_binding !== state.package_binding.digest ||
    !commands.has(command)
  )
    throw new Error('A qualified controller and supported target command are required.');
  const roots = args.flatMap((value, index) =>
    isProjectRootArgument(value, args[index + 1]) ? [args[index + 1]] : [],
  );
  if (roots.length !== 1 || roots[0] !== state.target)
    throw new Error('Controlled execution requires the exact original target.');
  return invoke({
    executable: state.engine,
    packageRoot: state.package_root,
    args: [path.join(state.package_root, 'bin', cliCommandEntrypoint(command)), ...args],
    controllerRoot,
    cwd: state.target,
  });
}
/** @param {string} value @param {string | undefined} next */
function isProjectRootArgument(value, next) {
  return value === '--project-root' && next !== undefined;
}
/** @param {string} root */
export function developmentControllerBinding(root) {
  return snapshot(root).digest;
}
/** @param {string[]} args */
function parseControllerCli(args) {
  const action = args.shift();
  if (!isControllerAction(action) || !Object.hasOwn(developmentControllerContract.modes, action))
    throw new Error(
      'development-controller prepare --target ABS --controller-root NEW_ABS | inspect|verify --controller-root ABS | exec --controller-root ABS -- COMMAND --project-root EXACT_TARGET ...',
    );
  /** @type {Record<string, string>} */
  const options = {};
  while (args.length) {
    const nextArgument = args.at(0);
    if (nextArgument === '--') break;
    const key = args.shift(),
      value = args.shift();
    if (
      key === undefined ||
      value === undefined ||
      !Object.values(developmentControllerContract.modes).some((mode) => mode.options.includes(key)) ||
      !value ||
      Object.hasOwn(options, key)
    )
      throw new Error('Invalid controller option.');
    options[key] = value;
  }
  validateControllerOptions(developmentControllerContract.modes[action], options);
  return { action, options, args };
}

/** @param {string[]} args */
async function main(args) {
  const { action, options, args: commandArgs } = parseControllerCli(args);
  const input = { target: options['--target'], controllerRoot: requiredOption(options, '--controller-root') };
  if (action === 'exec') {
    if (commandArgs.shift() !== '--') throw new Error('Controlled command separator missing.');
    const executionArgs = commandArgs;
    if (executionArgs[0] === 'vida-agent') executionArgs.shift();
    const command = executionArgs.shift();
    if (!command) throw new Error('Controlled command is missing.');
    process.stdout.write(
      await executeDevelopmentController({ controllerRoot: input.controllerRoot, command, args: executionArgs }),
    );
    return;
  }
  if (commandArgs.length) throw new Error('Unexpected controller arguments.');
  const result =
    action === 'prepare'
      ? await prepareDevelopmentController({
          target: requiredOption(options, '--target'),
          controllerRoot: input.controllerRoot,
        })
      : action === 'inspect'
        ? await inspectDevelopmentController(input)
        : action === 'verify'
          ? await verifyDevelopmentController(input)
          : (() => {
              throw new Error('Controller action is not valid here.');
            })();
  process.stdout.write(
    record({
      schema: result.schema,
      status: result.status,
      controller_root: result.controller_root,
      target: result.target,
      next_action: result.status === 'prepared' ? 'verify' : 'exec',
      qualification: result.qualification
        ? { status: result.qualification.status, checks: result.qualification.checks }
        : undefined,
    }),
  );
}

/** @param {{required: string[], options: string[]}} modeContract @param {Record<string, string>} options */
/** @param {ModeContract} modeContract @param {Record<string, string>} options */
function validateControllerOptions(modeContract, options) {
  if (modeContract.required.some((key) => !options[key])) throw new Error('Required controller option is missing.');
  if (Object.keys(options).some((key) => !modeContract.options.includes(key)))
    throw new Error('Controller option is not supported for this mode.');
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  if (typeof Bun === 'undefined')
    process.exitCode = runPinnedBun([fileURLToPath(import.meta.url), ...process.argv.slice(2)]);
  else
    main(process.argv.slice(2)).catch((/** @type {unknown} */ error) => {
      process.stderr.write(
        record({ status: 'blocked', code: 'GAP-DEVELOPMENT-CONTROLLER-001', message: errorMessage(error) }),
      );
      process.exitCode = 1;
    });
}
