import {
  assertReconcileOptionKeys,
  reconcileAllowedOptions,
  reconcileCliContracts,
} from './reconcile-cli-contracts.ts';
import { existsSync, renameSync } from 'node:fs';
import path from 'node:path';
import {
  parseReleaseState,
  readReleaseBytes,
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
/** @typedef {{schema: 'VidaLocalReleaseState/v1', operation_id: string, version: string, status: 'awaiting_assurance'}} PreparedRelease */
/** @typedef {{path: string, before: string|null, after: string}} PreparationTarget */
/** @typedef {{operation_id: string, version: string}} PreparationIdentity */
/** @typedef {{schema: 'VidaReleasePreparation/v1', prepared: PreparedRelease, targets: PreparationTarget[]}} PreparationIntent */
/** @typedef {[[typeof manifestPath, unknown], [string, unknown], [string, PreparedRelease], [typeof pendingPath, PreparedRelease]] | [[typeof manifestPath, unknown], [string, PreparedRelease], [typeof pendingPath, PreparedRelease]]} PreparationPublicationTargets */
/** @param {unknown} value @param {readonly string[]} keys @returns {value is Record<string, unknown>} */
const exactKeys = (value, keys) =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.keys(value).sort().join(',') === [...keys].sort().join(',');
/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** @param {string} root @param {string} relative @returns {string|null} */
function readImage(root, relative) {
  const file = releasePath(root, relative, true);
  if (!existsSync(file)) return null;
  return readReleaseBytes(root, relative, byteLimit).toString('base64');
}

/** @param {unknown} image @returns {Buffer} */
function decodeImage(image) {
  requireRelease(typeof image === 'string' && image.length <= byteLimit * 2, 'preparation image invalid');
  const bytes = Buffer.from(image, 'base64');
  requireRelease(bytes.length <= byteLimit && bytes.toString('base64') === image, 'preparation image encoding differs');
  return bytes;
}

/** @param {unknown} value @returns {PreparationIntent} */
function validateIntent(value) {
  requireRelease(
    exactKeys(value, ['schema', 'prepared', 'targets']) && value.schema === 'VidaReleasePreparation/v1',
    'preparation intent shape differs',
  );
  /** @type {unknown} */
  const preparedValue = value.prepared;
  const parsedPrepared = parseReleaseState(preparedValue);
  requireRelease(
    exactKeys(parsedPrepared, ['schema', 'operation_id', 'version', 'status']) &&
      parsedPrepared.status === 'awaiting_assurance',
    'preparation must precede worker effects',
  );
  const prepared = /** @type {PreparedRelease} */ (parsedPrepared);
  requireRelease(
    Array.isArray(value.targets) && [3, 4].includes(value.targets.length),
    'preparation target count differs',
  );
  const operationRoot = `.agent/work/agent-local-release/${prepared.operation_id}`;
  const paths = [
    manifestPath,
    ...(value.targets.length === 4 ? [`${operationRoot}/disposition.json`] : []),
    `${operationRoot}/release.json`,
    pendingPath,
  ];
  /** @type {unknown[]} */
  const targetValues = value.targets;
  for (const [index, targetValue] of targetValues.entries())
    validatePreparationTarget(targetValue, paths[index], operationRoot);
  const targets = /** @type {PreparationTarget[]} */ (targetValues);
  const manifest = targets[0];
  requireRelease(manifest, 'preparation manifest target missing');
  requireRelease(manifest.before !== null, 'preparation manifest beforeimage missing');
  /** @type {unknown} */
  const originalValue = JSON.parse(decodeImage(manifest.before).toString('utf8'));
  requireRelease(
    isRecord(originalValue) &&
      originalValue.name === 'vida-agent' &&
      ((originalValue.version === prepared.version && manifest.after === manifest.before) ||
        (originalValue.version !== prepared.version &&
          Buffer.from(releaseJSON({ ...originalValue, version: prepared.version })).equals(
            decodeImage(manifest.after),
          ))),
    'preparation changes more than the manifest version',
  );
  const stateImage = Buffer.from(releaseJSON(prepared)).toString('base64');
  requireRelease(
    targets.at(-1)?.after === stateImage && targets.at(-2)?.after === stateImage,
    'preparation journal or pending identity differs',
  );
  return /** @type {PreparationIntent} */ (value);
}

/** @param {unknown} value @param {string|undefined} expectedPath @param {string} operationRoot */
function validatePreparationTarget(value, expectedPath, operationRoot) {
  requireRelease(
    exactKeys(value, ['path', 'before', 'after']) && value.path === expectedPath,
    'preparation target path or shape differs',
  );
  if (value.before !== null) decodeImage(value.before);
  const after = decodeImage(value.after);
  /** @type {unknown} */
  const afterJson = JSON.parse(after.toString('utf8'));
  requireRelease(
    value.path === manifestPath || Buffer.from(releaseJSON(afterJson)).equals(after),
    'preparation afterimage is not exact release JSON',
  );
  if (typeof value.path === 'string' && value.path.startsWith(operationRoot + '/'))
    requireRelease(value.before === null, 'preparation operation already existed');
}

/** @param {string} root @param {string} file @returns {{bytes: Buffer, intent: PreparationIntent}} */
function readIntent(root, file) {
  const relative = path.relative(root, file).split(path.sep).join('/');
  const bytes = readReleaseBytes(root, relative, byteLimit);
  /** @type {unknown} */
  const parsed = JSON.parse(bytes.toString('utf8'));
  return { bytes, intent: validateIntent(parsed) };
}

/** @param {string} root @param {PreparationIdentity} prepared @returns {string} */
function receiptPath(root, prepared) {
  return releasePath(root, `.agent/work/agent-local-release/${prepared.operation_id}/preparation.json`, true);
}

/** The retained beforeimage makes an acknowledged or interrupted version override retryable. */
/** @param {string} root @param {PreparationIdentity} prepared @returns {{priorVersion: unknown, disposition: unknown}|null} */
export function readReleasePreparation(root, prepared) {
  const file = receiptPath(root, prepared);
  if (!existsSync(file)) return null;
  const { intent } = readIntent(root, file);
  requireRelease(
    intent.prepared.operation_id === prepared.operation_id && intent.prepared.version === prepared.version,
    'preparation receipt differs from pending release',
  );
  const dispositionTarget = readPreparationDisposition(root, intent);
  const priorTarget = intent.targets[0];
  requireRelease(priorTarget, 'preparation manifest beforeimage missing');
  const priorBytes = priorTarget.before;
  requireRelease(priorBytes !== null, 'preparation manifest beforeimage missing');
  /** @type {unknown} */
  const priorManifest = JSON.parse(decodeImage(priorBytes).toString('utf8'));
  requireRelease(isRecord(priorManifest), 'preparation manifest beforeimage invalid');
  /** @type {unknown} */
  const disposition = dispositionTarget ? JSON.parse(decodeImage(dispositionTarget.after).toString('utf8')) : null;
  return { priorVersion: priorManifest.version, disposition };
}

/** @param {string} root @param {PreparationIntent} intent @returns {PreparationTarget|null} */
function readPreparationDisposition(root, intent) {
  if (intent.targets.length !== 4) return null;
  const target = intent.targets[1];
  requireRelease(target, 'preparation disposition target missing');
  requireRelease(readImage(root, target.path) === target.after, 'preparation disposition receipt changed');
  return target;
}

/** Resume only exact before/after images. An uncertain worker is never launched here. */
/** @param {string} root @returns {PreparedRelease|null} */
export function resumeReleasePreparation(root) {
  const file = releasePath(root, intentPath, true);
  if (!existsSync(file)) return null;
  const { bytes, intent } = readIntent(root, file);
  const receipt = receiptPath(root, intent.prepared);
  requireRelease(!existsSync(receipt), 'preparation receipt already exists; retain the intent');
  /** @param {PreparationTarget} target @returns {string|null} */
  const currentImage = (target) => {
    const current = readImage(root, target.path);
    requireRelease(
      current === target.before || current === target.after,
      'preparation target changed; preserve the intent and do not repeat effects',
    );
    return current;
  };
  // Validate the whole set before the first write; recheck each target at publication.
  intent.targets.forEach((target) => currentImage(target));
  releaseDirectory(root, `.agent/work/agent-local-release/${intent.prepared.operation_id}`);
  releaseDirectory(root, `.tmp/releases/${intent.prepared.operation_id}`);
  for (const target of intent.targets) {
    if (currentImage(target) !== target.after)
      saveReleaseState(releasePath(root, target.path, true), JSON.parse(decodeImage(target.after).toString('utf8')));
  }
  requireRelease(
    intent.targets.every((target) => readImage(root, target.path) === target.after) &&
      readReleaseBytes(root, intentPath, byteLimit).equals(bytes),
    'preparation changed before completion',
  );
  renameSync(file, receipt);
  return intent.prepared;
}

/** Caller holds release admission; the pending pointer is published last. */
/** @param {string} root @param {PreparedRelease} prepared @param {unknown} manifest @param {unknown} disposition @returns {PreparedRelease|null} */
export function publishReleasePreparation(root, prepared, manifest, disposition) {
  const file = releasePath(root, intentPath, true);
  requireRelease(!existsSync(file), 'resume the pending preparation before selecting a version');
  const operationRoot = `.agent/work/agent-local-release/${prepared.operation_id}`;
  requireRelease(!existsSync(receiptPath(root, prepared)), 'preparation operation already existed');
  /** @type {PreparationPublicationTargets} */
  const values = disposition
    ? [
        [manifestPath, manifest],
        [`${operationRoot}/disposition.json`, disposition],
        [`${operationRoot}/release.json`, prepared],
        [pendingPath, prepared],
      ]
    : [
        [manifestPath, manifest],
        [`${operationRoot}/release.json`, prepared],
        [pendingPath, prepared],
      ];
  const intent = validateIntent({
    schema: 'VidaReleasePreparation/v1',
    prepared,
    targets: values.map(([relative, after]) => preparationTarget(root, relative, after)),
  });
  requireRelease(Buffer.byteLength(releaseJSON(intent)) <= byteLimit, 'preparation intent exceeds its byte bound');
  saveReleaseState(file, intent);
  return resumeReleasePreparation(root);
}

/** @param {string} root @param {string} relative @param {unknown} after @returns {PreparationTarget} */
function preparationTarget(root, relative, after) {
  const before = readImage(root, relative);
  /** @type {unknown} */
  const previousManifest = before === null ? null : JSON.parse(decodeImage(before).toString('utf8'));
  const afterJson = releaseJSON(after);
  const unchangedManifest = relative === manifestPath && before !== null && releaseJSON(previousManifest) === afterJson;
  return { path: relative, before, after: unchangedManifest ? before : Buffer.from(afterJson).toString('base64') };
}

/** Bundle-owned exact forward resume; it never selects a version or starts a worker. */
/** @param {readonly string[]} args @returns {Promise<PreparedRelease|{status: 'settled'}>} */
export function runReleasePreparation(args) {
  const contract = reconcileCliContracts['release-preparation'];
  requireRelease(contract, 'release preparation command declaration missing');
  const options = preparationOptions(args, reconcileAllowedOptions('release-preparation'));
  const selectedMode = String(options.get('--mode'));
  assertReconcileOptionKeys(
    Object.fromEntries(options),
    'release-preparation',
    selectedMode,
    'release preparation options differ from declaration',
  );
  requireRelease(
    options.get('--kind') === 'release-preparation' &&
      contract.modes.includes(selectedMode) &&
      path.isAbsolute(options.get('--project-root') ?? ''),
    'release preparation supports exact resume only',
  );
  const root = /** @type {string} */ (options.get('--project-root'));
  return withReleaseAdmission(root, () => resumeReleasePreparation(root) ?? { status: 'settled' }, true);
}

/** @param {readonly string[]} args @param {readonly string[]} allowedOptions @returns {Map<string,string>} */
function preparationOptions(args, allowedOptions) {
  /** @type {Map<string, string>} */
  const options = new Map();
  requireRelease(Array.isArray(args) && args.length === 6, 'release preparation requires kind, mode and project root');
  for (let index = 0; index < args.length; index += 2) {
    /** @type {unknown} */
    const key = args[index];
    /** @type {unknown} */
    const value = args[index + 1];
    requireRelease(
      typeof key === 'string' && allowedOptions.includes(key) && !options.has(key) && typeof value === 'string',
      'release preparation arguments differ',
    );
    options.set(key, value);
  }
  return options;
}
