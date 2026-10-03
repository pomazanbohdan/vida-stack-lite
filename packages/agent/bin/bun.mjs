import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const bundleRoot = fileURLToPath(new URL('../', import.meta.url));

// These markers select an already materialized executable payload, never authority.
export function standaloneRuntime(env = process.env) {
  const root = env.VIDA_STANDALONE_ROOT;
  const executable = env.VIDA_STANDALONE_EXECUTABLE;
  if (root === undefined && executable === undefined) return null;
  if (
    process.versions.bun !== '1.4.2' ||
    env.BUN_BE_BUN !== '1' ||
    typeof root !== 'string' ||
    !path.isAbsolute(root) ||
    path.resolve(root) !== root ||
    typeof executable !== 'string' ||
    !path.isAbsolute(executable) ||
    realpathSync(executable) !== realpathSync(process.execPath)
  )
    throw new Error('Embedded runtime markers do not match the executing pinned Bun payload.');
  for (let current = root; ; current = path.dirname(current)) {
    const info = lstatSync(current);
    if (!info.isDirectory() || info.isSymbolicLink())
      throw new Error('Embedded package root must be a non-link directory.');
    if (current === path.dirname(current)) break;
  }
  const manifest = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  if (manifest.name !== 'vida-agent') throw new Error('Embedded package identity differs.');
  const pin = readPin(root);
  checkManifest(root, pin);
  if (pin !== process.versions.bun) throw new Error('Embedded runtime pin differs.');
  return { root, executable: realpathSync(executable) };
}

export function standaloneEnvironment(env = process.env) {
  const runtime = standaloneRuntime(env);
  if (!runtime) return { ...env };
  const next = { ...env };
  for (const key of Object.keys(next))
    if (['NODE_OPTIONS', 'BUN_OPTIONS'].includes(key.toUpperCase())) delete next[key];
  next.BUN_BE_BUN = '1';
  return next;
}

export function readPin(root = bundleRoot) {
  const file = path.join(root, '.bun-version');
  const identity = lstatSync(file);
  if (!identity.isFile() || identity.isSymbolicLink()) throw new Error('Bun pin must be a regular non-link file.');
  const pin = readFileSync(file, 'utf8').trim();
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(pin)) {
    throw new Error('.bun-version must contain one exact stable Bun version.');
  }
  return pin;
}

export function checkManifest(root, pin) {
  const manifest = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  if (manifest.packageManager !== `bun@${pin}` || manifest.engines?.bun !== pin) {
    throw new Error('Bun manifest mirrors differ from .bun-version; run node bin/bun.mjs --sync-pin.');
  }
}

export function syncPin(root = bundleRoot) {
  const pin = readPin(root);
  const file = path.join(root, 'package.json');
  let ancestor = path.resolve(root);
  for (;;) {
    if (lstatSync(ancestor).isSymbolicLink()) throw new Error('Bun manifest root contains a symbolic link.');
    const parent = path.dirname(ancestor);
    if (parent === ancestor) break;
    ancestor = parent;
  }
  const identity = lstatSync(file);
  if (!identity.isFile() || identity.isSymbolicLink()) throw new Error('Bun manifest must be a regular file.');
  const before = readFileSync(file, 'utf8');
  const manifest = JSON.parse(before);
  if (manifest.packageManager === `bun@${pin}` && manifest.engines?.bun === pin) return false;
  manifest.packageManager = `bun@${pin}`;
  manifest.engines = { ...manifest.engines, bun: pin };
  const after = `${JSON.stringify(manifest, null, 2)}\n`;
  const temporary = path.join(root, `.bun-pin-${randomUUID()}.tmp`);
  let descriptor;
  try {
    descriptor = openSync(temporary, 'wx', identity.mode & 0o777);
    writeFileSync(descriptor, before.includes('\r\n') ? after.replaceAll('\n', '\r\n') : after);
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    const current = lstatSync(file);
    if (
      !current.isFile() ||
      current.isSymbolicLink() ||
      current.dev !== identity.dev ||
      current.ino !== identity.ino ||
      readFileSync(file, 'utf8') !== before ||
      readPin(root) !== pin
    ) {
      throw new Error('Bun pin or manifest changed during synchronization; retry against the current files.');
    }
    renameSync(temporary, file);
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
    if (existsSync(temporary)) unlinkSync(temporary);
  }
  return true;
}

