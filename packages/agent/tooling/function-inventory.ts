import { parse } from '@babel/parser';

interface AstNode {
  type: string;
  [key: string]: unknown;
}

export interface FunctionRow {
  identity: string;
  file: string;
  name: string;
  line: number;
  column: number;
  start: number;
  end: number;
  bodyLine: number;
  bodyColumn: number;
  bodyEndLine: number;
  bodyEndColumn: number;
  complexity: number;
}

const functionTypes = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
  'ObjectMethod',
  'ClassMethod',
  // Private methods remain distinct; the public Istanbul adapter preserves their original body locations.
  'ClassPrivateMethod',
]);
const decisions = new Set([
  'IfStatement',
  'ConditionalExpression',
  'ForStatement',
  'ForInStatement',
  'ForOfStatement',
  'WhileStatement',
  'DoWhileStatement',
  'CatchClause',
]);

function isNode(value: unknown): value is AstNode {
  return value !== null && typeof value === 'object' && 'type' in value && typeof value.type === 'string';
}

function children(node: AstNode): Array<[string, AstNode, number]> {
  const result: Array<[string, AstNode, number]> = [];
  for (const [key, value] of Object.entries(node)) {
    if (['loc', 'start', 'end', 'extra', 'comments', 'tokens'].includes(key)) continue;
    if (Array.isArray(value)) {
      value.forEach((child: unknown, index: number) => {
        if (isNode(child)) result.push([key, child, index]);
      });
    } else if (isNode(value)) {
      result.push([key, value, 0]);
    }
  }
  return result;
}

function nameOf(node: unknown): string | null {
  if (!isNode(node)) return null;
  if (typeof node.name === 'string') return node.name;
  return typeof node.value === 'string' ? node.value : null;
}

function methodName(node: AstNode): string | null {
  if (!isNode(node.key)) return null;
  if (node.type === 'ClassPrivateMethod' && node.key.type === 'PrivateName') {
    const name = nameOf(node.key.id);
    return name === null ? null : `#${name}`;
  }
  const name = nameOf(node.key);
  return name?.startsWith('#') ? `public:${name}` : name;
}

function functionLabel(node: AstNode, parent: AstNode | null, field: string, index: number): string {
  const named = nameOf(node.id);
  if (named) return `fn:${named}`;
  const method = methodName(node);
  if (method) return `method:${method}`;
  if (parent?.type === 'VariableDeclarator' && nameOf(parent.id)) return `binding:${nameOf(parent.id)}`;
  if (parent?.type === 'AssignmentExpression' && nameOf(parent.left)) return `assignment:${nameOf(parent.left)}`;
  if (parent?.type === 'ObjectProperty' && nameOf(parent.key)) return `property:${nameOf(parent.key)}`;
  return `closure:${parent?.type ?? 'root'}:${field}[${index}]`;
}

function isClass(node: AstNode): boolean {
  return node.type === 'ClassDeclaration' || node.type === 'ClassExpression';
}

function classOwner(node: AstNode, owner: string[]): string[] {
  if (!isClass(node)) return owner;
  const name = nameOf(node.id);
  return name ? [...owner, `class:${name}`] : owner;
}

function complexityForNode(node: AstNode): number {
  let score = decisions.has(node.type) ? 1 : 0;
  if (node.type === 'SwitchCase' && node.test) score += 1;
  if (node.type === 'LogicalExpression' && ['&&', '||', '??'].includes(String(node.operator))) score += 1;
  if (node.type === 'AssignmentExpression' && ['&&=', '||=', '??='].includes(String(node.operator))) score += 1;
  return score;
}

function functionComplexity(body: AstNode): number {
  let score = 1;
  const pending: AstNode[] = [body];
  while (pending.length) {
    const current = pending.pop();
    if (!current) continue;
    if (current !== body && functionTypes.has(current.type)) continue;
    score += complexityForNode(current);
    for (const [, child] of children(current)) pending.push(child);
  }
  return score;
}

interface Position {
  line: number;
  column: number;
}
function isPosition(value: unknown): value is Position {
  return (
    value !== null &&
    typeof value === 'object' &&
    'line' in value &&
    'column' in value &&
    typeof value.line === 'number' &&
    typeof value.column === 'number'
  );
}

function checkedLocation(
  node: AstNode,
  file: string,
  label: string,
): {
  line: number;
  column: number;
  start: number;
  end: number;
  endLine: number;
  endColumn: number;
} {
  const loc = node.loc;
  if (!loc || typeof loc !== 'object' || !('start' in loc) || !('end' in loc)) {
    throw new Error(`AST function location is missing: ${file}.${label}`);
  }
  const start = loc.start;
  const end = loc.end;
  if (!isPosition(start) || !isPosition(end) || typeof node.start !== 'number' || typeof node.end !== 'number') {
    throw new Error(`AST function start location is missing: ${file}.${label}`);
  }
  return {
    line: start.line,
    column: start.column,
    start: node.start,
    end: node.end,
    endLine: end.line,
    endColumn: end.column,
  };
}

function functionOwner(
  node: AstNode,
  parent: AstNode | null,
  field: string,
  index: number,
  owner: string[],
  file: string,
  occurrences: Map<string, number>,
  rows: FunctionRow[],
): string[] {
  if (!functionTypes.has(node.type) || !isNode(node.body)) return owner;
  const label = functionLabel(node, parent, field, index);
  const scope = `${file}#${[...owner, label].join('/')}`;
  const ordinal = occurrences.get(scope) ?? 0;
  occurrences.set(scope, ordinal + 1);
  const location = checkedLocation(node, file, label);
  const bodyLocation = checkedLocation(node.body, file, `${label}.body`);
  rows.push({
    identity: `${scope}#${ordinal}`,
    file,
    name: label,
    line: location.line,
    column: location.column,
    start: location.start,
    end: location.end,
    bodyLine: bodyLocation.line,
    bodyColumn: bodyLocation.column,
    bodyEndLine: bodyLocation.endLine,
    bodyEndColumn: bodyLocation.endColumn,
    complexity: functionComplexity(node.body),
  });
  return [...owner, `${label}#${ordinal}`];
}

function visit(
  node: AstNode,
  parent: AstNode | null,
  field: string,
  index: number,
  owner: string[],
  file: string,
  occurrences: Map<string, number>,
  rows: FunctionRow[],
): void {
  let childOwner = classOwner(node, owner);
  childOwner = functionOwner(node, parent, field, index, childOwner, file, occurrences, rows);
  const binding = node.type === 'VariableDeclarator' ? nameOf(node.id) : null;
  if (binding) childOwner = [...childOwner, `binding:${binding}`];
  for (const [key, child, childIndex] of children(node)) {
    visit(child, node, key, childIndex, childOwner, file, occurrences, rows);
  }
}

export function functionInventory(source: string, file: string, parsedAst?: unknown): FunctionRow[] {
  const ast: unknown = parsedAst ?? parse(source, { sourceType: 'module', plugins: ['typescript'] });
  if (!isNode(ast)) throw new Error(`Parser did not return a module: ${file}`);
  const rows: FunctionRow[] = [];
  const occurrences = new Map<string, number>();
  visit(ast, null, 'root', 0, [], file, occurrences, rows);
  const identities = rows.map((row) => row.identity);
  if (new Set(identities).size !== identities.length) throw new Error(`AST function identities collide in ${file}.`);
  return rows;
}
