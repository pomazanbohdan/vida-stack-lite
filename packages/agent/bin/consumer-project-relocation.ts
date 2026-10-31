export interface ConsumerProjectMove {
  readonly id: string;
  readonly oldRoot: string;
  readonly newRoot: string;
}

export function rebaseProjectPath(value: string, moves: readonly ConsumerProjectMove[]): string {
  if (value.includes('\\') || value.startsWith('/') || value.split('/').includes('..'))
    throw new Error('Ambiguous project path');
  const wildcard = value.search(/[?*[\]{}!]/);
  for (const move of moves) {
    if (value === move.oldRoot || value.startsWith(move.oldRoot + '/')) {
      if (wildcard >= 0 && wildcard < move.oldRoot.length + 1) throw new Error('Ambiguous project glob');
      return move.newRoot + value.slice(move.oldRoot.length);
    }
    if (wildcard >= 0 && wildcard < move.oldRoot.length && move.oldRoot.startsWith(value.slice(0, wildcard)))
      throw new Error('Ambiguous project glob');
  }
  return value;
}

export function rebaseDocumentationPolicy(text: string, moves: readonly ConsumerProjectMove[]): string {
  if (!moves.length) return text;
  const policy: unknown = JSON.parse(text);
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) throw new Error('Invalid documentation policy');
  const object = policy as Record<string, unknown>;
  let changed = false;
  for (const key of ['canonical_roots', 'map_paths', 'excluded_roots'] as const) {
    const values = object[key];
    if (!Array.isArray(values) || values.some((entry) => typeof entry !== 'string'))
      throw new Error('Unsupported documentation policy paths');
    object[key] = values.map((entry: string) => {
      const next = rebaseProjectPath(entry, moves);
      changed ||= next !== entry;
      return next;
    });
  }
  if (object.changelog_path !== null && typeof object.changelog_path !== 'string')
    throw new Error('Unsupported documentation changelog path');
  if (typeof object.changelog_path === 'string') {
    const next = rebaseProjectPath(object.changelog_path, moves);
    changed ||= next !== object.changelog_path;
    object.changelog_path = next;
  }
  return changed ? JSON.stringify(object, null, 2) + '\n' : text;
}

const rootPattern = /^[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/;
const idPattern = /^[a-z0-9][a-z0-9-]{0,63}$/;
const reserved = new Set(['.git', '.vida', '.agent', '.planning']);

function validRoot(value: string): boolean {
  return (
    rootPattern.test(value) &&
    value
      .split('/')
      .every(
        (part) =>
          part !== '.' &&
          part !== '..' &&
          !part.endsWith('.') &&
          !reserved.has(part.toLowerCase()) &&
          !/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part),
      )
  );
}

