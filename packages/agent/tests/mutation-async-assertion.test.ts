import { expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  confirmedRunnerOutcome,
  junitOutcome,
  parseMutationBodyEvents,
  type MutationJUnitCase,
} from '../tooling/mutation-evidence.js';
import { requireSynchronousChildSuccess } from './helpers/synchronous-child-outcome.ts';
import { expectRejection } from './helpers/expect-rejection.ts';
import { isRecord } from '../src/contracts/forward-controller-values.ts';
import { validateMutationPerTestJoin } from '../tooling/mutation-per-test-evidence.ts';

const preloadPath = fileURLToPath(new URL('../tooling/mutation-test-preload.ts', import.meta.url));
const elapsedMatcher: unknown = expect.any(Number);

async function runAdapterChild(
  root: string,
  body: string,
  suffix: string,
  options: { capture?: boolean; exitCode?: 0 | 1; pattern?: string } = {},
) {
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
      ...(options.pattern ? ['--test-name-pattern', options.pattern] : []),
    ],
    {
      cwd: root,
      timeout: 2000,
      env: {
        ...process.env,
        AGENT_MUTATION_BODY_RECEIPTS: receiptFile,
        AGENT_MUTATION_ADAPTER_DIRECTORY: path.join(root, `adapters-${suffix}`),
        AGENT_MUTATION_PER_TEST_CAPTURE: options.capture ? '1' : undefined,
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
  expect({ stdout, stderr, exitCode }).toMatchObject({ exitCode: options.exitCode ?? 1 });
  const junit = await readFile(junitFile, 'utf8').catch((error: unknown) => {
    throw new Error(`Adapter child did not produce JUnit: ${stderr}`, { cause: error });
  });
  const bodyEventBytes = await readFile(receiptFile);
  return {
    exitCode,
    stderr,
    junit,
    events: parseMutationBodyEvents(bodyEventBytes, [path.relative(root, sourceFile)]),
    bodyEventBytes,
    selectedTest: path.relative(root, sourceFile),
  };
}

type PerTestCapture = {
  schema: string;
  coverage_observed: boolean;
  registrations: { test_file: string; body_id: number; expected_failure: boolean; describe_ids: number[] }[];
  invocations: {
    test_file: string;
    kind: 'body' | 'hook';
    id: number;
    hook?: string;
    outcome: string;
    elapsed_ms: number;
  }[];
  mutant_coverage: { static: Record<string, number>; perTest: Record<string, Record<string, number>> };
};

const perTestSubject = `
import { test, expect, beforeEach, afterAll } from 'bun:test';
const ns = globalThis.__stryker__;
function hit(id) {
  const coverage=ns.mutantCoverage??={static:{},perTest:{}};
  const map=ns.currentTestId ? coverage.perTest[ns.currentTestId]??={} : coverage.static;
  map[id]=(map[id]??0)+1;
}
hit('module');
beforeEach(()=>hit('before-each'));
afterAll(()=>hit('after-all'));
let releaseFirst,releaseSecond;
const first=new Promise(resolve=>{releaseFirst=resolve;});
const second=new Promise(resolve=>{releaseSecond=resolve;});
test.concurrent('first',async()=>{hit('first');releaseFirst();await second;hit('first');expect(1).toBe(1);});
test.concurrent('second',async()=>{hit('second');releaseSecond();await first;hit('second');expect(2).toBe(2);});
test.each([{value:1},{value:2}])('row $value',({value})=>{hit('row-'+value);expect(value).toBeGreaterThan(0);});
test.failing('expected assertion',()=>{hit('expected');expect(1).toBe(2);});
`;

test('per-test diagnostic capture isolates concurrent bodies, expanded rows and static lifecycle hits', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'vida-mutation-per-test-'));
  let passed = false;
  try {
    const child = await runAdapterChild(root, perTestSubject, 'coverage', { capture: true, exitCode: 0 });
    const capture = JSON.parse(
      await readFile(path.join(root, 'adapters-coverage', 'per-test-coverage.json'), 'utf8'),
    ) as PerTestCapture;
    expect(capture.schema).toBe('MutationPerTestCapture/v2');
    expect(capture.coverage_observed).toBe(true);
    expect(capture.registrations).toEqual(
      [1, 2, 3, 4, 5].map((id) => ({
        test_file: child.selectedTest,
        body_id: id,
        expected_failure: id === 5,
        describe_ids: [],
      })),
    );
    expect(
      capture.invocations
        .filter((entry) => entry.kind === 'body')
        .map((entry) => entry.id)
        .sort((left, right) => left - right),
    ).toEqual([1, 2, 3, 4, 5]);
    expect(capture.invocations.some((entry) => entry.outcome === 'pending')).toBe(false);
    expect(capture.invocations.find((entry) => entry.kind === 'body' && entry.id === 5)?.outcome).toBe('threw');
    expect(capture.invocations.every((entry) => Number.isFinite(entry.elapsed_ms) && entry.elapsed_ms >= 0)).toBe(true);
    expect(capture.mutant_coverage.static).toEqual({ module: 1, 'before-each': 5, 'after-all': 1 });
    expect(capture.mutant_coverage.perTest).toEqual(
      Object.fromEntries(
        (
          [
            ['first', 2],
            ['second', 2],
            ['row-1', 1],
            ['row-2', 1],
            ['expected', 1],
          ] as const
        ).map(([key, count], index) => [`${child.selectedTest}#body:${index + 1}`, { [key]: count }]),
      ),
    );
    expect(junitOutcome(child.junit, [child.selectedTest], [], child.events).outcome).toBe('passed');
    passed = true;
  } finally {
    if (passed) await rm(root, { recursive: true, force: true });
    else console.error('Retained per-test capture fixture: ' + root);
  }
});

