import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { typescriptSyntaxPlugins } from './babel-syntax.js';

type AstNode = { readonly type?: string; readonly [key: string]: unknown };
type ScopeKind = 'module' | 'function' | 'block';
type Binding = { callable: boolean; factory: boolean; namespace: boolean };
type Scope = { readonly parent?: Scope; readonly kind: ScopeKind; readonly bindings: Map<string, Binding> };
type AliasEdge = {
  readonly target?: Binding;
  readonly name?: string;
  readonly scope: Scope;
  readonly expression: AstNode;
  readonly namespaceMember: boolean;
};
type FocusNode = { readonly expression: AstNode; readonly scope: Scope; readonly line: number };
type Analysis = { readonly aliases: AliasEdge[]; readonly focuses: FocusNode[] };
type Parser = (source: string, options: object) => AstNode;

const testModules = new Set(['bun:test', 'vitest', '@jest/globals', 'node:test']);
const testNames = new Set(['test', 'it', 'describe']);
const factoryNames = new Set(['each', 'extend']);
const skippedAstFields = new Set(['loc', 'extra', 'comments', 'tokens']);
const globalTests = new Map<string, Binding>(
  [...testNames].map((name) => [name, { callable: true, factory: false, namespace: false }]),
);

function node(value: unknown): AstNode | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as AstNode) : undefined;
}

function child(value: AstNode, key: string): AstNode | undefined {
  return node(value[key]);
}

function identifier(value: AstNode | undefined): string | undefined {
  return value?.type === 'Identifier' && typeof value.name === 'string' ? value.name : undefined;
}

function unwrap(value: AstNode | undefined): AstNode | undefined {
  let current = value;
  while (
    current?.type === 'TSAsExpression' ||
    current?.type === 'TSTypeAssertion' ||
    current?.type === 'TSSatisfiesExpression' ||
    current?.type === 'TSNonNullExpression' ||
    current?.type === 'ParenthesizedExpression'
  )
    current = child(current, 'expression');
  return current;
}

function propertyName(value: AstNode): string | undefined {
  const property = child(value, 'property');
  if (!property) return undefined;
  return value.computed === true
    ? typeof property.value === 'string'
      ? property.value
      : undefined
    : identifier(property);
}

function objectPropertyName(value: AstNode): string | undefined {
  const key = child(value, 'key');
  if (!key) return undefined;
  return value.computed === true ? (typeof key.value === 'string' ? key.value : undefined) : identifier(key);
}

function isMember(value: AstNode | undefined): value is AstNode & {
  readonly type: 'MemberExpression' | 'OptionalMemberExpression';
} {
  return value?.type === 'MemberExpression' || value?.type === 'OptionalMemberExpression';
}

function newScope(parent: Scope | undefined, kind: ScopeKind): Scope {
  return parent ? { parent, kind, bindings: new Map() } : { kind, bindings: new Map() };
}

function declare(scope: Scope, name: string): Binding {
  const existing = scope.bindings.get(name);
  if (existing) return existing;
  const binding: Binding = { callable: false, factory: false, namespace: false };
  scope.bindings.set(name, binding);
  return binding;
}

function resolveBinding(name: string, scope: Scope): Binding | undefined {
  let current: Scope | undefined = scope;
  while (current) {
    const binding = current.bindings.get(name);
    if (binding) return binding;
    current = current.parent;
  }
  return globalTests.get(name);
}

function variableScope(scope: Scope): Scope {
  let current = scope;
  while (current.kind === 'block' && current.parent) current = current.parent;
  return current;
}

function enterScope(value: AstNode, parent: Scope): Scope {
  if (isFunctionNode(value)) return newScope(parent, 'function');
  if (
    value.type === 'BlockStatement' ||
    value.type === 'ForStatement' ||
    value.type === 'ForInStatement' ||
    value.type === 'ForOfStatement' ||
    value.type === 'SwitchStatement' ||
    value.type === 'CatchClause' ||
    value.type === 'ClassExpression'
  )
    return newScope(parent, 'block');
  return parent;
}

function isFunctionNode(value: AstNode): boolean {
  return [
    'FunctionDeclaration',
    'FunctionExpression',
    'ArrowFunctionExpression',
    'ObjectMethod',
    'ClassMethod',
    'ClassPrivateMethod',
  ].includes(value.type ?? '');
}

function bindingPattern(value: AstNode | undefined, scope: Scope): void {
  if (!value) return;
  if (value.type === 'Identifier') {
    const name = identifier(value);
    if (name) declare(scope, name);
    return;
  }
  if (value.type === 'RestElement') bindingPattern(child(value, 'argument'), scope);
  else if (value.type === 'AssignmentPattern') bindingPattern(child(value, 'left'), scope);
  else if (value.type === 'ObjectProperty') bindingPattern(child(value, 'value'), scope);
  else if (value.type === 'ObjectPattern') bindPatternList(value.properties, scope);
  else if (value.type === 'ArrayPattern') bindPatternList(value.elements, scope);
  else if (value.type === 'TSParameterProperty') bindingPattern(child(value, 'parameter'), scope);
}

