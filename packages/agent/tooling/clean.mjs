import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = new URL('..', import.meta.url);
const rootPath = path.resolve(fileURLToPath(root));
const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== '--dist-only')) {
  throw new Error('Usage: clean.mjs [--dist-only]');
}
const generatedDirectories = args.length ? ['dist'] : ['dist', 'coverage', '.pack-inspect'];

for (const name of generatedDirectories) {
  const target = path.resolve(rootPath, name);
  const relative = path.relative(rootPath, target);
  if (relative !== name || path.isAbsolute(relative) || relative.startsWith('..' + path.sep)) {
    console.error('candidate clean refused an out-of-root target: ' + target);
    process.exitCode = 1;
    continue;
  }
  try {
    const stats = await fs.lstat(target).catch(() => null);
    if (stats && (!stats.isDirectory() || stats.isSymbolicLink())) throw new Error(name + ' is not a real directory');
    await fs.rm(target, { recursive: true, force: true });
  } catch (error) {
    console.error(
      'candidate clean failed for ' + name + ': ' + (error instanceof Error ? error.message : String(error)),
    );
    process.exitCode = 1;
  }
}
