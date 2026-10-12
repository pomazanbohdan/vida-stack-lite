import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, lstatSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { withStagedGitSnapshot } from './staged-git-snapshot.js';
import { classifyMaintainedSourcePath, findMaintainedJavaScriptViolations } from './ts-only-source-gate.js';
import { createCompilerProject } from './quality-current.js';

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
    throw new Error(
      `${path.basename(args[0] ?? executable)} failed: ${result.error?.message ?? result.signal ?? result.status}`,
    );
}

function packageManifest(root: string): PackageManifest {
  return Bun.JSONC.parse(readFileSync(path.join(root, 'packages/agent/package.json'), 'utf8')) as PackageManifest;
}

function verifyHost(bunExecutable: string, root: string, env: NodeJS.ProcessEnv, manifest: PackageManifest): void {
  const bunPin = readFileSync(path.join(root, 'packages/agent/.bun-version'), 'utf8').trim();
  if (bunPin.length === 0 || manifest.engines?.bun !== bunPin || manifest.packageManager !== `bun@${bunPin}`)
    throw new Error('Staged Bun pin and package manifest do not agree.');
  if (process.versions.bun !== bunPin || output(bunExecutable, ['--version'], root, env) !== bunPin)
    throw new Error(`Pre-commit must run under Bun ${bunPin}.`);
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
  readonly tsgolintNative: string;
}

type InstalledToolMetadata = Partial<
  Pick<typeof import('oxfmt/package.json') | typeof import('oxlint/package.json'), 'version'>
> & { bin?: string | Record<string, string> };

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
  const installed = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8')) as InstalledToolMetadata;
  if (installed.version !== expected) throw new Error(`Installed ${name} does not match staged version ${expected}.`);
  return { packageRoot, installed };
}

function installedTool(
  root: string,
  name: string,
  manifest: PackageManifest,
  lock: Lockfile,
  selectedBin?: string,
): string {
  const { packageRoot, installed } = installedPackage(root, name, manifest, lock);
  const binName = selectedBin ?? (name === 'typescript' ? 'tsc' : name === 'oxlint-tsgolint' ? 'tsgolint' : name);
  const bin = typeof installed.bin === 'string' ? installed.bin : installed.bin?.[binName];
  if (bin === undefined || path.isAbsolute(bin)) throw new Error(`Installed ${name} has no safe ${binName} CLI entry.`);
  const cli = path.resolve(packageRoot, bin);
  if (!cli.startsWith(path.resolve(packageRoot) + path.sep) || !existsSync(cli))
    throw new Error(`Installed ${name} CLI path is missing or escapes its package.`);
  return cli;
}

function installedTsgolintNative(root: string, manifest: PackageManifest, lock: Lockfile): string {
  const expected = lockedToolVersion('oxlint-tsgolint', manifest, lock);
  const requireFromPackage = createRequire(path.join(root, 'packages/agent/package.json'));
  const wrapper = JSON.parse(
    readFileSync(requireFromPackage.resolve('oxlint-tsgolint/package.json'), 'utf8'),
  ) as Partial<Pick<typeof import('oxlint-tsgolint/package.json'), 'name' | 'version'>>;
  if (wrapper.name !== 'oxlint-tsgolint' || wrapper.version !== expected)
    throw new Error('Installed oxlint-tsgolint wrapper differs from its locked owner.');
  const target = `${process.platform}-${process.arch}`;
  const name = `@oxlint-tsgolint/${target}`;
  const wrapperMetadata = lock.packages?.['oxlint-tsgolint']?.[2];
  if (
    typeof wrapperMetadata !== 'object' ||
    wrapperMetadata === null ||
    !('optionalDependencies' in wrapperMetadata) ||
    typeof wrapperMetadata.optionalDependencies !== 'object' ||
    wrapperMetadata.optionalDependencies === null ||
    !(name in wrapperMetadata.optionalDependencies) ||
    Reflect.get(wrapperMetadata.optionalDependencies, name) !== expected
  )
    throw new Error(`Staged Bun lock does not bind oxlint-tsgolint to ${name}@${expected}.`);
  if (lock.packages?.[name]?.[0] !== `${name}@${expected}`)
    throw new Error(`Staged Bun lock does not pin the ${name} native helper to ${expected}.`);
  const packageRoot = path.join(root, 'packages/agent/node_modules/@oxlint-tsgolint', target);
  const installed = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8')) as {
    readonly version?: string;
    readonly os?: readonly string[];
    readonly cpu?: readonly string[];
  };
  if (
    installed.version !== expected ||
    (installed.os !== undefined && !installed.os.includes(process.platform)) ||
    (installed.cpu !== undefined && !installed.cpu.includes(process.arch))
  )
    throw new Error(`Installed ${name} does not match the locked platform helper ${expected}.`);
  const executable = path.join(packageRoot, `tsgolint${process.platform === 'win32' ? '.exe' : ''}`);
  if (!existsSync(executable) || !lstatSync(executable).isFile())
    throw new Error(`Installed ${name} native executable is missing or not a regular file.`);
  return executable;
}

