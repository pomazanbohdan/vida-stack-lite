import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { coverageToolInputs, instrumentSource, sha256 } from '../tooling/bun-coverage-evidence.ts';
import { scopedCrapDispositionProof, type ScopedFunctionDisposition } from '../tooling/crap-gate.ts';
import { functionInventory } from '../tooling/function-inventory.js';
import type { FileCoverageData } from 'istanbul-lib-instrument';

const packageRoot = fileURLToPath(new URL('../', import.meta.url));
const tools = new Map(
  coverageToolInputs
    .filter((file) => file.startsWith('tooling/'))
    .map((file) => [file, readFileSync(path.join(packageRoot, file))]),
);

function unitCounters(file: string, source: string): FileCoverageData {
  const data = instrumentSource(file, source).fileCoverage;
  for (const id of Object.keys(data.s)) data.s[id] = 1;
  for (const id of Object.keys(data.f)) data.f[id] = 1;
  for (const id of Object.keys(data.b)) data.b[id] = data.b[id]!.map(() => 1);
  return data;
}

const v2Original = [{ identity: 'src/a.ts#old', file: 'src/a.ts', complexity: 2 }];
const v2Current = [
  { identity: 'src/a.ts#kept', file: 'src/a.ts', complexity: 2, coverage: 1, crap: 2 },
  { identity: 'src/b.ts#added', file: 'src/b.ts', complexity: 1, coverage: 1, crap: 1 },
];
const v2Rows = [
  {
    kind: 'retained',
    identity: 'src/a.ts#old',
    current_identity: 'src/a.ts#kept',
    max_complexity: 2,
    max_crap: 3,
    rationale: 'Reviewed retained responsibility.',
  },
  {
    kind: 'new',
    identity: 'src/b.ts#added',
    max_complexity: 2,
    max_crap: 2,
    rationale: 'Separately reviewed new responsibility.',
  },
] satisfies ScopedFunctionDisposition[];
const v2Caps = new Map([['src/a.ts#old', { max_complexity: 2, max_crap: 3 }]]);

test('scoped CRAP v2 admits disjoint retained and new roles with explicit source mapping', () => {
  const rows = scopedCrapDispositionProof(
    v2Original,
    v2Current,
    v2Rows,
    [{ original_path: 'src/a.ts', current_path: 'src/a.ts', rationale: 'Reviewed unchanged source ownership.' }],
    ['src/a.ts'],
    ['src/a.ts', 'src/b.ts'],
    [],
    ['src/b.ts'],
    v2Caps,
  );
  expect(rows.map((row) => row.kind)).toEqual(['retained', 'new']);
  expect(rows[1]).not.toHaveProperty('original_source_complexity');
});

test('scoped CRAP v2 rejects raised retained caps and a new role above its own cap', () => {
  expect(() =>
    scopedCrapDispositionProof(
      v2Original,
      v2Current,
      [{ ...v2Rows[0]!, max_crap: 4 }, v2Rows[1]!],
      [{ original_path: 'src/a.ts', current_path: 'src/a.ts', rationale: 'Reviewed unchanged source ownership.' }],
      ['src/a.ts'],
      ['src/a.ts', 'src/b.ts'],
      [],
      ['src/b.ts'],
      v2Caps,
    ),
  ).toThrow(/frozen caps/);
  expect(() =>
    scopedCrapDispositionProof(
      v2Original,
      [{ ...v2Current[0]! }, { ...v2Current[1]!, complexity: 3, crap: 3 }],
      v2Rows,
      [{ original_path: 'src/a.ts', current_path: 'src/a.ts', rationale: 'Reviewed unchanged source ownership.' }],
      ['src/a.ts'],
      ['src/a.ts', 'src/b.ts'],
      [],
      ['src/b.ts'],
      v2Caps,
    ),
  ).toThrow(/own published caps/);
});

