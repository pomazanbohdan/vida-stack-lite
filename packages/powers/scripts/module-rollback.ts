import process from 'node:process';
import { isAbsolute } from 'node:path';
import { rollbackModulePlan, errorMessage, parseCli, required } from './module-migration.ts';

async function main(args: string[]): Promise<void> {
  const { values, flags } = parseCli(args);
  for (const flag of values.keys()) if (!['--batch-dir', '--review', '--staging', '--writer'].includes(flag)) throw new Error(`unknown flag: ${flag}`);
  const batchDir = required(values, '--batch-dir'); const staging = required(values, '--staging');
  if (!isAbsolute(batchDir) || !isAbsolute(staging)) throw new Error('--batch-dir and --staging must be absolute paths');
  const apply = flags.has('--apply');
  if (apply && !values.has('--review')) throw new Error('--review is required with --apply');
  const reviewPath = values.get('--review'); const writer = values.get('--writer');
  const result = await rollbackModulePlan({ batchDir, staging, apply, ...(reviewPath === undefined ? {} : { reviewPath }), ...(writer === undefined ? {} : { writer }) });
  console.log(JSON.stringify({ kind: result.kind, planSha: result.planSha, targetOrder: result.targets.map((target) => target.path), receipt: result.receipt, batchDir: result.batchDirectory }));
  if (result.kind === 'partial-or-unknown') process.exitCode = 4;
  else if (result.kind === 'no-write-conflict') process.exitCode = 3;
}

if (import.meta.main) main(process.argv.slice(2)).catch((error: unknown) => { console.error(JSON.stringify({ kind: 'error', message: errorMessage(error) })); process.exitCode = 1; });
