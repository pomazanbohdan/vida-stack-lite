import { createHash } from 'node:crypto';
import { closeSync, readdirSync, lstatSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { parse } from '@babel/parser';
import { openRootFileSync, readFileDescriptorBoundedSync } from '@openclaw/fs-safe/advanced';
import { getBindingIdentifiers, isFunction, isReferenced, isTSType, VISITOR_KEYS } from '@babel/types';
import type {
  ClassDeclaration,
  ClassExpression,
  ExportDefaultDeclaration,
  ExportNamedDeclaration,
  ExportSpecifier,
  Node as BabelNode,
} from '@babel/types';
import {
  draftProfile,
  normalizeProfile,
  patternNames,
  type PatternName,
  type PatternState,
} from './pattern-profile.js';
import { functionInventory } from './function-inventory.js';
import { maintainedSourceInventory } from './maintained-source-inventory.js';
import type { SafeRepositoryAccess } from '../src/config/safe-repository-access.js';
const nativeCaptureAccess =
  process.platform === 'linux' || process.platform === 'win32'
    ? (await import('../src/config/safe-repository-access.js')).requireSafeRepositoryAccess
    : null;

type BabelFile = ReturnType<typeof parse>;
type TestStatus = 'present' | 'absent' | 'no-direct-reference' | 'unresolved';
type Risk = { reviewed: true; priority: 'P0' | 'P1'; rationale: string };
type PatternReport = {
  status: 'reviewed' | 'unreviewed';
  present: PatternName[];
  missing: PatternName[];
  notApplicable: Array<{ name: PatternName; justification: string }>;
  unreviewed: PatternName[];
};
type MatrixCase = {
  file: string;
  name: string;
  patterns: Partial<Record<PatternName, PatternState>>;
  justification?: string;
};
type AuditFunction = {
  identity: string;
  file: string;
  name: string;
  line: number;
  column: number;
  start: number;
  end: number;
  complexity: number;
  inputHash: string;
  testStatus: TestStatus;
  cases: Array<{ file: string; name: string }>;
  evidence: string;
  patterns: PatternReport;
  reviewedCases?: MatrixCase[];
  matrixSliceHash?: string;
  risk?: Risk;
};
type ScannedCase = {
  name: string;
  callback: BabelNode;
  start: number;
  end: number;
  file: string;
  skipped: boolean;
  assertion: boolean;
  references: Set<string>;
};
type ReportCase = { file: string; name: string; assertion: boolean; references: string[]; skipped: boolean };
type MatrixFunction = { identity: string; cases: MatrixCase[]; risk?: Risk };
type ResolvedMatrixFunction = { identity: string; patterns: PatternReport; cases: MatrixCase[]; risk?: Risk };
type AuditMatrix = {
  schemaVersion: 1;
  configHash: string;
  sourceHashes: Record<string, string>;
  testHashes: Record<string, string>;
  functions: MatrixFunction[];
};
type QueueFunction = {
  identity: string;
  source: string;
  sourceHash: string;
  testHashes: Record<string, string>;
  testScopeHash: string;
  configHash: string;
  matrixHash?: string;
  testStatus: string;
  evidence: string;
  directCases: Array<{ file: string; name: string }>;
  requiredScenarios: MatrixCase[];
  missingPatterns: string[];
  unreviewedPatterns: string[];
  unknownScenarioState: boolean;
  risk: Risk | { priority: 'review'; reviewed: false };
  scope: Record<string, unknown>;
  checkCommands: string[];
  prompt: string;
};
type QueueCandidate = {
  row: AuditFunction;
  directFiles: string[];
  target: string;
  ownedFiles: string[];
  kind: string;
};
export type AuditReport = {
  schemaVersion: 1;
  status: 'unknown' | 'reported';
  counts: {
    functions: number;
    present: number;
    absent: number;
    noDirectReference: number;
    unresolved: number;
    diagnostics: number;
  };
  inputHashes: {
    sources: Record<string, string>;
    tests: Record<string, string>;
    resolution: Record<string, string>;
    config: string;
    matrix?: string;
  };
  analysis: {
    sourceInventoryCalls: number;
    sourceAstParses: number;
    testParserCalls: number;
    testHashes: number;
    sourceHashes: number;
    resolutionAstParses: number;
    resolutionHashes: number;
  };
  diagnostics: Array<{ code: string; file: string; message: string }>;
  functions: AuditFunction[];
  cases: ReportCase[];
};
type AuditOptions = {
  root: string;
  resolutionRoot?: string;
  sourcePaths: readonly string[];
  testPaths: readonly string[];
  matrixPath?: string;
};
type ImportBinding = {
  modulePath: string;
  namespace: boolean;
  exported: string | null;
  typeOnly?: boolean;
  declaration?: BabelNode;
};
type ExportResolution = { identities: string[]; uncertain: boolean };
type ClassBinding = { identity: string; methods: string[]; constructorId: string | null };
type ReExportEdge = { source: string; imported: string };
type SourceExports = {
  functions: Map<string, string[]>;
  values: Map<string, string[]>;
  classes: Map<string, ClassBinding[]>;
  namedReexports: Map<string, ReExportEdge[]>;
  starReexports: string[];
};
type TestScanContext = {
  file: string;
  sourceSet: ReadonlySet<string>;
  sourceExports: Map<string, SourceExports>;
  sourceRowsById: Map<string, AuditFunction>;
  sourceClassesById: Map<string, ClassBinding>;
  cases: ScannedCase[];
  referencedFunctions: Set<string>;
  ambiguousFunctions: Set<string>;
  uncertainImports: Set<string>;
  imports: Map<string, ImportBinding>;
  scopeShadows: Map<BabelNode, Set<string>>;
  throwAssertionCallbacks: Map<BabelNode, ScannedCase>;
  parents: Map<BabelNode, BabelNode>;
};
type Diagnostic = { code: string; file: string; message: string };
type QueueJob = {
  jobId: string;
  kind: string;
  priority: 'P0' | 'P1' | 'review';
  target: { path: string; disposition: 'existing' | 'proposed' };
  functions: QueueFunction[];
  sourceHashes: Record<string, string>;
  testHashes: Record<string, string>;
  testScopeHash: string;
  configHash: string;
  workerHint: string;
};
type QueueGroup = { target: string; functions: QueueFunction[]; kind: string };
type CliOptions = {
  help: boolean;
  source?: string;
  matrix?: string;
  format: 'json' | 'table';
  queue?: 'json' | 'table';
  draft?: 'profiles';
  workers: number;
};
type CapturedInputs = {
  sourceTexts: Map<string, string>;
  testTexts: Map<string, string>;
  matrixText: string | null;
  resolutionTexts: Map<string, string>;
  asts: Map<string, BabelFile>;
  jsonFiles: Set<string>;
  hashes: AuditReport['inputHashes'];
};
type SourceIndex = {
  functions: AuditFunction[];
  sourceExports: Map<string, SourceExports>;
  sourceRowsById: Map<string, AuditFunction>;
  sourceClassesById: Map<string, ClassBinding>;
  parses: number;
  inventoryCalls: number;
  sourceSet: Set<string>;
};
type TestIndex = {
  cases: ReportCase[];
  caseNames: Set<string>;
  directEvidence: Map<string, Array<{ file: string; name: string }>>;
  unresolved: Set<string>;
  duplicateCaseNames: Set<string>;
  parserCalls: number;
};

const validPatternStates = new Set<PatternState>(['present', 'missing', 'not-applicable', 'unreviewed']);
const hash = (text: string): string => createHash('sha256').update(text).digest('hex');
const utf8 = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
type Utf8Reader = (root: string, file: string, limit?: number) => string;
function capturedUtf8Reader(): Utf8Reader {
  const accesses = new Map<string, Pick<SafeRepositoryAccess, 'readCapturedBytes'>>();
  return (root, file, limit) => {
    let access = accesses.get(root);
    if (!access) {
      access = nativeCaptureAccess
        ? nativeCaptureAccess(root)
        : { readCapturedBytes: (file, label, limit = 8388608) => portableCapturedBytes(root, file, label, limit) };
      accesses.set(root, access);
    }
    return utf8.decode(access.readCapturedBytes(file, 'function audit input', limit));
  };
}
function portableCapturedBytes(root: string, file: string, label: string, limit: number): Buffer {
  const opened = openRootFileSync({
    absolutePath: path.resolve(root, file),
    rootPath: root,
    boundaryLabel: label,
    maxBytes: limit,
    rejectHardlinks: true,
    rejectSymlinks: true,
    allowedType: 'file',
  });
  if (!opened.ok) throw new Error(`Audit capture rejected input (${opened.reason}): ${file}`, { cause: opened.error });
  let result: Buffer | undefined;
  const failures: unknown[] = [];
  try {
    result = readFileDescriptorBoundedSync(opened.fd, limit);
  } catch (error) {
    failures.push(error);
  }
  try {
    closeSync(opened.fd);
  } catch (error) {
    failures.push(error);
  }
  if (failures.length === 1) throw failures[0];
  if (failures.length > 1) throw new AggregateError(failures, 'Audit input read and descriptor cleanup failed');
  return result!;
}
function parseFile(text: string, file: string, sourceType: 'unambiguous' | 'module' = 'unambiguous'): BabelFile {
  return parse(text, {
    sourceType,
    plugins: ['typescript'],
    sourceFilename: file,
    errorRecovery: false,
  });
}

function functionRows(source: string, file: string, digest: string, ast: BabelFile): AuditFunction[] {
  return functionInventory(source, file, ast).map((row) => ({
    ...row,
    inputHash: digest,
    testStatus: 'no-direct-reference',
    cases: [],
    evidence: 'no-direct-reference-in-scanned-scope',
    patterns: { status: 'unreviewed', present: [], missing: [], notApplicable: [], unreviewed: [...patternNames] },
  }));
}

function exportedFunctionIds(ast: BabelFile, rows: AuditFunction[], file: string): SourceExports {
  const ids = new Map<string, string[]>();
  const namedReexports = new Map<string, ReExportEdge[]>();
  const starReexports: string[] = [];
  const byLocalName = localFunctionIndex(ast, rows);
  const imports = collectImportBindings(ast);
  for (const statement of ast.program.body) {
    if (
      (statement.type === 'ExportNamedDeclaration' || statement.type === 'ExportAllDeclaration') &&
      statement.exportKind === 'type'
    )
      continue;
    indexFunctionExport(statement, rows, byLocalName, ids);
    if (statement.type === 'ExportNamedDeclaration' && statement.source) {
      for (const specifier of statement.specifiers)
        if (specifier.type === 'ExportSpecifier' && specifier.exportKind !== 'type') {
          const exported = exportedName(specifier);
          const imported = specifier.local.type === 'Identifier' ? specifier.local.name : specifier.local.value;
          namedReexports.set(exported, [
            ...(namedReexports.get(exported) ?? []),
            { source: statement.source.value, imported },
          ]);
        }
    }
    if (statement.type === 'ExportAllDeclaration') starReexports.push(statement.source.value);
    if (statement.type === 'ExportNamedDeclaration' && !statement.source)
      for (const specifier of statement.specifiers) {
        if (
          specifier.type !== 'ExportSpecifier' ||
          specifier.exportKind === 'type' ||
          specifier.local.type !== 'Identifier'
        )
          continue;
        const binding = imports.get(specifier.local.name);
        if (!binding || binding.typeOnly || binding.namespace || !binding.exported) continue;
        namedReexports.set(exportedName(specifier), [
          ...(namedReexports.get(exportedName(specifier)) ?? []),
          { source: binding.modulePath, imported: binding.exported },
        ]);
      }
  }
  return {
    functions: ids,
    values: runtimeValueExports(ast, file),
    classes: exportedClasses(ast, rows, file),
    namedReexports,
    starReexports,
  };
}

function localFunctionIndex(ast: BabelFile, rows: AuditFunction[]): Map<string, string[]> {
  const index = new Map<string, string[]>();
  const rowsBySpan = new Map(rows.map((row) => [`${row.start}:${row.end}`, row.identity]));
  const add = (local: string, node: BabelNode): void => {
    const identity = rowsBySpan.get(`${node.start}:${node.end}`);
    if (identity) index.set(local, [...(index.get(local) ?? []), identity]);
  };
  for (const statement of ast.program.body) {
    const declaration =
      statement.type === 'ExportNamedDeclaration' || statement.type === 'ExportDefaultDeclaration'
        ? statement.declaration
        : statement;
    if (declaration?.type === 'FunctionDeclaration' && declaration.id) add(`fn:${declaration.id.name}`, declaration);
    if (declaration?.type === 'VariableDeclaration')
      for (const item of declaration.declarations)
        if (
          item.id.type === 'Identifier' &&
          item.init &&
          (item.init.type === 'ArrowFunctionExpression' || item.init.type === 'FunctionExpression')
        )
          add(`binding:${item.id.name}`, item.init);
  }
  return index;
}

function appendExportIndex(index: Map<string, string[]>, exported: string, identities: string[]): void {
  if (identities.length) index.set(exported, [...(index.get(exported) ?? []), ...identities]);
}

function indexLocalExport(
  index: Map<string, string[]>,
  byName: Map<string, string[]>,
  exported: string,
  local: string,
): void {
  const identities = byName.get(`fn:${local}`) ?? byName.get(`binding:${local}`) ?? [];
  appendExportIndex(index, exported, identities);
}

function exportedName(specifier: ExportSpecifier): string {
  return specifier.exported.type === 'Identifier' ? specifier.exported.name : specifier.exported.value;
}

function indexFunctionExport(
  statement: BabelFile['program']['body'][number],
  rows: AuditFunction[],
  byName: Map<string, string[]>,
  index: Map<string, string[]>,
): void {
  if (statement.type === 'ExportNamedDeclaration') indexNamedFunctionExport(statement, byName, index);
  if (statement.type === 'ExportDefaultDeclaration') indexDefaultFunctionExport(statement, rows, byName, index);
}

function indexNamedFunctionExport(
  statement: ExportNamedDeclaration,
  byName: Map<string, string[]>,
  index: Map<string, string[]>,
): void {
  const declaration = statement.declaration;
  if (declaration?.type === 'FunctionDeclaration' && declaration.id)
    indexLocalExport(index, byName, declaration.id.name, declaration.id.name);
  indexVariableFunctionExports(declaration, byName, index);
  indexFunctionSpecifiers(statement.specifiers, byName, index);
}

function indexVariableFunctionExports(
  declaration: ExportNamedDeclaration['declaration'],
  byName: Map<string, string[]>,
  index: Map<string, string[]>,
): void {
  if (declaration?.type !== 'VariableDeclaration') return;
  for (const item of declaration.declarations)
    if (
      item.id.type === 'Identifier' &&
      item.init &&
      ['ArrowFunctionExpression', 'FunctionExpression'].includes(item.init.type)
    )
      indexLocalExport(index, byName, item.id.name, item.id.name);
}

function indexFunctionSpecifiers(
  specifiers: ExportNamedDeclaration['specifiers'],
  byName: Map<string, string[]>,
  index: Map<string, string[]>,
): void {
  for (const specifier of specifiers)
    if (
      specifier.type === 'ExportSpecifier' &&
      specifier.exportKind !== 'type' &&
      specifier.local.type === 'Identifier'
    )
      indexLocalExport(index, byName, exportedName(specifier), specifier.local.name);
}

function indexDefaultFunctionExport(
  statement: ExportDefaultDeclaration,
  rows: AuditFunction[],
  byName: Map<string, string[]>,
  index: Map<string, string[]>,
): void {
  const declaration = statement.declaration;
  if (declaration.type === 'FunctionDeclaration' && declaration.id) {
    indexLocalExport(index, byName, 'default', declaration.id.name);
    return;
  }
  if (declaration.type !== 'ArrowFunctionExpression' && declaration.type !== 'FunctionExpression') return;
  const identities = rows
    .filter((row) => row.start === (declaration.start ?? -1) && row.end === (declaration.end ?? -1))
    .map((row) => row.identity);
  appendExportIndex(index, 'default', identities);
}

function exportedClasses(ast: BabelFile, rows: AuditFunction[], file: string): Map<string, ClassBinding[]> {
  const locals = new Map<string, ClassBinding>();
  const result = new Map<string, ClassBinding[]>();
  const rowsBySpan = new Map(rows.map((row) => [`${row.start}:${row.end}`, row.identity]));
  const bindingFor = (declaration: ClassDeclaration | ClassExpression): ClassBinding => {
    const methods = declaration.body.body.flatMap((node) => {
      if (node.type !== 'ClassMethod' && node.type !== 'ClassPrivateMethod') return [];
      const identity = rowsBySpan.get(`${node.start}:${node.end}`);
      return identity ? [identity] : [];
    });
    const constructor = declaration.body.body.find(
      (node) => node.type === 'ClassMethod' && node.kind === 'constructor',
    );
    const constructorId = constructor ? (rowsBySpan.get(`${constructor.start}:${constructor.end}`) ?? null) : null;
    return {
      identity: `${file}#class:${declaration.start}:${declaration.end}`,
      methods,
      constructorId,
    };
  };
  for (const statement of ast.program.body) {
    const declaration =
      statement.type === 'ExportNamedDeclaration' || statement.type === 'ExportDefaultDeclaration'
        ? statement.declaration
        : statement;
    if (declaration?.type === 'ClassDeclaration' && declaration.id && runtimeDeclaration(declaration))
      locals.set(declaration.id.name, bindingFor(declaration));
  }
  const append = (name: string, binding: ClassBinding | undefined): void => {
    if (binding) result.set(name, [...(result.get(name) ?? []), binding]);
  };
  for (const statement of ast.program.body) {
    if (statement.type === 'ExportNamedDeclaration') {
      if (statement.exportKind === 'type') continue;
      if (
        statement.declaration?.type === 'ClassDeclaration' &&
        statement.declaration.id &&
        runtimeDeclaration(statement.declaration)
      )
        append(statement.declaration.id.name, locals.get(statement.declaration.id.name));
      if (!statement.source)
        for (const specifier of statement.specifiers)
          if (
            specifier.type === 'ExportSpecifier' &&
            specifier.exportKind !== 'type' &&
            specifier.local.type === 'Identifier'
          )
            append(exportedName(specifier), locals.get(specifier.local.name));
    }
    if (statement.type === 'ExportDefaultDeclaration') {
      const declaration = statement.declaration;
      if (
        (declaration.type === 'ClassDeclaration' || declaration.type === 'ClassExpression') &&
        runtimeDeclaration(declaration)
      )
        append('default', bindingFor(declaration));
      else if (declaration.type === 'Identifier') append('default', locals.get(declaration.name));
    }
  }
  return result;
}

function astRecord(node: BabelNode): Record<string, unknown> {
  return node as unknown as Record<string, unknown>;
}

function isBabelNode(value: unknown): value is BabelNode {
  return Boolean(value && typeof value === 'object' && 'type' in value && typeof value.type === 'string');
}

function collectAst(ast: BabelFile): { nodes: BabelNode[]; parents: Map<BabelNode, BabelNode> } {
  const nodes: BabelNode[] = [];
  const parents = new Map<BabelNode, BabelNode>();
  const visit = (node: BabelNode, parent?: BabelNode): void => {
    nodes.push(node);
    if (parent) parents.set(node, parent);
    for (const key of VISITOR_KEYS[node.type] ?? []) {
      const child = astRecord(node)[key];
      if (Array.isArray(child)) {
        for (const item of child) if (isBabelNode(item)) visit(item, node);
      } else if (isBabelNode(child)) visit(child, node);
    }
  };
  visit(ast);
  return { nodes, parents };
}

function bindingNames(pattern: BabelNode): string[] {
  return Object.keys(getBindingIdentifiers(pattern));
}

type ImportShadowState = { scopeShadows: Map<BabelNode, Set<string>> };
type AddImportedShadow = (name: string, scope: BabelNode | undefined) => void;
const lexicalScopeTypes = new Set([
  'BlockStatement',
  'CatchClause',
  'ForStatement',
  'ForInStatement',
  'ForOfStatement',
  'SwitchStatement',
  'StaticBlock',
  'Program',
  'TSModuleBlock',
]);

function declarationScope(
  node: BabelNode,
  parents: Map<BabelNode, BabelNode>,
  functionScoped: boolean,
): BabelNode | undefined {
  let current = parents.get(node);
  while (current) {
    if (isFunction(current)) return current.body;
    if (current.type === 'Program' || current.type === 'StaticBlock') return current;
    if (!functionScoped && lexicalScopeTypes.has(current.type)) return current;
    current = parents.get(current);
  }
  return undefined;
}

function importBinding(
  statement: Extract<BabelNode, { type: 'ImportDeclaration' }>,
  specifier: BabelNode,
): ImportBinding {
  const typeOnly = statement.importKind === 'type' || astRecord(specifier).importKind === 'type';
  if (specifier.type === 'ImportNamespaceSpecifier')
    return { modulePath: statement.source.value, namespace: true, exported: null, typeOnly };
  if (specifier.type === 'ImportDefaultSpecifier')
    return { modulePath: statement.source.value, namespace: false, exported: 'default', typeOnly };
  const imported = astRecord(specifier).imported;
  if (!isBabelNode(imported)) throw new Error('Import specifier is malformed.');
  const exported = imported.type === 'Identifier' ? astRecord(imported).name : astRecord(imported).value;
  if (typeof exported !== 'string') throw new Error('Import specifier name is malformed.');
  return { modulePath: statement.source.value, namespace: false, exported, typeOnly };
}

function relativeModulePath(specifier: string): boolean {
  return specifier.startsWith('./') || specifier.startsWith('../');
}

function awaitedNamespaceDeclaration(statement: BabelNode) {
  if (statement.type !== 'VariableDeclaration' || statement.kind !== 'const' || statement.declarations.length !== 1)
    return null;
  const declaration = statement.declarations[0];
  if (declaration?.id.type !== 'Identifier' || declaration.init?.type !== 'AwaitExpression') return null;
  const imported = declaration.init.argument;
  if (
    imported.type !== 'ImportExpression' ||
    imported.source.type !== 'StringLiteral' ||
    !relativeModulePath(imported.source.value) ||
    imported.options != null ||
    imported.phase != null
  )
    return null;
  return { declaration, name: declaration.id.name, modulePath: imported.source.value };
}

function collectImportBindings(ast: BabelFile): Map<string, ImportBinding> {
  const imports = new Map<string, ImportBinding>();
  for (const statement of ast.program.body) {
    if (statement.type === 'ImportDeclaration') {
      for (const specifier of statement.specifiers)
        imports.set(specifier.local.name, importBinding(statement, specifier));
    } else {
      const awaited = awaitedNamespaceDeclaration(statement);
      if (awaited)
        imports.set(awaited.name, {
          modulePath: awaited.modulePath,
          namespace: true,
          exported: null,
          declaration: awaited.declaration,
        });
    }
  }
  return imports;
}

function addImportedShadow(
  name: string,
  scope: BabelNode | undefined,
  imports: Map<string, ImportBinding>,
  state: ImportShadowState,
): void {
  if (!imports.has(name) || !scope) return;
  const names = state.scopeShadows.get(scope) ?? new Set<string>();
  names.add(name);
  state.scopeShadows.set(scope, names);
}

function shadowDeclaration(node: BabelNode, parents: Map<BabelNode, BabelNode>, addShadow: AddImportedShadow): void {
  if (
    ![
      'FunctionDeclaration',
      'FunctionExpression',
      'ClassDeclaration',
      'ClassExpression',
      'VariableDeclarator',
      'TSEnumDeclaration',
      'TSModuleDeclaration',
    ].includes(node.type)
  )
    return;
  const id = astRecord(node).id;
  if (!isBabelNode(id)) return;
  const declaration = parents.get(node);
  const functionScoped = declaration?.type === 'VariableDeclaration' && declaration.kind === 'var';
  const scope =
    node.type === 'FunctionExpression' || node.type === 'ClassExpression'
      ? node
      : declarationScope(node, parents, functionScoped);
  for (const name of bindingNames(id)) addShadow(name, scope);
}

function shadowParameters(node: BabelNode, addShadow: AddImportedShadow): void {
  if (!isFunction(node)) return;
  for (const param of node.params) for (const name of bindingNames(param)) addShadow(name, node);
}

function shadowCatchParameter(node: BabelNode, addShadow: AddImportedShadow): void {
  if (node.type !== 'CatchClause' || !node.param) return;
  for (const name of bindingNames(node.param)) addShadow(name, node);
}

function collectImportShadows(
  nodes: BabelNode[],
  parents: Map<BabelNode, BabelNode>,
  addShadow: AddImportedShadow,
  imports: Map<string, ImportBinding>,
): void {
  const ownedDeclarations = new Set([...imports.values()].map((binding) => binding.declaration));
  for (const node of nodes) {
    if (!ownedDeclarations.has(node)) shadowDeclaration(node, parents, addShadow);
    shadowParameters(node, addShadow);
    shadowCatchParameter(node, addShadow);
  }
}

function importedBindings(ast: BabelFile): {
  imports: Map<string, ImportBinding>;
  scopeShadows: Map<BabelNode, Set<string>>;
  parents: Map<BabelNode, BabelNode>;
  nodes: BabelNode[];
} {
  const imports = collectImportBindings(ast);
  const { nodes, parents } = collectAst(ast);
  const shadows: ImportShadowState = { scopeShadows: new Map() };
  const addShadow = (name: string, scope: BabelNode | undefined): void =>
    addImportedShadow(name, scope, imports, shadows);
  collectImportShadows(nodes, parents, addShadow, imports);
  return { imports, ...shadows, parents, nodes };
}

function shadowedAt(node: BabelNode, name: string, context: TestScanContext): boolean {
  let child = node;
  let scope = context.parents.get(child);
  while (scope) {
    // The discriminant runs before entering the switch's case environment.
    const outsideSwitch = scope.type === 'SwitchStatement' && scope.discriminant === child;
    // Computed method keys are outside the method's parameter environment.
    const outsideMethod = isFunction(scope) && child !== scope.body && !scope.params.some((param) => param === child);
    if (!outsideSwitch && !outsideMethod && context.scopeShadows.get(scope)?.has(name)) return true;
    child = scope;
    scope = context.parents.get(scope);
  }
  return false;
}

function staticMemberName(node: BabelNode): string | null {
  if (node.type !== 'MemberExpression') return null;
  const property = astRecord(node).property;
  if (!isBabelNode(property)) return null;
  if (!astRecord(node).computed && property.type === 'Identifier') {
    const name = astRecord(property).name;
    return typeof name === 'string' ? name : null;
  }
  const value = astRecord(property).value;
  return typeof value === 'string' ? value : null;
}

function importedIdentifierBinding(
  node: BabelNode,
  reference: BabelNode,
  context: TestScanContext,
): ImportBinding | null {
  if (node.type !== 'Identifier') return null;
  const name = astRecord(node).name;
  if (typeof name !== 'string' || shadowedAt(reference, name, context)) return null;
  return context.imports.get(name) ?? null;
}

function namespaceCallImport(callee: BabelNode, reference: BabelNode, context: TestScanContext): ImportBinding | null {
  if (callee.type !== 'MemberExpression') return null;
  const object = astRecord(callee).object;
  if (!isBabelNode(object)) return null;
  const binding = importedIdentifierBinding(object, reference, context);
  if (!binding?.namespace) return null;
  const exported = staticMemberName(callee);
  return exported ? { ...binding, namespace: false, exported } : null;
}

function nodeAssertionModule(modulePath: string): boolean {
  return ['assert', 'assert/strict', 'node:assert', 'node:assert/strict'].includes(modulePath);
}

const expectationModifiers = new Set(['not', 'resolves', 'rejects']);
// Built-in runtime matcher names from the pinned bun-types@1.4.2 MatchersBuiltin<T> declaration.
// `node_modules/bun-types/test.d.ts` is bound into the audit configuration digest below.
type BuiltinExpectationMatcherName = Extract<keyof import('bun:test').MatchersBuiltin<unknown>, string>;
const builtInExpectationMatchers: ReadonlySet<string> = new Set<BuiltinExpectationMatcherName>([
  'pass',
  'fail',
  'toBe',
  'toBeOdd',
  'toBeEven',
  'toBeCloseTo',
  'toEqual',
  'toStrictEqual',
  'toBeOneOf',
  'toContain',
  'toContainKey',
  'toContainAllKeys',
  'toContainAnyKeys',
  'toContainValue',
  'toContainValues',
  'toContainAllValues',
  'toContainAnyValues',
  'toContainKeys',
  'toContainEqual',
  'toHaveLength',
  'toHaveProperty',
  'toBeTruthy',
  'toBeFalsy',
  'toBeDefined',
  'toBeInstanceOf',
  'toBeUndefined',
  'toBeNull',
  'toBeNaN',
  'toBeGreaterThan',
  'toBeGreaterThanOrEqual',
  'toBeLessThan',
  'toBeLessThanOrEqual',
  'toThrow',
  'toThrowError',
  'toMatch',
  'toMatchSnapshot',
  'toMatchInlineSnapshot',
  'toThrowErrorMatchingSnapshot',
  'toThrowErrorMatchingInlineSnapshot',
  'toMatchObject',
  'toBeEmpty',
  'toBeEmptyObject',
  'toBeNil',
  'toBeArray',
  'toBeArrayOfSize',
  'toBeBoolean',
  'toBeTrue',
  'toBeTypeOf',
  'toBeFalse',
  'toBeNumber',
  'toBeInteger',
  'toBeObject',
  'toBeFinite',
  'toBePositive',
  'toBeNegative',
  'toBeWithin',
  'toEqualIgnoringWhitespace',
  'toBeSymbol',
  'toBeFunction',
  'toBeDate',
  'toBeValidDate',
  'toBeString',
  'toInclude',
  'toIncludeRepeated',
  'toSatisfy',
  'toStartWith',
  'toEndWith',
  'toHaveReturned',
  'toHaveReturnedTimes',
  'toHaveReturnedWith',
  'toHaveLastReturnedWith',
  'toHaveNthReturnedWith',
  'toHaveBeenCalled',
  'toBeCalled',
  'toHaveBeenCalledTimes',
  'toBeCalledTimes',
  'toHaveBeenCalledWith',
  'toBeCalledWith',
  'toHaveBeenLastCalledWith',
  'lastCalledWith',
  'toHaveBeenNthCalledWith',
  'nthCalledWith',
]);

function assertionMemberImport(
  callee: BabelNode,
  reference: BabelNode,
  context: TestScanContext,
): ImportBinding | null {
  if (callee.type !== 'MemberExpression') return null;
  const receiver = astRecord(callee).object;
  if (!isBabelNode(receiver)) return null;
  const binding = importedIdentifierBinding(receiver, reference, context);
  if (!binding || !nodeAssertionModule(binding.modulePath)) return null;
  if (!['default', 'strict'].includes(binding.exported ?? '') && !binding.namespace) return null;
  const exported = staticMemberName(callee);
  return exported ? { modulePath: binding.modulePath, namespace: false, exported } : null;
}

function expectationFactoryForMatcher(call: BabelNode, context: TestScanContext): BabelNode | null {
  if (call.type !== 'CallExpression') return null;
  const callee = astRecord(call).callee;
  if (!isBabelNode(callee) || callee.type !== 'MemberExpression') return null;
  const matcher = staticMemberName(callee);
  if (!matcher || !builtInExpectationMatchers.has(matcher)) return null;
  let receiver = astRecord(callee).object;
  while (
    isBabelNode(receiver) &&
    receiver.type === 'MemberExpression' &&
    expectationModifiers.has(staticMemberName(receiver) ?? '')
  )
    receiver = astRecord(receiver).object;
  if (!isBabelNode(receiver) || receiver.type !== 'CallExpression') return null;
  const binding = callImport(receiver, context);
  return binding?.modulePath === 'bun:test' && binding.exported === 'expect' ? receiver : null;
}

function callImport(call: BabelNode, context: TestScanContext): ImportBinding | null {
  if (call.type !== 'CallExpression') return null;
  const callee = astRecord(call).callee;
  if (!isBabelNode(callee)) return null;
  const binding =
    importedIdentifierBinding(callee, call, context) ??
    namespaceCallImport(callee, call, context) ??
    assertionMemberImport(callee, call, context);
  return binding?.typeOnly ? null : binding;
}

function assignmentTargetNames(target: BabelNode): string[] {
  switch (target.type) {
    case 'TSAsExpression':
    case 'TSSatisfiesExpression':
    case 'TSTypeAssertion':
    case 'TSNonNullExpression':
      return assignmentTargetNames(target.expression);
  }
  if (target.type === 'MemberExpression') return assignmentTargetNames(target.object);
  if (target.type === 'AssignmentPattern') return assignmentTargetNames(target.left);
  if (target.type === 'RestElement') return assignmentTargetNames(target.argument);
  if (target.type === 'ArrayPattern')
    return target.elements.flatMap((element) => (element ? assignmentTargetNames(element) : []));
  if (target.type === 'ObjectPattern')
    return target.properties.flatMap((property) =>
      assignmentTargetNames(property.type === 'RestElement' ? property.argument : property.value),
    );
  return bindingNames(target);
}

function namespaceWriteNames(node: BabelNode): string[] {
  let target: BabelNode | null = null;
  if (node.type === 'AssignmentExpression') target = node.left;
  else if (node.type === 'UpdateExpression') target = node.argument;
  else if (node.type === 'ForInStatement' || node.type === 'ForOfStatement') {
    if (node.left.type === 'VariableDeclaration') return [];
    target = node.left;
  }
  if (!target) return [];
  return assignmentTargetNames(target);
}

function mockedModuleSpecifier(node: BabelNode, context: TestScanContext): string | null {
  if (node.type !== 'CallExpression' || node.callee.type !== 'MemberExpression') return null;
  if (staticMemberName(node.callee) !== 'module') return null;
  const binding =
    importedIdentifierBinding(node.callee.object, node, context) ??
    namespaceCallImport(node.callee.object, node, context);
  if (binding?.modulePath !== 'bun:test' || binding.exported !== 'mock' || binding.typeOnly) return null;
  const specifier = node.arguments[0];
  return specifier?.type === 'StringLiteral' ? specifier.value : null;
}

function withholdUncertainNamespaces(nodes: BabelNode[], context: TestScanContext): void {
  const withheld = new Set<string>();
  for (const node of nodes) {
    for (const name of namespaceWriteNames(node))
      if (context.imports.get(name)?.declaration && !shadowedAt(node, name, context)) withheld.add(name);
    const mocked = mockedModuleSpecifier(node, context);
    if (mocked === null) continue;
    const mockedSource = resolveSource(context.file, mocked, context.sourceSet);
    for (const [name, binding] of context.imports)
      if (
        binding.declaration &&
        (binding.modulePath === mocked ||
          (mockedSource !== null &&
            resolveSource(context.file, binding.modulePath, context.sourceSet) === mockedSource))
      )
        withheld.add(name);
  }
  for (const name of withheld) context.imports.delete(name);
}

function resolveSource(from: string, specifier: string, sourceSet: ReadonlySet<string>): string | null {
  const matches = sourceCandidates(from, specifier).filter((candidate) => sourceSet.has(candidate));
  return matches.length === 1 ? matches[0]! : null;
}

function sourceCandidates(from: string, specifier: string): string[] {
  if (!relativeModulePath(specifier)) return [];
  const normalized = path.posix.normalize(path.posix.join(path.posix.dirname(from), specifier));
  // Captured repository helpers share physical package Sources, not duplicate virtual identities.
  const base =
    from.startsWith('../../tooling/agent/') && normalized.startsWith('../../packages/agent/')
      ? normalized.slice('../../packages/agent/'.length)
      : normalized;
  const extensionCandidates: Record<string, string[]> = {
    '.js': ['.ts', '.tsx', '.js'],
    '.jsx': ['.tsx', '.jsx'],
    '.mjs': ['.mts', '.mjs'],
    '.cjs': ['.cts', '.cjs'],
  };
  const extension = path.posix.extname(base);
  const replacements = extensionCandidates[extension];
  return [
    ...new Set(
      replacements
        ? replacements.map((item) => base.slice(0, -extension.length) + item)
        : [base, ...['.ts', '.tsx', '.mts', '.cts', '.js', '.mjs'].map((ext) => base + ext)],
    ),
  ];
}

function resolveExport(
  file: string,
  exported: string,
  context: TestScanContext,
  visiting: Set<string>,
  budget: { remaining: number },
): ExportResolution {
  return resolveExportKind(file, exported, context, visiting, budget, 'function');
}

function resolveClassExport(
  file: string,
  exported: string,
  context: TestScanContext,
  visiting: Set<string>,
  budget: { remaining: number },
): ExportResolution {
  return resolveExportKind(file, exported, context, visiting, budget, 'class');
}

function exportEdges(record: SourceExports, exported: string): ReExportEdge[] {
  const named = record.namedReexports.get(exported) ?? [];
  const stars = exported === 'default' ? [] : record.starReexports.map((source) => ({ source, imported: exported }));
  return [...named, ...stars];
}

function resolveExportEdge(
  file: string,
  edge: ReExportEdge,
  context: TestScanContext,
  visiting: Set<string>,
  budget: { remaining: number },
  kind: 'function' | 'class' | 'value',
): ExportResolution {
  const target = resolveSource(file, edge.source, context.sourceSet);
  if (!target) return { identities: [], uncertain: true };
  return resolveExportKind(target, edge.imported, context, visiting, budget, kind);
}

function resolveExportKind(
  file: string,
  exported: string,
  context: TestScanContext,
  visiting: Set<string>,
  budget: { remaining: number },
  kind: 'function' | 'class' | 'value',
): ExportResolution {
  const key = `${file}\0${kind}\0${exported}`;
  if (visiting.has(key) || visiting.size >= 64 || budget.remaining <= 0) return { identities: [], uncertain: true };
  budget.remaining -= 1;
  const record = context.sourceExports.get(file);
  if (!record) return { identities: [], uncertain: true };
  const nextVisiting = new Set(visiting).add(key);
  const identities = [
    ...((kind === 'class'
      ? record.classes.get(exported)?.map((binding) => binding.identity)
      : kind === 'value'
        ? record.values.get(exported)
        : record.functions.get(exported)) ?? []),
  ];
  let uncertain = false;
  for (const edge of exportEdges(record, exported)) {
    const resolved = resolveExportEdge(file, edge, context, nextVisiting, budget, kind);
    identities.push(...resolved.identities);
    uncertain ||= resolved.uncertain;
  }
  return { identities: [...new Set(identities)], uncertain };
}

function resolvedSourceExport(context: TestScanContext, binding: ImportBinding | null): ExportResolution {
  if (
    !binding ||
    binding.modulePath === 'bun:test' ||
    !relativeModulePath(binding.modulePath) ||
    binding.namespace ||
    !binding.exported
  )
    return { identities: [], uncertain: false };
  const sourceFile = resolveSource(context.file, binding.modulePath, context.sourceSet);
  if (!sourceFile) return { identities: [], uncertain: true };
  const resolution = resolveExport(sourceFile, binding.exported, context, new Set(), { remaining: 4096 });
  if (resolution.identities.length) return resolution;
  const values = resolveExportKind(sourceFile, binding.exported, context, new Set(), { remaining: 4096 }, 'value');
  return values.identities.length ? values : { ...resolution, uncertain: true };
}

function sourceTargets(context: TestScanContext, binding: ImportBinding | null): AuditFunction[] {
  const resolution = resolvedSourceExport(context, binding);
  if (importResolutionUncertain(resolution, false))
    context.uncertainImports.add(`${binding?.modulePath ?? ''}:${binding?.exported ?? ''}`);
  const matches = resolution.identities
    .map((identity) => context.sourceRowsById.get(identity))
    .filter((row) => row !== undefined);
  if (matches.length === 1 && !resolution.uncertain) return matches;
  for (const row of matches) context.ambiguousFunctions.add(row.identity);
  return [];
}

function sourceClassTargets(context: TestScanContext, binding: ImportBinding | null): ExportResolution {
  if (!binding || binding.modulePath === 'bun:test' || !relativeModulePath(binding.modulePath) || !binding.exported)
    return { identities: [], uncertain: false };
  const sourceFile = resolveSource(context.file, binding.modulePath, context.sourceSet);
  if (!sourceFile) return { identities: [], uncertain: true };
  const result = resolveClassExport(sourceFile, binding.exported, context, new Set(), { remaining: 4096 });
  return { ...result, uncertain: result.uncertain || result.identities.length === 0 };
}

function exportResolutionKnown(resolution: ExportResolution): boolean {
  return resolution.identities.length === 1 && !resolution.uncertain;
}

function importResolutionUncertain(resolution: ExportResolution, alternateKnown: boolean): boolean {
  return (
    resolution.identities.length > 1 ||
    (resolution.uncertain && !(alternateKnown && resolution.identities.length === 0))
  );
}

function markResolvedFunctionReference(context: TestScanContext, resolution: ExportResolution): void {
  const matches = resolution.identities
    .map((identity) => context.sourceRowsById.get(identity))
    .filter((row) => row !== undefined);
  if (exportResolutionKnown(resolution) && matches.length === 1) {
    context.referencedFunctions.add(matches[0]!.identity);
    return;
  }
  for (const row of matches) context.ambiguousFunctions.add(row.identity);
}

function markReferences(context: TestScanContext, binding: ImportBinding | null): void {
  const functionResolution = resolvedSourceExport(context, binding);
  const classResolution = sourceClassTargets(context, binding);
  const functionKnown = exportResolutionKnown(functionResolution);
  const classKnown = exportResolutionKnown(classResolution);
  const functionUncertainty = importResolutionUncertain(functionResolution, classKnown);
  const classUncertainty = importResolutionUncertain(classResolution, functionKnown);
  if (functionUncertainty || classUncertainty) {
    const modulePath = binding?.modulePath ?? '';
    const exported = binding?.exported ?? '';
    context.uncertainImports.add(`${modulePath}:${exported}`);
  }
  markResolvedFunctionReference(context, functionResolution);
  for (const classId of classResolution.identities)
    for (const identity of context.sourceClassesById.get(classId)?.methods ?? []) {
      context.referencedFunctions.add(identity);
      context.ambiguousFunctions.add(identity);
    }
}

function nearestFunction(node: BabelNode, parents: Map<BabelNode, BabelNode>): BabelNode | undefined {
  let current = parents.get(node);
  while (current) {
    if (isFunction(current)) return current;
    current = parents.get(current);
  }
  return undefined;
}

function currentCase(call: BabelNode, context: TestScanContext): ScannedCase | undefined {
  const start = astRecord(call).start;
  const end = astRecord(call).end;
  if (typeof start !== 'number' || typeof end !== 'number') return undefined;
  return context.cases.find((item) => start >= item.start && end <= item.end);
}

function directCaseBody(call: BabelNode, item: ScannedCase | undefined, context: TestScanContext): boolean {
  const callback = nearestFunction(call, context.parents);
  return Boolean(
    item &&
    !item.skipped &&
    callback &&
    (callback === item.callback || context.throwAssertionCallbacks.get(callback) === item),
  );
}

function skippedCase(callee: BabelNode): boolean {
  return callee.type === 'MemberExpression' && ['skip', 'todo', 'only'].includes(staticMemberName(callee) ?? '');
}

type CaseArguments = { name: string; callback: BabelNode };
type SourceRange = { start: number; end: number };

function caseArguments(call: BabelNode): CaseArguments | null {
  const args = astRecord(call).arguments;
  if (!Array.isArray(args) || typeof args[0] !== 'object' || !args[0] || !('value' in args[0])) return null;
  const name = (args[0] as { value?: unknown }).value;
  const callback: unknown = args[1] as unknown;
  if (
    typeof name !== 'string' ||
    !isBabelNode(callback) ||
    (callback.type !== 'ArrowFunctionExpression' && callback.type !== 'FunctionExpression')
  )
    return null;
  return { name, callback };
}

function callbackRange(callback: BabelNode): SourceRange | null {
  const start = astRecord(callback).start;
  const end = astRecord(callback).end;
  if (typeof start !== 'number' || typeof end !== 'number') return null;
  return { start, end };
}

function scannedCase(call: BabelNode, context: TestScanContext): ScannedCase | null {
  const binding = callImport(call, context);
  if (binding?.modulePath !== 'bun:test' || !['test', 'it'].includes(binding.exported ?? '')) return null;
  const args = caseArguments(call);
  if (!args) return null;
  const range = callbackRange(args.callback);
  if (!range) return null;
  return {
    file: context.file,
    name: args.name,
    callback: args.callback,
    ...range,
    skipped: skippedCase(astRecord(call).callee as BabelNode),
    assertion: false,
    references: new Set(),
  };
}

function registerCase(context: TestScanContext, call: BabelNode): void {
  const item = scannedCase(call, context);
  if (item) context.cases.push(item);
}

function registerCases(context: TestScanContext, nodes: BabelNode[]): void {
  for (const node of nodes) if (node.type === 'CallExpression') registerCase(context, node);
}

function registerThrowAssertionCallback(
  call: BabelNode,
  expectCall: BabelNode | null,
  item: ScannedCase | undefined,
  context: TestScanContext,
): void {
  const callee = Object(astRecord(call).callee) as BabelNode;
  const args = expectCall ? astRecord(expectCall).arguments : undefined;
  const callback: unknown = Array.isArray(args) ? args[0] : undefined;
  if (
    ['toThrow', 'toThrowError'].includes(staticMemberName(callee) ?? '') &&
    expectCall !== null &&
    item !== undefined &&
    isBabelNode(callback) &&
    ['ArrowFunctionExpression', 'FunctionExpression'].includes(callback.type) &&
    directCaseBody(expectCall, item, context)
  )
    context.throwAssertionCallbacks.set(callback, item);
}

function testScanContext(
  file: string,
  sourceSet: ReadonlySet<string>,
  sourceExports: Map<string, SourceExports>,
  sourceRowsById: Map<string, AuditFunction>,
  sourceClassesById: Map<string, ClassBinding>,
  bindings: Omit<ReturnType<typeof importedBindings>, 'nodes'>,
): TestScanContext {
  return {
    file,
    sourceSet,
    sourceExports,
    sourceRowsById,
    sourceClassesById,
    cases: [],
    referencedFunctions: new Set(),
    ambiguousFunctions: new Set(),
    uncertainImports: new Set(),
    imports: bindings.imports,
    scopeShadows: bindings.scopeShadows,
    throwAssertionCallbacks: new Map(),
    parents: bindings.parents,
  };
}

function processSourceCall(
  node: BabelNode,
  item: ScannedCase | undefined,
  context: TestScanContext,
  binding: ImportBinding,
): void {
  for (const target of sourceTargets(context, binding)) {
    context.referencedFunctions.add(target.identity);
    if (directCaseBody(node, item, context)) item?.references.add(target.identity);
    else context.ambiguousFunctions.add(target.identity);
  }
}

function processAssertionCall(
  node: BabelNode,
  item: ScannedCase | undefined,
  context: TestScanContext,
  binding: ImportBinding,
): void {
  if (!item || !directCaseBody(node, item, context)) return;
  if (binding.modulePath === 'bun:test' && bunAssertionNames.has(binding.exported ?? '')) item.assertion = true;
  if (nodeAssertionModule(binding.modulePath) && nodeAssertionNames.has(binding.exported ?? '')) item.assertion = true;
}

function processCallNode(node: BabelNode, context: TestScanContext): void {
  const item = currentCase(node, context);
  const binding = callImport(node, context);
  const expectCall = expectationFactoryForMatcher(node, context);
  registerThrowAssertionCallback(node, expectCall, item, context);
  if (expectCall && item && directCaseBody(node, item, context)) item.assertion = true;
  if (binding?.modulePath === 'bun:test' || (binding && nodeAssertionModule(binding.modulePath)))
    processAssertionCall(node, item, context, binding);
  else if (binding) processSourceCall(node, item, context, binding);
}

function directImportCall(node: BabelNode, parent: BabelNode, grandparent: BabelNode | undefined): boolean {
  const isDirectCallee = parent.type === 'CallExpression' && astRecord(parent).callee === node;
  const isNamespaceCall =
    parent.type === 'MemberExpression' &&
    astRecord(parent).object === node &&
    grandparent?.type === 'CallExpression' &&
    astRecord(grandparent).callee === parent;
  return isDirectCallee || isNamespaceCall;
}

function identifierImport(
  node: BabelNode,
  context: TestScanContext,
): { parent: BabelNode; binding: ImportBinding } | null {
  if (inTypeSpace(node, context.parents)) return null;
  const parent = context.parents.get(node);
  if (!parent || !isReferenced(node, parent, context.parents.get(parent))) return null;
  const name = astRecord(node).name;
  if (typeof name !== 'string') return null;
  const binding = context.imports.get(name);
  if (!binding || shadowedAt(node, name, context) || binding.modulePath === 'bun:test') return null;
  return { parent, binding };
}

/** Type queries use the value namespace but are erased and never execute it. */
function inTypeSpace(node: BabelNode, parents: Map<BabelNode, BabelNode>): boolean {
  let current = parents.get(node);
  while (current) {
    if (isTSType(current) || current.type === 'TSTypeAnnotation' || current.type === 'TSTypeParameter') return true;
    current = parents.get(current);
  }
  return false;
}

function processIdentifierNode(node: BabelNode, context: TestScanContext): void {
  const imported = identifierImport(node, context);
  if (!imported) return;
  const { parent, binding } = imported;
  if (binding.typeOnly) {
    context.uncertainImports.add(`${binding.modulePath}:${binding.exported ?? '*'} (type-only runtime use)`);
    return;
  }
  const grandparent = context.parents.get(parent);
  if (directImportCall(node, parent, grandparent)) return;
  const memberName =
    parent.type === 'MemberExpression' && astRecord(parent).object === node ? staticMemberName(parent) : null;
  const reference = binding.namespace && memberName ? { ...binding, namespace: false, exported: memberName } : binding;
  markReferences(context, reference);
}

function processConstruction(node: BabelNode, context: TestScanContext): void {
  const callee = astRecord(node).callee;
  if (!isBabelNode(callee)) return;
  const binding = importedIdentifierBinding(callee, node, context) ?? namespaceCallImport(callee, node, context);
  if (!binding || binding.typeOnly) return;
  const resolution = sourceClassTargets(context, binding);
  if (!exportResolutionKnown(resolution)) return;
  const constructorId = context.sourceClassesById.get(resolution.identities[0]!)?.constructorId;
  if (!constructorId) return;
  const item = currentCase(node, context);
  context.referencedFunctions.add(constructorId);
  if (directCaseBody(node, item, context)) item?.references.add(constructorId);
  else context.ambiguousFunctions.add(constructorId);
}

function processTestNodes(nodes: BabelNode[], context: TestScanContext): void {
  for (const node of nodes) {
    if (node.type === 'CallExpression') processCallNode(node, context);
    else if (node.type === 'NewExpression') processConstruction(node, context);
    else if (node.type === 'Identifier') processIdentifierNode(node, context);
  }
}

function scanTestFile(
  ast: BabelFile,
  file: string,
  sourceSet: ReadonlySet<string>,
  sourceExports: Map<string, SourceExports>,
  sourceRowsById: Map<string, AuditFunction>,
  sourceClassesById: Map<string, ClassBinding>,
): {
  cases: ScannedCase[];
  referencedFunctions: Set<string>;
  ambiguousFunctions: Set<string>;
  uncertainImports: Set<string>;
} {
  const { nodes, ...bindings } = importedBindings(ast);
  const context = testScanContext(file, sourceSet, sourceExports, sourceRowsById, sourceClassesById, bindings);
  withholdUncertainNamespaces(nodes, context);
  registerCases(context, nodes);
  processTestNodes(nodes, context);
  return context;
}

const bunAssertionNames = new Set(['assert', 'ok', 'equal', 'deepEqual', 'throws', 'rejects']);
const nodeAssertionNames = new Set([
  'default',
  'strict',
  'assert',
  'ok',
  'equal',
  'notEqual',
  'deepEqual',
  'notDeepEqual',
  'strictEqual',
  'notStrictEqual',
  'deepStrictEqual',
  'notDeepStrictEqual',
  'throws',
  'doesNotThrow',
  'rejects',
  'doesNotReject',
  'ifError',
  'match',
  'doesNotMatch',
  'fail',
]);

export function auditSources(options: AuditOptions): AuditReport {
  const root = path.resolve(options.root);
  const diagnostics: Diagnostic[] = [];
  const captured = captureInputs(root, options, diagnostics);
  return auditCapturedInputs(options, captured, diagnostics);
}
function auditCapturedInputs(options: AuditOptions, captured: CapturedInputs, diagnostics: Diagnostic[]): AuditReport {
  const sources = indexSources(captured, diagnostics);
  const tests = indexTests(captured.testTexts, captured.asts, sources, diagnostics);
  const functionsById = new Map(sources.functions.map((row) => [row.identity, row]));
  const matrix = resolveAuditMatrix(options.matrixPath, captured, functionsById, tests, diagnostics);
  finalizeFunctionRows(sources.functions, tests.directEvidence, tests.unresolved, matrix, functionsById);
  return makeAuditReport(captured, sources, tests, diagnostics);
}

function captureTextFiles(
  root: string,
  files: readonly string[],
  kind: 'source' | 'test',
  diagnostics: Diagnostic[],
  read: Utf8Reader,
): Map<string, string> {
  const texts = new Map<string, string>();
  for (const file of [...files].sort()) {
    try {
      texts.set(file, read(root, file));
    } catch (error) {
      diagnostics.push({ code: `${kind}-read`, file, message: String(error) });
    }
  }
  return texts;
}

function relativeModuleEdges(ast: BabelFile): string[] {
  return ast.program.body
    .flatMap((statement) => {
      if (statement.type === 'ImportDeclaration')
        return statement.importKind === 'type' ? [] : [statement.source.value];
      if (statement.type === 'ExportNamedDeclaration' || statement.type === 'ExportAllDeclaration')
        return statement.exportKind === 'type' || !statement.source ? [] : [statement.source.value];
      const awaited = awaitedNamespaceDeclaration(statement);
      return awaited ? [awaited.modulePath] : [];
    })
    .filter(relativeModulePath);
}

function regularResolutionFile(root: string, file: string, repository: string | null): boolean {
  const external = repository !== null && file.startsWith('../../tooling/agent/');
  const relative = external ? file.slice('../../'.length) : file;
  const permitted =
    /^(?:tests|tooling)\//u.test(file) ||
    /^schemas\/.+\.json$/u.test(file) ||
    file === 'package.json' ||
    file === 'stryker.config.mjs' ||
    external;
  if (
    !permitted ||
    file.includes('\\') ||
    file.includes('\0') ||
    relative.split('/').some((part) => part === '..' || part === '.')
  )
    return false;
  const segments = relative.split('/');
  let current = external ? repository! : root;
  for (const [index, segment] of segments.entries()) {
    current = path.join(current, segment);
    try {
      const entry = lstatSync(current);
      if (entry.isSymbolicLink() || (index === segments.length - 1 ? !entry.isFile() : !entry.isDirectory()))
        throw new Error('Resolution input must use regular files and directories without links.');
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') return false;
      throw error;
    }
  }
  return true;
}

function captureResolutionInputs(
  root: string,
  sources: Map<string, string>,
  tests: Map<string, string>,
  diagnostics: Diagnostic[],
  repository: string | null,
  read: Utf8Reader,
  initialData: ReadonlyMap<string, string>,
): { resolutionTexts: Map<string, string>; asts: Map<string, BabelFile>; jsonFiles: Set<string> } {
  const resolutionTexts = new Map(initialData);
  const asts = new Map<string, BabelFile>();
  const jsonFiles = new Set<string>();
  const texts = new Map([...sources, ...tests, ...initialData]);
  const attempted = new Set(initialData.keys());
  let resolutionBytes = [...initialData.values()].reduce((total, text) => total + Buffer.byteLength(text), 0);
  for (const [file, text] of texts) {
    if (file.endsWith('.json')) {
      try {
        // CLI seed is the exact manifest already validated by maintainedSourceInventory.
        if (!initialData.has(file)) JSON.parse(text);
        jsonFiles.add(file);
      } catch (error) {
        diagnostics.push({ code: 'resolution-json-invalid', file, message: String(error) });
      }
      continue;
    }
    try {
      const ast = parseFile(text, file, sources.has(file) ? 'module' : 'unambiguous');
      asts.set(file, ast);
      for (const edge of relativeModuleEdges(ast)) {
        const candidates = sourceCandidates(file, edge);
        if (candidates.some((candidate) => texts.has(candidate))) continue;
        const matches = candidates.filter((candidate) => regularResolutionFile(root, candidate, repository));
        if (matches.length !== 1) continue;
        const target = matches[0]!;
        if (attempted.has(target)) continue;
        attempted.add(target);
        if (attempted.size > 256) throw new Error('Resolution closure exceeds 256 files.');
        let contents: string;
        try {
          contents =
            repository !== null && target.startsWith('../../tooling/agent/')
              ? read(repository, target.slice('../../'.length), 1048576)
              : read(root, target, 1048576);
        } catch (error) {
          diagnostics.push({
            code: target.endsWith('.json') ? 'resolution-json-invalid' : 'resolution-input',
            file: target,
            message: String(error),
          });
          continue;
        }
        resolutionBytes += Buffer.byteLength(contents);
        if (resolutionBytes > 8388608) throw new Error('Resolution closure exceeds 8 MiB.');
        resolutionTexts.set(target, contents);
        texts.set(target, contents);
      }
    } catch (error) {
      diagnostics.push({
        code: sources.has(file) ? 'source-parse' : tests.has(file) ? 'test-parse' : 'resolution-input',
        file,
        message: String(error),
      });
    }
  }
  return { resolutionTexts, asts, jsonFiles };
}

/** Export shape only: helper bodies never generate product function rows or test evidence. */
function runtimeDeclaration(node: BabelNode): boolean {
  if (astRecord(node).declare === true) return false;
  return !node.type.startsWith('TS') || node.type === 'TSEnumDeclaration' || node.type === 'TSModuleDeclaration';
}

function runtimeValueExports(ast: BabelFile, file: string): Map<string, string[]> {
  const result = new Map<string, string[]>();
  const locals = new Set<string>();
  for (const statement of ast.program.body) {
    const declaration = statement.type === 'ExportNamedDeclaration' ? statement.declaration : statement;
    if (declaration && declaration.type !== 'ImportDeclaration' && runtimeDeclaration(declaration))
      for (const name of bindingNames(declaration)) locals.add(name);
  }
  const add = (exported: string): void => {
    result.set(exported, [`resolution-only:${file}:${exported}`]);
  };
  for (const statement of ast.program.body) {
    if (statement.type === 'ExportDefaultDeclaration' && runtimeDeclaration(statement.declaration)) add('default');
    if (statement.type !== 'ExportNamedDeclaration' || statement.exportKind === 'type' || statement.source) continue;
    if (statement.declaration && runtimeDeclaration(statement.declaration))
      for (const name of bindingNames(statement.declaration)) add(name);
    for (const specifier of statement.specifiers)
      if (
        specifier.type === 'ExportSpecifier' &&
        specifier.exportKind !== 'type' &&
        specifier.local.type === 'Identifier' &&
        locals.has(specifier.local.name)
      )
        add(exportedName(specifier));
  }
  return result;
}

function resolutionOnlyExports(ast: BabelFile, file: string): SourceExports {
  const result = exportedFunctionIds(ast, [], file);
  result.functions = result.values;
  return result;
}

function declaredResolutionRoot(root: string, supplied: string | undefined, diagnostics: Diagnostic[]): string | null {
  if (supplied === undefined) return null;
  try {
    const repository = path.resolve(supplied);
    if (
      path.relative(repository, root).split(path.sep).join('/') !== 'packages/agent' ||
      realpathSync(repository) !== repository ||
      realpathSync(root) !== root
    )
      throw new Error('Repository resolution must use the canonical ancestor of packages/agent.');
    return repository;
  } catch (error) {
    diagnostics.push({ code: 'resolution-root-invalid', file: supplied, message: String(error) });
    return null;
  }
}

function captureInputs(
  root: string,
  options: AuditOptions,
  diagnostics: Diagnostic[],
  read = capturedUtf8Reader(),
  initialData: ReadonlyMap<string, string> = new Map(),
): CapturedInputs {
  const sourceTexts = captureTextFiles(root, options.sourcePaths, 'source', diagnostics, read);
  const testTexts = captureTextFiles(root, options.testPaths, 'test', diagnostics, read);
  const matrixText = readMatrixText(root, options.matrixPath, diagnostics, read);
  const repository = declaredResolutionRoot(root, options.resolutionRoot, diagnostics);
  const { resolutionTexts, asts, jsonFiles } = captureResolutionInputs(
    root,
    sourceTexts,
    testTexts,
    diagnostics,
    repository,
    read,
    initialData,
  );
  const resolutionHashes = hashTexts(resolutionTexts);
  const sourceHashes = hashTexts(sourceTexts);
  const testHashes = hashTexts(testTexts);
  const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const configHashes: Record<string, string> = {};
  for (const file of configurationFiles) {
    try {
      const matchingRoot = root === packageRoot;
      configHashes[file] =
        (matchingRoot ? (sourceHashes[file] ?? testHashes[file] ?? resolutionHashes[file]) : undefined) ??
        hash(read(packageRoot, file));
    } catch (error) {
      diagnostics.push({ code: 'config-read', file, message: String(error) });
    }
  }
  const config = configurationDigest(
    options.sourcePaths,
    options.testPaths,
    configHashes,
    resolutionHashes,
    repository === null ? null : path.relative(root, repository),
  );
  const hashes = {
    sources: sourceHashes,
    tests: testHashes,
    resolution: resolutionHashes,
    config,
    ...(matrixText === null ? {} : { matrix: hash(matrixText) }),
  };
  return { sourceTexts, testTexts, matrixText, resolutionTexts, asts, jsonFiles, hashes };
}

export const configurationFiles = [
  'package.json',
  'bun.lock',
  'node_modules/bun-types/test.d.ts',
  'tooling/test-function-audit.ts',
  'tooling/function-inventory.ts',
  'tooling/maintained-source-inventory.ts',
  'tooling/pattern-profile.ts',
  'tsconfig.json',
  'tooling/tsconfig.json',
  'tests/tsconfig.json',
  'bunfig.toml',
];

export function configurationDigest(
  sourcePaths: readonly string[],
  testPaths: readonly string[],
  configHashes: Record<string, string>,
  resolutionHashes: Record<string, string> = {},
  repository: string | null = null,
): string {
  return hash(
    JSON.stringify({
      schemaVersion: 1,
      sourcePaths: [...sourcePaths].sort(),
      testPaths: [...testPaths].sort(),
      patterns: patternNames,
      configHashes,
      resolution: {
        policy: 'captured-manifest-platform-bounded-exports/v6',
        repository,
        capturedFileMaxBytes: 8388608,
        resolutionFileMaxBytes: 1048576,
        maxFiles: 256,
        maxBytes: 8388608,
        hashes: resolutionHashes,
      },
    }),
  );
}

function readMatrixText(
  root: string,
  file: string | undefined,
  diagnostics: Diagnostic[],
  read: Utf8Reader,
): string | null {
  if (!file) return null;
  try {
    return read(root, file);
  } catch (error) {
    diagnostics.push({ code: 'matrix-invalid', file, message: String(error) });
    return null;
  }
}

function hashTexts(texts: Map<string, string>): Record<string, string> {
  return Object.fromEntries([...texts].map(([file, text]) => [file, hash(text)]));
}

function indexSources(captured: CapturedInputs, diagnostics: Diagnostic[]): SourceIndex {
  const result: SourceIndex = {
    functions: [],
    sourceExports: new Map(),
    sourceRowsById: new Map(),
    sourceClassesById: new Map(),
    parses: 0,
    inventoryCalls: 0,
    sourceSet: new Set(captured.sourceTexts.keys()),
  };
  for (const [file, source] of captured.sourceTexts)
    indexSource(file, source, captured.hashes.sources[file] ?? '', captured.asts.get(file), result, diagnostics);
  for (const file of [...captured.resolutionTexts.keys(), ...captured.testTexts.keys()]) {
    if (captured.jsonFiles.has(file)) {
      const values = new Map([['default', [`resolution-only:${file}:default`]]]);
      result.sourceSet.add(file);
      result.sourceExports.set(file, {
        functions: values,
        values,
        classes: new Map(),
        namedReexports: new Map(),
        starReexports: [],
      });
      continue;
    }
    const ast = captured.asts.get(file);
    if (!ast) continue;
    result.sourceSet.add(file);
    result.sourceExports.set(file, resolutionOnlyExports(ast, file));
  }
  return result;
}

function indexSource(
  file: string,
  source: string,
  digest: string,
  ast: BabelFile | undefined,
  index: SourceIndex,
  diagnostics: Diagnostic[],
): void {
  try {
    index.parses += 1;
    if (!ast) return;
    index.inventoryCalls += 1;
    const rows = functionRows(source, file, digest, ast);
    rows.forEach((row) => index.sourceRowsById.set(row.identity, row));
    const exports = exportedFunctionIds(ast, rows, file);
    index.sourceExports.set(file, exports);
    for (const bindings of exports.classes.values())
      for (const binding of bindings) index.sourceClassesById.set(binding.identity, binding);
    index.functions.push(...rows);
  } catch (error) {
    diagnostics.push({ code: 'source-parse', file, message: String(error) });
  }
}

function indexTests(
  texts: Map<string, string>,
  asts: Map<string, BabelFile>,
  sources: SourceIndex,
  diagnostics: Diagnostic[],
): TestIndex {
  const index: TestIndex = {
    cases: [],
    caseNames: new Set(),
    directEvidence: new Map(sources.functions.map((row) => [row.identity, []])),
    unresolved: new Set(
      sources.functions
        .filter((row) => row.identity.slice(row.identity.indexOf('#') + 1).includes('/'))
        .map((row) => row.identity),
    ),
    duplicateCaseNames: new Set(),
    parserCalls: 0,
  };
  for (const file of texts.keys()) scanIndexedTest(file, asts.get(file), sources, index, diagnostics);
  return index;
}

function scanIndexedTest(
  file: string,
  ast: BabelFile | undefined,
  sources: SourceIndex,
  index: TestIndex,
  diagnostics: Diagnostic[],
): void {
  try {
    index.parserCalls += 1;
    if (!ast) return;
    const scan = scanTestFile(
      ast,
      file,
      sources.sourceSet,
      sources.sourceExports,
      sources.sourceRowsById,
      sources.sourceClassesById,
    );
    scan.ambiguousFunctions.forEach((identity) => index.unresolved.add(identity));
    for (const edge of scan.uncertainImports)
      diagnostics.push({
        code: 'source-export-unresolved',
        file,
        message: `A used relative import could not be resolved uniquely through the captured source exports: ${edge}.`,
      });
    indexScanCases(scan.cases, index);
    scan.referencedFunctions.forEach((identity) => {
      if (!index.directEvidence.get(identity)?.length) index.unresolved.add(identity);
    });
  } catch (error) {
    diagnostics.push({ code: 'test-parse', file, message: String(error) });
  }
}

function indexScanCases(cases: ScannedCase[], index: TestIndex): void {
  for (const item of cases) {
    const key = `${item.file}\0${item.name}`;
    if (index.caseNames.has(key)) index.duplicateCaseNames.add(key);
    else {
      index.caseNames.add(key);
      index.cases.push({
        file: item.file,
        name: item.name,
        assertion: item.assertion,
        references: [...item.references],
        skipped: item.skipped,
      });
    }
    for (const identity of item.references)
      index.directEvidence.get(identity)?.push({ file: item.file, name: item.name });
  }
}

function resolveAuditMatrix(
  matrixPath: string | undefined,
  captured: CapturedInputs,
  functionsById: Map<string, AuditFunction>,
  tests: TestIndex,
  diagnostics: Diagnostic[],
): ResolvedMatrixFunction[] | null {
  if (!matrixPath || captured.matrixText === null) return null;
  if (tests.duplicateCaseNames.size) {
    diagnostics.push({
      code: 'matrix-invalid',
      file: matrixPath,
      message: 'A matrix cannot identify duplicate enabled test names in one file.',
    });
    return null;
  }
  return loadMatrix(captured.matrixText, matrixPath, captured.hashes, functionsById, tests.cases, diagnostics);
}

function finalizeFunctionRows(
  functions: AuditFunction[],
  directEvidence: TestIndex['directEvidence'],
  unresolved: Set<string>,
  matrix: ResolvedMatrixFunction[] | null,
  functionsById: Map<string, AuditFunction>,
): void {
  for (const row of functions) applyTestEvidence(row, directEvidence.get(row.identity) ?? [], unresolved);
  for (const entry of matrix ?? []) applyMatrixRow(entry, functionsById);
  if (matrix) bindMatrixSlices(functions, matrix);
}

function bindMatrixSlices(functions: AuditFunction[], matrix: ResolvedMatrixFunction[]): void {
  const byIdentity = new Map(matrix.map((entry) => [entry.identity, entry]));
  for (const row of functions) {
    const entry = byIdentity.get(row.identity);
    row.matrixSliceHash = hash(JSON.stringify(entry ?? { identity: row.identity, patterns: 'unreviewed' }));
  }
}

function applyTestEvidence(
  row: AuditFunction,
  cases: Array<{ file: string; name: string }>,
  unresolved: Set<string>,
): void {
  row.testStatus = cases.length ? 'present' : unresolved.has(row.identity) ? 'unresolved' : 'no-direct-reference';
  row.cases = cases;
  row.evidence = cases.length
    ? 'direct-import-call'
    : row.testStatus === 'unresolved'
      ? 'unresolved-private-or-indirect'
      : 'no-direct-reference-in-scanned-scope';
  row.patterns = { status: 'unreviewed', present: [], missing: [], notApplicable: [], unreviewed: [...patternNames] };
}

function applyMatrixRow(entry: ResolvedMatrixFunction, functionsById: Map<string, AuditFunction>): void {
  const row = functionsById.get(entry.identity);
  if (!row) return;
  row.patterns = entry.patterns;
  row.reviewedCases = entry.cases;
  if (entry.risk) row.risk = entry.risk;
}

function makeAuditReport(
  captured: CapturedInputs,
  sources: SourceIndex,
  tests: TestIndex,
  diagnostics: Diagnostic[],
): AuditReport {
  addDuplicateDiagnostics(tests.duplicateCaseNames, diagnostics);
  return {
    schemaVersion: 1,
    status: diagnostics.length ? 'unknown' : 'reported',
    counts: functionCounts(sources.functions, diagnostics.length),
    inputHashes: captured.hashes,
    analysis: {
      sourceInventoryCalls: sources.inventoryCalls,
      sourceAstParses: sources.parses,
      sourceHashes: Object.keys(captured.hashes.sources).length,
      testParserCalls: tests.parserCalls,
      testHashes: Object.keys(captured.hashes.tests).length,
      resolutionHashes: Object.keys(captured.hashes.resolution).length,
      resolutionAstParses: [...captured.resolutionTexts.keys()].filter((file) => !file.endsWith('.json')).length,
    },
    diagnostics,
    functions: sources.functions,
    cases: tests.cases,
  };
}

function addDuplicateDiagnostics(keys: Set<string>, diagnostics: Diagnostic[]): void {
  for (const key of keys)
    diagnostics.push({
      code: 'duplicate-test-case-name',
      file: key.split('\0')[0] ?? '',
      message: 'Enabled Bun test names must be unique within a file.',
    });
}

function functionCounts(functions: AuditFunction[], diagnosticCount: number): AuditReport['counts'] {
  return {
    functions: functions.length,
    present: functions.filter((row) => row.testStatus === 'present').length,
    absent: functions.filter((row) => row.testStatus === 'absent').length,
    noDirectReference: functions.filter((row) => row.testStatus === 'no-direct-reference').length,
    unresolved: functions.filter((row) => row.testStatus === 'unresolved').length,
    diagnostics: diagnosticCount,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isAuditMatrix(value: unknown): value is AuditMatrix {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    !isSha256(value.configHash) ||
    !isRecord(value.sourceHashes) ||
    !isRecord(value.testHashes) ||
    !Array.isArray(value.functions)
  )
    return false;
  if ([...Object.values(value.sourceHashes), ...Object.values(value.testHashes)].some((item) => !isSha256(item)))
    return false;
  return value.functions.every((entry: unknown) => {
    if (!isRecord(entry) || typeof entry.identity !== 'string' || !Array.isArray(entry.cases)) return false;
    if (
      entry.risk !== undefined &&
      (!isRecord(entry.risk) ||
        entry.risk.reviewed !== true ||
        !['P0', 'P1'].includes(String(entry.risk.priority)) ||
        typeof entry.risk.rationale !== 'string')
    )
      return false;
    return entry.cases.every(
      (item) =>
        isRecord(item) &&
        typeof item.file === 'string' &&
        typeof item.name === 'string' &&
        isRecord(item.patterns) &&
        Object.values(item.patterns).every((state: unknown) => typeof state === 'string'),
    );
  });
}

function isSha256(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
}

function loadMatrix(
  matrixText: string,
  matrixPath: string,
  inputHashes: AuditReport['inputHashes'],
  functionsById: Map<string, AuditFunction>,
  cases: ReportCase[],
  diagnostics: Diagnostic[],
): ResolvedMatrixFunction[] | null {
  const parsed = parseMatrix(matrixText, matrixPath, diagnostics);
  const normalized = normalizeMatrix(parsed, matrixPath, diagnostics);
  if (!isBoundMatrix(normalized, inputHashes))
    return matrixFailure(
      matrixPath,
      diagnostics,
      'Matrix schema or bound input hashes do not match the scanned inputs.',
    );
  const caseSet = assertedCaseIndex(cases);
  const grouped = new Map<string, PatternReport[]>();
  const seenFunctions = new Set<string>();
  const seenCases = new Set<string>();
  for (const entry of normalized.functions) {
    if (!validateMatrixFunction(entry, functionsById, seenFunctions, seenCases, caseSet, grouped))
      return matrixFailure(
        matrixPath,
        diagnostics,
        'Matrix contains an unknown, duplicate, empty, or unverified function/case mapping.',
      );
    if (!hasCompleteDirectCaseMapping(entry, caseSet))
      return matrixFailure(
        matrixPath,
        diagnostics,
        `Matrix row ${entry.identity} omits an enabled asserted case that directly calls the function.`,
      );
  }
  return normalized.functions.map((entry) => resolvedMatrixFunction(entry, grouped.get(entry.identity) ?? []));
}

function hasCompleteDirectCaseMapping(entry: MatrixFunction, assertedCases: Map<string, ReportCase>): boolean {
  const mapped = new Set(entry.cases.map((item) => `${item.file}\0${item.name}`));
  for (const [key, actual] of assertedCases)
    if (actual.references.includes(entry.identity) && !mapped.has(key)) return false;
  return true;
}

function parseMatrix(text: string, file: string, diagnostics: Diagnostic[]): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    diagnostics.push({ code: 'matrix-invalid', file, message: String(error) });
    return null;
  }
}

