import { chmodSync, cpSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { coverageToolInputs } from '../../tooling/bun-coverage-evidence.ts';

/** Materialize the actual runner import closure and inert current typecheck input. */
export function prepareCoverageRunnerInputs(root: string, packageRoot: string, packageFiles: string[]): void {
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
  for (const file of coverageToolInputs) {
    if (file === '.bun-version' || file === 'package.json') continue;
    if (file.startsWith('bin/')) continue;
    if (file.startsWith('tooling/')) {
      const target = path.join(root, file);
      mkdirSync(path.dirname(target), { recursive: true });
      cpSync(path.join(packageRoot, file), target);
    } else write(file, 'inert fixture capture input\n');
  }
  // The checkout-loaded runner imports this actual two-file CLI closure before
  // capture; isolated candidates must load the same implementation bytes.
  for (const file of ['bin/bun.ts', 'bin/cli-error-properties.ts']) {
    const target = path.join(root, file);
    mkdirSync(path.dirname(target), { recursive: true });
    cpSync(path.join(packageRoot, file), target);
  }
}

/** Only for a completed, owned inert fixture; never follow its dependency links. */
export function restoreOwnedCoverageDirectoryWrites(directory: string): void {
  chmodSync(directory, 0o700);
  for (const entry of readdirSync(directory, { withFileTypes: true }))
    if (entry.isDirectory()) restoreOwnedCoverageDirectoryWrites(path.join(directory, entry.name));
}
