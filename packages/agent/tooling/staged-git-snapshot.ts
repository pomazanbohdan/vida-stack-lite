import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  closeSync,
  constants as fsConstants,
  existsSync,
  fstatSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import type { BigIntStats } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

interface StagedDependencyMount {
  readonly workspaceRelativePath: string;
  readonly installedNodeModules: string;
}

interface StagedGitSnapshotContext {
  readonly snapshotRoot: string;
  readonly trackedFiles: readonly string[];
  readonly env: Readonly<NodeJS.ProcessEnv>;
}

export interface StagedGitSnapshotOptions<T> {
  readonly repositoryRoot: string;
  readonly dependencyMounts?: readonly StagedDependencyMount[];
  readonly gitEnv?: NodeJS.ProcessEnv;
  readonly run: (context: StagedGitSnapshotContext) => T | Promise<T>;
}

const redirectedGitEnvironment = [
  'GIT_DIR',
  'GIT_WORK_TREE',
  'GIT_COMMON_DIR',
  'GIT_INDEX_FILE',
  'GIT_PREFIX',
  'GIT_OBJECT_DIRECTORY',
  'GIT_ALTERNATE_OBJECT_DIRECTORIES',
] as const;

interface GitEntry {
  readonly path: string;
  readonly mode: '100644' | '100755';
  readonly oid: string;
}

interface FileIdentity {
  readonly device: bigint;
  readonly inode: bigint;
}

const maximumSnapshotBytes = 256 * 1024 * 1024;
const maximumIndexBytes = 64 * 1024 * 1024;

function gitFailureDetail(result: ReturnType<typeof spawnSync>): string {
  if (result.error) return result.error.message;
  if (result.signal) return result.signal;
  return 'unknown child outcome';
}

function checkedGitOutput(args: readonly string[], result: ReturnType<typeof spawnSync>): Buffer {
  if (!Number.isInteger(result.status))
    throw new Error(`git ${args[0] ?? 'command'} could not complete: ${gitFailureDetail(result)}`);
  if (result.status !== 0)
    throw new Error(
      `git ${args[0] ?? 'command'} failed (${result.status}): ${Buffer.from(result.stderr ?? '').toString('utf8')}`,
    );
  return Buffer.from(result.stdout ?? '');
}

function git(
  root: string,
  args: readonly string[],
  env: NodeJS.ProcessEnv,
  input?: Buffer,
  maxBuffer = 32 * 1024 * 1024,
): Buffer {
  const result = spawnSync('git', [...args], {
    cwd: root,
    env,
    encoding: 'buffer',
    windowsHide: true,
    maxBuffer,
    ...(input === undefined ? {} : { input }),
  });
  return checkedGitOutput(args, result);
}

function regularIndexPath(root: string, env: NodeJS.ProcessEnv): string {
  const configured = env.GIT_INDEX_FILE;
  const candidate =
    configured === undefined
      ? git(root, ['rev-parse', '--path-format=absolute', '--git-path', 'index'], env).toString('utf8').trim()
      : path.resolve(root, configured);
  const absolute = path.resolve(candidate);
  const identity = lstatSync(absolute);
  if (!identity.isFile() || identity.isSymbolicLink()) throw new Error('The active Git index must be a regular file.');
  return absolute;
}

function assertSafeTrackedPath(decoded: string): void {
  const parts = decoded.split('/');
  const windowsReservedName = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;
  if (
    decoded.length === 0 ||
    decoded.startsWith('/') ||
    decoded.includes('\\') ||
    parts.some(
      (part) =>
        part === '' ||
        part === '.' ||
        part === '..' ||
        part.toLowerCase() === '.git' ||
        part.includes(':') ||
        /[. ]$/u.test(part) ||
        windowsReservedName.test(part),
    )
  )
    throw new Error(`The active Git index contains an unsafe path: ${decoded}`);
}

function validateIndexMetadata(metadata: readonly string[], pathName: string): GitEntry {
  const [mode, oid, stage] = metadata;
  const objectId = oid ?? '';
  if (metadata.length !== 3) throw new Error(`The active Git index contains malformed metadata: ${pathName}`);
  if (stage !== '0') throw new Error(`The active Git index contains an unresolved entry: ${pathName}`);
  if (mode === '120000' || mode === '160000')
    throw new Error(`The active Git index contains a link or submodule entry: ${pathName}`);
  if (mode !== '100644' && mode !== '100755')
    throw new Error(`The active Git index contains an unsupported file mode: ${pathName}`);
  if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(objectId))
    throw new Error(`The active Git index contains an invalid object id: ${pathName}`);
  return { path: pathName, mode, oid: objectId };
}

