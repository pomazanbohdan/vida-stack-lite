import { projectMappings } from './project-mapping-contract.ts';
import { cliCommandContracts } from './cli-command-contracts.ts';
import { installerProtectedFiles } from './cli-metadata.ts';
export { installerProtectedFiles } from './cli-metadata.ts';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { checkManifest, findNpmCli, readPin, runPinnedBun, standaloneRuntime } from './bun.ts';

const bundleRoot = fileURLToPath(new URL('../', import.meta.url));

const stableVersion = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

/** @param {string} root */
function packedLockfilePath(root: string): string {
  directoryChain(root);
  const lockfile = path.join(root, 'bun.lock');
  if (lstatSync(lockfile, { throwIfNoEntry: false })) return 'bun.lock';
  const embedded = path.join(root, 'dist', 'portable', 'bun.lock');
  directoryChain(path.dirname(embedded));
  const stat = lstatSync(embedded, { throwIfNoEntry: false });
  if (!stat?.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) {
    throw new Error('Portable bundle is missing its lockfile.');
  }
  return 'dist/portable/bun.lock';
}

/** @param {string} [root] @returns {Buffer} */
export function readPortableLock(root: string = bundleRoot): Buffer {
  const file = path.join(root, packedLockfilePath(root));
  const info = lstatSync(file);
  if (!info.isFile() || info.isSymbolicLink() || info.nlink !== 1)
    throw new Error('Installer lockfile must be a regular unlinked file.');
  return readFileSync(file);
}

/** @param {string} directory */
function directoryChain(directory: string): void {
  for (let current = path.resolve(directory); ; current = path.dirname(current)) {
    const stat = lstatSync(current);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Installer requires non-link directories.');
    if (current === path.dirname(current)) return;
  }
}

/** @param {string} root */
function snapshot(root: string): string {
  directoryChain(root);
  return installerProtectedFiles
    .map((relative) => {
      const file = path.join(root, relative === 'bun.lock' ? packedLockfilePath(root) : relative);
      directoryChain(path.dirname(file));
      const stat = lstatSync(file);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) {
        throw new Error('Installer input must be a regular unlinked file: ' + relative);
      }
      return createHash('sha256').update(readFileSync(file)).digest('hex');
    })
    .join(':');
}

interface InstallEngines {
  node?: string;
  npm?: string;
}
interface InstallManifest {
  engines?: InstallEngines;
  dependencies?: Record<string, string>;
}

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** @param {unknown} value @returns {value is Record<string, string>} */
function isStringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((entry) => typeof entry === 'string');
}

/** @param {string} root @returns {unknown} */
function readManifestValue(root: string): unknown {
  /** @type {unknown} */
  const value: unknown = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  return value;
}

/** @param {unknown} value @returns {InstallEngines|undefined} */
function readManifestEngines(value: unknown): InstallEngines | undefined {
  if (!isRecord(value)) return undefined;
  const rawEngines = value.engines;
  if (rawEngines === undefined) return undefined;
  if (!isRecord(rawEngines)) throw new Error('package.json engines must contain an object.');
  if (
    (rawEngines.node !== undefined && typeof rawEngines.node !== 'string') ||
    (rawEngines.npm !== undefined && typeof rawEngines.npm !== 'string')
  ) {
    throw new Error('package.json engines.node and engines.npm must be strings.');
  }
  return {
    ...(typeof rawEngines.node === 'string' ? { node: rawEngines.node } : {}),
    ...(typeof rawEngines.npm === 'string' ? { npm: rawEngines.npm } : {}),
  };
}

/** @param {unknown} value @returns {Record<string, string>|undefined} */
function readManifestDependencies(value: unknown): Record<string, string> | undefined {
  if (!isRecord(value)) return undefined;
  const dependencies = value.dependencies;
  if (dependencies === undefined) return undefined;
  if (!isStringRecord(dependencies))
    throw new Error('package.json dependencies must map package names to version strings.');
  return dependencies;
}

/** @param {string} root @returns {InstallManifest} */
function readInstallManifest(root: string): InstallManifest {
  const value = readManifestValue(root);
  if (!isRecord(value)) throw new Error('package.json must contain an object.');
  const engines = readManifestEngines(value);
  const dependencies = readManifestDependencies(value);
  return {
    ...(engines ? { engines } : {}),
    ...(dependencies ? { dependencies } : {}),
  };
}

