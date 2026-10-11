import { expect, test } from 'bun:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { coverageInputs, coverageToolInputs, sha256 } from '../tooling/bun-coverage-evidence.ts';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function captureTest(source: string, extension = 'ts'): Promise<void> {
  const root = mkdtempSync(path.join(tmpdir(), 'coverage-import-boundary-'));
  let passed = false;
  try {
    const write = (file: string, bytes: string | Buffer): void => {
      const target = path.join(root, file);
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, bytes);
    };
    for (const file of coverageToolInputs) write(file, 'inert captured tool input\n');
    write('package.json', JSON.stringify({ files: ['src/**', 'bin/**'], scripts: {} }));
    write('.bun-version', readFileSync(path.join(packageRoot, '.bun-version')));
    write('src/fixture.ts', 'export const fixture = true;\n');
    write('schemas/fixture.schema.json', '{}\n');
    write('templates/fixture.yaml', 'fixture: true\n');
    write('instructions/fixture.md', 'fixture\n');
    const file = `tests/fixture.test.${extension}`;
    write(file, source);
    const inputs = await coverageInputs(root);
    expect(inputs.tests).toEqual([file]);
    expect(inputs.input_bytes[file]).toEqual(Buffer.from(source));
    expect(inputs.test_inputs.find((input) => input.path === file)?.sha256).toBe(sha256(source));
    passed = true;
  } catch (error) {
    // Capture denial is terminal and has no running test subject or Runtime state.
    if (error instanceof Error && /Vitest-owned test before migration/u.test(error.message)) passed = true;
    throw error;
  } finally {
    if (passed) rmSync(root, { recursive: true, force: true });
    else console.error(`Preserved failed coverage import fixture at ${root}`);
  }
}

test('coverage capture accepts Vitest text fixtures, comments, and erased type-only references', async () => {
  await captureTest(`import { test } from 'bun:test';
    import type { TestAPI } from 'vitest';
    import { type SuiteAPI } from 'vitest';
    export type { TestAPI } from 'vitest';
    export { type SuiteAPI } from 'vitest';
    type Module = typeof import('vitest');
    const fixture = "import { describe as group } from 'vitest'; group.only('focused', () => {});";
    const template = \`require('vitest')\`;
    const resolvedOnly = require.resolve('vitest');
    // import { test } from 'vitest';
    /* import('vitest'); require('vitest'); */
    test('fixture', () => { void fixture; void template; void resolvedOnly; });`);
});

test.each([
  "import { test } from 'vitest'; test('case', () => {});",
  "import 'vitest';",
  "import { test } from /* boundary */ 'vitest';",
  "import { test } from 'vi\\u0074est';",
  "export * from 'vitest';",
  "export { test } from 'vitest';",
  "import { type TestAPI, test } from 'vitest'; test('case', () => {});",
  "const api = import(/* boundary */ 'vitest'); void api;",
  'const api = import(`vitest`); void api;',
  "const api = require(/* boundary */ 'vi\\u0074est'); void api;",
  "function fixture(require: (name: string) => unknown) { return require('vitest'); }",
])('coverage capture denies a static Vitest runtime module request: %s', async (source) => {
  await assert.rejects(captureTest(source), /Vitest-owned test before migration: tests\/fixture\.test\.ts/u);
});

test.each(['js', 'mjs', 'cjs', 'jsx', 'ts', 'mts', 'cts', 'tsx'])(
  'coverage import detection selects the supported %s parser without executing test code',
  async (extension) => {
    const jsx = extension.endsWith('x') ? 'const element = <section />; void element;' : '';
    await captureTest(`import { test } from 'bun:test'; ${jsx} test('case', () => {});`, extension);
    await assert.rejects(captureTest(`import 'vitest'; ${jsx}`, extension), /Vitest-owned test/u);
  },
);