function parseIndexEntry(entry: Buffer): GitEntry {
  const separator = entry.indexOf(0x09);
  if (separator < 0) throw new Error('The active Git index contains a malformed entry.');
  let decoded: string;
  try {
    decoded = new TextDecoder('utf-8', { fatal: true }).decode(entry.subarray(separator + 1));
  } catch {
    throw new Error('The active Git index contains a path that is not valid UTF-8.');
  }
  assertSafeTrackedPath(decoded);
  const metadata = entry.subarray(0, separator).toString('ascii').split(' ');
  return validateIndexMetadata(metadata, decoded);
}

function parseIndex(bytes: Buffer): GitEntry[] {
  const entries: GitEntry[] = [];
  const paths = new Set<string>();
  const portablePaths = new Set<string>();
  for (let start = 0; start < bytes.length;) {
    const end = bytes.indexOf(0, start);
    if (end < 0) throw new Error('The active Git index listing is not NUL terminated.');
    const parsed = parseIndexEntry(bytes.subarray(start, end));
    const portable = parsed.path.toLowerCase();
    if (paths.has(parsed.path) || portablePaths.has(portable))
      throw new Error(`The active Git index contains a duplicate or case-colliding path: ${parsed.path}`);
    paths.add(parsed.path);
    portablePaths.add(portable);
    entries.push(parsed);
    start = end + 1;
  }
  for (const entry of entries) {
    const parts = entry.path.split('/');
    for (let index = 1; index < parts.length; index++)
      if (paths.has(parts.slice(0, index).join('/')))
        throw new Error(`The active Git index has a file and directory collision: ${entry.path}`);
  }
  return entries;
}

function fileIdentity(identity: BigIntStats): FileIdentity {
  if (!identity.isFile() || identity.isSymbolicLink()) throw new Error('The active Git index must be a regular file.');
  if (identity.size > BigInt(maximumIndexBytes))
    throw new Error(`The active Git index exceeds ${maximumIndexBytes} bytes.`);
  return { device: identity.dev, inode: identity.ino };
}

function sameFileIdentity(left: FileIdentity, right: FileIdentity): boolean {
  return left.device === right.device && left.inode === right.inode;
}

function readCapturedIndex(indexFile: string): { bytes: Buffer; identity: FileIdentity } {
  const before = fileIdentity(lstatSync(indexFile, { bigint: true }));
  const descriptor = openSync(indexFile, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0));
  try {
    const opened = fileIdentity(fstatSync(descriptor, { bigint: true }));
    if (!sameFileIdentity(before, opened)) throw new Error('The active Git index changed while it was being captured.');
    const bytes = readFileSync(descriptor);
    const after = fileIdentity(lstatSync(indexFile, { bigint: true }));
    const stillOpen = fileIdentity(fstatSync(descriptor, { bigint: true }));
    if (!sameFileIdentity(before, after) || !sameFileIdentity(before, stillOpen))
      throw new Error('The active Git index changed while it was being captured.');
    return { bytes, identity: before };
  } finally {
    closeSync(descriptor);
  }
}

function assertIndexUnchanged(indexFile: string, captured: Buffer, identity: FileIdentity): void {
  const currentIdentity = fileIdentity(lstatSync(indexFile, { bigint: true }));
  if (!sameFileIdentity(identity, currentIdentity))
    throw new Error('The active Git index identity changed during staged checks.');
  const current = readCapturedIndex(indexFile);
  if (!sameFileIdentity(identity, current.identity) || !current.bytes.equals(captured))
    throw new Error('The active Git index changed while staged checks were running.');
}

function checkedBlobSize(value: string | undefined, expectedOid: string, total: number): number {
  if (value === undefined || !/^(?:0|[1-9]\d*)$/u.test(value))
    throw new Error(`Git returned an invalid staged blob size for object ${expectedOid}.`);
  const size = Number(value);
  if (!Number.isSafeInteger(size) || total + size > maximumSnapshotBytes)
    throw new Error(`Staged snapshot exceeds the ${maximumSnapshotBytes} byte limit.`);
  return size;
}