test('per-test file token can select one expanded row while preserving registration and causal assertions', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'vida-mutation-per-test-filter-'));
  let passed = false;
  try {
    const selected = 'tests/child-filter.test.ts';
    const token = Buffer.from(selected).toString('base64url');
    const child = await runAdapterChild(root, perTestSubject, 'filter', {
      capture: true,
      exitCode: 0,
      pattern: `\\[mutation-body:4\\] \\[mutation-file:${token}\\] `,
    });
    const capture = JSON.parse(
      await readFile(path.join(root, 'adapters-filter', 'per-test-coverage.json'), 'utf8'),
    ) as PerTestCapture;
    expect(capture.registrations).toHaveLength(5);
    expect(capture.invocations.filter((entry) => entry.kind === 'body').map((entry) => entry.id)).toEqual([4]);
    expect(capture.mutant_coverage.perTest).toEqual({ [`${selected}#body:4`]: { 'row-2': 1 } });
    expect(capture.mutant_coverage.static).toEqual({ module: 1, 'before-each': 1, 'after-all': 1 });
    // Bun retains filtered registrations in JUnit as skipped; one invocation is
    // not a one-case report. Future subset admission must reconcile both sets.
    const cases: MutationJUnitCase[] = [];
    expect(junitOutcome(child.junit, [selected], [], child.events, (row) => cases.push(row))).toMatchObject({
      tests: 5,
      skipped: 4,
    });
    expect(cases).toHaveLength(5);
    expect(cases.filter((row) => row.outcome === 'passed')).toEqual([
      { test_file: selected, name: `[mutation-body:4] [mutation-file:${token}] row 2`, outcome: 'passed' },
    ]);
    expect(cases.filter((row) => row.outcome === 'skipped')).toHaveLength(4);
    passed = true;
  } finally {
    if (passed) await rm(root, { recursive: true, force: true });
    else console.error('Retained per-test filter fixture: ' + root);
  }
});