test('scoped CRAP v2 rejects missing dispositions, overlaps, and implicit source aliases', () => {
  const mapping = [
    { original_path: 'src/a.ts', current_path: 'src/a.ts', rationale: 'Reviewed unchanged source ownership.' },
  ];
  expect(() =>
    scopedCrapDispositionProof(
      v2Original,
      v2Current,
      v2Rows.slice(0, 1),
      mapping,
      ['src/a.ts'],
      ['src/a.ts', 'src/b.ts'],
      [],
      ['src/b.ts'],
      v2Caps,
    ),
  ).toThrow(/partition/);
  expect(() =>
    scopedCrapDispositionProof(
      v2Original,
      v2Current,
      [
        v2Rows[0]!,
        v2Rows[1]!,
        {
          kind: 'new',
          identity: 'src/a.ts#kept',
          max_complexity: 2,
          max_crap: 2,
          rationale: 'Overlapping current role.',
        },
      ],
      mapping,
      ['src/a.ts'],
      ['src/a.ts', 'src/b.ts'],
      [],
      ['src/b.ts'],
      v2Caps,
    ),
  ).toThrow(/partition|duplicated/);
  expect(() =>
    scopedCrapDispositionProof(
      v2Original,
      v2Current,
      v2Rows,
      [],
      ['src/a.ts'],
      ['src/a.ts', 'src/b.ts'],
      [],
      ['src/b.ts'],
      v2Caps,
    ),
  ).toThrow(/explicit|partition/);
  expect(() =>
    scopedCrapDispositionProof(
      v2Original,
      v2Current,
      v2Rows,
      [{ ...mapping[0]!, current_path: 'src/b.ts' }],
      ['src/a.ts'],
      ['src/a.ts', 'src/b.ts'],
      [],
      ['src/b.ts'],
      v2Caps,
    ),
  ).toThrow(/partition|source-mismapped/);
});

test('scoped CRAP v2 preserves reviewed removal disposition without transferring its ceiling', () => {
  const rows = scopedCrapDispositionProof(
    v2Original,
    [v2Current[1]!],
    [
      { kind: 'removed', identity: 'src/a.ts#old', rationale: 'Reviewed deletion of obsolete responsibility.' },
      v2Rows[1]!,
    ],
    [],
    ['src/a.ts'],
    ['src/b.ts'],
    ['src/a.ts'],
    ['src/b.ts'],
    new Map(),
  );
  expect(rows.map((row) => row.kind)).toEqual(['removed', 'new']);
  expect(rows[0]).not.toHaveProperty('maximum_crap');
});

test('scoped CRAP v2 rejects resetting a shared identity through removed plus new', () => {
  const identity = 'src/a.ts#work';
  expect(() =>
    scopedCrapDispositionProof(
      [{ identity, file: 'src/a.ts', complexity: 2 }],
      [{ identity, file: 'src/a.ts', complexity: 5, coverage: 1, crap: 5 }],
      [
        { kind: 'removed', identity, rationale: 'Reviewed removal disposition.' },
        { kind: 'new', identity, max_complexity: 10, max_crap: 10, rationale: 'Reviewed new-role budget.' },
      ],
      [{ original_path: 'src/a.ts', current_path: 'src/a.ts', rationale: 'Reviewed unchanged source ownership.' }],
      ['src/a.ts'],
      ['src/a.ts'],
      [],
      [],
      new Map(),
    ),
  ).toThrow(/cannot reset/);
});