function normalizeMatrix(value: unknown, file: string, diagnostics: Diagnostic[]): unknown {
  if (!value || typeof value !== 'object' || !('schemaVersion' in value) || value.schemaVersion !== 2) return value;
  const normalized = normalizeProfile(value);
  if (normalized) return normalized;
  diagnostics.push({
    code: 'matrix-invalid',
    file,
    message: 'Profile definitions, scenario links, or local overrides are invalid.',
  });
  return null;
}

function isBoundMatrix(value: unknown, hashes: AuditReport['inputHashes']): value is AuditMatrix {
  return Boolean(
    value &&
    isAuditMatrix(value) &&
    value.schemaVersion === 1 &&
    value.configHash === hashes.config &&
    sameObject(value.sourceHashes, hashes.sources) &&
    sameObject(value.testHashes, hashes.tests),
  );
}

function matrixFailure(file: string, diagnostics: Diagnostic[], message: string): null {
  diagnostics.push({ code: 'matrix-invalid', file, message });
  return null;
}

function assertedCaseIndex(cases: ReportCase[]): Map<string, ReportCase> {
  return new Map(
    cases.filter((item) => !item.skipped && item.assertion).map((item) => [`${item.file}\0${item.name}`, item]),
  );
}

function validateMatrixFunction(
  entry: MatrixFunction,
  functionsById: Map<string, AuditFunction>,
  seenFunctions: Set<string>,
  seenCases: Set<string>,
  caseSet: Map<string, ReportCase>,
  grouped: Map<string, PatternReport[]>,
): boolean {
  if (!validMatrixFunction(entry, functionsById, seenFunctions)) return false;
  seenFunctions.add(entry.identity);
  const patterns: PatternReport[] = [];
  for (const item of entry.cases) {
    const pattern = validateMappedCase(entry.identity, item, seenCases, caseSet);
    if (!pattern) return false;
    patterns.push(pattern);
  }
  if (!validRisk(entry.risk)) return false;
  grouped.set(entry.identity, patterns);
  return true;
}

