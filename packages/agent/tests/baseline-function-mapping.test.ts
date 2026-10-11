import assert from 'node:assert/strict';
import { test } from 'bun:test';
import path from 'node:path';
import { functionInventory } from '../tooling/function-inventory.ts';
import { instrumentSource } from '../tooling/bun-coverage-evidence.mjs';
import { baselineFunctionEvidenceForSource, type BaselineCoverageFunction } from '../tooling/coverage-math.ts';

const outer: BaselineCoverageFunction = {
  identity: 'src/nested.ts#outer',
  file: 'src/nested.ts',
  line: 1,
  column: 2,
  bodyLine: 1,
  bodyColumn: 16,
  bodyEndLine: 1,
  bodyEndColumn: 29,
  complexity: 2,
};
const nested: BaselineCoverageFunction = {
  identity: 'src/nested.ts#inner',
  file: 'src/nested.ts',
  line: 1,
  column: 1,
  bodyLine: 1,
  bodyColumn: 20,
  bodyEndLine: 1,
  bodyEndColumn: 24,
  complexity: 3,
};
const unrelated: BaselineCoverageFunction = {
  identity: 'src/nested.ts#later',
  file: 'src/nested.ts',
  line: 4,
  column: 0,
  bodyLine: 4,
  bodyColumn: 14,
  bodyEndLine: 4,
  bodyEndColumn: 22,
  complexity: 1,
};

test('actual Babel inventory and Istanbul instrumentation map named, arrow, and nested functions one to one', () => {
  const source = [
    'function named() { return 1; }',
    'const arrow = (value: boolean) => value ? 1 : 0;',
    'function host() { const inner = () => arrow(named() > 0); return inner(); }',
    '',
  ].join('\n');
  const inventory = functionInventory(source, 'src/fixture.ts');
  const instrumented = instrumentSource(path.resolve('/tmp/vida-agent-babel-mapping-fixture.ts'), source);
  const evidence = baselineFunctionEvidenceForSource('src/fixture.ts', inventory, instrumented.fileCoverage);
  assert.equal(inventory.length, 4);
  assert.equal(Object.keys(instrumented.fileCoverage.fnMap).length, inventory.length);
  assert.deepEqual(
    evidence.map((row) => row.identity),
    inventory.map((row) => row.identity),
  );
  assert.ok(evidence.every((row) => row.coverage === 0));
});

test('one indexed pass maps nested same-line declarations and unrelated inventory rows', () => {
  const coverage = {
    fnMap: {
      1: {
        name: '(anonymous_0)',
        decl: { start: { line: 1, column: 20 } },
        loc: { start: { line: 1, column: 20 }, end: { line: 1, column: 24 } },
      },
      0: {
        name: 'outer',
        decl: { start: { line: 1, column: 2 } },
        loc: { start: { line: 1, column: 16 }, end: { line: 1, column: 29 } },
      },
      9: {
        name: 'later',
        decl: { start: { line: 4, column: 0 } },
        loc: { start: { line: 4, column: 14 }, end: { line: 4, column: 22 } },
      },
    },
    f: { 0: 0, 1: 4, 9: 1 },
  };
  assert.deepEqual(baselineFunctionEvidenceForSource('src/nested.ts', [outer, nested, unrelated], coverage), [
    { identity: outer.identity, complexity: 2, coverage: 0, crap: 6 },
    { identity: nested.identity, complexity: 3, coverage: 1, crap: 3 },
    { identity: unrelated.identity, complexity: 1, coverage: 1, crap: 1 },
  ]);
});

