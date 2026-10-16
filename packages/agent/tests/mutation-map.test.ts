import { expect, test } from 'bun:test';
import path from 'node:path';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { PlanKind, type Mutant, type MutantResult, type MutantTestPlan } from '@stryker-mutator/api/core';
import { TestStatus } from '@stryker-mutator/api/test-runner';
import {
  assertGlobalMutationMap,
  canonicalMutationLocation,
  confirmPartitionMutationMap,
  globalMutationMap,
  mutationMapIdentity,
  mutationPartitionMap,
  mutationResultMapRow,
  planMutationBatches,
  mutationGeneratedUniverse,
  validateMutationMapEvents,
  validateMutationPartitionMap,
  type MutationMapBinding,
} from '../tooling/mutation-map.ts';
import { sha256 } from '../tooling/bun-coverage-evidence.ts';
import { expectRejection } from './helpers/expect-rejection.ts';
import {
  validateMutationPerTestJoin,
  validateMutationPerTestRegistration,
  readMutationPerTestCapture,
} from '../tooling/mutation-per-test-evidence.ts';
import type { MutationPerTestCapture } from '../tooling/mutation-assertion-context.ts';
import { generateMutationImage } from '../tooling/mutation-generation.ts';
import { nativeMutationBatchCommand, selectMutationBatchPilot } from '../tooling/mutation-batch-pilot.ts';
import { executeMutationCommand } from '../tooling/mutation-evidence.ts';

const root = path.resolve('/mutation-map-fixture');
const sources = [
  { path: 'src/one.ts', sha256: 'a'.repeat(64) },
  { path: 'src/two.ts', sha256: 'b'.repeat(64) },
];
const binding: MutationMapBinding = {
  run_id: '00000000-0000-4000-8000-000000000001',
  partition: 'one',
  input_fingerprint: 'c'.repeat(64),
  source_fingerprint: 'd'.repeat(64),
  test_fingerprint: 'e'.repeat(64),
  tool_fingerprint: 'f'.repeat(64),
  partition_sources: sources,
};

function plan(id = '0', file = 'src/one.ts'): MutantTestPlan {
  const mutant: Mutant = {
    id,
    fileName: path.join(root, file),
    mutatorName: 'BooleanLiteral',
    replacement: 'false',
    location: { start: { line: 0, column: 0 }, end: { line: 0, column: 4 } },
  };
  return {
    plan: PlanKind.Run,
    mutant,
    netTime: 1,
    runOptions: {
      timeout: 1000,
      disableBail: true,
      activeMutant: mutant,
      sandboxFileName: mutant.fileName,
      mutantActivation: 'runtime',
      reloadEnvironment: true,
      testFilter: ['test:1'],
    },
  };
}

function result(item = plan()): MutantResult {
  return {
    ...item.mutant,
    status: 'Killed',
    location: canonicalMutationLocation(item.mutant.location, 0),
    testsCompleted: 1,
    killedBy: ['test:1'],
  };
}

test('a full generated universe plans activation IDs without inventing a tested engine plan', () => {
  const item = plan('17');
  const generated = mutationGeneratedUniverse(root, binding, [item.mutant]);
  expect(generated.schema).toBe('MutationGeneratedUniverse/v1');
  expect(generated.mutants[0]?.identity).toBe(mutationMapIdentity(root, sources, item.mutant, 0).identity);
  expect(generated.mutants[0]).not.toHaveProperty('plan');
  expect(generated.mutants[0]).not.toHaveProperty('engine_status');
  expect(planMutationBatches(root, binding, generated, 64).batches[0]?.local_ids).toEqual(['17']);
  expect(() => validateMutationPartitionMap(generated, root, binding)).toThrow('parent');
  expect(() => mutationGeneratedUniverse(root, binding, [item.mutant, { ...item.mutant, id: '18' }])).toThrow(
    'duplicate',
  );
  expect(() => mutationGeneratedUniverse(root, binding, [{ ...item.mutant, fileName: '/foreign.ts' }])).toThrow(
    'Source binding',
  );
});

test('public Stryker generation binds one instrumented image to captured Source and activation IDs', async () => {
  const bytes = Buffer.from('export const signal = (value: boolean) => value ? "yes" : "no";\n');
  const captured = { ...binding, partition_sources: [{ path: 'src/one.ts', sha256: sha256(bytes) }] };
  const packageRoot = path.resolve(import.meta.dir, '..');
  const image = await generateMutationImage(packageRoot, captured, { 'src/one.ts': bytes });
  expect(image.universe.schema).toBe('MutationGeneratedUniverse/v1');
  expect(image.universe.mutants.length).toBeGreaterThan(0);
  expect(image.files).toHaveLength(1);
  expect(image.files[0]?.path).toBe('src/one.ts');
  expect(image.files[0]?.content).not.toBe(bytes.toString('utf8'));
  expect(image.files[0]?.sha256).toBe(sha256(image.files[0]!.content));
  expect(image.generator.instrumenter_version).toBe(image.generator.core_version);
  expect(image.generator.entry_sha256).toMatch(/^[a-f0-9]{64}$/u);
  const planned = planMutationBatches(packageRoot, captured, image.universe, 2);
  expect(planned.batches.flatMap((batch) => batch.local_ids).sort()).toEqual(
    image.universe.mutants.map((row) => row.local_id).sort(),
  );
  await expectRejection(
    generateMutationImage(packageRoot, captured, { 'src/one.ts': Buffer.from('export const signal = 0;') }),
    'captured Source',
  );
  await expectRejection(generateMutationImage(packageRoot, captured, {}), 'captured Source');
});