function validMatrixFunction(
  entry: MatrixFunction,
  functionsById: Map<string, AuditFunction>,
  seen: Set<string>,
): boolean {
  return Boolean(
    entry &&
    typeof entry.identity === 'string' &&
    functionsById.has(entry.identity) &&
    !seen.has(entry.identity) &&
    entry.cases.length > 0,
  );
}

function validateMappedCase(
  identity: string,
  item: MatrixCase,
  seen: Set<string>,
  caseSet: Map<string, ReportCase>,
): PatternReport | null {
  const key = `${identity}\0${item.file}\0${item.name}`;
  const actualCase = caseSet.get(`${item.file}\0${item.name}`);
  if (
    seen.has(key) ||
    !actualCase?.references.includes(identity) ||
    !validPatternMap(item.patterns, item.justification)
  )
    return null;
  seen.add(key);
  return reducePatterns(item.patterns, item.justification);
}

function validPatternMap(patterns: MatrixCase['patterns'], justification?: string): boolean {
  if (!patterns || Object.keys(patterns).some((name) => !patternNames.includes(name as PatternName))) return false;
  return patternNames.every((name) => validPatternState(patterns[name], justification));
}

function validPatternState(state: PatternState | undefined, justification?: string): boolean {
  return (
    validPatternStates.has((state ?? 'unreviewed') as PatternState) &&
    (state !== 'not-applicable' || Boolean(justification && justification.trim().length >= 12))
  );
}

