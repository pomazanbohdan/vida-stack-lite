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
} from './local-release-artifacts.ts';
import {
  assertReconcileOptionKeys,
  reconcileAllowedOptions,
  reconcileCliContracts,
} from './reconcile-cli-contracts.ts';

const intentPath = '.agent/work/agent-local-release/preparation.json';
const manifestPath = 'packages/agent/package.json';
const pendingPath = '.agent/work/agent-local-release/pending.json';
const byteLimit = 8 * 1024 * 1024;

type PreparedRelease = {
  schema: 'VidaLocalReleaseState/v1';
  operation_id: string;
  version: string;
  status: 'awaiting_assurance';
};

type PreparationTarget = {
  path: string;
  before: string | null;
  after: string;
};

type PreparationIdentity = {
  operation_id: string;
  version: string;
};

type PreparationIntent = {
  schema: 'VidaReleasePreparation/v1';
  prepared: PreparedRelease;
  targets: PreparationTarget[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return isRecord(value) && Object.keys(value).sort().join(',') === [...keys].sort().join(',');
}

function isPreparedRelease(value: unknown): value is PreparedRelease {
  return (
    exactKeys(value, ['schema', 'operation_id', 'version', 'status']) &&
    value.schema === 'VidaLocalReleaseState/v1' &&
    typeof value.operation_id === 'string' &&
    typeof value.version === 'string' &&
    value.status === 'awaiting_assurance'
  );
}

function parsePreparedRelease(value: unknown): PreparedRelease {
  const parsed = parseReleaseState(value);
  requireRelease(isPreparedRelease(parsed), 'preparation must precede worker effects');
  return parsed;
}

function readImage(root: string, relative: string): string | null {
  const file = releasePath(root, relative, true);
  if (!existsSync(file)) return null;
  return readReleaseBytes(root, relative, byteLimit).toString('base64');
}

function decodeImage(image: unknown): Buffer {
  requireRelease(typeof image === 'string' && image.length <= byteLimit * 2, 'preparation image invalid');
  const bytes = Buffer.from(image, 'base64');
  requireRelease(bytes.length <= byteLimit && bytes.toString('base64') === image, 'preparation image encoding differs');
  return bytes;
}

function validatePreparationTarget(
  value: unknown,
  expectedPath: string | undefined,
  operationRoot: string,
): PreparationTarget {
  requireRelease(
    exactKeys(value, ['path', 'before', 'after']) && value.path === expectedPath,
    'preparation target path or shape differs',
  );
  if (value.before !== null) decodeImage(value.before);
  const before = value.before;
  requireRelease(before === null || typeof before === 'string', 'preparation image invalid');
  const afterImage = value.after;
  const after = decodeImage(afterImage);
  requireRelease(typeof afterImage === 'string', 'preparation image invalid');
  const targetPath = value.path;
  requireRelease(typeof targetPath === 'string', 'preparation target path or shape differs');
  const afterJson: unknown = JSON.parse(after.toString('utf8'));
  requireRelease(
    targetPath === manifestPath || Buffer.from(releaseJSON(afterJson)).equals(after),
    'preparation afterimage is not exact release JSON',
  );
  if (targetPath.startsWith(operationRoot + '/'))
    requireRelease(before === null, 'preparation operation already existed');
  return { path: targetPath, before, after: afterImage };
}

function validateIntent(value: unknown): PreparationIntent {
  requireRelease(
    exactKeys(value, ['schema', 'prepared', 'targets']) && value.schema === 'VidaReleasePreparation/v1',
    'preparation intent shape differs',
  );
  const prepared = parsePreparedRelease(value.prepared);
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
  const targets = value.targets.map((target, index) => validatePreparationTarget(target, paths[index], operationRoot));
  const manifest = targets[0];
  requireRelease(manifest !== undefined, 'preparation manifest target missing');
  requireRelease(manifest.before !== null, 'preparation manifest beforeimage missing');
  const originalValue: unknown = JSON.parse(decodeImage(manifest.before).toString('utf8'));
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
  return { schema: 'VidaReleasePreparation/v1', prepared, targets };
}

function readIntent(root: string, file: string): { bytes: Buffer; intent: PreparationIntent } {
  const relative = path.relative(root, file).split(path.sep).join('/');
  const bytes = readReleaseBytes(root, relative, byteLimit);
  const parsed: unknown = JSON.parse(bytes.toString('utf8'));
  return { bytes, intent: validateIntent(parsed) };
}

function receiptPath(root: string, prepared: PreparationIdentity): string {
  return releasePath(root, `.agent/work/agent-local-release/${prepared.operation_id}/preparation.json`, true);
}

/** The retained beforeimage makes an acknowledged or interrupted version override retryable. */
export function readReleasePreparation(
  root: string,
  prepared: PreparationIdentity,
): { priorVersion: unknown; disposition: unknown } | null;
export function readReleasePreparation(
  root: string,
  prepared: PreparationIdentity,
  includePreviousPending: true,
): { priorVersion: unknown; disposition: unknown; previousPending: Buffer | null } | null;
export function readReleasePreparation(
  root: string,
  prepared: PreparationIdentity,
  includePreviousPending = false,
): { priorVersion: unknown; disposition: unknown; previousPending?: Buffer | null } | null {
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
  const priorManifest: unknown = JSON.parse(decodeImage(priorBytes).toString('utf8'));
  requireRelease(isRecord(priorManifest), 'preparation manifest beforeimage invalid');
  const disposition: unknown = dispositionTarget
    ? JSON.parse(decodeImage(dispositionTarget.after).toString('utf8'))
    : null;
  const result = { priorVersion: priorManifest.version, disposition };
  if (!includePreviousPending) return result;
  const pendingTarget = intent.targets.at(-1);
  requireRelease(pendingTarget, 'preparation pending target missing');
  return {
    ...result,
    previousPending: pendingTarget.before === null ? null : decodeImage(pendingTarget.before),
  };
}

function readPreparationDisposition(root: string, intent: PreparationIntent): PreparationTarget | null {
  if (intent.targets.length !== 4) return null;
  const target = intent.targets[1];
  requireRelease(target, 'preparation disposition target missing');
  requireRelease(readImage(root, target.path) === target.after, 'preparation disposition receipt changed');
  return target;
}

/** Resume only exact before/after images. An uncertain worker is never launched here. */
export function resumeReleasePreparation(root: string): PreparedRelease | null {
  const file = releasePath(root, intentPath, true);
  if (!existsSync(file)) return null;
  const { bytes, intent } = readIntent(root, file);
  const receipt = receiptPath(root, intent.prepared);
  requireRelease(!existsSync(receipt), 'preparation receipt already exists; retain the intent');
  const currentImage = (target: PreparationTarget): string | null => {
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
export function publishReleasePreparation(
  root: string,
  prepared: PreparedRelease,
  manifest: unknown,
  disposition: unknown,
): PreparedRelease | null {
  const file = releasePath(root, intentPath, true);
  requireRelease(!existsSync(file), 'resume the pending preparation before selecting a version');
  const operationRoot = `.agent/work/agent-local-release/${prepared.operation_id}`;
  requireRelease(!existsSync(receiptPath(root, prepared)), 'preparation operation already existed');
  const values: Array<readonly [string, unknown]> = disposition
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

function preparationTarget(root: string, relative: string, after: unknown): PreparationTarget {
  const before = readImage(root, relative);
  const previousManifest: unknown = before === null ? null : JSON.parse(decodeImage(before).toString('utf8'));
  const afterJson = releaseJSON(after);
  const unchangedManifest = relative === manifestPath && before !== null && releaseJSON(previousManifest) === afterJson;
  return { path: relative, before, after: unchangedManifest ? before : Buffer.from(afterJson).toString('base64') };
}

/** Bundle-owned exact forward resume; it never selects a version or starts a worker. */
export function runReleasePreparation(args: readonly string[]): Promise<PreparedRelease | { status: 'settled' }> {
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
  const projectRoot = options.get('--project-root');
  requireRelease(
    options.get('--kind') === 'release-preparation' &&
      contract.modes.includes(selectedMode) &&
      typeof projectRoot === 'string' &&
      path.isAbsolute(projectRoot),
    'release preparation supports exact resume only',
  );
  return withReleaseAdmission(projectRoot, () => resumeReleasePreparation(projectRoot) ?? { status: 'settled' }, true);
}

function preparationOptions(args: readonly string[], allowedOptions: readonly string[]): Map<string, string> {
  const options = new Map<string, string>();
  const input: unknown = args;
  requireRelease(
    Array.isArray(input) && input.length === 6,
    'release preparation requires kind, mode and project root',
  );
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    requireRelease(
      typeof key === 'string' && allowedOptions.includes(key) && !options.has(key) && typeof value === 'string',
      'release preparation arguments differ',
    );
    options.set(key, value);
  }
  return options;
}
