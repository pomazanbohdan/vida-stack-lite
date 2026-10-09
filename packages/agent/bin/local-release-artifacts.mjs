import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import {
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  opendirSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const releaseIdPattern = /^[a-z0-9][a-z0-9-]{0,95}$/;
/** @param {unknown} value */
export const releaseJSON = (value) => JSON.stringify(value, null, 2) + '\n';
/** @param {Parameters<import('node:crypto').Hash['update']>[0]} bytes */
export const releaseDigest = (bytes) => createHash('sha256').update(bytes).digest('hex');
export function parseReleaseVersion(value) {
  const match = typeof value === 'string' && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(value);
  if (!match) return null;
  const components = match.slice(1).map(Number);
  return components.every(Number.isSafeInteger)
    ? { major: components[0], minor: components[1], patch: components[2] }
    : null;
}
/** @type {(value: unknown, message: string) => asserts value} */
export const requireRelease = (value, message) => {
  if (!value) throw Error('Local release: ' + message);
};
export const releaseRootDefault = fileURLToPath(new URL('../../../', import.meta.url));

/** @param {unknown} value */
export function releaseRelative(value) {
  requireRelease(
    typeof value === 'string' &&
      value.length > 0 &&
      value.length <= 1024 &&
      !/[\\\p{Cc}]/u.test(value) &&
      !value.startsWith('/') &&
      value
        .split('/')
        .every(
          (part) =>
            part &&
            part !== '.' &&
            part !== '..' &&
            !/[<>:"|?*]/.test(part) &&
            !/[. ]$/.test(part) &&
            !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part),
        ),
    'invalid relative path',
  );
  return value;
}

/**
 * The shared release namespace; no Host ledger or installation state is created here.
 * @param {string} root
 * @param {string} relative
 * @param {boolean} [allowMissing]
 */
export function releasePath(root, relative, allowMissing = false) {
  requireRelease(path.isAbsolute(root), 'absolute root required');
  const base = realpathSync(root);
  requireRelease(!lstatSync(root).isSymbolicLink(), 'linked root');
  let current = base;
  for (const part of releaseRelative(relative).split('/')) {
    current = path.join(current, part);
    const stat = lstatSync(current, { throwIfNoEntry: false });
    if (!stat) {
      requireRelease(allowMissing, 'path missing');
      continue;
    }
    requireRelease(
      !stat.isSymbolicLink() && (stat.isDirectory() || (stat.isFile() && stat.nlink === 1)),
      'linked or non-regular path',
    );
  }
  return current;
}

export function releaseDirectory(root, relative) {
  requireRelease(
    path.isAbsolute(root) && lstatSync(root).isDirectory() && !lstatSync(root).isSymbolicLink(),
    'root must be a real directory',
  );
  let current = realpathSync(root);
  for (const part of releaseRelative(relative).split('/')) {
    current = path.join(current, part);
    if (!existsSync(current)) mkdirSync(current);
    requireRelease(lstatSync(current).isDirectory() && !lstatSync(current).isSymbolicLink(), 'linked directory');
  }
  return current;
}

export function releaseJournalFile(root, operation) {
  requireRelease(releaseIdPattern.test(operation), 'operation invalid');
  return releasePath(root, '.agent/work/agent-local-release/' + operation + '/release.json', true);
}

export function parseReleaseState(value) {
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
  requireRelease(
    value &&
      value.schema === 'VidaLocalReleaseState/v1' &&
      releaseIdPattern.test(value.operation_id ?? '') &&
      parseReleaseVersion(value.version) !== null &&
      [
        'awaiting_assurance',
        'running',
        'qualified',
        'packing',
        'packed',
        'installing',
        'successful',
        'failed',
      ].includes(value.status) &&
      Object.keys(value).every((key) => allowed.has(key)),
    'current state invalid',
  );
  return value;
}

export function releaseState(file) {
  const stat = lstatSync(file);
  requireRelease(
    stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1 && stat.size <= 8 * 1024 * 1024,
    'state file unsafe',
  );
  return parseReleaseState(JSON.parse(readFileSync(file, 'utf8')));
}

export function saveReleaseState(file, value) {
  const temporary = file + '.' + randomUUID() + '.tmp';
  const descriptor = openSync(temporary, 'wx', 0o600);
  try {
    writeFileSync(descriptor, releaseJSON(value));
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
  renameSync(temporary, file);
}

function sqlite(file, timeout) {
  const require = createRequire(import.meta.url);
  if (process.versions.bun) {
    const { Database } = require('bun:sqlite');
    const connection = new Database(file, { create: true, strict: true });
    connection.exec('PRAGMA busy_timeout=' + timeout);
    return connection;
  }
  const { DatabaseSync } = require('node:sqlite');
  return new DatabaseSync(file, { timeout });
}

function openMutex(root, relative, timeout, busyIsNull = false) {
  releaseDirectory(root, path.posix.dirname(relative));
  const connection = sqlite(releasePath(root, relative, true), timeout);
  try {
    connection.exec('BEGIN IMMEDIATE');
    return connection;
  } catch (error) {
    connection.close();
    if (busyIsNull && (error.errcode === 5 || error.code === 'SQLITE_BUSY')) return null;
    throw error;
  }
}

export function operationMutex(root, operation) {
  requireRelease(releaseIdPattern.test(operation), 'operation invalid');
  return openMutex(root, '.agent/work/agent-local-release/' + operation + '/worker.sqlite', 0, true);
}

export function admissionMutex(root, allowPreparation = false) {
  const connection = openMutex(root, '.agent/work/agent-local-release/admission.sqlite', 1000);
  try {
    if (!allowPreparation) assertPreparationSettled(root);
    return connection;
  } catch (error) {
    connection.close();
    throw error;
  }
}

function assertPreparationSettled(root) {
  requireRelease(
    !existsSync(releasePath(root, '.agent/work/agent-local-release/preparation.json', true)),
    'preparation pending; resume release preparation before another operation',
  );
}

export async function withReleaseAdmission(root, action, allowPreparation = false) {
  const connection = admissionMutex(root, allowPreparation);
  let open = true;
  try {
    const result = action();
    requireRelease(!result || typeof result.then !== 'function', 'admission action must be synchronous and bounded');
    connection.exec('COMMIT');
    open = false;
    return result;
  } finally {
    try {
      if (open) connection.exec('ROLLBACK');
    } finally {
      connection.close();
    }
  }
}

/** Repair publication only. Expensive extraction/copies happen before this lock pair. */
export async function withReleaseRepairLocks(root, operation, action) {
  const admission = admissionMutex(root);
  let worker;
  try {
    worker = operationMutex(root, operation);
    requireRelease(worker, 'operation busy');
    return await action();
  } finally {
    try {
      worker?.close();
    } finally {
      admission.close();
    }
  }
}

export function packedDistribution(metadata) {
  requireRelease(
    Array.isArray(metadata) && metadata.length === 1 && Array.isArray(metadata[0].files),
    'exact metadata missing',
  );
  const paths = metadata[0].files.map((file) => releaseRelative(file.path));
  requireRelease(new Set(paths).size === paths.length, 'ambiguous file set');
  return paths.some((file) => file.startsWith('dist/standalone/')) ? 'native' : 'npm';
}

export function selectedTarball(metadata, folder, version) {
  requireRelease(Array.isArray(metadata) && metadata.length === 1, 'exact one archive required');
  const item = metadata[0];
  requireRelease(
    item.name === 'vida-agent' &&
      item.version === version &&
      typeof item.filename === 'string' &&
      path.basename(item.filename) === item.filename &&
      parseReleaseVersion(version) !== null &&
      item.filename === 'vida-agent-' + version + '.tgz' &&
      Array.isArray(item.files) &&
      item.files.length > 0,
    'archive identity differs',
  );
  for (const file of item.files) releaseRelative(file.path);
  const file = releasePath(folder, item.filename),
    stat = lstatSync(file);
  requireRelease(stat.isFile() && stat.size <= 512 * 1024 * 1024, 'archive unsafe or oversized');
  requireRelease(
    item.integrity === 'sha512-' + createHash('sha512').update(readFileSync(file)).digest('base64'),
    'archive integrity differs',
  );
  return file;
}

const excluded = new Set(['node_modules', 'dist', 'coverage', '.pack-inspect']);
const scratch = new Set(['.tmp', '.agent', 'packages/agent/.tmp', 'packages/agent/.agent']);
/**
 * @typedef {{ path: string, sha256: string }} ReleaseSourceInput
 * @typedef {readonly [number, number, number, number, number]} SourceIdentity
 * @typedef {{ path: string, identity: SourceIdentity }} SourceDirectoryIdentity
 * @typedef {(ReleaseSourceInput & { identity: SourceIdentity, kind?: never }) |
 *   (SourceDirectoryIdentity & { kind: 'directory' })} SourceObservation
 * @typedef {{ path: string }} SourceNodeMarker
 * @typedef {{
 *   root: string | null,
 *   rootInput: string | null,
 *   rootIdentity: SourceIdentity | null,
 *   physicalNodes: Set<string | SourceNodeMarker>,
 *   nodePaths: Map<string, string | SourceNodeMarker>,
 *   paths: Map<string, { entries: ReleaseSourceInput[], observations: SourceObservation[] }>
 * }} RepairSourceState
 */
/** @type {WeakMap<object, RepairSourceState>} */
const repairSourcePasses = new WeakMap();
const repairSourceNodeLimit = 8192;
/** @param {import('node:fs').Stats} info @returns {SourceIdentity} */
const sourceIdentity = (info) => [info.dev, info.ino, info.size, info.mtimeMs, info.ctimeMs];
/**
 * @param {RepairSourceState} state
 * @param {string} relative
 * @param {string} file
 * @param {import('node:fs').Stats} stat
 */
function registerRepairSourceNode(state, relative, file, stat) {
  releaseRelative(relative);
  requireRelease(!stat.isSymbolicLink(), 'linked source');
  requireRelease(stat.isFile() ? stat.nlink === 1 : stat.isDirectory(), 'source is not regular');
  const physicalKey =
    Number.isFinite(stat.ino) && stat.ino !== 0
      ? JSON.stringify([stat.dev, stat.ino])
      : process.platform === 'win32'
        ? path.resolve(file).toLowerCase()
        : path.resolve(file);
  const previous = state.nodePaths.get(relative);
  if (previous !== undefined) {
    if (previous === physicalKey) return;
    requireRelease(typeof previous === 'object', 'Source changed during scan');
    state.physicalNodes.delete(previous);
    if (!state.physicalNodes.has(physicalKey)) state.physicalNodes.add(physicalKey);
    state.nodePaths.set(relative, physicalKey);
    return;
  }
  if (state.physicalNodes.has(physicalKey)) {
    state.nodePaths.set(relative, physicalKey);
    return;
  }
  requireRelease(state.physicalNodes.size < repairSourceNodeLimit, 'Source enumeration exceeds bounded inventory');
  state.physicalNodes.add(physicalKey);
  state.nodePaths.set(relative, physicalKey);
}
/** @param {readonly SourceDirectoryIdentity[]} directories */
function verifySourceDirectories(directories) {
  for (const expected of directories) {
    const current = lstatSync(expected.path);
    requireRelease(!current.isSymbolicLink() && current.isDirectory(), 'linked source');
    requireRelease(
      releaseJSON(sourceIdentity(current)) === releaseJSON(expected.identity),
      'Source directory changed during scan',
    );
  }
}
/** @returns {object} */
export function createRepairSourcePass() {
  const pass = Object.freeze({});
  repairSourcePasses.set(pass, {
    root: null,
    rootInput: null,
    rootIdentity: null,
    physicalNodes: new Set(),
    nodePaths: new Map(),
    paths: new Map(),
  });
  return pass;
}
/** @param {object} pass @param {string} relative */
export function registerRepairSourcePath(pass, relative) {
  const state = repairSourcePasses.get(pass);
  requireRelease(state, 'invalid repair Source enumeration pass');
  const normalized = releaseRelative(relative),
    key = path.posix.normalize(normalized);
  if (state.nodePaths.has(key)) return;
  requireRelease(
    state.physicalNodes.size < repairSourceNodeLimit,
    'native evidence dependency closure exceeds bounded inventory',
  );
  const marker = { path: key };
  state.physicalNodes.add(marker);
  state.nodePaths.set(key, marker);
}
/**
 * @param {string} root
 * @param {string} relative
 * @param {SourceObservation[] | undefined} observations
 * @param {object} pass
 * @param {import('node:fs').Stats} [suppliedStat]
 * @param {readonly SourceDirectoryIdentity[]} [suppliedAncestors]
 * @returns {ReleaseSourceInput[]}
 */
function releaseSourceInputsForRepair(root, relative, observations, pass, suppliedStat, suppliedAncestors) {
  const state = repairSourcePasses.get(pass);
  requireRelease(state, 'invalid repair Source enumeration pass');
  const inputRoot = path.resolve(root),
    key = releaseRelative(relative);
  if (!state.root) {
    const physicalRoot = realpathSync(root);
    const rootStat = lstatSync(physicalRoot);
    requireRelease(!rootStat.isSymbolicLink() && rootStat.isDirectory(), 'linked source');
    state.root = physicalRoot;
    state.rootInput = inputRoot;
    state.rootIdentity = sourceIdentity(rootStat);
  }
  requireRelease(state.rootInput === inputRoot, 'repair Source enumeration root changed');
  requireRelease(state.rootIdentity !== null, 'repair Source root identity is missing');
  const physicalRoot = state.root,
    rootIdentity = state.rootIdentity;
  const cached = state.paths.get(key);
  if (cached) {
    if (observations && cached.observations) observations.push(...cached.observations);
    return cached.entries.slice();
  }
  const file = suppliedStat ? path.join(physicalRoot, ...key.split('/')) : releasePath(root, key),
    stat = suppliedStat ?? lstatSync(file),
    identity = sourceIdentity;
  const ancestors =
    suppliedAncestors ??
    (() => {
      const result = [{ path: physicalRoot, identity: rootIdentity }];
      let current = physicalRoot;
      for (const part of key.split('/').slice(0, -1)) {
        current = path.join(current, part);
        const info = lstatSync(current);
        requireRelease(!info.isSymbolicLink() && info.isDirectory(), 'linked source');
        result.push({ path: current, identity: identity(info) });
      }
      return result;
    })();
  if (stat.isDirectory() && scratch.has(relative)) {
    state.paths.set(key, { entries: [], observations: [] });
    return [];
  }
  registerRepairSourceNode(state, key, file, stat);
  if (stat.isFile()) {
    verifySourceDirectories(ancestors);
    requireRelease(stat.nlink === 1, 'linked or non-regular path');
    const before = identity(stat),
      sha256 = releaseDigest(readFileSync(file));
    requireRelease(releaseJSON(before) === releaseJSON(identity(lstatSync(file))), 'Source changed during read');
    verifySourceDirectories(ancestors);
    const entry = { path: relative, sha256 },
      observed = { path: relative, sha256, identity: before },
      result = { entries: [entry], observations: [observed] };
    state.paths.set(key, result);
    observations?.push(observed);
    return [entry];
  }
  requireRelease(stat.isDirectory(), 'source is not regular');
  const directoryChain = [...ancestors, { path: file, identity: identity(stat) }];
  verifySourceDirectories(directoryChain);
  const directory = opendirSync(file);
  /** @type {{ name: string, child: string, info: import('node:fs').Stats }[]} */
  const children = [];
  try {
    while (true) {
      const entry = directory.readSync();
      if (!entry) break;
      const name = entry.name,
        child = key + '/' + name;
      const childFile = path.join(physicalRoot, ...child.split('/')),
        info = lstatSync(childFile);
      requireRelease(!info.isSymbolicLink(), 'linked source');
      if (info.isDirectory() && (excluded.has(name) || scratch.has(child))) continue;
      registerRepairSourceNode(state, child, childFile, info);
      children.push({ name, child, info });
    }
  } finally {
    directory.closeSync();
  }
  verifySourceDirectories(directoryChain);
  children.sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0));
  /** @type {SourceObservation[]} */
  const localObservations = [];
  const result = children.flatMap(({ child, info }) =>
    releaseSourceInputsForRepair(root, child, localObservations, pass, info, directoryChain),
  );
  const before = identity(stat);
  /** @type {SourceObservation} */
  const observed = { path: relative, kind: 'directory', identity: before };
  verifySourceDirectories(directoryChain);
  requireRelease(
    releaseJSON(before) === releaseJSON(identity(lstatSync(file))),
    'Source directory changed during scan',
  );
  localObservations.push(observed);
  state.paths.set(key, { entries: result, observations: localObservations });
  observations?.push(...localObservations);
  return result.slice();
}
/**
 * @param {string} root
 * @param {string} relative
 * @param {SourceObservation[]} [observations]
 * @param {object} [repairPass]
 * @returns {ReleaseSourceInput[]}
 */
