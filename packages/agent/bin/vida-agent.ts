#!/usr/bin/env bun
import { readFileSync, lstatSync, readdirSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { resolvePinnedBun, runPinnedBun, standaloneRuntime } from './bun.ts';
import { commands, cliMetadataResult, cliErrorResult, cliCommandEntrypoint, type CliManifest } from './cli-metadata.ts';
import { cliCommandContracts } from './cli-command-contracts.ts';

function isStringMap(value: unknown): value is Record<string, string> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value).every((entry) => typeof entry === 'string');
}

function isCliPackageManifest(value: unknown): value is CliManifest & { name: string; version: string } {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    'name' in value &&
    typeof value.name === 'string' &&
    'version' in value &&
    typeof value.version === 'string' &&
    (!('bin' in value) || isStringMap(value.bin))
  );
}

function cliContext() {
  const embedded = standaloneRuntime();
  const packageRoot = embedded?.root ?? realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
  const manifest: unknown = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
  if (!isCliPackageManifest(manifest)) throw new Error('CLI package manifest is invalid');
  return { embedded, packageRoot, manifest };
}
const output = (value: unknown): void => {
  process.stdout.write(`${JSON.stringify(value)}\n`);
};

function editDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = previous[0] as number;
    previous[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const saved = previous[j] as number;
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      previous[j] = Math.min((previous[j] as number) + 1, (previous[j - 1] as number) + 1, diagonal + cost);
      diagonal = saved;
    }
  }
  return previous[right.length] as number;
}

function nearestInstructionName(target: string, names: readonly string[]): string | undefined {
  const normalized = target.endsWith('.md') ? target.slice(0, -3) : target;
  let best: string | undefined;
  let bestDistance = Number.MAX_SAFE_INTEGER;
  const lengthLimit = Math.max(6, Math.floor(normalized.length / 4));
  for (const name of names) {
    if (Math.abs(name.length - normalized.length) > lengthLimit) continue;
    const distance = editDistance(normalized, name);
    if (distance < bestDistance || (distance === bestDistance && best !== undefined && name < best)) {
      bestDistance = distance;
      best = name;
    }
  }
  const allowed = Math.max(3, Math.floor(normalized.length / 4));
  return best !== undefined && bestDistance <= allowed ? best : undefined;
}

function instructionNotFound(name: string, target: string, instructions: readonly string[]) {
  const nearest = nearestInstructionName(name, instructions);
  const error = new Error(`instruction not found: ${name}; valid instructions: ${instructions.join(', ')}`) as Error & {
    cliCode: string;
    details: { instruction: string; path: string; instructions: string[]; nearest?: string };
  };
  error.cliCode = 'INSTRUCTION_NOT_FOUND';
  error.details = {
    instruction: name,
    path: target,
    instructions: [...instructions],
    ...(nearest === undefined ? {} : { nearest }),
  };
  return error;
}

function instructionResult({ packageRoot, manifest }: ReturnType<typeof cliContext>, args: readonly string[]) {
  const option = cliCommandContracts.instructions.options[0];
  if (!option) throw new Error('instructions option declaration is unavailable');
  if (args[0] !== option.name || args.length !== option.arity + 1)
    throw new Error('instructions requires its declared option');
  const name = args[1];
  if (typeof name !== 'string' || !/^[a-z][a-z0-9-]*(?:\.md)?$/.test(name)) throw new Error('invalid instruction name');
  const bare = name.endsWith('.md') ? name.slice(0, -3) : name;
  const target = path.join(packageRoot, 'instructions', name.endsWith('.md') ? name : name + '.md');
  let stat;
  try {
    stat = lstatSync(target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    const instructions = readdirSync(path.join(packageRoot, 'instructions'))
      .filter((entry) => entry.endsWith('.md'))
      .map((entry) => entry.slice(0, -3))
      .sort();
    throw instructionNotFound(bare, target, instructions);
  }
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('instruction must be a package-owned regular file');
  return { schema: 'VidaAgentInstruction/v1', package: manifest.name, version: manifest.version, path: target };
}

function commandArguments(args: readonly string[]): string[] {
  const normalized = [...args];
  for (let index = 0; index < normalized.length - 1; index++) {
    const projectArgument = normalized[index + 1];
    if (normalized[index] === '--project-root' && projectArgument !== undefined && path.isAbsolute(projectArgument))
      normalized[index + 1] = path.resolve(projectArgument);
  }
  return normalized;
}

function forwardPublicCommand(
  { embedded, packageRoot }: ReturnType<typeof cliContext>,
  command: string,
  suppliedArgs: readonly string[],
) {
  const args = commandArguments(suppliedArgs);
  const entrypoint = path.join(packageRoot, 'bin', cliCommandEntrypoint(command));
  if (embedded) {
    return runPinnedBun([entrypoint, ...args], {
      root: packageRoot,
      cwd: process.cwd(),
      executable: embedded.executable,
    });
  } else {
    const childArgs = ['reconcile-artifacts', 'documentation-clear', 'development-controller'].includes(command)
      ? [path.join(packageRoot, 'bin', 'bun.ts'), entrypoint, ...args]
      : [entrypoint, ...args];
    const result = spawnSync(process.execPath, childArgs, {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit',
      windowsHide: true,
    });
    if (result.error) throw result.error;
    return result.status ?? 1;
  }
}

export function main({
  args: suppliedArgs = process.argv.slice(2),
  exit = process,
}: {
  args?: readonly string[];
  exit?: Partial<Pick<NodeJS.Process, 'exitCode'>>;
} = {}): void {
  const context = cliContext();
  const [command = '', ...args] = suppliedArgs;
  try {
    if (!context.embedded) resolvePinnedBun({ root: context.packageRoot, executable: process.execPath });
    const metadata = cliMetadataResult([command, ...args], context.manifest);
    if (metadata) output(metadata);
    else if (command === 'instructions') output(instructionResult(context, args));
    else if (commands.has(command)) exit.exitCode = forwardPublicCommand(context, command, args);
    else throw new Error('Unsupported public command; run vida-agent --help to list supported commands.');
  } catch (error: unknown) {
    process.stderr.write(`${JSON.stringify(cliErrorResult(error))}\n`);
    exit.exitCode = 1;
  }
}

if (import.meta.main || standaloneRuntime()) main();
else cliContext();
