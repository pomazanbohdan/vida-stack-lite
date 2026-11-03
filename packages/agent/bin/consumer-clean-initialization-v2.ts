import { createHash } from 'node:crypto';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import type { ValidateFunction } from 'ajv';
import schema from '../schemas/consumer-clean-initialization-operation.v2.schema.json' with { type: 'json' };
import { canonicalJsonImageWithNodeLimit } from '../src/contracts/canonical-json-core.js';
import { freezeJsonValue } from '../src/contracts/public-ingress.js';
import { projectMappings } from './project-mapping-contract.ts';

type EffectState = 'not-started' | 'issued' | 'completed';
interface CleanFileObservationV2 {
  readonly type: 'file';
  readonly path: string;
  readonly identity: string;
  readonly size: number;
  readonly sha256: string;
}
interface CleanMoveV2 {
  readonly kind: 'archive';
  readonly source: string;
  readonly target: string;
  readonly source_identity: string;
  readonly type: 'file';
  readonly state: EffectState;
}
interface CleanContainerV2 {
  readonly path: string;
  readonly state: EffectState;
  readonly identity: string | null;
}
interface CleanPreparedInitializationV2 {
  readonly intent: string;
  readonly rootIdentity: string;
  readonly bundleIdentity: string;
  readonly projectIdentities: readonly string[];
  readonly resourceDigest: string;
}
export interface ConsumerCleanInitializationOperationV2 {
  readonly schema: 'ConsumerCleanInitializationOperation/v2';
  readonly version: 2;
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
  readonly inventory: readonly CleanFileObservationV2[];
  readonly preserved: readonly CleanFileObservationV2[];
  readonly protected_paths: readonly string[];
  readonly moves: readonly CleanMoveV2[];
  readonly containers: readonly CleanContainerV2[];
  readonly phase: 'intent' | 'archiving' | 'archive_complete' | 'initializing' | 'complete';
  readonly prepared: CleanPreparedInitializationV2 | null;
  readonly initialization: EffectState;
  readonly binding: string;
}

type AjvConstructor = new (options: Record<string, unknown>) => { compile<T>(schema: object): ValidateFunction<T> };
const Constructor = Ajv2020 as unknown as AjvConstructor;
const validateShape = new Constructor({
  strict: true,
  allErrors: false,
  ownProperties: true,
}).compile<ConsumerCleanInitializationOperationV2>(schema);
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_NODES = 32 * 10000 + 1024;
const MAX_FILE_BYTES = 64 * 1024 * 1024;
const MAX_TOTAL_BYTES = 512 * 1024 * 1024;
const decoder = new TextDecoder('utf-8', { fatal: true });
const ARCHIVE_SOURCES = [
  'AGENTS.md',
  'agent-runtime.config.v1.yaml',
  'docs/agent-instructions/documentation-policy.v1.json',
  '.agent/runtime-initialization.v1.json',
] as const;
const PRESERVABLE_SOURCES = [
  'AGENT.sidecar.md',
  'AGENTS.md',
  'docs/agent-instructions/documentation-policy.v1.json',
] as const;
const REQUIRED_PROTECTED_PATHS = ['.agent/coordination', '.agent/work'] as const;

function fail(message: string): never {
  throw new Error('Invalid clean initialization v2 journal: ' + message);
}
const capture = (value: unknown) => canonicalJsonImageWithNodeLimit(value, 0, MAX_NODES);
const folded = (value: string) => value.toLowerCase();
const contains = (parent: string, child: string) => child === parent || child.startsWith(parent + '/');
const overlap = (a: string, b: string) => contains(a, b) || contains(b, a);

function hasControlCharacters(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 32 || code === 127) return true;
  }
  return false;
}

function safePath(value: string, allowDot = false): void {
  if (
    !value ||
    value.length > 4096 ||
    value.includes('\\') ||
    value.includes(':') ||
    hasControlCharacters(value) ||
    (value === '.' ? !allowDot : value.split('/').some((part) => !part || part === '.' || part === '..'))
  )
    fail('unsafe relative path');
}

function lexicalRoot(root: string): void {
  const windows = path.win32.isAbsolute(root) && path.win32.normalize(root) === root;
  const posix = path.posix.isAbsolute(root) && path.posix.normalize(root) === root;
  if ((!windows && !posix) || hasControlCharacters(root)) fail('root is not absolute and normalized');
}