test('baseline mapping rejects body geometry mismatch and string-coordinate collision', () => {
  const coverage = {
    fnMap: {
      0: {
        decl: { start: { line: 1, column: 3 } },
        loc: { start: { line: 1, column: 3 }, end: { line: 1, column: 4 } },
      },
    },
    f: { 0: 1 },
  };
  assert.throws(
    () => baselineFunctionEvidenceForSource('src/nested.ts', [outer], coverage),
    /Published baseline function mapping is ambiguous: src\/nested\.ts#outer/u,
  );
  const stringCoordinate = {
    fnMap: {
      0: {
        decl: { start: { line: 1, column: 2 } },
        loc: { start: { line: '1', column: '16' }, end: { line: 1, column: 29 } },
      },
    },
    f: { 0: 1 },
  };
  assert.throws(
    () => baselineFunctionEvidenceForSource('src/nested.ts', [outer], stringCoordinate),
    /Published baseline function mapping is ambiguous: src\/nested\.ts#outer/u,
  );
});

test('baseline source inventory must match the function map cardinality exactly', () => {
  const missingFunction = { fnMap: {}, f: {} };
  assert.throws(
    () => baselineFunctionEvidenceForSource('src/nested.ts', [outer], missingFunction),
    /Published baseline function inventory is incomplete: src\/nested\.ts/u,
  );
  const unexpectedFunction = {
    fnMap: {
      0: {
        decl: { start: { line: 1, column: 2 } },
        loc: { start: { line: 1, column: 16 }, end: { line: 1, column: 29 } },
      },
      1: {
        decl: { start: { line: 2, column: 0 } },
        loc: { start: { line: 2, column: 0 }, end: { line: 2, column: 1 } },
      },
    },
    f: { 0: 1, 1: 1 },
  };
  assert.throws(
    () => baselineFunctionEvidenceForSource('src/nested.ts', [outer], unexpectedFunction),
    /Published baseline function inventory is incomplete: src\/nested\.ts/u,
  );
});

test('baseline mapping rejects missing files, maps, and ambiguous declarations', () => {
  assert.throws(
    () => baselineFunctionEvidenceForSource('src/nested.ts', [outer], undefined),
    /Published baseline function coverage is missing: src\/nested\.ts/u,
  );
  assert.throws(
    () => baselineFunctionEvidenceForSource('src/nested.ts', [outer], { f: {} }),
    /Published baseline function coverage is missing: src\/nested\.ts/u,
  );
  assert.throws(
    () =>
      baselineFunctionEvidenceForSource('src/nested.ts', [outer], {
        fnMap: {
          0: {
            decl: { start: { line: 2, column: 0 } },
            loc: { start: { line: 2, column: 0 }, end: { line: 2, column: 1 } },
          },
        },
        f: { 0: 1 },
      }),
    /Published baseline function mapping is ambiguous: src\/nested\.ts#outer/u,
  );
  const ambiguous = {
    fnMap: {
      0: {
        decl: { start: { line: 1, column: 2 } },
        loc: { start: { line: 1, column: 16 }, end: { line: 1, column: 29 } },
      },
      1: {
        decl: { start: { line: 1, column: 2 } },
        loc: { start: { line: 1, column: 16 }, end: { line: 1, column: 29 } },
      },
    },
    f: { 0: 1, 1: 1 },
  };
  assert.throws(
    () => baselineFunctionEvidenceForSource('src/nested.ts', [outer, nested], ambiguous),
    /Published baseline function mapping is ambiguous: src\/nested\.ts#outer/u,
  );
  const duplicateInventory = [outer, { ...outer, identity: 'src/nested.ts#duplicate' }];
  assert.throws(
    () =>
      baselineFunctionEvidenceForSource('src/nested.ts', duplicateInventory, {
        fnMap: {
          0: {
            decl: { start: { line: 1, column: 2 } },
            loc: { start: { line: 1, column: 16 }, end: { line: 1, column: 29 } },
          },
        },
        f: { 0: 1 },
      }),
    /Published baseline function inventory is incomplete: src\/nested\.ts/u,
  );
});

