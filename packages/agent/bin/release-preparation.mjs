import { closeSync, existsSync, fstatSync, openSync, readSync, renameSync } from 'node:fs';
import path from 'node:path';
import {
  parseReleaseState,
  releaseDirectory,
  releaseJSON,
  releasePath,
  requireRelease,
  saveReleaseState,
  withReleaseAdmission,
} from './local-release-artifacts.mjs';

const intentPath = '.agent/work/agent-local-release/preparation.json';
const manifestPath = 'packages/agent/package.json';
const pendingPath = '.agent/work/agent-local-release/pending.json';
const byteLimit = 8 * 1024 * 1024;
const exactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).sort().join(',') === [...keys].sort().join(',');

function readBytes(file) {
  const descriptor = openSync(file, 'r');
  try {
    const before = fstatSync(descriptor);
    requireRelease(before.isFile() && before.nlink === 1 && before.size <= byteLimit,
      'preparation file unsafe or exceeds its byte bound');
    const buffer = Buffer.alloc(before.size + 1);
    let length = 0;
    while (length < buffer.length) {
      const count = readSync(descriptor, buffer, length, buffer.length - length, null);
      if (count === 0) break;
      length += count;
    }
    const after = fstatSync(descriptor);
    requireRelease(length === before.size && after.size === before.size && after.mtimeMs === before.mtimeMs &&
      after.ctimeMs === before.ctimeMs, 'preparation file changed during read');
    return buffer.subarray(0, length);
  } finally {
    closeSync(descriptor);
  }
}

function readImage(root, relative) {
  const file = releasePath(root, relative, true);
  if (!existsSync(file)) return null;
  return readBytes(file).toString('base64');
}

function decodeImage(image) {
  requireRelease(typeof image === 'string' && image.length <= byteLimit * 2, 'preparation image invalid');
  const bytes = Buffer.from(image, 'base64');
  requireRelease(bytes.length <= byteLimit && bytes.toString('base64') === image, 'preparation image encoding differs');
  return bytes;
}

function validateIntent(value) {
  requireRelease(exactKeys(value, ['schema', 'prepared', 'targets']) && value.schema === 'VidaReleasePreparation/v1',
    'preparation intent shape differs');
  const prepared = parseReleaseState(value.prepared);
  requireRelease(exactKeys(prepared, ['schema', 'operation_id', 'version', 'status']) &&
    prepared.status === 'awaiting_assurance', 'preparation must precede worker effects');
  requireRelease(Array.isArray(value.targets) && [3, 4].includes(value.targets.length), 'preparation target count differs');
  const operationRoot = `.agent/work/agent-local-release/${prepared.operation_id}`;
  const paths = [manifestPath, ...(value.targets.length === 4 ? [`${operationRoot}/disposition.json`] : []),
    `${operationRoot}/release.json`, pendingPath];
  for (const [index, target] of value.targets.entries()) {
    requireRelease(exactKeys(target, ['path', 'before', 'after']) && target.path === paths[index],
      'preparation target path or shape differs');
    if (target.before !== null) decodeImage(target.before);
    const after = decodeImage(target.after);
    requireRelease(target.path === manifestPath || Buffer.from(releaseJSON(JSON.parse(after.toString('utf8')))).equals(after),
      'preparation afterimage is not exact release JSON');
    if (target.path.startsWith(operationRoot + '/'))
      requireRelease(target.before === null, 'preparation operation already existed');
  }
  const manifest = value.targets[0];
  requireRelease(manifest.before !== null, 'preparation manifest beforeimage missing');
  const original = JSON.parse(decodeImage(manifest.before).toString('utf8'));
  requireRelease(original.name === 'vida-agent' &&
    (original.version === prepared.version && manifest.after === manifest.before ||
      original.version !== prepared.version &&
      Buffer.from(releaseJSON({ ...original, version: prepared.version })).equals(decodeImage(manifest.after))),
    'preparation changes more than the manifest version');
  const stateImage = Buffer.from(releaseJSON(prepared)).toString('base64');
  requireRelease(value.targets.at(-1).after === stateImage && value.targets.at(-2).after === stateImage,
    'preparation journal or pending identity differs');
  return value;
}

function readIntent(file) {
  const bytes = readBytes(file);
  return { bytes, intent: validateIntent(JSON.parse(bytes.toString('utf8'))) };
}

function receiptPath(root, prepared) {
  return releasePath(root, `.agent/work/agent-local-release/${prepared.operation_id}/preparation.json`, true);
}

