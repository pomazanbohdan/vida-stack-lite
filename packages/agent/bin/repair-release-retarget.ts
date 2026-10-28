import { standaloneBuildInputInventory } from '../tooling/maintained-source-inventory.ts';
import {
  assertReconcileOptionKeys,
  reconcileAllowedOptions,
  reconcileCliContracts,
} from './reconcile-cli-contracts.ts';
import { mkdirSync, lstatSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { root as safeRoot } from '@openclaw/fs-safe/root';
import { extractArchive } from '@openclaw/fs-safe/archive';
import {
  releaseDigest as sha,
  releaseJSON as json,
  requireRelease as require,
  releaseRelative,
  releasePath,
  releaseDirectory,
  releaseIdPattern,
  parseReleaseVersion,
  releaseState,
  readReleaseBytes as read,
  parseReleasePackMetadata as packMetadata,
  releaseSourceBinding,
  selectedTarball,
  packedDistribution,
  assertReleaseRetargetSettled,
  withReleaseRepairLocks,
  retargetStateRelative,
} from './local-release-artifacts.ts';

type FileIdentity = readonly [number, number, number, number, number];
type ReadObservation = { path: string; sha256?: string | null; identity: FileIdentity | null; kind?: 'directory' };
type JsonRecord = Record<string, unknown>;
type EligibleRelease = {
  operation_id: string;
  version: string;
  status: 'awaiting_assurance';
  source_binding: string;
  tarball_sha256: string;
  pack_metadata: [PackMetadataEntry];
  install_started?: unknown;
} & Record<string, unknown>;
type PackFile = { path: string; size: number } & Record<string, unknown>;
type NativeCandidate = {
  schema: string;
  operation_id: string;
  version: string;
  source_binding: string;
  archive: string;
  pack_metadata: [PackMetadataEntry];
  target?: 'bun-linux-x64' | 'bun-windows-x64';
} & Record<string, unknown>;
type StandaloneManifest = {
  schema: string;
  version: string;
  pin: string;
  target: string;
  inputs: Array<{ path: string; bytes: number; sha256: string }>;
  payloadId: string;
  asset: { file: string; bytes: number; sha256: string };
} & Record<string, unknown>;
type PackMetadataEntry = { filename: string; files: PackFile[] } & Record<string, unknown>;
type RetargetSeal = {
  schema: 'VidaNativeRetargetStage/v1' | 'VidaNativeRetargetStage/v2';
  operation_id: string;
  version: string;
  source_binding: string;
  pack_metadata: [PackMetadataEntry];
  archive_sha256: string;
  entries: Array<{ path: string; sha256: string }>;
  digest: string;
} & Record<string, unknown>;
type CustodyEntry = { path: string; sha256: string; copy: string };
type RetargetPlan = {
  schema: 'VidaReleaseRetargetPlan/v1';
  operation_id: string;
  version: string;
  actor: string;
  source_binding: string;
  candidate_digest: string;
  before: ReadObservation[];
  custody: CustodyEntry[];
  release_after: EligibleRelease;
  archive_before: string;
  archive_after: string;
  digest: string;
} & Record<string, unknown>;
type RetargetPlanBody = Pick<
  RetargetPlan,
  | 'schema'
  | 'operation_id'
  | 'version'
  | 'actor'
  | 'source_binding'
  | 'candidate_digest'
  | 'before'
  | 'custody'
  | 'release_after'
  | 'archive_before'
  | 'archive_after'
>;
const binaryLimit = 512 * 1024 * 1024;
const textLimit = 8 * 1024 * 1024;

const base = (operation: string): string => '.agent/work/agent-local-release/' + operation;

const repair = (operation: string): string => base(operation) + '/retarget';

const archivePath = (operation: string, name: string): string => '.tmp/releases/' + operation + '/' + name;

const sealed = <T extends object>(body: T): T & { digest: string } => ({ ...body, digest: sha(json(body)) });

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function keys(value: unknown, expected: readonly string[]): asserts value is JsonRecord {
  require(value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join() === expected.slice().sort().join(), 'repair contract fields differ');
}

const object = (root: string, relative: string): unknown => JSON.parse(read(root, relative).toString('utf8'));

function unseal(value: unknown, schema: string, expected: readonly string[]): JsonRecord {
  keys(value, [...expected, 'digest']);
  const { digest, ...body } = value;
  require(value.schema === schema && digest === sha(json(body)), 'repair seal differs');
  return value;
}

function identity(root: string, relative: string, directory: boolean = false): FileIdentity | null {
  const file = releasePath(root, relative, true),
    stat = lstatSync(file, { throwIfNoEntry: false });
  if (!stat) return null;
  require(directory ? stat.isDirectory() : stat.isFile(), 'repair input must be regular');
  return [stat.dev, stat.ino, stat.size, stat.mtimeMs, stat.ctimeMs];
}

function observation(root: string, relative: string, limit: number = textLimit): ReadObservation {
  const before = identity(root, relative);
  if (!before) return { path: relative, sha256: null, identity: null };
  const bytes = read(root, relative, limit);
  require(json(before) === json(identity(root, relative)), 'repair input changed during read');
  return { path: relative, sha256: sha(bytes), identity: before };
}

function sameObservations(root: string, observations: readonly ReadObservation[]) {
  for (const entry of observations)
    require(json(identity(root, entry.path, entry.kind === 'directory')) ===
      json(entry.identity), 'repair input changed: ' + entry.path);
}

function sourceObservations(root: string, expected: string): ReadObservation[] {
  const source = releaseSourceBinding(root, true);
  require(source.source_binding === expected, 'frozen Source differs');
  require(source.observations, 'source observations missing');
  return source.observations;
}

async function access(root: string): Promise<Awaited<ReturnType<typeof safeRoot>>> {
  releasePath(root, 'packages/agent/package.json');
  return safeRoot(root, { hardlinks: 'reject', symlinks: 'reject', maxBytes: binaryLimit, mode: 0o600 });
}

function reserve(root: string, relative: string) {
  releaseDirectory(root, path.posix.dirname(relative));
  // Root.copyIn overwrites. Only this exclusive reservation grants ownership of its destinations.
  mkdirSync(releasePath(root, relative, true), { mode: 0o700 });
}

function inventory(root: string, relative: string): ReadObservation[] {
  /* @type {ReadObservation[]} */
  const result: ReadObservation[] = [];

  const walk = (current: string) => {
    for (const name of readdirSync(releasePath(root, current)).sort()) {
      const child = current + '/' + name,
        stat = lstatSync(releasePath(root, child));
      if (stat.isDirectory()) walk(child);
      else result.push(observation(root, child, binaryLimit));
    }
  };
  walk(relative);
  return result;
}

function eligible(root: string, operation: string): EligibleRelease {
  require(releaseIdPattern.test(operation), 'operation invalid');
  const state = releaseState(releasePath(root, base(operation) + '/release.json'));
  const pending = releaseState(releasePath(root, '.agent/work/agent-local-release/pending.json'));
  const manifest = object(root, 'packages/agent/package.json');
  require(isRecord(manifest), 'package manifest invalid');
  assertEligibleIdentity(state, pending, manifest, operation);
  assertEligibleMetadata(state);
  return {
    ...state,
    status: state.status,
    source_binding: state.source_binding,
    tarball_sha256: state.tarball_sha256,
    pack_metadata: packMetadata(state.pack_metadata),
  };
}

function assertEligibleIdentity(
  state: ReturnType<typeof releaseState>,
  pending: ReturnType<typeof releaseState>,
  manifest: JsonRecord,
  operation: string,
): asserts state is ReturnType<typeof releaseState> & { status: 'awaiting_assurance' } {
  require(state.operation_id === operation &&
    pending.operation_id === operation &&
    state.version === pending.version &&
    state.version === manifest.version &&
    state.status === 'awaiting_assurance' &&
    !state.install_started, 'original operation is not eligible');
}

function assertEligibleMetadata(state: ReturnType<typeof releaseState>): asserts state is ReturnType<
  typeof releaseState
> & {
  source_binding: string;
  tarball_sha256: string;
  pack_metadata: unknown[];
} {
  require(Array.isArray(state.pack_metadata) &&
    typeof state.source_binding === 'string' &&
    /^[a-f0-9]{64}$/.test(state.source_binding) &&
    typeof state.tarball_sha256 === 'string' &&
    /^[a-f0-9]{64}$/.test(state.tarball_sha256), 'original operation is not eligible');
}

function archiveName(value: unknown): string {
  return packMetadata(value)[0].filename;
}

const candidateFields = ['schema', 'operation_id', 'version', 'source_binding', 'archive', 'pack_metadata'];
const candidateSealFields = [
  'schema',
  'operation_id',
  'version',
  'source_binding',
  'pack_metadata',
  'archive_sha256',
  'entries',
];

function assertCandidateSealFields(
  sealValue: JsonRecord,
  operation: string,
): asserts sealValue is JsonRecord & {
  operation_id: string;
  version: string;
  source_binding: string;
  archive_sha256: string;
  entries: unknown[];
} {
  require(sealValue.operation_id === operation &&
    typeof sealValue.version === 'string' &&
    typeof sealValue.source_binding === 'string' &&
    /^[a-f0-9]{64}$/.test(sealValue.source_binding) &&
    typeof sealValue.archive_sha256 === 'string' &&
    /^[a-f0-9]{64}$/.test(sealValue.archive_sha256) &&
    Array.isArray(sealValue.entries), 'candidate seal fields invalid');
}

type NativeReleaseTarget = 'bun-linux-x64' | 'bun-windows-x64';
function candidateFolder(operation: string, target?: NativeReleaseTarget): string {
  require(target === undefined ||
    target === 'bun-linux-x64' ||
    target === 'bun-windows-x64', 'candidate target invalid');
  return target === undefined ? repair(operation) + '/candidate' : repair(operation) + '/candidates/' + target;
}

function candidateSeal(
  root: string,
  operation: string,
  target?: NativeReleaseTarget,
): { seal: RetargetSeal; observations: ReadObservation[] } {
  const folder = candidateFolder(operation, target);
  const sealValue = unseal(
    object(root, folder + '/seal.json'),
    target === undefined ? 'VidaNativeRetargetStage/v1' : 'VidaNativeRetargetStage/v2',
    target === undefined ? candidateSealFields : [...candidateSealFields, 'target'],
  );
  if (target !== undefined) require(sealValue.target === target, 'candidate sealed target differs');
  assertCandidateSealFields(sealValue, operation);
  require(sealValue.operation_id === operation, 'candidate operation differs');
  const actual = inventory(root, folder).filter((entry) => entry.path !== folder + '/seal.json');
  require(json(actual.map(({ path: file, sha256 }) => ({ path: file, sha256 }))) ===
    json(sealValue.entries), 'candidate stage changed');
  const seal = { ...sealValue, pack_metadata: packMetadata(sealValue.pack_metadata) } as RetargetSeal;
  return {
    seal,
    observations: actual.concat(observation(root, folder + '/seal.json')),
  };
}

function nativeString(value: JsonRecord, key: string, label: string): string {
  const result = value[key];
  require(typeof result === 'string', label);
  return result;
}

function nativeBytes(value: JsonRecord, key: string, label: string): number {
  const result = value[key];
  require(typeof result === 'number' && Number.isSafeInteger(result), label);
  return result;
}

function nativeAsset(value: unknown): StandaloneManifest['asset'] {
  keys(value, ['file', 'bytes', 'sha256']);
  return {
    file: nativeString(value, 'file', 'candidate native asset fields invalid'),
    bytes: nativeBytes(value, 'bytes', 'candidate native asset fields invalid'),
    sha256: nativeString(value, 'sha256', 'candidate native asset fields invalid'),
  };
}

function nativeInput(value: unknown): StandaloneManifest['inputs'][number] {
  keys(value, ['path', 'bytes', 'sha256']);
  return {
    path: nativeString(value, 'path', 'candidate input fields invalid'),
    bytes: nativeBytes(value, 'bytes', 'candidate input fields invalid'),
    sha256: nativeString(value, 'sha256', 'candidate input fields invalid'),
  };
}

function nativeInputs(value: unknown): StandaloneManifest['inputs'] {
  require(Array.isArray(value) && value.length > 0, 'candidate build input inventory differs');
  const inputs = value.map(nativeInput);
  require(new Set(inputs.map(observationPath)).size === inputs.length, 'candidate build input inventory differs');
  return inputs;
}

function nativeManifest(value: unknown, version: string, pin: string): StandaloneManifest {
  keys(value, ['schema', 'version', 'pin', 'target', 'inputs', 'payloadId', 'asset']);
  const manifest = {
    schema: nativeString(value, 'schema', 'candidate native manifest fields invalid'),
    version: nativeString(value, 'version', 'candidate native manifest fields invalid'),
    pin: nativeString(value, 'pin', 'candidate native manifest fields invalid'),
    target: nativeString(value, 'target', 'candidate native manifest fields invalid'),
    payloadId: nativeString(value, 'payloadId', 'candidate native manifest fields invalid'),
    inputs: nativeInputs(value.inputs),
    asset: nativeAsset(value.asset),
  };
  require(manifest.schema === 'VidaStandaloneBuild/v1' &&
    manifest.version === version &&
    manifest.pin === pin &&
    /^bun-(windows|linux|darwin)-(x64|arm64)(-baseline)?$/.test(manifest.target), 'candidate native manifest differs');
  require(/^[a-f0-9]{64}$/.test(manifest.payloadId), 'candidate build input inventory differs');
  require(manifest.asset.file ===
    'vida-agent-' +
      manifest.target +
      (manifest.target.startsWith('bun-windows-') ? '.exe' : ''), 'candidate target asset name differs');
  return manifest;
}

function assertNativeBuildInputs(
  packageRoot: string,
  manifest: StandaloneManifest,
  folder: string,
  observations: ReadObservation[],
) {
  const expected = standaloneBuildInputInventory(packageRoot);
  require(json(manifest.inputs.map(observationPath)) ===
    json(expected), 'candidate complete build input inventory differs');
  const observedByPath = new Map(observations.map((item) => [item.path, item]));
  for (const entry of manifest.inputs) {
    const observed = observedByPath.get(folder + '/payload/' + releaseRelative(entry.path));
    require(observed &&
      observed.identity &&
      observed.sha256 === entry.sha256 &&
      observed.identity[2] === entry.bytes, 'candidate build input bytes differ');
  }
}

/** Read only: exact sealed archive-owned bytes; no generated Source output or qualification. */

export function readNativeRetargetCandidate({
  root,
  operation,
  published = false,
  target,
}: {
  root: string;
  operation: string;
  published?: boolean;
  target?: NativeReleaseTarget;
}): {
  operation_id: string;
  version: string;
  source_binding: string;
  candidate_digest: string;
  pack_metadata: [PackMetadataEntry];
  archive_sha256: string;
  manifest: StandaloneManifest;
  manifest_sha256: string;
  asset: StandaloneManifest['asset'] & { path: string; relative: string; target: string };
  observations: ReadObservation[];
} {
  require(releaseIdPattern.test(operation), 'operation invalid');
  require(target === undefined || !published, 'target-indexed candidate has not acquired published authority');
  const eligibilityObservations =
    target === undefined
      ? []
      : [base(operation) + '/release.json', '.agent/work/agent-local-release/pending.json'].map((file) =>
          observation(root, file),
        );
  if (target !== undefined) {
    const state = releaseState(releasePath(root, base(operation) + '/release.json'));
    const pending = releaseState(releasePath(root, '.agent/work/agent-local-release/pending.json'));
    const manifest = object(root, 'packages/agent/package.json');
    require(isRecord(manifest) &&
      state.operation_id === operation &&
      pending.operation_id === operation &&
      state.version === pending.version &&
      state.version === manifest.version &&
      ['awaiting_assurance', 'running'].includes(state.status) &&
      !state.install_started, 'target-indexed operation is not eligible');
    sameObservations(root, eligibilityObservations);
  }
  if (published) assertReleaseRetargetSettled(root, operation);
  const { seal, observations } = candidateSeal(root, operation, target);
  observations.push(...eligibilityObservations);
  const source = releaseSourceBinding(root, true);
  const packageManifest = object(root, 'packages/agent/package.json');
  require(isRecord(packageManifest) &&
    seal.version === packageManifest.version &&
    seal.source_binding === source.source_binding, 'candidate Source differs');
  const folder = candidateFolder(operation, target);
  const manifestPath = folder + '/payload/dist/standalone/manifest.json';
  const manifestBytes = read(root, manifestPath);
  /* @type {unknown} */
  const manifestValue: unknown = JSON.parse(manifestBytes.toString('utf8'));
  const pin = read(root, folder + '/payload/.bun-version')
    .toString('utf8')
    .trim();
  require(parseReleaseVersion(pin) !== null &&
    isRecord(packageManifest.engines) &&
    packageManifest.engines.bun === pin &&
    packageManifest.packageManager === `bun@${pin}`, 'candidate source Bun pin differs');
  const manifest = nativeManifest(manifestValue, seal.version, pin);
  if (target !== undefined) require(manifest.target === target, 'candidate manifest target differs');
  assertNativeBuildInputs(releasePath(root, folder + '/payload'), manifest, folder, observations);
  const relative = 'dist/standalone/' + releaseRelative(manifest.asset?.file);
  const assetPath = folder + '/payload/' + relative;
  const assetObserved = observations.find((entry) => entry.path === assetPath);
  const archiveObserved = observations.find((entry) => entry.path === folder + '/archive.tgz');
  require(assetObserved?.identity &&
    assetObserved.identity[2] === manifest.asset.bytes &&
    assetObserved?.sha256 === manifest.asset.sha256 &&
    archiveObserved?.sha256 === seal.archive_sha256, 'candidate native bytes differ');
  if (published) {
    const state = releaseState(releasePath(root, base(operation) + '/release.json'));
    const canonicalArchive = observation(root, archivePath(operation, archiveName(seal.pack_metadata)), binaryLimit);
    require(state.operation_id === operation &&
      state.version === seal.version &&
      state.source_binding === seal.source_binding &&
      state.tarball_sha256 === seal.archive_sha256 &&
      json(state.pack_metadata) === json(seal.pack_metadata) &&
      canonicalArchive.sha256 === seal.archive_sha256, 'published candidate differs');
    observations.push(
      ...[
        base(operation) + '/release.json',
        '.agent/work/agent-local-release/pending.json',
        retargetStateRelative(operation),
        repair(operation) + '/plan.json',
      ].map((file) => observation(root, file, binaryLimit)),
      canonicalArchive,
    );
  }
  require(source.observations, 'Source observations missing');
  observations.push(...source.observations);
  return {
    operation_id: operation,
    version: seal.version,
    source_binding: seal.source_binding,
    candidate_digest: seal.digest,
    pack_metadata: seal.pack_metadata,
    archive_sha256: seal.archive_sha256,
    manifest,
    manifest_sha256: sha(manifestBytes),
    asset: { ...manifest.asset, path: releasePath(root, assetPath), relative, target: manifest.target },
    observations,
  };
}

/** Recheck the same read observation after an asynchronous controller boundary without a second byte scan. */

export function recheckNativeRetargetCandidate(root: string, candidate: { observations: ReadObservation[] }) {
  sameObservations(root, candidate.observations);
}

function nativeCandidate(candidateValue: unknown, operation: string): NativeCandidate {
  require(isRecord(candidateValue), 'candidate identity differs');
  const target = candidateValue.schema === 'VidaNativeRetargetCandidate/v2' ? candidateValue.target : undefined;
  keys(candidateValue, target === undefined ? candidateFields : [...candidateFields, 'target']);
  require(((candidateValue.schema === 'VidaNativeRetargetCandidate/v1' && target === undefined) ||
    (candidateValue.schema === 'VidaNativeRetargetCandidate/v2' &&
      (target === 'bun-linux-x64' || target === 'bun-windows-x64'))) &&
    candidateValue.operation_id === operation &&
    typeof candidateValue.version === 'string' &&
    typeof candidateValue.source_binding === 'string' &&
    /^[a-f0-9]{64}$/.test(candidateValue.source_binding) &&
    typeof candidateValue.archive === 'string', 'candidate identity differs');
  return {
    ...candidateValue,
    schema: candidateValue.schema,
    operation_id: candidateValue.operation_id,
    version: candidateValue.version,
    source_binding: candidateValue.source_binding,
    archive: candidateValue.archive,
    pack_metadata: packMetadata(candidateValue.pack_metadata),
    ...(target === undefined ? {} : { target }),
  };
}

/** Consume an already formed archive. This does not build, execute, install or qualify it. */

export async function stageNativeRetargetCandidate({
  root,
  operation,
  candidateFile,
}: {
  root: string;
  operation: string;
  candidateFile: string;
}): Promise<{ status: 'staged'; operation_id: string; version: string }> {
  require(typeof candidateFile === 'string' &&
    !path.isAbsolute(candidateFile), 'candidate input must be repository relative');
  const candidateValue = object(root, releaseRelative(candidateFile));
  const candidate = nativeCandidate(candidateValue, operation);
  const original = eligible(root, operation);
  require(packedDistribution(original.pack_metadata) === 'npm' &&
    candidate.version === original.version &&
    packedDistribution(candidate.pack_metadata) === 'native', 'candidate channel or version differs');
  require(candidate.source_binding === releaseSourceBinding(root).source_binding, 'candidate Source differs');
  releaseRelative(candidate.archive);
  const selected = selectedTarball(
    candidate.pack_metadata,
    path.dirname(releasePath(root, candidate.archive)),
    candidate.version,
  );
  require(selected === releasePath(root, candidate.archive) &&
    candidate.pack_metadata[0].filename === original.pack_metadata[0].filename &&
    candidate.archive !==
      archivePath(operation, original.pack_metadata[0].filename), 'candidate archive location differs');
  const folder = candidateFolder(operation, candidate.target),
    api = await access(root);
  if (identity(root, folder + '/seal.json')) {
    const { seal } = candidateSeal(root, operation, candidate.target);
    require(seal.source_binding === candidate.source_binding &&
      json(seal.pack_metadata) === json(candidate.pack_metadata) &&
      seal.archive_sha256 === sha(read(root, candidate.archive, binaryLimit)), 'existing candidate stage differs');
    return { status: 'staged', operation_id: operation, version: seal.version };
  }
  reserve(root, folder); // Existing incomplete staging is UNKNOWN and is never reconstructed.
  const input = observation(root, candidate.archive, binaryLimit);
  await api.copyIn(folder + '/archive.tgz', selected);
  releaseDirectory(root, folder + '/payload');
  const files = candidate.pack_metadata[0].files;
  require(files.length <= 16384 &&
    new Set(files.map((file) => file.path.toLowerCase())).size ===
      files.length, 'candidate inventory ambiguous or oversized');
  for (const file of files) require(Number.isSafeInteger(file.size) && file.size >= 0, 'candidate file size invalid');
  await extractArchive({
    archivePath: releasePath(root, folder + '/archive.tgz'),
    destDir: releasePath(root, folder + '/payload'),
    kind: 'tar',
    tarGzip: true,
    stripComponents: 1,
    timeoutMs: 0,
    entryModes: 'clamp',
    onFiltered: 'reject-archive',
    limits: {
      maxArchiveBytes: binaryLimit,
      maxEntries: 32768,
      maxExtractedBytes: 1024 * 1024 * 1024,
      maxEntryBytes: binaryLimit,
      maxMetaEntryBytes: textLimit,
      maxEntryPathComponents: 64,
    },
    entryFilter: (entry) => {
      const name = entry.path.replace(/\/$/, '');
      if (
        entry.kind === 'directory' &&
        (name === 'package' || files.some((file) => ('package/' + file.path).startsWith(name + '/')))
      )
        return 'extract';
      return entry.kind === 'file' && files.some((file) => 'package/' + file.path === name && file.size === entry.size)
        ? 'extract'
        : 'skip';
    },
  });
  const payload = inventory(root, folder + '/payload');
  require(payload.length === files.length, 'candidate payload inventory differs');
  for (const entry of payload) {
    const relative = entry.path.slice((folder + '/payload/').length);
    require(entry.identity &&
      files.some((file) => file.path === relative && file.size === entry.identity?.[2]), 'candidate payload differs');
    if (!relative.startsWith('dist/'))
      require(sha(read(root, 'packages/agent/' + relative, binaryLimit)) ===
        entry.sha256, 'candidate packaged Source differs');
  }
  const pin = read(root, folder + '/payload/.bun-version')
    .toString('utf8')
    .trim();
  require(parseReleaseVersion(pin) !== null, 'candidate source Bun pin differs');
  const native = nativeManifest(
    object(root, folder + '/payload/dist/standalone/manifest.json'),
    candidate.version,
    pin,
  );
  if (candidate.target !== undefined) require(native.target === candidate.target, 'candidate manifest target differs');
  assertNativeBuildInputs(path.join(root, 'packages/agent'), native, folder, payload);
  const asset = payload.find(
    (entry) => entry.path === folder + '/payload/dist/standalone/' + releaseRelative(native.asset?.file),
  );
  require(asset &&
    asset.identity &&
    asset.sha256 === native.asset.sha256 &&
    asset.identity[2] === native.asset.bytes, 'native asset differs');
  sameObservations(root, [input]);
  require(candidate.source_binding === releaseSourceBinding(root).source_binding, 'Source changed during staging');
  const entries = inventory(root, folder).map(({ path: file, sha256 }) => ({ path: file, sha256 }));
  await api.create(
    folder + '/seal.json',
    json(
      sealed({
        schema: candidate.target === undefined ? 'VidaNativeRetargetStage/v1' : 'VidaNativeRetargetStage/v2',
        ...(candidate.target === undefined ? {} : { target: candidate.target }),
        operation_id: operation,
        version: candidate.version,
        source_binding: candidate.source_binding,
        pack_metadata: candidate.pack_metadata,
        archive_sha256: sha(read(root, folder + '/archive.tgz', binaryLimit)),
        entries,
      }),
    ),
  );
  return { status: 'staged', operation_id: operation, version: candidate.version };
}

// Preserve receipt files and their referenced logs. Source-seal entries are Source inputs, not receipts.

function retainedFiles(root: string, operation: string, original: EligibleRelease): string[] {
  const files = new Set([
    base(operation) + '/release.json',
    '.agent/work/agent-local-release/pending.json',
    archivePath(operation, archiveName(original.pack_metadata)),
  ]);
  const success = '.agent/work/agent-local-release/successful.json';
  if (identity(root, success)) files.add(success);
  for (const name of readdirSync(releasePath(root, base(operation)))) {
    if (name === 'retarget' || /^worker\.sqlite(?:-wal|-shm|-journal)?$/.test(name)) continue;
    const relative = base(operation) + '/' + name;
    if (lstatSync(releasePath(root, relative)).isDirectory())
      inventory(root, relative).forEach((entry) => files.add(entry.path));
    else files.add(relative);
  }

  const visit = (value: unknown) => {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (['path', 'reverse_path', 'scope_path', 'clear_path'].includes(key) && typeof child === 'string') {
        releaseRelative(child);
        require(!child.startsWith(repair(operation) + '/'), 'receipt cannot reference repair staging');
        files.add(child);
      } else if (key === 'inputs' && Array.isArray(child)) {
        for (const input of child)
          if (typeof input === 'string' && input.startsWith('.tmp/')) {
            releaseRelative(input);
            const info = lstatSync(releasePath(root, input));
            if (info.isFile()) files.add(input);
            else inventory(root, input).forEach((entry) => files.add(entry.path));
          }
      } else if (key !== 'entries' && key !== 'files') visit(child);
    }
  };
  for (const relative of files) {
    require(files.size <= 4096, 'receipt closure oversized');
    if (relative.endsWith('.json') && !relative.endsWith('/source-seal.json') && !relative.endsWith('/release.json'))
      visit(object(root, relative));
  }
  return [...files].sort();
}
const planFields = [
  'schema',
  'operation_id',
  'version',
  'actor',
  'source_binding',
  'candidate_digest',
  'before',
  'custody',
  'release_after',
  'archive_before',
  'archive_after',
];
const stateFields = ['schema', 'operation_id', 'plan_digest', 'phase', 'release_after_sha256'];

