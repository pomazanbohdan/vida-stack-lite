import {
  assertReconcileOptionKeys,
  reconcileAllowedOptions,
  reconcileCliContracts,
} from './reconcile-cli-contracts.ts';
import { existsSync, lstatSync, mkdirSync, opendirSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { root as safeRoot } from '@openclaw/fs-safe/root';
import {
  withReleaseRepairLocks,
  createRepairSourcePass,
  releaseDigest as sha,
  releaseJSON as json,
  requireRelease as require,
  releasePath,
  releaseRelative,
  registerRepairSourcePath,
  releaseDirectory,
  releaseIdPattern,
  releaseState,
  parseReleaseFileIdentity,
  parseReleaseSourceObservation,
  readReleaseBytes as read,
  parseReleasePackMetadata as packMetadata,
  releaseSourceBinding,
  releaseSourceInputs,
  selectedTarball,
} from './local-release-artifacts.ts';
import { verifyForwardReviewSet } from './forward-review-proof.ts';
import { isRecord } from '../src/contracts/forward-controller-values.ts';

type ReleaseState = import('./local-release-artifacts.ts').ReleaseState;
type RepairSourcePass = ReturnType<typeof createRepairSourcePass>;
type FileIdentity = readonly [number, number, number, number, number];
type FileObservation =
  | { path: string; kind: 'file'; exists: true; identity: FileIdentity; sha256: string; copy?: string | null }
  | { path: string; kind: 'file'; exists: false; identity: null; sha256: null; copy?: string | null };
type DirectoryObservation = {
  path: string;
  kind: 'directory';
  exists: true;
  identity: FileIdentity;
  members: string[];
};
type JsonRecord = Record<string, unknown>;
type PackEntry = { filename: string; files: Array<{ path: string; size: number }> } & Record<string, unknown>;
type ReleaseRecord = ReleaseState & { pack_metadata: [PackEntry]; source_binding: string; tarball_sha256: string };

type DependencyClosure = {
  source_binding: string;
  source_observations: import('./local-release-artifacts.ts').SourceObservation[];
  files: FileObservation[];
  directories: DirectoryObservation[];
};
type RepairPlan = JsonRecord & {
  operation_id: string;
  version: string;
  actor: string;
  release_before: JsonRecord;
  source_before: string;
  closure: DependencyClosure;
  beforeimages: FileObservation[];
  digest: string;
};
type SourceSeal = JsonRecord & {
  operation_id: string;
  version: string;
  source_binding: string;
  tarball_sha256: string;
  sealed_fingerprint: string;
  entries: Array<{ path: string; sha256: string }>;
};
type RepairState = JsonRecord & { operation_id: string; plan_digest: string; phase: string; digest: string };

const base = (op: string): string => '.agent/work/agent-local-release/' + op;

const repair = (op: string): string => base(op) + '/native-delivery-evidence';

const targets = (op: string): [string, string, string] => [
  base(op) + '/tests.json',
  base(op) + '/source-seal.json',
  base(op) + '/assurance.json',
];
const phaseNames = [
  'planning',
  'custody',
  'tests_pending',
  'tests_removed',
  'source_seal_pending',
  'source_seal_removed',
  'assurance_pending',
  'assurance_removed',
  'complete',
];
const pathFields = new Set([
  'path',
  'reverse_path',
  'scope_path',
  'clear_path',
  'transport_path',
  'archive',
  'stdout_path',
  'stderr_path',
  'log_path',
  'result_path',
  'observation_path',
  'manifest_path',
  'installer_path',
]);
const sourceExcluded = new Set(['node_modules', 'dist', 'coverage', '.pack-inspect']);
const sourceScratch = new Set(['.tmp', '.agent', 'packages/agent/.tmp', 'packages/agent/.agent']);

function identity(stat: import('node:fs').Stats): FileIdentity;
function identity(stat: null | undefined): null;
function identity(stat: import('node:fs').Stats | null | undefined): FileIdentity | null;
function identity(stat: import('node:fs').Stats | null | undefined): FileIdentity | null {
  return stat ? [stat.dev, stat.ino, stat.size, stat.mtimeMs, stat.ctimeMs] : null;
}

const sealed = <T extends object>(body: T): T & { digest: string } => ({ ...body, digest: sha(json(body)) });

function keys(value: unknown, expected: readonly string[]): asserts value is JsonRecord {
  require(value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join() === expected.slice().sort().join(), 'native evidence repair fields differ');
}

function object(root: string, relative: string): unknown {
  return JSON.parse(read(root, relative).toString('utf8'));
}

function retainJsonImage(images: Map<string, Buffer> | undefined, relative: string, bytes: Buffer) {
  if (images?.has(relative) && bytes.length <= 8 * 1024 * 1024) images.set(relative, bytes);
}

function fileObservation(root: string, relative: string, jsonImages?: Map<string, Buffer>): FileObservation {
  const file = releasePath(root, relative, true),
    stat = lstatSync(file, { throwIfNoEntry: false });
  if (!stat) return { path: relative, kind: 'file', exists: false, identity: null, sha256: null };
  require(stat.isFile() && stat.nlink === 1, 'native evidence dependency is not a regular file');
  const bytes = read(root, relative, 512 * 1024 * 1024);
  require(json(identity(stat)) ===
    json(identity(lstatSync(file))), 'native evidence dependency changed during observation');
  retainJsonImage(jsonImages, relative, bytes);
  return { path: relative, kind: 'file', exists: true, identity: identity(stat), sha256: sha(bytes) };
}

function registerClosureNode(nodes: Set<string>, relative: string, sourcePass: RepairSourcePass) {
  const normalized = releaseRelative(relative);
  if (nodes.has(normalized)) return;
  registerRepairSourcePath(sourcePass, normalized);
  nodes.add(normalized);
}

function closureDirectoryMembers(
  root: string,
  relative: string,
  nodes: Set<string>,
  sourcePass: RepairSourcePass,
): string[] {
  registerClosureNode(nodes, relative, sourcePass);
  const directory = opendirSync(releasePath(root, relative));
  const members = [];
  try {
    while (true) {
      const entry = directory.readSync();
      if (!entry) break;
      registerClosureNode(nodes, relative + '/' + entry.name, sourcePass);
      members.push(entry.name);
    }
  } finally {
    directory.closeSync();
  }
  return members.sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
}

function hasUnsafeReferenceCharacter(value: string) {
  // oxlint-disable-next-line no-control-regex -- The reference boundary intentionally rejects exactly C0 controls and colon.
  return /[\x00-\x1f:]/.test(value);
}

function addRef(
  root: string,
  enqueue: (relative: string, validatePath?: boolean) => void,
  value: unknown,
  packageRelative: boolean = false,
) {
  require(typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 1024 &&
    !value.includes('\\') &&
    !path.isAbsolute(value) &&
    !hasUnsafeReferenceCharacter(value), 'native evidence dependency reference invalid');
  const candidate = packageRelative ? 'packages/agent/' + value : value;
  enqueue(candidate, true);
}

function addStandaloneInputs(
  root: string,
  enqueue: (relative: string, validatePath?: boolean) => void,
  inputs: unknown,
) {
  require(Array.isArray(inputs), 'native evidence standalone inputs invalid');
  for (const input of inputs) {
    keys(input, ['path', 'bytes', 'sha256']);
    require(typeof input.path === 'string' &&
      typeof input.bytes === 'number' &&
      Number.isSafeInteger(input.bytes) &&
      input.bytes >= 0 &&
      typeof input.sha256 === 'string' &&
      /^[a-f0-9]{64}$/.test(input.sha256), 'native evidence standalone input invalid');
    addRef(root, enqueue, input.path, true);
  }
}

function addInputReferences(
  root: string,
  enqueue: (relative: string, validatePath?: boolean) => void,
  key: string,
  child: unknown,
  packageRelative: boolean,
  standaloneBuild: boolean,
) {
  if (key !== 'inputs' || !Array.isArray(child)) return false;
  if (!standaloneBuild) for (const input of child) addRef(root, enqueue, input, packageRelative);
  return true;
}

function addFilenameReference(
  root: string,
  enqueue: (relative: string, validatePath?: boolean) => void,
  key: string,
  child: unknown,
  value: JsonRecord,
) {
  if (key !== 'filename' || typeof child !== 'string' || !/^[\w.-]+\.tgz$/.test(child)) return false;
  if (typeof value.operation_id === 'string')
    addRef(root, enqueue, '.tmp/releases/' + value.operation_id + '/' + child);
  return true;
}

function addEntryReferences(
  root: string,
  enqueue: (relative: string, validatePath?: boolean) => void,
  key: string,
  child: unknown,
  packageRelative: boolean,
) {
  if (key !== 'entries' || !Array.isArray(child)) return false;
  for (const entry of child)
    if (isRecord(entry) && typeof entry.path === 'string') addRef(root, enqueue, entry.path, packageRelative);
  return true;
}

function addStructuredReference(
  root: string,
  enqueue: (relative: string, validatePath?: boolean) => void,
  key: string,
  child: unknown,
  value: JsonRecord,
  packageRelative: boolean,
  standaloneBuild: boolean,
) {
  if (pathFields.has(key) && typeof child === 'string') addRef(root, enqueue, child, packageRelative);
  else if (addInputReferences(root, enqueue, key, child, packageRelative, standaloneBuild)) return;
  else if (addFilenameReference(root, enqueue, key, child, value)) return;
  else if (addEntryReferences(root, enqueue, key, child, packageRelative)) return;
  else if (child && typeof child === 'object')
    references(root, enqueue, child, packageRelative || key === 'pack_metadata');
}

function references(
  root: string,
  enqueue: (relative: string, validatePath?: boolean) => void,
  value: unknown,
  packageRelative: boolean = false,
) {
  if (Array.isArray(value)) {
    for (const item of value) references(root, enqueue, item, packageRelative);
    return;
  }
  if (!isRecord(value)) return;
  const standaloneBuild = value.schema === 'VidaStandaloneBuild/v1';
  packageRelative ||= standaloneBuild;
  if (standaloneBuild) addStandaloneInputs(root, enqueue, value.inputs);
  for (const [key, child] of Object.entries(value))
    addStructuredReference(root, enqueue, key, child, value, packageRelative, standaloneBuild);
}

function seedClosureReferences(
  root: string,
  operation: string,
  seal: SourceSeal,
  sourcePass: RepairSourcePass,
  releaseProjection: ReleaseRecord | undefined,
  enqueue: (relative: string, validatePath?: boolean) => void,
) {
  const releaseValue = releaseProjection ?? object(root, base(operation) + '/release.json');
  require(isRecord(releaseValue) && Array.isArray(releaseValue.pack_metadata), 'release metadata invalid');
  for (const raw of releaseValue.pack_metadata)
    if (isRecord(raw) && typeof raw.filename === 'string') enqueue('.tmp/releases/' + operation + '/' + raw.filename);
  require(Array.isArray(seal.entries), 'source seal entries invalid');
  for (const raw of seal.entries) if (isRecord(raw) && typeof raw.path === 'string') addRef(root, enqueue, raw.path);
  const current = releaseSourceBinding(root, true, sourcePass);
  for (const entry of current.entries) addRef(root, enqueue, entry.path);
  return current;
}

function recordOperationDirectory(
  root: string,
  operation: string,
  nodes: Set<string>,
  sourcePass: RepairSourcePass,
  directories: Map<string, DirectoryObservation>,
) {
  const relative = base(operation);
  const stat = lstatSync(releasePath(root, relative));
  const observedIdentity = identity(stat);
  require(observedIdentity, 'operation directory identity missing');
  const members = closureDirectoryMembers(root, relative, nodes, sourcePass);
  directories.set(relative, {
    path: relative,
    kind: 'directory',
    exists: true,
    identity: observedIdentity,
    members: members.filter((name) => !/^worker\.sqlite(?:-wal|-shm|-journal)?$/.test(name)),
  });
  return members;
}

function finishClosure(
  root: string,
  operation: string,
  files: Map<string, FileObservation>,
  directories: Map<string, DirectoryObservation>,
  current: ReturnType<typeof releaseSourceBinding>,
): DependencyClosure {
  for (const target of targets(operation)) if (!files.has(target)) files.set(target, fileObservation(root, target));
  require(current.observations, 'Source observations missing');
  return {
    source_binding: current.source_binding,
    source_observations: current.observations,
    files: [...files.values()].sort((a, b) => a.path.localeCompare(b.path)),
    directories: [...directories.values()].sort((a, b) => a.path.localeCompare(b.path)),
  };
}

function skipClosureChild(root: string, operation: string, relative: string, name: string, sourceMode: boolean) {
  const child = relative + '/' + name;
  if (
    !sourceMode &&
    (child.startsWith(repair(operation) + '/') || /^worker\.sqlite(?:-wal|-shm|-journal)?$/.test(name))
  )
    return true;
  if (!sourceMode) return false;
  const childStat = lstatSync(releasePath(root, child));
  require(!childStat.isSymbolicLink(), 'native evidence dependency linked');
  return childStat.isDirectory() && (sourceExcluded.has(name) || sourceScratch.has(child));
}

function shouldExpandJson(relative: string, observed: FileObservation, parsed: Set<string>) {
  return (
    relative.endsWith('.json') &&
    observed.exists &&
    observed.identity !== null &&
    observed.identity[2] <= 8 * 1024 * 1024 &&
    !parsed.has(relative)
  );
}

function closure(
  root: string,
  operation: string,
  seal: SourceSeal,
  sourcePass: RepairSourcePass,
  releaseProjection?: ReleaseRecord,
): DependencyClosure {
  const jsonImages = new Map<string, Buffer>([[base(operation) + '/release.json', Buffer.alloc(0)]]);
  const queue: string[] = [];
  const nodes = new Set<string>();
  const queued = new Set<string>();

  const enqueue = (relative: string, validatePath: boolean = false) => {
    const normalized = releaseRelative(relative);
    if (validatePath) releaseRelative(relative);
    if (queued.has(normalized)) return;
    queued.add(normalized);
    registerClosureNode(nodes, normalized, sourcePass);
    queue.push(normalized);
  };
  enqueue(base(operation) + '/release.json');
  enqueue('.agent/work/agent-local-release/pending.json');
  enqueue('.agent/work/agent-local-release/successful.json');
  for (const target of targets(operation)) enqueue(target);
  const current = seedClosureReferences(root, operation, seal, sourcePass, releaseProjection, enqueue);
  const files = new Map<string, FileObservation>(),
    directories = new Map<string, DirectoryObservation>();
  const parsed = new Set<string>();
  const opMembers = recordOperationDirectory(root, operation, nodes, sourcePass, directories);

  const walk = (start: string, sourceMode: boolean = false) => {
    const pending = [start];
    while (pending.length) {
      const relative = pending.pop();
      if (relative === undefined) continue;
      registerClosureNode(nodes, relative, sourcePass);
      const absolute = releasePath(root, relative),
        stat = lstatSync(absolute);
      require(!stat.isSymbolicLink(), 'native evidence dependency linked');
      if (stat.isDirectory()) {
        const members = closureDirectoryMembers(root, relative, nodes, sourcePass);
        directories.set(relative, {
          path: relative,
          kind: 'directory',
          exists: true,
          identity: identity(stat),
          members,
        });
        if (sourceMode && sourceScratch.has(relative)) continue;
        for (const name of members) {
          const child = relative + '/' + name;
          if (skipClosureChild(root, operation, relative, name, sourceMode)) continue;
          pending.push(child);
        }
      } else {
        files.set(relative, fileObservation(root, relative, jsonImages));
        if (relative.endsWith('.json')) enqueue(relative);
      }
    }
  };
  // The operation directory is the reader-owned root for requests, results, observations, phases and logs.
  for (const name of opMembers) {
    if (name === 'native-delivery-evidence' || /^worker\.sqlite(?:-wal|-shm|-journal)?$/.test(name)) continue;
    walk(base(operation) + '/' + name);
  }

  const expandJson = (relative: string, observed: FileObservation) => {
    if (!shouldExpandJson(relative, observed, parsed)) return;
    parsed.add(relative);
    const bytes = jsonImages.get(relative) ?? read(root, relative);
    require(sha(bytes) === observed.sha256, 'native evidence dependency changed during closure: ' + relative);
    const parsedValue: unknown = JSON.parse(bytes.toString('utf8'));
    references(
      root,
      enqueue,
      parsedValue,
      relative.startsWith('packages/agent/') &&
        isRecord(parsedValue) &&
        parsedValue.schema === 'VidaStandaloneBuild/v1',
    );
  };
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const relative = queue[cursor];
    if (relative === undefined) continue;
    if (relative.startsWith(repair(operation) + '/') || directories.has(relative)) continue;
    const inventoried = files.get(relative);
    if (inventoried) {
      expandJson(relative, inventoried);
      continue;
    }
    const file = releasePath(root, relative, true),
      stat = lstatSync(file, { throwIfNoEntry: false });
    const parent = path.posix.dirname(relative),
      parentPath = parent === '.' ? null : releasePath(root, parent, true),
      parentStat = parentPath ? lstatSync(parentPath, { throwIfNoEntry: false }) : null;
    if (parentStat?.isDirectory() && !directories.has(parent)) {
      const members = closureDirectoryMembers(root, parent, nodes, sourcePass).filter(
        (name) =>
          !(parent === '.agent/work/agent-local-release' && /^admission\.sqlite(?:-wal|-shm|-journal)?$/.test(name)),
      );
      directories.set(parent, {
        path: parent,
        kind: 'directory',
        exists: true,
        identity: identity(parentStat),
        members,
      });
    }
    registerClosureNode(nodes, relative, sourcePass);
    if (!stat) {
      files.set(relative, fileObservation(root, relative, jsonImages));
      continue;
    }
    if (stat.isDirectory()) {
      walk(relative, true);
    } else {
      const observed = fileObservation(root, relative, jsonImages);
      files.set(relative, observed);
      expandJson(relative, observed);
    }
  }
  // Preserve explicit absences for the three repair targets and all reader references.
  return finishClosure(root, operation, files, directories, current);
}