test('native batch pilot keeps exact declared contours and finite per-batch bounds', () => {
  const declared = [
    { name: 'one', sources: ['src/one.ts'], tests: ['tests/one.test.ts'], report: 'one.json', environment: 'bun' },
  ];
  const selected = selectMutationBatchPilot(['--contour', 'one', '--batch-size', '8', '--max-batches', '2'], declared);
  expect(selected.partition).toBe(declared[0]!);
  expect(selected.batchSize).toBe(8);
  expect(selected.maxBatches).toBe(2);
  expect(() => selectMutationBatchPilot(['--contour', 'one'], [{ ...declared[0]!, environment: 'windows' }])).toThrow(
    'main and Bun',
  );
  for (const args of [
    [],
    ['--contour', 'foreign'],
    ['--contour', 'one', '--batch-size', '0'],
    ['--contour', 'one', '--batch-size', '129'],
    ['--contour', 'one', '--batch-size', '1\n'],
    ['--contour', 'one', '--max-batches', 'Infinity'],
    ['--contour', 'one', '--tests', 'tests/foreign.ts'],
  ])
    expect(() => selectMutationBatchPilot(args, declared)).toThrow();
});

test('native mutation sandbox permits nested Bun spawn and private scratch while Source stays read-only', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'native-mutation-sandbox-control-'));
  const sandbox = path.join(directory, 'sandbox-control');
  const scratch = path.join(sandbox, '.tmp');
  mkdirSync(path.join(sandbox, 'tooling'), { recursive: true });
  mkdirSync(scratch);
  writeFileSync(path.join(sandbox, 'subject.ts'), 'export const value = 1;\n');
  writeFileSync(
    path.join(sandbox, 'tooling/mutation-command-runner.ts'),
    `
    import{writeFileSync}from'node:fs';
    let sourceReadonly=false;
    try{writeFileSync('subject.ts','invalid')}catch(error){sourceReadonly=error.code==='EROFS'||error.code==='EACCES'}
    writeFileSync('.tmp/owned.txt','scratch');
    const child=Bun.spawn([process.execPath,'--version'],{stdout:'pipe',stderr:'pipe'});
    console.log(JSON.stringify({sourceReadonly,exit:await child.exited,scratch:await Bun.file('.tmp/owned.txt').text()}));
  `,
  );
  let completed = false;
  try {
    const bwrap = Bun.which('bwrap');
    if (!bwrap) throw new Error('Native sandbox control requires bwrap.');
    const result = await executeMutationCommand(
      nativeMutationBatchCommand(bwrap, directory, sandbox, scratch, process.execPath),
      sandbox,
      3000,
      {
        ownedProcessGroup: true,
        stdoutFile: path.join(directory, 'stdout.log'),
        stderrFile: path.join(directory, 'stderr.log'),
      },
    );
    expect(result.exitCode).toBe(0);
    expect(result.timedOut).toBe(false);
    expect(result.processCustody?.processGroupTerminationObserved).toBe(true);
    expect(result.output_capture?.complete).toBe(true);
    const observed: unknown = JSON.parse(await Bun.file(path.join(directory, 'stdout.log')).text());
    expect(observed).toEqual({ sourceReadonly: true, exit: 0, scratch: 'scratch' });
    expect(await Bun.file(path.join(sandbox, 'subject.ts')).text()).toBe('export const value = 1;\n');
    completed = true;
  } finally {
    if (completed) rmSync(directory, { recursive: true, force: true });
    else console.error('NATIVE_SANDBOX_CONTROL_RETAINED', directory);
  }
});

test('mutation batches own every generated identity once without changing generation ranges', () => {
  const items = [plan('0'), plan('1'), plan('2'), plan('3', 'src/two.ts')];
  items[0]!.mutant.location = { start: { line: 0, column: 0 }, end: { line: 8, column: 0 } };
  items[1]!.mutant.location = { start: { line: 1, column: 0 }, end: { line: 2, column: 0 } };
  items[2]!.mutant.location = { start: { line: 9, column: 0 }, end: { line: 9, column: 4 } };
  const universe = mutationPartitionMap(root, binding, items);
  const planned = planMutationBatches(root, binding, universe, 2);
  expect(planned.qualification).toBe('planning-only');
  expect(planned.batches.map((batch) => batch.identities.length)).toEqual([2, 2]);
  expect(planned.batches.every((batch) => !('mutate' in batch) && !('excludedMutations' in batch))).toBe(true);
  expect(planned.batches.flatMap((batch) => batch.identities).sort()).toEqual(
    universe.mutants.map((m) => m.identity).sort(),
  );
  expect(
    planMutationBatches(root, binding, { ...universe, mutants: [...universe.mutants].reverse() }, 2).batches,
  ).toEqual(planned.batches);
  expect(planMutationBatches(root, binding, universe, 1).batches).toHaveLength(4);
});

test('mutation batch planning rejects invalid limits and changed parent identities', () => {
  const universe = mutationPartitionMap(root, binding, [plan()]);
  for (const limit of [0, -1, 1.5, Infinity])
    expect(() => planMutationBatches(root, binding, universe, limit)).toThrow('batch limit');
  expect(() => planMutationBatches(root, { ...binding, test_fingerprint: '0'.repeat(64) }, universe, 2)).toThrow(
    'parent',
  );
  expect(() =>
    planMutationBatches(root, binding, { ...universe, mutants: [...universe.mutants, universe.mutants[0]] }, 2),
  ).toThrow('duplicate');
  expect(() => planMutationBatches(root, binding, mutationPartitionMap(root, binding, []), 2)).toThrow('empty');
});

