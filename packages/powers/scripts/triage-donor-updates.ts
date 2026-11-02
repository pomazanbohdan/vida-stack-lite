import { isEntryPoint } from '../skills/vp-mode/scripts/catalog-cli.ts';
import { runTriageCli } from './donor-updates.ts';

export function startTriageDonorUpdatesCli(
  argv: readonly string[],
  print?: (text: string) => void,
): number | undefined {
  if (!isEntryPoint(import.meta.url, argv[1])) return undefined;
  const code = runTriageCli(argv.slice(2), print);
  process.exitCode = code;
  return code;
}

await startTriageDonorUpdatesCli(process.argv);