function sameClosure(root: string, expected: DependencyClosure, operation: string, sourcePass: RepairSourcePass) {
  const mutable = new Set(targets(operation));
  const nodes = new Set<string>();
  for (const item of expected.files)
    if (!mutable.has(item.path)) {
      registerClosureNode(nodes, item.path, sourcePass);
      require(json(fileObservation(root, item.path)) === json(item), 'protected dependency changed: ' + item.path);
    }
  for (const item of expected.directories) {
    const stat = lstatSync(releasePath(root, item.path), { throwIfNoEntry: false });
    require(stat && stat.isDirectory() && !stat.isSymbolicLink(), 'protected dependency directory missing: ' +
      item.path);
    const ignored =
      item.path === base(operation)
        ? new Set([
            'native-delivery-evidence',
            'worker.sqlite',
            'worker.sqlite-wal',
            'worker.sqlite-shm',
            'worker.sqlite-journal',
            ...[...mutable]
              .filter((p) => p.startsWith(item.path + '/') && p.slice(item.path.length + 1).indexOf('/') < 0)
              .map((p) => p.slice(item.path.length + 1)),
          ])
        : item.path === '.agent/work/agent-local-release'
          ? new Set(['admission.sqlite', 'admission.sqlite-wal', 'admission.sqlite-shm', 'admission.sqlite-journal'])
          : new Set<string>();
    const members = closureDirectoryMembers(root, item.path, nodes, sourcePass).filter((name) => !ignored.has(name));
    const expectedMembers = item.members.filter((name) => !ignored.has(name)).sort();
    require(stat.dev === item.identity[0] && stat.ino === item.identity[1], 'protected directory identity changed: ' +
      item.path);
    require(json(members) === json(expectedMembers), 'protected directory membership changed: ' + item.path);
  }
  const current = releaseSourceBinding(root, true, sourcePass);
  require(current.source_binding === expected.source_binding &&
    json(current.observations) === json(expected.source_observations), 'Source or dependency binding changed');
}