function uniquePaths(paths: readonly string[], disjoint: boolean, allowDot = false): void {
  const seen = new Set<string>();
  for (const item of paths) {
    safePath(item, allowDot);
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

function isArchiveSource(value: string): value is (typeof ARCHIVE_SOURCES)[number] {
  return ARCHIVE_SOURCES.some((source) => source === value);
}

function isPreservableSource(value: string): value is (typeof PRESERVABLE_SOURCES)[number] {
  return PRESERVABLE_SOURCES.some((source) => source === value);
}

function immutablePlan(record: ConsumerCleanInitializationOperationV2): unknown {
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
    preserved: record.preserved,
    protected_paths: record.protected_paths,
    moves: record.moves.map(({ state: _state, ...move }) => move),
    containers: record.containers.map(({ path: containerPath }) => containerPath),
  };
}

function immutableBinding(record: ConsumerCleanInitializationOperationV2): string {
  return createHash('sha256')
    .update(capture(immutablePlan(record)).json, 'utf8')
    .digest('hex');
}

function checkSemantics(record: ConsumerCleanInitializationOperationV2): void {
  lexicalRoot(record.root);
  if (record.root !== record.request.projectRoot || !/^[a-z0-9][a-z0-9-]{0,63}$/u.test(record.request.repository))
    fail('request identity');
  const mappings = projectMappings(record.request.projectMappings);
  const expectedArchiveRoot = `.agent/clean-initialization-history/${record.operation_id}/payload`;
  if (record.archive_root !== expectedArchiveRoot) fail('archive root');

  const sources = record.moves.map((move) => move.source);
  const targets = record.moves.map((move) => move.target);
  const inventoryPaths = record.inventory.map((entry) => entry.path);
  const preservedPaths = record.preserved.map((entry) => entry.path);
  const protectedPaths = record.protected_paths;
  uniquePaths(sources, true);
  uniquePaths(targets, true);
  uniquePaths(inventoryPaths, false);
  uniquePaths(preservedPaths, false);
  uniquePaths(protectedPaths, false, true);
  uniquePaths(
    record.containers.map((entry) => entry.path),
    false,
  );
  uniquePaths([...sources, ...targets, ...preservedPaths], true);
  consistentPathCase([
    record.archive_root,
    ...sources,
    ...targets,
    ...inventoryPaths,
    ...preservedPaths,
    ...protectedPaths,
    ...record.containers.map((entry) => entry.path),
  ]);
  ordered(sources);
  ordered(inventoryPaths);
  ordered(preservedPaths);
  ordered(protectedPaths);
  ordered(record.containers.map((entry) => entry.path));

  for (const required of REQUIRED_PROTECTED_PATHS) {
    if (!protectedPaths.includes(required)) fail('required protected path');
  }
  if (record.inventory.length !== record.moves.length || record.moves.length > ARCHIVE_SOURCES.length)
    fail('file inventory and move counts differ');
  for (const move of record.moves) {
    if (!isArchiveSource(move.source)) fail('archive source');
    if (move.target !== `${expectedArchiveRoot}/${move.source}`) fail('archive target');
    const file = record.inventory.find((entry) => entry.path === move.source);
    if (!file || file.identity !== move.source_identity) fail('move inventory identity');
    if (
      protectedPaths.some(
        (entry) =>
          entry === '.' || overlap(folded(entry), folded(move.source)) || overlap(folded(entry), folded(move.target)),
      )
    )
      fail('protected archive source or target');
  }
  for (const entry of record.inventory) {
    if (!record.moves.some((move) => move.source === entry.path && move.source_identity === entry.identity))
      fail('unmatched inventory entry');
  }
  for (const entry of record.preserved) {
    if (!isPreservableSource(entry.path)) fail('preserved source');
    if (sources.some((source) => overlap(folded(source), folded(entry.path)))) fail('preserved and moved overlap');
  }

  const expectedContainers = new Set<string>();
  for (const target of targets) {
    const parts = target.split('/');
    for (let count = 1; count < parts.length; count += 1) {
      const parent = parts.slice(0, count).join('/');
      if (parent !== '.agent') expectedContainers.add(parent);
    }
  }
  const actualContainers = record.containers.map((entry) => entry.path);
  if (
    actualContainers.length !== expectedContainers.size ||
    actualContainers.some((containerPath) => !expectedContainers.has(containerPath))
  )
    fail('container set differs from owned archive targets');
  for (const container of record.containers) {
    if (
      (container.state === 'completed' && container.identity === null) ||
      (container.state === 'not-started' && container.identity !== null)
    )
      fail('container identity');
  }

  let aggregateBytes = 0;
  for (const entry of [...record.inventory, ...record.preserved]) {
    if (!Number.isSafeInteger(entry.size) || entry.size > MAX_FILE_BYTES) fail('file size');
    aggregateBytes += entry.size;
    if (!Number.isSafeInteger(aggregateBytes) || aggregateBytes > MAX_TOTAL_BYTES) fail('aggregate size');
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
export function validateCleanInitializationOperationV2(value: unknown): ConsumerCleanInitializationOperationV2 {
  const { image, json } = capture(value);
  if (Buffer.byteLength(json, 'utf8') > MAX_BYTES || !validateShape(image)) fail('shape or serialized size');
  checkSemantics(image);
  if (immutableBinding(image) !== image.binding) fail('binding');
  return freezeJsonValue(image);
}

/** Capture the caller before inspection and compute only the immutable-plan binding. */
export function sealCleanInitializationOperationV2(value: unknown): ConsumerCleanInitializationOperationV2 {
  const { image } = capture(value);
  if (image === null || typeof image !== 'object' || Array.isArray(image) || Object.hasOwn(image, 'binding'))
    fail('draft shape');
  const candidate = { ...image, binding: '0'.repeat(64) };
  if (!validateShape(candidate)) fail('draft shape');
  checkSemantics(candidate);
  return validateCleanInitializationOperationV2({ ...candidate, binding: immutableBinding(candidate) });
}

/** Pending-byte integrity and authority to act belong to a later operation owner. */
export function decodeCleanInitializationOperationV2(bytes: Uint8Array): ConsumerCleanInitializationOperationV2 {
  if (bytes.byteLength > MAX_BYTES) fail('serialized size');
  return validateCleanInitializationOperationV2(JSON.parse(decoder.decode(bytes)) as unknown);
}
