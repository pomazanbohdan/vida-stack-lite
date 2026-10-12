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
const [command = '', ...args] = process.argv.slice(2);
const output = (value: unknown): void => {
  process.stdout.write(`${JSON.stringify(value)}\n`);
};

try {
  if (!embedded) resolvePinnedBun({ root: packageRoot, executable: process.execPath });
  const metadata = cliMetadataResult([command, ...args], manifest);
  if (metadata) output(metadata);
  else if (command === 'instructions') {
    const option = cliCommandContracts.instructions.options[0];
    if (!option) throw new Error('instructions option declaration is unavailable');
    if (args[0] !== option.name || args.length !== option.arity + 1)
      throw new Error('instructions requires its declared option');
    const name = args[1];
    if (typeof name !== 'string' || !/^[a-z][a-z0-9-]*(?:\.md)?$/.test(name))
      throw new Error('invalid instruction name');
    const target = path.join(packageRoot, 'instructions', name.endsWith('.md') ? name : name + '.md');
    const stat = lstatSync(target);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('instruction must be a package-owned regular file');
    output({ schema: 'VidaAgentInstruction/v1', package: manifest.name, version: manifest.version, path: target });
  } else if (commands.has(command)) {
    for (let index = 0; index < args.length - 1; index++) {
      const projectArgument = args[index + 1];
      if (args[index] === '--project-root' && projectArgument !== undefined && path.isAbsolute(projectArgument))
        args[index + 1] = path.resolve(projectArgument);
    }
    const entrypoint = path.join(packageRoot, 'bin', cliCommandEntrypoint(command));
    if (embedded) {
      process.exitCode = runPinnedBun([entrypoint, ...args], {
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
      process.exitCode = result.status ?? 1;
    }
  } else {
    throw new Error('Unsupported public command; run vida-agent --help to list supported commands.');
  }
} catch (error: unknown) {
  process.stderr.write(`${JSON.stringify(cliErrorResult(error))}\n`);
  process.exitCode = 1;
}