function assertEligibleRelease(manifest: JsonRecord, state: ReleaseState, pending: ReleaseState, operation: string) {
  require(manifest.name === 'vida-agent' &&
    state.operation_id === operation &&
    pending.operation_id === operation &&
    state.version === pending.version &&
    state.version === manifest.version &&
    state.status === 'awaiting_assurance' &&
    !state.install_started, 'original operation is not eligible');
}

function eligible(root: string, operation: string): { state: ReleaseRecord; pending: ReleaseState } {
  require(releaseIdPattern.test(operation), 'operation invalid');
  releasePath(root, 'packages/agent/package.json');
  const manifestValue = object(root, 'packages/agent/package.json');
  require(isRecord(manifestValue) &&
    typeof manifestValue.name === 'string' &&
    typeof manifestValue.version === 'string', 'package manifest invalid');
  const manifest = manifestValue;
  const rawState = releaseState(releasePath(root, base(operation) + '/release.json'));
  const rawPending = releaseState(releasePath(root, '.agent/work/agent-local-release/pending.json'));
  const state = rawState;
  const pending = rawPending;
  assertEligibleRelease(manifest, state, pending, operation);
  require(typeof rawState.source_binding === 'string' &&
    typeof rawState.tarball_sha256 === 'string', 'release binding fields invalid');
  return {
    state: {
      ...state,
      source_binding: rawState.source_binding,
      tarball_sha256: rawState.tarball_sha256,
      pack_metadata: packMetadata(rawState.pack_metadata),
    },
    pending,
  };
}

