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
      ? ` Timed out after ${result.timeoutMs} ms${result.cleanupAttempted ? '; process-tree cleanup was attempted' : ''}.`
      : '';
    const error = new Error(`${label} failed${result.signal ? ` (${result.signal})` : ''}.${diagnostic}`);
    error.exitCode = Number.isInteger(result.status) && result.status > 0 ? result.status : 1;
    throw error;
  }
  return String(result.stdout ?? '').trim();
}

function cleanupTimedOutProcessTree(result, cleanup = defaultTimeoutCleanup) {
  if (!result?.pid) return false;
  try {
    cleanup(result.pid);
    return true;
  } catch {
    return false;
  }
}

function defaultTimeoutCleanup(pid) {
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], {
      windowsHide: true,
      stdio: 'ignore',
      timeout: 30_000,
    });
    return;
  }
  process.kill(-pid, 'SIGKILL');
}

export function boundedSpawnSync(spawn, command, args, options, label, cleanup = defaultTimeoutCleanup) {
  const timeoutMs = options.timeout ?? 300_000;
  const result = spawn(command, args, {
    ...options,
    timeout: timeoutMs,
    killSignal: 'SIGKILL',
    detached: process.platform !== 'win32',
  });
  if (result?.error?.code === 'ETIMEDOUT') {
    result.timedOut = true;
    result.timeoutMs = timeoutMs;
    result.cleanupAttempted = cleanupTimedOutProcessTree(result, cleanup);
    result.diagnosticLabel = label;
  }
  return result;
}

export function pinnedEnvironment(executable, env = process.env, root = bundleRoot) {
  const next = { ...env };
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
  next[key] = `${path.dirname(executable)}${path.delimiter}${env[key] ?? ''}`;
  return next;
}

export function resolvePinnedBun(options = {}) {
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
            { cwd: root, env, encoding: 'utf8', timeout: 30_000, windowsHide: true },
            'PATH Bun version check',
            cleanup,
          ),
          'PATH Bun version check',
        );
        if (version === pin) return discovered;
      } catch {
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
          { cwd: root, env, encoding: 'utf8', timeout: 180_000, windowsHide: true },
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
      { cwd: root, env, encoding: 'utf8', timeout: 30_000, windowsHide: true },
      'Resolved Bun version check',
      cleanup,
    ),
    'Resolved Bun version check',
  );
  if (version !== pin) throw new Error(`Resolved Bun is ${version}; .bun-version requires ${pin}.`);
  return executable;
}

export function runPinnedBun(args, options = {}) {
  const root = options.root ?? bundleRoot;
  const pin = readPin(root);
  checkManifest(root, pin);
  const spawn = options.spawn ?? spawnSync;
  const env = options.env ?? process.env;
  const cleanup = options.cleanup ?? defaultTimeoutCleanup;
  const executable = resolvePinnedBun({ ...options, root, spawn, env, cleanup });
  const result = boundedSpawnSync(
    spawn,
    executable,
    args,
    {
      cwd: options.cwd ?? process.cwd(),
      env: pinnedEnvironment(executable, env, root),
      stdio: 'inherit',
      windowsHide: true,
      timeout: options.timeoutMs ?? 300_000,
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
      process.exitCode = runPinnedBun(process.argv.slice(2));
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = error.exitCode ?? 1;
  }
}