function observationPath(value: unknown): string {
  require(isRecord(value) && typeof value.path === 'string', 'observation path is invalid');
  return value.path;
}

function assertPlanAttribution(plan: JsonRecord, operation: string) {
  require(plan.operation_id === operation &&
    releaseIdPattern.test(operation) &&
    typeof plan.actor === 'string' &&
    plan.actor.trim() &&
    plan.actor.length <= 256, 'repair plan identity or closure differs');
}

function assertPlanClosure(plan: JsonRecord, operation: string): asserts plan is JsonRecord & { custody: unknown[] } {
  require(Array.isArray(plan.before) &&
    plan.before.length === 3 &&
    json(plan.before.map(observationPath)) ===
      json([
        '.agent/work/agent-local-release/pending.json',
        '.agent/work/agent-local-release/successful.json',
        base(operation) + '/release.json',
      ]) &&
    Array.isArray(plan.custody) &&
    plan.custody.length > 0 &&
    plan.custody.length <= 4096, 'repair plan identity or closure differs');
}

function retainedCustodyEntry(entry: ReadObservation, copy: string): CustodyEntry {
  require(typeof entry.sha256 === 'string' && /^[a-f0-9]{64}$/.test(entry.sha256), 'retained custody source missing');
  return { path: entry.path, sha256: entry.sha256, copy };
}