function assertSealEntries(
  value: JsonRecord,
  required: boolean,
  message: string,
): asserts value is JsonRecord & { entries: Array<{ path: string; sha256: string }> } {
  require(Array.isArray(value.entries) &&
    (!required || value.entries.length > 0) &&
    value.entries.every(
      (entry) =>
        isRecord(entry) &&
        typeof entry.path === 'string' &&
        typeof entry.sha256 === 'string' &&
        /^[a-f0-9]{64}$/.test(entry.sha256),
    ), message);
}

function assertSealDigests(value: JsonRecord, message: string) {
  require(sha(JSON.stringify(value.entries)) === value.source_binding &&
    value.sealed_fingerprint === sha(JSON.stringify([value.source_binding, value.tarball_sha256])), message);
}

function assertSealKeys(value: unknown): asserts value is JsonRecord {
  keys(value, ['operation_id', 'version', 'source_binding', 'entries', 'tarball_sha256', 'sealed_fingerprint']);
}

function assertSealIdentity(
  value: JsonRecord,
  operation: string,
  version: string,
  sourceBinding: string,
  tarballSha: string,
  message: string,
): asserts value is JsonRecord & {
  operation_id: string;
  version: string;
  source_binding: string;
  tarball_sha256: string;
  sealed_fingerprint: string;
} {
  require(typeof value.operation_id === 'string' &&
    typeof value.version === 'string' &&
    typeof value.source_binding === 'string' &&
    typeof value.tarball_sha256 === 'string' &&
    typeof value.sealed_fingerprint === 'string' &&
    value.operation_id === operation &&
    value.version === version &&
    value.source_binding === sourceBinding &&
    value.tarball_sha256 === tarballSha, message);
}

function assertArchiveDigest(root: string, operation: string, state: ReleaseRecord, digest: string) {
  const archive = selectedTarball(
    state.pack_metadata,
    path.dirname(releasePath(root, '.tmp/releases/' + operation + '/' + state.pack_metadata[0].filename)),
    state.version,
  );
  require(sha(readFileSync(archive)) === digest, 'source seal archive binding differs');
}

function validateSeal(root: string, operation: string, state: ReleaseRecord, sourcePass: RepairSourcePass): SourceSeal {
  const value = object(root, base(operation) + '/source-seal.json');
  assertSealKeys(value);
  const invalidSeal = 'source seal does not bind the original release';
  assertSealIdentity(value, operation, state.version, state.source_binding, state.tarball_sha256, invalidSeal);
  assertSealEntries(value, true, invalidSeal);
  assertSealDigests(value, invalidSeal);
  const current = releaseSourceBinding(root, true, sourcePass);
  require(value.source_binding !==
    current.source_binding, 'source seal is current; stale qualification repair is not applicable');
  assertArchiveDigest(root, operation, state, state.tarball_sha256);
  return {
    ...value,
    operation_id: value.operation_id,
    version: value.version,
    source_binding: value.source_binding,
    tarball_sha256: value.tarball_sha256,
    sealed_fingerprint: value.sealed_fingerprint,
    entries: value.entries,
  };
}

function requiredRepairStringField(entry: unknown, key: string, message: string): string {
  require(isRecord(entry) && typeof entry[key] === 'string', message);
  return entry[key];
}

function testLane(entry: unknown): string {
  return requiredRepairStringField(entry, 'lane', 'current local test lane invalid');
}

function observationPath(entry: unknown): string {
  return requiredRepairStringField(entry, 'path', 'native evidence observation path invalid');
}
type TestEntry = { lane: string; path: string; inputs: string[]; input_binding: string; sha256: string };

function assertTestEntry(entry: unknown): TestEntry {
  keys(entry, ['lane', 'path', 'inputs', 'input_binding', 'sha256']);
  require(typeof entry.lane === 'string' &&
    typeof entry.path === 'string' &&
    typeof entry.input_binding === 'string' &&
    typeof entry.sha256 === 'string' &&
    Array.isArray(entry.inputs) &&
    entry.inputs.length > 0 &&
    /^[a-f0-9]{64}$/.test(entry.input_binding) &&
    /^[a-f0-9]{64}$/.test(entry.sha256), 'current local test entry invalid');
  require(entry.inputs.every((input) => typeof input === 'string') &&
    new Set(entry.inputs).size === entry.inputs.length, 'current local test input set invalid');
  return {
    lane: entry.lane,
    path: entry.path,
    inputs: entry.inputs,
    input_binding: entry.input_binding,
    sha256: entry.sha256,
  };
}

function assertSuccessfulTestLog(root: string, entry: TestEntry) {
  const log = read(root, entry.path);
  require(sha(log) === entry.sha256, 'current local test log differs');
  const result: unknown = JSON.parse(log.toString('utf8'));
  require(isRecord(result) &&
    result.exit_code === 0 &&
    result.command &&
    result.started_at &&
    result.completed_at, 'successful current local test log required');
}

function assertCurrentTestBinding(
  root: string,
  entry: TestEntry,
  current: boolean,
  sourcePass: RepairSourcePass | undefined,
) {
  if (!current) return;
  const inputs = entry.inputs
    .slice()
    .sort()
    .flatMap((relative) => releaseSourceInputs(root, relative, undefined, sourcePass));
  require(entry.input_binding === sha(JSON.stringify(inputs)), 'new test evidence is not bound to current inputs');
}

function validateTestsFile(
  root: string,
  operation: string,
  state: ReleaseRecord,
  current: boolean = false,
  sourcePass?: RepairSourcePass,
): boolean {
  const testsPath = base(operation) + '/tests.json';
  const testsFile = releasePath(root, testsPath, true);
  if (existsSync(testsFile)) {
    const tests: unknown = JSON.parse(read(root, testsPath).toString('utf8'));
    keys(tests, ['schema', 'operation_id', 'version', 'tests']);
    require(tests.schema === 'VidaLocalReleaseTests/v1' &&
      tests.operation_id === operation &&
      tests.version === state.version &&
      Array.isArray(tests.tests), 'current local test record invalid');
    require(tests.tests.length === 3 &&
      tests.tests.map(testLane).sort().join() ===
        ['release-local', 'retained-behavior', 'static'].join(), 'current local test lanes differ');
    for (const rawEntry of tests.tests) {
      const entry = assertTestEntry(rawEntry);
      assertSuccessfulTestLog(root, entry);
      assertCurrentTestBinding(root, entry, current, sourcePass);
    }
  }
  return existsSync(testsFile);
}

function assertCurrentAssurance(
  assurance: unknown,
  operation: string,
  seal: SourceSeal,
): { sealed_fingerprint: string; reviews: unknown[] } {
  keys(assurance, [
    'schema',
    'operation_id',
    'sealed_fingerprint',
    'scope_path',
    'clear_work_id',
    'repository_id',
    'project_id',
    'reviews',
  ]);
  require(typeof seal.sealed_fingerprint === 'string' &&
    typeof assurance.sealed_fingerprint === 'string' &&
    assurance.schema === 'VidaLocalReleaseAssurance/v1' &&
    assurance.operation_id === operation &&
    assurance.sealed_fingerprint === seal.sealed_fingerprint &&
    Array.isArray(assurance.reviews), 'current assurance record invalid');
  return { sealed_fingerprint: assurance.sealed_fingerprint, reviews: assurance.reviews };
}

