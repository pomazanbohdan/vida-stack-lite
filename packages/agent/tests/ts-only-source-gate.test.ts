import { afterEach, describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseArguments, scanMaintainedSources } from '../tooling/ts-only-source-gate.js';
import { createCompilerProject } from '../tooling/quality-current.js';

const roots = ['packages/agent', 'packages/plugin', 'tests/agent', 'tooling/agent', '.githooks'];

let temporaryRoots: string[] = [];

function fixture(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), 'ts-only-source-gate-'));
  temporaryRoots.push(root);
  for (const sourceRoot of roots) mkdirSync(path.join(root, sourceRoot), { recursive: true });
  return root;
}

function put(root: string, relative: string, contents = ''): void {
  const file = path.join(root, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, contents);
}

function compileFiles(packageRoot: string, root: string, files: readonly string[]) {
  const configPath = path.join(root, 'quality-tsconfig.json');
  writeFileSync(configPath, `${JSON.stringify(createCompilerProject(packageRoot, root, files), null, 2)}\n`, {
    flag: 'wx',
    mode: 0o600,
  });
  return spawnSync(process.execPath, ['check', '--project', configPath, '--no-pretty'], {
    cwd: packageRoot,
    encoding: 'utf8',
    windowsHide: true,
  });
}

afterEach(() => {
  for (const root of temporaryRoots) rmSync(root, { recursive: true, force: true });
  temporaryRoots = [];
});

