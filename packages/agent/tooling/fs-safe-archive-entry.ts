import { createRequire } from 'node:module';
import path from 'node:path';

/** Resolve the archive API from the caller's qualified Agent package, never the root adapter workspace. */
export function fsSafeArchiveEntry(packageRoot: string): string {
  return createRequire(path.join(packageRoot, 'package.json')).resolve('@openclaw/fs-safe/archive');
}