function validateAssuranceFile(root: string, operation: string, seal: SourceSeal): boolean {
  const assurancePath = base(operation) + '/assurance.json';
  const assuranceFile = releasePath(root, assurancePath, true);
  if (existsSync(assuranceFile)) {
    const assurance: unknown = JSON.parse(read(root, assurancePath).toString('utf8'));
    const current = assertCurrentAssurance(assurance, operation, seal);
    verifyForwardReviewSet(root, operation, current.sealed_fingerprint, current.reviews, '.agent/release-assurance');
  }
  return existsSync(assuranceFile);
}

function validateJoinFiles(root: string, operation: string, state: ReleaseRecord, seal: SourceSeal) {
  validateTestsFile(root, operation, state);
  validateAssuranceFile(root, operation, seal);
}

function currentSeal(root: string, operation: string, state: ReleaseRecord, sourcePass: RepairSourcePass): SourceSeal {
  const value = object(root, base(operation) + '/source-seal.json');
  assertSealKeys(value);
  const current = releaseSourceBinding(root, true, sourcePass);
  const invalidSeal = 'current source seal binding differs';
  assertSealIdentity(value, operation, state.version, current.source_binding, state.tarball_sha256, invalidSeal);
  assertSealEntries(value, false, invalidSeal);
  assertSealDigests(value, invalidSeal);
  const archive = selectedTarball(
    state.pack_metadata,
    path.dirname(releasePath(root, '.tmp/releases/' + operation + '/' + state.pack_metadata[0].filename)),
    state.version,
  );
  require(sha(readFileSync(archive)) === value.tarball_sha256, 'current source seal archive differs');
  return {
    ...value,
    operation_id: value.operation_id,
    version: value.version,
    source_binding: value.source_binding,
    tarball_sha256: value.tarball_sha256,
    sealed_fingerprint: value.sealed_fingerprint,
    entries: value.entries,
  };
}

function unseal(
  value: unknown,
  schema: string,
  fields: readonly string[],
): JsonRecord & { schema: string; digest: string } {
  keys(value, [...fields, 'digest']);
  const { digest, ...body } = value;
  require(value.schema === schema && digest === sha(json(body)), 'native evidence repair seal differs');
  return { ...value, schema, digest };
}
const planFields = [
  'schema',
  'operation_id',
  'version',
  'actor',
  'release_before',
  'source_before',
  'closure',
  'beforeimages',
];
const stateFields = ['schema', 'operation_id', 'plan_digest', 'phase'];

function parseFileObservation(value: unknown): FileObservation {
  require(isRecord(value), 'native evidence file observation invalid');
  const observedPath = validateFileObservationKeys(value);
  return value.exists
    ? parsePresentFileObservation(value, observedPath)
    : parseAbsentFileObservation(value, observedPath);
}

function validateFileObservationKeys(value: JsonRecord): string {
  const expected = ['path', 'kind', 'exists', 'identity', 'sha256'];
  keys(value, Object.hasOwn(value, 'copy') ? [...expected, 'copy'] : expected);
  const observedPath = releaseRelative(value.path);
  require(value.kind === 'file' && typeof value.exists === 'boolean', 'native evidence file kind invalid');
  return observedPath;
}

function parseAbsentFileObservation(value: JsonRecord, observedPath: string): FileObservation {
  require(value.identity === null &&
    value.sha256 === null &&
    (!Object.hasOwn(value, 'copy') || value.copy === null), 'absent native evidence file has an image');
  return {
    path: observedPath,
    kind: 'file',
    exists: false,
    identity: null,
    sha256: null,
    ...(Object.hasOwn(value, 'copy') ? { copy: null } : {}),
  };
}

function parsePresentFileObservation(value: JsonRecord, observedPath: string): FileObservation {
  const observedIdentity = parseReleaseFileIdentity(value.identity);
  require(typeof value.sha256 === 'string' && /^[a-f0-9]{64}$/.test(value.sha256), 'native evidence file hash invalid');
  const copy = Object.hasOwn(value, 'copy') ? releaseRelative(value.copy) : undefined;
  return {
    path: observedPath,
    kind: 'file',
    exists: true,
    identity: observedIdentity,
    sha256: value.sha256,
    ...(copy === undefined ? {} : { copy }),
  };
}

function parseDirectoryObservation(value: unknown): DirectoryObservation {
  keys(value, ['path', 'kind', 'exists', 'identity', 'members']);
  require(value.kind === 'directory' &&
    value.exists === true &&
    Array.isArray(value.members), 'native evidence directory observation invalid');
  const members = value.members.map((member) => {
    const name = releaseRelative(member);
    require(!name.includes('/'), 'native evidence directory member is not a name');
    return name;
  });
  require(new Set(members).size === members.length, 'native evidence directory members duplicate');
  return {
    path: releaseRelative(value.path),
    kind: 'directory',
    exists: true,
    identity: parseReleaseFileIdentity(value.identity),
    members,
  };
}

function parseDependencyClosure(value: unknown): DependencyClosure {
  keys(value, ['source_binding', 'source_observations', 'files', 'directories']);
  require(typeof value.source_binding === 'string' &&
    /^[a-f0-9]{64}$/.test(value.source_binding), 'native evidence closure Source binding invalid');
  require(Array.isArray(value.source_observations) &&
    Array.isArray(value.files) &&
    Array.isArray(value.directories), 'native evidence closure inventory invalid');
  return {
    source_binding: value.source_binding,
    source_observations: value.source_observations.map(parseReleaseSourceObservation),
    files: value.files.map(parseFileObservation),
    directories: value.directories.map(parseDirectoryObservation),
  };
}

function planFile(op: string): string {
  return repair(op) + '/plan.json';
}

function stateFile(op: string): string {
  return repair(op) + '/state.json';
}

function assertPlanHeader(
  value: unknown,
  operation: string,
): { operation_id: string; version: string; source_before: string; actor: string; digest: string } {
  require(isRecord(value) &&
    typeof value.operation_id === 'string' &&
    typeof value.version === 'string' &&
    typeof value.source_before === 'string' &&
    typeof value.digest === 'string' &&
    value.operation_id === operation &&
    releaseIdPattern.test(operation) &&
    typeof value.actor === 'string' &&
    value.actor.trim() &&
    value.actor.length <= 256, 'native evidence repair plan identity differs');
  return {
    operation_id: value.operation_id,
    version: value.version,
    source_before: value.source_before,
    actor: value.actor,
    digest: value.digest,
  };
}

function assertPresentBeforeimage(item: JsonRecord, operation: string, index: number) {
  require(Array.isArray(item.identity) &&
    item.identity.length === 5 &&
    item.identity.every((part) => typeof part === 'number' && Number.isFinite(part)) &&
    typeof item.copy === 'string' &&
    typeof item.sha256 === 'string' &&
    /^[a-f0-9]{64}$/.test(item.sha256) &&
    item.copy === repair(operation) + '/custody/before-' + index + '.bin', 'native evidence beforeimage differs');
}

