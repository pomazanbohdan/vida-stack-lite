import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runPreCommit } from '../../tooling/knip-precommit.js';

const packageRoot = path.resolve(import.meta.dirname, '../..');
const tools = ['knip', 'oxlint', 'oxlint-tsgolint', 'typescript'] as const;

export function fixtureGit(root: string, args: readonly string[]): string {
  const result = spawnSync('git', [...args], { cwd: root, encoding: 'utf8' });
  if (result.status !== 0 || result.error || result.signal) throw new Error(`fixture Git failed: ${result.stderr}`);
  return result.stdout;
}

export function formatPrecommitFixture(root: string, files: readonly string[]): void {
  const pkg = path.join(root, 'packages/agent');
  const result = spawnSync(process.execPath, [
    'fmt',
    '--no-script',
    '--config',
    path.join(pkg, '.oxfmtrc.json'),
    ...files.map((file) => path.join(pkg, file)),
  ]);
  if (result.status !== 0 || result.error || result.signal) throw new Error('Cannot format fixture configuration');
}

export function createPrecommitFixture(
  entries: readonly string[] = ['src/index.ts'],
  nativeCommandScripts: Partial<Record<'fmt' | 'check', string>> = {},
): string {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'vida-knip-gate-')));
  const manifest = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8')) as {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
    engines: Record<string, string>;
    packageManager: string;
  };
  const devDependencies = Object.fromEntries(tools.map((name) => [name, manifest.devDependencies[name]]));
  const dependencies = { '@babel/parser': manifest.dependencies['@babel/parser'] };
  const pkg = path.join(root, 'packages/agent');
  for (const directory of ['bin', 'src', 'tests', 'tooling']) {
    mkdirSync(path.join(pkg, directory), { recursive: true });
    writeFileSync(path.join(pkg, directory, '.keep'), '');
  }
  mkdirSync(path.join(root, 'tooling/agent'), { recursive: true });
  writeFileSync(path.join(root, 'tooling/agent/.keep'), '');
  writeFileSync(path.join(root, 'package.json'), JSON.stringify({ private: true, workspaces: ['packages/agent'] }));
  writeFileSync(
    path.join(pkg, 'package.json'),
    JSON.stringify({
      name: 'gate-fixture',
      private: true,
      type: 'module',
      devDependencies,
      dependencies,
      engines: manifest.engines,
      packageManager: manifest.packageManager,
      scripts: {
        knip: 'knip',
        format: 'bun fmt --no-script',
        lint: 'oxlint',
        typed: 'tsgolint',
        typecheck: 'bun check',
        ...nativeCommandScripts,
      },
    }),
  );
  writeFileSync(path.join(pkg, '.bun-version'), readFileSync(path.join(packageRoot, '.bun-version')));
  const lock = Bun.JSONC.parse(readFileSync(path.join(packageRoot, 'bun.lock'), 'utf8')) as Record<string, unknown>;
  writeFileSync(
    path.join(pkg, 'bun.lock'),
    JSON.stringify({ ...lock, workspaces: { '': { devDependencies, dependencies } } }),
  );
  writeFileSync(
    path.join(pkg, 'src/index.ts'),
    "import { parse } from '@babel/parser';\nexport const value = parse('true');\n",
  );
  writeFileSync(path.join(pkg, '.oxfmtrc.json'), '{}\n');
  writeFileSync(path.join(pkg, 'oxlint.config.json'), '{}\n');
  const config = {
    compilerOptions: { strict: true, target: 'ES2024', module: 'NodeNext', types: [] },
    include: ['src/**/*.ts'],
  };
  writeFileSync(path.join(pkg, 'tsconfig.json'), JSON.stringify(config));
  writeFileSync(path.join(pkg, 'tsconfig.checked-js.json'), JSON.stringify(config));
  writeFileSync(
    path.join(pkg, 'knip.config.ts'),
    `export default {
  workspaces: {
    '.': { entry: [], project: [] },
    'packages/agent': { entry: ${JSON.stringify(entries)}, project: ['src/**/*.ts'], ignoreBinaries: ${JSON.stringify(['fmt', 'check'].filter((name) => !(name in nativeCommandScripts)))} },
  },
};
`,
  );
  fixtureGit(root, ['init', '-q']);
  fixtureGit(root, ['add', '.']);
  // Installed tools are an external input; the staged tree contains only source/config.
  mkdirSync(path.join(pkg, 'node_modules'), { recursive: true });
  formatPrecommitFixture(root, ['knip.config.ts', 'src/index.ts']);
  fixtureGit(root, ['add', '--', 'packages/agent/knip.config.ts', 'packages/agent/src/index.ts']);
  return root;
}

export async function checkPrecommitFixture(
  root: string,
  guard: () => void,
  installedNodeModules = path.join(packageRoot, 'node_modules'),
): Promise<void> {
  // The production snapshot mounts the fixture's installed dependency directory.
  const { symlinkSync } = await import('node:fs');
  rmSync(path.join(root, 'packages/agent/node_modules'), { recursive: true });
  symlinkSync(installedNodeModules, path.join(root, 'packages/agent/node_modules'), 'junction');
  await runPreCommit({ repositoryRoot: root, bunExecutable: process.execPath, rejectFocusedTests: guard });
}
