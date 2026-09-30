import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import {
  closeSync,
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { findNpmCli } from '../../packages/agent/bin/bun.mjs';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const idPattern = /^[a-z0-9][a-z0-9-]{0,95}$/;
const json = (value) => JSON.stringify(value, null, 2) + '\n';
const read = (file) => JSON.parse(readFileSync(file, 'utf8'));
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const journalFile = (root, operation) => path.join(root, '.agent/work/agent-local-release', operation, 'release.json');
function releaseState(file) {
  const value = read(file);
  const allowed = new Set([
    'schema',
    'operation_id',
    'version',
    'status',
    'pid',
    'elapsed_ms',
    'source_binding',
    'pack_metadata',
    'tarball_sha256',
    'install_started',
    'installed_root',
    'prefix',
    'path_command',
    'completed_at',
    'error',
  ]);
  if (
    value.schema !== 'VidaLocalReleaseState/v1' ||
    !idPattern.test(value.operation_id ?? '') ||
    !/^0\.1\.(0|[1-9]\d*)$/.test(value.version ?? '') ||
    !['awaiting_assurance', 'running', 'qualified', 'packing', 'packed', 'installing', 'successful', 'failed'].includes(
      value.status,
    ) ||
    Object.keys(value).some((key) => !allowed.has(key))
  )
    throw new Error('Current local release state invalid.');
  return value;
}
function save(file, value) {
  const temporary = `${file}.${randomUUID()}.tmp`;
  writeFileSync(temporary, json(value), { flag: 'wx' });
  renameSync(temporary, file);
}
function directory(root, relative) {
  let current = realpathSync(root);
  for (const part of relative.split('/')) {
    current = path.join(current, part);
    mkdirSync(current, { recursive: true });
    if (!lstatSync(current).isDirectory() || lstatSync(current).isSymbolicLink())
      throw new Error('Release directory must not be linked.');
  }
  return current;
}
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
function operationMutex(root, operation) {
  if (!idPattern.test(operation)) throw new Error('Release operation invalid.');
  const folder = directory(root, `.agent/work/agent-local-release/${operation}`);
  const database = path.join(folder, 'worker.sqlite');
  if (existsSync(database) && (!lstatSync(database).isFile() || lstatSync(database).isSymbolicLink()))
    throw new Error('Release worker database must be a regular non-link file.');
  const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite');
  const connection = new DatabaseSync(database, { timeout: 0 });
  try {
    connection.exec('BEGIN IMMEDIATE');
    return connection;
  } catch (error) {
    connection.close();
    if (error.errcode === 5) return null;
    throw error;
  }
}
export function reserveReleaseWorker(root, operation, launch) {
  return withReleaseAdmission(root, () => {
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
export async function withReleaseAdmission(root, action) {
  const folder = directory(root, '.agent/work/agent-local-release');
  const database = path.join(folder, 'admission.sqlite');
  if (existsSync(database) && (!lstatSync(database).isFile() || lstatSync(database).isSymbolicLink()))
    throw new Error('Release admission database must be a regular non-link file.');
  const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite');
  const connection = new DatabaseSync(database, { timeout: 1000 });
  let transactionOpen = false;
  try {
    connection.exec('BEGIN IMMEDIATE');
    transactionOpen = true;
    const result = action();
    if (result && typeof result.then === 'function')
      throw new Error('Admission actions must be synchronous and bounded.');
    connection.exec('COMMIT');
    transactionOpen = false;
    return result;
  } finally {
    try {
      if (transactionOpen) connection.exec('ROLLBACK');
    } finally {
      connection.close();
    }
  }
}
export function prepareRelease(root = repositoryRoot) {
  return withReleaseAdmission(root, () => prepareCandidate(root));
}
function prepareCandidate(root) {
  const releases = directory(root, '.agent/work/agent-local-release');
  const pendingFile = path.join(releases, 'pending.json');
  const successFile = path.join(releases, 'successful.json');
  const { file, value } = manifest(root);
  let successful = existsSync(successFile) ? releaseState(successFile) : null;
  const pending = existsSync(pendingFile) ? releaseState(pendingFile) : null;
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
        const exact =
          sha(readFileSync(archive)) === completed.tarball_sha256 &&
          completed.pack_metadata[0].files.every(({ path: relative }) => {
            const source = path.join(root, 'packages/agent', relative),
              target = path.join(completed.installed_root, relative);
            return existsSync(target) && sha(readFileSync(source)) === sha(readFileSync(target));
          });
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
    return pending;
  }
  const version = candidateVersion(value.version, successful?.version);
  if (value.version !== version) save(file, { ...value, version });
  const operation_id = `local-${randomUUID()}`;
  directory(root, `.tmp/releases/${operation_id}`);
  directory(root, `.agent/work/agent-local-release/${operation_id}`);
  const prepared = { schema: 'VidaLocalReleaseState/v1', operation_id, version, status: 'awaiting_assurance' };
  save(pendingFile, prepared);
  save(journalFile(root, operation_id), prepared);
  return prepared;
}
export function runCommand(command, args, { cwd, env = process.env, log } = {}) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const child = spawn(command, args, {
      cwd,
      env,
      windowsHide: true,
      shell: false,
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
      const result = { command, args, code, signal, elapsed_ms: Date.now() - started, stdout, stderr };
      if (log) writeFileSync(log, json(result));
      if (code !== 0 || signal)
        reject(new Error(`Command failed: ${args.join(' ')} (${code ?? signal})\n${stderr.slice(-2048)}`));
      else resolve(stdout.trim());
    });
  });
}
export function selectedTarball(metadata, folder, version) {
  if (!Array.isArray(metadata) || metadata.length !== 1) throw new Error('npm pack must produce exactly one archive.');
  const item = metadata[0];
  if (
    item.name !== 'vida-agent' ||
    item.version !== version ||
    typeof item.filename !== 'string' ||
    path.basename(item.filename) !== item.filename ||
    !/^vida-agent-0\.1\.\d+\.tgz$/.test(item.filename) ||
    !Array.isArray(item.files) ||
    !item.files.length ||
    item.files.some(
      ({ path: relative }) =>
        typeof relative !== 'string' ||
        relative.includes('\\') ||
        relative.startsWith('/') ||
        relative.split('/').some((part) => !part || part === '.' || part === '..' || part.includes(':')),
    )
  )
    throw new Error('npm pack archive identity differs.');
  const file = path.join(folder, item.filename);
  if (!lstatSync(file).isFile() || lstatSync(file).isSymbolicLink())
    throw new Error('Packed archive must be a regular file.');
  const integrity = 'sha512-' + createHash('sha512').update(readFileSync(file)).digest('base64');
  if (item.integrity !== integrity) throw new Error('Packed archive integrity differs from npm metadata.');
  return file;
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
export async function verifyPackedSources(root, metadata, tarball, npmCli) {
  const tar = createRequire(npmCli)('tar');
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
          !Buffer.concat(chunks).equals(readFileSync(source))
        )
          errors.push('Current packaged bytes differ: ' + entry.path);
      });
    },
  });
  if (errors.length || seen.size !== expected.size) throw new Error(errors[0] ?? 'Archive file set incomplete.');
}
function pathCli(env) {
  const executable = process.platform === 'win32' ? 'vida-agent.cmd' : 'vida-agent';
  const pathValue = Object.entries(env).find(([key]) => key.toLowerCase() === 'path')?.[1] ?? '';
  for (const folder of pathValue.split(path.delimiter)) {
    if (!folder) continue;
    const file = path.join(folder, executable);
    if (existsSync(file) && lstatSync(file).isFile()) return file;
  }
  throw new Error('vida-agent is absent from system PATH.');
}
export async function executeRelease({
  root = repositoryRoot,
  operation,
  qualify,
  packOnly = false,
  command = runCommand,
  npmCli = findNpmCli(),
  env = process.env,
}) {
  if (!idPattern.test(operation)) throw new Error('Release operation ID invalid.');
  const folder = directory(root, `.tmp/releases/${operation}`);
  const stateFile = journalFile(root, operation);
  let state = releaseState(stateFile);
  const pending = releaseState(path.join(root, '.agent/work/agent-local-release/pending.json'));
  const { value } = manifest(root);
  if (pending.operation_id !== operation || state.operation_id !== operation || state.version !== value.version)
    throw new Error('Release candidate is not current.');
  const started = Date.now();
  const npm = (args, label, cwd = path.join(root, 'packages/agent')) =>
    command(process.execPath, [npmCli, ...args], { cwd, env, log: path.join(folder, `${label}.json`) });
  const update = (status, extra = {}) => {
    state = { ...state, ...extra, status, elapsed_ms: Date.now() - started };
    save(stateFile, state);
  };
  try {
    const qualification = await qualify({ root, operation, version: value.version });
    // Qualification is issued by the fixed repository-owned assurance adapter, never a caller boolean.
    if (!qualification?.source_binding) throw new Error('Current qualified source binding missing.');
    const changed = state.source_binding && state.source_binding !== qualification.source_binding;
    if (changed && (!packOnly || state.install_started))
      throw new Error('Release source changed; explicit pre-install requalification required.');
    let tarball;
    if (state.pack_metadata) {
      tarball = selectedTarball(state.pack_metadata, folder, value.version);
      if (sha(readFileSync(tarball)) !== state.tarball_sha256) throw new Error('Pending tarball changed.');
      if (changed) await verifyPackedSources(root, state.pack_metadata, tarball, npmCli);
    } else {
      if (!packOnly) throw new Error('Candidate must be packed after tests and before independent assurance.');
      const priorLog = path.join(folder, 'pack.json');
      let output;
      if (existsSync(priorLog) && read(priorLog).code === 0) {
        const prior = read(priorLog);
        if (
          prior.command !== process.execPath ||
          prior.signal ||
          JSON.stringify(prior.args) !== JSON.stringify([npmCli, 'pack', '--json', '--pack-destination', folder])
        )
          throw new Error('Saved pack observation differs from this operation.');
        output = prior.stdout;
      } else {
        if (changed) throw new Error('Changed source lacks an exact prior package to requalify.');
        update('packing', { source_binding: qualification.source_binding });
        output = await npm(['pack', '--json', '--pack-destination', folder], 'pack');
      }
      const metadata = parsePackOutput(output);
      tarball = selectedTarball(metadata, folder, value.version);
      if (existsSync(priorLog)) await verifyPackedSources(root, metadata, tarball, npmCli);
      const current = await qualify({ root, operation, version: value.version });
      if (current.source_binding !== qualification.source_binding)
        throw new Error('Source changed during npm prepack.');
      update('packed', { pack_metadata: metadata, tarball_sha256: sha(readFileSync(tarball)) });
    }
    update('qualified', { source_binding: qualification.source_binding, error: undefined });
    if (packOnly) {
      update('awaiting_assurance');
      return state;
    }
    const prefix = await npm(['prefix', '--global'], 'prefix');
    const globalRoot = await npm(['root', '--global'], 'global-root');
    if (!path.isAbsolute(prefix) || !path.isAbsolute(globalRoot))
      throw new Error('npm global locations must be absolute.');
    const installed = path.join(globalRoot, 'vida-agent');
    const installedManifest = path.join(installed, 'package.json');
    let matches = false;
    if (existsSync(installedManifest) && read(installedManifest).version === value.version) {
      matches = state.pack_metadata[0].files.every(({ path: relative }) => {
        const source = path.join(root, 'packages/agent', relative),
          target = path.join(installed, relative);
        return existsSync(source) && existsSync(target) && sha(readFileSync(source)) === sha(readFileSync(target));
      });
    }
    if (!matches) {
      if (state.install_started)
        throw new Error('Prior install outcome differs or remains uncertain; inspect before retrying installation.');
      update('installing', { install_started: true });
      await npm(['install', '--global', tarball], 'install');
    }
    const unrelated = directory(root, `.tmp/releases/${operation}/unrelated-cwd`);
    const cli = pathCli(env);
    const expectedShim =
      process.platform === 'win32' ? path.join(prefix, 'vida-agent.cmd') : path.join(prefix, 'bin/vida-agent');
    if (path.resolve(cli).toLowerCase() !== path.resolve(expectedShim).toLowerCase())
      throw new Error('PATH command differs from npm global prefix.');
    const entrypoint = path.join(installed, 'bin/vida-agent.mjs');
    if (
      process.platform === 'win32' &&
      !readFileSync(cli, 'utf8').includes('node_modules/vida-agent/bin/vida-agent.mjs') &&
      !readFileSync(cli, 'utf8').includes('node_modules\\vida-agent\\bin\\vida-agent.mjs')
    )
      throw new Error('PATH shim does not target installed package.');
    if (process.platform !== 'win32' && realpathSync(cli) !== realpathSync(entrypoint))
      throw new Error('PATH executable does not target installed package.');
    const invoke = (args, label) =>
      command(process.execPath, [entrypoint, ...args], {
        cwd: unrelated,
        env,
        log: path.join(folder, `${label}.json`),
      });
    const version = JSON.parse(await invoke(['version'], 'version'));
    if (version.name !== 'vida-agent' || version.version !== value.version)
      throw new Error('Installed CLI version differs.');
    const instruction = JSON.parse(await invoke(['instructions', '--path', 'development-lifecycle'], 'instructions'));
    if (
      instruction.version !== value.version ||
      realpathSync(instruction.path) !== realpathSync(path.join(installed, 'instructions/development-lifecycle.md'))
    )
      throw new Error('Installed instruction discovery differs.');
    const check = JSON.parse(await invoke(['install', '--check'], 'check'));
    if (check.status !== 'prerequisites_valid' || check.bun_pin !== '1.4.2')
      throw new Error('Installed prerequisite check failed.');
    update('successful', {
      installed_root: installed,
      prefix,
      path_command: cli,
      completed_at: new Date().toISOString(),
    });
    save(path.join(root, '.agent/work/agent-local-release/successful.json'), state);
    return state;
  } catch (error) {
    update(error.message.startsWith('awaiting_assurance:') ? 'awaiting_assurance' : 'failed', { error: error.message });
    throw error;
  }
}
async function main(args) {
  if (args.length === 1 && args[0] === '--prepare') return prepareRelease();
  if (
    args.length !== 2 ||
    !['--operation', '--pack', '--status', '--worker', '--pack-worker'].includes(args[0]) ||
    !idPattern.test(args[1])
  )
    throw new Error('Usage: release:local -- --prepare | --pack ID | --operation ID | --status ID');
  const operation = args[1];
  const folder = directory(repositoryRoot, `.tmp/releases/${operation}`);
  if (args[0] === '--status') return read(journalFile(repositoryRoot, operation));
  if (['--worker', '--pack-worker'].includes(args[0])) {
    const { verifyLocalReleaseAssurance, verifyLocalReleaseTests } = await import('./release-assurance.mjs');
    const mutex = await claimReleaseWorker(repositoryRoot, operation, process.pid);
    try {
      const packOnly = args[0] === '--pack-worker';
      return await executeRelease({
        operation,
        packOnly,
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
      [fileURLToPath(import.meta.url), args[0] === '--pack' ? '--pack-worker' : '--worker', operation],
      { cwd: repositoryRoot, env: process.env, detached: true, windowsHide: true, stdio: ['ignore', output, output] },
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
