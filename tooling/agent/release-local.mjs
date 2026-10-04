import {
  releaseState,
  saveReleaseState as save,
  releaseDirectory as directory,
  releaseJournalFile as journalFile,
  operationMutex,
  withReleaseAdmission,
  selectedTarball,
  packedDistribution,
  assertReleaseRetargetSettled,
} from '../../packages/agent/bin/local-release-artifacts.mjs';
export {
  withReleaseAdmission,
  selectedTarball,
  packedDistribution,
} from '../../packages/agent/bin/local-release-artifacts.mjs';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import {
  closeSync,
  constants,
  copyFileSync,
  fsyncSync,
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { homedir } from 'node:os';
import { sdkCompatibilityManifest } from '../../packages/agent/tooling/pack-sdk.mjs';
import { findNpmCli } from '../../packages/agent/bin/bun.mjs';

import { readNativeRetargetCandidate } from '../../packages/agent/bin/repair-release-retarget.mjs';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const idPattern = /^[a-z0-9][a-z0-9-]{0,95}$/;
const json = (value) => JSON.stringify(value, null, 2) + '\n';
const read = (file) => JSON.parse(readFileSync(file, 'utf8'));
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
function manifest(root) {
  const file = path.join(root, 'packages/agent/package.json');
  const value = read(file);
  if (
    value.name !== 'vida-agent' ||
    value.bin?.['vida-agent'] !== './bin/vida-agent.mjs' ||
    value.engines?.bun !== '1.4.2' ||
    value.packageManager !== 'bun@1.4.2' ||
    !/^0\.1\.(0|[1-9]\d*)$/.test(value.version)
  )
    throw new Error('Local release requires vida-agent 0.1.x with Bun 1.4.2.');
  return { file, value };
}
export function candidateVersion(current, successful) {
  if (!/^0\.1\.(0|[1-9]\d*)$/.test(current)) throw new Error('Candidate version must be 0.1.x.');
  if (!successful) return '0.1.0';
  if (!/^0\.1\.(0|[1-9]\d*)$/.test(successful)) throw new Error('Successful version must be 0.1.x.');
  const patch = Number(successful.split('.')[2]) + 1;
  if (!Number.isSafeInteger(patch)) throw new Error('Patch version exceeds integer bound.');
  return `0.1.${patch}`;
}
export function reserveReleaseWorker(root, operation, launch) {
  return withReleaseAdmission(root, () => {
    assertReleaseRetargetSettled(root, operation);
    const current = releaseState(journalFile(root, operation));
    const mutex = operationMutex(root, operation);
    if (!mutex) return current;
    mutex.close();
    const pid = launch();
    if (!Number.isInteger(pid) || pid < 1) throw new Error('Release worker did not start.');
    const result = { ...current, pid, status: 'running' };
    save(journalFile(root, operation), result);
    return result;
  });
}
export function claimReleaseWorker(root, operation, pid) {
  return withReleaseAdmission(root, () => {
    assertReleaseRetargetSettled(root, operation);
    const current = releaseState(journalFile(root, operation));
    if (current.pid !== pid) throw new Error('Release worker reservation differs.');
    const mutex = operationMutex(root, operation);
    if (!mutex) throw new Error('Release operation already has an active worker.');
    try {
      save(journalFile(root, operation), { ...current, status: 'running' });
      return mutex;
    } catch (error) {
      mutex.close();
      throw error;
    }
  });
}
export function prepareRelease(root = repositoryRoot) {
  return withReleaseAdmission(root, () => prepareCandidate(root));
}
export function prepareSystemUpdate(root = repositoryRoot) {
  return withReleaseAdmission(root, () => prepareCandidate(root, true));
}
function successfulBaseline(root, successful) {
  if (!successful || successful.status !== 'successful')
    throw new Error('System update requires a successful baseline.');
  const completed = releaseState(journalFile(root, successful.operation_id));
  if (
    completed.operation_id !== successful.operation_id ||
    completed.version !== successful.version ||
    completed.status !== 'successful'
  )
    throw new Error('Successful baseline differs from its operation journal.');
}
function preflightSystemUpdate(root, currentVersion, pending, successful) {
  if (successful) successfulBaseline(root, successful);
  if (pending) {
    const completed = releaseState(journalFile(root, pending.operation_id));
    if (completed.operation_id !== pending.operation_id || completed.version !== pending.version)
      throw new Error('Pending system update differs from its operation journal.');
    if (pending.version !== currentVersion) throw new Error('Pending system update differs from manifest.');
    // Only existing exact successful-receipt reconciliation may repair an unpublished baseline.
    if (pending.operation_id !== successful?.operation_id && completed.status === 'successful') return;
  }
  if (!successful || successful.version !== currentVersion)
    throw new Error('System update must preserve the successful manifest version.');
}
function prepareCandidate(root, systemUpdate = false) {
  const releases = directory(root, '.agent/work/agent-local-release');
  const pendingFile = path.join(releases, 'pending.json');
  const successFile = path.join(releases, 'successful.json');
  const { file, value } = manifest(root);
  let successful = existsSync(successFile) ? releaseState(successFile) : null;
  const pending = existsSync(pendingFile) ? releaseState(pendingFile) : null;
  if (systemUpdate) preflightSystemUpdate(root, value.version, pending, successful);
  if (pending) assertReleaseRetargetSettled(root, pending.operation_id);
  if (pending && pending.operation_id !== successful?.operation_id) {
    const completedFile = journalFile(root, pending.operation_id);
    if (existsSync(completedFile)) {
      const completed = releaseState(completedFile);
      if (completed.status === 'successful') {
        const archive = selectedTarball(
          completed.pack_metadata,
          path.join(root, '.tmp/releases', pending.operation_id),
          pending.version,
        );
        const distribution = packedDistribution(completed.pack_metadata);
        const installedManifestBytes =
          distribution === 'npm' &&
          completed.pack_metadata[0].files.some((file) => file.path === 'tooling/pack-sdk.mjs')
            ? sdkCompatibilityManifest({ root: path.join(root, 'packages/agent') }).bytes
            : undefined;
        const archiveMatches = sha(readFileSync(archive)) === completed.tarball_sha256;
        let installedMatches = false;
        if (archiveMatches) {
          try {
            verifyInstalledTree(root, completed.pack_metadata, completed.installed_root, {
              distribution,
              expectedManifestBytes: installedManifestBytes,
            });
            installedMatches = true;
          } catch {
            installedMatches = false;
          }
        }
        const exact = archiveMatches && installedMatches;
        if (!exact) throw new Error('Completed publication must be reconciled against installed bytes.');
        save(successFile, completed);
        successful = completed;
      }
    }
  }
  if (pending && pending.operation_id !== successful?.operation_id) {
    if (pending.version !== value.version) throw new Error('Pending candidate differs from manifest.');
    directory(root, `.tmp/releases/${pending.operation_id}`);
    if (!existsSync(journalFile(root, pending.operation_id)))
      throw new Error('Pending release journal missing; reconcile without repeating effects.');
    return systemUpdate ? releaseState(journalFile(root, pending.operation_id)) : pending;
  }
  if (systemUpdate) {
    successful = releaseState(successFile);
    successfulBaseline(root, successful);
    if (successful.version !== value.version) throw new Error('System update baseline version differs from manifest.');
  }
  const version = systemUpdate ? value.version : candidateVersion(value.version, successful?.version);
  if (value.version !== version) save(file, { ...value, version });
  const operation_id = `local-${randomUUID()}`;
  directory(root, `.tmp/releases/${operation_id}`);
  directory(root, `.agent/work/agent-local-release/${operation_id}`);
  const prepared = {
    schema: 'VidaLocalReleaseState/v1',
    operation_id,
    version,
    status: 'awaiting_assurance',
  };
  save(pendingFile, prepared);
  save(journalFile(root, operation_id), prepared);
  return prepared;
}
export function runCommand(command, args, { cwd, env = process.env, log, windowsVerbatimArguments = false } = {}) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const child = spawn(command, args, {
      cwd,
      env,
      windowsHide: true,
      shell: false,
      windowsVerbatimArguments,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '',
      stderr = '';
    child.stdout.on('data', (bytes) => {
      stdout += bytes;
    });
    child.stderr.on('data', (bytes) => {
      stderr += bytes;
    });
    child.on('error', reject);
    child.on('close', (code, signal) => {
      const result = {
        command,
        args,
        code,
        signal,
        elapsed_ms: Date.now() - started,
        stdout,
        stderr,
      };
      if (log) writeFileSync(log, json(result));
      if (code !== 0 || signal)
        reject(new Error(`Command failed: ${args.join(' ')} (${code ?? signal})\n${stderr.slice(-2048)}`));
      else resolve(stdout.trim());
    });
  });
}
export function parsePackOutput(output) {
  const text = output.trim();
  if (text.startsWith('[')) return JSON.parse(text);
  const boundary = text.indexOf('\n[');
  if (boundary < 0) throw new Error('npm pack metadata array missing.');
  const event = JSON.parse(text.slice(0, boundary));
  if (
    event.schema !== 'CandidatePackageBuild/v1' ||
    event.test_issuers_shipped !== false ||
    !Array.isArray(event.production_entrypoints) ||
    !Number.isInteger(event.schemas) ||
    event.schemas < 1 ||
    Object.keys(event).sort().join() !==
      ['schema', 'production_entrypoints', 'test_issuers_shipped', 'schemas'].sort().join()
  )
    throw new Error('Unknown npm prepack event.');
  return JSON.parse(text.slice(boundary + 1));
}
function sdkManifest(root) {
  return sdkCompatibilityManifest({ root: path.join(root, 'packages/agent') }).bytes;
}
export async function verifyPackedSources(root, metadata, tarball, npmCli, expectedManifest) {
  const tar = createRequire(npmCli ?? path.join(root, 'packages/agent/package.json'))('tar');
  const expected = new Set(metadata[0].files.map((entry) => 'package/' + entry.path));
  const seen = new Set(),
    errors = [];
  await tar.t({
    file: tarball,
    strict: true,
    onReadEntry(entry) {
      if (entry.type === 'Directory') return;
      if (entry.type !== 'File' || !expected.has(entry.path) || seen.has(entry.path)) {
        errors.push('Archive entry differs from exact npm file set.');
        return;
      }
      seen.add(entry.path);
      const chunks = [];
      entry.on('data', (chunk) => chunks.push(chunk));
      entry.on('end', () => {
        const source = path.join(root, 'packages/agent', entry.path.slice('package/'.length));
        if (
          !existsSync(source) ||
          lstatSync(source).isSymbolicLink() ||
          !Buffer.concat(chunks).equals(
            entry.path === 'package/package.json' && expectedManifest ? expectedManifest : readFileSync(source),
          )
        )
          errors.push('Current packaged bytes differ: ' + entry.path);
      });
    },
  });
  if (errors.length || seen.size !== expected.size) throw new Error(errors[0] ?? 'Archive file set incomplete.');
}
function nativePath(file, create = false) {
  if (!path.isAbsolute(file)) throw new Error('Native installation path must be absolute.');
  let current = path.parse(file).root;
  for (const part of file.slice(current.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    if (create && !existsSync(current)) mkdirSync(current);
    const info = lstatSync(current);
    if (!info.isDirectory() || info.isSymbolicLink())
      throw new Error('Native installation directory must not be linked.');
  }
}

export function nativeInstallationPaths({ version, operation, target, env = process.env }) {
  if (
    !/^0\.1\.(0|[1-9]\d*)$/.test(version) ||
    !idPattern.test(operation) ||
    typeof target !== 'string' ||
    !target.startsWith('bun-' + process.platform.replace('win32', 'windows') + '-' + process.arch)
  )
    throw new Error('Native installation identity or target differs.');
  const base =
    process.platform === 'win32'
      ? env.LOCALAPPDATA
      : (env.XDG_DATA_HOME ?? path.join(env.HOME ?? homedir(), '.local', 'share'));
  if (typeof base !== 'string' || !path.isAbsolute(base) || /[\r\n\0]/.test(base))
    throw new Error('Native user installation root unavailable.');
  const product =
    process.platform === 'win32' ? path.join(base, 'Programs', 'vida-agent') : path.join(base, 'vida-agent');
  const prefix = path.join(product, 'bin');
  return {
    installed_root: path.join(product, 'releases', version + '-' + operation, 'package'),
    prefix,
    path_command: path.join(prefix, process.platform === 'win32' ? 'vida-agent.exe' : 'vida-agent'),
  };
}

/** First publication is exclusive; replacement is allowed only against an exact prior successful asset. */
export function publishNativeExecutable(asset, destination, prior = null) {
  nativePath(path.dirname(asset.path));
  const source = lstatSync(asset.path),
    bytes = readFileSync(asset.path);
  if (
    !source.isFile() ||
    source.isSymbolicLink() ||
    source.nlink !== 1 ||
    bytes.length !== asset.bytes ||
    sha(bytes) !== asset.sha256
  )
    throw new Error('Native source asset differs.');
  nativePath(path.dirname(destination), true);
  const before = existsSync(destination) ? lstatSync(destination) : null;
  let priorBytes;
  if (before) {
    if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1 || !prior || prior.path !== destination)
      throw new Error('Native destination has an unowned or linked prior artifact.');
    priorBytes = readFileSync(destination);
    if (priorBytes.length !== prior.bytes || sha(priorBytes) !== prior.sha256)
      throw new Error('Prior native artifact differs.');
  } else if (prior) throw new Error('Prior native artifact disappeared.');
  const pending = destination + '.' + randomUUID() + '.pending';
  let descriptor;
  try {
    descriptor = openSync(pending, 'wx', 0o755);
    writeFileSync(descriptor, bytes);
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    if (priorBytes) {
      const current = lstatSync(destination);
      if (
        !current.isFile() ||
        current.isSymbolicLink() ||
        current.nlink !== 1 ||
        current.ino !== before.ino ||
        !readFileSync(destination).equals(priorBytes)
      )
        throw new Error('Prior native artifact changed before publication.');
      renameSync(pending, destination);
    } else {
      copyFileSync(pending, destination, constants.COPYFILE_EXCL);
      unlinkSync(pending);
    }
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
    if (existsSync(pending)) unlinkSync(pending);
  }
}

