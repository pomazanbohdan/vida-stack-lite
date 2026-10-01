#!/usr/bin/env node
import { readFileSync, lstatSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { runPinnedBun, standaloneRuntime } from './bun.mjs';

const embedded = standaloneRuntime();
const packageRoot = embedded?.root ?? realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
const manifest = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
const [command, ...args] = process.argv.slice(2);
const commands = new Set([
  'run',
  'init',
  'install',
  'reconcile-artifacts',
  'documentation-clear',
  'scope',
  'development-controller',
]);
const output = (value) => process.stdout.write(`${JSON.stringify(value)}\n`);
try {
  if (command === '--help' || command === 'help') {
    if (args.length) throw new Error('help accepts no arguments');
    output({
      schema: 'VidaAgentCommandResult/v1',
      status: 'help',
      commands: [...commands, 'instructions', 'version'],
      run: 'run --project-root ABSOLUTE --repository ID --project ID --work-path RELATIVE --work-id ID --attempt NUMBER --team ID --kind KIND --intent INTENT --workflow ID [--scope-path RELATIVE ... | --scope-digest RETURNED_BINDING] [--intake ABSOLUTE_ACCEPTED_INTAKE_JSON]',
      scope: 'scope --project-root ABSOLUTE --repository ID --project ID --path RELATIVE [--path RELATIVE]',
      authority:
        'Scope inspection derives evidence; intake requires actual attributed work, scope and acceptance. Neither grants approval or authenticates native observations.',
    });
  } else if (command === 'version') {
    if (args.length) throw new Error('version accepts no arguments');
    output({ schema: 'VidaAgentPackage/v1', name: manifest.name, version: manifest.version });
  } else if (command === 'instructions') {
    if (args[0] !== '--path' || args.length !== 2) throw new Error('instructions requires --path NAME');
    const name = args[1];
    if (!/^[a-z][a-z0-9-]*(?:\.md)?$/.test(name)) throw new Error('invalid instruction name');
    const target = path.join(packageRoot, 'instructions', name.endsWith('.md') ? name : name + '.md');
    const stat = lstatSync(target);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('instruction must be a package-owned regular file');
    output({ schema: 'VidaAgentInstruction/v1', package: manifest.name, version: manifest.version, path: target });
  } else if (commands.has(command)) {
    for (let index = 0; index < args.length - 1; index++) {
      if (args[index] === '--project-root' && path.isAbsolute(args[index + 1]))
        args[index + 1] = path.resolve(args[index + 1]);
    }
    const entrypoint = path.join(packageRoot, 'bin', command + '.mjs');
    if (embedded) {
      process.exitCode = runPinnedBun([entrypoint, ...args], {
        root: packageRoot,
        cwd: process.cwd(),
        executable: embedded.executable,
      });
    } else {
      const childArgs = ['reconcile-artifacts', 'documentation-clear', 'development-controller'].includes(command)
        ? [path.join(packageRoot, 'bin', 'bun.mjs'), entrypoint, ...args]
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
    throw new Error(
      'Usage: vida-agent run|init|install|reconcile-artifacts|documentation-clear|scope ...; vida-agent instructions --path NAME; vida-agent version; vida-agent --help',
    );
  }
} catch (error) {
  process.stderr.write(
    `${JSON.stringify({ schema: 'VidaAgentCommandResult/v1', status: 'blocked', code: 'GAP-VIDA-CLI-001', message: error.message })}\n`,
  );
  process.exitCode = 1;
}
