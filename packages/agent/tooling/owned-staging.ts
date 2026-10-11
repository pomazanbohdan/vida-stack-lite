import { lstatSync, rmSync, type BigIntStats } from 'node:fs';
import { resolveSecureTempRoot, tempWorkspaceSync, type TempWorkspaceSync } from '@openclaw/fs-safe/temp';

export type OwnedDirectoryIdentity = Readonly<{ dev: bigint; ino: bigint }>;
export type OwnedTempWorkspace = TempWorkspaceSync;
export type OwnedCleanupStatus = 'removed' | 'missing' | 'identity-mismatch' | 'indeterminate' | 'cleanup-failed';

export function ownedTempWorkspace(prefix: string): OwnedTempWorkspace {
  const rootDir = resolveSecureTempRoot({ fallbackPrefix: 'vida-agent-temp' });
  return tempWorkspaceSync({ rootDir, prefix });
}

export function cleanupOwnedWorkspace(workspace: OwnedTempWorkspace): OwnedCleanupStatus {
  try {
    const status = workspace.cleanup();
    if (status === 'identity-mismatch')
      process.emitWarning(`Owned temp workspace was replaced and preserved: ${workspace.dir}`, {
        code: 'VIDA_TEMP_WORKSPACE_IDENTITY_MISMATCH',
      });
    if (status === 'indeterminate')
      process.emitWarning(`Owned temp workspace cleanup is indeterminate and preserved: ${workspace.dir}`, {
        code: 'VIDA_TEMP_WORKSPACE_CLEANUP_INDETERMINATE',
      });
    return status;
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : String(error);
    process.emitWarning(`Owned temp workspace cleanup failed for ${workspace.dir}: ${reason}`, {
      code: 'VIDA_TEMP_WORKSPACE_CLEANUP_FAILED',
    });
    return 'cleanup-failed';
  }
}

export function ownedDirectoryIdentity(directory: string): OwnedDirectoryIdentity {
  const identity = lstatSync(directory, { bigint: true });
  if (!identity.isDirectory() || identity.isSymbolicLink()) throw new Error('Owned staging root changed type');
  return { dev: identity.dev, ino: identity.ino };
}

export function removeOwnedDirectory(
  directory: string | undefined,
  identity: OwnedDirectoryIdentity | undefined,
): OwnedCleanupStatus | undefined {
  if (directory === undefined) return undefined;
  if (identity === undefined) return cleanupWarning(directory, 'identity-mismatch', 'No captured directory identity');
  const status = inspectOwnedDirectory(directory, identity);
  if (status !== 'match') return status;
  try {
    rmSync(directory, { recursive: true, force: true });
    return 'removed';
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : String(error);
    return cleanupWarning(directory, 'cleanup-failed', reason);
  }
}

function inspectOwnedDirectory(directory: string, identity: OwnedDirectoryIdentity): 'match' | OwnedCleanupStatus {
  let current;
  try {
    current = lstatSync(directory, { bigint: true, throwIfNoEntry: false });
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return 'missing';
    const reason = error instanceof Error ? error.message : String(error);
    return cleanupWarning(directory, 'cleanup-failed', reason);
  }
  if (current === undefined) return 'missing';
  if (!sameOwnedDirectory(current, identity))
    return cleanupWarning(directory, 'identity-mismatch', 'Staging path no longer names the captured directory');
  return 'match';
}

function sameOwnedDirectory(current: BigIntStats, identity: OwnedDirectoryIdentity): boolean {
  return (
    current.isDirectory() && !current.isSymbolicLink() && current.dev === identity.dev && current.ino === identity.ino
  );
}

function cleanupWarning(
  directory: string,
  status: 'identity-mismatch' | 'cleanup-failed',
  reason: string,
): OwnedCleanupStatus {
  process.emitWarning(`Owned staging ${status} for ${directory}: ${reason}`, {
    code: status === 'identity-mismatch' ? 'VIDA_STAGING_IDENTITY_MISMATCH' : 'VIDA_STAGING_CLEANUP_FAILED',
  });
  return status;
}