function assertBeforeimage(item: unknown, operation: string, index: number) {
  keys(item, ['path', 'kind', 'exists', 'identity', 'sha256', 'copy']);
  require(item.kind === 'file' && typeof item.exists === 'boolean', 'native evidence beforeimage differs');
  if (item.exists) {
    assertPresentBeforeimage(item, operation, index);
    return;
  }
  require(item.identity === null && item.sha256 === null && item.copy === null, 'native evidence beforeimage differs');
}

function assertPlanBeforeimages(plan: JsonRecord, operation: string): FileObservation[] {
  const beforeimages = plan.beforeimages;
  require(Array.isArray(beforeimages) && beforeimages.length === 3, 'native evidence repair plan identity differs');
  require(beforeimages.every(
    (item) => isRecord(item) && typeof item.path === 'string',
  ), 'native evidence repair plan identity differs');
  require(beforeimages.map(observationPath).join() ===
    targets(operation).join(), 'native evidence repair plan identity differs');
  for (const [index, item] of beforeimages.entries()) assertBeforeimage(item, operation, index);
  return beforeimages.map(parseFileObservation);
}

function assertReleaseBeforeimage(value: unknown): JsonRecord {
  require(isRecord(value) && isRecord(value.pending), 'native evidence repair release beforeimage invalid');
  require(Object.keys(value).sort().join() ===
    ['operation_id', 'version', 'status', 'source_binding', 'tarball_sha256', 'pending'].sort().join() &&
    typeof value.operation_id === 'string' &&
    typeof value.version === 'string' &&
    typeof value.status === 'string' &&
    typeof value.source_binding === 'string' &&
    typeof value.tarball_sha256 === 'string', 'native evidence repair release beforeimage invalid');
  require(Object.keys(value.pending).sort().join() === ['operation_id', 'version'].sort().join() &&
    typeof value.pending.operation_id === 'string' &&
    typeof value.pending.version === 'string', 'native evidence repair release beforeimage invalid');
  return value;
}

function loadPlan(root: string, operation: string): RepairPlan {
  const plan = unseal(object(root, planFile(operation)), 'NativeDeliveryEvidenceRepairPlan/v1', planFields);
  const header = assertPlanHeader(plan, operation);
  const beforeimages = assertPlanBeforeimages(plan, operation);
  const releaseBefore = assertReleaseBeforeimage(plan.release_before);
  return {
    ...plan,
    ...header,
    release_before: releaseBefore,
    closure: parseDependencyClosure(plan.closure),
    beforeimages,
  };
}

function assertPhaseIdentity(
  state: JsonRecord,
  operation: string,
  plan: RepairPlan,
): asserts state is JsonRecord & { operation_id: string; plan_digest: string; phase: string } {
  require(typeof state.operation_id === 'string' &&
    typeof state.plan_digest === 'string' &&
    typeof state.phase === 'string' &&
    state.operation_id === operation &&
    state.plan_digest === plan.digest &&
    phaseNames.includes(state.phase), 'native evidence repair phase differs');
}

function phase(root: string, operation: string, plan: RepairPlan): RepairState | null {
  const file = releasePath(root, stateFile(operation), true);
  if (!existsSync(file)) return null;
  const state = unseal(object(root, stateFile(operation)), 'NativeDeliveryEvidenceRepairState/v1', stateFields);
  assertPhaseIdentity(state, operation, plan);
  return {
    ...state,
    operation_id: state.operation_id,
    plan_digest: state.plan_digest,
    phase: state.phase,
    digest: state.digest,
  };
}

async function access(root: string): Promise<Awaited<ReturnType<typeof safeRoot>>> {
  const packageFile = releasePath(root, 'packages/agent/package.json');
  require(realpathSync(packageFile) === packageFile, 'package containment differs');
  return safeRoot(root, { hardlinks: 'reject', symlinks: 'reject', maxBytes: 512 * 1024 * 1024, mode: 0o600 });
}

function reserve(root: string, operation: string) {
  const relative = repair(operation);
  releaseDirectory(root, base(operation));
  mkdirSync(releasePath(root, relative, true), { mode: 0o700 });
}

async function savePhase(
  api: Awaited<ReturnType<typeof safeRoot>>,
  operation: string,
  plan: RepairPlan,
  value: string,
) {
  await api.write(
    stateFile(operation),
    json(
      sealed({
        schema: 'NativeDeliveryEvidenceRepairState/v1',
        operation_id: operation,
        plan_digest: plan.digest,
        phase: value,
      }),
    ),
  );
}

function custodyRows(root: string, operation: string, plan: RepairPlan): JsonRecord {
  const file = repair(operation) + '/custody/seal.json';
  const custody = unseal(object(root, file), 'NativeDeliveryEvidenceRepairCustody/v1', [
    'schema',
    'operation_id',
    'plan_digest',
    'beforeimages',
  ]);
  assertCustodyIdentity(custody, operation, plan);
  for (const value of custody.beforeimages) {
    const before = parseFileObservation(value);
    if (!before.exists) continue;
    assertCustodyBeforeimage(root, before);
  }
  return custody;
}

function assertCustodyIdentity(
  custody: JsonRecord,
  operation: string,
  plan: RepairPlan,
): asserts custody is JsonRecord & { beforeimages: unknown[] } {
  require(typeof custody.operation_id === 'string' &&
    typeof custody.plan_digest === 'string' &&
    custody.operation_id === operation &&
    typeof custody.beforeimages === 'object' &&
    Array.isArray(custody.beforeimages) &&
    custody.plan_digest === plan.digest &&
    json(custody.beforeimages) === json(plan.beforeimages), 'native evidence custody differs');
}

function assertCustodyBeforeimage(root: string, before: FileObservation) {
  require(typeof before.copy === 'string', 'native evidence custody path missing');
  const current = fileObservation(root, before.copy);
  require(current.exists && current.sha256 === before.sha256, 'native evidence beforeimage custody changed');
}

function currentTarget(root: string, entry: FileObservation): FileObservation {
  return fileObservation(root, entry.path);
}

