import { createHash } from 'node:crypto';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import type { ValidateFunction } from 'ajv';
import schema from '../schemas/consumer-clean-initialization-operation.v1.schema.json' with { type: 'json' };
import { canonicalJsonImageWithNodeLimit } from '../src/contracts/canonical-json-core.js';
import { freezeJsonValue } from '../src/contracts/public-ingress.js';
import { projectMappings } from './project-mapping-contract.ts';
import { captureInitializationRuntimeBinding } from './init-core.ts';
import { captureCleanSourceDirectoryInventory, parseConsumerProjectMoves } from './consumer-project-relocation.ts';
import { repositoryReadOnlyObservation, requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { CONSUMER_CLEAN_INITIALIZATION_PENDING_PATH } from '../src/config/project-paths.ts';
import { canonicalRepositoryRoot, deriveWorkspaceId } from '../src/workspace-identity.ts';

type EffectState = 'not-started' | 'issued' | 'completed';
type CleanInventoryEntry =
  | {
      readonly type: 'file';
      readonly path: string;
      readonly identity: string;
      readonly size: number;
      readonly sha256: string;
    }
  | {
      readonly type: 'directory';
      readonly path: string;
      readonly identity: string;
      readonly children: readonly string[];
    };
interface CleanMove {
  readonly kind: 'archive' | 'project';
  readonly source: string;
  readonly target: string;
  readonly source_identity: string;
  readonly type: 'file' | 'directory';
  readonly state: EffectState;
}
interface CleanContainer {
  readonly path: string;
  readonly state: EffectState;
  readonly identity: string | null;
}
interface CleanPreparedInitialization {
  readonly intent: string;
  readonly rootIdentity: string;
  readonly bundleIdentity: string;
  readonly projectIdentities: readonly string[];
  readonly resourceDigest: string;
}
export interface ConsumerCleanInitializationOperation {
  readonly schema: 'ConsumerCleanInitializationOperation/v1';
  readonly version: 1;
  readonly operation_id: string;
  readonly root: string;
  readonly root_identity: string;
  readonly workspace_id: string;
  readonly request: {
    readonly projectRoot: string;
    readonly repository: string;
    readonly projectMappings: readonly string[];
    readonly reconcileExisting?: false;
  };
  readonly runtime: { readonly version: string; readonly bundle_identity: string; readonly resource_digest: string };
  readonly archive_root: string;
  readonly inventory: readonly CleanInventoryEntry[];
  readonly moves: readonly CleanMove[];
  readonly containers: readonly CleanContainer[];
  readonly phase: 'intent' | 'archiving' | 'archive_complete' | 'initializing' | 'complete';
  readonly prepared: CleanPreparedInitialization | null;
  readonly initialization: EffectState;
  readonly binding: string;
}

type AjvConstructor = new (options: Record<string, unknown>) => { compile<T>(schema: object): ValidateFunction<T> };
const Constructor = Ajv2020 as unknown as AjvConstructor;
const validateShape = new Constructor({
  strict: true,
  allErrors: false,
  ownProperties: true,
}).compile<ConsumerCleanInitializationOperation>(schema);
const MAX_BYTES = 8 * 1024 * 1024;
// Closed inventory, moves, containers, mappings, and prepared IDs plus directory child closure.
const MAX_NODES = 32 * 10000 + 1024;
const decoder = new TextDecoder('utf-8', { fatal: true });
const outputs = new Map<string, 'file' | 'directory'>([
  ['AGENTS.md', 'file'],
  ['AGENT.sidecar.md', 'file'],
  ['agent-runtime.config.v1.yaml', 'file'],
  ['docs/agent-instructions/documentation-policy.v1.json', 'file'],
  ['.agent/work', 'directory'],
]);
function fail(message: string): never {
  throw new Error('Invalid clean initialization journal: ' + message);
}
const capture = (value: unknown) => canonicalJsonImageWithNodeLimit(value, 0, MAX_NODES);
const folded = (value: string) => value.toLowerCase();
const contains = (parent: string, child: string) => child === parent || child.startsWith(parent + '/');
const overlap = (a: string, b: string) => contains(a, b) || contains(b, a);

function hasControlCharacters(value: string): boolean {
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code < 32 || code === 127) return true;
  }
  return false;
}