function toolchain(root: string, manifest: PackageManifest): Toolchain {
  const lock = Bun.JSONC.parse(readFileSync(path.join(root, 'packages/agent/bun.lock'), 'utf8')) as Lockfile;
  installedPackage(root, '@babel/parser', manifest, lock);
  installedTool(root, 'typescript', manifest, lock);
  return {
    knip: installedTool(root, 'knip', manifest, lock, 'knip-bun'),
    oxfmt: installedTool(root, 'oxfmt', manifest, lock),
    ...oxlintToolchain(root, manifest, lock),
  };
}

function isCodeFile(file: string): boolean {
  return /\.[cm]?[jt]sx?$/u.test(file);
}

function isTestFile(file: string): boolean {
  return /(?:^|\/)tests\//u.test(file) && isCodeFile(file);
}

function oxlintToolchain(
  root: string,
  manifest: PackageManifest,
  lock: Lockfile = Bun.JSONC.parse(readFileSync(path.join(root, 'packages/agent/bun.lock'), 'utf8')) as Lockfile,
): Pick<Toolchain, 'oxlint' | 'tsgolintNative'> {
  const expectedCli = installedTool(root, 'oxlint', manifest, lock);
  const owner = createRequire(path.join(root, 'packages/agent/package.json')).resolve('oxlint/package.json');
  const cli = path.join(path.dirname(owner), 'bin/oxlint');
  if (realpathSync(cli) !== realpathSync(expectedCli))
    throw new Error('Resolved Oxlint CLI differs from its installed owner.');
  return {
    oxlint: cli,
    tsgolintNative: installedTsgolintNative(root, manifest, lock),
  };
}

function executeOxlint(
  packageRoot: string,
  bunExecutable: string,
  env: NodeJS.ProcessEnv,
  oxlint: string,
  tsgolintNative: string,
): void {
  execute(
    bunExecutable,
    [oxlint, '--type-aware', '--max-warnings', '0', '--config', 'oxlint.config.json', 'bin', 'src', 'tests', 'tooling'],
    packageRoot,
    { ...env, OXLINT_TSGOLINT_PATH: tsgolintNative },
  );
}

function runStaticGates(
  root: string,
  bunExecutable: string,
  env: NodeJS.ProcessEnv,
  tools: Toolchain,
  trackedFiles: readonly string[],
): void {
  const pkg = path.join(root, 'packages/agent');
  execute(
    bunExecutable,
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
  const files = trackedFiles
    .filter((file) => classifyMaintainedSourcePath(file) === 'typescript')
    .map((file) => path.resolve(root, file));
  // The snapshot owner checks and cleans this parent; keep generated config outside its raw tree.
  const configPath = path.join(path.dirname(root), 'tsconfig.staged.json');
  writeFileSync(configPath, `${JSON.stringify(createCompilerProject(pkg, root, files), null, 2)}\n`, {
    flag: 'wx',
    mode: 0o600,
  });
  execute(bunExecutable, ['check', '--project', configPath, '--no-pretty'], pkg, env);
  executeOxlint(pkg, bunExecutable, env, tools.oxlint, tools.tsgolintNative);
}

function runOxlintLeaf(): void {
  const repositoryRoot = realpathSync(path.resolve(import.meta.dir, '../../..'));
  const packageRoot = path.join(repositoryRoot, 'packages/agent');
  const bunExecutable = realpathSync(process.execPath);
  const manifest = packageManifest(repositoryRoot);
  const env = isolatedEnvironment(process.env, packageRoot);
  verifyHost(bunExecutable, repositoryRoot, env, manifest);
  const tools = oxlintToolchain(repositoryRoot, manifest);
  executeOxlint(packageRoot, bunExecutable, env, tools.oxlint, tools.tsgolintNative);
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
      verifyHost(bunExecutable, snapshotRoot, env, manifest);
      const tools = toolchain(snapshotRoot, manifest);
      execute(
        bunExecutable,
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
      runStaticGates(snapshotRoot, bunExecutable, env, tools, trackedFiles);
    },
  });
}

if (import.meta.main) {
  if (process.argv[2] !== '--lint-oxlint' || process.argv.length !== 3)
    throw new Error('Usage: bun tooling/knip-precommit.ts --lint-oxlint');
  runOxlintLeaf();
}