describe('TS-only maintained source gate', () => {
  test('rejects legacy JavaScript and accepts TypeScript declarations and modules', () => {
    const root = fixture();
    put(root, 'packages/agent/src/legacy.mjs');
    put(root, 'packages/agent/src/current.ts');
    put(root, 'packages/agent/src/native.cts');
    put(root, 'packages/agent/src/contract.d.ts');

    const result = scanMaintainedSources(root);

    expect(result.violations.map(({ path: file }) => file)).toEqual(['packages/agent/src/legacy.mjs']);
    expect(result.counts.typescript).toBe(3);
    expect(result.counts.violations).toBe(1);
  });

  test('includes handwritten package configuration outside runtime subdirectories', () => {
    const root = fixture();
    put(root, 'packages/agent/vitest.config.mjs');
    put(root, 'packages/agent/current.config.ts');
    const result = scanMaintainedSources(root);
    expect(result.violations.map(({ path: file }) => file)).toEqual(['packages/agent/vitest.config.mjs']);
    expect(result.counts.typescript).toBe(1);
  });

  test('excludes only declared generated output boundaries', () => {
    const root = fixture();
    put(root, 'packages/plugin/dist/generated.js');
    put(root, 'packages/agent/src/dist/handwritten.js');

    const result = scanMaintainedSources(root);

    expect(result.generatedExcludedPaths).toEqual(['packages/plugin/dist']);
    expect(result.violations.map(({ path: file }) => file)).toEqual(['packages/agent/src/dist/handwritten.js']);
  });

  test('excludes links only at the declared package dependency roots', () => {
    const root = fixture();
    const baseline = scanMaintainedSources(root);
    for (const relative of ['packages/agent/node_modules', 'packages/plugin/node_modules']) {
      const target = path.join(root, 'external', relative.replaceAll('/', '-'));
      mkdirSync(target, { recursive: true });
      writeFileSync(path.join(target, 'vendor.js'), 'export const vendor = true;\n');
      symlinkSync(target, path.join(root, relative), 'dir');
    }

    const result = scanMaintainedSources(root);

    expect(result.generatedExcludedPaths).toEqual(['packages/agent/node_modules', 'packages/plugin/node_modules']);
    expect(result.counts.files).toBe(baseline.counts.files);
    expect(result.counts.typescript).toBe(baseline.counts.typescript);
    expect(result.counts.javascriptViolations).toBe(baseline.counts.javascriptViolations);
    expect(result.codeFiles).toEqual(baseline.codeFiles);
    expect(result.typescriptFiles).toEqual(baseline.typescriptFiles);
    expect(result.violations).toEqual(baseline.violations);
  });

  test('continues to reject links at source, unknown dependency, and other generated boundaries', () => {
    for (const relative of [
      'packages/agent/src/linked',
      'tests/agent/node_modules',
      'packages/agent/.tmp',
      'packages/agent/dist',
    ]) {
      const root = fixture();
      const target = path.join(root, 'external', relative.replaceAll('/', '-'));
      mkdirSync(target, { recursive: true });
      const link = path.join(root, relative);
      mkdirSync(path.dirname(link), { recursive: true });
      symlinkSync(target, link, 'dir');

      expect(() => scanMaintainedSources(root)).toThrow(/symbolic link/i);
    }
  });

  test('finds handwritten JavaScript even when a parent Git ignore rule would hide it', () => {
    const root = fixture();
    put(root, '.gitignore', 'packages/agent/tests/ignored.js\n');
    put(root, 'packages/agent/tests/ignored.js');

    const result = scanMaintainedSources(root);

    expect(result.violations.map(({ path: file }) => file)).toEqual(['packages/agent/tests/ignored.js']);
  });

  test('retains mutation evidence outside maintained Source without traversing its sandbox dependencies', () => {
    const root = fixture();
    put(root, 'packages/agent/.tmp/mutation-evidence/sandbox/subject.js');
    symlinkSync(
      path.join(root, 'packages/plugin'),
      path.join(root, 'packages/agent/.tmp/mutation-evidence/sandbox/node_modules'),
      'dir',
    );
    put(root, 'packages/plugin/.tmp/diagnostic.js');
    put(root, 'packages/agent/src/.tmp/handwritten.js');
    const result = scanMaintainedSources(root);
    expect(result.generatedExcludedPaths).toEqual(['packages/agent/.tmp', 'packages/plugin/.tmp']);
    expect(result.violations.map((entry) => entry.path)).toEqual(['packages/agent/src/.tmp/handwritten.js']);
  });

  test('enumerates nested maintained paths and reports stable sorted output', () => {
    const root = fixture();
    put(root, 'tooling/agent/z-parent/deep/z-helper.cjs');
    put(root, 'tooling/agent/a-helper.tsx');
    put(root, 'packages/plugin/nested/feature.jsx');

    const first = scanMaintainedSources(root);
    const second = scanMaintainedSources(root);

    expect(first.roots).toEqual(roots);
    expect(first.violations.map(({ path: file }) => file)).toEqual([
      'packages/plugin/nested/feature.jsx',
      'tooling/agent/z-parent/deep/z-helper.cjs',
    ]);
    expect(first).toEqual(second);
  });

  test('captures all native TypeScript roots, including src-check and package-level files', () => {
    const root = fixture();
    put(root, 'packages/agent/src-check/contracts/check.ts');
    put(root, 'packages/agent/tooling/helper.mts');
    put(root, 'packages/agent/tests/helper.cts');
    put(root, 'packages/agent/knip.config.tsx');

    const result = scanMaintainedSources(root);

    expect(result.typescriptFiles).toEqual([
      'packages/agent/knip.config.tsx',
      'packages/agent/src-check/contracts/check.ts',
      'packages/agent/tests/helper.cts',
      'packages/agent/tooling/helper.mts',
    ]);
  });

  test('inherits the checked project options and compiles captured TSX and native extensions', () => {
    const root = fixture();
    put(root, 'package.json', '{"type":"module"}\n');
    put(root, 'packages/agent/src/native.cts', 'const commonJsValue: number = 7;\n');
    put(root, 'packages/agent/src/native.mts', 'export const value: number = 42;\n');
    put(
      root,
      'packages/agent/src/use-native.ts',
      "import { value } from './native.mts';\nexport const answer = value;\n",
    );
    put(
      root,
      'packages/agent/src/view.tsx',
      'declare global { namespace JSX { interface IntrinsicElements { div: Record<string, unknown> } } }\nexport const view = <div />;\n',
    );
    const report = scanMaintainedSources(root);
    const files = report.typescriptFiles.map((file) => path.resolve(root, file));
    const packageRoot = path.resolve(process.cwd());
    const result = compileFiles(packageRoot, root, files);

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
  });

  test('rejects a strict nullability error through the inherited checked project', () => {
    const root = fixture();
    put(root, 'package.json', '{"type":"module"}\n');
    put(
      root,
      'packages/agent/src/strictness.ts',
      'const maybeValue: string | undefined = undefined;\nconst requiredValue: string = maybeValue;\nexport { requiredValue };\n',
    );
    const report = scanMaintainedSources(root);
    const files = report.typescriptFiles.map((file) => path.resolve(root, file));
    const result = compileFiles(path.resolve(process.cwd()), root, files);

    expect(result.error).toBeUndefined();
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toContain('TS2322');
  });

  test('fails closed when a declared source root is missing', () => {
    const root = fixture();
    rmSync(path.join(root, 'tests/agent'), { recursive: true });

    expect(() => scanMaintainedSources(root)).toThrow();
  });

  test('fails closed on symlinks and unsupported or root-selecting CLI arguments', () => {
    const root = fixture();
    const outside = path.join(root, 'outside');
    mkdirSync(outside);
    put(root, 'outside/escaped.js');
    mkdirSync(path.join(root, 'packages/agent/src'), { recursive: true });
    symlinkSync(outside, path.join(root, 'packages/agent/src/linked'), 'dir');

    expect(() => scanMaintainedSources(root)).toThrow(/symbolic link/i);
    expect(() => scanMaintainedSources(root, ['../outside'])).toThrow(/unknown|escape/i);
    expect(parseArguments([])).toEqual({ format: 'json' });
    expect(parseArguments(['--format', 'table'])).toEqual({ format: 'table' });
    expect(() => parseArguments(['--roots', '../outside'])).toThrow(/unsupported/i);
    expect(() => parseArguments(['unexpected'])).toThrow(/unsupported/i);
  });
});