function safePath(value: string): void {
  if (
    !value ||
    value.length > 4096 ||
    value.includes('\\') ||
    value.includes(':') ||
    hasControlCharacters(value) ||
    value.split('/').some((part) => !part || part === '.' || part === '..')
  )
    fail('unsafe relative path');
}
function lexicalRoot(root: string): void {
  const windows = path.win32.isAbsolute(root) && path.win32.normalize(root) === root;
  const posix = path.posix.isAbsolute(root) && path.posix.normalize(root) === root;
  if ((!windows && !posix) || hasControlCharacters(root)) fail('root is not absolute and normalized');
}
function uniquePaths(paths: readonly string[], disjoint: boolean): void {
  const seen = new Set<string>();
  for (const item of paths) {
    safePath(item);
    const key = folded(item);
    if (seen.has(key)) fail('duplicate paths');
    seen.add(key);
  }
  if (disjoint) {
    for (const item of seen) {
      let parent = item;
      while (parent.includes('/')) {
        parent = parent.slice(0, parent.lastIndexOf('/'));
        if (seen.has(parent)) fail('overlapping paths');
      }
    }
  }
}
function consistentPathCase(paths: readonly string[]): void {
  const spellings = new Map<string, string>();
  for (const item of paths) {
    let prefix = '';
    for (const part of item.split('/')) {
      prefix = prefix ? `${prefix}/${part}` : part;
      const key = folded(prefix);
      const previous = spellings.get(key);
      if (previous !== undefined && previous !== prefix) fail('path case collision');
      spellings.set(key, prefix);
    }
  }
}
function ordered(paths: readonly string[]): void {
  if (paths.some((entry, index) => index > 0 && paths[index - 1]! >= entry)) fail('path order');
}
function plan(record: ConsumerCleanInitializationOperation): unknown {
  return {
    schema: record.schema,
    version: record.version,
    operation_id: record.operation_id,
    root: record.root,
    root_identity: record.root_identity,
    workspace_id: record.workspace_id,
    request: record.request,
    runtime: record.runtime,
    archive_root: record.archive_root,
    inventory: record.inventory,
    moves: record.moves.map(({ state: _state, ...move }) => move),
    containers: record.containers.map(({ path: containerPath }) => containerPath),
  };
}
function planBinding(record: ConsumerCleanInitializationOperation): string {
  return createHash('sha256')
    .update(capture(plan(record)).json, 'utf8')
    .digest('hex');
}
function checkSemantics(record: ConsumerCleanInitializationOperation): void {
  lexicalRoot(record.root);
  if (record.root !== record.request.projectRoot || !/^[a-z0-9][a-z0-9-]{0,63}$/u.test(record.request.repository))
    fail('request identity');
  const mappings = projectMappings(record.request.projectMappings);
  const archiveRoot = `.agent/clean-initialization-history/${record.operation_id}/payload`;
  if (record.archive_root !== archiveRoot) fail('archive root');
  uniquePaths(
    record.moves.map((move) => move.source),
    true,
  );
  uniquePaths(
    record.moves.map((move) => move.target),
    true,
  );
  uniquePaths(
    record.inventory.map((entry) => entry.path),
    false,
  );
  uniquePaths(
    record.containers.map((entry) => entry.path),
    false,
  );
  uniquePaths(
    record.moves.flatMap((move) => [move.source, move.target]),
    true,
  );
  consistentPathCase([
    record.archive_root,
    ...record.moves.flatMap((move) => [move.source, move.target]),
    ...record.inventory.map((entry) => entry.path),
    ...record.containers.map((entry) => entry.path),
  ]);
  ordered(record.moves.map((move) => move.source));
  ordered(record.containers.map((entry) => entry.path));
  for (const move of record.moves) {
    if (move.kind === 'archive') {
      if (outputs.get(move.source) !== move.type || move.target !== `${archiveRoot}/${move.source}`)
        fail('archive move');
    } else {
      const protectedPath = (value: string) =>
        ['.agent', '.vida', '.git', '.tmp'].some((part) => overlap(folded(value), part));
      if (
        move.type !== 'directory' ||
        protectedPath(move.source) ||
        protectedPath(move.target) ||
        mappings.filter((mapping) => mapping.root === move.target).length !== 1
      )
        fail('project move');
    }
    const root = record.inventory.find((entry) => entry.path === move.source);
    if (!root || root.type !== move.type || root.identity !== move.source_identity) fail('move inventory root');
  }
  const entries = new Map(record.inventory.map((entry) => [entry.path, entry]));
  const moveRoots = new Map(record.moves.map((move) => [move.source, move]));
  const directChildren = new Map<string, string[]>();
  for (const entry of record.inventory) {
    const separator = entry.path.lastIndexOf('/');
    if (separator >= 0) {
      const parent = entry.path.slice(0, separator);
      const children = directChildren.get(parent) ?? [];
      children.push(entry.path.slice(separator + 1));
      directChildren.set(parent, children);
    }
  }
  let bytes = 0;
  for (const entry of record.inventory) {
    let candidate = entry.path;
    let owner = moveRoots.get(candidate);
    while (!owner && candidate.includes('/')) {
      candidate = candidate.slice(0, candidate.lastIndexOf('/'));
      owner = moveRoots.get(candidate);
    }
    if (!owner || (owner.type === 'file' && entry.path !== owner.source)) fail('inventory ownership');
    if (entry.type === 'file') {
      if (!Number.isSafeInteger(entry.size)) fail('unsafe size');
      bytes += entry.size;
      if (!Number.isSafeInteger(bytes) || bytes > 512 * 1024 * 1024) fail('aggregate size');
    }
    if (entry.path !== owner.source) {
      const parent = entry.path.slice(0, entry.path.lastIndexOf('/'));
      if (entries.get(parent)?.type !== 'directory') fail('missing inventory parent');
    }
    if (entry.type === 'directory') {
      const children = entry.children;
      for (const child of children) {
        safePath(child);
        if (child.includes('/')) fail('child is not a direct name');
      }
      uniquePaths(children, false);
      const actual = (directChildren.get(entry.path) ?? []).sort();
      if (children.length !== actual.length || children.some((child, index) => child !== actual[index]))
        fail('directory closure or order');
    }
  }
  ordered(record.inventory.map((entry) => entry.path));
  for (const container of record.containers) {
    if (
      ![archiveRoot, ...record.moves.map((move) => move.target)].some(
        (target) => contains(container.path, target) && container.path !== target,
      )
    )
      fail('container is not a target ancestor');
    if (
      (container.state === 'completed' && container.identity === null) ||
      (container.state === 'not-started' && container.identity !== null)
    )
      fail('container identity');
  }
  const allDone = [...record.moves, ...record.containers].every((effect) => effect.state === 'completed');
  if (
    record.phase === 'intent' &&
    [...record.moves, ...record.containers].some((effect) => effect.state !== 'not-started')
  )
    fail('intent effects');
  if (['archive_complete', 'initializing', 'complete'].includes(record.phase) && !allDone) fail('incomplete archive');
  if (
    ['intent', 'archiving', 'archive_complete'].includes(record.phase) &&
    (record.prepared !== null || record.initialization !== 'not-started')
  )
    fail('early initialization');
  if (record.initialization !== 'not-started' && record.prepared === null) fail('missing prepared initialization');
  if (record.phase === 'complete' && (record.prepared === null || record.initialization !== 'completed'))
    fail('incomplete initialization');
  if (
    record.prepared &&
    (record.prepared.rootIdentity !== record.root_identity ||
      record.prepared.bundleIdentity !== record.runtime.bundle_identity ||
      record.prepared.resourceDigest !== record.runtime.resource_digest ||
      record.prepared.projectIdentities.length !== mappings.length)
  )
    fail('prepared facts differ');
}

