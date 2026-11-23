import { existsSync, renameSync } from 'node:fs';
import path from 'node:path';
import { checkManifest, readPin } from './bun.ts';
import {
  parseReleaseState,
  parseReleaseVersion,
  readReleaseBytes,
  releaseDirectory,
  releaseDigest,
  releaseJSON,
  releasePath,
  releaseSourceBinding,
  requireRelease,
  saveReleaseState,
  withCommittedReleaseSource,
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

export type CommittedReleaseRecipe = {
  schema: 'VidaCommittedReleaseSource/v1';
  operation_id: string;
  predecessor_operation_id: string;
  commit: string;
  version: string;
  manifest_path: string;
  manifest_before: string;
  manifest_after: string;
  expected_source_binding: string;
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

function committedSourcePath(operationRoot: string): string {
  return `${operationRoot}/committed-source.json`;
}

function parseCommittedRecipe(value: unknown, prepared: PreparedRelease): CommittedReleaseRecipe {
  requireRelease(
    exactKeys(value, [
      'schema',
      'operation_id',
      'predecessor_operation_id',
      'commit',
      'version',
      'manifest_path',
      'manifest_before',
      'manifest_after',
      'expected_source_binding',
    ]),
    'committed release recipe shape differs',
  );
  const predecessor = value.predecessor_operation_id;
  const commit = value.commit;
  const manifestBefore = value.manifest_before;
  const manifestAfter = value.manifest_after;
  const expected = value.expected_source_binding;
  requireRelease(
    value.schema === 'VidaCommittedReleaseSource/v1' &&
      value.operation_id === prepared.operation_id &&
      typeof predecessor === 'string' &&
      /^[a-z0-9][a-z0-9-]{0,95}$/.test(predecessor) &&
      typeof commit === 'string' &&
      /^[0-9a-f]{40}$/.test(commit) &&
      value.version === prepared.version &&
      value.manifest_path === manifestPath &&
      typeof manifestBefore === 'string' &&
      typeof manifestAfter === 'string' &&
      typeof expected === 'string' &&
      /^[a-f0-9]{64}$/.test(expected),
    'committed release recipe binding differs',
  );
  const beforeBytes = decodeImage(manifestBefore);
  const afterBytes = decodeImage(manifestAfter);
  const beforeValue: unknown = JSON.parse(beforeBytes.toString('utf8'));
  requireRelease(
    isRecord(beforeValue) &&
      beforeValue.name === 'vida-agent' &&
      typeof beforeValue.version === 'string' &&
      parseReleaseVersion(beforeValue.version) !== null &&
      beforeValue.version !== prepared.version &&
      afterBytes.equals(Buffer.from(releaseJSON({ ...beforeValue, version: prepared.version }))),
    'committed release recipe afterimage differs',
  );
  return {
    schema: 'VidaCommittedReleaseSource/v1',
    operation_id: prepared.operation_id,
    predecessor_operation_id: predecessor as string,
    commit: commit as string,
    version: prepared.version,
    manifest_path: manifestPath,
    manifest_before: manifestBefore as string,
    manifest_after: manifestAfter as string,
    expected_source_binding: expected as string,
  };
}

/**
 * Bind the exact committed pre-version Source: the validated manifest beforeimage,
 * its version-only afterimage and the expected final inventory digest with only
 * the manifest entry substituted. Working-root WIP cannot enter this binding.
 */
export function committedReleaseRecipe(
  root: string,
  commit: string,
  prepared: PreparedRelease,
  predecessorOperationId: string,
  predecessorVersion: string,
): { recipe: CommittedReleaseRecipe; source_binding: string } {
  requireRelease(
    /^[0-9a-f]{40}$/.test(commit) &&
      /^[a-z0-9][a-z0-9-]{0,95}$/.test(predecessorOperationId) &&
      parseReleaseVersion(prepared.version) !== null &&
      parseReleaseVersion(predecessorVersion) !== null,
    'committed release selection is invalid',
  );
  return withCommittedReleaseSource(root, commit, (sourceRoot) => {
    const manifestBytes = readReleaseBytes(sourceRoot, manifestPath);
    const committedManifest: unknown = JSON.parse(manifestBytes.toString('utf8'));
    requireRelease(
      isRecord(committedManifest) &&
        committedManifest.name === 'vida-agent' &&
        isRecord(committedManifest.bin) &&
        committedManifest.bin['vida-agent'] === './bin/vida-agent.ts' &&
        committedManifest.version === predecessorVersion,
      'committed release manifest differs from the published predecessor',
    );
    const packageRoot = path.join(sourceRoot, 'packages/agent');
    checkManifest(packageRoot, readPin(packageRoot));
    const manifestAfter = Buffer.from(releaseJSON({ ...committedManifest, version: prepared.version }));
    const binding = releaseSourceBinding(sourceRoot);
    const manifestIndexes = binding.entries.flatMap((entry, index) => (entry.path === manifestPath ? [index] : []));
    const manifestIndex = manifestIndexes.length === 1 ? manifestIndexes[0] : undefined;
    requireRelease(manifestIndex !== undefined, 'committed release manifest inventory differs');
    const expectedEntries = binding.entries.map((entry, index) =>
      index === manifestIndex ? { ...entry, sha256: releaseDigest(manifestAfter) } : entry,
    );
    const recipe: CommittedReleaseRecipe = {
      schema: 'VidaCommittedReleaseSource/v1',
      operation_id: prepared.operation_id,
      predecessor_operation_id: predecessorOperationId,
      commit,
      version: prepared.version,
      manifest_path: manifestPath,
      manifest_before: manifestBytes.toString('base64'),
      manifest_after: manifestAfter.toString('base64'),
      expected_source_binding: releaseDigest(JSON.stringify(expectedEntries)),
    };
    return { recipe, source_binding: binding.source_binding };
  });
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
  const committedPath = committedSourcePath(operationRoot);
  const first: unknown = value.targets[0];
  const committed = isRecord(first) && first.path === committedPath;
  requireRelease(!committed || value.targets.length === 4, 'preparation target count differs');
  const paths = committed
    ? [committedPath, `${operationRoot}/disposition.json`, `${operationRoot}/release.json`, pendingPath]
    : [
        manifestPath,
        ...(value.targets.length === 4 ? [`${operationRoot}/disposition.json`] : []),
        `${operationRoot}/release.json`,
        pendingPath,
      ];
  const targets = value.targets.map((target, index) => validatePreparationTarget(target, paths[index], operationRoot));
  let priorVersion: unknown = null;
  let committedRecipe: CommittedReleaseRecipe | null = null;
  if (committed) {
    const recipeTarget = targets[0];
    requireRelease(recipeTarget !== undefined, 'preparation committed target missing');
    committedRecipe = parseCommittedRecipe(JSON.parse(decodeImage(recipeTarget.after).toString('utf8')), prepared);
    const beforeManifest: unknown = JSON.parse(decodeImage(committedRecipe.manifest_before).toString('utf8'));
    requireRelease(isRecord(beforeManifest), 'committed release recipe beforeimage invalid');
    priorVersion = beforeManifest.version;
  } else {
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
    priorVersion = isRecord(originalValue) ? originalValue.version : null;
  }
  const stateImage = Buffer.from(releaseJSON(prepared)).toString('base64');
  requireRelease(
    targets.at(-1)?.after === stateImage && targets.at(-2)?.after === stateImage,
    'preparation journal or pending identity differs',
  );
  if (targets.length === 4) {
    const metadata = targets[1];
    requireRelease(metadata, 'preparation metadata missing');
    const witness: unknown = JSON.parse(decodeImage(metadata.after).toString('utf8'));
    requireRelease(
      !committedRecipe || (isRecord(witness) && witness.schema === 'VidaPublishedVersionBaseline/v1'),
      'committed release requires the published baseline witness',
    );
    if (isRecord(witness) && witness.schema === 'VidaPublishedVersionBaseline/v1') {
      requireRelease(
        exactKeys(witness, [
          'schema',
          'role',
          'operation_id',
          'version',
          'tag_sha',
          'release_id',
          'claim_digest',
          'assets_digest',
          'historical_source_binding',
          'current_source_binding',
          'requests',
          'pending_digest',
          'journal_digest',
        ]) &&
          witness.role === 'baseline-only' &&
          typeof witness.operation_id === 'string' &&
          /^[a-z0-9][a-z0-9-]{0,95}$/.test(witness.operation_id) &&
          witness.version === priorVersion &&
          typeof witness.tag_sha === 'string' &&
          /^[a-f0-9]{40}$/.test(witness.tag_sha) &&
          typeof witness.release_id === 'number' &&
          Number.isSafeInteger(witness.release_id) &&
          witness.release_id > 0 &&
          [
            'claim_digest',
            'assets_digest',
            'historical_source_binding',
            'current_source_binding',
            'pending_digest',
            'journal_digest',
          ].every((key) => typeof witness[key] === 'string' && /^[a-f0-9]{64}$/.test(witness[key] as string)) &&
          Array.isArray(witness.requests) &&
          witness.requests.length === 2 &&
          witness.requests.every(
            (request: unknown) =>
              exactKeys(request, ['request_id', 'digest']) &&
              typeof request.request_id === 'string' &&
              typeof request.digest === 'string' &&
              /^[a-f0-9]{64}$/.test(request.digest),
          ) &&
          new Set(witness.requests.map((request: unknown) => (isRecord(request) ? request.request_id : undefined)))
            .size === 2,
        'published baseline witness invalid',
      );
      if (committedRecipe)
        requireRelease(
          witness.operation_id === committedRecipe.predecessor_operation_id,
          'committed release recipe predecessor differs',
        );
      const previous = targets.at(-1)?.before;
      requireRelease(previous !== null && previous !== undefined, 'published baseline pending beforeimage missing');
      const pendingBytes = decodeImage(previous);
      const pending = parseReleaseState(JSON.parse(pendingBytes.toString('utf8')));
      const version = typeof witness.version === 'string' ? parseReleaseVersion(witness.version) : null;
      requireRelease(
        pending.operation_id === witness.operation_id &&
          pending.version === witness.version &&
          pending.status === 'awaiting_assurance' &&
          releaseDigest(pendingBytes) === witness.pending_digest,
        'published baseline pending beforeimage differs',
      );
      requireRelease(
        version &&
          version.patch < Number.MAX_SAFE_INTEGER &&
          prepared.version === `${version.major}.${version.minor}.${version.patch + 1}`,
        'published baseline successor version differs',
      );
    }
  }
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
  requireRelease(priorTarget, 'preparation first target missing');
  let priorVersion: unknown;
  if (priorTarget.path === committedSourcePath(`.agent/work/agent-local-release/${intent.prepared.operation_id}`)) {
    requireRelease(
      readImage(root, priorTarget.path) === priorTarget.after,
      'committed release recipe differs; preserve UNKNOWN',
    );
    const recipe = parseCommittedRecipe(JSON.parse(decodeImage(priorTarget.after).toString('utf8')), intent.prepared);
    const priorManifest: unknown = JSON.parse(decodeImage(recipe.manifest_before).toString('utf8'));
    requireRelease(isRecord(priorManifest), 'committed release recipe beforeimage invalid');
    priorVersion = priorManifest.version;
  } else {
    const priorBytes = priorTarget.before;
    requireRelease(priorBytes !== null, 'preparation manifest beforeimage missing');
    const priorManifest: unknown = JSON.parse(decodeImage(priorBytes).toString('utf8'));
    requireRelease(isRecord(priorManifest), 'preparation manifest beforeimage invalid');
    priorVersion = priorManifest.version;
  }
  const disposition: unknown = dispositionTarget
    ? JSON.parse(decodeImage(dispositionTarget.after).toString('utf8'))
    : null;
  const result = { priorVersion, disposition };
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
  if (intent.targets.length === 4) {
    const metadata = intent.targets[1];
    requireRelease(metadata, 'preparation metadata missing');
    const witness: unknown = JSON.parse(decodeImage(metadata.after).toString('utf8'));
    if (isRecord(witness) && witness.schema === 'VidaPublishedVersionBaseline/v1') {
      const operation = witness.operation_id;
      requireRelease(typeof operation === 'string', 'published baseline operation missing');
      const journal = readReleaseBytes(root, `.agent/work/agent-local-release/${operation}/release.json`, byteLimit);
      requireRelease(
        releaseDigest(journal) === witness.journal_digest,
        'published baseline journal changed; preserve the intent',
      );
    }
  }
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

/**
 * Committed-Source preparation custody: the operation-owned recipe replaces the
 * canonical manifest target, so this route never writes packages/agent/package.json.
 */
export function publishCommittedReleasePreparation(
  root: string,
  prepared: PreparedRelease,
  recipe: CommittedReleaseRecipe,
  witness: unknown,
): PreparedRelease | null {
  const file = releasePath(root, intentPath, true);
  requireRelease(!existsSync(file), 'resume the pending preparation before selecting a version');
  const operationRoot = `.agent/work/agent-local-release/${prepared.operation_id}`;
  requireRelease(!existsSync(receiptPath(root, prepared)), 'preparation operation already existed');
  const values: Array<readonly [string, unknown]> = [
    [committedSourcePath(operationRoot), recipe],
    [`${operationRoot}/disposition.json`, witness],
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

export function assertUnsealedReleaseSourceAllowed(root: string, operation: string): void {
  const operationRoot = `.agent/work/agent-local-release/${operation}`;
  const recipePath = committedSourcePath(operationRoot);
  const receipt = releasePath(root, operationRoot + '/preparation.json', true);
  requireRelease(
    readImage(root, recipePath) === null &&
      (!existsSync(receipt) || readIntent(root, receipt).intent.targets[0]?.path !== recipePath),
    'native pair selection is missing for committed preparation; preserve UNKNOWN',
  );
}

/** Require intact preparation custody. Ordinary manifest-first preparations have no recipe. */
export function readCommittedReleaseRecipe(root: string, prepared: PreparationIdentity): CommittedReleaseRecipe | null {
  const file = receiptPath(root, prepared);
  requireRelease(existsSync(file), 'preparation receipt is missing; preserve UNKNOWN');
  const { intent } = readIntent(root, file);
  requireRelease(
    intent.prepared.operation_id === prepared.operation_id && intent.prepared.version === prepared.version,
    'preparation receipt differs from pending release',
  );
  const disposition = readPreparationDisposition(root, intent);
  const witness: unknown = disposition ? JSON.parse(decodeImage(disposition.after).toString('utf8')) : null;
  const target = intent.targets[0];
  const recipePath = committedSourcePath(`.agent/work/agent-local-release/${prepared.operation_id}`);
  if (!target || target.path !== recipePath) {
    requireRelease(
      !(isRecord(witness) && witness.schema === 'VidaPublishedVersionBaseline/v1') &&
        readImage(root, recipePath) === null,
      'committed release preparation receipt differs; preserve UNKNOWN',
    );
    return null;
  }
  requireRelease(readImage(root, recipePath) === target.after, 'committed release recipe differs; preserve UNKNOWN');
  return parseCommittedRecipe(JSON.parse(decodeImage(target.after).toString('utf8')), intent.prepared);
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