export function findNpmCli(node = process.execPath) {
  const directory = path.dirname(realpathSync(node));
  const candidates = [
    path.join(directory, 'node_modules/npm/bin/npm-cli.js'),
    path.resolve(directory, '../lib/node_modules/npm/bin/npm-cli.js'),
    path.resolve(directory, '../share/nodejs/npm/bin/npm-cli.js'),
  ];
  const found = candidates.find(
    (file) => file && path.basename(file) === 'npm-cli.js' && existsSync(file) && statSync(file).isFile(),
  );
  if (!found) throw new Error('Pinned Bun bootstrap requires Node.js with npm installed.');
  return found;
}

function succeeded(result, label) {
  if (result.error || result.signal || result.status !== 0) {
    const diagnostic = result.timedOut
      ? ` Timed out after ${result.timeoutMs} ms${result.cleanupAttempted ? '; process-tree cleanup was attempted' : ''}. Cleanup outcome: ${result.cleanupOutcome ?? 'unknown'}.`
      : '';
    const error = new Error(`${label} failed${result.signal ? ` (${result.signal})` : ''}.${diagnostic}`);
    error.exitCode = Number.isInteger(result.status) && result.status > 0 ? result.status : 1;
    error.timedOut = result.timedOut ?? false;
    throw error;
  }
  return String(result.stdout ?? '').trim();
}

function cleanupTimedOutProcessTree(result, cleanup = defaultTimeoutCleanup) {
  if (!result?.pid) return { attempted: false, outcome: 'unknown' };
  try {
    const observation = cleanup(result.pid, result.cleanupTimeoutMs ?? 30_000);
    const outcome =
      observation?.error || observation?.signal || (Number.isInteger(observation?.status) && observation.status !== 0)
        ? 'failed'
        : observation?.status === 0
          ? 'command_succeeded'
          : 'unknown';
    return { attempted: true, outcome, status: observation?.status, error_code: observation?.error?.code };
  } catch (error) {
    return { attempted: true, outcome: 'failed', error_code: error.code };
  }
}

function defaultTimeoutCleanup(pid, timeout = 30_000) {
  if (process.platform === 'win32') {
    return spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], {
      windowsHide: true,
      stdio: 'ignore',
      timeout,
    });
  }
  process.kill(-pid, 'SIGKILL');
  return undefined; // A sent signal is not observed process-tree termination.
}

function executionCeiling(env) {
  const duration = env.VIDA_PINNED_COMMAND_BUDGET_MS;
  const expiry = env.VIDA_PINNED_COMMAND_DEADLINE_MS;
  for (const value of [duration, expiry])
    if (value !== undefined && (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))))
      throw new Error('Invalid inherited pinned command budget.');
  return {
    duration: duration === undefined ? Infinity : Number(duration),
    expiry: expiry === undefined ? Infinity : Number(expiry),
  };
}
const inherited = executionCeiling(process.env);
const inheritedDeadline = performance.now() + Math.min(inherited.duration, inherited.expiry - Date.now());

export function executionBudget(timeoutMs = Infinity, reserveMs = 1_000, parentDeadline = Infinity) {
  if (
    !(Number.isSafeInteger(timeoutMs) || timeoutMs === Infinity) ||
    timeoutMs <= 0 ||
    !Number.isSafeInteger(reserveMs) ||
    reserveMs < 0 ||
    !(Number.isFinite(parentDeadline) || parentDeadline === Infinity)
  )
    throw new Error('Execution budget and reserve must be bounded integer durations.');
  const deadline = Math.min(performance.now() + timeoutMs, inheritedDeadline, parentDeadline);
  return {
    deadline,
    remaining(maximum = timeoutMs) {
      if (!(Number.isSafeInteger(maximum) || maximum === Infinity) || maximum <= 0)
        throw new Error('Child allowance must be a positive integer duration.');
      const remaining = Math.floor(Math.min(maximum, deadline - performance.now() - reserveMs));
      if (remaining <= 0) throw new Error('Execution budget exhausted before child launch.');
      return remaining;
    },
    cleanupTimeout() {
      // The existing reserve covers both cleanup and reporting. Cleanup cannot
      // spend the report half, even when the child returns after its allowance.
      if (reserveMs === 0) return Math.max(0, Math.floor(deadline - performance.now()));
      return Math.max(
        0,
        Math.min(Math.floor(reserveMs / 2), Math.floor(deadline - performance.now() - Math.ceil(reserveMs / 2))),
      );
    },
    child(duration, reserve = 1_000) {
      return executionBudget(duration, reserve, deadline - reserveMs);
    },
  };
}

