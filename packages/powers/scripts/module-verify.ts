import process from 'node:process';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkCorpus } from './check-corpus.ts';
import { errorMessage, parseCli, required, verifyModuleMigration } from './module-migration.ts';

async function main(args: string[]): Promise<void> {
  const command = args[0] === 'check-corpus' ? args.shift() : 'verify';
  const { values, flags } = parseCli(args);
  if (flags.size) throw new Error(`unknown flag: ${[...flags].join(', ')}`);
  for (const flag of values.keys()) if (!['--root', '--batch-dir', '--profile'].includes(flag)) throw new Error(`unknown flag: ${flag}`);
  const root = required(values, '--root');
  if (!isAbsolute(root)) throw new Error('--root must be an absolute path');
  if (command === 'check-corpus') {
    const issues = checkCorpus(resolve(root));
    console.log(JSON.stringify({ command, issueCount: issues.length, issues }));
    if (issues.length) process.exitCode = 1;
    return;
  }
  const batchDir = required(values, '--batch-dir');
  if (!isAbsolute(batchDir)) throw new Error('--batch-dir must be an absolute path');
  const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
  const profile = resolve(values.get('--profile') ?? join(repositoryRoot, 'vida-project-profile.json'));
  const result = await verifyModuleMigration(root, batchDir, profile);
  console.log(JSON.stringify({ command: 'verify', issueCount: result.issues.length, issues: result.issues, checks: result.checks }));
  if (result.issues.length) process.exitCode = 1;
}

if (import.meta.main) main(process.argv.slice(2)).catch((error: unknown) => { console.error(JSON.stringify({ kind: 'error', message: errorMessage(error) })); process.exitCode = 1; });
