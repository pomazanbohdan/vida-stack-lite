import { isEntryPoint } from '../skills/vp-mode/scripts/catalog-cli.ts';
import { runBuildBaselineCli } from './source-updates.ts';

export function startBuildSourceBaselineCli(
  argv: readonly string[],
  print?: (text: string) => void,
): number | undefined {
  if (!isEntryPoint(import.meta.url, argv[1])) return undefined;
  const code = runBuildBaselineCli(argv.slice(2), print);
  process.exitCode = code;
  return code;
}

await startBuildSourceBaselineCli(process.argv);