export function boundedSpawnSync(spawn, command, args, options, label, cleanup = defaultTimeoutCleanup) {
  const { budget, diagnostics = false, timeout = Infinity, ...spawnOptions } = options;
  if (!(Number.isSafeInteger(timeout) || timeout === Infinity) || timeout <= 0)
    throw new Error('Child allowance must be a positive integer duration.');
  const environment = options.env ?? process.env;
  const ceiling = executionCeiling(environment);
  const allowance = Math.min(
    timeout,
    ceiling.duration,
    ceiling.expiry - Date.now(),
    inheritedDeadline - performance.now(),
  );
  if (allowance <= 0) throw new Error('Execution budget exhausted before child launch.');
  const timeoutMs = budget ? budget.remaining(Math.floor(allowance)) : Math.floor(allowance);
  const started = performance.now();
  const result = spawn(command, args, {
    ...spawnOptions,
    env: {
      ...environment,
      ...(Number.isFinite(timeoutMs)
        ? {
            VIDA_PINNED_COMMAND_BUDGET_MS: String(timeoutMs),
            VIDA_PINNED_COMMAND_DEADLINE_MS: String(Math.min(ceiling.expiry, inherited.expiry, Date.now() + timeoutMs)),
          }
        : {}),
    },
    ...(Number.isFinite(timeoutMs) ? { timeout: timeoutMs } : {}),
    killSignal: 'SIGKILL',
    detached: process.platform !== 'win32',
  });
  result.childElapsedMs = performance.now() - started;
  if (result?.error?.code === 'ETIMEDOUT') {
    result.timedOut = true;
    result.timeoutMs = timeoutMs;
    result.cleanupTimeoutMs = budget ? Math.min(30_000, budget.cleanupTimeout()) : 30_000;
    const cleanupStarted = performance.now();
    const observation =
      result.cleanupTimeoutMs > 0
        ? cleanupTimedOutProcessTree(result, cleanup)
        : { attempted: false, outcome: 'unknown' };
    result.cleanupAttempted = observation.attempted;
    result.cleanupOutcome = observation.outcome;
    result.cleanupStatus = observation.status;
    result.cleanupErrorCode = observation.error_code;
    result.cleanupElapsedMs = performance.now() - cleanupStarted;
    result.diagnosticLabel = label;
  }
  result.elapsedMs = performance.now() - started;
  if (diagnostics)
    process.stderr.write(
      JSON.stringify({
        stage: label,
        elapsed_ms: performance.now() - started,
        child_elapsed_ms: result.childElapsedMs,
        cleanup_elapsed_ms: result.cleanupElapsedMs ?? null,
        cleanup_allowance_ms: result.cleanupTimeoutMs ?? null,
        timeout_ms: Number.isFinite(timeoutMs) ? timeoutMs : null,
        status: result.status,
        signal: result.signal,
        timed_out: result.timedOut ?? false,
        cleanup_outcome: result.cleanupOutcome ?? null,
        cleanup_status: result.cleanupStatus ?? null,
        cleanup_error_code: result.cleanupErrorCode ?? null,
        error_code: result.error?.code ?? null,
      }) + '\n',
    );
  return result;
}

export function commandOutcomeUnknown(result) {
  return (
    !result ||
    result.timedOut === true ||
    Boolean(result.error) ||
    Boolean(result.signal) ||
    !Number.isSafeInteger(result.status) ||
    result.status < 0
  );
}

export function requireTerminalCommand(result, label) {
  if (commandOutcomeUnknown(result))
    throw new Error(
      `${label}: uncertain command outcome ${JSON.stringify({
        status: result?.status ?? null,
        signal: result?.signal ?? null,
        error_code: result?.error?.code ?? null,
        timed_out: result?.timedOut ?? false,
        timeout_ms: result?.timeoutMs ?? null,
        cleanup_outcome: result?.cleanupOutcome ?? null,
        cleanup_status: result?.cleanupStatus ?? null,
        cleanup_error_code: result?.cleanupErrorCode ?? null,
      })}`,
    );
  return result;
}