test('per-test filtered failure binds the exact expanded body to coverage, assertion and complete JUnit', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'vida-mutation-per-test-filter-cause-'));
  let passed = false;
  try {
    const selected = 'tests/child-selected-failure.test.ts';
    const token = Buffer.from(selected).toString('base64url');
    const child = await runAdapterChild(
      root,
      `import { test, expect } from 'bun:test';
test.each([0,1,2])('row %i',value=>{
  const ns=globalThis.__stryker__;
  const coverage=ns.mutantCoverage??={static:{},perTest:{}};
  coverage.perTest[ns.currentTestId]={target:1};
  expect(value).toBe(0);
});`,
      'selected-failure',
      { capture: true, pattern: `\\[mutation-body:2\\] \\[mutation-file:${token}\\] ` },
    );
    const capture: unknown = JSON.parse(
      await readFile(path.join(root, 'adapters-selected-failure', 'per-test-coverage.json'), 'utf8'),
    );
    expect(capture).toEqual({
      schema: 'MutationPerTestCapture/v2',
      describes: [],
      hooks: [],
      registrations: [1, 2, 3].map((body_id) => ({
        test_file: selected,
        body_id,
        expected_failure: false,
        describe_ids: [],
      })),
      invocations: [{ test_file: selected, kind: 'body', id: 2, outcome: 'threw', elapsed_ms: elapsedMatcher }],
      coverage_observed: true,
      mutant_coverage: { static: {}, perTest: { [`${selected}#body:2`]: { target: 1 } } },
    });
    expect(child.events).toEqual([
      {
        schema: 'MutationBodyEvent/v1',
        test_file: selected,
        kind: 'body',
        body_id: 2,
        assertion_cause: true,
        assertion_source: 'bun-expect',
      },
    ]);
    const outcome = junitOutcome(child.junit, [selected], [], child.events);
    expect(outcome).toMatchObject({ tests: 3, skipped: 2, failures: 1, errors: 0, outcome: 'killed' });
    expect(confirmedRunnerOutcome(child.exitCode, outcome.outcome)).toBe('killed');
    for (const change of [{ body_id: 1 }, { test_file: 'tests/foreign.test.ts' }, { assertion_cause: false }]) {
      const mismatched = child.events.map((event) => ({ ...event, ...change }));
      const unproven = junitOutcome(child.junit, [selected], [], mismatched);
      expect(unproven.outcome).toBe('unproven');
      expect(confirmedRunnerOutcome(child.exitCode, unproven.outcome)).toBe('unknown');
    }
    expect(() =>
      parseMutationBodyEvents(Buffer.from(JSON.stringify({ ...child.events[0], test_file: 'tests/foreign.test.ts' })), [
        selected,
      ]),
    ).toThrow('invalid test binding');
    expect(junitOutcome(child.junit, [selected], [], []).outcome).toBe('unproven');
    passed = true;
  } finally {
    if (passed) await rm(root, { recursive: true, force: true });
    else console.error('Retained filtered assertion fixture: ' + root);
  }
});

test.each([
  { label: 'absent', observed: false },
  { label: 'observed-empty', observed: true },
])('per-test capture preserves $label coverage', async ({ observed }) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'vida-mutation-per-test-empty-'));
  let passed = false;
  try {
    const child = await runAdapterChild(
      root,
      `import { test, expect } from 'bun:test';
${observed ? 'globalThis.__stryker__.mutantCoverage={static:{},perTest:{}};' : ''}
test('empty',()=>expect(true).toBe(true));`,
      'empty',
      { capture: true, exitCode: 0 },
    );
    const capture: unknown = JSON.parse(
      await readFile(path.join(root, 'adapters-empty', 'per-test-coverage.json'), 'utf8'),
    );
    expect(capture).toEqual({
      schema: 'MutationPerTestCapture/v2',
      describes: [],
      hooks: [],
      registrations: [{ test_file: child.selectedTest, body_id: 1, expected_failure: false, describe_ids: [] }],
      invocations: [
        { test_file: child.selectedTest, kind: 'body', id: 1, outcome: 'returned', elapsed_ms: elapsedMatcher },
      ],
      coverage_observed: observed,
      mutant_coverage: { static: {}, perTest: {} },
    });
    expect(junitOutcome(child.junit, [child.selectedTest], [], child.events).outcome).toBe('passed');
    passed = true;
  } finally {
    if (passed) await rm(root, { recursive: true, force: true });
    else console.error('Retained empty coverage fixture: ' + root);
  }
});

test.each([
  { label: 'todo', registration: "test.todo('planned');" },
  { label: 'it-todo', registration: "it.todo('planned');" },
  { label: 'skip', registration: "test.skip('planned');" },
  { label: 'skip-if', registration: "test.skipIf(true)('planned');" },
  { label: 'each-skip', registration: "test.each([1,2]).skip('planned %i');" },
])('per-test capture refuses callback-less $label without changing ordinary execution', async ({ registration }) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'vida-mutation-per-test-unsupported-'));
  // A successful parent control does not dispose the child's expected UNKNOWN evidence.
  console.error('Retained unsupported per-test fixture: ' + root);
  const body = `import { test, it, expect } from 'bun:test';
test('ordinary',()=>expect(true).toBe(true));
${registration}`;
  const ordinary = await runAdapterChild(root, body, 'ordinary', { exitCode: 0 });
  expect(junitOutcome(ordinary.junit, [ordinary.selectedTest], [], ordinary.events)).toMatchObject({
    outcome: 'passed',
  });
  const unsupported = await runAdapterChild(root, body, 'unsupported', { capture: true });
  expect(unsupported.stderr).toContain('Mutation per-test capture requires a callback for every test registration.');
  expect(unsupported.events).toEqual([]);
  expect(existsSync(path.join(root, 'adapters-unsupported', 'per-test-coverage.json'))).toBe(false);
  expect(() => junitOutcome(unsupported.junit, [unsupported.selectedTest], [], unsupported.events)).toThrow();
  expect(confirmedRunnerOutcome(unsupported.exitCode, 'unproven')).toBe('unknown');
});

