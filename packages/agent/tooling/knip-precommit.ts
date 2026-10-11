import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import { withStagedGitSnapshot } from './staged-git-snapshot.js';
import { findMaintainedJavaScriptViolations } from './ts-only-source-gate.js';
import { environmentPath } from './environment-path.js';

export interface FocusedTestGuard {
  (packageRoot: string, files: readonly string[]): Promise<void> | void;
}

export interface KnipPrecommitOptions {
  readonly repositoryRoot: string;
  readonly bunExecutable: string;
  readonly rejectFocusedTests: FocusedTestGuard;
}

interface PackageManifest {
  readonly dependencies?: Record<string, string>;
  readonly devDependencies?: Record<string, string>;
  readonly engines?: { readonly bun?: string; readonly node?: string };
  readonly packageManager?: string;
}

function isolatedEnvironment(source: NodeJS.ProcessEnv, packageRoot: string): NodeJS.ProcessEnv {
  const env = { ...source };
  for (const key of Object.keys(env))
    if (
      /^(?:NODE_OPTIONS|NODE_PATH|BUN_OPTIONS|BUN_INSTALL|VIDA_STANDALONE_.*|BUN_BE_BUN|COVERAGE_GATE_ROOT|CRAP_GATE_ROOT|BUN_NATIVE_COVERAGE_.*)$/iu.test(
        key,
      )
    )
      delete env[key];
  env.COVERAGE_GATE_ROOT = packageRoot;
  env.CRAP_GATE_ROOT = packageRoot;
  env.BUN_RUNTIME_TRANSPILER_CACHE_PATH = '0';
  env.JITI_FS_CACHE = 'false';
  env.npm_config_offline = 'true';
  return env;
}

function output(executable: string, args: readonly string[], cwd: string, env: NodeJS.ProcessEnv): string {
  const result = spawnSync(executable, [...args], { cwd, env, encoding: 'utf8', windowsHide: true });
  if (result.error || result.signal || !Number.isInteger(result.status) || result.status !== 0)
    throw new Error(
      `${path.basename(executable)} ${args[0] ?? ''} failed: ${result.stderr || result.error?.message || result.signal || result.status}`,
    );
  return result.stdout.trim();
}

function execute(executable: string, args: readonly string[], cwd: string, env: NodeJS.ProcessEnv): void {
  const result = spawnSync(executable, [...args], { cwd, env, stdio: 'inherit', windowsHide: true });
  if (result.error || result.signal || !Number.isInteger(result.status) || result.status !== 0)
    throw new Error(`${path.basename(executable)} failed: ${result.error?.message ?? result.signal ?? result.status}`);
}

function executableFromPath(name: string, env: NodeJS.ProcessEnv): string {
  for (const directory of environmentPath(env).split(path.delimiter).filter(Boolean)) {
    const candidate = path.resolve(directory, process.platform === 'win32' ? `${name}.exe` : name);
    if (existsSync(candidate) && statSync(candidate).isFile()) return realpathSync(candidate);
  }
  throw new Error(`Required host executable is missing from PATH: ${name}`);
}

function packageManifest(root: string): PackageManifest {
  return Bun.JSONC.parse(readFileSync(path.join(root, 'packages/agent/package.json'), 'utf8')) as PackageManifest;
}

function verifyHost(bunExecutable: string, root: string, env: NodeJS.ProcessEnv, manifest: PackageManifest): string {
  const bunPin = readFileSync(path.join(root, 'packages/agent/.bun-version'), 'utf8').trim();
  if (bunPin.length === 0 || manifest.engines?.bun !== bunPin || manifest.packageManager !== `bun@${bunPin}`)
    throw new Error('Staged Bun pin and package manifest do not agree.');
  if (process.versions.bun !== bunPin || output(bunExecutable, ['--version'], root, env) !== bunPin)
    throw new Error(`Pre-commit must run under Bun ${bunPin}.`);
  const nodePin = manifest.engines?.node;
  if (nodePin === undefined) throw new Error('Staged package manifest has no Node engine pin.');
  const node = executableFromPath('node', env);
  if (output(node, ['--version'], root, env) !== `v${nodePin}`) throw new Error(`Knip requires Node ${nodePin}.`);
  return node;
}

interface Lockfile {
  readonly workspaces?: Record<
    string,
    { readonly devDependencies?: Record<string, string>; readonly dependencies?: Record<string, string> }
  >;
  readonly packages?: Readonly<Record<string, readonly unknown[]>>;
}

interface Toolchain {
  readonly knip: string;
  readonly oxfmt: string;
  readonly oxlint: string;
  readonly oxlintTypeAware: string;
  readonly tsc: string;
}

function lockedToolVersion(name: string, manifest: PackageManifest, lock: Lockfile): string {
  const expected = manifest.devDependencies?.[name] ?? manifest.dependencies?.[name];
  if (expected === undefined) throw new Error(`Staged package manifest does not pin ${name}.`);
  if (
    (lock.workspaces?.['']?.devDependencies?.[name] ?? lock.workspaces?.['']?.dependencies?.[name]) !== expected ||
    lock.packages?.[name]?.[0] !== `${name}@${expected}`
  )
    throw new Error(`Staged Bun lock does not agree with the ${name} manifest pin.`);
  return expected;
}