function parseBlob(
  output: Buffer,
  offset: number,
  expectedOid: string,
  total: number,
): { blob: Buffer; nextOffset: number; size: number } {
  const lineEnd = output.indexOf(0x0a, offset);
  if (lineEnd < 0) throw new Error('Git returned a malformed staged blob header.');
  const header = output.subarray(offset, lineEnd).toString('ascii').split(' ');
  if (header.length !== 3 || header[0] !== expectedOid || header[1] !== 'blob')
    throw new Error(`Git returned an invalid staged blob for object ${expectedOid}.`);
  const size = checkedBlobSize(header[2], expectedOid, total);
  const start = lineEnd + 1;
  const end = start + size;
  if (end >= output.length || output[end] !== 0x0a)
    throw new Error(`Git returned a truncated staged blob for object ${expectedOid}.`);
  return { blob: output.subarray(start, end), nextOffset: end + 1, size };
}

function parseBlobBatch(output: Buffer, oids: readonly string[]): Map<string, Buffer> {
  const blobs = new Map<string, Buffer>();
  let offset = 0;
  let total = 0;
  for (const expectedOid of oids) {
    const parsed = parseBlob(output, offset, expectedOid, total);
    blobs.set(expectedOid, parsed.blob);
    offset = parsed.nextOffset;
    total += parsed.size;
  }
  if (offset !== output.length) throw new Error('Git returned trailing bytes after the staged blob batch.');
  return blobs;
}

function rawBlobs(root: string, entries: readonly GitEntry[], env: NodeJS.ProcessEnv): Map<string, Buffer> {
  const oids = [...new Set(entries.map((entry) => entry.oid))];
  const input = Buffer.from(oids.map((oid) => `${oid}\n`).join(''));
  const maxBuffer = maximumSnapshotBytes + entries.length * 128 + 1024;
  const output = git(root, ['cat-file', '--batch'], env, input, maxBuffer);
  return parseBlobBatch(output, oids);
}

function materializeSnapshot(
  snapshotRoot: string,
  entries: readonly GitEntry[],
  blobs: ReadonlyMap<string, Buffer>,
): void {
  for (const entry of entries) {
    const destination = path.resolve(snapshotRoot, ...entry.path.split('/'));
    if (!destination.startsWith(snapshotRoot + path.sep))
      throw new Error(`Staged path escapes the snapshot: ${entry.path}`);
    mkdirSync(path.dirname(destination), { recursive: true });
    const blob = blobs.get(entry.oid);
    if (blob === undefined) throw new Error(`Staged blob was not captured: ${entry.path}`);
    writeFileSync(destination, blob, { flag: 'wx', mode: entry.mode === '100755' ? 0o755 : 0o644 });
    if (entry.mode === '100755') chmodSync(destination, 0o755);
  }
}

function mountDependencies(snapshotRoot: string, mounts: readonly StagedDependencyMount[]): void {
  const mounted = new Set<string>();
  for (const mount of mounts) {
    const workspace = mount.workspaceRelativePath;
    const components = workspace.split(/[\\/]/);
    if (
      workspace.length === 0 ||
      path.isAbsolute(workspace) ||
      components.some((component) => component === '' || component === '.' || component === '..')
    )
      throw new Error(`Dependency mount workspace path is unsafe: ${workspace}`);
    const destination = path.resolve(snapshotRoot, workspace, 'node_modules');
    if (!destination.startsWith(snapshotRoot + path.sep))
      throw new Error(`Dependency mount escapes its staged workspace: ${workspace}`);
    if (mounted.has(destination)) throw new Error(`Duplicate dependency mount: ${workspace}`);
    mounted.add(destination);
    if (existsSync(destination)) throw new Error(`Staged tree already contains node_modules: ${workspace}`);
    const sourceIdentity = statSync(mount.installedNodeModules);
    if (!sourceIdentity.isDirectory()) throw new Error(`Installed node_modules is not a directory: ${workspace}`);
    const source = realpathSync(mount.installedNodeModules);
    mkdirSync(path.dirname(destination), { recursive: true });
    symlinkSync(source, destination, process.platform === 'win32' ? 'junction' : 'dir');
  }
}