test('per-test capture accounts for skipped callbacks without rejecting conditional modifier setup', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'vida-mutation-per-test-skipped-'));
  let passed = false;
  try {
    const child = await runAdapterChild(
      root,
      `import { test, expect } from 'bun:test';
test('ordinary',()=>expect(true).toBe(true));
test.skip('skipped',()=>{throw new Error('skipped body ran');});
test.skipIf(true)('conditional skipped',()=>{throw new Error('conditional skipped body ran');});
test.each([1,2]).skip('each skipped %i',()=>{throw new Error('skipped row ran');});
test.skipIf(false)('conditional active',()=>expect(true).toBe(true));
test.failingIf(true)('expected assertion',()=>expect(true).toBe(false));`,
      'skipped',
      { capture: true, exitCode: 0 },
    );
    const capture: unknown = JSON.parse(
      await readFile(path.join(root, 'adapters-skipped', 'per-test-coverage.json'), 'utf8'),
    );
    expect(capture).toEqual({
      schema: 'MutationPerTestCapture/v2',
      describes: [],
      hooks: [],
      registrations: [1, 2, 3, 4, 5, 6, 7].map((body_id) => ({
        test_file: child.selectedTest,
        body_id,
        expected_failure: body_id === 7,
        describe_ids: [],
      })),
      invocations: [1, 6, 7].map((id) => ({
        test_file: child.selectedTest,
        kind: 'body',
        id,
        outcome: id === 7 ? 'threw' : 'returned',
        elapsed_ms: elapsedMatcher,
      })),
      coverage_observed: false,
      mutant_coverage: { static: {}, perTest: {} },
    });
    expect(child.events).toEqual([]);
    expect(junitOutcome(child.junit, [child.selectedTest], [], child.events)).toMatchObject({
      tests: 7,
      skipped: 4,
      failures: 0,
      errors: 0,
      outcome: 'passed',
    });
    passed = true;
  } finally {
    if (passed) await rm(root, { recursive: true, force: true });
    else console.error('Retained skipped per-test fixture: ' + root);
  }
});

