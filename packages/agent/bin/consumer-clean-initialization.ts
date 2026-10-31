import { createHash } from 'node:crypto';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import type { ValidateFunction } from 'ajv';
import schema from '../schemas/consumer-clean-initialization-operation.v1.schema.json' with { type: 'json' };
import { canonicalJsonImageWithNodeLimit } from '../src/contracts/canonical-json-core.js';
import { freezeJsonValue } from '../src/contracts/public-ingress.js';
import { projectMappings } from './project-mapping-contract.ts';

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