/** The retained beforeimage makes an acknowledged or interrupted version override retryable. */
export function readReleasePreparation(root, prepared) {
  const file = receiptPath(root, prepared);
  if (!existsSync(file)) return null;
  const { intent } = readIntent(file);
  requireRelease(intent.prepared.operation_id === prepared.operation_id && intent.prepared.version === prepared.version,
    'preparation receipt differs from pending release');
  const dispositionTarget = intent.targets.length === 4 ? intent.targets[1] : null;
  if (dispositionTarget)
    requireRelease(readImage(root, dispositionTarget.path) === dispositionTarget.after,
      'preparation disposition receipt changed');
  return {
    priorVersion: JSON.parse(decodeImage(intent.targets[0].before).toString('utf8')).version,
    disposition: dispositionTarget ? JSON.parse(decodeImage(dispositionTarget.after).toString('utf8')) : null,
  };
}

/** Resume only exact before/after images. An uncertain worker is never launched here. */
export function resumeReleasePreparation(root) {
  const file = releasePath(root, intentPath, true);
  if (!existsSync(file)) return null;
  const { bytes, intent } = readIntent(file);
  const receipt = receiptPath(root, intent.prepared);
  requireRelease(!existsSync(receipt), 'preparation receipt already exists; retain the intent');
  const currentImage = target => {
    const current = readImage(root, target.path);
    requireRelease(current === target.before || current === target.after,
      'preparation target changed; preserve the intent and do not repeat effects');
    return current;
  };
  // Validate the whole set before the first write; recheck each target at publication.
  intent.targets.forEach(currentImage);
  releaseDirectory(root, `.agent/work/agent-local-release/${intent.prepared.operation_id}`);
  releaseDirectory(root, `.tmp/releases/${intent.prepared.operation_id}`);
  for (const target of intent.targets) {
    if (currentImage(target) !== target.after)
      saveReleaseState(releasePath(root, target.path, true), JSON.parse(decodeImage(target.after).toString('utf8')));
  }
  requireRelease(intent.targets.every(target => readImage(root, target.path) === target.after) &&
    readBytes(file).equals(bytes), 'preparation changed before completion');
  renameSync(file, receipt);
  return intent.prepared;
}

/** Caller holds release admission; the pending pointer is published last. */
export function publishReleasePreparation(root, prepared, manifest, disposition) {
  const file = releasePath(root, intentPath, true);
  requireRelease(!existsSync(file), 'resume the pending preparation before selecting a version');
  const operationRoot = `.agent/work/agent-local-release/${prepared.operation_id}`;
  requireRelease(!existsSync(receiptPath(root, prepared)), 'preparation operation already existed');
  const values = [
    [manifestPath, manifest],
    ...(disposition ? [[`${operationRoot}/disposition.json`, disposition]] : []),
    [`${operationRoot}/release.json`, prepared],
    [pendingPath, prepared],
  ];
  const intent = validateIntent({
    schema: 'VidaReleasePreparation/v1',
    prepared,
    targets: values.map(([relative, after]) => {
      const before = readImage(root, relative);
      const unchangedManifest = relative === manifestPath && before !== null &&
        releaseJSON(JSON.parse(decodeImage(before).toString('utf8'))) === releaseJSON(after);
      return { path: relative, before,
        after: unchangedManifest ? before : Buffer.from(releaseJSON(after)).toString('base64') };
    }),
  });
  requireRelease(Buffer.byteLength(releaseJSON(intent)) <= byteLimit, 'preparation intent exceeds its byte bound');
  saveReleaseState(file, intent);
  return resumeReleasePreparation(root);
}

/** Bundle-owned exact forward resume; it never selects a version or starts a worker. */
export function runReleasePreparation(args) {
  const options = new Map();
  requireRelease(Array.isArray(args) && args.length === 6, 'release preparation requires kind, mode and project root');
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    requireRelease(['--kind', '--mode', '--project-root'].includes(key) && !options.has(key),
      'release preparation arguments differ');
    options.set(key, args[index + 1]);
  }
  requireRelease(options.get('--kind') === 'release-preparation' && options.get('--mode') === 'resume' &&
    path.isAbsolute(options.get('--project-root') ?? ''), 'release preparation supports exact resume only');
  const root = options.get('--project-root');
  return withReleaseAdmission(root, () => resumeReleasePreparation(root) ?? { status: 'settled' }, true);
}