test('baseline counters must exist as finite nonnegative safe integers', () => {
  const invalidCounters: unknown[] = ['1', 0.5, -1, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1, undefined];
  for (const counter of invalidCounters) {
    assert.throws(
      () =>
        baselineFunctionEvidenceForSource('src/nested.ts', [outer], {
          fnMap: {
            0: {
              decl: { start: { line: 1, column: 2 } },
              loc: { start: { line: 1, column: 16 }, end: { line: 1, column: 29 } },
            },
          },
          f: { 0: counter },
        }),
      /Published baseline function counter is invalid: src\/nested\.ts#outer/u,
    );
  }
  assert.throws(
    () =>
      baselineFunctionEvidenceForSource('src/nested.ts', [outer], {
        fnMap: {
          0: {
            decl: { start: { line: 1, column: 2 } },
            loc: { start: { line: 1, column: 16 }, end: { line: 1, column: 29 } },
          },
        },
        f: {},
      }),
    /Published baseline function counter is invalid: src\/nested\.ts#outer/u,
  );
  assert.throws(
    () =>
      baselineFunctionEvidenceForSource('src/nested.ts', [outer], {
        fnMap: {
          0: {
            decl: { start: { line: 1, column: 2 } },
            loc: { start: { line: 1, column: 16 }, end: { line: 1, column: 29 } },
          },
        },
      }),
    /Published baseline function coverage is missing: src\/nested\.ts/u,
  );
});

test('statement entry coverage cannot replace a missing own-function counter', () => {
  const coverage = {
    fnMap: {
      0: {
        decl: { start: { line: 1, column: 2 } },
        loc: { start: { line: 1, column: 16 }, end: { line: 1, column: 29 } },
      },
    },
    f: {},
    // An entry statement can be covered even when the function counter is absent.
    statementMap: { 0: { start: { line: 1, column: 16 } } },
    s: { 0: 1 },
  };
  assert.throws(
    () => baselineFunctionEvidenceForSource('src/nested.ts', [outer], coverage),
    /Published baseline function counter is invalid: src\/nested\.ts#outer/u,
  );
});

test('actual object and class methods retain exact body geometry and inventory identities', () => {
  const file = 'src/methods.ts';
  const source = 'const object = { method() { return 1; } }; class C { method() { return object.method(); } }';
  const rows = functionInventory(source, file);
  const coverage = instrumentSource(path.resolve('/tmp/vida-methods-fixture.ts'), source).fileCoverage;
  const evidence = baselineFunctionEvidenceForSource(file, rows, coverage);
  assert.equal(rows.length, 2);
  assert.deepEqual(
    evidence.map((row) => row.identity),
    rows.map((row) => row.identity),
  );
});

test('private methods map one to one and still fail closed on missing instrumentation', () => {
  const file = 'src/private.ts';
  const source = 'class C { #hidden() { return 1; } method() { return this.#hidden(); } }';
  const rows = functionInventory(source, file);
  const coverage = instrumentSource(path.resolve('/tmp/vida-private-fixture.ts'), source).fileCoverage;
  assert.equal(rows.length, 2);
  assert.equal(Object.keys(coverage.fnMap).length, 2);
  assert.equal(baselineFunctionEvidenceForSource(file, rows, coverage).length, rows.length);
  const first = Object.keys(coverage.fnMap)[0];
  assert.ok(first);
  delete coverage.fnMap[first];
  assert.throws(() => baselineFunctionEvidenceForSource(file, rows, coverage), /inventory is incomplete/u);
});

test('prototype-provided function counters cannot establish baseline evidence', () => {
  const inherited: Record<string, unknown> = {};
  Object.setPrototypeOf(inherited, { 0: 1 });
  assert.throws(
    () =>
      baselineFunctionEvidenceForSource('src/nested.ts', [outer], {
        fnMap: { 0: { loc: { start: { line: 1, column: 16 }, end: { line: 1, column: 29 } } } },
        f: inherited,
      }),
    /function counter is invalid/u,
  );
});