interface InstallValues {
  projects: string[];
  '--project-root'?: string;
  '--repository'?: string;
}
interface InstallArguments {
  check: boolean;
  init: string[];
}
type InstallOption = (typeof cliCommandContracts.install.options)[number];

const installOptionsByName = new Map<string, InstallOption>(
  cliCommandContracts.install.options.map((option) => [option.name, option]),
);

function invalidInstallArguments(): Error {
  return new Error(`Usage: ${cliCommandContracts.install.syntax}`);
}

/** @param {InstallValues} values @param {string} key @param {string|undefined} value @param {InstallOption|undefined} option */
function recordInstallOption(
  values: InstallValues,
  key: string,
  value: string | undefined,
  option: InstallOption | undefined,
): void {
  if (option?.arity !== 1 || (!option.repeatable && Object.hasOwn(values, key)) || !value)
    throw invalidInstallArguments();
  if (option.repeatable) values.projects.push(value);
  else if (key === '--project-root' || key === '--repository') values[key] = value;
  else throw invalidInstallArguments();
}

/** @param {readonly string[]} args */
function collectInstallArguments(args: readonly string[]): { values: InstallValues; check: boolean } {
  const values = { projects: [] };
  let check = false;
  for (let index = 0; index < args.length; index++) {
    const key = args[index] ?? '';
    const option = installOptionsByName.get(key);
    if (option?.arity === 0) {
      if (check) throw invalidInstallArguments();
      check = true;
      continue;
    }
    recordInstallOption(values, key, args[index + 1], option);
    index += 1;
  }
  return { values, check };
}

/** @param {InstallValues} values @param {boolean} check */
function validateInstallCombination(values: InstallValues, check: boolean): number {
  const count = Object.keys(values).length - 1;
  const hasInitialization = count > 0 || values.projects.length > 0;
  if ((check && hasInitialization) || (hasInitialization && (count !== 2 || values.projects.length === 0))) {
    throw new Error('Initialization arguments must be all present, without --check.');
  }
  return count;
}

/** @param {InstallValues} values */
function requireInstallProjectRoot(values: InstallValues): string {
  const projectRoot = values['--project-root'];
  if (!projectRoot || !path.isAbsolute(projectRoot) || path.resolve(projectRoot) !== projectRoot)
    throw new Error('Initialization requires a canonical absolute project root.');
  return projectRoot;
}

/** @param {InstallValues} values */
function validateInstallIdentity(values: InstallValues): void {
  requireInstallProjectRoot(values);
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(values['--repository'] ?? ''))
    throw new Error('Repository must be a lowercase slug of 1–64 characters.');
}

/** @param {InstallValues} values @param {number} count */
function validateInstallInitialization(values: InstallValues, count: number): void {
  if (!count) return;
  validateInstallIdentity(values);
  projectMappings(values.projects);
  directoryChain(requireInstallProjectRoot(values));
}

/** @param {InstallValues} values @param {number} count */
function initializationArgv(values: InstallValues, count: number): string[] {
  if (!count) return [];
  const projectRoot = values['--project-root'];
  const repository = values['--repository'];
  if (!projectRoot || !repository) throw new Error('Initialization arguments must be all present, without --check.');
  return [
    '--project-root',
    projectRoot,
    '--repository',
    repository,
    ...values.projects.flatMap((entry) => ['--project', entry]),
  ];
}

/** @param {readonly string[]} args @returns {InstallArguments} */
function argumentsFor(args: readonly string[]): InstallArguments {
  const { values, check } = collectInstallArguments(args);
  const count = validateInstallCombination(values, check);
  validateInstallInitialization(values, count);
  return { check, init: initializationArgv(values, count) };
}

/** @param {number | null} status @returns {number} */
function failedProcessExitCode(status: number | null): number {
  return typeof status === 'number' && Number.isInteger(status) && status > 0 ? status : 1;
}

