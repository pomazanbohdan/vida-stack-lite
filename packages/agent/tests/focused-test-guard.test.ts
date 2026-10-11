import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'bun:test';
import { rejectFocusedTests } from '../tooling/focused-test-guard.js';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fixture(): { readonly file: string; readonly clean: () => void } {
  const directory = mkdtempSync(path.join(tmpdir(), 'focused-test-guard-'));
  return {
    file: path.join(directory, 'sample.test.ts'),
    clean: () => rmSync(directory, { recursive: true, force: true }),
  };
}

async function rejectsSource(source: string): Promise<void> {
  const temporary = fixture();
  try {
    writeFileSync(temporary.file, source);
    await assert.rejects(rejectFocusedTests(packageRoot, [temporary.file]), /Focused test is forbidden/);
  } finally {
    temporary.clean();
  }
}

async function acceptsSource(source: string): Promise<void> {
  const temporary = fixture();
  try {
    writeFileSync(temporary.file, source);
    await rejectFocusedTests(packageRoot, [temporary.file]);
  } finally {
    temporary.clean();
  }
}

test('rejects named aliases, computed focus, and local alias chains', async () => {
  await rejectsSource("import { test as check } from 'bun:test'; check.only('focused', () => {});");
  await rejectsSource("import { it as example } from 'bun:test'; example['only']('focused', () => {});");
  await rejectsSource(
    "import { describe as group } from 'vitest'; const nested = group; nested.only('focused', () => {});",
  );
});

test('rejects namespace and destructured test aliases', async () => {
  await rejectsSource("import * as suite from 'bun:test'; suite.test.only('focused', () => {});");
  await rejectsSource("import * as suite from 'bun:test'; suite.it.only('focused', () => {});");
  await rejectsSource("import * as suite from 'bun:test'; suite.describe['only']('focused', () => {});");
  await rejectsSource(
    "import * as suite from 'bun:test'; const { test: check } = suite; check.only('focused', () => {});",
  );
  await rejectsSource(
    "import * as suite from 'bun:test'; const check = suite.test; check['only']('focused', () => {});",
  );
});

test('resolves aliases wrapped in TypeScript assertions and non-null expressions', async () => {
  await rejectsSource(
    "import * as suite from 'bun:test'; const { test: check } = (suite as typeof suite)!; check.only('focused', () => {});",
  );
  await rejectsSource(
    "import { test as check } from 'bun:test'; const alias = (check as typeof check)!; alias.only('focused', () => {});",
  );
  await rejectsSource(
    "import * as suite from 'bun:test'; const alias = (suite satisfies typeof suite).describe; alias.only('focused', () => {});",
  );
  await rejectsSource(
    "import * as suite from 'bun:test'; const alias = (suite as typeof suite)!; alias.test.only('focused', () => {});",
  );
});

test('rejects aliases assigned after declaration and destructured only methods', async () => {
  await rejectsSource("import { test } from 'bun:test'; let alias; alias = test; alias.only('focused', () => {});");
  await rejectsSource("import { test } from 'bun:test'; const { only: focused } = test; focused('focused', () => {});");
});

test('rejects test.each and test.extend call results', async () => {
  await rejectsSource("import { test } from 'bun:test'; test.each.only('focused', () => {});");
  await rejectsSource("import { test } from 'bun:test'; const each = test.each; each.only('focused', () => {});");
  await rejectsSource(
    "import { test as check } from 'bun:test'; const rows = check.each([1]); rows.only('focused', () => {});",
  );
  await rejectsSource(
    "import { test as check } from 'bun:test'; const custom = check.extend({}); custom['only']('focused', () => {});",
  );
  await rejectsSource(
    "import { test } from 'bun:test'; const each = test.each; const rows = each([1]); rows.only('focused', () => {});",
  );
  await rejectsSource(
    "import { test } from 'bun:test'; const extend = test.extend; const custom = extend({}); custom.only('focused', () => {});",
  );
});

test('allows unrelated only properties, comments, strings, and ordinary tests', async () => {
  await acceptsSource(`import { test as check } from 'bun:test';
    const unrelated = { only: true };
    const text = "check.only('not code')";
    // check.only('also not code')
    check('regular test', () => assert.equal(unrelated.only, true));
    void text;`);
});

test('uses lexical binding identity when aliases and focused properties share names', async () => {
  await acceptsSource(`import { test } from 'bun:test';
    function a() { const x = test; }
    function b() { const x = {}; x.only('ordinary'); }`);
  await acceptsSource("import { test } from 'bun:test'; function ordinary(test: object) { test.only('ordinary'); }");
  await acceptsSource(
    "import { test as check } from 'bun:test'; function ordinary(check: object) { check.only('ordinary'); }",
  );
  await rejectsSource(
    "import { test } from 'bun:test'; const alias = test; function focused() { alias.only('focused'); }",
  );
});

test('retains implicit global focus detection when no local binding shadows it', async () => {
  await rejectsSource("test.only('focused', () => {});");
});

test('preserves imported test provenance through catch var and ordinary lexical shadowing', async () => {
  await rejectsSource("import check from 'node:test'; const alias = check; alias.only('focused', () => {});");
  await rejectsSource(
    "import { test } from 'bun:test'; try {} catch (error) { var alias = test; } alias.only('focused');",
  );
  await acceptsSource("import { test as check } from 'bun:test'; for (const check of []) { check.only('ordinary'); }");
  await acceptsSource(
    "import { test } from 'bun:test'; const ordinary = class test { static only() {} static run() { test.only(); } };",
  );
});