function assertRepairPhase(
  state: JsonRecord | null,
  operation: string,
  planDigest: string,
  afterHash: string,
): asserts state is (JsonRecord & { phase: string }) | null {
  require(state === null ||
    (state.operation_id === operation &&
      state.plan_digest === planDigest &&
      typeof state.phase === 'string' &&
      ['planning', 'custody', 'archive', 'release', 'complete'].includes(state.phase) &&
      state.release_after_sha256 === afterHash), 'repair phase UNKNOWN');
}

function loadPlan(root: string, operation: string): RetargetPlan {
  const plan = unseal(object(root, repair(operation) + '/plan.json'), 'VidaReleaseRetargetPlan/v1', planFields);
  assertPlanAttribution(plan, operation);
  assertPlanClosure(plan, operation);
  for (const [index, entry] of plan.custody.entries()) {
    keys(entry, ['path', 'sha256', 'copy']);
    require(typeof entry.path === 'string' &&
      typeof entry.sha256 === 'string' &&
      typeof entry.copy === 'string', 'custody fields invalid');
    releaseRelative(entry.path);
    require(entry.copy === repair(operation) + '/custody/files/' + index &&
      /^[a-f0-9]{64}$/.test(entry.sha256), 'custody entry differs');
  }
  require(new Set(plan.custody.map((entry) => observationPath(entry).toLowerCase())).size ===
    plan.custody.length, 'custody aliases');
  return plan as RetargetPlan;
}