test('mutation batches preserve local activation IDs alongside canonical identities', () => {
  const other = plan('1');
  other.mutant.mutatorName = 'BlockStatement';
  const universe = mutationPartitionMap(root, binding, [plan(), other]);
  const planned = planMutationBatches(root, binding, universe, 2);
  expect(planned.batches).toHaveLength(1);
  expect(planned.batches[0]?.local_ids.slice().sort()).toEqual(['0', '1']);
  for (const batch of planned.batches)
    for (const [index, identity] of batch.identities.entries())
      expect(universe.mutants.find((row) => row.identity === identity)?.local_id).toBe(batch.local_ids[index]);
  expect(planned.universe_sha256).toMatch(/^[a-f0-9]{64}$/u);
  const renumbered = mutationPartitionMap(root, binding, [plan('999'), other]);
  expect(planMutationBatches(root, binding, renumbered, 2).universe_sha256).not.toBe(planned.universe_sha256);
});

test('mutation batch universe binding stays bounded beyond the ordinary canonical node budget', () => {
  const items = Array.from({ length: 1000 }, (_, index) => {
    const item = plan(String(index));
    item.mutant.location = { start: { line: index * 2, column: 0 }, end: { line: index * 2, column: 4 } };
    return item;
  });
  const universe = mutationPartitionMap(root, binding, items);
  const forward = planMutationBatches(root, binding, universe, 64);
  const reversed = planMutationBatches(root, binding, { ...universe, mutants: [...universe.mutants].reverse() }, 64);
  expect(forward.universe_sha256).toBe(reversed.universe_sha256);
  expect(forward.batches.flatMap((batch) => batch.identities)).toHaveLength(1000);
  expect(new Set(forward.batches.flatMap((batch) => batch.identities)).size).toBe(1000);
});

test('canonical mutant identity survives local ID renumbering and normalizes the public plan/result coordinate boundary', () => {
  const before = plan();
  const renumbered = plan('999');
  const key = mutationMapIdentity(root, sources, before.mutant, 0);
  expect(mutationMapIdentity(root, sources, renumbered.mutant, 0)).toEqual(key);
  expect(mutationMapIdentity(root, sources, result(before), 1)).toEqual(key);
  expect(key.location).toEqual({ start: { line: 1, column: 1 }, end: { line: 1, column: 5 } });
  for (const changed of [
    { ...before.mutant, replacement: 'true' },
    { ...before.mutant, mutatorName: 'Other' },
    { ...before.mutant, location: { start: { line: 0, column: 1 }, end: { line: 0, column: 4 } } },
  ])
    expect(mutationMapIdentity(root, sources, changed, 0).identity).not.toBe(key.identity);
  expect(mutationMapIdentity(root, [{ ...sources[0]!, sha256: '0'.repeat(64) }], before.mutant, 0).identity).not.toBe(
    key.identity,
  );
});

test.each([
  null,
  {},
  { start: { line: -1, column: 0 }, end: { line: 0, column: 0 } },
  { start: { line: 0, column: NaN }, end: { line: 0, column: 1 } },
  { start: { line: Number.MAX_SAFE_INTEGER, column: 0 }, end: { line: Number.MAX_SAFE_INTEGER, column: 1 } },
  { start: { line: 1, column: 0 }, end: { line: 0, column: 5 } },
])('canonical map rejects invalid positions %#', (location) => {
  expect(() => canonicalMutationLocation(location, 0)).toThrow();
});

test('map rejects foreign paths, duplicate canonical identities and inconsistent report universes', () => {
  expect(() => mutationPartitionMap(root, binding, [plan('0', '../foreign.ts')])).toThrow('Source binding');
  expect(() => mutationPartitionMap(root, binding, [plan(), plan('1')])).toThrow('duplicate');
  const map = mutationPartitionMap(root, binding, [plan(), plan('1', 'src/two.ts')]);
  const reported = [plan(), plan('1', 'src/two.ts')].map((item) => ({
    file: item.mutant.fileName,
    mutant: result(item),
  }));
  expect(validateMutationPartitionMap(map, root, binding, reported).sourceCounts).toEqual({
    'src/one.ts': 1,
    'src/two.ts': 1,
  });
  for (const rows of [
    reported.slice(0, 1),
    [...reported, reported[0]!],
    [{ ...reported[0]!, mutant: { ...reported[0]!.mutant, replacement: 'changed' } }],
  ])
    expect(() => validateMutationPartitionMap(map, root, binding, rows)).toThrow();
  expect(() => validateMutationPartitionMap(map, root, { ...binding, test_fingerprint: '0'.repeat(64) })).toThrow(
    'parent inputs',
  );
  expect(map.mutants.every((mutant) => mutant.confirmed_status === 'unconfirmed')).toBe(true);
});

test('global map preserves source, pending and omitted platform lanes and uses per-source counts', () => {
  const partitions = [
    { name: 'linux', environment: 'linux', sources: ['src/one.ts'] },
    { name: 'windows', environment: 'windows', sources: ['src/one.ts'] },
    { name: 'pending', environment: 'pending', sources: ['src/two.ts'] },
  ];
  const map = globalMutationMap(
    binding,
    sources,
    partitions,
    ['linux'],
    new Set(),
    new Map([
      [
        'linux',
        {
          status: 'assertion-confirmed-killed',
          source_counts: { 'src/one.ts': 2 },
          map: { file: 'linux.map-plan.json', bytes: 100, sha256: '1'.repeat(64), mutants: 15 },
        },
      ],
    ]),
  );
  expect(map.globally_qualified).toBe(false);
  expect(
    map.sources[0]?.assignments.map(({ partition, status, mutant_count }) => ({ partition, status, mutant_count })),
  ).toEqual([
    { partition: 'linux', status: 'assertion-confirmed-killed', mutant_count: 2 },
    { partition: 'windows', status: 'omitted-from-execution', mutant_count: null },
  ]);
  expect(map.sources[1]?.assignments[0]).toMatchObject({ status: 'pending-behavior-tests', mutant_count: null });
  expect(() => assertGlobalMutationMap({ ...map, globally_qualified: true }, binding, sources, partitions)).toThrow(
    'unqualified',
  );
});

