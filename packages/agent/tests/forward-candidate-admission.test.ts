import { test, expect } from 'bun:test';
import * as parser from '@babel/parser';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { scanAdmittedRuntimeImports } from '../bin/forward-candidate-admission.ts';
import { moduleDirectoryAnchorCalls } from '../bin/module-directory-anchors.ts';
import { isImportMetaProperty, isNamedIdentifier, moduleUrlResourceShape } from '../bin/module-url-resource-shape.ts';
import {
  hasExactValueImportBinding,
  moduleDeclarationFacts,
  moduleHasValueBinding,
  runtimeBindingNames,
} from '../bin/runtime-import-bindings.ts';

test('module URL shape preserves parsed node identity and exact literal spelling', () => {
  const node = parser.parseExpression("new URL('../file%20name.json?raw#fragment', import.meta.url)", {
    sourceType: 'module',
  });
  if (node.type !== 'NewExpression' || node.arguments[1]?.type !== 'MemberExpression')
    throw new Error('Expected parsed URL member fixture.');
  const resource = moduleUrlResourceShape(node);
  expect(resource?.node).toBe(node);
  expect(resource?.specifier).toBe('../file%20name.json?raw#fragment');
  // Existing callers admit absent computed flags in internally supplied ASTs.
  expect(Reflect.deleteProperty(node.arguments[1], 'computed')).toBe(true);
  expect(moduleUrlResourceShape(node)?.node).toBe(node);
});

test('module URL shape refuses nonliteral, computed, wrapped and incomplete forms', () => {
  expect(moduleUrlResourceShape(undefined)).toBeNull();
  expect(moduleUrlResourceShape(null)).toBeNull();
  for (const source of [
    'URL',
    "URL('../file.json', import.meta.url)",
    "new Other('../file.json', import.meta.url)",
    "new api.URL('../file.json', import.meta.url)",
    'new URL()',
    "new URL('../file.json')",
    "new URL('../file.json', import.meta.url, 0)",
    'new URL(dynamic, import.meta.url)',
    'new URL(1, import.meta.url)',
    'new URL(`../file.json`, import.meta.url)',
    'new URL(...paths, import.meta.url)',
    "new URL('../file.json', import.meta['url'])",
    "new URL('../file.json', import.meta.other)",
    "new URL('../file.json', base.url)",
    "new URL('../file.json', import.meta)",
    "new URL(('../file.json' as string), import.meta.url)",
  ])
    expect(
      moduleUrlResourceShape(parser.parseExpression(source, { sourceType: 'module', plugins: ['typescript'] })),
    ).toBeNull();
});

test('shared identifier and import-meta guards require exact node kinds and names', () => {
  const identifier = parser.parseExpression('URL');
  expect(isNamedIdentifier(identifier, 'URL')).toBe(true);
  expect(isNamedIdentifier(identifier, 'url')).toBe(false);
  expect(isNamedIdentifier(parser.parseExpression("'URL'"), 'URL')).toBe(false);
  expect(isNamedIdentifier(undefined, 'URL')).toBe(false);
  expect(isNamedIdentifier(null, 'URL')).toBe(false);
  const meta = parser.parseExpression('import.meta', { sourceType: 'module' });
  expect(isImportMetaProperty(meta)).toBe(true);
  expect(isImportMetaProperty(identifier)).toBe(false);
  expect(isImportMetaProperty(undefined)).toBe(false);
  expect(isImportMetaProperty(null)).toBe(false);
  if (meta.type !== 'MetaProperty') throw new Error('Expected parsed import-meta fixture.');
  expect(isImportMetaProperty({ ...meta, meta: { ...meta.meta, name: 'new' } })).toBe(false);
  expect(isImportMetaProperty({ ...meta, property: { ...meta.property, name: 'other' } })).toBe(false);
});

test('shared URL shape retains recursive malformed resource denial', () => {
  for (const source of [
    'new URL(String(import.meta.url), ordinaryBase)',
    "new URL('../file.json', wrap(import.meta.url))",
    "new URL('../file.json', import.meta.url, 0)",
    "new URL('../file.json', import.meta)",
  ])
    expect(() => scanAdmittedRuntimeImports(source, parser)).toThrow(
      'forward candidate admission: computed module resource is unsealed',
    );
  expect(scanAdmittedRuntimeImports("new Other('../file.json', import.meta.url)", parser)).toEqual([]);
});

