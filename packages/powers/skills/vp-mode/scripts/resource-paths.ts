import { lstat, realpath, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';

export type ResourcePathErrorCode = 'RESOURCE_PATH_UNSAFE' | 'RESOURCE_PATH_MISSING';

export class ResourcePathError extends Error {
  readonly code: ResourcePathErrorCode;

  constructor(code: ResourcePathErrorCode, message: string) {
    super(message);
    this.name = 'ResourcePathError';
    this.code = code;
  }
}

export function isWithinRoot(root: string, candidate: string): boolean {
  const path = relative(root, candidate);
  return path === '' || (path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path));
}

export function resourcePathIdentity(path: string): string {
  return path.normalize('NFC').toUpperCase().toLowerCase();
}

export function validateResourcePath(path: string): void {
  if (path.length === 0 || path.includes('\\') || path.includes(':') || path.startsWith('/') || /^[a-z]:/iu.test(path)) {
    throw new ResourcePathError('RESOURCE_PATH_UNSAFE', `Path is not a normalized relative path: ${path}.`);
  }
  if (path.split('/').some((segment) => segment.length === 0 || segment === '.' || segment === '..')) {
    throw new ResourcePathError('RESOURCE_PATH_UNSAFE', `Path contains an unsafe segment: ${path}.`);
  }
}

export async function resolveResourcePath(root: string, relativePath: string): Promise<string> {
  validateResourcePath(relativePath);
  const rootPath = resolve(root);
  const absolute = resolve(rootPath, relativePath);
  let rootReal: string;
  try {
    rootReal = await realpath(rootPath);
  } catch {
    throw new ResourcePathError('RESOURCE_PATH_MISSING', `Resource root does not exist: ${root}.`);
  }
  if (!(await stat(rootReal)).isDirectory()) {
    throw new ResourcePathError('RESOURCE_PATH_UNSAFE', `Resource root is not a directory: ${root}.`);
  }
  let targetReal: string;
  try {
    targetReal = await realpath(absolute);
  } catch {
    throw new ResourcePathError('RESOURCE_PATH_MISSING', `Resource path does not exist: ${relativePath}.`);
  }
  if (!isWithinRoot(rootReal, targetReal)) {
    throw new ResourcePathError('RESOURCE_PATH_UNSAFE', `Resource path escapes the resource root via link: ${relativePath}.`);
  }
  const target = await lstat(absolute);
  if (target.isSymbolicLink()) {
    throw new ResourcePathError('RESOURCE_PATH_UNSAFE', `Resource path is a symbolic link: ${relativePath}.`);
  }
  if (!target.isFile()) {
    throw new ResourcePathError('RESOURCE_PATH_UNSAFE', `Resource path is not a regular file: ${relativePath}.`);
  }
  return targetReal;
}
