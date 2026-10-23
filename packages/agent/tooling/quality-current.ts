import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanMaintainedSources } from './ts-only-source-gate.js';
import { readPin } from '../bin/bun.ts';

function repositoryRootFromModule(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
}

export function createCompilerProject(
  packageRoot: string,
  rootDir: string,
  files: readonly string[],
): Record<string, unknown> {
  return {
    extends: path.resolve(packageRoot, 'tsconfig.checked-js.json'),
    compilerOptions: {
      allowJs: true,
      checkJs: true,
      jsx: 'preserve',
      noEmit: true,
      rootDir,
      typeRoots: [path.join(packageRoot, 'node_modules/@types')],
    },
    files: files.map((file) => path.resolve(packageRoot, file)),
    include: [],
    exclude: [],
  };
}

function run(): number {
  const repositoryRoot = repositoryRootFromModule();
  const report = scanMaintainedSources(repositoryRoot);
  process.stdout.write(
    `TS-only source gate: roots=${report.roots.join(',')} files=${report.counts.files} typescript=${report.counts.typescript} javascript_violations=${report.counts.javascriptViolations}\n`,
  );
  if (report.counts.violations > 0) {
    for (const violation of report.violations) process.stderr.write(`${violation.path}\t${violation.extension}\n`);
    return 1;
  }

  const packageRoot = path.join(repositoryRoot, 'packages/agent');
  if (process.versions.bun !== readPin(packageRoot))
    throw new Error('Current quality checks require the package-selected Bun.');
  const rootNames = report.typescriptFiles.map((file) => path.resolve(repositoryRoot, file));
  const temporaryDirectory = mkdtempSync(path.join(os.tmpdir(), 'vida-agent-quality-'));
  const configPath = path.join(temporaryDirectory, 'tsconfig.json');
  try {
    writeFileSync(
      configPath,
      `${JSON.stringify(createCompilerProject(packageRoot, repositoryRoot, rootNames), null, 2)}\n`,
      { flag: 'wx', mode: 0o600 },
    );
    const result = spawnSync(process.execPath, ['check', '--no-script', '--project', configPath, '--no-pretty'], {
      cwd: packageRoot,
      encoding: 'utf8',
      windowsHide: true,
    });
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.error) throw result.error;
    if (result.status !== 0) return result.status ?? 1;
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
  process.stdout.write(`TS-only check: ${rootNames.length} captured TypeScript source files, 0 diagnostics.\n`);
  return 0;
}

if (import.meta.main) {
  try {
    process.exitCode = run();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : 'Unknown current quality failure.'}\n`);
    process.exitCode = 2;
  }
}
