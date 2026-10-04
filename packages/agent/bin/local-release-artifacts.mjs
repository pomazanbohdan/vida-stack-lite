import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import {
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
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
export const releaseJSON = (value) => JSON.stringify(value, null, 2) + '\n';
export const releaseDigest = (bytes) => createHash('sha256').update(bytes).digest('hex');
export const requireRelease = (value, message) => {
  if (!value) throw Error('Local release: ' + message);
};
export const releaseRootDefault = fileURLToPath(new URL('../../../', import.meta.url));

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

/** The shared release namespace; no Host ledger or installation state is created here. */
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
      /^0\.1\.(0|[1-9]\d*)$/.test(value.version ?? '') &&
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

export function admissionMutex(root) {
  return openMutex(root, '.agent/work/agent-local-release/admission.sqlite', 1000);
}

export async function withReleaseAdmission(root, action) {
  const connection = admissionMutex(root);
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
      /^vida-agent-0\.1\.\d+\.tgz$/.test(item.filename) &&
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
export function releaseSourceInputs(root, relative, observations) {
  const file = releasePath(root, relative),
    stat = lstatSync(file);
  if (stat.isFile()) {
    const identity = (info) => [info.dev, info.ino, info.size, info.mtimeMs, info.ctimeMs];
    const before = identity(stat),
      sha256 = releaseDigest(readFileSync(file));
    requireRelease(releaseJSON(before) === releaseJSON(identity(lstatSync(file))), 'Source changed during read');
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
    const identity = (info) => [info.dev, info.ino, info.size, info.mtimeMs, info.ctimeMs];
    const before = identity(stat);
    requireRelease(
      releaseJSON(before) === releaseJSON(identity(lstatSync(file))),
      'Source directory changed during scan',
    );
    observations.push({ path: relative, kind: 'directory', identity: before });
  }
  return result;
}

export function releaseSourceBinding(root = releaseRootDefault, withObservations = false) {
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
  ].flatMap((relative) => releaseSourceInputs(root, relative, observations));
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