function isolatedToolEnvironment(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const isolated = { ...env };
  for (const key of redirectedGitEnvironment) delete isolated[key];
  return isolated;
}

function assertOwnedTemporaryDirectory(directory: string, captured: FileIdentity): void {
  const identity = lstatSync(directory, { bigint: true });
  if (
    !identity.isDirectory() ||
    identity.isSymbolicLink() ||
    identity.dev !== captured.device ||
    identity.ino !== captured.inode ||
    realpathSync(directory) !== directory
  )
    throw new Error('The staged snapshot temporary directory changed identity before cleanup.');
}

function readCopiedIndexEntries(root: string, copiedIndex: string, env: NodeJS.ProcessEnv): GitEntry[] {
  try {
    return parseIndex(git(root, ['ls-files', '--stage', '-z'], { ...env, GIT_INDEX_FILE: copiedIndex }));
  } catch (error) {
    if (error instanceof Error && /shared.?index|split.?index/iu.test(error.message))
      throw new Error('Split Git indexes cannot be materialized from a private copy; staged checks fail closed.');
    throw error;
  }
}

async function runSnapshot<T>(
  options: StagedGitSnapshotOptions<T>,
  root: string,
  gitEnv: NodeJS.ProcessEnv,
  capturedIndex: Buffer,
  temporaryRoot: string,
): Promise<T> {
  const copiedIndex = path.join(temporaryRoot, 'index');
  const snapshotRoot = path.join(temporaryRoot, 'tree');
  writeFileSync(copiedIndex, capturedIndex, { flag: 'wx', mode: 0o600 });
  mkdirSync(snapshotRoot);
  const entries = readCopiedIndexEntries(root, copiedIndex, gitEnv);
  const blobs = rawBlobs(root, entries, gitEnv);
  materializeSnapshot(snapshotRoot, entries, blobs);
  mountDependencies(snapshotRoot, options.dependencyMounts ?? []);
  return options.run({
    snapshotRoot,
    trackedFiles: entries.map((entry) => entry.path),
    env: isolatedToolEnvironment(gitEnv),
  });
}

function recordFailure(failures: unknown[], action: () => void): void {
  try {
    action();
  } catch (error) {
    failures.push(error);
  }
}

function settleSnapshot(temporaryRoot: string, identity: FileIdentity, failures: unknown[]): void {
  try {
    assertOwnedTemporaryDirectory(temporaryRoot, identity);
  } catch (error) {
    failures.push(error);
    return;
  }
  recordFailure(failures, () => rmSync(temporaryRoot, { recursive: true, force: false }));
}

function throwFailures(failures: readonly unknown[]): void {
  if (failures.length === 1) throw failures[0];
  if (failures.length > 1)
    throw new AggregateError(failures, 'Staged checks, index custody, or snapshot cleanup failed.');
}

/** Run checks against one materialization of the active Git index, then verify index custody. */
export async function withStagedGitSnapshot<T>(options: StagedGitSnapshotOptions<T>): Promise<T> {
  const root = realpathSync(options.repositoryRoot);
  const gitEnv = { ...(options.gitEnv ?? process.env) };
  const resolvedRoot = git(root, ['rev-parse', '--show-toplevel'], gitEnv).toString('utf8').trim();
  if (realpathSync(resolvedRoot) !== root) throw new Error('The requested root is not the active Git worktree root.');
  const activeIndex = regularIndexPath(root, gitEnv);
  const captured = readCapturedIndex(activeIndex);
  const temporaryRoot = mkdtempSync(path.join(tmpdir(), 'vida-staged-snapshot-'));
  const temporaryIdentity = lstatSync(temporaryRoot, { bigint: true });
  if (!temporaryIdentity.isDirectory() || temporaryIdentity.isSymbolicLink())
    throw new Error('The staged snapshot temporary root is not a regular directory.');
  const ownedIdentity = { device: temporaryIdentity.dev, inode: temporaryIdentity.ino };
  const failures: unknown[] = [];
  let result!: T;
  try {
    result = await runSnapshot(options, root, gitEnv, captured.bytes, temporaryRoot);
  } catch (error) {
    failures.push(error);
  }
  recordFailure(failures, () => assertIndexUnchanged(activeIndex, captured.bytes, captured.identity));
  settleSnapshot(temporaryRoot, ownedIdentity, failures);
  throwFailures(failures);
  return result;
}