/** @param {{error?: Error|null, signal?: NodeJS.Signals|null, status: number|null}} result @param {string} label */
function requireSuccess(
  result: { error?: Error | null; signal?: NodeJS.Signals | null; status: number | null },
  label: string,
): void {
  if (result.error || result.signal || result.status !== 0) {
    throw Object.assign(new Error(label + ' failed.'), {
      exitCode: failedProcessExitCode(result.status),
    });
  }
}

/** @param {string} root @param {string} npmCli @param {string} node @param {string|undefined} executable @param {number} timeoutMs @returns {Parameters<typeof runPinnedBun>[1]} */
function installBunOptions(
  root: string,
  npmCli: string,
  node: string,
  executable: string | undefined,
  timeoutMs: number,
): Parameters<typeof runPinnedBun>[1] {
  return {
    root,
    cwd: root,
    npmCli,
    node,
    ...(executable === undefined ? {} : { executable }),
    timeoutMs,
  };
}

interface InstallOptions {
  root?: string;
  nodeVersion?: string;
  node?: string;
  spawn?: typeof spawnSync;
  runBun?: typeof runPinnedBun;
  bunExecutable?: string;
  bunTimeoutMs?: number;
  env?: NodeJS.ProcessEnv;
}

/** @param {readonly string[]} args @param {InstallOptions} [options] */
export function install(args: readonly string[], options: InstallOptions = {}): Record<string, unknown> {
  const embedded = standaloneRuntime();
  const root = path.resolve(options.root ?? embedded?.root ?? bundleRoot);
  if (embedded && root !== embedded.root) throw new Error('Embedded installer package root differs.');
  const { check, init } = argumentsFor(args);
  const before = snapshot(root);
  const manifest = readInstallManifest(root);
  if (embedded) {
    const unchanged = () => {
      if (snapshot(root) !== before) throw new Error('Installer inputs changed; stop and reconcile before retrying.');
    };
    unchanged();
    if (check)
      return {
        status: 'prerequisites_valid',
        bun_pin: readPin(root),
        runtime: 'embedded',
        initialization: 'not_requested',
      };
    if (init.length) {
      let status: number;
      try {
        status = runPinnedBun([path.join(root, 'bin/init.ts'), ...init], {
          root,
          cwd: root,
          executable: embedded.executable,
        });
      } finally {
        unchanged();
      }
      requireSuccess({ status }, 'Project initialization');
    }
    return {
      status: 'embedded_runtime_valid',
      bun_pin: readPin(root),
      initialization: init.length ? 'delegated_successfully' : 'not_requested',
      runtime_activation: 'not_performed',
    };
  }
  if (options.node === undefined && options.nodeVersion === undefined) {
    const pin = readPin(root);
    checkManifest(root, pin);
    const bunVersion = process.versions.bun;
    if (bunVersion !== pin) {
      throw new Error(`Bun version must equal package.json and .bun-version: ${pin}`);
    }
    const executable = options.bunExecutable ?? process.execPath;
    if (!path.isAbsolute(executable)) throw new Error('Bun executable must be an absolute path.');
    const unchanged = () => {
      if (snapshot(root) !== before) throw new Error('Installer inputs changed; stop and reconcile before retrying.');
    };
    unchanged();
    if (check)
      return {
        status: 'prerequisites_valid',
        bun: bunVersion,
        bun_executable: process.execPath,
        bun_pin: pin,
        runtime: 'bun',
        bun_resolution: 'not_checked',
        dependencies: 'not_checked',
        initialization: 'not_requested',
      };
    const run = options.runBun ?? runPinnedBun;
    const bunOptions: Parameters<typeof runPinnedBun>[1] = {
      root,
      cwd: root,
      executable,
      timeoutMs: options.bunTimeoutMs ?? 300_000,
      ...(options.spawn ? { spawn: options.spawn } : {}),
      ...(options.env ? { env: options.env } : {}),
    };
    const resolutionProgram =
      "import { statSync } from 'node:fs'; import { fileURLToPath } from 'node:url'; for (const dependency of JSON.parse(process.argv[1])) { if (!statSync(fileURLToPath(import.meta.resolve(dependency))).isFile()) throw new Error('Dependency entrypoint must be a file.'); }";
    const dependencyCheck = run(
      [
        '--no-env-file',
        '--no-install',
        `--config=${path.join(root, 'bunfig.toml')}`,
        '--eval',
        resolutionProgram,
        JSON.stringify(Object.keys(manifest.dependencies ?? {})),
      ],
      bunOptions,
    );
    requireSuccess({ status: dependencyCheck }, 'Bun dependency entrypoint check');
    unchanged();
    if (init.length) {
      let status: number;
      try {
        status = run([path.join(root, 'bin/init.ts'), ...init], bunOptions);
      } finally {
        unchanged();
      }
      requireSuccess({ status }, 'Project initialization');
    }
    return {
      status: 'bun_dependencies_valid',
      bun_pin: pin,
      initialization: init.length ? 'delegated_successfully' : 'not_requested',
      runtime_activation: 'not_performed',
    };
  }
  const nodeVersion = options.nodeVersion ?? process.versions.node;
  if (!stableVersion.test(manifest.engines?.node ?? '') || nodeVersion !== manifest.engines?.node) {
    throw new Error('Node version must equal package.json engines.node: ' + manifest.engines?.node);
  }
  const npmMajor = /^(0|[1-9]\d*)\.x$/.exec(manifest.engines?.npm ?? '');
  if (!npmMajor) throw new Error('package.json engines.npm must declare one major as N.x.');
  const pin = readPin(root);
  checkManifest(root, pin);
  const node = options.node ?? process.execPath;
  const npmCli = findNpmCli(node);
  const probe = (options.spawn ?? spawnSync)(node, [npmCli, '--version'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 30_000,
    windowsHide: true,
  });
  requireSuccess(probe, 'Node-adjacent npm prerequisite check');
  const npmVersion = String(probe.stdout ?? '').trim();
  if (!stableVersion.test(npmVersion) || npmVersion.split('.')[0] !== npmMajor[1]) {
    throw new Error('npm version must satisfy package.json engines.npm: ' + manifest.engines?.npm);
  }
  const unchanged = () => {
    if (snapshot(root) !== before) throw new Error('Installer inputs changed; stop and reconcile before retrying.');
  };
  unchanged();
  if (check)
    return {
      status: 'prerequisites_valid',
      node: nodeVersion,
      npm: npmVersion,
      bun_pin: pin,
      bun_resolution: 'not_checked',
      dependencies: 'not_checked',
      initialization: 'not_requested',
    };
  const dependencyCheck = spawnSync(
    node,
    [
      '--input-type=module',
      '--eval',
      "import { statSync } from 'node:fs'; import { fileURLToPath } from 'node:url'; for (const dependency of JSON.parse(process.argv[1])) { if (!statSync(fileURLToPath(import.meta.resolve(dependency))).isFile()) throw new Error('Dependency entrypoint must be a file.'); }",
      JSON.stringify(Object.keys(manifest.dependencies ?? {})),
    ],
    { cwd: root, encoding: 'utf8', timeout: 30_000, windowsHide: true },
  );
  if (dependencyCheck.error || dependencyCheck.signal || dependencyCheck.status !== 0)
    throw new Error(
      'Cannot find module for a declared npm dependency: ' +
        String(dependencyCheck.stderr || dependencyCheck.error?.message || 'dependency resolution failed').slice(
          0,
          1024,
        ),
    );
  const run = options.runBun ?? runPinnedBun;
  const bunOptions = installBunOptions(root, npmCli, node, options.bunExecutable, options.bunTimeoutMs ?? 300_000);
  let status: number;
  unchanged();
  if (init.length) {
    try {
      status = run([path.join(root, 'bin/init.ts'), ...init], bunOptions);
    } finally {
      unchanged();
    }
    requireSuccess({ status }, 'Project initialization');
  }
  return {
    status: 'npm_dependencies_valid',
    bun_pin: pin,
    initialization: init.length ? 'delegated_successfully' : 'not_requested',
    runtime_activation: 'not_performed',
  };
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    if (process.argv[2] === '--help') {
      const { cliMetadataResult } = await import('./cli-metadata.ts');
      console.log(JSON.stringify(cliMetadataResult(['install', '--help'], {})));
      process.exit(0);
    }
    console.log(JSON.stringify(install(process.argv.slice(2))));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode =
      error instanceof Error && 'exitCode' in error && typeof error.exitCode === 'number' ? error.exitCode : 1;
  }
}
