import process from 'node:process';
import { isAbsolute } from 'node:path';
import { applyModulePlan, errorMessage, moduleSource, optionalAtoms, parseCli, required } from './module-migration.ts';

async function main(args: string[]): Promise<void> {
  const { values, flags } = parseCli(args);
  for (const flag of values.keys()) if (!['--root', '--pilot', '--donor', '--source', '--as-of', '--expected-plan-sha', '--review', '--staging', '--atoms', '--writer'].includes(flag)) throw new Error(`unknown flag: ${flag}`);
  if ([...flags].some((flag) => flag !== '--apply')) throw new Error(`unknown flag: ${[...flags].join(', ')}`);
  const root = required(values, '--root'); const staging = required(values, '--staging');
  if (!isAbsolute(root) || !isAbsolute(staging)) throw new Error('--root and --staging must be absolute paths');
  const apply = flags.has('--apply');
  const expectedPlanSha = values.get('--expected-plan-sha') ?? '';
  if (apply && !/^[0-9a-f]{64}$/u.test(expectedPlanSha)) throw new Error('--expected-plan-sha is required with --apply');
  if (apply && !values.has('--review')) throw new Error('--review is required with --apply');
  const atoms = optionalAtoms(values); const asOf = values.get('--as-of'); const writer = values.get('--writer');
  const result = await applyModulePlan({
    root, staging, ...moduleSource(values), reviewPath: values.get('--review') ?? '', apply,
    ...(atoms === undefined ? {} : { atoms }), ...(asOf === undefined ? {} : { asOf }),
    ...(expectedPlanSha ? { expectedPlanSha } : {}), ...(writer === undefined ? {} : { writer }),
  });
  console.log(JSON.stringify({ kind: result.kind, planSha: result.plan.planSha, moduleId: result.plan.moduleId, atoms: result.plan.counts.atoms, targetOrder: result.plan.targetOrder, receipt: result.receipt, batchDir: result.batchDirectory }));
  if (result.kind === 'partial-or-unknown') process.exitCode = 4;
  else if (result.kind === 'no-write-conflict') process.exitCode = 3;
}

if (import.meta.main) main(process.argv.slice(2)).catch((error: unknown) => { console.error(JSON.stringify({ kind: 'error', message: errorMessage(error) })); process.exitCode = 1; });