function nativeAsset(root, metadata, operation) {
  const candidate = readNativeRetargetCandidate({ root, operation, published: true });
  if (json(metadata) !== json(candidate.pack_metadata)) throw Error('Native candidate metadata differs.');
  return candidate.asset;
}
async function extractNativeTree(root, metadata, tarball, npmCli, destination) {
  nativePath(path.dirname(destination), true);
  if (existsSync(destination)) throw new Error('Native release tree already exists; inspect uncertain installation.');
  mkdirSync(destination);
  const tar = createRequire(npmCli ?? path.join(root, 'packages/agent/package.json'))('tar');
  const expected = new Set(nativeArchiveFiles(metadata).map((file) => 'package/' + file.path));
  await tar.x({
    file: tarball,
    cwd: destination,
    strip: 1,
    strict: true,
    filter(entry, info) {
      if (info.type === 'Directory') {
        if (
          !entry.startsWith('package/') ||
          entry.split('/').some((part) => part === '..' || part === '.' || part.includes(':') || part.includes('\\'))
        )
          throw new Error('Native extraction directory differs.');
        return true;
      }
      if (info.type !== 'File' || !expected.has(entry)) throw new Error('Native extraction entry differs.');
      return true;
    },
  });
  verifyInstalledTree(root, metadata, destination);
}