export function pinnedEnvironment(executable, env = process.env, root = bundleRoot) {
  const next = standaloneEnvironment(env);
  const canonical = realpathSync(root);
  const pin = readPin(canonical);
  const inheritedCache = env.BUN_RUNTIME_TRANSPILER_CACHE_PATH;
  // Derived namespaces follow the actual copy. Explicit custom paths and Bun's
  // supported "0" disable setting remain caller-selected; no cache is cleared.
  const inheritedDefault =
    typeof inheritedCache === 'string' &&
    /[\\/]\.tmp[\\/]vida-bun-cache[\\/][^\\/]+[\\/]\d+\.\d+\.\d+$/.test(inheritedCache);
  if (!inheritedCache || inheritedDefault)
    next.BUN_RUNTIME_TRANSPILER_CACHE_PATH = path.join(
      canonical.split(path.sep).includes('node_modules') ? homedir() : path.dirname(canonical),
      '.tmp',
      'vida-bun-cache',
      canonical.split(path.sep).includes('node_modules')
        ? canonical
            .split(path.sep)
            .filter(Boolean)
            .map((part) => part.replaceAll(':', ''))
            .join('-')
        : path.basename(canonical),
      pin,
    );
  const keys = Object.keys(env).filter((name) =>
    process.platform === 'win32' ? name.toUpperCase() === 'PATH' : name === 'PATH',
  );
  const key = keys.includes('PATH') ? 'PATH' : (keys[0] ?? 'PATH');
  for (const duplicate of keys) delete next[duplicate];
  let commandDirectory = path.dirname(executable);
  // npm can name the native Linux executable bun.exe. Its verified .bin/bun
  // alias lets nested shell commands keep using the same exact executable.
  const npmCommandDirectory = path.resolve(commandDirectory, '../../.bin');
  const npmCommand = path.join(npmCommandDirectory, process.platform === 'win32' ? 'bun.exe' : 'bun');
  try {
    if (realpathSync(npmCommand) === realpathSync(executable)) commandDirectory = npmCommandDirectory;
  } catch {
    /* Non-npm executables retain their own command directory. */
  }
  next[key] = `${commandDirectory}${path.delimiter}${env[key] ?? ''}`;
  return next;
}

