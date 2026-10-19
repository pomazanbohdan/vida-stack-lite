/**
 * Sanity check for packages/powers/donors.yaml.
 *
 * Verifies that the manifest parses, that every donor record is complete, and
 * that each recorded head_sha still matches the clone in .tmp/donors.
 * Scratch tooling: lives under the ignored .tmp directory.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import manifest from '../donors.yaml';

type Donor = {
  id: string;
  role: string;
  url: string;
  local_path: string;
  head_sha: string;
  checked_out: string;
  default_branch: string;
  license: string;
  license_file: string;
  file_count: number;
  [key: string]: unknown;
};

const manifestPath = path.resolve(import.meta.dir, '..', 'donors.yaml');
const repoRoot = path.resolve(import.meta.dir, '..', '..', '..');
const localRoot = path.resolve(repoRoot, manifest.local_root);
const errors: string[] = [];
const warnings: string[] = [];

function git(cwd: string, args: string[]): string {
  const result = spawnSync('git', ['-C', cwd, ...args], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
  return result.stdout.trim();
}

function countFiles(dir: string): number {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) total += countFiles(full);
    else if (entry.isFile()) total += 1;
  }
  return total;
}

const donors = manifest.donors as Donor[];
if (donors.length === 0) errors.push('no donor records parsed');
if (!existsSync(localRoot)) errors.push(`local_root missing: ${manifest.local_root}`);

const seen = new Set<string>();
for (const donor of donors) {
  if (seen.has(donor.id)) errors.push(`duplicate donor id: ${donor.id}`);
  seen.add(donor.id);

  for (const key of ['role', 'url', 'local_path', 'head_sha', 'checked_out', 'license', 'license_file'] as const) {
    const value = donor[key];
    if (typeof value !== 'string' || value.trim() === '') errors.push(`${donor.id}: missing required key '${key}'`);
  }
  if (!/^[0-9a-f]{40}$/.test(donor.head_sha)) errors.push(`${donor.id}: head_sha is not a full SHA: ${donor.head_sha}`);

  const clonePath = path.join(localRoot, donor.local_path);
  if (!existsSync(clonePath)) {
    errors.push(`${donor.id}: clone path missing: ${clonePath}`);
    continue;
  }

  const head = git(clonePath, ['rev-parse', 'HEAD']);
  if (head !== donor.head_sha) errors.push(`${donor.id}: head_sha mismatch (manifest ${donor.head_sha} vs clone ${head})`);

  const origin = git(clonePath, ['remote', 'get-url', 'origin']);
  const same = origin === donor.url || origin.replace(/\.git$/, '') === donor.url.replace(/\.git$/, '');
  if (!same) errors.push(`${donor.id}: origin mismatch (manifest ${donor.url} vs clone ${origin})`);

  if (!existsSync(path.join(clonePath, donor.license_file))) {
    errors.push(`${donor.id}: license file missing: ${donor.license_file}`);
  }

  const actual = countFiles(clonePath);
  if (actual !== donor.file_count) warnings.push(`${donor.id}: file_count ${donor.file_count} recorded vs ${actual} counted`);
}

console.log(`manifest: ${manifestPath}`);
console.log(`schema:   ${manifest.schema}`);
console.log(`donors:   ${donors.length}`);
for (const donor of donors) {
  console.log(`  ${donor.id.padEnd(22)} ${donor.head_sha.slice(0, 12)}  ${donor.license.padEnd(12)} ${donor.local_path}`);
}
console.log('');
for (const warning of warnings) console.log(`WARN  ${warning}`);
for (const error of errors) console.log(`ERROR ${error}`);
console.log(errors.length ? 'RESULT: FAILED' : 'RESULT: OK');
process.exitCode = errors.length ? 1 : 0;
