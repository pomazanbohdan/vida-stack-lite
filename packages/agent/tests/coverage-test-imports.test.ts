import { expect, test } from 'bun:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { capturedModuleInputs, coverageInputs, coverageToolInputs, sha256 } from '../tooling/bun-coverage-evidence.ts';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('captured module union binds a shared Source/tool once and rejects conflicting byte identities', () => {
  const shared = { path: 'bin/shared.ts', sha256: sha256('shared Source/tool bytes') };
  const selectedTest = { path: 'tests/fixture.test.ts', sha256: sha256('test bytes') };
  const tool = { path: 'tooling/fixture.ts', sha256: sha256('tool bytes') };
  const inputs = {
    sources: [shared],
    test_inputs: [selectedTest],
    tool_inputs: [tool, { ...shared }],
  };
  expect(capturedModuleInputs(inputs)).toEqual([shared, selectedTest, tool]);
  expect(() =>
    capturedModuleInputs({ ...inputs, tool_inputs: [tool, { ...shared, sha256: sha256('foreign bytes') }] }),
  ).toThrow(/Captured module input digest conflicts across categories/u);
});

async function captureTest(
  source: string,
  extension = 'ts',
  guide?: { readonly reader: string; readonly bytes: string; readonly captured: boolean },
): Promise<void> {
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
    if (guide) {
      write('TESTING.md', guide.bytes);
      write(guide.reader, 'export const inertReader = true;\n');
      source = `import './${path.basename(guide.reader)}';\n` + source;
    }
    write(file, source);
    const inputs = await coverageInputs(
      root,
      guide
        ? {
            mode: 'focused-diagnostic',
            contour: 'capture-reader-fixture',
            sources: ['src/fixture.ts'],
            tests: [file],
          }
        : 'current',
    );
    expect(inputs.tests).toEqual([file]);
    expect(inputs.input_bytes[file]).toEqual(Buffer.from(source));
    expect(inputs.test_inputs.find((input) => input.path === file)?.sha256).toBe(sha256(source));
    if (guide) {
      expect(inputs.tool_inputs.find((input) => input.path === 'TESTING.md')?.sha256).toBe(
        guide.captured ? sha256(guide.bytes) : undefined,
      );
      expect(inputs.input_bytes['TESTING.md']).toEqual(guide.captured ? Buffer.from(guide.bytes) : undefined);
    }
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

test.each([
  { file: 'tests/development-controller.test.ts', captured: true },
  { file: 'tests/unrelated-reader.ts', captured: false },
])('coverage capture binds the controller package guide only for its reader: $file', async ({ file, captured }) => {
  await captureTest("import { test } from 'bun:test'; test('fixture', () => {});", 'ts', {
    reader: file,
    bytes: 'controller fixture guide\n',
    captured,
  });
});

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
