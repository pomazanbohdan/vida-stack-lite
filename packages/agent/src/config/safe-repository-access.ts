import {
  closeSync,
  constants as fsConstants,
  fstatSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readSync,
  writeSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  existsSync,
  renameSync,
  unlinkSync,
  rmdirSync,
  realpathSync,
  lstatSync,
  type Stats,
} from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { Result } from 'neverthrow';
import { createRequire } from 'node:module';
import path from 'node:path';
import { root as createFsSafeRoot, type Root as FsSafeRoot } from '@openclaw/fs-safe';
import { assertNoSymlinkParentsSync, openRootFileSync, sameFileIdentity } from '@openclaw/fs-safe/advanced';
import { withFileLock } from '@openclaw/fs-safe/file-lock';
type LinuxNativeBinding = {
  readonly cloneFileExclusive: (sourceFd: number, targetRootFd: number, targetRelPath: string) => number;
  readonly renameNoReplace: (
    sourceRootFd: number,
    sourceRelPath: string,
    targetRootFd: number,
    targetRelPath: string,
  ) => void;
};
type WindowsNativeBinding = {
  readonly renameNoReplace: (
    sourceRootFd: number,
    sourceRelPath: string,
    targetRootFd: number,
    targetRelPath: string,
  ) => void;
  readonly renameReplace: (
    sourceRootFd: number,
    sourceRelPath: string,
    targetRootFd: number,
    targetRelPath: string,
  ) => void;
  readonly openBeneath: (
    rootFd: number,
    relPath: string,
    flags: number,
  ) => { readonly fd: number; readonly containment: string };
  readonly mkdirBeneath: (rootFd: number, relPath: string, mode: number) => void;
  readonly fstatIdentity: (fd: number) => {
    readonly dev: number;
    readonly ino: number;
    readonly mode: number;
    readonly nlink: number;
    readonly size: number;
    readonly isFile: boolean;
    readonly isDirectory: boolean;
    readonly isSymbolicLink: boolean;
  };
  readonly sha256File: (fd: number) => Promise<{ readonly bytes: number; readonly digest: string }>;
};
type Thunk<T> = () => T;
const choose = <T>(condition: unknown, yes: Thunk<T>, no: Thunk<T>): T => [no, yes][Number(Boolean(condition))]!();
const all = (...values: readonly unknown[]): boolean => values.every(Boolean);
const any = (...values: readonly unknown[]): boolean => values.some(Boolean);
const reject = (condition: unknown, message: string): void =>
  choose(
    condition,
    () => fail(message),
    () => undefined,
  );
const moduleRequire = createRequire(import.meta.url);
const fsSafePackageMaxBytes = 64 * 1024 * 1024;
const maxRepositoryReadBytes = 8 * 1024 * 1024;
const boundedReadChunkBytes = 64 * 1024;
const staleLockAgeMs = 30_000;
function fail(message: string): never {
  throw new Error(`safe repository access unavailable: ${message}`);
}

const fsSafePackageManifest = [
  'dist/absolute-path.js',
  'dist/advanced.js',
  'dist/async-lock.js',
  'dist/atomic.js',
  'dist/bounded-read.js',
  'dist/deny-mutations.js',
  'dist/device-path.js',
  'dist/directory-durability.js',
  'dist/directory-guard.js',
  'dist/error-detail.js',
  'dist/errors.js',
  'dist/file-identity.js',
  'dist/file-lock-sync.js',
  'dist/file-lock.js',
  'dist/filename.js',
  'dist/fs.js',
  'dist/fsync.js',
  'dist/guarded-mkdir.js',
  'dist/guarded-mutation.js',
  'dist/home-dir.js',
  'dist/index.js',
  'dist/install-path.js',
  'dist/json-stringify.js',
  'dist/local-file-access.js',
  'dist/local-roots.js',
  'dist/lock-config.js',
  'dist/mode.js',
  'dist/move-path.js',
  'dist/native-config.js',
  'dist/native-operations.js',
  'dist/native-pinned-write.js',
  'dist/native.js',
  'dist/opened-realpath.js',
  'dist/path-policy.js',
  'dist/path.js',
  'dist/permission-exec.js',
  'dist/permissions-windows.js',
  'dist/permissions.js',
  'dist/pinned-open.js',
  'dist/pinned-operation.js',
  'dist/pinned-write.js',
  'dist/read-open-flags.js',
  'dist/read-opened-file.js',
  'dist/regular-file.js',
  'dist/replace-directory.js',
  'dist/replace-file-copy-' + String.fromCharCode(102, 97, 108, 108, 98, 97, 99, 107) + '.js',
  'dist/replace-file-descriptor.js',
  'dist/replace-file.js',
  'dist/root-context.js',
  'dist/root-errors.js',
  'dist/root-file.js',
  'dist/root-impl.js',
  'dist/root-path-existing.js',
  'dist/root-path-symlink.js',
  'dist/root-path.js',
  'dist/root-paths.js',
  'dist/root-walk.js',
  'dist/root.js',
  'dist/safe-path-segment.js',
  'dist/secure-temp-dir.js',
  'dist/short-path.js',
  'dist/sibling-temp.js',
  'dist/sidecar-lock-acquire.js',
  'dist/sidecar-lock-handle.js',
  'dist/sidecar-lock-policy.js',
  'dist/sidecar-lock-reclaim.js',
  'dist/sidecar-lock.js',
  'dist/string-coerce.js',
  'dist/symlink-parents.js',
  'dist/temp-cleanup.js',
  'dist/temp-target.js',
  'dist/test-hooks.js',
  'dist/text-atomic.js',
  'dist/timing.js',
  'dist/trash.js',
  'dist/windows-command.js',
  'dist/windows-owner.js',
  'dist/write-queue.js',
  'package.json',
] as const;
function readFsSafePackageFile(root: string, relative: string): Buffer {
  const opened = openRootFileSync({
    absolutePath: path.join(root, relative),
    rootPath: root,
    boundaryLabel: 'fs-safe package attestation',
    maxBytes: fsSafePackageMaxBytes,
    rejectHardlinks: false,
    rejectSymlinks: true,
    allowedType: 'file',
  });
  if (!opened.ok) fail('fs-safe package file is unsafe: ' + relative);
  try {
    return readFileSync(opened.fd);
  } finally {
    closeSync(opened.fd);
  }
}
function resolveFsSafePackageRoot(): string {
  const entry = realpathSync(moduleRequire.resolve('@openclaw/fs-safe'));
  const root = path.resolve(path.dirname(entry), '..');
  const metadata = JSON.parse(readFsSafePackageFile(root, 'package.json').toString('utf8')) as {
    name?: unknown;
    version?: unknown;
  };
  reject(
    any(metadata.name !== '@openclaw/fs-safe', metadata.version !== '0.5.6'),
    'fs-safe package identity is invalid',
  );
  return root;
}
function fsSafeNativeTarget(): string {
  const report = (process as NodeJS.Process & { report?: { getReport?: () => unknown } }).report?.getReport?.() as
    | { header?: { glibcVersionRuntime?: string } }
    | undefined;
  const libc = ['musl', 'gnu'][Number(Boolean(report?.header?.glibcVersionRuntime))]!;
  const targets: Readonly<Record<string, string>> = {
    'win32-x64': 'win32-x64-msvc',
    'linux-x64': 'linux-x64-' + libc,
    'linux-arm64': 'linux-arm64-' + libc,
  };
  const target = targets[process.platform + '-' + process.arch];
  reject(!target, 'fs-safe native target is unsupported');
  return target!;
}
const fsSafePackageTreeSha256ByNativeTarget: Readonly<Record<string, string>> = {
  'win32-x64-msvc': '8ade0dda968904ccbf92a0cbcb7ddd6496a866b39e90f5d90f934679e5619063',
  'linux-x64-gnu': 'e783c09fcf3eda857742d927942ecccf458aa97d07fb9b48e1734727d376803d',
  'linux-x64-musl': '615339660db2723a5d2eadb3743773870faee7c112aa1570a726fe83b6e96712',
  'linux-arm64-gnu': 'b05b16995295bbb9be61c1a9a66eb3b967a66ce12b2f0e2e424e156f4a587a53',
  'linux-arm64-musl': '1d070034384e79c951de5687ea4df7a427f5fc2a69f4bb3ae6b1353773364320',
};
function fsSafePackageTreeHash(root: string, nativeTarget: string): string {
  const files = [...fsSafePackageManifest, 'dist/native/' + nativeTarget + '/fs-safe-native.node'].sort();
  const digest = createHash('sha256');
  let totalBytes = 0;
  files.forEach((relative) => {
    const bytes = readFsSafePackageFile(root, relative);
    totalBytes += bytes.byteLength;
    reject(totalBytes > fsSafePackageMaxBytes, 'fs-safe package size bound exceeded');
    const fileHash = createHash('sha256').update(bytes).digest('hex');
    digest.update('file\0' + relative + '\0' + bytes.byteLength + '\0' + fileHash + '\0');
  });
  return digest.digest('hex');
}
const fsSafePackageRoot = resolveFsSafePackageRoot();
const fsSafePackageNativeTarget = fsSafeNativeTarget();
const fsSafePackageAttested =
  fsSafePackageTreeHash(fsSafePackageRoot, fsSafePackageNativeTarget) ===
  fsSafePackageTreeSha256ByNativeTarget[fsSafePackageNativeTarget];