test('directory anchor set owns only the original parsed URL locator node', () => {
  const tree = parser.parse(
    "import { fileURLToPath } from 'node:url'; const bundleRoot=fileURLToPath(new URL('../',import.meta.url));",
    { sourceType: 'module' },
  );
  const declaration = tree.program.body[1];
  if (declaration?.type !== 'VariableDeclaration') throw new Error('Expected locator declaration fixture.');
  const init = declaration.declarations[0]?.init;
  if (init?.type !== 'CallExpression') throw new Error('Expected locator decoder fixture.');
  const url = init.arguments[0];
  if (url?.type !== 'NewExpression') throw new Error('Expected locator URL fixture.');
  const anchors = moduleDirectoryAnchorCalls(tree, 'vida-agent/bin/bun.ts');
  expect(anchors.size).toBe(1);
  expect(anchors.has(url)).toBe(true);
  expect(anchors.has({ ...url })).toBe(false);
});
test('directory anchor facts retain every same-name const candidate in source order', () => {
  const tree = parser.parse(
    "import { fileURLToPath } from 'node:url'; const bundleRoot=fileURLToPath(new URL('../',import.meta.url)); const otherRoot=fileURLToPath(new URL('../',import.meta.url));",
    { sourceType: 'module' },
  );
  const first = tree.program.body[1];
  const second = tree.program.body[2];
  if (first?.type !== 'VariableDeclaration' || second?.type !== 'VariableDeclaration')
    throw new Error('Expected same-name locator candidates.');
  const firstUrl = first.declarations[0]?.init;
  const secondUrl = second.declarations[0]?.init;
  if (firstUrl?.type !== 'CallExpression' || secondUrl?.type !== 'CallExpression')
    throw new Error('Expected decoder calls.');
  const firstNode = firstUrl.arguments[0];
  const secondNode = secondUrl.arguments[0];
  if (firstNode?.type !== 'NewExpression' || secondNode?.type !== 'NewExpression')
    throw new Error('Expected URL locator nodes.');
  second.declarations[0]!.id = first.declarations[0]!.id;

  const facts = moduleDeclarationFacts(tree);
  expect(facts.constIdentifierInitializers.get('bundleRoot')).toHaveLength(2);
  const anchors = moduleDirectoryAnchorCalls(tree, 'vida-agent/bin/bun.ts', facts);
  expect(anchors.size).toBe(2);
  expect([...anchors][0]).toBe(firstNode);
  expect([...anchors][1]).toBe(secondNode);
});
test('directory anchor facts deny a foreign Program and reuse the same Program facts', () => {
  const source =
    "import { fileURLToPath } from 'node:url'; const bundleRoot=fileURLToPath(new URL('../',import.meta.url));";
  const tree = parser.parse(source, { sourceType: 'module' });
  const foreignTree = parser.parse(source, { sourceType: 'module' });
  const facts = moduleDeclarationFacts(tree);

  expect(moduleDeclarationFacts(tree, facts)).toBe(facts);
  expect(moduleDeclarationFacts(tree.program, facts)).toBe(facts);
  expect(moduleDirectoryAnchorCalls(tree, 'vida-agent/bin/bun.ts', facts).size).toBe(1);
  expect(moduleDirectoryAnchorCalls(foreignTree, 'vida-agent/bin/bun.ts', facts).size).toBe(0);
  expect(moduleDeclarationFacts(parser.parseExpression('bundleRoot'), facts).program).toBeNull();
});
test('admitted import scan reads direct module declarations once per parsed invocation', () => {
  let directModuleBodyScans = 0;
  const countingParser = {
    ...parser,
    parse: (...args: Parameters<typeof parser.parse>) => {
      const tree = parser.parse(...args);
      const body = new Proxy(tree.program.body, {
        get(target, property, receiver) {
          if (property === Symbol.iterator || property === 'some') directModuleBodyScans += 1;
          const value: unknown = Reflect.get(target, property, receiver);
          return value;
        },
      });
      Object.defineProperty(tree.program, 'body', {
        configurable: true,
        value: body,
      });
      return tree;
    },
  } as typeof parser;

  expect(
    scanAdmittedRuntimeImports(
      "import { fileURLToPath } from 'node:url'; const bundleRoot=fileURLToPath(new URL('../',import.meta.url)); require('node:fs');",
      countingParser,
      'vida-agent/bin/bun.ts',
    ),
  ).toEqual(['node:url', 'node:fs']);
  expect(directModuleBodyScans).toBe(1);
});
test('module value binding facts keep roots, runtime declarations, patterns and erased declarations distinct', () => {
  const has = (source: string, name = 'URL') =>
    moduleHasValueBinding(parser.parse(source, { sourceType: 'module', plugins: ['typescript'] }), name);

  const pattern = parser.parse('const { nested: { URL }, values: [first, ...rest], defaulted = fallback } = input;', {
    sourceType: 'module',
    plugins: ['typescript'],
  }).program.body[0];
  if (pattern?.type !== 'VariableDeclaration') throw new Error('Expected binding pattern fixture.');
  expect(runtimeBindingNames(pattern.declarations[0]!.id)).toEqual(['URL', 'first', 'rest', 'defaulted']);

  expect(has("import { URL as Renamed } from 'source';")).toBe(false);
  expect(has("import { Other as URL } from 'source';")).toBe(true);
  expect(has("import type { URL } from 'source';")).toBe(false);
  expect(has("import { type URL } from 'source';")).toBe(false);
  expect(has('declare const URL: unknown;')).toBe(false);
  expect(has('declare function URL(): void;')).toBe(false);
  expect(has('declare class URL {}')).toBe(false);
  expect(has('declare enum URL { Value }')).toBe(false);
  expect(has('declare namespace URL {}')).toBe(false);
  expect(has('const { nested: { URL } } = input;')).toBe(true);
  expect(has('function URL() {}')).toBe(true);
  expect(has('class URL {}')).toBe(true);
  expect(has('enum URL { Value }')).toBe(true);
  expect(has('namespace URL {}')).toBe(true);
  expect(has("import URL = require('source');")).toBe(true);
  expect(has("import type URL = require('source');")).toBe(false);
  expect(has('function outer() { const URL = foreignURL; }')).toBe(false);

  const importFacts = moduleDeclarationFacts(
    parser.parse(
      "import defaultThing, { fileURLToPath, fileURLToPath as decode, type URL } from 'node:url'; import * as namespace from 'other'; import type { URL as TypesURL } from 'types';",
      { sourceType: 'module', plugins: ['typescript'] },
    ),
  );
  expect([...importFacts.valueBindings]).toEqual(['defaultThing', 'fileURLToPath', 'decode', 'namespace']);
  expect(importFacts.namedImports).toEqual([
    { source: 'node:url', importedName: 'fileURLToPath', localName: 'fileURLToPath' },
    { source: 'node:url', importedName: 'fileURLToPath', localName: 'decode' },
  ]);
  expect(hasExactValueImportBinding(importFacts, 'node:url', 'fileURLToPath', 'fileURLToPath')).toBe(true);
  expect(hasExactValueImportBinding(importFacts, 'other', 'fileURLToPath', 'fileURLToPath')).toBe(false);
  const aliasedImportFacts = moduleDeclarationFacts(
    parser.parse("import { fileURLToPath as decode } from 'node:url';", { sourceType: 'module' }),
  );
  expect(hasExactValueImportBinding(aliasedImportFacts, 'node:url', 'fileURLToPath', 'decode')).toBe(true);
  expect(hasExactValueImportBinding(aliasedImportFacts, 'node:url', 'fileURLToPath', 'fileURLToPath')).toBe(false);

  const parsed = parser.parse('const URL = 1;', { sourceType: 'module' });
  expect(moduleHasValueBinding(parsed.program, 'URL')).toBe(true);
  expect(moduleHasValueBinding(parser.parseExpression('URL'), 'URL')).toBe(false);
});
test('type-only and aliased URL imports do not suppress owned module directory anchors', () => {
  for (const [declaration, imports] of [
    ["import type { URL } from 'source';", ['node:url']],
    ["import { type URL } from 'source';", ['node:url']],
    ["import { URL as Renamed } from 'source';", ['node:url', 'source']],
    ['declare const URL: unknown;', ['node:url']],
  ] as const)
    expect(
      scanAdmittedRuntimeImports(
        "import { fileURLToPath } from 'node:url'; " +
          declaration +
          " const bundleRoot=fileURLToPath(new URL('../',import.meta.url));",
        parser,
        'vida-agent/bin/bun.ts',
      ),
    ).toEqual([...imports]);

  expect(
    scanAdmittedRuntimeImports(
      "import { fileURLToPath } from 'node:url'; import { Other as URL } from 'source'; " +
        "const bundleRoot=fileURLToPath(new URL('../',import.meta.url));",
      parser,
      'vida-agent/bin/bun.ts',
    ),
  ).toEqual(['node:url', 'source', '../']);
});
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
    'function matchesAttestedNativeBinding(binding: unknown, packageStillAttested: boolean): boolean {',
    'function matchesAttestedNativeBinding(binding: unknown, packageStillAttested: boolean): boolean { const moduleRequire = foreignRequire;',
    1,
  ],
  [
    'missing private identity attestation parameter',
    'function matchesAttestedNativeBinding(binding: unknown, packageStillAttested: boolean): boolean {',
    'function matchesAttestedNativeBinding(binding: unknown): boolean {',
    1,
  ],
  [
    'missing current identity attestation gate',
    'if (!packageStillAttested || !binding) return false;',
    'if (!binding) return false;',
    1,
  ],
  [
    'late identity attestation gate',
    'if (!packageStillAttested || !binding) return false;',
    'if (!binding || !packageStillAttested) return false;',
    1,
  ],
  [
    'unchecked identity attestation flag',
    'matchesAttestedNativeBinding(binding, packageStillAttested)',
    'matchesAttestedNativeBinding(binding, true)',
    2,
  ],
  [
    'missing identity attestation argument',
    'matchesAttestedNativeBinding(binding, packageStillAttested)',
    'matchesAttestedNativeBinding(binding)',
    2,
  ],
  [
    'reversed identity attestation arguments',
    'matchesAttestedNativeBinding(binding, packageStillAttested)',
    'matchesAttestedNativeBinding(packageStillAttested, binding)',
    2,
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
  ['vida-agent/bin/bun.ts', 'const bundleRoot', '../'],
  ['vida-agent/bin/install.mjs', 'const bundleRoot', '../'],
  ['vida-agent/bin/install.ts', 'const bundleRoot', '../'],
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

for (const [label, suffix] of [
  ['object assignment', '({ loader: moduleRequire } = foreignBindings);'],
  ['array assignment', '[moduleRequire] = foreignBindings;'],
  ['nested member assignment', 'moduleRequire.loader.value = foreignBinding;'],
  ['member update', 'moduleRequire.loader.value++;'],
  ['function parameter', 'function unrelated(moduleRequire) {}'],
  ['catch pattern', 'try {} catch ({ loader: moduleRequire }) {}'],
  ['named class expression', 'const unrelated = class moduleRequire {};'],
] as const)
  test('native boundary rejects protected ' + label, () => {
    expect(() => scanAdmittedRuntimeImports(nativeSource + '\n' + suffix, parser, nativeFile)).toThrow(
      'computed require is unsealed',
    );
  });

test('unprotected assignment patterns and member mutations preserve native imports', () => {
  const expected = scanAdmittedRuntimeImports(nativeSource, parser, nativeFile);
  for (const suffix of [
    '({ value: unrelated } = foreignBindings);',
    '[unrelated] = foreignBindings;',
    'unrelated.loader.value = foreignBinding; unrelated.loader.value++;',
  ])
    expect(scanAdmittedRuntimeImports(nativeSource + '\n' + suffix, parser, nativeFile)).toEqual(expected);
});
