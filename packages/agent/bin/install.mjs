import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { checkManifest, findNpmCli, readPin, runPinnedBun, standaloneRuntime } from './bun.mjs';

const bundleRoot = fileURLToPath(new URL('../', import.meta.url));
const protectedFiles = ['package.json', 'bun.lock', '.bun-version', 'bin/bun.mjs', 'bin/init.mjs', 'bin/install.mjs'];
const stableVersion = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function packedLockfilePath(root) {
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

export function readPortableLock(root = bundleRoot) {
  const file = path.join(root, packedLockfilePath(root));
  const info = lstatSync(file);
  if (!info.isFile() || info.isSymbolicLink() || info.nlink !== 1)
    throw new Error('Installer lockfile must be a regular unlinked file.');
  return readFileSync(file);
}

function directoryChain(directory) {
  for (let current = path.resolve(directory); ; current = path.dirname(current)) {
    const stat = lstatSync(current);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Installer requires non-link directories.');
    if (current === path.dirname(current)) return;
  }
}

function snapshot(root) {
  directoryChain(root);
  return protectedFiles
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

function argumentsFor(args, _root) {
  const values = { projects: [] };
  let check = false;
  for (let index = 0; index < args.length; index++) {
    const key = args[index];
    if (key === '--check' && !check) {
      check = true;
      continue;
    }
    if (
      !['--project-root', '--repository', '--project'].includes(key) ||
      (key !== '--project' && Object.hasOwn(values, key)) ||
      !args[index + 1]
    ) {
      throw new Error(
        'Usage: install.mjs [--check | --project-root ABSOLUTE_PATH --repository SLUG --project PROJECT_ID=RELATIVE_ROOT [--project PROJECT_ID=RELATIVE_ROOT]]',
      );
    }
    if (key === '--project') values.projects.push(args[++index]);
    else values[key] = args[++index];
  }
  const count = Object.keys(values).length - 1;
  if (
    (check && (count || values.projects.length)) ||
    ((count || values.projects.length) && (count !== 2 || !values.projects.length))
  )
    throw new Error('Initialization arguments must be all present, without --check.');
  if (count) {
    const projectRoot = values['--project-root'];
    if (!path.isAbsolute(projectRoot) || path.resolve(projectRoot) !== projectRoot) {
      throw new Error('Initialization requires a canonical absolute project root.');
    }
    if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(values['--repository'] ?? '')) {
      throw new Error('Repository must be a lowercase slug of 1–64 characters.');
    }
    const projects = values.projects;
    if (
      projects.length === 0 ||
      !projects.every((entry) => /^[a-z0-9][a-z0-9-]{0,63}(?:=[^\\/=][^\\]*)?$/.test(entry)) ||
      new Set(projects.map((entry) => entry.split('=', 1)[0])).size !== projects.length ||
      (projects.length > 1 && projects.some((entry) => !entry.includes('=')))
    ) {
      throw new Error('Projects must be unique lowercase slugs of 1–64 characters.');
    }
    directoryChain(projectRoot);
  }
  return {
    check,
    init: count
      ? [
          '--project-root',
          values['--project-root'],
          '--repository',
          values['--repository'],
          ...values.projects.flatMap((entry) => ['--project', entry]),
        ]
      : [],
  };
}

function requireSuccess(result, label) {
  if (result.error || result.signal || result.status !== 0) {
    const error = new Error(label + ' failed.');
    error.exitCode = Number.isInteger(result.status) && result.status > 0 ? result.status : 1;
    throw error;
  }
}

export function install(args, options = {}) {
  const embedded = standaloneRuntime();
  const root = path.resolve(options.root ?? embedded?.root ?? bundleRoot);
  if (embedded && root !== embedded.root) throw new Error('Embedded installer package root differs.');
  const { check, init } = argumentsFor(args, root);
  const before = snapshot(root);
  const manifest = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
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
      let status;
      try {
        status = runPinnedBun([path.join(root, 'bin/init.mjs'), ...init], {
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
  const nodeVersion = options.nodeVersion ?? process.versions.node;
  if (!stableVersion.test(manifest.engines?.node ?? '') || nodeVersion !== manifest.engines.node) {
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
    throw new Error('npm version must satisfy package.json engines.npm: ' + manifest.engines.npm);
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
  const bunOptions = {
    root,
    cwd: root,
    npmCli,
    node,
    executable: options.bunExecutable,
    timeoutMs: options.bunTimeoutMs ?? 300_000,
  };
  let status;
  unchanged();
  if (init.length) {
    try {
      status = run([path.join(root, 'bin/init.mjs'), ...init], bunOptions);
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
    console.log(JSON.stringify(install(process.argv.slice(2))));
  } catch (error) {
    console.error(error.message);
    process.exitCode = error.exitCode ?? 1;
  }
}