function validRisk(risk: MatrixFunction['risk']): boolean {
  return (
    risk === undefined ||
    (risk.reviewed === true && ['P0', 'P1'].includes(risk.priority) && risk.rationale.trim().length >= 12)
  );
}

function resolvedMatrixFunction(entry: MatrixFunction, cases: PatternReport[]): ResolvedMatrixFunction {
  const patterns = mergePatternReports(cases);
  return {
    identity: entry.identity,
    patterns,
    cases: entry.cases.map((item) => ({
      file: item.file,
      name: item.name,
      patterns: item.patterns,
      ...(item.justification === undefined ? {} : { justification: item.justification }),
    })),
    ...(entry.risk ? { risk: entry.risk } : {}),
  };
}

function mergePatternReports(reports: PatternReport[]): PatternReport {
  const patterns: PatternReport = { status: 'unreviewed', present: [], missing: [], notApplicable: [], unreviewed: [] };
  for (const report of reports) mergePatternReport(patterns, report);
  patterns.status = patterns.unreviewed.length ? 'unreviewed' : 'reviewed';
  return patterns;
}

function mergePatternReport(target: PatternReport, source: PatternReport): void {
  source.present.forEach((name) => appendUniqueName(target.present, name));
  source.missing.forEach((name) => appendUniqueName(target.missing, name));
  source.unreviewed.forEach((name) => appendUniqueName(target.unreviewed, name));
  source.notApplicable.forEach((item) => {
    if (!target.notApplicable.some((current) => current.name === item.name)) target.notApplicable.push(item);
  });
}