async function savePhase(
  api: Awaited<ReturnType<typeof safeRoot>>,
  operation: string,
  plan: RetargetPlan,
  phase: string,
) {
  await api.write(
    retargetStateRelative(operation),
    json(
      sealed({
        schema: 'VidaReleaseRetargetState/v1',
        operation_id: operation,
        plan_digest: plan.digest,
        phase,
        release_after_sha256: sha(json(plan.release_after)),
      }),
    ),
  );
}

function pointers(root: string, operation: string): ReadObservation[] {
  return [
    '.agent/work/agent-local-release/pending.json',
    '.agent/work/agent-local-release/successful.json',
    base(operation) + '/release.json',
  ].map((file) => observation(root, file));
}

export async function inspectReleaseRetarget({
  root,
  operation,
}: {
  root: string;
  operation: string;
}): Promise<Record<string, unknown>> {
  const original = eligible(root, operation);
  const file = repair(operation) + '/plan.json';
  if (identity(root, file)) {
    const plan = loadPlan(root, operation);
    const state = planningState(root, operation, plan);
    return {
      status: state?.phase ?? 'unknown_missing_phase',
      operation_id: operation,
      version: plan.version,
      qualified: false,
    };
  }
  return { status: 'requires_staged_candidate', operation_id: operation, version: original.version, qualified: false };
}