function bindPatternList(values: unknown, scope: Scope): void {
  if (!Array.isArray(values)) return;
  for (const value of values) bindingPattern(node(value), scope);
}

function registerFunction(value: AstNode, parent: Scope, scope: Scope): void {
  const name = identifier(child(value, 'id'));
  if (value.type === 'FunctionDeclaration' && name) declare(parent, name);
  if (value.type !== 'FunctionDeclaration' && name) declare(scope, name);
  bindPatternList(value.params, scope);
}

function registerClass(value: AstNode, parent: Scope, scope: Scope): void {
  if (value.type !== 'ClassDeclaration' && value.type !== 'ClassExpression') return;
  const name = identifier(child(value, 'id'));
  if (name) declare(value.type === 'ClassExpression' ? scope : parent, name);
}

function importedName(value: AstNode): string {
  const imported = child(value, 'imported');
  return typeof imported?.name === 'string' ? imported.name : typeof imported?.value === 'string' ? imported.value : '';
}

function registerImportSpecifier(value: unknown, moduleName: string, scope: Scope): void {
  const specifier = node(value);
  if (!specifier) return;
  const local = identifier(child(specifier, 'local'));
  if (!local) return;
  const binding = declare(scope, local);
  if (!testModules.has(moduleName)) return;
  if (specifier.type === 'ImportNamespaceSpecifier') binding.namespace = true;
  if (specifier.type === 'ImportSpecifier' && testNames.has(importedName(specifier))) binding.callable = true;
  if (moduleName === 'node:test' && specifier.type === 'ImportDefaultSpecifier') binding.callable = true;
}

function registerImports(value: AstNode, scope: Scope): void {
  const source = child(value, 'source');
  const moduleName = typeof source?.value === 'string' ? source.value : '';
  if (value.type !== 'ImportDeclaration' || !Array.isArray(value.specifiers)) return;
  for (const specifier of value.specifiers) registerImportSpecifier(specifier, moduleName, scope);
}

function registerVariable(value: AstNode, scope: Scope, targetScope: Scope, state: Analysis): void {
  const pattern = child(value, 'id');
  const expression = child(value, 'init');
  bindingPattern(pattern, targetScope);
  if (identifier(pattern) && expression) {
    const target = resolveBinding(identifier(pattern) ?? '', targetScope);
    if (target) state.aliases.push({ target, scope, expression, namespaceMember: false });
  }
  if (pattern && expression) registerDestructuring(pattern, expression, scope, targetScope, state);
}

function registerDestructuredProperty(
  value: unknown,
  expression: AstNode,
  scope: Scope,
  targetScope: Scope,
  state: Analysis,
): void {
  const property = node(value);
  if (!property || property.type !== 'ObjectProperty') return;
  const key = objectPropertyName(property);
  const targetName = identifier(unwrap(child(property, 'value')));
  if (key === 'only') state.focuses.push({ expression, scope, line: sourceLine(property) });
  if (!targetName || !testNames.has(key ?? '')) return;
  const target = resolveBinding(targetName, targetScope);
  if (target) state.aliases.push({ target, scope, expression, namespaceMember: true });
}

function registerDestructuring(
  pattern: AstNode,
  expression: AstNode,
  scope: Scope,
  targetScope: Scope,
  state: Analysis,
): void {
  if (pattern.type !== 'ObjectPattern' || !Array.isArray(pattern.properties)) return;
  for (const property of pattern.properties)
    registerDestructuredProperty(property, expression, scope, targetScope, state);
}

function registerAssignment(value: AstNode, scope: Scope, state: Analysis): void {
  if (value.type !== 'AssignmentExpression' || value.operator !== '=') return;
  const targetName = identifier(unwrap(child(value, 'left')));
  const expression = child(value, 'right');
  if (targetName && expression) state.aliases.push({ name: targetName, scope, expression, namespaceMember: false });
}

function registerFocus(value: AstNode, scope: Scope, state: Analysis): void {
  if (isMember(value) && propertyName(value) === 'only') {
    const expression = child(value, 'object');
    if (expression) state.focuses.push({ expression, scope, line: sourceLine(value) });
  }
}

function sourceLine(value: AstNode): number {
  const loc = child(value, 'loc');
  const start = child(loc ?? {}, 'start');
  return typeof start?.line === 'number' ? start.line : 0;
}

function registerNode(value: AstNode, parent: Scope, scope: Scope, bindingScope: Scope, state: Analysis): void {
  if (isFunctionNode(value)) registerFunction(value, parent, scope);
  registerClass(value, parent, scope);
  registerImports(value, scope);
  if (value.type === 'VariableDeclarator') registerVariable(value, scope, bindingScope, state);
  registerAssignment(value, scope, state);
  registerFocus(value, scope, state);
  if (value.type === 'CatchClause') bindingPattern(child(value, 'param'), scope);
}

