import assert from 'node:assert/strict';
import { test } from 'bun:test';
import { functionInventory } from '../tooling/function-inventory.ts';

test('function inventory preserves stable identities, source coordinates, and decision complexity', () => {
  const source = [
    'function outer(value: boolean) {',
    '  const inner = () => value && (value ? 1 : 0);',
    '  return inner();',
    '}',
  ].join('\n');
  const rows = functionInventory(source, 'src/subject.ts');
  assert.deepEqual(
    rows.map(({ identity, name }) => ({ identity, name })),
    [
      { identity: 'src/subject.ts#fn:outer#0', name: 'fn:outer' },
      { identity: 'src/subject.ts#fn:outer#0/binding:inner/binding:inner#0', name: 'binding:inner' },
    ],
  );
  assert.deepEqual(
    rows.map(({ line, column, bodyLine, bodyColumn, bodyEndLine, bodyEndColumn, complexity }) => ({
      line,
      column,
      bodyLine,
      bodyColumn,
      bodyEndLine,
      bodyEndColumn,
      complexity,
    })),
    [
      { line: 1, column: 0, bodyLine: 1, bodyColumn: 31, bodyEndLine: 4, bodyEndColumn: 1, complexity: 1 },
      { line: 2, column: 16, bodyLine: 2, bodyColumn: 22, bodyEndLine: 2, bodyEndColumn: 46, complexity: 3 },
    ],
  );
});

test('function inventory names bindings, methods, private methods, and anonymous closures distinctly', () => {
  const rows = functionInventory(
    'const item = { run() { return 1; } }; class Box { #secret() { return 2; } expose() { return this.#secret(); } } const fn = () => 3;',
    'src/names.ts',
  );
  assert.deepEqual(
    rows.map((row) => row.name),
    ['method:run', 'method:#secret', 'method:expose', 'binding:fn'],
  );
  assert.ok(rows[1]?.identity.includes('method:#secret'));
});

test('ClassPrivateMethod remains explicitly inventoried with its private identity', () => {
  const rows = functionInventory('class Box { #secret() { return 2; } }', 'src/private.ts');
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.name, 'method:#secret');
  assert.equal(rows[0]?.complexity, 1);
});

test('function inventory rejects parsed ASTs without function or body locations', () => {
  const noFunctionLocation = {
    type: 'File',
    program: {
      type: 'Program',
      body: [
        {
          type: 'FunctionDeclaration',
          id: { type: 'Identifier', name: 'broken' },
          body: { type: 'BlockStatement', body: [] },
        },
      ],
    },
  };
  assert.throws(() => functionInventory('', 'src/broken.ts', noFunctionLocation), /AST function location is missing/u);
  const noBodyLocation = {
    type: 'File',
    program: {
      type: 'Program',
      body: [
        {
          type: 'FunctionDeclaration',
          id: { type: 'Identifier', name: 'broken' },
          start: 0,
          end: 10,
          loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
          body: { type: 'BlockStatement', body: [] },
        },
      ],
    },
  };
  assert.throws(() => functionInventory('', 'src/broken.ts', noBodyLocation), /AST function location is missing/u);
});

test('function inventory falls back for null parsed ASTs and rejects values without a string node type', () => {
  assert.deepEqual(functionInventory('', 'src/empty.ts', null), []);
  assert.throws(() => functionInventory('', 'src/invalid.ts', { type: 1 }), /Parser did not return a module/u);
});