function verifyInstalledTree(root, metadata, destination, { distribution = 'native', expectedManifestBytes } = {}) {
  if (!['native', 'npm'].includes(distribution)) throw new Error('Installed package distribution is invalid.');
  nativePath(destination);
  const files = distribution === 'npm' ? npmArchiveFiles(metadata) : nativeArchiveFiles(metadata),
    expected = new Set(files.map((file) => file.path));
  const expectedDirectories = new Set();
  for (const file of files) {
    const parts = file.path.split('/');
    parts.pop();
    for (let index = 1; index <= parts.length; index++) expectedDirectories.add(parts.slice(0, index).join('/'));
  }
  const visit = (directory, relative = '') => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const name = relative + entry.name,
        absolute = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Installed ${distribution} tree contains a linked entry.`);
      if (distribution === 'npm' && relative === '' && entry.name === 'node_modules' && entry.isDirectory()) continue;
      if (entry.isDirectory()) {
        if (distribution === 'npm' && !expectedDirectories.has(name))
          throw new Error('Installed npm tree contains an unknown directory.');
        visit(absolute, name + '/');
      } else if (!entry.isFile() || !expected.has(name))
        throw new Error(`Installed ${distribution} tree contains an unknown entry.`);
    }
  };
  visit(destination);
  for (const file of files) {
    const target = path.join(destination, file.path);
    nativePath(path.dirname(target));
    const info = lstatSync(target);
    if (
      !info.isFile() ||
      info.isSymbolicLink() ||
      info.nlink !== 1 ||
      !readFileSync(target).equals(
        file.path === 'package.json' && expectedManifestBytes !== undefined
          ? expectedManifestBytes
          : readFileSync(path.join(root, 'packages/agent', file.path)),
      )
    )
      throw new Error(`Installed ${distribution} release tree differs.`);
  }
}

function nativeArchiveFiles(metadata) {
  const files = metadata[0]?.files;
  if (
    !Array.isArray(files) ||
    new Set(files.map((file) => file.path)).size !== files.length ||
    files.some(
      (file) =>
        typeof file.path !== 'string' ||
        file.path.includes('\\') ||
        file.path.startsWith('/') ||
        file.path.split('/').some((part) => !part || part === '.' || part === '..' || part.includes(':')),
    )
  )
    throw new Error('Native archive paths differ.');
  return files;
}

function npmArchiveFiles(metadata) {
  const files = nativeArchiveFiles(metadata),
    paths = new Set(files.map((file) => (process.platform === 'win32' ? file.path.toLowerCase() : file.path)));
  if (!paths.has('package.json')) throw new Error('Installed npm archive manifest is missing.');
  if ([...paths].some((relative) => relative === 'node_modules' || relative.startsWith('node_modules/')))
    throw new Error('npm-managed dependencies cannot be archive-owned package entries.');
  return files;
}

function nativePathCommand(pathValue) {
  for (const folder of pathValue.split(path.delimiter).filter(Boolean)) {
    for (const filename of process.platform === 'win32'
      ? ['vida-agent.com', 'vida-agent.exe', 'vida-agent.bat', 'vida-agent.cmd']
      : ['vida-agent']) {
      const file = path.join(folder, filename);
      if (existsSync(file)) return file;
    }
  }
  throw new Error('Native command is absent from PATH.');
}

async function priorNativeAsset(root, prior, relative, destination, npmCli) {
  if (
    !prior ||
    prior.path_command !== destination ||
    !prior.installed_root ||
    !prior.pack_metadata?.[0]?.files.some((file) => file.path === relative)
  )
    return null;
  const archive = selectedTarball(
    prior.pack_metadata,
    path.join(root, '.tmp/releases', prior.operation_id),
    prior.version,
  );
  if (sha(readFileSync(archive)) !== prior.tarball_sha256) throw new Error('Prior native archive differs.');
  let bytes;
  await createRequire(npmCli ?? path.join(root, 'packages/agent/package.json'))('tar').t({
    file: archive,
    strict: true,
    onReadEntry(entry) {
      if (entry.path !== 'package/' + relative) return;
      if (entry.type !== 'File' || bytes) throw new Error('Prior native archive asset differs.');
      const chunks = [];
      entry.on('data', (chunk) => chunks.push(chunk));
      entry.on('end', () => {
        bytes = Buffer.concat(chunks);
      });
    },
  });
  if (!bytes) throw new Error('Prior native asset is absent from its archive.');
  return { path: destination, bytes: bytes.length, sha256: sha(bytes) };
}

async function installNativeRelease({ root, state, value, metadata, tarball, npmCli, env, command, folder, update }) {
  const asset = nativeAsset(root, metadata, state.operation_id);
  const locations = nativeInstallationPaths({
    version: value.version,
    operation: state.operation_id,
    target: asset.target,
    env,
  });
  if (
    state.install_started &&
    ['installed_root', 'prefix', 'path_command'].some((key) => state[key] !== locations[key])
  )
    throw new Error('Recorded native installation targets differ; inspect before retry.');
  if (state.install_started) {
    verifyInstalledTree(root, metadata, locations.installed_root);
    nativePath(locations.prefix);
    const info = lstatSync(locations.path_command);
    if (
      !info.isFile() ||
      info.isSymbolicLink() ||
      info.nlink !== 1 ||
      sha(readFileSync(locations.path_command)) !== asset.sha256
    )
      throw new Error(
        'Prior native install outcome differs or remains uncertain; inspect before retrying installation.',
      );
  } else {
    const successfulFile = path.join(root, '.agent/work/agent-local-release/successful.json');
    const prior = existsSync(successfulFile) ? releaseState(successfulFile) : null;
    const priorAsset = await priorNativeAsset(root, prior, asset.relative, locations.path_command, npmCli);
    update('installing', { ...locations, install_started: true });
    await extractNativeTree(root, metadata, tarball, npmCli, locations.installed_root);
    publishNativeExecutable(
      { ...asset, path: path.join(locations.installed_root, asset.relative) },
      locations.path_command,
      priorAsset,
    );
  }
  const unrelated = directory(root, `.tmp/releases/${state.operation_id}/unrelated-cwd`);
  const nativeEnv = { ...env };
  for (const key of Object.keys(nativeEnv))
    if (
      ['NODE_OPTIONS', 'BUN_OPTIONS', 'VIDA_STANDALONE_ROOT', 'VIDA_STANDALONE_EXECUTABLE', 'BUN_BE_BUN'].includes(
        key.toUpperCase(),
      )
    )
      delete nativeEnv[key];
  const invoke = (args, label) =>
    command(locations.path_command, args, {
      cwd: unrelated,
      env: nativeEnv,
      log: path.join(folder, label + '.json'),
    });
  const version = JSON.parse(await invoke(['version'], 'native-version'));
  if (version.name !== 'vida-agent' || version.version !== value.version)
    throw new Error('Installed native version differs.');
  const instruction = JSON.parse(
    await invoke(['instructions', '--path', 'development-lifecycle'], 'native-instructions'),
  );
  if (instruction.version !== value.version || !path.isAbsolute(instruction.path))
    throw new Error('Installed native instruction identity differs.');
  nativePath(path.dirname(instruction.path));
  const instructionInfo = lstatSync(instruction.path);
  if (
    !instructionInfo.isFile() ||
    instructionInfo.isSymbolicLink() ||
    instructionInfo.nlink !== 1 ||
    !readFileSync(instruction.path).equals(
      readFileSync(path.join(locations.installed_root, 'instructions/development-lifecycle.md')),
    )
  )
    throw new Error('Installed native instruction discovery differs.');
  const check = JSON.parse(await invoke(['install', '--check'], 'native-check'));
  if (check.status !== 'prerequisites_valid' || check.bun_pin !== '1.4.2' || check.runtime !== 'embedded')
    throw new Error('Installed native prerequisite check differs.');
  if (process.platform === 'win32') {
    const powershell = path.join(
      process.env.SystemRoot ?? 'C:\\Windows',
      'System32',
      'WindowsPowerShell',
      'v1.0',
      'powershell.exe',
    );
    const runPathScript = (script, label) =>
      command(
        powershell,
        ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')],
        { cwd: unrelated, env, log: path.join(folder, label + '.json') },
      );
    const current = String(
      await runPathScript(
        "[Console]::Write([Environment]::GetEnvironmentVariable('Path','User'))",
        'native-path-observe',
      ),
    );
    const entries = current.split(';').filter(Boolean);
    if (!entries.some((entry) => entry.toLowerCase() === locations.prefix.toLowerCase())) {
      const literal = (text) => "'" + text.replaceAll("'", "''") + "'";
      const next = [locations.prefix, ...entries].join(';');
      await runPathScript(
        "if([string][Environment]::GetEnvironmentVariable('Path','User') -cne " +
          literal(current) +
          ") { throw 'User PATH changed; inspect before retry' }; [Environment]::SetEnvironmentVariable('Path'," +
          literal(next) +
          ",'User')",
        'native-path-publish',
      );
    }
    const observed = String(
      await runPathScript(
        "[Console]::Write([Environment]::GetEnvironmentVariable('Path','User'))",
        'native-path-verify',
      ),
    );
    if (!observed.split(';').some((entry) => entry.toLowerCase() === locations.prefix.toLowerCase()))
      throw new Error('Native user PATH publication remains uncertain.');
    const machine = String(
      await runPathScript(
        "[Console]::Write([Environment]::GetEnvironmentVariable('Path','Machine'))",
        'native-machine-path-observe',
      ),
    );
    if (
      path.resolve(nativePathCommand(machine + ';' + observed)).toLowerCase() !== locations.path_command.toLowerCase()
    )
      throw new Error(
        'An earlier system PATH command shadows the native user command; preserve it and reconcile PATH.',
      );
  } else {
    const pathValue = Object.entries(env).find(([key]) => key === 'PATH')?.[1] ?? '';
    if (!pathValue.split(path.delimiter).includes(locations.prefix))
      throw new Error('Native prefix must be present in the user PATH before Unix installation can complete.');
    if (path.resolve(nativePathCommand(pathValue)) !== locations.path_command)
      throw new Error('An earlier PATH command shadows the native user command.');
  }
  return locations;
}
export async function executeRelease({
  root = repositoryRoot,
  operation,
  qualify,
  ci,
  packOnly = false,
  distribution,
  command = runCommand,
  npmCli,
  env = process.env,
}) {
  if (!idPattern.test(operation)) throw new Error('Release operation ID invalid.');
  assertReleaseRetargetSettled(root, operation);
  if (distribution !== undefined && !['npm', 'native'].includes(distribution))
    throw new Error('Release distribution invalid.');
  if (packOnly && distribution !== 'npm')
    throw Error('Native formation belongs to the CI producer; import its exact candidate through supported staging.');
  if (distribution === 'npm') npmCli ??= findNpmCli();
  const folder = directory(root, `.tmp/releases/${operation}`);
  const stateFile = journalFile(root, operation);
  let state = releaseState(stateFile);
  const pending = releaseState(path.join(root, '.agent/work/agent-local-release/pending.json'));
  const { value } = manifest(root);
  if (pending.operation_id !== operation || state.operation_id !== operation || state.version !== value.version)
    throw new Error('Release candidate is not current.');
  if (!packOnly) {
    if (distribution === 'npm' || (state.pack_metadata && packedDistribution(state.pack_metadata) !== 'native'))
      throw new Error('SDK archives are library-only; public agent installation requires a qualified native asset.');
    if (!state.pack_metadata) throw new Error('Candidate must be packed after tests and before independent assurance.');
  }
  const started = Date.now();
  const update = (status, extra = {}) => {
    state = { ...state, ...extra, status, elapsed_ms: Date.now() - started };
    save(stateFile, state);
  };
  try {
    const qualification = await qualify({ root, operation, version: value.version, ci });
    // Qualification is issued by the fixed repository-owned assurance adapter, never a caller boolean.
    if (!qualification?.source_binding) throw new Error('Current qualified source binding missing.');
    const changed = state.source_binding && state.source_binding !== qualification.source_binding;
    if (changed && (!packOnly || state.install_started))
      throw new Error('Release source changed; explicit pre-install requalification required.');
    const expectedManifest = distribution === 'npm' ? await sdkManifest(root) : undefined;
    const sdkArgs = [
      path.join(root, 'packages/agent/tooling/pack-sdk.mjs'),
      '--pack',
      '--root',
      path.join(root, 'packages/agent'),
      '--destination',
      folder,
    ];
    const packArgs = distribution === 'npm' ? sdkArgs : [npmCli, 'pack', '--json', '--pack-destination', folder];
    let tarball;
    if (state.pack_metadata) {
      tarball = selectedTarball(state.pack_metadata, folder, value.version);
      if (sha(readFileSync(tarball)) !== state.tarball_sha256) throw new Error('Pending tarball changed.');
      if (changed) await verifyPackedSources(root, state.pack_metadata, tarball, npmCli, expectedManifest);
    } else {
      if (!packOnly) throw new Error('Candidate must be packed after tests and before independent assurance.');
      const priorLog = path.join(folder, 'pack.json');
      let output;
      if (existsSync(priorLog) && read(priorLog).code === 0) {
        const prior = read(priorLog);
        if (
          prior.command !== process.execPath ||
          prior.signal ||
          JSON.stringify(prior.args) !== JSON.stringify(packArgs)
        )
          throw new Error('Saved pack observation differs from this operation.');
        output = prior.stdout;
      } else {
        if (changed) throw new Error('Changed source lacks an exact prior package to requalify.');
        update('packing', { source_binding: qualification.source_binding });
        output = await command(process.execPath, packArgs, {
          cwd: path.join(root, 'packages/agent'),
          env,
          log: priorLog,
        });
      }
      const metadata = parsePackOutput(output);
      tarball = selectedTarball(metadata, folder, value.version);
      if (existsSync(priorLog)) await verifyPackedSources(root, metadata, tarball, npmCli, expectedManifest);
      const current = await qualify({ root, operation, version: value.version, ci });
      if (current.source_binding !== qualification.source_binding)
        throw new Error('Source changed during npm prepack.');
      update('packed', { pack_metadata: metadata, tarball_sha256: sha(readFileSync(tarball)) });
    }
    update('qualified', { source_binding: qualification.source_binding, error: undefined });
    const actualDistribution = packedDistribution(state.pack_metadata);
    if (distribution !== undefined && actualDistribution !== distribution)
      throw new Error('Packed distribution differs from the explicit request.');
    const nativeChannel = actualDistribution === 'native';
    if (!nativeChannel) npmArchiveFiles(state.pack_metadata);
    const installedManifestBytes =
      expectedManifest ??
      (actualDistribution === 'npm' && state.pack_metadata[0].files.some((file) => file.path === 'tooling/pack-sdk.mjs')
        ? await sdkManifest(root)
        : undefined);
    if (installedManifestBytes)
      await verifyPackedSources(root, state.pack_metadata, tarball, npmCli, installedManifestBytes);
    if (packOnly) {
      update('awaiting_assurance');
      return state;
    }
    if (nativeChannel) {
      const locations = await installNativeRelease({
        root,
        state,
        value,
        metadata: state.pack_metadata,
        tarball,
        npmCli,
        env,
        command,
        folder,
        update,
      });
      update('successful', { ...locations, completed_at: new Date().toISOString() });
      save(path.join(root, '.agent/work/agent-local-release/successful.json'), state);
      return state;
    }
    throw new Error('SDK archives are library-only; public agent installation requires a qualified native asset.');
  } catch (error) {
    update(error.message.startsWith('awaiting_assurance:') ? 'awaiting_assurance' : 'failed', {
      error: error.message,
    });
    throw error;
  }
}
async function main(args) {
  if (args.length === 4 && args[0] === '--stage-native-retarget' && args[2] === '--candidate') {
    const { stageNativeRetargetCandidate } = await import('../../packages/agent/bin/repair-release-retarget.mjs');
    return stageNativeRetargetCandidate({ root: repositoryRoot, operation: args[1], candidateFile: args[3] });
  }
  if (args.length === 1 && args[0] === '--prepare') return prepareRelease();
  if (args.length === 1 && args[0] === '--prepare-system-update') return prepareSystemUpdate();
  if (
    args.length !== 2 ||
    !['--operation', '--pack', '--pack-npm', '--status', '--worker', '--pack-worker', '--pack-npm-worker'].includes(
      args[0],
    ) ||
    !idPattern.test(args[1])
  )
    throw new Error(
      'Usage: release:local -- --prepare | --prepare-system-update | --pack ID | --pack-npm ID | --operation ID | --status ID',
    );
  const operation = args[1];
  const folder = directory(repositoryRoot, `.tmp/releases/${operation}`);
  if (args[0] === '--status') return read(journalFile(repositoryRoot, operation));
  if (['--worker', '--pack-worker', '--pack-npm-worker'].includes(args[0])) {
    const { verifyLocalReleaseAssurance, verifyLocalReleaseTests } = await import('./release-assurance.mjs');
    const mutex = await claimReleaseWorker(repositoryRoot, operation, process.pid);
    try {
      const packOnly = args[0] !== '--worker';
      return await executeRelease({
        operation,
        packOnly,
        distribution: args[0] === '--pack-npm-worker' ? 'npm' : args[0] === '--pack-worker' ? 'native' : undefined,
        qualify: packOnly ? verifyLocalReleaseTests : verifyLocalReleaseAssurance,
      });
    } finally {
      mutex.close();
    }
  }
  return reserveReleaseWorker(repositoryRoot, operation, () => {
    const output = openSync(path.join(folder, 'worker.log'), 'a');
    const worker = spawn(
      process.execPath,
      [
        fileURLToPath(import.meta.url),
        args[0] === '--pack-npm' ? '--pack-npm-worker' : args[0] === '--pack' ? '--pack-worker' : '--worker',
        operation,
      ],
      {
        cwd: repositoryRoot,
        env: process.env,
        detached: true,
        windowsHide: true,
        stdio: ['ignore', output, output],
      },
    );
    closeSync(output);
    if (!worker.pid) {
      worker.on('error', () => {});
      throw new Error('Release worker did not start.');
    }
    worker.unref();
    return worker.pid;
  });
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main(process.argv.slice(2))
    .then((value) => process.stdout.write(json(value)))
    .catch((error) => {
      process.stderr.write(error.message + '\n');
      process.exitCode = 1;
    });
}
