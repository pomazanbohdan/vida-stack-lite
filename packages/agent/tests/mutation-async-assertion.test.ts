import { expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { confirmedRunnerOutcome, junitOutcome, parseMutationBodyEvents } from '../tooling/mutation-evidence.js';
import { expectRejection } from './helpers/expect-rejection.ts';

const preloadPath = fileURLToPath(new URL('../tooling/mutation-test-preload.ts', import.meta.url));

async function runAdapterChild(root: string, body: string, suffix: string) {
  const sourceFile = path.join(root, 'tests', `child-${suffix}.test.ts`);
  const receiptFile = path.join(root, `body-${suffix}.jsonl`);
  const junitFile = path.join(root, `junit-${suffix}.xml`);
  await mkdir(path.dirname(sourceFile), { recursive: true });
  await writeFile(sourceFile, body);
  await writeFile(receiptFile, '');
  const child = Bun.spawn(
    [
      process.execPath,
      '--no-env-file',
      '--no-install',
      'test',
      '--preload',
      preloadPath,
      sourceFile,
      '--timeout=10000',
      '--reporter=junit',
      `--reporter-outfile=${junitFile}`,
    ],
    {
      cwd: root,
      timeout: 2000,
      env: {
        ...process.env,
        AGENT_MUTATION_BODY_RECEIPTS: receiptFile,
        AGENT_MUTATION_ADAPTER_DIRECTORY: path.join(root, `adapters-${suffix}`),
      },
      stdout: 'pipe',
      stderr: 'pipe',
    },
  );
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  expect({ stdout, stderr, exitCode }).toMatchObject({ exitCode: 1 });
  return {
    exitCode,
    stderr,
    junit: await readFile(junitFile, 'utf8').catch((error: unknown) => {
      throw new Error(`Adapter child did not produce JUnit: ${stderr}`, { cause: error });
    }),
    events: parseMutationBodyEvents(await readFile(receiptFile), [path.relative(root, sourceFile)]),
    selectedTest: path.relative(root, sourceFile),
  };
}

test('real adapter records async node assertion failures and keeps unrelated errors unproven', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'vida-mutation-async-assertion-'));
  try {
    const assertionRun = await runAdapterChild(
      root,
      `import assert from 'node:assert/strict';\nimport { test } from 'bun:test';\ntest('async assertion failure', async () => { await assert.rejects(Promise.resolve('unchanged')); });\ntest('passing assert rejects', async () => { await assert.rejects(Promise.reject(new Error('expected'))); });\n`,
      'assertion',
    );
    expect(assertionRun.exitCode).toBe(1);
    expect(assertionRun.events).toMatchObject([
      { kind: 'body', body_id: 1, assertion_cause: true, assertion_source: 'node-assert' },
    ]);
    expect(assertionRun.events).toHaveLength(1);
    const assertionOutcome = junitOutcome(assertionRun.junit, [assertionRun.selectedTest], [], assertionRun.events);
    expect(confirmedRunnerOutcome(assertionRun.exitCode, assertionOutcome.outcome)).toBe('killed');

    const matcherRun = await runAdapterChild(
      root,
      `import { test, expect } from 'bun:test';\ntest('async matcher failure', async () => { await expect(Promise.resolve(1)).resolves.toBe(2); });\n`,
      'matcher',
    );
    expect(matcherRun.events).toMatchObject([
      { kind: 'body', body_id: 1, assertion_cause: true, assertion_source: 'bun-expect' },
    ]);
    const matcherOutcome = junitOutcome(matcherRun.junit, [matcherRun.selectedTest], [], matcherRun.events);
    expect(confirmedRunnerOutcome(matcherRun.exitCode, matcherOutcome.outcome)).toBe('killed');

    const runtimeRun = await runAdapterChild(
      root,
      `import assert from 'node:assert/strict';\nimport { test } from 'bun:test';\ntest('passing assert rejects', async () => { await assert.rejects(Promise.reject(new Error('expected'))); });\ntest('unrelated runtime failure', async () => { throw new Error('runtime failure'); });\n`,
      'runtime',
    );
    expect(runtimeRun.exitCode).toBe(1);
    expect(runtimeRun.events).toMatchObject([
      { kind: 'body', body_id: 2, assertion_cause: false, assertion_source: null },
    ]);
    expect(runtimeRun.events).toHaveLength(1);
    expect(() => junitOutcome(runtimeRun.junit, [runtimeRun.selectedTest], [], runtimeRun.events)).toThrow(
      'JUnit failure is not proven to be a Bun assertion failure.',
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test.each(['sync', 'async'] as const)(
  'real adapter keeps a consumed %s assertion error unproven when later thrown by the body',
  async (mode) => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'vida-mutation-consumed-assertion-'));
    try {
      const assertion = `let saved: unknown; const failingAssertion = () => { try { assert.equal(1, 2); } catch (error) { saved = error; throw error; } };`;
      const consumed =
        mode === 'sync'
          ? `expect(failingAssertion).toThrow();`
          : `try { failingAssertion(); } catch {} await expect(Promise.reject(saved)).rejects.toThrow();`;
      const child = await runAdapterChild(
        root,
        `import assert from 'node:assert/strict';\nimport { test, expect } from 'bun:test';\ntest('consumed assertion then body error', async () => { ${assertion} ${consumed} throw saved; });\n`,
        mode,
      );
      const classified = junitOutcome(child.junit, [child.selectedTest], [], child.events).outcome;
      expect(classified).toBe('unproven');
      expect(confirmedRunnerOutcome(child.exitCode, classified)).toBe('unknown');
      expect(child.events).toMatchObject([
        { kind: 'body', body_id: 1, assertion_cause: false, assertion_source: null },
      ]);
      expect(child.events).toHaveLength(1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
);

test.each(['sync', 'async'] as const)(
  'real adapter clears a consumed node assert %s callback failure before a later body throw',
  async (mode) => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'vida-mutation-consumed-node-assert-'));
    try {
      const failing =
        mode === 'sync'
          ? `const fail = () => { try { assert.equal(1, 2); } catch (error) { saved = error; throw error; } }; assert.throws(fail);`
          : `const fail = async () => { try { assert.equal(1, 2); } catch (error) { saved = error; throw error; } }; await assert.rejects(fail);`;
      const child = await runAdapterChild(
        root,
        `import assert from 'node:assert/strict';\nimport { test } from 'bun:test';\ntest('consumed node assertion then body error', async () => { let saved: unknown; ${failing} throw saved; });\n`,
        `node-${mode}`,
      );
      const classified = junitOutcome(child.junit, [child.selectedTest], [], child.events).outcome;
      expect(classified).toBe('unproven');
      expect(confirmedRunnerOutcome(child.exitCode, classified)).toBe('unknown');
      expect(child.events).toMatchObject([{ kind: 'body', assertion_cause: false, assertion_source: null }]);
      expect(child.events).toHaveLength(1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
);

test('real adapter binds each expanded table row to its own body ID', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'vida-mutation-each-rows-'));
  try {
    const child = await runAdapterChild(
      root,
      `import assert from 'node:assert/strict';\nimport { test } from 'bun:test';\ntest.each([[1], [2]])('row %i', value => { assert.equal(value, 0); });\n`,
      'each-rows',
    );
    expect(child.events).toMatchObject([
      { kind: 'body', body_id: 1, assertion_cause: true, assertion_source: 'node-assert' },
      { kind: 'body', body_id: 2, assertion_cause: true, assertion_source: 'node-assert' },
    ]);
    expect(junitOutcome(child.junit, [child.selectedTest], [], child.events).outcome).toBe('killed');

    const objectRows = await runAdapterChild(
      root,
      `import assert from 'node:assert/strict';\nimport { test } from 'bun:test';\ntest.each([{ value: 1 }, { value: 2 }])('object row $value', ({ value }) => { assert.equal(value, 0); });\n`,
      'each-object-rows',
    );
    expect(objectRows.events).toMatchObject([
      { kind: 'body', body_id: 1, assertion_cause: true, assertion_source: 'node-assert' },
      { kind: 'body', body_id: 2, assertion_cause: true, assertion_source: 'node-assert' },
    ]);
    expect(junitOutcome(objectRows.junit, [objectRows.selectedTest], [], objectRows.events).outcome).toBe('killed');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('real adapter assigns a fresh body ID to every row when one each registrar is reused', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'vida-mutation-each-reused-registrar-'));
  try {
    const child = await runAdapterChild(
      root,
      `import assert from 'node:assert/strict';\nimport { test } from 'bun:test';\nconst tupleRows = [[1, { row: 'tuple-1' }], [2, { row: 'tuple-2' }]] as const;\nconst tupleCases = test.each(tupleRows);\ntupleCases('tuple first %i', function (value, row) { if (arguments.length !== 2 || row !== tupleRows[value - 1]?.[1]) throw new Error('tuple callback arguments or object identity changed'); assert.equal(value, 0); });\ntupleCases('tuple second %i', function (value, row) { if (arguments.length !== 2 || row !== tupleRows[value - 1]?.[1]) throw new Error('tuple callback arguments or object identity changed'); assert.equal(value, 0); });\nconst objectRows = [{ value: 3 }, { value: 4 }];\nconst objectCases = test.each(objectRows);\nobjectCases('object first $value', function (row) { if (arguments.length !== 1 || (row !== objectRows[0] && row !== objectRows[1])) throw new Error('object callback arguments or identity changed'); assert.equal(row.value, 0); });\nobjectCases('object second $value', function (row) { if (arguments.length !== 1 || (row !== objectRows[0] && row !== objectRows[1])) throw new Error('object callback arguments or identity changed'); assert.equal(row.value, 0); });\n`,
      'each-reused-registrar',
    );
    const bodyEvents = child.events.filter(
      (event): event is Extract<(typeof child.events)[number], { kind: 'body' }> => event.kind === 'body',
    );
    expect(bodyEvents.map((event) => event.body_id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(bodyEvents).toMatchObject(
      Array.from({ length: 8 }, (_, index) => ({
        kind: 'body',
        body_id: index + 1,
        test_file: child.selectedTest,
        assertion_cause: true,
        assertion_source: 'node-assert',
      })),
    );
    expect(bodyEvents).toHaveLength(8);
    for (const [id, testcase] of [
      [1, 'tuple first 1'],
      [2, 'tuple first 2'],
      [3, 'tuple second 1'],
      [4, 'tuple second 2'],
      [5, 'object first 3'],
      [6, 'object first 4'],
      [7, 'object second 3'],
      [8, 'object second 4'],
    ] as const) {
      expect(child.junit).toContain(`name="[mutation-body:${id}] ${testcase}"`);
    }
    expect(junitOutcome(child.junit, [child.selectedTest], [], child.events).outcome).toBe('killed');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('real adapter rejects repeated body IDs from retried executions', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'vida-mutation-retry-rows-'));
  try {
    await expectRejection(
      runAdapterChild(
        root,
        `import assert from 'node:assert/strict';\nimport { test } from 'bun:test';\ntest('retry assertion failure', () => { assert.equal(1, 2); }, { retry: 1 });\n`,
        'retry-rows',
      ),
      /repeats a body ID/u,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('real adapter preserves direct node assertion evidence when no consumer catches it', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'vida-mutation-node-assert-positive-'));
  try {
    const child = await runAdapterChild(
      root,
      `import assert from 'node:assert/strict';\nimport { test } from 'bun:test';\ntest('direct node assertion failure', () => { assert.equal(1, 2); });\n`,
      'node-positive',
    );
    expect(child.events).toMatchObject([{ kind: 'body', assertion_cause: true, assertion_source: 'node-assert' }]);
    expect(junitOutcome(child.junit, [child.selectedTest], [], child.events).outcome).toBe('killed');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test.each(['sync', 'async'] as const)('real adapter confirms an escaping %s callback matcher failure', async (mode) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'vida-mutation-escaping-matcher-'));
  try {
    const assertion =
      mode === 'sync'
        ? `expect(() => assert.equal(1, 2)).toThrow('different expected error');`
        : `await expect(Promise.reject(new Error('actual error'))).rejects.toThrow('different expected error');`;
    const child = await runAdapterChild(
      root,
      `import assert from 'node:assert/strict';\nimport { test, expect } from 'bun:test';\ntest('escaping callback matcher', async () => { ${assertion} });\n`,
      mode,
    );
    expect(child.events).toMatchObject([
      { kind: 'body', body_id: 1, assertion_cause: true, assertion_source: 'bun-expect' },
    ]);
    expect(child.events).toHaveLength(1);
    const outcome = junitOutcome(child.junit, [child.selectedTest], [], child.events);
    expect(confirmedRunnerOutcome(child.exitCode, outcome.outcome)).toBe('killed');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('real adapter denies a mutation kill when fast-check wraps the matcher failure', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'vida-mutation-property-wrapper-'));
  try {
    const fastCheck = import.meta.resolve('fast-check');
    const wrapped = await runAdapterChild(
      root,
      `import { test, expect } from 'bun:test';\nimport fc from ${JSON.stringify(fastCheck)};\ntest('wrapped property assertion', () => { fc.assert(fc.property(fc.constant(1), value => { expect(value).toBe(2); }), { numRuns: 1, seed: 20261010, endOnFailure: true }); });\n`,
      'wrapped-property',
    );
    expect(wrapped.events).toMatchObject([
      { kind: 'body', body_id: 1, assertion_cause: false, assertion_source: 'bun-expect' },
    ]);
    expect(wrapped.events).toHaveLength(1);
    expect(() => junitOutcome(wrapped.junit, [wrapped.selectedTest], [], wrapped.events)).toThrow(
      'JUnit failure is not proven to be a Bun assertion failure.',
    );

    const direct = await runAdapterChild(
      root,
      `import { test, expect } from 'bun:test';\ntest('direct property assertion', () => { expect(1).toBe(2); });\n`,
      'direct-property',
    );
    expect(direct.events).toMatchObject([
      { kind: 'body', body_id: 1, assertion_cause: true, assertion_source: 'bun-expect' },
    ]);
    expect(direct.events).toHaveLength(1);
    const directOutcome = junitOutcome(direct.junit, [direct.selectedTest], [], direct.events);
    expect(confirmedRunnerOutcome(direct.exitCode, directOutcome.outcome)).toBe('killed');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('real adapter confirms the original property matcher error without a wrapper assertion', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'vida-mutation-original-property-[owned].'));
  try {
    const fastCheck = import.meta.resolve('fast-check');
    const propertyHelper = fileURLToPath(new URL('./helpers/assert-property.ts', import.meta.url));
    const propertyBody = (parameters: { seed: number; numRuns: number; path?: string }): string =>
      `import { test, expect } from 'bun:test';\nimport fc from ${JSON.stringify(fastCheck)};\nimport { assertProperty } from ${JSON.stringify(propertyHelper)};\ntest('original property assertion', () => { assertProperty(fc.property(fc.integer({ min: 1, max: 8 }), value => { process.stderr.write('VIDA_PROPERTY_SAMPLE:' + value + '\\n'); expect(value).toBe(0); }), ${JSON.stringify(parameters)}); });\n`;
    const original = await runAdapterChild(root, propertyBody({ numRuns: 8, seed: 20261010 }), 'original-property');
    expect(original.events).toMatchObject([
      { kind: 'body', body_id: 1, assertion_cause: true, assertion_source: 'bun-expect' },
    ]);
    expect(original.events).toHaveLength(1);
    const originalOutcome = junitOutcome(original.junit, [original.selectedTest], [], original.events);
    expect(confirmedRunnerOutcome(original.exitCode, originalOutcome.outcome)).toBe('killed');
    const diagnostic = original.stderr.split('\n').find((line) => line.startsWith('VIDA property replay: '));
    if (diagnostic === undefined) throw new Error('Original property failure has no replay diagnostic');
    const replay: unknown = JSON.parse(diagnostic.slice('VIDA property replay: '.length));
    if (
      !replay ||
      typeof replay !== 'object' ||
      !('seed' in replay) ||
      typeof replay.seed !== 'number' ||
      !('path' in replay) ||
      typeof replay.path !== 'string'
    )
      throw new Error('Original property failure has no bound seed and shrink path');
    expect(replay.seed).toBe(20261010);
    expect(replay.path).toMatch(/^\d+(?::\d+)*$/u);
    const samples = original.stderr.split('\n').filter((line) => line.startsWith('VIDA_PROPERTY_SAMPLE:'));
    expect(samples.at(-1)).toBe('VIDA_PROPERTY_SAMPLE:1');
    const replayed = await runAdapterChild(
      root,
      propertyBody({ numRuns: 8, seed: replay.seed, path: replay.path }),
      'replayed-property',
    );
    expect(replayed.stderr.split('\n').filter((line) => line.startsWith('VIDA_PROPERTY_SAMPLE:'))).toEqual([
      'VIDA_PROPERTY_SAMPLE:1',
    ]);
    expect(replayed.events).toMatchObject([
      { kind: 'body', body_id: 1, assertion_cause: true, assertion_source: 'bun-expect' },
    ]);
    expect(replayed.events).toHaveLength(1);
    const replayedOutcome = junitOutcome(replayed.junit, [replayed.selectedTest], [], replayed.events);
    expect(confirmedRunnerOutcome(replayed.exitCode, replayedOutcome.outcome)).toBe('killed');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test.each(['false', 'runtime', 'skipped', 'interrupted'] as const)(
  'real adapter denies property %s outcomes without an escaping matcher',
  async (mode) => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'vida-mutation-property-control-'));
    try {
      const fastCheck = import.meta.resolve('fast-check');
      const propertyHelper = fileURLToPath(new URL('./helpers/assert-property.ts', import.meta.url));
      const predicate =
        mode === 'false'
          ? 'expect(value).toBe(1); return false;'
          : mode === 'runtime'
            ? "expect(value).toBe(1); throw new Error('property runtime failure');"
            : mode === 'skipped'
              ? 'fc.pre(false);'
              : "throw new Error('interrupted predicate must not execute');";
      const bounds =
        mode === 'skipped' ? ', maxSkipsPerRun: 0' : mode === 'interrupted' ? ', interruptAfterTimeLimit: 0' : '';
      const control = await runAdapterChild(
        root,
        `import { test, expect } from 'bun:test';\nimport fc from ${JSON.stringify(fastCheck)};\nimport { assertProperty } from ${JSON.stringify(propertyHelper)};\ntest('unconfirmed property ${mode}', () => { assertProperty(fc.property(fc.constant(1), value => { ${predicate} }), { numRuns: 1, seed: 20261010 ${bounds} }); });\n`,
        mode,
      );
      expect(control.events).toMatchObject([
        { kind: 'body', body_id: 1, assertion_cause: false, assertion_source: null },
      ]);
      expect(control.events).toHaveLength(1);
      if (mode === 'interrupted') {
        expect(control.stderr).toContain('"interrupted":true');
        expect(control.stderr).toContain('"runs":0');
      }
      if (mode === 'skipped') {
        expect(control.stderr).toContain('Property check did not complete:');
        expect(control.stderr).toContain('"skips":1');
      }
      expect(() => junitOutcome(control.junit, [control.selectedTest], [], control.events)).toThrow(
        'JUnit failure is not proven to be a Bun assertion failure.',
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
);

test('real adapter confirms failure when the shared rejection helper receives fulfillment', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'vida-mutation-rejection-helper-'));
  try {
    const helperPath = fileURLToPath(new URL('./helpers/expect-rejection.ts', import.meta.url));
    const copiedHelperPath = path.join(root, 'tests', 'helpers', 'expect-rejection.ts');
    await mkdir(path.dirname(copiedHelperPath), { recursive: true });
    const helperBytes = await readFile(helperPath);
    await writeFile(copiedHelperPath, helperBytes);
    expect(await readFile(copiedHelperPath)).toEqual(helperBytes);
    const child = await runAdapterChild(
      root,
      `import { test } from 'bun:test';\nimport { expectRejection } from ${JSON.stringify(copiedHelperPath)};\ntest('fulfilled operation fails the helper assertion', async () => { await expectRejection(Promise.resolve('unexpected fulfillment')); });\n`,
      'helper',
    );
    expect(child.events).toMatchObject([
      { kind: 'body', body_id: 1, assertion_cause: true, assertion_source: 'bun-expect' },
    ]);
    const outcome = junitOutcome(child.junit, [child.selectedTest], [], child.events);
    expect(confirmedRunnerOutcome(child.exitCode, outcome.outcome)).toBe('killed');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('real adapter keeps a consumed helper assertion unproven across module boundaries', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'vida-mutation-helper-consumed-'));
  try {
    const helperPath = path.join(root, 'tests', 'helpers', 'consumed.ts');
    await mkdir(path.dirname(helperPath), { recursive: true });
    await writeFile(
      helperPath,
      `import { expect } from 'bun:test';\nexport function consumedFailure() { let saved: unknown; expect(() => { try { expect(1).toBe(2); } catch (error) { saved = error; throw error; } }).toThrow(); return saved; }\n`,
    );
    const child = await runAdapterChild(
      root,
      `import { test } from 'bun:test';\nimport { consumedFailure } from ${JSON.stringify(helperPath)};\ntest('consumed helper failure', async () => { await Promise.resolve(); throw consumedFailure(); });\n`,
      'helper-consumed',
    );
    expect(child.events).toMatchObject([{ kind: 'body', body_id: 1, assertion_cause: false, assertion_source: null }]);
    expect(child.events).toHaveLength(1);
    const classified = junitOutcome(child.junit, [child.selectedTest], [], child.events).outcome;
    expect(classified).toBe('unproven');
    expect(confirmedRunnerOutcome(child.exitCode, classified)).toBe('unknown');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('real adapter isolates overlapping helper assertion and runtime failures', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'vida-mutation-helper-overlap-'));
  try {
    const helperPath = path.join(root, 'tests', 'helpers', 'expect-rejection.ts');
    await mkdir(path.dirname(helperPath), { recursive: true });
    await writeFile(
      helperPath,
      await readFile(fileURLToPath(new URL('./helpers/expect-rejection.ts', import.meta.url))),
    );
    const child = await runAdapterChild(
      root,
      `import { test } from 'bun:test';\nimport { expectRejection } from ${JSON.stringify(helperPath)};\nlet arrived = 0; let release: () => void; const joined = new Promise<void>(resolve => { release = resolve; }); function rendezvous() { if (++arrived === 2) release(); return joined; }\ntest.concurrent('helper assertion', async () => { await rendezvous(); await expectRejection(Promise.resolve('fulfilled')); });\ntest.concurrent('runtime failure', async () => { await rendezvous(); throw new Error('unrelated runtime failure'); });\n`,
      'helper-overlap',
    );
    expect(child.events).toHaveLength(2);
    expect(child.events.find((event) => event.kind === 'body' && event.body_id === 1)).toMatchObject({
      kind: 'body',
      body_id: 1,
      test_file: child.selectedTest,
      assertion_cause: true,
      assertion_source: 'bun-expect',
    });
    expect(child.events.find((event) => event.kind === 'body' && event.body_id === 2)).toMatchObject({
      kind: 'body',
      body_id: 2,
      test_file: child.selectedTest,
      assertion_cause: false,
      assertion_source: null,
    });
    expect(() => junitOutcome(child.junit, [child.selectedTest], [], child.events)).toThrow(
      'JUnit failure is not proven to be a Bun assertion failure.',
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