function validateContinuity(
  root: string,
  operation: string,
  plan: RepairPlan,
  state: RepairState,
  allowTargetOutputs: boolean = false,
  sourcePass?: RepairSourcePass,
) {
  const eligibleRelease = eligible(root, operation);
  const original = eligibleRelease.state;
  const { pending } = eligibleRelease;
  const { pending: frozenPending, ...releaseBefore } = plan.release_before;
  require(json({
    operation_id: original.operation_id,
    version: original.version,
    status: original.status,
    source_binding: original.source_binding,
    tarball_sha256: original.tarball_sha256,
  }) === json(releaseBefore), 'release identity changed');
  require(json({ operation_id: pending.operation_id, version: pending.version }) ===
    json(frozenPending), 'pending identity changed');
  require(sourcePass, 'repair Source pass missing');
  sameClosure(root, plan.closure, operation, sourcePass);
  custodyRows(root, operation, plan);
  if (state.phase === 'complete') {
    if (!allowTargetOutputs)
      for (const entry of plan.beforeimages)
        require(!currentTarget(root, entry).exists, 'completed repair target reappeared');
    return;
  }
  for (const entry of plan.beforeimages) {
    const current = currentTarget(root, entry),
      at = plan.beforeimages.indexOf(entry);
    const order = [
      'tests_pending',
      'tests_removed',
      'source_seal_pending',
      'source_seal_removed',
      'assurance_pending',
      'assurance_removed',
      'complete',
    ].indexOf(state.phase);
    const pendingIndex = [0, 2, 4].includes(order) ? [0, 2, 4].indexOf(order) : -1;
    if (entry.exists && order >= 0 && at < Math.floor((order + 1) / 2)) {
      require(!current.exists, 'removed evidence unexpectedly returned');
    } else if (entry.exists && pendingIndex === at) {
      require(!current.exists ||
        current.sha256 === entry.sha256, 'in-progress evidence is neither beforeimage nor absent postimage');
    } else
      require(json(current) ===
        json({
          path: entry.path,
          kind: entry.kind,
          exists: entry.exists,
          identity: entry.identity,
          sha256: entry.sha256,
        }), 'unstarted evidence beforeimage changed');
  }
}

function validateCompletedReset(
  root: string,
  operation: string,
  plan: RepairPlan,
  state: RepairState,
  sourcePass: RepairSourcePass,
) {
  const eligibleRelease = eligible(root, operation);
  const original = eligibleRelease.state;
  const { pending } = eligibleRelease;
  const { pending: frozenPending, ...releaseBefore } = plan.release_before;
  require(state.phase === 'complete' &&
    json({
      operation_id: original.operation_id,
      version: original.version,
      status: original.status,
      source_binding: original.source_binding,
      tarball_sha256: original.tarball_sha256,
    }) === json(releaseBefore) &&
    json({ operation_id: pending.operation_id, version: pending.version }) ===
      json(frozenPending), 'completed repair release identity changed');
  custodyRows(root, operation, plan);
  const tests = validateTestsFile(root, operation, original, true, sourcePass);
  const sealPath = releasePath(root, base(operation) + '/source-seal.json', true);
  const assurancePath = releasePath(root, base(operation) + '/assurance.json', true);
  let seal: SourceSeal | undefined;
  if (existsSync(sealPath)) seal = currentSeal(root, operation, original, sourcePass);
  if (existsSync(assurancePath)) {
    require(seal && tests, 'new assurance requires current test evidence and source seal');
    validateAssuranceFile(root, operation, seal);
  }
}

function eligibleForPlan(
  root: string,
  operation: string,
  sourcePass: RepairSourcePass,
): { state: ReleaseRecord; pending: ReleaseState; seal: SourceSeal } {
  const eligibleRelease = eligible(root, operation);
  const state = eligibleRelease.state;
  const { pending } = eligibleRelease;
  const seal = validateSeal(root, operation, state, sourcePass);
  validateJoinFiles(root, operation, state, seal);
  return { state, pending, seal };
}

function inspectStoredRepair(root: string, operation: string, sourcePass: RepairSourcePass): JsonRecord {
  const plan = loadPlan(root, operation),
    state = phase(root, operation, plan);
  require(state, 'repair phase missing; UNKNOWN');
  if (state.phase === 'complete') validateCompletedReset(root, operation, plan, state, sourcePass);
  else validateContinuity(root, operation, plan, state, true, sourcePass);
  return {
    status: state.phase === 'complete' ? 'awaiting_new_qualification' : state.phase,
    operation_id: operation,
    version: plan.version,
    gaps: [
      'fresh current local tests, source seal, CI/CD results and three reviews with reverse validation and current CLEAR remain required',
    ],
    qualified: false,
  };
}

export async function inspectNativeDeliveryEvidenceRepair({
  root,
  operation,
}: {
  root: string;
  operation: string;
}): Promise<JsonRecord> {
  try {
    const sourcePass = createRepairSourcePass();
    if (existsSync(releasePath(root, planFile(operation), true)))
      return inspectStoredRepair(root, operation, sourcePass);
    const { state, seal } = eligibleForPlan(root, operation, sourcePass);
    closure(root, operation, seal, sourcePass, state);
    return {
      status: 'stale_qualification_repairable',
      operation_id: operation,
      version: state.version,
      qualified: false,
    };
  } catch (error) {
    return {
      status: 'blocked',
      operation_id: operation,
      blockers: [error instanceof Error ? error.message : String(error)],
      qualified: false,
    };
  }
}

async function finishPlan(
  root: string,
  operation: string,
  plan: RepairPlan,
  options: { onPhase?: ((phase: string) => unknown) | undefined } = {},
): Promise<JsonRecord> {
  const api = await access(root),
    custodyDir = repair(operation) + '/custody',
    entries = plan.beforeimages;
  return withReleaseRepairLocks(root, operation, async () => {
    const state = phase(root, operation, plan);
    require(state?.phase === 'planning', 'planning phase differs');
    require(!existsSync(releasePath(root, custodyDir, true)), 'partial custody is UNKNOWN; no reconstruction');
    const sourcePass = createRepairSourcePass();
    eligibleForPlan(root, operation, sourcePass);
    require(sourcePass, 'repair Source pass missing');
    sameClosure(root, plan.closure, operation, sourcePass);
    await options.onPhase?.('planning');
    mkdirSync(releasePath(root, custodyDir, true), { mode: 0o700 });
    for (let index = 0; index < entries.length; index++) {
      const entry = entries[index];
      require(entry, 'repair beforeimage missing');
      if (entry.exists)
        await api.create(custodyDir + '/before-' + index + '.bin', read(root, entry.path, 512 * 1024 * 1024));
    }
    await api.create(
      custodyDir + '/seal.json',
      json(
        sealed({
          schema: 'NativeDeliveryEvidenceRepairCustody/v1',
          operation_id: operation,
          plan_digest: plan.digest,
          beforeimages: entries,
        }),
      ),
    );
    custodyRows(root, operation, plan);
    await savePhase(api, operation, plan, 'custody');
    await options.onPhase?.('custody');
    return { status: 'planned', operation_id: operation, version: plan.version, qualified: false };
  });
}