test('scoped CRAP v2 accepts only the exact reviewed legacy .mjs to current .ts path mapping', () => {
  const old = [{ identity: 'bin/entry.mjs#entry', file: 'bin/entry.mjs', complexity: 3 }];
  const now = [{ identity: 'bin/entry.ts#entry', file: 'bin/entry.ts', complexity: 2, coverage: 1, crap: 2 }];
  const row: ScopedFunctionDisposition[] = [
    {
      kind: 'retained',
      identity: 'bin/entry.mjs#entry',
      current_identity: 'bin/entry.ts#entry',
      max_complexity: 3,
      max_crap: 4,
      rationale: 'Reviewed exact entrypoint responsibility mapping.',
    },
  ];
  const caps = new Map([['bin/entry.mjs#entry', { max_complexity: 3, max_crap: 4 }]]);
  const exact = [
    {
      original_path: 'bin/entry.mjs',
      current_path: 'bin/entry.ts',
      rationale: 'Reviewed legacy entrypoint replacement.',
    },
  ];
  expect(
    scopedCrapDispositionProof(old, now, row, exact, ['bin/entry.mjs'], ['bin/entry.ts'], [], [], caps)[0],
  ).toMatchObject({ kind: 'retained', identity: 'bin/entry.mjs#entry', current_identity: 'bin/entry.ts#entry' });
  expect(() =>
    scopedCrapDispositionProof(
      old,
      now,
      row,
      [{ ...exact[0]!, current_path: 'bin/entry.mjs' }],
      ['bin/entry.mjs'],
      ['bin/entry.ts'],
      [],
      [],
      caps,
    ),
  ).toThrow('Scoped CRAP v2 source mapping is invalid, duplicated or outside exact inventories.');
});

