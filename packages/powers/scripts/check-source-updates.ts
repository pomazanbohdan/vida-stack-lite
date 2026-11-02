import { isEntryPoint } from '../skills/vp-mode/scripts/catalog-cli.ts';
import { runCheckSourceUpdatesCli } from './source-updates.ts';

export function startCheckSourceUpdatesCli(
  argv: readonly string[],
  print?: (text: string) => void,
): number | undefined {
  if (!isEntryPoint(import.meta.url, argv[1])) return undefined;
  const code = runCheckSourceUpdatesCli(argv.slice(2), print);
  process.exitCode = code;
  return code;
}

await startCheckSourceUpdatesCli(process.argv);