export function resolvePinnedBun(options = {}) {
  const embedded = standaloneRuntime(options.env ?? process.env);
  if (embedded) {
    if (options.root && realpathSync(options.root) !== embedded.root)
      throw new Error('Embedded runtime package root differs.');
    if (options.executable && realpathSync(options.executable) !== embedded.executable)
      throw new Error('Embedded runtime executable differs.');
    return embedded.executable;
  }
  const root = options.root ?? bundleRoot;
  const pin = readPin(root);
  checkManifest(root, pin);
  const spawn = options.spawn ?? spawnSync;
  const env = options.env ?? process.env;
  const node = options.node ?? process.execPath;
  const cleanup = options.cleanup ?? defaultTimeoutCleanup;
  if (!options.executable) {
    const keys = Object.keys(env).filter((key) =>
      process.platform === 'win32' ? key.toUpperCase() === 'PATH' : key === 'PATH',
    );
    const pathKey = keys.includes('PATH') ? 'PATH' : keys[0];
    const extensionKeys = Object.keys(env).filter((key) => key.toUpperCase() === 'PATHEXT');
    const extensionKey = extensionKeys.includes('PATHEXT') ? 'PATHEXT' : extensionKeys[0];
    const extensions =
      process.platform === 'win32'
        ? String(env[extensionKey] ?? '.COM;.EXE')
            .split(';')
            .filter((extension) => /^\.(exe|com)$/i.test(extension))
        : [''];
    let discovered;
    for (const directory of String(env[pathKey] ?? '')
      .split(path.delimiter)
      .filter(Boolean)) {
      for (const extension of extensions) {
        const candidate = path.resolve(
          root,
          process.platform === 'win32' ? directory.replace(/^"(.*)"$/, '$1') : directory,
          `bun${extension}`,
        );
        try {
          if (statSync(candidate).isFile()) discovered = realpathSync(candidate);
        } catch {
          /* Missing PATH entries fall through to the exact npm resolver. */
        }
        if (discovered) break;
      }
      if (discovered) break;
    }
    if (discovered && path.isAbsolute(discovered) && !/[\r\n\0]/.test(discovered)) {
      try {
        const version = succeeded(
          boundedSpawnSync(
            spawn,
            discovered,
            ['--version'],
            { cwd: root, env, encoding: 'utf8', timeout: 30_000, windowsHide: true, budget: options.budget },
            'PATH Bun version check',
            cleanup,
          ),
          'PATH Bun version check',
        );
        if (version === pin) return discovered;
      } catch (error) {
        if (error.timedOut) throw error;
        /* A failed PATH probe cannot bypass pinned npm resolution. */
      }
    }
  }
  const npm = options.npmCli ?? (options.executable ? null : findNpmCli(node));
  const executable = options.executable
    ? String(options.executable).trim()
    : succeeded(
        boundedSpawnSync(
          spawn,
          node,
          [
            npm,
            'exec',
            '--yes',
            '--package',
            `bun@${pin}`,
            '--',
            'bun',
            '-e',
            'process.stdout.write(process.execPath)',
          ],
          { cwd: root, env, encoding: 'utf8', timeout: 180_000, windowsHide: true, budget: options.budget },
          'Exact Bun package resolution (npm)',
          cleanup,
        ),
        'Exact Bun package resolution (npm)',
      );
  if (!path.isAbsolute(executable) || /[\r\n\0]/.test(executable)) {
    throw new Error('Bun resolution did not return one absolute executable path.');
  }
  const version = succeeded(
    boundedSpawnSync(
      spawn,
      executable,
      ['--version'],
      { cwd: root, env, encoding: 'utf8', timeout: 30_000, windowsHide: true, budget: options.budget },
      'Resolved Bun version check',
      cleanup,
    ),
    'Resolved Bun version check',
  );
  if (version !== pin) throw new Error(`Resolved Bun is ${version}; .bun-version requires ${pin}.`);
  return executable;
}

export function runPinnedBun(args, options = {}) {
  const embedded = standaloneRuntime(options.env ?? process.env);
  const root = options.root ?? embedded?.root ?? bundleRoot;
  const pin = readPin(root);
  checkManifest(root, pin);
  const spawn = options.spawn ?? spawnSync;
  const env = options.env ?? process.env;
  const cleanup = options.cleanup ?? defaultTimeoutCleanup;
  const maximum = options.timeoutMs === undefined ? Infinity : options.timeoutMs;
  // Validate before resolution can launch a version probe. A caller budget
  // never converts malformed input into an unlimited command.
  const commandBudget = executionBudget(maximum, 0);
  const budget = options.budget ?? commandBudget;
  const executable = resolvePinnedBun({ ...options, root, spawn, env, cleanup, budget });
  const timeoutMs = budget ? budget.remaining(maximum) : maximum;
  const result = boundedSpawnSync(
    spawn,
    executable,
    embedded ? ['--no-env-file', '--no-install', '--config=' + path.join(root, 'bunfig.toml'), ...args] : args,
    {
      cwd: options.cwd ?? process.cwd(),
      env: { ...pinnedEnvironment(executable, env, root), VIDA_PIPELINE_DIAGNOSTICS: undefined },
      stdio: 'inherit',
      windowsHide: true,
      timeout: timeoutMs,
      budget,
      diagnostics: options.diagnostics ?? false,
    },
    'Pinned Bun command',
    cleanup,
  );
  if (result.error || result.signal || !Number.isInteger(result.status)) {
    succeeded(result, 'Pinned Bun command');
  }
  return result.status;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    if (process.argv.length === 3 && process.argv[2] === '--sync-pin') {
      console.log(syncPin() ? 'Bun manifest mirrors synchronized.' : 'Bun manifest mirrors already current.');
    } else {
      process.exitCode = runPinnedBun(process.argv.slice(2), {
        diagnostics: process.env.VIDA_PIPELINE_DIAGNOSTICS === 'true',
      });
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = error.exitCode ?? 1;
  }
}
