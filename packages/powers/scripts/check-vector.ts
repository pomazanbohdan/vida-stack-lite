import { isEntryPoint } from '../skills/vp-mode/scripts/catalog-cli.ts';
import { runCheckVectorCli } from './vector.ts';

export function startCheckVectorEntry(argv: readonly string[], print?: (text: string) => void): number | undefined {
  if (!isEntryPoint(import.meta.url, argv[1])) return undefined;
  const code = runCheckVectorCli(argv.slice(2), print);
  process.exitCode = code;
  return code;
}

await startCheckVectorEntry(process.argv);