/** Data validity only; does not establish physical identity, authority, or effect completion. */
export function validateCleanInitializationOperation(value: unknown): ConsumerCleanInitializationOperation {
  const { image, json } = capture(value);
  if (Buffer.byteLength(json, 'utf8') > MAX_BYTES || !validateShape(image)) fail('shape or serialized size');
  checkSemantics(image);
  if (planBinding(image) !== image.binding) fail('binding');
  return freezeJsonValue(image);
}

/** Capture the caller before inspecting it; compute only the immutable-plan binding. */
export function sealCleanInitializationOperation(value: unknown): ConsumerCleanInitializationOperation {
  const { image } = capture(value);
  if (image === null || typeof image !== 'object' || Array.isArray(image) || Object.hasOwn(image, 'binding'))
    fail('draft shape');
  const candidate = { ...image, binding: '0'.repeat(64) };
  if (!validateShape(candidate)) fail('draft shape');
  checkSemantics(candidate);
  return validateCleanInitializationOperation({ ...candidate, binding: planBinding(candidate) });
}

/** The pending-byte hash and authority to act are separate concerns owned by the caller. */
export function decodeCleanInitializationOperation(bytes: Uint8Array): ConsumerCleanInitializationOperation {
  if (bytes.byteLength > MAX_BYTES) fail('serialized size');
  return validateCleanInitializationOperation(JSON.parse(decoder.decode(bytes)) as unknown);
}

