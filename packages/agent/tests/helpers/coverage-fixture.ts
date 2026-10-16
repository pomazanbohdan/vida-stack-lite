import { chmodSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { captureRuntimeInputClosure, coverageToolInputs } from '../../tooling/bun-coverage-evidence.ts';

/** Materialize the actual runner import closure and inert current typecheck input. */
export async function prepareCoverageRunnerInputs(
  root: string,
  packageRoot: string,
  packageFiles: string[],
): Promise<void> {
  const write = (relative: string, bytes: string | Uint8Array) => {
    const target = path.join(root, relative);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, bytes);
  };
  write('.bun-version', readFileSync(path.join(packageRoot, '.bun-version')));
  write(
    'package.json',
    JSON.stringify({
      files: packageFiles,
      scripts: {
        'typecheck:pinned': `bun -e "require('node:fs').writeFileSync('typecheck.marker', 'ran')"`,
      },
    }),
  );
  const runtimeBytes = new Map<string, Buffer>();
  for (const file of coverageToolInputs) {
    if (file === '.bun-version' || file === 'package.json') continue;
    if (file.startsWith('tooling/') || file.startsWith('bin/')) {
      runtimeBytes.set(file, readFileSync(path.join(packageRoot, file)));
    } else write(file, 'inert fixture capture input\n');
  }
  await captureRuntimeInputClosure(packageRoot, [...runtimeBytes.keys()], [], [], runtimeBytes);
  for (const [file, bytes] of runtimeBytes) if (file !== 'package.json' && file !== '.bun-version') write(file, bytes);
}

/** Only for a completed, owned inert fixture; never follow its dependency links. */
export function restoreOwnedCoverageDirectoryWrites(directory: string): void {
  chmodSync(directory, 0o700);
  for (const entry of readdirSync(directory, { withFileTypes: true }))
    if (entry.isDirectory()) restoreOwnedCoverageDirectoryWrites(path.join(directory, entry.name));
}
