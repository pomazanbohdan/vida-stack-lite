import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'bun:test';
import { readPin } from '../bin/bun.ts';
import strykerConfig from '../stryker.config.ts';
import { buildMutationTestCommand } from '../tooling/mutation-evidence.js';
import { runStrykerPartitions, type MutationRunnerResult } from '../tooling/mutation-gate.ts';
import {
  mutationPartitionSourceBinding,
  mutationPartitionSourceBindingMatches,
} from '../tooling/mutation-command-runner.ts';
import { maintainedSourceInventory } from '../tooling/maintained-source-inventory.ts';
import { isRecord } from '../src/contracts/forward-controller-values.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function runnerResult(overrides: Partial<MutationRunnerResult> = {}): MutationRunnerResult {
  return {
    exitCode: 0,
    observed_exit_code: 0,
    signalCode: null,
    output_complete: true,
    timed_out: false,
    deadline_ms: 90_000,
    spawn_error: null,
    process_custody: {
      pid: 4312,
      scope: 'owned-process-group',
      terminationObserved: true,
      processGroupTerminationObserved: true,
      unrefCalled: false,
      attempts: [],
    },
    process_receipt: 'stryker-partition.process.json',
    stdout_capture: { file: 'partition.stdout.log', complete: true },
    stderr_capture: { file: 'partition.stderr.log', complete: true },
    ...overrides,
  };
}

interface MutationInventory {
  schema: string;
  test_repository_root: string | null;
  expected_sources: string[];
  unassigned_sources: string[];
  unknown_partition_sources: string[];
  invalid_overlaps: unknown[];
  missing_package_sources: string[];
  invalid_zero_mutant_sources: string[];
  zero_mutant_sources: string[];
  pending_partition_sources: string[];
  partitions: { name: string; sources: string[]; status: string }[];
}

function isMutationInventory(value: unknown): value is MutationInventory {
  if (!isRecord(value) || value.schema !== 'CandidateMutationInventory/v1') return false;
  if (value.test_repository_root !== null && typeof value.test_repository_root !== 'string') return false;
  for (const key of [
    'expected_sources',
    'unassigned_sources',
    'unknown_partition_sources',
    'missing_package_sources',
    'invalid_zero_mutant_sources',
    'zero_mutant_sources',
    'pending_partition_sources',
  ]) {
    const items: unknown = value[key];
    if (!Array.isArray(items) || !items.every((item: unknown) => typeof item === 'string')) return false;
  }
  return (
    Array.isArray(value.invalid_overlaps) &&
    Array.isArray(value.partitions) &&
    value.partitions.every(
      (partition: unknown) =>
        isRecord(partition) &&
        typeof partition.name === 'string' &&
        typeof partition.status === 'string' &&
        Array.isArray(partition.sources) &&
        partition.sources.every((source: unknown) => typeof source === 'string'),
    )
  );
}

test('mutation command builder constructs the exact pinned Bun test argv', () => {
  expect(buildMutationTestCommand('/pinned/bun', ['tests/a.test.mjs', 'tests/b.test.mjs'], '/reports/a.xml')).toEqual([
    '/pinned/bun',
    'test',
    'tests/a.test.mjs',
    'tests/b.test.mjs',
    '--timeout',
    '5000',
    '--preload=./tooling/mutation-test-preload.ts',
    '--reporter=junit',
    '--reporter-outfile=/reports/a.xml',
  ]);
});

test('mutation partition scheduling retains UNKNOWN results and fences every unknown successor path', async () => {
  const unobservedTimeout = runnerResult({
    exitCode: null,
    observed_exit_code: null,
    output_complete: false,
    timed_out: true,
    spawn_error: 'process-group-termination-unobserved',
    process_custody: {
      pid: 4312,
      scope: 'owned-process-group',
      terminationObserved: false,
      processGroupTerminationObserved: false,
      unrefCalled: true,
      attempts: [{ signal: 'SIGTERM', target: 'process-group', outcome: 'sent' }],
    },
  });
  const unknownResults: Array<{ label: string; result: MutationRunnerResult }> = [
    { label: 'unobserved timeout', result: unobservedTimeout },
    { label: 'signal with direct exit status', result: runnerResult({ signalCode: 'SIGTERM' }) },
    { label: 'incomplete output with direct exit status', result: runnerResult({ output_complete: false }) },
    { label: 'timeout with direct exit status', result: runnerResult({ timed_out: true }) },
    { label: 'spawn error', result: runnerResult({ exitCode: null, spawn_error: 'ENOENT' }) },
    {
      label: 'unobserved owned process group after direct success',
      result: runnerResult({
        process_custody: {
          pid: 4312,
          scope: 'owned-process-group',
          terminationObserved: true,
          processGroupTerminationObserved: false,
          unrefCalled: false,
          attempts: [],
        },
      }),
    },
    { label: 'unclassified null exit', result: runnerResult({ exitCode: null }) },
  ];

  for (const { label, result } of unknownResults) {
    const launches: string[] = [];
    const runs = await runStrykerPartitions(
      [
        { name: 'unknown', report: 'unknown.json' },
        { name: 'successor', report: 'successor.json' },
      ],
      async (partition, recordRun) => {
        launches.push(partition.name);
        recordRun({ ...partition, report: partition.report ?? `${partition.name}.json`, result });
        return true;
      },
    );

    expect({ label, launches }).toEqual({ label, launches: ['unknown'] });
    expect(runs).toHaveLength(1);
    expect(runs[0]?.result).toBe(result);
  }
});