test('per-test capture binds nested hook registrations to the selected describe ancestry', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'vida-mutation-per-test-scopes-'));
  let passed = false;
  try {
    const selected = 'tests/child-scopes.test.ts';
    const token = Buffer.from(selected).toString('base64url');
    const child = await runAdapterChild(
      root,
      `import { test, expect, describe, beforeAll, beforeEach, afterEach, afterAll } from 'bun:test';
const ns=globalThis.__stryker__;
function hit(id) { const c=ns.mutantCoverage??={static:{},perTest:{}}; const m=ns.currentTestId?c.perTest[ns.currentTestId]??={}:c.static; m[id]=(m[id]??0)+1; }
function hooks(scope) {
  beforeAll(()=>hit(scope+':beforeAll'));beforeEach(()=>hit(scope+':beforeEach'));
  afterEach(()=>hit(scope+':afterEach'));afterAll(()=>hit(scope+':afterAll'));
}
describe('outer',()=>{
  hooks('outer');
  test('outer body',()=>{throw new Error('outer body ran');});
  describe('inner',()=>{hooks('inner');test('selected',()=>{hit('body');expect(true).toBe(true);});});
  describe('sibling',()=>{hooks('sibling');test('sibling body',()=>{throw new Error('sibling body ran');});});
  test('outer after scopes',()=>{throw new Error('outer after scopes ran');});
});
test('root body',()=>{throw new Error('root body ran');});`,
      'scopes',
      { capture: true, exitCode: 0, pattern: `\\[mutation-body:4\\] \\[mutation-file:${token}\\] ` },
    );
    const capture: unknown = JSON.parse(
      await readFile(path.join(root, 'adapters-scopes', 'per-test-coverage.json'), 'utf8'),
    );
    if (!isRecord(capture) || !Array.isArray(capture.invocations))
      throw new Error('Missing scoped capture invocations');
    expect(capture.schema).toBe('MutationPerTestCapture/v2');
    expect(capture.describes).toEqual([
      { test_file: selected, describe_id: 1, parent_ids: [], title: 'outer' },
      { test_file: selected, describe_id: 2, parent_ids: [1], title: 'inner' },
      { test_file: selected, describe_id: 3, parent_ids: [1], title: 'sibling' },
    ]);
    expect(capture.registrations).toEqual(
      [[], [1], [1], [1, 2], [1, 3]].map((describe_ids, index) => ({
        test_file: selected,
        body_id: index + 1,
        expected_failure: false,
        describe_ids,
      })),
    );
    const hookNames = ['beforeAll', 'beforeEach', 'afterEach', 'afterAll'];
    expect(capture.hooks).toEqual(
      [[1], [1, 2], [1, 3]].flatMap((describe_ids, index) =>
        hookNames.map((hook, offset) => ({ test_file: selected, hook_id: index * 4 + offset + 1, hook, describe_ids })),
      ),
    );
    const invocations = capture.invocations.map((entry: unknown) => {
      if (
        !isRecord(entry) ||
        typeof entry.elapsed_ms !== 'number' ||
        !Number.isFinite(entry.elapsed_ms) ||
        entry.elapsed_ms < 0
      )
        throw new Error('Invalid scoped invocation');
      const { elapsed_ms: _elapsed_ms, ...identity } = entry;
      return identity;
    });
    expect(invocations.filter((entry) => entry.kind === 'body')).toEqual([
      { test_file: selected, kind: 'body', id: 4, outcome: 'returned' },
    ]);
    const hookInvocations = invocations.filter((entry) => entry.kind === 'hook');
    expect(new Set(hookInvocations.map((entry) => entry.id)).size).toBe(8);
    expect(
      hookInvocations.map(({ id: _id, ...entry }) => entry).sort((a, b) => Number(a.hook_id) - Number(b.hook_id)),
    ).toEqual(
      [1, 2, 3, 4, 5, 6, 7, 8].map((hook_id) => ({
        test_file: selected,
        kind: 'hook',
        hook_id,
        hook: hookNames[(hook_id - 1) % 4],
        outcome: 'returned',
      })),
    );
    expect(capture.mutant_coverage).toEqual({
      static: Object.fromEntries(
        ['outer', 'inner'].flatMap((scope) => hookNames.map((hook) => [scope + ':' + hook, 1])),
      ),
      perTest: { [`${selected}#body:4`]: { body: 1 } },
    });
    expect(junitOutcome(child.junit, [selected], [], child.events)).toMatchObject({
      tests: 5,
      skipped: 4,
      outcome: 'passed',
    });
    passed = true;
  } finally {
    if (passed) await rm(root, { recursive: true, force: true });
    else console.error('Retained scoped capture fixture: ' + root);
  }
});

test.each([
  { label: 'each', registration: "describe.each([1,2])('suite %i',()=>test('body',()=>expect(true).toBe(true)));" },
  { label: 'skip', registration: "describe.skip('suite',()=>test('body',()=>expect(true).toBe(true)));" },
  { label: 'skip-if', registration: "describe.skipIf(true)('suite',()=>test('body',()=>expect(true).toBe(true)));" },
  { label: 'only', registration: "describe.only('suite',()=>test('body',()=>expect(true).toBe(true)));" },
  {
    label: 'async',
    registration: "describe('suite',async()=>{await Promise.resolve();test('body',()=>expect(true).toBe(true));});",
  },
])('per-test scope capture refuses unsupported describe $label', async ({ registration }) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'vida-mutation-per-test-unsupported-describe-'));
  console.error('Retained unsupported describe fixture: ' + root);
  const body = `import { describe, test, expect } from 'bun:test';
test('ordinary',()=>expect(true).toBe(true));
${registration}`;
  const ordinary = await runAdapterChild(root, body, 'ordinary', { exitCode: 0 });
  expect(junitOutcome(ordinary.junit, [ordinary.selectedTest], [], ordinary.events).outcome).toBe('passed');
  const unsupported = await runAdapterChild(root, body, 'unsupported-describe', { capture: true });
  expect(unsupported.stderr).toContain('Mutation per-test capture does not support');
  expect(existsSync(path.join(root, 'adapters-unsupported-describe', 'per-test-coverage.json'))).toBe(false);
  expect(() => junitOutcome(unsupported.junit, [unsupported.selectedTest], [], unsupported.events)).toThrow();
  expect(confirmedRunnerOutcome(unsupported.exitCode, 'unproven')).toBe('unknown');
});

