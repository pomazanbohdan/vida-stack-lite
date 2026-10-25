import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const result = spawnSync(process.execPath, [
  'fmt', '--check', '--no-script', 'package.json', 'bunfig.toml',
], { cwd: root, encoding: 'utf8' });

if (result.error !== undefined) throw result.error;
process.stdout.write(result.stdout ?? '');
process.stderr.write(result.stderr ?? '');
process.exitCode = result.status ?? 1;
