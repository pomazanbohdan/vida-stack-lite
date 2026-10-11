import { test, expect } from 'bun:test';
import * as parser from '@babel/parser';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { scanAdmittedRuntimeImports } from '../bin/forward-candidate-admission.ts';
test('sealed admission ignores type-only imports and comments while retaining literal runtime imports', () => {
  const imports = scanAdmittedRuntimeImports(
    `import type {Foo} from './unexecuted.ts'; type Bar=import('./query-only.ts').Bar;
 // import(unsealedVariable)
 import './side-effect.mjs'; export { value } from './export.mjs'; export {} from './empty-export.mjs';
 export type {Type} from './type-export.ts';
 const next=()=>import('./lazy.mjs');`,
    parser,
  );
  expect(imports).toEqual(['./side-effect.mjs', './export.mjs', './empty-export.mjs', './lazy.mjs']);
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
const nativeFile = 'vida-agent/src/config/safe-repository-access.ts';
const nativeSource = readFileSync(
  path.join(
    process.env.VIDA_ADMISSION_TEST_BUNDLE ?? path.resolve(import.meta.dirname, '..'),
    'src/config/safe-repository-access.ts',
  ),
  'utf8',
);

test('sealed admission supports the maintained attested fs-safe root and native identity flow', () => {
  const imports = scanAdmittedRuntimeImports(nativeSource, parser, nativeFile);
  expect(imports).toEqual([
    'node:fs',
    'node:crypto',
    'neverthrow',
    'node:module',
    'node:path',
    '@openclaw/fs-safe',
    '@openclaw/fs-safe/config',
    '@openclaw/fs-safe/advanced',
    '@openclaw/fs-safe/file-lock',
    '@openclaw/fs-safe/errors',
    './fs-safe-attestation.js',
    // Literal root resolution, bounded native resolution, binary identity and two platform loads.
    '@openclaw/fs-safe',
    '@openclaw/fs-safe',
    '@openclaw/fs-safe',
    '@openclaw/fs-safe',
    '@openclaw/fs-safe',
  ]);
  expect(() => scanAdmittedRuntimeImports(nativeSource, parser, 'foreign.ts')).toThrow('computed require is unsealed');
});

const nativeDenials: readonly [string, string, string, number][] = [
  [
    'foreign root',
    "path.join(fsSafePackageRoot, 'dist', 'native.js')",
    "path.join(foreignRoot, 'dist', 'native.js')",
    2,
  ],
  [
    'foreign module',
    "path.join(fsSafePackageRoot, 'dist', 'native.js')",
    "path.join(fsSafePackageRoot, 'dist', 'foreign.js')",
    2,
  ],
  [
    'unresolved root',
    'const fsSafePackageRoot = resolveFsSafePackageRoot();',
    'const fsSafePackageRoot = foreignRoot;',
    1,
  ],
  [
    'foreign native package',
    "const name = '@openclaw/fs-safe-' + nativeTarget;",
    "const name = '@foreign/package-' + nativeTarget;",
    1,
  ],
  [
    'foreign require anchor',
    "createRequire(path.join(root, 'dist', 'native.js'))",
    "createRequire(path.join(root, 'other', 'native.js'))",
    1,
  ],
  ['native resolve argument', 'packageRequire.resolve(name)', 'packageRequire.resolve(foreignName)', 1],
  ['native directory', 'const nativeRoot = path.dirname(entry);', 'const nativeRoot = foreignRoot;', 1],
  ['missing version check', 'metadata.version !== fsSafeVersion', 'false', 2],
  ['missing native main check', "metadata.main !== 'fs-safe-native.node'", 'false', 1],
  ['missing exact entry check', "entry !== path.join(nativeRoot, 'fs-safe-native.node')", 'false', 1],
  [
    'foreign native binary',
    "moduleRequire(path.join(nativeRoot, 'fs-safe-native.node'))",
    "moduleRequire(path.join(nativeRoot, 'foreign.node'))",
    1,
  ],
  [
    'foreign native target',
    'const fsSafePackageNativeTarget = fsSafeNativeTarget();',
    'const fsSafePackageNativeTarget = foreignTarget;',
    1,
  ],
  [
    'missing Linux attestation guard',
    "!fsSafePackageAttested || process.platform !== 'linux'",
    "false || process.platform !== 'linux'",
    1,
  ],
  [
    'missing Windows attestation guard',
    "!fsSafePackageAttested || process.platform !== 'win32'",
    "false || process.platform !== 'win32'",
    1,
  ],
  ['foreign digest map', "} from './fs-safe-attestation.js';", "} from './foreign-attestation.js';", 1],
  [
    'reassigned loader',
    'const moduleRequire = createRequire(import.meta.url);',
    'let moduleRequire = createRequire(import.meta.url); moduleRequire = foreignRequire;',
    1,
  ],
  [
    'shadowed loader',
    'function matchesAttestedNativeBinding(binding: unknown): boolean {',
    'function matchesAttestedNativeBinding(binding: unknown): boolean { const moduleRequire = foreignRequire;',
    1,
  ],
  ['extra native call argument', 'packageRequire.resolve(name)', 'packageRequire.resolve(name, foreignOptions)', 1],
];
for (const [label, before, after, expectedOccurrences] of nativeDenials)
  test('sealed native admission rejects ' + label, () => {
    expect(nativeSource.split(before).length - 1).toBe(expectedOccurrences);
    const changed = nativeSource.replaceAll(before, after);
    expect(changed).not.toBe(nativeSource);
    expect(() => scanAdmittedRuntimeImports(changed, parser, nativeFile)).toThrow('computed require is unsealed');
  });

for (const [label, source] of [
  ['computed resolver property', "require['resolve'](destination);"],
  ['optional loader', 'require?.(destination);'],
  ['optional resolver', 'require.resolve?.(destination);'],
  ['dynamic resolver member', 'require[method](destination);'],
] as const)
  test('sealed admission rejects unverified ' + label, () => {
    expect(() => scanAdmittedRuntimeImports(source, parser)).toThrow('computed require');
  });

for (const [name, next, replacement] of [
  [
    'fsSafePackageTreeHash',
    '\nconst fsSafePackageRoot =',
    'function fsSafePackageTreeHash(root: string, nativeTarget: string): string { return fsSafePackageTreeSha256ByNativeTarget[nativeTarget]!; }\n',
  ],
  [
    'readFsSafePackageFile',
    '\nfunction resolveFsSafePackageRoot(',
    'function readFsSafePackageFile(root: string, relative: string): Buffer { return Buffer.from("unverified"); }\n',
  ],
] as const)
  test('sealed native admission rejects unverified ' + name, () => {
    const marker = 'function ' + name + '(';
    expect(nativeSource.split(marker).length - 1).toBe(1);
    const start = nativeSource.indexOf(marker);
    const end = nativeSource.indexOf(next, start);
    expect(end).toBeGreaterThan(start);
    const original = nativeSource.slice(start, end);
    const changed = nativeSource.replace(original, replacement);
    expect(changed).not.toBe(nativeSource);
    expect(() => scanAdmittedRuntimeImports(changed, parser, nativeFile)).toThrow('computed require is unsealed');
  });

test('sealed admission treats imported assertion require as a sealed ordinary function', () => {
  expect(
    scanAdmittedRuntimeImports(
      "import { requireRelease as require } from './assert.mjs'; require(condition, 'message');",
      parser,
    ),
  ).toEqual(['./assert.mjs']);
});
test('sealed admission retains literal optional and computed-property resolver edges', () => {
  expect(
    scanAdmittedRuntimeImports(
      "require?.('node:fs'); require['resolve']('yaml'); require.resolve?.('./local.cjs');",
      parser,
    ),
  ).toEqual(['node:fs', 'yaml', './local.cjs']);
});

for (const source of [
  'class require {}; require(destination);',
  'const { require } = source; require(destination);',
  'export default function require() {}; require(destination);',
])
  test('new review accepts module value binding: ' + source, () => {
    expect(scanAdmittedRuntimeImports(source, parser)).toEqual([]);
  });
for (const [before, after] of [
  ['Number(Boolean(report?.header?.glibcVersionRuntime))', 'Number(Boolean(true))'],
  ['Number(Boolean(report?.header?.glibcVersionRuntime))', "Number(Boolean(process.arch === 'x64'))"],
  ['.report?.getReport?.()', '.report?.otherReport?.()'],
] as const)
  test('new review rejects altered ABI selector: ' + after, () => {
    expect(nativeSource.split(before).length - 1).toBe(1);
    expect(() => scanAdmittedRuntimeImports(nativeSource.replace(before, after), parser, nativeFile)).toThrow(
      'computed require is unsealed',
    );
  });
test('new review rejects a foreign caller of the computed native resolver', () => {
  const source = nativeSource + '\nresolveFsSafeNativePackageRoot(foreignRoot, foreignNativeTarget);\n';
  expect(() => scanAdmittedRuntimeImports(source, parser, nativeFile)).toThrow('computed require is unsealed');
});

for (const [file, declaration, relative] of [
  ['vida-agent/bin/bun.mjs', 'const bundleRoot', '../'],
  ['vida-agent/bin/install.mjs', 'const bundleRoot', '../'],
  ['vida-agent/bin/local-release-artifacts.mjs', 'export const releaseRootDefault', '../../../'],
  ['vida-agent/bin/local-release-artifacts.ts', 'export const releaseRootDefault', '../../../'],
] as const)
  test('owned module directory anchor is a locator rather than a file: ' + file, () => {
    const source =
      "import { fileURLToPath } from 'node:url';\n" +
      declaration +
      " = fileURLToPath(new URL('" +
      relative +
      "', import.meta.url));";
    expect(scanAdmittedRuntimeImports(source, parser, file)).toEqual(['node:url']);
    expect(scanAdmittedRuntimeImports(source, parser, 'foreign.mjs')).toEqual(['node:url', relative]);
    const changed = source.replace(relative, '../foreign.json');
    expect(scanAdmittedRuntimeImports(changed, parser, file)).toEqual(['node:url', '../foreign.json']);
  });

const directoryFile = 'vida-agent/bin/bun.mjs';
const directoryImport = "import { fileURLToPath } from 'node:url';\n";
const directoryDeclaration = "const bundleRoot = fileURLToPath(new URL('../', import.meta.url));";
for (const [label, source, imports] of [
  ['wrong binding', directoryImport + directoryDeclaration.replace('bundleRoot', 'otherRoot'), ['node:url']],
  ['missing decoder import', directoryDeclaration, []],
  ['wrong decoder import', directoryImport.replace('node:url', 'node:fs') + directoryDeclaration, ['node:fs']],
  [
    'aliased decoder',
    directoryImport.replace('fileURLToPath }', 'fileURLToPath as decode }') +
      directoryDeclaration.replace('fileURLToPath(', 'decode('),
    ['node:url'],
  ],
  ['shadowed URL', directoryImport + 'const URL = foreignURL;\n' + directoryDeclaration, ['node:url']],
  ['nested declaration', directoryImport + 'function nested() { ' + directoryDeclaration + ' }', ['node:url']],
  ['mutable binding', directoryImport + directoryDeclaration.replace('const ', 'let '), ['node:url']],
  [
    'multiple bindings',
    directoryImport + directoryDeclaration.replace('const bundleRoot =', 'const extra = 0, bundleRoot ='),
    ['node:url'],
  ],
] as const)
  test('directory anchor boundary preserves resource for ' + label, () => {
    expect(scanAdmittedRuntimeImports(source, parser, directoryFile)).toEqual([...imports, '../']);
  });
test('directory anchor exemption preserves adjacent and nested file resources', () => {
  const source =
    directoryImport +
    directoryDeclaration +
    "\nfunction nested() { return new URL('../nested.json', import.meta.url); } const other = new URL('../other.json', import.meta.url);";
  expect(scanAdmittedRuntimeImports(source, parser, directoryFile)).toEqual([
    'node:url',
    '../nested.json',
    '../other.json',
  ]);
  expect(() =>
    scanAdmittedRuntimeImports(
      directoryImport + directoryDeclaration.replace('import.meta.url', 'import.meta.other'),
      parser,
      directoryFile,
    ),
  ).toThrow('computed module resource is unsealed');
});
test('type-only and ambient require declarations preserve global loader checks', () => {
  expect(scanAdmittedRuntimeImports("import type { require } from './types.ts'; require('node:fs');", parser)).toEqual([
    'node:fs',
  ]);
  expect(() => scanAdmittedRuntimeImports('declare const require: unknown; require(destination);', parser)).toThrow(
    'computed require is unsealed',
  );
});
test('an alias cannot introduce an extra native resolver caller', () => {
  const source =
    nativeSource + '\nconst resolveOther = resolveFsSafeNativePackageRoot; resolveOther(foreignRoot, foreignTarget);';
  expect(() => scanAdmittedRuntimeImports(source, parser, nativeFile)).toThrow('computed require is unsealed');
});