function planningState(root: string, operation: string, plan: RetargetPlan): JsonRecord | null {
  if (!identity(root, retargetStateRelative(operation))) return null;
  const state = unseal(object(root, retargetStateRelative(operation)), 'VidaReleaseRetargetState/v1', stateFields);
  require(state.operation_id === operation &&
    state.plan_digest === plan.digest &&
    state.release_after_sha256 === sha(json(plan.release_after)), 'planning reservation differs');
  return state;
}

function custodyAbsent(root: string, operation: string): boolean {
  return !lstatSync(releasePath(root, repair(operation) + '/custody', true), { throwIfNoEntry: false });
}

async function finishPlanning(
  root: string,
  operation: string,
  plan: RetargetPlan,
  { onPhase }: { onPhase?: ((phase: string) => unknown) | undefined } = {},
  frozenInputs?: ReadObservation[],
  frozenCandidate?: { seal: RetargetSeal; observations: ReadObservation[] },
): Promise<Record<string, unknown>> {
  const { seal, observations: staged } = frozenCandidate ?? candidateSeal(root, operation),
    original = eligible(root, operation);
  require(seal.digest === plan.candidate_digest &&
    seal.version === plan.version &&
    original.tarball_sha256 === plan.archive_before &&
    json({
      ...original,
      pack_metadata: seal.pack_metadata,
      source_binding: seal.source_binding,
      tarball_sha256: seal.archive_sha256,
    }) === json(plan.release_after), 'planning continuity differs');
  const stable =
    frozenInputs ??
    plan.custody
      .map((entry) => {
        const observed = observation(root, entry.path, binaryLimit);
        require(observed.sha256 === entry.sha256, 'planning preimage changed');
        return observed;
      })
      .concat(staged, sourceObservations(root, plan.source_binding));
  require(json(retainedFiles(root, operation, original)) ===
    json(plan.custody.map((entry) => entry.path)), 'planning receipt closure changed');
  const before = pointers(root, operation);
  require(json(before.map((entry) => entry.sha256)) ===
    json(plan.before.map((entry) => entry.sha256)), 'planning pointers changed');
  stable.push(observation(root, repair(operation) + '/plan.json'));
  const api = await access(root),
    custody = repair(operation) + '/custody';
  await withReleaseRepairLocks(root, operation, async () => {
    sameObservations(root, stable.concat(before));
    eligible(root, operation);
    require(loadPlan(root, operation).digest === plan.digest, 'planning plan changed');
    const state = planningState(root, operation, plan);
    require(!state || state.phase === 'planning', 'planning phase differs');
    if (!state) {
      await savePhase(api, operation, plan, 'planning');
      await onPhase?.('planning_recovered');
    }
    require(custodyAbsent(root, operation), 'partial custody UNKNOWN; no reconstruction');
    reserve(root, custody);
  });
  await onPhase?.('custody_reserved');
  for (const entry of plan.custody) await api.copyIn(entry.copy, releasePath(root, entry.path), { mkdir: true });
  for (const entry of plan.custody)
    require(sha(read(root, entry.copy, binaryLimit)) === entry.sha256, 'custody copy differs');
  await api.create(
    custody + '/seal.json',
    json(sealed({ schema: 'VidaReleaseRetargetCustody/v1', operation_id: operation, entries: plan.custody })),
  );
  await api.copyIn(custody + '/publication.tgz', releasePath(root, repair(operation) + '/candidate/archive.tgz'));
  stable.push(observation(root, custody + '/publication.tgz', binaryLimit));
  await onPhase?.('custody_ready');
  await withReleaseRepairLocks(root, operation, async () => {
    sameObservations(root, stable.concat(before));
    eligible(root, operation);
    require(planningState(root, operation, plan)?.phase === 'planning', 'planning reservation changed');
    await savePhase(api, operation, plan, 'custody');
  });
  return { status: 'planned', operation_id: operation, version: plan.version };
}