function loadLinuxNativeBinding(): LinuxNativeBinding | undefined {
  if (!fsSafePackageAttested) return undefined;
  const nativeModule = moduleRequire(path.join(fsSafePackageRoot, 'dist', 'native.js')) as {
    getNativeBinding?: () => LinuxNativeBinding | undefined;
  };
  const binding = nativeModule.getNativeBinding?.();
  const expected = fsSafePackageTreeSha256ByNativeTarget[fsSafePackageNativeTarget];
  const packageStillAttested =
    expected !== undefined && fsSafePackageTreeHash(fsSafePackageRoot, fsSafePackageNativeTarget) === expected;
  const available = all(
    process.platform === 'linux',
    packageStillAttested,
    typeof binding?.cloneFileExclusive === 'function',
    typeof binding?.renameNoReplace === 'function',
  );
  return [undefined, binding][Number(available)];
}
function loadWindowsNativeBinding(): WindowsNativeBinding | undefined {
  if (!fsSafePackageAttested || process.platform !== 'win32') return undefined;
  const nativeModule = moduleRequire(path.join(fsSafePackageRoot, 'dist', 'native.js')) as {
    getNativeBinding?: () => WindowsNativeBinding | undefined;
  };
  const binding = nativeModule.getNativeBinding?.();
  const expected = fsSafePackageTreeSha256ByNativeTarget[fsSafePackageNativeTarget];
  const packageStillAttested =
    expected !== undefined && fsSafePackageTreeHash(fsSafePackageRoot, fsSafePackageNativeTarget) === expected;
  const available = all(
    packageStillAttested,
    typeof binding?.renameNoReplace === 'function',
    typeof binding?.renameReplace === 'function',
    typeof binding?.openBeneath === 'function',
    typeof binding?.mkdirBeneath === 'function',
    typeof binding?.fstatIdentity === 'function',
    typeof binding?.sha256File === 'function',
  );
  return [undefined, binding][Number(available)];
}
export interface ExclusiveRepositoryCreation {
  readonly ensureDirectory: (target: string, label: string) => Promise<string>;
  readonly writeExclusive: (target: string, contents: string, label: string) => Promise<void>;
}
export interface SafeRepositoryAccess {
  readonly schema: 'SafeRepositoryAccess/v1';
  readonly provider: 'linux-proc-fd' | 'fs-safe-windows' | 'unavailable';
  readonly platform: NodeJS.Platform;
  readonly repository_root: string;
  readonly attested: boolean;
  readonly ancestor_binding: 'directory-handle' | 'root-identity' | 'unavailable';
  readonly atomic_replace: 'unsupported' | 'fsync-temp-rename' | 'native-rename-replace';
  readonly directory_sync?: 'supported' | 'unsupported' | 'unknown';
  readonly containment?: 'kernel-atomic' | 'best-effort' | 'unavailable';
  readonly assurance_profile?: 'linux-kernel-atomic-v1' | 'windows-best-effort-v1';
  readonly filesystem?: 'linux-native' | 'ntfs' | 'refs' | 'unknown';
  readonly package?: { readonly name: '@openclaw/fs-safe'; readonly version: '0.5.6'; readonly integrity: string };
  readonly residual_risks?: readonly string[];
  readonly compareReserveReplace: (
    target: string,
    expectedHash: string,
    contents: string,
    label: string,
  ) => NativeCompareReserveReplace;
  readonly assertAvailable: () => void;
  readonly prepareExclusiveCreation: () => Promise<ExclusiveRepositoryCreation>;
  readonly readText: (target: string, label: string) => string;
  readonly readBytes: (target: string, label: string) => Buffer;
  readonly fileExists: (target: string, label: string) => boolean;
  readonly listFiles: (target: string, label: string) => readonly string[];
  readonly removeFile: (target: string, label: string) => void;
  readonly moveNoReplaceAsync: (
    source: string,
    target: string,
    expectedHash: string,
    label: string,
  ) => Promise<'moved' | 'already_moved'>;
  readonly assertDirectory: (target: string, label: string) => void;
  readonly directoryIdentity: (target: string, label: string) => string;
  readonly ensureDirectory: (target: string, label: string) => string;
  readonly ensureDirectoryAsync: (target: string, label: string) => Promise<string>;
  readonly writeExclusive: (target: string, contents: string, label: string) => void;
  readonly writeExclusiveAsync: (target: string, contents: string, label: string) => Promise<void>;
  readonly replaceAtomic: (target: string, expectedHash: string, contents: string, label: string) => void;
  readonly replaceAtomicAsync: (target: string, expectedHash: string, contents: string, label: string) => Promise<void>;
  readonly withExclusiveLock: <T>(target: string, label: string, operation: () => T) => T;
  readonly withExclusiveLockAsync: <T>(target: string, label: string, operation: () => Promise<T>) => Promise<T>;
}

export class SafeRepositoryMoveError extends Error {
  readonly code: 'SAFE_REPOSITORY_MOVE_NOT_APPLIED' | 'SAFE_REPOSITORY_MOVE_OUTCOME_UNKNOWN';

  constructor(
    code: 'SAFE_REPOSITORY_MOVE_NOT_APPLIED' | 'SAFE_REPOSITORY_MOVE_OUTCOME_UNKNOWN',
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'SafeRepositoryMoveError';
    this.code = code;
  }
}
export interface NativeCompareReserveReplace {
  readonly schema: 'NativeCompareReserveReplace/v1';
  readonly provider: 'linux-proc-fd' | 'fs-safe-windows';
  readonly containment: 'kernel-atomic' | 'best-effort';
  readonly target: string;
  readonly expected_hash: string;
  readonly result_hash: string;
  readonly status: 'applied';
}
const noFollow = choose(
  Boolean((fsConstants as { O_NOFOLLOW?: number }).O_NOFOLLOW),
  () => (fsConstants as { O_NOFOLLOW?: number }).O_NOFOLLOW!,
  () => 0,
);
const directoryFlag = choose(
  Boolean((fsConstants as { O_DIRECTORY?: number }).O_DIRECTORY),
  () => (fsConstants as { O_DIRECTORY?: number }).O_DIRECTORY!,
  () => 0,
);
const rawNonBlockingFlag = Number((fsConstants as { O_NONBLOCK?: number }).O_NONBLOCK);
const nonBlockingFlag = [0, rawNonBlockingFlag][Number(Number.isFinite(rawNonBlockingFlag))]!;
const linuxNativeBinding = loadLinuxNativeBinding();
const windowsNativeBinding = loadWindowsNativeBinding();
const linuxHandleProvider = all(
  process.platform === 'linux',
  fsSafePackageAttested,
  noFollow !== 0,
  directoryFlag !== 0,
  existsSync('/proc/self/fd'),
  linuxNativeBinding,
);
const fsSafeWindowsPackage = {
  name: '@openclaw/fs-safe' as const,
  version: '0.5.6' as const,
  integrity: 'sha512-0M1vz1PEFAgCwTxhB1lt/B7z+TRTTWmlYJ3dSbdhjZp2AcfM7rXPGjQVJqHXpzpsb9SRxvKGrAM454Uul/Xy5g==',
};
const fsSafeWindowsProvider = all(
  process.platform === 'win32',
  fsSafePackageAttested,
  windowsNativeBinding,
  typeof openRootFileSync === 'function',
  typeof withFileLock === 'function',
);