// Clean inventory accepts opaque names while excluding Win32 path aliases.
function validCleanLeaf(name: string): boolean {
  for (let index = 0; index < name.length; index++) {
    const code = name.charCodeAt(index);
    if (code < 32 || code === 127) return false;
  }
  return (
    name.length > 0 &&
    name !== '.' &&
    name !== '..' &&
    !/[\\/<>:"|?*]/.test(name) &&
    !/[. ]$/.test(name) &&
    !/^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(name)
  );
}

function overlaps(left: string, right: string): boolean {
  const a = left.toLowerCase();
  const b = right.toLowerCase();
  return a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
}

/** Validate explicit one-to-one moves without touching the repository. */
export function parseConsumerProjectMoves(
  input: readonly string[] | undefined,
  current: ReadonlyMap<string, string>,
  desired: readonly { readonly id: string; readonly root: string }[],
): readonly ConsumerProjectMove[] {
  if (input !== undefined && !Array.isArray(input)) throw new Error('Project moves must be an array');
  const moves = (input ?? []).map((value): ConsumerProjectMove => {
    if (typeof value !== 'string') throw new Error('Invalid project move');
    const match = /^([^=]+)=([^:]+):([^:]+)$/.exec(value);
    const id = match?.[1];
    const oldRoot = match?.[2];
    const newRoot = match?.[3];
    if (!id || !oldRoot || !newRoot || !idPattern.test(id) || !validRoot(oldRoot) || !validRoot(newRoot))
      throw new Error('Invalid project move');
    if (
      current.get(id) !== oldRoot ||
      desired.find((entry) => entry.id === id)?.root !== newRoot ||
      oldRoot === newRoot
    )
      throw new Error('Project move does not match the existing and desired roots');
    return { id, oldRoot, newRoot };
  });
  if (new Set(moves.map((move) => move.id)).size !== moves.length) throw new Error('Duplicate project move');
  for (const [id, root] of current) {
    const selected = desired.find((entry) => entry.id === id);
    if (!selected) throw new Error('Removing or renaming a project is unsupported');
    if (selected.root !== root && !moves.some((move) => move.id === id))
      throw new Error('A changed project root requires an explicit move');
  }
  const roots = moves.flatMap((move) => [move.oldRoot, move.newRoot]);
  const integrationPaths = [
    'AGENTS.md',
    'AGENT.sidecar.md',
    'agent-runtime.config.v1.yaml',
    'docs/agent-instructions/documentation-policy.v1.json',
  ];
  for (const root of roots)
    for (const integration of integrationPaths)
      if (overlaps(root, integration)) throw new Error('Project move overlaps an integration output');
  for (let i = 0; i < roots.length; i++)
    for (let j = i + 1; j < roots.length; j++)
      if (overlaps(roots[i]!, roots[j]!)) throw new Error('Project move roots overlap');
  for (const move of moves)
    for (const [id, root] of current)
      if (id !== move.id && (overlaps(root, move.oldRoot) || overlaps(root, move.newRoot)))
        throw new Error('Project move overlaps another current project');
  for (const move of moves)
    for (const project of desired)
      if (project.id !== move.id && (overlaps(project.root, move.oldRoot) || overlaps(project.root, move.newRoot)))
        throw new Error('Project move overlaps another desired project');
  return moves.sort((a, b) => a.id.localeCompare(b.id));
}
import { createHash } from 'node:crypto';
import { repositoryReadOnlyObservation, requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import type { ConsumerConfigurationOperation } from './consumer-configuration-operation.ts';

interface InventoryFile {
  readonly source: string;
  readonly destination: string;
  readonly identity: string;
  readonly sha256: string;
  readonly bytes: Buffer;
}
interface InventoryDirectory {
  readonly path: string;
  readonly identity: string;
  readonly entries: readonly string[];
}
export interface ConsumerProjectMoveInventory {
  readonly move: ConsumerProjectMove;
  readonly rootIdentity: string;
  readonly destinationIdentity: string;
  readonly directories: readonly InventoryDirectory[];
  readonly files: readonly InventoryFile[];
}

type FrozenMove = NonNullable<ConsumerConfigurationOperation['relocation']>['inventory'][number];

function inventoryDevice(identity: string): string {
  const value = JSON.parse(identity) as { dev?: string; ino?: string; birthtime_ns?: string };
  if (
    !value.dev ||
    value.dev === '0' ||
    !value.ino ||
    value.ino === '0' ||
    !value.birthtime_ns ||
    value.birthtime_ns === '0'
  )
    throw new Error('Native relocation identity is unavailable');
  return value.dev;
}

type InventoryAccess = ReturnType<typeof requireSafeRepositoryAccess>;
function* inventoryTree(
  access: InventoryAccess,
  sourceRoot: string,
  expectedDevice: string,
  directories: InventoryDirectory[],
  cleanLimits?: Readonly<{ maxEntries: number; maxBytes: number }>,
): Generator<string> {
  const view = repositoryReadOnlyObservation(access);
  let fileCount = 0;
  function* walk(directory: string): Generator<string> {
    if (directories.length + fileCount >= (cleanLimits?.maxEntries ?? 10000))
      throw new Error('Relocation inventory exceeds entry limit');
    const identity = access.directoryIdentity(directory, 'relocation directory');
    if (inventoryDevice(identity) !== expectedDevice) throw new Error('Cross-volume relocation is unsupported');
    const entries = [...view.listFiles(directory, 'relocation directory')].sort();
    if (new Set(entries.map((entry) => entry.toLowerCase())).size !== entries.length)
      throw new Error('Relocation entries collide on Windows');
    directories.push({ path: directory, identity, entries });
    for (const name of entries) {
      if (cleanLimits ? !validCleanLeaf(name) : !validRoot(name) || name.includes('/'))
        throw new Error('Relocation entry name is unsupported');
      const source = `${directory}/${name}`;
      let isDirectory = false;
      try {
        access.directoryIdentity(source, 'relocation directory');
        isDirectory = true;
      } catch {
        /* verified file observation follows */
      }
      if (isDirectory) yield* walk(source);
      else {
        if (cleanLimits && directories.length + fileCount >= cleanLimits.maxEntries)
          throw new Error('Relocation inventory exceeds entry limit');
        if (cleanLimits) fileCount++;
        yield source;
        if (!cleanLimits) fileCount++;
      }
    }
  }
  yield* walk(sourceRoot);
}

function assertInventoryDirectories(access: InventoryAccess, directories: readonly InventoryDirectory[]): void {
  const view = repositoryReadOnlyObservation(access);
  for (const directory of directories) {
    if (
      access.directoryIdentity(directory.path, 'relocation directory') !== directory.identity ||
      JSON.stringify([...view.listFiles(directory.path, 'relocation directory')].sort()) !==
        JSON.stringify(directory.entries)
    )
      throw new Error('Relocation directory changed during inventory');
  }
}

/** Reconstruct the original inventory only from the positively observed original objects. */
export function observeFrozenProjectMove(root: string, frozen: FrozenMove): ConsumerProjectMoveInventory {
  const access = requireSafeRepositoryAccess(root);
  const view = repositoryReadOnlyObservation(access);
  const identify = access.observeFileIdentity;
  const capture = access.readVerifiedCaptureBytes;
  if (!identify || !capture) throw new Error('Verified relocation observation is unavailable');
  const targetDirs = [
    { path: frozen.move.newRoot, identity: frozen.destinationIdentity },
    ...(frozen.targetDirectories ?? []),
  ];
  if (frozen.pendingDirectory) {
    const identity = access.directoryIdentity(frozen.pendingDirectory, 'pending relocation directory');
    if (view.listFiles(frozen.pendingDirectory, 'pending relocation directory').length !== 0)
      throw new Error('Pending relocation directory is not empty');
    targetDirs.push({ path: frozen.pendingDirectory, identity });
  }
  const expectedSource = new Map(frozen.directories.map((dir) => [dir.path, [...dir.entries]]));
  const expectedTarget = new Map(targetDirs.map((dir) => [dir.path, [] as string[]]));
  const addTarget = (name: string) => {
    const slash = name.lastIndexOf('/');
    const parent = name.slice(0, slash);
    const leaf = name.slice(slash + 1);
    const entries = expectedTarget.get(parent);
    if (!entries) throw new Error('Relocation target parent is not qualified');
    entries.push(leaf);
  };
  for (const dir of targetDirs.slice(1)) addTarget(dir.path);
  for (const file of frozen.files) {
    if (file.state === 'not-started') continue;
    const slash = file.source.lastIndexOf('/');
    const entries = expectedSource.get(file.source.slice(0, slash));
    const name = file.source.slice(slash + 1);
    if (!entries || !entries.includes(name)) throw new Error('Relocation source listing differs');
    entries.splice(entries.indexOf(name), 1);
    addTarget(file.destination);
  }
  const assertDirectories = () => {
    if (access.directoryIdentity('.', 'relocation root') !== frozen.rootIdentity)
      throw new Error('Relocation root identity changed');
    for (const dir of frozen.directories) {
      if (
        access.directoryIdentity(dir.path, 'relocation source directory') !== dir.identity ||
        JSON.stringify([...view.listFiles(dir.path, 'relocation source directory')].sort()) !==
          JSON.stringify(expectedSource.get(dir.path)!.sort())
      )
        throw new Error('Relocation source directory changed');
    }
    for (const dir of targetDirs) {
      if (
        access.directoryIdentity(dir.path, 'relocation target directory') !== dir.identity ||
        JSON.stringify([...view.listFiles(dir.path, 'relocation target directory')].sort()) !==
          JSON.stringify(expectedTarget.get(dir.path)!.sort())
      )
        throw new Error('Relocation target directory changed');
    }
  };
  assertDirectories();
  const files = frozen.files.map((file): InventoryFile => {
    // An issued file remaining at source is UNKNOWN; listings reject it before this read.
    const actual = file.state === 'not-started' ? file.source : file.destination;
    if (identify(actual, 'relocation file') !== file.identity) throw new Error('Relocation file identity changed');
    const bytes = capture(actual, 'relocation file');
    if (
      identify(actual, 'relocation file') !== file.identity ||
      bytes.length !== file.size ||
      createHash('sha256').update(bytes).digest('hex') !== file.sha256
    )
      throw new Error('Relocation file changed');
    return { source: file.source, destination: file.destination, identity: file.identity, sha256: file.sha256, bytes };
  });
  assertDirectories();
  return {
    move: frozen.move,
    rootIdentity: frozen.rootIdentity,
    destinationIdentity: frozen.destinationIdentity,
    directories: frozen.directories,
    files,
  };
}

/** Best-effort observation; later effects must revalidate identities under admission. */
export function captureConsumerProjectMoveInventory(
  root: string,
  move: ConsumerProjectMove,
): ConsumerProjectMoveInventory {
  const access = requireSafeRepositoryAccess(root);
  const view = repositoryReadOnlyObservation(access);
  const identify = access.observeFileIdentity;
  const capture = access.readVerifiedCaptureBytes;
  if (!identify || !capture) throw new Error('Verified relocation observation is unavailable');
  const destinationIdentity = access.directoryIdentity(move.newRoot, 'relocation destination');
  const rootIdentity = access.directoryIdentity('.', 'repository root');
  const device = inventoryDevice;
  const expectedDevice = device(destinationIdentity);
  if (
    device(access.directoryIdentity(move.oldRoot, 'relocation source')) !== expectedDevice ||
    device(rootIdentity) !== expectedDevice
  )
    throw new Error('Cross-volume relocation is unsupported');
  if (view.listFiles(move.newRoot, 'relocation destination').length !== 0)
    throw new Error('Relocation destination must be empty');
  const directories: InventoryDirectory[] = [];
  const files: InventoryFile[] = [];
  let total = 0;
  for (const source of inventoryTree(access, move.oldRoot, expectedDevice, directories)) {
    const identityBefore = identify(source, 'relocation file');
    if (device(identityBefore) !== expectedDevice) throw new Error('Cross-volume relocation is unsupported');
    const bytes = capture(source, 'relocation file');
    const identityAfter = identify(source, 'relocation file');
    if (identityBefore !== identityAfter) throw new Error('Relocation file identity changed');
    total += bytes.length;
    if (total > 32 * 1024 * 1024 || directories.length + files.length >= 10000)
      throw new Error('Relocation inventory exceeds limit');
    files.push({
      source,
      destination: move.newRoot + source.slice(move.oldRoot.length),
      identity: identityBefore,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      bytes,
    });
  }
  assertInventoryDirectories(access, directories);
  for (const file of files) {
    if (
      identify(file.source, 'relocation file') !== file.identity ||
      !capture(file.source, 'relocation file').equals(file.bytes)
    )
      throw new Error('Relocation file changed during inventory');
  }
  if (
    access.directoryIdentity('.', 'repository root') !== rootIdentity ||
    access.directoryIdentity(move.newRoot, 'relocation destination') !== destinationIdentity ||
    view.listFiles(move.newRoot, 'relocation destination').length !== 0
  )
    throw new Error('Relocation destination changed during inventory');
  return { move, rootIdentity, destinationIdentity, directories, files };
}

/** Best-effort observations, not an atomic snapshot or destination qualification. */
export async function captureCleanSourceDirectoryInventory(
  root: string,
  sourceRoot: string,
  limits: Readonly<{ maxEntries: number; maxBytes: number }> = { maxEntries: 10000, maxBytes: 512 * 1024 * 1024 },
) {
  limits = Object.freeze({ maxEntries: limits?.maxEntries, maxBytes: limits?.maxBytes });
  if (
    !limits ||
    !Number.isInteger(limits.maxEntries) ||
    limits.maxEntries < 0 ||
    limits.maxEntries > 10000 ||
    !Number.isInteger(limits.maxBytes) ||
    limits.maxBytes < 0 ||
    limits.maxBytes > 512 * 1024 * 1024
  )
    throw new Error('Invalid clean inventory limits');
  const access = requireSafeRepositoryAccess(root);
  const view = repositoryReadOnlyObservation(access);
  const identify = view.observeFileIdentity;
  const observe = view.observeLargeFile;
  if (access.provider !== 'fs-safe-windows' || !identify || !observe)
    throw new Error('Windows verified large-file observation is unavailable');
  const rootIdentity = access.directoryIdentity('.', 'repository root');
  const sourceIdentity = access.directoryIdentity(sourceRoot, 'relocation source');
  const expectedDevice = inventoryDevice(rootIdentity);
  if (inventoryDevice(sourceIdentity) !== expectedDevice) throw new Error('Cross-volume relocation is unsupported');
  const directories: InventoryDirectory[] = [];
  const files: { source: string; identity: string; size: number; sha256: string }[] = [];
  let totalBytes = 0;
  for (const source of inventoryTree(access, sourceRoot, expectedDevice, directories, limits)) {
    // Size is unavailable before observation: one leaf may exceed a positive remainder.
    if (totalBytes >= limits.maxBytes) throw new Error('Relocation inventory exceeds limit');
    const identity = identify(source, 'relocation file');
    if (inventoryDevice(identity) !== expectedDevice) throw new Error('Cross-volume relocation is unsupported');
    const observed = await observe(source, 'relocation file');
    if (observed.identity !== identity || identify(source, 'relocation file') !== identity)
      throw new Error('Relocation file identity changed');
    totalBytes += observed.size;
    if (observed.size > 64 * 1024 * 1024 || totalBytes > limits.maxBytes)
      throw new Error('Relocation inventory exceeds limit');
    files.push({ source, identity, size: observed.size, sha256: observed.sha256 });
  }
  assertInventoryDirectories(access, directories);
  for (const file of files) {
    if (identify(file.source, 'relocation file') !== file.identity)
      throw new Error('Relocation file changed during inventory');
    const observed = await observe(file.source, 'relocation file');
    if (
      observed.identity !== file.identity ||
      observed.size !== file.size ||
      observed.sha256 !== file.sha256 ||
      identify(file.source, 'relocation file') !== file.identity
    )
      throw new Error('Relocation file changed during inventory');
  }
  // Fresh directory checks follow all asynchronous hashes; they do not make the observations atomic.
  assertInventoryDirectories(access, directories);
  if (
    access.directoryIdentity('.', 'repository root') !== rootIdentity ||
    access.directoryIdentity(sourceRoot, 'relocation source') !== sourceIdentity
  )
    throw new Error('Relocation source changed during inventory');
  return Object.freeze({
    rootIdentity,
    sourceIdentity,
    directories: Object.freeze(
      directories.map((dir) => Object.freeze({ ...dir, entries: Object.freeze([...dir.entries]) })),
    ),
    files: Object.freeze(files.map((file) => Object.freeze({ ...file }))),
    totalBytes,
    entryCount: directories.length + files.length,
  });
}