test('a complete global map keeps every required platform distinct and rejects missing/stale bindings', () => {
  const partitions = ['linux', 'windows'].map((name) => ({
    name,
    environment: name,
    sources: sources.map(({ path }) => path),
  }));
  const observations = new Map(
    partitions.map(({ name }) => [
      name,
      {
        status: 'assertion-confirmed-killed',
        source_counts: { 'src/one.ts': 1, 'src/two.ts': 2 },
        map: { file: `${name}.map-plan.json`, bytes: 500, sha256: '1'.repeat(64), mutants: 3 },
      },
    ]),
  );
  const map = {
    ...globalMutationMap(binding, sources, partitions, ['linux', 'windows'], new Set(), observations),
    globally_qualified: true,
  };
  expect(() => assertGlobalMutationMap(map, binding, sources, partitions)).not.toThrow();
  const missingPlatform = {
    ...map,
    sources: map.sources.map((source, index) =>
      index ? source : { ...source, assignments: source.assignments.slice(0, 1) },
    ),
  };
  expect(() => assertGlobalMutationMap(missingPlatform, binding, sources, partitions)).toThrow('partition matrix');
  expect(() =>
    assertGlobalMutationMap({ ...map, sources: map.sources.slice(0, 1) }, binding, sources, partitions),
  ).toThrow();
  expect(() =>
    assertGlobalMutationMap(map, { ...binding, tool_fingerprint: '0'.repeat(64) }, sources, partitions),
  ).toThrow();
});

test('map event Killed remains unconfirmed and every planned ID needs its matching unique engine outcome', () => {
  const item = plan();
  const map = mutationPartitionMap(root, binding, [item]);
  const validated = validateMutationPartitionMap(map, root, binding);
  const event = mutationResultMapRow(root, binding, result(item));
  expect(event.confirmed_status).toBe('unconfirmed');
  const statuses = new Map([['0', 'Killed']]);
  expect(() => validateMutationMapEvents([event], validated.localIds, statuses)).not.toThrow();
  for (const events of [
    [],
    [event, event],
    [{ ...event, identity: '0'.repeat(64) }],
    [{ ...event, engine_status: 'Timeout' }],
    [{ ...event, confirmed_status: 'Killed' }],
  ])
    expect(() => validateMutationMapEvents(events, validated.localIds, statuses)).toThrow();
});

test('map metadata equality accepts reordered JSON keys while keeping all binding values exact', () => {
  const map = mutationPartitionMap(root, binding, [plan()]);
  const reordered = Object.fromEntries(Object.entries(binding).reverse()) as MutationMapBinding;
  expect(() => validateMutationPartitionMap({ ...map, binding: reordered }, root, binding)).not.toThrow();
});

test('parent reads each map artifact once and rejects partial journal or a forged terminal digest', async () => {
  const item = plan();
  const map = mutationPartitionMap(root, binding, [item]);
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value) + '\n');
  const planBytes = encode(map);
  const eventBytes = encode(mutationResultMapRow(root, binding, result(item)));
  const terminal = {
    schema: 'MutationMapTerminal/v1',
    binding,
    mutants: 1,
    confirmed_status: 'unconfirmed',
    plan: { file: 'one.map-plan.json', bytes: planBytes.length, sha256: sha256(planBytes) },
    events: { file: 'one.map-events.jsonl', bytes: eventBytes.length, sha256: sha256(eventBytes) },
  };
  const dryRun = {
    schema: 'MutationMapDryRun/v1',
    binding,
    result: {
      status: 'complete',
      tests: [
        { id: 'all', name: 'all', status: TestStatus.Success, timeSpentMs: 1 },
        { id: 'skipped', name: 'skipped', status: TestStatus.Skipped, timeSpentMs: 0 },
      ],
    },
    confirmed_status: 'unconfirmed',
  };
  const files = new Map([
    ['one.map-plan.json', planBytes],
    ['one.map-terminal.json', encode(terminal)],
    ['one.map-events.jsonl', eventBytes],
    ['one.map-dry-run.json', encode(dryRun)],
  ]);
  const reads: string[] = [];
  const read = async (file: string) => {
    reads.push(file);
    const bytes = files.get(file);
    if (!bytes) throw new Error('missing');
    return bytes;
  };
  const reported = [{ file: item.mutant.fileName, mutant: result(item) }];
  expect((await confirmPartitionMutationMap(root, binding, read, reported)).terminal).toBe(true);
  expect(reads).toEqual(['one.map-plan.json', 'one.map-terminal.json', 'one.map-events.jsonl', 'one.map-dry-run.json']);
  for (const result of [
    { status: 'complete' },
    { status: 'complete', tests: [] },
    { status: 'complete', tests: [{ ...dryRun.result.tests[0], status: TestStatus.Failed }] },
    { status: 'complete', tests: [dryRun.result.tests[1]] },
    { status: 'complete', tests: [{ ...dryRun.result.tests[0], timeSpentMs: -1 }] },
    { status: 'complete', tests: [{ ...dryRun.result.tests[0], timeSpentMs: null }] },
    { status: 'complete', tests: [{ ...dryRun.result.tests[0], id: '' }] },
    { status: 'complete', tests: [{ ...dryRun.result.tests[0], name: '' }] },
    { status: 'complete', tests: [{ ...dryRun.result.tests[0], status: 99 }] },
    { ...dryRun.result, status: 'timeout' },
  ]) {
    files.set('one.map-dry-run.json', encode({ ...dryRun, result }));
    await expectRejection(confirmPartitionMutationMap(root, binding, read, reported), 'dry run');
  }
  files.set('one.map-dry-run.json', encode(dryRun));
  files.set('one.map-terminal.json', encode({ ...terminal, events: { ...terminal.events, sha256: '0'.repeat(64) } }));
  await expectRejection(confirmPartitionMutationMap(root, binding, read, reported), 'terminal receipt');
  files.delete('one.map-terminal.json');
  expect((await confirmPartitionMutationMap(root, binding, read)).terminal).toBe(false);
});