test('per-test scope capture stays invalid after an unsupported registration error is caught', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'vida-mutation-per-test-caught-scope-'));
  console.error('Retained caught unsupported describe fixture: ' + root);
  const child = await runAdapterChild(
    root,
    `import { describe, test, expect } from 'bun:test';
try { describe.each([1])('unsupported',()=>{}); } catch {}
test('survives catch',()=>expect(true).toBe(true));`,
    'caught-scope',
    { capture: true },
  );
  expect(child.stderr).toMatch(/\(pass\).*survives catch/u);
  expect(child.stderr).toContain('Mutation per-test capture does not support describe.each.');
  expect(existsSync(path.join(root, 'adapters-caught-scope', 'per-test-coverage.json'))).toBe(false);
  expect(() => junitOutcome(child.junit, [child.selectedTest], [], child.events)).toThrow();
  expect(confirmedRunnerOutcome(child.exitCode, 'unproven')).toBe('unknown');
});

test('per-test capture keeps duplicate hook registrations distinct across concurrent bodies', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'vida-mutation-per-test-duplicate-hooks-'));
  let passed = false;
  try {
    const child = await runAdapterChild(
      root,
      `import { describe, test, expect, beforeEach } from 'bun:test';
describe('concurrent',()=>{
  beforeEach(()=>{});beforeEach(()=>{});
  let releaseFirst,releaseSecond;
  const first=new Promise(resolve=>{releaseFirst=resolve;});const second=new Promise(resolve=>{releaseSecond=resolve;});
  test.concurrent('first',async()=>{releaseFirst();await second;expect(true).toBe(true);});
  test.concurrent('second',async()=>{releaseSecond();await first;expect(true).toBe(true);});
});`,
      'duplicate-hooks',
      { capture: true, exitCode: 0 },
    );
    const capture: unknown = JSON.parse(
      await readFile(path.join(root, 'adapters-duplicate-hooks', 'per-test-coverage.json'), 'utf8'),
    );
    if (!isRecord(capture) || !Array.isArray(capture.invocations)) throw new Error('Missing duplicate hook capture');
    expect(capture.hooks).toEqual(
      [1, 2].map((hook_id) => ({ test_file: child.selectedTest, hook_id, hook: 'beforeEach', describe_ids: [1] })),
    );
    const hooks = capture.invocations.filter(
      (entry: unknown): entry is Record<string, unknown> => isRecord(entry) && entry.kind === 'hook',
    );
    expect(hooks.map((entry) => entry.hook_id).sort((a, b) => Number(a) - Number(b))).toEqual([1, 1, 2, 2]);
    expect(new Set(hooks.map((entry) => entry.id)).size).toBe(4);
    expect(hooks.every((entry) => entry.outcome === 'returned')).toBe(true);
    expect(capture.invocations.filter((entry: unknown) => isRecord(entry) && entry.kind === 'body')).toEqual(
      [1, 2].map((id) => ({
        test_file: child.selectedTest,
        kind: 'body',
        id,
        outcome: 'returned',
        elapsed_ms: elapsedMatcher,
      })),
    );
    expect(junitOutcome(child.junit, [child.selectedTest], [], child.events)).toMatchObject({
      tests: 2,
      skipped: 0,
      outcome: 'passed',
    });
    passed = true;
  } finally {
    if (passed) await rm(root, { recursive: true, force: true });
    else console.error('Retained duplicate hook fixture: ' + root);
  }
});