test('mutation partition scheduling preserves reports after a known nonzero runner exit', async () => {
  const launches: string[] = [];
  const knownFailure = runnerResult({
    exitCode: 1,
    observed_exit_code: 1,
    process_custody: {
      pid: 4312,
      scope: 'owned-process-group',
      terminationObserved: true,
      processGroupTerminationObserved: true,
      unrefCalled: false,
      attempts: [],
    },
  });

  const runs = await runStrykerPartitions(
    [
      { name: 'known-failure', report: 'known-failure.json' },
      { name: 'successor', report: 'successor.json' },
    ],
    async (partition, recordRun) => {
      launches.push(partition.name);
      recordRun({ ...partition, report: partition.report ?? `${partition.name}.json`, result: knownFailure });
      return true;
    },
  );

  expect(launches).toEqual(['known-failure', 'successor']);
  expect(runs.map(({ name }) => name)).toEqual(['known-failure', 'successor']);
  expect(runs[0]?.result.exitCode).toBe(1);
});

test('mutation partition scheduling preserves an explicitly stopped recorded run', async () => {
  const result = runnerResult({ exitCode: null, spawn_error: 'input-drift' });
  const launches: string[] = [];
  const runs = await runStrykerPartitions(
    [
      { name: 'stopped', report: 'stopped.json' },
      { name: 'successor', report: 'successor.json' },
    ],
    async (partition, recordRun) => {
      launches.push(partition.name);
      recordRun({ ...partition, report: partition.report ?? `${partition.name}.json`, result });
      return false;
    },
  );

  expect(launches).toEqual(['stopped']);
  expect(runs).toHaveLength(1);
  expect(runs[0]?.result).toBe(result);
});

test('mutation partition scheduling propagates callback exceptions', async () => {
  const failure = new Error('partition observation failed');
  const launches: string[] = [];

  const observed = await runStrykerPartitions(
    [
      { name: 'throws', report: 'throws.json' },
      { name: 'successor', report: 'successor.json' },
    ],
    async (partition) => {
      launches.push(partition.name);
      throw failure;
    },
  ).catch((error: unknown) => error);

  expect(observed).toBe(failure);
  expect(launches).toEqual(['throws']);
});

test('mutation partition scheduling launches nothing for an empty selection', async () => {
  let launches = 0;
  const runs = await runStrykerPartitions([], async () => {
    launches += 1;
    return true;
  });

  expect(launches).toBe(0);
  expect(runs).toEqual([]);
});

test('configured mutation adapter builds worker argv from the already selected pinned runtime', () => {
  expect(process.versions.bun).toBe(readPin(root));
  expect(strykerConfig.commandRunner.command).toBe('bun tooling/mutation-command-runner.ts');
  expect(buildMutationTestCommand(process.execPath, ['tests/a.test.ts'], '/reports/worker.xml')).toEqual([
    process.execPath,
    'test',
    'tests/a.test.ts',
    '--timeout',
    '5000',
    '--preload=./tooling/mutation-test-preload.ts',
    '--reporter=junit',
    '--reporter-outfile=/reports/worker.xml',
  ]);
});