function perTestEvidence(file = 'tests/one.test.ts') {
  const token = Buffer.from(file).toString('base64url');
  const name = (id: number) => `[mutation-body:${id}] [mutation-file:${token}] row ${id}`;
  const planned: Pick<MutationPerTestCapture, 'describes' | 'hooks' | 'registrations'> = {
    describes: [{ test_file: file, describe_id: 1, parent_ids: [], title: 'suite' }],
    hooks: [{ test_file: file, hook_id: 1, hook: 'beforeEach', describe_ids: [1] }],
    registrations: [1, 2].map((body_id) => ({ test_file: file, body_id, expected_failure: false, describe_ids: [1] })),
  };
  const coverage = { static: { '0': 1 }, perTest: { [`${file}#body:1`]: { '0': 2 } } };
  const capture = {
    schema: 'MutationPerTestCapture/v2',
    ...structuredClone(planned),
    coverage_observed: true,
    mutant_coverage: coverage,
    invocations: [
      { test_file: file, kind: 'hook', id: 1, hook: 'beforeEach', hook_id: 1, outcome: 'returned', elapsed_ms: 1 },
      { test_file: file, kind: 'body', id: 1, outcome: 'returned', elapsed_ms: 1 },
    ],
  };
  const dryRun = {
    schema: 'MutationMapDryRun/v1',
    binding,
    confirmed_status: 'unconfirmed',
    result: {
      status: 'complete',
      mutantCoverage: structuredClone(coverage),
      tests: [1, 2].map((id) => ({
        id: `engine-${id}`,
        name: name(id),
        fileName: file,
        timeSpentMs: 1,
        status: id === 1 ? TestStatus.Success : TestStatus.Skipped,
      })),
    },
  };
  const junit = `<testsuites name="bun test" tests="2" assertions="1" failures="0" skipped="1"><testsuite file="${file}" tests="2" assertions="1" failures="0" skipped="1"><testcase name="${name(1)}" file="${file}" assertions="1"/><testcase name="${name(2)}" file="${file}" assertions="0"><skipped/></testcase></testsuite></testsuites>`;
  const localIds = validateMutationPartitionMap(
    mutationPartitionMap(root, binding, [plan(), plan('1', 'src/two.ts')]),
    root,
    binding,
  ).localIds;
  return {
    capture,
    dryRun,
    junit,
    bodyEvents: Buffer.alloc(0),
    exitCode: 0,
    expected: { root, binding, tests: [file], planned, localIds },
  };
}

function registrationOnlyEvidence(file = 'tests/one.test.ts') {
  const input = perTestEvidence(file);
  const nested = { test_file: file, describe_id: 2, parent_ids: [1], title: 'nested suite' };
  const nestedHook = { test_file: file, hook_id: 2, hook: 'afterEach', describe_ids: [1, 2] };
  input.capture.describes.push(nested);
  input.capture.hooks.push(nestedHook);
  input.capture.registrations[0]!.expected_failure = true;
  input.capture.registrations[0]!.describe_ids = [1, 2];
  input.capture.registrations[1]!.describe_ids = [1];
  const capture: MutationPerTestCapture = {
    ...input.capture,
    schema: 'MutationPerTestCapture/v2',
    invocations: [],
    coverage_observed: false,
    mutant_coverage: { static: {}, perTest: {} },
  };
  input.expected.planned = {
    describes: structuredClone(input.capture.describes),
    hooks: structuredClone(input.capture.hooks),
    registrations: structuredClone(input.capture.registrations),
  };
  const token = Buffer.from(file).toString('base64url');
  const names = [1, 2].map((id) => `[mutation-body:${id}] [mutation-file:${token}] row ${id}`);
  const caseXml = (name: string, caseFile = file, skipped = true) =>
    `<testcase name="${name}" file="${caseFile}" assertions="0">${skipped ? '<skipped/>' : ''}</testcase>`;
  const junit = (cases: string[], caseFiles = cases.map(() => file), skippedCases = cases.length) => {
    const count = cases.length;
    const testcases = cases.map((name, index) => caseXml(name, caseFiles[index], index < skippedCases)).join('');
    return `<testsuites name="bun test" tests="${count}" assertions="0" failures="0" skipped="${skippedCases}"><testsuite file="${file}" tests="${count}" assertions="0" failures="0" skipped="${skippedCases}">${testcases}</testsuite></testsuites>`;
  };
  input.junit = junit(names);
  return { ...input, capture, junitFor: junit, names };
}

