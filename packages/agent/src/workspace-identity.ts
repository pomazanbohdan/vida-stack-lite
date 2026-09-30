import { createHash } from 'node:crypto';
import { lstatSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { canonicalJson } from './contracts/public-ingress.js';

const repositoryIdPattern = /^[a-z0-9][a-z0-9-]{0,63}$/;

export class WorkspaceIdentityError extends Error {
  readonly code = 'GAP-WORKSPACE-IDENTITY-001';

  constructor(message: string) {
    super(message);
    this.name = 'WorkspaceIdentityError';
  }
}

function fail(message: string): never {
  throw new WorkspaceIdentityError(message);
}

/**
 * A workspace is one checked-out physical repository, not a caller-selected host
 * namespace.  `realpath` collapses spelling and link aliases before the value is
 * persisted, while the no-follow repository boundary rejects linked roots later.
 */
export function canonicalRepositoryRoot(repositoryRoot: string): string {
  if (typeof repositoryRoot !== 'string' || !path.isAbsolute(repositoryRoot)) fail('repository root must be absolute');
  const resolved = path.resolve(repositoryRoot);
  try {
    const stat = lstatSync(resolved);
    if (!stat.isDirectory() || stat.isSymbolicLink()) fail('repository root must be a non-link directory');
    return realpathSync.native(resolved);
  } catch (error) {
    if (error instanceof WorkspaceIdentityError) throw error;
    fail('repository root is unavailable');
  }
}

/** The stable v1 workspace key is derived only from repository identity and physical checkout root. */
export function deriveWorkspaceId(repositoryId: string, repositoryRoot: string): string {
  if (typeof repositoryId !== 'string' || !repositoryIdPattern.test(repositoryId))
    fail('repository identity is invalid');
  return createHash('sha256')
    .update(
      canonicalJson({
        schema: 'WorkspaceIdentity/v1',
        repository_id: repositoryId,
        repository_root: canonicalRepositoryRoot(repositoryRoot),
      }),
    )
    .digest('hex');
}