function installedPackage(root: string, name: string, manifest: PackageManifest, lock: Lockfile) {
  const expected = lockedToolVersion(name, manifest, lock);
  const packageRoot = path.join(root, 'packages/agent/node_modules', name);
  const installed = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8')) as {
    bin?: string | Record<string, string>;
    version?: string;
  };
  if (installed.version !== expected) throw new Error(`Installed ${name} does not match staged version ${expected}.`);
  return { packageRoot, installed };
}

function installedTool(root: string, name: string, manifest: PackageManifest, lock: Lockfile): string {
  const { packageRoot, installed } = installedPackage(root, name, manifest, lock);
  const binName = name === 'typescript' ? 'tsc' : name === 'oxlint-tsgolint' ? 'tsgolint' : name;
  const bin = typeof installed.bin === 'string' ? installed.bin : installed.bin?.[binName];
  if (bin === undefined || path.isAbsolute(bin)) throw new Error(`Installed ${name} has no safe ${binName} CLI entry.`);
  const cli = path.resolve(packageRoot, bin);
  if (!cli.startsWith(path.resolve(packageRoot) + path.sep) || !existsSync(cli))
    throw new Error(`Installed ${name} CLI path is missing or escapes its package.`);
  return cli;
}

function toolchain(root: string, manifest: PackageManifest): Toolchain {
  const lock = Bun.JSONC.parse(readFileSync(path.join(root, 'packages/agent/bun.lock'), 'utf8')) as Lockfile;
  installedPackage(root, '@babel/parser', manifest, lock);
  return {
    knip: installedTool(root, 'knip', manifest, lock),
    oxfmt: installedTool(root, 'oxfmt', manifest, lock),
    oxlint: installedTool(root, 'oxlint', manifest, lock),
    oxlintTypeAware: installedTool(root, 'oxlint-tsgolint', manifest, lock),
    tsc: installedTool(root, 'typescript', manifest, lock),
  };
}

function isCodeFile(file: string): boolean {
  return /\.[cm]?[jt]sx?$/u.test(file);
}

function isTestFile(file: string): boolean {
  return /(?:^|\/)tests\//u.test(file) && isCodeFile(file);
}

function runStaticGates(root: string, node: string, env: NodeJS.ProcessEnv, tools: Toolchain): void {
  const pkg = path.join(root, 'packages/agent');
  execute(
    node,
    [
      tools.oxfmt,
      '--config',
      path.join(pkg, '.oxfmtrc.json'),
      '--check',
      ...['bin', 'src', 'tests', 'tooling', 'knip.config.ts'].map((relative) => path.join('packages/agent', relative)),
      'tooling/agent',
    ],
    root,
    env,
  );
  execute(node, [tools.tsc, '--project', 'tsconfig.json', '--noEmit'], pkg, env);
  execute(node, [tools.tsc, '--project', 'tsconfig.checked-js.json', '--noEmit'], pkg, env);
  execute(
    node,
    [
      tools.oxlint,
      '--type-aware',
      '--max-warnings',
      '0',
      '--config',
      'oxlint.config.json',
      'bin',
      'src',
      'tests',
      'tooling',
    ],
    pkg,
    env,
  );
}

export function rejectStagedJavaScriptSources(files: readonly string[]): void {
  const violations = findMaintainedJavaScriptViolations(files);
  if (violations.length === 0) return;
  const details = violations.map(({ path: file, extension }) => `${file}\t${extension}`).join('\n');
  throw new Error(`Staged TS-only source gate failed:\n${details}`);
}

/** Run staged Knip and the existing commit gates on one byte-stable index snapshot. */
export async function runPreCommit(options: KnipPrecommitOptions): Promise<void> {
  const repositoryRoot = realpathSync(options.repositoryRoot);
  const bunExecutable = realpathSync(options.bunExecutable);
  const dependencyRoot = path.join(repositoryRoot, 'packages/agent/node_modules');
  await withStagedGitSnapshot({
    repositoryRoot,
    dependencyMounts: [{ workspaceRelativePath: 'packages/agent', installedNodeModules: dependencyRoot }],
    run: async ({ snapshotRoot, env: stagedEnv, trackedFiles }) => {
      rejectStagedJavaScriptSources(trackedFiles);
      const packageRoot = path.join(snapshotRoot, 'packages/agent');
      const env = isolatedEnvironment({ ...stagedEnv }, packageRoot);
      const manifest = packageManifest(snapshotRoot);
      const node = verifyHost(bunExecutable, snapshotRoot, env, manifest);
      const tools = toolchain(snapshotRoot, manifest);
      execute(
        node,
        [
          tools.knip,
          '--directory',
          snapshotRoot,
          '--config',
          path.join(snapshotRoot, 'packages/agent/knip.config.ts'),
          '--no-progress',
          '--max-issues',
          '0',
          '--treat-config-hints-as-errors',
          '--treat-tag-hints-as-errors',
        ],
        snapshotRoot,
        env,
      );
      const testFiles = trackedFiles.filter(isTestFile).map((file) => path.join(snapshotRoot, file));
      await options.rejectFocusedTests(packageRoot, testFiles);
      runStaticGates(snapshotRoot, node, env, tools);
    },
  });
}