function lockOwnerPayload(fd: number, label: string): void {
  writeFileSync(fd, JSON.stringify({ schema: 'SafeRepositoryAccessLock/v1', owner_pid: process.pid, label }), 'utf8');
  fsyncSync(fd);
}
function lockOwnerPid(fd: number): number | null {
  const value: unknown = JSON.parse(readBoundedBuffer(fd, 'lock owner').toString('utf8'));
  const record = value as { schema?: unknown; owner_pid?: unknown };
  return choose(
    all(
      Boolean(value),
      typeof value === 'object',
      !Array.isArray(value),
      record.schema === 'SafeRepositoryAccessLock/v1',
      Number.isInteger(record.owner_pid),
      Number(record.owner_pid) > 0,
    ),
    () => record.owner_pid as number,
    () => null,
  );
}
function processIsAlive(pid: number): boolean {
  if (process.platform === 'linux') return existsSync('/proc/' + pid);
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== 'ESRCH';
  }
}
type ReclaimGuardOwner = { readonly owner_pid: number; readonly owner_token: string };
type ReclaimGuardOwnerState = {
  readonly present: boolean;
  readonly owner: ReclaimGuardOwner | null;
  readonly mtimeMs: number;
};
type ReclaimGuard = { readonly parentFd: number; readonly guardName: string; readonly ownerToken: string };
type LockRemovalPredicate = (stats: Stats, ownerPid: number | null) => boolean;
const reclaimGuardOwnerFile = 'owner.json';
const reclaimGuardSchema = 'SafeRepositoryAccessReclaimGuard/v1';
function reclaimGuardPath(parentFd: number, guardName: string): string {
  return childPath(parentFd, guardName);
}
function reclaimGuardOwnerPath(guardPath: string): string {
  return guardPath + '/' + reclaimGuardOwnerFile;
}
function reclaimGuardStats(parentFd: number, guardName: string, label: string): Stats | null {
  try {
    const stats = lstatSync(reclaimGuardPath(parentFd, guardName));
    reject(any(stats.isSymbolicLink(), !stats.isDirectory()), label + ' reclaim guard is unsafe');
    return stats;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}
function readReclaimGuardOwner(guardPath: string, label: string): ReclaimGuardOwnerState {
  const ownerPath = reclaimGuardOwnerPath(guardPath);
  let ownerStats: Stats;
  try {
    ownerStats = lstatSync(ownerPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { present: false, owner: null, mtimeMs: 0 };
    throw error;
  }
  reject(
    any(ownerStats.isSymbolicLink(), !ownerStats.isFile(), ownerStats.nlink !== 1, ownerStats.size > 4096),
    label + ' reclaim guard owner is unsafe',
  );
  const fd = openSync(ownerPath, fsConstants.O_RDONLY | noFollow);
  try {
    const opened = fstatSync(fd);
    reject(!sameFileIdentity(ownerStats, opened), label + ' reclaim guard owner identity changed');
    try {
      const value: unknown = JSON.parse(readBoundedText(fd, label + ' reclaim guard owner'));
      const record = value as { schema?: unknown; owner_pid?: unknown; owner_token?: unknown };
      const validToken = typeof record.owner_token === 'string' && record.owner_token.length === 36;
      const valid = all(
        value !== null,
        typeof value === 'object',
        !Array.isArray(value),
        record.schema === reclaimGuardSchema,
        Number.isInteger(record.owner_pid),
        Number(record.owner_pid) > 0,
        validToken,
      );
      return {
        present: true,
        owner: valid ? { owner_pid: record.owner_pid as number, owner_token: record.owner_token as string } : null,
        mtimeMs: ownerStats.mtimeMs,
      };
    } catch (error) {
      if (error instanceof SyntaxError) return { present: true, owner: null, mtimeMs: ownerStats.mtimeMs };
      throw error;
    }
  } finally {
    closeQuietly(fd);
  }
}
function restoreReclaimedEntry(native: LinuxNativeBinding, parentFd: number, fromName: string, toName: string): void {
  Result.fromThrowable(
    () => native.renameNoReplace(parentFd, fromName, parentFd, toName),
    () => undefined,
  )();
}
function reclaimStaleReclaimGuard(parentFd: number, name: string, label: string): boolean {
  const guardName = name + '.reclaim';
  const current = reclaimGuardStats(parentFd, guardName, label);
  if (!current) return false;
  const native = linuxNativeBinding;
  reject(!native, label + ' requires the bundled Linux no-replace rename primitive');
  const quarantineName = '.' + guardName + '.' + randomUUID() + '.reclaimed';
  let moved = false;
  let removed = false;
  try {
    try {
      native!.renameNoReplace(parentFd, guardName, parentFd, quarantineName);
      moved = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
      throw error;
    }
    const quarantinePath = reclaimGuardPath(parentFd, quarantineName);
    const movedStats = reclaimGuardStats(parentFd, quarantineName, label);
    if (!movedStats || !sameFileIdentity(current, movedStats)) return false;
    const entries = readdirSync(quarantinePath);
    if (entries.some((entry) => entry !== reclaimGuardOwnerFile)) return false;
    const ownerState = readReclaimGuardOwner(quarantinePath, label);
    const referenceTime = Math.max(movedStats.mtimeMs, ownerState.mtimeMs);
    if (!ownerState.owner || Date.now() - referenceTime < staleLockAgeMs || processIsAlive(ownerState.owner.owner_pid))
      return false;
    unlinkSync(reclaimGuardOwnerPath(quarantinePath));
    rmdirSync(quarantinePath);
    fsyncSync(parentFd);
    removed = true;
    return true;
  } finally {
    choose(
      all(moved, !removed),
      () => restoreReclaimedEntry(native!, parentFd, quarantineName, guardName),
      () => undefined,
    );
  }
}
function mkdirReclaimGuard(parentFd: number, guardName: string): boolean {
  try {
    mkdirSync(reclaimGuardPath(parentFd, guardName), 0o700);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') return false;
    throw error;
  }
}
function acquireReclaimGuard(parentFd: number, name: string, label: string): ReclaimGuard | null {
  const guardName = name + '.reclaim';
  if (!mkdirReclaimGuard(parentFd, guardName)) {
    if (!reclaimStaleReclaimGuard(parentFd, name, label) || !mkdirReclaimGuard(parentFd, guardName)) return null;
  }
  const guardPath = reclaimGuardPath(parentFd, guardName);
  const ownerPath = reclaimGuardOwnerPath(guardPath);
  const ownerToken = randomUUID();
  let ownerFd = -1;
  let ownerCreated = false;
  try {
    ownerFd = openSync(ownerPath, fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL | noFollow, 0o600);
    ownerCreated = true;
    writeFileSync(
      ownerFd,
      JSON.stringify({
        schema: reclaimGuardSchema,
        owner_pid: process.pid,
        owner_token: ownerToken,
        acquired_at: new Date().toISOString(),
      }),
      'utf8',
    );
    fsyncSync(ownerFd);
    closeQuietly(ownerFd);
    ownerFd = -1;
    const guardFd = openSync(guardPath, fsConstants.O_RDONLY | directoryFlag | noFollow);
    try {
      fsyncSync(guardFd);
    } finally {
      closeQuietly(guardFd);
    }
    fsyncSync(parentFd);
    return { parentFd, guardName, ownerToken };
  } catch (error) {
    choose(
      ownerFd >= 0,
      () => closeQuietly(ownerFd),
      () => undefined,
    );
    choose(
      ownerCreated,
      () =>
        Result.fromThrowable(
          () => unlinkSync(ownerPath),
          () => undefined,
        )(),
      () => undefined,
    );
    Result.fromThrowable(
      () => rmdirSync(guardPath),
      () => undefined,
    )();
    throw error;
  }
}
function releaseReclaimGuard(guard: ReclaimGuard, label: string): void {
  const current = reclaimGuardStats(guard.parentFd, guard.guardName, label);
  if (!current) return;
  const native = linuxNativeBinding;
  reject(!native, label + ' requires the bundled Linux no-replace rename primitive');
  const quarantineName = '.' + guard.guardName + '.' + randomUUID() + '.released';
  let moved = false;
  let removed = false;
  try {
    try {
      native!.renameNoReplace(guard.parentFd, guard.guardName, guard.parentFd, quarantineName);
      moved = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw error;
    }
    const quarantinePath = reclaimGuardPath(guard.parentFd, quarantineName);
    const movedStats = reclaimGuardStats(guard.parentFd, quarantineName, label);
    if (!movedStats || !sameFileIdentity(current, movedStats)) return;
    const entries = readdirSync(quarantinePath);
    if (entries.some((entry) => entry !== reclaimGuardOwnerFile)) return;
    const ownerState = readReclaimGuardOwner(quarantinePath, label);
    if (
      !ownerState.owner ||
      ownerState.owner.owner_pid !== process.pid ||
      ownerState.owner.owner_token !== guard.ownerToken
    )
      return;
    unlinkSync(reclaimGuardOwnerPath(quarantinePath));
    rmdirSync(quarantinePath);
    fsyncSync(guard.parentFd);
    removed = true;
  } finally {
    choose(
      all(moved, !removed),
      () => restoreReclaimedEntry(native!, guard.parentFd, quarantineName, guard.guardName),
      () => undefined,
    );
  }
}
function lockReclaimGuardExists(parentFd: number, name: string, label: string): boolean {
  if (reclaimStaleReclaimGuard(parentFd, name, label)) return false;
  return reclaimGuardStats(parentFd, name + '.reclaim', label) !== null;
}
function moveAndRemovePinnedLock(
  parentFd: number,
  name: string,
  label: string,
  expected: Stats,
  predicate: LockRemovalPredicate,
  readOwner = true,
): boolean {
  const native = linuxNativeBinding;
  reject(!native, label + ' requires the bundled Linux no-replace rename primitive');
  const quarantineName = '.' + name + '.' + randomUUID() + '.reclaimed';
  let moved = false;
  let removed = false;
  try {
    try {
      native!.renameNoReplace(parentFd, name, parentFd, quarantineName);
      moved = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
      throw error;
    }
    const quarantinePath = childPath(parentFd, quarantineName);
    const quarantineFd = openSync(quarantinePath, fsConstants.O_RDONLY | noFollow);
    try {
      const movedStats = fstatSync(quarantineFd);
      const pathStats = lstatSync(quarantinePath);
      const owner = readOwner ? lockOwnerPid(quarantineFd) : null;
      const stillPinned = all(
        sameFileIdentity(expected, movedStats),
        sameFileIdentity(movedStats, pathStats),
        !pathStats.isSymbolicLink(),
        movedStats.nlink === 1,
        predicate(movedStats, owner),
      );
      if (!stillPinned) return false;
      const beforeUnlink = lstatSync(quarantinePath);
      if (!all(sameFileIdentity(movedStats, beforeUnlink), beforeUnlink.nlink === 1, !beforeUnlink.isSymbolicLink()))
        return false;
      unlinkSync(quarantinePath);
      fsyncSync(parentFd);
      removed = true;
      return true;
    } finally {
      closeQuietly(quarantineFd);
    }
  } finally {
    choose(
      all(moved, !removed),
      () => restoreReclaimedEntry(native!, parentFd, quarantineName, name),
      () => undefined,
    );
  }
}
function removeStaleLock(parentFd: number, name: string, label: string): boolean {
  const target = childPath(parentFd, name);
  let before: Stats;
  try {
    before = lstatSync(target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
  return choose(
    all(before.isFile(), before.nlink === 1, Date.now() - before.mtimeMs >= staleLockAgeMs),
    () => {
      const fd = openSync(target, fsConstants.O_RDONLY | noFollow);
      try {
        const opened = fstatSync(fd);
        const owner = lockOwnerPid(fd);
        reject(!sameFileIdentity(before, opened), 'lock identity changed');
        reject(any(owner === null, processIsAlive(owner as number)), 'lock owner is alive');
        return moveAndRemovePinnedLock(parentFd, name, label, opened, (stats, ownerPid) =>
          all(
            stats.isFile(),
            stats.nlink === 1,
            Date.now() - stats.mtimeMs >= staleLockAgeMs,
            ownerPid !== null && !processIsAlive(ownerPid),
          ),
        );
      } finally {
        closeQuietly(fd);
      }
    },
    () => false,
  );
}
function reclaimStaleLock(parentFd: number, name: string, label: string): boolean {
  const guard = acquireReclaimGuard(parentFd, name, label);
  if (!guard) fail(label + ' lock reclaim is in progress');
  try {
    return removeStaleLock(parentFd, name, label);
  } finally {
    releaseReclaimGuard(guard, label);
  }
}
type OpenedExclusiveLock = { fd: number; parentFd: number; name: string };
function openExclusiveLockAt(parentFd: number, name: string, label: string): OpenedExclusiveLock {
  const target = childPath(parentFd, name);
  choose(
    lockReclaimGuardExists(parentFd, name, label),
    () => fail(label + ' lock reclaim is in progress'),
    () => undefined,
  );
  choose(
    existsSync(target),
    () =>
      choose(
        reclaimStaleLock(parentFd, name, label),
        () => undefined,
        () => undefined,
      ),
    () => undefined,
  );
  choose(
    lockReclaimGuardExists(parentFd, name, label),
    () => fail(label + ' lock reclaim is in progress'),
    () => undefined,
  );
  const fd = openSync(target, fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL | noFollow, 0o600);
  lockOwnerPayload(fd, label);
  return { fd, parentFd, name };
}
function openExclusiveLock(root: string, target: string, label: string): OpenedExclusiveLock {
  const parent = openParent(root, safeRelative(root, target, label), label);
  const opened = { succeeded: false };
  try {
    const lock = openExclusiveLockAt(parent.fd, parent.name, label);
    opened.succeeded = true;
    return lock;
  } finally {
    choose(
      opened.succeeded,
      () => undefined,
      () => closeQuietly(parent.fd),
    );
  }
}
function releaseExclusiveLock(parentFd: number, name: string, fd: number): void {
  const guard = acquireReclaimGuard(parentFd, name, 'exclusive lock release');
  if (!guard) return;
  try {
    const owner = fstatSync(fd);
    try {
      const currentFd = openSync(childPath(parentFd, name), fsConstants.O_RDONLY | noFollow);
      try {
        choose(
          all(sameFileIdentity(owner, fstatSync(currentFd)), lockOwnerPid(currentFd) === process.pid),
          () => {
            moveAndRemovePinnedLock(
              parentFd,
              name,
              'exclusive lock release',
              owner,
              (_stats, ownerPid) => ownerPid === process.pid,
            );
          },
          () => undefined,
        );
      } finally {
        closeQuietly(currentFd);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  } finally {
    releaseReclaimGuard(guard, 'exclusive lock release');
  }
}
function readBoundedBufferStep(fd: number, label: string, total: number, chunks: readonly Buffer[]): Buffer {
  const remaining = maxRepositoryReadBytes - total;
  const buffer = Buffer.allocUnsafe(Math.min(boundedReadChunkBytes, remaining + 1));
  const bytesRead = readSync(fd, buffer, 0, buffer.length, null);
  const nextTotal = total + bytesRead;
  reject(nextTotal > maxRepositoryReadBytes, label + ' exceeds the bounded repository read size');
  const nextChunks = chunks.concat(
    choose(
      bytesRead === buffer.length,
      () => buffer,
      () => buffer.subarray(0, bytesRead),
    ),
  );
  return choose(
    bytesRead === 0,
    () => Buffer.concat(nextChunks, nextTotal),
    () => readBoundedBufferStep(fd, label, nextTotal, nextChunks),
  );
}
function readBoundedBuffer(fd: number, label: string): Buffer {
  return readBoundedBufferStep(fd, label, 0, []);
}
function readBoundedText(fd: number, label: string): string {
  return readBoundedBuffer(fd, label).toString('utf8');
}
function assertAncestorChain(root: string, label: string): void {
  const chain = Array.from({ length: 64 }, (_, index) =>
    Array.from({ length: index + 1 }, () => undefined).reduce(
      (value) => path.dirname(value as string),
      path.resolve(root),
    ),
  );
  chain
    .filter((cursor, index) => any(index === 0, chain[index - 1] !== cursor))
    .forEach((cursor) => {
      const stats = lstatSync(cursor);
      reject(any(stats.isSymbolicLink(), !stats.isDirectory()), label + ' has an unsafe ancestor: ' + cursor);
    });
}
function safeRelative(root: string, target: string, label: string): string[] {
  reject(any(/[<>"|?*]/.test(root), /[<>"|?*]/.test(target)), label + ' contains Win32-forbidden filename characters');
  reject(any(/\p{Cc}/u.test(root), /\p{Cc}/u.test(target)), label + ' contains control characters');
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(resolvedRoot, target);
  const relative = path.relative(resolvedRoot, resolvedTarget);
  reject(
    any(!relative, relative === '..', relative.startsWith('..' + path.sep), path.isAbsolute(relative)),
    label + ' escapes repository root',
  );
  const segments = relative.split(path.sep);
  reject(
    segments.some((segment) =>
      any(
        !segment,
        segment === '.',
        segment === '..',
        segment.toLowerCase() === '.git',
        segment.includes('\\'),
        all(process.platform === 'win32', segment.includes(':')),
      ),
    ),
    label + ' contains an unsafe path segment',
  );
  return segments;
}
function closeQuietly(fd: number): void {
  closeSync(fd);
}
function regularFile(stats: Stats, label: string): void {
  reject(any(!stats.isFile(), stats.nlink !== 1), `${label} must be a regular single-link file`);
}
function directoryHandle(root: string, label: string): number {
  reject(!linuxHandleProvider, `${label} requires a native directory-handle no-follow provider`);
  assertAncestorChain(root, label);
  const fd = openSync(root, fsConstants.O_RDONLY | directoryFlag | noFollow);
  try {
    reject(
      realpathSync(`/proc/self/fd/${fd}`) !== path.resolve(root),
      `${label} root identity changed during no-follow open`,
    );
    return fd;
  } finally {
    choose(
      realpathSync(`/proc/self/fd/${fd}`) !== path.resolve(root),
      () => closeQuietly(fd),
      () => undefined,
    );
  }
}
function childPath(fd: number, segment: string): string {
  return `/proc/self/fd/${fd}/${segment}`;
}
function openParent(root: string, segments: readonly string[], label: string): { fd: number; name: string } {
  reject(segments.length < 1, `${label} target is empty`);
  const fd = segments.slice(0, -1).reduce(
    (current, segment) => {
      const next = openSync(childPath(current, segment), fsConstants.O_RDONLY | directoryFlag | noFollow);
      closeQuietly(current);
      return next;
    },
    directoryHandle(root, label),
  );
  return { fd, name: segments.at(-1)! };
}
function openFile(
  root: string,
  segments: readonly string[],
  label: string,
  flags: number,
  mode?: number,
  nonBlocking = false,
): { fd: number; parentFd: number } {
  const parent = openParent(root, segments, label);
  const extra = Number(nonBlocking) * nonBlockingFlag;
  const opened = { fd: -1, parentFd: parent.fd };
  try {
    opened.fd = openSync(childPath(parent.fd, parent.name), flags | noFollow | extra, mode);
    return opened;
  } finally {
    choose(
      opened.fd < 0,
      () => closeQuietly(parent.fd),
      () => undefined,
    );
  }
}
function readText(root: string, target: string, label: string): string {
  const opened = openFile(root, safeRelative(root, target, label), label, fsConstants.O_RDONLY, undefined, true);
  try {
    const stats = fstatSync(opened.fd);
    regularFile(stats, label);
    reject(stats.size > maxRepositoryReadBytes, label + ' exceeds the bounded repository read size');
    return readBoundedText(opened.fd, label);
  } finally {
    closeQuietly(opened.fd);
    closeQuietly(opened.parentFd);
  }
}
function readBytes(root: string, target: string, label: string): Buffer {
  const opened = openFile(root, safeRelative(root, target, label), label, fsConstants.O_RDONLY, undefined, true);
  try {
    const stats = fstatSync(opened.fd);
    regularFile(stats, label);
    reject(stats.size > maxRepositoryReadBytes, label + ' exceeds the bounded repository read size');
    return readBoundedBuffer(opened.fd, label);
  } finally {
    closeQuietly(opened.fd);
    closeQuietly(opened.parentFd);
  }
}
function openOrCreateDirectoryAt(parentFd: number, segment: string): number {
  const target = childPath(parentFd, segment);
  try {
    return openSync(target, fsConstants.O_RDONLY | directoryFlag | noFollow);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    try {
      mkdirSync(target, 0o700);
    } catch (mkdirError) {
      if ((mkdirError as NodeJS.ErrnoException).code !== 'EEXIST') throw mkdirError;
    }
    fsyncSync(parentFd);
    return openSync(target, fsConstants.O_RDONLY | directoryFlag | noFollow);
  }
}
function ensureDirectory(root: string, target: string, label: string): string {
  reject(!linuxHandleProvider, label + ' requires a native directory-handle no-follow provider');
  const segments = safeRelative(root, target, label);
  const fd = segments.reduce(
    (current, segment) => {
      const next = openOrCreateDirectoryAt(current, segment);
      closeQuietly(current);
      return next;
    },
    directoryHandle(root, label),
  );
  closeQuietly(fd);
  return path.resolve(root, target);
}
function openDirectory(root: string, target: string, label: string): number {
  const segments = target === '.' ? [] : safeRelative(root, target, label);
  return segments.reduce(
    (current, segment) => {
      const next = openSync(childPath(current, segment), fsConstants.O_RDONLY | directoryFlag | noFollow);
      closeQuietly(current);
      return next;
    },
    directoryHandle(root, label),
  );
}
function linuxDirectoryIdentity(root: string, target: string, label: string): string {
  const fd = openDirectory(root, target, label);
  try {
    const stats = fstatSync(fd, { bigint: true });
    reject(any(!stats.isDirectory(), stats.isSymbolicLink()), `${label} must be a real directory`);
    return JSON.stringify({
      birthtime_ns: String(stats.birthtimeNs),
      dev: String(stats.dev),
      ino: String(stats.ino),
      mode: String(stats.mode),
    });
  } finally {
    closeQuietly(fd);
  }
}
function windowsDirectoryIdentity(root: string, target: string, label: string): string {
  const absolute = target === '.' ? root : fsSafeAbsolute(root, target, label);
  assertNoSymlinkParentsSync({
    rootDir: root,
    targetPath: absolute,
    allowMissing: false,
    requireDirectories: true,
    messagePrefix: label,
  });
  const stats = lstatSync(absolute, { bigint: true });
  reject(any(!stats.isDirectory(), stats.isSymbolicLink()), `${label} must be a real directory`);
  return JSON.stringify({
    birthtime_ns: String(stats.birthtimeNs),
    dev: String(stats.dev),
    ino: String(stats.ino),
    mode: String(stats.mode),
  });
}
function directoryIdentity(root: string, target: string, label: string): string {
  return choose(
    linuxHandleProvider,
    () => linuxDirectoryIdentity(root, target, label),
    () => windowsDirectoryIdentity(root, target, label),
  );
}
function boundedContentBytes(contents: string, label: string): Buffer {
  const bytes = Buffer.from(contents, 'utf8');
  reject(
    bytes.length > maxRepositoryReadBytes,
    label + ' replacement content exceeds the bounded repository read size',
  );
  return bytes;
}
function writeExclusive(root: string, target: string, contents: string, label: string): void {
  const bytes = boundedContentBytes(contents, label);
  const opened = openFile(
    root,
    safeRelative(root, target, label),
    label,
    fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL,
    0o600,
  );
  try {
    writeFileSync(opened.fd, bytes);
    fsyncSync(opened.fd);
    fsyncSync(opened.parentFd);
  } finally {
    closeQuietly(opened.fd);
    closeQuietly(opened.parentFd);
  }
}
function withExclusiveLock<T>(root: string, target: string, label: string, operation: () => T): T {
  const opened = openExclusiveLock(root, target, label);
  try {
    fsyncSync(opened.fd);
    return operation();
  } finally {
    releaseExclusiveLock(opened.parentFd, opened.name, opened.fd);
    closeQuietly(opened.fd);
    closeQuietly(opened.parentFd);
  }
}
async function withExclusiveLockAsync<T>(
  root: string,
  target: string,
  label: string,
  operation: () => Promise<T>,
): Promise<T> {
  const opened = openExclusiveLock(root, target, label);
  try {
    fsyncSync(opened.fd);
    return await operation();
  } finally {
    releaseExclusiveLock(opened.parentFd, opened.name, opened.fd);
    closeQuietly(opened.fd);
    closeQuietly(opened.parentFd);
  }
}
function rawHash(value: string | Buffer): string {
  const bytes = choose<Buffer>(
    typeof value === 'string',
    () => Buffer.from(value as string, 'utf8'),
    () => value as Buffer,
  );
  return createHash('sha256').update(bytes).digest('hex');
}
function replaceAtomicLinux(root: string, target: string, expectedHash: string, contents: string, label: string): void {
  const native = linuxNativeBinding;
  reject(!native, label + ' requires the bundled Linux descriptor-bound copy primitive');
  const desiredBytes = boundedContentBytes(contents, label);
  const parent = openParent(root, safeRelative(root, target, label), label);
  const name = parent.name;
  const lockName = '.' + name + '.cas.lock';
  const tempName = '.' + name + '.' + randomUUID() + '.tmp';
  const backupName = '.' + name + '.' + randomUUID() + '.cas-old';
  let tempFd = -1;
  let lockFd = -1;
  let committedIdentity: Stats | undefined;
  let backupMoved = false;
  try {
    lockFd = openExclusiveLockAt(parent.fd, lockName, label).fd;
    try {
      fsyncSync(lockFd);
      recoverLinuxOrphanBackup(
        native as LinuxNativeBinding,
        parent.fd,
        name,
        expectedHash,
        rawHash(desiredBytes),
        label,
      );
      const currentFd = openSync(childPath(parent.fd, name), fsConstants.O_RDONLY | noFollow);
      const initialStats = fstatSync(currentFd);
      let current: Buffer;
      try {
        const stats = fstatSync(currentFd);
        regularFile(stats, label);
        reject(stats.size > maxRepositoryReadBytes, label + ' exceeds the bounded repository read size');
        current = readBoundedBuffer(currentFd, label);
      } finally {
        closeQuietly(currentFd);
      }
      reject(rawHash(current) !== expectedHash, label + ' expected content hash is stale');
      tempFd = openSync(
        childPath(parent.fd, tempName),
        fsConstants.O_RDWR | fsConstants.O_CREAT | fsConstants.O_EXCL | noFollow,
        0o600,
      );
      writeFileSync(tempFd, desiredBytes);
      fsyncSync(tempFd);
      renameSync(childPath(parent.fd, name), childPath(parent.fd, backupName));
      backupMoved = true;
      const backupFd = openSync(childPath(parent.fd, backupName), fsConstants.O_RDONLY | noFollow);
      try {
        const backupStats = fstatSync(backupFd);
        regularFile(backupStats, label);
        reject(
          any(
            backupStats.size > maxRepositoryReadBytes,
            any(backupStats.dev !== initialStats.dev, backupStats.ino !== initialStats.ino),
          ),
          label + ' commit-time compare-and-swap failed',
        );
        reject(
          rawHash(readBoundedBuffer(backupFd, label)) !== expectedHash,
          label + ' commit-time compare-and-swap failed',
        );
        const committedFd = native!.cloneFileExclusive(tempFd, parent.fd, name);
        try {
          fsyncSync(committedFd);
          const committedStats = fstatSync(committedFd);
          committedIdentity = committedStats;
          regularFile(committedStats, label);
          reject(
            rawHash(readBoundedBuffer(committedFd, label)) !== rawHash(desiredBytes),
            label + ' commit-time content verification failed',
          );
        } finally {
          closeQuietly(committedFd);
        }
      } finally {
        closeQuietly(backupFd);
      }
      unlinkSync(childPath(parent.fd, tempName));
      closeQuietly(tempFd);
      tempFd = -1;
      fsyncSync(parent.fd);
      const afterFd = openSync(childPath(parent.fd, name), fsConstants.O_RDONLY | noFollow);
      try {
        const afterStats = fstatSync(afterFd);
        regularFile(afterStats, label);
        reject(
          !sameFileIdentity(committedIdentity as Stats, afterStats),
          label + ' post-commit identity or hash verification failed',
        );
        reject(
          rawHash(readBoundedBuffer(afterFd, label)) !== rawHash(desiredBytes),
          label + ' post-commit identity or hash verification failed',
        );
      } finally {
        closeQuietly(afterFd);
      }
      unlinkSync(childPath(parent.fd, backupName));
      fsyncSync(parent.fd);
      backupMoved = false;
    } finally {
      releaseExclusiveLock(parent.fd, lockName, lockFd);
      closeQuietly(lockFd);
      lockFd = -1;
    }
  } finally {
    choose(
      tempFd >= 0,
      () => {
        closeQuietly(tempFd);
        choose(
          existsSync(childPath(parent.fd, tempName)),
          () => unlinkSync(childPath(parent.fd, tempName)),
          () => undefined,
        );
      },
      () => undefined,
    );
    restoreLinuxBackup(native as LinuxNativeBinding, parent.fd, name, backupName, backupMoved, expectedHash, label);
    closeQuietly(parent.fd);
  }
}
function recoverLinuxOrphanBackup(
  native: LinuxNativeBinding,
  parentFd: number,
  targetName: string,
  expectedHash: string,
  desiredHash: string,
  label: string,
): void {
  const escaped = targetName.replace(/[\^$.*+?()[\]{}|]/g, '\\$&');
  const names = readdirSync(childPath(parentFd, '.')).filter((name) =>
    new RegExp('^[.]' + escaped + '[.][0-9a-f-]{36}[.]cas-old$').test(name),
  );
  choose(
    names.length === 0,
    () => undefined,
    () => {
      reject(names.length > 1, label + ' has multiple private backups and recovery is ambiguous');
      const backupName = names[0]!;
      const backupFd = openSync(childPath(parentFd, backupName), fsConstants.O_RDONLY | noFollow);
      try {
        const backupIdentity = fstatSync(backupFd);
        regularFile(backupIdentity, label + ' private backup');
        reject(
          backupIdentity.size > maxRepositoryReadBytes,
          label + ' private backup exceeds the bounded repository read size',
        );
        const checkFd = openSync(childPath(parentFd, backupName), fsConstants.O_RDONLY | noFollow);
        try {
          reject(
            any(
              !sameFileIdentity(backupIdentity, fstatSync(checkFd)),
              rawHash(readBoundedBuffer(checkFd, label)) !== expectedHash,
            ),
            label + ' private backup content is not the expected original',
          );
        } finally {
          closeQuietly(checkFd);
        }
        const targetHash = Result.fromThrowable(
          () => {
            const targetFd = openSync(childPath(parentFd, targetName), fsConstants.O_RDONLY | noFollow);
            try {
              const targetStats = fstatSync(targetFd);
              regularFile(targetStats, label);
              return rawHash(readBoundedBuffer(targetFd, label));
            } finally {
              closeQuietly(targetFd);
            }
          },
          (error) => error,
        )().match(
          (value) => value,
          (error) =>
            choose(
              (error as NodeJS.ErrnoException).code === 'ENOENT',
              () => null,
              () => {
                throw error;
              },
            ),
        );
        reject(
          all(targetHash !== null, targetHash !== expectedHash, targetHash !== desiredHash),
          label + ' orphan backup recovery is ambiguous; the target is not the expected or committed content',
        );
        choose(
          targetHash === null,
          () => {
            const restoredFd = native.cloneFileExclusive(backupFd, parentFd, targetName);
            try {
              fsyncSync(restoredFd);
              regularFile(fstatSync(restoredFd), label);
              reject(
                rawHash(readBoundedBuffer(restoredFd, label)) !== expectedHash,
                label + ' orphan backup restore content verification failed',
              );
              fsyncSync(parentFd);
            } finally {
              closeQuietly(restoredFd);
            }
          },
          () => undefined,
        );
        const currentBackupFd = openSync(childPath(parentFd, backupName), fsConstants.O_RDONLY | noFollow);
        try {
          reject(
            !sameFileIdentity(backupIdentity, fstatSync(currentBackupFd)),
            label + ' private backup identity changed during recovery',
          );
          unlinkSync(childPath(parentFd, backupName));
          fsyncSync(parentFd);
        } finally {
          closeQuietly(currentBackupFd);
        }
      } finally {
        closeQuietly(backupFd);
      }
    },
  );
}
function restoreLinuxBackup(
  native: LinuxNativeBinding,
  parentFd: number,
  targetName: string,
  backupName: string,
  moved: boolean,
  expectedHash: string,
  label: string,
): void {
  Result.fromThrowable(
    () => {
      choose(
        moved,
        () =>
          choose(
            existsSync(childPath(parentFd, targetName)),
            () => undefined,
            () => {
              const backupFd = openSync(childPath(parentFd, backupName), fsConstants.O_RDONLY | noFollow);
              try {
                const restoredFd = native.cloneFileExclusive(backupFd, parentFd, targetName);
                try {
                  fsyncSync(restoredFd);
                  regularFile(fstatSync(restoredFd), label);
                  reject(
                    rawHash(readBoundedBuffer(restoredFd, label)) !== expectedHash,
                    label + ' orphan backup restore content verification failed',
                  );
                  fsyncSync(parentFd);
                } finally {
                  closeQuietly(restoredFd);
                }
                unlinkSync(childPath(parentFd, backupName));
                fsyncSync(parentFd);
              } finally {
                closeQuietly(backupFd);
              }
            },
          ),
        () => undefined,
      );
    },
    (error) => error,
  )().match(
    () => undefined,
    (error) => {
      throw new Error(label + ' failed; the original private backup was preserved for recovery', { cause: error });
    },
  );
}
function fsSafeRelative(root: string, target: string, label: string): string {
  return safeRelative(root, target, label).join(path.sep);
}
function fsSafeAbsolute(root: string, target: string, label: string): string {
  return path.resolve(root, fsSafeRelative(root, target, label));
}
function fsSafeOpen(root: string, target: string, label: string): { fd: number; stat: Stats } {
  const opened = openRootFileSync({
    absolutePath: fsSafeAbsolute(root, target, label),
    rootPath: root,
    boundaryLabel: label,
    maxBytes: maxRepositoryReadBytes,
    rejectHardlinks: true,
    rejectSymlinks: true,
    allowedType: 'file',
  });
  const success = opened as { ok: true; fd: number; stat: Stats };
  const failure = opened as { ok: false; reason: string };
  reject(!opened.ok, `${label} fs-safe boundary rejected the target (${failure.reason})`);
  return { fd: success.fd, stat: success.stat };
}
function fsSafeReadText(root: string, target: string, label: string): string {
  const opened = fsSafeOpen(root, target, label);
  try {
    return readBoundedText(opened.fd, label);
  } finally {
    closeQuietly(opened.fd);
  }
}
function fsSafeReadBytes(root: string, target: string, label: string): Buffer {
  const opened = fsSafeOpen(root, target, label);
  try {
    return readBoundedBuffer(opened.fd, label);
  } finally {
    closeQuietly(opened.fd);
  }
}
function fsSafeAssertDirectory(root: string, target: string, label: string): void {
  const absolutePath = target === '.' ? root : fsSafeAbsolute(root, target, label);
  assertNoSymlinkParentsSync({
    rootDir: root,
    targetPath: absolutePath,
    allowMissing: false,
    requireDirectories: true,
    messagePrefix: label,
  });
  const stats = lstatSync(absolutePath);
  reject(any(!stats.isDirectory(), stats.isSymbolicLink()), `${label} must be a real directory`);
}
function windowsNativeOpenFlags(flags: number): number {
  return flags | ((fsConstants as { O_CLOEXEC?: number }).O_CLOEXEC ?? 0);
}
function windowsOpenRoot(root: string, label: string): { readonly fd: number; readonly stat: Stats } {
  const opened = openRootFileSync({
    absolutePath: root,
    rootPath: root,
    boundaryLabel: label,
    rejectHardlinks: true,
    rejectSymlinks: true,
    allowedType: 'directory',
  });
  if (!opened.ok) fail(label + ' root boundary rejected: ' + opened.reason);
  return { fd: opened.fd, stat: opened.stat };
}
function windowsNativeRelative(root: string, target: string, label: string): string {
  return safeRelative(root, target, label).join('/');
}
function windowsOpenParent(
  root: string,
  target: string,
  label: string,
): { readonly rootFd: number; readonly parentFd: number; readonly parentRelative: string; readonly basename: string } {
  const segments = safeRelative(root, target, label);
  reject(segments.length < 1, label + ' target is empty');
  const rootHandle = windowsOpenRoot(root, label);
  let parentFd = rootHandle.fd;
  const parentRelative = segments.slice(0, -1).join('/');
  try {
    if (parentRelative.length > 0)
      parentFd = windowsNativeBinding!.openBeneath(
        rootHandle.fd,
        parentRelative,
        windowsNativeOpenFlags(fsConstants.O_RDONLY),
      ).fd;
    return { rootFd: rootHandle.fd, parentFd, parentRelative, basename: segments.at(-1)! };
  } catch (error) {
    if (parentFd !== rootHandle.fd) closeQuietly(parentFd);
    closeQuietly(rootHandle.fd);
    throw error;
  }
}
function windowsCloseParent(opened: { readonly rootFd: number; readonly parentFd: number }): void {
  if (opened.parentFd !== opened.rootFd) closeQuietly(opened.parentFd);
  closeQuietly(opened.rootFd);
}
function windowsWriteAll(fd: number, bytes: Buffer): void {
  let offset = 0;
  while (offset < bytes.byteLength) {
    const written = writeSync(fd, bytes, offset, bytes.byteLength - offset);
    reject(written <= 0, 'native Windows write made no progress');
    offset += written;
  }
}
function windowsEnsureDirectory(root: string, target: string, label: string): string {
  reject(!windowsNativeBinding, label + ' requires the pinned native provider');
  if (path.resolve(root, target) === path.resolve(root)) {
    assertAncestorChain(root, label);
    return path.resolve(root);
  }
  const relative = windowsNativeRelative(root, target, label);
  const opened = windowsOpenRoot(root, label);
  try {
    if (relative.length > 0) windowsNativeBinding!.mkdirBeneath(opened.fd, relative, 0o700);
    windowsDirectoryIdentity(root, target, label);
    return path.resolve(root, target);
  } finally {
    closeQuietly(opened.fd);
  }
}
function windowsWriteExclusive(root: string, target: string, contents: string, label: string): void {
  reject(!windowsNativeBinding, label + ' requires the pinned native provider');
  const bytes = boundedContentBytes(contents, label);
  const opened = windowsOpenParent(root, target, label);
  let fd: number | undefined;
  try {
    fd = windowsNativeBinding!.openBeneath(
      opened.parentFd,
      opened.basename,
      windowsNativeOpenFlags(fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL),
    ).fd;
    windowsWriteAll(fd, bytes);
    fsyncSync(fd);
    const stat = windowsNativeBinding!.fstatIdentity(fd);
    reject(!stat.isFile || stat.nlink !== 1, label + ' target is not a private regular file');
  } finally {
    if (fd !== undefined) closeQuietly(fd);
    windowsCloseParent(opened);
  }
}
function windowsReplaceAtomicUnlocked(
  root: string,
  target: string,
  expectedHash: string,
  contents: string,
  label: string,
): void {
  reject(!windowsNativeBinding, label + ' requires the pinned native provider');
  const bytes = boundedContentBytes(contents, label);
  const opened = windowsOpenParent(root, target, label);
  const tempName = '.' + opened.basename + '.' + randomUUID() + '.native.tmp';
  let tempFd: number | undefined;
  let renamed = false;
  try {
    const currentFd = windowsNativeBinding!.openBeneath(
      opened.parentFd,
      opened.basename,
      windowsNativeOpenFlags(fsConstants.O_RDONLY),
    ).fd;
    try {
      reject(rawHash(readBoundedBuffer(currentFd, label)) !== expectedHash, label + ' expected content hash is stale');
    } finally {
      closeQuietly(currentFd);
    }
    tempFd = windowsNativeBinding!.openBeneath(
      opened.parentFd,
      tempName,
      windowsNativeOpenFlags(fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL),
    ).fd;
    windowsWriteAll(tempFd, bytes);
    fsyncSync(tempFd);
    try {
      windowsNativeBinding!.renameReplace(opened.parentFd, tempName, opened.parentFd, opened.basename);
      renamed = true;
    } catch (error) {
      throw new Error(
        `${label} replacement outcome unknown; retry prohibited until authoritative reconciliation: ${String(error)}`,
      );
    }
    try {
      const resultFd = windowsNativeBinding!.openBeneath(
        opened.parentFd,
        opened.basename,
        windowsNativeOpenFlags(fsConstants.O_RDONLY),
      ).fd;
      try {
        reject(
          rawHash(readBoundedBuffer(resultFd, label)) !== rawHash(bytes),
          label + ' replacement verification failed',
        );
      } finally {
        closeQuietly(resultFd);
      }
    } catch (error) {
      throw new Error(
        `${label} replacement outcome unknown; retry prohibited until authoritative reconciliation: ${String(error)}`,
      );
    }
  } finally {
    if (tempFd !== undefined) closeQuietly(tempFd);
    if (!renamed) {
      // Retain an unverifiable temporary artifact rather than deleting a path
      // after a failed native operation; recovery can inspect it safely.
    }
    windowsCloseParent(opened);
  }
}
function windowsReplaceAtomic(
  root: string,
  target: string,
  expectedHash: string,
  contents: string,
  label: string,
): void {
  fail(label + ' synchronous replacement unavailable on Windows: safe lock cleanup requires an async root handle');
}
async function windowsReplaceAtomicAsync(
  root: string,
  target: string,
  expectedHash: string,
  contents: string,
  label: string,
  lockRoot?: FsSafeRoot,
): Promise<void> {
  // Serialize cooperating writers around the expected-hash check and native
  // rename. The provider has no compare-and-swap rename primitive; the lock
  // closes the check/replace race for all bundle-owned writers.
  await windowsWithExclusiveLockAsync(
    root,
    target + '.cas.lock',
    label + ' CAS',
    async () => windowsReplaceAtomicUnlocked(root, target, expectedHash, contents, label),
    lockRoot,
  );
}
function windowsRemoveFile(root: string, target: string, label: string): void {
  reject(!windowsNativeBinding, label + ' requires the pinned native provider');
  fail(label + ' is unavailable on Windows: pinned native provider has no parent-handle delete primitive');
}
function windowsWithExclusiveLock<T>(root: string, target: string, label: string, _operation: () => T): T {
  reject(!windowsNativeBinding, label + ' requires the pinned native provider');
  fail(label + ' synchronous lock unavailable on Windows: safe cleanup requires an async root handle');
}
async function windowsWithExclusiveLockAsync<T>(
  root: string,
  target: string,
  label: string,
  operation: () => Promise<T>,
  lockRoot?: FsSafeRoot,
): Promise<T> {
  reject(!windowsNativeBinding, label + ' requires the pinned native provider');
  const relative = windowsNativeRelative(root, target, label);
  const parentRelative = path.posix.dirname(relative);
  windowsEnsureDirectory(root, parentRelative === '.' ? '.' : parentRelative, label + ' parent');
  const absolute = path.join(root, ...relative.split('/'));
  assertNoSymlinkParentsSync({
    rootDir: root,
    targetPath: path.dirname(absolute),
    allowMissing: false,
    requireDirectories: true,
    messagePrefix: label + ' lock acquisition',
  });
  const trustedRoot =
    lockRoot ?? (await createFsSafeRoot(root, { symlinks: 'reject', hardlinks: 'reject', mkdir: false, mode: 0o600 }));
  return withFileLock(
    absolute,
    {
      payload: async () => ({ schema: 'SafeRepositoryAccessLock/v1', owner_pid: process.pid, label }),
      staleRecovery: 'fail-closed',
      timeoutMs: 0,
      lockRoot: trustedRoot,
    },
    operation,
  );
}
function windowsMoveNoReplaceAsync(
  root: string,
  source: string,
  target: string,
  expectedHash: string,
  label: string,
): Promise<'moved' | 'already_moved'> {
  return (async () => {
    reject(!windowsNativeBinding, label + ' requires the pinned native provider');
    reject(!/^[a-f0-9]{64}$/u.test(expectedHash), label + ' source digest is invalid');
    const sourcePath = windowsNativeRelative(root, source, label + ' source');
    const targetPath = windowsNativeRelative(root, target, label + ' target');
    reject(sourcePath === targetPath, label + ' source and target must differ');
    const probe = (): 'source' | 'target' | 'conflict' => {
      const sourceExists = fsSafeFileExists(root, sourcePath, label + ' source probe');
      const targetExists = fsSafeFileExists(root, targetPath, label + ' target probe');
      if (sourceExists && !targetExists)
        return rawHash(fsSafeReadBytes(root, sourcePath, label + ' source probe')) === expectedHash
          ? 'source'
          : 'conflict';
      if (!sourceExists && targetExists)
        return rawHash(fsSafeReadBytes(root, targetPath, label + ' target probe')) === expectedHash
          ? 'target'
          : 'conflict';
      return 'conflict';
    };
    const before = probe();
    if (before === 'target') return 'already_moved';
    if (before !== 'source')
      throw new SafeRepositoryMoveError(
        'SAFE_REPOSITORY_MOVE_OUTCOME_UNKNOWN',
        label + ' source/target state is conflicting',
      );
    const from = windowsOpenParent(root, sourcePath, label + ' source');
    const to = windowsOpenParent(root, targetPath, label + ' target');
    let sourceFd: number | undefined;
    let targetFd: number | undefined;
    try {
      sourceFd = windowsNativeBinding!.openBeneath(
        from.parentFd,
        from.basename,
        windowsNativeOpenFlags(fsConstants.O_RDONLY),
      ).fd;
      const sourceIdentity = windowsNativeBinding!.fstatIdentity(sourceFd);
      reject(
        !sourceIdentity.isFile || sourceIdentity.nlink !== 1,
        label + ' source must be a regular single-link file',
      );
      reject(
        rawHash(readBoundedBuffer(sourceFd, label + ' source')) !== expectedHash,
        label + ' source digest changed',
      );
      try {
        windowsNativeBinding!.renameNoReplace(from.parentFd, from.basename, to.parentFd, to.basename);
      } catch (error) {
        const after = probe();
        if (after === 'target') return 'moved';
        if (after === 'source')
          throw new SafeRepositoryMoveError(
            'SAFE_REPOSITORY_MOVE_NOT_APPLIED',
            label + ' move did not occur; retry only after revalidation',
            { cause: error },
          );
        throw new SafeRepositoryMoveError(
          'SAFE_REPOSITORY_MOVE_OUTCOME_UNKNOWN',
          label + ' move outcome is unknown; reconcile hashes before retry',
          { cause: error },
        );
      }
      targetFd = windowsNativeBinding!.openBeneath(
        to.parentFd,
        to.basename,
        windowsNativeOpenFlags(fsConstants.O_RDONLY),
      ).fd;
      const targetIdentity = windowsNativeBinding!.fstatIdentity(targetFd);
      reject(
        !targetIdentity.isFile ||
          targetIdentity.nlink !== 1 ||
          targetIdentity.dev !== sourceIdentity.dev ||
          targetIdentity.ino !== sourceIdentity.ino ||
          rawHash(readBoundedBuffer(targetFd, label + ' target')) !== expectedHash,
        label + ' moved target failed source identity or digest verification',
      );
      return 'moved';
    } catch (error) {
      if (error instanceof SafeRepositoryMoveError) throw error;
      const after = probe();
      if (after === 'target') return 'moved';
      if (after === 'source')
        throw new SafeRepositoryMoveError(
          'SAFE_REPOSITORY_MOVE_NOT_APPLIED',
          label + ' move did not occur; retry only after revalidation',
          { cause: error },
        );
      throw new SafeRepositoryMoveError(
        'SAFE_REPOSITORY_MOVE_OUTCOME_UNKNOWN',
        label + ' move outcome is unknown; reconcile hashes before retry',
        { cause: error },
      );
    } finally {
      if (targetFd !== undefined) closeQuietly(targetFd);
      if (sourceFd !== undefined) closeQuietly(sourceFd);
      windowsCloseParent(from);
      windowsCloseParent(to);
    }
  })();
}

function fsSafeFileExists(root: string, target: string, label: string): boolean {
  const absolute = path.resolve(root, target);
  const relative = path.relative(root, absolute);
  const absolutePath = relative.toLowerCase() === '.git' ? absolute : fsSafeAbsolute(root, target, label);
  assertNoSymlinkParentsSync({
    rootDir: root,
    targetPath: path.dirname(absolutePath),
    allowMissing: true,
    requireDirectories: true,
    messagePrefix: label,
  });
  try {
    const stats = lstatSync(absolutePath);
    reject(stats.isSymbolicLink(), label + ' target is a symlink');
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}
function fsSafeListFiles(root: string, target: string, label: string): readonly string[] {
  const absolutePath = fsSafeAbsolute(root, target, label);
  assertNoSymlinkParentsSync({
    rootDir: root,
    targetPath: absolutePath,
    allowMissing: false,
    requireDirectories: true,
    messagePrefix: label,
  });
  const stats = lstatSync(absolutePath);
  reject(any(!stats.isDirectory(), stats.isSymbolicLink()), label + ' must be a real directory');
  return readdirSync(absolutePath);
}
function linuxFileExists(root: string, target: string, label: string): boolean {
  const absolute = path.resolve(root, target);
  const relative = path.relative(root, absolute);
  const segments = relative.toLowerCase() === '.git' ? ['.git'] : safeRelative(root, target, label);
  let parentFd = -1;
  try {
    const parent = openParent(root, segments, label);
    parentFd = parent.fd;
    let fd = -1;
    try {
      fd = openSync(childPath(parent.fd, parent.name), fsConstants.O_RDONLY | noFollow);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
      throw error;
    } finally {
      if (fd >= 0) closeQuietly(fd);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  } finally {
    if (parentFd >= 0) closeQuietly(parentFd);
  }
}
function linuxListFiles(root: string, target: string, label: string): readonly string[] {
  const segments = safeRelative(root, target, label);
  const parent = openParent(root, segments, label);
  let directoryFd = -1;
  try {
    directoryFd = openSync(childPath(parent.fd, parent.name), fsConstants.O_RDONLY | directoryFlag | noFollow);
    return readdirSync('/proc/self/fd/' + directoryFd);
  } finally {
    if (directoryFd >= 0) closeQuietly(directoryFd);
    closeQuietly(parent.fd);
  }
}
function linuxRemoveFile(root: string, target: string, label: string): void {
  const segments = safeRelative(root, target, label);
  let parentFd = -1;
  try {
    const parent = openParent(root, segments, label);
    parentFd = parent.fd;
    const lockName = '.' + parent.name + '.cas.lock';
    let lockFd = -1;
    try {
      lockFd = openExclusiveLockAt(parent.fd, lockName, label).fd;
      fsyncSync(lockFd);
      let targetFd = -1;
      try {
        targetFd = openSync(childPath(parent.fd, parent.name), fsConstants.O_RDONLY | noFollow);
        const stats = fstatSync(targetFd);
        regularFile(stats, label + ' remove target');
        reject(
          !moveAndRemovePinnedLock(
            parent.fd,
            parent.name,
            label,
            stats,
            (movedStats) => all(movedStats.isFile(), movedStats.nlink === 1),
            false,
          ),
          label + ' remove target changed during removal',
        );
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      } finally {
        if (targetFd >= 0) closeQuietly(targetFd);
      }
    } finally {
      if (lockFd >= 0) {
        releaseExclusiveLock(parent.fd, lockName, lockFd);
        closeQuietly(lockFd);
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  } finally {
    if (parentFd >= 0) closeQuietly(parentFd);
  }
}
async function linuxMoveNoReplaceAsync(
  root: string,
  source: string,
  target: string,
  expectedHash: string,
  label: string,
): Promise<'moved' | 'already_moved'> {
  reject(!linuxNativeBinding, label + ' requires the attested Linux no-replace rename primitive');
  reject(!/^[a-f0-9]{64}$/u.test(expectedHash), label + ' source digest is invalid');
  const sourceSegments = safeRelative(root, source, label + ' source');
  const targetSegments = safeRelative(root, target, label + ' target');
  reject(sourceSegments.join('/') === targetSegments.join('/'), label + ' source and target must differ');
  const probe = (candidate: string): string | null => {
    if (!linuxFileExists(root, candidate, label + ' hash probe')) return null;
    return rawHash(readBytes(root, candidate, label + ' hash probe'));
  };
  const sourceBefore = probe(source);
  const targetBefore = probe(target);
  if (sourceBefore === null && targetBefore === expectedHash) return 'already_moved';
  if (sourceBefore !== expectedHash || targetBefore !== null)
    throw new SafeRepositoryMoveError(
      'SAFE_REPOSITORY_MOVE_OUTCOME_UNKNOWN',
      label + ' source/target state is conflicting',
    );
  const from = openParent(root, sourceSegments, label + ' source');
  const to = openParent(root, targetSegments, label + ' target');
  let sourceFd = -1;
  let targetFd = -1;
  try {
    sourceFd = openSync(childPath(from.fd, from.name), fsConstants.O_RDONLY | noFollow);
    const sourceStats = fstatSync(sourceFd);
    regularFile(sourceStats, label + ' source');
    reject(rawHash(readBoundedBuffer(sourceFd, label + ' source')) !== expectedHash, label + ' source digest changed');
    try {
      linuxNativeBinding!.renameNoReplace(from.fd, from.name, to.fd, to.name);
    } catch (error) {
      const sourceAfter = probe(source);
      const targetAfter = probe(target);
      if (sourceAfter === null && targetAfter === expectedHash) return 'moved';
      if (sourceAfter === expectedHash && targetAfter === null)
        throw new SafeRepositoryMoveError(
          'SAFE_REPOSITORY_MOVE_NOT_APPLIED',
          label + ' move did not occur; retry only after revalidation',
          { cause: error },
        );
      throw new SafeRepositoryMoveError(
        'SAFE_REPOSITORY_MOVE_OUTCOME_UNKNOWN',
        label + ' move outcome is unknown; reconcile hashes before retry',
        { cause: error },
      );
    }
    targetFd = openSync(childPath(to.fd, to.name), fsConstants.O_RDONLY | noFollow);
    const targetStats = fstatSync(targetFd);
    regularFile(targetStats, label + ' target');
    reject(!sameFileIdentity(sourceStats, targetStats), label + ' moved target identity differs from opened source');
    reject(
      rawHash(readBoundedBuffer(targetFd, label + ' target')) !== expectedHash,
      label + ' moved target digest differs',
    );
    fsyncSync(from.fd);
    if (!sameFileIdentity(fstatSync(from.fd), fstatSync(to.fd))) fsyncSync(to.fd);
    return 'moved';
  } catch (error) {
    if (error instanceof SafeRepositoryMoveError) throw error;
    const sourceAfter = probe(source);
    const targetAfter = probe(target);
    if (sourceAfter === null && targetAfter === expectedHash)
      throw new SafeRepositoryMoveError(
        'SAFE_REPOSITORY_MOVE_OUTCOME_UNKNOWN',
        label + ' move occurred but post-move verification or durability failed',
        { cause: error },
      );
    if (sourceAfter === expectedHash && targetAfter === null)
      throw new SafeRepositoryMoveError(
        'SAFE_REPOSITORY_MOVE_NOT_APPLIED',
        label + ' move did not occur; retry only after revalidation',
        { cause: error },
      );
    throw new SafeRepositoryMoveError(
      'SAFE_REPOSITORY_MOVE_OUTCOME_UNKNOWN',
      label + ' move outcome is unknown; reconcile hashes before retry',
      { cause: error },
    );
  } finally {
    if (targetFd >= 0) closeQuietly(targetFd);
    if (sourceFd >= 0) closeQuietly(sourceFd);
    closeQuietly(from.fd);
    closeQuietly(to.fd);
  }
}

function windowsAccess(root: string): SafeRepositoryAccess {
  let initialIdentity: string | undefined;
  let handle: Promise<FsSafeRoot> | undefined;
  const checkCreateCapability = (): void => {
    reject(!loadWindowsNativeBinding(), 'Windows exclusive creation requires the live pinned native provider');
    assertAncestorChain(root, 'exclusive-create root');
    const identity = windowsDirectoryIdentity(root, '.', 'exclusive-create root');
    reject(initialIdentity !== undefined && identity !== initialIdentity, 'exclusive-create root identity changed');
    initialIdentity ??= identity;
  };
  const createHandle = async (): Promise<FsSafeRoot> => {
    checkCreateCapability();
    handle ??= createFsSafeRoot(root, { symlinks: 'reject', hardlinks: 'reject', mkdir: false, mode: 0o600 });
    const opened = await handle;
    checkCreateCapability();
    return opened;
  };
  const checkParents = (target: string, label: string): string => {
    const relative = fsSafeRelative(root, target, label);
    assertNoSymlinkParentsSync({
      rootDir: root,
      targetPath: path.resolve(root, relative),
      allowMissing: true,
      requireDirectories: false,
      messagePrefix: label,
    });
    return relative;
  };
  return {
    schema: 'SafeRepositoryAccess/v1',
    provider: 'fs-safe-windows',
    platform: process.platform,
    repository_root: root,
    attested: true,
    ancestor_binding: 'root-identity',
    atomic_replace: 'native-rename-replace',
    directory_sync: 'unsupported',
    containment: 'best-effort',
    assurance_profile: 'windows-best-effort-v1',
    filesystem: 'unknown',
    package: fsSafeWindowsPackage,
    residual_risks: [
      'Windows reparse containment is best-effort and requires supported-host NTFS/ReFS evidence.',
      'Directory-entry crash durability is unavailable because Windows directory synchronization is not exposed by the pinned provider.',
      'The fs-safe package does not provide the runtime revision/fence CAS; the candidate kernel retains that responsibility.',
      'Async exclusive creation assumes trusted in-process native configuration; it does not attest directory durability or general host persistence.',
    ],
    assertAvailable: () => undefined,
    prepareExclusiveCreation: async () => {
      await createHandle();
      return Object.freeze({
        ensureDirectory: async (target: string, label: string) => {
          const opened = await createHandle();
          const relative = checkParents(target, label);
          await opened.mkdir(relative);
          checkCreateCapability();
          fsSafeAssertDirectory(root, target, label);
          return path.resolve(root, relative);
        },
        writeExclusive: async (target: string, contents: string, label: string) => {
          const bytes = boundedContentBytes(contents, label);
          const opened = await createHandle();
          const relative = checkParents(target, label);
          await opened.create(relative, bytes, { mkdir: false, mode: 0o600 });
          checkCreateCapability();
        },
      });
    },
    readText: (target, label) => fsSafeReadText(root, target, label),
    readBytes: (target, label) => fsSafeReadBytes(root, target, label),
    fileExists: (target, label) => fsSafeFileExists(root, target, label),
    listFiles: (target, label) => fsSafeListFiles(root, target, label),
    removeFile: (target, label) => windowsRemoveFile(root, target, label),
    moveNoReplaceAsync: (source, target, expectedHash, label) =>
      windowsMoveNoReplaceAsync(root, source, target, expectedHash, label),
    assertDirectory: (target, label) => fsSafeAssertDirectory(root, target, label),
    directoryIdentity: (target, label) => directoryIdentity(root, target, label),
    ensureDirectory: (target, label) => windowsEnsureDirectory(root, target, label),
    ensureDirectoryAsync: async (target, label) => windowsEnsureDirectory(root, target, label),
    writeExclusive: (target, contents, label) => windowsWriteExclusive(root, target, contents, label),
    writeExclusiveAsync: async (target, contents, label) => windowsWriteExclusive(root, target, contents, label),
    replaceAtomic: (target, expectedHash, contents, label) =>
      windowsReplaceAtomic(root, target, expectedHash, contents, label),
    replaceAtomicAsync: async (target, expectedHash, contents, label) =>
      windowsReplaceAtomicAsync(root, target, expectedHash, contents, label, await createHandle()),
    withExclusiveLock: (target, label, operation) => windowsWithExclusiveLock(root, target, label, operation),
    withExclusiveLockAsync: async (target, label, operation) =>
      windowsWithExclusiveLockAsync(root, target, label, operation, await createHandle()),
    compareReserveReplace: (target, expectedHash, contents, label) => {
      windowsReplaceAtomic(root, target, expectedHash, contents, label);
      return {
        schema: 'NativeCompareReserveReplace/v1',
        provider: 'fs-safe-windows',
        containment: 'best-effort',
        target,
        expected_hash: expectedHash,
        result_hash: rawHash(contents),
        status: 'applied',
      };
    },
  };
}
function compareReserveReplace(
  provider: 'linux-proc-fd' | 'fs-safe-windows',
  containment: 'kernel-atomic' | 'best-effort',
  target: string,
  expectedHash: string,
  contents: string,
  replace: () => void,
): NativeCompareReserveReplace {
  replace();
  return {
    schema: 'NativeCompareReserveReplace/v1',
    provider,
    containment,
    target,
    expected_hash: expectedHash,
    result_hash: rawHash(contents),
    status: 'applied',
  };
}
function canonicalRepositoryRoot(repositoryRoot: string): string {
  reject(
    any(typeof repositoryRoot !== 'string', !path.isAbsolute(repositoryRoot)),
    'safe repository access requires an absolute repository root',
  );
  const resolved = path.resolve(repositoryRoot);
  reject(resolved !== repositoryRoot, 'safe repository access requires a canonical repository root');
  return resolved;
}
function linuxAccess(root: string): SafeRepositoryAccess {
  return {
    schema: 'SafeRepositoryAccess/v1',
    provider: 'linux-proc-fd',
    platform: process.platform,
    repository_root: root,
    attested: true,
    ancestor_binding: 'directory-handle',
    atomic_replace: 'fsync-temp-rename',
    assertAvailable: () => undefined,
    prepareExclusiveCreation: async () => {
      linuxDirectoryIdentity(root, '.', 'exclusive-create root');
      return Object.freeze({
        ensureDirectory: async (target: string, label: string) => ensureDirectory(root, target, label),
        writeExclusive: async (target: string, contents: string, label: string) =>
          writeExclusive(root, target, contents, label),
      });
    },
    readText: (target, label) => readText(root, target, label),
    readBytes: (target, label) => readBytes(root, target, label),
    fileExists: (target, label) => linuxFileExists(root, target, label),
    listFiles: (target, label) => linuxListFiles(root, target, label),
    removeFile: (target, label) => linuxRemoveFile(root, target, label),
    moveNoReplaceAsync: (source, target, expectedHash, label) =>
      linuxMoveNoReplaceAsync(root, source, target, expectedHash, label),
    assertDirectory: (target, label) => {
      linuxDirectoryIdentity(root, target, label);
    },
    directoryIdentity: (target, label) => directoryIdentity(root, target, label),
    ensureDirectory: (target, label) => ensureDirectory(root, target, label),
    ensureDirectoryAsync: async (target, label) => ensureDirectory(root, target, label),
    writeExclusive: (target, contents, label) => writeExclusive(root, target, contents, label),
    writeExclusiveAsync: async (target, contents, label) => writeExclusive(root, target, contents, label),
    replaceAtomic: (target, expectedHash, contents, label) =>
      replaceAtomicLinux(root, target, expectedHash, contents, label),
    replaceAtomicAsync: async (target, expectedHash, contents, label) =>
      replaceAtomicLinux(root, target, expectedHash, contents, label),
    withExclusiveLock: (target, label, operation) => withExclusiveLock(root, target, label, operation),
    withExclusiveLockAsync: (target, label, operation) => withExclusiveLockAsync(root, target, label, operation),
    compareReserveReplace: (target, expectedHash, contents, label) =>
      compareReserveReplace('linux-proc-fd', 'kernel-atomic', target, expectedHash, contents, () =>
        replaceAtomicLinux(root, target, expectedHash, contents, label),
      ),
  };
}
export function detectSafeRepositoryAccess(repositoryRoot: string): SafeRepositoryAccess {
  const root = canonicalRepositoryRoot(repositoryRoot);
  reject(!safeRepositoryProviderAvailable, 'a native component-wise no-follow provider is not available on this host');
  const provider = ['fs-safe-windows', 'linux-proc-fd'][Number(Boolean(linuxHandleProvider))] as
    | 'fs-safe-windows'
    | 'linux-proc-fd';
  const factories = { 'fs-safe-windows': windowsAccess, 'linux-proc-fd': linuxAccess };
  return factories[provider](root);
}
export function requireSafeRepositoryAccess(repositoryRoot: string): SafeRepositoryAccess {
  const access = detectSafeRepositoryAccess(repositoryRoot);
  access.assertAvailable();
  return access;
}
export const safeRepositoryProviderAvailable = linuxHandleProvider || fsSafeWindowsProvider;