test('registration-only per-test capture returns a detached plan for a complete all-skipped probe', () => {
  const input = registrationOnlyEvidence();
  const file = input.expected.tests[0]!;
  const planned = {
    describes: structuredClone(input.capture.describes),
    hooks: structuredClone(input.capture.hooks),
    registrations: structuredClone(input.capture.registrations),
  };
  const capture: unknown = input.capture;
  const result = validateMutationPerTestRegistration({
    capture,
    junit: input.junit,
    bodyEvents: input.bodyEvents,
    exitCode: input.exitCode,
    tests: [file],
  });
  expect(result).toEqual({
    qualification: 'registration-only',
    origin_qualified: false,
    filtered_runner_qualified: false,
    tests: [file],
    planned,
  });
  expect(result.planned).not.toBe(input.capture);
  expect(result.planned.describes).not.toBe(input.capture.describes);
  expect(result.planned.hooks).not.toBe(input.capture.hooks);
  expect(result.planned.registrations).not.toBe(input.capture.registrations);
  result.planned.registrations[0]!.expected_failure = false;
  expect(input.capture.registrations[0]!.expected_failure).toBe(true);
});

test('registration-only qualification permits aggregate static module coverage without treating it as execution proof', () => {
  const input = registrationOnlyEvidence();
  input.capture.coverage_observed = true;
  input.capture.mutant_coverage.static['0'] = 1;
  expect(
    validateMutationPerTestRegistration({
      capture: input.capture,
      junit: input.junit,
      bodyEvents: input.bodyEvents,
      exitCode: input.exitCode,
      tests: input.expected.tests,
    }),
  ).toMatchObject({
    qualification: 'registration-only',
    origin_qualified: false,
    filtered_runner_qualified: false,
  });
});

test('registration-only plan can be reused by the passing-baseline consistency join', () => {
  const registration = registrationOnlyEvidence();
  const file = registration.expected.tests[0]!;
  const planned = validateMutationPerTestRegistration({
    capture: registration.capture,
    junit: registration.junit,
    bodyEvents: registration.bodyEvents,
    exitCode: registration.exitCode,
    tests: [file],
  }).planned;
  const baseline = perTestEvidence(file);
  baseline.expected.planned = structuredClone(planned);
  baseline.capture.describes = structuredClone(planned.describes);
  baseline.capture.hooks = structuredClone(planned.hooks);
  baseline.capture.registrations = structuredClone(planned.registrations);
  baseline.capture.invocations[1]!.outcome = 'threw';
  baseline.capture.invocations.push({
    test_file: file,
    kind: 'hook',
    id: 2,
    hook: 'afterEach',
    hook_id: 2,
    outcome: 'returned',
    elapsed_ms: 1,
  });
  expect(validateMutationPerTestJoin(baseline).qualification).toBe('diagnostic-only');
  expect(() => validateMutationPerTestJoin(registration)).toThrow();
});

test('registration-only probe refuses internally consistent skipped cases that claim assertions', () => {
  const input = registrationOnlyEvidence();
  // Root, suite and the first skipped case agree on one asserted expression.
  for (let index = 0; index < 3; index++) input.junit = input.junit.replace('assertions="0"', 'assertions="1"');
  expect(() =>
    validateMutationPerTestRegistration({
      capture: input.capture,
      junit: input.junit,
      bodyEvents: input.bodyEvents,
      exitCode: input.exitCode,
      tests: input.expected.tests,
    }),
  ).toThrow('without execution');
});

test.each([
  'nonzero-exit',
  'null-exit',
  'body-invocation',
  'hook-invocation',
  'body-event',
  'executed-case',
  'omitted-case',
  'foreign-case',
  'duplicate-case',
  'missing-selected-file',
  'empty-selected-files',
  'duplicate-selected-file',
  'wrong-token',
  'wrong-scope',
  'duplicate-registration',
  'per-test-coverage-key',
  'unobserved-static-counter',
])('registration-only per-test capture refuses %s', (change) => {
  const input = registrationOnlyEvidence();
  const file = input.expected.tests[0]!;
  const cases = [...input.names];
  switch (change) {
    case 'nonzero-exit':
      input.exitCode = 1;
      break;
    case 'null-exit':
      break;
    case 'body-invocation':
      input.capture.invocations.push({
        test_file: file,
        kind: 'body',
        id: 1,
        outcome: 'returned',
        elapsed_ms: 1,
      });
      break;
    case 'hook-invocation':
      input.capture.invocations.push({
        test_file: file,
        kind: 'hook',
        id: 1,
        hook: 'beforeEach',
        hook_id: 1,
        outcome: 'returned',
        elapsed_ms: 1,
      });
      break;
    case 'body-event':
      input.bodyEvents = Buffer.from(
        `${JSON.stringify({
          schema: 'MutationBodyEvent/v1',
          test_file: file,
          kind: 'body',
          body_id: 1,
          assertion_cause: true,
          assertion_source: 'bun-expect',
        })}\n`,
      );
      break;
    case 'executed-case':
      input.junit = input.junitFor(cases, undefined, 1);
      break;
    case 'omitted-case':
      input.junit = input.junitFor(cases.slice(0, 1));
      break;
    case 'foreign-case':
      input.junit = input.junitFor([cases[0]!, cases[1]!.replace('[mutation-body:2]', '[mutation-body:3]')]);
      break;
    case 'duplicate-case':
      input.junit = input.junitFor([...cases, cases[1]!]);
      break;
    case 'missing-selected-file':
      input.expected.tests.push('tests/missing.test.ts');
      break;
    case 'empty-selected-files':
      input.expected.tests = [];
      break;
    case 'duplicate-selected-file':
      input.expected.tests = [file, file];
      break;
    case 'wrong-token':
      input.junit = input.junitFor(
        cases.map((name) => name.replace(/\[mutation-file:[^\]]+\]/u, '[mutation-file:Zm9yZWlnbi50ZXN0LnRz]')),
      );
      break;
    case 'wrong-scope':
      input.capture.registrations[0]!.describe_ids = [404];
      break;
    case 'duplicate-registration':
      input.capture.registrations.push(structuredClone(input.capture.registrations[0]!));
      break;
    case 'per-test-coverage-key':
      input.capture.mutant_coverage.perTest[`${file}#body:1`] = { '0': 1 };
      break;
    case 'unobserved-static-counter':
      input.capture.mutant_coverage.static['0'] = 1;
      break;
  }
  expect(() =>
    validateMutationPerTestRegistration({
      capture: input.capture,
      junit: input.junit,
      bodyEvents: input.bodyEvents,
      exitCode: change === 'null-exit' ? null : input.exitCode,
      tests: input.expected.tests,
    }),
  ).toThrow();
});