function appendUniqueName(names: PatternName[], name: PatternName): void {
  if (!names.includes(name)) names.push(name);
}

function reducePatterns(patterns: MatrixCase['patterns'], justification?: string): PatternReport {
  const present: PatternName[] = [];
  const missing: PatternName[] = [];
  const notApplicable: PatternReport['notApplicable'] = [];
  const unreviewed: PatternName[] = [];
  for (const name of patternNames) {
    const value = patterns[name] ?? 'unreviewed';
    if (value === 'present') present.push(name);
    else if (value === 'missing') missing.push(name);
    else if (value === 'not-applicable') notApplicable.push({ name, justification: justification ?? '' });
    else unreviewed.push(name);
  }
  return { status: unreviewed.length ? 'unreviewed' : 'reviewed', present, missing, notApplicable, unreviewed };
}

function sameObject(left: unknown, right: Record<string, string>): boolean {
  if (!left || typeof left !== 'object' || Array.isArray(left)) return false;
  const record = left as Record<string, unknown>;
  const leftKeys = Object.keys(record).sort(),
    rightKeys = Object.keys(right).sort();
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every((key, index) => key === rightKeys[index] && record[key] === right[key])
  );
}

export function buildQueue(report: AuditReport, workers = 1): QueueJob[] {
  validateWorkers(workers);
  const testScopeHash = hash(JSON.stringify(report.inputHashes.tests));
  const groups = connectedQueueGroups(report, queueCandidates(report), testScopeHash);
  return [...groups.values()]
    .sort((left, right) => left.target.localeCompare(right.target))
    .map((group, index) => makeQueueJob(group, index, workers));
}

