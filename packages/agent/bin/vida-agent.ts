#!/usr/bin/env bun
import { readFileSync, lstatSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { resolvePinnedBun, runPinnedBun, standaloneRuntime } from './bun.ts';
import { commands, cliMetadataResult, cliErrorResult, cliCommandEntrypoint, type CliManifest } from './cli-metadata.ts';
import { cliCommandContracts } from './cli-command-contracts.ts';

const embedded = standaloneRuntime();
const packageRoot = embedded?.root ?? realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));

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

const manifestValue: unknown = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
if (!isCliPackageManifest(manifestValue)) throw new Error('CLI package manifest is invalid');
const manifest = manifestValue;
const output = (value: unknown): void => {
  process.stdout.write(`${JSON.stringify(value)}\n`);
};

function instructionResult(args: readonly string[]) {
  const option = cliCommandContracts.instructions.options[0];
  if (!option) throw new Error('instructions option declaration is unavailable');
  if (args[0] !== option.name || args.length !== option.arity + 1)
    throw new Error('instructions requires its declared option');
  const name = args[1];
  if (typeof name !== 'string' || !/^[a-z][a-z0-9-]*(?:\.md)?$/.test(name)) throw new Error('invalid instruction name');
  const target = path.join(packageRoot, 'instructions', name.endsWith('.md') ? name : name + '.md');
  const stat = lstatSync(target);
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

function forwardPublicCommand(command: string, suppliedArgs: readonly string[]) {
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
  const [command = '', ...args] = suppliedArgs;
  try {
    if (!embedded) resolvePinnedBun({ root: packageRoot, executable: process.execPath });
    const metadata = cliMetadataResult([command, ...args], manifest);
    if (metadata) output(metadata);
    else if (command === 'instructions') output(instructionResult(args));
    else if (commands.has(command)) exit.exitCode = forwardPublicCommand(command, args);
    else throw new Error('Unsupported public command; run vida-agent --help to list supported commands.');
  } catch (error: unknown) {
    process.stderr.write(`${JSON.stringify(cliErrorResult(error))}\n`);
    exit.exitCode = 1;
  }
}

if (embedded || import.meta.main) main();