test('per-test parent diagnostic joins complete registration, JUnit, scopes and canonical dry-run coverage without granting admission', () => {
  const input = perTestEvidence();
  const covered = input.expected.localIds.get('0');
  const uncovered = input.expected.localIds.get('1');
  if (!covered || !uncovered) throw new Error('Fixture mutant universe is incomplete.');
  expect(validateMutationPerTestJoin(input)).toEqual({
    qualification: 'diagnostic-only',
    origin_qualified: false,
    filtered_runner_qualified: false,
    binding,
    tests: input.expected.tests,
    body_mutants: [{ body: 'tests/one.test.ts#body:1', mutants: [covered] }],
    static_mutants: [covered],
    uncovered_mutants: [uncovered],
  });
});

test('per-test parent uses explicit body/file tokens when public runner IDs repeat', () => {
  const input = perTestEvidence();
  input.dryRun.result.tests[1]!.id = input.dryRun.result.tests[0]!.id;
  expect(() => validateMutationPerTestJoin(input)).not.toThrow();
});

test('per-test capture reader preserves unobserved registration planning without admitting it as baseline coverage', () => {
  const input = perTestEvidence();
  input.capture.coverage_observed = false;
  const value: unknown = JSON.parse(JSON.stringify(input.capture));
  expect(readMutationPerTestCapture(value).coverage_observed).toBe(false);
  expect(() => validateMutationPerTestJoin(input)).toThrow('not observed');
  expect(() => readMutationPerTestCapture({ ...input.capture, schema: 'MutationPerTestCapture/v1' })).toThrow();
  for (const malformed of [
    { ...input.capture, registrations: [{ body_id: 1 }] },
    { ...input.capture, invocations: [{ ...input.capture.invocations[0], outcome: 'foreign' }] },
    { ...input.capture, mutant_coverage: { static: { '0': -1 }, perTest: {} } },
    { ...input.capture, extra: true },
  ])
    expect(() => readMutationPerTestCapture(malformed)).toThrow('Per-test capture is malformed or unsupported.');
});

test('per-test parent keeps equal body IDs in different original files distinct', () => {
  const input = perTestEvidence();
  const second = perTestEvidence('tests/two.test.ts');
  input.expected.tests.push(...second.expected.tests);
  input.expected.planned.describes.push(...second.expected.planned.describes);
  input.expected.planned.hooks.push(...second.expected.planned.hooks);
  input.expected.planned.registrations.push(...second.expected.planned.registrations);
  input.capture.describes.push(...second.capture.describes);
  input.capture.hooks.push(...second.capture.hooks);
  input.capture.registrations.push(...second.capture.registrations);
  input.capture.invocations.push(...second.capture.invocations);
  Object.assign(input.capture.mutant_coverage.perTest, second.capture.mutant_coverage.perTest);
  Object.assign(input.dryRun.result.mutantCoverage.perTest, second.dryRun.result.mutantCoverage.perTest);
  input.dryRun.result.tests.push(...second.dryRun.result.tests);
  const suites = [input.junit, second.junit]
    .map((xml) => xml.replace(/^<testsuites[^>]*>/u, '').replace(/<\/testsuites>$/u, ''))
    .join('');
  input.junit = `<testsuites name="bun test" tests="4" assertions="2" failures="0" skipped="2">${suites}</testsuites>`;
  expect(validateMutationPerTestJoin(input).body_mutants.map((row) => row.body)).toEqual([
    'tests/one.test.ts#body:1',
    'tests/two.test.ts#body:1',
  ]);
  input.expected.tests.push('tests/missing.test.ts');
  expect(() => validateMutationPerTestJoin(input)).toThrow('original selected file');
});

test('per-test parent distinguishes once-per-suite hooks from skipped sibling declarations', () => {
  const input = perTestEvidence();
  const file = input.expected.tests[0]!;
  const sibling = { test_file: file, describe_id: 2, parent_ids: [], title: 'skipped sibling' };
  input.capture.describes.push(sibling);
  input.expected.planned.describes.push(structuredClone(sibling));
  input.capture.registrations[1]!.describe_ids = [2];
  input.expected.planned.registrations[1]!.describe_ids = [2];
  for (const [index, hook] of ['beforeAll', 'afterAll', 'beforeAll', 'afterAll'].entries()) {
    const row = { test_file: file, hook_id: index + 2, hook, describe_ids: index < 2 ? [1] : [2] };
    input.capture.hooks.push(row);
    input.expected.planned.hooks.push(structuredClone(row));
    if (index < 2)
      input.capture.invocations.push({
        test_file: file,
        kind: 'hook',
        id: index + 2,
        hook,
        hook_id: index + 2,
        outcome: 'returned',
        elapsed_ms: 1,
      });
  }
  expect(() => validateMutationPerTestJoin(input)).not.toThrow();
});

