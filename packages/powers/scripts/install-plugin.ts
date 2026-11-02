import { access, lstat, mkdir, readFile, realpath, symlink } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isEntryPoint } from '../skills/vp-mode/scripts/catalog-cli.ts';

export type InstallHost = 'opencode' | 'pi' | 'codex';
export type InstallScope = 'project' | 'user';

export type InstallOptions = {
  packageRoot: string;
  host: InstallHost;
  scope: InstallScope;
  projectRoot?: string;
  home?: string;
  check?: boolean;
};

export type InstallResult = {
  host: InstallHost;
  scope: InstallScope;
  target: string;
  skills: string[];
  issues: string[];
};

const skillNames = ['vp-mode', 'vp-setup'] as const;

function targetFor(host: InstallHost, scope: InstallScope, projectRoot: string, home: string): string {
  if (host === 'codex') return projectRoot;
  if (host === 'opencode') return scope === 'project' ? join(projectRoot, '.opencode', 'skills') : join(home, '.config', 'opencode', 'skills');
  return scope === 'project' ? join(projectRoot, '.agents', 'skills') : join(home, '.agents', 'skills');
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function pointsAt(path: string, source: string): Promise<boolean> {
  try {
    const [target, expected] = await Promise.all([realpath(path), realpath(source)]);
    return target === expected;
  } catch {
    return false;
  }
}

async function skillHash(path: string): Promise<string | undefined> {
  try {
    return await readFile(join(path, 'SKILL.md'), 'utf8');
  } catch {
    return undefined;
  }
}

export async function installPlugin(options: InstallOptions): Promise<InstallResult> {
  const packageRoot = resolve(options.packageRoot);
  const projectRoot = resolve(options.projectRoot ?? process.cwd());
  const home = options.home ?? homedir();
  const target = targetFor(options.host, options.scope, projectRoot, home);
  const issues: string[] = [];

  if (options.host === 'codex') {
    for (const file of ['plugin.json', '.codex-plugin/plugin.json', '.agents/plugins/marketplace.json']) {
      if (!(await exists(join(packageRoot, file)))) issues.push(`missing ${file}`);
    }
    for (const name of skillNames) {
      if ((await skillHash(join(packageRoot, 'skills', name))) === undefined) issues.push(`missing skills/${name}/SKILL.md`);
    }
    return { host: options.host, scope: options.scope, target: packageRoot, skills: [...skillNames], issues };
  }

  if (options.check) {
    for (const name of skillNames) {
      const destination = join(target, name);
      if (!(await exists(destination))) {
        issues.push(`missing ${destination}`);
        continue;
      }
      const source = join(packageRoot, 'skills', name);
      if (!(await pointsAt(destination, source))) {
        const sourceBody = await skillHash(source);
        const destinationBody = await skillHash(destination);
        if (sourceBody === undefined || sourceBody !== destinationBody) issues.push(`mismatch ${destination}`);
      }
    }
    return { host: options.host, scope: options.scope, target, skills: [...skillNames], issues };
  }

  await mkdir(target, { recursive: true });
  for (const name of skillNames) {
    const source = join(packageRoot, 'skills', name);
    const destination = join(target, name);
    if (await exists(destination)) {
      if (!(await pointsAt(destination, source))) issues.push(`target exists and is not this package: ${destination}`);
      continue;
    }
    const parent = dirname(destination);
    await mkdir(parent, { recursive: true });
    await symlink(source, destination, process.platform === 'win32' ? 'junction' : 'dir');
    if (!(await lstat(destination)).isSymbolicLink()) issues.push(`link was not created: ${destination}`);
  }
  return { host: options.host, scope: options.scope, target, skills: [...skillNames], issues };
}

export type InstallIo = { out: (text: string) => void; err: (text: string) => void };

function flag(argv: readonly string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  return index === -1 ? undefined : argv[index + 1];
}

export async function runInstallCli(argv: readonly string[], io: InstallIo): Promise<number> {
  const host = flag(argv, '--host');
  if (host !== 'opencode' && host !== 'pi' && host !== 'codex') {
    io.err('usage: install-plugin.ts --host opencode|pi|codex [--scope project|user] [--package-root <path>] [--project-root <path>] [--home <path>] [--check]\n');
    return 2;
  }
  const scope = flag(argv, '--scope') ?? 'project';
  if (scope !== 'project' && scope !== 'user') {
    io.err('--scope must be project or user\n');
    return 2;
  }
  const result = await installPlugin({
    packageRoot: flag(argv, '--package-root') ?? resolve(dirname(fileURLToPath(import.meta.url)), '..'),
    host,
    scope,
    ...(flag(argv, '--project-root') === undefined ? {} : { projectRoot: flag(argv, '--project-root') as string }),
    ...(flag(argv, '--home') === undefined ? {} : { home: flag(argv, '--home') as string }),
    check: argv.includes('--check'),
  });
  io.out(`${JSON.stringify(result, null, 2)}\n`);
  for (const issue of result.issues) io.err(`${issue}\n`);
  return result.issues.length === 0 ? 0 : 1;
}

export async function startInstallCli(argv: readonly string[], io?: InstallIo): Promise<number | undefined> {
  if (!isEntryPoint(import.meta.url, argv[1])) return undefined;
  const target = io ?? {
    out: (text: string) => process.stdout.write(text),
    err: (text: string) => process.stderr.write(text),
  };
  const code = await runInstallCli(argv.slice(2), target);
  process.exitCode = code;
  return code;
}

await startInstallCli(process.argv);