// Controlled post-validation CLI units: Git and the report validator are mocked
// in an isolated child. These counters are synthetic unit data, never accepted
// current/published coverage, frozen budgets, or mutation evidence.
for (const scenario of [
  'rename',
  'removal',
  'plan-byte-swap',
  'uncovered',
  'frozen-ceiling',
  'missing-map',
  'baseline-cc-drift',
  'runtime-valid',
  'runtime-ancestor-symlink',
  'runtime-final-symlink',
  'runtime-traversal',
  'runtime-absolute',
  'runtime-nonstring',
  'runtime-missing-file',
  'runtime-directory',
] as const) {
  test(`CRAP correspondence and byte custody after validated-input boundary: ${scenario}`, () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'crap-correspondence-unit-'));
    let passed = false;
    try {
      const candidate = path.join(root, 'packages/agent');
      const baseline = path.join(root, 'baseline/packages/agent');
      const oldFile = 'src/old.ts';
      const file = ['plan-byte-swap', 'uncovered', 'frozen-ceiling', 'missing-map', 'baseline-cc-drift'].includes(
        scenario,
      )
        ? oldFile
        : 'src/new.ts';
      const source = 'export function compute(): number { return 1; }\n';
      const newSource =
        scenario === 'removal'
          ? 'export function added(): number { return 1; }\n'
          : scenario === 'frozen-ceiling'
            ? 'export function compute(flag: boolean): number { if (flag) return 1; else return 2; }\n'
            : source;
      const oldRow = functionInventory(source, oldFile)[0];
      const newRow = functionInventory(newSource, file)[0];
      if (!oldRow || !newRow) throw new Error('Missing owned unit function.');
      const write = (target: string, value: string | Uint8Array) => {
        mkdirSync(path.dirname(target), { recursive: true });
        writeFileSync(target, value);
      };
      for (const [relative, bytes] of tools) write(path.join(candidate, relative), bytes);
      write(path.join(candidate, 'package.json'), JSON.stringify({ type: 'module', files: ['src/**'] }));
      write(path.join(candidate, 'bunfig.toml'), '[test]\n');
      write(path.join(candidate, file), newSource);
      symlinkSync(path.join(packageRoot, 'node_modules'), path.join(candidate, 'node_modules'), 'dir');
      const testFile = 'tests/unit.test.ts';
      const testSource = '// controlled selected input, not a real executed baseline\n';
      const oldInputs = {
        sources: [{ path: oldFile, sha256: sha256(source) }],
        tests: [testFile],
        test_inputs: [{ path: testFile, sha256: sha256(testSource) }],
        tool_inputs: [],
        source_fingerprint: 'unit-source',
        test_fingerprint: 'unit-test',
        tool_fingerprint: 'unit-tool',
        test_selection: { mode: 'published-baseline-bun-native', tests: [testFile] },
        input_bytes: {},
      };
      const baselineReport = {
        ...oldInputs,
        coverage: { [path.join(baseline, oldFile)]: unitCounters(path.join(baseline, oldFile), source) },
      };
      const baselinePath = path.join(baseline, 'coverage/bun-unified/coverage-final.json');
      const baselineBytes = JSON.stringify(baselineReport);
      write(baselinePath, baselineBytes);
      const currentData = unitCounters(path.join(candidate, file), newSource);
      if (scenario === 'uncovered') currentData.f['0'] = 0;
      const currentReport = {
        ...oldInputs,
        schema: 'unit-only',
        run_id: 'unit-only',
        coverage: { [path.join(candidate, file)]: currentData },
      };
      const currentInputs = { ...oldInputs, input_bytes: { [file]: newSource } };
      const runtimeScenario = scenario.startsWith('runtime-');
      const retainedRuntimePath = path.join(root, 'retained-runtime', 'bun');
      const outsideRuntimePath = path.join(root, 'outside-runtime', 'bun');
      let runtimeReference: unknown;
      if (scenario === 'runtime-valid') {
        write(retainedRuntimePath, 'synthetic retained runtime');
        runtimeReference = path.relative(root, retainedRuntimePath);
      } else if (scenario === 'runtime-ancestor-symlink') {
        write(outsideRuntimePath, 'synthetic retained runtime');
        symlinkSync(path.dirname(outsideRuntimePath), path.join(root, 'retained-runtime-link'), 'dir');
        runtimeReference = 'retained-runtime-link/bun';
      } else if (scenario === 'runtime-final-symlink') {
        write(outsideRuntimePath, 'synthetic retained runtime');
        symlinkSync(outsideRuntimePath, path.join(root, 'retained-runtime-link'));
        runtimeReference = 'retained-runtime-link';
      } else if (scenario === 'runtime-traversal') {
        runtimeReference = '../outside-runtime/bun';
      } else if (scenario === 'runtime-absolute') {
        runtimeReference = outsideRuntimePath;
      } else if (scenario === 'runtime-nonstring') {
        runtimeReference = { path: 'retained-runtime/bun' };
      } else if (scenario === 'runtime-missing-file') {
        runtimeReference = 'retained-runtime/missing-bun';
      } else if (scenario === 'runtime-directory') {
        mkdirSync(path.dirname(retainedRuntimePath), { recursive: true });
        runtimeReference = path.relative(root, path.dirname(retainedRuntimePath));
      }
      const plan = {
        schema: 'VidaCrapBudgetPlan/v1',
        baseline_ref: 'b549951',
        baseline_coverage_report_ref: path.relative(root, baselinePath),
        baseline_coverage_report_sha256: sha256(baselineBytes),
        ...(runtimeScenario ? { baseline_runtime_executable_ref: runtimeReference } : {}),
        baseline_functions:
          scenario === 'removal'
            ? []
            : [
                {
                  identity: oldRow.identity,
                  current_identity: newRow.identity,
                  baseline_complexity: scenario === 'baseline-cc-drift' ? 2 : 1,
                  baseline_coverage: 1,
                  baseline_crap: scenario === 'baseline-cc-drift' ? 2 : 1,
                  max_complexity: scenario === 'baseline-cc-drift' ? 2 : 1,
                  max_crap: scenario === 'baseline-cc-drift' ? 2 : 1,
                  rationale: 'reviewed unit correspondence',
                },
              ],
        new_functions:
          scenario === 'removal'
            ? [{ identity: newRow.identity, max_complexity: 1, max_crap: 1, rationale: 'reviewed unit addition' }]
            : [],
        removed_functions:
          scenario === 'removal' ? [{ identity: oldRow.identity, rationale: 'reviewed unit removal' }] : [],
        new_sources: file === oldFile ? [] : [{ path: file, rationale: 'reviewed unit source addition' }],
        removed_sources: file === oldFile ? [] : [{ path: oldFile, rationale: 'reviewed unit source removal' }],
      };
      const planPath = path.join(root, 'unit-plan.json');
      const planBytes = JSON.stringify(plan);
      write(planPath, planBytes);
      const payload = {
        root,
        baselinePath,
        oldInputs,
        currentInputs,
        baselineReport,
        currentReport,
        canonicalSourceMaps:
          scenario === 'missing-map'
            ? {}
            : { [path.join(candidate, file)]: instrumentSource(path.join(candidate, file), newSource).fileCoverage },
        planPath,
        runtimeScenario,
        expectedHistoricalRuntimePath: scenario === 'runtime-valid' ? retainedRuntimePath : null,
        replacement: JSON.stringify({ ...plan, schema: 'changed-after-plan-read' }),
        swap: scenario === 'plan-byte-swap',
        gitFiles: { 'package.json': JSON.stringify({ files: ['src/**'] }), [oldFile]: source, [testFile]: testSource },
      };
      write(path.join(candidate, 'unit-payload.json'), JSON.stringify(payload));
      const preload = path.join(candidate, 'unit-preload.ts');
      write(
        preload,
        `import { mock } from 'bun:test';
import { readFileSync, writeFileSync } from 'node:fs';
const data = JSON.parse(readFileSync(new URL('./unit-payload.json', import.meta.url), 'utf8'));
const gitCalls = new Map<string, number>();
const historicalRuntimeCalls: string[] = [];
const actual = await import('node:child_process');
mock.module('node:child_process', () => ({ ...actual, spawnSync(command: string, args: string[], options: {encoding?: string}) {
  if (command !== 'git') throw new Error('Unexpected unit command: ' + command);
  const key = JSON.stringify(args); gitCalls.set(key, (gitCalls.get(key) ?? 0) + 1);
  let text: string;
  if (args[0] === 'rev-parse') text = args.includes('--show-toplevel') ? data.root + '\\n' : 'b549951-unit-commit\\n';
  else if (args[0] === 'ls-tree') text = args.includes('packages/agent/tests') ? 'packages/agent/tests/unit.test.ts\\n' : 'packages/agent/src/old.ts\\n';
  else if (args[0] === 'show') {
    const relative = args[1]!.replace('b549951:packages/agent/', '');
    if (relative === 'src/new.ts') return { status: 128, signal: null, stdout: Buffer.alloc(0), stderr: 'path does not exist in b549951' };
    if (!(relative in data.gitFiles)) throw new Error('Unexpected unit Git input: ' + relative);
    text = data.gitFiles[relative];
  } else throw new Error('Unexpected unit Git operation.');
  return { status: 0, signal: null, stdout: options.encoding === 'utf8' ? text : Buffer.from(text), stderr: '' };
} }));
mock.module(new URL('./tooling/bun-coverage-report-validator.ts', import.meta.url).pathname, () => ({ async validateCoverageReport(reportPath: string) {
  if (reportPath === data.baselinePath) {
    if (data.swap) writeFileSync(data.planPath, data.replacement);
    return { report: data.baselineReport, coverage: data.baselineReport.coverage, inputs: data.oldInputs };
  }
  return { report: data.currentReport, coverage: data.currentReport.coverage, canonical_source_maps: data.canonicalSourceMaps, inputs: { ...data.currentInputs, input_bytes: Object.fromEntries(Object.entries(data.currentInputs.input_bytes).map(([file, text]) => [file, Buffer.from(text as string)])) } };
}, async validateHistoricalBaselineCoverageReport(reportPath: string, _packageRoot: string, runtimePath: string) {
  historicalRuntimeCalls.push(runtimePath);
  if (reportPath !== data.baselinePath) throw new Error('Historical runtime override used for the wrong report.');
  return { report: data.baselineReport, coverage: data.baselineReport.coverage, inputs: data.oldInputs };
} }));
process.on('exit', () => {
  writeFileSync(new URL('./unit-git-calls.json', import.meta.url), JSON.stringify([...gitCalls]));
  writeFileSync(new URL('./unit-historical-runtime-calls.json', import.meta.url), JSON.stringify(historicalRuntimeCalls));
});
`,
      );
      const result = spawnSync(process.execPath, ['--preload', preload, path.join(candidate, 'tooling/crap-gate.ts')], {
        cwd: candidate,
        encoding: 'utf8',
        timeout: 20_000,
        maxBuffer: 1024 * 1024,
        env: { ...process.env, BUN_OPTIONS: '', VIDA_BUN_COVERAGE_ROOT: candidate, VIDA_CRAP_BUDGET_PLAN: planPath },
      });
      write(path.join(root, 'child.stdout'), result.stdout);
      write(path.join(root, 'child.stderr'), result.stderr);
      expect(result.error).toBeUndefined();
      expect(result.signal).toBeNull();
      if (
        scenario === 'uncovered' ||
        scenario === 'frozen-ceiling' ||
        scenario === 'missing-map' ||
        scenario === 'baseline-cc-drift' ||
        (scenario.startsWith('runtime-') && scenario !== 'runtime-valid')
      ) {
        expect(result.status).toBe(1);
        const denial =
          scenario === 'uncovered'
            ? 'Coverage is not exact 100%'
            : scenario === 'missing-map'
              ? 'Canonical Source coverage map is missing'
              : scenario === 'baseline-cc-drift'
                ? 'Frozen baseline values differ from actual coverage evidence'
                : scenario === 'runtime-traversal'
                  ? 'Historical baseline runtime must remain inside the Source repository.'
                  : scenario === 'runtime-nonstring'
                    ? 'Historical baseline runtime reference is invalid.'
                    : scenario === 'runtime-absolute'
                      ? 'Historical baseline runtime reference is invalid.'
                      : scenario === 'runtime-missing-file'
                        ? 'ENOENT'
                        : scenario.startsWith('runtime-')
                          ? 'Historical baseline runtime must be an in-repository regular file, not a symlink.'
                          : 'Existing function exceeds its frozen complexity/CRAP budget';
        expect(result.stderr).toContain(denial);
        if (scenario.startsWith('runtime-')) {
          const calls: unknown = JSON.parse(
            readFileSync(path.join(candidate, 'unit-historical-runtime-calls.json'), 'utf8'),
          );
          expect(calls).toEqual([]);
          const errorLines = result.stderr.split('\n').filter((line) => /^(?:error: |ENOENT: )/u.test(line));
          expect(errorLines).toHaveLength(1);
          expect(errorLines[0]).toContain(denial);
        }
      } else {
        expect(result.status).toBe(0);
        const report: unknown = JSON.parse(result.stdout);
        expect(report).toHaveProperty('budget_plan_sha256', sha256(planBytes));
        if (scenario === 'removal')
          expect(report).toHaveProperty(
            'functions',
            expect.arrayContaining([expect.objectContaining({ identity: oldRow.identity, status: 'removed' })]),
          );
        else
          expect(report).toHaveProperty(
            'functions',
            expect.arrayContaining([
              expect.objectContaining({ identity: oldRow.identity, current_identity: newRow.identity }),
            ]),
          );
        const calls: unknown = JSON.parse(readFileSync(path.join(candidate, 'unit-git-calls.json'), 'utf8'));
        expect(calls).toEqual(
          expect.arrayContaining([[JSON.stringify(['show', 'b549951:packages/agent/' + oldFile]), 1]]),
        );
        if (scenario === 'plan-byte-swap') expect(readFileSync(planPath, 'utf8')).toBe(payload.replacement);
        if (scenario === 'runtime-valid') {
          const calls: unknown = JSON.parse(
            readFileSync(path.join(candidate, 'unit-historical-runtime-calls.json'), 'utf8'),
          );
          expect(calls).toEqual([payload.expectedHistoricalRuntimePath]);
        }
      }
      if (scenario === 'baseline-cc-drift') {
        expect(readFileSync(baselinePath)).toEqual(Buffer.from(baselineBytes));
        expect(plan.baseline_functions[0]?.baseline_complexity).toBe(2);
        expect(sha256(readFileSync(baselinePath))).toBe(plan.baseline_coverage_report_sha256);
      }
      passed = true;
    } finally {
      if (passed) rmSync(root, { recursive: true, force: true });
      else console.error('Preserved failed CRAP post-validation unit at ' + root);
    }
  });
}