export async function planReleaseRetarget(
  { root, operation, actor }: { root: string; operation: string; actor: unknown },
  { onPhase }: { onPhase?: ((phase: string) => unknown) | undefined } = {},
): Promise<Record<string, unknown>> {
  require(typeof actor === 'string' && actor.trim() && actor.length <= 256, 'repair actor missing');
  const existing = repair(operation) + '/plan.json';
  if (identity(root, existing)) {
    const plan = loadPlan(root, operation);
    require(plan.actor === actor, 'repair attribution differs');
    const state = planningState(root, operation, plan);
    if (!state || state.phase === 'planning') return finishPlanning(root, operation, plan, { onPhase });
    return inspectReleaseRetarget({ root, operation });
  }
  const original = eligible(root, operation),
    { seal, observations: staged } = candidateSeal(root, operation);
  require(packedDistribution(original.pack_metadata) === 'npm' &&
    seal.version === original.version, 'original or candidate binding differs');
  const sources = sourceObservations(root, seal.source_binding);
  const archive = archivePath(operation, archiveName(original.pack_metadata));
  selectedTarball(original.pack_metadata, path.dirname(releasePath(root, archive)), original.version);
  require(sha(read(root, archive, binaryLimit)) === original.tarball_sha256, 'original archive differs');
  const before = pointers(root, operation),
    retained = retainedFiles(root, operation, original).map((file) =>
      observation(root, file, file === archive ? binaryLimit : textLimit),
    );
  const api = await access(root),
    custody = repair(operation) + '/custody';
  const preserved = retained.map((entry, i) => retainedCustodyEntry(entry, custody + '/files/' + i));
  const release_after = {
    ...original,
    pack_metadata: seal.pack_metadata,
    source_binding: seal.source_binding,
    tarball_sha256: seal.archive_sha256,
  };
  const releaseAfter: EligibleRelease = release_after;
  const planBody: RetargetPlanBody = {
    schema: 'VidaReleaseRetargetPlan/v1',
    operation_id: operation,
    version: original.version,
    actor,
    source_binding: seal.source_binding,
    candidate_digest: seal.digest,
    before,
    custody: preserved,
    release_after: releaseAfter,
    archive_before: original.tarball_sha256,
    archive_after: seal.archive_sha256,
  };
  const plan = sealed(planBody);
  const stable = retained.concat(staged, sources);
  await withReleaseRepairLocks(root, operation, async () => {
    sameObservations(root, stable.concat(before));
    eligible(root, operation);
    await api.create(existing, json(plan));
    await savePhase(api, operation, plan, 'planning');
  });
  await onPhase?.('planning');
  return finishPlanning(root, operation, plan, { onPhase }, stable, { seal, observations: staged });
}

/** Known-phase reconciliation only. The optional observer is a fault-test seam, never a CLI input. */