/** Observe candidate facts only. Publication, admission, custody, and host quiescence belong to apply. */
export async function captureCleanInitializationPlan(
  inputRequest: {
    readonly projectRoot: string;
    readonly repository: string;
    readonly projectMappings: readonly string[];
    readonly reconcileExisting?: false;
  },
  inputOptions: { readonly operationId: string; readonly projectMoves?: readonly string[] },
): Promise<ConsumerCleanInitializationOperation> {
  const image = capture({ request: inputRequest, options: inputOptions }).image as {
    request: typeof inputRequest;
    options: typeof inputOptions;
  };
  const request = image.request;
  const options = image.options;
  if (
    !request ||
    typeof request !== 'object' ||
    Array.isArray(request) ||
    Object.keys(request).some(
      (key) => !['projectRoot', 'repository', 'projectMappings', 'reconcileExisting'].includes(key),
    ) ||
    typeof request.projectRoot !== 'string' ||
    typeof request.repository !== 'string' ||
    (request.reconcileExisting !== undefined && request.reconcileExisting !== false) ||
    !options ||
    typeof options !== 'object' ||
    Array.isArray(options) ||
    Object.keys(options).some((key) => !['operationId', 'projectMoves'].includes(key)) ||
    typeof options.operationId !== 'string' ||
    hasControlCharacters(options.operationId) ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(options.operationId) ||
    (options.projectMoves !== undefined &&
      (!Array.isArray(options.projectMoves) || options.projectMoves.some((item) => typeof item !== 'string')))
  )
    fail('invalid plan request');
  const mappings = projectMappings(request.projectMappings);
  const root = canonicalRepositoryRoot(request.projectRoot);
  const workspace = deriveWorkspaceId(request.repository, root);
  const runtime = captureInitializationRuntimeBinding();
  const access = requireSafeRepositoryAccess(root);
  const view = repositoryReadOnlyObservation(access);
  const identify = view.observeFileIdentity;
  const observe = view.observeLargeFile;
  if (access.provider !== 'fs-safe-windows' || !identify || !observe)
    fail('Windows verified file observation is unavailable');
  const rootIdentity = access.directoryIdentity('.', 'clean plan root');
  const agentIdentity = access.directoryIdentity('.agent', 'existing agent directory');

  // Directory listings establish absence for either files or directories without creating parents.
  const exists = (relative: string): boolean => {
    safePath(relative);
    let parent = '.';
    const parts = relative.split('/');
    for (let index = 0; index < parts.length; index++) {
      const part = parts[index]!;
      const names = view.listFiles(parent, 'clean plan path parent');
      const matches = names.filter((name) => folded(name) === folded(part));
      if (matches.length > 1 || (matches.length === 1 && matches[0] !== part)) fail('path case collision');
      if (!matches.length) return false;
      parent = parent === '.' ? part : `${parent}/${part}`;
      if (index < parts.length - 1) access.directoryIdentity(parent, 'clean plan path parent');
    }
    return true;
  };
  const operationRoot = `.agent/clean-initialization-history/${options.operationId}`;
  const archiveRoot = `${operationRoot}/payload`;
  const pending = [CONSUMER_CLEAN_INITIALIZATION_PENDING_PATH, '.agent/runtime-initialization.pending.v1.json'];
  const absent = (relative: string) => {
    if (exists(relative)) fail('occupied plan path: ' + relative);
  };
  for (const item of [...pending, operationRoot]) absent(item);
  const oldRoots = new Map<string, string>();
  for (const text of options.projectMoves ?? []) {
    if (typeof text !== 'string') fail('invalid explicit project move');
    const match = /^([^=]+)=([^:]+):([^:]+)$/u.exec(text);
    if (!match || oldRoots.has(match[1]!)) fail('invalid explicit project move');
    oldRoots.set(match[1]!, match[2]!);
  }
  const projectMoves = parseConsumerProjectMoves(options.projectMoves, oldRoots, mappings);
  const targetIdentities = new Map<string, string>();
  for (const mapping of mappings) {
    if (projectMoves.some((move) => move.id === mapping.id)) continue;
    targetIdentities.set(mapping.root, access.directoryIdentity(mapping.root, 'existing project root'));
  }
  for (const move of projectMoves) absent(move.newRoot);

  const inventory: CleanInventoryEntry[] = [];
  const moves: CleanMove[] = [];
  const directorySnapshots: {
    source: string;
    snapshot: Awaited<ReturnType<typeof captureCleanSourceDirectoryInventory>>;
    allowance: { maxEntries: number; maxBytes: number };
  }[] = [];
  const fileSnapshots: {
    source: string;
    observed: Awaited<ReturnType<NonNullable<typeof view.observeLargeFile>>>;
  }[] = [];
  let remainingEntries = 10000;
  let remainingBytes = 512 * 1024 * 1024;
  const reserve = (entries: number, bytes: number) => {
    if (
      !Number.isSafeInteger(entries) ||
      entries < 0 ||
      entries > remainingEntries ||
      !Number.isSafeInteger(bytes) ||
      bytes < 0 ||
      bytes > remainingBytes
    )
      fail('aggregate inventory limit');
    remainingEntries -= entries;
    remainingBytes -= bytes;
  };
  const requireEntry = () => {
    if (remainingEntries === 0) fail('aggregate inventory limit');
  };
  const observeFile = async (source: string) => {
    const identity = identify(source, 'clean plan file');
    const result = await observe(source, 'clean plan file');
    if (result.identity !== identity || identify(source, 'clean plan file') !== identity) fail('file identity changed');
    return result;
  };
  const addDirectory = async (source: string, target: string, kind: 'archive' | 'project') => {
    requireEntry();
    const allowance = { maxEntries: remainingEntries, maxBytes: remainingBytes };
    const snapshot = await captureCleanSourceDirectoryInventory(root, source, allowance);
    if (snapshot.rootIdentity !== rootIdentity) fail('repository identity changed');
    reserve(snapshot.entryCount, snapshot.totalBytes);
    directorySnapshots.push({ source, snapshot, allowance });
    for (const directory of snapshot.directories)
      inventory.push({
        type: 'directory',
        path: directory.path,
        identity: directory.identity,
        children: directory.entries,
      });
    for (const file of snapshot.files)
      inventory.push({
        type: 'file',
        path: file.source,
        identity: file.identity,
        size: file.size,
        sha256: file.sha256,
      });
    moves.push({
      kind,
      source,
      target,
      source_identity: snapshot.sourceIdentity,
      type: 'directory',
      state: 'not-started',
    });
  };
  const present = new Map<string, boolean>();
  for (const [source, type] of outputs) {
    const found = exists(source);
    present.set(source, found);
    if (!found) continue;
    const target = `${archiveRoot}/${source}`;
    if (type === 'directory') await addDirectory(source, target, 'archive');
    else {
      requireEntry();
      const observed = await observeFile(source);
      reserve(1, observed.size);
      fileSnapshots.push({ source, observed });
      inventory.push({
        type: 'file',
        path: source,
        identity: observed.identity,
        size: observed.size,
        sha256: observed.sha256,
      });
      moves.push({
        kind: 'archive',
        source,
        target,
        source_identity: observed.identity,
        type: 'file',
        state: 'not-started',
      });
    }
  }
  for (const move of projectMoves) await addDirectory(move.oldRoot, move.newRoot, 'project');
  const containers = new Set<string>();
  for (const move of moves) {
    const parts = move.target.split('/');
    for (let count = 1; count < parts.length; count++) {
      const ancestor = parts.slice(0, count).join('/');
      if (ancestor !== '.agent') containers.add(ancestor);
    }
  }
  const sortPaths = <T>(items: T[], key: (item: T) => string) =>
    items.sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));
  const result = sealCleanInitializationOperation({
    schema: 'ConsumerCleanInitializationOperation/v1',
    version: 1,
    operation_id: options.operationId,
    root,
    root_identity: rootIdentity,
    workspace_id: workspace,
    request: { ...request, projectRoot: root },
    runtime,
    archive_root: archiveRoot,
    inventory: sortPaths(inventory, (entry) => entry.path),
    moves: sortPaths(moves, (entry) => entry.source),
    containers: [...containers]
      .sort()
      .map((containerPath) => ({ path: containerPath, state: 'not-started', identity: null })),
    phase: 'intent',
    prepared: null,
    initialization: 'not-started',
  });
  for (const [target, identity] of targetIdentities)
    if (access.directoryIdentity(target, 'existing project root') !== identity) fail('project root changed');
  for (const { source, observed } of fileSnapshots)
    if (capture(await observeFile(source)).json !== capture(observed).json) fail('archive file changed');
  for (const { source, snapshot, allowance } of directorySnapshots)
    if (capture(await captureCleanSourceDirectoryInventory(root, source, allowance)).json !== capture(snapshot).json)
      fail('source inventory changed');
  for (const item of [...pending, operationRoot, ...projectMoves.map((move) => move.newRoot)]) absent(item);
  for (const [source, wasPresent] of present)
    if (exists(source) !== wasPresent) fail('archive source presence changed');
  if (
    access.directoryIdentity('.agent', 'existing agent directory') !== agentIdentity ||
    access.directoryIdentity('.', 'clean plan root') !== rootIdentity ||
    capture(captureInitializationRuntimeBinding()).json !== capture(runtime).json
  )
    fail('root or package changed');
  return result;
}