export function releaseSourceInputs(root, relative, observations, repairPass) {
  if (repairPass) return releaseSourceInputsForRepair(root, relative, observations, repairPass);
  const file = releasePath(root, relative),
    stat = lstatSync(file);
  if (stat.isFile()) {
    const before = sourceIdentity(stat),
      sha256 = releaseDigest(readFileSync(file));
    requireRelease(releaseJSON(before) === releaseJSON(sourceIdentity(lstatSync(file))), 'Source changed during read');
    observations?.push({ path: relative, sha256, identity: before });
    return [{ path: relative, sha256 }];
  }
  requireRelease(stat.isDirectory(), 'source is not regular');
  if (scratch.has(relative)) return [];
  const result = readdirSync(file)
    .sort()
    .flatMap((name) => {
      const child = relative + '/' + name,
        info = lstatSync(path.join(root, child));
      requireRelease(!info.isSymbolicLink(), 'linked source');
      if (info.isDirectory() && (excluded.has(name) || scratch.has(child))) return [];
      return releaseSourceInputs(root, child, observations);
    });
  if (observations) {
    const before = sourceIdentity(stat);
    requireRelease(
      releaseJSON(before) === releaseJSON(sourceIdentity(lstatSync(file))),
      'Source directory changed during scan',
    );
    observations.push({ path: relative, kind: 'directory', identity: before });
  }
  return result;
}