function connectedQueueGroups(
  report: AuditReport,
  candidates: QueueCandidate[],
  testScopeHash: string,
): Map<number, QueueGroup> {
  const parents = candidates.map((_, index) => index);
  const ranks = candidates.map(() => 0);
  const findRoot = (index: number): number => {
    let root = index;
    while (parents[root] !== root) root = parents[root] ?? root;
    while (parents[index] !== index) {
      const next = parents[index] ?? root;
      parents[index] = root;
      index = next;
    }
    return root;
  };
  const union = (left: number, right: number): void => {
    let leftRoot = findRoot(left);
    let rightRoot = findRoot(right);
    if (leftRoot === rightRoot) return;
    if ((ranks[leftRoot] ?? 0) < (ranks[rightRoot] ?? 0)) [leftRoot, rightRoot] = [rightRoot, leftRoot];
    parents[rightRoot] = leftRoot;
    if (ranks[leftRoot] === ranks[rightRoot]) ranks[leftRoot] = (ranks[leftRoot] ?? 0) + 1;
  };
  const ownerByFile = new Map<string, number>();
  candidates.forEach((candidate, index) => {
    for (const file of candidate.ownedFiles) {
      const owner = ownerByFile.get(file);
      if (owner === undefined) ownerByFile.set(file, index);
      else union(index, owner);
    }
  });
  const groups = new Map<number, QueueGroup>();
  candidates.forEach((candidate, index) => {
    const root = findRoot(index);
    const group = groups.get(root) ?? { target: candidate.target, functions: [], kind: candidate.kind };
    if (candidate.target.localeCompare(group.target) < 0) group.target = candidate.target;
    group.functions.push(
      makeQueueFunction(report, candidate.row, candidate.directFiles, candidate.target, testScopeHash),
    );
    group.kind = mergeQueueKind(group.kind, candidate.kind);
    groups.set(root, group);
  });
  return groups;
}