export async function applyReleaseRetarget(
  { root, operation }: { root: string; operation: string },
  { onPhase }: { onPhase?: ((phase: string) => unknown) | undefined } = {},
): Promise<Record<string, unknown>> {
  const plan = loadPlan(root, operation);
  const phase = planningState(root, operation, plan);
  if ((!phase || phase.phase === 'planning') && custodyAbsent(root, operation))
    await finishPlanning(root, operation, plan, { onPhase });
  const { seal, observations: staged } = candidateSeal(root, operation);
  require(seal.digest === plan.candidate_digest, 'frozen candidate differs');
  const custodySeal = unseal(object(root, repair(operation) + '/custody/seal.json'), 'VidaReleaseRetargetCustody/v1', [
    'schema',
    'operation_id',
    'entries',
  ]);
  require(custodySeal.operation_id === operation &&
    json(custodySeal.entries) === json(plan.custody), 'custody seal differs');
  const stable = staged.concat(
    observation(root, repair(operation) + '/custody/seal.json'),
    sourceObservations(root, plan.source_binding),
  );
  for (const entry of plan.custody) {
    const copy = observation(root, entry.copy, binaryLimit);
    require(copy.sha256 === entry.sha256, 'custody changed');
    stable.push(copy);
    if (!plan.before.some((before) => before.path === entry.path) && !entry.path.endsWith('.tgz')) {
      const current = observation(root, entry.path);
      require(current.sha256 === entry.sha256, 'retained receipt changed');
      stable.push(current);
    }
  }
  const originalCopy = plan.custody.find((entry) => entry.path === base(operation) + '/release.json');
  require(originalCopy, 'original release custody missing');
  const original = releaseState(releasePath(root, originalCopy.copy));
  const expected = {
    ...original,
    pack_metadata: seal.pack_metadata,
    source_binding: seal.source_binding,
    tarball_sha256: seal.archive_sha256,
  };
  require(original.operation_id === operation &&
    original.version === plan.version &&
    original.status === 'awaiting_assurance' &&
    !original.install_started &&
    original.tarball_sha256 === plan.archive_before &&
    seal.archive_sha256 === plan.archive_after &&
    seal.version === plan.version &&
    seal.source_binding === plan.source_binding &&
    packedDistribution(original.pack_metadata) === 'npm' &&
    packedDistribution(seal.pack_metadata) === 'native' &&
    json(expected) === json(plan.release_after), 'frozen three-field continuity differs');
  const archive = archivePath(operation, archiveName(plan.release_after.pack_metadata));
  const observedArchive = observation(root, archive, binaryLimit);
  const publication = observation(root, repair(operation) + '/custody/publication.tgz', binaryLimit);
  require(observedArchive.sha256 === plan.archive_before ||
    observedArchive.sha256 === plan.archive_after, 'archive UNKNOWN');
  require(publication.sha256 === plan.archive_after ||
    (publication.sha256 === null &&
      observedArchive.sha256 === plan.archive_after), 'publication stage missing or changed');
  stable.push(observedArchive, publication, observation(root, repair(operation) + '/plan.json'));
  const api = await access(root);
  return withReleaseRepairLocks(root, operation, async () => {
    sameObservations(root, stable);
    const original = eligible(root, operation),
      current = pointers(root, operation);
    for (const pointer of plan.before.slice(0, 2))
      require(current.find((entry) => entry.path === pointer.path)?.sha256 ===
        pointer.sha256, 'original pointer changed');
    const currentRelease = current[2];
    const beforeRelease = plan.before[2];
    require(currentRelease && beforeRelease, 'release pointer observations missing');
    const releaseHash = currentRelease.sha256,
      beforeHash = beforeRelease.sha256,
      afterHash = sha(json(plan.release_after));
    require(releaseHash === beforeHash || releaseHash === afterHash, 'release UNKNOWN');
    require(original.version === plan.version, 'original version changed');
    const stateFile = retargetStateRelative(operation);
    const state = identity(root, stateFile)
      ? unseal(object(root, stateFile), 'VidaReleaseRetargetState/v1', stateFields)
      : null;
    assertRepairPhase(state, operation, plan.digest, afterHash);
    // A missing initial ACK is known only while all frozen preimages still hold.
    require(state ||
      (releaseHash === beforeHash && observedArchive.sha256 === plan.archive_before), 'missing phase after effects');
    require(state?.phase !== 'planning' ||
      (releaseHash === beforeHash && observedArchive.sha256 === plan.archive_before), 'planning phase effects UNKNOWN');
    const phase = state?.phase === 'planning' ? 'custody' : (state?.phase ?? 'custody');
    if (phase === 'complete') {
      require(releaseHash === afterHash &&
        observedArchive.sha256 === plan.archive_after, 'complete postcondition changed');
      return { status: 'complete', operation_id: operation, version: plan.version, qualified: false };
    }
    require(!(phase === 'custody' && releaseHash !== beforeHash) &&
      !(releaseHash === afterHash && observedArchive.sha256 !== plan.archive_after) &&
      !(phase === 'archive' && observedArchive.sha256 !== plan.archive_after) &&
      !(phase === 'release' && releaseHash !== afterHash), 'mixed repair phase UNKNOWN');
    if (observedArchive.sha256 === plan.archive_before) {
      require(releaseHash === beforeHash && phase === 'custody', 'archive phase differs');
      await api.move(repair(operation) + '/custody/publication.tgz', archive, { overwrite: true });
      await onPhase?.('archive_effect');
    }
    await savePhase(api, operation, plan, 'archive');
    await onPhase?.('archive');
    if (releaseHash === beforeHash) {
      await api.write(base(operation) + '/release.json', json(plan.release_after));
      await onPhase?.('release_effect');
    }
    await savePhase(api, operation, plan, 'release');
    await onPhase?.('release');
    await savePhase(api, operation, plan, 'complete');
    return { status: 'complete', operation_id: operation, version: plan.version, qualified: false };
  });
}

type CompletedRetargetHandoff = {
  operation_id: string;
  version: string;
  plan_digest: string;
  previous: ReturnType<typeof completedRetargetPreviousRelease>;
  previous_archive_sha256: string;
  current: EligibleRelease;
  current_archive_sha256: string;
};

function completedRetargetPlan(
  root: string,
  operation: string,
): { plan: RetargetPlan; planBefore: ReadObservation; stateBefore: ReadObservation } | null {
  require(releaseIdPattern.test(operation), 'operation invalid');
  const planBefore = observation(root, repair(operation) + '/plan.json');
  if (planBefore.identity === null) return null;
  assertReleaseRetargetSettled(root, operation);
  const plan = loadPlan(root, operation),
    stateBefore = observation(root, retargetStateRelative(operation)),
    state = planningState(root, operation, plan);
  require(state?.phase === 'complete', 'retarget handoff is not at its exact complete phase');
  return { plan, planBefore, stateBefore };
}

function assertCompletedCandidate(
  operation: string,
  plan: RetargetPlan,
  published: ReturnType<typeof readNativeRetargetCandidate>,
) {
  require(published.candidate_digest === plan.candidate_digest &&
    published.operation_id === operation &&
    published.version === plan.version &&
    published.source_binding === plan.source_binding &&
    published.archive_sha256 === plan.archive_after, 'completed retarget candidate differs from the frozen plan');
}

function completedRetargetCustody(
  root: string,
  operation: string,
  plan: RetargetPlan,
  published: ReturnType<typeof readNativeRetargetCandidate>,
): { previous: ReturnType<typeof completedRetargetPreviousRelease>; observations: ReadObservation[] } {
  return {
    previous: completedRetargetPreviousRelease(root, operation, plan, published),
    observations: completedRetargetCustodyObservations(root, operation, plan, published),
  };
}

function completedRetargetCustodyObservations(
  root: string,
  operation: string,
  plan: RetargetPlan,
  published: ReturnType<typeof readNativeRetargetCandidate>,
): ReadObservation[] {
  const custodySealPath = repair(operation) + '/custody/seal.json';
  const custodySeal = unseal(object(root, custodySealPath), 'VidaReleaseRetargetCustody/v1', [
    'schema',
    'operation_id',
    'entries',
  ]);
  require(custodySeal.operation_id === operation &&
    json(custodySeal.entries) === json(plan.custody), 'completed retarget custody seal differs');
  const observations = [
    ...published.observations,
    observation(root, custodySealPath),
    ...sourceObservations(root, plan.source_binding),
  ];
  for (const entry of plan.custody) {
    const copy = observation(root, entry.copy, binaryLimit);
    require(copy.sha256 === entry.sha256, 'completed retarget custody copy differs');
    observations.push(copy);
    if (!plan.before.some((before) => before.path === entry.path) && !entry.path.endsWith('.tgz')) {
      const retained = observation(root, entry.path);
      require(retained.sha256 === entry.sha256, 'completed retarget retained receipt differs');
      observations.push(retained);
    }
  }
  return observations;
}