export async function planNativeDeliveryEvidenceRepair(
  { root, operation, actor }: { root: string; operation: string; actor: unknown },
  options: { onPhase?: ((phase: string) => unknown) | undefined } = {},
): Promise<JsonRecord> {
  require(typeof actor === 'string' && actor.trim() && actor.length <= 256, 'repair actor missing');
  const existing = releasePath(root, planFile(operation), true);
  if (existsSync(existing)) {
    const plan = loadPlan(root, operation);
    require(plan.actor === actor, 'repair attribution differs');
    const state = phase(root, operation, plan);
    require(state && ['planning', 'custody'].includes(state.phase), 'partial repair namespace is UNKNOWN');
    return state.phase === 'custody'
      ? { status: 'planned', operation_id: operation, version: plan.version, qualified: false }
      : finishPlan(root, operation, plan, options);
  }
  const sourcePass = createRepairSourcePass(),
    { state, pending, seal } = eligibleForPlan(root, operation, sourcePass),
    beforeimages = targets(operation).map((file, index) => {
      const observed = fileObservation(root, file);
      return { ...observed, copy: observed.exists ? repair(operation) + '/custody/before-' + index + '.bin' : null };
    }),
    frozen = closure(root, operation, seal, sourcePass, state);
  const plan = sealed({
    schema: 'NativeDeliveryEvidenceRepairPlan/v1',
    operation_id: operation,
    version: state.version,
    actor,
    release_before: {
      operation_id: state.operation_id,
      version: state.version,
      status: state.status,
      source_binding: state.source_binding,
      tarball_sha256: state.tarball_sha256,
      pending: { operation_id: pending.operation_id, version: pending.version },
    },
    source_before: frozen.source_binding,
    closure: frozen,
    beforeimages,
  });
  const api = await access(root);
  await withReleaseRepairLocks(root, operation, async () => {
    const sourcePass = createRepairSourcePass();
    eligibleForPlan(root, operation, sourcePass);
    sameClosure(root, frozen, operation, sourcePass);
    require(!existsSync(releasePath(root, repair(operation), true)), 'partial or foreign repair namespace is UNKNOWN');
    reserve(root, operation);
    await api.create(planFile(operation), json(plan));
    await savePhase(api, operation, plan, 'planning');
  });
  return finishPlan(root, operation, plan, options);
}

async function apply(
  root: string,
  operation: string,
  options: { onPhase?: ((phase: string) => unknown) | undefined } = {},
): Promise<JsonRecord> {
  const plan = loadPlan(root, operation),
    initial = phase(root, operation, plan);
  require(initial, 'repair phase missing; UNKNOWN');
  custodyRows(root, operation, plan);
  const api = await access(root);
  return withReleaseRepairLocks(root, operation, async () => {
    const current = phase(root, operation, plan);
    require(current, 'repair phase missing; UNKNOWN');
    if (current.phase === 'complete') {
      validateCompletedReset(root, operation, plan, current, createRepairSourcePass());
      return {
        status: 'awaiting_new_qualification',
        operation_id: operation,
        version: plan.version,
        gaps: [
          'fresh current local tests, source seal, CI/CD results and three reviews with reverse validation and current CLEAR remain required',
        ],
        qualified: false,
      };
    }
    validateContinuity(root, operation, plan, current, false, createRepairSourcePass());
    const sequence = [
      { pending: 'tests_pending', done: 'tests_removed', index: 0, label: 'tests' },
      { pending: 'source_seal_pending', done: 'source_seal_removed', index: 1, label: 'source_seal' },
      { pending: 'assurance_pending', done: 'assurance_removed', index: 2, label: 'assurance' },
    ];
    let phaseValue = current.phase;
    for (const item of sequence) {
      if (phaseNames.indexOf(phaseValue) > phaseNames.indexOf(item.done)) continue;
      const before = plan.beforeimages[item.index];
      require(before, 'repair beforeimage missing');
      const observed = currentTarget(root, before);
      require(!before.exists ||
        !observed.exists ||
        observed.sha256 === before.sha256, 'evidence is neither exact beforeimage nor absent postimage');
      if (phaseValue !== item.pending && phaseValue !== item.done) {
        require(phaseValue === 'custody' ||
          phaseValue === 'tests_removed' ||
          phaseValue === 'source_seal_removed', 'repair phase ordering differs');
        await savePhase(api, operation, plan, item.pending);
        phaseValue = item.pending;
      }
      await options.onPhase?.(item.pending);
      if (before.exists && observed.exists) await api.remove(before.path);
      await options.onPhase?.(item.label + '_effect');
      require(!currentTarget(root, before).exists, 'evidence removal postcondition differs');
      await savePhase(api, operation, plan, item.done);
      phaseValue = item.done;
      await options.onPhase?.(item.done);
    }
    sameClosure(root, plan.closure, operation, createRepairSourcePass());
    for (const item of plan.beforeimages)
      require(!currentTarget(root, item).exists, 'derived qualification join remains');
    await savePhase(api, operation, plan, 'complete');
    await options.onPhase?.('complete');
    return {
      status: 'awaiting_new_qualification',
      operation_id: operation,
      version: plan.version,
      gaps: [
        'fresh current local tests, source seal, CI/CD results and three reviews with reverse validation and current CLEAR remain required',
      ],
      qualified: false,
    };
  });
}

export async function applyNativeDeliveryEvidenceRepair(
  { root, operation }: { root: string; operation: string },
  options: { onPhase?: ((phase: string) => unknown) | undefined } = {},
): Promise<JsonRecord> {
  return apply(root, operation, options);
}

export function assertNativeDeliveryEvidenceRepairSettled(root: string, operation: string) {
  const dir = releasePath(root, repair(operation), true);
  if (!existsSync(dir)) return;
  const planPath = releasePath(root, planFile(operation), true);
  require(existsSync(planPath), 'native evidence repair namespace is incomplete; UNKNOWN');
  const plan = loadPlan(root, operation),
    state = phase(root, operation, plan);
  require(state?.phase === 'complete', 'native evidence repair active or UNKNOWN');
  validateCompletedReset(root, operation, plan, state, createRepairSourcePass());
}

function parseRepairArguments(args: readonly string[]): Record<string, string> {
  const values: Record<string, string> = {};
  const allowedOptions = reconcileAllowedOptions('native-delivery-evidence');
  require(args.length % 2 === 0, 'native evidence repair argument pairs differ');
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    require(typeof key === 'string' &&
      typeof value === 'string' &&
      allowedOptions.includes(key) &&
      !Object.hasOwn(values, key), 'native evidence repair arguments invalid');
    values[key] = value;
  }
  return values;
}

function nativeEvidenceCommand(values: Record<string, string>): {
  root: string;
  operation: string;
  mode: string;
  actor: string | undefined;
} {
  assertReconcileOptionKeys(
    values,
    'native-delivery-evidence',
    values['--mode'],
    'native evidence repair arguments differ from declaration',
  );
  const root = values['--project-root'];
  const operation = values['--operation'];
  const mode = values['--mode'];
  const contract = reconcileCliContracts['native-delivery-evidence'];
  require(contract, 'native evidence repair command declaration missing');
  require(values['--kind'] === 'native-delivery-evidence' &&
    typeof root === 'string' &&
    typeof operation === 'string' &&
    typeof mode === 'string' &&
    path.isAbsolute(root) &&
    releaseIdPattern.test(operation) &&
    contract.modes.includes(mode), 'native evidence repair operation arguments invalid');
  return { root, operation, mode, actor: values['--actor'] };
}

export async function runNativeDeliveryEvidenceRepair(
  args: readonly string[],
  options: { onPhase?: ((phase: string) => unknown) | undefined },
): Promise<JsonRecord> {
  const { root, operation, mode, actor } = nativeEvidenceCommand(parseRepairArguments(args));
  const input = { root, operation, actor };
  if (mode === 'inspect') {
    require(!input.actor, 'inspect accepts no actor');
    return inspectNativeDeliveryEvidenceRepair(input);
  }
  if (mode === 'plan') return planNativeDeliveryEvidenceRepair(input, options);
  require(!input.actor, 'apply/resume use frozen attribution');
  return applyNativeDeliveryEvidenceRepair(input, options);
}
