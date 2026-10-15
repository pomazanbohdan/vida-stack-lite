import { expect, test } from 'bun:test';
import path from 'node:path';
import { PlanKind, type Mutant, type MutantResult, type MutantTestPlan } from '@stryker-mutator/api/core';
import {
  assertGlobalMutationMap,
  canonicalMutationLocation,
  confirmPartitionMutationMap,
  globalMutationMap,
  mutationMapIdentity,
  mutationPartitionMap,
  mutationResultMapRow,
  validateMutationMapEvents,
  validateMutationPartitionMap,
  type MutationMapBinding,
} from '../tooling/mutation-map.ts';
import { sha256 } from '../tooling/bun-coverage-evidence.ts';
import { expectRejection } from './helpers/expect-rejection.ts';

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
  const files = new Map([
    ['one.map-plan.json', planBytes],
    ['one.map-terminal.json', encode(terminal)],
    ['one.map-events.jsonl', eventBytes],
    [
      'one.map-dry-run.json',
      encode({
        schema: 'MutationMapDryRun/v1',
        binding,
        result: { status: 'complete' },
        confirmed_status: 'unconfirmed',
      }),
    ],
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
  files.set('one.map-terminal.json', encode({ ...terminal, events: { ...terminal.events, sha256: '0'.repeat(64) } }));
  await expectRejection(confirmPartitionMutationMap(root, binding, read, reported), 'terminal receipt');
  files.delete('one.map-terminal.json');
  expect((await confirmPartitionMutationMap(root, binding, read)).terminal).toBe(false);
});