function validateWorkers(workers: number): void {
  if (!Number.isSafeInteger(workers) || workers < 1 || workers > 32)
    throw new Error('--workers must be an integer from 1 to 32.');
}

function queueCandidates(report: AuditReport): QueueCandidate[] {
  return report.functions.flatMap((row) => {
    if (isFullyReviewed(report, row)) return [];
    const directFiles = [...new Set(row.cases.map((item) => item.file))].sort();
    const target = directFiles[0] ?? proposedTestFile(row.file);
    return [
      {
        row,
        directFiles,
        target,
        ownedFiles: directFiles.length ? directFiles : [target],
        kind: queueKind(report, row, directFiles.length > 0),
      },
    ];
  });
}

function isFullyReviewed(report: AuditReport, row: AuditFunction): boolean {
  return report.status === 'reported' && row.patterns.status === 'reviewed' && row.patterns.missing.length === 0;
}

function proposedTestFile(sourceFile: string): string {
  return `tests/${path.posix.basename(sourceFile).replace(/\.(?:ts|tsx|js|mjs)$/u, '')}.test.ts`;
}

function queueKind(report: AuditReport, row: AuditFunction, hasTarget: boolean): string {
  if (report.status === 'unknown') return 'blocked';
  if (row.patterns.status !== 'reviewed' || !row.patterns.missing.length) return 'review';
  return hasTarget ? 'update' : 'write';
}

