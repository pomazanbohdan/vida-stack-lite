import assert from 'node:assert/strict';
import { test } from 'bun:test';
import path from 'node:path';
import os from 'node:os';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { instrumentSource } from '../tooling/bun-coverage-evidence.ts';
import { functionInventory } from '../tooling/function-inventory.ts';
import { baselineFunctionEvidenceForSource } from '../tooling/coverage-math.ts';

test('instrumentation exposes original function identities before counter insertion', () => {
  const source = 'class Box { #hidden() { return [1].map(value => value + 1); } run() { return this.#hidden(); } }';
  const expected = functionInventory(source, 'src/observed.ts');
  let observed: typeof expected | undefined;
  const result = instrumentSource('/tmp/vida-observed.ts', source, (ast) => {
    observed = functionInventory(source, 'src/observed.ts', ast);
  });
  assert.deepEqual(observed, expected);
  assert.equal(Object.keys(result.fileCoverage.fnMap).length, expected.length);
});

test('instrumentation rejects invalid syntax and previously instrumented Source without weakening subsequent maps', () => {
  const file = path.resolve('/tmp/vida-private-method-invalid.ts');
  assert.throws(() => instrumentSource(file, 'class C { #hidden( { }'));
  assert.throws(() => instrumentSource(file, 'return 1;'), /outside of function/u);
  const source = 'class C { #hidden() { return 1; } }';
  const result = instrumentSource(file, source);
  assert.throws(() => instrumentSource(file, result.code), /did not produce a fresh coverage map/u);
  assert.deepEqual(instrumentSource(file, source).fileCoverage, result.fileCoverage);
});

test('instrumentation preserves standard import attributes with the selected Babel parser', async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'vida-import-attributes-'));
  const file = path.join(root, 'attributes.ts');
  const source = 'import data from "./data.json" with { type: "json" }; export function read() { return data.value; }';
  const result = instrumentSource(file, source);
  const coverage = globalThis as unknown as Record<string, Record<string, typeof result.fileCoverage>>;
  try {
    writeFileSync(path.join(root, 'data.json'), '{"value":42}');
    writeFileSync(file, result.code);
    const loaded = (await import(pathToFileURL(file).href)) as { read(): number };
    assert.equal(loaded.read(), 42);
    const executed = coverage.__vidaAgentCoverage__?.[file];
    assert.ok(executed);
    assert.deepEqual(Object.values(executed.f), [1]);
    assert.equal(Object.keys(executed.fnMap).length, functionInventory(source, 'src/attributes.ts').length);
  } finally {
    if (coverage.__vidaAgentCoverage__) delete coverage.__vidaAgentCoverage__[file];
    rmSync(root, { recursive: true, force: true });
  }
});

test('private method instrumentation retains exact inventory and unexecuted function counters', async () => {
  const source = 'class Box { #called() { return 2; } #unused() { return 3; } run() { return this.#called(); } }';
  const root = mkdtempSync(path.join(os.tmpdir(), 'vida-private-method-'));
  const file = path.join(root, 'private.ts');
  const rows = functionInventory(source, 'src/private.ts');
  const result = instrumentSource(file, source);
  assert.equal(Object.keys(result.fileCoverage.fnMap).length, rows.length);
  const coverage = globalThis as unknown as Record<string, Record<string, typeof result.fileCoverage>>;
  try {
    writeFileSync(file, result.code + '; export const result = new Box().run();');
    const loaded = (await import(pathToFileURL(file).href)) as { result: number };
    assert.equal(loaded.result, 2);
    const executed = coverage.__vidaAgentCoverage__?.[file];
    assert.ok(executed);
    const evidence = baselineFunctionEvidenceForSource('src/private.ts', rows, executed);
    assert.deepEqual(
      evidence.map((row) => row.coverage),
      [1, 0, 1],
    );
    assert.deepEqual(
      evidence.map((row) => row.identity),
      rows.map((row) => row.identity),
    );
  } finally {
    if (coverage.__vidaAgentCoverage__) delete coverage.__vidaAgentCoverage__[file];
    rmSync(root, { recursive: true, force: true });
  }
});

test('instrumentation preserves private brands, accessors, static, super, async and generator behavior', async () => {
  const source = [
    'class Base { offset() { return 4; } }',
    'class Box extends Base {',
    '  #state = 0;',
    '  #change<T extends number>(value: T) { this.#state += value; return super.offset() + this.#state; }',
    '  get #value() { return this.#state; }',
    '  set #value(value: number) { this.#state = value; }',
    '  static #twice(value: number) { return value * 2; }',
    '  async #later() { return await Promise.resolve(this.#value); }',
    '  *#items() { yield this.#value; yield this.#change(1); }',
    '  run() { this.#value = 2; return this.#change(3); }',
    '  later() { return this.#later(); }',
    '  items() { return [...this.#items()]; }',
    '  static twice(value: number) { return this.#twice(value); }',
    '  static has(value: unknown) { return #state in (value as object); }',
    '}',
  ].join('\n');
  const root = mkdtempSync(path.join(os.tmpdir(), 'vida-private-semantics-'));
  const file = path.join(root, 'private.ts');
  const rows = functionInventory(source, 'src/private-semantics.ts');
  const result = instrumentSource(file, source);
  assert.equal(Object.keys(result.fileCoverage.fnMap).length, rows.length);
  const coverage = globalThis as unknown as Record<string, Record<string, typeof result.fileCoverage>>;
  try {
    writeFileSync(file, result.code + '; export const BoxType = Box;');
    const loaded = (await import(pathToFileURL(file).href)) as {
      BoxType: {
        new (): { run(): number; later(): Promise<number>; items(): number[] };
        twice(value: number): number;
        has(value: unknown): boolean;
        prototype: { run(): number };
      };
    };
    const Box = loaded.BoxType;
    const instance = new Box();
    assert.equal(instance.run(), 9);
    assert.equal(await instance.later(), 5);
    assert.deepEqual(instance.items(), [5, 10]);
    assert.equal(Box.twice(3), 6);
    assert.equal(Box.has(instance), true);
    assert.equal(Box.has({}), false);
    assert.throws(() => Box.prototype.run.call({}), TypeError);
    const executed = coverage.__vidaAgentCoverage__?.[file];
    assert.ok(executed);
    const evidence = baselineFunctionEvidenceForSource('src/private-semantics.ts', rows, executed);
    assert.equal(evidence.length, rows.length);
    assert.ok(evidence.every((row) => row.coverage === 1));
  } finally {
    if (coverage.__vidaAgentCoverage__) delete coverage.__vidaAgentCoverage__[file];
    rmSync(root, { recursive: true, force: true });
  }
});