function completedRetargetPreviousRelease(
  root: string,
  operation: string,
  plan: RetargetPlan,
  published: ReturnType<typeof readNativeRetargetCandidate>,
) {
  const previousReleasePath = base(operation) + '/release.json';
  const previousCopy = plan.custody.find((entry) => entry.path === previousReleasePath);
  require(previousCopy &&
    previousCopy.sha256 ===
      plan.before[2]?.sha256, 'completed retarget previous release custody differs from the frozen before pointer');
  const previousState = releaseState(releasePath(root, previousCopy.copy));
  require(previousState.operation_id === operation &&
    previousState.version === plan.version &&
    previousState.status === 'awaiting_assurance' &&
    !previousState.install_started &&
    previousState.tarball_sha256 === plan.archive_before &&
    packedDistribution(previousState.pack_metadata) === 'npm' &&
    packedDistribution(published.pack_metadata) === 'native', 'completed retarget previous release image differs');
  const previous = {
    ...previousState,
    status: previousState.status,
    source_binding: previousState.source_binding,
    tarball_sha256: previousState.tarball_sha256,
    pack_metadata: packMetadata(previousState.pack_metadata),
  };
  const previousArchivePath = archivePath(operation, archiveName(previous.pack_metadata));
  const previousArchive = plan.custody.find((entry) => entry.path === previousArchivePath);
  require(previousArchive?.sha256 === plan.archive_before, 'completed retarget previous archive receipt differs');
  return previous;
}

function assertCompletedContinuity(
  plan: RetargetPlan,
  published: ReturnType<typeof readNativeRetargetCandidate>,
  previous: ReturnType<typeof completedRetargetPreviousRelease>,
) {
  const expectedCurrent = {
    ...previous,
    pack_metadata: published.pack_metadata,
    source_binding: published.source_binding,
    tarball_sha256: published.archive_sha256,
  };
  require(published.version === plan.version &&
    json(expectedCurrent) === json(plan.release_after), 'completed retarget three-field continuity differs');
}

function completedRetargetAfterimage(
  root: string,
  operation: string,
  plan: RetargetPlan,
  observations: ReadObservation[],
): EligibleRelease {
  const current = eligible(root, operation);
  require(current.version === plan.version &&
    json(current) === json(plan.release_after), 'completed retarget release afterimage differs');
  const currentPointers = pointers(root, operation);
  require(plan.before.length === 3 &&
    currentPointers.length === 3 &&
    plan.before[0]?.sha256 === currentPointers[0]?.sha256 &&
    plan.before[1]?.sha256 === currentPointers[1]?.sha256 &&
    currentPointers[2]?.sha256 === sha(json(plan.release_after)), 'completed retarget before/after pointers differ');
  observations.push(...currentPointers);
  const currentArchivePath = archivePath(operation, archiveName(current.pack_metadata));
  const currentArchive = observation(root, currentArchivePath, binaryLimit);
  const publication = observation(root, repair(operation) + '/custody/publication.tgz', binaryLimit);
  require(currentArchive.sha256 === plan.archive_after &&
    (publication.sha256 === plan.archive_after ||
      publication.sha256 === null), 'completed retarget archive afterimage differs');
  observations.push(currentArchive, publication);
  return current;
}

/** Recheck only the exact completed npm-to-native receipt. This function has no repair effects. */

export async function verifyCompletedReleaseRetargetHandoff({
  root,
  operation,
}: {
  root: string;
  operation: string;
}): Promise<CompletedRetargetHandoff | null> {
  const completed = completedRetargetPlan(root, operation);
  if (!completed) return null;
  const { plan, planBefore, stateBefore } = completed,
    published = readNativeRetargetCandidate({ root, operation, published: true });
  assertCompletedCandidate(operation, plan, published);
  const custody = completedRetargetCustody(root, operation, plan, published),
    observations = custody.observations.concat(planBefore, stateBefore);
  assertCompletedContinuity(plan, published, custody.previous);
  const current = completedRetargetAfterimage(root, operation, plan, observations);
  sameObservations(root, observations);
  return Object.freeze({
    operation_id: operation,
    version: plan.version,
    plan_digest: plan.digest,
    previous: freezeReleaseImage(custody.previous),
    previous_archive_sha256: plan.archive_before,
    current: freezeReleaseImage(current),
    current_archive_sha256: plan.archive_after,
  });
}

function freezeReleaseImage<T extends Pick<EligibleRelease, 'pack_metadata'>>(image: T): Readonly<T> {
  for (const metadata of image.pack_metadata) {
    for (const file of metadata.files) Object.freeze(file);
    Object.freeze(metadata.files);
    Object.freeze(metadata);
  }
  Object.freeze(image.pack_metadata);
  return Object.freeze(image);
}

function retargetArgument(
  key: unknown,
  value: unknown,
  values: Record<string, string>,
  allowedOptions: string[],
): { key: string; value: string } {
  require(typeof key === 'string' &&
    typeof value === 'string' &&
    value.length > 0 &&
    allowedOptions.includes(key) &&
    !Object.hasOwn(values, key), 'retarget arguments invalid');
  return { key, value };
}

export async function runReleaseRetarget(
  args: readonly string[],
  options: { onPhase?: ((phase: string) => unknown) | undefined },
): Promise<Record<string, unknown>> {
  const values: Record<string, string> = {};
  const allowedOptions = reconcileAllowedOptions('release-retarget');
  require(args.length % 2 === 0, 'retarget argument pairs differ');
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];
    const pair = retargetArgument(key, value, values, allowedOptions);
    values[pair.key] = pair.value;
  }
  assertReconcileOptionKeys(values, 'release-retarget', values['--mode'], 'retarget arguments differ from declaration');
  const rootArg = values['--project-root'];
  const operationArg = values['--operation'];
  const modeArg = values['--mode'];
  const contract = reconcileCliContracts['release-retarget'];
  require(contract, 'retarget command declaration missing');
  require(values['--kind'] === 'release-retarget' &&
    typeof rootArg === 'string' &&
    typeof operationArg === 'string' &&
    typeof modeArg === 'string' &&
    path.isAbsolute(rootArg) &&
    releaseIdPattern.test(operationArg) &&
    contract.modes.includes(modeArg), 'retarget operation arguments invalid');
  const root = rootArg;
  const operation = operationArg;
  const input = { root, operation, actor: values['--actor'] };
  if (values['--mode'] === 'inspect') {
    require(!input.actor, 'inspect accepts no actor');
    return inspectReleaseRetarget(input);
  }
  if (values['--mode'] === 'plan') return planReleaseRetarget(input, options);
  require(!input.actor, 'apply/resume use frozen attribution');
  return applyReleaseRetarget(input, options);
}