test('per-test parent distinguishes an expected thrown baseline from a mutation kill and permits observed-empty coverage', () => {
  const input = perTestEvidence();
  input.capture.registrations[0]!.expected_failure = true;
  input.expected.planned.registrations[0]!.expected_failure = true;
  input.capture.invocations[1]!.outcome = 'threw';
  expect(validateMutationPerTestJoin(input).qualification).toBe('diagnostic-only');
  input.capture.invocations[1]!.outcome = 'returned';
  expect(() => validateMutationPerTestJoin(input)).toThrow('invocation');
  input.capture.invocations[1]!.outcome = 'threw';
  for (const coverage of [input.capture.mutant_coverage, input.dryRun.result.mutantCoverage]) {
    for (const key of Object.keys(coverage.static)) Reflect.deleteProperty(coverage.static, key);
    for (const key of Object.keys(coverage.perTest)) Reflect.deleteProperty(coverage.perTest, key);
  }
  expect(validateMutationPerTestJoin(input)).toMatchObject({
    body_mutants: [],
    static_mutants: [],
    uncovered_mutants: [...input.expected.localIds.values()].sort(),
  });
});

test.each([
  'missing-body',
  'extra-body',
  'pending-body',
  'foreign-body',
  'foreign-mutant',
  'missing-mutant',
  'foreign-per-test',
  'negative-counter',
  'coverage-absent',
  'coverage-drift',
  'scope-drift',
  'missing-hook',
  'duplicate-hook-call',
  'pending-hook',
  'dry-binding',
  'dry-test',
  'dry-file',
  'junit-body',
  'junit-missing',
  'nonzero-exit',
  'body-event',
  'wrong-schema',
  'negative-duration',
  'fractional-counter',
  'invalid-parent',
  'duplicate-registration',
  'duplicate-junit',
  'duplicate-dry-body',
])('per-test parent diagnostic refuses %s', (change) => {
  const input = perTestEvidence();
  switch (change) {
    case 'missing-body':
      input.capture.registrations.pop();
      break;
    case 'extra-body':
      input.capture.registrations.push({ ...input.capture.registrations[0]!, body_id: 3 });
      break;
    case 'pending-body':
      input.capture.invocations[1]!.outcome = 'pending';
      break;
    case 'foreign-body':
      input.capture.invocations[1]!.test_file = 'tests/foreign.test.ts';
      break;
    case 'foreign-mutant':
      input.expected.localIds.delete('0');
      break;
    case 'missing-mutant':
      Reflect.deleteProperty(input.dryRun.result.mutantCoverage.static, '0');
      break;
    case 'foreign-per-test':
      Object.assign(input.capture.mutant_coverage.perTest, { foreign: { '0': 1 } });
      break;
    case 'negative-counter':
      input.capture.mutant_coverage.static['0'] = -1;
      break;
    case 'coverage-absent':
      input.capture.coverage_observed = false;
      break;
    case 'coverage-drift':
      input.capture.mutant_coverage.static['0']++;
      break;
    case 'scope-drift':
      input.capture.registrations[0]!.describe_ids = [];
      break;
    case 'missing-hook':
      input.capture.invocations.shift();
      break;
    case 'duplicate-hook-call':
      input.capture.invocations.push({ ...input.capture.invocations[0]!, id: 2 });
      break;
    case 'pending-hook':
      input.capture.invocations[0]!.outcome = 'pending';
      break;
    case 'dry-binding':
      input.dryRun.binding = { ...binding, test_fingerprint: '0'.repeat(64) };
      break;
    case 'dry-test':
      input.dryRun.result.tests[0]!.name = 'foreign';
      break;
    case 'dry-file':
      input.dryRun.result.tests[0]!.fileName = 'tests/foreign.test.ts';
      break;
    case 'junit-body':
      input.junit = input.junit.replace('[mutation-body:2]', '[mutation-body:3]');
      break;
    case 'junit-missing':
      input.junit = '';
      break;
    case 'nonzero-exit':
      input.exitCode = 1;
      break;
    case 'body-event':
      input.bodyEvents = Buffer.from('{}\n');
      break;
    case 'wrong-schema':
      input.capture.schema = 'MutationPerTestCapture/v1';
      break;
    case 'negative-duration':
      input.capture.invocations[1]!.elapsed_ms = -1;
      break;
    case 'fractional-counter':
      input.capture.mutant_coverage.static['0'] = 0.5;
      break;
    case 'invalid-parent':
      input.capture.describes[0]!.parent_ids = [99];
      input.expected.planned.describes[0]!.parent_ids = [99];
      break;
    case 'duplicate-registration':
      input.capture.registrations.push({ ...input.capture.registrations[0]! });
      input.expected.planned.registrations.push({ ...input.expected.planned.registrations[0]! });
      break;
    case 'duplicate-junit':
      input.junit = input.junit.replace('[mutation-body:2]', '[mutation-body:1]');
      break;
    case 'duplicate-dry-body':
      input.dryRun.result.tests.push({ ...input.dryRun.result.tests[0]! });
      break;
  }
  expect(() => validateMutationPerTestJoin(input)).toThrow();
});