test('real Bun capture and JUnit reconcile against synthetic public dry-run inputs without granting runner admission', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'vida-mutation-per-test-parent-'));
  let passed = false;
  try {
    const file = 'tests/child-parent.test.ts';
    const token = Buffer.from(file).toString('base64url');
    const child = await runAdapterChild(
      root,
      `import { test, expect } from 'bun:test';
const ns=globalThis.__stryker__;ns.mutantCoverage={static:{'0':1},perTest:{}};
test.each([1,2])('row %i',value=>{ns.mutantCoverage.perTest[ns.currentTestId]={'0':1};expect(value).toBeGreaterThan(0);});`,
      'parent',
      { capture: true, exitCode: 0, pattern: `\\[mutation-body:1\\] \\[mutation-file:${token}\\] ` },
    );
    const capture: unknown = JSON.parse(
      await readFile(path.join(root, 'adapters-parent', 'per-test-coverage.json'), 'utf8'),
    );
    const binding = {
      run_id: '00000000-0000-4000-8000-000000000001',
      partition: 'fixture-only',
      input_fingerprint: 'a'.repeat(64),
      source_fingerprint: 'b'.repeat(64),
      test_fingerprint: 'c'.repeat(64),
      tool_fingerprint: 'd'.repeat(64),
      partition_sources: [{ path: 'src/fixture.ts', sha256: 'e'.repeat(64) }],
    };
    const planned = {
      describes: [],
      hooks: [],
      registrations: [1, 2].map((body_id) => ({ test_file: file, body_id, expected_failure: false, describe_ids: [] })),
    };
    // Public-map metadata is a fixture, not an observed Stryker run or native custody proof.
    const dryRun = {
      schema: 'MutationMapDryRun/v1',
      binding,
      confirmed_status: 'unconfirmed',
      result: {
        status: 'complete',
        tests: [1, 2].map((id) => ({
          id: 'engine-' + id,
          name: `[mutation-body:${id}] [mutation-file:${token}] row ${id}`,
          status: id === 1 ? 0 : 2,
          timeSpentMs: 1,
          fileName: file,
        })),
        mutantCoverage: { static: { '0': 1 }, perTest: { [`${file}#body:1`]: { '0': 1 } } },
      },
    };
    const result = validateMutationPerTestJoin({
      capture,
      dryRun,
      junit: child.junit,
      bodyEvents: child.bodyEventBytes,
      exitCode: child.exitCode,
      expected: {
        root,
        binding,
        tests: [file],
        planned,
        localIds: new Map([
          ['0', 'e'.repeat(64)],
          ['1', 'f'.repeat(64)],
        ]),
      },
    });
    expect(result).toMatchObject({
      qualification: 'diagnostic-only',
      origin_qualified: false,
      filtered_runner_qualified: false,
      body_mutants: [{ body: `${file}#body:1`, mutants: ['e'.repeat(64)] }],
      static_mutants: ['e'.repeat(64)],
      uncovered_mutants: ['f'.repeat(64)],
    });
    passed = true;
  } finally {
    if (passed) await rm(root, { recursive: true, force: true });
    else console.error('Retained per-test parent fixture: ' + root);
  }
});

test('per-test capture preserves assertion causes and makes settled background work static', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'vida-mutation-per-test-cause-'));
  let passed = false;
  try {
    const child = await runAdapterChild(
      root,
      `
import { test, expect } from 'bun:test';
const ns=globalThis.__stryker__;
let release;
const detached=new Promise(resolve=>{release=resolve;});
function hit(id) { const c=ns.mutantCoverage??={static:{},perTest:{}};const m=ns.currentTestId?c.perTest[ns.currentTestId]??={}:c.static;m[id]=(m[id]??0)+1; }
test('first',()=>{detached.then(()=>hit('detached'));hit('first');expect(true).toBe(true);});
test('second',async()=>{release();await detached;hit('second');expect(1).toBe(2);});`,
      'cause',
      { capture: true },
    );
    const capture = JSON.parse(
      await readFile(path.join(root, 'adapters-cause', 'per-test-coverage.json'), 'utf8'),
    ) as PerTestCapture;
    expect(capture.mutant_coverage.static).toEqual({ detached: 1 });
    expect(capture.mutant_coverage.perTest).toEqual({
      [`${child.selectedTest}#body:1`]: { first: 1 },
      [`${child.selectedTest}#body:2`]: { second: 1 },
    });
    expect(capture.invocations.map((entry) => entry.outcome)).toEqual(['returned', 'threw']);
    expect(
      confirmedRunnerOutcome(child.exitCode, junitOutcome(child.junit, [child.selectedTest], [], child.events).outcome),
    ).toBe('killed');
    passed = true;
  } finally {
    if (passed) await rm(root, { recursive: true, force: true });
    else console.error('Retained per-test causal fixture: ' + root);
  }
});