/** @param {string} [root] @param {boolean} [withObservations] @param {object} [repairPass] */
export function releaseSourceBinding(root = releaseRootDefault, withObservations = false, repairPass) {
  /** @type {SourceObservation[] | undefined} */
  const observations = withObservations ? [] : undefined;
  const entries = [
    'package.json',
    'agent-runtime.config.v1.yaml',
    'AGENT.sidecar.md',
    'packages/agent',
    'tooling/agent/release-local.mjs',
    'tooling/agent/release-assurance.mjs',
    'tooling/agent/release-ci-evidence.mjs',
    'tooling/agent/native-ci-delivery.mjs',
    'tooling/agent/controllers/forward-review-proof.mjs',
  ].flatMap((relative) => releaseSourceInputs(root, relative, observations, repairPass));
  return { source_binding: releaseDigest(JSON.stringify(entries)), entries, ...(observations ? { observations } : {}) };
}

export function retargetStateRelative(operation) {
  requireRelease(releaseIdPattern.test(operation), 'operation invalid');
  return '.agent/work/agent-local-release/' + operation + '/retarget/state.json';
}

export function assertReleaseRetargetSettled(root, operation) {
  const file = releasePath(root, retargetStateRelative(operation), true);
  const planFile = releasePath(root, '.agent/work/agent-local-release/' + operation + '/retarget/plan.json', true);
  if (!existsSync(file)) {
    requireRelease(!existsSync(planFile), 'retarget repair missing phase');
    return;
  }
  requireRelease(lstatSync(file).isFile() && lstatSync(file).size <= 8 * 1024 * 1024, 'retarget state unsafe');
  const state = JSON.parse(readFileSync(file, 'utf8'));
  const { digest, ...body } = state;
  requireRelease(
    state.schema === 'VidaReleaseRetargetState/v1' &&
      state.operation_id === operation &&
      Object.keys(state).sort().join() ===
        ['schema', 'operation_id', 'plan_digest', 'phase', 'release_after_sha256', 'digest'].sort().join() &&
      state.phase === 'complete' &&
      digest === releaseDigest(releaseJSON(body)),
    'retarget repair active or invalid',
  );
  requireRelease(lstatSync(planFile).isFile() && lstatSync(planFile).size <= 8 * 1024 * 1024, 'retarget plan unsafe');
  const plan = JSON.parse(readFileSync(planFile, 'utf8'));
  const { digest: planDigest, ...planBody } = plan;
  requireRelease(
    plan.schema === 'VidaReleaseRetargetPlan/v1' &&
      plan.operation_id === operation &&
      planDigest === state.plan_digest &&
      planDigest === releaseDigest(releaseJSON(planBody)) &&
      state.release_after_sha256 === releaseDigest(releaseJSON(plan.release_after)),
    'retarget plan binding differs',
  );
  const current = releaseState(releaseJournalFile(root, operation));
  // A completed repair permits normal worker status/PID progress, while retaining its candidate binding.
  requireRelease(
    current.version === plan.version &&
      current.source_binding === plan.release_after.source_binding &&
      current.tarball_sha256 === plan.release_after.tarball_sha256 &&
      releaseJSON(current.pack_metadata) === releaseJSON(plan.release_after.pack_metadata),
    'retarget candidate binding changed',
  );
}
