import process from 'node:process';
import { isAbsolute, resolve } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { buildModulePlan, errorMessage, moduleSource, optionalAtoms, parseCli, required } from './module-migration.ts';

async function main(args: string[]): Promise<void> {
  const { values, flags } = parseCli(args);
  if (flags.size) throw new Error(`unknown flag: ${[...flags].join(', ')}`);
  for (const flag of values.keys()) if (!['--root', '--pilot', '--donor', '--source', '--atoms', '--staging', '--out', '--as-of'].includes(flag)) throw new Error(`unknown flag: ${flag}`);
  const root = required(values, '--root'); const staging = required(values, '--staging'); const out = required(values, '--out');
  if (!isAbsolute(root) || !isAbsolute(staging) || !isAbsolute(out)) throw new Error('--root, --staging and --out must be absolute paths');
  const atoms = optionalAtoms(values); const asOf = values.get('--as-of');
  const plan = await buildModulePlan({ root, staging, ...moduleSource(values), ...(atoms === undefined ? {} : { atoms }), ...(asOf === undefined ? {} : { asOf }) });
  const output = `${JSON.stringify(plan, null, 2)}\n`;
  await writeFile(resolve(out), output, { flag: 'wx' });
  console.log(JSON.stringify({ kind: 'planned', planSha: plan.planSha, moduleId: plan.moduleId, atoms: plan.counts.atoms, targets: plan.counts.targets, writes: plan.counts.writes, deletes: plan.counts.deletes, output: resolve(out), stagingPath: plan.stagingPath }));
}

if (import.meta.main) main(process.argv.slice(2)).catch((error: unknown) => { console.error(JSON.stringify({ kind: 'error', message: errorMessage(error) })); process.exitCode = 1; });