function mergeQueueKind(current: string, incoming: string): string {
  if (current === 'blocked' || incoming === 'blocked') return 'blocked';
  if (current === 'review' || incoming === 'review') return 'review';
  if (current === 'update' || incoming === 'update') return 'update';
  return 'write';
}

function makeQueueFunction(
  report: AuditReport,
  row: AuditFunction,
  directFiles: string[],
  target: string,
  testScopeHash: string,
): QueueFunction {
  return {
    identity: row.identity,
    source: row.file,
    sourceHash: row.inputHash,
    testHashes: testHashesForFiles(report.inputHashes.tests, directFiles),
    testScopeHash,
    configHash: report.inputHashes.config,
    ...(row.matrixSliceHash
      ? { matrixHash: row.matrixSliceHash }
      : report.status === 'unknown' && report.inputHashes.matrix
        ? { matrixHash: report.inputHashes.matrix }
        : {}),
    testStatus: row.testStatus,
    evidence: row.evidence,
    directCases: row.cases,
    requiredScenarios: row.reviewedCases ?? [],
    missingPatterns: row.patterns.missing,
    unreviewedPatterns: row.patterns.unreviewed,
    unknownScenarioState: row.testStatus === 'unresolved' || row.patterns.status === 'unreviewed',
    risk: row.risk ?? { priority: 'review', reviewed: false },
    scope: {
      sourceFiles: [row.file],
      testFiles: directFiles.length ? directFiles : [target],
      readOnlyInputs: [row.file, ...directFiles],
      ...(directFiles.length ? {} : { testSearchRoot: 'tests' }),
      testCorpus: { root: 'tests', files: Object.keys(report.inputHashes.tests).length, digest: testScopeHash },
    },
    checkCommands: (directFiles.length ? directFiles : [target]).map((file) => `node bin/bun.mjs test ${file}`),
    prompt: `Review ${row.identity} using the bound source, test, and audit configuration hashes. Decide the contract and applicable scenarios before writing or updating a test. Preserve UNKNOWN and do not treat labels or import references as proof. Target ${target}. Do not edit shared helpers; report any helper dependency to the owning reviewer.`,
  };
}

function testHashesForFiles(hashes: Record<string, string>, files: string[]): Record<string, string> {
  return Object.fromEntries(
    files.filter((file) => hashes[file] !== undefined).map((file) => [file, hashes[file] ?? '']),
  );
}

function makeQueueJob(group: QueueGroup, index: number, workers: number): QueueJob {
  const inputs = group.functions.map(queueInput);
  const explicitRisks = group.functions.map((entry) => entry.risk).filter((risk) => risk.reviewed === true);
  const priority = resolvedPriority(explicitRisks, group.functions.length);
  const id = hash(JSON.stringify({ target: group.target, configHash: group.functions[0]?.configHash ?? '', inputs }));
  return {
    jobId: `test-audit-${id.slice(0, 16)}`,
    kind: group.kind,
    priority,
    target: {
      path: group.target,
      disposition: group.functions.some((entry) => entry.directCases.length) ? 'existing' : 'proposed',
    },
    functions: group.functions,
    sourceHashes: Object.fromEntries(group.functions.map((entry) => [entry.source, entry.sourceHash])),
    testHashes: Object.fromEntries(group.functions.flatMap((entry) => Object.entries(entry.testHashes))),
    testScopeHash: group.functions[0]?.testScopeHash ?? hash('{}'),
    configHash: group.functions[0]?.configHash ?? '',
    workerHint: `worker-${(index % workers) + 1}`,
  };
}

function queueInput(entry: QueueFunction) {
  return {
    identity: entry.identity,
    sourceHash: entry.sourceHash,
    testHashes: entry.testHashes,
    testScopeHash: entry.testScopeHash,
    configHash: entry.configHash,
    matrixHash: entry.matrixHash,
    scenarios: entry.requiredScenarios,
    risk: entry.risk,
  };
}

function resolvedPriority(risks: Risk[], functionCount: number): QueueJob['priority'] {
  if (risks.length !== functionCount) return 'review';
  return risks.some((risk) => risk.priority === 'P0') ? 'P0' : 'P1';
}

export function draftPatternProfiles(report: AuditReport) {
  return draftProfile(report);
}

function walkTests(directory: string, relative = ''): string[] {
  return readdirSync(path.join(directory, relative), { withFileTypes: true })
    .flatMap((entry) => {
      const child = path.posix.join(relative, entry.name);
      if (entry.isDirectory()) return walkTests(directory, child);
      return /\.test\.(?:mjs|js|ts|tsx)$/u.test(entry.name) ? [child] : [];
    })
    .sort();
}

function help() {
  return `Usage: node bin/bun.mjs tooling/test-function-audit.ts [--source=src/foo.ts] [--format=json|table] [--matrix=path] [--draft=profiles] [--queue=json|table] [--workers=N] [--help]\nScans maintained mutationSources and tests/ *.test.* files in this package. Queue mode reports deterministic write/update/review/blocked jobs with one owner per test file; worker hints do not start agents or edit files. Matrix schemaVersion 1 or reusable-profile schemaVersion 2 binds sourceHashes, testHashes, configHash, and function identities to real asserted named cases; profile patterns compose base profile, scenario refinements, and case overrides. Draft mode prints an unreviewed profile document from this scan without rescanning or writing files. Evidence is structural and does not prove semantics.`;
}

function main(args: string[]): number {
  const options = parseCliOptions(args);
  if (options.help) {
    process.stdout.write(help() + '\n');
    return 0;
  }
  return runCli(options, process.cwd());
}

function parseCliOptions(args: string[]): CliOptions {
  const parsed = parseArgs({
    args,
    strict: true,
    allowPositionals: false,
    options: {
      help: { type: 'boolean' },
      source: { type: 'string' },
      matrix: { type: 'string' },
      format: { type: 'string', default: 'table' },
      queue: { type: 'string' },
      draft: { type: 'string' },
      workers: { type: 'string', default: '1' },
    },
  });
  return normalizeCliOptions(parsed.values);
}

function normalizeCliOptions(values: Record<string, string | boolean | undefined>): CliOptions {
  const format = cliFormat(values.format);
  const queue = cliQueue(values.queue);
  const draft = cliDraft(values.draft);
  const workers = cliWorkers(values.workers);
  return {
    help: values.help === true,
    ...(typeof values.source === 'string' ? { source: values.source } : {}),
    ...(typeof values.matrix === 'string' ? { matrix: values.matrix } : {}),
    format,
    ...(queue ? { queue } : {}),
    ...(draft ? { draft } : {}),
    workers,
  };
}

function cliFormat(value: string | boolean | undefined): CliOptions['format'] {
  const format = value ?? 'table';
  if (format !== 'json' && format !== 'table') throw new Error('--format must be json or table.');
  return format;
}

function cliQueue(value: string | boolean | undefined): CliOptions['queue'] {
  if (value === undefined) return undefined;
  if (value !== 'json' && value !== 'table') throw new Error('--queue must be json or table.');
  return value;
}

function cliDraft(value: string | boolean | undefined): CliOptions['draft'] {
  if (value === undefined) return undefined;
  if (value !== 'profiles') throw new Error('--draft must be profiles.');
  return value;
}

function cliWorkers(value: string | boolean | undefined): number {
  const workers = Number(value ?? '1');
  validateWorkers(workers);
  return workers;
}

function runCli(options: CliOptions, root: string): number {
  const read = capturedUtf8Reader();
  const manifest = read(root, 'package.json', 1048576);
  const inventory = maintainedSourceInventory(root, undefined, Buffer.from(manifest));
  const sourcePaths = options.source ? [options.source] : inventory.mutationSources;
  if (options.source && !inventory.mutationSources.includes(options.source))
    throw new Error(`Source is not maintained: ${options.source}`);
  const testPaths = walkTests(path.join(root, 'tests')).map((file) => `tests/${file}`);
  const executingPackage = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const auditOptions: AuditOptions = {
    root,
    ...(root === executingPackage ? { resolutionRoot: path.resolve(root, '../..') } : {}),
    sourcePaths,
    testPaths,
    ...(options.matrix ? { matrixPath: options.matrix } : {}),
  };
  const diagnostics: Diagnostic[] = [];
  const captured = captureInputs(root, auditOptions, diagnostics, read, new Map([['package.json', manifest]]));
  const report = auditCapturedInputs(auditOptions, captured, diagnostics);
  printCliResult(report, options);
  return report.status === 'unknown' ? 2 : 0;
}

function printCliResult(report: AuditReport, options: CliOptions): void {
  if (options.draft) return printDraft(report);
  if (options.queue) return printQueue(report, options);
  if (options.format === 'json') process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  else printAuditTable(report);
}

function printDraft(report: AuditReport): void {
  process.stdout.write(JSON.stringify({ report, draft: draftPatternProfiles(report) }, null, 2) + '\n');
}

function printQueue(report: AuditReport, options: CliOptions): void {
  const queue = buildQueue(report, options.workers);
  if (options.queue === 'json') process.stdout.write(JSON.stringify({ ...report, queue }, null, 2) + '\n');
  else {
    process.stdout.write(`Test audit queue: ${queue.length} jobs; worker hints only\n`);
    queue.forEach((job) =>
      process.stdout.write(
        `${job.kind.padEnd(8)} ${job.priority.padEnd(6)} ${job.target.disposition.padEnd(8)} ${job.target.path} | ${job.functions.length} function(s) | ${job.jobId} | ${job.workerHint}\n`,
      ),
    );
  }
}

function printAuditTable(report: AuditReport): void {
  process.stdout.write(
    `Function test audit: ${report.status} (${report.counts.functions} functions; ${report.counts.present} present, ${report.counts.absent} confirmed absent, ${report.counts.noDirectReference} no direct reference, ${report.counts.unresolved} unresolved; ${report.counts.diagnostics} diagnostics)\n`,
  );
  for (const row of report.functions)
    process.stdout.write(
      `${row.testStatus.padEnd(10)} ${row.identity} | ${row.cases.map((item) => `${item.file} :: ${item.name}`).join(', ') || '—'} | patterns ${row.patterns.status}\n`,
    );
  report.diagnostics.forEach((issue) => process.stderr.write(`${issue.code} ${issue.file}: ${issue.message}\n`));
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${String(error)}\n`);
    process.exitCode = 2;
  }
}