test('mutation partition descriptor binds the owned source list to its captured source subset', () => {
  const allSourceInputs = [
    { path: 'src/a.ts', sha256: 'a'.repeat(64) },
    { path: 'src/b.ts', sha256: 'b'.repeat(64) },
    { path: 'src/c.ts', sha256: 'c'.repeat(64) },
  ];
  const binding = mutationPartitionSourceBinding('owned-partition', ['src/b.ts', 'src/a.ts'], allSourceInputs);
  expect(binding).not.toBeNull();
  if (!binding) throw new Error('Expected a complete partition source binding.');
  const descriptor = {
    schema: 'MutationInputDescriptor/v2',
    partition: 'owned-partition',
    partition_sources: binding.sources,
    partition_source_inputs: binding.sourceInputs,
    partition_source_fingerprint: binding.fingerprint,
  };
  const expected = {
    partition: 'owned-partition',
    sources: binding.sources,
    sourceInputs: binding.sourceInputs,
    fingerprint: binding.fingerprint,
  };
  expect(mutationPartitionSourceBindingMatches(descriptor, expected)).toBe(true);
  expect(
    mutationPartitionSourceBinding(
      'owned-partition',
      ['src/a.ts', 'src/b.ts'],
      [...allSourceInputs, { path: 'src/a.ts', sha256: 'a'.repeat(64) }],
    ),
  ).toBeNull();
  expect(
    mutationPartitionSourceBinding('owned-partition', ['src/a.ts'], [{ path: 'src/a.ts', sha256: 'not-a-digest' }]),
  ).toBeNull();
  expect(mutationPartitionSourceBindingMatches({ ...descriptor, partition: 'foreign-partition' }, expected)).toBe(
    false,
  );
  expect(mutationPartitionSourceBindingMatches({ ...descriptor, partition_sources: ['src/a.ts'] }, expected)).toBe(
    false,
  );
  expect(
    mutationPartitionSourceBindingMatches(
      { ...descriptor, partition_sources: [...binding.sources, 'src/c.ts'], partition_source_inputs: allSourceInputs },
      expected,
    ),
  ).toBe(false);
  expect(
    mutationPartitionSourceBindingMatches(
      {
        ...descriptor,
        partition_source_inputs: [{ ...binding.sourceInputs[0], sha256: 'd'.repeat(64) }, binding.sourceInputs[1]],
      },
      expected,
    ),
  ).toBe(false);
  expect(
    mutationPartitionSourceBindingMatches({ ...descriptor, partition_source_fingerprint: 'e'.repeat(64) }, expected),
  ).toBe(false);
});

test('mutation inventory assigns maintained sources to runnable partitions', () => {
  expect(process.versions.bun).toBe(readPin(root));

  const result = spawnSync(process.execPath, ['tooling/mutation-gate.ts', '--inventory'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 30_000,
    maxBuffer: 4 * 1024 * 1024,
    windowsHide: true,
  });
  expect(result.error).toBeUndefined();
  // Inventory success describes assignment and runner selection, not mutation results.
  expect(result.status).toBe(0);

  const inventory: unknown = JSON.parse(result.stdout);
  if (!isMutationInventory(inventory)) throw new Error('Mutation inventory report shape is invalid.');
  const maintained = maintainedSourceInventory(root);
  expect(inventory.schema).toBe('CandidateMutationInventory/v1');
  expect(inventory.test_repository_root).toBe(path.resolve(root, '../..'));
  expect(inventory.test_repository_root).not.toBe(path.resolve(root, '..'));
  expect(inventory.pending_partition_sources).toEqual([]);
  expect(inventory.partitions.filter(({ status }) => status === 'pending')).toEqual([]);
  expect(inventory.expected_sources).toEqual([...maintained.mutationSources]);
  expect(inventory.unassigned_sources).toEqual([]);
  expect(inventory.unknown_partition_sources).toEqual([]);
  expect(inventory.invalid_overlaps).toEqual([]);
  expect(inventory.missing_package_sources).toEqual([]);
  expect(inventory.invalid_zero_mutant_sources).toEqual([]);

  // These are the gate's existing export-only zero-mutant sources. No other
  // maintained source receives this disposition.
  expect(inventory.zero_mutant_sources.sort()).toEqual(['src/config/index.ts', 'src/index.ts']);
  expect(inventory.zero_mutant_sources.every((source) => inventory.expected_sources.includes(source))).toBe(true);

  const owners = new Map<string, string[]>();
  for (const partition of inventory.partitions)
    for (const source of partition.sources) owners.set(source, [...(owners.get(source) ?? []), partition.name]);

  expect(owners.get('src/config/project-upgrade-existing-storage.ts')).toEqual([
    'bun-project-upgrade-existing-storage-image',
  ]);
  expect(owners.get('src/config/project-upgrade.ts')).toEqual(['bun-project-upgrade-lifecycle']);
  expect(owners.get('src/config/project-upgrade-existing-storage-admission.ts')).toEqual([
    'bun-project-upgrade-storage-admission',
  ]);

  expect([...owners.keys()].sort()).toEqual([...inventory.expected_sources].sort());
  for (const source of inventory.expected_sources) {
    const assignments = owners.get(source) ?? [];
    if (source === 'src/config/safe-repository-access.ts') expect(assignments.sort()).toEqual(['linux', 'windows']);
    else expect(assignments).toHaveLength(1);
  }
  for (const source of maintained.publicBinSources) expect(owners.get(source)).toHaveLength(1);
});