function nextBindingScope(value: AstNode, scope: Scope): Scope {
  const kind = typeof value.kind === 'string' ? value.kind : '';
  return value.type === 'VariableDeclaration' && kind === 'var' ? variableScope(scope) : scope;
}

function walkField(value: unknown, scope: Scope, bindingScope: Scope, state: Analysis): void {
  const nested = node(value);
  if (nested) walk(nested, scope, bindingScope, state);
}

function walk(value: AstNode, parent: Scope, bindingScope: Scope, state: Analysis): void {
  const scope = enterScope(value, parent);
  registerNode(value, parent, scope, bindingScope, state);
  const childBindingScope = nextBindingScope(value, scope);
  for (const [key, field] of Object.entries(value)) {
    if (skippedAstFields.has(key)) continue;
    if (Array.isArray(field)) {
      for (const item of field) walkField(item, scope, childBindingScope, state);
    } else walkField(field, scope, childBindingScope, state);
  }
}

function isNamespaceTestMember(value: AstNode, scope: Scope): boolean {
  const name = identifier(unwrap(child(value, 'object')));
  return testNames.has(propertyName(value) ?? '') && resolveBinding(name ?? '', scope)?.namespace === true;
}

function isTestFactory(value: AstNode | undefined, scope: Scope): boolean {
  const expression = unwrap(value);
  const name = identifier(expression);
  if (name) return resolveBinding(name, scope)?.factory === true;
  return (
    isMember(expression) &&
    factoryNames.has(propertyName(expression) ?? '') &&
    isTestCallable(child(expression, 'object'), scope)
  );
}

function isTestResultCall(value: AstNode, scope: Scope): boolean {
  if (value.type !== 'CallExpression' && value.type !== 'OptionalCallExpression') return false;
  return isTestFactory(child(value, 'callee'), scope);
}

function isTestCallable(value: AstNode | undefined, scope: Scope): boolean {
  const expression = unwrap(value);
  const name = identifier(expression);
  if (name) return resolveBinding(name, scope)?.callable === true;
  if (isMember(expression)) {
    if (isNamespaceTestMember(expression, scope)) return true;
    if (factoryNames.has(propertyName(expression) ?? '')) return false;
    return propertyName(expression) !== 'only' && isTestCallable(child(expression, 'object'), scope);
  }
  return expression ? isTestResultCall(expression, scope) : false;
}

function updateFunctionAlias(
  alias: AliasEdge,
  target: Binding,
  source: Binding | undefined,
  expression: AstNode | undefined,
): boolean {
  return (alias.namespaceMember && source?.namespace === true) || isTestCallable(expression, alias.scope)
    ? setCallable(target)
    : false;
}

function updateFactoryAlias(target: Binding, expression: AstNode | undefined, scope: Scope): boolean {
  return isTestFactory(expression, scope) ? setFactory(target) : false;
}

function updateNamespaceAlias(target: Binding, source: Binding | undefined): boolean {
  if (!source?.namespace || target.namespace) return false;
  target.namespace = true;
  return true;
}

function updateAlias(alias: AliasEdge): boolean {
  const target = alias.target ?? resolveBinding(alias.name ?? '', alias.scope);
  if (!target) return false;
  const expression = unwrap(alias.expression);
  const name = identifier(expression);
  const source = name ? resolveBinding(name, alias.scope) : undefined;
  const updated =
    updateFunctionAlias(alias, target, source, expression) ||
    updateFactoryAlias(target, expression, alias.scope) ||
    updateNamespaceAlias(target, source);
  return updated;
}

function setCallable(target: Binding): boolean {
  if (target.callable) return false;
  target.callable = true;
  return true;
}

function setFactory(target: Binding): boolean {
  if (target.factory) return false;
  target.factory = true;
  return true;
}

function propagateAliases(aliases: readonly AliasEdge[]): void {
  let changed = true;
  while (changed) {
    changed = false;
    for (const alias of aliases) if (updateAlias(alias)) changed = true;
  }
}

function focusRejected(focus: FocusNode): boolean {
  return isTestCallable(focus.expression, focus.scope) || isTestFactory(focus.expression, focus.scope);
}

function analyze(ast: AstNode): Analysis {
  const state: Analysis = { aliases: [], focuses: [] };
  const root = newScope(undefined, 'module');
  walk(ast, root, root, state);
  propagateAliases(state.aliases);
  return state;
}

function resolveParser(pkg: string): Parser {
  const requireFromPackage = createRequire(path.join(pkg, 'package.json'));
  const parser = requireFromPackage('@babel/parser') as { parse: Parser };
  return parser.parse;
}

export async function rejectFocusedTests(pkg: string, files: readonly string[]): Promise<void> {
  const parse = resolveParser(pkg);
  for (const file of files) {
    const ast = parse(readFileSync(file, 'utf8'), {
      sourceType: 'unambiguous',
      sourceFilename: file,
      plugins: typescriptSyntaxPlugins(file),
    });
    const analysis = analyze(ast);
    const focus = analysis.focuses.find(focusRejected);
    if (focus) throw new Error(`Focused test is forbidden: ${file}:${focus.line}`);
  }
}