test('per-test diagnostic preserves a timed-out pending body without claiming a kill', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'vida-mutation-per-test-pending-'));
  // An expected timeout is retained evidence, even when this parent control passes.
  console.error('Retained expected-timeout per-test fixture: ' + root);
  const child = await runAdapterChild(
    root,
    `
import { test } from 'bun:test';
test('pending',()=>new Promise(()=>undefined),20);`,
    'pending',
    { capture: true },
  );
  const capture: unknown = JSON.parse(
    await readFile(path.join(root, 'adapters-pending', 'per-test-coverage.json'), 'utf8'),
  );
  expect(capture).toEqual({
    schema: 'MutationPerTestCapture/v2',
    describes: [],
    hooks: [],
    registrations: [{ test_file: child.selectedTest, body_id: 1, expected_failure: false, describe_ids: [] }],
    invocations: [{ test_file: child.selectedTest, kind: 'body', id: 1, outcome: 'pending', elapsed_ms: 0 }],
    coverage_observed: false,
    mutant_coverage: { static: {}, perTest: {} },
  });
  expect(confirmedRunnerOutcome(child.exitCode, 'unproven')).toBe('unknown');
});

test.each(['null', '{static:{bad:NaN},perTest:{}}', '{static:{},perTest:{foreign:{"1":1}}}'])(
  'per-test diagnostic rejects malformed or foreign coverage %s',
  async (map) => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'vida-mutation-per-test-invalid-'));
    let passed = false;
    try {
      const child = await runAdapterChild(
        root,
        `
import { test, expect } from 'bun:test';
test('invalid map',()=>{globalThis.__stryker__.mutantCoverage=${map};expect(true).toBe(true);});`,
        'invalid',
        { capture: true },
      );
      expect(existsSync(path.join(root, 'adapters-invalid', 'per-test-coverage.json'))).toBe(false);
      expect(confirmedRunnerOutcome(child.exitCode, 'unproven')).toBe('unknown');
      passed = true;
    } finally {
      if (passed) await rm(root, { recursive: true, force: true });
      else console.error('Retained malformed per-test fixture: ' + root);
    }
  },
);

test('real adapter parses plain TypeScript angle syntax and records the target assertion', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'vida-mutation-typescript-syntax-'));
  try {
    const child = await runAdapterChild(
      root,
      `import { test, expect } from 'bun:test';
const identity = <T>(value: T): T => value;
test('generic arrow and angle assertion', () => { expect(identity(<number>1)).toBe(2); });`,
      'syntax',
    );
    expect(child.events).toMatchObject([
      { kind: 'body', body_id: 1, assertion_cause: true, assertion_source: 'bun-expect' },
    ]);
    expect(
      confirmedRunnerOutcome(child.exitCode, junitOutcome(child.junit, [child.selectedTest], [], child.events).outcome),
    ).toBe('killed');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

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

test('child health failures never become assertion-confirmed mutation kills', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'vida-mutation-child-health-'));
  try {
    const helperPath = path.join(root, 'tests', 'helpers', 'synchronous-child-outcome.ts');
    await mkdir(path.dirname(helperPath), { recursive: true });
    await writeFile(
      helperPath,
      await readFile(fileURLToPath(new URL('./helpers/synchronous-child-outcome.ts', import.meta.url))),
    );
    const cases = [
      { status: 1, signal: null, stdout: 'COMPLETE', stderr: '' },
      { status: null, signal: 'SIGKILL', stdout: 'COMPLETE', stderr: '' },
      { status: null, signal: null, error: { code: 'ETIMEDOUT' }, stdout: '', stderr: '' },
      { status: 0, signal: null, stdout: '', stderr: '' },
      { status: 0, signal: null, error: null, stdout: 'COMPLETE', stderr: '' },
      { status: 0, stdout: 'COMPLETE', stderr: '' },
      { status: 0, signal: '', stdout: 'COMPLETE', stderr: '' },
    ];
    const child = await runAdapterChild(
      root,
      `import { test } from 'bun:test';\nimport { requireSynchronousChildSuccess } from ${JSON.stringify(helperPath)};\n${cases.map((result, index) => `test('child health ${index}', () => requireSynchronousChildSuccess(${JSON.stringify(result)}, 'COMPLETE'));`).join('\n')}\n`,
      'child-health',
    );
    expect(child.exitCode).toBe(1);
    expect(child.events).toHaveLength(cases.length);
    for (const event of child.events)
      expect(event).toMatchObject({ kind: 'body', assertion_cause: false, assertion_source: null });
    expect(() => junitOutcome(child.junit, [child.selectedTest], [], child.events)).toThrow(
      'JUnit failure is not proven to be a Bun assertion failure.',
    );
    requireSynchronousChildSuccess({ status: 0, signal: null, stdout: 'COMPLETE', stderr: '' }, 'COMPLETE');
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
