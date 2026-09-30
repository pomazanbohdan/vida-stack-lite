import { test, expect } from 'bun:test';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { scanAdmittedRuntimeImports } from '../bin/forward-candidate-admission.mjs';
const parser = createRequire(new URL('../package.json', import.meta.url))('@babel/parser');
test('sealed admission ignores type-only imports and comments while retaining literal runtime imports', () => {
  const imports = scanAdmittedRuntimeImports(
    `import type {Foo} from './unexecuted.ts'; type Bar=import('./query-only.ts').Bar;
 // import(unsealedVariable)
 import './side-effect.mjs'; export { value } from './export.mjs'; export type {Type} from './type-export.ts';
 const next=()=>import('./lazy.mjs');`,
    parser,
  );
  expect(imports).toEqual(['./side-effect.mjs', './export.mjs', './lazy.mjs']);
});
test('sealed admission rejects actual computed runtime imports and computed module resources', () => {
  expect(() => scanAdmittedRuntimeImports('const next=()=>import(destination);', parser)).toThrow(
    'computed runtime import is unsealed',
  );
  expect(() => scanAdmittedRuntimeImports('const resource=new URL(destination,import.meta.url);', parser)).toThrow(
    'computed module resource is unsealed',
  );
});
test('sealed admission allows ordinary URL validation and seals literal import-meta resources', () => {
  expect(
    scanAdmittedRuntimeImports(
      `#!/usr/bin/env bun\nconst validator=new URL(destination); const resource=new URL('../schemas/example.json',import.meta.url);`,
      parser,
    ),
  ).toEqual(['../schemas/example.json']);
});
test('sealed admission follows literal require, createRequire aliases and runtime import-equals', () => {
  expect(
    scanAdmittedRuntimeImports(
      `import {createRequire as makeRequire} from 'node:module';
 const load=makeRequire(import.meta.url); const alias=load; const a=alias('./local.cjs');
 const b=require('node:fs'); const c=makeRequire(import.meta.url)('yaml'); import d=require('./equals.cjs');`,
      parser,
    ),
  ).toEqual(['node:module', './local.cjs', 'node:fs', 'yaml', './equals.cjs']);
});
test('sealed admission rejects computed require and createRequire-alias module arguments', () => {
  expect(() => scanAdmittedRuntimeImports('const a=require(destination);', parser)).toThrow(
    'computed require is unsealed',
  );
  expect(() =>
    scanAdmittedRuntimeImports(
      "import {createRequire} from 'node:module';const load=createRequire(import.meta.url);load(destination);",
      parser,
    ),
  ).toThrow('computed require is unsealed');
});
test('sealed admission supports only the existing attested fs-safe native package-root flow', () => {
  const file = 'vida-agent/src/config/safe-repository-access.ts';
  const source = readFileSync(
    path.join(
      process.env.VIDA_ADMISSION_TEST_BUNDLE ?? path.resolve(import.meta.dirname, '..'),
      'src/config/safe-repository-access.ts',
    ),
    'utf8',
  );
  expect(scanAdmittedRuntimeImports(source, parser, file).filter((item) => item === '@openclaw/fs-safe')).toHaveLength(
    4,
  );
  expect(() =>
    scanAdmittedRuntimeImports(
      source.replaceAll(
        "path.join(fsSafePackageRoot, 'dist', 'native.js')",
        "path.join(foreignRoot, 'dist', 'native.js')",
      ),
      parser,
      file,
    ),
  ).toThrow('computed require is unsealed');
  expect(() =>
    scanAdmittedRuntimeImports(
      source.replaceAll(
        "path.join(fsSafePackageRoot, 'dist', 'native.js')",
        "path.join(fsSafePackageRoot, 'dist', 'foreign.js')",
      ),
      parser,
      file,
    ),
  ).toThrow('computed require is unsealed');
  expect(() =>
    scanAdmittedRuntimeImports(
      source.replace('const fsSafePackageRoot = resolveFsSafePackageRoot();', 'const fsSafePackageRoot = foreignRoot;'),
      parser,
      file,
    ),
  ).toThrow('computed require is unsealed');
});
