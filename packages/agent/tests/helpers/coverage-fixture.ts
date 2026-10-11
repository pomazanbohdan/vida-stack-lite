import { chmodSync, readdirSync } from 'node:fs';
import path from 'node:path';

/** Only for a completed, owned inert fixture; never follow its dependency links. */
export function restoreOwnedCoverageDirectoryWrites(directory: string): void {
  chmodSync(directory, 0o700);
  for (const entry of readdirSync(directory, { withFileTypes: true }))
    if (entry.isDirectory()) restoreOwnedCoverageDirectoryWrites(path.join(directory, entry.name));
}
